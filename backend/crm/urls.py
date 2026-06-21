from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomerViewSet, LeadViewSet, AppointmentViewSet,
    TaskViewSet, InteractionViewSet, DealViewSet,
    TradeInViewSet
)

router = DefaultRouter()
router.register(r'customers', CustomerViewSet)
router.register(r'leads', LeadViewSet)
router.register(r'appointments', AppointmentViewSet)
router.register(r'tasks', TaskViewSet)
router.register(r'interactions', InteractionViewSet)
router.register(r'deals', DealViewSet)
router.register(r'trade-ins', TradeInViewSet)

urlpatterns = [
    path('', include(router.urls)),
]