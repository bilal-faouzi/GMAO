from django.contrib import admin
from .models import Piece, MouvementStock


@admin.register(Piece)
class PieceAdmin(admin.ModelAdmin):
    list_display  = ['reference', 'designation', 'categorie', 'quantiteStock', 'seuilMinimum', 'unite', 'estActif']
    list_filter   = ['categorie', 'estActif']
    search_fields = ['reference', 'designation', 'fournisseur']


@admin.register(MouvementStock)
class MouvementStockAdmin(admin.ModelAdmin):
    list_display    = ['idPiece', 'typeMouvement', 'quantite', 'stockAvant', 'stockApres', 'dateHeure']
    list_filter     = ['typeMouvement']
    search_fields   = ['idPiece__reference']
    readonly_fields = ['dateHeure', 'stockAvant', 'stockApres']