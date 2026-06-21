from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from django.contrib.sitemaps.views import index as sitemap_index, sitemap
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from core.views import register_user, user_profile, google_login, generate_shared_link, serve_shared_document
from core.sitemaps import StaticViewSitemap
from inventory.sitemaps import VehicleSitemap
from blog.sitemaps import BlogSitemap

sitemaps = {
    'static': StaticViewSitemap,
    'vehicles': VehicleSitemap,
    'blog': BlogSitemap,
}


def robots_txt(request):
    site_url = getattr(settings, 'SITE_URL', 'https://dqmotors.ca').rstrip('/')
    lines = [
        'User-agent: *',
        'Disallow: /admin/',
        'Disallow: /api/',
        '',
        f'Sitemap: {site_url}/sitemap.xml',
    ]
    return HttpResponse('\n'.join(lines), content_type='text/plain; charset=utf-8')

urlpatterns = [
    path('superuser/', admin.site.urls),
    
    # JWT Auth Endpoints (legacy - keep for backward compatibility)
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'), # Login
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'), # Refresh Token
    path('api/auth/register/', register_user, name='register'),  # User Registration
    path('api/auth/profile/', user_profile, name='profile'),  # User Profile
    
    # Google OAuth Login (ID Token verification)
    path('api/auth/google/', google_login, name='google_login'),
    
    # DJ-Rest-Auth endpoints (optional - provides additional auth endpoints)
    # path('api/auth/', include('dj_rest_auth.urls')),
    # path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    
    # App Endpoints
    path('api/config/', include('core.urls')),  # Dealer Configuration
    path('api/inventory/', include('inventory.urls')),
    path('api/crm/', include('crm.urls')),
    path('api/financials/', include('financials.urls')),
    path('api/loans/', include('loans.urls')),
    path('api/marketing/', include('marketing.urls')),
    path('api/blog/', include('blog.urls')),
    path('api/social/', include('social.urls')),

    # Secure Document Sharing
    path('api/documents/generate-link/', generate_shared_link, name='generate-shared-link'),
    path('api/documents/view/<uuid:token>/', serve_shared_document, name='serve-shared-document'),

    # SEO: XML Sitemap Index & robots.txt
    path('sitemap.xml', sitemap_index, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.index'),
    path('sitemap-<section>.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
    path('robots.txt', robots_txt, name='robots-txt'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)