from apps.securite.permissions import IsSessionActive
from apps.securite.audit_utils import log_audit
from apps.securite.models import Utilisateur
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    Societe, Site, Secteur, Unite,
    Specialite, Equipe, EquipeUtilisateur,
    AppartenanceOrganisationnelle
)
from .serializers import (
    SocieteSerializer, SocieteArborescenceSerializer,
    SiteSerializer, SecteurSerializer, UniteSerializer,
    SpecialiteSerializer, EquipeSerializer,
    EquipeUtilisateurSerializer,
    AppartenanceOrganisationnelleSerializer
)


class SocieteViewSet(ModelViewSet):
    queryset = Societe.objects.all()
    serializer_class = SocieteSerializer
    permission_classes = [IsAuthenticated, IsSessionActive]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['estActif']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(self.request, 'CREATE', 'ORGANISATION', 'Societe', instance.id,
                  nouvelle_valeur={'code': instance.code, 'raisonSociale': instance.raisonSociale})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'code': old_instance.code, 'raisonSociale': old_instance.raisonSociale, 'estActif': old_instance.estActif}
        instance = serializer.save()
        new_data = {'code': instance.code, 'raisonSociale': instance.raisonSociale, 'estActif': instance.estActif}
        log_audit(self.request, 'UPDATE', 'ORGANISATION', 'Societe', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ORGANISATION', 'Societe', instance.id,
                  ancienne_valeur={'code': instance.code, 'raisonSociale': instance.raisonSociale})
        instance.delete()

    @action(detail=True, methods=['get'], url_path='arborescence')
    def arborescence(self, request, pk=None):
        societe = self.get_object()
        serializer = SocieteArborescenceSerializer(societe)
        return Response(serializer.data)


class SiteViewSet(ModelViewSet):
    queryset = Site.objects.select_related('societe').all()
    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated, IsSessionActive]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['societe', 'estActif']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(self.request, 'CREATE', 'ORGANISATION', 'Site', instance.id,
                  nouvelle_valeur={'code': instance.code, 'libelle': instance.libelle})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'code': old_instance.code, 'libelle': old_instance.libelle, 'estActif': old_instance.estActif}
        instance = serializer.save()
        new_data = {'code': instance.code, 'libelle': instance.libelle, 'estActif': instance.estActif}
        log_audit(self.request, 'UPDATE', 'ORGANISATION', 'Site', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ORGANISATION', 'Site', instance.id,
                  ancienne_valeur={'code': instance.code, 'libelle': instance.libelle})
        instance.delete()


class SecteurViewSet(ModelViewSet):
    queryset = Secteur.objects.select_related('site__societe').all()
    serializer_class = SecteurSerializer
    permission_classes = [IsAuthenticated, IsSessionActive]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['site', 'estActif']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(self.request, 'CREATE', 'ORGANISATION', 'Secteur', instance.id,
                  nouvelle_valeur={'code': instance.code, 'libelle': instance.libelle})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'code': old_instance.code, 'libelle': old_instance.libelle, 'estActif': old_instance.estActif}
        instance = serializer.save()
        new_data = {'code': instance.code, 'libelle': instance.libelle, 'estActif': instance.estActif}
        log_audit(self.request, 'UPDATE', 'ORGANISATION', 'Secteur', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ORGANISATION', 'Secteur', instance.id,
                  ancienne_valeur={'code': instance.code, 'libelle': instance.libelle})
        instance.delete()


class UniteViewSet(ModelViewSet):
    queryset = Unite.objects.select_related('secteur__site__societe').all()
    serializer_class = UniteSerializer
    permission_classes = [IsAuthenticated, IsSessionActive]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['secteur', 'estActif']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(self.request, 'CREATE', 'ORGANISATION', 'Unite', instance.id,
                  nouvelle_valeur={'code': instance.code, 'libelle': instance.libelle})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'code': old_instance.code, 'libelle': old_instance.libelle, 'estActif': old_instance.estActif}
        instance = serializer.save()
        new_data = {'code': instance.code, 'libelle': instance.libelle, 'estActif': instance.estActif}
        log_audit(self.request, 'UPDATE', 'ORGANISATION', 'Unite', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ORGANISATION', 'Unite', instance.id,
                  ancienne_valeur={'code': instance.code, 'libelle': instance.libelle})
        instance.delete()


class SpecialiteViewSet(ModelViewSet):
    queryset = Specialite.objects.all()
    serializer_class = SpecialiteSerializer
    permission_classes = [IsAuthenticated, IsSessionActive]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['estActif']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(self.request, 'CREATE', 'ORGANISATION', 'Specialite', instance.id,
                  nouvelle_valeur={'libelle': instance.libelle})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'libelle': old_instance.libelle, 'estActif': old_instance.estActif}
        instance = serializer.save()
        new_data = {'libelle': instance.libelle, 'estActif': instance.estActif}
        log_audit(self.request, 'UPDATE', 'ORGANISATION', 'Specialite', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ORGANISATION', 'Specialite', instance.id,
                  ancienne_valeur={'libelle': instance.libelle})
        instance.delete()


class EquipeViewSet(ModelViewSet):
    queryset = Equipe.objects.select_related(
        'site', 'specialite', 'chefEquipe'
    ).prefetch_related('membres').all()
    serializer_class = EquipeSerializer
    permission_classes = [IsAuthenticated, IsSessionActive]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['site', 'specialite', 'estActif']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(self.request, 'CREATE', 'ORGANISATION', 'Equipe', instance.id,
                  nouvelle_valeur={'libelle': instance.libelle, 'site_id': str(instance.site.id)})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'libelle': old_instance.libelle, 'estActif': old_instance.estActif}
        instance = serializer.save()
        new_data = {'libelle': instance.libelle, 'estActif': instance.estActif}
        log_audit(self.request, 'UPDATE', 'ORGANISATION', 'Equipe', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ORGANISATION', 'Equipe', instance.id,
                  ancienne_valeur={'libelle': instance.libelle})
        instance.delete()

    @action(detail=False, methods=['get'], url_path='techniciens')
    def techniciens(self, request):
        """Liste tous les utilisateurs appartenant à une équipe active."""
        user_ids = EquipeUtilisateur.objects.filter(
            estActif=True
        ).values_list('utilisateur_id', flat=True).distinct()

        techniciens = Utilisateur.objects.filter(
            id__in=user_ids,
            est_actif=True
        ).order_by('prenom', 'nom')

        data = [{
            'id': str(u.id),
            'nom_utilisateur': u.nom_utilisateur,
            'prenom': u.prenom,
            'nom': u.nom,
            'nom_complet': f"{u.prenom or ''} {u.nom or ''}".strip() or u.nom_utilisateur,
        } for u in techniciens]

        return Response(data)


class EquipeUtilisateurViewSet(ModelViewSet):
    queryset = EquipeUtilisateur.objects.select_related(
        'equipe', 'utilisateur'
    ).all()
    serializer_class = EquipeUtilisateurSerializer
    permission_classes = [IsAuthenticated, IsSessionActive]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['equipe', 'utilisateur', 'niveauRole', 'estActif']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(self.request, 'CREATE', 'ORGANISATION', 'EquipeUtilisateur', instance.id,
                  nouvelle_valeur={'equipe_id': str(instance.equipe.id), 'utilisateur_id': str(instance.utilisateur.id), 
                                   'niveauRole': instance.niveauRole, 'estActif': instance.estActif})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'niveauRole': old_instance.niveauRole, 'estActif': old_instance.estActif}
        instance = serializer.save()
        new_data = {'niveauRole': instance.niveauRole, 'estActif': instance.estActif}
        log_audit(self.request, 'UPDATE', 'ORGANISATION', 'EquipeUtilisateur', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ORGANISATION', 'EquipeUtilisateur', instance.id,
                  ancienne_valeur={'niveauRole': instance.niveauRole, 'estActif': instance.estActif})
        instance.delete()


class AppartenanceOrganisationnelleViewSet(ModelViewSet):
    queryset = AppartenanceOrganisationnelle.objects.select_related(
        'utilisateur', 'societe', 'site', 'secteur'
    ).prefetch_related('unites').all()
    serializer_class = AppartenanceOrganisationnelleSerializer
    permission_classes = [IsAuthenticated, IsSessionActive]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['utilisateur', 'societe', 'site', 'estPrincipale']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(self.request, 'CREATE', 'ORGANISATION', 'AppartenanceOrganisationnelle', instance.id,
                  nouvelle_valeur={'utilisateur_id': str(instance.utilisateur.id), 'estPrincipale': instance.estPrincipale, 'site_id': str(instance.site.id)})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'estPrincipale': old_instance.estPrincipale}
        instance = serializer.save()
        new_data = {'estPrincipale': instance.estPrincipale}
        log_audit(self.request, 'UPDATE', 'ORGANISATION', 'AppartenanceOrganisationnelle', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ORGANISATION', 'AppartenanceOrganisationnelle', instance.id,
                  ancienne_valeur={'utilisateur_id': str(instance.utilisateur.id), 'estPrincipale': instance.estPrincipale})
        instance.delete()