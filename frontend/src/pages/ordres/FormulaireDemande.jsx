import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createDemande, getDemandes } from "../../services/ordreService";
import { getActifs, getActif } from "../../services/actifService";
import {
  X,
  Image,
  Mic,
  Video,
  AlertTriangle,
  Building2,
  Clock,
  Wrench,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Play,
  Square,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "../../services/api";
import useAuthStore from "@/store/authStore";

const URGENCE_INFO = {
  critique: {
    label: "Critique",
    desc: "Production arrêtée",
    dot: "var(--status-red-dot)",
    style: {
      borderColor: "var(--status-red-dot)",
      background: "var(--status-red-bg)",
      color: "var(--status-red-text)",
    },
  },
  haute: {
    label: "Haute",
    desc: "Traiter dans la journée",
    dot: "var(--status-orange-dot)",
    style: {
      borderColor: "var(--status-orange-dot)",
      background: "var(--status-orange-bg)",
      color: "var(--status-orange-text)",
    },
  },
  normale: {
    label: "Normale",
    desc: "Peut attendre quelques jours",
    dot: "var(--status-blue-dot)",
    style: {
      borderColor: "var(--status-blue-dot)",
      background: "var(--status-blue-bg)",
      color: "var(--status-blue-text)",
    },
  },
  basse: {
    label: "Basse",
    desc: "Selon disponibilité",
    dot: "var(--status-gray-dot)",
    style: {
      borderColor: "var(--status-gray-dot)",
      background: "var(--status-gray-bg)",
      color: "var(--status-gray-text)",
    },
  },
};

const STATUT_STYLES = {
  en_attente: {
    label: "En attente",
    bg: "var(--status-yellow-bg)",
    text: "var(--status-yellow-text)",
    border: "var(--status-yellow-dot)",
  },
  validee: {
    label: "Validée",
    bg: "var(--status-green-bg)",
    text: "var(--status-green-text)",
    border: "var(--status-green-dot)",
  },
  rejetee: {
    label: "Rejetée",
    bg: "var(--status-red-bg)",
    text: "var(--status-red-text)",
    border: "var(--status-red-dot)",
  },
};

function MediaSection({ icon: Icon, label, color, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border-subtle overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition hover:opacity-80"
        style={{ background: "var(--color-elevated)", color }}>
        <Icon size={14} style={{ color }} />
        <span style={{ color }}>{label}</span>
        <span className="ml-auto opacity-50">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {open && (
        <div
          className="p-3 border-t border-border-subtle"
          style={{ background: "var(--color-surface)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function FormulaireDemande({
  defaultActifId,
  defaultActif,
  onClose,
  onSuccess,
}) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const uniteUser = user?.unite_principale;

  const [mesDemandes, setMesDemandes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRecents, setShowRecents] = useState(false);

  const [selectionPath, setSelectionPath] = useState([]);
  const [optionsAtLevel, setOptionsAtLevel] = useState([]);
  const [loadingActifs, setLoadingActifs] = useState(false);

  const [form, setForm] = useState({
    idActif: defaultActifId ?? "",
    titre: "",
    urgence: "normale",
    description: "",
  });
  const [images, setImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [previewVideos, setPreviewVideos] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudios, setRecordedAudios] = useState([]);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState(null);

  const chunksRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordingStartTimeRef = useRef(null);

  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  /* ── Pre-fill actif from prop (passed from table row click) ── */
  useEffect(() => {
    // Load root actifs for cascade
    setLoadingActifs(true);
    getActifs({ estActif: true, is_parent: true, my_unite: true })
      .then((r) => {
        const roots = r.data.results || r.data;
        setOptionsAtLevel([roots]);

        // If we have a defaultActif object passed directly, pre-select it
        if (defaultActif) {
          setSelectionPath([defaultActif]);
          setForm((f) => ({ ...f, idActif: String(defaultActif.id) }));
          // Load children
          getActifs({
            estActif: true,
            idParent: defaultActif.id,
            my_unite: true,
          })
            .then((rc) => {
              const children = rc.data.results || rc.data;
              if (children.length > 0) setOptionsAtLevel([roots, children]);
            })
            .catch(console.error);
        } else if (defaultActifId) {
          // Fallback: fetch actif by id
          getActif(defaultActifId).then((r) => {
            setSelectionPath([r.data]);
            setForm((f) => ({ ...f, idActif: String(defaultActifId) }));
            getActifs({
              estActif: true,
              idParent: defaultActifId,
              my_unite: true,
            })
              .then((rc) => {
                const children = rc.data.results || rc.data;
                if (children.length > 0) setOptionsAtLevel([roots, children]);
              })
              .catch(console.error);
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoadingActifs(false));

    getDemandes({ my_unite: true }).then((r) =>
      setMesDemandes((r.data.results || r.data).slice(0, 6)),
    );
  }, [defaultActifId, defaultActif]);

  useEffect(() => {
    let interval;
    if (isRecording)
      interval = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state !== "inactive")
        mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      currentPlayingAudio?.pause();
      recordedAudios.forEach((r) => r.url && URL.revokeObjectURL(r.url));
      previewImages.forEach(URL.revokeObjectURL);
      previewVideos.forEach(URL.revokeObjectURL);
    };
  }, []);

  /* Cascade */
  const actifParent = selectionPath[0] ?? null;
  const actifSelectionne = selectionPath[selectionPath.length - 1] ?? null;

  const handleSelectAtLevel = async (levelIndex, assetId) => {
    if (!assetId) {
      setSelectionPath((p) => p.slice(0, levelIndex));
      setOptionsAtLevel((p) => p.slice(0, levelIndex + 1));
      setForm((f) => ({ ...f, idActif: "" }));
      return;
    }
    const selectedAsset = optionsAtLevel[levelIndex].find(
      (a) => String(a.id) === String(assetId),
    );
    if (!selectedAsset) return;
    const newPath = [...selectionPath.slice(0, levelIndex), selectedAsset];
    setSelectionPath(newPath);
    setForm((f) => ({ ...f, idActif: selectedAsset.id }));
    setOptionsAtLevel((p) => p.slice(0, levelIndex + 1));
    setLoadingActifs(true);
    try {
      const r = await getActifs({
        estActif: true,
        idParent: selectedAsset.id,
        my_unite: true,
      });
      const children = r.data.results || r.data;
      if (children.length > 0)
        setOptionsAtLevel((p) => {
          const u = [...p.slice(0, levelIndex + 1)];
          u[levelIndex + 1] = children;
          return u;
        });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingActifs(false);
    }
  };

  const clearSelection = () => {
    setSelectionPath([]);
    setOptionsAtLevel((p) => p.slice(0, 1));
    setForm((f) => ({ ...f, idActif: "" }));
  };

  /* Files */
  const handleImageChange = (e) => {
    const files = [...images, ...Array.from(e.target.files || [])];
    setImages(files);
    setPreviewImages(files.map((f) => URL.createObjectURL(f)));
    e.target.value = "";
  };
  const removeImage = (i) => {
    URL.revokeObjectURL(previewImages[i]);
    const f = images.filter((_, j) => j !== i);
    setImages(f);
    setPreviewImages(f.map((x) => URL.createObjectURL(x)));
  };
  const handleVideoChange = (e) => {
    const files = [...videos, ...Array.from(e.target.files || [])];
    setVideos(files);
    setPreviewVideos(files.map((f) => URL.createObjectURL(f)));
    e.target.value = "";
  };
  const removeVideo = (i) => {
    URL.revokeObjectURL(previewVideos[i]);
    const f = videos.filter((_, j) => j !== i);
    setVideos(f);
    setPreviewVideos(f.map((x) => URL.createObjectURL(x)));
  };

  /* Audio */
  const getSupportedMimeType = () => {
    for (const t of ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav"])
      if (MediaRecorder.isTypeSupported(t)) return t;
    return "";
  };
  const startRecording = async () => {
    if (
      !window.isSecureContext &&
      location.protocol !== "https:" &&
      location.hostname !== "localhost"
    ) {
      setErreur("Enregistrement audio nécessite HTTPS.");
      return;
    }
    try {
      chunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType, audioBitsPerSecond: 128000 } : {},
      );
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const duration = Math.floor(
          (Date.now() - recordingStartTimeRef.current) / 1000,
        );
        const finalType = mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalType });
        if (!blob.size) {
          setErreur("Aucun audio enregistré.");
          return;
        }
        const ext = finalType.includes("mp4")
          ? "mp4"
          : finalType.includes("ogg")
            ? "ogg"
            : "webm";
        const name = `recording_${Date.now()}.${ext}`;
        setRecordedAudios((p) => [
          ...p,
          { blob, url: URL.createObjectURL(blob), duration, name },
        ]);
        setAudioFiles((p) => [
          ...p,
          new File([blob], name, { type: finalType }),
        ]);
        setRecordingTime(0);
      };
      recorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      setErreur(
        err.name === "NotAllowedError"
          ? "Microphone bloqué. Autorisez l'accès."
          : err.name === "NotFoundError"
            ? "Aucun microphone détecté."
            : `Erreur: ${err.message}`,
      );
    }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
    }
  };
  const removeRecordedAudio = (i) => {
    if (recordedAudios[i]?.url) URL.revokeObjectURL(recordedAudios[i].url);
    const name = recordedAudios[i].name;
    setRecordedAudios((p) => p.filter((_, j) => j !== i));
    setAudioFiles((p) => p.filter((f) => f.name !== name));
  };
  const playRecordedAudio = (i) => {
    currentPlayingAudio?.pause();
    const rec = recordedAudios[i];
    if (!rec?.blob?.size) {
      setErreur("Fichier audio vide");
      return;
    }
    const audio = new Audio(rec.url || URL.createObjectURL(rec.blob));
    setCurrentPlayingAudio(audio);
    audio.onended = () => setCurrentPlayingAudio(null);
    audio.onerror = () => {
      setErreur("Impossible de lire le fichier");
      setCurrentPlayingAudio(null);
    };
    audio.play().catch((e) => {
      setErreur(e.message);
      setCurrentPlayingAudio(null);
    });
  };

  /* Submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setSucces("");
    if (!form.idActif) return setErreur("Sélectionnez l'équipement en panne.");
    if (!form.titre.trim()) return setErreur("Saisissez un titre.");
    if (!form.description.trim())
      return setErreur("Décrivez le problème observé.");
    setLoading(true);
    try {
      const res = await createDemande(form);
      const demandeId = res.data.id;
      const tousLesFichiers = [...images, ...videos, ...audioFiles];
      if (tousLesFichiers.length > 0) {
        const fd = new FormData();
        tousLesFichiers.forEach((f) => fd.append("fichiers", f));
        try {
          await api.post(
            `/v1/ordres/demandes/${demandeId}/telecharger_fichiers/`,
            fd,
            { headers: { "Content-Type": "multipart/form-data" } },
          );
        } catch (e) {
          console.warn("Upload non-bloquant:", e.message);
        }
      }
      setSucces(`Demande ${res.data.numero} enregistrée.`);
      setForm({ idActif: "", titre: "", urgence: "normale", description: "" });
      setImages([]);
      setPreviewImages([]);
      setVideos([]);
      setPreviewVideos([]);
      setAudioFiles([]);
      setRecordedAudios([]);
      clearSelection();
      getDemandes({ my_unite: true }).then((r) =>
        setMesDemandes((r.data.results || r.data).slice(0, 6)),
      );
      if (onSuccess) onSuccess();
    } catch (e) {
      setErreur(
        e.response?.data?.description?.[0] ||
          e.response?.data?.error ||
          "Erreur lors de la déclaration.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () =>
    onClose ? onClose() : navigate("/ordres/demandes");
  const formatDate = (d) =>
    new Date(d).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  /* ── FORM ── */
  const formCard = (
    <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-5 py-3 border-b border-border"
        style={{ background: "var(--color-elevated)" }}>
        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Wrench size={14} style={{ color: "var(--color-primary)" }} />
        </div>
        <h2 className="text-sm font-semibold text-text">
          Nouvelle déclaration de panne
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={handleClose}
            className="ml-auto p-1.5 rounded-md text-text-muted hover:text-text transition">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Banners */}
        {uniteUser && (
          <div
            className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 border"
            style={{
              background: "var(--status-blue-bg)",
              borderColor: "rgba(37,99,235,0.18)",
              color: "var(--status-blue-text)",
            }}>
            <Building2 size={13} />
            <span>
              <strong>{uniteUser.libelle}</strong> — actifs de cette unité
              uniquement
            </span>
          </div>
        )}
        {!uniteUser && (
          <div
            className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 border"
            style={{
              background: "var(--status-yellow-bg)",
              borderColor: "rgba(234,179,8,0.18)",
              color: "var(--status-yellow-text)",
            }}>
            <AlertTriangle size={13} />
            <span>
              Aucune unité principale assignée. Contactez un administrateur.
            </span>
          </div>
        )}
        {erreur && (
          <div
            className="flex items-start gap-2 text-sm rounded-lg px-3 py-2 border"
            style={{
              background: "var(--status-red-bg)",
              borderColor: "rgba(220,38,38,0.2)",
              color: "var(--status-red-text)",
            }}>
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            {erreur}
          </div>
        )}
        {succes && (
          <div
            className="flex items-start gap-2 text-sm rounded-lg px-3 py-2 border"
            style={{
              background: "var(--status-green-bg)",
              borderColor: "rgba(22,163,74,0.2)",
              color: "var(--status-green-text)",
            }}>
            <span>✓</span>
            {succes}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Équipement — cascade with shadcn Select */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Équipement en panne{" "}
              <span style={{ color: "var(--status-red-dot)" }}>*</span>
            </label>

            {loadingActifs && !optionsAtLevel.length && (
              <p className="text-xs text-text-muted py-1">Chargement…</p>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              {optionsAtLevel.map((options, levelIndex) => (
                <div
                  key={levelIndex}
                  className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                  {levelIndex > 0 && (
                    <ChevronRight
                      size={13}
                      className="text-text-muted shrink-0"
                    />
                  )}
                  <Select
                    value={
                      selectionPath[levelIndex]
                        ? String(selectionPath[levelIndex].id)
                        : ""
                    }
                    onValueChange={(val) =>
                      handleSelectAtLevel(
                        levelIndex,
                        val === "__none__" ? null : val,
                      )
                    }>
                    <SelectTrigger className="flex-1 h-9 text-xs bg-elevated border-border-subtle">
                      <SelectValue
                        placeholder={
                          levelIndex === 0
                            ? "Actif parent"
                            : `Sous-actif niv. ${levelIndex}`
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {levelIndex > 0 && (
                        <SelectItem
                          value="__none__"
                          className="text-xs text-text-muted italic">
                          — Désélectionner —
                        </SelectItem>
                      )}
                      {options.map((a) => (
                        <SelectItem
                          key={a.id}
                          value={String(a.id)}
                          className="text-xs">
                          <span className="font-mono font-semibold">
                            {a.code}
                          </span>
                          <span className="text-text-muted">
                            {" "}
                            — {a.libelle}
                          </span>
                          {a.statut === "en_panne" && (
                            <span className="ml-1 text-orange-400">⚠</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Selected path display */}
            {actifSelectionne && (
              <div
                className="mt-2 flex items-center justify-between px-3 py-2 rounded-lg border"
                style={{
                  background: "var(--status-blue-bg)",
                  borderColor: "rgba(37,99,235,0.15)",
                }}>
                <div className="flex items-center gap-1 flex-wrap text-xs">
                  {selectionPath.map((a, i) => (
                    <span key={a.id} className="flex items-center">
                      <span
                        className="font-mono font-semibold"
                        style={{ color: "var(--status-blue-text)" }}>
                        {a.code}
                      </span>
                      <span className="text-text-secondary">
                        {" "}
                        — {a.libelle}
                      </span>
                      {i < selectionPath.length - 1 && (
                        <ChevronRight
                          size={11}
                          className="text-text-muted mx-0.5"
                        />
                      )}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="shrink-0 ml-2 p-1 rounded text-text-muted hover:text-red-500 transition">
                  <X size={13} />
                </button>
              </div>
            )}

            {actifParent && actifSelectionne && (
              <p
                className="mt-1.5 text-xs px-1 flex items-center gap-1"
                style={{ color: "var(--status-yellow-text)" }}>
                <AlertTriangle size={11} />
                {actifParent.id === actifSelectionne.id
                  ? "Cet actif parent sera mis en panne."
                  : `L'actif parent ${actifParent.code} sera mis en panne.`}
              </p>
            )}
          </div>

          {/* Titre */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Titre <span style={{ color: "var(--status-red-dot)" }}>*</span>
            </label>
            <input
              type="text"
              value={form.titre}
              onChange={(e) =>
                setForm((f) => ({ ...f, titre: e.target.value }))
              }
              placeholder="Ex: Arrêt moteur principal, Fuite hydraulique…"
              className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border-subtle outline-none focus:border-primary"
            />
          </div>

          {/* Urgence */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Urgence <span style={{ color: "var(--status-red-dot)" }}>*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(URGENCE_INFO).map(([k, v]) => (
                <label
                  key={k}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition text-xs font-medium"
                  style={
                    form.urgence === k
                      ? { ...v.style, borderWidth: "1.5px" }
                      : {
                          background: "var(--color-elevated)",
                          borderColor: "var(--color-border-subtle)",
                          color: "var(--color-text-secondary)",
                        }
                  }>
                  <input
                    type="radio"
                    name="urgence"
                    value={k}
                    checked={form.urgence === k}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, urgence: e.target.value }))
                    }
                    className="hidden"
                  />
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: v.dot }}
                  />
                  <span>{v.label}</span>
                </label>
              ))}
            </div>
            {form.urgence && (
              <p className="mt-1 text-xs text-text-muted pl-1">
                {URGENCE_INFO[form.urgence]?.desc}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Description{" "}
              <span style={{ color: "var(--status-red-dot)" }}>*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={4}
              placeholder="Symptôme, depuis quand, dans quelles conditions…"
              className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border-subtle outline-none focus:border-primary resize-none"
            />
            <p className="text-[11px] text-text-muted mt-0.5 text-right">
              {form.description.length} car.
            </p>
          </div>

          {/* Media */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary">
              Pièces jointes (optionnel)
            </p>

            <MediaSection
              icon={Image}
              label={`Photos${images.length ? ` (${images.length})` : ""}`}
              color="var(--color-primary)">
              <label
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer hover:opacity-80 transition text-xs"
                style={{
                  borderColor: "rgba(79,70,229,0.3)",
                  color: "var(--color-primary)",
                }}>
                <Plus size={14} />
                <span>Ajouter des photos</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {previewImages.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {previewImages.map((src, i) => (
                    <div
                      key={i}
                      className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border-subtle">
                      <img
                        src={src}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <Trash2 size={14} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </MediaSection>

            <MediaSection
              icon={Video}
              label={`Vidéos${videos.length ? ` (${videos.length})` : ""}`}
              color="#db2777">
              <label
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer hover:opacity-80 transition text-xs"
                style={{
                  borderColor: "rgba(236,72,153,0.3)",
                  color: "#db2777",
                }}>
                <Plus size={14} />
                <span>Ajouter des vidéos</span>
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                />
              </label>
              {previewVideos.length > 0 && (
                <div className="mt-2 space-y-2">
                  {previewVideos.map((src, i) => (
                    <div
                      key={i}
                      className="relative group rounded-lg overflow-hidden border border-border-subtle">
                      <video
                        src={src}
                        className="w-full h-28 object-cover"
                        controls
                      />
                      <button
                        type="button"
                        onClick={() => removeVideo(i)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition">
                        <X size={13} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </MediaSection>

            <MediaSection
              icon={Mic}
              label={`Audio${recordedAudios.length ? ` (${recordedAudios.length})` : ""}`}
              color="#0ea5e9">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white transition"
                  style={{ background: "#0ea5e9" }}>
                  <Mic size={14} /> Démarrer l'enregistrement
                </button>
              ) : (
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-lg border"
                  style={{
                    background: "var(--status-red-bg)",
                    borderColor: "rgba(220,38,38,0.2)",
                  }}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: "var(--status-red-dot)" }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--status-red-text)" }}>
                      Enregistrement
                    </span>
                    <span className="text-xs font-mono text-text-secondary">
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: "var(--status-red-dot)" }}>
                    <Square size={12} /> Arrêter
                  </button>
                </div>
              )}
              {recordedAudios.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {recordedAudios.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border group"
                      style={{
                        background: "rgba(14,165,233,0.07)",
                        borderColor: "rgba(14,165,233,0.18)",
                      }}>
                      <button
                        type="button"
                        onClick={() => playRecordedAudio(i)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0"
                        style={{ background: "#0ea5e9" }}>
                        <Play size={11} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text truncate">
                          {rec.name}
                        </p>
                        <p className="text-[11px] text-text-muted font-mono">
                          {formatTime(rec.duration)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRecordedAudio(i)}
                        className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition text-text-muted hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </MediaSection>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "var(--color-primary)",
              boxShadow: "0 2px 12px rgba(79,70,229,0.25)",
            }}>
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />{" "}
                Envoi…
              </>
            ) : (
              "Déclarer la panne"
            )}
          </button>
        </form>
      </div>
    </div>
  );

  /* ── Recent sidebar ── */
  const recentsSidebar = showRecents && (
    <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
      <div
        className="flex items-center gap-2 px-5 py-3 border-b border-border"
        style={{ background: "var(--color-elevated)" }}>
        <Clock size={14} style={{ color: "var(--status-purple-text)" }} />
        <h2 className="text-sm font-semibold text-text">
          Déclarations récentes
        </h2>
        <span
          className="ml-auto text-[11px] px-1.5 py-0.5 rounded-full font-medium"
          style={{
            background: "var(--bg-active)",
            color: "var(--text-muted)",
          }}>
          {mesDemandes.length}
        </span>
      </div>
      <div className="p-4 space-y-2 overflow-y-auto max-h-[70vh]">
        {mesDemandes.length === 0 ? (
          <p className="text-center text-xs text-text-muted py-10">
            Aucune déclaration
          </p>
        ) : (
          mesDemandes.map((d) => {
            const st = STATUT_STYLES[d.statut] || STATUT_STYLES.en_attente;
            const ur = URGENCE_INFO[d.urgence] || URGENCE_INFO.normale;
            return (
              <div
                key={d.id}
                className="rounded-lg border p-3 hover:shadow-sm transition"
                style={{
                  background: "var(--bg-elevated)",
                  borderColor: "var(--color-border-subtle)",
                }}>
                <div className="flex justify-between items-center mb-1.5">
                  <span
                    className="font-mono text-xs font-semibold"
                    style={{ color: "var(--color-primary)" }}>
                    {d.numero}
                  </span>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-md font-medium border"
                    style={{
                      background: st.bg,
                      color: st.text,
                      borderColor: st.border + "40",
                    }}>
                    {st.label}
                  </span>
                </div>
                <p className="text-sm font-semibold text-text truncate">
                  {d.titre || "(Sans titre)"}
                </p>
                <p
                  className="text-xs truncate mt-0.5"
                  style={{ color: "var(--status-blue-text)" }}>
                  {d.actif_detail?.code} — {d.actif_detail?.libelle}
                </p>
                {d.description && (
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                    {d.description}
                  </p>
                )}
                <div
                  className="flex justify-between items-center mt-2 pt-2"
                  style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
                  <span
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium"
                    style={{
                      background: ur.style.background,
                      color: ur.style.color,
                      borderColor: ur.dot + "35",
                    }}>
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: ur.dot }}
                    />
                    {ur.label}
                  </span>
                  <span className="text-[11px] text-text-muted font-mono">
                    {formatDate(d.dateSignalement)}
                  </span>
                </div>
                {d.statut === "rejetee" && d.motifRejet && (
                  <div
                    className="mt-2 p-2 rounded text-xs"
                    style={{
                      background: "var(--status-red-bg)",
                      color: "var(--status-red-text)",
                    }}>
                    <span className="font-semibold">Rejet :</span>{" "}
                    {d.motifRejet}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="px-4 py-3 border-t border-border">
        <button
          onClick={() => navigate("/ordres/demandes")}
          className="w-full py-2 text-xs font-semibold rounded-lg transition border"
          style={{
            color: "var(--color-primary)",
            borderColor: "rgba(79,70,229,0.25)",
            background: "var(--color-primary-soft)",
          }}>
          Voir toutes →
        </button>
      </div>
    </div>
  );

  /* ── Dialog mode ── */
  if (onClose) {
    return (
      <div className="flex flex-col max-h-[85vh]">
        <div className="overflow-y-auto flex-1 min-h-0">{formCard}</div>
      </div>
    );
  }

  /* ── Page mode ── */
  return (
    <div className="page">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text tracking-tight">
            Déclarer une panne
          </h1>
          <p className="text-text-muted text-xs mt-0.5">
            L'actif parent sera automatiquement mis en panne.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRecents((v) => !v)}
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm transition hover:brightness-110 text-sm font-semibold"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--color-border)",
            color: "var(--color-primary)",
          }}>
          <Clock size={15} />
          <span className="hidden sm:inline">Récentes</span>
          <span
            className="text-[11px] px-1.5 py-0.5 rounded-full font-bold"
            style={{
              background: "var(--color-primary-soft)",
              color: "var(--color-primary)",
            }}>
            {mesDemandes.length}
          </span>
          {showRecents ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div
        className={`grid gap-5 transition-all duration-300 ${showRecents ? "grid-cols-1 lg:grid-cols-[1fr_380px]" : "grid-cols-1 max-w-2xl"}`}>
        {formCard}
        {recentsSidebar}
      </div>
    </div>
  );
}
