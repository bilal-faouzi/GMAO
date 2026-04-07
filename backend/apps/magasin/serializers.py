from rest_framework import serializers
from .models import Piece, MouvementStock


class PieceSerializer(serializers.ModelSerializer):
    est_sous_seuil     = serializers.SerializerMethodField()
    valeur_stock_total = serializers.SerializerMethodField()

    class Meta:
        model  = Piece
        fields = '__all__'

    def get_est_sous_seuil(self, obj):
        return obj.est_sous_seuil

    def get_valeur_stock_total(self, obj):
        return obj.valeur_stock_total


class MouvementStockSerializer(serializers.ModelSerializer):
    piece_detail      = serializers.SerializerMethodField()
    magasinier_detail = serializers.SerializerMethodField()

    class Meta:
        model  = MouvementStock
        fields = '__all__'

    def get_piece_detail(self, obj):
        return {
            'id':          str(obj.idPiece.id),
            'reference':   obj.idPiece.reference,
            'designation': obj.idPiece.designation,
        }

    def get_magasinier_detail(self, obj):
        if obj.idUtilisateurMagasinier:
            return {
                'id':     str(obj.idUtilisateurMagasinier.id),
                'nom':    obj.idUtilisateurMagasinier.nom,
                'prenom': obj.idUtilisateurMagasinier.prenom,
            }
        return None