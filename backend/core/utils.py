import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def send_html_email(subject, template_name, context, recipient_list):
    """
    Send a responsive HTML email with a plain-text fallback.

    Args:
        subject:        Email subject line.
        template_name:  Path to an HTML template (e.g. 'emails/trade_in_offer.html').
        context:        Dict passed to the template for rendering.
        recipient_list: List of recipient email addresses.
    """
    # Inject common context available to every email template
    context.setdefault('site_url', settings.SITE_URL)
    context.setdefault('company_name', 'DQ Motors')

    html_content = render_to_string(template_name, context)
    text_content = strip_tags(html_content)

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipient_list,
    )
    email.attach_alternative(html_content, 'text/html')
    email.send(fail_silently=False)
