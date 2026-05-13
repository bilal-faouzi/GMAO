from rest_framework import serializers
from .models import (
    DemandeIntervention, PieceJointeDI, OrdreTravail,
    AffectationEquipe, MembreIntervention, SuiviTemps,
    PieceUtiliseeOT, CommentaireOT, CauseRacine,
    HistoriqueStatutOT, ConfigurationSLA, ActifCorrigeOT
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
    rejet_info          = serializers.SerializerMethodField()

    class Meta:
        model  = DemandeIntervention
        fields = '__all__'

    def get_rejet_info(self, obj):
        if obj.statut == 'rejetee_apres_validation' and obj.rejetCount > 0:
            return {
                'count': obj.rejetCount,
                'date': obj.dateDernierRejet,
                'motif': obj.motifRejet,
            }
        return None

    def get_actif_detail(self, obj):
        actif = obj.idActif
        # Chemin hiérarchique (racine → parent direct)
        chemin = []
        current = actif.idParent
        while current is not None:
            chemin.insert(0, {
                'id': str(current.id),
                'code': current.code,
                'libelle': current.libelle,
            })
            current = current.idParent
        
        # Fils directs (enfants)
        fils = [
            {'id': str(e.id), 'code': e.code, 'libelle': e.libelle, 'statut': e.statut}
            for e in actif.sous_actifs.filter(estActif=True)
        ]
        
        return {
            'id': str(actif.id),
            'code': actif.code,
            'libelle': actif.libelle,
            'statut': actif.statut,
            'chemin_hierarchique': chemin,
            'parent_detail': {
                'id': str(actif.idParent.id),
                'code': actif.idParent.code,
                'libelle': actif.idParent.libelle,
            } if actif.idParent else None,
            'fils': fils,
        }

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


class ActifCorrigeOTSerializer(serializers.ModelSerializer):
    actif_detail = serializers.SerializerMethodField()

    class Meta:
        model  = ActifCorrigeOT
        fields = '__all__'

    def get_actif_detail(self, obj):
        if obj.idActif:
            return {
                'id':     str(obj.idActif.id),
                'code':   obj.idActif.code,
                'libelle':obj.idActif.libelle,
                'statut': obj.idActif.statut,
            }
        return None


class AffectationEquipeSerializer(serializers.ModelSerializer):
    equipe_detail         = serializers.SerializerMethodField()
    soustraitant_detail   = serializers.SerializerMethodField()
    chefTechnicien_detail = serializers.SerializerMethodField()
    membres               = MembreInterventionSerializer(many=True, read_only=True)

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

    def get_chefTechnicien_detail(self, obj):
        if obj.idChefTechnicien:
            return {
                'id':     str(obj.idChefTechnicien.id),
                'nom':    obj.idChefTechnicien.nom,
                'prenom': obj.idChefTechnicien.prenom,
            }
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
    createur_detail     = serializers.SerializerMethodField()
    validation_detail   = serializers.SerializerMethodField()
    rejetOperateur_detail = serializers.SerializerMethodField()
    demande_detail      = serializers.SerializerMethodField()
    affectations        = AffectationEquipeSerializer(many=True, read_only=True)
    historiques_statut  = HistoriqueStatutOTSerializer(many=True, read_only=True)
    pieces_utilisees_detail = serializers.SerializerMethodField()
    commentaires_detail = serializers.SerializerMethodField()
    actifs_corriges     = ActifCorrigeOTSerializer(many=True, read_only=True)

    class Meta:
        model  = OrdreTravail
        fields = '__all__'

    def get_actif_detail(self, obj):
        return {
            'id':      str(obj.idActif.id),
            'code':    obj.idActif.code,
            'libelle': obj.idActif.libelle,
            'statut':  obj.idActif.statut,
            'idUnite': str(obj.idActif.idUnite.id) if obj.idActif.idUnite else None,
        }

    def get_createur_detail(self, obj):
        if obj.idUtilisateurCreateur:
            return {
                'id':     str(obj.idUtilisateurCreateur.id),
                'nom':    obj.idUtilisateurCreateur.nom,
                'prenom': obj.idUtilisateurCreateur.prenom,
            }
        return None

    def get_validation_detail(self, obj):
        if obj.idUtilisateurValidation:
            return {
                'id':     str(obj.idUtilisateurValidation.id),
                'nom':    obj.idUtilisateurValidation.nom,
                'prenom': obj.idUtilisateurValidation.prenom,
            }
        return None

    def get_rejetOperateur_detail(self, obj):
        if obj.idUtilisateurRejetOperateur:
            return {
                'id':     str(obj.idUtilisateurRejetOperateur.id),
                'nom':    obj.idUtilisateurRejetOperateur.nom,
                'prenom': obj.idUtilisateurRejetOperateur.prenom,
            }
        return None

    def get_demande_detail(self, obj):
        if obj.idDemandeIntervention:
            di = obj.idDemandeIntervention
            return {
                'id':               str(di.id),
                'numero':           di.numero,
                'titre':            di.titre,
                'description':      di.description,
                'urgence':          di.urgence,
                'dateSignalement':  di.dateSignalement,
                'signalement_detail': {
                    'id':     str(di.idUtilisateurSignalement.id) if di.idUtilisateurSignalement else None,
                    'nom':    di.idUtilisateurSignalement.nom if di.idUtilisateurSignalement else None,
                    'prenom': di.idUtilisateurSignalement.prenom if di.idUtilisateurSignalement else None,
                } if di.idUtilisateurSignalement else None,
                'pieces_jointes':   PieceJointeDISerializer(di.pieces_jointes.all(), many=True).data,
                'nb_pieces_jointes': di.pieces_jointes.count(),
            }
        return None

    def get_est_en_retard(self, obj):
        return obj.est_en_retard

    def get_cout_total(self, obj):
        return obj.cout_total

    def get_nb_commentaires(self, obj):
        return obj.commentaires.count()

    def get_nb_pieces_utilisees(self, obj):
        return obj.pieces_utilisees.count()

    def get_pieces_utilisees_detail(self, obj):
        return PieceUtiliseeOTSerializer(obj.pieces_utilisees.all(), many=True).data

    def get_commentaires_detail(self, obj):
        return CommentaireOTSerializer(obj.commentaires.all(), many=True).data