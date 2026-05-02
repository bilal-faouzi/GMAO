import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDemande, getDemandes } from '../../services/ordreService';
import { getActifs } from '../../services/actifService';
import { Upload, X, Image, Mic, Video, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

const URGENCE_INFO = {
  critique: { label: '🔴 Critique',  desc: 'Production arrêtée — intervention immédiate requise',  cls: 'border-red-500/50 bg-red-500/10 text-red-300' },
  haute:    { label: '🟠 Haute',     desc: 'Impact fort sur la production — traiter dans la journée', cls: 'border-orange-500/50 bg-orange-500/10 text-orange-300' },
  normale:  { label: '🔵 Normale',   desc: 'Gêne partielle — peut attendre quelques jours',          cls: 'border-blue-500/50 bg-blue-500/10 text-blue-300' },
  basse:    { label: '⚪ Basse',     desc: 'Non urgent — à traiter selon disponibilité',             cls: 'border-gray-500/50 bg-gray-500/10 text-gray-300' },
};

const STATUT = {
  en_attente: { label: 'Nouvelle déclaration de panne', cls: 'bg-amber-500/20 text-amber-400' },
  validee:    { label: 'Validée → OT créé', cls: 'bg-green-500/20 text-green-400' },
  rejetee:    { label: 'Rejetée', cls: 'bg-red-500/20 text-red-400' },
};

export default function DeclarerPanne() {
  const navigate = useNavigate();
  const [mesDemandes, setMesDemandes] = useState([]);
  const [loading, setLoading]   = useState(false);
  
  // Sélection cascade hiérarchique
  const [selectionPath, setSelectionPath] = useState([]); // Chemin d'actifs sélectionnés [niveau0, niveau1, ...]
  const [optionsAtLevel, setOptionsAtLevel] = useState([]); // Options par niveau [[racines], [enfants niv1], ...]
  const [loadingActifs, setLoadingActifs] = useState(false);
  
  const [form, setForm] = useState({ idActif: '', titre: '', urgence: 'normale', description: '' });
  const [images, setImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [previewVideos, setPreviewVideos] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  
  // Audio recording states & refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedAudios, setRecordedAudios] = useState([]);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState(null);
  
  // Use refs to store chunks during recording (doesn't trigger re-renders)
  const chunksRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  
  const [erreur, setErreur]     = useState('');
  const [succes, setSucces]     = useState('');

  useEffect(() => {
    // Charger les actifs racines (parents) pour le premier niveau
    setLoadingActifs(true);
    getActifs({ estActif: true, is_parent: true })
      .then(r => {
        const roots = r.data.results || r.data;
        setOptionsAtLevel([roots]);
      })
      .catch(err => console.error('Erreur chargement actifs racines:', err))
      .finally(() => setLoadingActifs(false));
    
    getDemandes().then(r => setMesDemandes((r.data.results || r.data).slice(0, 10)));
  }, []);

  // Recording timer
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up...');
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (currentPlayingAudio) {
        currentPlayingAudio.pause();
      }
      // Revoke all blob URLs
      recordedAudios.forEach(rec => {
        if (rec.url) {
          URL.revokeObjectURL(rec.url);
        }
      });
    };
  }, []);

  // Actif parent = le premier élément du chemin de sélection (racine)
  const actifParent = selectionPath.length > 0 ? selectionPath[0] : null;
  // Actif sélectionné = le dernier élément du chemin (l'enfant concerné)
  const actifSelectionne = selectionPath.length > 0 ? selectionPath[selectionPath.length - 1] : null;

  const handleSelectAtLevel = async (levelIndex, assetId) => {
    if (!assetId) {
      // Réinitialiser à ce niveau et tout ce qui est en dessous
      setSelectionPath(prev => prev.slice(0, levelIndex));
      setOptionsAtLevel(prev => prev.slice(0, levelIndex + 1));
      setForm(f => ({ ...f, idActif: '' }));
      return;
    }

    const selectedAsset = optionsAtLevel[levelIndex].find(a => a.id === assetId);
    if (!selectedAsset) return;

    // Mettre à jour le chemin jusqu'à ce niveau
    const newPath = selectionPath.slice(0, levelIndex);
    newPath[levelIndex] = selectedAsset;
    setSelectionPath(newPath);
    setForm(f => ({ ...f, idActif: selectedAsset.id }));

    // Nettoyer les niveaux inférieurs
    setOptionsAtLevel(prev => prev.slice(0, levelIndex + 1));

    // Charger les enfants de l'actif sélectionné
    setLoadingActifs(true);
    try {
      const r = await getActifs({ estActif: true, idParent: selectedAsset.id });
      const children = r.data.results || r.data;
      if (children.length > 0) {
        setOptionsAtLevel(prev => {
          const updated = [...prev.slice(0, levelIndex + 1)];
          updated[levelIndex + 1] = children;
          return updated;
        });
      }
    } catch (err) {
      console.error('Erreur chargement enfants:', err);
    } finally {
      setLoadingActifs(false);
    }
  };

  const clearSelection = () => {
    setSelectionPath([]);
    setOptionsAtLevel(prev => prev.slice(0, 1));
    setForm(f => ({ ...f, idActif: '' }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newImages = [...images, ...files];
    const newPreviews = newImages.map(f => URL.createObjectURL(f));
    setImages(newImages);
    setPreviewImages(newPreviews);
    e.target.value = '';
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previewImages.filter((_, i) => i !== index);
    URL.revokeObjectURL(previewImages[index]);
    setImages(newImages);
    setPreviewImages(newPreviews);
  };

  const handleVideoChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newVideos = [...videos, ...files];
    const newPreviews = newVideos.map(f => URL.createObjectURL(f));
    setVideos(newVideos);
    setPreviewVideos(newPreviews);
    e.target.value = '';
  };

  const removeVideo = (index) => {
    const newVideos = videos.filter((_, i) => i !== index);
    const newPreviews = previewVideos.filter((_, i) => i !== index);
    URL.revokeObjectURL(previewVideos[index]);
    setVideos(newVideos);
    setPreviewVideos(newPreviews);
  };

  const startRecording = async () => {
    try {
      console.log('🎙️ Starting recording...');
      
      // Clear previous chunks
      chunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const recorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm',
        audioBitsPerSecond: 128000 
      });
      
      mediaRecorderRef.current = recorder;
      setMediaRecorder(recorder);

      // Collect chunks
      recorder.ondataavailable = (e) => {
        console.log('📊 Data available, chunk size:', e.data.size);
        chunksRef.current.push(e.data);
      };

      // On stop, create blob from collected chunks
      recorder.onstop = () => {
        console.log('🛑 Recording stopped');
        console.log('📦 Total chunks collected:', chunksRef.current.length);
        console.log('📦 Chunk sizes:', chunksRef.current.map(c => c.size));
        
        // Calculate duration from timestamp
        const recordingEndTime = Date.now();
        const durationMs = recordingEndTime - recordingStartTimeRef.current;
        const durationSeconds = Math.floor(durationMs / 1000);
        console.log('⏱️ Recording duration:', durationSeconds, 'seconds');
        
        // Create blob from chunks
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        console.log('✅ Blob size:', blob.size, 'bytes');
        
        if (blob.size === 0) {
          console.error('❌ ERROR: Blob is empty!');
          setErreur('❌ Aucun audio enregistré. Assurez-vous que le microphone fonctionne.');
          return;
        }

        const fileName = `recording_${Date.now()}.webm`;
        console.log('💾 Saving recording:', fileName);
        
        // Store the blob in state for playback
        setRecordedAudios(prev => {
          console.log('Adding to recordedAudios:', prev.length + 1, 'recordings');
          return [...prev, {
            blob: blob,
            url: URL.createObjectURL(blob),  // Pre-create URL for playback
            duration: durationSeconds,  // Use calculated duration
            name: fileName
          }];
        });
        
        // Also add to audioFiles for upload
        const file = new File([blob], fileName, { type: 'audio/webm' });
        console.log('🎵 File object created:', file.name, 'Size:', file.size, 'Type:', file.type);
        setAudioFiles(prev => {
          const updated = [...prev, file];
          console.log('🎙️ audioFiles updated! Now has', updated.length, 'files:', updated.map(f => ({ name: f.name, size: f.size })));
          return updated;
        });
        
        setRecordingTime(0);
        console.log('✅ Recording saved successfully with duration:', durationSeconds, 's');
      };

      recorder.onerror = (e) => {
        console.error('❌ Recording error:', e.error);
        setErreur(`Erreur d'enregistrement: ${e.error}`);
      };

      // Start recording with timeslice to ensure data collection
      recorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      console.log('✅ Recording started');
    } catch (err) {
      console.error('❌ Microphone error:', err);
      setErreur(`Erreur microphone: ${err.message}. Vérifiez les permissions.`);
    }
  };

  const stopRecording = () => {
    console.log('⏹️ Stopping recording...');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Stop all audio tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('✅ Audio track stopped');
        });
      }
      
      setMediaRecorder(null);
      setIsRecording(false);
      console.log('✅ Recording stopped and stream closed');
    }
  };

  const removeRecordedAudio = (index) => {
    console.log('🗑️ Removing recorded audio at index:', index);
    
    // Revoke the URL to free memory
    if (recordedAudios[index] && recordedAudios[index].url) {
      URL.revokeObjectURL(recordedAudios[index].url);
    }
    
    const newRecorded = recordedAudios.filter((_, i) => i !== index);
    setRecordedAudios(newRecorded);
    
    // Also remove from audioFiles
    const nameToRemove = recordedAudios[index].name;
    const newAudioFiles = audioFiles.filter(f => f.name !== nameToRemove);
    setAudioFiles(newAudioFiles);
    
    console.log('✅ Removed, remaining recordings:', newRecorded.length);
  };

  const playRecordedAudio = (index) => {
    try {
      console.log('▶️ Playing audio at index:', index);
      
      // Stop previous audio if playing
      if (currentPlayingAudio) {
        console.log('⏸️ Stopping previous audio');
        currentPlayingAudio.pause();
        currentPlayingAudio.currentTime = 0;
      }

      const recorded = recordedAudios[index];
      
      if (!recorded) {
        console.error('❌ Recording not found at index:', index);
        setErreur('Enregistrement introuvable');
        return;
      }

      if (!recorded.blob || recorded.blob.size === 0) {
        console.error('❌ Blob is empty', recorded);
        setErreur('Le fichier audio est vide');
        return;
      }

      console.log('📦 Playing blob of size:', recorded.blob.size);
      
      // Use pre-created URL or create new one
      const url = recorded.url || URL.createObjectURL(recorded.blob);
      console.log('🔗 URL:', url);
      
      const audio = new Audio();
      audio.src = url;
      
      // Keep reference to prevent garbage collection
      setCurrentPlayingAudio(audio);
      
      audio.onended = () => {
        console.log('✅ Playback ended');
        setCurrentPlayingAudio(null);
      };

      audio.onerror = (e) => {
        console.error('❌ Audio error:', e, audio.error);
        setErreur(`Erreur: ${audio.error?.message || 'Impossible de lire le fichier'}`);
        setCurrentPlayingAudio(null);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Audio play() resolved');
          })
          .catch(err => {
            console.error('❌ Play error:', err);
            setErreur(`Erreur lecture: ${err.message}`);
            setCurrentPlayingAudio(null);
          });
      }
    } catch (err) {
      console.error('❌ Play function error:', err);
      setErreur(`Erreur: ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur(''); setSucces('');
    if (!form.idActif)      return setErreur('Sélectionnez l\'équipement en panne.');
    if (!form.titre.trim()) return setErreur('Saisissez un titre pour la demande d\'intervention.');
    if (!form.description.trim()) return setErreur('Décrivez le problème observé.');
    setLoading(true);
    try {
      // Créer la demande d'abord
      const res = await createDemande(form);
      const demandeId = res.data.id;
      console.log('✅ Demande créée:', demandeId);
      
      // Téléverser les fichiers (images, vidéos ET audio) si présents
      const tousLesFichiers = [...images, ...videos, ...audioFiles];
      console.log('📦 Fichiers à uploader:', tousLesFichiers.length, tousLesFichiers.map(f => ({ name: f.name, size: f.size })));
      
      if (tousLesFichiers.length > 0) {
        const formData = new FormData();
        tousLesFichiers.forEach((fichier, idx) => {
          console.log(`📤 Ajout fichier ${idx + 1}: ${fichier.name} (${fichier.size} bytes)`);
          formData.append('fichiers', fichier);
        });
        
        try {
          console.log('🌐 Upload en cours vers: /v1/ordres/demandes/' + demandeId + '/telecharger_fichiers/');
          const response = await api.post(`/v1/ordres/demandes/${demandeId}/telecharger_fichiers/`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          console.log('📥 Réponse upload:', response.status, response.data);
          
          if (response.status === 200) {
            console.log('✅ Upload réussi! Fichiers ajoutés:', response.data.fichiers_ajoutes);
          } else {
            console.error('❌ Erreur upload:', response.data);
          }
        } catch(e) {
          console.warn('⚠️ Erreur upload fichiers (non-bloquant):', e.message);
        }
      } else {
        console.log('ℹ️ Aucun fichier à uploader');
      }
      
      setSucces(`✅ Demande ${res.data.numero} enregistrée avec succès. Le responsable a été notifié.`);
      setForm({ idActif: '', titre: '', urgence: 'normale', description: '' });
      setImages([]); setPreviewImages([]);
      setVideos([]); setPreviewVideos([]);
      setAudioFiles([]);
      setRecordedAudios([]);
      setSelectionPath([]);
      setOptionsAtLevel(prev => prev.slice(0, 1));
      const r = await getDemandes();
      setMesDemandes((r.data.results || r.data).slice(0, 10));
    } catch(e) {
      console.error('❌ Erreur création demande:', e);
      setErreur(e.response?.data?.description?.[0] || e.response?.data?.error || 'Erreur lors de la déclaration.');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 text-white">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Déclarer une panne</h1>
        <p className="text-gray-400 text-sm mt-2">Signalez un dysfonctionnement sur un équipement. L'actif parent sera automatiquement mis en panne.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulaire */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 shadow-xl">
          <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-5 flex items-center gap-2">
            <span>✏️</span> Nouvelle déclaration de panne
          </h2>

          {erreur && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-300 rounded-lg p-3 mb-4 text-sm flex items-start gap-2">
              <span>⚠️</span> {erreur}
            </div>
          )}
          {succes && (
            <div className="bg-green-500/20 border border-green-500/40 text-green-300 rounded-lg p-3 mb-4 text-sm flex items-start gap-2">
              <span>✅</span> {succes}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Équipement en panne — Sélection cascade hiérarchique */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-medium">
                Équipement en panne *
              </label>
              
              {loadingActifs && optionsAtLevel.length === 0 && (
                <div className="text-xs text-gray-500 py-2">Chargement des équipements...</div>
              )}

              {/* Selects en cascade dynamiques */}
              <div className="space-y-2">
                {optionsAtLevel.map((options, levelIndex) => (
                  <div key={levelIndex}>
                    <label className="block text-[10px] text-gray-500 mb-0.5 uppercase tracking-wider">
                      {levelIndex === 0 ? 'Actif parent' : `Sous-actif niveau ${levelIndex}`}
                    </label>
                    <select
                      value={selectionPath[levelIndex]?.id || ''}
                      onChange={e => handleSelectAtLevel(levelIndex, e.target.value)}
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500 appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1rem' }}
                    >
                      <option value="">-- Sélectionner --</option>
                      {options.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.libelle} {a.statut === 'en_panne' ? '(EN PANNE)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Affichage de la sélection finale + actif parent */}
              {actifSelectionne && (
                <div className="mt-3 space-y-2">
                  {/* Chemin de sélection */}
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">Actif sélectionné</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {selectionPath.map((a, i) => (
                        <span key={a.id} className="text-sm">
                          <span className="font-mono text-blue-300">{a.code}</span>
                          <span className="text-gray-300"> — {a.libelle}</span>
                          {i < selectionPath.length - 1 && (
                            <span className="text-gray-500 mx-1">›</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <button 
                      type="button" 
                      onClick={clearSelection}
                      className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                    >
                      Réinitialiser la sélection
                    </button>
                  </div>

                  {/* Alerte actif parent */}
                  {actifParent && actifParent.id !== actifSelectionne.id && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
                      <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-amber-300 font-medium">Actif parent concerné</p>
                        <p className="text-xs text-gray-400">
                          Le statut de <span className="font-mono text-amber-300">{actifParent.code}</span> — {actifParent.libelle} sera mis en panne
                        </p>
                      </div>
                    </div>
                  )}
                  {actifParent && actifParent.id === actifSelectionne.id && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
                      <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-amber-300 font-medium">Cet actif est l'actif parent racine</p>
                        <p className="text-xs text-gray-400">Son statut sera mis en panne directement</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Titre de la demande */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-medium">
                Titre de la demande d'intervention *
              </label>
              <input
                type="text"
                value={form.titre}
                onChange={e => setForm(f => ({...f, titre: e.target.value}))}
                placeholder="Ex: Arrêt moteur principal, Fuite hydraulique..."
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Un titre clair permet au responsable de comprendre rapidement la panne
              </p>
            </div>

            {/* Niveau d'urgence */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">
                Niveau d'urgence *
              </label>
              <div className="space-y-2">
                {Object.entries(URGENCE_INFO).map(([k, v]) => (
                  <label key={k}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      form.urgence === k ? v.cls + ' border-opacity-100' : 'border-gray-700 bg-gray-700/30 hover:bg-gray-700/60'
                    }`}>
                    <input type="radio" name="urgence" value={k}
                      checked={form.urgence === k}
                      onChange={e => setForm(f => ({...f, urgence: e.target.value}))}
                      className="mt-0.5 accent-purple-500"/>
                    <div>
                      <p className="text-sm font-medium">{v.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{v.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-medium">
                Description du problème *
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({...f, description: e.target.value}))}
                rows={5}
                placeholder={`Décrivez précisément ce que vous observez :\n• Quel est le symptôme ? (bruit, fuite, arrêt, surchauffe...)\n• Depuis quand ?\n• Dans quelles conditions cela se produit-il ?`}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {form.description.length} caractères — plus vous êtes précis, plus vite l'intervention sera réalisée
              </p>
            </div>

            {/* Upload images */}
            <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/5 rounded-xl border border-purple-500/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Image size={18} className="text-purple-400" />
                <label className="block text-xs text-purple-300 font-semibold uppercase tracking-wider">
                  Ajouter des photos (optionnel)
                </label>
              </div>
              <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-purple-500/40 rounded-lg cursor-pointer hover:border-purple-500/80 transition bg-purple-600/5 hover:bg-purple-600/10">
                <div className="flex flex-col items-center justify-center py-2">
                  <Upload size={24} className="text-purple-400 mb-2" />
                  <p className="text-xs text-purple-300 font-medium text-center">Cliquez pour ajouter des images<br/><span className="text-purple-400/70">JPG, PNG max 5MB</span></p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              
              {/* Aperçu des images */}
              {previewImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider mb-2">📸 Images ({previewImages.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {previewImages.map((preview, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-purple-500/40 bg-gray-700">
                        <img src={preview} alt={`preview-${i}`} className="w-full h-24 object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition border border-red-400/50"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Upload vidéos */}
            <div className="bg-gradient-to-br from-pink-600/10 to-pink-700/5 rounded-xl border border-pink-500/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Video size={18} className="text-pink-400" />
                <label className="block text-xs text-pink-300 font-semibold uppercase tracking-wider">
                  Ajouter des vidéos (optionnel)
                </label>
              </div>
              <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-pink-500/40 rounded-lg cursor-pointer hover:border-pink-500/80 transition bg-pink-600/5 hover:bg-pink-600/10">
                <div className="flex flex-col items-center justify-center py-2">
                  <Upload size={24} className="text-pink-400 mb-2" />
                  <p className="text-xs text-pink-300 font-medium text-center">Cliquez pour ajouter des vidéos<br/><span className="text-pink-400/70">MP4, MOV, AVI max 20MB</span></p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                />
              </label>
              
              {/* Aperçu des vidéos */}
              {previewVideos.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-pink-300 font-semibold uppercase tracking-wider mb-2">🎥 Vidéos ({previewVideos.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {previewVideos.map((preview, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-pink-500/40 bg-gray-700">
                        <video src={preview} className="w-full h-32 object-cover" controls />
                        <button
                          type="button"
                          onClick={() => removeVideo(i)}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition border border-red-400/50"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recording audio direct */}
            <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/5 rounded-xl border border-blue-500/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Mic size={18} className="text-blue-400" />
                <label className="block text-xs text-blue-300 font-semibold uppercase tracking-wider">
                  Enregistrer un audio (optionnel)
                </label>
              </div>
              
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg text-sm font-semibold transition text-white flex items-center justify-center gap-2 border border-blue-500/50 shadow-lg shadow-blue-500/20"
                >
                  <Mic size={18} />
                  Démarrer l'enregistrement
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4 flex items-center justify-between backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="animate-pulse">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-red-400">🎙️ En cours d'enregistrement...</p>
                        <p className="text-xs text-red-300/80 font-mono">{Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold text-white transition border border-red-500/50"
                    >
                      Arrêter
                    </button>
                  </div>
                </div>
              )}

              {/* Recorded audios */}
              {recordedAudios.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider">📦 Audios enregistrés ({recordedAudios.length})</p>
                  <div className="space-y-2">
                    {recordedAudios.map((recorded, i) => (
                      <div key={i} className="bg-blue-600/10 border border-blue-500/40 rounded-lg p-3 flex items-center justify-between hover:bg-blue-600/15 transition group">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => playRecordedAudio(i)}
                            className="flex-shrink-0 w-9 h-9 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition text-white shadow-md border border-blue-500/50"
                          >
                            ▶
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-blue-300 truncate">{recorded.name}</p>
                            <p className="text-xs text-gray-400 font-mono">⏱️ {Math.floor(recorded.duration / 60)}:{String(recorded.duration % 60).padStart(2, '0')}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRecordedAudio(i)}
                          className="flex-shrink-0 text-gray-400 hover:text-red-400 transition p-2 opacity-0 group-hover:opacity-100"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition text-white border border-purple-500/50 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
                  Envoi en cours...
                </>
              ) : (
                <>
                  📢 Déclarer la panne
                </>
              )}
            </button>
          </form>
        </div>

        {/* Mes déclarations récentes */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 shadow-xl">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>📋</span> Mes déclarations récentes
          </h2>

          {mesDemandes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-gray-400 text-sm">Aucune déclaration</p>
              <p className="text-gray-600 text-xs mt-1">Vos déclarations apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mesDemandes.map(d => (
                <div key={d.id} className="bg-gradient-to-r from-gray-700/40 to-gray-600/20 rounded-lg p-4 border border-gray-600/50 hover:border-gray-500 transition">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-sm font-semibold text-purple-300">{d.numero}</span>
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium border ${STATUT[d.statut]?.cls}`}>
                      {STATUT[d.statut]?.label}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white truncate">{d.titre || '(Sans titre)'}</p>
                  <p className="text-sm font-medium text-blue-300 truncate">{d.actif_detail?.code} — {d.actif_detail?.libelle}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{d.description}</p>
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-600/30">
                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${URGENCE_INFO[d.urgence]?.cls}`}>
                      {URGENCE_INFO[d.urgence]?.label}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      {new Date(d.dateSignalement).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  {d.statut === 'rejetee' && d.motifRejet && (
                    <div className="mt-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                      <p className="text-xs text-red-400">⚠️ Motif rejet : {d.motifRejet}</p>
                    </div>
                  )}
                  {d.statut === 'validee' && (
                    <div className="mt-2 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                      <p className="text-xs text-green-400">✅ OT créé — intervention en cours de traitement</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-700">
            <button onClick={() => navigate('/ordres/demandes')}
              className="w-full py-2.5 text-sm font-semibold text-purple-400 border border-purple-500/40 rounded-lg hover:bg-purple-500/10 hover:border-purple-500/60 transition">
              Voir toutes les demandes →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
