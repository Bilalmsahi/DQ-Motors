from django.contrib import admin
from .models import Expense, Vendor, ExpenseImage


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ['name', 'service_category', 'phone', 'email', 'payment_terms', 'preferred_payment_method', 'is_active', 'created_at']
    list_filter = ['service_category', 'payment_terms', 'preferred_payment_method', 'is_active']
    search_fields = ['name', 'email', 'phone', 'tax_id']
    ordering = ['name']
    fieldsets = (
        (None, {
            'fields': ('name', 'service_category', 'phone', 'email', 'address', 'rating', 'notes', 'is_active')
        }),
        ('Financial / Payment', {
            'fields': ('tax_id', 'payment_terms', 'preferred_payment_method', 'account_details'),
        }),
    )


class ExpenseImageInline(admin.TabularInline):
    model = ExpenseImage
    extra = 1
    fields = ['image', 'caption', 'description', 'order']


@admin.register(ExpenseImage)
class ExpenseImageAdmin(admin.ModelAdmin):
    list_display = ['id', 'expense', 'caption', 'order', 'created_at']
    list_filter = ['caption', 'created_at']
    search_fields = ['expense__vehicle__vin', 'description']
    raw_id_fields = ['expense']
    ordering = ['expense', 'order']


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['id', 'vehicle', 'category', 'service_type', 'amount', 'is_paid', 'is_public', 'vendor_display', 'date', 'has_invoice']
    list_filter = ['category', 'service_type', 'is_public', 'is_paid', 'date', 'vendor']
    list_editable = ['is_public', 'is_paid']
    search_fields = ['vehicle__vin', 'vehicle__make', 'vehicle__model', 'description']
    raw_id_fields = ['vehicle', 'vendor']
    date_hierarchy = 'date'
    ordering = ['-date', '-created_at']
    inlines = [ExpenseImageInline]
    
    fieldsets = (
        ('Vehicle & Category', {
            'fields': ('vehicle', 'category', 'service_type', 'amount')
        }),
        ('Payment Status', {
            'fields': ('is_paid', 'paid_date'),
        }),
        ('Visibility', {
            'fields': ('is_public',),
            'description': 'If checked, this record will be visible to customers on the vehicle detail page.'
        }),
        ('Vendor Information', {
            'fields': ('vendor', 'vendor_name')
        }),
        ('Invoice/Receipt', {
            'fields': ('invoice_file', 'receipt', 'description')
        }),
    )
    
    def has_invoice(self, obj):
        return bool(obj.invoice_file or obj.receipt)
    has_invoice.boolean = True
    has_invoice.short_description = 'Invoice'