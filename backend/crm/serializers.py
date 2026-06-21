from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Customer, Lead, Appointment, Task, Interaction, Deal, TradeIn

User = get_user_model()


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'


class LeadSerializer(serializers.ModelSerializer):
    """
    Serializer for Lead model.
    Handles both general inquiries and vehicle requests.
    """
    # Read-only fields for displaying customer info
    customer_name = serializers.ReadOnlyField(source='customer.name')
    customer_email = serializers.ReadOnlyField(source='customer.email')
    customer_phone = serializers.ReadOnlyField(source='customer.phone')
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role__in=['ADMIN', 'SALES'], is_active=True),
        required=False,
        allow_null=True,
    )
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.username')
    
    # For easier frontend submission - create customer inline
    name = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(write_only=True, required=False)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Lead
        fields = [
            'id', 'customer', 'customer_name', 'customer_email', 'customer_phone',
            'assigned_to', 'assigned_to_name',
            'status', 'source', 'lead_type', 'notes',
            # Vehicle request fields
            'desired_make', 'desired_model', 'max_budget',
            'preferred_year_min', 'preferred_year_max',
            # Financing consent
            'credit_check_consent',
            # Campaign tracking
            'source_campaign',
            # Timestamps
            'created_at', 'updated_at',
            # Write-only fields for inline customer creation
            'name', 'email', 'phone',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'source_campaign']
        extra_kwargs = {
            'customer': {'required': False},  # Can be created from name/email/phone
        }
    
    def create(self, validated_data):
        """
        Override create to handle inline customer creation.
        If name/email/phone provided, create or get customer first.
        """
        name = validated_data.pop('name', None)
        email = validated_data.pop('email', None)
        phone = validated_data.pop('phone', '')
        
        # If customer not provided but name/email are, create/get customer
        if 'customer' not in validated_data and name and email:
            customer, created = Customer.objects.get_or_create(
                email=email,
                defaults={'name': name, 'phone': phone}
            )
            # Update phone if customer exists but phone changed
            if not created and phone and customer.phone != phone:
                customer.phone = phone
                customer.save()
            validated_data['customer'] = customer
        
        return super().create(validated_data)


class AppointmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Appointment model.
    Handles Test Drive and Inspection bookings with double-booking prevention.
    """
    # Read-only display fields
    customer_name = serializers.ReadOnlyField(source='customer.name')
    customer_email = serializers.ReadOnlyField(source='customer.email')
    customer_phone = serializers.ReadOnlyField(source='customer.phone')
    vehicle_title = serializers.SerializerMethodField()
    vehicle_image = serializers.SerializerMethodField()
    vehicle_vin = serializers.ReadOnlyField(source='vehicle.vin')
    time_slot_display = serializers.CharField(source='get_time_slot_display', read_only=True)
    appointment_type_display = serializers.CharField(source='get_appointment_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    lead_id = serializers.ReadOnlyField(source='lead.id')
    
    # QR Code and Check-in fields
    qr_code_url = serializers.SerializerMethodField()
    is_checked_in = serializers.ReadOnlyField()
    is_checked_out = serializers.ReadOnlyField()
    duration_minutes = serializers.ReadOnlyField()
    duration_display = serializers.ReadOnlyField()
    
    # For inline customer creation (like leads)
    name = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(write_only=True, required=False)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'customer', 'customer_name', 'customer_email', 'customer_phone',
            'user', 'vehicle', 'vehicle_title', 'vehicle_image', 'vehicle_vin',
            'lead', 'lead_id',
            'date', 'time_slot', 'time_slot_display',
            'appointment_type', 'appointment_type_display',
            'status', 'status_display',
            'notes', 'admin_notes',
            # QR Code and Check-in/out
            'qr_code', 'qr_code_url', 
            'check_in_time', 'check_out_time',
            'is_checked_in', 'is_checked_out',
            'duration_minutes', 'duration_display',
            # Timestamps
            'created_at', 'updated_at',
            # Write-only fields for inline customer creation
            'name', 'email', 'phone',
        ]
        read_only_fields = ['id', 'lead', 'created_at', 'updated_at', 'qr_code', 'check_in_time', 'check_out_time']
        extra_kwargs = {
            'customer': {'required': False},
            'admin_notes': {'required': False},
        }
    
    def get_qr_code_url(self, obj):
        """Return the full URL for the QR code image."""
        if obj.qr_code:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.qr_code.url)
            return obj.qr_code.url
        return None
    
    def get_vehicle_title(self, obj):
        """Return formatted vehicle title."""
        if obj.vehicle:
            return f"{obj.vehicle.year} {obj.vehicle.make} {obj.vehicle.model}"
        return None
    
    def get_vehicle_image(self, obj):
        """Return the first vehicle image URL."""
        if obj.vehicle and obj.vehicle.images.exists():
            first_image = obj.vehicle.images.first()
            if first_image and first_image.image:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(first_image.image.url)
                return first_image.image.url
        return None
    
    def validate(self, attrs):
        """
        Validate the appointment data.
        Check for double-booking on the same vehicle/date/time_slot.
        """
        vehicle = attrs.get('vehicle') or (self.instance.vehicle if self.instance else None)
        date = attrs.get('date') or (self.instance.date if self.instance else None)
        time_slot = attrs.get('time_slot') or (self.instance.time_slot if self.instance else None)
        status = attrs.get('status', 'PENDING')
        
        # Skip validation for cancelled appointments
        if status == 'CANCELLED':
            return attrs
        
        # Check for conflicting appointments
        if vehicle and date and time_slot:
            conflicting = Appointment.objects.filter(
                vehicle=vehicle,
                date=date,
                time_slot=time_slot
            ).exclude(
                status='CANCELLED'
            )
            
            # Exclude self when updating
            if self.instance:
                conflicting = conflicting.exclude(pk=self.instance.pk)
            
            if conflicting.exists():
                raise serializers.ValidationError({
                    'time_slot': f'This vehicle is already booked for {date} at this time slot.'
                })
        
        return attrs
    
    def create(self, validated_data):
        """
        Override create to handle inline customer creation.
        """
        name = validated_data.pop('name', None)
        email = validated_data.pop('email', None)
        phone = validated_data.pop('phone', '')
        
        # If customer not provided but name/email are, create/get customer
        if 'customer' not in validated_data and name and email:
            from .models import Customer
            customer, created = Customer.objects.get_or_create(
                email=email,
                defaults={'name': name, 'phone': phone}
            )
            if not created and phone and customer.phone != phone:
                customer.phone = phone
                customer.save()
            validated_data['customer'] = customer
        
        return super().create(validated_data)


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.username')
    lead_title = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'lead', 'lead_title',
            'assigned_to', 'assigned_to_name',
            'due_date', 'is_completed', 'priority',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_lead_title(self, obj):
        return str(obj.lead) if obj.lead else None


class InteractionSerializer(serializers.ModelSerializer):
    lead_title = serializers.SerializerMethodField()
    interaction_type_display = serializers.CharField(
        source='get_interaction_type_display', read_only=True
    )
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = Interaction
        fields = [
            'id', 'lead', 'lead_title',
            'interaction_type', 'interaction_type_display',
            'notes', 'created_by', 'created_by_name',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_lead_title(self, obj):
        return str(obj.lead) if obj.lead else None


class DealSerializer(serializers.ModelSerializer):
    # Read-only display helpers
    lead_title = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    customer_address = serializers.SerializerMethodField()
    vehicle_title = serializers.SerializerMethodField()
    vehicle_vin = serializers.ReadOnlyField(source='vehicle.vin')
    vehicle_mileage = serializers.ReadOnlyField(source='vehicle.mileage')
    sales_rep_name = serializers.ReadOnlyField(source='sales_rep.username')
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    # Computed financial fields (read-only)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    amount_financed = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    monthly_payment = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Deal
        fields = [
            'id',
            # Relationships
            'lead', 'lead_title', 'customer_name',
            'customer_email', 'customer_phone', 'customer_address',
            'vehicle', 'vehicle_title', 'vehicle_vin', 'vehicle_mileage',
            'sales_rep', 'sales_rep_name',
            # Financial inputs
            'agreed_price', 'trade_in_allowance', 'cash_down_payment',
            'doc_fee', 'tax_rate', 'term_months', 'interest_rate',
            # Computed financials (read-only)
            'subtotal', 'tax_amount', 'total_price',
            'amount_financed', 'monthly_payment',
            # Status & meta
            'status', 'status_display', 'version_name',
            'customer_signature',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_lead_title(self, obj):
        return str(obj.lead) if obj.lead else None

    def get_customer_name(self, obj):
        return obj.lead.customer.name if obj.lead and obj.lead.customer else None

    def get_vehicle_title(self, obj):
        if obj.vehicle:
            return f"{obj.vehicle.year} {obj.vehicle.make} {obj.vehicle.model}"
        return None

    def get_customer_email(self, obj):
        return obj.lead.customer.email if obj.lead and obj.lead.customer else None

    def get_customer_phone(self, obj):
        return obj.lead.customer.phone if obj.lead and obj.lead.customer else None

    def get_customer_address(self, obj):
        return obj.lead.customer.address if obj.lead and obj.lead.customer else None


class TradeInSerializer(serializers.ModelSerializer):
    """
    Serializer for the Trade-In Appraisal model.
    Public users POST with vehicle details + photos.
    Admins PATCH to set offer_amount / status.
    """
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    condition_display = serializers.CharField(source='get_condition_display', read_only=True)
    lead_title = serializers.SerializerMethodField()
    vehicle_title = serializers.SerializerMethodField()

    class Meta:
        model = TradeIn
        fields = [
            'id',
            # Vehicle details
            'vin', 'make', 'model', 'year', 'mileage',
            'condition', 'condition_display',
            # Customer info
            'name', 'email', 'phone',
            # Photos
            'front_photo', 'back_photo', 'interior_photo', 'side_photo',
            # Valuation (admin-only writes)
            'offer_amount', 'admin_notes',
            'estimated_value', 'estimated_value_low', 'estimated_value_high',
            'valuation_method',
            'status', 'status_display',
            # Linked lead
            'lead', 'lead_title', 'vehicle_title',
            # Timestamps
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'lead', 'created_at', 'updated_at',
            'estimated_value', 'estimated_value_low', 'estimated_value_high',
            'valuation_method',
        ]

    def get_lead_title(self, obj):
        return str(obj.lead) if obj.lead else None

    def get_vehicle_title(self, obj):
        return f"{obj.year} {obj.make} {obj.model}"

    def create(self, validated_data):
        """Create the TradeIn record. Lead linking is handled by the ViewSet."""
        return super().create(validated_data)