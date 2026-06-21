from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import DealerConfiguration, User, SharedDocumentLink, AuditLog, LegalDocument, Testimonial, Notification


class DealerConfigurationSerializer(serializers.ModelSerializer):
    """
    Serializer for the DealerConfiguration singleton model.
    Exposes feature flags for the frontend.
    """
    
    class Meta:
        model = DealerConfiguration
        fields = [
            'enable_user_ads',
            'enable_ai_description',
            'enable_vin_decoder',
            'enable_chat_support',
            'enable_invoice_ocr',
            'default_purchase_tax_rate',
            'updated_at',
        ]
        read_only_fields = ['updated_at']


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user details.
    This is returned after login/registration.
    """
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'role', 'full_name']
        read_only_fields = ['id', 'username', 'email', 'role']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    New users are created with USER role by default.
    """
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name', 'phone']
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': False},
            'last_name': {'required': False},
            'phone': {'required': False},
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords don't match"})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', 'iunea'),
            last_name=validated_data.get('last_name', ''),
            phone=validated_data.get('phone', ''),
            role='CUSTOMER'  # All signups are customers
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile information"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'role', 'full_name']
        read_only_fields = ['id', 'username', 'role', 'full_name']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class TeamMemberSerializer(serializers.ModelSerializer):
    """
    Serializer for admin team management (Feature 27).
    Supports creating employees with a password and toggling is_active.
    """
    full_name = serializers.SerializerMethodField(read_only=True)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'role', 'is_active', 'last_login', 'date_joined',
            'full_name', 'password',
        ]
        read_only_fields = ['id', 'last_login', 'date_joined', 'full_name']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


# ── Shared Document Link Serializers ──────────────────────────

class GenerateSharedLinkSerializer(serializers.Serializer):
    """Input for generating a new temporary sharing link."""
    file_url = serializers.CharField(
        help_text="The media-relative path or full URL of the file to share.",
    )

    def validate_file_url(self, value):
        """Strip leading /media/ or full domain prefix so we store a clean relative path."""
        import re
        # Remove full URL prefix (http://…/media/)
        value = re.sub(r'^https?://[^/]+/media/', '', value)
        # Remove leading /media/
        if value.startswith('/media/'):
            value = value[len('/media/'):]
        # Remove any remaining leading slash
        value = value.lstrip('/')
        if not value:
            raise serializers.ValidationError("A valid file path is required.")
        # Reject traversal/absolute-path attempts outright (defense in depth —
        # the view also re-validates that the resolved path stays in MEDIA_ROOT).
        if '..' in value.split('/') or ':' in value or value.startswith('\\'):
            raise serializers.ValidationError("Invalid file path.")
        return value


class SharedDocumentLinkSerializer(serializers.ModelSerializer):
    share_url = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = SharedDocumentLink
        fields = [
            'token', 'document_path', 'share_url',
            'expires_at', 'is_active', 'is_expired', 'created_at',
        ]
        read_only_fields = fields

    def get_share_url(self, obj):
        request = self.context.get('request')
        path = f'/api/documents/view/{obj.token}/'
        if request:
            return request.build_absolute_uri(path)
        return path


# ============================================================
# Feature 30 – Audit Log Serializer
# ============================================================
class AuditLogSerializer(serializers.ModelSerializer):
    user_display = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_display', 'action',
            'target_model', 'target_object_id', 'target_repr',
            'changes', 'ip_address', 'timestamp',
        ]
        read_only_fields = fields

    def get_user_display(self, obj):
        if obj.user:
            full = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full or obj.user.username
        return 'System'


# ============================================================
# Feature 31 – Legal Document Serializer
# ============================================================
class LegalDocumentSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)

    class Meta:
        model = LegalDocument
        fields = [
            'id', 'doc_type', 'doc_type_display', 'title',
            'content', 'last_updated', 'is_active',
        ]
        read_only_fields = ['id', 'last_updated']


# ============================================================
# Feature 43 – Testimonial Serializers
# ============================================================
class TestimonialSerializer(serializers.ModelSerializer):
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Testimonial
        fields = [
            'id', 'customer_name', 'rating', 'review_text',
            'source', 'source_display', 'status', 'status_display',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class TestimonialPublicSubmitSerializer(serializers.ModelSerializer):
    """Used for public submissions — forces WEBSITE source and PENDING status."""

    class Meta:
        model = Testimonial
        fields = ['id', 'customer_name', 'rating', 'review_text', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value

    def create(self, validated_data):
        validated_data['source'] = Testimonial.Source.WEBSITE
        validated_data['status'] = Testimonial.Status.PENDING
        return super().create(validated_data)


class TestimonialImportSerializer(serializers.ModelSerializer):
    """Used by admins to import Google/Facebook reviews directly as APPROVED."""

    class Meta:
        model = Testimonial
        fields = [
            'id', 'customer_name', 'rating', 'review_text',
            'source', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value

    def validate_source(self, value):
        if value not in (Testimonial.Source.GOOGLE, Testimonial.Source.FACEBOOK):
            raise serializers.ValidationError('Import source must be GOOGLE or FACEBOOK.')
        return value

    def create(self, validated_data):
        validated_data['status'] = Testimonial.Status.APPROVED
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'link', 'is_read', 'created_at']
        read_only_fields = ['id', 'title', 'message', 'link', 'created_at']
