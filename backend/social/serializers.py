from rest_framework import serializers
from .models import SocialCredential


class SocialCredentialSerializer(serializers.ModelSerializer):
    platform_display = serializers.CharField(
        source='get_platform_display', read_only=True
    )

    class Meta:
        model = SocialCredential
        fields = [
            'id',
            'platform',
            'platform_display',
            'page_name',
            'page_id',
            'is_active',
            'connected_at',
            'updated_at',
        ]
        read_only_fields = fields  # listing view — never expose the token


class FacebookPageSerializer(serializers.Serializer):
    """Validates the page selection payload from the frontend."""
    page_id = serializers.CharField()
    page_name = serializers.CharField()
    page_access_token = serializers.CharField()
