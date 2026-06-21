from django.contrib import admin
from .models import Customer, Lead, Appointment, Task, Interaction, Deal, TradeIn


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'phone', 'created_at']
    search_fields = ['name', 'email', 'phone']
    list_filter = ['created_at']


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['customer', 'lead_type', 'status', 'source', 'assigned_to', 'created_at']
    list_filter = ['status', 'source', 'lead_type', 'created_at']
    search_fields = ['customer__name', 'customer__email', 'notes']
    raw_id_fields = ['customer', 'assigned_to']


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ['customer', 'vehicle', 'appointment_type', 'date', 'time_slot', 'status', 'created_at']
    list_filter = ['status', 'appointment_type', 'date', 'created_at']
    search_fields = ['customer__name', 'customer__email', 'vehicle__make', 'vehicle__model', 'notes']
    raw_id_fields = ['customer', 'user', 'vehicle']
    date_hierarchy = 'date'
    ordering = ['date', 'time_slot']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'lead', 'assigned_to', 'due_date', 'priority', 'is_completed']
    list_filter = ['priority', 'is_completed', 'due_date']
    search_fields = ['title', 'lead__customer__name']
    raw_id_fields = ['lead', 'assigned_to']


@admin.register(Interaction)
class InteractionAdmin(admin.ModelAdmin):
    list_display = ['lead', 'interaction_type', 'created_by', 'created_at']
    list_filter = ['interaction_type', 'created_at']
    search_fields = ['notes', 'lead__customer__name']
    raw_id_fields = ['lead', 'created_by']


@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'version_name', 'lead', 'vehicle', 'sales_rep',
        'agreed_price', 'status', 'created_at',
    ]
    list_filter = ['status', 'created_at']
    search_fields = [
        'version_name', 'lead__customer__name',
        'vehicle__make', 'vehicle__model',
    ]
    raw_id_fields = ['lead', 'vehicle', 'sales_rep']
    readonly_fields = [
        'subtotal', 'tax_amount', 'total_price',
        'amount_financed', 'monthly_payment',
    ]


@admin.register(TradeIn)
class TradeInAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'year', 'make', 'model', 'name', 'email',
        'condition', 'offer_amount', 'status', 'created_at',
    ]
    list_filter = ['status', 'condition', 'created_at']
    search_fields = ['name', 'email', 'make', 'model', 'vin']
    raw_id_fields = ['lead']
    readonly_fields = [
        'created_at', 'updated_at',
        'estimated_value', 'estimated_value_low', 'estimated_value_high',
        'valuation_method',
    ]
    fieldsets = (
        ('Vehicle Details', {
            'fields': ('vin', 'make', 'model', 'year', 'mileage', 'condition'),
        }),
        ('Customer', {
            'fields': ('name', 'email', 'phone', 'lead'),
        }),
        ('Photos', {
            'fields': ('front_photo', 'back_photo', 'interior_photo', 'side_photo'),
        }),
        ('Auto-Estimate (Internal Reference)', {
            'fields': ('estimated_value', 'estimated_value_low', 'estimated_value_high', 'valuation_method'),
        }),
        ('Valuation', {
            'fields': ('offer_amount', 'admin_notes', 'status'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
        }),
    )