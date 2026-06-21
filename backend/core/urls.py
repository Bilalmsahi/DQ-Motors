from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import get_dealer_config, staff_list, TeamViewSet, GlobalSearchView, AuditLogViewSet, LegalDocumentViewSet, TestimonialViewSet, AdminDashboardStatsView, NotificationViewSet

router = DefaultRouter()
router.register(r'team', TeamViewSet, basename='team')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'legal', LegalDocumentViewSet, basename='legal-document')
router.register(r'testimonials', TestimonialViewSet, basename='testimonial')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', get_dealer_config, name='dealer-config'),
    path('staff-list/', staff_list, name='staff-list'),
    path('search/', GlobalSearchView.as_view(), name='global-search'),
    path('dashboard-stats/', AdminDashboardStatsView.as_view(), name='dashboard-stats'),
    path('', include(router.urls)),
]
