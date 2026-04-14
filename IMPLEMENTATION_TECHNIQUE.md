# 🔧 IMPLÉMENTATION TECHNIQUE - WORKFLOW INTERVENTIONS

## 📋 Checklist d'implémentation

### ✅ Frontend - COMPLÉTÉ

- [x] DeclarerPanne.jsx - Upload d'images
- [x] GestionOTs.jsx - Gestion des OT
- [x] CompteRenduOT.jsx - Compte rendu (NOUVEAU)
- [x] ValidationOperateur.jsx - Validation finale
- [x] InterfaceMagasinier.jsx - Allocation pièces
- [x] Routes dans App.jsx
- [x] Documentation complète

### ⏳ Backend - À COMPLÉTER

#### 🔴 PRIORITÉ 1: Endpoint upload fichiers

**Fichier:** `backend/apps/ordres/views.py`

```python
# ADD THIS ENDPOINT

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def telecharger_fichiers_di(request, pk):
    """
    Endpoint: POST /api/v1/ordres/demandes/{id}/telecharger_fichiers/
    Télécharge plusieurs fichiers pour une demande d'intervention
    """
    try:
        demande = DemandeIntervention.objects.get(pk=pk)
    except DemandeIntervention.DoesNotExist:
        return Response({'error': 'Demande non trouvée'}, status=404)
    
    fichiers = request.FILES.getlist('fichiers')
    
    if not fichiers:
        return Response({'error': 'Aucun fichier'}, status=400)
    
    resultat = []
    for fichier in fichiers:
        # Valider type
        ext = fichier.name.split('.')[-1].lower()
        if ext not in ['jpg', 'jpeg', 'png', 'gif', 'bmp']:
            continue
        
        # Valider taille (5MB max)
        if fichier.size > 5 * 1024 * 1024:
            continue
        
        # Créer PieceJointeDI
        piece = PieceJointeDI.objects.create(
            idDemandeIntervention=demande,
            nomFichier=fichier.name,
            typeFichier=ext,
            # À adapter selon votre système de stockage (S3, local, etc.)
            url=generer_url_fichier(fichier)
        )
        resultat.append({
            'id': piece.id,
            'nom': piece.nomFichier,
            'url': piece.url
        })
    
    return Response({
        'fichiers_telecharges': len(resultat),
        'fichiers': resultat
    })
```

**URL à ajouter dans `urls.py`:**
```python
path('demandes/<uuid:pk>/telecharger_fichiers/', 
     views.telecharger_fichiers_di, 
     name='telecharger-fichiers-di'),
```

---

#### 🔴 PRIORITÉ 2: Modèle "Compte Rendu" (optionnel)

Actuellement on utilise `CommentaireOT` pour stocker les rapports. Pour plus de structure:

```python
# backend/apps/ordres/models.py - À AJOUTER

class CompteRenduOT(models.Model):
    """Rapport technique formalisé d'une intervention"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idOrdreTravail = models.OneToOneField(OrdreTravail, on_delete=models.CASCADE, related_name='compte_rendu')
    
    descriptionTravail = models.TextField()
    constatations = models.TextField(blank=True)
    causeRacine = models.CharField(max_length=20, choices=[
        ('mecanique', 'Mécanique'),
        ('electrique', 'Électrique'),
        ('humain', 'Erreur humaine'),
        ('externe', 'Facteur externe'),
        ('autre', 'Autre'),
    ])
    solutionApportee = models.TextField()
    
    idRedacteur = models.ForeignKey('securite.Utilisateur', on_delete=models.SET_NULL, null=True)
    dateRedaction = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Compte rendu OT'
```

**Avantages:**
- Structure dédiée
- Champs typés
- Traçabilité claire
- Rapports facilement extractibles

---

#### 🟡 PRIORITÉ 2bis: Exporter rapport en PDF

```python
# backend/apps/ordres/utils.py

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

def generer_pdf_rapport(ot_id):
    """Génère PDF du rapport d'intervention"""
    ot = OrdreTravail.objects.get(id=ot_id)
    
    # Créer document
    pdf_filename = f"Rapport_{ot.numero}.pdf"
    doc = SimpleDocTemplate(pdf_filename, pagesize=letter)
    
    elements = []
    
    # Header
    elements.append(Paragraph(f"RAPPORT INTERVENTION {ot.numero}", styles['Heading1']))
    elements.append(Spacer(1, 12))
    
    # Infos OT
    info_data = [
        ['Équipement', ot.actif_detail.code],
        ['Priorité', ot.priorite],
        ['Durée estimée', f"{ot.dureeEstimeeMin} min"],
        ['Durée réelle', f"{ot.dureeReelleMin} min"],
    ]
    
    # Ajouter tableaux...
    # Construire PDF...
    
    return pdf_filename
```

---

### 🟢 PRIORITÉ 3: Permissions & Rôles

Vérifier que les permissions sont correctement configurées:

```python
# backend/apps/securite/models.py ou admin

PERMISSIONS = {
    'LIRE_OT': 'Lecture ordres de travail',
    'CREER_OT': 'Créer ordres de travail',
    'MODIFIER_OT': 'Modifier ordres de travail',
    'VALIDER_DI': 'Valider demandes intervention',
    'AFFECTER_EQUIPE': 'Affecter personnel',
    'SORTIE_MAGASIN': 'Enregistrer sorties magasin',
    'CLOTURER_OT': 'Clôturer ordres de travail',
}

ROLES_OT = [
    ('OPERATEUR', ['LIRE_OT']),
    ('RESP_TECH', ['LIRE_OT', 'CREER_OT', 'MODIFIER_OT', 'VALIDER_DI', 'AFFECTER_EQUIPE']),
    ('MAGASINIER', ['SORTIE_MAGASIN', 'LIRE_OT']),
    ('DIRECTEUR', ['LIRE_OT', 'CREER_OT', 'MODIFIER_OT', 'VALIDER_DI', 'AFFECTER_EQUIPE', 'SORTIE_MAGASIN', 'CLOTURER_OT']),
]
```

---

### 🟢 PRIORITÉ 3bis: Notifications

Envoyer notifications lors des actions clés:

```python
# backend/apps/ordres/signals.py

from django.db.models.signals import post_save
from django.core.mail import send_mail

@receiver(post_save, sender=DemandeIntervention)
def notifier_demande_creee(sender, instance, created, **kwargs):
    if created:
        # Email au responsable technique
        send_mail(
            f'Nouvelle demande intervention: {instance.numero}',
            f'La demande DI-{instance.numero} a été créée pour {instance.idActif.code}\nUrgence: {instance.urgence}',
            'gmao@company.com',
            ['resp-tech@company.com'],
            fail_silently=True,
        )

@receiver(post_save, sender=OrdreTravail)
def notifier_ot_cree(sender, instance, created, **kwargs):
    if created:
        # Notifier équipe assignée
        if instance.affectations.exists():
            affectation = instance.affectations.first()
            # Envoyer notif équipe
```

---

## 🧪 Tests Backend À Créer

### Test 1: Upload fichiers
```python
# backend/apps/ordres/tests.py

def test_upload_fichiers_di(self):
    """Test téléversement fichiers pour demande"""
    from django.core.files.uploadedfile import SimpleUploadedFile
    
    di = DemandeIntervention.objects.create(...)
    
    fichier = SimpleUploadedFile(
        "test.jpg",
        b"fake image content",
        content_type="image/jpeg"
    )
    
    response = self.client.post(
        f'/api/v1/ordres/demandes/{di.id}/telecharger_fichiers/',
        {'fichiers': fichier},
    )
    
    self.assertEqual(response.status_code, 200)
    self.assertEqual(PieceJointeDI.objects.count(), 1)
```

### Test 2: Workflow complet
```python
def test_workflow_complet(self):
    """Test workflow: Demande → OT → Rapport → Clôture"""
    
    # 1. Créer demande
    di = DemandeIntervention.objects.create(
        idActif=self.actif,
        urgence='critique',
        description='Moteur en panne'
    )
    self.assertEqual(di.statut, 'en_attente')
    
    # 2. Valider → Crée OT
    valider_demande(di.id)
    di.refresh_from_db()
    self.assertEqual(di.statut, 'validee')
    
    ot = OrdreTravail.objects.filter(idDemandeIntervention=di).first()
    self.assertIsNotNone(ot)
    self.assertEqual(ot.statut, 'OUVERT')
    
    # 3. Affecter équipe
    affecter_equipe(ot.id, {'idEquipe': self.equipe.id})
    ot.refresh_from_db()
    self.assertEqual(ot.statut, 'EN_COURS')
    
    # 4. Ajouter commentaire rapport
    ajouterCommentaire(ot.id, "Moteur remplacé", estInterne=True)
    self.assertEqual(ot.commentaires.count(), 1)
    
    # 5. Clôturer
    cloturer_ot(ot.id, typeCloture='corrige')
    ot.refresh_from_db()
    self.assertEqual(ot.statut, 'CLOTURE')
```

---

## 🔗 API Routes - Résumé

```
# Demandes d'intervention
POST   /api/v1/ordres/demandes/
POST   /api/v1/ordres/demandes/{id}/telecharger_fichiers/  ← NOUVEAU
GET    /api/v1/ordres/demandes/
GET    /api/v1/ordres/demandes/{id}/
POST   /api/v1/ordres/demandes/{id}/valider/
POST   /api/v1/ordres/demandes/{id}/rejeter/

# Ordres de travail
GET    /api/v1/ordres/ots/
POST   /api/v1/ordres/ots/
GET    /api/v1/ordres/ots/{id}/
PUT    /api/v1/ordres/ots/{id}/
DELETE /api/v1/ordres/ots/{id}/
POST   /api/v1/ordres/ots/{id}/changer_statut/
POST   /api/v1/ordres/ots/{id}/affecter_equipe/
POST   /api/v1/ordres/ots/{id}/ajouter_commentaire/
POST   /api/v1/ordres/ots/{id}/cloturer/
POST   /api/v1/ordres/ots/{id}/enregistrer_piece/

# Données secondaires
GET    /api/v1/ordres/affectations/
GET    /api/v1/ordres/suivitemps/
GET    /api/v1/ordres/commentaires/
GET    /api/v1/ordres/historiques/

# Magasin
POST   /api/v1/magasin/sortie/
GET    /api/v1/magasin/pieces/
```

---

## 🚀 Déploiement - Checklist

```
AVANT MISE EN PRODUCTION:

Backend:
[ ] Endpoint upload fichiers implémenté
[ ] Vérifier permissions OK
[ ] Tester avec fichiers volumineux (>5MB)
[ ] Sauvegarder fichiers sur S3 ou serveur sécurisé
[ ] Logs d'audit implémentés

Frontend:
[ ] Tests upload images
[ ] Vérifier affichage aperçus
[ ] Tests workflow complet E2E
[ ] Performance avec images

DevOps:
[ ] Migrations appliquées
[ ] Backups sauvegardés
[ ] Monitoring actif
[ ] Rollback plan préparé

Utilisateurs:
[ ] Formation équipe opérateur
[ ] Formation équipe technique
[ ] Formation magasinier
[ ] Documentation distribuée
[ ] Support en ligne configuré
```

---

## 📊 Modèles Existants - Vérification

```python
✅ DemandeIntervention
   - dateSignalement ✅
   - urgence ✅
   - description ✅
   - statut ✅
   - idUtilisateurSignalement ✅
   - motifRejet ✅

✅ PieceJointeDI
   - nomFichier ✅
   - url ✅
   - dateTeleversement ✅

✅ OrdreTravail  
   - numero ✅
   - statut ✅
   - priorite ✅
   - echeanceSLA ✅
   - typeCloture ✅
   - dureeReelleMin ✅

✅ AffectationEquipe
   - idEquipe ✅
   - idSousTraitant ✅
   - dateDebut ✅
   - dateFin ✅

✅ CommentaireOT
   - commentaire ✅
   - estInterne ✅
   - dateCreation ✅

✅ PieceUtiliseeOT
   - idPiece ✅
   - quantite ✅
   - prixUnitaireCapture ✅
   - cout_total ✅

✅ HistoriqueStatutOT
   - ancienStatut ✅
   - nouveauStatut ✅
   - motif ✅
   - dateChangement ✅
```

---

## 🔐 Sécurité

```python
✅ Vérifier permissions sur chaque endpoint
✅ Valider fichiers uploadés (type, taille)
✅ Scanner antivirus fichiers (optionnel)
✅ Rate limiting sur upload (2 uploads/min/user)
✅ Logs audit toutes les actions
✅ CORS configuré correctement
✅ CSRF protection active
```

---

## 📈 Performance

```python
✅ Index DB sur statut, dateCreation, idActif
✅ Select_related obligatoire sur détails OT
✅ Pagination 20 items par page
✅ Cache Django sur dashboards
✅ Compression images auto (optionnel)
✅ CDN pour fichiers statiques
```

---

## 📞 Questions commune côté backend

**Q: Où stocker les fichiers ?**
```
Options:
1. Serveur local: /media/demandes_intervention/
2. AWS S3: Recommandé pour scalabilité
3. Azure Blob Storage
4. Stockage NAS réseau

À configurer dans settings.py
```

**Q: Comment gérer les fichiers en cas de suppression DI ?**
```
Solutions:
1. CASCADE delete (supprime aussi fichiers)
2. Garder fichiers mais décrire lien
3. Archiver avant suppression
4. Soft delete (date_suppression)
```

**Q: Format du rapport ?**
```
Actuellement: CommentaireOT (texte libre)
Optionnel: CompteRenduOT (modèle structuré)
Export: JSON ou PDF
```

---

**Document:** Implémentation Technique v1.0
**Créé:** Avril 2026
**État:** Ready for development
