from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
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
        print(f'📝 Creating demande...')
        print(f'   User: {self.request.user}')
        print(f'   User ID: {self.request.user.id if self.request.user else None}')
        print(f'   Is authenticated: {self.request.user.is_authenticated if self.request.user else False}')
        # Vérifier s'il existe déjà une DI active pour cet actif
        actif = serializer.validated_data.get('idActif')
        di_existante = DemandeIntervention.objects.filter(
            idActif=actif,
            statut__in=['en_attente']
        ).first()
        
        if di_existante:
            # Vérifier si l'OT associée est clôturée
            ot_actifs = OrdreTravail.objects.filter(
                idDemandeIntervention=di_existante
            ).exclude(statut='CLOTURE').exists()
            
            if ot_actifs:
                raise ValidationError(
                    f"Impossible de créer une nouvelle demande. "
                    f"La demande {di_existante.numero} existe déjà et son OT n'est pas encore terminé(e)."
                )
        
        instance = serializer.save(
            idUtilisateurSignalement=self.request.user if self.request.user.is_authenticated else None
        )
        print(f'✅ Demande created with user: {instance.idUtilisateurSignalement}')
        
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

        # Créer automatiquement l'OT
        ot = OrdreTravail.objects.create(
            idActif=di.idActif,
            idDemandeIntervention=di,
            type='correctif',
            priorite=di.urgence,
            statut='OUVERT',
            description=di.description,
        )

        # Passer l'actif au statut "en_maintenance"
        ancien_statut_actif = di.idActif.statut
        di.idActif.statut = 'en_maintenance'
        di.idActif.save()
        
        # Créer historique du changement de statut de l'actif
        from apps.actifs.models import HistoriqueStatut
        HistoriqueStatut.objects.create(
            idActif=di.idActif,
            ancienStatut=ancien_statut_actif,
            nouveauStatut='en_maintenance',
            motif=f'OT #{ot.numero} créé - Demande Intervention #{di.numero}',
            modifiePar=getattr(request.user, 'utilisateur', None)
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

        log_audit(self.request, 'VALIDER', 'ORDRES', 'DemandeIntervention', di.id,
                  ancienne_valeur={'statut': 'en_attente'}, 
                  nouvelle_valeur={'statut': 'validee', 'ot_numero': ot.numero})

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

        log_audit(self.request, 'REJETER', 'ORDRES', 'DemandeIntervention', di.id,
                  ancienne_valeur={'statut': 'en_attente'}, 
                  nouvelle_valeur={'statut': 'rejetee', 'motif': di.motifRejet})

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
        
        print(f'\n🔍 UPLOAD DEBUG: Started upload for demande {di.id}')
        print(f'📦 Files received: {len(fichiers)}')
        for f in fichiers:
            print(f'  - {f.name} ({f.size} bytes, type: {f.content_type})')
        
        if not fichiers:
            return Response(
                {'error': 'Aucun fichier à télécharger'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        TYPES_IMAGES = {'jpg', 'jpeg', 'png', 'gif', 'bmp'}
        TYPES_AUDIO = {'mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm'}
        MAX_SIZE_IMAGE = 5 * 1024 * 1024  # 5 MB
        MAX_SIZE_AUDIO = 10 * 1024 * 1024  # 10 MB
        
        pieces_creees = []
        erreurs = []
        
        for fichier in fichiers:
            try:
                print(f'\n📄 Processing: {fichier.name}')
                # Récupérer l'extension
                ext = fichier.name.split('.')[-1].lower()
                print(f'📌 Extension: {ext}')
                
                # Valider le type
                if ext in TYPES_IMAGES:
                    max_size = MAX_SIZE_IMAGE
                    type_fichier = 'image'
                elif ext in TYPES_AUDIO:
                    max_size = MAX_SIZE_AUDIO
                    type_fichier = 'audio'
                    print(f'✅ Audio type detected: {ext}')
                else:
                    erreurs.append({
                        'fichier': fichier.name,
                        'motif': f'Type non autorisé (.{ext}). Images: jpg/png/gif/bmp, Audio: mp3/wav/m4a/aac/ogg/webm'
                    })
                    print(f'❌ Invalid type: {ext}')
                    continue
                
                # Valider la taille
                if fichier.size > max_size:
                    max_mb = max_size / (1024 * 1024)
                    erreurs.append({
                        'fichier': fichier.name,
                        'motif': f'Fichier trop volumineux. Max: {max_mb:.0f} MB'
                    })
                    print(f'❌ File too large: {fichier.size} > {max_size}')
                    continue
                
                # Sauvegarder le fichier
                directory = f'demandes_intervention/{di.id}'
                filename = fichier.name
                filepath = os.path.join(directory, filename)
                
                print(f'💾 Saving to: {filepath}')
                # Utiliser Django's storage system
                saved_path = default_storage.save(filepath, fichier)
                print(f'✅ File saved: {saved_path}')
                
                # Générer URL du fichier
                url = default_storage.url(saved_path)
                print(f'🔗 URL generated: {url}')
                
                # Fallback: ensure URL starts with /media/ if not absolute
                if not url.startswith('http') and not url.startswith('/media/'):
                    url = f'/media/{saved_path}'
                    print(f'🔧 URL corrected to: {url}')
                
                # Créer la pièce jointe
                piece = PieceJointeDI.objects.create(
                    idDemandeIntervention=di,
                    nomFichier=fichier.name,
                    typeFichier=f'{type_fichier}/{ext}',
                    url=url
                )
                
                print(f'✅ Database record created: {piece.id}')
                pieces_creees.append(PieceJointeDISerializer(piece).data)
                
            except Exception as e:
                print(f'❌ Error: {str(e)}')
                erreurs.append({
                    'fichier': fichier.name,
                    'motif': str(e)
                })
        
        # Enregistrer l'upload d'un ou plusieurs fichiers
        if pieces_creees:
            log_audit(self.request, 'UPLOAD_FICHIERS', 'ORDRES', 'DemandeIntervention', di.id,
                      nouvelle_valeur={'fichiers_count': len(pieces_creees), 'type': 'mixed'})
        
        resultat = {
            'fichiers_ajoutes': len(pieces_creees),
            'fichiers': pieces_creees,
        }
        
        if erreurs:
            resultat['erreurs'] = erreurs
        
        print(f'\n✅ UPLOAD COMPLETE: {len(pieces_creees)} files saved, {len(erreurs)} errors')
        return Response(resultat, status=status.HTTP_200_OK)
    
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

    def perform_create(self, serializer):
        ot = serializer.save()
        
        log_audit(self.request, 'CREATE', 'ORDRES', 'OrdreTravail', ot.id,
                  nouvelle_valeur={'numero': ot.numero, 'type': ot.type, 'statut': ot.statut})
        
        # Passer l'actif au statut "en_maintenance" lors de la création de l'OT
        ancien_statut_actif = ot.idActif.statut
        if ancien_statut_actif != 'en_maintenance':
            ot.idActif.statut = 'en_maintenance'
            ot.idActif.save()
            
            # Créer historique du changement de statut de l'actif
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

        log_audit(self.request, 'AFFECTER_EQUIPE', 'ORDRES', 'OrdreTravail', ot.id,
                  nouvelle_valeur={'equipe_id': str(request.data.get('idEquipe'))})

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

        log_audit(self.request, 'CLOTURER', 'ORDRES', 'OrdreTravail', ot.id,
                  ancienne_valeur={'statut': ancien}, 
                  nouvelle_valeur={'statut': 'CLOTURE', 'duree': ot.dureeReelleMin, 'type_cloture': ot.typeCloture})

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
        print(f'📝 Creating demande...')
        print(f'   User: {self.request.user}')
        print(f'   User ID: {self.request.user.id if self.request.user else None}')
        print(f'   Is authenticated: {self.request.user.is_authenticated if self.request.user else False}')
        # Vérifier s'il existe déjà une DI active pour cet actif
        actif = serializer.validated_data.get('idActif')
        di_existante = DemandeIntervention.objects.filter(
            idActif=actif,
            statut__in=['en_attente']
        ).first()
        
        if di_existante:
            # Vérifier si l'OT associée est clôturée
            ot_actifs = OrdreTravail.objects.filter(
                idDemandeIntervention=di_existante
            ).exclude(statut='CLOTURE').exists()
            
            if ot_actifs:
                raise ValidationError(
                    f"Impossible de créer une nouvelle demande. "
                    f"La demande {di_existante.numero} existe déjà et son OT n'est pas encore terminé(e)."
                )
        
        serializer.save(
            idUtilisateurSignalement=self.request.user if self.request.user.is_authenticated else None
        )
        print(f'✅ Demande created with user: {serializer.instance.idUtilisateurSignalement}')

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

        # Créer automatiquement l'OT
        ot = OrdreTravail.objects.create(
            idActif=di.idActif,
            idDemandeIntervention=di,
            type='correctif',
            priorite=di.urgence,
            statut='OUVERT',
            description=di.description,
        )

        # Passer l'actif au statut "en_maintenance"
        ancien_statut_actif = di.idActif.statut
        di.idActif.statut = 'en_maintenance'
        di.idActif.save()
        
        # Créer historique du changement de statut de l'actif
        from apps.actifs.models import HistoriqueStatut
        HistoriqueStatut.objects.create(
            idActif=di.idActif,
            ancienStatut=ancien_statut_actif,
            nouveauStatut='en_maintenance',
            motif=f'OT #{ot.numero} créé - Demande Intervention #{di.numero}',
            modifiePar=getattr(request.user, 'utilisateur', None)
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
        
        print(f'\n🔍 UPLOAD DEBUG: Started upload for demande {di.id}')
        print(f'📦 Files received: {len(fichiers)}')
        for f in fichiers:
            print(f'  - {f.name} ({f.size} bytes, type: {f.content_type})')
        
        if not fichiers:
            return Response(
                {'error': 'Aucun fichier à télécharger'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        TYPES_IMAGES = {'jpg', 'jpeg', 'png', 'gif', 'bmp'}
        TYPES_AUDIO = {'mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm'}
        MAX_SIZE_IMAGE = 5 * 1024 * 1024  # 5 MB
        MAX_SIZE_AUDIO = 10 * 1024 * 1024  # 10 MB
        
        pieces_creees = []
        erreurs = []
        
        for fichier in fichiers:
            try:
                print(f'\n📄 Processing: {fichier.name}')
                # Récupérer l'extension
                ext = fichier.name.split('.')[-1].lower()
                print(f'📌 Extension: {ext}')
                
                # Valider le type
                if ext in TYPES_IMAGES:
                    max_size = MAX_SIZE_IMAGE
                    type_fichier = 'image'
                elif ext in TYPES_AUDIO:
                    max_size = MAX_SIZE_AUDIO
                    type_fichier = 'audio'
                    print(f'✅ Audio type detected: {ext}')
                else:
                    erreurs.append({
                        'fichier': fichier.name,
                        'motif': f'Type non autorisé (.{ext}). Images: jpg/png/gif/bmp, Audio: mp3/wav/m4a/aac/ogg/webm'
                    })
                    print(f'❌ Invalid type: {ext}')
                    continue
                
                # Valider la taille
                if fichier.size > max_size:
                    max_mb = max_size / (1024 * 1024)
                    erreurs.append({
                        'fichier': fichier.name,
                        'motif': f'Fichier trop volumineux. Max: {max_mb:.0f} MB'
                    })
                    print(f'❌ File too large: {fichier.size} > {max_size}')
                    continue
                
                # Sauvegarder le fichier
                directory = f'demandes_intervention/{di.id}'
                filename = fichier.name
                filepath = os.path.join(directory, filename)
                
                print(f'💾 Saving to: {filepath}')
                # Utiliser Django's storage system
                saved_path = default_storage.save(filepath, fichier)
                print(f'✅ File saved: {saved_path}')
                
                # Générer URL du fichier
                url = default_storage.url(saved_path)
                print(f'🔗 URL generated: {url}')
                
                # Fallback: ensure URL starts with /media/ if not absolute
                if not url.startswith('http') and not url.startswith('/media/'):
                    url = f'/media/{saved_path}'
                    print(f'🔧 URL corrected to: {url}')
                
                # Créer la pièce jointe
                piece = PieceJointeDI.objects.create(
                    idDemandeIntervention=di,
                    nomFichier=fichier.name,
                    typeFichier=f'{type_fichier}/{ext}',
                    url=url
                )
                
                print(f'✅ Database record created: {piece.id}')
                pieces_creees.append(PieceJointeDISerializer(piece).data)
                
            except Exception as e:
                print(f'❌ Error: {str(e)}')
                erreurs.append({
                    'fichier': fichier.name,
                    'motif': str(e)
                })
        
        resultat = {
            'fichiers_ajoutes': len(pieces_creees),
            'fichiers': pieces_creees,
        }
        
        if erreurs:
            resultat['erreurs'] = erreurs
        
        print(f'\n✅ UPLOAD COMPLETE: {len(pieces_creees)} files saved, {len(erreurs)} errors')
        return Response(resultat, status=status.HTTP_200_OK)
    
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

    def perform_create(self, serializer):
        ot = serializer.save()
        
        # Passer l'actif au statut "en_maintenance" lors de la création de l'OT
        ancien_statut_actif = ot.idActif.statut
        if ancien_statut_actif != 'en_maintenance':
            ot.idActif.statut = 'en_maintenance'
            ot.idActif.save()
            
            # Créer historique du changement de statut de l'actif
            from apps.actifs.models import HistoriqueStatut
            HistoriqueStatut.objects.create(
                idActif=ot.idActif,
                ancienStatut=ancien_statut_actif,
                nouveauStatut='en_maintenance',
                motif=f'OT #{ot.numero} créé',
                modifiePar=getattr(self.request.user, 'utilisateur', None)
            )

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