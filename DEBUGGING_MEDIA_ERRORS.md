<!-- DEBUGGING GUIDE - ERR_FILE_NOT_FOUND et Glitches -->

# 🐛 Débogage: ERR_FILE_NOT_FOUND et Glitches Audio/Vidéo

## ✅ Problèmes Fixés

### 1. ❌ "Maximum update depth exceeded"
**Cause**: Boucle infinie dans `useEffect` à cause de `blobUrl` dans les dépendances
**Fix**: Utiliser une `ref` pour le cleanup, garder seulement `rawUrl` dans les dépendances

### 2. ❌ "net::ERR_FILE_NOT_FOUND"
**Causes possibles**:
- L'URL est mal construite
- Le proxy Vite n'est pas configuré
- Le fichier n'existe pas sur le serveur
- `BASE_URL` n'est pas défini

---

## 🧪 Comment Déboguer

### Étape 1: Vérifier dans la Console

Ouvrez DevTools (F12) → **Console** et cherchez les logs `[blobService]`:

```
[blobService] Chargement fichier: {
  originalUrl: "/media/demandes_intervention/...",
  baseUrl: "",
  fullUrl: "/media/demandes_intervention/...",
  timestamp: "2026-05-20T14:30:00.000Z"
}

[blobService] Headers envoyés: {
  hasAuth: true,
  authLength: 256
}

[blobService] ✅ Réponse reçue: {
  status: 200,
  contentType: "audio/mpeg",
  size: 1024000,
  type: "audio/mpeg"
}

[blobService] ✅ Blob URL créé: { ... }
```

### Étape 2: Si Erreur, Chercher les Logs d'Erreur

```
[blobService] ❌ Erreur: Erreur réseau. Vérifiez que le backend est accessible. {
  originalUrl: "/media/...",
  fullUrl: "/media/...",
  networkError: true,
  errorCode: "ERR_NETWORK",
  errorMessage: "Network Error"
}
```

---

## 🔍 Diagnostic par Status HTTP

### Status 200 ✅
```
✅ Fichier chargé avec succès
```

### Status 401
```
❌ Session expirée
Solution: Vous reconnecter
```

### Status 403
```
❌ Permission refusée
Solution: Vérifier que l'utilisateur a accès à la demande
```

### Status 404
```
❌ Fichier non trouvé
Solution: Vérifier que le fichier existe dans `/media/demandes_intervention/{uuid}/`
```

### Status 400 / ERR_FILE_NOT_FOUND
```
❌ URL mal construite ou fichier manquant
Problèmes possibles:
1. BASE_URL vide
2. URL mal formée
3. Proxy non configuré
```

---

## 🛠️ Checklist de Configuration

### 1. Vérifier que le Backend Tourne

```bash
# Terminal 1
cd backend
python manage.py runserver
# Doit afficher: "Starting development server at http://127.0.0.1:8000/"
```

**Dans la console du navigateur:**
```javascript
// Vérifier que /api répond
fetch('/api/auth/me/')
  .then(r => console.log('✅ Backend accessible'))
  .catch(e => console.error('❌ Backend non accessible:', e))
```

### 2. Vérifier que le Fichier Existe

**Backend:**
```bash
# Lister les fichiers
ls -la backend/media/demandes_intervention/

# Chercher un fichier spécifique
find backend/media -name "*.mp3"
```

### 3. Vérifier que le Proxy Vite est Configuré

**Fichier: `vite.config.js`**
```javascript
server: {
  proxy: {
    "/api": { target: "http://localhost:8000", changeOrigin: true },
    "/media": { target: "http://localhost:8000", changeOrigin: true },  // ← DOIT EXISTER
  },
}
```

Si ce proxy manque, les requêtes `/media/...` retourneront `ERR_FILE_NOT_FOUND`.

**Solution**: Ajouter le proxy et **redémarrer Vite** (Ctrl+C puis `npm run dev`)

### 4. Vérifier que BASE_URL est Configuré

**Fichier: `.env`** (créer si n'existe pas)
```
VITE_API_URL=http://localhost:8000
```

**OU dans le composant MediaViewers.jsx:**
```javascript
const BASE_URL = import.meta.env.VITE_API_URL || ''
console.log('BASE_URL:', BASE_URL) // Doit afficher l'URL ou ''
```

Si `BASE_URL` est vide, l'URL devient `/media/...` qui est relatif (OK si proxy configuré).

---

## 📊 Tester les URLs

**Console du navigateur:**

```javascript
// Test 1: Vérifier l'URL construite
const fileUrl = "/media/demandes_intervention/uuid-123/sound.mp3"
const BASE_URL = import.meta.env.VITE_API_URL || ''
const fullUrl = fileUrl.startsWith('http') 
  ? fileUrl 
  : `${BASE_URL}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`
console.log('fullUrl:', fullUrl)  // Doit être /media/... ou http://...

// Test 2: Vérifier que le fichier existe
fetch(fullUrl, {
  headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
})
  .then(r => {
    console.log('Status:', r.status)  // 200 = bon
    if (r.ok) return r.blob()
    throw new Error(`HTTP ${r.status}`)
  })
  .then(blob => console.log('✅ Blob reçu:', blob.size, 'bytes'))
  .catch(e => console.error('❌ Erreur:', e.message))
```

---

## 🎵 Audio/Vidéo Glitche

### Causes Possibles

1. **Le blob URL n'est pas stable** (re-créé à chaque render)
   - Fix: Utiliser `useRef` dans le hook ✅

2. **Le type MIME est incorrect**
   - Vérifier dans DevTools → Network → Response Headers → `Content-Type`
   - Doit être `audio/mpeg` pour MP3, `video/mp4` pour MP4, etc.

3. **Le fichier est incomplet ou corrompu**
   - Vérifier la taille du fichier: `response.data.size`
   - Si trop petit (< 1KB), probablement une erreur HTML

4. **Le préload audio causant des problèmes**
   - Le `<audio preload="auto">` peut causer des glitches
   - Solution: Changer `preload` à `"metadata"` ou `"none"`

### Fix pour Glitches Audio

Dans `MediaViewers.jsx`, changerf:
```jsx
{blobUrl && (
  <audio
    ref={audioRef}
    src={blobUrl}
    preload="metadata"  // ← Changer de "auto" à "metadata"
    style={{ display: "none" }}
    // ...
  />
)}
```

---

## 📝 Logs Importants à Vérifier

**Ouvrir DevTools → Console et chercher:**

```
[blobService] Chargement fichier: ✅ Log de démarrage
[blobService] Headers envoyés: ✅ Token injecté?
[blobService] ✅ Réponse reçue: ✅ HTTP 200?
[blobService] ✅ Blob URL créé: ✅ URL valide?
[blobService] 🗑️ Blob URL libéré: ✅ Cleanup?
[blobService] ❌ Erreur: ❌ Erreur avec détails?
```

---

## 🔧 Commandes de Débogage Avancées

### 1. Forcer le Rechargement d'un Fichier

```javascript
// Dans la console, trouver l'audio et le recharger
document.querySelector('audio').load()
```

### 2. Vérifier Tous les Blob URLs

```javascript
// Dans la console
console.log('Audios en page:', document.querySelectorAll('audio').length)
console.log('Vidéos en page:', document.querySelectorAll('video').length)
document.querySelectorAll('audio').forEach((el, i) => {
  console.log(`Audio ${i}:`, {
    src: el.src?.substring(0, 50),
    canPlayType: el.canPlayType('audio/mpeg'),
    buffered: el.buffered.length,
    networkState: el.networkState,  // 0=NETWORK_EMPTY, 1=NETWORK_IDLE, 2=NETWORK_LOADING, 3=NETWORK_NO_SOURCE
    readyState: el.readyState       // 0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA
  })
})
```

### 3. Jouer un Audio Directement

```javascript
const audio = document.querySelector('audio')
audio.play().then(() => console.log('✅ Joue')).catch(e => console.error('❌ Erreur play:', e))
```

---

## ✅ Checklist Finale

- [ ] Backend démarre sur `http://localhost:8000`
- [ ] Frontend démarre sur `http://localhost:5173`
- [ ] Proxy `/media` configuré dans `vite.config.js`
- [ ] `.env` a `VITE_API_URL` (optionnel)
- [ ] Fichier existe dans `backend/media/demandes_intervention/uuid/`
- [ ] Logs `[blobService]` affichent un Status 200
- [ ] Blob URL est créé et assigné à `<audio src="blob:...">` ou `<img src="blob:...">`
- [ ] Pas d'erreur "Maximum update depth exceeded" dans la console

---

## 📞 Si Toujours pas Bon

1. **Copier les logs `[blobService]` complets**
2. **Note le status HTTP (200, 400, 401, 403, 404)**
3. **Vérifie que le fichier existe**: `ls backend/media/demandes_intervention/`
4. **Teste l'URL directement dans le navigateur**: `http://localhost:5173/media/...`
5. **Redémarre Vite**: `Ctrl+C` et `npm run dev`

---

**Dernière mise à jour**: 20 mai 2026
**Status**: ✅ Hooks fixés, Logs améliorés
