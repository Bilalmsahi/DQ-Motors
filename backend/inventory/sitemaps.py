from django.contrib.sitemaps import Sitemap
from .models import Vehicle


class VehicleSitemap(Sitemap):
    """
    Dynamic XML sitemap for all READY dealership vehicles.
    Google Search Console fetches /sitemap.xml to discover vehicle pages.
    """
    changefreq = 'daily'
    priority = 0.8
    protocol = 'https'

    def items(self):
        return Vehicle.objects.filter(
            status=Vehicle.Status.READY,
        ).order_by('-updated_at')

    def lastmod(self, obj):
        return obj.updated_at

    def location(self, obj):
        return f'/vehicles/{obj.slug}'
