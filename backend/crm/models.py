from django.db import models
from django.conf import settings # To refer to Custom User
from inventory.models import Vehicle # Import Vehicle model

class Customer(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Lead(models.Model):
    class Status(models.TextChoices):
        NEW = 'NEW', 'New'
        HOT = 'HOT', 'Hot'
        COLD = 'COLD', 'Cold'
        CLOSED = 'CLOSED', 'Closed'

    class Source(models.TextChoices):
        WEBSITE = 'WEBSITE', 'Website'
        WALKIN = 'WALKIN', 'Walk-in'
        REFERRAL = 'REFERRAL', 'Referral'
    
    class LeadType(models.TextChoices):
        GENERAL_INQUIRY = 'GENERAL_INQUIRY', 'General Inquiry'
        VEHICLE_REQUEST = 'VEHICLE_REQUEST', 'Vehicle Request'
        TEST_DRIVE = 'TEST_DRIVE', 'Test Drive'
        FINANCING = 'FINANCING', 'Financing Application'
        TRADE_IN = 'TRADE_IN', 'Trade-In Appraisal'

    # Core fields
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='leads')
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='lead_assignments',
        limit_choices_to={'role': 'SALES'}
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.WEBSITE)
    lead_type = models.CharField(
        max_length=20, 
        choices=LeadType.choices, 
        default=LeadType.GENERAL_INQUIRY
    )
    notes = models.TextField(blank=True)
    
    # Vehicle Request specific fields (only used when lead_type == VEHICLE_REQUEST)
    desired_make = models.CharField(max_length=100, blank=True)
    desired_model = models.CharField(max_length=100, blank=True)
    max_budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    preferred_year_min = models.PositiveIntegerField(null=True, blank=True)
    preferred_year_max = models.PositiveIntegerField(null=True, blank=True)
    
    # Financing-specific field
    credit_check_consent = models.BooleanField(
        null=True, blank=True, default=None,
        help_text='Whether the applicant consented to a credit check (FINANCING leads only)'
    )

    # Campaign tracking
    source_campaign = models.ForeignKey(
        'marketing.Campaign',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leads',
        help_text="The campaign that generated this lead (auto-set if vehicle is in an active campaign)",
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.lead_type == self.LeadType.VEHICLE_REQUEST:
            return f"{self.customer.name} - Looking for {self.desired_make} {self.desired_model}"
        return f"{self.customer.name} - {self.status}"

class Appointment(models.Model):
    class Type(models.TextChoices):
        TEST_DRIVE = 'TEST_DRIVE', 'Test Drive'
        INSPECTION = 'INSPECTION', 'Inspection'
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'
        NO_SHOW = 'NO_SHOW', 'No Show'
    
    class TimeSlot(models.TextChoices):
        SLOT_09_00 = '09:00', '9:00 AM'
        SLOT_09_30 = '09:30', '9:30 AM'
        SLOT_10_00 = '10:00', '10:00 AM'
        SLOT_10_30 = '10:30', '10:30 AM'
        SLOT_11_00 = '11:00', '11:00 AM'
        SLOT_11_30 = '11:30', '11:30 AM'
        SLOT_12_00 = '12:00', '12:00 PM'
        SLOT_12_30 = '12:30', '12:30 PM'
        SLOT_13_00 = '13:00', '1:00 PM'
        SLOT_13_30 = '13:30', '1:30 PM'
        SLOT_14_00 = '14:00', '2:00 PM'
        SLOT_14_30 = '14:30', '2:30 PM'
        SLOT_15_00 = '15:00', '3:00 PM'
        SLOT_15_30 = '15:30', '3:30 PM'
        SLOT_16_00 = '16:00', '4:00 PM'
        SLOT_16_30 = '16:30', '4:30 PM'
        SLOT_17_00 = '17:00', '5:00 PM'

    # Customer booking the appointment (can be linked to User if logged in)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='appointments')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='appointments',
        help_text='Linked user account if customer is registered'
    )
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='appointments')
    lead = models.ForeignKey(
        Lead, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='appointments',
        help_text='Auto-linked lead for CRM tracking'
    )
    
    # Scheduling
    date = models.DateField()
    time_slot = models.CharField(max_length=5, choices=TimeSlot.choices, default=TimeSlot.SLOT_09_00)
    
    # Type and Status
    appointment_type = models.CharField(
        max_length=20, 
        choices=Type.choices, 
        default=Type.TEST_DRIVE
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # Additional info
    notes = models.TextField(blank=True, help_text='Customer notes or special requests')
    admin_notes = models.TextField(blank=True, help_text='Internal notes for staff')
    
    # QR Code for check-in (generated when status changes to CONFIRMED)
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    
    # Check-in/Check-out tracking
    check_in_time = models.DateTimeField(null=True, blank=True, help_text='When customer checked in')
    check_out_time = models.DateTimeField(null=True, blank=True, help_text='When customer checked out')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'time_slot']
        # Prevent double-booking: same vehicle can't have two appointments at same date+time
        constraints = [
            models.UniqueConstraint(
                fields=['vehicle', 'date', 'time_slot'],
                name='unique_vehicle_appointment_slot',
                condition=~models.Q(status='CANCELLED')  # Allow cancelled slots to be rebooked
            )
        ]

    def __str__(self):
        return f"{self.get_appointment_type_display()} - {self.vehicle} on {self.date} at {self.get_time_slot_display()}"
    
    def clean(self):
        """Validate that the slot is not already booked for this vehicle."""
        from django.core.exceptions import ValidationError
        
        # Check for double-booking (excluding cancelled appointments and self)
        conflicting = Appointment.objects.filter(
            vehicle=self.vehicle,
            date=self.date,
            time_slot=self.time_slot
        ).exclude(
            status=self.Status.CANCELLED
        ).exclude(
            pk=self.pk
        )
        
        if conflicting.exists():
            raise ValidationError({
                'time_slot': f'This vehicle is already booked for {self.date} at {self.get_time_slot_display()}.'
            })
    
    @property
    def is_checked_in(self):
        """Check if customer has checked in."""
        return self.check_in_time is not None
    
    @property
    def is_checked_out(self):
        """Check if customer has checked out."""
        return self.check_out_time is not None
    
    @property
    def duration_minutes(self):
        """Calculate duration in minutes if both check-in and check-out are recorded."""
        if self.check_in_time and self.check_out_time:
            delta = self.check_out_time - self.check_in_time
            return int(delta.total_seconds() / 60)
        return None
    
    @property
    def duration_display(self):
        """Human-readable duration string."""
        minutes = self.duration_minutes
        if minutes is None:
            return None
        hours = minutes // 60
        mins = minutes % 60
        if hours > 0:
            return f"{hours}h {mins}m"
        return f"{mins}m"


class Task(models.Model):
    class Priority(models.TextChoices):
        HIGH = 'HIGH', 'High'
        MEDIUM = 'MEDIUM', 'Medium'
        LOW = 'LOW', 'Low'

    title = models.CharField(max_length=255)
    lead = models.ForeignKey(
        Lead, on_delete=models.CASCADE,
        related_name='tasks', null=True, blank=True
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    due_date = models.DateTimeField()
    is_completed = models.BooleanField(default=False)
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.MEDIUM
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date']

    def __str__(self):
        return self.title


class Interaction(models.Model):
    class InteractionType(models.TextChoices):
        CALL = 'CALL', 'Call'
        EMAIL = 'EMAIL', 'Email'
        MEETING = 'MEETING', 'Meeting'
        NOTE = 'NOTE', 'Note'

    lead = models.ForeignKey(
        Lead, on_delete=models.CASCADE, related_name='interactions'
    )
    interaction_type = models.CharField(
        max_length=10, choices=InteractionType.choices
    )
    notes = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='interactions'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_interaction_type_display()} - {self.lead}"


class Deal(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SENT = 'SENT', 'Sent'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REJECTED = 'REJECTED', 'Rejected'

    # Relationships
    lead = models.ForeignKey(
        Lead, on_delete=models.CASCADE, related_name='deals'
    )
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE, related_name='deals'
    )
    sales_rep = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='deals'
    )

    # Financial fields
    agreed_price = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Negotiated sale price (defaults to listing price)'
    )
    trade_in_allowance = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text='Value of customer trade-in vehicle'
    )
    cash_down_payment = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text='Cash down payment from customer'
    )
    doc_fee = models.DecimalField(
        max_digits=8, decimal_places=2, default=499.00,
        help_text='Documentation / dealer fee'
    )
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=6.25,
        help_text='Sales tax rate as a percentage (e.g. 6.25)'
    )
    term_months = models.PositiveIntegerField(
        default=60,
        help_text='Loan term in months'
    )
    interest_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=5.90,
        help_text='Annual interest rate as a percentage (e.g. 5.9)'
    )

    # Status & meta
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    version_name = models.CharField(
        max_length=100, blank=True, default='Offer #1',
        help_text='Friendly label (e.g. "Aggressive Discount")'
    )
    customer_signature = models.ImageField(
        upload_to='signatures/', blank=True, null=True,
        help_text='Customer signature image captured on acceptance'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Deal #{self.id} – {self.version_name} ({self.status})"

    # ---------- computed helpers ----------

    @property
    def subtotal(self):
        """Price + doc fee."""
        return self.agreed_price + self.doc_fee

    @property
    def tax_amount(self):
        """Tax applied on (agreed_price + doc_fee)."""
        from decimal import Decimal
        return (self.subtotal * self.tax_rate / Decimal('100')).quantize(Decimal('0.01'))

    @property
    def total_price(self):
        """Subtotal + tax."""
        return self.subtotal + self.tax_amount

    @property
    def amount_financed(self):
        """Total after deducting trade-in and down payment."""
        financed = self.total_price - self.trade_in_allowance - self.cash_down_payment
        return max(financed, 0)

    @property
    def monthly_payment(self):
        """Estimated monthly payment using standard amortisation formula."""
        from decimal import Decimal
        principal = float(self.amount_financed)
        if principal <= 0 or self.term_months <= 0:
            return Decimal('0.00')
        annual_rate = float(self.interest_rate) / 100
        if annual_rate == 0:
            return Decimal(str(round(principal / self.term_months, 2)))
        monthly_rate = annual_rate / 12
        n = self.term_months
        payment = principal * (monthly_rate * (1 + monthly_rate) ** n) / ((1 + monthly_rate) ** n - 1)
        return Decimal(str(round(payment, 2)))


class TradeIn(models.Model):
    """Trade-in appraisal submitted by a customer for valuation."""

    class Condition(models.TextChoices):
        EXCELLENT = 'EXCELLENT', 'Excellent'
        GOOD = 'GOOD', 'Good'
        FAIR = 'FAIR', 'Fair'
        POOR = 'POOR', 'Poor'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        OFFERED = 'OFFERED', 'Offered'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REJECTED = 'REJECTED', 'Rejected'

    # ── Vehicle details ──────────────────────────────────────────────
    vin = models.CharField(max_length=17, blank=True)
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    mileage = models.PositiveIntegerField()
    condition = models.CharField(
        max_length=10, choices=Condition.choices, default=Condition.GOOD
    )

    # ── Customer info ────────────────────────────────────────────────
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)

    # ── Photos (all optional) ────────────────────────────────────────
    front_photo = models.ImageField(
        upload_to='trade_in_photos/', blank=True, null=True
    )
    back_photo = models.ImageField(
        upload_to='trade_in_photos/', blank=True, null=True
    )
    interior_photo = models.ImageField(
        upload_to='trade_in_photos/', blank=True, null=True
    )
    side_photo = models.ImageField(
        upload_to='trade_in_photos/', blank=True, null=True
    )

    # ── Valuation (filled by admin) ──────────────────────────────────
    offer_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='Appraised value offered to customer'
    )
    admin_notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )

    # ── System-generated estimate (heuristic) ────────────────────────
    estimated_value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='Auto-generated estimate at submission time. Internal reference; not the final offer.'
    )
    estimated_value_low = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='Lower bound of the estimate range.'
    )
    estimated_value_high = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='Upper bound of the estimate range.'
    )
    valuation_method = models.CharField(
        max_length=32, blank=True,
        help_text='Source that produced the estimate: "marketcheck" or "heuristic-v1".'
    )

    # ── Link to lead (auto-matched by email) ─────────────────────────
    lead = models.ForeignKey(
        Lead, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='trade_ins',
        help_text='Auto-linked when customer email matches a lead'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.year} {self.make} {self.model} – {self.name} ({self.status})"