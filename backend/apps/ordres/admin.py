from django.contrib import admin
from .models import (
    DemandeIntervention, PieceJointeDI, OrdreTravail,
    AffectationEquipe, MembreIntervention, SuiviTemps,
    PieceUtiliseeOT, CommentaireOT, CauseRacine,
    HistoriqueStatutOT, ConfigurationSLA
)


class PieceJointeDIInline(admin.TabularInline):
    model = PieceJointeDI
    extra = 0


class AffectationEquipeInline(admin.TabularInline):
    model = AffectationEquipe
    extra = 0
    readonly_fields = ['dateDebut']


class CommentaireOTInline(admin.TabularInline):
    model = CommentaireOT
    extra = 0
    readonly_fields = ['dateCreation']


class HistoriqueStatutOTInline(admin.TabularInline):
    model = HistoriqueStatutOT
    extra = 0
    readonly_fields = ['dateChangement']


class PieceUtiliseeOTInline(admin.TabularInline):
    model = PieceUtiliseeOT
    extra = 0
    readonly_fields = ['dateUtilisation', 'prixUnitaireCapture']


@admin.register(DemandeIntervention)
class DemandeInterventionAdmin(admin.ModelAdmin):
    list_display    = ['numero', 'idActif', 'urgence', 'statut', 'dateSignalement']
    list_filter     = ['statut', 'urgence']
    search_fields   = ['numero', 'description']
    readonly_fields = ['dateSignalement', 'numero']
    inlines         = [PieceJointeDIInline]


@admin.register(OrdreTravail)
class OrdreTravailAdmin(admin.ModelAdmin):
    list_display    = ['numero', 'type', 'priorite', 'statut', 'idActif', 'estSousTraite', 'echeanceSLA']
    list_filter     = ['statut', 'type', 'priorite', 'estSousTraite']
    search_fields   = ['numero', 'idActif__code']
    readonly_fields = ['numero', 'dateCloture', 'dureeReelleMin']
    inlines         = [AffectationEquipeInline, PieceUtiliseeOTInline, CommentaireOTInline, HistoriqueStatutOTInline]


@admin.register(AffectationEquipe)
class AffectationEquipeAdmin(admin.ModelAdmin):
    list_display  = ['idOrdreTravail', 'idEquipe', 'idSousTraitant', 'statut', 'dateDebut']
    list_filter   = ['statut']


@admin.register(MembreIntervention)
class MembreInterventionAdmin(admin.ModelAdmin):
    list_display = ['idUtilisateur', 'idAffectationEquipe', 'dateDebut', 'minutesTravailles']


@admin.register(SuiviTemps)
class SuiviTempsAdmin(admin.ModelAdmin):
    list_display    = ['idUtilisateur', 'idOrdreTravail', 'heureDebut', 'heureFin', 'minutesTravailles']
    readonly_fields = ['minutesTravailles']


@admin.register(PieceUtiliseeOT)
class PieceUtiliseeOTAdmin(admin.ModelAdmin):
    list_display    = ['idOrdreTravail', 'idPiece', 'quantite', 'prixUnitaireCapture', 'dateUtilisation']
    readonly_fields = ['dateUtilisation', 'prixUnitaireCapture']


@admin.register(CommentaireOT)
class CommentaireOTAdmin(admin.ModelAdmin):
    list_display    = ['idOrdreTravail', 'idUtilisateur', 'estInterne', 'dateCreation']
    list_filter     = ['estInterne']
    readonly_fields = ['dateCreation']


@admin.register(CauseRacine)
class CauseRacineAdmin(admin.ModelAdmin):
    list_display = ['idOrdreTravail', 'categorie', 'dateIdentification']
    list_filter  = ['categorie']


@admin.register(HistoriqueStatutOT)
class HistoriqueStatutOTAdmin(admin.ModelAdmin):
    list_display    = ['idOrdreTravail', 'ancienStatut', 'nouveauStatut', 'dateChangement']
    readonly_fields = ['dateChangement']


@admin.register(ConfigurationSLA)
class ConfigurationSLAAdmin(admin.ModelAdmin):
    list_display  = ['idSite', 'typeOrdreTravail', 'priorite', 'delaiAffectationMin', 'delaiResolutionMin', 'estActif']
    list_filter   = ['estActif', 'priorite']