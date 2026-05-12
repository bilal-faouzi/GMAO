from rest_framework import serializers
from .models import (
    DemandeIntervention, PieceJointeDI, OrdreTravail,
    AffectationEquipe, MembreIntervention, SuiviTemps,
    PieceUtiliseeOT, CommentaireOT, CauseRacine,
    HistoriqueStatutOT, ConfigurationSLA
)


class PieceJointeDISerializer(serializers.ModelSerializer):
    class Meta:
        model  = PieceJointeDI
        fields = '__all__'


class DemandeInterventionSerializer(serializers.ModelSerializer):
    actif_detail        = serializers.SerializerMethodField()
    signalement_detail  = serializers.SerializerMethodField()
    validation_detail   = serializers.SerializerMethodField()
    nb_pieces_jointes   = serializers.SerializerMethodField()
    pieces_jointes      = serializers.SerializerMethodField()
    idUtilisateurSignalement = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model  = DemandeIntervention
        fields = '__all__'

    def get_actif_detail(self, obj):
        return {'id': str(obj.idActif.id), 'code': obj.idActif.code, 'libelle': obj.idActif.libelle}

    def get_signalement_detail(self, obj):
        print(f'📝 get_signalement_detail called for {obj.numero}')
        print(f'   idUtilisateurSignalement: {obj.idUtilisateurSignalement}')
        if obj.idUtilisateurSignalement:
            result = {
                'id':     str(obj.idUtilisateurSignalement.id),
                'nom':    obj.idUtilisateurSignalement.nom,
                'prenom': obj.idUtilisateurSignalement.prenom,
                'date':   obj.dateSignalement,
            }
            print(f'   Returning: {result}')
            return result
        print(f'   No user, returning None')
        return None

    def get_validation_detail(self, obj):
        print(f'✅ get_validation_detail called for {obj.numero}')
        print(f'   idUtilisateurValidation: {obj.idUtilisateurValidation}')
        if obj.idUtilisateurValidation:
            result = {
                'id':     str(obj.idUtilisateurValidation.id),
                'nom':    obj.idUtilisateurValidation.nom,
                'prenom': obj.idUtilisateurValidation.prenom,
                'date':   obj.dateValidation,
            }
            print(f'   Returning: {result}')
            return result
        print(f'   No user, returning None')
        return None

    def get_nb_pieces_jointes(self, obj):
        return obj.pieces_jointes.count()

    def get_pieces_jointes(self, obj):
        return PieceJointeDISerializer(obj.pieces_jointes.all(), many=True).data


class MembreInterventionSerializer(serializers.ModelSerializer):
    utilisateur_detail = serializers.SerializerMethodField()

    class Meta:
        model  = MembreIntervention
        fields = '__all__'

    def get_utilisateur_detail(self, obj):
        return {
            'id':     str(obj.idUtilisateur.id),
            'nom':    obj.idUtilisateur.nom,
            'prenom': obj.idUtilisateur.prenom,
        }


class AffectationEquipeSerializer(serializers.ModelSerializer):
    equipe_detail       = serializers.SerializerMethodField()
    soustraitant_detail = serializers.SerializerMethodField()
    membres             = MembreInterventionSerializer(many=True, read_only=True)

    class Meta:
        model  = AffectationEquipe
        fields = '__all__'

    def get_equipe_detail(self, obj):
        if obj.idEquipe:
            return {'id': str(obj.idEquipe.id), 'libelle': obj.idEquipe.libelle}
        return None

    def get_soustraitant_detail(self, obj):
        if obj.idSousTraitant:
            return {'id': str(obj.idSousTraitant.id), 'raisonSociale': obj.idSousTraitant.raisonSociale}
        return None


class PieceUtiliseeOTSerializer(serializers.ModelSerializer):
    piece_detail = serializers.SerializerMethodField()
    cout_total   = serializers.SerializerMethodField()

    class Meta:
        model  = PieceUtiliseeOT
        fields = '__all__'

    def get_piece_detail(self, obj):
        return {
            'id':          str(obj.idPiece.id),
            'reference':   obj.idPiece.reference,
            'designation': obj.idPiece.designation,
        }

    def get_cout_total(self, obj):
        return obj.cout_total


class CommentaireOTSerializer(serializers.ModelSerializer):
    utilisateur_detail = serializers.SerializerMethodField()

    class Meta:
        model  = CommentaireOT
        fields = '__all__'

    def get_utilisateur_detail(self, obj):
        if obj.idUtilisateur:
            return {
                'id':     str(obj.idUtilisateur.id),
                'nom':    obj.idUtilisateur.nom,
                'prenom': obj.idUtilisateur.prenom,
            }
        return None


class CauseRacineSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CauseRacine
        fields = '__all__'


class HistoriqueStatutOTSerializer(serializers.ModelSerializer):
    utilisateur_detail = serializers.SerializerMethodField()

    class Meta:
        model  = HistoriqueStatutOT
        fields = '__all__'

    def get_utilisateur_detail(self, obj):
        if obj.idUtilisateur:
            return {
                'id':     str(obj.idUtilisateur.id),
                'nom':    obj.idUtilisateur.nom,
                'prenom': obj.idUtilisateur.prenom,
            }
        return None


class SuiviTempsSerializer(serializers.ModelSerializer):
    duree_calculee = serializers.SerializerMethodField()

    class Meta:
        model  = SuiviTemps
        fields = '__all__'

    def get_duree_calculee(self, obj):
        return obj.duree_calculee


class ConfigurationSLASerializer(serializers.ModelSerializer):
    class Meta:
        model  = ConfigurationSLA
        fields = '__all__'


class OrdreTravailSerializer(serializers.ModelSerializer):
    actif_detail        = serializers.SerializerMethodField()
    est_en_retard       = serializers.SerializerMethodField()
    cout_total          = serializers.SerializerMethodField()
    nb_commentaires     = serializers.SerializerMethodField()
    nb_pieces_utilisees = serializers.SerializerMethodField()
    affectations        = AffectationEquipeSerializer(many=True, read_only=True)
    historiques_statut  = HistoriqueStatutOTSerializer(many=True, read_only=True)
    pieces_utilisees  = PieceUtiliseeOTSerializer(many=True, read_only=True)

    class Meta:
        model  = OrdreTravail
        fields = '__all__'

    def get_actif_detail(self, obj):
        return {
            'id':      str(obj.idActif.id),
            'code':    obj.idActif.code,
            'libelle': obj.idActif.libelle,
            'statut':  obj.idActif.statut,
        }

    def get_est_en_retard(self, obj):
        return obj.est_en_retard

    def get_cout_total(self, obj):
        return obj.cout_total

    def get_nb_commentaires(self, obj):
        return obj.commentaires.count()

    def get_nb_pieces_utilisees(self, obj):
        return obj.pieces_utilisees.count()