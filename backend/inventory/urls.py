from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    VehicleViewSet,
    VehicleImageViewSet,
    VehicleVideoViewSet,
    VehicleFeatureViewSet,
    WishlistViewSet,
    VehicleDocumentViewSet,
    VehicleFilterOptionsView,
    VehicleHistoryTimelineView,
    VehicleHistoryReportView,
    FacebookCatalogFeedView,
    GoogleVehicleFeedView,
    decode_vin_view,
    generate_description_view,
    vehicle_stats_view,
)

router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet)
router.register(r'images', VehicleImageViewSet)
router.register(r'videos', VehicleVideoViewSet, basename='videos')
router.register(r'features', VehicleFeatureViewSet)
router.register(r'wishlist', WishlistViewSet, basename='wishlist')
router.register(r'documents', VehicleDocumentViewSet, basename='documents')

urlpatterns = [
    # Router URLs (CRUD for vehicles, images, features, wishlist, documents)
    path('', include(router.urls)),
    
    # Public filter options for homepage search widget
    path('filters/', VehicleFilterOptionsView.as_view(), name='vehicle-filter-options'),

    # Custom utility endpoints
    path('decode-vin/', decode_vin_view, name='decode-vin'),
    path('generate-description/', generate_description_view, name='generate-description'),
    
    # Vehicle Stats (Lifecycle Pipeline)
    path('stats/', vehicle_stats_view, name='vehicle-stats'),
    
    # Vehicle History Timeline (Comprehensive Work History Tracker)
    path('vehicle/<int:vehicle_id>/history-timeline/', VehicleHistoryTimelineView.as_view(), name='vehicle-history-timeline'),
    
    # Vehicle History Report Card (Branded CarFax-style report)
    path('vehicle/<int:vehicle_id>/history-report/', VehicleHistoryReportView.as_view(), name='vehicle-history-report'),
    path('vehicle/vin/<str:vin>/history-report/', VehicleHistoryReportView.as_view(), name='vehicle-history-report-vin'),

    # Facebook Marketplace Automotive Catalog Feed (CSV)
    path('feeds/facebook.csv', FacebookCatalogFeedView.as_view(), name='facebook-catalog-feed'),

    # Google Merchant Center Vehicle Ads Feed (CSV)
    path('feeds/google.csv', GoogleVehicleFeedView.as_view(), name='google-vehicle-feed'),
]