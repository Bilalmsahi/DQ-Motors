from django.db import models
from django.conf import settings


class SocialCredential(models.Model):
    """
    Stores OAuth tokens for social media pages connected by dealers.
    Tokens are encrypted at rest via social/utils.py helpers.
    """

    class Platform(models.TextChoices):
        FACEBOOK = 'FACEBOOK', 'Facebook'
        INSTAGRAM = 'INSTAGRAM', 'Instagram'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='social_credentials',
        help_text='The dealer who connected this page.',
    )
    platform = models.CharField(
        max_length=20,
        choices=Platform.choices,
        default=Platform.FACEBOOK,
    )
    page_name = models.CharField(max_length=255)
    page_id = models.CharField(
        max_length=100,
        unique=True,
        help_text='Facebook / Instagram Page ID.',
    )
    access_token = models.TextField(
        help_text='Encrypted long-lived Page Access Token.',
    )
    token_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Null = token does not expire (common for Page tokens).',
    )
    is_active = models.BooleanField(default=True)
    connected_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-connected_at']
        verbose_name = 'Social Credential'
        verbose_name_plural = 'Social Credentials'
        unique_together = [('user', 'page_id')]

    def __str__(self):
        return f'{self.page_name} ({self.get_platform_display()}) — {self.user.username}'

    # ── convenience helpers (encrypt/decrypt on access) ───
    def set_token(self, raw_token: str):
        """Encrypt and store the token."""
        from .utils import encrypt_token
        self.access_token = encrypt_token(raw_token)

    def get_token(self) -> str:
        """Decrypt and return the token."""
        from .utils import decrypt_token
        return decrypt_token(self.access_token)
