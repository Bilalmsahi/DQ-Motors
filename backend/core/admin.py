from django.contrib import admin
from .models import User, DealerConfiguration, SharedDocumentLink, AuditLog, LegalDocument, Testimonial, Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['title', 'message', 'user__username']


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'role', 'is_active', 'is_staff']
    list_filter = ['role', 'is_active', 'is_staff']
    search_fields = ['username', 'email']


@admin.register(DealerConfiguration)
class DealerConfigurationAdmin(admin.ModelAdmin):
    """
    Admin interface for the DealerConfiguration singleton.
    Provides easy toggle access for feature flags.
    """
    
    list_display = [
        'enable_user_ads',
        'enable_ai_description', 
        'enable_vin_decoder',
        'enable_chat_support',
        'enable_invoice_ocr',
        'default_purchase_tax_rate',
        'updated_at'
    ]
    
    fieldsets = (
        ('Feature Toggles', {
            'fields': (
                'enable_user_ads',
                'enable_ai_description',
                'enable_vin_decoder',
                'enable_chat_support',
                'enable_invoice_ocr',
            ),
            'description': 'Toggle features on/off for this deployment.'
        }),
        ('Financial Defaults', {
            'fields': (
                'default_purchase_tax_rate',
            ),
        }),
    )
    
    def has_add_permission(self, request):
        """
        Prevent adding new instances if one already exists.
        """
        return not DealerConfiguration.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        """
        Prevent deletion of the singleton instance.
        """
        return False
    
    def changelist_view(self, request, extra_context=None):
        """
        Redirect to the edit page if instance exists, 
        or to add page if it doesn't.
        """
        if DealerConfiguration.objects.exists():
            obj = DealerConfiguration.objects.first()
            from django.shortcuts import redirect
            return redirect(f'../1/change/')
        return super().changelist_view(request, extra_context)


@admin.register(SharedDocumentLink)
class SharedDocumentLinkAdmin(admin.ModelAdmin):
    list_display = ['token', 'document_path', 'created_by', 'expires_at', 'is_active', 'is_expired']
    list_filter = ['is_active']
    search_fields = ['document_path', 'created_by__username']
    readonly_fields = ['token', 'created_at']

    def is_expired(self, obj):
        return obj.is_expired
    is_expired.boolean = True


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'user', 'action', 'target_model', 'target_repr']
    list_filter = ['action', 'target_model', 'timestamp']
    search_fields = ['target_repr', 'target_object_id', 'user__username']
    readonly_fields = [
        'user', 'action', 'target_model', 'target_object_id',
        'target_repr', 'changes', 'ip_address', 'timestamp',
    ]
    date_hierarchy = 'timestamp'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(LegalDocument)
class LegalDocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'doc_type', 'is_active', 'last_updated']
    list_filter = ['doc_type', 'is_active']
    search_fields = ['title', 'content']
    readonly_fields = ['last_updated']


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ['customer_name', 'rating', 'source', 'status', 'created_at']
    list_filter = ['status', 'source', 'rating']
    search_fields = ['customer_name', 'review_text']
    list_editable = ['status']
    readonly_fields = ['created_at']
