from django.contrib import admin
from .models import Actif, HistoriqueStatutActif


@admin.register(Actif)
class ActifAdmin(admin.ModelAdmin):
    list_display  = ['codeActif', 'designation', 'type', 'criticite', 'statut', 'idUnite', 'idParent']
    list_filter   = ['type', 'criticite', 'statut']
    search_fields = ['codeActif', 'designation', 'numeroSerie']
    ordering      = ['codeActif']


@admin.register(HistoriqueStatutActif)
class HistoriqueStatutActifAdmin(admin.ModelAdmin):
    list_display  = ['idActif', 'ancienStatut', 'nouveauStatut', 'dateChangement', 'idUtilisateur']
    list_filter   = ['ancienStatut', 'nouveauStatut']
    search_fields = ['idActif__codeActif']
    ordering      = ['-dateChangement']
    readonly_fields = ['dateChangement']