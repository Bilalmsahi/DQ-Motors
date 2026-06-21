import os
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.db.models import Q, Count, Sum
from django.http import FileResponse, Http404
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from core.permissions import IsAdmin, IsAdminOrSales
from .models import DealerConfiguration, User, SharedDocumentLink, AuditLog, LegalDocument, Testimonial, Notification
from .serializers import (
    DealerConfigurationSerializer, UserRegistrationSerializer,
    UserProfileSerializer, GenerateSharedLinkSerializer,
    SharedDocumentLinkSerializer, TeamMemberSerializer,
    AuditLogSerializer, LegalDocumentSerializer,
    TestimonialSerializer, TestimonialPublicSubmitSerializer,
    TestimonialImportSerializer,
    NotificationSerializer,
)


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """
    Google OAuth2 Login using ID Token verification.
    
    POST /api/auth/google/
    Body: { "id_token": "<google-id-token>" }
    
    Flow:
    1. Frontend gets ID token from Google Sign-In popup
    2. Frontend sends ID token to this endpoint
    3. We verify the token with Google
    4. We create/get user and return JWT tokens
    
    Returns: { access, refresh, user }
    """
    token = request.data.get('id_token')
    
    if not token:
        return Response(
            {'error': 'ID token is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Verify the ID token with Google
        # This checks signature, expiry, and audience (client ID)
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        
        # Extract user info from verified token
        email = idinfo.get('email')
        email_verified = idinfo.get('email_verified', False)
        first_name = idinfo.get('given_name', '')
        last_name = idinfo.get('family_name', '')
        google_id = idinfo.get('sub')  # Unique Google user ID
        
        if not email or not email_verified:
            return Response(
                {'error': 'Email not verified with Google'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],  # Use email prefix as username
                'first_name': first_name,
                'last_name': last_name,
                'role': 'USER',  # Default role for social login users
            }
        )
        
        # Update name if user exists but name changed on Google
        if not created:
            updated = False
            if first_name and not user.first_name:
                user.first_name = first_name
                updated = True
            if last_name and not user.last_name:
                user.last_name = last_name
                updated = True
            if updated:
                user.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
            },
            'created': created,  # True if new user was created
        })
        
    except ValueError as e:
        # Invalid token
        return Response(
            {'error': f'Invalid Google token: {str(e)}'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['GET'])
@permission_classes([IsAdminOrSales])
def staff_list(request):
    """Lightweight list of ADMIN + SALES users for assignment dropdowns."""
    staff = User.objects.filter(role__in=['ADMIN', 'SALES'], is_active=True).order_by('first_name', 'username')
    data = [
        {
            'id': u.id,
            'name': u.get_full_name() or u.username,
            'role': u.role,
        }
        for u in staff
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_dealer_config(request):
    """
    Public endpoint to retrieve dealer configuration/feature flags.
    
    GET /api/config/
    
    Returns feature flags that control what features are available
    on the frontend for this specific deployment.
    """
    config = DealerConfiguration.get_config()
    serializer = DealerConfigurationSerializer(config)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Public endpoint for user registration.
    
    POST /api/auth/register/
    Body: {
        "username": "johndoe",
        "email": "john@example.com",
        "password": "securepassword123",
        "password2": "securepassword123",
        "first_name": "John",  // optional
        "last_name": "Doe",    // optional
        "phone": "+1234567890" // optional
    }
    
    Returns user info and JWT tokens on success.
    """
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        # Generate JWT tokens for immediate login
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'Registration successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
            },
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    Get or update the current user's profile.
    
    GET /api/auth/profile/
    Returns: User profile data
    
    PUT/PATCH /api/auth/profile/
    Body: { "first_name": "John", "last_name": "Doe", "phone": "+1..." }
    Returns: Updated user profile
    """
    user = request.user
    
    if request.method == 'GET':
        serializer = UserProfileSerializer(user)
        return Response(serializer.data)
    
    # PUT or PATCH
    partial = request.method == 'PATCH'
    serializer = UserProfileSerializer(user, data=request.data, partial=partial)
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── Secure Document Sharing ──────────────────────────────────

def _resolve_media_path(relative_path):
    """
    Resolve a media-relative path to an absolute path, guaranteeing the
    result stays inside MEDIA_ROOT. Returns None if the path escapes
    MEDIA_ROOT (e.g. via '..' segments or an absolute path override).
    """
    media_root = os.path.realpath(settings.MEDIA_ROOT)
    full_path = os.path.realpath(os.path.join(media_root, relative_path))

    if os.path.commonpath([media_root, full_path]) != media_root:
        return None
    return full_path


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_shared_link(request):
    """
    Generate a temporary secure link for a document.

    POST /api/documents/generate-link/
    Body: { "file_url": "/media/vehicle_docs/vehicle_2/report.pdf" }

    Returns the full shareable URL with a UUID token.
    Only authenticated users (typically admins) can generate links.
    """
    serializer = GenerateSharedLinkSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    relative_path = serializer.validated_data['file_url']

    # Reject any path that escapes MEDIA_ROOT before touching the filesystem
    full_path = _resolve_media_path(relative_path)
    if full_path is None or not os.path.isfile(full_path):
        return Response(
            {'error': 'File not found on the server.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    link = SharedDocumentLink.objects.create(
        document_path=relative_path,
        created_by=request.user,
    )

    out = SharedDocumentLinkSerializer(link, context={'request': request})
    return Response(out.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def serve_shared_document(request, token):
    """
    Stream a shared document inline in the browser.

    GET /api/documents/view/<uuid:token>/

    - Validates the token, active flag, and expiry.
    - Serves the file with Content-Disposition: inline so the
      browser renders it (PDF, image) instead of downloading.
    """
    import mimetypes

    try:
        link = SharedDocumentLink.objects.get(token=token)
    except SharedDocumentLink.DoesNotExist:
        raise Http404("Link does not exist.")

    if not link.is_valid:
        return Response(
            {'error': 'This link has expired or been deactivated.'},
            status=status.HTTP_410_GONE,
        )

    full_path = _resolve_media_path(link.document_path)
    if full_path is None or not os.path.isfile(full_path):
        raise Http404("File not found.")

    # Determine MIME type
    content_type, _ = mimetypes.guess_type(full_path)
    if content_type is None:
        content_type = 'application/octet-stream'

    filename = os.path.basename(full_path)

    response = FileResponse(
        open(full_path, 'rb'),
        content_type=content_type,
    )
    # inline → browser will render PDFs/images instead of downloading
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response


# ═══════════════════════════════════════════════════════════════
# Team Management  (Feature 27 – RBAC)
# ═══════════════════════════════════════════════════════════════

class TeamViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD for managing dealership employees.
    Lists only staff roles (ADMIN / SALES / TECHNICIAN).
    """
    serializer_class = TeamMemberSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return User.objects.filter(
            role__in=['ADMIN', 'SALES', 'TECHNICIAN'],
        ).order_by('-date_joined')


# ═══════════════════════════════════════════════════════════════
# Global Search  (Feature 29 – Advanced Search & Filter)
# ═══════════════════════════════════════════════════════════════

class GlobalSearchView(APIView):
    """
    GET /api/core/search/?q=<query>
    Searches Vehicles, Leads and Vendors simultaneously.
    Returns top 5 results from each category.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'vehicles': [], 'leads': [], 'vendors': []})

        # ── Vehicles ──────────────────────────────────────────
        from inventory.models import Vehicle
        vehicles = Vehicle.objects.filter(
            Q(make__icontains=query) |
            Q(model__icontains=query) |
            Q(vin__icontains=query)
        )[:5]
        vehicle_results = [
            {
                'id': v.id,
                'title': f"{v.year} {v.make} {v.model}",
                'subtitle': f"VIN: {v.vin} • {v.get_status_display()}",
                'url': f"/admin/inventory/edit/{v.slug}",
                'category': 'vehicle',
            }
            for v in vehicles
        ]

        # ── Leads ─────────────────────────────────────────────
        from crm.models import Lead
        leads = Lead.objects.select_related('customer').filter(
            Q(customer__name__icontains=query) |
            Q(customer__email__icontains=query) |
            Q(customer__phone__icontains=query)
        )[:5]
        lead_results = [
            {
                'id': l.id,
                'title': l.customer.name,
                'subtitle': f"{l.get_status_display()} • {l.get_lead_type_display()}",
                'url': '/admin/leads',
                'category': 'lead',
            }
            for l in leads
        ]

        # ── Vendors ───────────────────────────────────────────
        from financials.models import Vendor
        vendors = Vendor.objects.filter(
            Q(name__icontains=query) |
            Q(email__icontains=query) |
            Q(phone__icontains=query)
        )[:5]
        vendor_results = [
            {
                'id': v.id,
                'title': v.name,
                'subtitle': v.get_service_category_display(),
                'url': f"/admin/vendors/{v.id}",
                'category': 'vendor',
            }
            for v in vendors
        ]

        # ── Audit Logs (admin only) ────────────────────────────
        audit_results = []
        if request.user.is_authenticated and getattr(request.user, 'role', None) == 'ADMIN':
            audit_logs = AuditLog.objects.select_related('user').filter(
                Q(target_repr__icontains=query) |
                Q(target_model__icontains=query) |
                Q(user__username__icontains=query) |
                Q(user__first_name__icontains=query) |
                Q(user__last_name__icontains=query)
            )[:5]
            ACTION_LABELS = {'CREATE': 'Created', 'UPDATE': 'Updated', 'DELETE': 'Deleted'}
            audit_results = [
                {
                    'id': a.id,
                    'title': f"{ACTION_LABELS.get(a.action, a.action)} {a.target_model}",
                    'subtitle': f"{a.target_repr[:60]} • by {a.user.get_full_name() or a.user.username if a.user else 'System'}",
                    'url': '/admin/activity-log',
                    'category': 'audit_log',
                }
                for a in audit_logs
            ]

        return Response({
            'vehicles': vehicle_results,
            'leads': lead_results,
            'vendors': vendor_results,
            'audit_logs': audit_results,
        })


# ============================================================
# Feature 30 – Audit Log ViewSet
# ============================================================
class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/core/audit-logs/
    Admin-only, read-only list of all audit entries.
    Supports filtering by user, target_model, action, and date range.
    """
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    # Filtering via query params
    filterset_fields = ['user', 'target_model', 'action']
    search_fields = ['target_repr', 'target_object_id']
    ordering_fields = ['timestamp']

    def get_queryset(self):
        qs = super().get_queryset()
        # Optional date-range filtering
        start = self.request.query_params.get('start_date')
        end = self.request.query_params.get('end_date')
        if start:
            qs = qs.filter(timestamp__date__gte=start)
        if end:
            qs = qs.filter(timestamp__date__lte=end)
        return qs


# ============================================================
# Feature 31 – Legal Document ViewSet
# ============================================================
class LegalDocumentViewSet(viewsets.ModelViewSet):
    """
    /api/config/legal/
    - Public (AllowAny): list & retrieve (read-only, active docs only).
    - Admin: full CRUD.
    Lookup by doc_type via ?doc_type=PRIVACY_POLICY or /legal/<pk>/.
    """
    queryset = LegalDocument.objects.all()
    serializer_class = LegalDocumentSerializer
    pagination_class = None  # only 3 records

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        # Public users only see active documents
        if not self.request.user.is_authenticated or getattr(self.request.user, 'role', None) != 'ADMIN':
            qs = qs.filter(is_active=True)
        # Allow lookup by doc_type query param
        doc_type = self.request.query_params.get('doc_type')
        if doc_type:
            qs = qs.filter(doc_type=doc_type.upper())
        return qs


# ============================================================
# Feature 43 – Review & Testimonial Management
# ============================================================
class TestimonialViewSet(viewsets.ModelViewSet):
    """
    /api/testimonials/

    Public:
      GET  /               → List approved testimonials (AllowAny)
      POST /               → Submit a review (AllowAny, forces PENDING/WEBSITE)

    Admin:
      GET  /               → List ALL testimonials (with ?status= filter)
      PATCH /<id>/         → Approve / reject a review
      DELETE /<id>/        → Remove a review
      POST /import/        → Import a Google/Facebook review as APPROVED
    """
    queryset = Testimonial.objects.all()
    serializer_class = TestimonialSerializer
    pagination_class = None

    # ── permissions ───────────────────────────────
    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'create'):
            return [AllowAny()]
        # import_review, partial_update, update, destroy → admin only
        return [IsAuthenticated(), IsAdmin()]

    # ── queryset ─────────────────────────────────
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # Admins can see everything & filter by status
        if user.is_authenticated and getattr(user, 'role', None) == 'ADMIN':
            status_filter = self.request.query_params.get('status')
            if status_filter:
                qs = qs.filter(status=status_filter.upper())
            return qs

        # Public users only see approved testimonials
        return qs.filter(status=Testimonial.Status.APPROVED)

    # ── serializer selection ─────────────────────
    def get_serializer_class(self):
        if self.action == 'create':
            return TestimonialPublicSubmitSerializer
        if self.action == 'import_review':
            return TestimonialImportSerializer
        return TestimonialSerializer

    # ── custom import action ─────────────────────
    @action(detail=False, methods=['post'], url_path='import')
    def import_review(self, request):
        """
        POST /api/testimonials/import/
        Admin-only: import a Google or Facebook review as APPROVED.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ============================================================
# Admin Dashboard Stats API
# ============================================================
class AdminDashboardStatsView(APIView):
    """
    GET /api/core/dashboard-stats/
    Returns aggregated data for the admin dashboard.
    ADMIN sees global data; SALES sees only their assigned leads/tasks.
    """
    permission_classes = [IsAuthenticated, IsAdminOrSales]

    def get(self, request):
        from inventory.models import Vehicle
        from crm.models import Lead, Task
        from decimal import Decimal

        now = timezone.now()
        today = now.date()
        current_month_start = today.replace(day=1)
        user = request.user
        is_sales = user.role == 'SALES'

        # ── Stat Cards ──────────────────────────────
        total_inventory = Vehicle.objects.exclude(status='SOLD').count()

        if is_sales:
            active_leads = Lead.objects.exclude(status='CLOSED').filter(assigned_to=user).count()
            pending_tasks = Task.objects.filter(is_completed=False, assigned_to=user).count()
        else:
            active_leads = Lead.objects.exclude(status='CLOSED').count()
            pending_tasks = Task.objects.filter(is_completed=False).count()

        # Monthly revenue: sum of sold_price for vehicles sold this month
        monthly_revenue = Vehicle.objects.filter(
            status='SOLD',
            sold_date__gte=current_month_start,
            sold_price__isnull=False,
        ).aggregate(total=Sum('sold_price'))['total'] or Decimal('0')

        # ── Sales Chart (last 6 months) ─────────────
        sales_chart = []
        for i in range(5, -1, -1):
            month_date = today - relativedelta(months=i)
            month_start = month_date.replace(day=1)
            if i == 0:
                month_end = today
            else:
                month_end = (month_start + relativedelta(months=1)) - relativedelta(days=1)

            month_total = Vehicle.objects.filter(
                status='SOLD',
                sold_date__gte=month_start,
                sold_date__lte=month_end,
                sold_price__isnull=False,
            ).aggregate(total=Sum('sold_price'))['total'] or Decimal('0')

            sales_chart.append({
                'month': month_date.strftime('%b'),
                'amount': float(month_total),
            })

        # Compute max for percentage bars (frontend needs relative height)
        max_amount = max((m['amount'] for m in sales_chart), default=1) or 1
        for m in sales_chart:
            m['value'] = round((m['amount'] / max_amount) * 100)

        # Six-month total
        six_month_total = sum(m['amount'] for m in sales_chart)

        # ── Recent Leads (newest 5) ─────────────────
        recent_leads_qs = Lead.objects.select_related('customer')
        if is_sales:
            recent_leads_qs = recent_leads_qs.filter(assigned_to=user)
        recent_leads_qs = recent_leads_qs.order_by('-created_at')[:5]

        recent_leads = []
        for lead in recent_leads_qs:
            # Time-ago helper
            delta = now - lead.created_at
            seconds = int(delta.total_seconds())
            if seconds < 60:
                time_ago = 'just now'
            elif seconds < 3600:
                time_ago = f'{seconds // 60} min ago'
            elif seconds < 86400:
                time_ago = f'{seconds // 3600} hour{"s" if seconds // 3600 > 1 else ""} ago'
            else:
                days = seconds // 86400
                time_ago = f'{days} day{"s" if days > 1 else ""} ago'

            desired = ' '.join(filter(None, [lead.desired_make, lead.desired_model]))
            recent_leads.append({
                'id': lead.id,
                'name': lead.customer.name if lead.customer else 'Unknown',
                'email': lead.customer.email if lead.customer else '',
                'phone': lead.customer.phone if lead.customer else '',
                'vehicle': desired or 'N/A',
                'status': lead.status,
                'time': time_ago,
            })

        # ── Inventory Status (bottom card) ──────────
        available_count = Vehicle.objects.filter(status='READY').count()
        reserved_count = Vehicle.objects.filter(status='PENDING').count()
        sold_this_month = Vehicle.objects.filter(
            status='SOLD',
            sold_date__gte=current_month_start,
        ).count()

        # Total inventory value = sum of prices for non-sold vehicles
        total_inventory_value = Vehicle.objects.exclude(
            status='SOLD'
        ).aggregate(total=Sum('price'))['total'] or Decimal('0')

        inv_total = available_count + reserved_count + sold_this_month or 1
        inventory_status = {
            'available': available_count,
            'reserved': reserved_count,
            'sold_this_month': sold_this_month,
            'total_inventory_value': float(total_inventory_value),
            'available_pct': round(available_count / inv_total * 100),
            'reserved_pct': round(reserved_count / inv_total * 100),
            'sold_pct': round(sold_this_month / inv_total * 100),
        }

        return Response({
            'user_name': user.get_full_name() or user.username,
            'user_role': user.role,
            'stats': {
                'total_inventory': total_inventory,
                'active_leads': active_leads,
                'pending_tasks': pending_tasks,
                'monthly_revenue': float(monthly_revenue),
            },
            'sales_chart': sales_chart,
            'six_month_total': six_month_total,
            'recent_leads': recent_leads,
            'inventory_status': inventory_status,
        })


class NotificationViewSet(viewsets.ModelViewSet):
    """
    /api/config/notifications/

    GET  /                  → list current user's notifications (newest first)
    GET  /unread-count/     → { "unread_count": X }
    PATCH /<id>/read/       → mark single notification as read
    POST /read-all/         → mark ALL of user's notifications as read
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    http_method_names = ['get', 'patch', 'post', 'head', 'options']

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['patch'], url_path='read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'], url_path='read-all')
    def read_all(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'ok', 'updated': updated})