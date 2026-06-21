from django.db import models
from django.conf import settings
from crm.models import Deal, Lead


class Loan(models.Model):
    """In-house (Buy-Here-Pay-Here) loan linked to an accepted Deal."""

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        PAID_OFF = 'PAID_OFF', 'Paid Off'
        DEFAULTED = 'DEFAULTED', 'Defaulted'
        REPOSSESSED = 'REPOSSESSED', 'Repossessed'

    deal = models.OneToOneField(
        Deal, on_delete=models.CASCADE, related_name='loan',
        null=True, blank=True,
        help_text='The deal this loan originated from (optional for direct financing)'
    )
    customer = models.ForeignKey(
        Lead, on_delete=models.CASCADE, related_name='loans',
        help_text='The lead / customer receiving the loan'
    )
    principal_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text='Amount financed (vehicle price portion)'
    )
    admin_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text='One-time dealership administration fee added to the financed amount'
    )
    interest_rate = models.DecimalField(
        max_digits=5, decimal_places=2,
        help_text='Annual interest rate as a percentage (e.g. 5.9)'
    )
    term_months = models.PositiveIntegerField(
        help_text='Loan term in months'
    )
    start_date = models.DateField(
        help_text='First payment due one month after this date'
    )
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.ACTIVE
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Loan #{self.id} – {self.customer} ({self.status})"

    # ── Computed helpers ──────────────────────────────────────────────

    @property
    def effective_principal(self):
        """Total financed amount including admin fee."""
        from decimal import Decimal
        return self.principal_amount + (self.admin_fee or Decimal('0.00'))

    @property
    def monthly_payment(self):
        """Standard amortisation formula on principal + admin_fee."""
        from decimal import Decimal
        principal = float(self.effective_principal)
        if principal <= 0 or self.term_months <= 0:
            return Decimal('0.00')
        annual_rate = float(self.interest_rate) / 100
        if annual_rate == 0:
            return Decimal(str(round(principal / self.term_months, 2)))
        mr = annual_rate / 12
        n = self.term_months
        payment = principal * (mr * (1 + mr) ** n) / ((1 + mr) ** n - 1)
        return Decimal(str(round(payment, 2)))

    @property
    def total_paid(self):
        """Sum of all payments received."""
        from decimal import Decimal
        return self.installments.aggregate(
            total=models.Sum('amount_paid')
        )['total'] or Decimal('0.00')

    @property
    def remaining_balance(self):
        """Principal + total interest minus what has been paid."""
        from decimal import Decimal
        total_owed = self.installments.aggregate(
            total=models.Sum('amount_due')
        )['total'] or Decimal('0.00')
        return max(total_owed - self.total_paid, Decimal('0.00'))

    @property
    def next_due_date(self):
        """Date of the oldest unpaid installment."""
        inst = self.installments.filter(is_paid=False).order_by('due_date').first()
        return inst.due_date if inst else None


class Installment(models.Model):
    """One monthly payment row in the amortization schedule."""

    loan = models.ForeignKey(
        Loan, on_delete=models.CASCADE, related_name='installments'
    )
    installment_number = models.PositiveIntegerField()
    due_date = models.DateField()
    amount_due = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    is_paid = models.BooleanField(default=False)
    penalty_fee = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        help_text='Late fee applied to this installment'
    )

    class Meta:
        ordering = ['due_date']
        unique_together = ['loan', 'installment_number']

    def __str__(self):
        status = '✓' if self.is_paid else '○'
        return f"{status} #{self.installment_number} – ${self.amount_due} due {self.due_date}"


class PaymentTransaction(models.Model):
    """Ledger entry for a payment received from a customer."""

    class Method(models.TextChoices):
        CASH = 'CASH', 'Cash'
        CARD = 'CARD', 'Card'
        BANK_TRANSFER = 'BANK_TRANSFER', 'Bank Transfer'

    loan = models.ForeignKey(
        Loan, on_delete=models.CASCADE, related_name='payments'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField(auto_now_add=True)
    method = models.CharField(
        max_length=15, choices=Method.choices, default=Method.CASH
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='recorded_payments'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"${self.amount} on {self.date} ({self.method})"
