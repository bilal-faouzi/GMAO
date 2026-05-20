<!-- RESTART GUIDE -->

# 🚀 Restart Guide - Appliquer les Fixes

## ⚡ Étapes Rapides

### 1. Arrêter le Frontend Vite

```bash
# Terminal où npm run dev tourne
Ctrl + C
```

Doit afficher:
```
✓ Ctrl+C caught, exiting
```

### 2. Redémarrer le Frontend

```bash
cd frontend
npm run dev
```

Doit afficher:
```
  VITE v4.x.x  build 0.00s

  ➜  Local:   http://localhost:5173/
```

### 3. Actualiser le Navigateur

```
Page du navigateur: Ctrl + Shift + R (hard refresh)
```

Cela vide le cache et charge les nouveaux fichiers.

---

## ✅ Vérifier que les Fixes sont Appliqués

### 1. Ouvrir DevTools (F12)

Aller à **Console**

### 2. Rechercher les Nouveaux Logs

Chercher un log `[blobService]`:

```
[blobService] Chargement fichier: { ... }
```

Si ce log apparaît, c'est que le nouveau code fonctionne! ✅

### 3. Créer/Consulter une Demande d'Intervention

1. Créer avec image + audio
2. Consulter le détail
3. Vérifier que l'audio se charge sans erreur

---

## 🧪 Test Rapide

### Console du Navigateur

```javascript
// Test 1: Vérifier que le token existe
localStorage.getItem('access_token') ? '✅ Token OK' : '❌ Token manquant'

// Test 2: Chercher le nouveau log
// Doit voir un log [blobService] Chargement fichier: ...
```

### Écran

- [ ] Pas d'erreur "Maximum update depth exceeded" en console
- [ ] Audio s'affiche sans être bloqué à "Chargement..."
- [ ] Bouton play ▶ cliquable
- [ ] Audio joue proprement

---

## ⚠️ Dépannage Redémarrage

### Erreur: "Port 5173 already in use"

```bash
# Trouver le processus
lsof -i :5173  # macOS/Linux
netstat -ano | findstr :5173  # Windows

# Tuer le processus
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Erreur: "Cannot find module '@/services/blobService'"

```bash
# Vérifier que le fichier existe
ls frontend/src/services/blobService.js

# Si absent, créer depuis https://github.com/.../blobService.js
```

### Vite affiche "ECONNREFUSED" pour la requête

```
1. Vérifier que le backend démarre: http://localhost:8000
2. Vérifier le proxy /media dans vite.config.js
3. Redémarrer Vite
```

---

## 📝 Checklist

- [ ] Ctrl + C sur `npm run dev`
- [ ] `npm run dev` redémarré
- [ ] Navigateur actualisé (Ctrl+Shift+R)
- [ ] Console ouverte (F12)
- [ ] Logs `[blobService]` visibles
- [ ] Pas d'erreur "Maximum update depth exceeded"
- [ ] Audio se charge et joue

---

**Durée estimée**: 2-3 minutes ⏱️

**Succès**: Tous les ✅ cochés? Les fixes fonctionnent! 🎉
