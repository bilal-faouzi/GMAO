from rest_framework import serializers
from .models import Actif, HistoriqueStatutActif


# ---------------------------------------------------------------------------
# HistoriqueStatutActif
# ---------------------------------------------------------------------------

class HistoriqueStatutActifSerializer(serializers.ModelSerializer):
    idUtilisateurNom = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = HistoriqueStatutActif
        fields = [
            'id',
            'idActif',
            'ancienStatut',
            'nouveauStatut',
            'dateChangement',
            'idUtilisateur',
            'idUtilisateurNom',
        ]
        read_only_fields = ['id', 'dateChangement']

    def get_idUtilisateurNom(self, obj):
        if obj.idUtilisateur:
            return obj.idUtilisateur.get_full_name() or obj.idUtilisateur.username
        return None


# ---------------------------------------------------------------------------
# Actif — lecture légère (liste)
# ---------------------------------------------------------------------------

class ActifListSerializer(serializers.ModelSerializer):
    """Représentation légère pour les listes et les arborescences."""

    nbEnfants = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = Actif
        fields = [
            'id',
            'codeActif',
            'designation',
            'idUnite',
            'idParent',
            'type',
            'criticite',
            'statut',
            'nbEnfants',
        ]

    def get_nbEnfants(self, obj):
        return obj.enfants.count()


# ---------------------------------------------------------------------------
# Actif — détail complet
# ---------------------------------------------------------------------------

# class ActifDetailSerializer(serializers.ModelSerializer):
#     """Représentation complète avec enfants directs et historique récent."""

#     enfants         = ActifListSerializer(many=True, read_only=True)
#     historiqueRecent = serializers.SerializerMethodField(read_only=True)

#     class Meta:
#         model  = Actif
#         fields = [
#             'id',
#             'codeActif',
#             'designation',
#             'idUnite',
#             'idParent',
#             'type',
#             'criticite',
#             'statut',
#             'numeroSerie',
#             'fabricant',
#             'modele',
#             'enfants',
#             'historiqueRecent',
#             'createdAt',
#             'updatedAt',
#         ]
#         read_only_fields = ['id', 'createdAt', 'updatedAt']

#     def get_historiqueRecent(self, obj):
#         qs = obj.historique_statuts.select_related('idUtilisateur').order_by('-dateChangement')[:10]
#         return HistoriqueStatutActifSerializer(qs, many=True).data


class ActifDetailSerializer(serializers.ModelSerializer):
    enfants = serializers.SerializerMethodField(read_only=True)
    historiqueRecent = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Actif
        fields = [
            'id', 'codeActif', 'designation', 'idUnite', 'idParent',
            'type', 'criticite', 'statut', 'numeroSerie', 'fabricant',
            'modele', 'enfants', 'historiqueRecent', 'createdAt', 'updatedAt',
        ]
        read_only_fields = ['id', 'createdAt', 'updatedAt']

    def get_enfants(self, obj):
        depth     = self.context.get('depth', 0)
        max_depth = self.context.get('max_depth', 10)  # sécurité anti-boucle

        if depth >= max_depth:
            # On retourne quand même les infos de base sans récursion
            return ActifListSerializer(
                obj.enfants.all(), many=True,
                context=self.context
            ).data

        return ActifDetailSerializer(
            obj.enfants.select_related('idUnite', 'idParent'),
            many=True,
            context={**self.context, 'depth': depth + 1}
        ).data

    def get_historiqueRecent(self, obj):
        qs = obj.historique_statuts.select_related('idUtilisateur') \
                                   .order_by('-dateChangement')[:10]
        return HistoriqueStatutActifSerializer(qs, many=True).data

# ---------------------------------------------------------------------------
# Actif — création / modification
# ---------------------------------------------------------------------------

class ActifWriteSerializer(serializers.ModelSerializer):
    """Serializer d'écriture avec validations métier."""

    class Meta:
        model  = Actif
        fields = [
            'codeActif',
            'designation',
            'idUnite',
            'idParent',
            'type',
            'criticite',
            'statut',
            'numeroSerie',
            'fabricant',
            'modele',
        ]

    def validate_idParent(self, value):
        """Interdit les cycles dans l'arborescence."""
        if value is None:
            return value
        instance = self.instance
        if instance and value.pk == instance.pk:
            raise serializers.ValidationError(
                "Un actif ne peut pas être son propre parent."
            )
        # Remonte l'arbre pour détecter un cycle éventuel
        parent = value
        visited = set()
        while parent is not None:
            if instance and parent.pk == instance.pk:
                raise serializers.ValidationError(
                    "Cette relation créerait un cycle dans l'arborescence."
                )
            if parent.pk in visited:
                break
            visited.add(parent.pk)
            parent = parent.idParent
        return value

    def validate(self, attrs):
        """Cohérence entre statut et criticité."""
        statut    = attrs.get('statut', getattr(self.instance, 'statut', None))
        criticite = attrs.get('criticite', getattr(self.instance, 'criticite', None))

        if statut == Actif.Statut.HORS_SERVICE and criticite == Actif.Criticite.CRITIQUE:
            # Simple avertissement métier — on laisse passer mais on peut logger
            pass

        return attrs


# ---------------------------------------------------------------------------
# Changement de statut (action dédiée)
# ---------------------------------------------------------------------------

class ChangerStatutSerializer(serializers.Serializer):
    """Payload pour l'action /actifs/{id}/changer_statut/."""

    nouveauStatut = serializers.ChoiceField(choices=Actif.Statut.choices)

    def validate_nouveauStatut(self, value):
        actif = self.context.get('actif')
        if actif and actif.statut == value:
            raise serializers.ValidationError(
                f"L'actif est déjà au statut « {value} »."
            )
        return value