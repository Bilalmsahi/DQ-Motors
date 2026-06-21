from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CampaignViewSet, newsletter_subscribe, newsletter_subscribers

router = DefaultRouter()
router.register(r'campaigns', CampaignViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('newsletter/subscribe/', newsletter_subscribe, name='newsletter-subscribe'),
    path('newsletter/subscribers/', newsletter_subscribers, name='newsletter-subscribers'),
]
