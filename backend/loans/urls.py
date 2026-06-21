from rest_framework.routers import DefaultRouter
from .views import LoanViewSet, PaymentViewSet

router = DefaultRouter()
router.register(r'loans', LoanViewSet, basename='loan')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = router.urls
