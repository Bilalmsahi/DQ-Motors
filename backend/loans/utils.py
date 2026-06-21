"""
Amortization Engine
───────────────────
generate_amortization_schedule(loan)
  → Creates `term_months` Installment rows for the given Loan.
  → Uses standard amortisation formula for the fixed monthly payment.
  → Increments due_date by 1 month per row via dateutil.relativedelta.
"""

from decimal import Decimal, ROUND_HALF_UP
from dateutil.relativedelta import relativedelta
from .models import Installment


def generate_amortization_schedule(loan):
    """
    Build the full installment schedule for *loan* and bulk-create rows.

    The monthly payment is computed using the standard formula:
        M = P * [ r(1+r)^n ] / [ (1+r)^n - 1 ]
    where
        P = principal, r = monthly rate, n = number of payments.

    The last installment is adjusted so the schedule sums to exactly
    (monthly_payment * n) — avoiding floating-point drift.
    """
    principal = float(loan.effective_principal)
    annual_rate = float(loan.interest_rate) / 100
    n = loan.term_months

    if principal <= 0 or n <= 0:
        return []

    # ── Compute fixed monthly payment ────────────────────────────────
    if annual_rate == 0:
        monthly = Decimal(str(round(principal / n, 2)))
    else:
        mr = annual_rate / 12
        monthly = Decimal(
            str(round(
                principal * (mr * (1 + mr) ** n) / ((1 + mr) ** n - 1), 2
            ))
        )

    # ── Build installment rows ───────────────────────────────────────
    installments = []
    total_scheduled = Decimal('0.00')

    for i in range(1, n + 1):
        due = loan.start_date + relativedelta(months=i)

        if i < n:
            amount = monthly
        else:
            # Last payment absorbs any rounding remainder
            amount = (monthly * n) - total_scheduled

        amount = amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        total_scheduled += amount

        installments.append(
            Installment(
                loan=loan,
                installment_number=i,
                due_date=due,
                amount_due=amount,
            )
        )

    Installment.objects.bulk_create(installments)
    return installments
