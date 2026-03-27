from django.shortcuts import render

# Create your views here.
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.securite.permissions import IsSessionActive
from .models import Actif, HistoriqueStatutActif
from .serializers import (
    ActifListSerializer,
    ActifDetailSerializer,
    ActifWriteSerializer,
    ChangerStatutSerializer,
    HistoriqueStatutActifSerializer,
)


class ActifViewSet(viewsets.ModelViewSet):
    """
    CRUD complet sur les actifs + actions métier :
      - GET    /actifs/                   → liste
      - POST   /actifs/                   → créer
      - GET    /actifs/{id}/              → détail
      - PUT    /actifs/{id}/              → mise à jour complète
      - PATCH  /actifs/{id}/              → mise à jour partielle
      - DELETE /actifs/{id}/              → supprimer

      - POST   /actifs/{id}/changer_statut/   → changer le statut (enregistre historique)
      - GET    /actifs/{id}/enfants/          → sous-composants directs
      - GET    /actifs/{id}/historique/       → historique complet des statuts
      - GET    /actifs/arborescence/          → tous les actifs racines avec leurs enfants
    """

    permission_classes = [IsSessionActive]
    queryset = Actif.objects.select_related('idUnite', 'idParent').prefetch_related('enfants')

    # ------------------------------------------------------------------
    # Sélection du serializer selon l'action
    # ------------------------------------------------------------------

    def get_serializer_class(self):
        if self.action == 'list':
            return ActifListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return ActifWriteSerializer
        if self.action == 'changer_statut':
            return ChangerStatutSerializer
        return ActifDetailSerializer

    # ------------------------------------------------------------------
    # Filtres de liste
    # ------------------------------------------------------------------

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        if unite := params.get('unite'):
            qs = qs.filter(idUnite=unite)
        if parent := params.get('parent'):
            qs = qs.filter(idParent=parent)
        if params.get('racines_only') in ('true', '1'):
            qs = qs.filter(idParent__isnull=True)
        if criticite := params.get('criticite'):
            qs = qs.filter(criticite=criticite)
        if statut := params.get('statut'):
            qs = qs.filter(statut=statut)
        if type_ := params.get('type'):
            qs = qs.filter(type=type_)
        if search := params.get('search'):
            qs = qs.filter(
                Q(codeActif__icontains=search) | Q(designation__icontains=search)
            )
        return qs

    # ------------------------------------------------------------------
    # Surcharge create pour retourner le détail après création
    # ------------------------------------------------------------------

    def create(self, request, *args, **kwargs):
        write_sz = self.get_serializer(data=request.data)
        write_sz.is_valid(raise_exception=True)
        actif = write_sz.save()
        detail_sz = ActifDetailSerializer(actif, context=self.get_serializer_context())
        return Response(detail_sz.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        write_sz = self.get_serializer(instance, data=request.data, partial=partial)
        write_sz.is_valid(raise_exception=True)
        actif = write_sz.save()
        detail_sz = ActifDetailSerializer(actif, context=self.get_serializer_context())
        return Response(detail_sz.data)

    # ------------------------------------------------------------------
    # Action : changer le statut
    # ------------------------------------------------------------------

    @action(detail=True, methods=['post'], url_path='changer-statut')
    def changer_statut(self, request, pk=None):
        actif = self.get_object()
        sz = ChangerStatutSerializer(
            data=request.data,
            context={'actif': actif, 'request': request}
        )
        sz.is_valid(raise_exception=True)

        actif.changer_statut(
            nouveau_statut=sz.validated_data['nouveauStatut'],
            utilisateur=request.user,
        )

        return Response(
            ActifDetailSerializer(actif, context=self.get_serializer_context()).data
        )

    # ------------------------------------------------------------------
    # Action : liste des enfants directs
    # ------------------------------------------------------------------

    @action(detail=True, methods=['get'], url_path='enfants')
    def enfants(self, request, pk=None):
        actif = self.get_object()
        qs = actif.enfants.select_related('idUnite', 'idParent')
        sz = ActifListSerializer(qs, many=True, context=self.get_serializer_context())
        return Response(sz.data)

    # ------------------------------------------------------------------
    # Action : historique complet des statuts
    # ------------------------------------------------------------------

    @action(detail=True, methods=['get'], url_path='historique')
    def historique(self, request, pk=None):
        actif = self.get_object()
        qs = actif.historique_statuts.select_related('idUtilisateur').order_by('-dateChangement')
        sz = HistoriqueStatutActifSerializer(qs, many=True, context=self.get_serializer_context())
        return Response(sz.data)

    # ------------------------------------------------------------------
    # Action : arborescence complète (actifs racines + enfants)
    # ------------------------------------------------------------------

    @action(detail=False, methods=['get'], url_path='arborescence')
    def arborescence(self, request):
        racines = (
            Actif.objects
            .filter(idParent__isnull=True)
            .select_related('idUnite')
            .prefetch_related('enfants__idUnite')
        )
        sz = ActifDetailSerializer(racines, many=True, context=self.get_serializer_context())
        return Response(sz.data)


# ---------------------------------------------------------------------------
# HistoriqueStatutActif — lecture seule
# ---------------------------------------------------------------------------

class HistoriqueStatutActifViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lecture seule de l'historique des statuts.
      - GET  /historique-statuts/           → liste (filtrable par actif, statut, dates)
      - GET  /historique-statuts/{id}/      → détail
    """

    permission_classes = [IsSessionActive]
    serializer_class   = HistoriqueStatutActifSerializer
    queryset = HistoriqueStatutActif.objects.select_related(
        'idActif', 'idUtilisateur'
    ).order_by('-dateChangement')

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        if actif_id := params.get('actif'):
            qs = qs.filter(idActif=actif_id)
        if nouveau := params.get('nouveauStatut'):
            qs = qs.filter(nouveauStatut=nouveau)
        if ancien := params.get('ancienStatut'):
            qs = qs.filter(ancienStatut=ancien)
        if date_debut := params.get('dateDebut'):
            qs = qs.filter(dateChangement__date__gte=date_debut)
        if date_fin := params.get('dateFin'):
            qs = qs.filter(dateChangement__date__lte=date_fin)
        return qs