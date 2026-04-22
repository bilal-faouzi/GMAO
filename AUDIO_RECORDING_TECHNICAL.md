# 🔧 Enregistrement Audio - Documentation Technique

**Date:** 16 Avril 2026  
**État:** ✅ Implémenté  
**Complexity:** Moyen

---

## 📋 Vue d'ensemble technique

Le composant `DeclarerPanne.jsx` utilise l'API `navigator.mediaDevices.getUserMedia()` pour accéder au microphone de l'utilisateur et `MediaRecorder` API pour capturer l'audio.

---

## 🏗️ Architecture

### Flux de données

```
User clicks "Démarrer" 
    ↓
Request microphone access (Promise)
    ↓
User grants permission (or browser remembered)
    ↓
Create MediaRecorder instance
    ↓
Start recording (chunks collected)
    ↓
User clicks "Arrêter"
    ↓
onstop event → Collect chunks
    ↓
Create Blob from chunks
    ↓
Convert Blob to File object
    ↓
Add to audioFiles array
    ↓
Upload with demande via FormData
```

---

## 💻 Code Implémentation

### 1. States d'enregistrement

```javascript
const [isRecording, setIsRecording] = useState(false);        // État recording actif
const [recordingTime, setRecordingTime] = useState(0);        // Durée en secondes
const [mediaRecorder, setMediaRecorder] = useState(null);     // Ref MediaRecorder
const [recordedAudios, setRecordedAudios] = useState([]);     // Array d'audios enregistrés
```

### 2. Timer useEffect

```javascript
useEffect(() => {
  let interval;
  if (isRecording) {
    // Incrémenter temps toutes les secondes
    interval = setInterval(() => {
      setRecordingTime(t => t + 1);
    }, 1000);
  }
  return () => clearInterval(interval);
}, [isRecording]);  // Déclenche à chaque changement isRecording
```

### 3. Démarrer l'enregistrement

```javascript
const startRecording = async () => {
  try {
    // Demander accès microphone
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: true  // Seulement audio, pas vidéo
    });
    
    // Créer MediaRecorder avec format WebM
    const recorder = new MediaRecorder(stream, { 
      mimeType: 'audio/webm' 
    });
    
    // Collecter les chunks de données audio
    const chunks = [];
    
    recorder.ondataavailable = (e) => chunks.push(e.data);
    
    // Quand stop() est appelé
    recorder.onstop = () => {
      // Créer un Blob à partir des chunks
      const blob = new Blob(chunks, { type: 'audio/webm' });
      
      // Convertir en File object (pour upload)
      const fileName = `recording_${Date.now()}.webm`;
      const recordedFile = new File([blob], fileName, { 
        type: 'audio/webm' 
      });
      
      // Ajouter à liste des audios enregistrés
      setRecordedAudios([...recordedAudios, {
        file: recordedFile,
        duration: recordingTime,
        name: fileName
      }]);
      
      // Ajouter aussi aux audioFiles pour upload
      setAudioFiles([...audioFiles, recordedFile]);
      
      // Reset timer
      setRecordingTime(0);
    };
    
    // Garder ref MediaRecorder
    setMediaRecorder(recorder);
    
    // Démarrer enregistrement
    recorder.start();
    
    // Mettre à jour UI
    setIsRecording(true);
    setRecordingTime(0);
    
  } catch (err) {
    // Erreur microphone ou permission refusée
    setErreur(`Erreur microphone: ${err.message}. Vérifiez les permissions.`);
  }
};
```

### 4. Arrêter l'enregistrement

```javascript
const stopRecording = () => {
  if (mediaRecorder) {
    // Arrêter l'enregistrement
    mediaRecorder.stop();  // Déclenche onstop event
    
    // Arrêter tous les tracks audio (libérer microphone)
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    
    // Nettoyer la ref
    setMediaRecorder(null);
    
    // Update UI
    setIsRecording(false);
  }
};
```

### 5. Écouter audio enregistré

```javascript
const playRecordedAudio = (index) => {
  const recorded = recordedAudios[index];
  const blob = recorded.file;  // File object = Blob
  
  // Créer URL locale pour le blob
  const url = URL.createObjectURL(blob);
  
  // Créer élément audio et jouer
  const audio = new Audio(url);
  audio.play();
};
```

### 6. Supprimer audio enregistré

```javascript
const removeRecordedAudio = (index) => {
  // Supprimer de recordedAudios
  const newRecorded = recordedAudios.filter((_, i) => i !== index);
  setRecordedAudios(newRecorded);
  
  // Aussi supprimer du audioFiles (si même nom)
  const nameToRemove = recordedAudios[index].name;
  const newAudioFiles = audioFiles.filter(f => f.name !== nameToRemove);
  setAudioFiles(newAudioFiles);
};
```

---

## 📝 UI / Rendu Conditionnel

### État "Prêt" (pas d'enregistrement)

```jsx
{!isRecording ? (
  <button
    type="button"
    onClick={startRecording}
    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition text-white flex items-center justify-center gap-2"
  >
    <Mic size={18} />
    Démarrer l'enregistrement
  </button>
) : ...}
```

### État "En cours"

```jsx
: (
  <div className="space-y-3">
    <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Indicateur pulse */}
        <div className="animate-pulse">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        </div>
        <div>
          <p className="text-sm font-semibold text-red-400">En cours d'enregistrement...</p>
          {/* Timer MM:SS */}
          <p className="text-xs text-red-300">
            {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={stopRecording}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold text-white"
      >
        Arrêter
      </button>
    </div>
  </div>
)
```

### Affichage audios enregistrés

```jsx
{recordedAudios.length > 0 && (
  <div className="mt-4 space-y-2">
    <p className="text-xs text-gray-500 font-medium">Audios enregistrés:</p>
    {recordedAudios.map((recorded, i) => (
      <div key={i} className="flex items-center justify-between bg-blue-600/20 rounded-lg p-3 border border-blue-500/40">
        {/* Bouton play */}
        <button
          type="button"
          onClick={() => playRecordedAudio(i)}
          className="flex-shrink-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition"
        >
          ▶
        </button>
        
        {/* Info fichier */}
        <div className="flex-1">
          <p className="text-xs font-medium text-blue-300">{recorded.name}</p>
          <p className="text-xs text-gray-500">
            {Math.floor(recorded.duration / 60)}:{String(recorded.duration % 60).padStart(2, '0')}
          </p>
        </div>
        
        {/* Bouton supprimer */}
        <button
          type="button"
          onClick={() => removeRecordedAudio(i)}
          className="text-red-400 hover:text-red-300 transition p-1"
        >
          <X size={18} />
        </button>
      </div>
    ))}
  </div>
)}
```

---

## 🔐 Permissions & Sécurité

### Demande d'accès microphone

```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
```

**Comportement navigateur:**
1. Première utilisation: Popup demande permission
2. Permission accordée: Mémorisée pour le domaine
3. Permission refusée: Exception lancée
4. Page ferme/recharge: Peut demander à nouveau

**Popup user:**
```
[Website] wants to use your microphone
  ☐ Remember this decision  [Block] [Allow]
```

### Gestion erreurs

```javascript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Success...
} catch (err) {
  // Erreurs possibles:
  // - NotAllowedError: Permission refusée
  // - NotFoundError: Pas de mécanisme d'entrée audio
  // - SecurityError: Contexte non sécurisé (pas HTTPS en prod)
  
  setErreur(`Erreur microphone: ${err.message}`);
}
```

---

## 📊 Format Audio

### WebM Audio

| Propriété | Valeur |
|-----------|--------|
| **Container** | WebM |
| **Codec audio** | Vorbis |
| **Taux échantillonnage** | 44.1 kHz (ou autre selon OS) |
| **Canaux** | Mono/Stéréo (auto) |
| **Bitrate** | ~128 kbps (auto) |
| **Taille typique** | ~1 MB par minute |

**Pourquoi WebM?**
- ✅ Natif tous navigateurs modernes
- ✅ Codec open-source (Vorbis)
- ✅ Bon ratio qualité/taille
- ✅ Pas besoin conversion

### Conversion Blob → File

```javascript
// Blob créé par MediaRecorder
const blob = new Blob(chunks, { type: 'audio/webm' });

// Convertir en File pour upload (File extends Blob)
const file = new File([blob], 'recording_123456.webm', { 
  type: 'audio/webm' 
});

// File properties:
file.name         // "recording_123456.webm"
file.size         // Taille en bytes
file.type         // "audio/webm"
file.lastModified // Timestamp création
```

---

## 🔄 Upload avec FormData

### Construction FormData

```javascript
const tousLesFichiers = [...images, ...audioFiles];

const formData = new FormData();
tousLesFichiers.forEach(fichier => {
  formData.append('fichiers', fichier);  // Clé: 'fichiers'
});

// FormData inclut:
// - fichiers: File (image.jpg)
// - fichiers: File (photo.png)
// - fichiers: File (recording_123456.webm)
```

### Envoi via fetch

```javascript
const response = await fetch(
  `/api/v1/ordres/demandes/${demandeId}/telecharger_fichiers/`,
  {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    }
  }
);
```

**Remarque:** 
- Ne PAS setter `Content-Type`
- Navigateur ajoute automatiquement `multipart/form-data`
- Boundary auto-généré

---

## ⚙️ Considérations de Performance

### Utilisation mémoire

```
Enregistrement 5 minutes:
- WebM: ~5 MB en mémoire (chunks array)
- Blob: ~5 MB
- File object: ~5 MB (pas copie supplémentaire)
- Total: ~15 MB pendant enregistrement

Après arrêt:
- Chunks garbage-collected
- File objet stocké en state (~5 MB)
- Acceptable pour la plupart des appareils
```

### Optimisations possibles

1. **Compression audio:** Compresser avant upload
2. **Chunked upload:** Envoyer progressivement
3. **Size limit:** Forcer arrêt après 10 minutes
4. **Audio level monitoring:** Visualizer son en temps réel

---

## 🐛 Points d'attention

### 1. Cleanup des ressources

```javascript
// IMPORTANT: Arrêter les tracks audio
mediaRecorder.stream.getTracks().forEach(track => track.stop());

// Sans ça → Microphone reste "utilisé"
// → Autres apps ne peuvent pas l'utiliser
// → LED microphone reste actif (sécurité OS)
```

### 2. URL Blob

```javascript
// ✅ BON
const url = URL.createObjectURL(blob);
const audio = new Audio(url);

// ⚠️ À nettoyer si URL pas réutilisée
URL.revokeObjectURL(url);
```

### 3. State synchronisation

```javascript
// recordedAudios et audioFiles doivent rester sync
// Si on ajoute enregistrement → ajoutter aussi à audioFiles
// Si on supprime → supprimer des deux

// Risque: Enregistrement prêt mais pas uploadé
// Solution: Vérifier taille avant envoyer
if (audioFiles.reduce((sum, f) => sum + f.size, 0) > 100 * 1024 * 1024) {
  setErreur("Fichiers trop volumineux");
}
```

### 4. Erreurs réseau

```javascript
try {
  const response = await fetch(...);
  if (!response.ok) {
    console.warn('Avertissement lors de l\'upload');
  }
} catch (e) {
  console.warn('Erreur upload (non-bloquant)', e);
  // Demande créée, audio pas uploadé
  // User peut réessayer
}
```

---

## 📱 Compatibilité navigateur

| Navigateur | MediaRecorder | getUserMedia | WebM |
|-----------|---|---|---|
| Chrome 47+ | ✅ | ✅ | ✅ |
| Firefox 29+ | ✅ | ✅ | ✅ |
| Safari 14.1+ | ✅ | ✅ | ⚠️ opus/aac |
| Edge 79+ | ✅ | ✅ | ✅ |
| Opera 34+ | ✅ | ✅ | ✅ |
| IE 11 | ❌ | ❌ | ❌ |

**Fallback:** Si navigateur non supporté, afficher section d'upload fichier seulement

---

## 🧪 Test unitaire exemple

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeclarerPanne from './DeclarerPanne';

describe('Audio Recording', () => {
  it('should start and stop recording', async () => {
    const { getByText } = render(<DeclarerPanne />);
    
    // Mock getUserMedia
    global.navigator.mediaDevices.getUserMedia = jest.fn(() => 
      Promise.resolve({
        getTracks: () => [{ stop: jest.fn() }]
      })
    );
    
    // Click start
    fireEvent.click(getByText('Démarrer l\'enregistrement'));
    
    // Voir "En cours d'enregistrement..."
    await waitFor(() => {
      expect(getByText('En cours d\'enregistrement...')).toBeInTheDocument();
    });
    
    // Click stop
    fireEvent.click(getByText('Arrêter'));
    
    // Voir audio dans liste
    await waitFor(() => {
      expect(screen.getByText(/recording_/)).toBeInTheDocument();
    });
  });
});
```

---

## 📚 Ressources

- [MDN: MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [MDN: getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [WebM Format](https://www.webmproject.org/)

---

**Support Technique:** Pour problèmes d'implémentation, voir tests dans `AUDIO_TESTING_GUIDE.md`
