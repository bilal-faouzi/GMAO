# 🎤 Enregistrement Audio Direct - Guide Utilisateur

**Date:** 16 Avril 2026  
**État:** ✅ Implémenté  
**Fonctionnalité:** Enregistrement audio en direct depuis l'application

---

## 📋 Vue d'ensemble

L'opérateur peut désormais **enregistrer un audio directement depuis son navigateur** lors de la déclaration d'une panne, sans avoir besoin d'enregistrer d'abord avec un appareil externe.

**Cas d'utilisation:**
- 🎙️ Capturer le bruit anormal de l'équipement
- 🎙️ Décrire le problème verbalement
- 🎙️ Enregistrer le diagnostic initial
- 🎙️ Fournir contexte audio supplémentaire

---

## 🚀 Comment utiliser

### Étape 1: Accès à la page de déclaration

```
URL: /ordres/demandes/nouveau
ou cliquer sur "Déclarer une panne"
```

### Étape 2: Remplir les informations de base

```
1. Sélectionner l'équipement en panne
2. Indiquer le niveau d'urgence
3. Décrire le problème (texte)
```

### Étape 3: Enregistrer un audio *(NEW)*

**Option A: Enregistrement direct**
```
1. Cliquer bouton "Démarrer l'enregistrement" 🎤
2. Dire le problème ou capturer le bruit
3. Voir le timer: "0:15" (15 secondes)
4. Cliquer "Arrêter" quand terminé
5. Voir l'audio dans la liste avec:
   - Icône ▶ pour écouter
   - Durée affichée (0:45)
   - Bouton ✕ pour supprimer
```

**Option B: Uploader un fichier audio**
```
1. Cliquer zone "Ajouter un audio (fichier)"
2. Sélectionner fichier MP3/WAV/M4A/NRG/OGG (< 10 MB)
3. Voir affichage: nom + taille
4. Bouton ✕ pour supprimer
```

### Étape 4: Combiner avec photos (optionnel)

```
1. Cliquer zone "Ajouter des photos"
2. Sélectionner images JPG/PNG (< 5 MB)
3. Voir aperçus thumbnails
```

### Étape 5: Soumettre

```
1. Cliquer "Déclarer la panne"
2. ✅ Demande DI-2026-XXXX créée
3. ✅ Image + Audio uploadés
4. ✅ Responsable notifié
```

---

## 📱 Interface de Recordage

### État "Prêt à enregistrer"
```
┌─────────────────────────────────┐
│ 🎤 Démarrer l'enregistrement    │
└─────────────────────────────────┘
```
Bouton bleu, cliquer pour démarrer

### État "En cours d'enregistrement"
```
┌────────────────────────────────────────┐
│   ⚫(pulse) En cours d'enregistrement  │
│   0:15                      [Arrêter]  │
└────────────────────────────────────────┘
```
- Point rouge pulse
- Timer: MM:SS
- Bouton rouge "Arrêter"

### Après enregistrement
```
▶ recording_1713267000000.webm
  0:45
  [✕]
```
- Bouton play pour écouter
- Durée affichée
- Fichier prêt à uploader

---

## ⚙️ Configuration & Permissions

### Navigateur - Accès Microphone

**Première utilisation:**
```
Navigateur demande: "Autoriser FrontendApp à utiliser le microphone?"
  [Bloquer] [Autoriser]
```
Cliquer **"Autoriser"** pour continuer

**Microphone déjà autorisé:**
Aucune demande, enregistrement démarre immédiatement

**Refusal / Problème:**
```
Message d'erreur:
"Erreur microphone: Permission denied. Vérifiez les permissions."
```
Solution:
1. Vérifier paramètres navigateur (Microphone autorisé)
2. Relancer la page
3. Essayer dans navigation privée (mode incognito)

---

## 🎙️ Spécifications Techniques

### Format d'enregistrement

| Propriété | Valeur |
|-----------|--------|
| Format | WebM (audio) |
| Codec | Vorbis |
| Taux échantillonnage | 44.1 kHz (auto) |
| Canaux | Mono/Stéréo (auto) |
| Taille typique | ~100 KB/seconde |

### Durée maximale

- **Pas de limite de durée** dans l'app
- Limité par stockage navigateur et mémoire
- Pratique: 1-5 minutes suffisent généralement
- Maximum ~1 heure techniquement possible

### Conversion fichier

- Enregistrement WebM converti en File
- Nom: `recording_TIMESTAMP.webm`
- Exemple: `recording_1713267000000.webm`

---

## 🔊 Écoute de l'audio

### Depuis la page de déclaration

```
Avant envoi de la demande:
1. Voir liste des audios enregistrés
2. Cliquer bouton "▶" pour écouter
3. Audio joue dans lecteur navigateur
```

### Après validation de la demande

**Responsable technique** peut:
1. Accès: `/ordres/demandes` → Voir demande DI-2026-XXXX
2. Voir section "Pièces jointes"
3. Voir 🎙️ recording_..., webm
4. Cliquer pour télécharger/écouter

---

## ⚠️ Limitations & Considérations

### Navigateurs supportés

✅ **Chrome/Edge 47+**
✅ **Firefox 29+**
✅ **Safari 14.1+** (iOS 14.5+)
✅ **Opera 34+**

❌ **Internet Explorer** (non supporté)

### Situations problématiques

1. **Pas d'accès microphone**
   - Autoriser dans paramètres navigateur
   - Vérifier microphone connecté
   - Relancer navigateur

2. **Bruits de fond**
   - Enregistreur sensible
   - Conseil: Enregistrer dans endroit calme si possible
   - Editer audio avant upload si nécessaire

3. **Durée très longue**
   - Impact taille fichier
   - Peut ralentir upload
   - Conseil: Enregistrer plusieurs audios courts

4. **Double enregistrement**
   - Appuyer "Arrêter" puis "Démarrer" crée nouveau fichier
   - Les deux audios sont gardés
   - Peut supprimer individuellement avec ✕

---

## 💾 Ce qu'il se passe

### Flux d'enregistrement

```
1. Utilisateur clic "Démarrer"
   ↓
2. Navigateur demande accès microphone
   ↓
3. Utilisateur autorise (si première fois)
   ↓
4. Enregistrement démarre
   ↓
5. Timer compte les secondes
   ↓
6. Utilisateur parle/capture bruit
   ↓
7. Utilisateur clic "Arrêter"
   ↓
8. Audio converti en Blob
   ↓
9. Blob = File (recording_XXXX.webm)
   ↓
10. Fichier ajouté à liste "audioFiles"
   ↓
11. Prêt à uploader avec demande
```

### Lors de l'envoi

```
1. Créer demande d'intervention (DI)
2. Obtenir ID demande
3. Téléverser tous fichiers (images + audios)
   - URL: POST /api/v1/ordres/demandes/{id}/telecharger_fichiers/
   - Contenu: FormData avec fichiers
4. Réponse: Confirmation upload
5. Message succès affiché
```

---

## 🎯 Cas d'Usage Pratiques

### Exemple 1: Panne moteur

```
Opérateur sur site:
1. Déclarer panne: "Moteur pont roulant"
2. Urgence: Critique
3. Description: "Bruit anormal au démarrage"
4. ← NOUVEAU: Clic "Démarrer l'enregistrement"
5. Positionne téléphone près du moteur
6. Attend 30 secondes du bruit
7. Clic "Arrêter"
8. Voit: "recording_XXX.webm (0:30)"
9. Envoie demande

Responsable technique:
1. Reçoit demande avec audio
2. Écoute le bruit
3. Reconnaît problème spécifique
4. Crée OT avec meilleur contexte
```

### Exemple 2: Diagnostic verbal

```
Opérateur:
1. Sélectionner équipement
2. Urgence: Normale
3. ← NOUVEAU: Enregistrement: "Vibrations anormales, 
   grilles usées probablement, demande devis remplacement"
4. Upload photo de la grille
5. Envoie

Résultat:
- Responsable a audio + photo
- Peut directement estimer coûts
- Décision plus rapide
```

---

## 🐛 Troubleshooting

### "Permission denied"

```
❌ Message: "Erreur microphone: Permission denied"

✅ Solutions:
1. Vérifier navigateur autorise microphone:
   - Chrome: Settings > Privacy > Microphone
   - Firefox: Preferences > Privacy > Microphone
   - Safari: System Prefs > Security > Microphone
2. Vérifier microphone connecté/actif
3. Relancer navigateur
4. Mode incognito: éviter cache
```

### "Enregistrement ne démarre pas"

```
❌ Pas d'activité après clic "Démarrer"

✅ Vérifications:
1. Microphone connecté? (branchement, volume)
2. Aucun logiciel autre utilise micro (Teams, Skype, etc.)
3. Fermer tous onglets audio actifs
4. Redémarrer navigateur
5. Essayer dans Chrome (plus stable)
```

### "Audio trop silencieux/fort"

```
❌ Enregistrement inaudible ou crépitant

✅ Solutions:
1. Régler volume microphone OS (Settings > Sound)
2. Rapprocher microphone de source
3. Éloigner de ventilateurs/bruits parasites
4. Essayer enregistrement test
5. Réenregistrer si nécessaire
```

### "Fichier ne s'upload pas"

```
❌ Après clic "Déclarer", audio pas envoyé

✅ Vérifier:
1. Console navigateur (F12): Y-a-t-il erreur?
2. Vérifier connection internet
3. Vérifier backend en ligne (/api/health)
4. Taille du fichier (< 10 MB)
5. Réessayer enregistrement + envoi
```

---

## 📊 Avantages

| Avantage | Bénéfice |
|----------|----------|
| ✅ Enregistrement direct | Pas besoin d'app externe |
| ✅ Gratuit | Utilise juste navigateur |
| ✅ Contexte audio | Meilleur diagnostic |
| ✅ Rapide | 1-2 minutes capture du problème |
| ✅ Stocké | Archive de la demande |
| ✅ Accessible | Responsive mobile/desktop |

---

## 🚀 Prochaines étapes possibles

- [ ] Transcription audio automatique (Google Speech-to-Text)
- [ ] Analyse spectre sonore (détecter type panne)
- [ ] Compression audio avant upload
- [ ] Lecteur audio intégré dans UI
- [ ] Enregistrement directement avec caméra vidéo
- [ ] Édition audio (trim, volume)

---

**Support:** Pour problèmes, consulter documentation technique ou contacter support
