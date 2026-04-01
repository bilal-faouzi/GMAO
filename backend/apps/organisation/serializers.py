from rest_framework import serializers
from .models import (
    Societe, Site, Secteur, Unite,
    Specialite, Equipe, EquipeUtilisateur,
    AppartenanceOrganisationnelle
)
from apps.securite.models import Utilisateur

class SpecialiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialite
        fields = '__all__'
        read_only_fields = ['id']


class UniteSerializer(serializers.ModelSerializer):
    secteur_libelle = serializers.CharField(source='secteur.libelle', read_only=True)

    class Meta:
        model = Unite
        fields = '__all__'
        read_only_fields = ['id']


class SecteurSerializer(serializers.ModelSerializer):
    site_libelle = serializers.CharField(source='site.libelle', read_only=True)
    unites_count = serializers.IntegerField(source='unites.count', read_only=True)

    class Meta:
        model = Secteur
        fields = '__all__'
        read_only_fields = ['id']


class SiteSerializer(serializers.ModelSerializer):
    societe_libelle = serializers.CharField(source='societe.raisonSociale', read_only=True)
    secteurs_count = serializers.IntegerField(source='secteurs.count', read_only=True)

    class Meta:
        model = Site
        fields = '__all__'
        read_only_fields = ['id']


class SocieteSerializer(serializers.ModelSerializer):
    sites_count = serializers.IntegerField(source='sites.count', read_only=True)

    class Meta:
        model = Societe
        fields = '__all__'
        read_only_fields = ['id']


# ─── Arborescence ─────────────────────────────────────────────────────────────

class UniteArborescenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unite
        fields = ['id', 'code', 'libelle', 'estProductive', 'estActif']


class SecteurArborescenceSerializer(serializers.ModelSerializer):
    unites = UniteArborescenceSerializer(many=True, read_only=True)

    class Meta:
        model = Secteur
        fields = ['id', 'code', 'libelle', 'estActif', 'unites']


class SiteArborescenceSerializer(serializers.ModelSerializer):
    secteurs = SecteurArborescenceSerializer(many=True, read_only=True)

    class Meta:
        model = Site
        fields = ['id', 'code', 'libelle', 'ville', 'estActif', 'secteurs']


class SocieteArborescenceSerializer(serializers.ModelSerializer):
    sites = SiteArborescenceSerializer(many=True, read_only=True)

    class Meta:
        model = Societe
        fields = ['id', 'code', 'raisonSociale', 'estActif', 'sites']


# ─── Equipe ───────────────────────────────────────────────────────────────────

class EquipeSerializer(serializers.ModelSerializer):
    site_libelle = serializers.CharField(source='site.libelle', read_only=True)
    specialite_libelle = serializers.CharField(
        source='specialite.libelle', read_only=True, default=None
    )
    chef_nom = serializers.SerializerMethodField()
    membres_count = serializers.IntegerField(source='membres.count', read_only=True)

    class Meta:
        model = Equipe
        fields = '__all__'
        read_only_fields = ['id']

    def get_chef_nom(self, obj):
        if not obj.chefEquipe:
            return None
        prenom = getattr(obj.chefEquipe, 'prenom', '') or ''
        nom    = getattr(obj.chefEquipe, 'nom', '')    or ''
        nom_complet = f"{prenom} {nom}".strip()
        if nom_complet:
            return nom_complet
        return getattr(obj.chefEquipe, 'username', str(obj.chefEquipe))


# ─── EquipeUtilisateur ────────────────────────────────────────────────────────

class EquipeUtilisateurSerializer(serializers.ModelSerializer):
    equipe_libelle = serializers.CharField(source='equipe.libelle', read_only=True)
    utilisateur_nom = serializers.SerializerMethodField()

    class Meta:
        model = EquipeUtilisateur
        fields = '__all__'
        read_only_fields = ['id', 'dateAdhesion']

    def get_utilisateur_nom(self, obj):
        prenom = getattr(obj.utilisateur, 'prenom', '')
        nom = getattr(obj.utilisateur, 'nom', '')
        return f"{prenom} {nom}".strip() or getattr(
            obj.utilisateur, 'nom_utilisateur', str(obj.utilisateur)
        )


# ─── AppartenanceOrganisationnelle ────────────────────────────────────────────

class AppartenanceOrganisationnelleSerializer(serializers.ModelSerializer):
    utilisateur = serializers.PrimaryKeyRelatedField(
        queryset=Utilisateur.objects.all(),
        pk_field=serializers.UUIDField()
    )
    utilisateur_nom = serializers.SerializerMethodField()
    societe_libelle = serializers.CharField(source='societe.raisonSociale', read_only=True)
    site_libelle    = serializers.CharField(source='site.libelle', read_only=True)
    secteur_libelle = serializers.CharField(
        source='secteur.libelle', read_only=True, default=None
    )
    unite_libelle = serializers.CharField(
        source='unite.libelle', read_only=True, default=None
    )

    class Meta:
        model = AppartenanceOrganisationnelle
        fields = '__all__'
        read_only_fields = ['id']

    def get_utilisateur_nom(self, obj):
        prenom = getattr(obj.utilisateur, 'prenom', '') or ''
        nom    = getattr(obj.utilisateur, 'nom', '')    or ''
        return f"{prenom} {nom}".strip() or str(obj.utilisateur)