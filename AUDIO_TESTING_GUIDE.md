# 🧪 Guide de Test - Fonctionnalité Audio

**État:** ✅ Prêt à tester  
**Date:** Avril 16, 2026

---

## 📋 Checklist de Test

### 1️⃣ Test Frontend - Déclaration de panne avec audio

#### Test 1.1: Upload audio simple
```
Étapes:
1. Aller à /ordres/demandes/nouveau (Déclarer panne)
2. Sélectionner équipement: "PREFA-CONCASSEUR-01"
3. Urgence: "Critique"
4. Description: "Bruit moteur anormal"
5. Cliquer "Ajouter un audio"
6. Sélectionner fichier: equipment_sound.mp3
7. Vérifier affichage fichier:
   - Icône 🎙️
   - Nom: "equipment_sound.mp3"
   - Taille: "X.XX MB"
8. Cliquer "Déclarer la panne"

Attendu:
✅ Demande créée (DI-2026-XXXX)
✅ Message succès: "Demande enregistrée"
✅ Audio uploadé
✅ Affichage dans "Mes déclarations récentes"
```

#### Test 1.2: Upload image + audio ensemble
```
Étapes:
1. Aller à /ordres/demandes/nouveau
2. Sélectionner équipement: "PREFA-BETONIERE-02"
3. Description: "Tambour déséquilibré"
4. Cliquer "Ajouter des photos" → Sélectionner photo-1.jpg
5. Vérifier affichage photo en aperçu
6. Cliquer "Ajouter un audio" → Sélectionner sound.mp3
7. Vérifier affichage audio dans liste
8. Cliquer "Déclarer la panne"

Attendu:
✅ 1 image + 1 audio uploadés
✅ Response: "fichiers_ajoutes": 2
✅ Aucune erreur dans console
```

#### Test 1.3: Suppression fichier audio avant envoi
```
Étapes:
1. Aller à /ordres/demandes/nouveau
2. Ajouter audio: sound.mp3
3. Voir liste audio
4. Cliquer bouton "✕" pour supprimer
5. Vérifier disparition du fichier de la liste
6. Cliquer "Déclarer la panne"

Attendu:
✅ Fichier supprimé de la liste
✅ Pas d'upload du fichier supprimé
```

#### Test 1.4: Format audio non accepté
```
Étapes:
1. (Backend) Modifier validation pour refuser: test.exe, test.pdf
2. Aller à /ordres/demandes/nouveau
3. Essayer upload: malware.exe
4. Vérifier erreur affichée lors de l'upload

Attendu:
✅ Erreur détectée au upload
✅ Message: "Type non autorisé"
✅ Fichier pas ajouté à la liste
```

#### Test 1.5: Fichier audio trop volumineux
```
Étapes:
1. Créer fichier audio > 10 MB (e.g. silence_15mb.wav)
2. Aller à /ordres/demandes/nouveau
3. Essayer upload du fichier
4. Vérifier réaction du système

Attendu:
✅ Erreur lors de l'upload
✅ Message: "Max: 10 MB"
✅ Fichier pas ajouté à la liste
```

---

### 2️⃣ Test Backend - Endpoint upload

#### Test 2.1: Upload audio via API directe
```bash
# Prealable: Créer demande DI
DI_ID="<uuid-demande>"

# Upload audio
curl -X POST http://localhost:8000/api/v1/ordres/demandes/$DI_ID/telecharger_fichiers/ \
  -H "Authorization: Bearer <token>" \
  -F "fichiers=@equipment_sound.mp3"

# Réponse attendue:
{
  "fichiers_ajoutes": 1,
  "fichiers": [
    {
      "id": "uuid-1",
      "nomFichier": "equipment_sound.mp3",
      "typeFichier": "audio/mp3",
      "url": "/media/demandes_intervention/.../equipment_sound.mp3",
      "dateTeleversement": "2026-04-16T14:30:00Z"
    }
  ],
  "erreurs": []
}
```

#### Test 2.2: Upload image + audio ensemble
```bash
DI_ID="<uuid-demande>"

curl -X POST http://localhost:8000/api/v1/ordres/demandes/$DI_ID/telecharger_fichiers/ \
  -H "Authorization: Bearer <token>" \
  -F "fichiers=@photo.jpg" \
  -F "fichiers=@sound.mp3"

# Réponse attendue:
{
  "fichiers_ajoutes": 2,
  "fichiers": [
    { "typeFichier": "image/jpg", ... },
    { "typeFichier": "audio/mp3", ... }
  ]
}
```

#### Test 2.3: Validation taille (image > 5MB)
```bash
# Créer image > 5 MB
dd if=/dev/urandom of=large.jpg bs=1M count=6

DI_ID="<uuid-demande>"

curl -X POST http://localhost:8000/api/v1/ordres/demandes/$DI_ID/telecharger_fichiers/ \
  -H "Authorization: Bearer <token>" \
  -F "fichiers=@large.jpg"

# Réponse attendue:
{
  "fichiers_ajoutes": 0,
  "fichiers": [],
  "erreurs": [
    {
      "fichier": "large.jpg",
      "motif": "Fichier trop volumineux. Max: 5 MB"
    }
  ]
}
```

#### Test 2.4: Validation type fichier invalide
```bash
DI_ID="<uuid-demande>"

curl -X POST http://localhost:8000/api/v1/ordres/demandes/$DI_ID/telecharger_fichiers/ \
  -H "Authorization: Bearer <token>" \
  -F "fichiers=@document.pdf"

# Réponse attendue:
{
  "fichiers_ajoutes": 0,
  "fichiers": [],
  "erreurs": [
    {
      "fichier": "document.pdf",
      "motif": "Type non autorisé (.pdf). Images: jpg/png/gif/bmp, Audio: mp3/wav/m4a/aac/ogg"
    }
  ]
}
```

---

### 3️⃣ Test Données - Vérifier stockage

#### Test 3.1: Fichier créé en base de données
```bash
# Django query
python manage.py shell

from apps.ordres.models import PieceJointeDI, DemandeIntervention

# Vérifier fichier uploadé
di = DemandeIntervention.objects.latest('created_at')
print(f"Demande: {di.numero}")
print(f"Fichiers jointes: {di.pieces_jointes.count()}")

for piece in di.pieces_jointes.all():
    print(f"  - {piece.nomFichier} ({piece.typeFichier})")

# Attendu:
# Demande: DI-2026-0001
# Fichiers jointes: 2
#   - equipment_sound.mp3 (audio/mp3)
#   - photo.jpg (image/jpg)
```

#### Test 3.2: Sérialisation correcte
```bash
# Vérifier API GET demande retourne fichiers
curl http://localhost:8000/api/v1/ordres/demandes/<id>/ \
  -H "Authorization: Bearer <token>"

# Réponse attendue inclut:
"pieces_jointes": [
  {
    "id": "uuid",
    "nomFichier": "equipment_sound.mp3",
    "typeFichier": "audio/mp3",
    "url": "...",
    "dateTeleversement": "2026-04-16T14:30:00Z"
  }
]
```

---

### 4️⃣ Test Responsable Technique

#### Test 4.1: Voir audio dans détails demande
```
Étapes:
1. Login: compte responsable technique
2. Aller à /ordres/demandes (Gestion des demandes)
3. Chercher demande: "DI-2026-0001" (créée avec audio)
4. Cliquer pour voir détails
5. Chercher section "Pièces jointes"
6. Vérifier affichage:
   - 📷 Photo: photo.jpg
   - 🎙️ Audio: equipment_sound.mp3

Attendu:
✅ Audio visible dans UI
✅ Audio joue si cliqué
✅ Taille fichier affichée
```

#### Test 4.2: Décision validation avec audio présent
```
Étapes:
1. Voir demande avec audio
2. Écouter audio pour contexte supplémentaire
3. Cliquer "Valider" ou "Rejeter"
4. Vérifier creation OT (si validé)

Attendu:
✅ Présence audio facilite décision
✅ OT créé correctement
✅ Audio conservé en historique
```

---

### 5️⃣ Test Permissions

#### Test 5.1: Opérateur peut uploader audio
```
Attendu:
✅ Utilisateur role 'operateur' peut uploader audio
✅ Pas d'erreur permission
```

#### Test 5.2: Utilisateur non authentifié ne peut pas uploader
```bash
curl -X POST http://localhost:8000/api/v1/ordres/demandes/<id>/telecharger_fichiers/ \
  -F "fichiers=@sound.mp3"

# Réponse attendue: 401 Unauthorized
```

#### Test 5.3: Responsable technique peut voir audio
```
Attendu:
✅ Responsable voit tous audio uploadés
✅ Peut télécharger audio pour écoute
```

---

## 🎵 Fichiers de test recommandés

### Créer fichiers de test

**Audio MP3 (petit):**
```bash
# Créer 1 seconde silence
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -q:a 9 -acodec libmp3lame test.mp3
```

**Audio WAV (petit):**
```bash
# Créer 1 seconde silence
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 test.wav
```

**Image JPG (petit):**
```bash
# Créer image 100x100 blanche
convert -size 100x100 xc:white test.jpg
```

**Audio volumineux (10+ MB):**
```bash
# Créer fichier largeaudio.wav de 15 MB
ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 60 -b:a 256k large.wav
```

---

## 📊 Résultats attendus

| Test | Frontend | Backend | DB | Responsable |
|------|----------|---------|-----|-------------|
| Upload audio MP3 | ✅ Affichage | ✅ 200 OK | ✅ Créé | ✅ Visible |
| Upload image+audio | ✅ 2 fichiers | ✅ 200 OK | ✅ 2 entrées | ✅ 2 fichiers |
| Suppression avant envoi | ✅ Disparu | N/A | N/A | N/A |
| Audio > 10MB | ✅ Erreur | ✅ Erreur | ✅ Non créé | N/A |
| Image > 5MB | ✅ Erreur | ✅ Erreur | ✅ Non créé | N/A |
| Type invalide | ✅ Erreur | ✅ Erreur | ✅ Non créé | N/A |

---

## ✅ Validation finale

- [ ] Tous les tests Frontend passent
- [ ] Tous les tests Backend passent
- [ ] Tous les tests Données passent
- [ ] Permissions correctes
- [ ] Console navigateur: 0 erreur
- [ ] Network tab: Upload OK
- [ ] Base de données: Données correctes
- [ ] UI responsive (mobile OK)

---

## 🚀 Après validation

1. Merge code vers `main`
2. Deploy backend
3. Deploy frontend
4. Notifier équipe utilisateurs
5. Ajouter à documentation utilisateur
