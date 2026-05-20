import csv
import io
from decimal import Decimal, InvalidOperation
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from rest_framework.pagination import PageNumberPagination
from django.db.models import Sum, F, Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.securite.audit_utils import log_audit
from .models import Piece, MouvementStock
from .serializers import PieceSerializer, MouvementStockSerializer


class PiecePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 5000


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
        
        # Filtre pour pièces avec stock non nul
        quantite_non_zero = self.request.query_params.get('quantite_non_zero')
        if quantite_non_zero is not None and quantite_non_zero.lower() in ('true', '1'):
            qs = qs.filter(quantiteStock__gt=0)
        
        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(self.request, 'CREATE', 'MAGASIN', 'Piece', instance.id,
                  nouvelle_valeur={'reference': instance.reference, 'designation': instance.designation, 
                                   'quantiteStock': str(instance.quantiteStock)})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'reference': old_instance.reference, 'quantiteStock': str(old_instance.quantiteStock), 'estActif': old_instance.estActif}
        instance = serializer.save()
        new_data = {'reference': instance.reference, 'quantiteStock': str(instance.quantiteStock), 'estActif': instance.estActif}
        log_audit(self.request, 'UPDATE', 'MAGASIN', 'Piece', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'MAGASIN', 'Piece', instance.id,
                  ancienne_valeur={'reference': instance.reference, 'designation': instance.designation})
        instance.delete()

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

        log_audit(self.request, 'STOCK_SORTIE', 'MAGASIN', 'Piece', piece.id,
                  ancienne_valeur={'quantiteStock': str(stock_avant)},
                  nouvelle_valeur={'quantiteStock': str(piece.quantiteStock), 'quantite_sortie': str(quantite)})

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

        log_audit(self.request, 'STOCK_ENTREE', 'MAGASIN', 'Piece', piece.id,
                  ancienne_valeur={'quantiteStock': str(stock_avant)},
                  nouvelle_valeur={'quantiteStock': str(piece.quantiteStock), 'quantite_entree': str(quantite)})

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

    @action(detail=False, methods=['post'])
    def importer_csv(self, request):
        """Importe un fichier CSV dans la table Piece.
        Supporte deux formats :
        - SAGE X3 : nombreuses colonnes avec headers connus
        - PDR simplifié : 3 colonnes (Référence, Désignation, Unité) avec ou sans headers
        """
        fichier = request.FILES.get('fichier')
        if not fichier:
            return Response({'error': 'Aucun fichier CSV fourni.'}, status=status.HTTP_400_BAD_REQUEST)

        # Lecture du fichier (support UTF-8 avec BOM et Windows-1252 fallback)
        try:
            raw = fichier.read()
            try:
                decoded = raw.decode('utf-8-sig')
            except UnicodeDecodeError:
                decoded = raw.decode('windows-1252', errors='replace')
        except Exception as e:
            return Response({'error': f'Impossible de lire le fichier : {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        # Détection du délimiteur (virgule ou point-virgule)
        first_line = decoded.splitlines()[0] if decoded else ''
        delimiter = ';' if ';' in first_line else ','

        reader = csv.DictReader(io.StringIO(decoded), delimiter=delimiter)
        if not reader.fieldnames:
            return Response({'error': 'Le fichier CSV semble vide ou mal formaté.'}, status=status.HTTP_400_BAD_REQUEST)

        # Normaliser les en-têtes (minuscules, sans espaces ni accents)
        def normalize_header(h):
            return h.strip().lower().replace(' ', '_').replace('-', '_')

        headers = [normalize_header(h) for h in reader.fieldnames]

        # Mapping flexible des colonnes — inclut les noms exacts SAGE X3
        mapping = {
            'reference': ['reference', 'ref', 'code', 'code_article', 'article', 'art',
                          'article'],
            'designation': ['designation', 'design', 'libelle', 'libellé', 'nom', 'description', 'article_desc', 'des',
                            'désignation_1', 'designation_1'],
            'categorie': ['categorie', 'catégorie', 'category', 'famille', 'fam', 'famille_article',
                          'catégorie'],
            'unite': ['unite', 'unité', 'unit', 'uom', 'unite_mesure', 'unité_mesure', 'un',
                      'unité_stock', 'unite_stock'],
            'emplacement': ['emplacement', 'location', 'empl', 'zone', 'emplacement_stock', 'lieu'],
            'quantiteStock': ['quantitestock', 'quantite', 'quantité', 'qte', 'qté', 'qty', 'stock', 'quantity', 'quantité_stock', 'qte_stock'],
            'seuilMinimum': ['seuilminimum', 'seuil', 'seuil_min', 'seuil_minimal', 'min', 'minimum', 'stock_min', 'stock_minimum', 'seuil_alert'],
            'prixUnitaire': ['prixunitaire', 'prix', 'pu', 'price', 'prix_unit', 'prix_unitaire', 'cout', 'coût', 'cost'],
            'fournisseur': ['fournisseur', 'supplier', 'four', 'fourn', 'fournisseur_principal', 'fournisseur_ref',
                            'fournisseur'],
            'referenceConstructeur': ['referenceconstructeur', 'refconstructeur', 'ref_constructeur', 'ref_fab', 'ref_fabricant', 'manufacturerref', 'mfgref', 'ref_fournisseur', 'ref_mfg',
                                      'article_fournisseur'],
        }

        def find_col(headers, candidates):
            for i, h in enumerate(headers):
                if h in candidates:
                    return reader.fieldnames[i]
            return None

        col_map = {}
        for champ, cands in mapping.items():
            col_map[champ] = find_col(headers, cands)

        # ── Détection du format PDR (3 colonnes sans headers connus) ──
        format_pdr = False
        if not col_map['reference'] and len(reader.fieldnames) == 3:
            # Si on a exactement 3 colonnes et aucune ne correspond à "reference",
            # on considère que c'est un fichier PDR avec headers génériques ou sans headers :
            # Colonne 1 = Référence, Colonne 2 = Désignation, Colonne 3 = Unité
            format_pdr = True
            col_map['reference'] = reader.fieldnames[0]
            col_map['designation'] = reader.fieldnames[1]
            col_map['unite'] = reader.fieldnames[2]

        if not col_map['reference']:
            return Response({
                'error': 'Colonne "Référence" introuvable.',
                'headers_trouves': reader.fieldnames
            }, status=status.HTTP_400_BAD_REQUEST)

        crees = 0
        mis_a_jour = 0
        erreurs = []
        total_lignes = 0

        for idx, row in enumerate(reader, start=2):
            total_lignes += 1
            ref_val = (row.get(col_map['reference']) or '').strip()
            if not ref_val:
                continue

            data = {}
            for champ, col in col_map.items():
                if not col:
                    continue
                val = (row.get(col) or '').strip()
                if not val:
                    continue
                if champ in ('quantiteStock', 'seuilMinimum', 'prixUnitaire'):
                    # Gérer les séparateurs décimaux français (virgule)
                    val_clean = val.replace(',', '.').replace(' ', '')
                    try:
                        data[champ] = Decimal(val_clean)
                    except InvalidOperation:
                        pass
                else:
                    data[champ] = val

            try:
                piece, created = Piece.objects.update_or_create(
                    reference=ref_val,
                    defaults={
                        'designation': data.get('designation', ref_val),
                        'categorie': data.get('categorie', ''),
                        'unite': data.get('unite', 'piece'),
                        'emplacement': data.get('emplacement', ''),
                        'quantiteStock': data.get('quantiteStock', Decimal('0')),
                        'seuilMinimum': data.get('seuilMinimum', Decimal('0')),
                        'prixUnitaire': data.get('prixUnitaire'),
                        'fournisseur': data.get('fournisseur', ''),
                        'referenceConstructeur': data.get('referenceConstructeur', ''),
                        'estActif': True,
                    }
                )
                if created:
                    crees += 1
                else:
                    mis_a_jour += 1
            except Exception as e:
                erreurs.append({'ligne': idx, 'reference': ref_val, 'erreur': str(e)})

        log_audit(request, 'IMPORT_CSV', 'MAGASIN', 'Piece', None,
                  nouvelle_valeur={
                      'fichier': fichier.name,
                      'total_lignes': total_lignes,
                      'creees': crees,
                      'mises_a_jour': mis_a_jour,
                      'erreurs': len(erreurs)
                  })

        return Response({
            'success': True,
            'fichier': fichier.name,
            'total_lignes': total_lignes,
            'creees': crees,
            'mises_a_jour': mis_a_jour,
            'erreurs': erreurs,
            'headers_trouves': reader.fieldnames,
            'format_detecte': 'pdr' if format_pdr else 'sage_x3',
        })

    @action(detail=False, methods=['get'])
    def categories(self, request):
        cats = Piece.objects.exclude(
            categorie=''
        ).exclude(
            categorie__isnull=True
        ).values_list('categorie', flat=True).distinct().order_by('categorie')
        return Response(list(cats))

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