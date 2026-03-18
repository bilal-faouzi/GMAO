# APRÈS — corriger le name
from django.apps import AppConfig

class OrganisationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.organisation'   # ← corriger comme ça