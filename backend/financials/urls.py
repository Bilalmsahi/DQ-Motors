from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ExpenseViewSet, 
    ExpenseImageViewSet,
    VendorViewSet,
    AnalyticsViewSet,
    PerformanceAnalyticsViewSet,
    VehicleFinancialView,
    VehicleFinancialListView,
    VehicleServiceHistoryView,
    VehiclePurchaseView,
    InvoiceExtractionView,
)

router = DefaultRouter()
router.register(r'expenses', ExpenseViewSet)
router.register(r'expense-images', ExpenseImageViewSet, basename='expense-images')
router.register(r'vendors', VendorViewSet)
router.register(r'stats', AnalyticsViewSet, basename='stats')
router.register(r'performance', PerformanceAnalyticsViewSet, basename='performance')

urlpatterns = [
    path('', include(router.urls)),
    # Vehicle financial summary endpoints
    path('vehicle/<int:vehicle_id>/summary/', VehicleFinancialView.as_view(), name='vehicle-financial-summary'),
    path('vehicle/<int:vehicle_id>/purchase/', VehiclePurchaseView.as_view(), name='vehicle-purchase-upsert'),
    path('invoices/extract/', InvoiceExtractionView.as_view(), name='invoice-extract'),
    path('vehicles/', VehicleFinancialListView.as_view(), name='vehicle-financial-list'),
    # Public service history endpoint
    path('vehicle/<int:vehicle_id>/service-history/', VehicleServiceHistoryView.as_view(), name='vehicle-service-history'),
]
