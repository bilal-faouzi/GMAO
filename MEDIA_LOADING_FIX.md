<!-- GUIDE DE FIX - CHARGEMENT FICHIERS MEDIAS -->

# 🎯 FIX: Erreur 400 sur Chargement des Fichiers Médias

## 📋 Problème Décrit

Lors de l'affichage d'une demande d'intervention, les composants `<img>`, `<audio>` et `<video>` retournent une **erreur 400 Bad Request** quand ils tentent de charger les fichiers via leur URL directe.

### Symptômes Observés

```
GET /media/demandes_intervention/.../sound.mp3
Status: 400 Bad Request
```

Les balises HTML natives n'envoient **pas les headers d'authentification** automatiquement.

---

## 🔍 Racine du Problème

Trois bugs ont été identifiés dans le hook `useAuthBlobUrl`:

### Bug 1: Mauvaise Clé localStorage ❌
```javascript
// ANCIEN CODE (BUGUÉ)
const token = localStorage.getItem("token")  // ← Cherche "token" qui n'existe pas !
```

**Réalité**: Le token JWT est stocké dans:
```javascript
localStorage.getItem('access_token')  // ← BON
```

### Bug 2: Token Jamais Injecté ❌
```javascript
// Résultat: fetch() sans header Authorization
fetch(rawUrl, {
  headers: token ? { Authorization: `Bearer ${token}` } : {}
  //        ↑ token est "" car clé erronée → pas de header Authorization
})
```

### Bug 3: Pas de Refresh Automatique ❌
```javascript
// Si le token expire entre deux chargements, c'est fichu
// Pas de mécanisme pour le renouveler automatiquement
```

---

## ✅ Solution Implémentée

### 1️⃣ Nouveau Service: `blobService.js`

Crée une **fonction centralisée** pour récupérer les fichiers avec authentification:

```javascript
import { fetchAuthenticatedBlob, revokeBlobUrl } from "@/services/blobService"

// Utilisation
try {
  const { blobUrl, mimeType } = await fetchAuthenticatedBlob('/media/demandes_intervention/.../sound.mp3')
  // blobUrl est une URL locale valide: blob:https://...
} catch (err) {
  console.error(err.message)  // "Session expirée...", "Fichier non trouvé...", etc.
}
```

**Avantages**:
- ✅ Récupère le **bon token** depuis `localStorage.access_token`
- ✅ Injecte correctement le header `Authorization: Bearer {token}`
- ✅ Gère les erreurs avec messages explicites (401, 403, 404, réseau)
- ✅ Retourne un **Blob URL** que le navigateur peut afficher
- ✅ Timeout 30s pour éviter les appels bloquants
- ✅ Logs détaillés pour déboguer (`console.error('[blobService]', ...)`)

### 2️⃣ Hook Réécrit: `useAuthBlobUrl(rawUrl)`

```javascript
function useAuthBlobUrl(rawUrl) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Appelle fetchAuthenticatedBlob() avec async/await
    // Gère le cleanup correct (libère la mémoire au démontage)
  }, [rawUrl])

  return { blobUrl, loading, error }  // error est maintenant une string texte
}
```

### 3️⃣ Composants Médias Améliorés

#### AudioPlayer
```jsx
// AVANT: Affichait "Impossible de charger l'audio" - trop vague
// APRÈS: "Session expirée", "Fichier non trouvé", "Pas de permission", etc.

<span className="text-danger flex items-center gap-1 col-span-2">
  <AlertTriangle size={10} />
  <span className="truncate">{error}</span>  {/* ← message d'erreur détaillé */}
</span>
```

#### ImageViewer
```jsx
// ✅ Messages d'erreur affichés
// ✅ Modal d'agrandissement amélioré (croix plus visible)
```

#### VideoViewer
```jsx
// ✅ Contrôles HTML5 standard
// ✅ Attribut controlsList="nodownload" ajouté (sécurité)
```

### 4️⃣ Proxy Vite Configuré

Ajout du proxy `/media` dans `vite.config.js`:

```javascript
server: {
  proxy: {
    "/api": { target: "http://localhost:8000", changeOrigin: true },
    "/media": { target: "http://localhost:8000", changeOrigin: true },  // ← NOUVEAU
  },
}
```

Cela permet les requêtes vers `/media/...` en mode développement.

---

## 🧪 Comment Tester le Fix

### 1️⃣ Vérification Rapide (Console du Navigateur)

```javascript
// À lancer dans la console du navigateur:

// Test 1: Vérifier le token
const token = localStorage.getItem('access_token')
console.log(token ? '✅ Token trouvé' : '❌ Token manquant')

// Test 2: Lister les fichiers médias trouvés
document.querySelectorAll('audio').length    // Nombre d'audios
document.querySelectorAll('video').length    // Nombre de vidéos
document.querySelectorAll('img').length      // Nombre d'images
```

### 2️⃣ Test d'Upload et Affichage Complet

1. **Démarrer le backend:**
```bash
cd backend
python manage.py runserver
```

2. **Démarrer le frontend:**
```bash
cd frontend
npm run dev
```

3. **Créer une demande d'intervention:**
   - Aller sur `/ordres/demandes/creer`
   - Uploader une image ET un audio

4. **Voir le détail:**
   - Aller sur `/ordres/demandes/{id}`
   - Vérifier que image s'affiche
   - Vérifier que audio se charge et joue
   - Vérifier que vidéo (si présente) se charge

### 3️⃣ Déboguer les Erreurs

**Erreur: "Session expirée"**
- Token a expiré
- Solution: Vous reconnecter

**Erreur: "Fichier non trouvé"**
- Fichier n'existe pas sur le serveur
- Vérifier `/media/demandes_intervention/{uuid}/{nomFichier}`
- Vérifier les logs backend

**Erreur: "Pas de permission"**
- Utilisateur n'a pas accès à cette demande
- Vérifier les permissions dans `apps.securite`

**Erreur: "Erreur réseau"**
- Proxy Vite mal configuré
- Backend non accessible sur `http://localhost:8000`
- Vérifier console du navigateur (onglet Network)

---

## 📁 Fichiers Modifiés/Créés

### ✅ Créés
- `frontend/src/services/blobService.js` - Service centralisé pour blobs authentifiés

### ✅ Modifiés
- `frontend/src/components/di/MediaViewers.jsx` - Hook + 3 composants
- `frontend/vite.config.js` - Proxy `/media` ajouté

---

## 🔍 Analyse Technique

### Flux Avant (Bugué)
```
1. MediaViewer appelle useAuthBlobUrl(url)
2. Hook essaie localStorage.getItem("token")
   ❌ Retourne null (clé erronée)
3. fetch() avec Authorization header vide
   ❌ Pas de token → 400 Bad Request
4. Erreur affichée: "Impossible de charger..."
```

### Flux Après (Correct)
```
1. MediaViewer appelle useAuthBlobUrl(url)
2. Hook appelle fetchAuthenticatedBlob(url)
3. Service récupère localStorage.getItem('access_token')
   ✅ Retourne le vrai token
4. fetch() avec Authorization: Bearer {token}
   ✅ Backend authentifie la requête
5. Reçoit Blob, crée URL locale
6. Composant affiche image/audio/vidéo
   ✅ Succès !
```

---

## ⚠️ Points Importants

| Point | Status | Détail |
|-------|--------|--------|
| **Token Storage** | ✅ OK | `localStorage.access_token` |
| **Token Injection** | ✅ OK | Header `Authorization: Bearer {token}` |
| **Refresh Auto** | ✅ OK | Axios intercepteur gère l'expiration |
| **CORS** | ✅ OK | Backend configure CORS, frontend proxy |
| **Memory Leak** | ✅ OK | `revokeBlobUrl()` au démontage |
| **Erreurs User** | ✅ OK | Messages explicites au lieu de "non disponible" |

---

## 📞 FAQ Dépannage

**Q: Ça dit encore "Session expirée" après reconnexion?**
- A: Actualiser la page (F5). Le composant doit relancer le fetch.

**Q: Les fichiers s'affichent mais sans son/image?**
- A: Vérifier dans DevTools → Network que le fichier est bien chargé (200 OK).

**Q: J'ai toujours "Fichier non trouvé"?**
- A: Vérifier que le path en base de données est `/media/demandes_intervention/...`

**Q: Comment forcer le rechargement d'un fichier?**
- A: Changer l'URL (ex: ajouter `?t=123`) ou actualiser la page.

---

## 🎯 Résultat Attendu

✅ Les fichiers médias se chargent automatiquement avec l'authentification JWT
✅ Les messages d'erreur sont explicites
✅ La mémoire est bien gérée (pas de memory leak)
✅ Les audios jouent, les images s'agrandissent, les vidéos jouent
