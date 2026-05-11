import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDemande, getDemandes } from '../../services/ordreService';
import { getActifs } from '../../services/actifService';
import { Upload, X, Image, Mic, Video, AlertTriangle, Building2, Clock, Wrench, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '@/store/authStore';

/* ── Couleurs d'urgence : variables CSS du thème (ok clair & sombre) ── */
const URGENCE_INFO = {
  critique: {
    label: 'Critique',
    emoji: '🔴',
    desc: 'Production arrêtée — intervention immédiate requise',
    style: { borderColor: 'var(--status-red-dot)', background: 'var(--status-red-bg)', color: 'var(--status-red-text)' },
    dot: 'var(--status-red-dot)',
  },
  haute: {
    label: 'Haute',
    emoji: '🟠',
    desc: 'Impact fort sur la production — traiter dans la journée',
    style: { borderColor: 'var(--status-orange-dot)', background: 'var(--status-orange-bg)', color: 'var(--status-orange-text)' },
    dot: 'var(--status-orange-dot)',
  },
  normale: {
    label: 'Normale',
    emoji: '🔵',
    desc: 'Gêne partielle — peut attendre quelques jours',
    style: { borderColor: 'var(--status-blue-dot)', background: 'var(--status-blue-bg)', color: 'var(--status-blue-text)' },
    dot: 'var(--status-blue-dot)',
  },
  basse: {
    label: 'Basse',
    emoji: '⚪',
    desc: 'Non urgent — à traiter selon disponibilité',
    style: { borderColor: 'var(--status-gray-dot)', background: 'var(--status-gray-bg)', color: 'var(--status-gray-text)' },
    dot: 'var(--status-gray-dot)',
  },
};

const STATUT_STYLES = {
  en_attente: { label: 'Nouvelle déclaration',  bg: 'var(--status-yellow-bg)',   text: 'var(--status-yellow-text)',   border: 'var(--status-yellow-dot)' },
  validee:    { label: 'Validée → OT créé',     bg: 'var(--status-green-bg)',    text: 'var(--status-green-text)',    border: 'var(--status-green-dot)' },
  rejetee:    { label: 'Rejetée',               bg: 'var(--status-red-bg)',      text: 'var(--status-red-text)',      border: 'var(--status-red-dot)' },
};

export default function DeclarerPanne() {
  const navigate = useNavigate();
  const [mesDemandes, setMesDemandes] = useState([]);
  const [loading, setLoading]   = useState(false);

  // Sélection cascade hiérarchique
  const [selectionPath, setSelectionPath] = useState([]);
  const [optionsAtLevel, setOptionsAtLevel] = useState([]);
  const [loadingActifs, setLoadingActifs] = useState(false);
  const { user } = useAuthStore();
  const uniteUser = user?.unite_principale;

  const [form, setForm] = useState({ idActif: '', titre: '', urgence: 'normale', description: '' });
  const [images, setImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [previewVideos, setPreviewVideos] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudios, setRecordedAudios] = useState([]);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState(null);

  const chunksRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordingStartTimeRef = useRef(null);

  const [erreur, setErreur]     = useState('');
  const [succes, setSucces]     = useState('');
  const [showRecents, setShowRecents] = useState(false);

  useEffect(() => {
    setLoadingActifs(true);
    getActifs({ estActif: true, is_parent: true, my_unite: true })
      .then(r => {
        const roots = r.data.results || r.data;
        setOptionsAtLevel([roots]);
      })
      .catch(err => console.error('Erreur chargement actifs racines:', err))
      .finally(() => setLoadingActifs(false));

    getDemandes({ my_unite: true }).then(r => setMesDemandes((r.data.results || r.data).slice(0, 6)));
  }, []);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => { setRecordingTime(t => t + 1); }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); }
      if (currentPlayingAudio) { currentPlayingAudio.pause(); }
      recordedAudios.forEach(rec => { if (rec.url) URL.revokeObjectURL(rec.url); });
    };
  }, []);

  const actifParent = selectionPath.length > 0 ? selectionPath[0] : null;
  const actifSelectionne = selectionPath.length > 0 ? selectionPath[selectionPath.length - 1] : null;

  const handleSelectAtLevel = async (levelIndex, assetId) => {
    if (!assetId) {
      setSelectionPath(prev => prev.slice(0, levelIndex));
      setOptionsAtLevel(prev => prev.slice(0, levelIndex + 1));
      setForm(f => ({ ...f, idActif: '' }));
      return;
    }
    const selectedAsset = optionsAtLevel[levelIndex].find(a => a.id === assetId);
    if (!selectedAsset) return;

    const newPath = selectionPath.slice(0, levelIndex);
    newPath[levelIndex] = selectedAsset;
    setSelectionPath(newPath);
    setForm(f => ({ ...f, idActif: selectedAsset.id }));
    setOptionsAtLevel(prev => prev.slice(0, levelIndex + 1));

    setLoadingActifs(true);
    try {
      const r = await getActifs({ estActif: true, idParent: selectedAsset.id, my_unite: true });
      const children = r.data.results || r.data;
      if (children.length > 0) {
        setOptionsAtLevel(prev => {
          const updated = [...prev.slice(0, levelIndex + 1)];
          updated[levelIndex + 1] = children;
          return updated;
        });
      }
    } catch (err) { console.error('Erreur chargement enfants:', err); }
    finally { setLoadingActifs(false); }
  };

  const clearSelection = () => {
    setSelectionPath([]);
    setOptionsAtLevel(prev => prev.slice(0, 1));
    setForm(f => ({ ...f, idActif: '' }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newImages = [...images, ...files];
    setImages(newImages);
    setPreviewImages(newImages.map(f => URL.createObjectURL(f)));
    e.target.value = '';
  };
  const removeImage = (index) => {
    URL.revokeObjectURL(previewImages[index]);
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviewImages(newImages.map(f => URL.createObjectURL(f)));
  };

  const handleVideoChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newVideos = [...videos, ...files];
    setVideos(newVideos);
    setPreviewVideos(newVideos.map(f => URL.createObjectURL(f)));
    e.target.value = '';
  };
  const removeVideo = (index) => {
    URL.revokeObjectURL(previewVideos[index]);
    const newVideos = videos.filter((_, i) => i !== index);
    setVideos(newVideos);
    setPreviewVideos(newVideos.map(f => URL.createObjectURL(f)));
  };

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm', audioBitsPerSecond: 128000 });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => { chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const durationSeconds = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size === 0) { setErreur('❌ Aucun audio enregistré.'); return; }
        const fileName = `recording_${Date.now()}.webm`;
        setRecordedAudios(prev => [...prev, { blob, url: URL.createObjectURL(blob), duration: durationSeconds, name: fileName }]);
        setAudioFiles(prev => [...prev, new File([blob], fileName, { type: 'audio/webm' })]);
        setRecordingTime(0);
      };
      recorder.onerror = (e) => { setErreur(`Erreur: ${e.error}`); };
      recorder.start(1000);
      setIsRecording(true);
    } catch (err) { setErreur(`Erreur microphone: ${err.message}`); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
  };

  const removeRecordedAudio = (index) => {
    if (recordedAudios[index]?.url) URL.revokeObjectURL(recordedAudios[index].url);
    const nameToRemove = recordedAudios[index].name;
    setRecordedAudios(prev => prev.filter((_, i) => i !== index));
    setAudioFiles(prev => prev.filter(f => f.name !== nameToRemove));
  };

  const playRecordedAudio = (index) => {
    if (currentPlayingAudio) { currentPlayingAudio.pause(); currentPlayingAudio.currentTime = 0; }
    const recorded = recordedAudios[index];
    if (!recorded?.blob?.size) { setErreur('Fichier audio vide'); return; }
    const audio = new Audio(recorded.url || URL.createObjectURL(recorded.blob));
    setCurrentPlayingAudio(audio);
    audio.onended = () => setCurrentPlayingAudio(null);
    audio.onerror = () => { setErreur('Impossible de lire le fichier'); setCurrentPlayingAudio(null); };
    audio.play().catch(err => { setErreur(err.message); setCurrentPlayingAudio(null); });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur(''); setSucces('');
    if (!form.idActif)      return setErreur("Sélectionnez l'équipement en panne.");
    if (!form.titre.trim()) return setErreur("Saisissez un titre pour la demande d'intervention.");
    if (!form.description.trim()) return setErreur("Décrivez le problème observé.");
    setLoading(true);
    try {
      const res = await createDemande(form);
      const demandeId = res.data.id;
      const tousLesFichiers = [...images, ...videos, ...audioFiles];
      if (tousLesFichiers.length > 0) {
        const formData = new FormData();
        tousLesFichiers.forEach(f => formData.append('fichiers', f));
        try {
          await api.post(`/v1/ordres/demandes/${demandeId}/telecharger_fichiers/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch(e) { console.warn('Upload non-bloquant:', e.message); }
      }
      setSucces(`✅ Demande ${res.data.numero} enregistrée avec succès.`);
      setForm({ idActif: '', titre: '', urgence: 'normale', description: '' });
      setImages([]); setPreviewImages([]);
      setVideos([]); setPreviewVideos([]);
      setAudioFiles([]); setRecordedAudios([]);
      setSelectionPath([]);
      setOptionsAtLevel(prev => prev.slice(0, 1));
      const r = await getDemandes({ my_unite: true });
      setMesDemandes((r.data.results || r.data).slice(0, 6));
    } catch(e) {
      setErreur(e.response?.data?.description?.[0] || e.response?.data?.error || 'Erreur lors de la déclaration.');
    } finally { setLoading(false); }
  };

  /* ── Helpers d'affichage ── */
  const formatDate = (d) => new Date(d).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });

  return (
    <div className="page">
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text tracking-tight">Déclarer une panne</h1>
          <p className="text-text-muted text-sm mt-1">Signalez un dysfonctionnement sur un équipement. L'actif parent sera automatiquement mis en panne.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowRecents(v => !v)}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border shadow-sm transition hover:brightness-110"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-primary)'
          }}
          title={showRecents ? 'Masquer les déclarations récentes' : 'Afficher les déclarations récentes'}
        >
          <Clock size={16} />
          <span className="text-sm font-semibold hidden sm:inline">Déclarations récentes</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
            {mesDemandes.length}
          </span>
          {showRecents ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <div className={`grid gap-6 transition-all duration-300 ${showRecents ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* ═══════════════ FORMULAIRE ═══════════════ */}
        <div className="bg-surface rounded-xl border border-border p-6 shadow-card">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border-subtle">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wrench size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
            <h2 className="text-sm font-semibold text-text uppercase tracking-wider">Nouvelle déclaration</h2>
          </div>

          {uniteUser && (
            <div className="mb-4 flex items-center gap-2 text-xs rounded-lg px-3 py-2.5 border"
                 style={{ background: 'var(--status-blue-bg)', borderColor: 'rgba(37,99,235,0.18)', color: 'var(--status-blue-text)' }}>
              <Building2 size={14} />
              <span><strong>Unité :</strong> {uniteUser.libelle} — Seuls les actifs de cette unité sont affichés</span>
            </div>
          )}
          {!uniteUser && (
            <div className="mb-4 flex items-center gap-2 text-xs rounded-lg px-3 py-2.5 border"
                 style={{ background: 'var(--status-yellow-bg)', borderColor: 'rgba(234,179,8,0.18)', color: 'var(--status-yellow-text)' }}>
              <AlertTriangle size={14} />
              <span>Aucune unité principale assignée. Contactez un administrateur.</span>
            </div>
          )}

          {erreur && (
            <div className="mb-4 flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 border"
                 style={{ background: 'var(--status-red-bg)', borderColor: 'rgba(220,38,38,0.2)', color: 'var(--status-red-text)' }}>
              <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {erreur}
            </div>
          )}
          {succes && (
            <div className="mb-4 flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 border"
                 style={{ background: 'var(--status-green-bg)', borderColor: 'rgba(22,163,74,0.2)', color: 'var(--status-green-text)' }}>
              <span className="shrink-0 mt-0.5">✅</span> {succes}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Équipement */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Équipement en panne <span style={{ color: 'var(--status-red-dot)' }}>*</span>
              </label>
              {loadingActifs && optionsAtLevel.length === 0 && (
                <p className="text-xs text-text-muted py-2">Chargement des équipements…</p>
              )}
              <div className="space-y-2">
                {optionsAtLevel.map((options, levelIndex) => (
                  <div key={levelIndex}>
                    <label className="block text-[10px] text-text-muted mb-0.5 uppercase tracking-wider">
                      {levelIndex === 0 ? 'Actif parent' : `Sous-actif niveau ${levelIndex}`}
                    </label>
                    <select
                      value={selectionPath[levelIndex]?.id || ''}
                      onChange={e => handleSelectAtLevel(levelIndex, e.target.value)}
                      className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border-subtle outline-none focus:border-purple-500 appearance-none cursor-pointer"
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

              {actifSelectionne && (
                <div className="mt-3 space-y-2">
                  <div className="p-3 rounded-lg border" style={{ background: 'var(--status-blue-bg)', borderColor: 'rgba(37,99,235,0.15)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-1 font-semibold" style={{ color: 'var(--status-blue-text)' }}>Actif sélectionné</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {selectionPath.map((a, i) => (
                        <span key={a.id} className="text-sm flex items-center">
                          <span className="font-mibold" style={{ color: 'var(--status-blue-text)' }}>{a.code}</span>
                          <span className="text-text"> — {a.libelle}</span>
                          {i < selectionPath.length - 1 && <ChevronRight size={14} className="text-text-muted mx-0.5" />}
                        </span>
                      ))}
                    </div>
                    <button type="button" onClick={clearSelection}
                      className="mt-2 text-xs underline" style={{ color: 'var(--status-red-text)' }}>
                      Réinitialiser la sélection
                    </button>
                  </div>

                  {actifParent && actifParent.id !== actifSelectionne.id && (
                    <div className="p-3 rounded-lg border flex items-start gap-2"
                         style={{ background: 'var(--status-yellow-bg)', borderColor: 'rgba(234,179,8,0.15)' }}>
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--status-yellow-text)' }} />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--status-yellow-text)' }}>Actif parent concerné</p>
                        <p className="text-xs text-text-secondary">
                          Le statut de <span className="font-mono font-medium" style={{ color: 'var(--status-yellow-text)' }}>{actifParent.code}</span> — {actifParent.libelle} sera mis en panne
                        </p>
                      </div>
                    </div>
                  )}
                  {actifParent && actifParent.id === actifSelectionne.id && (
                    <div className="p-3 rounded-lg border flex items-start gap-2"
                         style={{ background: 'var(--status-yellow-bg)', borderColor: 'rgba(234,179,8,0.15)' }}>
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--status-yellow-text)' }} />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--status-yellow-text)' }}>Cet actif est l'actif parent racine</p>
                        <p className="text-xs text-text-secondary">Son statut sera mis en panne directement</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Titre */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Titre de la demande <span style={{ color: 'var(--status-red-dot)' }}>*</span>
              </label>
              <input type="text" value={form.titre}
                onChange={e => setForm(f => ({...f, titre: e.target.value}))}
                placeholder="Ex: Arrêt moteur principal, Fuite hydraulique…"
                className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border-subtle outline-none focus:border-purple-500"
              />
              <p className="text-xs text-text-muted mt-1">Un titre clair permet au responsable de comprendre rapidement la panne</p>
            </div>

            {/* Urgence */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Niveau d'urgence <span style={{ color: 'var(--status-red-dot)' }}>*</span>
              </label>
              <div className="space-y-2">
                {Object.entries(URGENCE_INFO).map(([k, v]) => (
                  <label key={k}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      form.urgence === k ? 'border-opacity-100' : 'border-border bg-elevated/40 hover:bg-elevated'
                    }`}
                    style={form.urgence === k ? { ...v.style, borderWidth: '1.5px' } : {}}>
                    <input type="radio" name="urgence" value={k}
                      checked={form.urgence === k}
                      onChange={e => setForm(f => ({...f, urgence: e.target.value}))}
                      className="mt-1 accent-purple-500"/>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: v.dot }}>●</span>
                        <p className="text-sm font-semibold text-text">{v.label}</p>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">{v.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Description du problème <span style={{ color: 'var(--status-red-dot)' }}>*</span>
              </label>
              <textarea value={form.description}
                onChange={e => setForm(f => ({...f, description: e.target.value}))}
                rows={5}
                placeholder={`Décrivez précisément ce que vous observez :\n• Quel est le symptôme ? (bruit, fuite, arrêt, surchauffe…)\n• Depuis quand ?\n• Dans quelles conditions cela se produit-il ?`}
                className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border-subtle outline-none focus:border-purple-500 resize-none"
              />
              <p className="text-xs text-text-muted mt-1">{form.description.length} caractères — plus vous êtes précis, plus vite l'intervention sera réalisée</p>
            </div>

            {/* Pièces jointes — Images */}
            <div className="rounded-xl border p-4" style={{ background: 'var(--color-primary-soft)', borderColor: 'rgba(79,70,229,0.15)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Image size={16} style={{ color: 'var(--color-primary)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>Photos (optionnel)</span>
              </div>
              <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition hover:opacity-80"
                     style={{ borderColor: 'rgba(79,70,229,0.25)', background: 'rgba(79,70,229,0.03)' }}>
                <Upload size={22} style={{ color: 'var(--color-primary)' }} className="mb-2" />
                <p className="text-xs font-medium text-center" style={{ color: 'var(--color-primary)' }}>Cliquez pour ajouter des images</p>
                <p className="text-[11px] text-center text-text-muted">JPG, PNG max 5MB</p>
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              {previewImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2 text-text-secondary">Images ({previewImages.length})</p>
                  <div className="grid grid-cols-4 gap-2">
                    {previewImages.map((preview, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-border-subtle bg-elevated">
                        <img src={preview} alt={`preview-${i}`} className="w-full h-20 object-cover" />
                        <button type="button" onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                          style={{ background: 'var(--status-red-bg)', color: 'var(--status-red-text)' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Vidéos */}
            <div className="rounded-xl border p-4" style={{ background: 'rgba(236,72,153,0.06)', borderColor: 'rgba(236,72,153,0.15)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Video size={16} style={{ color: '#db2777' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#db2777' }}>Vidéos (optionnel)</span>
              </div>
              <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition hover:opacity-80"
                     style={{ borderColor: 'rgba(236,72,153,0.25)', background: 'rgba(236,72,153,0.03)' }}>
                <Upload size={22} style={{ color: '#db2777' }} className="mb-2" />
                <p className="text-xs font-medium text-center" style={{ color: '#db2777' }}>Cliquez pour ajouter des vidéos</p>
                <p className="text-[11px] text-center text-text-muted">MP4, MOV max 20MB</p>
                <input type="file" multiple accept="video/*" onChange={handleVideoChange} className="hidden" />
              </label>
              {previewVideos.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2 text-text-secondary">Vidéos ({previewVideos.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {previewVideos.map((preview, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-border-subtle bg-elevated">
                        <video src={preview} className="w-full h-28 object-cover" controls />
                        <button type="button" onClick={() => removeVideo(i)}
                          className="absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                          style={{ background: 'var(--status-red-bg)', color: 'var(--status-red-text)' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Audio */}
            <div className="rounded-xl border p-4" style={{ background: 'rgba(14,165,233,0.06)', borderColor: 'rgba(14,165,233,0.15)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Mic size={16} style={{ color: '#0ea5e9' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#0ea5e9' }}>Audio (optionnel)</span>
              </div>
              {!isRecording ? (
                <button type="button" onClick={startRecording}
                  className="w-full py-3 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 text-white"
                  style={{ background: '#0ea5e9' }}>
                  <Mic size={16} /> Démarrer l'enregistrement
                </button>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-lg border"
                     style={{ background: 'var(--status-red-bg)', borderColor: 'rgba(220,38,38,0.2)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: 'var(--status-red-dot)' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--status-red-text)' }}>Enregistrement en cours…</p>
                      <p className="text-xs font-mono text-text-secondary">{Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</p>
                    </div>
                  </div>
                  <button type="button" onClick={stopRecording}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition"
                    style={{ background: 'var(--status-red-dot)' }}>
                    Arrêter
                  </button>
                </div>
              )}
              {recordedAudios.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Audios ({recordedAudios.length})</p>
                  {recordedAudios.map((rec, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border transition group hover:opacity-90"
                         style={{ background: 'rgba(14,165,233,0.08)', borderColor: 'rgba(14,165,233,0.18)' }}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button type="button" onClick={() => playRecordedAudio(i)}
                          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white transition"
                          style={{ background: '#0ea5e9' }}>▶</button>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-text truncate">{rec.name}</p>
                          <p className="text-[11px] text-text-muted font-mono">{Math.floor(rec.duration / 60)}:{String(rec.duration % 60).padStart(2, '0')}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeRecordedAudio(i)}
                        className="shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition text-text-muted hover:text-red-500">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-primary)', boxShadow: '0 2px 12px rgba(79,70,229,0.25)' }}>
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" /> Envoi en cours…</>
              ) : (
                <>📢 Déclarer la panne</>
              )}
            </button>
          </form>
        </div>

        {/* ═══════════════ DÉCLARATIONS RÉCENTES ═══════════════ */}
        {showRecents && (
          <div className="bg-surface rounded-xl border border-border p-6 shadow-card flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border-subtle">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--status-purple-bg)' }}>
                <Clock size={16} style={{ color: 'var(--status-purple-text)' }} />
              </div>
              <h2 className="text-sm font-semibold text-text uppercase tracking-wider">Mes déclarations récentes</h2>
              <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--bg-active)', color: 'var(--text-muted)' }}>
                {mesDemandes.length}
              </span>
            </div>

            {mesDemandes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-active)' }}>
                  <AlertTriangle size={24} className="text-text-muted" />
                </div>
                <p className="text-text-secondary text-sm font-medium">Aucune déclaration</p>
                <p className="text-text-muted text-xs mt-1">Vos déclarations apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-3 flex-1">
                {mesDemandes.map(d => {
                  const st = STATUT_STYLES[d.statut] || STATUT_STYLES.en_attente;
                  const ur = URGENCE_INFO[d.urgence] || URGENCE_INFO.normale;
                  return (
                    <div key={d.id} className="rounded-xl border p-4 transition hover:shadow-sm"
                         style={{ background: 'var(--bg-elevated)', borderColor: 'var(--color-border-subtle)' }}>
                      {/* Header ligne */}
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{d.numero}</span>
                        <span className="text-[11px] px-2 py-1 rounded-lg font-medium border"
                              style={{ background: st.bg, color: st.text, borderColor: st.border + '40' }}>
                          {st.label}
                        </span>
                      </div>

                      {/* Titre & Actif */}
                      <p className="text-sm font-semibold text-text truncate">{d.titre || '(Sans titre)'}</p>
                      <p className="text-xs font-medium truncate mt-0.5" style={{ color: 'var(--status-blue-text)' }}>
                        {d.actif_detail?.code} — {d.actif_detail?.libelle}
                      </p>

                      {/* Description */}
                      {d.description && (
                        <p className="text-xs text-text-secondary mt-1.5 line-clamp-2">{d.description}</p>
                      )}

                      {/* Footer ligne */}
                      <div className="flex justify-between items-center mt-3 pt-2.5" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                        <span className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border font-medium"
                              style={{ background: ur.style.background, color: ur.style.color, borderColor: ur.dot + '35' }}>
                          <span style={{ color: ur.dot }}>●</span> {ur.label}
                        </span>
                        <span className="text-[11px] text-text-muted font-mono flex items-center gap-1">
                          <Clock size={11} /> {formatDate(d.dateSignalement)}
                        </span>
                      </div>

                      {/* Messages spéciaux */}
                      {d.statut === 'rejetee' && d.motifRejet && (
                        <div className="mt-2.5 p-2.5 rounded-lg border text-xs"
                             style={{ background: 'var(--status-red-bg)', borderColor: 'rgba(220,38,38,0.12)', color: 'var(--status-red-text)' }}>
                          <span className="font-semibold">Motif de rejet :</span> {d.motifRejet}
                        </div>
                      )}
                      {d.statut === 'validee' && (
                        <div className="mt-2.5 p-2.5 rounded-lg border text-xs flex items-center gap-1.5"
                             style={{ background: 'var(--status-green-bg)', borderColor: 'rgba(22,163,74,0.12)', color: 'var(--status-green-text)' }}>
                          <span>✅</span> <span className="font-semibold">OT créé</span> — intervention en cours de traitement
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <button onClick={() => navigate('/ordres/demandes')}
                className="w-full py-2.5 text-sm font-semibold rounded-lg transition border"
                style={{ color: 'var(--color-primary)', borderColor: 'rgba(79,70,229,0.25)', background: 'var(--color-primary-soft)' }}>
                Voir toutes les demandes →
              </button>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
