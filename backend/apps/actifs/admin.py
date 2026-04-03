from django.contrib import admin
from .models import Actif, HistoriqueStatut, Indisponibilite, Remplacement


class HistoriqueStatutInline(admin.TabularInline):
    model = HistoriqueStatut
    extra = 0
    readonly_fields = ['ancienStatut', 'nouveauStatut', 'dateChangement', 'motif', 'modifiePar']
    can_delete = False


@admin.register(Actif)
class ActifAdmin(admin.ModelAdmin):
    list_display  = ['code', 'libelle', 'type', 'statut', 'idSite', 'idUnite', 'estActif']
    list_filter   = ['type', 'statut', 'estActif', 'idSite']
    search_fields = ['code', 'libelle', 'numSerie', 'fabricant']
    inlines       = [HistoriqueStatutInline]


@admin.register(HistoriqueStatut)
class HistoriqueStatutAdmin(admin.ModelAdmin):
    list_display  = ['idActif', 'ancienStatut', 'nouveauStatut', 'dateChangement', 'modifiePar']
    list_filter   = ['nouveauStatut']
    search_fields = ['idActif__code']
    readonly_fields = ['dateChangement']


@admin.register(Indisponibilite)
class IndisponibiliteAdmin(admin.ModelAdmin):
    list_display  = ['idActif', 'type', 'dateDebut', 'dateFin', 'estTerminee']
    list_filter   = ['type', 'estTerminee']
    search_fields = ['idActif__code']


@admin.register(Remplacement)
class RemplacementAdmin(admin.ModelAdmin):
    list_display  = ['actifOriginal', 'actifRemplacant', 'dateRemplacement', 'effectuePar']
    search_fields = ['actifOriginal__code', 'actifRemplacant__code']