from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import F

from .models import Campaign, NewsletterSubscriber
from .serializers import (
    CampaignSerializer,
    ActiveCampaignPublicSerializer,
    NewsletterSubscribeSerializer,
    NewsletterSubscriberSerializer,
)
from core.permissions import IsAdmin


class CampaignViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD for campaigns.

    Extra actions
    -------------
    GET  /api/marketing/campaigns/active/   – public, returns currently-running campaigns
    POST /api/marketing/campaigns/<id>/increment-view/  – public, bumps views counter
    """

    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer

    def get_permissions(self):
        if self.action in ('active', 'increment_view'):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    # ── Public endpoints ──────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='active')
    def active(self, request):
        """Return all currently-running campaigns for the public website."""
        now = timezone.now()
        qs = Campaign.objects.filter(
            is_active=True,
            start_date__lte=now,
            end_date__gte=now,
        )
        serializer = ActiveCampaignPublicSerializer(
            qs, many=True, context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='increment-view')
    def increment_view(self, request, pk=None):
        """Atomically increment the views counter."""
        Campaign.objects.filter(pk=pk).update(views=F('views') + 1)
        return Response({'status': 'ok'})


# ── Newsletter endpoints ───────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def newsletter_subscribe(request):
    """POST /api/marketing/newsletter/subscribe/  — public."""
    serializer = NewsletterSubscribeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email'].lower().strip()

    _, created = NewsletterSubscriber.objects.get_or_create(
        email=email, defaults={'is_active': True}
    )

    if created:
        return Response({'message': 'Thanks for subscribing!'}, status=status.HTTP_201_CREATED)
    return Response({'message': 'You are already subscribed!'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def newsletter_subscribers(request):
    """GET /api/marketing/newsletter/subscribers/  — admin only."""
    qs = NewsletterSubscriber.objects.all()
    serializer = NewsletterSubscriberSerializer(qs, many=True)
    return Response(serializer.data)
