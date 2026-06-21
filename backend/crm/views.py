from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.conf import settings as django_settings
from datetime import datetime, timedelta
from core.permissions import IsAdmin, IsAdminOrSales
from core.mixins import AuditLogMixin
from core.utils import send_html_email
from .models import Customer, Lead, Appointment, Task, Interaction, Deal, TradeIn
from .serializers import (
    CustomerSerializer, LeadSerializer, AppointmentSerializer,
    TaskSerializer, InteractionSerializer, DealSerializer,
    TradeInSerializer
)

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('-created_at')
    serializer_class = CustomerSerializer
    pagination_class = None

    def get_permissions(self):
        """
        Allow public access to create a customer record (website lead-capture
        forms create the Customer before the Lead). All other actions —
        including list/retrieve, which expose every customer's PII — require
        ADMIN or SALES staff.
        """
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [IsAdminOrSales()]

class LeadViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Lead.objects.all().order_by('-created_at')
    serializer_class = LeadSerializer

    # Feature 29 – Advanced Search & Filter
    filterset_fields = ['status', 'source', 'lead_type', 'assigned_to']
    search_fields = ['customer__name', 'customer__email', 'customer__phone', 'notes']
    ordering_fields = ['created_at', 'status']

    def get_permissions(self):
        """
        Allow public access to create leads (contact form).
        Authenticated ADMIN or SALES users for all other actions.
        """
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [IsAdminOrSales()]

    def get_queryset(self):
        """
        Feature 27 – RBAC:
        - Admins see ALL leads.
        - Sales reps see only leads assigned to them.
        """
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'ADMIN':
            return qs
        if user.role == 'SALES':
            return qs.filter(assigned_to=user)
        return qs.none()

    def perform_create(self, serializer):
        """
        Save the lead. If the user is authenticated and is a sales rep,
        assign them. Otherwise leave assigned_to=None so the
        auto_assign_lead signal handles it via load balancing.
        """
        super().perform_create(serializer)

class AppointmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing appointments (Test Drives & Inspections).
    Provides CRUD operations plus utility endpoints for scheduling.
    
    Public access: create (book), available_slots
    Authenticated: list, retrieve, update, delete, status actions
    """
    queryset = Appointment.objects.all().order_by('date', 'time_slot')
    serializer_class = AppointmentSerializer
    pagination_class = None
    
    def get_permissions(self):
        """
        Allow public access to create appointments and check available slots.
        All other actions require authentication.
        """
        if self.action in ['create', 'available_slots']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
    
    def get_queryset(self):
        """
        Optionally filter appointments by various parameters.
        """
        queryset = super().get_queryset()
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by appointment type
        appointment_type = self.request.query_params.get('type')
        if appointment_type:
            queryset = queryset.filter(appointment_type=appointment_type)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # Filter by vehicle
        vehicle_id = self.request.query_params.get('vehicle')
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        
        # Filter upcoming only
        upcoming = self.request.query_params.get('upcoming')
        if upcoming and upcoming.lower() == 'true':
            queryset = queryset.filter(date__gte=timezone.now().date())
        
        return queryset
    
    def perform_create(self, serializer):
        """Create appointment and ALWAYS create a new Lead ticket for CRM tracking."""
        from django.db import transaction

        user = self.request.user if self.request.user.is_authenticated else None

        with transaction.atomic():
            appointment = serializer.save(user=user)
            customer = appointment.customer
            vehicle = appointment.vehicle

            # ALWAYS create a new lead ticket for this specific action
            appointment.lead = Lead.objects.create(
                customer=customer,
                source='WEBSITE',
                lead_type='TEST_DRIVE',
                status='NEW',
                desired_make=vehicle.make if vehicle else '',
                desired_model=vehicle.model if vehicle else '',
                notes=f'Auto-created from {appointment.get_appointment_type_display()} booking on {appointment.date}',
            )
            appointment.save(update_fields=['lead'])
    
    @action(detail=False, methods=['get'])
    def available_slots(self, request):
        """
        Get available time slots for a specific vehicle and date.
        Query params: vehicle (required), date (required)
        Returns list of available time slots.
        """
        vehicle_id = request.query_params.get('vehicle')
        date_str = request.query_params.get('date')
        
        if not vehicle_id or not date_str:
            return Response(
                {'error': 'Both vehicle and date parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all booked slots for this vehicle on this date (excluding cancelled)
        booked_slots = Appointment.objects.filter(
            vehicle_id=vehicle_id,
            date=date
        ).exclude(
            status='CANCELLED'
        ).values_list('time_slot', flat=True)
        
        # Build available slots list
        all_slots = Appointment.TimeSlot.choices
        available_slots = [
            {'value': slot[0], 'label': slot[1], 'available': slot[0] not in booked_slots}
            for slot in all_slots
        ]
        
        return Response({
            'date': date_str,
            'vehicle_id': vehicle_id,
            'slots': available_slots
        })
    
    @action(detail=False, methods=['get'])
    def my_appointments(self, request):
        """
        Get appointments for the currently authenticated user.
        """
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        appointments = self.get_queryset().filter(user=request.user)
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get all appointments for today."""
        today = timezone.now().date()
        appointments = self.get_queryset().filter(date=today)
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming appointments (next 7 days)."""
        today = timezone.now().date()
        week_later = today + timedelta(days=7)
        appointments = self.get_queryset().filter(
            date__gte=today,
            date__lte=week_later
        ).exclude(status='CANCELLED')
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirm a pending appointment and send confirmation email."""
        appointment = self.get_object()
        if appointment.status != 'PENDING':
            return Response(
                {'error': 'Only pending appointments can be confirmed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        appointment.status = 'CONFIRMED'
        appointment.save()

        # Send confirmation email to customer
        vehicle = appointment.vehicle
        vehicle_name = f"{vehicle.year} {vehicle.make} {vehicle.model}" if vehicle else "your vehicle"
        send_html_email(
            subject='Your Test Drive is Confirmed – DQ Motors',
            template_name='emails/test_drive_confirmed.html',
            context={
                'name': appointment.customer.name,
                'vehicle_name': vehicle_name,
                'date': appointment.date.strftime('%B %d, %Y'),
                'time': appointment.get_time_slot_display(),
            },
            recipient_list=[appointment.customer.email],
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an appointment."""
        appointment = self.get_object()
        if appointment.status in ['COMPLETED', 'CANCELLED']:
            return Response(
                {'error': 'Cannot cancel a completed or already cancelled appointment.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        appointment.status = 'CANCELLED'
        appointment.save()
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark an appointment as completed."""
        appointment = self.get_object()
        if appointment.status == 'CANCELLED':
            return Response(
                {'error': 'Cannot complete a cancelled appointment.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        appointment.status = 'COMPLETED'
        appointment.save()
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def no_show(self, request, pk=None):
        """Mark customer as no-show."""
        appointment = self.get_object()
        if appointment.status != 'CONFIRMED':
            return Response(
                {'error': 'Only confirmed appointments can be marked as no-show.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        appointment.status = 'NO_SHOW'
        appointment.save()
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        """
        Check in a customer for their appointment.
        Sets check_in_time to current timestamp.
        Can be triggered by scanning QR code from mobile app or admin panel.
        """
        appointment = self.get_object()
        
        # Validate status
        if appointment.status != 'CONFIRMED':
            return Response(
                {'error': 'Only confirmed appointments can be checked in.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already checked in
        if appointment.check_in_time:
            return Response(
                {'error': 'Customer has already checked in.', 'check_in_time': appointment.check_in_time},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Record check-in time
        appointment.check_in_time = timezone.now()
        appointment.save()
        
        serializer = self.get_serializer(appointment)
        return Response({
            'message': 'Customer checked in successfully!',
            'status': 'In Progress',
            'check_in_time': appointment.check_in_time,
            'appointment': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def check_out(self, request, pk=None):
        """
        Check out a customer after their appointment.
        Sets check_out_time to current timestamp and marks as COMPLETED.
        Calculates total duration.
        """
        appointment = self.get_object()
        
        # Validate status
        if appointment.status != 'CONFIRMED':
            return Response(
                {'error': 'Only confirmed appointments can be checked out.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if checked in first
        if not appointment.check_in_time:
            return Response(
                {'error': 'Customer must check in before checking out.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already checked out
        if appointment.check_out_time:
            return Response(
                {'error': 'Customer has already checked out.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Record check-out time and complete appointment
        appointment.check_out_time = timezone.now()
        appointment.status = 'COMPLETED'
        appointment.save()
        
        serializer = self.get_serializer(appointment)
        return Response({
            'message': 'Customer checked out successfully!',
            'status': 'Completed',
            'check_in_time': appointment.check_in_time,
            'check_out_time': appointment.check_out_time,
            'duration_minutes': appointment.duration_minutes,
            'duration_display': appointment.duration_display,
            'appointment': serializer.data
        })
    
    @action(detail=True, methods=['get'])
    def qr_code(self, request, pk=None):
        """
        Get the QR code image URL for a confirmed appointment.
        """
        appointment = self.get_object()
        
        if not appointment.qr_code:
            return Response(
                {'error': 'QR code not available. Appointment must be confirmed first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        qr_url = request.build_absolute_uri(appointment.qr_code.url)
        return Response({
            'appointment_id': appointment.id,
            'qr_code_url': qr_url,
            'status': appointment.status
        })
        return Response(serializer.data)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by completion status
        is_completed = self.request.query_params.get('is_completed')
        if is_completed is not None:
            queryset = queryset.filter(is_completed=is_completed.lower() == 'true')

        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority.upper())

        # Filter by assigned user
        assigned_to = self.request.query_params.get('assigned_to')
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)

        # Filter by lead
        lead = self.request.query_params.get('lead')
        if lead:
            queryset = queryset.filter(lead_id=lead)

        return queryset

    def perform_create(self, serializer):
        if not serializer.validated_data.get('assigned_to'):
            serializer.save(assigned_to=self.request.user)
        else:
            serializer.save()


class InteractionViewSet(viewsets.ModelViewSet):
    queryset = Interaction.objects.all()
    serializer_class = InteractionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by lead
        lead = self.request.query_params.get('lead')
        if lead:
            queryset = queryset.filter(lead_id=lead)

        # Filter by interaction type
        interaction_type = self.request.query_params.get('interaction_type')
        if interaction_type:
            queryset = queryset.filter(interaction_type=interaction_type.upper())

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DealViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Deal.objects.select_related(
        'lead__customer', 'vehicle', 'sales_rep'
    ).all()
    serializer_class = DealSerializer
    permission_classes = [IsAdminOrSales]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by lead
        lead = self.request.query_params.get('lead')
        if lead:
            queryset = queryset.filter(lead_id=lead)

        # Filter by vehicle
        vehicle = self.request.query_params.get('vehicle')
        if vehicle:
            queryset = queryset.filter(vehicle_id=vehicle)

        # Filter by status
        deal_status = self.request.query_params.get('status')
        if deal_status:
            queryset = queryset.filter(status=deal_status.upper())

        return queryset

    def perform_create(self, serializer):
        serializer.save(sales_rep=self.request.user)
        # Feature 30 – Audit log
        self._log_create(serializer)

    @action(detail=True, methods=['patch'], url_path='sign')
    def sign(self, request, pk=None):
        """
        PATCH /api/crm/deals/<id>/sign/
        Accepts multipart/form-data with:
          • customer_signature  – the signature image file
          • status              – typically 'ACCEPTED'
        Allows updating just the signature + status without resending
        every financial field.
        """
        deal = self.get_object()
        signature_file = request.FILES.get('customer_signature')
        new_status = request.data.get('status', Deal.Status.ACCEPTED)

        if not signature_file:
            return Response(
                {'customer_signature': ['This field is required.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deal.customer_signature = signature_file
        deal.status = new_status
        deal.save(update_fields=['customer_signature', 'status', 'updated_at'])

        serializer = self.get_serializer(deal)
        return Response(serializer.data)


class TradeInViewSet(viewsets.ModelViewSet):
    """
    Trade-In Appraisal viewset.
    Public:  POST   – customer submits a trade-in request (with photos).
    Admin:   PATCH  – update offer_amount, admin_notes, status.
    Admin:   GET    – list / retrieve all submissions.
    """
    queryset = TradeIn.objects.select_related('lead__customer').all()
    serializer_class = TradeInSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ('create', 'estimate'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['post'], url_path='estimate', permission_classes=[permissions.AllowAny])
    def estimate(self, request):
        """
        Public preview endpoint: returns a trade-in estimate WITHOUT creating
        a record. Tries MarketCheck (US market data) first, falls back to a
        local heuristic when MarketCheck fails or returns suspicious values.
        """
        from .valuation import get_valuation

        try:
            result = get_valuation(
                vin=request.data.get('vin', '') or '',
                make=request.data.get('make', ''),
                model=request.data.get('model', ''),
                year=int(request.data.get('year') or 0),
                mileage=int(request.data.get('mileage') or 0),
                condition=request.data.get('condition', 'GOOD'),
                trim=request.data.get('trim', 'Base') or 'Base',
            )
        except (ValueError, TypeError) as exc:
            return Response(
                {'error': str(exc) or 'Invalid input.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            'estimate': str(result['estimate']),
            'low': str(result['low']),
            'high': str(result['high']),
            'currency': result['currency'],
            'method': result['method'],
            'disclaimer': (
                'This is an estimate based on market data, year, mileage, and '
                'condition. The final offer is determined after a physical '
                'inspection by our team and may differ from this range.'
            ),
        })

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by status
        qs_status = self.request.query_params.get('status')
        if qs_status:
            queryset = queryset.filter(status=qs_status.upper())

        # Filter by email
        email = self.request.query_params.get('email')
        if email:
            queryset = queryset.filter(email__iexact=email)

        return queryset

    def perform_create(self, serializer):
        """Create trade-in and ALWAYS create a new Lead ticket for CRM tracking."""
        from django.db import transaction
        from .valuation import get_valuation

        with transaction.atomic():
            trade_in = serializer.save()

            # Compute estimate (MarketCheck → heuristic fallback) so admins
            # see it next to their final offer.
            try:
                est = get_valuation(
                    vin=trade_in.vin,
                    make=trade_in.make,
                    model=trade_in.model,
                    year=trade_in.year,
                    mileage=trade_in.mileage,
                    condition=trade_in.condition,
                )
                trade_in.estimated_value = est['estimate']
                trade_in.estimated_value_low = est['low']
                trade_in.estimated_value_high = est['high']
                trade_in.valuation_method = est['method']
                trade_in.save(update_fields=[
                    'estimated_value', 'estimated_value_low',
                    'estimated_value_high', 'valuation_method',
                ])
            except (ValueError, TypeError):
                pass  # Don't block submission if estimator has bad input.

            email = trade_in.email
            name = trade_in.name
            phone = trade_in.phone

            if email:
                # Get or create a Customer record (represents the person)
                customer, _ = Customer.objects.get_or_create(
                    email=email,
                    defaults={'name': name, 'phone': phone},
                )
                if customer.name != name and name:
                    customer.name = name
                    customer.save(update_fields=['name'])

                # ALWAYS create a new lead ticket for this specific action
                trade_in.lead = Lead.objects.create(
                    customer=customer,
                    source='WEBSITE',
                    lead_type='TRADE_IN',
                    status='NEW',
                    desired_make=trade_in.make,
                    desired_model=trade_in.model,
                    notes=f'Auto-created from trade-in submission for {trade_in.year} {trade_in.make} {trade_in.model}',
                )
                trade_in.save(update_fields=['lead'])

    @action(detail=True, methods=['post'], url_path='send_offer')
    def send_offer(self, request, pk=None):
        """Send an offer email to the customer and update the trade-in status."""
        instance = self.get_object()
        offer_amount = request.data.get('offer_amount')

        if not offer_amount:
            return Response(
                {'error': 'offer_amount is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            offer_amount = round(float(offer_amount), 2)
        except (ValueError, TypeError):
            return Response(
                {'error': 'offer_amount must be a valid number.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        custom_message = request.data.get('custom_message', '').strip()

        # Update the trade-in record
        instance.offer_amount = offer_amount
        instance.status = 'OFFERED'
        if custom_message:
            instance.admin_notes = (
                f"{instance.admin_notes}\n\n--- Message sent to customer ---\n{custom_message}"
            ).strip()
        instance.save()

        # Send branded HTML email
        send_html_email(
            subject='Your Trade-In Offer from DQ Motors is Ready!',
            template_name='emails/trade_in_offer.html',
            context={
                'name': instance.name,
                'year': instance.year,
                'make': instance.make,
                'model': instance.model,
                'offer_amount': f'{offer_amount:,.2f}',
                'custom_message': custom_message,
            },
            recipient_list=[instance.email],
        )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)