from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import Actif, HistoriqueStatut, Indisponibilite, Remplacement


class ActifSerializer(serializers.ModelSerializer):
    site_detail            = serializers.SerializerMethodField()
    unite_detail           = serializers.SerializerMethodField()
    duree_vie              = serializers.SerializerMethodField()
    taux_disponibilite     = serializers.SerializerMethodField()
    parent_detail          = serializers.SerializerMethodField()
    sous_actifs            = serializers.SerializerMethodField()
    chemin_hierarchique    = serializers.SerializerMethodField()

    class Meta:
        model  = Actif
        fields = '__all__'

    def get_site_detail(self, obj):
        if obj.idSite:
            return {'id': str(obj.idSite.id), 'code': obj.idSite.code, 'libelle': obj.idSite.libelle}
        return None

    def get_unite_detail(self, obj):
        if obj.idUnite:
            return {'id': str(obj.idUnite.id), 'code': obj.idUnite.code, 'libelle': obj.idUnite.libelle}
        return None

    def get_parent_detail(self, obj):
        if obj.idParent:
            return {'id': str(obj.idParent.id), 'code': obj.idParent.code, 'libelle': obj.idParent.libelle}
        return None

    def get_sous_actifs(self, obj):
        enfants = obj.sous_actifs.filter(estActif=True)
        return ActifSerializer(enfants, many=True).data

    def get_chemin_hierarchique(self, obj):
        chemin = []
        current = obj.idParent
        while current is not None:
            chemin.insert(0, {
                'id':      str(current.id),
                'code':    current.code,
                'libelle': current.libelle,
            })
            current = current.idParent
        return chemin

    def get_duree_vie(self, obj):
        if obj.dateAcquisition:
            return (timezone.now().date() - obj.dateAcquisition).days
        return None

    def get_taux_disponibilite(self, obj):
        depuis = timezone.now() - timedelta(days=30)
        indispos = obj.indisponibilites.filter(dateDebut__gte=depuis, estTerminee=True)
        heures_indispo = sum(
            (i.dateFin - i.dateDebut).total_seconds() / 3600
            for i in indispos if i.dateFin
        )
        total_heures = 30 * 24
        return round(((total_heures - heures_indispo) / total_heures) * 100, 2)


class HistoriqueStatutSerializer(serializers.ModelSerializer):
    modifiePar_detail = serializers.SerializerMethodField()

    class Meta:
        model  = HistoriqueStatut
        fields = '__all__'

    def get_modifiePar_detail(self, obj):
        if obj.modifiePar:
            return {
                'id':     str(obj.modifiePar.id),
                'nom':    obj.modifiePar.nom,
                'prenom': obj.modifiePar.prenom,
            }
        return None


class IndisponibiliteSerializer(serializers.ModelSerializer):
    duree_heures = serializers.SerializerMethodField()

    class Meta:
        model  = Indisponibilite
        fields = '__all__'

    def get_duree_heures(self, obj):
        return obj.duree_heures


class RemplacementSerializer(serializers.ModelSerializer):
    actifOriginal_detail   = serializers.SerializerMethodField()
    actifRemplacant_detail = serializers.SerializerMethodField()

    class Meta:
        model  = Remplacement
        fields = '__all__'

    def get_actifOriginal_detail(self, obj):
        return {
            'id':      str(obj.actifOriginal.id),
            'code':    obj.actifOriginal.code,
            'libelle': obj.actifOriginal.libelle,
        }

    def get_actifRemplacant_detail(self, obj):
        return {
            'id':      str(obj.actifRemplacant.id),
            'code':    obj.actifRemplacant.code,
            'libelle': obj.actifRemplacant.libelle,
        }