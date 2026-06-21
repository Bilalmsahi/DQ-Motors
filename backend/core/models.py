import uuid
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        SALES = "SALES", "Sales Rep"
        TECHNICIAN = "TECHNICIAN", "Technician"
        CUSTOMER = "CUSTOMER", "Customer"  # Regular users who can list their cars

    role = models.CharField(
        max_length=50, 
        choices=Role.choices, 
        default=Role.CUSTOMER  # New signups are customers by default
    )
    
    # Optional phone number for contact
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


# ============================================================
# Feature 30 – Audit Logs & Activity Tracking
# ============================================================
class AuditLog(models.Model):
    """
    System-wide action log for accountability.
    Records who did what, when, and what changed.
    """

    class Action(models.TextChoices):
        CREATE = 'CREATE', 'Create'
        UPDATE = 'UPDATE', 'Update'
        DELETE = 'DELETE', 'Delete'
        LOGIN  = 'LOGIN',  'Login'
        EXPORT = 'EXPORT', 'Export'

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=10, choices=Action.choices)
    target_model = models.CharField(
        max_length=100,
        help_text="Model name, e.g. 'Vehicle', 'Lead'",
    )
    target_object_id = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Primary key of the affected object",
    )
    target_repr = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text="Human-readable representation, e.g. '2024 Toyota Camry'",
    )
    changes = models.JSONField(
        default=dict,
        blank=True,
        help_text="Field-level diff: {'field': {'old': ..., 'new': ...}}",
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        indexes = [
            models.Index(fields=['target_model', 'target_object_id']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        who = self.user.username if self.user else 'System'
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {who} {self.action} {self.target_model} {self.target_repr}"


class DealerConfiguration(models.Model):
    """
    Singleton model for dealer-specific feature flags and configuration.
    Only one instance of this model can exist in the database.
    """
    
    # Feature Flags
    enable_user_ads = models.BooleanField(
        default=False,
        verbose_name="Enable User Ads",
        help_text="Allow users to post their own vehicle listings"
    )
    enable_ai_description = models.BooleanField(
        default=True,
        verbose_name="Enable AI Description",
        help_text="Enable AI-powered vehicle description generation"
    )
    enable_vin_decoder = models.BooleanField(
        default=True,
        verbose_name="Enable VIN Decoder",
        help_text="Enable automatic VIN decoding feature"
    )
    enable_chat_support = models.BooleanField(
        default=False,
        verbose_name="Enable Chat Support",
        help_text="Enable live chat support widget"
    )
    enable_invoice_ocr = models.BooleanField(
        default=True,
        verbose_name="Enable Invoice OCR",
        help_text="Allow admins to scan purchase invoices for suggested cost data"
    )

    # Financial defaults
    default_purchase_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('5.00'),
        verbose_name="Default Purchase Tax Rate",
        help_text="Default tax percentage for purchase costing workflows"
    )
    
    # Metadata
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Dealer Configuration"
        verbose_name_plural = "Dealer Configuration"
    
    def __str__(self):
        return "Dealer Configuration"
    
    def save(self, *args, **kwargs):
        """
        Ensure only one instance exists (Singleton pattern).
        Always use pk=1 for the single instance.
        """
        self.pk = 1
        super().save(*args, **kwargs)
        # Clear cache when configuration changes
        cache.delete('dealer_config')
    
    def delete(self, *args, **kwargs):
        """
        Prevent deletion of the singleton instance.
        """
        pass  # Do nothing - prevent deletion
    
    @classmethod
    def get_config(cls):
        """
        Get the singleton configuration instance.
        Creates one with defaults if it doesn't exist.
        Uses caching for performance.
        """
        # Try cache first
        config = cache.get('dealer_config')
        if config is None:
            # Get or create the singleton instance
            config, created = cls.objects.get_or_create(pk=1)
            # Cache for 5 minutes
            cache.set('dealer_config', config, 300)
        return config


def default_expiry():
    return timezone.now() + timedelta(days=7)


class SharedDocumentLink(models.Model):
    """
    Temporary, secure sharing link for a document.
    Token-based access with expiry — allows inline viewing without download.
    """
    token = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    document_path = models.CharField(
        max_length=500,
        help_text="Relative path to the file inside MEDIA_ROOT (e.g. vehicle_docs/vehicle_2/report.pdf)",
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shared_links',
    )
    expires_at = models.DateTimeField(
        default=default_expiry,
        help_text="Link expires after this timestamp (default 7 days).",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Shared Document Link"

    def __str__(self):
        return f"Link {self.token} → {self.document_path}"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return self.is_active and not self.is_expired


# ============================================================
# Feature 31 – Legal & Compliance Tools (Mini-CMS)
# ============================================================
class LegalDocument(models.Model):
    class DocType(models.TextChoices):
        PRIVACY_POLICY = 'PRIVACY_POLICY', 'Privacy Policy'
        TERMS_CONDITIONS = 'TERMS_CONDITIONS', 'Terms & Conditions'
        RETURN_POLICY = 'RETURN_POLICY', 'Return Policy'

    doc_type = models.CharField(
        max_length=30,
        choices=DocType.choices,
        unique=True,
        help_text='Each document type can only exist once.',
    )
    title = models.CharField(max_length=200)
    content = models.TextField(
        blank=True,
        default='',
        help_text='HTML or Markdown content for the legal page.',
    )
    last_updated = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['doc_type']
        verbose_name = 'Legal Document'
        verbose_name_plural = 'Legal Documents'

    def __str__(self):
        return self.title or self.get_doc_type_display()


# ============================================================
# Feature 43 – Review & Testimonial Management
# ============================================================
class Testimonial(models.Model):
    """
    Customer reviews/testimonials that can originate from the website,
    Google, or Facebook.  Public submissions start as PENDING until
    an admin approves them.  Admins can also import external reviews
    directly with APPROVED status.
    """

    class Source(models.TextChoices):
        WEBSITE  = 'WEBSITE',  'Website'
        GOOGLE   = 'GOOGLE',   'Google'
        FACEBOOK = 'FACEBOOK', 'Facebook'

    class Status(models.TextChoices):
        PENDING  = 'PENDING',  'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    customer_name = models.CharField(max_length=150)
    rating = models.PositiveSmallIntegerField(
        help_text='Rating from 1 to 5',
    )
    review_text = models.TextField()
    source = models.CharField(
        max_length=10,
        choices=Source.choices,
        default=Source.WEBSITE,
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Testimonial'
        verbose_name_plural = 'Testimonials'

    def __str__(self):
        return f"{self.customer_name} – {self.rating}★ ({self.get_source_display()})"


class Notification(models.Model):
    """In-app notification delivered to a staff member."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    link = models.CharField(
        max_length=500,
        blank=True,
        help_text='Frontend route to redirect to, e.g. /admin/leads/5',
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{'✓' if self.is_read else '●'} {self.title} → {self.user.username}"
