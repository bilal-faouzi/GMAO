# organisation/serializers.py
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

    def validate_equipe(self, equipe):
        # ← NOUVEAU : l'équipe doit être active
        if not equipe.estActif:
            raise serializers.ValidationError(
                f"L'équipe '{equipe.libelle}' est désactivée. "
                "Impossible d'y affecter un technicien."
            )
        return equipe

    def validate_utilisateur(self, utilisateur):
        # ← NOUVEAU : l'utilisateur doit être actif
        if not utilisateur.est_actif:
            raise serializers.ValidationError(
                f"Le compte de '{utilisateur.nom_utilisateur}' est désactivé. "
                "Réactivez-le avant de l'affecter à une équipe."
            )
        return utilisateur

    def validate(self, data):
        utilisateur = data.get('utilisateur')
        est_actif   = data.get('estActif', True)

        if utilisateur and est_actif:
            # ← NOUVEAU : un technicien ne peut être actif que dans une seule équipe
            qs = EquipeUtilisateur.objects.filter(
                utilisateur=utilisateur,
                estActif=True
            )
            # En cas de modification (PATCH/PUT), on exclut l'instance courante
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)

            if qs.exists():
                equipe_actuelle = qs.first().equipe
                raise serializers.ValidationError(
                    f"{utilisateur.prenom} {utilisateur.nom} est déjà membre actif "
                    f"de l'équipe '{equipe_actuelle.libelle}'. "
                    "Pour le muter, désactivez d'abord son appartenance actuelle "
                    "(estActif=false), puis créez une nouvelle ligne."
                )

        # ← NOUVEAU : vérifier le doublon (même user, même équipe)
        equipe      = data.get('equipe')
        if utilisateur and equipe:
            qs_doublon = EquipeUtilisateur.objects.filter(
                utilisateur=utilisateur,
                equipe=equipe
            )
            if self.instance:
                qs_doublon = qs_doublon.exclude(pk=self.instance.pk)

            if qs_doublon.exists():
                raise serializers.ValidationError(
                    f"{utilisateur.prenom} {utilisateur.nom} appartient déjà "
                    f"à l'équipe '{equipe.libelle}' (ligne existante). "
                    "Réactivez l'appartenance existante au lieu d'en créer une nouvelle."
                )

        return data


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
    unites_libelles = serializers.SerializerMethodField()

    class Meta:
        model = AppartenanceOrganisationnelle
        fields = '__all__'
        read_only_fields = ['id']

    def get_unites_libelles(self, obj):
        return [u.libelle for u in obj.unites.all()]

    def get_utilisateur_nom(self, obj):
        prenom = getattr(obj.utilisateur, 'prenom', '') or ''
        nom    = getattr(obj.utilisateur, 'nom', '')    or ''
        return f"{prenom} {nom}".strip() or str(obj.utilisateur)

    def validate(self, data):
        utilisateur  = data.get('utilisateur')
        est_principale = data.get('estPrincipale', False)
        site         = data.get('site')
        societe      = data.get('societe')

        # ← NOUVEAU : un seul rattachement principal par utilisateur
        if est_principale and utilisateur:
            qs = AppartenanceOrganisationnelle.objects.filter(
                utilisateur=utilisateur,
                estPrincipale=True
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)

            if qs.exists():
                raise serializers.ValidationError({
                    'estPrincipale': (
                        f"{utilisateur.prenom} {utilisateur.nom} a déjà un rattachement "
                        "principal. Passez l'ancien à estPrincipale=false avant d'en "
                        "définir un nouveau."
                    )
                })

        # ← NOUVEAU : doublon exact (même user + même site + même secteur)
        secteur = data.get('secteur')
        if utilisateur and site:
            qs_doublon = AppartenanceOrganisationnelle.objects.filter(
                utilisateur=utilisateur,
                site=site,
                secteur=secteur
            )
            if self.instance:
                qs_doublon = qs_doublon.exclude(pk=self.instance.pk)

            if qs_doublon.exists():
                secteur_str = f" et au secteur '{secteur.libelle}'" if secteur else " sans secteur"
                raise serializers.ValidationError(
                    f"{utilisateur.prenom} {utilisateur.nom} est déjà rattaché "
                    f"au site '{site.libelle}'{secteur_str}. "
                    "Modifiez l'appartenance existante plutôt que d'en créer une nouvelle."
                )

        # ← NOUVEAU : cohérence hiérarchique — le secteur doit appartenir au site
        if secteur and site and secteur.site_id != site.id:
            raise serializers.ValidationError({
                'secteur': (
                    f"Le secteur '{secteur.libelle}' n'appartient pas "
                    f"au site '{site.libelle}'. "
                    "Vérifiez la cohérence de la hiérarchie."
                )
            })

        # ← MODIFIÉ : cohérence hiérarchique — les unités doivent appartenir au secteur
        unites = data.get('unites', [])
        if unites and secteur:
            for unite in unites:
                if unite.secteur_id != secteur.id:
                    raise serializers.ValidationError({
                        'unites': (
                            f"L'unité '{unite.libelle}' n'appartient pas "
                            f"au secteur '{secteur.libelle}'."
                        )
                    })

        return data