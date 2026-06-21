from rest_framework import serializers
from decimal import Decimal
from .models import Expense, Vendor, ExpenseImage
from inventory.models import Vehicle


class VendorSerializer(serializers.ModelSerializer):
    """Serializer for vendor model with computed stats"""
    service_category_display = serializers.CharField(source='get_service_category_display', read_only=True)
    total_spend = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    job_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Vendor
        fields = [
            'id', 'name', 'service_category', 'service_category_display',
            'phone', 'email', 'address', 'rating', 'notes', 'is_active',
            'tax_id', 'payment_terms', 'preferred_payment_method', 'account_details',
            'total_spend', 'job_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class VendorListSerializer(serializers.ModelSerializer):
    """Simplified serializer for vendor dropdown lists"""
    service_category_display = serializers.CharField(source='get_service_category_display', read_only=True)
    
    class Meta:
        model = Vendor
        fields = [
            'id', 'name', 'service_category', 'service_category_display',
            'rating', 'is_active', 'payment_terms', 'preferred_payment_method',
        ]


class VendorStatsSerializer(serializers.Serializer):
    """Serializer for vendor analytics/stats endpoint"""
    vendor_id = serializers.IntegerField()
    vendor_name = serializers.CharField()
    service_category = serializers.CharField()
    service_category_display = serializers.CharField()
    rating = serializers.IntegerField()
    total_spend = serializers.DecimalField(max_digits=12, decimal_places=2)
    job_count = serializers.IntegerField()
    average_job_cost = serializers.DecimalField(max_digits=12, decimal_places=2)
    last_job_date = serializers.DateField(allow_null=True)
    # Breakdown by service type
    service_breakdown = serializers.ListField(child=serializers.DictField())


class ExpenseImageSerializer(serializers.ModelSerializer):
    """
    Serializer for expense images (before/after photos)
    """
    image_url = serializers.CharField(read_only=True)
    caption_display = serializers.CharField(source='get_caption_display', read_only=True)
    
    class Meta:
        model = ExpenseImage
        fields = [
            'id', 'expense', 'image', 'image_url', 
            'caption', 'caption_display', 'description', 'order', 'created_at'
        ]
        read_only_fields = ['created_at']


class ExpenseImageCreateSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for creating expense images
    """
    class Meta:
        model = ExpenseImage
        fields = ['id', 'expense', 'image', 'caption', 'description', 'order']


class ExpenseSerializer(serializers.ModelSerializer):
    """
    Full expense serializer with computed fields
    """
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    service_type_display = serializers.CharField(read_only=True)
    vendor_display = serializers.CharField(read_only=True)
    invoice_url = serializers.CharField(read_only=True)
    vehicle_title = serializers.SerializerMethodField()
    vehicle_slug = serializers.SerializerMethodField()
    images = ExpenseImageSerializer(many=True, read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'vehicle', 'vehicle_title', 'vehicle_slug', 'category', 'category_display',
            'service_type', 'service_type_display', 'is_public',
            'amount', 'date', 'vendor', 'vendor_name', 'vendor_display',
            'invoice_file', 'invoice_url', 'receipt', 'description',
            'is_paid', 'paid_date',
            'images', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_vehicle_title(self, obj):
        if obj.vehicle:
            return f"{obj.vehicle.year} {obj.vehicle.make} {obj.vehicle.model}"
        return 'Overhead'

    def get_vehicle_slug(self, obj):
        if obj.vehicle:
            return obj.vehicle.slug
        return None


class ExpensePublicSerializer(serializers.ModelSerializer):
    """
    Public serializer for expenses - limited fields for customer view
    """
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    service_type_display = serializers.CharField(read_only=True)
    images = ExpenseImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Expense
        fields = [
            'id', 'category', 'category_display',
            'service_type', 'service_type_display',
            'date', 'description', 'images'
        ]


class ExpenseCreateSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for creating expenses (accepts file uploads).
    Vehicle is optional — omit it for overhead expenses.
    """
    class Meta:
        model = Expense
        fields = [
            'id', 'vehicle', 'category', 'service_type', 'is_public',
            'amount', 'date', 'vendor', 'vendor_name', 
            'invoice_file', 'receipt', 'description',
            'is_paid', 'paid_date'
        ]
        extra_kwargs = {
            'vehicle': {'required': False, 'allow_null': True},
        }


class InvoiceExtractionRequestSerializer(serializers.Serializer):
    vehicle = serializers.PrimaryKeyRelatedField(queryset=Vehicle.objects.all())
    invoice_file = serializers.FileField()
    context = serializers.ChoiceField(
        choices=['purchase', 'repair', 'transport', 'inspection', 'other'],
        default='purchase',
        required=False,
    )

    def validate_invoice_file(self, value):
        import os
        ext = os.path.splitext(value.name or '')[1].lower()
        if ext not in {'.pdf', '.jpg', '.jpeg', '.png'}:
            raise serializers.ValidationError('Invoice OCR supports PDF, JPG, JPEG, and PNG files.')
        return value


class VehiclePurchaseSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    invoice_file = serializers.FileField(required=False, allow_null=True)
    vendor = serializers.PrimaryKeyRelatedField(
        queryset=Vendor.objects.all(),
        required=False,
        allow_null=True,
    )
    vendor_name = serializers.CharField(required=False, allow_blank=True, max_length=200)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    apply_tax = serializers.BooleanField(required=False, default=False)


class VehicleFinancialSummarySerializer(serializers.Serializer):
    """
    Serializer for vehicle financial summary endpoint
    """
    vehicle_id = serializers.IntegerField()
    vehicle_title = serializers.CharField()
    vehicle_vin = serializers.CharField()
    selling_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    listing_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    sold_price = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    profit_basis_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    profit_basis_label = serializers.CharField()
    
    # Cost breakdown by category
    cost_breakdown = serializers.DictField()
    
    # Totals
    purchase_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    additional_costs_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_cost_of_ownership = serializers.DecimalField(max_digits=12, decimal_places=2)
    profit_margin = serializers.DecimalField(max_digits=12, decimal_places=2)
    profit_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    # All expenses
    expenses = ExpenseSerializer(many=True)
    expense_count = serializers.IntegerField()


class VehicleFinancialListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing vehicles with their financial data
    """
    title = serializers.SerializerMethodField()
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    profit_margin = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    expense_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Vehicle
        fields = [
            'id', 'vin', 'title', 'year', 'make', 'model',
            'price', 'sold_price', 'status', 'total_cost', 'profit_margin', 'expense_count'
        ]
    
    def get_title(self, obj):
        return f"{obj.year} {obj.make} {obj.model}"
    
    def get_expense_count(self, obj):
        return obj.expenses.count()
