import re
from decimal import Decimal
from rest_framework import serializers
from .models import SousTraitant, SousTraitantSpecialite
from apps.organisation.models import Specialite


# ─── REGEX PATTERNS ───────────────────────────────────────────────────────────
PHONE_REGEX = re.compile(
    r'^(\+?\d{1,4}[\s\-]?)?(\(?\d{1,4}\)?[\s\-]?)?\d[\d\s\-]{5,20}\d$'
)
EMAIL_REGEX = re.compile(
    r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
)
ICE_REGEX = re.compile(r'^\d{9,14}$')


class SousTraitantSerializer(serializers.ModelSerializer):
    specialites = serializers.SerializerMethodField()
    createur_detail = serializers.SerializerMethodField()

    class Meta:
        model = SousTraitant
        fields = '__all__'
        read_only_fields = ['id', 'dateCreation', 'dateModification', 'idUtilisateurCreateur', 'statut']

    def get_specialites(self, obj):
        liens = obj.specialites.select_related('idSpecialite').all()
        return [
            {
                'id': str(lien.idSpecialite.id),
                'code': lien.idSpecialite.code,
                'libelle': lien.idSpecialite.libelle,
            }
            for lien in liens
        ]

    def get_createur_detail(self, obj):
        if obj.idUtilisateurCreateur:
            return {
                'id': str(obj.idUtilisateurCreateur.id),
                'nom': obj.idUtilisateurCreateur.nom,
                'prenom': obj.idUtilisateurCreateur.prenom,
            }
        return None


class CreateSousTraitantSerializer(serializers.Serializer):
    raisonSociale = serializers.CharField(max_length=200)
    ICE = serializers.CharField(max_length=50, required=False, allow_null=True, allow_blank=True)
    contactPrincipalNom = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    contactPrincipalTel = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')
    contactPrincipalEmail = serializers.CharField(max_length=150)
    contactTechniqueNom = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    contactTechniqueTel = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')
    contactTechniqueEmail = serializers.CharField(
        max_length=150, required=False, allow_null=True, allow_blank=True
    )
    numeroContrat = serializers.CharField(
        max_length=100, required=False, allow_null=True, allow_blank=True
    )
    tarifHoraireNormal = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    tarifHoraireSemaine = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    habilitations = serializers.CharField(
        max_length=5000, required=False, allow_null=True, allow_blank=True
    )
    adresse = serializers.CharField(
        max_length=5000, required=False, allow_null=True, allow_blank=True
    )

    def validate(self, data):
        errors = []

        # raisonSociale
        raison = data.get('raisonSociale', '').strip()
        if len(raison) < 2:
            errors.append({'champ': 'raisonSociale', 'message': 'Doit contenir entre 2 et 200 caractères'})
        data['raisonSociale'] = raison

        # Unicité raisonSociale — on stocke le flag, le view gère le 409
        existing = SousTraitant.objects.filter(
            raisonSociale__iexact=raison.strip()
        ).first()
        exclude_id = self.context.get('exclude_id')
        if existing and (not exclude_id or str(existing.id) != str(exclude_id)):
            data['_doublon_raison_sociale'] = existing

        # contactPrincipalNom (optional)
        cpn = data.get('contactPrincipalNom', '').strip()
        if cpn and len(cpn) < 2:
            errors.append({'champ': 'contactPrincipalNom', 'message': 'Doit contenir entre 2 et 100 caractères'})

        # contactPrincipalTel (optional)
        cpt = data.get('contactPrincipalTel', '').strip()
        if cpt and not PHONE_REGEX.match(cpt):
            errors.append({'champ': 'contactPrincipalTel', 'message': 'Format de téléphone invalide'})

        # contactPrincipalEmail
        cpe = data.get('contactPrincipalEmail', '').strip().lower()
        if not EMAIL_REGEX.match(cpe):
            errors.append({'champ': 'contactPrincipalEmail', 'message': 'Format email invalide'})
        data['contactPrincipalEmail'] = cpe

        # contactTechniqueNom (optional)
        ctn = data.get('contactTechniqueNom', '').strip()
        if ctn and len(ctn) < 2:
            errors.append({'champ': 'contactTechniqueNom', 'message': 'Doit contenir entre 2 et 100 caractères'})

        # contactTechniqueTel (optional)
        ctt = data.get('contactTechniqueTel', '').strip()
        if ctt and not PHONE_REGEX.match(ctt):
            errors.append({'champ': 'contactTechniqueTel', 'message': 'Format de téléphone invalide'})

        # contactTechniqueEmail (optional)
        cte = data.get('contactTechniqueEmail')
        if cte and cte.strip():
            cte = cte.strip().lower()
            if not EMAIL_REGEX.match(cte):
                errors.append({'champ': 'contactTechniqueEmail', 'message': 'Format email invalide'})
            data['contactTechniqueEmail'] = cte

        # ICE (optional)
        ICE = data.get('ICE')
        if ICE and ICE.strip():
            ICE = ICE.strip()
            if not ICE_REGEX.match(ICE):
                errors.append({'champ': 'ICE', 'message': 'Doit contenir entre 9 et 14 chiffres'})
            data['ICE'] = ICE

        # numeroContrat (optional)
        nc = data.get('numeroContrat')
        if nc and nc.strip():
            if len(nc.strip()) > 100:
                errors.append({'champ': 'numeroContrat', 'message': 'Maximum 100 caractères'})

        # habilitations (optional)
        hab = data.get('habilitations')
        if hab and len(hab) > 5000:
            errors.append({'champ': 'habilitations', 'message': 'Maximum 5000 caractères'})

        # Tarifs
        tarif_normal = data.get('tarifHoraireNormal')
        tarif_semaine = data.get('tarifHoraireSemaine')

        if tarif_normal is not None:
            if tarif_normal <= 0:
                errors.append({'champ': 'tarifHoraireNormal', 'message': 'Doit être supérieur à 0'})
            elif tarif_normal > Decimal('99999.99'):
                errors.append({'champ': 'tarifHoraireNormal', 'message': 'Maximum 99999.99'})

        if tarif_semaine is not None:
            if tarif_semaine <= 0:
                errors.append({'champ': 'tarifHoraireSemaine', 'message': 'Doit être supérieur à 0'})
            elif tarif_semaine > Decimal('99999.99'):
                errors.append({'champ': 'tarifHoraireSemaine', 'message': 'Maximum 99999.99'})

        # tarifHoraireSemaine sans tarifHoraireNormal
        if tarif_semaine is not None and tarif_normal is None:
            # Check context for existing tarif (update case)
            existing_tarif_normal = self.context.get('existing_tarif_normal')
            if existing_tarif_normal is not None:
                if tarif_semaine < existing_tarif_normal:
                    errors.append({
                        'champ': 'tarifHoraireSemaine',
                        'message': f'Doit être >= tarifHoraireNormal ({existing_tarif_normal} MAD/h)'
                    })
            else:
                errors.append({
                    'champ': 'tarifHoraireSemaine',
                    'message': 'Le tarif weekend/nuit ne peut pas être défini sans tarif normal'
                })

        # Cohérence: tarifHoraireSemaine >= tarifHoraireNormal
        if tarif_normal is not None and tarif_semaine is not None:
            if tarif_normal > 0 and tarif_semaine > 0 and tarif_semaine < tarif_normal:
                errors.append({
                    'champ': 'tarifHoraireSemaine',
                    'message': 'Le tarif weekend/nuit ne peut pas être inférieur au tarif normal'
                })

        if errors:
            raise serializers.ValidationError({
                'erreur': 'VALIDATION_ECHEC',
                'details': errors,
            })

        return data


class UpdateSousTraitantSerializer(CreateSousTraitantSerializer):
    """Same validations as create, with context for existing data."""
    pass


class ChangeStatutSerializer(serializers.Serializer):
    statut = serializers.ChoiceField(choices=['actif', 'inactif', 'suspendu'])
    motif = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate(self, data):
        statut = data.get('statut')
        motif = data.get('motif', '').strip()

        if statut == 'suspendu' and not motif:
            raise serializers.ValidationError({
                'erreur': 'MOTIF_SUSPENSION_OBLIGATOIRE',
                'message': 'Le motif est obligatoire pour une suspension',
                'details': [{'champ': 'motif', 'message': 'Le motif est obligatoire pour la transition vers suspendu'}],
            })

        data['motif'] = motif
        return data


class SousTraitantSpecialiteSerializer(serializers.ModelSerializer):
    specialite_detail = serializers.SerializerMethodField()

    class Meta:
        model = SousTraitantSpecialite
        fields = ['id', 'idSousTraitant', 'idSpecialite', 'dateAttribution', 'specialite_detail']
        read_only_fields = ['id', 'dateAttribution']

    def get_specialite_detail(self, obj):
        return {
            'id': str(obj.idSpecialite.id),
            'code': obj.idSpecialite.code,
            'libelle': obj.idSpecialite.libelle,
        }


class AddSpecialiteSerializer(serializers.Serializer):
    idSpecialite = serializers.UUIDField()

    def validate_idSpecialite(self, value):
        # Validation is done in the view to handle different HTTP status codes
        return value


class SousTraitantListSerializer(serializers.ModelSerializer):
    """Serializer enrichi pour la liste GET."""
    specialites = serializers.SerializerMethodField()
    nbInterventionsTotal = serializers.SerializerMethodField()
    nbInterventionsEnCours = serializers.SerializerMethodField()
    evaluationMoyenne = serializers.SerializerMethodField()
    createur_detail = serializers.SerializerMethodField()

    class Meta:
        model = SousTraitant
        fields = '__all__'

    def get_specialites(self, obj):
        liens = obj.specialites.select_related('idSpecialite').all()
        return [
            {
                'id': str(lien.idSpecialite.id),
                'code': lien.idSpecialite.code,
                'libelle': lien.idSpecialite.libelle,
            }
            for lien in liens
        ]

    def get_nbInterventionsTotal(self, obj):
        # TODO: Compter les AffectationEquipe liées quand Phase 6 sera implémentée
        return 0

    def get_nbInterventionsEnCours(self, obj):
        # TODO: Compter les AffectationEquipe avec statut EN_COURS
        return 0

    def get_evaluationMoyenne(self, obj):
        # TODO: Calculer quand Phase 6 sera implémentée
        return None

    def get_createur_detail(self, obj):
        if obj.idUtilisateurCreateur:
            return {
                'id': str(obj.idUtilisateurCreateur.id),
                'nom': obj.idUtilisateurCreateur.nom,
                'prenom': obj.idUtilisateurCreateur.prenom,
            }
        return None
