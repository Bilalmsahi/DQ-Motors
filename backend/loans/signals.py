"""
Signals for the loans app.

When a Deal's status changes to ACCEPTED the system automatically creates a
Loan object and generates the full amortization schedule.
"""

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from crm.models import Deal
from .models import Loan
from .utils import generate_amortization_schedule


# ── Cache old Deal status to detect transitions ─────────────────────────────
_deal_status_cache = {}


@receiver(pre_save, sender=Deal)
def cache_deal_status(sender, instance, **kwargs):
    """Remember the old status before the save."""
    if instance.pk:
        try:
            _deal_status_cache[instance.pk] = (
                Deal.objects.values_list('status', flat=True).get(pk=instance.pk)
            )
        except Deal.DoesNotExist:
            _deal_status_cache[instance.pk] = None
    else:
        _deal_status_cache[instance.pk] = None


@receiver(post_save, sender=Deal)
def create_loan_on_accepted_deal(sender, instance, created, **kwargs):
    """
    When a Deal transitions to ACCEPTED (and doesn't already have a loan),
    create a Loan + its installment schedule.
    """
    old_status = _deal_status_cache.pop(instance.pk, None)

    # Only act when status just changed to ACCEPTED
    if instance.status != Deal.Status.ACCEPTED:
        return
    if old_status == Deal.Status.ACCEPTED:
        return

    # Skip if a loan already exists for this deal
    if hasattr(instance, 'loan'):
        try:
            instance.loan  # noqa – access to trigger DoesNotExist if missing
            return
        except Loan.DoesNotExist:
            pass

    # Derive values from the deal's computed properties
    principal = instance.amount_financed
    if principal <= 0:
        return  # nothing to finance

    loan = Loan.objects.create(
        deal=instance,
        customer=instance.lead,
        principal_amount=principal,
        interest_rate=instance.interest_rate,
        term_months=instance.term_months,
        start_date=timezone.now().date(),
        status=Loan.Status.ACTIVE,
    )

    generate_amortization_schedule(loan)
