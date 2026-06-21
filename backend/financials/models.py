from django.db import models
from django.core.validators import FileExtensionValidator
from inventory.models import Vehicle


def invoice_upload_path(instance, filename):
    """Generate upload path: invoices/vehicle_<id>/<filename> or invoices/overhead/"""
    if instance.vehicle_id:
        return f"invoices/vehicle_{instance.vehicle_id}/{filename}"
    return f"invoices/overhead/{filename}"


def expense_image_upload_path(instance, filename):
    """Generate upload path: expense_images/expense_<id>/<filename>"""
    return f"expense_images/expense_{instance.expense_id}/{filename}"


class Vendor(models.Model):
    """
    Vendor model to track suppliers, repair shops, transporters, etc.
    Allows tracking spending per vendor and rating their service quality.
    """
    class ServiceCategory(models.TextChoices):
        MECHANIC = 'MECHANIC', 'Mechanic / Repair Shop'
        BODY_SHOP = 'BODY_SHOP', 'Body Shop / Paint'
        TRANSPORTER = 'TRANSPORTER', 'Transporter / Shipping'
        DMV_TITLE = 'DMV_TITLE', 'DMV / Title Services'
        DETAILING = 'DETAILING', 'Detailing / Cleaning'
        PARTS = 'PARTS', 'Parts Supplier'
        OTHER = 'OTHER', 'Other'

    class PaymentTerms(models.TextChoices):
        DUE_ON_RECEIPT = 'DUE_ON_RECEIPT', 'Due on Receipt'
        NET_15 = 'NET_15', 'Net 15'
        NET_30 = 'NET_30', 'Net 30'
        NET_60 = 'NET_60', 'Net 60'

    class PaymentMethod(models.TextChoices):
        CHECK = 'CHECK', 'Check'
        WIRE = 'WIRE', 'Wire Transfer'
        ACH = 'ACH', 'ACH'
        CASH = 'CASH', 'Cash'

    name = models.CharField(max_length=200)
    service_category = models.CharField(
        max_length=20,
        choices=ServiceCategory.choices,
        default=ServiceCategory.OTHER,
        help_text="Primary type of service this vendor provides"
    )
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    rating = models.PositiveSmallIntegerField(
        default=3,
        help_text="Internal rating 1-5 stars for work quality"
    )
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(
        default=True,
        help_text="Inactive vendors won't appear in dropdown selections"
    )
    tax_id = models.CharField(
        max_length=50,
        blank=True,
        help_text="EIN, SSN, or other tax identification number"
    )
    payment_terms = models.CharField(
        max_length=20,
        choices=PaymentTerms.choices,
        default=PaymentTerms.DUE_ON_RECEIPT,
    )
    preferred_payment_method = models.CharField(
        max_length=10,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CHECK,
    )
    account_details = models.TextField(
        blank=True,
        help_text="Bank / account info, e.g. 'Bank: Chase, Acct: ****1234'"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_service_category_display()})"
    
    @property
    def total_spend(self):
        """Calculate total amount spent with this vendor"""
        total = self.expenses.aggregate(total=models.Sum('amount'))['total']
        return total or 0
    
    @property
    def job_count(self):
        """Count total number of jobs/expenses with this vendor"""
        return self.expenses.count()


class Expense(models.Model):
    class Category(models.TextChoices):
        PURCHASE_PRICE = 'PURCHASE_PRICE', 'Purchase Price'
        TAX = 'TAX', 'Tax & Registration'
        REPAIR = 'REPAIR', 'Repair & Maintenance'
        TRANSPORT = 'TRANSPORT', 'Transport/Shipping'
        INSPECTION = 'INSPECTION', 'Inspection'
        DETAIL = 'DETAIL', 'Detailing'
        # Overhead (not linked to a vehicle)
        RENT = 'RENT', 'Rent / Lease'
        MARKETING = 'MARKETING', 'Marketing / Advertising'
        SALARY = 'SALARY', 'Salary / Payroll'
        UTILITIES = 'UTILITIES', 'Utilities'
        INSURANCE = 'INSURANCE', 'Insurance'
        OTHER = 'OTHER', 'Other'
    
    class ServiceType(models.TextChoices):
        OIL_CHANGE = 'OIL_CHANGE', 'Oil Change'
        TIRE_ROTATION = 'TIRE_ROTATION', 'Tire Rotation'
        TIRE_REPLACEMENT = 'TIRE_REPLACEMENT', 'Tire Replacement'
        BRAKE_SERVICE = 'BRAKE_SERVICE', 'Brake Service'
        TRANSMISSION = 'TRANSMISSION', 'Transmission Service'
        ENGINE_REPAIR = 'ENGINE_REPAIR', 'Engine Repair'
        BODY_WORK = 'BODY_WORK', 'Body Work'
        PAINT = 'PAINT', 'Paint / Touch-up'
        ELECTRICAL = 'ELECTRICAL', 'Electrical'
        AC_HEATING = 'AC_HEATING', 'AC / Heating'
        SUSPENSION = 'SUSPENSION', 'Suspension'
        EXHAUST = 'EXHAUST', 'Exhaust System'
        INSPECTION = 'INSPECTION', 'Inspection'
        DETAILING = 'DETAILING', 'Detailing'
        OTHER = 'OTHER', 'Other'

    # related_name='expenses' allows us to access vehicle.expenses.all()
    # Nullable for overhead expenses (rent, marketing, salaries, etc.)
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='expenses',
        null=True,
        blank=True,
    )
    category = models.CharField(max_length=20, choices=Category.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(auto_now_add=True)
    
    # Service type - for detailed categorization of repairs
    service_type = models.CharField(
        max_length=30, 
        choices=ServiceType.choices, 
        blank=True, 
        null=True,
        help_text="Specific type of service (for REPAIR category)"
    )
    
    # Visibility - allows showing certain repairs to customers
    is_public = models.BooleanField(
        default=False,
        help_text="If True, this record can be shown to customers (e.g., 'New Tires')"
    )
    
    # Vendor - can be FK or just text
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses'
    )
    vendor_name = models.CharField(max_length=200, blank=True, help_text="Alternative to FK - just enter vendor name")
    
    # Invoice/Receipt file - supports PDF and images
    invoice_file = models.FileField(
        upload_to=invoice_upload_path,
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png', 'gif'])],
        help_text="Upload invoice or receipt (PDF, JPG, PNG)"
    )
    
    # Legacy field - keep for backwards compatibility
    receipt = models.ImageField(upload_to='receipts/', blank=True, null=True)
    
    description = models.TextField(blank=True)

    is_paid = models.BooleanField(
        default=False,
        help_text="Whether this expense / bill has been paid"
    )
    paid_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date the bill was actually paid"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        if self.vehicle:
            return f"{self.get_category_display()} - ${self.amount} for {self.vehicle.vin}"
        return f"{self.get_category_display()} - ${self.amount} (Overhead)"
    
    @property
    def vendor_display(self):
        """Return vendor name from FK or text field"""
        if self.vendor:
            return self.vendor.name
        return self.vendor_name or "N/A"
    
    @property
    def invoice_url(self):
        """Return the invoice file URL if exists"""
        if self.invoice_file:
            return self.invoice_file.url
        if self.receipt:
            return self.receipt.url
        return None
    
    @property
    def service_type_display(self):
        """Return human-readable service type"""
        if self.service_type:
            return dict(self.ServiceType.choices).get(self.service_type, self.service_type)
        return None


class ExpenseImage(models.Model):
    """
    Before/After photos for repair and maintenance expenses.
    Allows showing proof of work to customers.
    """
    class CaptionType(models.TextChoices):
        BEFORE = 'BEFORE', 'Before Repair'
        AFTER = 'AFTER', 'After Repair'
        DURING = 'DURING', 'During Repair'
        PARTS = 'PARTS', 'Parts / Materials'
        OTHER = 'OTHER', 'Other'
    
    expense = models.ForeignKey(
        Expense,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(upload_to=expense_image_upload_path)
    caption = models.CharField(
        max_length=50, 
        choices=CaptionType.choices,
        default=CaptionType.OTHER
    )
    description = models.CharField(max_length=255, blank=True)
    order = models.PositiveIntegerField(default=0, help_text="Display order")
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.get_caption_display()} - Expense #{self.expense_id}"
    
    @property
    def image_url(self):
        if self.image:
            return self.image.url
        return None