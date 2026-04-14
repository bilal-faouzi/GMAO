from django.contrib import admin
from .models import (
    Societe, Site, Secteur, Unite,
    Specialite, Equipe, EquipeUtilisateur,
    AppartenanceOrganisationnelle
)


@admin.register(Societe)
class SocieteAdmin(admin.ModelAdmin):
    list_display = ['code', 'raisonSociale', 'estActif']
    search_fields = ['code', 'raisonSociale']
    list_filter = ['estActif']


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ['code', 'libelle', 'societe', 'ville', 'estActif']
    list_filter = ['societe', 'estActif']
    search_fields = ['code', 'libelle']


@admin.register(Secteur)
class SecteurAdmin(admin.ModelAdmin):
    list_display = ['code', 'libelle', 'site', 'estActif']
    list_filter = ['site__societe', 'site', 'estActif']
    search_fields = ['code', 'libelle']


@admin.register(Unite)
class UniteAdmin(admin.ModelAdmin):
    list_display = ['code', 'libelle', 'secteur', 'estProductive', 'estActif']
    list_filter = ['secteur__site', 'estProductive', 'estActif']
    search_fields = ['code', 'libelle']


@admin.register(Specialite)
class SpecialiteAdmin(admin.ModelAdmin):
    list_display = ['code', 'libelle', 'estActif']
    search_fields = ['code', 'libelle']


@admin.register(Equipe)
class EquipeAdmin(admin.ModelAdmin):
    list_display = ['libelle', 'site', 'specialite', 'chefEquipe', 'estActif']
    list_filter = ['site', 'specialite', 'estActif']
    search_fields = ['libelle']


@admin.register(EquipeUtilisateur)
class EquipeUtilisateurAdmin(admin.ModelAdmin):
    list_display = ['equipe', 'utilisateur', 'niveauRole', 'dateAdhesion', 'estActif']
    list_filter = ['equipe', 'niveauRole', 'estActif']


@admin.register(AppartenanceOrganisationnelle)
class AppartenanceAdmin(admin.ModelAdmin):
    list_display = ['utilisateur', 'societe', 'site', 'secteur', 'unite', 'estPrincipale']
    list_filter = ['societe', 'site', 'estPrincipale']