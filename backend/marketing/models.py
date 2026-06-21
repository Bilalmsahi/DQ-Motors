from django.db import models
from django.utils import timezone
from inventory.models import Vehicle


class Campaign(models.Model):
    class DiscountType(models.TextChoices):
        PERCENT = 'PERCENT', 'Percentage'
        FIXED_AMOUNT = 'FIXED_AMOUNT', 'Fixed Amount'

    title = models.CharField(max_length=255, help_text="e.g. End of Year Sale")
    description = models.TextField(blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        default=DiscountType.PERCENT,
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Discount amount: percentage (e.g. 10.00) or fixed dollar amount (e.g. 500.00)",
    )
    banner_image = models.ImageField(upload_to='campaign_banners/', blank=True, null=True)
    vehicles = models.ManyToManyField(Vehicle, blank=True, related_name='campaigns')
    is_active = models.BooleanField(default=True)

    # Tracking metrics
    views = models.PositiveIntegerField(default=0)
    leads_generated = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.title

    @property
    def is_running(self):
        """True when the campaign is active AND within its date window."""
        now = timezone.now()
        return self.is_active and self.start_date <= now <= self.end_date

    @property
    def status_label(self):
        now = timezone.now()
        if not self.is_active:
            return 'INACTIVE'
        if now < self.start_date:
            return 'SCHEDULED'
        if now > self.end_date:
            return 'ENDED'
        return 'RUNNING'

    def discounted_price(self, original_price):
        """Calculate the discounted price for a given original price."""
        if self.discount_type == self.DiscountType.PERCENT:
            discount = original_price * (self.discount_value / 100)
        else:
            discount = self.discount_value
        return max(original_price - discount, 0)


class NewsletterSubscriber(models.Model):
    """Email collected from the public footer newsletter form."""
    email = models.EmailField(unique=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-subscribed_at']

    def __str__(self):
        return self.email
