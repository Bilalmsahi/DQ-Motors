import json
import logging
import os
import re

from django.conf import settings

logger = logging.getLogger(__name__)


# ── Scoped CSS for AI-generated blog content ─────────────────
BLOG_CSS_TEMPLATE = """<style>
.ad-blog-container {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: #1e293b;
    line-height: 1.8;
    max-width: 100%;
}
.ad-blog-container .ad-blog-heading {
    font-size: 1.5rem;
    font-weight: 700;
    color: #0f172a;
    margin: 1.75rem 0 0.75rem;
    padding-bottom: 0.4rem;
    border-bottom: 3px solid #E20505;
    display: inline-block;
}
.ad-blog-container .ad-blog-paragraph {
    font-size: 1.05rem;
    color: #334155;
    margin-bottom: 1rem;
}
.ad-blog-container .ad-blog-highlight-box {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border-left: 4px solid #E20505;
    border-radius: 0.5rem;
    padding: 1.25rem 1.5rem;
    margin: 1.5rem 0;
}
.ad-blog-container .ad-blog-list {
    list-style: none;
    padding: 0;
    margin: 0;
}
.ad-blog-container .ad-blog-list li {
    position: relative;
    padding-left: 1.5rem;
    margin-bottom: 0.5rem;
    font-size: 1rem;
    color: #334155;
}
.ad-blog-container .ad-blog-list li::before {
    content: '\\2713';
    position: absolute;
    left: 0;
    color: #E20505;
    font-weight: 700;
}
.ad-blog-container .ad-blog-brand-highlight {
    color: #E20505;
    font-weight: 600;
}
.ad-blog-container .ad-blog-cta-box {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 0.75rem;
    padding: 2rem;
    text-align: center;
    margin-top: 2.5rem;
}
.ad-blog-container .ad-blog-cta-box p {
    color: #cbd5e1;
    font-size: 1.1rem;
    margin-bottom: 1rem;
}
.ad-blog-container .ad-blog-cta-box h3 {
    color: #ffffff;
    font-size: 1.35rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}
.ad-blog-container .ad-blog-cta-button {
    display: inline-block;
    background: #E20505;
    color: #ffffff !important;
    padding: 0.75rem 2rem;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 600;
    font-size: 1rem;
    transition: background 0.2s;
}
.ad-blog-container .ad-blog-cta-button:hover {
    background: #e04e00;
}
</style>
"""

# ── Instruction block for the AI prompt ──────────────────────
BLOG_HTML_STRUCTURE = """
CRITICAL: You must output RAW HTML only. Do not use Markdown. Do not use ```html code blocks.
You must use the following CSS classes for styling:
- Container: wrap ALL content inside <div class="ad-blog-container">
- Headings: <h2 class="ad-blog-heading">
- Paragraphs: <p class="ad-blog-paragraph">
- Lists: <ul class="ad-blog-list"> placed inside <div class="ad-blog-highlight-box">
- Brand / dealership names: <span class="ad-blog-brand-highlight">
- At the end, include a Call to Action box using:
  <div class="ad-blog-cta-box">
    <h3>Ready to Find Your Perfect Car?</h3>
    <p>Browse our latest inventory and schedule a test drive today.</p>
    <a href="/listings" class="ad-blog-cta-button">Browse Inventory</a>
  </div>
Do NOT include a <style> tag in your output. I will prepend it manually.
"""


def generate_blog_content(topic: str, brand_name: str, inventory_highlights: str) -> dict:
    """
    Use Google Gemini to generate a full SEO-optimised blog post.

    Returns a dict with keys:
        html_content, title, meta_title, meta_description, keywords

    The html_content is wrapped in scoped CSS + a strict HTML class structure
    so it renders consistently on the frontend.

    If the API is unavailable a fallback placeholder is returned.
    """

    google_api_key = getattr(settings, 'GOOGLE_API_KEY', None) or os.environ.get('GOOGLE_API_KEY')

    if not google_api_key:
        logger.info('GOOGLE_API_KEY not configured – returning fallback blog content')
        return _fallback(topic, brand_name, inventory_highlights)

    try:
        import google.generativeai as genai

        genai.configure(api_key=google_api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')

        prompt = (
            f"You are a professional web developer and SEO copywriter. "
            f"Write a blog post about '{topic}' for a car dealership named "
            f"'{brand_name}'. Mention that we currently have {inventory_highlights} "
            f"in stock.\n\n"
            f"{BLOG_HTML_STRUCTURE}\n"
            "Format the output as **valid JSON only** (no markdown fences) with these keys:\n"
            '  "title"           – a catchy blog title (plain text)\n'
            '  "html_content"    – the full article body as described above. '
            'Make it 600-900 words. Do NOT include the title inside html_content.\n'
            '  "meta_title"      – SEO meta title (max 60 chars, plain text)\n'
            '  "meta_description" – SEO meta description (max 160 chars, plain text)\n'
            '  "keywords"        – comma-separated focus keywords (5-8 keywords)\n\n'
            "Return ONLY the JSON object, nothing else."
        )

        response = model.generate_content(prompt)

        if not response.text:
            logger.warning('Empty response from Gemini for blog generation')
            return _fallback(topic, brand_name, inventory_highlights)

        # Strip possible markdown code fences
        raw = response.text.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)

        data = json.loads(raw)

        # Clean the html_content: strip any <style> tags the AI might sneak in
        ai_html = data.get('html_content', '')
        ai_html = re.sub(r'<style[\s\S]*?</style>', '', ai_html, flags=re.IGNORECASE)
        ai_html = re.sub(r'^```(?:html)?\s*', '', ai_html.strip())
        ai_html = re.sub(r'\s*```$', '', ai_html)

        # Combine: prepend the scoped CSS to the AI-generated HTML
        final_html = BLOG_CSS_TEMPLATE + ai_html

        return {
            'title': data.get('title', topic),
            'html_content': final_html,
            'meta_title': data.get('meta_title', '')[:60],
            'meta_description': data.get('meta_description', '')[:160],
            'keywords': data.get('keywords', ''),
        }

    except json.JSONDecodeError as e:
        logger.error(f'Failed to parse Gemini JSON response: {e}')
        return _fallback(topic, brand_name, inventory_highlights)
    except ImportError:
        logger.error('google-generativeai package not installed')
        return _fallback(topic, brand_name, inventory_highlights)
    except Exception as e:
        logger.error(f'Gemini blog generation error: {e}')
        return {'error': str(e)}


# ── Fallback when AI is unavailable ─────────────────────────
def _fallback(topic: str, brand_name: str, inventory_highlights: str) -> dict:
    title = f'{topic} | {brand_name} Blog'
    fallback_html = (
        '<div class="ad-blog-container">'
        f'<h2 class="ad-blog-heading">{topic}</h2>\n'
        f'<p class="ad-blog-paragraph">Welcome to the '
        f'<span class="ad-blog-brand-highlight">{brand_name}</span> blog. '
        f'We are currently featuring {inventory_highlights} in our inventory.</p>\n'
        f'<p class="ad-blog-paragraph">Stay tuned — this article is being prepared by our content team.</p>'
        '<div class="ad-blog-cta-box">'
        '<h3>Ready to Find Your Perfect Car?</h3>'
        '<p>Browse our latest inventory and schedule a test drive today.</p>'
        '<a href="/listings" class="ad-blog-cta-button">Browse Inventory</a>'
        '</div>'
        '</div>'
    )
    return {
        'title': title,
        'html_content': BLOG_CSS_TEMPLATE + fallback_html,
        'meta_title': title[:60],
        'meta_description': f'Read about {topic} on the {brand_name} blog. '
                            f'Browse our latest {inventory_highlights}.'[:160],
        'keywords': topic.lower().replace(' ', ', '),
    }
