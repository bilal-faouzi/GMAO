from django.contrib import admin
from .models import SousTraitant, SousTraitantSpecialite


class SousTraitantSpecialiteInline(admin.TabularInline):
    model = SousTraitantSpecialite
    extra = 1
    readonly_fields = ('id', 'dateAttribution')


@admin.register(SousTraitant)
class SousTraitantAdmin(admin.ModelAdmin):
    list_display = ('raisonSociale', 'statut', 'contactPrincipalNom', 'estActif')
    list_filter = ('statut', 'estActif')
    search_fields = ('raisonSociale', 'contactPrincipalEmail')
    readonly_fields = ('id', 'dateCreation', 'dateModification')
    inlines = [SousTraitantSpecialiteInline]


@admin.register(SousTraitantSpecialite)
class SousTraitantSpecialiteAdmin(admin.ModelAdmin):
    list_display = ('idSousTraitant', 'idSpecialite', 'dateAttribution')
    list_filter = ('idSpecialite',)
