from django.contrib import admin
from .models import Campaign, NewsletterSubscriber


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ['title', 'discount_type', 'discount_value', 'start_date', 'end_date', 'is_active', 'status_label', 'views', 'leads_generated']
    list_filter = ['is_active', 'discount_type']
    search_fields = ['title', 'description']
    filter_horizontal = ['vehicles']
    readonly_fields = ['views', 'leads_generated', 'created_at', 'updated_at']


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ['email', 'subscribed_at', 'is_active']
    list_filter = ['is_active']
    search_fields = ['email']
    readonly_fields = ['subscribed_at']
