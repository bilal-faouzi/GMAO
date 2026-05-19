from django.apps import AppConfig
from django.db.models.signals import post_migrate

class SecuriteConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.securite'

    def ready(self):
        from .sync_access_control import run_sync

        def _sync_access_control(**kwargs):
            try:
                run_sync(assign_admin_to_no_role=True)
            except Exception:
                # Avoid breaking startup if sync fails
                pass

        post_migrate.connect(_sync_access_control, sender=self)