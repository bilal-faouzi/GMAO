from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Sum, F, Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Piece, MouvementStock
from .serializers import PieceSerializer, MouvementStockSerializer


class PiecePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class PieceViewSet(viewsets.ModelViewSet):
    queryset = Piece.objects.all()
    serializer_class = PieceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = PiecePagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['categorie', 'estActif']
    search_fields = ['reference', 'designation', 'fournisseur']
    ordering_fields = ['reference', 'designation', 'quantiteStock', 'prixUnitaire']

    def get_queryset(self):
        qs = super().get_queryset()
        sous_seuil = self.request.query_params.get('sous_seuil')
        if sous_seuil is not None and sous_seuil.lower() in ('true', '1'):
            qs = qs.filter(quantiteStock__lte=F('seuilMinimum'))
        return qs

    @action(detail=True, methods=['post'])
    def sortie(self, request, pk=None):
        piece = self.get_object()
        try:
            quantite = Decimal(str(request.data.get('quantite', 0)))
        except Exception:
            return Response({'error': 'Quantité invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        if quantite <= 0:
            return Response({'error': 'La quantité doit être positive.'}, status=status.HTTP_400_BAD_REQUEST)

        if piece.quantiteStock < quantite:
            return Response(
                {'error': f'Stock insuffisant. Stock actuel : {piece.quantiteStock} {piece.unite}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        stock_avant = piece.quantiteStock
        piece.quantiteStock -= quantite
        piece.save()

        MouvementStock.objects.create(
            idPiece=piece,
            typeMouvement='sortie',
            quantite=quantite,
            stockAvant=stock_avant,
            stockApres=piece.quantiteStock,
            idOrdreTravail=request.data.get('idOrdreTravail', ''),
            idUtilisateurMagasinier=getattr(request.user, 'utilisateur', None),
            commentaire=request.data.get('commentaire', '')
        )
        return Response(PieceSerializer(piece).data)

    @action(detail=True, methods=['post'])
    def entree(self, request, pk=None):
        piece = self.get_object()
        try:
            quantite = Decimal(str(request.data.get('quantite', 0)))
        except Exception:
            return Response({'error': 'Quantité invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        if quantite <= 0:
            return Response({'error': 'La quantité doit être positive.'}, status=status.HTTP_400_BAD_REQUEST)

        stock_avant = piece.quantiteStock
        piece.quantiteStock += quantite
        piece.dateDerniereEntree = timezone.now()
        piece.save()

        MouvementStock.objects.create(
            idPiece=piece,
            typeMouvement='entree',
            quantite=quantite,
            stockAvant=stock_avant,
            stockApres=piece.quantiteStock,
            idUtilisateurMagasinier=getattr(request.user, 'utilisateur', None),
            commentaire=request.data.get('commentaire', '')
        )
        return Response(PieceSerializer(piece).data)

    @action(detail=False, methods=['get'])
    def alertes(self, request):
        pieces = Piece.objects.filter(
            estActif=True,
            quantiteStock__lte=F('seuilMinimum')
        ).order_by('quantiteStock')
        return Response({
            'count':   pieces.count(),
            'results': PieceSerializer(pieces, many=True).data
        })

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_pieces  = Piece.objects.filter(estActif=True).count()
        valeur_totale = Piece.objects.filter(
            estActif=True, prixUnitaire__isnull=False
        ).aggregate(
            total=Sum(F('quantiteStock') * F('prixUnitaire'))
        )
        nb_alertes = Piece.objects.filter(
            estActif=True,
            quantiteStock__lte=F('seuilMinimum')
        ).count()
        derniers_mouvements = MouvementStock.objects.order_by('-dateHeure')[:10]

        return Response({
            'total_pieces':        total_pieces,
            'valeur_totale':       valeur_totale['total'] or 0,
            'nb_alertes':          nb_alertes,
            'derniers_mouvements': MouvementStockSerializer(derniers_mouvements, many=True).data
        })


class MouvementStockViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MouvementStock.objects.select_related('idPiece').all()
    serializer_class = MouvementStockSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['idPiece', 'typeMouvement']
    ordering_fields = ['dateHeure']