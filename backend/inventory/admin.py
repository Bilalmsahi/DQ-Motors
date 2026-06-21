from django.contrib import admin
from .models import Vehicle, VehicleImage, VehicleFeature, VehicleDocument

# Allow adding images directly inside the Vehicle page
class VehicleImageInline(admin.TabularInline):
    model = VehicleImage
    extra = 1  # Number of empty upload slots to show by default


# Allow adding documents directly inside the Vehicle page
class VehicleDocumentInline(admin.TabularInline):
    model = VehicleDocument
    extra = 0
    fields = ('title', 'doc_type', 'file', 'is_public')


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('year', 'make', 'model', 'price', 'status', 'condition', 'created_at')
    list_filter = ('status', 'condition', 'make', 'year')
    search_fields = ('make', 'model', 'vin')
    
    # Auto-fill the slug field in Admin based on other fields
    prepopulated_fields = {'slug': ('make', 'model', 'year')}
    
    inlines = [VehicleImageInline, VehicleDocumentInline]
    filter_horizontal = ('features',) # Easier UI for ManyToMany selection

@admin.register(VehicleFeature)
class VehicleFeatureAdmin(admin.ModelAdmin):
    list_display = ('name',)


@admin.register(VehicleDocument)
class VehicleDocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'vehicle', 'doc_type', 'is_public', 'created_at')
    list_filter = ('doc_type', 'is_public', 'created_at')
    search_fields = ('title', 'vehicle__vin', 'vehicle__make', 'vehicle__model')
    raw_id_fields = ('vehicle',)
    list_editable = ('is_public',)


admin.site.register(VehicleImage)