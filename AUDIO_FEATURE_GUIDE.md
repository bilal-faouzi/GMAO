# 🎙️ Support Audio dans les Demandes d'Intervention - Guide Complet

**Date:** Avril 2026  
**État:** ✅ Implémenté  
**Priorité:** 🟢 Standard

---

## 📋 Vue d'ensemble

L'opérateur peut désormais **envoyer un audio** lors de la déclaration d'une panne, en plus des photos. Cela permet de capturer des bruits anormaux ou des descriptions vocales en temps réel.

### Fichiers types audio supportés:
- **MP3** (MPEG-3)
- **WAV** (Waveform Audio)
- **M4A** (MPEG-4 Audio)
- **AAC** (Advanced Audio Codec)
- **OGG** (Ogg Vorbis)
- **WebM** (WebM Audio)

### Limites:
- **Taille maximale:** 10 MB par fichier
- **Nombre de fichiers:** Illimité (dans la même demande)

---

## 🔧 Modifications Techniques

### Backend

#### 1. **Fichier:** `backend/apps/ordres/views.py`

**Modifications:**
- ✅ Ajout import `PieceJointeDI` dans modèles
- ✅ Ajout import `PieceJointeDISerializer` dans serializers
- ✅ Création endpoint `telecharger_fichiers()`

**Nouvel endpoint:**
```python
@action(detail=True, methods=['post'])
def telecharger_fichiers(request, pk=None):
    """
    Upload fichiers (images ou audio) pour une demande d'intervention.
    
    Types acceptés:
    - Images: jpg, jpeg, png, gif, bmp (5 MB max chacun)
    - Audio: mp3, wav, m4a, aac, ogg, webm (10 MB max chacun)
    """
```

**URL Route:**
```
POST /api/v1/ordres/demandes/{id}/telecharger_fichiers/
Content-Type: multipart/form-data

Body:
- fichiers[] : Les fichiers à uploader
```

**Response:**
```json
{
  "fichiers_ajoutes": 2,
  "fichiers": [
    {
      "id": "uuid-1",
      "nomFichier": "problem_noise.mp3",
      "typeFichier": "audio/mp3",
      "url": "/media/demandes_intervention/uuid/problem_noise.mp3",
      "dateTeleversement": "2026-04-16T14:30:00Z"
    },
    {
      "id": "uuid-2",
      "nomFichier": "equipment_photo.jpg",
      "typeFichier": "image/jpg",
      "url": "/media/demandes_intervention/uuid/equipment_photo.jpg",
      "dateTeleversement": "2026-04-16T14:30:01Z"
    }
  ],
  "erreurs": []
}
```

#### 2. **Validation des fichiers**

| Paramètre | Images | Audio |
|-----------|--------|-------|
| Extensions | jpg, jpeg, png, gif, bmp | mp3, wav, m4a, aac, ogg, webm |
| Taille max | 5 MB | 10 MB |
| Nombre max | Illimité | Illimité |

---

### Frontend

#### **Fichier:** `frontend/src/pages/ordres/DeclarerPanne.jsx`

**Modifications:**
- ✅ Ajout import `Mic` de lucide-react
- ✅ Ajout state: `audioFiles`
- ✅ Fonction `handleAudioChange()` → Upload multiple fichiers audio
- ✅ Fonction `removeAudio()` → Supprimer fichier audio
- ✅ UI de upload audio: Zone avec icône micro
- ✅ Affichage liste fichiers audio avec tailles

**Fonctionnalités:**
```
• Opérateur peut ajouter plusieurs fichiers audio
• Affichage du nom et de la taille de chaque fichier
• Suppression individuelle de fichiers
• Audio envoyés avec la demande (multipart/form-data)
• Support drag-drop (via input file)
```

**UI Components:**
```jsx
// Nouveau section audio
<div>
  <label>Ajouter un audio (optionnel)</label>
  <label className="flex flex-col items-center...">
    <Mic size={20} className="text-blue-400 mb-1" />
    <input type="file" multiple accept="audio/*" />
  </label>
  
  {/* Affichage fichiers audio */}
  {audioFiles.map((audio, i) => (
    <div key={i} className="flex items-center justify-between...">
      <Mic size={16} className="text-blue-400" />
      <p>{audio.name}</p>
      <button onClick={() => removeAudio(i)}>
        <X size={18} />
      </button>
    </div>
  ))}
</div>
```

---

## 💻 Comment utiliser

### Pour l'Opérateur

**Déclarer une panne avec audio:**

1. Aller à **`/ordres/demandes/nouveau`** (ou **Déclarer une panne**)
2. **Sélectionner l'équipement** en panne
3. **Indiquer l'urgence** (Critique/Haute/Normale/Basse)
4. **Décrire le problème** (texte)
5. *(Optionnel)* **Ajouter des photos** (JPG/PNG max 5MB)
6. *(Optionnel)* **Ajouter un audio** du problème (MP3/WAV max 10MB)
   - Cliquer zone **"Ajouter un audio"**
   - Sélectionner fichier audio
   - Voir affichage liste fichiers
7. **Cliquer "Déclarer la panne"**
8. ✅ Demande créée avec numéro DI-YYYY-XXXX

### Pour le Responsable Technique

**Consulter axe audio d'une demande:**

1. Aller à **`/ordres/demandes`** (Gestion demandes)
2. **Cliquer demande** pour voir détails
3. **Voir section "Pièces jointes"** qui affiche:
   - 📷 Photos (images)
   - 🎙️ Audio (fichiers MP3/WAV)
4. **Cliquer sur audio** pour écouter
5. Prendre décision: **Valider** ou **Rejeter**

---

## 🗂️ Modèle de données

### Table `PieceJointeDI` (existante)

```python
class PieceJointeDI(models.Model):
    id                    = UUIDField()
    idDemandeIntervention = ForeignKey(DemandeIntervention)
    nomFichier            = CharField(max_length=255)
    typeFichier           = CharField(max_length=50)  # "audio/mp3", "image/jpg", etc.
    url                   = URLField()
    dateTeleversement     = DateTimeField(auto_now_add=True)
```

**Exemples typeFichier:**
```
image/jpg
image/png
image/gif
audio/mp3
audio/wav
audio/m4a
audio/aac
audio/ogg
audio/webm
```

---

## 🔗 API Endpoints

### Upload fichiers

**Request:**
```
POST /api/v1/ordres/demandes/{id}/telecharger_fichiers/
Authorization: Bearer {token}
Content-Type: multipart/form-data

FormData:
  - fichiers: [Fichier1, Fichier2, ...]
```

**Response (200 OK):**
```json
{
  "fichiers_ajoutes": 2,
  "fichiers": [
    {
      "id": "uuid",
      "nomFichier": "equipment_sound.mp3",
      "typeFichier": "audio/mp3",
      "url": "/media/demandes_intervention/...",
      "dateTeleversement": "2026-04-16T14:30:00Z"
    }
  ],
  "erreurs": []
}
```

**Erreurs possibles:**
```json
{
  "fichiers_ajoutes": 1,
  "fichiers": [...],
  "erreurs": [
    {
      "fichier": "video.mp4",
      "motif": "Type non autorisé (.mp4). Images: jpg/png/gif/bmp, Audio: mp3/wav/m4a/aac/ogg"
    },
    {
      "fichier": "large_file.wav",
      "motif": "Fichier trop volumineux. Max: 10 MB"
    }
  ]
}
```

---

## 📁 Stockage des fichiers

### Configuration recommandée

**Option 1: Stockage local (développement)**
```
/media/demandes_intervention/{demande_id}/{nomFichier}
```

**Option 2: AWS S3 (production)**
```
s3://bucket-name/demandes_intervention/{demande_id}/{nomFichier}
```

### À configurer dans `settings.py` Django

```python
# settings.py

# Stockage local
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# OU AWS S3
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_STORAGE_BUCKET_NAME = 'votre-bucket'
AWS_S3_REGION_NAME = 'eu-west-1'
```

---

## ✅ Checklist Test

- [ ] Upload fichier image seul
- [ ] Upload fichier audio seul
- [ ] Upload image + audio ensemble
- [ ] Validation taille (> 5MB image, > 10MB audio)
- [ ] Validation type fichier (refuser .exe, .pdf)
- [ ] Suppression fichier avant envoi
- [ ] Affichage correct dans liste fichiers
- [ ] Audio joue correctement dans détails DI
- [ ] Permissions: opérateur peut uploader, resp technique peut voir

---

## 🚀 Déploiement

### Étape 1: Backend
```bash
# Pas de migration nécessaire (PieceJointeDI existe déjà)
cd backend
python manage.py runserver
```

### Étape 2: Frontend
```bash
# Le code est déjà dans DeclarerPanne.jsx
cd frontend
npm run dev
```

### Étape 3: Test
```bash
curl -X POST /api/v1/ordres/demandes/{id}/telecharger_fichiers/ \
  -H "Authorization: Bearer {token}" \
  -F "fichiers=@sound.mp3" \
  -F "fichiers=@photo.jpg"
```

---

## 📝 Notes d'implémentation

### Points importants

1. **MIME Types:** Le système accepte tous les types audio courants
2. **Stockage:** Adapter le système selon votre infrastructure
3. **Permissions:** Seulement utilisateurs authentifiés
4. **Cleanup:** Envisager suppression fichiers si DI supprimée
5. **Limite bande passante:** Considérer pour gros fichiers audio

### Peut être amélioré par

- [ ] Transcription audio automatique (Google Speech-to-Text)
- [ ] Compression audio automatique
- [ ] Lecteur audio intégré dans UI
- [ ] Enregistrement audio directement depuis navigateur
- [ ] Analyse du spectre sonore pour identifier dysfonctionnements
- [ ] Intégration avec système de maintenance prédictive

---

## 🐛 Troubleshooting

### "Fichier trop volumineux"
- Vérifier taille fichier: Max 10 MB pour audio, 5 MB pour images
- Compresser fichier audio avant upload

### "Type non autorisé"
- Formats acceptés: MP3, WAV, M4A, AAC, OGG, WebM pour audio
- JPG, PNG, GIF, BMP pour images
- Convertir fichier au format correct

### "Erreur 400 - Aucun fichier"
- S'assurer fichier est sélectionné
- Vérifier FormData inclut clé 'fichiers'

### Audio ne joue pas
- Vérifier navigateur supporte format (tous les navigateurs modernes OK)
- Essayer format différent (MP3 est le plus universel)
- Vérifier permissions d'accès au fichier

---

## 📞 Support

Pour questions ou issues:
- Documenter dans issue tracker
- Inclure: navigateur, taille fichier, format fichier, message erreur exact
