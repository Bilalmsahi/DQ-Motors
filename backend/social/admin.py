from django.contrib import admin
from .models import SocialCredential


@admin.register(SocialCredential)
class SocialCredentialAdmin(admin.ModelAdmin):
    list_display = ['page_name', 'platform', 'page_id', 'user', 'is_active', 'connected_at']
    list_filter = ['platform', 'is_active']
    search_fields = ['page_name', 'page_id', 'user__username']
    readonly_fields = ['access_token', 'connected_at', 'updated_at']
