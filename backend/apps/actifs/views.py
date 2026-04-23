from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.securite.audit_utils import log_audit
from .models import Actif, HistoriqueStatut, Indisponibilite, Remplacement
from .serializers import (
    ActifSerializer, HistoriqueStatutSerializer,
    IndisponibiliteSerializer, RemplacementSerializer
)


class ActifPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class ActifViewSet(viewsets.ModelViewSet):
    queryset = Actif.objects.select_related('idSite', 'idUnite').all()
    serializer_class = ActifSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = ActifPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['idSite', 'idUnite', 'type', 'statut', 'estActif']
    search_fields = ['code', 'libelle', 'numSerie', 'fabricant']
    ordering_fields = ['code', 'dateAcquisition', 'statut']

    def get_queryset(self):
        # On commence avec le queryset de base (optimisé avec select_related)
        qs = super().get_queryset()
        
        # 1. Filtre Parent/Enfant (existant)
        is_parent = self.request.query_params.get('is_parent')
        if is_parent is not None:
            if is_parent.lower() in ('true', '1'):
                qs = qs.filter(idParent__isnull=True)
            elif is_parent.lower() in ('false', '0'):
                qs = qs.filter(idParent__isnull=False)

        # 2. Filtre par Unité de l'utilisateur (my_unite)
        my_unite = self.request.query_params.get('my_unite')
        if my_unite is not None and my_unite.lower() in ('true', '1'):
            # On cherche l'unité principale dans la table AppartenanceOrganisationnelle
            # pour l'utilisateur qui fait la requête (self.request.user)
            try:
                appartenance_principale = self.request.user.appartenances.get(
                    estPrincipale=True
                )
                user_unite = appartenance_principale.unite
                
                if user_unite:
                    qs = qs.filter(idUnite=user_unite)
                else:
                    # L'utilisateur a une appartenance principale mais pas d'unité rattachée
                    qs = qs.none()
            except Exception:
                # Si l'utilisateur n'a pas d'appartenance principale définie
                qs = qs.none()

        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(self.request, 'CREATE', 'ACTIFS', 'Actif', instance.id,
                  nouvelle_valeur={'code': instance.code, 'libelle': instance.libelle, 'type': instance.type})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'code': old_instance.code, 'libelle': old_instance.libelle, 'statut': old_instance.statut, 'estActif': old_instance.estActif}
        instance = serializer.save()
        new_data = {'code': instance.code, 'libelle': instance.libelle, 'statut': instance.statut, 'estActif': instance.estActif}
        log_audit(self.request, 'UPDATE', 'ACTIFS', 'Actif', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ACTIFS', 'Actif', instance.id,
                  ancienne_valeur={'code': instance.code, 'libelle': instance.libelle})
        instance.delete()

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

        log_audit(self.request, 'CHANGE_STATUS', 'ACTIFS', 'Actif', actif.id,
                  ancienne_valeur={'statut': ancien_statut}, 
                  nouvelle_valeur={'statut': nouveau_statut, 'motif': motif})

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

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(self.request, 'CREATE', 'ACTIFS', 'Indisponibilite', instance.id,
                  nouvelle_valeur={'type': instance.type, 'motif': instance.motif})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'type': old_instance.type, 'motif': old_instance.motif, 'estTerminee': old_instance.estTerminee}
        instance = serializer.save()
        new_data = {'type': instance.type, 'motif': instance.motif, 'estTerminee': instance.estTerminee}
        log_audit(self.request, 'UPDATE', 'ACTIFS', 'Indisponibilite', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ACTIFS', 'Indisponibilite', instance.id,
                  ancienne_valeur={'type': instance.type, 'motif': instance.motif})
        instance.delete()


class RemplacementViewSet(viewsets.ModelViewSet):
    queryset = Remplacement.objects.select_related(
        'actifOriginal', 'actifRemplacant', 'effectuePar'
    ).all()
    serializer_class = RemplacementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['actifOriginal', 'actifRemplacant']
    ordering_fields = ['dateRemplacement']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(self.request, 'CREATE', 'ACTIFS', 'Remplacement', instance.id,
                  nouvelle_valeur={'actifOriginal_id': str(instance.actifOriginal.id) if instance.actifOriginal else None,
                                   'actifRemplacant_id': str(instance.actifRemplacant.id) if instance.actifRemplacant else None})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'motif': old_instance.motif}
        instance = serializer.save()
        new_data = {'motif': instance.motif}
        log_audit(self.request, 'UPDATE', 'ACTIFS', 'Remplacement', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ACTIFS', 'Remplacement', instance.id,
                  ancienne_valeur={'actifOriginal_id': str(instance.actifOriginal.id) if instance.actifOriginal else None})
        instance.delete()