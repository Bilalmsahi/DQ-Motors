"""
Management command to verify AWS S3 connectivity.

Usage:
    python manage.py test_s3

Uploads a tiny test file, prints the public URL, then deletes it.
"""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage


class Command(BaseCommand):
    help = 'Upload a test file to S3 and print its public URL to verify configuration.'

    def handle(self, *args, **options):
        # Quick sanity check — Django 5.1+ uses STORAGES dict
        storages_cfg = getattr(settings, 'STORAGES', {})
        backend = storages_cfg.get('default', {}).get('BACKEND', '')
        self.stdout.write(f'Storage backend: {backend}')

        if 's3boto3' not in backend.lower():
            raise CommandError(
                'S3 is not configured as the storage backend.\n'
                'Make sure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and '
                'AWS_STORAGE_BUCKET_NAME are set in your .env file.'
            )

        self.stdout.write(f'Bucket:  {settings.AWS_STORAGE_BUCKET_NAME}')
        self.stdout.write(f'Region:  {settings.AWS_S3_REGION_NAME}')

        # Upload
        test_content = ContentFile(b'S3 connectivity test from Django. Safe to delete.')
        filename = 'test_uploads/s3_test.txt'

        self.stdout.write(f'\nUploading "{filename}" ...')
        saved_name = default_storage.save(filename, test_content)

        url = default_storage.url(saved_name)
        self.stdout.write(self.style.SUCCESS(f'\n✅  Upload successful!'))
        self.stdout.write(f'   File: {saved_name}')
        self.stdout.write(f'   URL:  {url}')

        # Cleanup
        self.stdout.write(f'\nDeleting test file ...')
        default_storage.delete(saved_name)
        self.stdout.write(self.style.SUCCESS('✅  Test file deleted.'))
        self.stdout.write(self.style.SUCCESS('\nS3 is working correctly!'))
