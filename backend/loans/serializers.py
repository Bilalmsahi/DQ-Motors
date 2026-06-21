from rest_framework import serializers
from .models import Loan, Installment, PaymentTransaction


class InstallmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Installment
        fields = [
            'id', 'installment_number', 'due_date',
            'amount_due', 'amount_paid', 'is_paid', 'penalty_fee',
        ]
        read_only_fields = fields


class PaymentTransactionSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.ReadOnlyField(source='recorded_by.username')
    method_display = serializers.CharField(
        source='get_method_display', read_only=True
    )

    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'loan', 'amount', 'date', 'method', 'method_display',
            'recorded_by', 'recorded_by_name', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'date', 'recorded_by', 'created_at']


class LoanSerializer(serializers.ModelSerializer):
    # Display helpers
    customer_name = serializers.SerializerMethodField()
    vehicle_title = serializers.SerializerMethodField()
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )

    # Computed read-only fields
    effective_principal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    monthly_payment = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total_paid = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    remaining_balance = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    next_due_date = serializers.DateField(read_only=True)

    # Nested schedules (read-only)
    installments = InstallmentSerializer(many=True, read_only=True)

    class Meta:
        model = Loan
        fields = [
            'id', 'deal',
            'customer', 'customer_name', 'vehicle_title',
            'principal_amount', 'admin_fee', 'effective_principal',
            'interest_rate', 'term_months',
            'start_date', 'status', 'status_display',
            # Computed
            'monthly_payment', 'total_paid',
            'remaining_balance', 'next_due_date',
            # Nested
            'installments',
            # Timestamps
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'deal': {'required': False, 'allow_null': True},
            'admin_fee': {'required': False},
        }

    def get_customer_name(self, obj):
        if obj.customer and obj.customer.customer:
            return obj.customer.customer.name
        return str(obj.customer) if obj.customer else None

    def get_vehicle_title(self, obj):
        if obj.deal and obj.deal.vehicle:
            v = obj.deal.vehicle
            return f"{v.year} {v.make} {v.model}"
        return None


class LoanSummarySerializer(serializers.ModelSerializer):
    """Lighter serializer for list views (no nested installments)."""
    customer_name = serializers.SerializerMethodField()
    vehicle_title = serializers.SerializerMethodField()
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )
    effective_principal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    monthly_payment = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total_paid = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    remaining_balance = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    next_due_date = serializers.DateField(read_only=True)

    class Meta:
        model = Loan
        fields = [
            'id', 'deal',
            'customer', 'customer_name', 'vehicle_title',
            'principal_amount', 'admin_fee', 'effective_principal',
            'interest_rate', 'term_months',
            'start_date', 'status', 'status_display',
            'monthly_payment', 'total_paid',
            'remaining_balance', 'next_due_date',
            'created_at', 'updated_at',
        ]

    def get_customer_name(self, obj):
        if obj.customer and obj.customer.customer:
            return obj.customer.customer.name
        return str(obj.customer) if obj.customer else None

    def get_vehicle_title(self, obj):
        if obj.deal and obj.deal.vehicle:
            v = obj.deal.vehicle
            return f"{v.year} {v.make} {v.model}"
        return None


class MakePaymentSerializer(serializers.Serializer):
    """Input serializer for the make-payment action."""
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    method = serializers.ChoiceField(
        choices=PaymentTransaction.Method.choices,
        default=PaymentTransaction.Method.CASH,
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')
