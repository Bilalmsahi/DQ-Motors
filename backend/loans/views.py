from decimal import Decimal
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from core.permissions import IsAdminOrSales
from .models import Loan, Installment, PaymentTransaction
from .serializers import (
    LoanSerializer, LoanSummarySerializer,
    PaymentTransactionSerializer, MakePaymentSerializer,
)
from .utils import generate_amortization_schedule


class LoanViewSet(viewsets.ModelViewSet):
    """
    Loan management — staff-only (ADMIN or SALES). The platform has no
    customer-facing loan portal; loan/payment records contain other
    customers' financial data and must never be exposed to a plain
    authenticated (e.g. self-registered customer) account.
    """
    queryset = Loan.objects.select_related(
        'deal__vehicle', 'customer__customer'
    ).prefetch_related('installments').all()
    pagination_class = None
    permission_classes = [IsAdminOrSales]

    def get_serializer_class(self):
        if self.action == 'list':
            return LoanSummarySerializer
        return LoanSerializer

    def get_queryset(self):
        qs = super().get_queryset()

        # Filter by status
        loan_status = self.request.query_params.get('status')
        if loan_status:
            qs = qs.filter(status=loan_status.upper())

        # Filter by customer (lead id)
        customer = self.request.query_params.get('customer')
        if customer:
            qs = qs.filter(customer_id=customer)

        # Filter by deal
        deal = self.request.query_params.get('deal')
        if deal:
            qs = qs.filter(deal_id=deal)

        return qs

    def perform_create(self, serializer):
        """Create a loan and auto-generate its amortization schedule."""
        loan = serializer.save()
        # Only generate if schedule doesn't already exist (signals may have created it)
        if not loan.installments.exists():
            generate_amortization_schedule(loan)
        return loan

    # ── Make Payment (waterfall logic) ───────────────────────────────
    @action(detail=True, methods=['post'], url_path='make-payment')
    def make_payment(self, request, pk=None):
        """
        POST /api/loans/{id}/make-payment/
        Input: { amount, method?, notes? }

        Waterfall logic:
        1. Get the oldest unpaid installment.
        2. Apply as much of the payment as needed.
        3. If there is leftover, roll into the next unpaid installment.
        4. Repeat until the full amount is distributed.
        5. Create a PaymentTransaction record.
        6. If all installments are paid, mark the loan as PAID_OFF.
        """
        loan = self.get_object()

        serializer = MakePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        amount = serializer.validated_data['amount']
        method = serializer.validated_data['method']
        notes = serializer.validated_data.get('notes', '')

        if amount <= 0:
            return Response(
                {'detail': 'Amount must be greater than zero.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if loan.status != Loan.Status.ACTIVE:
            return Response(
                {'detail': f'Cannot accept payments on a {loan.get_status_display()} loan.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Waterfall distribution ───────────────────────────────────
        remaining = Decimal(str(amount))
        unpaid = loan.installments.filter(is_paid=False).order_by('due_date')

        for inst in unpaid:
            if remaining <= 0:
                break

            owed = inst.amount_due + inst.penalty_fee - inst.amount_paid
            if owed <= 0:
                continue

            applied = min(remaining, owed)
            inst.amount_paid += applied
            remaining -= applied

            if inst.amount_paid >= (inst.amount_due + inst.penalty_fee):
                inst.is_paid = True

            inst.save()

        # ── Record the transaction ───────────────────────────────────
        txn = PaymentTransaction.objects.create(
            loan=loan,
            amount=amount,
            method=method,
            recorded_by=request.user,
            notes=notes,
        )

        # ── Auto-mark loan as PAID_OFF if everything is settled ──────
        if not loan.installments.filter(is_paid=False).exists():
            loan.status = Loan.Status.PAID_OFF
            loan.save(update_fields=['status', 'updated_at'])

        return Response({
            'detail': 'Payment applied successfully.',
            'transaction': PaymentTransactionSerializer(txn).data,
            'loan': LoanSerializer(loan).data,
        })


class PaymentViewSet(viewsets.ModelViewSet):
    """
    Payment transaction ledger — staff-only (ADMIN or SALES).
    """
    queryset = PaymentTransaction.objects.select_related(
        'loan', 'recorded_by'
    ).all()
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAdminOrSales]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()

        loan = self.request.query_params.get('loan')
        if loan:
            qs = qs.filter(loan_id=loan)

        return qs

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)
