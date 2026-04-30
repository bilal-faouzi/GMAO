from urllib import request

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from django.db.models import Count, Avg
from datetime import timedelta
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.securite.audit_utils import log_audit
from .models import (
    DemandeIntervention, OrdreTravail, AffectationEquipe,
    MembreIntervention, SuiviTemps, PieceUtiliseeOT, PieceJointeDI,
    CommentaireOT, CauseRacine, HistoriqueStatutOT, ConfigurationSLA
)
from .serializers import (
    DemandeInterventionSerializer, OrdreTravailSerializer,
    AffectationEquipeSerializer, MembreInterventionSerializer,
    SuiviTempsSerializer, PieceUtiliseeOTSerializer,
    CommentaireOTSerializer, CauseRacineSerializer,
    HistoriqueStatutOTSerializer, ConfigurationSLASerializer,
    PieceJointeDISerializer
)


class DemandeInterventionPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'limit'
    page_query_param = 'page'
    max_page_size = 100


class DemandeInterventionViewSet(viewsets.ModelViewSet):
    queryset = DemandeIntervention.objects.select_related(
        'idActif', 'idUtilisateurSignalement'
    ).all()
    serializer_class = DemandeInterventionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DemandeInterventionPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['statut', 'urgence', 'idActif']
    search_fields = ['numero', 'description']
    ordering_fields = ['dateSignalement', 'urgence']

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_page') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        actif = serializer.validated_data.get('idActif')

        instance = serializer.save()

        if instance.urgence == 'critique':
            ancien_statut = actif.statut
            if ancien_statut != 'en_panne':
                actif.statut = 'en_panne'
                actif.save()

                from apps.actifs.models import HistoriqueStatut
                HistoriqueStatut.objects.create(
                    idActif=actif,
                    ancienStatut=ancien_statut,
                    nouveauStatut='en_panne',
                    motif=f"Demande d'intervention critique #{instance.numero} créée",
                    modifiePar=getattr(self.request.user, 'utilisateur', None)
                )

        log_audit(self.request, 'CREATE', 'ORDRES', 'DemandeIntervention', instance.id,
                  nouvelle_valeur={'numero': instance.numero, 'urgence': instance.urgence, 'statut': instance.statut})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'statut': old_instance.statut, 'urgence': old_instance.urgence}
        instance = serializer.save()
        new_data = {'statut': instance.statut, 'urgence': instance.urgence}
        log_audit(self.request, 'UPDATE', 'ORDRES', 'DemandeIntervention', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ORDRES', 'DemandeIntervention', instance.id,
                  ancienne_valeur={'numero': instance.numero, 'statut': instance.statut})
        instance.delete()

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        di = self.get_object()
        if di.statut != 'en_attente':
            return Response(
                {'error': 'Seules les demandes en attente peuvent être validées.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        di.statut = 'validee'
        di.idUtilisateurValidation = request.user if request.user.is_authenticated else None
        di.dateValidation = timezone.now()
        di.save()

        

        ot = OrdreTravail.objects.create(
            idActif=di.idActif,
            idDemandeIntervention=di,
            type='correctif',
            priorite=di.urgence,
            statut='EN_COURS',
            isvalide=True,
            description=di.description,
        )

        ancien_statut_actif = di.idActif.statut
    
        di.idActif.statut = 'en_maintenance'
        di.idActif.save()

        from apps.actifs.models import HistoriqueStatut
        HistoriqueStatut.objects.create(
            idActif=di.idActif,
            ancienStatut=ancien_statut_actif,
            nouveauStatut='en_maintenance',
            motif=f'OT #{ot.numero} créé - Demande Intervention #{di.numero}',
            modifiePar=getattr(request.user, 'utilisateur', None)
            )

        config = ConfigurationSLA.objects.filter(
            idSite=di.idActif.idSite,
            typeOrdreTravail='correctif',
            priorite=di.urgence,
            estActif=True
        ).first()
        if config:
            ot.echeanceSLA = timezone.now() + timedelta(minutes=config.delaiResolutionMin)
            ot.save()

        HistoriqueStatutOT.objects.create(
            idOrdreTravail=ot,
            ancienStatut='',
            nouveauStatut='EN_COURS',
            idUtilisateur=getattr(request.user, 'utilisateur', None),
            motif='Créé depuis DI validée'
        )

        log_audit(self.request, 'VALIDER', 'ORDRES', 'DemandeIntervention', di.id,
                  ancienne_valeur={'statut': 'en_attente'},
                  nouvelle_valeur={'statut': 'validee', 'ot_numero': ot.numero})

        return Response(OrdreTravailSerializer(ot).data, status=status.HTTP_201_CREATED)

    # -------------------------------------------------------------------------
    # REJETER — logique de restauration conditionnelle de l'actif et de l'unité
    # -------------------------------------------------------------------------
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
        di.isencours = False
        di.save()


        log_audit(request, 'REJECT', 'ORDRES', 'DemandeIntervention', di.id,
                  ancienne_valeur={'statut': 'en_attente'},
                  nouvelle_valeur={'statut': 'rejetee', 'motif': di.motifRejet})

        # Seules les DIs critiques ont modifié le statut de l'actif à la création,
        # donc on ne restaure que dans ce cas.
        if di.urgence == 'critique':
            actif = di.idActif

            # 1. Autres DIs critiques encore en attente sur le même actif
            #    (la DI courante est déjà 'rejetee', exclude par sécurité
            #     contre les éventuelles race conditions)
            autres_di_critiques = DemandeIntervention.objects.filter(
                idActif=actif,
                urgence='critique',
                statut='en_attente'
            ).exclude(id=di.id).exists()

            # 2. OTs actifs sur le même actif :
            #    EN_COURS  → intervention en cours
            #    DEPANNE   → dépannage temporaire, pas encore clôturé
            autres_ots_actifs = OrdreTravail.objects.filter(
                idActif=actif,
                statut__in=['EN_COURS', 'DEPANNE']
            ).exists()

            if autres_di_critiques or autres_ots_actifs:
                # D'autres interventions bloquent la restauration, on s'arrête
                return Response(DemandeInterventionSerializer(di).data)

            # --- Restauration de l'actif ---
            ancien_statut_actif = actif.statut
            estActif_avant      = actif.estActif  # capture AVANT save (bug fix audit log)

            actif.statut   = 'actif'
            actif.estActif = True
            actif.save()

            from apps.actifs.models import HistoriqueStatut
            HistoriqueStatut.objects.create(
                idActif=actif,
                ancienStatut=ancien_statut_actif,
                nouveauStatut='actif',
                motif=f"Rejet DI critique #{di.numero} — aucune intervention active sur l'actif",
                modifiePar=getattr(request.user, 'utilisateur', None)
            )

            log_audit(request, 'UPDATE', 'ACTIFS', 'Actif', actif.id,
                      ancienne_valeur={'statut': ancien_statut_actif, 'estActif': estActif_avant},
                      nouvelle_valeur={'statut': 'actif',             'estActif': True})

            # --- Restauration de l'unité liée ---
            unite = actif.idUnite
            if unite and not unite.estProductive:
                # Edge case : l'unité peut avoir plusieurs actifs.
                # On ne la remet productive que si aucun autre actif
                # de la même unité n'est encore en panne ou en maintenance.
                autres_actifs_unite_bloques = (
                    actif.__class__.objects
                    .filter(
                        idUnite=unite,
                        statut__in=['en_panne', 'en_maintenance']
                    )
                    .exclude(id=actif.id)
                    .exists()
                )

                if not autres_actifs_unite_bloques:
                    unite.estProductive = True
                    unite.save()

                    log_audit(request, 'UPDATE', 'ORGANISATION', 'Unite', unite.id,
                              ancienne_valeur={'estProductive': False},
                              nouvelle_valeur={'estProductive': True})

        return Response(DemandeInterventionSerializer(di).data)

    @action(detail=True, methods=['post'])
    def telecharger_fichiers(self, request, pk=None):
        """
        Upload fichiers (images ou audio) pour une demande d'intervention.

        Types acceptés:
        - Images: jpg, jpeg, png, gif, bmp (5 MB max chacun)
        - Audio: mp3, wav, m4a, aac, ogg, webm (10 MB max chacun)
        """
        from django.core.files.storage import default_storage
        import os

        di = self.get_object()
        fichiers = request.FILES.getlist('fichiers')

        if not fichiers:
            return Response(
                {'error': 'Aucun fichier à télécharger'},
                status=status.HTTP_400_BAD_REQUEST
            )

        TYPES_IMAGES = {'jpg', 'jpeg', 'png', 'gif', 'bmp'}
        TYPES_AUDIO = {'mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm'}
        MAX_SIZE_IMAGE = 5 * 1024 * 1024
        MAX_SIZE_AUDIO = 10 * 1024 * 1024

        pieces_creees = []
        erreurs = []

        for fichier in fichiers:
            try:
                ext = fichier.name.split('.')[-1].lower()

                if ext in TYPES_IMAGES:
                    max_size = MAX_SIZE_IMAGE
                    type_fichier = 'image'
                elif ext in TYPES_AUDIO:
                    max_size = MAX_SIZE_AUDIO
                    type_fichier = 'audio'
                else:
                    erreurs.append({
                        'fichier': fichier.name,
                        'motif': f'Type non autorisé (.{ext}). Images: jpg/png/gif/bmp, Audio: mp3/wav/m4a/aac/ogg/webm'
                    })
                    continue

                if fichier.size > max_size:
                    max_mb = max_size / (1024 * 1024)
                    erreurs.append({
                        'fichier': fichier.name,
                        'motif': f'Fichier trop volumineux. Max: {max_mb:.0f} MB'
                    })
                    continue

                directory = f'demandes_intervention/{di.id}'
                filepath = os.path.join(directory, fichier.name)
                saved_path = default_storage.save(filepath, fichier)
                url = default_storage.url(saved_path)

                if not url.startswith('http') and not url.startswith('/media/'):
                    url = f'/media/{saved_path}'

                piece = PieceJointeDI.objects.create(
                    idDemandeIntervention=di,
                    nomFichier=fichier.name,
                    typeFichier=f'{type_fichier}/{ext}',
                    url=url
                )
                pieces_creees.append(PieceJointeDISerializer(piece).data)

            except Exception as e:
                erreurs.append({'fichier': fichier.name, 'motif': str(e)})

        if pieces_creees:
            log_audit(self.request, 'UPLOAD_FICHIERS', 'ORDRES', 'DemandeIntervention', di.id,
                      nouvelle_valeur={'fichiers_count': len(pieces_creees), 'type': 'mixed'})

        resultat = {
            'fichiers_ajoutes': len(pieces_creees),
            'fichiers': pieces_creees,
        }
        if erreurs:
            resultat['erreurs'] = erreurs

        return Response(resultat, status=status.HTTP_200_OK)


class OrdreTravailViewSet(viewsets.ModelViewSet):
    queryset = OrdreTravail.objects.select_related(
        'idActif', 'idDemandeIntervention'
    ).prefetch_related(
        'affectations', 'commentaires', 'historiques_statut', 'pieces_utilisees'
    ).all()
    serializer_class = OrdreTravailSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DemandeInterventionPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['statut', 'type', 'priorite', 'idActif', 'estSousTraite', 'isvalide']
    search_fields = ['numero', 'idActif__code', 'description']
    ordering_fields = ['created_at', 'priorite', 'echeanceSLA']

    def perform_create(self, serializer):
        ot = serializer.save()
        ot.isvalide = True
        ot.save(update_fields=['isvalide'])

        log_audit(self.request, 'CREATE', 'ORDRES', 'OrdreTravail', ot.id,
                  nouvelle_valeur={'numero': ot.numero, 'type': ot.type, 'statut': ot.statut, 'isvalide': True})

        ancien_statut_actif = ot.idActif.statut
        if ancien_statut_actif != 'en_maintenance':
            ot.idActif.statut = 'en_maintenance'
            ot.idActif.save()

            from apps.actifs.models import HistoriqueStatut
            HistoriqueStatut.objects.create(
                idActif=ot.idActif,
                ancienStatut=ancien_statut_actif,
                nouveauStatut='en_maintenance',
                motif=f'OT #{ot.numero} créé',
                modifiePar=getattr(self.request.user, 'utilisateur', None)
            )

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'statut': old_instance.statut, 'priorite': old_instance.priorite}
        instance = serializer.save()
        new_data = {'statut': instance.statut, 'priorite': instance.priorite}
        log_audit(self.request, 'UPDATE', 'ORDRES', 'OrdreTravail', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ORDRES', 'OrdreTravail', instance.id,
                  ancienne_valeur={'numero': instance.numero, 'statut': instance.statut})
        instance.delete()

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
            ot.dateCloture = timezone.now()
            ot.typeCloture = request.data.get('typeCloture', 'corrige')
            debut = HistoriqueStatutOT.objects.filter(
                idOrdreTravail=ot, nouveauStatut='EN_COURS'
            ).order_by('dateChangement').first()
            if debut:
                delta = timezone.now() - debut.dateChangement
                ot.dureeReelleMin = int(delta.total_seconds() / 60)
        if nouveau in ('CLOTURE', 'DEPANNE'):
            ot.isvalide = False
            actif = ot.idActif
            if actif.statut != 'actif':
                ancien_statut_actif = actif.statut
                actif.statut = 'actif'
                actif.save()
                from apps.actifs.models import HistoriqueStatut
                HistoriqueStatut.objects.create(
                    idActif=actif,
                    ancienStatut=ancien_statut_actif,
                    nouveauStatut='actif',
                    motif=f'OT #{ot.numero} {nouveau.lower()} - Actif rétabli',
                    modifiePar=getattr(request.user, 'utilisateur', None)
                )
                unite = actif.idUnite
                if unite and not unite.estProductive:
                    autres_actifs_unite_bloques = (
                        actif.__class__.objects
                        .filter(
                            idUnite=unite,
                            statut__in=['en_panne', 'en_maintenance']
                        )
                        .exclude(id=actif.id)
                        .exists()
                    )
                    if not autres_actifs_unite_bloques:
                        unite.estProductive = True
                        unite.save()
                        log_audit(request, 'UPDATE', 'ORGANISATION', 'Unite', unite.id,
                                  ancienne_valeur={'estProductive': False},
                                  nouvelle_valeur={'estProductive': True})
                        
            if nouveau == 'DEPANNE':
                ot.typeCloture = request.data.get('typeCloture', 'depanne')


        ot.save()

        
        STATUT_MAP = {
            'EN_COURS': 'en_cours',
            'DEPANNE':  'termine',
            'CLOTURE':  'termine',
        }
        nouveau_statut_aff = STATUT_MAP.get(nouveau)
        if nouveau_statut_aff:
            AffectationEquipe.objects.filter(
                idOrdreTravail=ot
            ).update(statut=nouveau_statut_aff)

        HistoriqueStatutOT.objects.create(
            idOrdreTravail=ot,
            ancienStatut=ancien,
            nouveauStatut=nouveau,
            motif=motif,
            idUtilisateur=getattr(request.user, 'utilisateur', None)
        )

        log_audit(self.request, 'CHANGE_STATUS', 'ORDRES', 'OrdreTravail', ot.id,
                  ancienne_valeur={'statut': ancien},
                  nouvelle_valeur={'statut': nouveau, 'motif': motif})

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

        log_audit(self.request, 'ENREGISTRER_PIECE', 'ORDRES', 'OrdreTravail', ot.id,
                  nouvelle_valeur={'piece_id': str(piece.id), 'quantite': str(quantite), 'stock_avant': str(stock_avant)})

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

        log_audit(self.request, 'AJOUTER_COMMENTAIRE', 'ORDRES', 'OrdreTravail', ot.id,
                  nouvelle_valeur={'estInterne': commentaire.estInterne, 'has_text': len(commentaire.commentaire) > 0})

        return Response(CommentaireOTSerializer(commentaire).data, status=status.HTTP_201_CREATED)

    # @action(detail=True, methods=['post'])
    # def cloturer(self, request, pk=None):
    #     ot = self.get_object()
    #     if ot.statut == 'CLOTURE':
    #         return Response({'error': 'OT déjà clôturé.'}, status=status.HTTP_400_BAD_REQUEST)

    #     ancien = ot.statut
    #     ot.statut      = 'CLOTURE'
    #     ot.dateCloture = timezone.now()
    #     ot.isvalide   = False
    #     debut = HistoriqueStatutOT.objects.filter(
    #         idOrdreTravail=ot, nouveauStatut='EN_COURS'
    #     ).order_by('dateChangement').first()
    #     if debut:
    #         delta = timezone.now() - debut.dateChangement
    #         ot.dureeReelleMin = int(delta.total_seconds() / 60)
    #     ot.save()

    #     AffectationEquipe.objects.filter(idOrdreTravail=ot).update(statut='termine')

    #     HistoriqueStatutOT.objects.create(
    #         idOrdreTravail=ot,
    #         ancienStatut=ancien,
    #         nouveauStatut='CLOTURE',
    #         idUtilisateur=getattr(request.user, 'utilisateur', None),
    #         motif=request.data.get('motif', '')
    #     )

    #     # Vérifier si l'actif peut redevenir actif
    #     actif = ot.idActif

    #     autres_ots_ouverts = OrdreTravail.objects.filter(
    #         idActif=actif,
    #         statut__in=['EN_COURS']
    #     ).exclude(id=ot.id).exists()

    #     autres_di_critiques = DemandeIntervention.objects.filter(
    #         idActif=actif,
    #         urgence='critique',
    #         statut='en_attente'
    #     ).exists()

    #     if not autres_ots_ouverts and not autres_di_critiques:
    #         ancien_statut_actif = actif.statut
    #         actif.statut = 'actif'
    #         actif.save()

    #         from apps.actifs.models import HistoriqueStatut
    #         HistoriqueStatut.objects.create(
    #             idActif=actif,
    #             ancienStatut=ancien_statut_actif,
    #             nouveauStatut='actif',
    #             motif=f'OT #{ot.numero} clôturé — aucune intervention en cours',
    #             modifiePar=getattr(request.user, 'utilisateur', None)
    #         )

    #         log_audit(request, 'UPDATE', 'ACTIFS', 'Actif', actif.id,
    #                 ancienne_valeur={'statut': ancien_statut_actif},
    #                 nouvelle_valeur={'statut': 'actif'})

    #         # Remettre l'unité en productive si elle existe
    #         unite = actif.idUnite
    #         if unite and not unite.estProductive:
    #             # Edge case : vérifier les autres actifs de la même unité
    #             autres_actifs_unite_bloques = (
    #                 actif.__class__.objects
    #                 .filter(
    #                     idUnite=unite,
    #                     statut__in=['en_panne', 'en_maintenance']
    #                 )
    #                 .exclude(id=actif.id)
    #                 .exists()
    #             )

    #             if not autres_actifs_unite_bloques:
    #                 unite.estProductive = True
    #                 unite.save()

    #                 log_audit(request, 'UPDATE', 'ORGANISATION', 'Unite', unite.id,
    #                         ancienne_valeur={'estProductive': False},
    #                         nouvelle_valeur={'estProductive': True})

    #     log_audit(self.request, 'CLOTURER', 'ORDRES', 'OrdreTravail', ot.id,
    #             ancienne_valeur={'statut': ancien},
    #             nouvelle_valeur={'statut': 'CLOTURE', 'duree': ot.dureeReelleMin, 'type_cloture': ot.typeCloture})

    #     return Response(OrdreTravailSerializer(ot).data)

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        ot = self.get_object()

        if ot.statut not in ('CLOTURE', 'DEPANNE'):
            return Response(
                {'error': 'Seuls les OT clôturés ou dépannés peuvent être validés par l\'opérateur.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        est_approuve = request.data.get('isValide')
        motif        = request.data.get('motif', '')
        type_cloture = ot.statut  # par défaut, on garde le type de clôture existant (corrigé ou dépanné)
        ancien_statut = ot.statut
        print(f"[DEBUG] isValide reçu = {repr(est_approuve)} | type = {type(est_approuve)}")
        print(f"[DEBUG] request.data complet = {request.data}")

        if est_approuve:
            ot.isvalide = True
            ot.statut    = 'CLOTURE'
            ot.typeCloture = type_cloture
            print('test validation', ot.typeCloture)
            ot.dateCloture = timezone.now()

            ot.save()

            di = ot.idDemandeIntervention
            di.isencours = False
            di.save()
                         

            actif = ot.idActif
            

            autres_ots_ouverts = OrdreTravail.objects.filter(
                idActif=actif,
                statut__in=['EN_COURS']
            ).exclude(id=ot.id).exists()

            autres_di_critiques = DemandeIntervention.objects.filter(
                idActif=actif,
                urgence='critique',
                statut='en_attente'
            ).exists()

            HistoriqueStatutOT.objects.create(
                idOrdreTravail=ot,
                ancienStatut=ancien_statut,
                nouveauStatut=ot.statut,
                idUtilisateur=getattr(request.user, 'utilisateur', None),
                motif=motif or 'Validation opérateur approuvée'
                )
            if not autres_ots_ouverts and not autres_di_critiques:
                ancien_statut_actif = actif.statut
                actif.statut = 'actif'
                actif.save()

                unite = actif.idUnite
                if unite and not unite.estProductive:
                    autres_actifs_unite_bloques = (
                        actif.__class__.objects
                        .filter(
                            idUnite=unite,
                            statut__in=['en_panne', 'en_maintenance']
                        )
                        .exclude(id=actif.id)
                        .exists()
                    )

                    if not autres_actifs_unite_bloques:
                        unite.estProductive = True
                        unite.save()        


                log_audit(request, 'VALIDER', 'ORDRES', 'OrdreTravail', ot.id,
                            ancienne_valeur={'statut': ancien_statut, 'isvalide': False, 'typeCloture': ot.typeCloture},
                            nouvelle_valeur={'statut': ot.statut,    'isvalide': True, 'typeCloture': type_cloture})

        else:
            ot.isvalide   =  True
            ot.statut     = 'REJETE'
            print('test validation',ot.isvalide)
            ot.save()
            
            di = ot.idDemandeIntervention
            di.isencours = True
            di.statut    = 'en_attente'
            print('test validation di',di.isencours, di.statut)
            di.save()

            actif = ot.idActif
            if actif.statut != 'en_panne':
                ancien_statut_actif = actif.statut
                actif.statut = 'en_panne'
                actif.save()

                from apps.actifs.models import HistoriqueStatut
                HistoriqueStatut.objects.create(
                    idActif=actif,
                    ancienStatut=ancien_statut_actif,
                    nouveauStatut='en_panne',
                    motif=f'Validation OT #{ot.numero} rejetée',
                    modifiePar=getattr(request.user, 'utilisateur', None)
                )

                log_audit(request, 'UPDATE', 'ACTIFS', 'Actif', actif.id,
                        ancienne_valeur={'statut': ancien_statut_actif},
                        nouvelle_valeur={'statut': 'en_panne'})

            HistoriqueStatutOT.objects.create(
                idOrdreTravail=ot,
                ancienStatut=ancien_statut,
                nouveauStatut='EN_COURS',
                idUtilisateur=getattr(request.user, 'utilisateur', None),
                motif=motif or 'Validation opérateur rejetée — intervention à reprendre'
            )

            AffectationEquipe.objects.filter(idOrdreTravail=ot).update(statut='rejeter')

            if ot.idDemandeIntervention:
                di = ot.idDemandeIntervention
                ancien_statut_di = di.statut

                log_audit(request, 'UPDATE', 'ORDRES', 'DemandeIntervention', di.id,
                        ancienne_valeur={'statut': ancien_statut_di},
                        nouvelle_valeur={'statut': 'en_attente',
                                        'motif': f'Validation OT #{ot.numero} rejetée'})

                if di.urgence == 'critique':
                    actif = ot.idActif
                    ancien_statut_actif = actif.statut
                    actif.statut   = 'en_panne'
                    
                    actif.save()

                    from apps.actifs.models import HistoriqueStatut
                    HistoriqueStatut.objects.create(
                        idActif=actif,
                        ancienStatut=ancien_statut_actif,
                        nouveauStatut='en_panne',
                        motif=f'Validation OT #{ot.numero} rejetée — DI critique #{di.numero}',
                        modifiePar=getattr(request.user, 'utilisateur', None)
                    )

                    log_audit(request, 'UPDATE', 'ACTIFS', 'Actif', actif.id,
                            ancienne_valeur={'statut': ancien_statut_actif, 'estActif': actif.estActif},
                            nouvelle_valeur={'statut': 'en_panne',          'estActif': False})

                    unite = actif.idUnite
                    if unite and unite.estProductive:
                        unite.estProductive = False
                        unite.save()

                        log_audit(request, 'UPDATE', 'ORGANISATION', 'Unite', unite.id,
                                ancienne_valeur={'estProductive': True},
                                nouvelle_valeur={'estProductive': False})

            log_audit(request, 'REJETER_VALIDATION', 'ORDRES', 'OrdreTravail', ot.id,
                    ancienne_valeur={'statut': ancien_statut, 'isvalide': False},
                    nouvelle_valeur={'statut': 'EN_COURS',    'isvalide': False, 'motif': motif})

        return Response(OrdreTravailSerializer(ot).data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total      = OrdreTravail.objects.count()
        par_statut = list(OrdreTravail.objects.values('statut').annotate(nb=Count('id')))
        en_retard  = OrdreTravail.objects.filter(
            echeanceSLA__lt=timezone.now(),
            statut__in=['EN_COURS']
        ).count()
        termines   = OrdreTravail.objects.filter(statut='CLOTURE')
        mttr       = termines.aggregate(Avg('dureeReelleMin'))['dureeReelleMin__avg']
        taux       = round(termines.count() / total * 100, 1) if total else 0
        recents    = OrdreTravailSerializer(
            OrdreTravail.objects.order_by('-created_at')[:5], many=True
        ).data
        return Response({
            'total':           total,
            'par_statut':      par_statut,
            'en_retard':       en_retard,
            'mttr':            round(mttr or 0, 1),
            'taux_resolution': taux,
            'ots_recents':     recents,
        })


class AffectationEquipeViewSet(viewsets.ModelViewSet):
    queryset = AffectationEquipe.objects.select_related(
        'idOrdreTravail', 'idEquipe', 'idSousTraitant'
    ).all()
    serializer_class = AffectationEquipeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['idOrdreTravail', 'statut', 'idChefTechnicien']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(self.request, 'CREATE', 'ORDRES', 'AffectationEquipe', instance.id,
                  nouvelle_valeur={'statut': instance.statut})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'statut': old_instance.statut}
        instance = serializer.save()
        new_data = {'statut': instance.statut}
        log_audit(self.request, 'UPDATE', 'ORDRES', 'AffectationEquipe', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ORDRES', 'AffectationEquipe', instance.id,
                  ancienne_valeur={'statut': instance.statut})
        instance.delete()


class SuiviTempsViewSet(viewsets.ModelViewSet):
    queryset = SuiviTemps.objects.all()
    serializer_class = SuiviTempsSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['idOrdreTravail', 'idUtilisateur']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(self.request, 'CREATE', 'ORDRES', 'SuiviTemps', instance.id,
                  nouvelle_valeur={})

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ORDRES', 'SuiviTemps', instance.id,
                  ancienne_valeur={})
        instance.delete()


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

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(self.request, 'CREATE', 'ORDRES', 'ConfigurationSLA', instance.id,
                  nouvelle_valeur={'delaiResolutionMin': instance.delaiResolutionMin})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_data = {'delaiResolutionMin': old_instance.delaiResolutionMin, 'estActif': old_instance.estActif}
        instance = serializer.save()
        new_data = {'delaiResolutionMin': instance.delaiResolutionMin, 'estActif': instance.estActif}
        log_audit(self.request, 'UPDATE', 'ORDRES', 'ConfigurationSLA', instance.id,
                  ancienne_valeur=old_data, nouvelle_valeur=new_data)

    def perform_destroy(self, instance):
        log_audit(self.request, 'DELETE', 'ORDRES', 'ConfigurationSLA', instance.id,
                  ancienne_valeur={'delaiResolutionMin': instance.delaiResolutionMin})
        instance.delete()