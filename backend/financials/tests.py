import os
import shutil
import tempfile
from datetime import date
from unittest.mock import Mock, patch

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.models import DealerConfiguration, User
from inventory.models import Vehicle
from .models import Expense
from .utils import extract_invoice_suggestions


class VehiclePurchaseCostingTests(TestCase):
    def setUp(self):
        self.media_root = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media_root)
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.addCleanup(lambda: shutil.rmtree(self.media_root, ignore_errors=True))

        cache.clear()
        DealerConfiguration.objects.update_or_create(
            pk=1,
            defaults={
                'default_purchase_tax_rate': '5.00',
                'enable_invoice_ocr': True,
            },
        )

        self.admin = User.objects.create_user(
            username='admin',
            password='pass',
            role='ADMIN',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def vehicle(self, **overrides):
        data = {
            'vin': '1HGCM82633A004352',
            'make': 'Honda',
            'model': 'Accord',
            'year': 2021,
            'trim': 'Sport Touring',
            'price': '18000.00',
            'mileage': 42000,
            'status': Vehicle.Status.ACQUIRED,
        }
        data.update(overrides)
        return Vehicle.objects.create(**data)

    def upload(self, name='invoice.pdf', content=b'%PDF-1.4 invoice'):
        return SimpleUploadedFile(name, content, content_type='application/pdf')

    def test_purchase_endpoint_upserts_purchase_and_tax(self):
        vehicle = self.vehicle()

        response = self.client.post(
            f'/api/financials/vehicle/{vehicle.id}/purchase/',
            {
                'amount': '10000.00',
                'tax_rate': '5.00',
                'apply_tax': 'true',
                'invoice_file': self.upload(),
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Expense.objects.filter(vehicle=vehicle).count(), 2)
        self.assertEqual(
            Expense.objects.get(vehicle=vehicle, category=Expense.Category.PURCHASE_PRICE).amount,
            10000,
        )
        self.assertEqual(
            Expense.objects.get(vehicle=vehicle, category=Expense.Category.TAX).amount,
            500,
        )
        self.assertEqual(float(response.data['total_cost_of_ownership']), 10500.0)
        self.assertEqual(float(response.data['profit_margin']), 7500.0)

    def test_purchase_update_preserves_existing_invoice_when_not_replaced(self):
        vehicle = self.vehicle()
        first = self.client.post(
            f'/api/financials/vehicle/{vehicle.id}/purchase/',
            {
                'amount': '10000.00',
                'apply_tax': 'false',
                'invoice_file': self.upload('first.pdf', b'first'),
            },
            format='multipart',
        )
        self.assertEqual(first.status_code, 200)
        purchase = Expense.objects.get(vehicle=vehicle, category=Expense.Category.PURCHASE_PRICE)
        original_file = purchase.invoice_file.name

        second = self.client.post(
            f'/api/financials/vehicle/{vehicle.id}/purchase/',
            {'amount': '11000.00', 'apply_tax': 'false'},
            format='multipart',
        )

        self.assertEqual(second.status_code, 200)
        purchase.refresh_from_db()
        self.assertEqual(purchase.amount, 11000)
        self.assertEqual(purchase.invoice_file.name, original_file)

    def test_summary_uses_sold_price_before_listing_price(self):
        vehicle = self.vehicle(
            status=Vehicle.Status.SOLD,
            sold_date=date.today(),
            price='18000.00',
            sold_price='14000.00',
        )
        Expense.objects.create(vehicle=vehicle, category=Expense.Category.PURCHASE_PRICE, amount='10000.00')

        response = self.client.get(f'/api/financials/vehicle/{vehicle.id}/summary/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(float(response.data['profit_basis_price']), 14000.0)
        self.assertEqual(float(response.data['profit_margin']), 4000.0)

    def test_inventory_search_matches_trim_and_title_terms(self):
        target = self.vehicle(trim='Limited Reserve', vin='1HGCM82633A004352')
        self.vehicle(
            vin='2HGCM82633A004353',
            make='Toyota',
            model='Corolla',
            trim='Base',
        )

        trim_response = self.client.get('/api/inventory/vehicles/?search=reserve')
        title_response = self.client.get('/api/inventory/vehicles/?search=2021 honda accord')

        trim_ids = [row['id'] for row in trim_response.data['results']]
        title_ids = [row['id'] for row in title_response.data['results']]
        self.assertIn(target.id, trim_ids)
        self.assertIn(target.id, title_ids)

    @patch('financials.views.extract_invoice_suggestions')
    def test_invoice_extraction_returns_suggestions_without_saving_expenses(self, mocked_extract):
        vehicle = self.vehicle()
        mocked_extract.return_value = {
            'vendor_name': 'Auction House',
            'invoice_date': '2026-05-01',
            'purchase_price': 10000.0,
            'tax_amount': 500.0,
            'total_amount': 10500.0,
            'line_items': [],
            'confidence': 0.91,
            'warnings': ['Review OCR suggestions before saving.'],
        }

        response = self.client.post(
            '/api/financials/invoices/extract/',
            {
                'vehicle': vehicle.id,
                'context': 'purchase',
                'invoice_file': self.upload(),
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['suggestions']['purchase_price'], 10000.0)
        self.assertFalse(Expense.objects.filter(vehicle=vehicle).exists())

    def test_invoice_extraction_rejects_unsupported_file_type(self):
        vehicle = self.vehicle()
        response = self.client.post(
            '/api/financials/invoices/extract/',
            {
                'vehicle': vehicle.id,
                'context': 'purchase',
                'invoice_file': SimpleUploadedFile('invoice.txt', b'text', content_type='text/plain'),
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 400)

    @patch.dict(os.environ, {}, clear=True)
    @override_settings(GOOGLE_API_KEY=None)
    def test_invoice_extraction_without_api_key_falls_back_to_manual_entry(self):
        vehicle = self.vehicle()

        result = extract_invoice_suggestions(self.upload(), vehicle)

        self.assertEqual(result['confidence'], 0)
        self.assertIn('GOOGLE_API_KEY is not configured', result['warnings'][0])

    @override_settings(GOOGLE_API_KEY='test-key')
    @patch('google.generativeai.delete_file')
    @patch('google.generativeai.GenerativeModel')
    @patch('google.generativeai.upload_file')
    @patch('google.generativeai.configure')
    def test_malformed_ocr_response_falls_back_to_manual_entry(
        self,
        mocked_configure,
        mocked_upload,
        mocked_model,
        mocked_delete,
    ):
        vehicle = self.vehicle()
        mocked_upload.return_value = Mock(name='uploaded_invoice')
        mocked_upload.return_value.name = 'files/test'
        mocked_model.return_value.generate_content.return_value = Mock(text='not json')

        result = extract_invoice_suggestions(self.upload(), vehicle)

        self.assertEqual(result['confidence'], 0)
        self.assertIn('Invoice OCR failed', result['warnings'][0])

    def test_analytics_summary_uses_sold_price_for_revenue(self):
        vehicle = self.vehicle(
            status=Vehicle.Status.SOLD,
            sold_date=date.today(),
            price='18000.00',
            sold_price='12000.00',
        )
        Expense.objects.create(vehicle=vehicle, category=Expense.Category.PURCHASE_PRICE, amount='9000.00')

        response = self.client.get(
            f'/api/financials/stats/summary/?start_date={date.today().isoformat()}&end_date={date.today().isoformat()}'
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['revenue'], 12000.0)
        self.assertEqual(response.data['cogs'], 9000.0)
        self.assertEqual(response.data['gross_profit'], 3000.0)
