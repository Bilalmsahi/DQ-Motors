import json
import logging
import mimetypes
import os
import re
import tempfile
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.conf import settings
from django.db.models import Q, Sum

from core.models import DealerConfiguration
from .models import Expense
from .serializers import ExpenseSerializer

logger = logging.getLogger(__name__)

PURCHASE_TAX_DESCRIPTION = 'Purchase tax'
SUPPORTED_INVOICE_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
SUPPORTED_CONTEXTS = {'purchase', 'repair', 'transport', 'inspection', 'other'}


def money(value):
    try:
        return Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    except (InvalidOperation, TypeError, ValueError):
        return Decimal('0.00')


def profit_basis_price(vehicle):
    return vehicle.sold_price or vehicle.price or Decimal('0.00')


def purchase_tax_expense_qs(vehicle):
    return Expense.objects.filter(
        vehicle=vehicle,
        category=Expense.Category.TAX,
    ).filter(
        Q(description__icontains=PURCHASE_TAX_DESCRIPTION) |
        Q(description__icontains='tax on purchase price') |
        Q(vendor_name__iexact='Tax & Registration')
    )


def build_vehicle_financial_summary(vehicle, request=None):
    expenses = (
        Expense.objects
        .filter(vehicle=vehicle)
        .select_related('vendor')
        .prefetch_related('images')
    )

    breakdown_qs = expenses.values('category').annotate(total=Sum('amount')).order_by('category')
    category_labels = dict(Expense.Category.choices)
    cost_breakdown = {}
    for item in breakdown_qs:
        amount = money(item['total'])
        cost_breakdown[item['category']] = {
            'label': category_labels.get(item['category'], item['category']),
            'amount': amount,
        }

    total_cost = money(expenses.aggregate(total=Sum('amount'))['total'])
    purchase_price = money(
        expenses
        .filter(category=Expense.Category.PURCHASE_PRICE)
        .aggregate(total=Sum('amount'))['total']
    )
    tax_amount = money(
        expenses
        .filter(category=Expense.Category.TAX)
        .aggregate(total=Sum('amount'))['total']
    )
    additional_costs_total = total_cost - purchase_price - tax_amount
    if additional_costs_total < 0:
        additional_costs_total = Decimal('0.00')

    basis_price = money(profit_basis_price(vehicle))
    profit_margin = basis_price - total_cost
    profit_percentage = (profit_margin / basis_price * Decimal('100')) if basis_price else Decimal('0.00')

    serializer_context = {'request': request} if request else {}
    expense_serializer = ExpenseSerializer(expenses, many=True, context=serializer_context)

    return {
        'vehicle_id': vehicle.id,
        'vehicle_title': f'{vehicle.year} {vehicle.make} {vehicle.model}',
        'vehicle_vin': vehicle.vin,
        'listing_price': money(vehicle.price),
        'sold_price': money(vehicle.sold_price) if vehicle.sold_price else None,
        'selling_price': basis_price,
        'profit_basis_price': basis_price,
        'profit_basis_label': 'Sold Price' if vehicle.sold_price else 'Listing Price',
        'cost_breakdown': cost_breakdown,
        'purchase_price': purchase_price,
        'tax_amount': tax_amount,
        'additional_costs_total': additional_costs_total,
        'total_cost': total_cost,
        'total_cost_of_ownership': total_cost,
        'profit_margin': profit_margin,
        'profit_percentage': money(profit_percentage),
        'expenses': expense_serializer.data,
        'expense_count': expenses.count(),
    }


def empty_invoice_suggestions(warnings=None):
    return {
        'vendor_name': None,
        'invoice_date': None,
        'purchase_price': None,
        'tax_amount': None,
        'total_amount': None,
        'line_items': [],
        'confidence': 0,
        'warnings': warnings or [],
    }


def _extract_json_object(raw_text):
    if not raw_text:
        raise ValueError('Empty invoice extraction response')

    cleaned = raw_text.strip()
    cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
    cleaned = re.sub(r'\s*```$', '', cleaned)

    if cleaned.startswith('{') and cleaned.endswith('}'):
        return json.loads(cleaned)

    match = re.search(r'\{[\s\S]*\}', cleaned)
    if not match:
        raise ValueError('No JSON object found in invoice extraction response')
    return json.loads(match.group(0))


def _normalize_invoice_suggestions(data):
    suggestions = empty_invoice_suggestions()

    for key in ('vendor_name', 'invoice_date'):
        value = data.get(key)
        suggestions[key] = str(value).strip() if value not in (None, '') else None

    for key in ('purchase_price', 'tax_amount', 'total_amount'):
        value = data.get(key)
        suggestions[key] = float(money(value)) if value not in (None, '') else None

    line_items = data.get('line_items') or []
    normalized_items = []
    if isinstance(line_items, list):
        for item in line_items[:20]:
            if not isinstance(item, dict):
                continue
            amount = item.get('amount')
            normalized_items.append({
                'description': str(item.get('description') or '').strip(),
                'category': str(item.get('category') or '').strip().upper() or 'OTHER',
                'amount': float(money(amount)) if amount not in (None, '') else None,
            })
    suggestions['line_items'] = normalized_items

    try:
        confidence = float(data.get('confidence', 0))
    except (TypeError, ValueError):
        confidence = 0
    suggestions['confidence'] = max(0, min(confidence, 1))

    warnings = data.get('warnings') or []
    if isinstance(warnings, str):
        warnings = [warnings]
    suggestions['warnings'] = [str(w).strip() for w in warnings if str(w).strip()]
    return suggestions


def extract_invoice_suggestions(invoice_file, vehicle, context='purchase'):
    ext = os.path.splitext(invoice_file.name or '')[1].lower()
    if ext not in SUPPORTED_INVOICE_EXTENSIONS:
        return empty_invoice_suggestions([f'Unsupported invoice file type: {ext or "unknown"}'])

    config = DealerConfiguration.get_config()
    if not config.enable_invoice_ocr:
        return empty_invoice_suggestions(['Invoice OCR is disabled in dealer configuration.'])

    api_key = getattr(settings, 'GOOGLE_API_KEY', None) or os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        return empty_invoice_suggestions(['GOOGLE_API_KEY is not configured; enter invoice values manually.'])

    context = context if context in SUPPORTED_CONTEXTS else 'other'
    suffix = ext or '.pdf'
    temp_path = None
    uploaded_file = None

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            temp_path = tmp.name
            for chunk in invoice_file.chunks():
                tmp.write(chunk)

        mime_type = mimetypes.guess_type(invoice_file.name)[0] or 'application/octet-stream'
        uploaded_file = genai.upload_file(temp_path, mime_type=mime_type)
        model = genai.GenerativeModel('gemini-2.0-flash')

        prompt = (
            'Extract structured cost data from this vehicle invoice. '
            'Return valid JSON only, with no markdown fences. '
            'Use null when a value is not visible. Amounts must be numbers without currency symbols. '
            'Categories for line_items must be one of PURCHASE_PRICE, TAX, REPAIR, TRANSPORT, INSPECTION, DETAIL, OTHER.\n\n'
            f'Context: {context}\n'
            f'Vehicle: {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim or ""}\n'
            f'VIN: {vehicle.vin}\n\n'
            'JSON shape:\n'
            '{'
            '"vendor_name": string|null, '
            '"invoice_date": "YYYY-MM-DD"|null, '
            '"purchase_price": number|null, '
            '"tax_amount": number|null, '
            '"total_amount": number|null, '
            '"line_items": [{"description": string, "category": string, "amount": number|null}], '
            '"confidence": number, '
            '"warnings": [string]'
            '}'
        )

        response = model.generate_content([prompt, uploaded_file])
        data = _extract_json_object(getattr(response, 'text', ''))
        suggestions = _normalize_invoice_suggestions(data)
        if not suggestions['warnings']:
            suggestions['warnings'] = ['Review OCR suggestions before saving.']
        return suggestions
    except Exception as exc:
        logger.warning('Invoice OCR failed for vehicle %s: %s', vehicle.id, exc)
        return empty_invoice_suggestions(['Invoice OCR failed; enter invoice values manually.'])
    finally:
        if uploaded_file is not None:
            try:
                import google.generativeai as genai
                genai.delete_file(uploaded_file.name)
            except Exception:
                pass
        if temp_path:
            try:
                os.unlink(temp_path)
            except OSError:
                pass
