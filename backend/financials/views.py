from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import SAFE_METHODS, AllowAny
from django.db import transaction
from django.db.models import Sum, Q, Avg, Max, Count
from django.db.models.functions import TruncMonth, Coalesce
from django.shortcuts import get_object_or_404
from decimal import Decimal
from datetime import date

from core.permissions import IsAdmin
from core.models import DealerConfiguration
from core.mixins import AuditLogMixin
from .models import Expense, Vendor, ExpenseImage
from .serializers import (
    ExpenseSerializer, 
    ExpenseCreateSerializer,
    ExpensePublicSerializer,
    ExpenseImageSerializer,
    ExpenseImageCreateSerializer,
    VendorSerializer,
    VendorListSerializer,
    VendorStatsSerializer,
    VehicleFinancialSummarySerializer,
    VehicleFinancialListSerializer,
    InvoiceExtractionRequestSerializer,
    VehiclePurchaseSerializer
)
from .utils import (
    PURCHASE_TAX_DESCRIPTION,
    build_vehicle_financial_summary,
    extract_invoice_suggestions,
    money,
    profit_basis_price,
    purchase_tax_expense_qs,
)
from inventory.models import Vehicle


class VendorViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for vendors with analytics.
    Restricted to ADMIN users only (Feature 27 – RBAC).
    """
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    
    def get_serializer_class(self):
        if self.action == 'list' and self.request.query_params.get('simple') == 'true':
            return VendorListSerializer
        return VendorSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Search by name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search)
            )
        
        # Filter by service category
        service_category = self.request.query_params.get('service_category')
        if service_category:
            queryset = queryset.filter(service_category=service_category)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by minimum rating
        min_rating = self.request.query_params.get('min_rating')
        if min_rating:
            queryset = queryset.filter(rating__gte=int(min_rating))
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Return available vendor service categories"""
        categories = [
            {'value': choice[0], 'label': choice[1]}
            for choice in Vendor.ServiceCategory.choices
        ]
        return Response(categories)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Return only active vendors for dropdown selections"""
        queryset = self.get_queryset().filter(is_active=True)
        serializer = VendorListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """
        GET /api/financials/vendors/{id}/stats/
        Return detailed analytics for a specific vendor
        """
        vendor = self.get_object()
        
        # Get all expenses for this vendor
        expenses = vendor.expenses.all()
        
        # Calculate aggregates
        aggregates = expenses.aggregate(
            total_spend=Sum('amount'),
            job_count=Count('id'),
            avg_job_cost=Avg('amount'),
            last_job=Max('date')
        )
        
        # Service type breakdown
        service_breakdown = list(
            expenses.values('service_type')
            .annotate(
                count=Count('id'),
                total=Sum('amount')
            )
            .order_by('-total')
        )
        
        # Format the breakdown with display names
        for item in service_breakdown:
            service_type = item['service_type']
            if service_type:
                item['service_type_display'] = dict(Expense.ServiceType.choices).get(
                    service_type, service_type
                )
            else:
                item['service_type_display'] = 'General'
        
        stats_data = {
            'vendor_id': vendor.id,
            'vendor_name': vendor.name,
            'service_category': vendor.service_category,
            'service_category_display': vendor.get_service_category_display(),
            'rating': vendor.rating,
            'total_spend': aggregates['total_spend'] or 0,
            'job_count': aggregates['job_count'] or 0,
            'average_job_cost': aggregates['avg_job_cost'] or 0,
            'last_job_date': aggregates['last_job'],
            'service_breakdown': service_breakdown,
        }
        
        serializer = VendorStatsSerializer(stats_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        """
        GET /api/financials/vendors/leaderboard/
        Return vendors ranked by total spend
        """
        vendors = Vendor.objects.annotate(
            total_spend=Sum('expenses__amount'),
            job_count=Count('expenses')
        ).filter(job_count__gt=0).order_by('-total_spend')[:10]
        
        result = []
        for vendor in vendors:
            result.append({
                'id': vendor.id,
                'name': vendor.name,
                'service_category': vendor.service_category,
                'service_category_display': vendor.get_service_category_display(),
                'rating': vendor.rating,
                'total_spend': vendor.total_spend or 0,
                'job_count': vendor.job_count,
            })
        
        return Response(result)


class ExpenseViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    CRUD operations for expenses with file upload support.
    Restricted to ADMIN users only (Feature 27 – RBAC).
    """
    queryset = Expense.objects.all().select_related('vehicle', 'vendor').prefetch_related('images')
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ExpenseCreateSerializer
        return ExpenseSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Text search across multiple fields
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search) |
                Q(vendor_name__icontains=search) |
                Q(vendor__name__icontains=search) |
                Q(vehicle__make__icontains=search) |
                Q(vehicle__model__icontains=search) |
                Q(vehicle__vin__icontains=search) |
                Q(service_type__icontains=search)
            )
        
        # Filter by vehicle
        vehicle_id = self.request.query_params.get('vehicle')
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by service_type
        service_type = self.request.query_params.get('service_type')
        if service_type:
            queryset = queryset.filter(service_type=service_type)
        
        # Filter by is_public
        is_public = self.request.query_params.get('is_public')
        if is_public is not None:
            queryset = queryset.filter(is_public=is_public.lower() == 'true')
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        # Filter by vendor
        vendor_id = self.request.query_params.get('vendor')
        if vendor_id:
            queryset = queryset.filter(vendor_id=vendor_id)

        # Filter by payment status
        is_paid = self.request.query_params.get('is_paid')
        if is_paid is not None:
            queryset = queryset.filter(is_paid=is_paid.lower() == 'true')
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Return available expense categories"""
        categories = [
            {'value': choice[0], 'label': choice[1]}
            for choice in Expense.Category.choices
        ]
        return Response(categories)
    
    @action(detail=False, methods=['get'])
    def service_types(self, request):
        """Return available service types for repairs"""
        types = [
            {'value': choice[0], 'label': choice[1]}
            for choice in Expense.ServiceType.choices
        ]
        return Response(types)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Return overall expense summary across all vehicles"""
        # Total by category
        by_category = Expense.objects.values('category').annotate(
            total=Sum('amount')
        ).order_by('category')
        
        # Overall total
        total = Expense.objects.aggregate(total=Sum('amount'))['total'] or 0
        
        return Response({
            'total_expenses': total,
            'by_category': {
                item['category']: float(item['total']) 
                for item in by_category
            }
        })


class InvoiceExtractionView(APIView):
    """
    OCR/LLM-assisted invoice parsing. Returns suggestions only.
    Restricted to ADMIN users.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        serializer = InvoiceExtractionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        vehicle = serializer.validated_data['vehicle']
        invoice_file = serializer.validated_data['invoice_file']
        context = serializer.validated_data.get('context', 'purchase')

        suggestions = extract_invoice_suggestions(invoice_file, vehicle, context=context)
        return Response({
            'vehicle_id': vehicle.id,
            'context': context,
            'suggestions': suggestions,
        })


class VehiclePurchaseView(APIView):
    """
    Upsert vehicle purchase price and optional purchase tax.
    Restricted to ADMIN users.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    @transaction.atomic
    def post(self, request, vehicle_id):
        vehicle = get_object_or_404(Vehicle, id=vehicle_id)
        serializer = VehiclePurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        purchase_expense = (
            Expense.objects
            .select_for_update()
            .filter(vehicle=vehicle, category=Expense.Category.PURCHASE_PRICE)
            .order_by('-created_at')
            .first()
        )

        if purchase_expense is None:
            purchase_expense = Expense(vehicle=vehicle, category=Expense.Category.PURCHASE_PRICE)

        purchase_expense.amount = money(data['amount'])
        purchase_expense.description = 'Vehicle purchase price'
        if 'vendor' in data:
            purchase_expense.vendor = data.get('vendor')
        purchase_expense.vendor_name = data.get('vendor_name', '')
        if data.get('invoice_file'):
            purchase_expense.invoice_file = data['invoice_file']
        purchase_expense.save()

        if data.get('apply_tax'):
            config = DealerConfiguration.get_config()
            tax_rate = money(data.get('tax_rate', config.default_purchase_tax_rate))
            tax_amount = data.get('tax_amount')
            if tax_amount in (None, ''):
                tax_amount = money(data['amount'] * tax_rate / Decimal('100'))
            else:
                tax_amount = money(tax_amount)

            tax_expense = (
                purchase_tax_expense_qs(vehicle)
                .select_for_update()
                .order_by('-created_at')
                .first()
            )
            if tax_expense is None:
                tax_expense = Expense(vehicle=vehicle, category=Expense.Category.TAX)

            tax_expense.amount = tax_amount
            tax_expense.vendor_name = 'Tax & Registration'
            tax_expense.description = f'{PURCHASE_TAX_DESCRIPTION} ({tax_rate}% of purchase price)'
            tax_expense.save()

        return Response(build_vehicle_financial_summary(vehicle, request=request), status=status.HTTP_200_OK)


class VehicleFinancialView(APIView):
    """
    Get detailed financial summary for a specific vehicle.
    Restricted to ADMIN users only (Feature 27 – RBAC).
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    
    def get(self, request, vehicle_id):
        vehicle = get_object_or_404(Vehicle, id=vehicle_id)
        return Response(build_vehicle_financial_summary(vehicle, request=request))


class VehicleFinancialListView(APIView):
    """
    List all vehicles with their financial summary.
    Restricted to ADMIN users only (Feature 27 – RBAC).
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    
    def get(self, request):
        vehicles = Vehicle.objects.all().prefetch_related('expenses')
        
        # Build response with financial data
        data = []
        for vehicle in vehicles:
            total_cost = vehicle.total_cost or 0
            profit_margin = vehicle.profit_margin or 0
            basis_price = profit_basis_price(vehicle)
            profit_percentage = (float(profit_margin) / float(basis_price) * 100) if basis_price else 0
            
            data.append({
                'id': vehicle.id,
                'vin': vehicle.vin,
                'title': f"{vehicle.year} {vehicle.make} {vehicle.model}",
                'year': vehicle.year,
                'make': vehicle.make,
                'model': vehicle.model,
                'status': vehicle.status,
                'listing_price': float(vehicle.price),
                'sold_price': float(vehicle.sold_price) if vehicle.sold_price else None,
                'selling_price': float(basis_price),
                'profit_basis_price': float(basis_price),
                'total_cost': float(total_cost),
                'profit_margin': float(profit_margin),
                'profit_percentage': round(profit_percentage, 2),
                'expense_count': vehicle.expenses.count()
            })
        
        # Sort by profit margin (descending)
        sort_by = request.query_params.get('sort', '-profit_margin')
        reverse = sort_by.startswith('-')
        sort_key = sort_by.lstrip('-')
        
        if sort_key in ['profit_margin', 'total_cost', 'selling_price']:
            data.sort(key=lambda x: x.get(sort_key, 0), reverse=reverse)
        
        return Response(data)


class ExpenseImageViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for expense images (before/after photos).
    Restricted to ADMIN users only (Feature 27 – RBAC).
    """
    queryset = ExpenseImage.objects.all().select_related('expense')
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    pagination_class = None
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ExpenseImageCreateSerializer
        return ExpenseImageSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by expense
        expense_id = self.request.query_params.get('expense')
        if expense_id:
            queryset = queryset.filter(expense_id=expense_id)
        
        # Filter by caption type
        caption = self.request.query_params.get('caption')
        if caption:
            queryset = queryset.filter(caption=caption)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def caption_types(self, request):
        """Return available caption types"""
        types = [
            {'value': choice[0], 'label': choice[1]}
            for choice in ExpenseImage.CaptionType.choices
        ]
        return Response(types)


class VehicleServiceHistoryView(APIView):
    """
    Public endpoint to get service history for a vehicle.
    Only returns expenses where is_public=True and category is REPAIR, INSPECTION, or DETAIL.
    
    Endpoint: /api/financials/vehicle/{id}/service-history/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, vehicle_id):
        vehicle = get_object_or_404(Vehicle, id=vehicle_id)
        
        # Get public repair/maintenance expenses
        public_categories = ['REPAIR', 'INSPECTION', 'DETAIL']
        expenses = Expense.objects.filter(
            vehicle=vehicle,
            is_public=True,
            category__in=public_categories
        ).select_related('vendor').prefetch_related('images').order_by('-date')
        
        # Serialize with public serializer (limited fields, no costs)
        serializer = ExpensePublicSerializer(expenses, many=True)
        
        return Response({
            'vehicle_id': vehicle.id,
            'vehicle_title': f"{vehicle.year} {vehicle.make} {vehicle.model}",
            'service_records': serializer.data,
            'count': expenses.count()
        })


# ═══════════════════════════════════════════════════════════════════
# Analytics / Financial Dashboard
# ═══════════════════════════════════════════════════════════════════

class AnalyticsViewSet(viewsets.ViewSet):
    """
    Aggregated financial analytics for the dealership dashboard.
    Restricted to ADMIN users only (Feature 27 – RBAC).

    Endpoints
    ---------
    GET /stats/summary/              → KPI cards (Revenue, COGS, Overhead, Profit, Margin)
    GET /stats/chart-data/           → Monthly bar/line chart data
    GET /stats/expenses-by-category/ → Pie chart data
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    # ── helpers ────────────────────────────────────────────────────
    def _date_range(self, request):
        """Return (start_date, end_date) from query params or YTD default."""
        today = date.today()
        start = request.query_params.get('start_date', f'{today.year}-01-01')
        end = request.query_params.get('end_date', today.isoformat())
        return start, end

    # ── 1. Summary KPIs ──────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """
        GET /api/financials/stats/summary/?start_date=&end_date=
        """
        start, end = self._date_range(request)

        # Revenue –– selling price of dealership vehicles sold in period
        sold_qs = Vehicle.objects.filter(
            status=Vehicle.Status.SOLD,
            sold_date__gte=start,
            sold_date__lte=end,
            seller__isnull=True,   # dealership stock only
        )
        revenue = sold_qs.aggregate(
            total=Sum(Coalesce('sold_price', 'price'))
        )['total'] or Decimal('0.00')

        vehicles_sold = sold_qs.count()

        # COGS –– ALL expenses attached to those sold vehicles
        sold_ids = sold_qs.values_list('id', flat=True)
        cogs = Expense.objects.filter(
            vehicle_id__in=sold_ids,
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # Overhead –– expenses NOT linked to any vehicle, within date range
        overhead = Expense.objects.filter(
            vehicle__isnull=True,
            date__gte=start,
            date__lte=end,
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # Derived KPIs
        gross_profit = revenue - cogs
        net_profit = gross_profit - overhead
        margin = (net_profit / revenue * 100) if revenue else Decimal('0.00')

        # Average deal size
        avg_deal = (revenue / vehicles_sold) if vehicles_sold else Decimal('0.00')

        return Response({
            'start_date': start,
            'end_date': end,
            'revenue': float(revenue),
            'cogs': float(cogs),
            'gross_profit': float(gross_profit),
            'overhead': float(overhead),
            'net_profit': float(net_profit),
            'margin_pct': round(float(margin), 2),
            'vehicles_sold': vehicles_sold,
            'avg_deal_size': round(float(avg_deal), 2),
        })

    # ── 2. Monthly Chart Data ────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='chart-data')
    def chart_data(self, request):
        """
        GET /api/financials/stats/chart-data/?start_date=&end_date=
        Returns [{month, revenue, expense, profit}, …] sorted chronologically.
        """
        start, end = self._date_range(request)

        # Revenue by month (sold_date)
        rev_months = (
            Vehicle.objects.filter(
                status=Vehicle.Status.SOLD,
                sold_date__gte=start,
                sold_date__lte=end,
                seller__isnull=True,
            )
            .annotate(month=TruncMonth('sold_date'))
            .values('month')
            .annotate(revenue=Sum(Coalesce('sold_price', 'price')))
            .order_by('month')
        )

        # Expenses by month (date) – includes both vehicle & overhead
        exp_months = (
            Expense.objects.filter(
                date__gte=start,
                date__lte=end,
            )
            .annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(expense=Sum('amount'))
            .order_by('month')
        )

        # Merge into dict keyed by date
        merged = {}
        for r in rev_months:
            m = r['month']
            merged.setdefault(m, {'revenue': 0, 'expense': 0})
            merged[m]['revenue'] = float(r['revenue'])

        for e in exp_months:
            m = e['month']
            merged.setdefault(m, {'revenue': 0, 'expense': 0})
            merged[m]['expense'] = float(e['expense'])

        # Sort by date and format
        result = []
        for m in sorted(merged):
            d = merged[m]
            result.append({
                'month': m.strftime('%b %Y'),
                'revenue': d['revenue'],
                'expense': d['expense'],
                'profit': round(d['revenue'] - d['expense'], 2),
            })

        return Response(result)

    # ── 3. Expenses by Category (Pie Chart) ──────────────────────
    @action(detail=False, methods=['get'], url_path='expenses-by-category')
    def expenses_by_category(self, request):
        """
        GET /api/financials/stats/expenses-by-category/?start_date=&end_date=
        Returns [{category, label, total, count}, …] sorted by total desc.
        """
        start, end = self._date_range(request)

        breakdown = (
            Expense.objects.filter(
                date__gte=start,
                date__lte=end,
            )
            .values('category')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('-total')
        )

        result = []
        cat_labels = dict(Expense.Category.choices)
        for item in breakdown:
            result.append({
                'category': item['category'],
                'label': cat_labels.get(item['category'], item['category']),
                'total': float(item['total']),
                'count': item['count'],
            })

        return Response(result)

    # ── 4. Top Profitable Vehicles ───────────────────────────────
    @action(detail=False, methods=['get'], url_path='top-vehicles')
    def top_vehicles(self, request):
        """
        GET /api/financials/stats/top-vehicles/?start_date=&end_date=&limit=5
        Returns the most profitable sold vehicles within the date range.
        """
        start, end = self._date_range(request)
        limit = int(request.query_params.get('limit', 5))

        sold = Vehicle.objects.filter(
            status=Vehicle.Status.SOLD,
            sold_date__gte=start,
            sold_date__lte=end,
            seller__isnull=True,
        ).prefetch_related('expenses')

        vehicles = []
        for v in sold:
            cost = v.expenses.aggregate(t=Sum('amount'))['t'] or Decimal('0.00')
            basis_price = profit_basis_price(v)
            profit = float(basis_price) - float(cost)
            margin = (profit / float(basis_price) * 100) if basis_price else 0
            vehicles.append({
                'id': v.id,
                'title': f"{v.year} {v.make} {v.model}",
                'sold_price': float(basis_price),
                'total_cost': float(cost),
                'profit': round(profit, 2),
                'margin_pct': round(margin, 2),
                'sold_date': v.sold_date.isoformat() if v.sold_date else None,
            })

        vehicles.sort(key=lambda x: x['profit'], reverse=True)
        return Response(vehicles[:limit])


# ═══════════════════════════════════════════════════════════════
# Dealership Performance Analytics  (Feature 28)
# ═══════════════════════════════════════════════════════════════

class PerformanceAnalyticsViewSet(viewsets.ViewSet):
    """
    Operational performance metrics (distinct from financial analytics).

    Endpoints
    ---------
    GET /performance/kpi/          → Total Sales, Lead Conversion %, Avg Days to Sell
    GET /performance/funnel/       → Leads → Test Drives → Offers → Sales funnel
    GET /performance/top-models/   → Top 5 sold makes/models
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    # ── helpers ────────────────────────────────────────────────
    def _date_range(self, request):
        """Return (start, end) date strings from query-params or YTD default."""
        today = date.today()
        start = request.query_params.get('start_date', f'{today.year}-01-01')
        end = request.query_params.get('end_date', today.isoformat())
        return start, end

    # ── 1. KPI Cards ───────────────────────────────────────────
    @action(detail=False, methods=['get'])
    def kpi(self, request):
        from crm.models import Lead

        start, end = self._date_range(request)

        # Total vehicles sold in range
        sold_qs = Vehicle.objects.filter(status='SOLD', sold_date__gte=start, sold_date__lte=end)
        total_sales = sold_qs.count()

        # Lead conversion rate
        total_leads = Lead.objects.filter(created_at__date__gte=start, created_at__date__lte=end).count()
        won_leads = Lead.objects.filter(
            created_at__date__gte=start,
            created_at__date__lte=end,
            status='CLOSED',
        ).count()
        conversion_rate = round((won_leads / total_leads * 100), 1) if total_leads else 0

        # Average days to sell (compute in Python to avoid DateField/DateTimeField mismatch)
        sold_vehicles = Vehicle.objects.filter(
            status='SOLD',
            sold_date__isnull=False,
            sold_date__gte=start,
            sold_date__lte=end,
        )
        days_list = [
            (v.sold_date - v.created_at.date()).days
            for v in sold_vehicles
            if v.sold_date and v.created_at
        ]
        avg_days_to_sell = round(sum(days_list) / len(days_list), 1) if days_list else 0

        return Response({
            'total_sales': total_sales,
            'total_leads': total_leads,
            'won_leads': won_leads,
            'conversion_rate': conversion_rate,
            'avg_days_to_sell': avg_days_to_sell,
        })

    # ── 2. Sales Funnel ────────────────────────────────────────
    @action(detail=False, methods=['get'])
    def funnel(self, request):
        from crm.models import Lead, Appointment, Deal

        start, end = self._date_range(request)

        total_leads = Lead.objects.filter(
            created_at__date__gte=start, created_at__date__lte=end,
        ).count()

        test_drives = Appointment.objects.filter(
            date__gte=start, date__lte=end,
        ).count()

        offers_sent = Deal.objects.filter(
            created_at__date__gte=start, created_at__date__lte=end,
        ).count()

        sales = Vehicle.objects.filter(
            status='SOLD', sold_date__gte=start, sold_date__lte=end,
        ).count()

        return Response({
            'funnel': [
                {'stage': 'Total Leads',   'count': total_leads},
                {'stage': 'Test Drives',   'count': test_drives},
                {'stage': 'Offers Sent',   'count': offers_sent},
                {'stage': 'Sales',         'count': sales},
            ],
        })

    # ── 3. Top-Selling Models ───────────────────────────────────
    @action(detail=False, methods=['get'], url_path='top-models')
    def top_models(self, request):
        start, end = self._date_range(request)

        top = (
            Vehicle.objects
            .filter(status='SOLD', sold_date__gte=start, sold_date__lte=end)
            .values('make', 'model')
            .annotate(sold_count=Count('id'))
            .order_by('-sold_count')[:5]
        )

        return Response({
            'top_models': [
                {
                    'make': item['make'],
                    'model': item['model'],
                    'label': f"{item['make']} {item['model']}",
                    'sold_count': item['sold_count'],
                }
                for item in top
            ],
        })

    # ── 4. Sales Rep Leaderboard ───────────────────────────────
    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        from crm.models import Lead, Deal
        from core.models import User

        start, end = self._date_range(request)

        reps = User.objects.filter(role='SALES', is_active=True)
        result = []

        for rep in reps:
            leads_assigned = Lead.objects.filter(
                assigned_to=rep,
                created_at__date__gte=start,
                created_at__date__lte=end,
            ).count()

            deals_closed = Deal.objects.filter(
                sales_rep=rep,
                status='ACCEPTED',
                created_at__date__gte=start,
                created_at__date__lte=end,
            ).count()

            win_rate = round((deals_closed / leads_assigned * 100), 1) if leads_assigned else 0

            result.append({
                'id': rep.id,
                'name': f"{rep.first_name} {rep.last_name}".strip() or rep.username,
                'leads_assigned': leads_assigned,
                'deals_closed': deals_closed,
                'win_rate': win_rate,
            })

        # Sort by deals closed descending
        result.sort(key=lambda x: x['deals_closed'], reverse=True)
        return Response({'leaderboard': result})
