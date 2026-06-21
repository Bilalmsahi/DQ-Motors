"""
Fernet-based encryption helpers for social media tokens,
plus Facebook / Instagram Graph API publishing utilities.

ENCRYPTION_KEY must be set in your .env file.
Generate one with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

import logging
import os
import time

import requests as http_requests
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = 'v19.0'
GRAPH_BASE = f'https://graph.facebook.com/{GRAPH_API_VERSION}'


# ══════════════════════════════════════════════════════════
# Encryption helpers
# ══════════════════════════════════════════════════════════

def _get_fernet() -> Fernet:
    """Return a Fernet instance using the project's ENCRYPTION_KEY."""
    key = getattr(settings, 'ENCRYPTION_KEY', None) or os.environ.get('ENCRYPTION_KEY')
    if not key:
        raise RuntimeError(
            'ENCRYPTION_KEY is not configured. '
            'Generate one with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"'
        )
    # Key may be a string; Fernet needs bytes
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


def encrypt_token(raw_token: str) -> str:
    """Encrypt a plaintext token and return a base-64 encoded string."""
    f = _get_fernet()
    return f.encrypt(raw_token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a previously encrypted token and return plaintext."""
    f = _get_fernet()
    try:
        return f.decrypt(encrypted_token.encode()).decode()
    except InvalidToken:
        logger.error('Failed to decrypt social token — key may have rotated.')
        raise ValueError('Token decryption failed. The encryption key may have changed.')


# ══════════════════════════════════════════════════════════
# Facebook publishing
# ══════════════════════════════════════════════════════════

def post_vehicle_to_facebook(credential, caption: str, image_path: str = None, image_url: str = None) -> dict:
    """
    Publish a photo + caption to a Facebook Page.

    Supports two modes:
      • image_path — local file path, uploaded directly via multipart (works in dev).
      • image_url  — a **publicly accessible** URL (S3 / production CDN).

    At least one must be provided. image_path takes precedence.

    Returns:
        dict  – { "success": True, "post_id": "..." }
             or { "success": False, "error": "..." }
    """
    try:
        page_token = credential.get_token()
    except (ValueError, Exception) as e:
        logger.exception('Token decryption failed for credential %s', credential.id)
        return {'success': False, 'error': f'Token decryption failed: {e}'}

    url = f'{GRAPH_BASE}/{credential.page_id}/photos'

    try:
        if image_path and os.path.isfile(image_path):
            # Upload file directly (works from localhost / dev)
            with open(image_path, 'rb') as img_file:
                files = {'source': (os.path.basename(image_path), img_file, 'image/jpeg')}
                data = {'message': caption, 'access_token': page_token}
                resp = http_requests.post(url, data=data, files=files, timeout=60)
        elif image_url:
            # Pass a public URL for Facebook to fetch
            payload = {'url': image_url, 'message': caption, 'access_token': page_token}
            resp = http_requests.post(url, data=payload, timeout=30)
        else:
            return {'success': False, 'error': 'No image provided.'}

        data = resp.json()
    except Exception as e:
        logger.exception('Facebook publish network error')
        return {'success': False, 'error': f'Could not reach Facebook: {e}'}

    if 'id' in data:
        logger.info(
            'Published to Facebook page %s — post_id=%s',
            credential.page_id, data['id'],
        )
        return {'success': True, 'post_id': data['id']}

    error_msg = data.get('error', {}).get('message', 'Unknown Facebook error.')
    logger.error('Facebook publish error: %s', error_msg)
    return {'success': False, 'error': error_msg}


# ══════════════════════════════════════════════════════════
# Instagram publishing (2-step container flow)
# ══════════════════════════════════════════════════════════

def publish_to_instagram(credential, caption: str, image_url: str) -> dict:
    """
    Publish a photo + caption to an Instagram Business Account.

    Instagram's API is a two-step process:
      Step 1 — Create a media container (IG downloads the image).
      Step 2 — Publish the container to the feed.

    Args:
        credential: SocialCredential instance (page_id = IG Business ID).
        caption:    The post caption.
        image_url:  A **publicly accessible** URL to the image.
                    (Instagram fetches this URL server-side; localhost will NOT work.)

    Returns:
        dict  – { "success": True, "post_id": "..." }
             or { "success": False, "error": "..." }
    """
    try:
        access_token = credential.get_token()
    except (ValueError, Exception) as e:
        logger.exception('Token decryption failed for credential %s', credential.id)
        return {'success': False, 'error': f'Token decryption failed: {e}'}

    ig_user_id = credential.page_id

    # ── Step 1: Create Media Container ────────────────────
    container_url = f'{GRAPH_BASE}/{ig_user_id}/media'
    container_params = {
        'image_url': image_url,
        'caption': caption,
        'access_token': access_token,
    }

    try:
        resp = http_requests.post(container_url, data=container_params, timeout=30)
        data = resp.json()
    except Exception as e:
        logger.exception('Instagram container creation network error')
        return {'success': False, 'error': f'Could not reach Instagram API: {e}'}

    creation_id = data.get('id')
    if not creation_id:
        error_msg = data.get('error', {}).get('message', 'Container creation failed.')
        logger.error('Instagram container error: %s', error_msg)
        return {'success': False, 'error': error_msg}

    logger.info('Instagram container created: %s', creation_id)

    # ── Step 1b: Wait for container to be ready ───────────
    # Instagram needs time to download & process the image.
    # Poll the container status (up to ~30 seconds).
    status_url = f'{GRAPH_BASE}/{creation_id}'
    for attempt in range(10):
        time.sleep(3)
        try:
            st_resp = http_requests.get(
                status_url,
                params={'fields': 'status_code', 'access_token': access_token},
                timeout=10,
            )
            st_data = st_resp.json()
            container_status = st_data.get('status_code', '')
            if container_status == 'FINISHED':
                break
            if container_status == 'ERROR':
                return {'success': False, 'error': 'Instagram rejected the image. Make sure it is publicly accessible and meets IG requirements.'}
        except Exception:
            pass  # retry
    else:
        logger.warning('Instagram container %s did not finish in time', creation_id)
        # Proceed anyway — publish might still work

    # ── Step 2: Publish the Container ─────────────────────
    publish_url = f'{GRAPH_BASE}/{ig_user_id}/media_publish'
    publish_params = {
        'creation_id': creation_id,
        'access_token': access_token,
    }

    try:
        pub_resp = http_requests.post(publish_url, data=publish_params, timeout=30)
        pub_data = pub_resp.json()
    except Exception as e:
        logger.exception('Instagram publish network error')
        return {'success': False, 'error': f'Could not publish to Instagram: {e}'}

    post_id = pub_data.get('id')
    if post_id:
        logger.info(
            'Published to Instagram %s — post_id=%s',
            ig_user_id, post_id,
        )
        return {'success': True, 'post_id': post_id}

    error_msg = pub_data.get('error', {}).get('message', 'Unknown Instagram error.')
    logger.error('Instagram publish error: %s', error_msg)
    return {'success': False, 'error': error_msg}


# ══════════════════════════════════════════════════════════
# Instagram Reels publishing (video, 3-step async flow)
# ══════════════════════════════════════════════════════════

def publish_reel_to_instagram(credential, caption: str, video_url: str) -> dict:
    """
    Publish an Instagram Reel (video).

    Instagram Reels use the same Container → Poll → Publish flow as images,
    but with `media_type=REELS` and `video_url` instead of `image_url`.
    Videos require longer processing times, so we poll up to ~60 seconds.

    Args:
        credential: SocialCredential (page_id = IG Business Account ID).
        caption:    The reel caption.
        video_url:  A **publicly accessible** URL to the MP4 video (e.g. S3).

    Returns:
        dict – { "success": True, "post_id": "..." }
             or { "success": False, "error": "..." }
    """
    try:
        access_token = credential.get_token()
    except (ValueError, Exception) as e:
        logger.exception('Token decryption failed for credential %s', credential.id)
        return {'success': False, 'error': f'Token decryption failed: {e}'}

    ig_user_id = credential.page_id

    # ── Step 1: Create Reel Container ─────────────────────
    container_url = f'{GRAPH_BASE}/{ig_user_id}/media'
    container_params = {
        'media_type': 'REELS',
        'video_url': video_url,
        'caption': caption,
        'access_token': access_token,
    }

    try:
        resp = http_requests.post(container_url, data=container_params, timeout=60)
        data = resp.json()
    except Exception as e:
        logger.exception('Instagram Reel container creation network error')
        return {'success': False, 'error': f'Could not reach Instagram API: {e}'}

    creation_id = data.get('id')
    if not creation_id:
        error_msg = data.get('error', {}).get('message', 'Reel container creation failed.')
        logger.error('Instagram Reel container error: %s', error_msg)
        return {'success': False, 'error': error_msg}

    logger.info('Instagram Reel container created: %s', creation_id)

    # ── Step 2: Poll container status (CRITICAL for video) ─
    # Videos take time to transcode. Poll every 5 s, up to 10 retries (~50 s).
    MAX_RETRIES = 10
    POLL_INTERVAL = 5  # seconds

    status_url = f'{GRAPH_BASE}/{creation_id}'
    for attempt in range(1, MAX_RETRIES + 1):
        time.sleep(POLL_INTERVAL)
        try:
            st_resp = http_requests.get(
                status_url,
                params={'fields': 'status_code', 'access_token': access_token},
                timeout=10,
            )
            st_data = st_resp.json()
            container_status = st_data.get('status_code', '')
            logger.info(
                'IG Reel %s poll attempt %d/%d — status: %s',
                creation_id, attempt, MAX_RETRIES, container_status,
            )

            if container_status == 'FINISHED':
                break
            if container_status == 'ERROR':
                error_detail = st_data.get('status', 'Unknown processing error.')
                logger.error('IG Reel container error: %s', error_detail)
                return {
                    'success': False,
                    'error': f'Instagram rejected the video: {error_detail}',
                }
        except Exception as e:
            logger.warning('IG Reel poll attempt %d failed: %s', attempt, e)
            # Continue retrying
    else:
        logger.warning('IG Reel container %s did not finish after %d retries', creation_id, MAX_RETRIES)
        # Proceed anyway — publish call will give a definitive answer

    # ── Step 3: Publish the Reel ──────────────────────────
    publish_url = f'{GRAPH_BASE}/{ig_user_id}/media_publish'
    publish_params = {
        'creation_id': creation_id,
        'access_token': access_token,
    }

    try:
        pub_resp = http_requests.post(publish_url, data=publish_params, timeout=30)
        pub_data = pub_resp.json()
    except Exception as e:
        logger.exception('Instagram Reel publish network error')
        return {'success': False, 'error': f'Could not publish Reel: {e}'}

    post_id = pub_data.get('id')
    if post_id:
        logger.info('Published IG Reel to %s — post_id=%s', ig_user_id, post_id)
        return {'success': True, 'post_id': post_id}

    error_msg = pub_data.get('error', {}).get('message', 'Unknown Instagram Reel error.')
    logger.error('Instagram Reel publish error: %s', error_msg)
    return {'success': False, 'error': error_msg}


# ══════════════════════════════════════════════════════════
# Facebook Page Video publishing
# ══════════════════════════════════════════════════════════

def publish_video_to_facebook(credential, caption: str, video_url: str) -> dict:
    """
    Publish a video to a Facebook Page's video library.

    Facebook accepts `file_url` (public URL) and handles transcoding
    on its end — no polling required.

    Args:
        credential: SocialCredential (page_id = Facebook Page ID).
        caption:    The video description.
        video_url:  A **publicly accessible** URL to the MP4 (e.g. S3).

    Returns:
        dict – { "success": True, "post_id": "..." }
             or { "success": False, "error": "..." }
    """
    try:
        page_token = credential.get_token()
    except (ValueError, Exception) as e:
        logger.exception('Token decryption failed for credential %s', credential.id)
        return {'success': False, 'error': f'Token decryption failed: {e}'}

    url = f'{GRAPH_BASE}/{credential.page_id}/videos'
    payload = {
        'file_url': video_url,
        'description': caption,
        'access_token': page_token,
    }

    try:
        resp = http_requests.post(url, data=payload, timeout=120)
        data = resp.json()
    except Exception as e:
        logger.exception('Facebook video publish network error')
        return {'success': False, 'error': f'Could not reach Facebook: {e}'}

    video_id = data.get('id')
    if video_id:
        logger.info(
            'Published video to Facebook page %s — video_id=%s',
            credential.page_id, video_id,
        )
        return {'success': True, 'post_id': video_id}

    error_msg = data.get('error', {}).get('message', 'Unknown Facebook video error.')
    logger.error('Facebook video publish error: %s', error_msg)
    return {'success': False, 'error': error_msg}


# ══════════════════════════════════════════════════════════
# AI Viral Caption Generator (Google Gemini)
# ══════════════════════════════════════════════════════════

def generate_reel_caption(vehicle) -> dict:
    """
    Use Google Gemini to generate a high-energy, viral Instagram/TikTok
    Reel caption for the given vehicle.

    Args:
        vehicle: An inventory.Vehicle instance.

    Returns:
        dict – { "caption": "<generated text>" }
            or { "error": "<message>" }
    """
    google_api_key = (
        getattr(settings, 'GOOGLE_API_KEY', None)
        or os.environ.get('GOOGLE_API_KEY')
    )

    if not google_api_key:
        logger.warning('GOOGLE_API_KEY not configured — returning fallback reel caption')
        return _reel_caption_fallback(vehicle)

    # Build a feature list from the vehicle's M2M features
    features_list = ', '.join(
        vehicle.features.values_list('name', flat=True)
    ) or 'loaded with premium features'

    price_str = f'${vehicle.price:,.0f}' if vehicle.price else 'Call for pricing'

    prompt = (
        f"Write an engaging, high-energy caption for an Instagram/TikTok Reel "
        f"showcasing a {vehicle.year} {vehicle.make} {vehicle.model}"
        f"{' ' + vehicle.trim if vehicle.trim else ''} "
        f"priced at {price_str}. "
        f"The car has {vehicle.mileage:,} miles and comes in {vehicle.color or 'stunning'} color. "
        f"Key features include: {features_list}. "
        "Include an engaging hook in the first line, "
        "3-5 bullet points (use emojis as bullet markers) highlighting top features, "
        "and end with a strong Call to Action. "
        "Generate exactly 10 highly relevant trending hashtags at the bottom. "
        "Keep it under 150 words. "
        "Return ONLY the caption text, nothing else."
    )

    try:
        import google.generativeai as genai

        genai.configure(api_key=google_api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')

        response = model.generate_content(prompt)

        if not response.text:
            logger.warning('Empty response from Gemini for reel caption')
            return _reel_caption_fallback(vehicle)

        caption = response.text.strip()
        logger.info('Generated reel caption for vehicle %s (%d chars)', vehicle.id, len(caption))
        return {'caption': caption}

    except ImportError:
        logger.error('google-generativeai package is not installed')
        return _reel_caption_fallback(vehicle)
    except Exception as e:
        logger.error('Gemini reel caption error: %s', e)
        return {'error': str(e)}


def _reel_caption_fallback(vehicle) -> dict:
    """Return a decent template caption when Gemini is unavailable."""
    price_str = f'${vehicle.price:,.0f}' if vehicle.price else 'Call for pricing'
    caption = (
        f"🔥 Check out this stunning {vehicle.year} {vehicle.make} {vehicle.model}! 🔥\n\n"
        f"💰 {price_str}\n"
        f"📍 Only {vehicle.mileage:,} miles\n"
        f"🎨 {vehicle.color or 'Beautiful'} exterior\n\n"
        f"Don't miss out — DM us or visit the link in bio! 🚗💨\n\n"
        f"#cars #carsofinstagram #{vehicle.make.lower()} #{vehicle.model.lower().replace(' ', '')} "
        f"#cardealership #luxurycars #usedcars #carsforsale #autodealer #driveinstyle"
    )
    return {'caption': caption}
