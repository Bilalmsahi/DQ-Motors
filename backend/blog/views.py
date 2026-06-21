from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count

from .models import BlogPost
from .serializers import BlogPostSerializer
from .utils import generate_blog_content
from core.permissions import IsAdmin
from inventory.models import Vehicle


class BlogPostViewSet(viewsets.ModelViewSet):
    """
    CRUD for blog posts.

    Public:  list / retrieve (published only)
    Admin:   full CRUD + AI generate action
    """

    serializer_class = BlogPostSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        qs = BlogPost.objects.all()
        # Non-admin users only see published posts
        if not (self.request.user.is_authenticated and getattr(self.request.user, 'role', '') == 'ADMIN'):
            qs = qs.filter(status=BlogPost.Status.PUBLISHED)
        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    # ── AI Generate endpoint ──────────────────────────────────
    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        """
        POST /api/blog/posts/generate/
        Body: { "topic": "Best SUVs for Families" }

        Returns generated content for review (does NOT save).
        """
        topic = request.data.get('topic', '').strip()
        if not topic:
            return Response(
                {'error': 'A "topic" field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build inventory highlights from top 3 makes
        top_makes = (
            Vehicle.objects
            .values('make')
            .annotate(count=Count('id'))
            .order_by('-count')[:3]
        )
        if top_makes:
            names = [m['make'] for m in top_makes]
            if len(names) >= 3:
                inventory_highlights = f"{names[0]}, {names[1]}, and {names[2]} models"
            elif len(names) == 2:
                inventory_highlights = f"{names[0]} and {names[1]} models"
            else:
                inventory_highlights = f"{names[0]} models"
        else:
            inventory_highlights = 'a wide selection of vehicles'

        brand_name = 'DQ Motors'  # matches the site branding

        result = generate_blog_content(topic, brand_name, inventory_highlights)

        if 'error' in result:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(result)
