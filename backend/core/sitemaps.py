from django.contrib.sitemaps import Sitemap


class StaticViewSitemap(Sitemap):
    """
    Sitemap for static React frontend pages.
    These are literal URL paths that the SPA serves client-side.
    """
    changefreq = 'weekly'
    protocol = 'https'

    # (path, priority) — home page gets 1.0, others 0.8
    _pages = [
        ('', 1.0),
        ('/inventory', 0.8),
        ('/contact', 0.8),
        ('/trade-in', 0.8),
        ('/find-my-car', 0.8),
        ('/sell-your-car', 0.8),
        ('/blog', 0.8),
        ('/privacy-policy', 0.5),
        ('/terms', 0.5),
        ('/returns', 0.5),
    ]

    def items(self):
        return self._pages

    def location(self, item):
        return item[0] if item[0] else '/'

    def priority(self, item):
        return item[1]
