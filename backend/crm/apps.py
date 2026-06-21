from django.apps import AppConfig


class CrmConfig(AppConfig):
    name = 'crm'
    
    def ready(self):
        """Import signals when app is ready"""
        import crm.signals  # noqa: F401
