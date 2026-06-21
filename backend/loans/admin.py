from django.contrib import admin
from .models import Loan, Installment, PaymentTransaction


class InstallmentInline(admin.TabularInline):
    model = Installment
    extra = 0
    fields = (
        'installment_number', 'due_date', 'amount_due',
        'amount_paid', 'is_paid', 'penalty_fee',
    )
    readonly_fields = ('installment_number', 'due_date', 'amount_due')
    ordering = ('due_date',)


class PaymentTransactionInline(admin.TabularInline):
    model = PaymentTransaction
    extra = 0
    fields = ('amount', 'method', 'date', 'recorded_by', 'notes')
    readonly_fields = ('amount', 'method', 'date', 'recorded_by')


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'customer', 'principal_amount', 'interest_rate',
        'term_months', 'status', 'start_date', 'created_at',
    )
    list_filter = ('status', 'start_date')
    search_fields = (
        'customer__customer__name', 'deal__vehicle__make',
        'deal__vehicle__model',
    )
    raw_id_fields = ('deal', 'customer')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [InstallmentInline, PaymentTransactionInline]


@admin.register(Installment)
class InstallmentAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'loan', 'installment_number', 'due_date',
        'amount_due', 'amount_paid', 'is_paid', 'penalty_fee',
    )
    list_filter = ('is_paid', 'due_date')
    search_fields = ('loan__customer__customer__name',)


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'loan', 'amount', 'method', 'date', 'recorded_by',
    )
    list_filter = ('method', 'date')
    search_fields = ('loan__customer__customer__name', 'notes')
    raw_id_fields = ('loan', 'recorded_by')
