<!-- GUIDE TEST RAPIDE - MEDIA LOADING FIX -->

# ⚡ Test Rapide: Fix Chargement Fichiers Médias

## ✅ Checklist Pre-Test

- [ ] Backend Django démarre sans erreur sur `http://localhost:8000`
- [ ] Frontend Vite démarre sans erreur sur `http://localhost:5173`
- [ ] Vous êtes connecté (voir user dans le coin bas-gauche du sidebar)

---

## 🚀 Procédure Test (5 min)

### 1️⃣ Créer une Demande d'Intervention avec Fichiers

**URL**: http://localhost:5173/ordres/demandes/creer

1. Remplir le formulaire:
   - ✅ Sélectionner un actif
   - ✅ Remplir description
   - ✅ **Uploader 1 image** (JPG/PNG)
   - ✅ **Uploader 1 audio** (MP3/WAV)

2. Cliquer "Déclarer la panne"

3. Copier le **numéro de demande** (ex: DI-2026-0042)

### 2️⃣ Consulter la Demande et Vérifier l'Affichage

**URL**: http://localhost:5173/ordres/demandes/[ID]

#### Test Image
- [ ] L'image s'affiche (pas de message d'erreur)
- [ ] Cliquer sur l'image → modal s'ouvre
- [ ] Modal affiche l'image en grand
- [ ] Bouton ✕ ferme la modal
- [ ] Icône download fonctionne

#### Test Audio
- [ ] Le lecteur audio s'affiche
- [ ] Nom du fichier visible
- [ ] Bouton play ▶ cliquable (pas grisé)
- [ ] Cliquer play → audio se lance
- [ ] Barre de progression se met à jour
- [ ] Cliquer pause ⏸ → pause l'audio
- [ ] Cliquer sur la barre → seek fonctionne
- [ ] Durée affichée correctement (ex: 0:30)
- [ ] Icône download fonctionne

#### Test Vidéo (si présente)
- [ ] Le lecteur vidéo s'affiche
- [ ] Contrôles HTML5 visibles (play, volume, fullscreen)
- [ ] Vidéo joue

### 3️⃣ Vérifier les Messages d'Erreur

Si une erreur s'affiche, elle doit être **explicite**:

- ✅ "Session expirée. Veuillez vous reconnecter." → Token expiré
- ✅ "Fichier non trouvé sur le serveur." → Fichier supprimé
- ✅ "Vous n'avez pas la permission d'accéder à ce fichier." → Permission manquante
- ❌ "Impossible de charger l'audio" ← trop vague (ancien code)

### 4️⃣ DevTools - Vérifier les Requêtes Réseau

1. Ouvrir DevTools (F12)
2. Aller à l'onglet **Network**
3. Actualiser la page
4. Chercher les requêtes:
   - `/media/demandes_intervention/.../...mp3`
   - `/media/demandes_intervention/.../...jpg`

**Vérifier le status HTTP:**
- [ ] Status `200 OK` ← correct
- [ ] Headers include `Authorization: Bearer eyJ...` ← token injecté
- [ ] Response type: `application/octet-stream` ou `audio/mpeg` ← blob

**Si erreur:**
- [ ] Status `401` → Token manquant/invalide
- [ ] Status `403` → Permission refusée
- [ ] Status `404` → Fichier pas trouvé
- [ ] Status `400` ← LE BUG ORIGINAL

### 5️⃣ Console - Vérifier les Logs

1. Ouvrir DevTools (F12)
2. Aller à l'onglet **Console**
3. Chercher les logs:
   - ✅ `[blobService] ✅ Fichier chargé` ← succès
   - ❌ `[blobService] Impossible de charger...` ← erreur avec détails

---

## 🧪 Cas de Test Avancés

### Test A: Token Expiré

1. Déconnecter (Logout)
2. Aller sur une demande déjà consultée (cache)
3. L'audio doit afficher: **"Session expirée..."**
4. Reconnecter
5. L'audio doit charger normalement

### Test B: Fichier Manquant

1. Downloader/supprimer un fichier du serveur:
   ```bash
   # Via DB ou disque
   rm /media/demandes_intervention/uuid/fichier.mp3
   ```
2. Recharger la page
3. L'audio doit afficher: **"Fichier non trouvé sur le serveur."**

### Test C: Permissions

1. Se connecter avec un autre utilisateur
2. Tenter d'accéder à une demande d'un tiers
3. Doit afficher: **"Vous n'avez pas la permission..."**

---

## ✅ Résultat Attendu

| Test | Avant Fix | Après Fix |
|------|-----------|-----------|
| Image | ❌ Erreur 400 | ✅ Affichée |
| Audio | ❌ Erreur 400 | ✅ Joue |
| Vidéo | ❌ Erreur 400 | ✅ Joue |
| Messages d'erreur | "non disponible" | Explicites |
| DevTools Network | 400 Bad Request, pas de header Auth | 200 OK, avec Authorization |

---

## 🆘 Dépannage

### "Erreur: Fichier vide reçu"
- [ ] Vérifier que l'upload s'est bien passé
- [ ] Vérifier les logs backend pour les erreurs

### "Erreur réseau"
- [ ] Vérifier que le backend tourne sur `http://localhost:8000`
- [ ] Vérifier que le proxy Vite est configuré (`/media`)
- [ ] Vérifier la console du navigateur pour CORS

### "Audio charge mais ne joue pas"
- [ ] Vérifier le type MIME du fichier (DevTools → Network)
- [ ] Essayer un autre format (MP3 vs WAV)
- [ ] Vérifier volume du navigateur (pas mute)

### "Token récupéré mais requête échoue quand même"
- [ ] Vérifier que le token n'est pas expiré
- [ ] Vérifier que l'utilisateur a accès à cette demande
- [ ] Vérifier les logs Django pour plus d'info

---

## 📍 Où Chercher les Fichiers Upladés

Les fichiers sont stockés dans:
```
backend/media/demandes_intervention/{uuid}/{nomFichier}
```

Pour lister les fichiers d'une demande:
```bash
ls -la backend/media/demandes_intervention/
```

Pour vérifier un fichier spécifique:
```bash
file backend/media/demandes_intervention/uuid/sound.mp3
```

---

## 📝 Reporting

Si le test échoue:

1. **Note l'erreur exacte** affichée
2. **Ouvre la console** (F12) et copie les logs `[blobService]`
3. **Ouvre Network** et cherche la requête du fichier
4. **Note le status HTTP** (200, 400, 401, 403, 404)
5. **Partage ces infos** pour déboguer

---

**Durée estimée**: 5-10 minutes ⏱️

**Succès**: Tous les ✅ cochés? Le fix fonctionne! 🎉
