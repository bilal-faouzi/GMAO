import uuid
from decimal import Decimal
from datetime import datetime

from django.db import IntegrityError
from django.db.models import Q
from django.utils import timezone as dj_timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.securite.models import JournalAudit, UtilisateurRole
from apps.securite.permissions  import IsSessionActive
from apps.securite.audit_utils import log_audit, get_client_ip
from apps.organisation.models import Specialite

from .models import SousTraitant, SousTraitantSpecialite
from .serializers import (
    SousTraitantSerializer,
    SousTraitantListSerializer,
    CreateSousTraitantSerializer,
    UpdateSousTraitantSerializer,
    ChangeStatutSerializer,
    SousTraitantSpecialiteSerializer,
    AddSpecialiteSerializer,
)


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def get_user_roles(user):
    """Retourne la liste des codes de rôles de l'utilisateur."""
    return list(
        UtilisateurRole.objects.filter(
            id_utilisateur=user
        ).select_related('id_role').values_list('id_role__code', flat=True)
    )


def check_roles(user, allowed_roles):
    """Vérifie que l'utilisateur a au moins un des rôles autorisés.
    Les superutilisateurs et staff ont accès à tout."""
    if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
        return True
    user_roles = get_user_roles(user)
    return any(role in allowed_roles for role in user_roles)


def forbidden_response():
    return Response(
        {'succes': False, 'erreur': 'ACCES_REFUSE', 'message': 'Accès refusé'},
        status=status.HTTP_403_FORBIDDEN,
    )


def validate_uuid(value):
    """Retourne True si la valeur est un UUID valide."""
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, AttributeError):
        return False


def bad_uuid_response():
    return Response(
        {'succes': False, 'erreur': 'UUID_INVALIDE', 'message': 'Identifiant UUID malformé'},
        status=status.HTTP_400_BAD_REQUEST,
    )


def sous_traitant_to_dict(st):
    """Convertit un SousTraitant en dict pour l'audit."""
    return {
        'id': str(st.id),
        'raisonSociale': st.raisonSociale,
        'ICE': st.ICE,
        'adresse': st.adresse,
        'contactPrincipalNom': st.contactPrincipalNom,
        'contactPrincipalTel': st.contactPrincipalTel,
        'contactPrincipalEmail': st.contactPrincipalEmail,
        'contactTechniqueNom': st.contactTechniqueNom,
        'contactTechniqueTel': st.contactTechniqueTel,
        'contactTechniqueEmail': st.contactTechniqueEmail,
        'numeroContrat': st.numeroContrat,
        'tarifHoraireNormal': str(st.tarifHoraireNormal) if st.tarifHoraireNormal else None,
        'tarifHoraireSemaine': str(st.tarifHoraireSemaine) if st.tarifHoraireSemaine else None,
        'habilitations': st.habilitations,
        'statut': st.statut,
        'estActif': st.estActif,
    }


# ─── VIEWSET ─────────────────────────────────────────────────────────────────

class SousTraitantViewSet(viewsets.ModelViewSet):
    queryset = SousTraitant.objects.select_related('idUtilisateurCreateur').prefetch_related(
        'specialites__idSpecialite'
    ).all()
    serializer_class = SousTraitantSerializer
    permission_classes = [IsAuthenticated, IsSessionActive]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['statut', 'estActif']
    search_fields = ['raisonSociale', 'ICE', 'contactPrincipalNom']
    ordering_fields = ['raisonSociale', 'statut', 'dateCreation', 'tarifHoraireNormal']
    ordering = ['raisonSociale']

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateSousTraitantSerializer
        elif self.action in ('update', 'partial_update'):
            return UpdateSousTraitantSerializer
        elif self.action == 'list':
            return SousTraitantListSerializer
        return SousTraitantSerializer

    # ─── LIST ─────────────────────────────────────────────────────────────

    def list(self, request, *args, **kwargs):
        if not check_roles(request.user, ['RESP_TECH', 'RESP_MAINT', 'DIR_TECH', 'ADMIN', 'AD']):
            return forbidden_response()

        qs = self.filter_queryset(self.get_queryset())

        # Filtres supplémentaires non gérés par DjangoFilterBackend
        id_specialite = request.query_params.get('idSpecialite')
        if id_specialite:
            qs = qs.filter(
                specialites__idSpecialite_id=id_specialite,
                specialites__idSpecialite__estActif=True,
            )

        tarif_max = request.query_params.get('tarifMax')
        if tarif_max:
            try:
                qs = qs.filter(tarifHoraireNormal__lte=Decimal(tarif_max))
            except Exception:
                pass

        # Pagination
        try:
            page = max(1, int(request.query_params.get('page', 1)))
        except (ValueError, TypeError):
            page = 1
        try:
            limit = min(100, max(1, int(request.query_params.get('limit', 20))))
        except (ValueError, TypeError):
            limit = 20

        total = qs.count()
        total_pages = max(1, (total + limit - 1) // limit)
        start = (page - 1) * limit
        end = start + limit

        serializer = SousTraitantListSerializer(qs.distinct()[start:end], many=True)

        return Response({
            'succes': True,
            'data': serializer.data,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'totalPages': total_pages,
            }
        })

    # ─── CREATE ───────────────────────────────────────────────────────────

    def create(self, request, *args, **kwargs):
        if not check_roles(request.user, ['RESP_MAINT', 'ADMIN', 'AD']):
            return forbidden_response()

        if not request.data:
            return Response(
                {'succes': False, 'erreur': 'VALIDATION_ECHEC', 'message': 'Le corps de la requête ne peut pas être vide'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CreateSousTraitantSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'succes': False, 'erreur': 'VALIDATION_ECHEC', 'message': 'Erreur de validation', 'details': serializer.errors},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        data = serializer.validated_data

        doublon = data.pop('_doublon_raison_sociale', None)
        if doublon:
            return Response(
                {
                    'succes': False,
                    'erreur': 'RAISON_SOCIALE_DEJA_EXISTANTE',
                    'message': f'Un sous-traitant avec cette raison sociale existe déjà (id: {doublon.id})',
                },
                status=status.HTTP_409_CONFLICT,
            )

        try:
            st = SousTraitant.objects.create(
                raisonSociale=data['raisonSociale'],
                ICE=data.get('ICE') or None,
                adresse=data.get('adresse', ''),
                contactPrincipalNom=data.get('contactPrincipalNom', ''),
                contactPrincipalTel=data.get('contactPrincipalTel', ''),
                contactPrincipalEmail=data['contactPrincipalEmail'],
                contactTechniqueNom=data.get('contactTechniqueNom', ''),
                contactTechniqueTel=data.get('contactTechniqueTel', ''),
                contactTechniqueEmail=data.get('contactTechniqueEmail') or None,
                numeroContrat=data.get('numeroContrat') or None,
                tarifHoraireNormal=data.get('tarifHoraireNormal'),
                tarifHoraireSemaine=data.get('tarifHoraireSemaine'),
                habilitations=data.get('habilitations') or None,
                statut='actif',
                estActif=True,
                idUtilisateurCreateur=request.user,
            )
        except IntegrityError:
            existing = SousTraitant.objects.filter(
                raisonSociale__iexact=data['raisonSociale'].strip()
            ).first()
            return Response(
                {
                    'succes': False,
                    'erreur': 'RAISON_SOCIALE_DEJA_EXISTANTE',
                    'message': f'Un sous-traitant avec cette raison sociale existe déjà (id: {existing.id if existing else "inconnu"})',
                },
                status=status.HTTP_409_CONFLICT,
            )

        log_audit(request, 'CREATE', 'SOUS_TRAITANCE', 'SousTraitant', st.id,
                  nouvelle_valeur=sous_traitant_to_dict(st))

        return Response(
            {
                'succes': True,
                'data': SousTraitantSerializer(st).data,
                'message': 'Sous-traitant créé avec succès',
            },
            status=status.HTTP_201_CREATED,
        )

    # ─── RETRIEVE ─────────────────────────────────────────────────────────

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        if not validate_uuid(pk):
            return bad_uuid_response()
        if not check_roles(request.user, ['RESP_TECH', 'RESP_MAINT', 'DIR_TECH', 'ADMIN', 'AD']):
            return forbidden_response()

        try:
            st = self.get_queryset().get(id=pk)
        except SousTraitant.DoesNotExist:
            return Response(
                {'succes': False, 'erreur': 'SOUS_TRAITANT_INTROUVABLE', 'message': 'Sous-traitant non trouvé'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({'succes': True, 'data': SousTraitantSerializer(st).data})

    # ─── UPDATE ───────────────────────────────────────────────────────────

    def update(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        if not validate_uuid(pk):
            return bad_uuid_response()
        if not check_roles(request.user, ['RESP_MAINT', 'ADMIN', 'AD']):
            return forbidden_response()

        if not request.data:
            return Response(
                {'succes': False, 'erreur': 'VALIDATION_ECHEC', 'message': 'Le corps de la requête ne peut pas être vide'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            st = self.get_queryset().get(id=pk)
        except SousTraitant.DoesNotExist:
            return Response(
                {'succes': False, 'erreur': 'SOUS_TRAITANT_INTROUVABLE', 'message': 'Sous-traitant non trouvé'},
                status=status.HTTP_404_NOT_FOUND,
            )

        ancienne_valeur = sous_traitant_to_dict(st)

        context = {
            'exclude_id': str(st.id),
            'existing_tarif_normal': st.tarifHoraireNormal,
        }
        incoming_tarif_normal = request.data.get('tarifHoraireNormal')
        if incoming_tarif_normal is None and st.tarifHoraireNormal:
            context['existing_tarif_normal'] = st.tarifHoraireNormal

        serializer = UpdateSousTraitantSerializer(data=request.data, context=context)
        if not serializer.is_valid():
            return Response(
                {'succes': False, 'erreur': 'VALIDATION_ECHEC', 'message': 'Erreur de validation', 'details': serializer.errors},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        data = serializer.validated_data

        doublon = data.pop('_doublon_raison_sociale', None)
        if doublon:
            return Response(
                {
                    'succes': False,
                    'erreur': 'RAISON_SOCIALE_DEJA_EXISTANTE',
                    'message': f'Un sous-traitant avec cette raison sociale existe déjà (id: {doublon.id})',
                },
                status=status.HTTP_409_CONFLICT,
            )

        st.raisonSociale = data['raisonSociale']
        st.ICE = data.get('ICE') or None
        st.adresse = data.get('adresse', '')
        st.contactPrincipalNom = data.get('contactPrincipalNom', '')
        st.contactPrincipalTel = data.get('contactPrincipalTel', '')
        st.contactPrincipalEmail = data['contactPrincipalEmail']
        st.contactTechniqueNom = data.get('contactTechniqueNom', '')
        st.contactTechniqueTel = data.get('contactTechniqueTel', '')
        st.contactTechniqueEmail = data.get('contactTechniqueEmail') or None
        st.numeroContrat = data.get('numeroContrat') or None
        st.tarifHoraireNormal = data.get('tarifHoraireNormal')
        st.tarifHoraireSemaine = data.get('tarifHoraireSemaine')
        st.habilitations = data.get('habilitations') or None

        if st.tarifHoraireNormal and st.tarifHoraireSemaine:
            if st.tarifHoraireSemaine < st.tarifHoraireNormal:
                return Response(
                    {
                        'succes': False,
                        'erreur': 'VALIDATION_ECHEC',
                        'message': 'Le tarif weekend/nuit ne peut pas être inférieur au tarif normal',
                        'details': [{
                            'champ': 'tarifHoraireSemaine',
                            'message': f'Doit être >= tarifHoraireNormal ({st.tarifHoraireNormal} MAD/h)',
                        }],
                    },
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )

        try:
            st.save()
        except IntegrityError:
            return Response(
                {
                    'succes': False,
                    'erreur': 'RAISON_SOCIALE_DEJA_EXISTANTE',
                    'message': 'Un sous-traitant avec cette raison sociale existe déjà',
                },
                status=status.HTTP_409_CONFLICT,
            )

        nouvelle_valeur = sous_traitant_to_dict(st)
        champs_modifies = {}
        for key in ancienne_valeur:
            if ancienne_valeur[key] != nouvelle_valeur.get(key):
                champs_modifies[key] = {
                    'avant': ancienne_valeur[key],
                    'apres': nouvelle_valeur.get(key),
                }

        log_audit(request, 'UPDATE', 'SOUS_TRAITANCE', 'SousTraitant', st.id,
                  ancienne_valeur=ancienne_valeur,
                  nouvelle_valeur={'champs_modifies': champs_modifies})

        response_data = {            'succes': True,
            'data': SousTraitantSerializer(st).data,
            'message': 'Sous-traitant mis à jour avec succès',
        }

        tarif_changed = (
            ancienne_valeur.get('tarifHoraireNormal') != nouvelle_valeur.get('tarifHoraireNormal') or
            ancienne_valeur.get('tarifHoraireSemaine') != nouvelle_valeur.get('tarifHoraireSemaine')
        )
        if tarif_changed:
            response_data['avertissements'] = [
                'Le tarif a été mis à jour. Les coûts des affectations en cours ne sont pas recalculés.'
            ]

        return Response(response_data)

    # ─── DESTROY ──────────────────────────────────────────────────────────

    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        if not validate_uuid(pk):
            return bad_uuid_response()
        if not check_roles(request.user, ['RESP_MAINT', 'ADMIN', 'AD']):
            return forbidden_response()

        try:
            st = self.get_queryset().get(id=pk)
        except SousTraitant.DoesNotExist:
            return Response(
                {'succes': False, 'erreur': 'SOUS_TRAITANT_INTROUVABLE', 'message': 'Sous-traitant non trouvé'},
                status=status.HTTP_404_NOT_FOUND,
            )

        ancienne_valeur = sous_traitant_to_dict(st)
        SousTraitantSpecialite.objects.filter(idSousTraitant=st).delete()
        st.delete()

        log_audit(
            request=request,
            action_name='DELETE',
            type_entite='SousTraitant',

            module_name='SousTraitant',  # This matches the missing argument in the error
            id_entite=st.id,
            ancienne_valeur=ancienne_valeur
        )

        return Response(
            {'succes': True, 'message': 'Sous-traitant supprimé avec succès'},
            status=status.HTTP_200_OK,
        )

    # ─── CHANGER STATUT ──────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='changer_statut')
    def changer_statut(self, request, pk=None):
        """POST /api/v1/soustraitants/{id}/changer_statut/"""
        if not validate_uuid(pk):
            return bad_uuid_response()
        if not check_roles(request.user, ['RESP_MAINT', 'ADMIN', 'AD']):
            return forbidden_response()

        try:
            st = SousTraitant.objects.get(id=pk)
        except SousTraitant.DoesNotExist:
            return Response(
                {'succes': False, 'erreur': 'SOUS_TRAITANT_INTROUVABLE', 'message': 'Sous-traitant non trouvé'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if 'statut' not in request.data:
            return Response(
                {
                    'succes': False,
                    'erreur': 'VALIDATION_ECHEC',
                    'message': 'Le champ statut est obligatoire',
                    'details': [{'champ': 'statut', 'message': 'Ce champ est obligatoire'}],
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        serializer = ChangeStatutSerializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            if 'non_field_errors' in errors:
                for err in errors['non_field_errors']:
                    if isinstance(err, dict) and 'erreur' in err:
                        return Response(
                            {'succes': False, **err},
                            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        )
            return Response(
                {'succes': False, 'erreur': 'VALIDATION_ECHEC', 'message': 'Erreur de validation', 'details': errors},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        nouveau_statut = serializer.validated_data['statut']
        motif = serializer.validated_data.get('motif', '')
        ancien_statut = st.statut

        if ancien_statut == nouveau_statut:
            return Response(
                {
                    'succes': False,
                    'erreur': 'TRANSITION_STATUT_INVALIDE',
                    'message': 'Statut identique',
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        st.statut = nouveau_statut
        st.estActif = (nouveau_statut == 'actif')
        st.save()

        avertissements = []

        if nouveau_statut in ('suspendu', 'inactif'):
            for lien in st.specialites.select_related('idSpecialite').all():
                spec = lien.idSpecialite
                nb_actifs = SousTraitantSpecialite.objects.filter(
                    idSpecialite=spec,
                    idSousTraitant__statut='actif',
                ).exclude(idSousTraitant=st).count()
                if nb_actifs == 0:
                    avertissements.append({
                        'message': f'Attention : ce sous-traitant est le seul prestataire actif pour la spécialité {spec.libelle}. Aucun sous-traitant de remplacement disponible.',
                    })

        log_audit(request, 'STATUT_CHANGE', 'SousTraitant', st.id,
                  ancienne_valeur={'statut': ancien_statut},
                  nouvelle_valeur={
                      'ancienStatut': ancien_statut,
                      'nouveauStatut': nouveau_statut,
                      'motif': motif,
                      'affectationsImpactees': avertissements,
                  })

        response_data = {
            'succes': True,
            'message': 'Statut mis à jour',
            'statut': nouveau_statut,
        }
        if avertissements:
            response_data['avertissements'] = avertissements

        return Response(response_data)

    # ─── SPÉCIALITÉS (GET + POST) ────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='specialites')
    def specialites_action(self, request, pk=None):
        """GET/POST /api/v1/soustraitants/{id}/specialites/"""
        if not validate_uuid(pk):
            return bad_uuid_response()

        if request.method == 'GET':
            if not check_roles(request.user, ['RESP_TECH', 'RESP_MAINT', 'DIR_TECH']):
                return forbidden_response()

            if not SousTraitant.objects.filter(id=pk).exists():
                return Response(
                    {'succes': False, 'erreur': 'SOUS_TRAITANT_INTROUVABLE', 'message': 'Sous-traitant non trouvé'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            liens = SousTraitantSpecialite.objects.filter(
                idSousTraitant_id=pk
            ).select_related('idSpecialite')

            return Response({
                'succes': True,
                'data': SousTraitantSpecialiteSerializer(liens, many=True).data,
            })

        # POST
        if not check_roles(request.user, ['RESP_MAINT', 'ADMIN', 'AD']):
            return forbidden_response()

        try:
            st = SousTraitant.objects.get(id=pk)
        except SousTraitant.DoesNotExist:
            return Response(
                {'succes': False, 'erreur': 'SOUS_TRAITANT_INTROUVABLE', 'message': 'Sous-traitant non trouvé'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AddSpecialiteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'succes': False, 'erreur': 'VALIDATION_ECHEC', 'message': 'Erreur de validation', 'details': serializer.errors},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        id_specialite = serializer.validated_data['idSpecialite']

        try:
            specialite = Specialite.objects.get(id=id_specialite)
        except Specialite.DoesNotExist:
            return Response(
                {'succes': False, 'erreur': 'SPECIALITE_INTROUVABLE', 'message': 'Spécialité non trouvée'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not specialite.estActif:
            return Response(
                {'succes': False, 'erreur': 'SPECIALITE_INACTIVE', 'message': 'Cette spécialité est archivée et ne peut pas être assignée'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if SousTraitantSpecialite.objects.filter(idSousTraitant=st, idSpecialite_id=id_specialite).exists():
            return Response(
                {'succes': False, 'erreur': 'SPECIALITE_DEJA_ASSIGNEE', 'message': 'Ce sous-traitant possède déjà cette spécialité'},
                status=status.HTTP_409_CONFLICT,
            )

        lien = SousTraitantSpecialite.objects.create(
            idSousTraitant=st,
            idSpecialite_id=id_specialite,
        )

        log_audit(request, 'SPECIALITE_AJOUTEE', 'SousTraitantSpecialite', lien.id,
                  nouvelle_valeur={
                      'idSousTraitant': str(st.id),
                      'idSpecialite': str(id_specialite),
                  })

        return Response(
            {
                'succes': True,
                'data': SousTraitantSpecialiteSerializer(lien).data,
                'message': 'Spécialité ajoutée avec succès',
            },
            status=status.HTTP_201_CREATED,
        )

    # ─── SUPPRIMER SPÉCIALITÉ ─────────────────────────────────────────────

    @action(detail=True, methods=['delete'], url_path=r'specialites/(?P<id_specialite>[^/.]+)')
    def supprimer_specialite(self, request, pk=None, id_specialite=None):
        """DELETE /api/v1/soustraitants/{id}/specialites/{id_specialite}/"""
        if not validate_uuid(pk) or not validate_uuid(id_specialite):
            return bad_uuid_response()
        if not check_roles(request.user, ['RESP_MAINT', 'ADMIN', 'AD']):
            return forbidden_response()

        try:
            st = SousTraitant.objects.get(id=pk)
        except SousTraitant.DoesNotExist:
            return Response(
                {'succes': False, 'erreur': 'SOUS_TRAITANT_INTROUVABLE', 'message': 'Sous-traitant non trouvé'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            lien = SousTraitantSpecialite.objects.get(
                idSousTraitant=st, idSpecialite_id=id_specialite
            )
        except SousTraitantSpecialite.DoesNotExist:
            return Response(
                {'succes': False, 'erreur': 'SPECIALITE_INTROUVABLE', 'message': 'Cette spécialité n\'est pas assignée à ce sous-traitant'},
                status=status.HTTP_404_NOT_FOUND,
            )

        avertissements = []
        lien.delete()

        remaining = SousTraitantSpecialite.objects.filter(idSousTraitant=st).count()
        if remaining == 0:
            avertissements.append("Ce sous-traitant n'a plus aucune spécialité assignée")

        log_audit(request, 'SOUS_TRAITANT_SPECIALITE_SUPPRIMEE', 'SousTraitantSpecialite',
                  uuid.UUID(str(id_specialite)),
                  ancienne_valeur={
                      'idSousTraitant': str(st.id),
                      'idSpecialite': str(id_specialite),
                  })

        response_data = {
            'succes': True,
            'message': 'Spécialité retirée avec succès',
        }
        if avertissements:
            response_data['avertissements'] = avertissements

        return Response(response_data)

    # ─── DISPONIBLES ──────────────────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        """GET /api/v1/soustraitants/disponibles/"""
        if not check_roles(request.user, ['RESP_TECH', 'RESP_MAINT']):
            return forbidden_response()

        id_specialite = request.query_params.get('idSpecialite')
        date_debut_str = request.query_params.get('dateDebut')
        date_fin_str = request.query_params.get('dateFin')

        missing = []
        if not id_specialite:
            missing.append({'champ': 'idSpecialite', 'message': 'Ce paramètre est obligatoire'})
        if not date_debut_str:
            missing.append({'champ': 'dateDebut', 'message': 'Ce paramètre est obligatoire'})
        if not date_fin_str:
            missing.append({'champ': 'dateFin', 'message': 'Ce paramètre est obligatoire'})

        if missing:
            return Response(
                {
                    'succes': False,
                    'erreur': 'VALIDATION_ECHEC',
                    'message': 'Paramètres obligatoires manquants',
                    'details': missing,
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if not validate_uuid(id_specialite):
            return bad_uuid_response()

        try:
            Specialite.objects.get(id=id_specialite)
        except Specialite.DoesNotExist:
            return Response(
                {'succes': False, 'erreur': 'SPECIALITE_INTROUVABLE', 'message': 'Spécialité non trouvée'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        try:
            date_debut = datetime.fromisoformat(date_debut_str.replace('Z', '+00:00'))
            if not date_debut.tzinfo:
                date_debut = dj_timezone.make_aware(date_debut)
        except (ValueError, TypeError):
            return Response(
                {
                    'succes': False,
                    'erreur': 'VALIDATION_ECHEC',
                    'message': 'Format de date invalide. Utiliser ISO 8601 : YYYY-MM-DDTHH:mm:ss',
                    'details': [{'champ': 'dateDebut', 'message': 'Format de date invalide'}],
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        try:
            date_fin = datetime.fromisoformat(date_fin_str.replace('Z', '+00:00'))
            if not date_fin.tzinfo:
                date_fin = dj_timezone.make_aware(date_fin)
        except (ValueError, TypeError):
            return Response(
                {
                    'succes': False,
                    'erreur': 'VALIDATION_ECHEC',
                    'message': 'Format de date invalide. Utiliser ISO 8601 : YYYY-MM-DDTHH:mm:ss',
                    'details': [{'champ': 'dateFin', 'message': 'Format de date invalide'}],
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if date_debut >= date_fin:
            return Response(
                {
                    'succes': False,
                    'erreur': 'VALIDATION_ECHEC',
                    'message': 'La date de fin doit être postérieure à la date de début',
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        now = dj_timezone.now()
        if date_debut < now:
            return Response(
                {
                    'succes': False,
                    'erreur': 'VALIDATION_ECHEC',
                    'message': 'La date de début ne peut pas être dans le passé',
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        qs = SousTraitant.objects.filter(
            statut='actif',
            specialites__idSpecialite_id=id_specialite,
            specialites__idSpecialite__estActif=True,
        ).distinct()

        results = []
        for st_obj in qs:
            result = {
                'id': str(st_obj.id),
                'raisonSociale': st_obj.raisonSociale,
                'contactPrincipalNom': st_obj.contactPrincipalNom,
                'contactPrincipalTel': st_obj.contactPrincipalTel,
                'contactPrincipalEmail': st_obj.contactPrincipalEmail,
                'tarifHoraireNormal': str(st_obj.tarifHoraireNormal) if st_obj.tarifHoraireNormal else None,
                'tarifHoraireSemaine': str(st_obj.tarifHoraireSemaine) if st_obj.tarifHoraireSemaine else None,
                'conflitPlanning': False,
                'affectationsEnChevauchement': [],
            }
            # TODO: Vérifier chevauchement plannings avec AffectationEquipe (Phase 6)
            results.append(result)

        response_data = {
            'succes': True,
            'data': results,
        }

        delta = date_fin - date_debut
        if delta.days > 365:
            response_data['avertissement'] = (
                'Période supérieure à 365 jours — les données de conflit de planning '
                'peuvent être incomplètes pour les OT futurs non encore planifiés.'
            )

        return Response(response_data)

    # ─── HISTORIQUE DES INTERVENTIONS ─────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='historique-interventions')
    def historique_interventions(self, request, pk=None):
        """GET /api/v1/soustraitants/{id}/historique-interventions/"""
        if not validate_uuid(pk):
            return bad_uuid_response()
        if not check_roles(request.user, ['RESP_TECH', 'RESP_MAINT', 'DIR_TECH', 'ADMIN', 'AD']):
            return forbidden_response()

        if not SousTraitant.objects.filter(id=pk).exists():
            return Response(
                {'succes': False, 'erreur': 'SOUS_TRAITANT_INTROUVABLE', 'message': 'Sous-traitant non trouvé'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            page = max(1, int(request.query_params.get('page', 1)))
        except (ValueError, TypeError):
            page = 1
        try:
            limit = min(100, max(1, int(request.query_params.get('limit', 20))))
        except (ValueError, TypeError):
            limit = 20

        # TODO: Interroger AffectationEquipe quand Phase 6 sera implémentée
        try:
            from apps.interventions.models import AffectationEquipe
        except ImportError:
            pass  # Phase 6 pas encore disponible

        return Response({
            'succes': True,
            'data': [],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': 0,
                'totalPages': 1,
            }
        })

    # ─── STATISTIQUES ────────────────────────────────────────────────────

    @action(detail=True, methods=['get'])
    def statistiques(self, request, pk=None):
        """GET /api/v1/soustraitants/{id}/statistiques/"""
        if not validate_uuid(pk):
            return bad_uuid_response()
        if not check_roles(request.user, ['RESP_MAINT', 'DIR_TECH', 'ADMIN', 'AD']):
            return forbidden_response()

        if not SousTraitant.objects.filter(id=pk).exists():
            return Response(
                {'succes': False, 'erreur': 'SOUS_TRAITANT_INTROUVABLE', 'message': 'Sous-traitant non trouvé'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            annee = int(request.query_params.get('annee', dj_timezone.now().year))
        except (ValueError, TypeError):
            annee = dj_timezone.now().year

        debut_annee = f'{annee}-01-01'
        fin_annee = f'{annee}-12-31'

        # TODO: Calculer les stats réelles depuis AffectationEquipe (Phase 6)
        try:
            from apps.interventions.models import AffectationEquipe
        except ImportError:
            pass  # Phase 6 pas encore disponible

        stats = {
            'idSousTraitant': str(pk),
            'periode': {
                'debut': debut_annee,
                'fin': fin_annee,
            },
            'nbInterventionsTotal': 0,
            'nbInterventionsParStatut': {
                'PLANIFIEE': 0,
                'EN_COURS': 0,
                'TERMINEE': 0,
            },
            'nbInterventionsParSpecialite': [],
            'evaluations': {
                'EXCELLENT': 0,
                'BON': 0,
                'MOYEN': 0,
                'INSUFFISANT': 0,
                'nonEvaluees': 0,
                'scoreMoyen': None,
            },
            'couts': {
                'totalPrestation': 0,
                'moyenneParIntervention': 0,
                'minPrestation': 0,
                'maxPrestation': 0,
            },
            'sla': {
                'nbOTRespectsSLA': 0,
                'nbOTHorsSLA': 0,
                'tauxRespectSLA': 0,
            },
        }

        return Response({'succes': True, 'data': stats})