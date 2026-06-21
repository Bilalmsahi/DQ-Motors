from rest_framework import viewsets, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS, BasePermission, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.utils import timezone
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django_filters import rest_framework as django_filters
from core.permissions import IsAdmin as RBACAdmin
from core.mixins import AuditLogMixin
from .models import Vehicle, VehicleImage, VehicleVideo, VehicleFeature, Favorite, VehicleDocument
from .serializers import (
    VehicleSerializer,
    VehicleImageSerializer,
    VehicleVideoSerializer,
    VehicleFeatureSerializer,
    FavoriteSerializer,
    FavoriteVehicleSerializer,
    VehicleDocumentSerializer,
    VehicleDocumentPublicSerializer,
    VehicleHistoryTimelineSerializer,
)
from .utils import decode_vin_nhtsa, generate_car_description
from core.models import DealerConfiguration
from django.db.models import Sum


# ============================================================
# Custom Permissions
# ============================================================
class IsAdminUser(BasePermission):
    """Allows access only to admin users"""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'ADMIN'
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level permission:
    - Admins can do anything
    - Owners (seller) can edit/delete their own listings
    - Anyone can read
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions for any request (GET, HEAD, OPTIONS)
        if request.method in SAFE_METHODS:
            return True
        
        # Admin has full access
        if request.user.role == 'ADMIN':
            return True
        
        # Owner can modify their own vehicle
        return obj.seller == request.user


class VehiclePermission(BasePermission):
    """
    Custom permission for Vehicle viewset:
    - Anyone can read (GET)
    - Admins can create dealership cars
    - Authenticated users can create if user_ads is enabled
    """
    def has_permission(self, request, view):
        # Allow read for everyone
        if request.method in SAFE_METHODS:
            return True
        
        # Must be authenticated for write operations
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admins always have permission
        if request.user.role == 'ADMIN':
            return True
        
        # For regular users creating vehicles, check if user_ads is enabled
        if request.method == 'POST':
            config = DealerConfiguration.get_config()
            if not config.enable_user_ads:
                return False
        
        return True


class VehicleFilter(django_filters.FilterSet):
    """
    Advanced filter set for the Vehicle model.
    Supports exact-match fields plus range lookups for price, mileage, and year.
    """
    price_min   = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    price_max   = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    mileage_min = django_filters.NumberFilter(field_name='mileage', lookup_expr='gte')
    mileage_max = django_filters.NumberFilter(field_name='mileage', lookup_expr='lte')
    year_min    = django_filters.NumberFilter(field_name='year', lookup_expr='gte')
    year_max    = django_filters.NumberFilter(field_name='year', lookup_expr='lte')

    class Meta:
        model = Vehicle
        fields = ['status', 'make', 'model', 'year', 'condition', 'color', 'featured', 'body_style', 'fuel_type']


class VehicleViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Vehicle.objects.all().order_by('-created_at')
    serializer_class = VehicleSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    permission_classes = [VehiclePermission, IsOwnerOrAdmin]
    lookup_field = 'slug'

    # Feature 29 – Advanced Search & Filter
    filterset_class = VehicleFilter
    search_fields = ['vin', 'make', 'model', 'trim', 'year']
    ordering_fields = ['price', 'year', 'created_at', 'mileage']

    def get_permissions(self):
        """
        Feature 27 – RBAC:
        - destroy (DELETE): Admin only
        - create / update / partial_update: Admin, Sales, or Technician
        - list / retrieve: handled by VehiclePermission (public read)
        """
        if self.action == 'destroy':
            return [RBACAdmin()]
        if self.action in ('create', 'update', 'partial_update'):
            return [VehiclePermission(), IsOwnerOrAdmin()]
        return super().get_permissions()
    
    def get_queryset(self):
        """
        Filter queryset based on query params:
        - ?mine=true - Only user's own listings
        - ?user_ads=true - Only user ads
        - ?dealership=true - Only dealership cars
        - ?status=ACQUIRED - Filter by status (ACQUIRED, PREP, READY, PENDING, SOLD)
        
        Visibility Rules:
        - Public (unauthenticated) users: Only see READY vehicles
        - Admin / Sales staff: See all vehicles (every lifecycle stage)
        - Regular authenticated users: See READY vehicles + their own listings
        """
        queryset = super().get_queryset()
        
        # Visibility filter based on user role
        user = self.request.user
        if not user.is_authenticated:
            # Public users only see READY vehicles (available for sale)
            queryset = queryset.filter(status='READY')
        elif hasattr(user, 'role') and user.role in ('ADMIN', 'SALES'):
            # Admin & Sales see all vehicles - no filter applied
            pass
        elif user.is_staff:
            # Any other Django staff see all vehicles
            pass
        else:
            # Regular authenticated users see READY vehicles + their own listings
            from django.db.models import Q
            queryset = queryset.filter(
                Q(status='READY') | Q(seller=user)
            )
        
        # Filter for user's own listings
        if self.request.query_params.get('mine') == 'true':
            if self.request.user.is_authenticated:
                queryset = queryset.filter(seller=self.request.user)
            else:
                queryset = queryset.none()
        
        # Filter for user ads only
        if self.request.query_params.get('user_ads') == 'true':
            queryset = queryset.filter(seller__isnull=False)
        
        # Filter for dealership cars only
        if self.request.query_params.get('dealership') == 'true':
            queryset = queryset.filter(seller__isnull=True)
        
        # Filter by status (lifecycle stage) - only for staff (Admin/Sales)
        status_filter = self.request.query_params.get('status')
        if status_filter and user.is_authenticated and hasattr(user, 'role') and user.role in ('ADMIN', 'SALES'):
            queryset = queryset.filter(status=status_filter.upper())
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Auto-set seller based on user role:
        - Admins: seller = null (dealership car) unless explicitly set
        - Regular users: seller = themselves
        """
        user = self.request.user
        
        if user.role == 'ADMIN':
            # Admins can optionally set a seller or leave null for dealership
            serializer.save()
        else:
            # Regular users always become the seller
            serializer.save(seller=user)
        # Feature 30 – Audit log
        self._log_create(serializer)
    
    # ── Helper: public-safe queryset (always status=READY) ──
    def get_public_queryset(self):
        """
        Returns a queryset that ALWAYS only includes READY vehicles,
        regardless of who is calling.  Used by homepage-facing actions
        (featured, recent, recommended) so that admins browsing the
        public site never leak non-ready inventory.
        """
        return Vehicle.objects.filter(status='READY').order_by('-created_at')

    # ── Public homepage actions ─────────────────────────────
    @action(detail=False, methods=['get'], permission_classes=[AllowAny],
            url_path='featured')
    def featured_cars(self, request):
        """
        GET /api/inventory/vehicles/featured/
        Returns up to 8 featured READY vehicles for the homepage.
        """
        vehicles = self.get_public_queryset().filter(featured=True)[:8]
        serializer = self.get_serializer(vehicles, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny],
            url_path='recent')
    def recent_arrivals(self, request):
        """
        GET /api/inventory/vehicles/recent/
        Returns the 10 most recently added READY vehicles.
        """
        vehicles = self.get_public_queryset()[:10]
        serializer = self.get_serializer(vehicles, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny],
            url_path='recommended')
    def recommended(self, request):
        """
        GET /api/inventory/vehicles/recommended/
        Returns up to 10 READY vehicles ordered by random / price-desc
        as a lightweight recommendation.

        Optional query param: ?exclude=<vehicle_id> to omit a specific car.
        """
        qs = self.get_public_queryset().order_by('?')  # random order
        exclude_id = request.query_params.get('exclude')
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        vehicles = qs[:10]
        serializer = self.get_serializer(vehicles, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_listings(self, request):
        """
        GET /api/inventory/vehicles/my_listings/
        Returns only vehicles listed by the current user
        """
        vehicles = Vehicle.objects.filter(seller=request.user).order_by('-created_at')
        serializer = self.get_serializer(vehicles, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny],
            url_path='filter_options')
    def filter_options(self, request):
        """
        GET /api/inventory/vehicles/filter_options/
        Returns distinct makes, models, years, colors, and conditions for
        filter dropdowns.  Only considers vehicles visible to the requesting
        user.

        Query params (optional):
            ?make=Toyota  – when provided, models are scoped to that make.
        """
        qs = self.get_queryset()

        # Smart model dependency: if ?make= is supplied, scope models
        make_param = request.query_params.get('make')
        model_qs = qs.filter(make__iexact=make_param) if make_param else qs

        return Response({
            'makes': sorted(qs.values_list('make', flat=True).distinct()),
            'models': sorted(model_qs.values_list('model', flat=True).distinct()),
            'years': sorted(
                qs.values_list('year', flat=True).distinct(), reverse=True
            ),
            'colors': sorted(
                filter(None, qs.values_list('color', flat=True).distinct())
            ),
            'conditions': sorted(
                qs.values_list('condition', flat=True).distinct()
            ),
        })


# ============================================================
# Standalone Filter Options (public, lightweight endpoint)
# ============================================================
class VehicleFilterOptionsView(APIView):
    """
    GET /api/inventory/filters/
    Public endpoint returning unique dropdown values for the homepage
    search widget.  Only considers vehicles with status='READY'.

    Query params (optional):
        ?make=Toyota  – scope models to a specific make.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        qs = Vehicle.objects.filter(status='READY')

        make_param = request.query_params.get('make')
        model_qs = qs.filter(make__iexact=make_param) if make_param else qs

        return Response({
            'makes': sorted(qs.values_list('make', flat=True).distinct()),
            'models': sorted(model_qs.values_list('model', flat=True).distinct()),
            'years': sorted(
                qs.values_list('year', flat=True).distinct(), reverse=True
            ),
            'colors': sorted(
                filter(None, qs.values_list('color', flat=True).distinct())
            ),
            'conditions': sorted(
                qs.values_list('condition', flat=True).distinct()
            ),
        })


# ============================================================
# Vehicle Stats API View (Lifecycle Pipeline Stats)
# ============================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vehicle_stats_view(request):
    """
    GET /api/inventory/stats/
    Returns count of vehicles in each lifecycle stage.
    
    Response:
    {
        "total": 25,
        "by_status": {
            "ACQUIRED": {"count": 5, "label": "Acquired", "color": "gray"},
            "PREP": {"count": 3, "label": "In Prep", "color": "orange"},
            "READY": {"count": 10, "label": "Ready", "color": "green"},
            "PENDING": {"count": 2, "label": "Pending", "color": "yellow"},
            "SOLD": {"count": 5, "label": "Sold", "color": "red"}
        }
    }
    """
    from django.db.models import Count
    
    # Get counts by status
    status_counts = Vehicle.objects.values('status').annotate(count=Count('id'))
    
    # Status metadata (label and color)
    status_meta = {
        'ACQUIRED': {'label': 'Acquired', 'color': 'gray'},
        'PREP': {'label': 'In Prep', 'color': 'orange'},
        'READY': {'label': 'Ready', 'color': 'green'},
        'PENDING': {'label': 'Pending', 'color': 'yellow'},
        'SOLD': {'label': 'Sold', 'color': 'red'},
    }
    
    # Build response with all statuses (even if count is 0)
    by_status = {}
    for status_choice in Vehicle.Status.choices:
        status_key = status_choice[0]
        by_status[status_key] = {
            'count': 0,
            'label': status_meta.get(status_key, {}).get('label', status_choice[1]),
            'color': status_meta.get(status_key, {}).get('color', 'gray'),
        }
    
    # Fill in actual counts
    for item in status_counts:
        if item['status'] in by_status:
            by_status[item['status']]['count'] = item['count']
    
    total = sum(s['count'] for s in by_status.values())
    
    return Response({
        'total': total,
        'by_status': by_status,
    })


class VehicleImageViewSet(viewsets.ModelViewSet):
    queryset = VehicleImage.objects.all()
    serializer_class = VehicleImageSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = (MultiPartParser, FormParser)


class VehicleVideoViewSet(viewsets.ModelViewSet):
    queryset = VehicleVideo.objects.all()
    serializer_class = VehicleVideoSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = (MultiPartParser, FormParser)


class VehicleFeatureViewSet(viewsets.ModelViewSet):
    queryset = VehicleFeature.objects.all()
    serializer_class = VehicleFeatureSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = None


# ============================================================
# VIN Decoding API View
# ============================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def decode_vin_view(request):
    """
    Decode a VIN using the NHTSA API.
    
    POST /api/inventory/decode-vin/
    Body: { "vin": "1HGBH41JXMN109186" }
    
    Returns: { "make": "Honda", "model": "Accord", "year": 2021, ... }
    """
    vin = request.data.get('vin', '').strip().upper()
    
    if not vin:
        return Response(
            {'error': 'VIN is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if len(vin) != 17:
        return Response(
            {'error': 'VIN must be exactly 17 characters'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    result = decode_vin_nhtsa(vin)
    
    if 'error' in result:
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(result, status=status.HTTP_200_OK)


# ============================================================
# AI Description Generation API View
# ============================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_description_view(request):
    """
    Generate an AI-powered vehicle listing description.
    
    POST /api/inventory/generate-description/
    Body: {
        "year": 2024,
        "make": "BMW",
        "model": "X5",
        "trim": "xDrive40i",
        "mileage": 15000,
        "condition": "USED",
        "features": ["Sunroof", "Navigation", "Leather Seats"]
    }
    
    Returns: { "description": "Experience the thrill of..." }
    """
    # Extract vehicle data from request
    vehicle_data = {
        'year': request.data.get('year'),
        'make': request.data.get('make'),
        'model': request.data.get('model'),
        'trim': request.data.get('trim', ''),
        'mileage': request.data.get('mileage'),
        'condition': request.data.get('condition', 'USED'),
        'color': request.data.get('color', ''),
        'transmission': request.data.get('transmission', ''),
        'fuel_type': request.data.get('fuel_type', ''),
        'body_style': request.data.get('body_style', ''),
        'drivetrain': request.data.get('drivetrain', ''),
        'engine': request.data.get('engine', ''),
        'doors': request.data.get('doors', ''),
        'features': request.data.get('features', []),
    }
    
    # Validate required fields
    if not vehicle_data.get('make') or not vehicle_data.get('model') or not vehicle_data.get('year'):
        return Response(
            {'error': 'Make, model, and year are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    result = generate_car_description(vehicle_data)
    
    return Response(result, status=status.HTTP_200_OK)


# ============================================================
# Wishlist / Favorites ViewSet
# ============================================================
class WishlistViewSet(viewsets.ViewSet):
    """
    ViewSet for managing user's favorite/wishlist vehicles.
    
    Endpoints:
    - GET  /api/wishlist/         - List all favorites for current user
    - POST /api/wishlist/toggle/  - Toggle like/unlike for a vehicle
    - GET  /api/wishlist/check/<vehicle_id>/  - Check if a specific vehicle is liked
    """
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """
        GET /api/wishlist/
        Returns all vehicles liked by the current user.
        """
        favorites = Favorite.objects.filter(user=request.user).select_related('vehicle')
        
        # Get the vehicles from favorites with their images
        vehicles = [fav.vehicle for fav in favorites]
        
        serializer = FavoriteVehicleSerializer(
            vehicles, 
            many=True, 
            context={'request': request}
        )
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """
        POST /api/wishlist/toggle/
        Body: { "vehicle_id": 123 }
        
        Toggles the like status:
        - If already liked → removes from favorites (returns { "is_liked": false })
        - If not liked → adds to favorites (returns { "is_liked": true })
        """
        vehicle_id = request.data.get('vehicle_id')
        
        if not vehicle_id:
            return Response(
                {'error': 'vehicle_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            vehicle = Vehicle.objects.get(id=vehicle_id)
        except Vehicle.DoesNotExist:
            return Response(
                {'error': 'Vehicle not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Try to find existing favorite
        favorite, created = Favorite.objects.get_or_create(
            user=request.user,
            vehicle=vehicle
        )
        
        if not created:
            # Already existed, so delete it (unlike)
            favorite.delete()
            return Response({
                'is_liked': False,
                'message': 'Removed from favorites'
            })
        else:
            # Just created (liked)
            return Response({
                'is_liked': True,
                'message': 'Added to favorites'
            })
    
    @action(detail=False, methods=['get'], url_path='check/(?P<vehicle_id>[^/.]+)')
    def check(self, request, vehicle_id=None):
        """
        GET /api/wishlist/check/<vehicle_id>/
        Check if a specific vehicle is in the user's wishlist.
        """
        if not vehicle_id:
            return Response(
                {'error': 'vehicle_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        is_liked = Favorite.objects.filter(
            user=request.user,
            vehicle_id=vehicle_id
        ).exists()
        
        return Response({'is_liked': is_liked})
    
    @action(detail=False, methods=['get'])
    def ids(self, request):
        """
        GET /api/wishlist/ids/
        Returns just the IDs of all liked vehicles.
        Useful for frontend to quickly determine which hearts to fill.
        """
        favorite_ids = Favorite.objects.filter(
            user=request.user
        ).values_list('vehicle_id', flat=True)
        
        return Response({'vehicle_ids': list(favorite_ids)})


# ============================================================
# Vehicle Document ViewSet
# ============================================================
class VehicleDocumentPermission(BasePermission):
    """
    Custom permission for VehicleDocument:
    - Admins: Full CRUD access to all documents
    - Public/Users: Read-only access to documents where is_public=True
    """
    def has_permission(self, request, view):
        # Read permissions for everyone
        if request.method in SAFE_METHODS:
            return True
        
        # Write operations require admin
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role == 'ADMIN'
    
    def has_object_permission(self, request, view, obj):
        # Admins can do anything
        if request.user and request.user.is_authenticated and request.user.role == 'ADMIN':
            return True
        
        # Non-admins can only read public documents
        if request.method in SAFE_METHODS and obj.is_public:
            return True
        
        return False


class VehicleDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing vehicle documents.
    
    Permissions:
    - Admins: Full CRUD access to all documents
    - Public/Users: Read-only access to public documents only
    
    Endpoints:
    - GET /api/inventory/documents/ - List documents (filtered by is_public for non-admins)
    - GET /api/inventory/documents/?vehicle=<id> - List documents for specific vehicle
    - POST /api/inventory/documents/ - Create document (admin only)
    - GET /api/inventory/documents/<id>/ - Get document details
    - PUT/PATCH /api/inventory/documents/<id>/ - Update document (admin only)
    - DELETE /api/inventory/documents/<id>/ - Delete document (admin only)
    - GET /api/inventory/documents/doc_types/ - List available document types
    """
    queryset = VehicleDocument.objects.all().select_related('vehicle')
    permission_classes = [VehicleDocumentPermission]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    pagination_class = None
    
    def get_serializer_class(self):
        """
        Use public serializer for non-admin users.
        """
        if self.request.user and self.request.user.is_authenticated and self.request.user.role == 'ADMIN':
            return VehicleDocumentSerializer
        return VehicleDocumentPublicSerializer
    
    def get_queryset(self):
        """
        Filter queryset:
        - Admins see all documents
        - Non-admins see only public documents
        - Optionally filter by vehicle ID
        """
        queryset = super().get_queryset()
        
        # Filter by visibility based on user role
        user = self.request.user
        if not user or not user.is_authenticated or user.role != 'ADMIN':
            queryset = queryset.filter(is_public=True)
        
        # Filter by vehicle
        vehicle_id = self.request.query_params.get('vehicle')
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        
        # Filter by document type
        doc_type = self.request.query_params.get('doc_type')
        if doc_type:
            queryset = queryset.filter(doc_type=doc_type)
        
        # Filter by visibility (admin only)
        is_public = self.request.query_params.get('is_public')
        if is_public is not None and user and user.is_authenticated and user.role == 'ADMIN':
            queryset = queryset.filter(is_public=is_public.lower() == 'true')
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def doc_types(self, request):
        """
        GET /api/inventory/documents/doc_types/
        Return available document types for dropdown.
        """
        types = [
            {'value': choice[0], 'label': choice[1]}
            for choice in VehicleDocument.DocType.choices
        ]
        return Response(types)
    
    @action(detail=False, methods=['get'], url_path='by_vehicle/(?P<vehicle_id>[^/.]+)')
    def by_vehicle(self, request, vehicle_id=None):
        """
        GET /api/inventory/documents/by_vehicle/<vehicle_id>/
        Get all documents for a specific vehicle.
        Respects visibility permissions.
        """
        queryset = self.get_queryset().filter(vehicle_id=vehicle_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# ============================================================
# Vehicle History Timeline View
# ============================================================

class VehicleHistoryTimelineView(APIView):
    """
    GET /api/inventory/vehicle/{id}/history-timeline/
    
    Comprehensive Work History Tracker that aggregates data from multiple sources
    into a single chronological Timeline View.
    
    Sources:
    - Vehicle.created_at -> "Vehicle Acquired"
    - Expense (category='REPAIR' or service_type exists) -> "Service Record"
    - VehicleDocument (doc_type='INSPECTION') -> "Inspection"
    - Vehicle.sold_date (if exists) -> "Vehicle Sold"
    
    Filtering:
    - Public users: Only events where is_public=True
    - Admin users: All events
    """
    permission_classes = [AllowAny]
    
    def get(self, request, vehicle_id):
        # Get the vehicle
        try:
            vehicle = Vehicle.objects.get(id=vehicle_id)
        except Vehicle.DoesNotExist:
            return Response(
                {'error': 'Vehicle not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is admin
        is_admin = (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'ADMIN'
        )
        
        timeline_events = []
        
        # ========================================
        # Query 1: Vehicle Acquired Event
        # ========================================
        acquired_event = {
            'id': f'vehicle_{vehicle.id}_acquired',
            'event_type': 'Vehicle Acquired',
            'date': vehicle.created_at,
            'title': f'{vehicle.year} {vehicle.make} {vehicle.model} added to inventory',
            'description': f'VIN: {vehicle.vin}' if is_admin else '',
            'is_public': True,
            'source': 'vehicle',
            'source_id': vehicle.id,
            'service_type': None,
            'service_type_display': None,
            'amount': None,
            'vendor': None,
            'invoice_url': None,
            'images': [],
            'doc_type': None,
            'doc_type_display': None,
            'file_url': None,
            'file_name': None,
        }
        timeline_events.append(acquired_event)
        
        # ========================================
        # Query 2: Service Records (Expenses)
        # ========================================
        # Import here to avoid circular imports
        from financials.models import Expense
        
        expense_queryset = Expense.objects.filter(
            vehicle=vehicle
        ).filter(
            Q(category='REPAIR') | Q(service_type__isnull=False)
        ).select_related('vendor').prefetch_related('images')
        
        # Filter by visibility for non-admin users
        if not is_admin:
            expense_queryset = expense_queryset.filter(is_public=True)
        
        for expense in expense_queryset:
            # Build title based on service type or category
            if expense.service_type:
                title = expense.service_type_display or expense.service_type
            else:
                title = expense.get_category_display()
            
            # Build images list
            images_list = []
            for img in expense.images.all():
                images_list.append({
                    'id': img.id,
                    'url': img.image.url if img.image else None,
                    'caption': img.caption,
                    'caption_display': img.get_caption_display() if img.caption else None,
                })
            
            service_event = {
                'id': f'expense_{expense.id}',
                'event_type': 'Service Record',
                'date': timezone.make_aware(
                    timezone.datetime.combine(expense.date, timezone.datetime.min.time())
                ) if expense.date else expense.created_at,
                'title': title,
                'description': expense.description or '',
                'is_public': expense.is_public,
                'source': 'expense',
                'source_id': expense.id,
                'service_type': expense.service_type,
                'service_type_display': expense.service_type_display,
                'amount': expense.amount if is_admin else None,
                'vendor': expense.vendor_display if is_admin else None,
                'invoice_url': expense.invoice_url,
                'images': images_list,
                'doc_type': None,
                'doc_type_display': None,
                'file_url': None,
                'file_name': None,
            }
            timeline_events.append(service_event)
        
        # ========================================
        # Query 3: Inspection Documents
        # ========================================
        doc_queryset = VehicleDocument.objects.filter(
            vehicle=vehicle,
            doc_type='INSPECTION'
        )
        
        # Filter by visibility for non-admin users
        if not is_admin:
            doc_queryset = doc_queryset.filter(is_public=True)
        
        for doc in doc_queryset:
            inspection_event = {
                'id': f'document_{doc.id}',
                'event_type': 'Inspection',
                'date': doc.created_at,
                'title': doc.title or 'Inspection Report',
                'description': doc.description or '',
                'is_public': doc.is_public,
                'source': 'document',
                'source_id': doc.id,
                'service_type': None,
                'service_type_display': None,
                'amount': None,
                'vendor': None,
                'invoice_url': None,
                'images': [],
                'doc_type': doc.doc_type,
                'doc_type_display': doc.get_doc_type_display(),
                'file_url': doc.file_url,
                'file_name': doc.file_name,
            }
            timeline_events.append(inspection_event)
        
        # ========================================
        # Query 4: Vehicle Sold Event
        # ========================================
        if vehicle.status == 'SOLD':
            # Use updated_at as approximate sold date if no specific sold_date field
            sold_date = getattr(vehicle, 'sold_date', None) or vehicle.updated_at
            
            sold_event = {
                'id': f'vehicle_{vehicle.id}_sold',
                'event_type': 'Vehicle Sold',
                'date': sold_date,
                'title': f'{vehicle.year} {vehicle.make} {vehicle.model} sold',
                'description': '',
                'is_public': True,
                'source': 'vehicle',
                'source_id': vehicle.id,
                'service_type': None,
                'service_type_display': None,
                'amount': None,
                'vendor': None,
                'invoice_url': None,
                'images': [],
                'doc_type': None,
                'doc_type_display': None,
                'file_url': None,
                'file_name': None,
            }
            timeline_events.append(sold_event)
        
        # ========================================
        # Sort by date (newest first)
        # ========================================
        timeline_events.sort(key=lambda x: x['date'], reverse=True)
        
        # Serialize and return
        serializer = VehicleHistoryTimelineSerializer(timeline_events, many=True)
        
        return Response({
            'vehicle_id': vehicle.id,
            'vehicle_title': f'{vehicle.year} {vehicle.make} {vehicle.model}',
            'is_admin_view': is_admin,
            'total_events': len(timeline_events),
            'events': serializer.data
        })


# ============================================================
# Vehicle History Report Card
# ============================================================

class VehicleHistoryReportView(APIView):
    """
    GET /api/inventory/vehicle/{id}/history-report/

    Professional branded Vehicle History Report (CarFax-style).
    Returns three sections:
      1. vehicle_details – basic vehicle info
      2. timeline        – chronological events (all sources)
      3. summary         – aggregate counters

    Context-aware:
      • Admin  → Everything (costs, vendor names, private notes, all records)
      • Public → Only is_public=True records, no costs, no vendors, no private notes
    """
    permission_classes = [AllowAny]

    def get(self, request, vehicle_id=None, vin=None):
        try:
            if vin:
                vehicle = Vehicle.objects.get(vin__iexact=vin)
            else:
                vehicle = Vehicle.objects.get(id=vehicle_id)
        except Vehicle.DoesNotExist:
            return Response(
                {'error': 'Vehicle not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        is_admin = (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'ADMIN'
        )

        # ────────────────────────────────────────────────
        # 1. Vehicle Details
        # ────────────────────────────────────────────────
        vehicle_details = {
            'id': vehicle.id,
            'year': vehicle.year,
            'make': vehicle.make,
            'model': vehicle.model,
            'trim': vehicle.trim or '',
            'vin': vehicle.vin,
            'color': vehicle.color or '',
            'mileage': vehicle.mileage,
            'condition': vehicle.get_condition_display(),
            'status': vehicle.get_status_display(),
            'slug': vehicle.slug,
        }

        # Admin-only details
        if is_admin:
            vehicle_details.update({
                'price': float(vehicle.price),
                'total_cost': float(vehicle.total_cost),
                'profit_margin': float(vehicle.profit_margin),
                'sold_date': vehicle.sold_date.isoformat() if vehicle.sold_date else None,
            })

        # ────────────────────────────────────────────────
        # 2. Build Timeline
        # ────────────────────────────────────────────────
        from financials.models import Expense

        timeline = []

        # — Event: Vehicle Acquired ——————————————————
        timeline.append({
            'event_type': 'ACQUIRED',
            'icon': 'truck',
            'date': vehicle.created_at.date().isoformat(),
            'title': f'{vehicle.year} {vehicle.make} {vehicle.model} added to inventory',
            'description': f'VIN: {vehicle.vin}' if is_admin else '',
            'category': None,
            'amount': None,
            'vendor': None,
            'file_url': None,
            'images': [],
        })

        # — Events: Expenses (Repairs, Detailing, etc.) —
        expense_qs = Expense.objects.filter(vehicle=vehicle).select_related('vendor').prefetch_related('images')
        if not is_admin:
            expense_qs = expense_qs.filter(is_public=True)

        total_service_cost = 0
        service_count = 0
        last_service_date = None

        for exp in expense_qs:
            service_count += 1
            total_service_cost += float(exp.amount)

            exp_date = exp.date
            if last_service_date is None or exp_date > last_service_date:
                last_service_date = exp_date

            # Build title
            if exp.service_type:
                title = exp.service_type_display or exp.service_type
            else:
                title = exp.get_category_display()

            # Images
            images = []
            for img in exp.images.all():
                images.append({
                    'url': img.image.url if img.image else None,
                    'caption': img.get_caption_display() if img.caption else None,
                })

            event = {
                'event_type': 'SERVICE',
                'icon': 'wrench',
                'date': exp_date.isoformat() if exp_date else exp.created_at.date().isoformat(),
                'title': title,
                'description': exp.description if is_admin else '',
                'category': exp.get_category_display(),
                'amount': float(exp.amount) if is_admin else None,
                'vendor': exp.vendor_display if is_admin else None,
                'file_url': exp.invoice_url if is_admin else None,
                'images': images,
            }
            timeline.append(event)

        # — Events: Documents (Inspections, Service Records, etc.) ——
        doc_qs = VehicleDocument.objects.filter(vehicle=vehicle)
        if not is_admin:
            doc_qs = doc_qs.filter(is_public=True)

        inspections_count = 0

        for doc in doc_qs:
            if doc.doc_type == 'INSPECTION':
                inspections_count += 1

            event = {
                'event_type': 'DOCUMENT',
                'icon': 'file-text',
                'date': doc.created_at.date().isoformat(),
                'title': doc.title or doc.get_doc_type_display(),
                'description': doc.description if is_admin else '',
                'category': doc.get_doc_type_display(),
                'amount': None,
                'vendor': None,
                'file_url': doc.file_url,
                'images': [],
            }
            timeline.append(event)

        # — Event: Vehicle Sold ——————————————————
        if vehicle.status == Vehicle.Status.SOLD:
            sold_date = vehicle.sold_date or vehicle.updated_at.date()
            timeline.append({
                'event_type': 'SOLD',
                'icon': 'check-circle',
                'date': sold_date.isoformat(),
                'title': f'{vehicle.year} {vehicle.make} {vehicle.model} sold',
                'description': '',
                'category': None,
                'amount': float(vehicle.price) if is_admin else None,
                'vendor': None,
                'file_url': None,
                'images': [],
            })

        # Sort newest-first
        timeline.sort(key=lambda e: e['date'], reverse=True)

        # ────────────────────────────────────────────────
        # 3. Summary
        # ────────────────────────────────────────────────
        summary = {
            'total_services': service_count,
            'inspections_passed': inspections_count,
            'documents_on_file': doc_qs.count(),
            'last_service_date': last_service_date.isoformat() if last_service_date else None,
        }

        if is_admin:
            summary['total_service_cost'] = round(total_service_cost, 2)
            summary['total_cost'] = float(vehicle.total_cost)
            summary['profit_margin'] = float(vehicle.profit_margin)

        return Response({
            'is_admin_view': is_admin,
            'vehicle_details': vehicle_details,
            'timeline': timeline,
            'summary': summary,
        })


# ══════════════════════════════════════════════════════════
# Facebook Marketplace Automotive Catalog Feed (CSV)
# ══════════════════════════════════════════════════════════
import csv
import os
from django.conf import settings as django_settings

# Facebook-allowed ENUM values
_FB_BODY_STYLES = frozenset([
    'CONVERTIBLE', 'COUPE', 'CROSSOVER', 'ESTATE', 'GRANDTOURER',
    'HATCHBACK', 'MINIBUS', 'MINIVAN', 'MPV', 'PICKUP', 'ROADSTER',
    'SALOON', 'SEDAN', 'SMALL_CAR', 'SPORTSCAR', 'SUPERCAR',
    'SUPERMINI', 'SUV', 'TRUCK', 'VAN', 'WAGON', 'OTHER',
])

_FB_TRANSMISSIONS = frozenset(['MANUAL', 'AUTOMATIC'])

_FB_VEHICLE_STATES = frozenset(['new', 'used', 'cpo'])


def _map_body_style(raw: str) -> str:
    """Map a free-text body style to a Facebook-approved ENUM value."""
    if not raw:
        return 'OTHER'
    upper = raw.strip().upper().replace(' ', '_').replace('-', '_')
    # Direct match
    if upper in _FB_BODY_STYLES:
        return upper
    # Common aliases
    aliases = {
        'SPORT_UTILITY': 'SUV', 'SPORTS_UTILITY': 'SUV',
        'SPORT_UTILITY_VEHICLE': 'SUV',
        'PICKUP_TRUCK': 'PICKUP', 'CREW_CAB': 'PICKUP',
        'DOUBLE_CAB': 'PICKUP', 'EXTENDED_CAB': 'PICKUP',
        'STATION_WAGON': 'WAGON', 'TOURING': 'WAGON',
        'CABRIOLET': 'CONVERTIBLE', 'SPYDER': 'CONVERTIBLE',
        'LIFTBACK': 'HATCHBACK', 'LIFT_BACK': 'HATCHBACK',
        'FOUR_DOOR': 'SEDAN', '4_DOOR': 'SEDAN',
        'TWO_DOOR': 'COUPE', '2_DOOR': 'COUPE',
    }
    return aliases.get(upper, 'OTHER')


def _map_transmission(raw: str) -> str:
    """Map a free-text transmission to 'AUTOMATIC' or 'MANUAL'."""
    if not raw:
        return 'AUTOMATIC'
    upper = raw.strip().upper()
    if 'MANUAL' in upper or upper in ('MT', 'STICK', 'STANDARD'):
        return 'MANUAL'
    return 'AUTOMATIC'


def _map_vehicle_state(condition_value: str) -> str:
    """Map DB condition to Facebook state_of_vehicle: 'new', 'used', or 'cpo'."""
    if not condition_value:
        return 'used'
    lower = condition_value.strip().lower()
    if lower == 'new':
        return 'new'
    if lower in ('cpo', 'certified', 'certified pre-owned', 'certified_pre_owned'):
        return 'cpo'
    return 'used'


@method_decorator(csrf_exempt, name='dispatch')
class FacebookCatalogFeedView(APIView):
    """
    GET /api/inventory/feeds/facebook.csv

    Returns a CSV file conforming to Meta's Automotive Inventory Catalog
    specification.  Facebook Business Manager polls this URL hourly to
    keep the Marketplace listing in sync.

    Authentication:
        • No JWT required (Meta's servers need to fetch this).
        • Optional query-param token: ?token=<FB_FEED_TOKEN>
          Set FB_FEED_TOKEN in .env to enable token-based access control.

    Throttling / Rate-Limiting:
        Completely disabled for this view so Facebook's crawler
        can burst-fetch without receiving 429 / 403 responses.
    """

    authentication_classes = []   # No JWT
    permission_classes = [AllowAny]
    throttle_classes = []         # No DRF throttling

    # Facebook catalog CSV column headers (strict spec)
    FB_HEADERS = [
        'vehicle_id',
        'title',
        'description',
        'url',
        'make',
        'model',
        'year',
        'mileage.value',
        'mileage.unit',
        'image[0].url',
        'price',
        'availability',
        'condition',
        'state_of_vehicle',
        'transmission',
        'body_style',
        'vin',
        'color',
        'address.addr1',
        'address.city',
        'address.region',
        'address.postal_code',
        'address.country',
    ]

    def get(self, request):
        # ── Optional token gate ───────────────────────────
        feed_token = (
            getattr(django_settings, 'FB_FEED_TOKEN', None)
            or os.environ.get('FB_FEED_TOKEN')
        )
        if feed_token:
            provided = request.query_params.get('token', '')
            if provided != feed_token:
                return HttpResponse(
                    'Unauthorized – invalid or missing token.',
                    status=403,
                    content_type='text/plain',
                )

        # ── Dealership address (from env or hardcoded) ────
        dealer_addr1 = os.environ.get('DEALER_ADDRESS', '1448 Lawrence Ave. E')
        dealer_city = os.environ.get('DEALER_CITY', 'Toronto')
        dealer_region = os.environ.get('DEALER_REGION', 'ON')
        dealer_postal = os.environ.get('DEALER_POSTAL_CODE', 'M4A 2V6')
        dealer_country = os.environ.get('DEALER_COUNTRY', 'CA')

        # ── Query dealership vehicles that are READY ──────
        vehicles = (
            Vehicle.objects
            .filter(status=Vehicle.Status.READY, seller__isnull=True)
            .prefetch_related('images', 'features')
            .order_by('id')
        )

        site_url = getattr(django_settings, 'SITE_URL', 'https://dqmotors.ca').rstrip('/')

        # ── Build CSV response ────────────────────────────
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'inline; filename="facebook_catalog.csv"'

        writer = csv.DictWriter(response, fieldnames=self.FB_HEADERS)
        writer.writeheader()

        for v in vehicles:
            # Primary image URL
            first_image = v.images.first()
            if first_image and first_image.image:
                raw_url = first_image.image.url
                image_url = raw_url if raw_url.startswith('http') else f'{site_url}{raw_url}'
            else:
                image_url = ''

            # Strict ENUM mappings
            state = _map_vehicle_state(v.condition)
            body = _map_body_style(v.trim)        # trim often contains body style info
            trans = _map_transmission('')          # model has no transmission field yet

            # Build description from trim + features
            parts = []
            if v.trim:
                parts.append(v.trim)
            if v.description:
                parts.append(v.description[:500])
            feature_names = list(v.features.values_list('name', flat=True)[:10])
            if feature_names:
                parts.append('Features: ' + ', '.join(feature_names))
            description = ' | '.join(parts) or f'{v.year} {v.make} {v.model}'

            writer.writerow({
                'vehicle_id': v.vin,
                'title': f'{v.year} {v.make} {v.model}',
                'description': description,
                'url': f'{site_url}/vehicles/{v.slug}',
                'make': v.make,
                'model': v.model,
                'year': v.year,
                'mileage.value': v.mileage,
                'mileage.unit': 'KM',
                'image[0].url': image_url,
                'price': int(v.price),
                'availability': 'in stock',
                'condition': state,
                'state_of_vehicle': state,
                'transmission': trans,
                'body_style': body,
                'vin': v.vin,
                'color': v.color or '',
                'address.addr1': dealer_addr1,
                'address.city': dealer_city,
                'address.region': dealer_region,
                'address.postal_code': dealer_postal,
                'address.country': dealer_country,
            })

        return response


# ══════════════════════════════════════════════════════════
# Google Merchant Center Vehicle Ads Feed (CSV)
# ══════════════════════════════════════════════════════════

@method_decorator(csrf_exempt, name='dispatch')
class GoogleVehicleFeedView(APIView):
    """
    GET /api/inventory/feeds/google.csv

    Returns a CSV file formatted for Google Merchant Center Vehicle Ads
    (Performance Max campaigns).  Google fetches this URL on a schedule
    to keep the vehicle listing catalogue in sync.

    Authentication / Throttling:
        Completely open — no JWT, CSRF, or rate-limiting so Google's
        crawler can fetch without 403 / 429 responses.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = []

    GOOGLE_HEADERS = [
        'vehicle_fulfillment_store_code',
        'id',
        'title',
        'description',
        'link',
        'image_link',
        'price',
        'condition',
        'brand',
        'model',
        'year',
        'mileage',
    ]

    def get(self, request):
        # ── Optional token gate (same pattern as FB feed) ─
        feed_token = (
            getattr(django_settings, 'GOOGLE_FEED_TOKEN', None)
            or os.environ.get('GOOGLE_FEED_TOKEN')
        )
        if feed_token:
            provided = request.query_params.get('token', '')
            if provided != feed_token:
                return HttpResponse(
                    'Unauthorized – invalid or missing token.',
                    status=403,
                    content_type='text/plain',
                )

        store_code = os.environ.get('GOOGLE_STORE_CODE', 'STORE1')
        currency = os.environ.get('DEALER_CURRENCY', 'CAD')
        mileage_unit = os.environ.get('DEALER_MILEAGE_UNIT', 'km')

        vehicles = (
            Vehicle.objects
            .filter(status=Vehicle.Status.READY, seller__isnull=True)
            .prefetch_related('images', 'features')
            .order_by('id')
        )

        site_url = getattr(django_settings, 'SITE_URL', 'https://dqmotors.ca').rstrip('/')

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'inline; filename="google_vehicle_feed.csv"'

        writer = csv.DictWriter(response, fieldnames=self.GOOGLE_HEADERS)
        writer.writeheader()

        for v in vehicles:
            # Primary image
            first_image = v.images.first()
            if first_image and first_image.image:
                raw_url = first_image.image.url
                image_url = raw_url if raw_url.startswith('http') else f'{site_url}{raw_url}'
            else:
                image_url = ''

            # Condition: Google expects 'new' or 'used'
            condition = 'new' if v.condition == Vehicle.Condition.NEW else 'used'

            # Description
            parts = []
            if v.trim:
                parts.append(v.trim)
            if v.description:
                parts.append(v.description[:500])
            feature_names = list(v.features.values_list('name', flat=True)[:10])
            if feature_names:
                parts.append(', '.join(feature_names))
            description = ' | '.join(parts) or f'{v.year} {v.make} {v.model}'

            writer.writerow({
                'vehicle_fulfillment_store_code': store_code,
                'id': v.vin or str(v.id),
                'title': f'{v.year} {v.make} {v.model}',
                'description': description,
                'link': f'{site_url}/vehicles/{v.slug}',
                'image_link': image_url,
                'price': f'{v.price:.2f} {currency}',
                'condition': condition,
                'brand': v.make,
                'model': v.model,
                'year': v.year,
                'mileage': f'{v.mileage} {mileage_unit}',
            })

        return response
