import logging
import os

import requests as http_requests
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin
from .models import SocialCredential
from .serializers import SocialCredentialSerializer, FacebookPageSerializer
from .utils import (
    encrypt_token,
    post_vehicle_to_facebook,
    publish_to_instagram,
    publish_reel_to_instagram,
    publish_video_to_facebook,
    generate_reel_caption,
)
from inventory.models import Vehicle

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = 'v19.0'
GRAPH_BASE = f'https://graph.facebook.com/{GRAPH_API_VERSION}'


# ─── helpers ──────────────────────────────────────────────
def _fb_app_credentials():
    """Return (app_id, app_secret) from settings / env."""
    app_id = getattr(settings, 'FACEBOOK_APP_ID', None) or os.environ.get('FACEBOOK_APP_ID')
    app_secret = getattr(settings, 'FACEBOOK_APP_SECRET', None) or os.environ.get('FACEBOOK_APP_SECRET')
    return app_id, app_secret


# ══════════════════════════════════════════════════════════
# 1. FacebookConnectView — exchange short-lived token
# ══════════════════════════════════════════════════════════
class FacebookConnectView(APIView):
    """
    POST /api/social/facebook/connect/
    Body: { "short_lived_token": "<token-from-FB-JS-SDK>" }

    1. Exchanges the short-lived token for a long-lived User Access Token.
    2. Fetches the list of Facebook Pages the user manages.
    3. Returns the pages to the frontend so the user can choose which to connect.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        short_token = request.data.get('short_lived_token', '').strip()
        if not short_token:
            return Response(
                {'error': 'short_lived_token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        app_id, app_secret = _fb_app_credentials()
        if not app_id or not app_secret:
            return Response(
                {'error': 'Facebook App credentials are not configured on the server.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # ── Step 1: Exchange for long-lived user token ────
        exchange_url = f'{GRAPH_BASE}/oauth/access_token'
        exchange_params = {
            'grant_type': 'fb_exchange_token',
            'client_id': app_id,
            'client_secret': app_secret,
            'fb_exchange_token': short_token,
        }

        try:
            ex_resp = http_requests.get(exchange_url, params=exchange_params, timeout=15)
            ex_data = ex_resp.json()
        except Exception as e:
            logger.exception('Facebook token exchange network error')
            return Response(
                {'error': f'Could not reach Facebook: {e}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if 'access_token' not in ex_data:
            error_msg = ex_data.get('error', {}).get('message', 'Token exchange failed.')
            return Response(
                {'error': error_msg},
                status=status.HTTP_400_BAD_REQUEST,
            )

        long_lived_token = ex_data['access_token']

        # ── Step 2: Fetch Pages the user manages ─────────
        pages_url = f'{GRAPH_BASE}/me/accounts'
        pages_params = {
            'access_token': long_lived_token,
            'fields': 'id,name,access_token,category,picture{url},instagram_business_account',
        }

        try:
            pg_resp = http_requests.get(pages_url, params=pages_params, timeout=15)
            pg_data = pg_resp.json()
        except Exception as e:
            logger.exception('Facebook pages fetch network error')
            return Response(
                {'error': f'Could not fetch pages: {e}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        pages = pg_data.get('data', [])
        logger.info('Facebook /me/accounts response: %s', pg_data)
        if not pages:
            # Log the full response for debugging
            fb_error = pg_data.get('error', {})
            logger.warning(
                'No pages returned from /me/accounts. Full response: %s', pg_data
            )
            error_detail = fb_error.get('message', '') if fb_error else ''
            return Response(
                {
                    'error': (
                        f'No Facebook Pages found. {error_detail}'.strip()
                        if error_detail
                        else 'No Facebook Pages found. Make sure this account manages at least one Page.'
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Return the pages (including their Page Access Tokens) for selection
        page_list = []
        for p in pages:
            page_token = p.get('access_token', '')
            page_name = p.get('name', '')
            picture_url = p.get('picture', {}).get('data', {}).get('url', '')
            category = p.get('category', '')

            # Facebook Page entry
            page_list.append({
                'page_id': p['id'],
                'page_name': page_name,
                'page_access_token': page_token,
                'category': category,
                'picture_url': picture_url,
                'platform': 'FACEBOOK',
            })

            # If this page has a linked Instagram Business Account, add it too
            ig_account = p.get('instagram_business_account')
            if ig_account and ig_account.get('id'):
                page_list.append({
                    'page_id': ig_account['id'],
                    'page_name': f'{page_name} (Instagram)',
                    'page_access_token': page_token,  # same token works for IG
                    'category': category,
                    'picture_url': picture_url,
                    'platform': 'INSTAGRAM',
                })

        return Response({'pages': page_list})


# ══════════════════════════════════════════════════════════
# 2. SaveFacebookPageView — persist the selected page token
# ══════════════════════════════════════════════════════════
class SaveFacebookPageView(APIView):
    """
    POST /api/social/facebook/save-page/
    Body: { "page_id": "...", "page_name": "...", "page_access_token": "...", "platform": "FACEBOOK"|"INSTAGRAM" }

    Encrypts the Page Access Token and creates / updates a SocialCredential.
    When saving a FACEBOOK page, also auto-discovers and saves the linked
    Instagram Business Account (if any) so both are connected in one click.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = FacebookPageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        page_id = serializer.validated_data['page_id']
        page_name = serializer.validated_data['page_name']
        raw_token = serializer.validated_data['page_access_token']

        # Determine platform from request (default to FACEBOOK for backward compat)
        platform_str = request.data.get('platform', 'FACEBOOK').upper()
        platform = (
            SocialCredential.Platform.INSTAGRAM
            if platform_str == 'INSTAGRAM'
            else SocialCredential.Platform.FACEBOOK
        )

        encrypted = encrypt_token(raw_token)

        credential, created = SocialCredential.objects.update_or_create(
            user=request.user,
            page_id=page_id,
            defaults={
                'platform': platform,
                'page_name': page_name,
                'access_token': encrypted,
                'token_expires_at': None,   # Page tokens don't expire
                'is_active': True,
            },
        )

        saved_credentials = [SocialCredentialSerializer(credential).data]

        # ── Auto-discover linked Instagram Business Account ──
        if platform == SocialCredential.Platform.FACEBOOK:
            try:
                ig_resp = http_requests.get(
                    f'{GRAPH_BASE}/{page_id}',
                    params={
                        'fields': 'instagram_business_account',
                        'access_token': raw_token,
                    },
                    timeout=10,
                )
                ig_data = ig_resp.json()
                ig_account = ig_data.get('instagram_business_account')

                if ig_account and ig_account.get('id'):
                    ig_id = ig_account['id']
                    ig_encrypted = encrypt_token(raw_token)  # same token

                    ig_credential, ig_created = SocialCredential.objects.update_or_create(
                        user=request.user,
                        page_id=ig_id,
                        defaults={
                            'platform': SocialCredential.Platform.INSTAGRAM,
                            'page_name': f'{page_name} (Instagram)',
                            'access_token': ig_encrypted,
                            'token_expires_at': None,
                            'is_active': True,
                        },
                    )
                    saved_credentials.append(SocialCredentialSerializer(ig_credential).data)
                    logger.info(
                        'Auto-connected Instagram account %s for page %s',
                        ig_id, page_id,
                    )
            except Exception:
                logger.warning(
                    'Could not auto-discover Instagram for page %s', page_id,
                    exc_info=True,
                )

        return Response(
            {
                'message': f'Page "{page_name}" connected successfully!',
                'credentials': saved_credentials,
                'created': created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


# ══════════════════════════════════════════════════════════
# 3. SocialCredentialListView — list / disconnect
# ══════════════════════════════════════════════════════════
class SocialCredentialListView(APIView):
    """
    GET  /api/social/credentials/      → List connected pages for the current user.
    DELETE /api/social/credentials/<id>/ → Disconnect (deactivate) a credential.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = SocialCredential.objects.filter(user=request.user, is_active=True)
        return Response(SocialCredentialSerializer(qs, many=True).data)


class SocialCredentialDisconnectView(APIView):
    """
    DELETE /api/social/credentials/<pk>/
    Soft-delete (deactivate) a connected page.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def delete(self, request, pk):
        try:
            cred = SocialCredential.objects.get(pk=pk, user=request.user)
        except SocialCredential.DoesNotExist:
            return Response(
                {'error': 'Credential not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        cred.is_active = False
        cred.save(update_fields=['is_active', 'updated_at'])
        return Response({'message': f'"{cred.page_name}" disconnected.'})


# ══════════════════════════════════════════════════════════
# 5. PostToSocialView — publish a vehicle post
# ══════════════════════════════════════════════════════════
class PostToFacebookView(APIView):
    """
    POST /api/social/post-now/
    Body: {
        "vehicle_id": 12,
        "credential_id": 1,
        "custom_caption": "Check out this beauty!"
    }

    Publishes a photo + caption to the connected Facebook Page or Instagram account.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        vehicle_id = request.data.get('vehicle_id')
        credential_id = request.data.get('credential_id')
        custom_caption = request.data.get('custom_caption', '').strip()

        if not vehicle_id or not credential_id:
            return Response(
                {'error': 'vehicle_id and credential_id are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Fetch vehicle ─────────────────────────────────
        try:
            vehicle = Vehicle.objects.get(pk=vehicle_id)
        except Vehicle.DoesNotExist:
            return Response(
                {'error': 'Vehicle not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # ── Fetch credential ──────────────────────────────
        try:
            credential = SocialCredential.objects.get(
                pk=credential_id,
                user=request.user,
                is_active=True,
            )
        except SocialCredential.DoesNotExist:
            return Response(
                {'error': 'Social credential not found or inactive.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # ── Build caption ─────────────────────────────────
        if custom_caption:
            caption = custom_caption
        else:
            caption = (
                f"🚗 Check out this {vehicle.year} {vehicle.make} {vehicle.model}!\n\n"
                f"💰 Price: ${vehicle.price:,.0f}\n"
                f"📏 Mileage: {vehicle.mileage:,} mi\n"
            )
            if vehicle.color:
                caption += f"🎨 Color: {vehicle.color}\n"
            caption += f"\n🔗 View details on our website!"

        # ── Resolve image URL ─────────────────────────
        first_image = vehicle.images.first()
        if not first_image:
            return Response(
                {'error': 'This vehicle has no images. Upload at least one photo first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # With S3, .url returns the full https://bucket.s3.amazonaws.com/... link.
        # For local dev (no S3), .url returns /media/... so we build the absolute URI.
        raw_url = first_image.image.url
        if raw_url.startswith('http'):
            image_url = raw_url
        else:
            image_url = request.build_absolute_uri(raw_url)

        logger.info('Social post image URL: %s', image_url)

        # ── Publish based on platform ─────────────────────
        if credential.platform == SocialCredential.Platform.INSTAGRAM:
            result = publish_to_instagram(credential, caption, image_url)
        else:
            # Facebook — use public URL (S3) or fall back to local file upload
            if image_url.startswith('http') and 's3' in image_url:
                result = post_vehicle_to_facebook(credential, caption, image_url=image_url)
            else:
                # Local dev fallback — upload file directly
                try:
                    image_path = first_image.image.path
                except NotImplementedError:
                    image_path = None
                result = post_vehicle_to_facebook(
                    credential, caption,
                    image_path=image_path,
                    image_url=image_url,
                )

        if result.get('success'):
            return Response({
                'message': f'Posted to "{credential.page_name}" successfully!',
                'post_id': result['post_id'],
            })
        else:
            return Response(
                {'error': result.get('error', 'Publishing failed.')},
                status=status.HTTP_502_BAD_GATEWAY,
            )


# ══════════════════════════════════════════════════════════
# 6. GenerateReelCaptionView — AI-powered viral caption
# ══════════════════════════════════════════════════════════
class GenerateReelCaptionView(APIView):
    """
    POST /api/social/generate-reel-caption/
    Body: { "vehicle_id": 5 }

    Uses Google Gemini to produce a high-energy, viral Instagram/TikTok
    Reel caption complete with emojis, feature bullets, CTA, and hashtags.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        vehicle_id = request.data.get('vehicle_id')
        if not vehicle_id:
            return Response(
                {'error': 'vehicle_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            vehicle = Vehicle.objects.prefetch_related('features').get(pk=vehicle_id)
        except Vehicle.DoesNotExist:
            return Response(
                {'error': f'Vehicle {vehicle_id} not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        result = generate_reel_caption(vehicle)

        if 'error' in result:
            return Response(
                {'error': result['error']},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({'caption': result['caption']})


# ══════════════════════════════════════════════════════════
# 7. PostReelView — publish video Reels to FB / IG
# ══════════════════════════════════════════════════════════
class PostReelView(APIView):
    """
    POST /api/social/post-reel/
    Body: {
        "vehicle_id": 12,
        "caption": "Check out this beast!",
        "platforms": ["FACEBOOK", "INSTAGRAM"]
    }

    Publishes one of the vehicle's videos as a Reel to every
    active credential that matches the requested platforms.
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        vehicle_id = request.data.get('vehicle_id')
        caption = request.data.get('caption', '').strip()
        platforms = request.data.get('platforms', [])

        # ── Validation ────────────────────────────────────
        if not vehicle_id:
            return Response(
                {'error': 'vehicle_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not platforms:
            return Response(
                {'error': 'platforms array is required (e.g. ["FACEBOOK", "INSTAGRAM"]).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Normalise to uppercase
        platforms = [p.upper() for p in platforms]

        try:
            vehicle = Vehicle.objects.get(pk=vehicle_id)
        except Vehicle.DoesNotExist:
            return Response(
                {'error': 'Vehicle not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # ── Ensure at least one video exists ─────────────────────
        first_video = vehicle.videos.first()
        if not first_video:
            return Response(
                {'error': 'This vehicle has no videos. Upload one first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Resolve the video URL (S3 = full URL; local = relative)
        raw_url = first_video.video.url
        if raw_url.startswith('http'):
            video_url = raw_url
        else:
            video_url = request.build_absolute_uri(raw_url)

        logger.info('Reel video URL: %s', video_url)

        # ── Default caption ───────────────────────────────
        if not caption:
            caption = (
                f"🚗💨 {vehicle.year} {vehicle.make} {vehicle.model}\n\n"
                f"💰 ${vehicle.price:,.0f}\n"
                f"📏 {vehicle.mileage:,} mi\n"
                f"\n🔗 Link in bio!"
            )

        # ── Fetch matching credentials ────────────────────
        credentials = SocialCredential.objects.filter(
            user=request.user,
            is_active=True,
            platform__in=platforms,
        )

        if not credentials.exists():
            return Response(
                {'error': 'No active credentials found for the requested platforms.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Publish to each credential ────────────────────
        results = []
        for cred in credentials:
            if cred.platform == SocialCredential.Platform.INSTAGRAM:
                result = publish_reel_to_instagram(cred, caption, video_url)
            else:
                result = publish_video_to_facebook(cred, caption, video_url)

            results.append({
                'platform': cred.platform,
                'page_name': cred.page_name,
                'success': result.get('success', False),
                'post_id': result.get('post_id'),
                'error': result.get('error'),
            })

        # ── Summarise ─────────────────────────────────────
        successes = [r for r in results if r['success']]
        failures = [r for r in results if not r['success']]

        resp_status = (
            status.HTTP_200_OK if successes
            else status.HTTP_502_BAD_GATEWAY
        )

        return Response(
            {
                'message': f'{len(successes)} of {len(results)} reel(s) posted successfully.',
                'results': results,
            },
            status=resp_status,
        )
