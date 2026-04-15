from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Avg
from datetime import timedelta
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import (
    DemandeIntervention, OrdreTravail, AffectationEquipe,
    MembreIntervention, SuiviTemps, PieceUtiliseeOT,
    CommentaireOT, CauseRacine, HistoriqueStatutOT, ConfigurationSLA
)
from .serializers import (
    DemandeInterventionSerializer, OrdreTravailSerializer,
    AffectationEquipeSerializer, MembreInterventionSerializer,
    SuiviTempsSerializer, PieceUtiliseeOTSerializer,
    CommentaireOTSerializer, CauseRacineSerializer,
    HistoriqueStatutOTSerializer, ConfigurationSLASerializer
)


class DemandeInterventionViewSet(viewsets.ModelViewSet):
    queryset = DemandeIntervention.objects.select_related(
        'idActif', 'idUtilisateurSignalement'
    ).all()
    serializer_class = DemandeInterventionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['statut', 'urgence', 'idActif']
    search_fields = ['numero', 'description']
    ordering_fields = ['dateSignalement', 'urgence']

    def perform_create(self, serializer):
        serializer.save(
            idUtilisateurSignalement=getattr(self.request.user, 'utilisateur', None)
        )

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        di = self.get_object()
        if di.statut != 'en_attente':
            return Response(
                {'error': 'Seules les demandes en attente peuvent être validées.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        di.statut = 'validee'
        di.idUtilisateurValidation = getattr(request.user, 'utilisateur', None)
        di.dateValidation = timezone.now()
        di.save()

        # Créer automatiquement l'OT
        ot = OrdreTravail.objects.create(
            idActif=di.idActif,
            idDemandeIntervention=di,
            type='correctif',
            priorite=di.urgence,
            statut='OUVERT',
            description=di.description,
        )

        # Appliquer SLA si config existe
        config = ConfigurationSLA.objects.filter(
            idSite=di.idActif.idSite,
            typeOrdreTravail='correctif',
            priorite=di.urgence,
            estActif=True
        ).first()
        if config:
            ot.echeanceSLA = timezone.now() + timedelta(minutes=config.delaiResolutionMin)
            ot.save()

        # Créer historique statut OT
        HistoriqueStatutOT.objects.create(
            idOrdreTravail=ot,
            ancienStatut='',
            nouveauStatut='OUVERT',
            idUtilisateur=getattr(request.user, 'utilisateur', None),
            motif='Créé depuis DI validée'
        )

        return Response(OrdreTravailSerializer(ot).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def rejeter(self, request, pk=None):
        di = self.get_object()
        if di.statut != 'en_attente':
            return Response(
                {'error': 'Seules les demandes en attente peuvent être rejetées.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        di.statut = 'rejetee'
        di.motifRejet = request.data.get('motif', '')
        di.idUtilisateurValidation = getattr(request.user, 'utilisateur', None)
        di.dateValidation = timezone.now()
        di.save()
        return Response(DemandeInterventionSerializer(di).data)
    
class OrdreTravailViewSet(viewsets.ModelViewSet):
    queryset = OrdreTravail.objects.select_related(
        'idActif', 'idDemandeIntervention'
    ).prefetch_related(
        'affectations', 'commentaires', 'historiques_statut', 'pieces_utilisees'
    ).all()
    serializer_class = OrdreTravailSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['statut', 'type', 'priorite', 'idActif', 'estSousTraite']
    search_fields = ['numero', 'idActif__code', 'description']
    ordering_fields = ['created_at', 'priorite', 'echeanceSLA']

    @action(detail=True, methods=['post'])
    def changer_statut(self, request, pk=None):
        ot = self.get_object()
        nouveau = request.data.get('statut')
        motif   = request.data.get('motif', '')
        valides = [c[0] for c in OrdreTravail.STATUT_CHOICES]
        if not nouveau or nouveau not in valides:
            return Response(
                {'error': f'Statut invalide. Valeurs : {valides}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        ancien = ot.statut
        ot.statut = nouveau
        if nouveau == 'CLOTURE':
            ot.dateCloture  = timezone.now()
            ot.typeCloture  = request.data.get('typeCloture', 'corrige')
            debut = HistoriqueStatutOT.objects.filter(
                idOrdreTravail=ot, nouveauStatut='EN_COURS'
            ).order_by('dateChangement').first()
            if debut:
                delta = timezone.now() - debut.dateChangement
                ot.dureeReelleMin = int(delta.total_seconds() / 60)
        ot.save()
        HistoriqueStatutOT.objects.create(
            idOrdreTravail=ot,
            ancienStatut=ancien,
            nouveauStatut=nouveau,
            motif=motif,
            idUtilisateur=getattr(request.user, 'utilisateur', None)
        )
        return Response(OrdreTravailSerializer(ot).data)

    @action(detail=True, methods=['post'])
    def affecter_equipe(self, request, pk=None):
        ot = self.get_object()
        aff = AffectationEquipe.objects.create(
            idOrdreTravail=ot,
            idEquipe_id=request.data.get('idEquipe'),
            idSousTraitant_id=request.data.get('idSousTraitant'),
            idChefTechnicien_id=request.data.get('idChefTechnicien'),
            dateDebut=request.data.get('dateDebut', timezone.now()),
            statut='en_attente'
        )
        if ot.statut == 'OUVERT':
            ot.statut = 'EN_COURS'
            ot.save()
            HistoriqueStatutOT.objects.create(
                idOrdreTravail=ot,
                ancienStatut='OUVERT',
                nouveauStatut='EN_COURS',
                idUtilisateur=getattr(request.user, 'utilisateur', None),
                motif='Équipe affectée'
            )
        return Response(AffectationEquipeSerializer(aff).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def enregistrer_piece(self, request, pk=None):
        ot = self.get_object()
        from apps.magasin.models import Piece, MouvementStock
        from decimal import Decimal
        try:
            piece    = Piece.objects.get(id=request.data.get('idPiece'))
            quantite = Decimal(str(request.data.get('quantite', 0)))
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if piece.quantiteStock < quantite:
            return Response(
                {'error': f'Stock insuffisant : {piece.quantiteStock} {piece.unite}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        stock_avant = piece.quantiteStock
        piece.quantiteStock -= quantite
        piece.save()
        mouvement = MouvementStock.objects.create(
            idPiece=piece,
            typeMouvement='sortie',
            quantite=quantite,
            stockAvant=stock_avant,
            stockApres=piece.quantiteStock,
            idOrdreTravail=str(ot.numero),
            idUtilisateurMagasinier=getattr(request.user, 'utilisateur', None),
        )
        PieceUtiliseeOT.objects.create(
            idOrdreTravail=ot,
            idPiece=piece,
            idMouvementStock=mouvement,
            quantite=quantite,
            prixUnitaireCapture=piece.prixUnitaire or 0,
        )
        return Response(OrdreTravailSerializer(ot).data)

    @action(detail=True, methods=['post'])
    def ajouter_commentaire(self, request, pk=None):
        ot = self.get_object()
        commentaire = CommentaireOT.objects.create(
            idOrdreTravail=ot,
            idUtilisateur=getattr(request.user, 'utilisateur', None),
            commentaire=request.data.get('commentaire', ''),
            estInterne=request.data.get('estInterne', False)
        )
        return Response(CommentaireOTSerializer(commentaire).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cloturer(self, request, pk=None):
        ot = self.get_object()
        if ot.statut == 'CLOTURE':
            return Response({'error': 'OT déjà clôturé.'}, status=status.HTTP_400_BAD_REQUEST)
        ancien = ot.statut
        ot.statut       = 'CLOTURE'
        ot.dateCloture  = timezone.now()
        ot.typeCloture  = request.data.get('typeCloture', 'corrige')
        debut = HistoriqueStatutOT.objects.filter(
            idOrdreTravail=ot, nouveauStatut='EN_COURS'
        ).order_by('dateChangement').first()
        if debut:
            delta = timezone.now() - debut.dateChangement
            ot.dureeReelleMin = int(delta.total_seconds() / 60)
        ot.save()
        HistoriqueStatutOT.objects.create(
            idOrdreTravail=ot,
            ancienStatut=ancien,
            nouveauStatut='CLOTURE',
            idUtilisateur=getattr(request.user, 'utilisateur', None),
            motif=request.data.get('motif', '')
        )
        return Response(OrdreTravailSerializer(ot).data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total      = OrdreTravail.objects.count()
        par_statut = list(OrdreTravail.objects.values('statut').annotate(nb=Count('id')))
        en_retard  = OrdreTravail.objects.filter(
            echeanceSLA__lt=timezone.now(),
            statut__in=['OUVERT', 'EN_COURS', 'EN_VALIDATION']
        ).count()
        termines   = OrdreTravail.objects.filter(statut='CLOTURE')
        mttr       = termines.aggregate(Avg('dureeReelleMin'))['dureeReelleMin__avg']
        taux       = round(termines.count() / total * 100, 1) if total else 0
        recents    = OrdreTravailSerializer(
            OrdreTravail.objects.order_by('-created_at')[:5], many=True
        ).data
        return Response({
            'total':            total,
            'par_statut':       par_statut,
            'en_retard':        en_retard,
            'mttr':             round(mttr or 0, 1),
            'taux_resolution':  taux,
            'ots_recents':      recents,
        })


class AffectationEquipeViewSet(viewsets.ModelViewSet):
    queryset = AffectationEquipe.objects.select_related('idOrdreTravail', 'idEquipe', 'idSousTraitant').all()
    serializer_class = AffectationEquipeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['idOrdreTravail', 'statut']


class SuiviTempsViewSet(viewsets.ModelViewSet):
    queryset = SuiviTemps.objects.all()
    serializer_class = SuiviTempsSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['idOrdreTravail', 'idUtilisateur']


class CommentaireOTViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CommentaireOT.objects.all()
    serializer_class = CommentaireOTSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['idOrdreTravail', 'estInterne']


class HistoriqueStatutOTViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistoriqueStatutOT.objects.all()
    serializer_class = HistoriqueStatutOTSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['idOrdreTravail']


class ConfigurationSLAViewSet(viewsets.ModelViewSet):
    queryset = ConfigurationSLA.objects.all()
    serializer_class = ConfigurationSLASerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['idSite', 'typeOrdreTravail', 'priorite', 'estActif']