from django.contrib.sitemaps import Sitemap
from .models import BlogPost


class BlogSitemap(Sitemap):
    """
    Sitemap for published blog posts.
    """
    changefreq = 'monthly'
    priority = 0.7
    protocol = 'https'

    def items(self):
        return BlogPost.objects.filter(
            status=BlogPost.Status.PUBLISHED,
        ).order_by('-updated_at')

    def lastmod(self, obj):
        return obj.updated_at

    def location(self, obj):
        return f'/blog/{obj.slug}'
