import os
from rest_framework import serializers
from .models import Vehicle, VehicleImage, VehicleVideo, VehicleFeature, Favorite, VehicleDocument
from core.models import User
from django.utils import timezone


class VehicleImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleImage
        fields = ['id', 'vehicle', 'image', 'created_at']
        extra_kwargs = {
            'vehicle': {'required': True}
        }


class VehicleVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleVideo
        fields = ['id', 'vehicle', 'video', 'title', 'created_at']
        extra_kwargs = {
            'vehicle': {'required': True}
        }

    def validate_video(self, value):
        if value is None:
            return value
        ext = os.path.splitext(value.name)[1].lower()
        allowed = ['.mp4', '.webm', '.mov', '.avi']
        if ext not in allowed:
            raise serializers.ValidationError(
                f"Unsupported video format '{ext}'. Allowed: mp4, webm, mov, avi."
            )
        return value


class VehicleFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleFeature
        fields = ['id', 'name']


class SellerSerializer(serializers.ModelSerializer):
    """Minimal serializer for seller info in vehicle listings"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'phone']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class VehicleSerializer(serializers.ModelSerializer):
    # Nested Serializers for Reading
    images = VehicleImageSerializer(many=True, read_only=True)
    videos = VehicleVideoSerializer(many=True, read_only=True)
    features = VehicleFeatureSerializer(many=True, read_only=True)
    seller = SellerSerializer(read_only=True)
    seller_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='seller',
        write_only=True,
        required=False,
        allow_null=True
    )
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    profit_margin = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    # Indicates if this is a user ad or dealership car
    is_user_ad = serializers.SerializerMethodField()
    
    # Indicates if the current user has liked this vehicle
    is_liked = serializers.SerializerMethodField()
    
    # Campaign pricing
    active_campaign_price = serializers.SerializerMethodField()
    active_campaign = serializers.SerializerMethodField()
    
    # Write-only field to accept list of Feature IDs (e.g., [1, 2])
    feature_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        write_only=True, 
        queryset=VehicleFeature.objects.all(), 
        source='features',
        required=False
    )

    class Meta:
        model = Vehicle
        fields = [
            'id', 'vin', 'make', 'model', 'year', 'price',
            'total_cost', 'profit_margin',
            'status', 'sold_date', 'sold_price', 'slug', 'images', 'videos', 'features', 'feature_ids', 'color',
            'mileage', 'description', 'featured',
            'transmission', 'fuel_type', 'body_style', 'drivetrain', 'engine', 'doors', 'condition',
            'seller', 'seller_id', 'is_user_ad', 'is_liked',
            'active_campaign_price', 'active_campaign',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'created_at', 'updated_at', 'total_cost', 'profit_margin', 'is_user_ad', 'is_liked', 'sold_date', 'sold_price', 'active_campaign_price', 'active_campaign']
    
    def get_is_user_ad(self, obj):
        """Returns True if this vehicle was listed by a user, False if dealership"""
        return obj.seller is not None
    
    def get_is_liked(self, obj):
        """
        Returns True if the current user has liked this vehicle.
        Returns False for anonymous users or if not liked.
        """
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user has this vehicle in favorites
        # Use prefetched data if available to avoid N+1 queries
        if hasattr(obj, '_user_has_liked'):
            return obj._user_has_liked
        
        return Favorite.objects.filter(user=request.user, vehicle=obj).exists()

    def _get_running_campaign(self, obj):
        """Find the first currently-running campaign for this vehicle."""
        if not hasattr(obj, '_running_campaign'):
            now = timezone.now()
            obj._running_campaign = obj.campaigns.filter(
                is_active=True,
                start_date__lte=now,
                end_date__gte=now,
            ).first()
        return obj._running_campaign

    def get_active_campaign_price(self, obj):
        """Discounted price if the vehicle is in an active campaign, else null."""
        campaign = self._get_running_campaign(obj)
        if campaign:
            return str(campaign.discounted_price(obj.price))
        return None

    def get_active_campaign(self, obj):
        """Minimal campaign info for the vehicle card badge/tag."""
        campaign = self._get_running_campaign(obj)
        if campaign:
            return {
                'id': campaign.id,
                'title': campaign.title,
                'discount_type': campaign.discount_type,
                'discount_value': str(campaign.discount_value),
                'end_date': campaign.end_date.isoformat(),
            }
        return None



# ============================================================
# Wishlist / Favorite Serializers
# ============================================================

class FavoriteVehicleSerializer(serializers.ModelSerializer):
    """
    Simplified vehicle serializer for wishlist display.
    Shows only essential info: ID, title, price, thumbnail.
    """
    title = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    
    class Meta:
        model = Vehicle
        fields = ['id', 'slug', 'title', 'price', 'thumbnail', 'status', 'mileage']
    
    def get_title(self, obj):
        return f"{obj.year} {obj.make} {obj.model}"
    
    def get_thumbnail(self, obj):
        first_image = obj.images.first()
        if first_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_image.image.url)
            return first_image.image.url
        return None


class FavoriteSerializer(serializers.ModelSerializer):
    """
    Serializer for Favorite model.
    Includes nested vehicle details for easy display.
    """
    vehicle = FavoriteVehicleSerializer(read_only=True)
    vehicle_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),
        source='vehicle',
        write_only=True
    )
    
    class Meta:
        model = Favorite
        fields = ['id', 'vehicle', 'vehicle_id', 'created_at']
        read_only_fields = ['id', 'created_at']


# ============================================================
# Vehicle Document Serializers
# ============================================================

class VehicleDocumentSerializer(serializers.ModelSerializer):
    """
    Full serializer for vehicle documents.
    Used for admin CRUD operations.
    """
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)
    file_url = serializers.CharField(read_only=True)
    file_name = serializers.CharField(read_only=True)
    vehicle_title = serializers.SerializerMethodField()
    
    class Meta:
        model = VehicleDocument
        fields = [
            'id', 'vehicle', 'vehicle_title', 'title', 'file', 'file_url', 'file_name',
            'doc_type', 'doc_type_display', 'is_public', 'description',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_vehicle_title(self, obj):
        return f"{obj.vehicle.year} {obj.vehicle.make} {obj.vehicle.model}"


class VehicleDocumentPublicSerializer(serializers.ModelSerializer):
    """
    Limited serializer for public document access.
    Excludes sensitive fields and only shows public documents.
    """
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)
    file_url = serializers.CharField(read_only=True)
    file_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = VehicleDocument
        fields = [
            'id', 'title', 'file_url', 'file_name',
            'doc_type', 'doc_type_display', 'description', 'created_at'
        ]
        read_only_fields = fields


# ============================================================
# Vehicle History Timeline Serializer
# ============================================================

class VehicleHistoryTimelineSerializer(serializers.Serializer):
    """
    Serializer for unified vehicle history timeline events.
    Aggregates data from multiple sources: Vehicle status, Expenses, Documents.
    """
    id = serializers.CharField(help_text="Unique ID in format: <source>_<id>")
    event_type = serializers.CharField(help_text="Type of event: Vehicle Acquired, Service Record, Inspection, Vehicle Sold")
    date = serializers.DateTimeField(help_text="Event date/time")
    title = serializers.CharField(help_text="Event title/description")
    description = serializers.CharField(allow_blank=True, required=False)
    is_public = serializers.BooleanField(default=True)
    
    # Optional fields based on event type
    source = serializers.CharField(help_text="Source model: vehicle, expense, document")
    source_id = serializers.IntegerField(help_text="Original record ID")
    
    # Service Record specific fields
    service_type = serializers.CharField(allow_null=True, required=False)
    service_type_display = serializers.CharField(allow_null=True, required=False)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True, required=False)
    vendor = serializers.CharField(allow_null=True, required=False)
    invoice_url = serializers.CharField(allow_null=True, required=False)
    images = serializers.ListField(child=serializers.DictField(), required=False)
    
    # Document specific fields
    doc_type = serializers.CharField(allow_null=True, required=False)
    doc_type_display = serializers.CharField(allow_null=True, required=False)
    file_url = serializers.CharField(allow_null=True, required=False)
    file_name = serializers.CharField(allow_null=True, required=False)