
from django.apps import AppConfig

class LegalServicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'legal_services'

    def ready(self):
        # ── Load signal handlers when Django starts ──
        from . import signals   # noqa: F401