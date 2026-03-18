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
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['estActif']

    @action(detail=True, methods=['get'], url_path='arborescence')
    def arborescence(self, request, pk=None):
        societe = self.get_object()
        serializer = SocieteArborescenceSerializer(societe)
        return Response(serializer.data)


class SiteViewSet(ModelViewSet):
    queryset = Site.objects.select_related('societe').all()
    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['societe', 'estActif']


class SecteurViewSet(ModelViewSet):
    queryset = Secteur.objects.select_related('site__societe').all()
    serializer_class = SecteurSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['site', 'estActif']


class UniteViewSet(ModelViewSet):
    queryset = Unite.objects.select_related('secteur__site__societe').all()
    serializer_class = UniteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['secteur', 'estActif']


class SpecialiteViewSet(ModelViewSet):
    queryset = Specialite.objects.all()
    serializer_class = SpecialiteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['estActif']


class EquipeViewSet(ModelViewSet):
    queryset = Equipe.objects.select_related(
        'site', 'specialite', 'chefEquipe'
    ).prefetch_related('membres').all()
    serializer_class = EquipeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['site', 'specialite', 'estActif']


class EquipeUtilisateurViewSet(ModelViewSet):
    queryset = EquipeUtilisateur.objects.select_related(
        'equipe', 'utilisateur'
    ).all()
    serializer_class = EquipeUtilisateurSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['equipe', 'utilisateur', 'niveauRole', 'estActif']


class AppartenanceOrganisationnelleViewSet(ModelViewSet):
    queryset = AppartenanceOrganisationnelle.objects.select_related(
        'utilisateur', 'societe', 'site', 'secteur', 'unite'
    ).all()
    serializer_class = AppartenanceOrganisationnelleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['utilisateur', 'societe', 'site', 'estPrincipale']