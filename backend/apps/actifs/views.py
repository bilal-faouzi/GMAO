from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Actif, HistoriqueStatut, Indisponibilite, Remplacement
from .serializers import (
    ActifSerializer, HistoriqueStatutSerializer,
    IndisponibiliteSerializer, RemplacementSerializer
)


class ActifViewSet(viewsets.ModelViewSet):
    queryset = Actif.objects.select_related('idSite', 'idUnite').all()
    serializer_class = ActifSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['idSite', 'idUnite', 'type', 'statut', 'estActif']
    search_fields = ['code', 'libelle', 'numSerie', 'fabricant']
    ordering_fields = ['code', 'dateAcquisition', 'statut']

    @action(detail=True, methods=['post'])
    def changer_statut(self, request, pk=None):
        actif = self.get_object()
        nouveau_statut = request.data.get('nouveauStatut')
        motif = request.data.get('motif', '')

        if not nouveau_statut:
            return Response(
                {'error': 'Le champ nouveauStatut est requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valides = [c[0] for c in Actif.STATUT_CHOICES]
        if nouveau_statut not in valides:
            return Response(
                {'error': f'Statut invalide. Valeurs acceptées : {valides}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        ancien_statut = actif.statut
        actif.statut = nouveau_statut
        actif.save()

        HistoriqueStatut.objects.create(
            idActif=actif,
            ancienStatut=ancien_statut,
            nouveauStatut=nouveau_statut,
            motif=motif,
            modifiePar=getattr(request.user, 'utilisateur', None)
        )

        return Response(ActifSerializer(actif).data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total = Actif.objects.count()
        par_statut = list(Actif.objects.values('statut').annotate(nb=Count('id')))
        en_panne = Actif.objects.filter(statut='en_panne').count()
        taux_dispo = round(((total - en_panne) / total * 100), 2) if total else 0
        actifs_recents = ActifSerializer(
            Actif.objects.order_by('-created_at')[:5], many=True
        ).data

        return Response({
            'total': total,
            'par_statut': par_statut,
            'taux_disponibilite': taux_dispo,
            'actifs_recents': actifs_recents,
        })

    @action(detail=False, methods=['get'])
    def arborescence(self, request):
        racines = Actif.objects.filter(
            idParent=None, estActif=True
        ).select_related('idSite', 'idUnite')
        return Response(ActifSerializer(racines, many=True).data)


class HistoriqueStatutViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistoriqueStatut.objects.select_related('idActif', 'modifiePar').all()
    serializer_class = HistoriqueStatutSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['idActif']
    ordering_fields = ['dateChangement']


class IndisponibiliteViewSet(viewsets.ModelViewSet):
    queryset = Indisponibilite.objects.select_related('idActif').all()
    serializer_class = IndisponibiliteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['idActif', 'type', 'estTerminee']
    ordering_fields = ['dateDebut']


class RemplacementViewSet(viewsets.ModelViewSet):
    queryset = Remplacement.objects.select_related(
        'actifOriginal', 'actifRemplacant', 'effectuePar'
    ).all()
    serializer_class = RemplacementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['actifOriginal', 'actifRemplacant']
    ordering_fields = ['dateRemplacement']