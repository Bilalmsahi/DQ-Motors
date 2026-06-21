from rest_framework import serializers
from .models import Campaign, NewsletterSubscriber
from inventory.models import Vehicle


class CampaignVehicleSummarySerializer(serializers.ModelSerializer):
    """Minimal vehicle info shown inside a campaign."""
    title = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = ['id', 'slug', 'title', 'price', 'thumbnail', 'status']

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


class CampaignSerializer(serializers.ModelSerializer):
    vehicles_detail = CampaignVehicleSummarySerializer(
        source='vehicles', many=True, read_only=True
    )
    vehicle_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Vehicle.objects.all(),
        source='vehicles',
        write_only=True,
        required=False,
    )
    status_label = serializers.CharField(read_only=True)
    is_running = serializers.BooleanField(read_only=True)
    discount_type_display = serializers.CharField(
        source='get_discount_type_display', read_only=True
    )

    class Meta:
        model = Campaign
        fields = [
            'id', 'title', 'description',
            'start_date', 'end_date',
            'discount_type', 'discount_type_display', 'discount_value',
            'banner_image',
            'vehicles_detail', 'vehicle_ids',
            'is_active', 'is_running', 'status_label',
            'views', 'leads_generated',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'views', 'leads_generated',
            'created_at', 'updated_at',
        ]


class NewsletterSubscribeSerializer(serializers.Serializer):
    """Input serializer for the public subscribe endpoint."""
    email = serializers.EmailField()


class NewsletterSubscriberSerializer(serializers.ModelSerializer):
    """Full serializer for the admin list endpoint."""
    class Meta:
        model = NewsletterSubscriber
        fields = ['id', 'email', 'subscribed_at', 'is_active']


class ActiveCampaignPublicSerializer(serializers.ModelSerializer):
    """Lightweight serializer for public-facing active campaigns (banner/timer)."""
    banner_image_url = serializers.SerializerMethodField()
    vehicle_count = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            'id', 'title', 'description',
            'start_date', 'end_date',
            'discount_type', 'discount_value',
            'banner_image_url', 'vehicle_count',
        ]

    def get_banner_image_url(self, obj):
        if obj.banner_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.banner_image.url)
            return obj.banner_image.url
        return None

    def get_vehicle_count(self, obj):
        return obj.vehicles.count()
