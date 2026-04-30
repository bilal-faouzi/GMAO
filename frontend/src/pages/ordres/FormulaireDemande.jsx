import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createDemande } from "../../services/ordreService";
import { getActifs, getActif } from "../../services/actifService";
import { updateUnite } from "../../services/organisationService";
import { ArrowLeft, Upload, X, Image, Mic } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import api from "../../services/api";
import { Input } from "@/components/ui/input";

const URGENCES = [
  {
    value: "basse",
    label: "Basse",
    description: "Pas urgent, peut attendre quelques jours",
    color: "var(--status-gray-dot)",
  },
  {
    value: "normale",
    label: "Normale",
    description: "À traiter dans les 24-48 heures",
    color: "var(--status-blue-dot)",
  },
  {
    value: "haute",
    label: "Haute",
    description: "À traiter en priorité, impact modéré",
    color: "var(--status-orange-dot)",
  },
  {
    value: "critique",
    label: "Critique",
    description: "Urgence absolue, arrêt de production",
    color: "var(--status-red-dot)",
  },
];

function UrgenceSelector({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      {URGENCES.map((urgence) => (
        <button
          key={urgence.value}
          type="button"
          onClick={() => onChange(urgence.value)}
          className="flex items-start gap-3 p-3 rounded-[var(--r-sm)] cursor-pointer transition-all duration-150"
          style={{
            border:
              value === urgence.value
                ? `2px solid ${urgence.color}`
                : "1px solid var(--border-default)",
            background:
              value === urgence.value
                ? `${urgence.color}15`
                : "var(--bg-elevated)",
          }}>
          <div
            className="w-3 h-3 rounded-full mt-1 shrink-0"
            style={{ background: urgence.color }}
          />
          <div className="text-left flex-1">
            <div className="text-[13px] font-semibold text-[var(--text-primary)]">
              {urgence.label}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              {urgence.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function FormulaireDemande({
  defaultActifId,
  onClose,
  onSuccess,
}) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    idActif: defaultActifId ?? "",
    titre: "",
    description: "",
    urgence: "normale",
  });

  const [actifs, setActifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [actifDetails, setActifDetails] = useState(null);

  // Images
  const [images, setImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudios, setRecordedAudios] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState(null);

  const chunksRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordingStartTimeRef = useRef(null);

  useEffect(() => {
    getActifs({ estActif: true }).then((r) =>
      setActifs(r.data.results || r.data),
    );
  }, []);

  useEffect(() => {
    if (defaultActifId) {
      getActif(defaultActifId).then((r) => {
        setActifDetails(r.data);
        setForm((f) => ({ ...f, idActif: String(defaultActifId) }));
      });
    }
  }, [defaultActifId]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (currentPlayingAudio) currentPlayingAudio.pause();
      recordedAudios.forEach((r) => r.url && URL.revokeObjectURL(r.url));
      previewImages.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleClose = () => {
    if (onClose) onClose();
    else navigate("/ordres/demandes");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // ── Images ──────────────────────────────────────────────
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newImages = [...images, ...files];
    setImages(newImages);
    setPreviewImages(newImages.map((f) => URL.createObjectURL(f)));
    e.target.value = "";
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previewImages[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Audio recording ──────────────────────────────────────
  const startRecording = async () => {
    try {
      chunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);

      recorder.onstop = () => {
        const durationSeconds = Math.floor(
          (Date.now() - recordingStartTimeRef.current) / 1000,
        );
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        if (blob.size === 0) {
          setErreur("Aucun audio enregistré. Vérifiez votre microphone.");
          return;
        }

        const fileName = `recording_${Date.now()}.webm`;
        setRecordedAudios((prev) => [
          ...prev,
          {
            blob,
            url: URL.createObjectURL(blob),
            duration: durationSeconds,
            name: fileName,
          },
        ]);
        const file = new File([blob], fileName, { type: "audio/webm" });
        setAudioFiles((prev) => [...prev, file]);
        setRecordingTime(0);
      };

      recorder.onerror = (e) =>
        setErreur(`Erreur d'enregistrement: ${e.error}`);

      recorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      setErreur(`Erreur microphone: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
    }
  };

  const removeRecordedAudio = (index) => {
    if (recordedAudios[index]?.url)
      URL.revokeObjectURL(recordedAudios[index].url);
    const nameToRemove = recordedAudios[index].name;
    setRecordedAudios((prev) => prev.filter((_, i) => i !== index));
    setAudioFiles((prev) => prev.filter((f) => f.name !== nameToRemove));
  };

  const playRecordedAudio = (index) => {
    if (currentPlayingAudio) {
      currentPlayingAudio.pause();
      currentPlayingAudio.currentTime = 0;
    }
    const recorded = recordedAudios[index];
    if (!recorded?.blob?.size) {
      setErreur("Le fichier audio est vide.");
      return;
    }
    const audio = new Audio(recorded.url);
    setCurrentPlayingAudio(audio);
    audio.onended = () => setCurrentPlayingAudio(null);
    audio.onerror = () => {
      setErreur("Impossible de lire le fichier audio.");
      setCurrentPlayingAudio(null);
    };
    audio.play().catch((err) => setErreur(`Erreur lecture: ${err.message}`));
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      const res = await createDemande(form);
      const demandeId = res.data.id;

      if (form.urgence === "critique" && actifDetails?.idUnite) {
        try {
          await updateUnite(actifDetails.idUnite, { estProductive: false });
        } catch (err) {
          console.error("Erreur mise à jour unité:", err);
        }
      }

      const tousLesFichiers = [...images, ...audioFiles];
      if (tousLesFichiers.length > 0) {
        const formData = new FormData();
        tousLesFichiers.forEach((f) => formData.append("fichiers", f));
        try {
          await api.post(
            `/v1/ordres/demandes/${demandeId}/telecharger_fichiers/`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } },
          );
        } catch (err) {
          console.warn("Erreur upload fichiers (non-bloquant):", err.message);
        }
      }
      if (onSuccess) onSuccess();
      else handleClose();
    } catch (e) {
      setErreur(e.response?.data || "Erreur lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  };

  // ── Shared form body ─────────────────────────────────────
  const formBody = (
    <form
      id="demande-form"
      onSubmit={handleSubmit}
      className="flex flex-col gap-4">
      {erreur && (
        <div className="alert-warn">
          {typeof erreur === "object" ? JSON.stringify(erreur) : erreur}
        </div>
      )}

      {/* Actif selector — only in page mode */}
      {!defaultActifId && !onClose && (
        <div className="fg">
          <label className="flabel">
            Actif concerné <span className="req">*</span>
          </label>
          <Select
            value={form.idActif}
            onValueChange={(value) =>
              setForm((f) => ({ ...f, idActif: value }))
            }>
            <SelectTrigger className="fsel">
              <SelectValue placeholder="— Sélectionner l'équipement en panne —" />
            </SelectTrigger>
            <SelectContent>
              {actifs.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.code} — {a.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Urgence */}
      <div className="fg">
        <label className="flabel">
          Urgence <span className="req">*</span>
        </label>
        <UrgenceSelector
          value={form.urgence}
          onChange={(v) => setForm((f) => ({ ...f, urgence: v }))}
        />
      </div>

      {/* titre */}
      <div className="fg">
        <Label className="flabel">titre</Label>
        <Input
          name="titre"
          value={form.titre}
          onChange={handleChange}
          placeholder="Titre Sinificative..."
        />
      </div>
      {/* Description */}
      <div className="fg">
        <Label className="flabel">Description</Label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows="3"
          className="finput resize-none"
          placeholder="Décrivez le problème rencontré..."
        />
      </div>

      {/* Upload images */}
      <div className="bg-[var(--status-purple-bg,rgba(139,92,246,.08))] border border-[rgba(139,92,246,.25)] rounded-[var(--r-sm)] p-3.5">
        <div className="flex items-center gap-2 mb-2.5">
          <Image size={15} className="text-[var(--status-purple-text)]" />
          <span className="text-[11px] font-semibold uppercase tracking-[.05em] text-[var(--status-purple-text)]">
            Photos (optionnel)
          </span>
        </div>

        <label className="flex flex-col items-center justify-center p-[14px_12px] border-2 border-dashed border-[rgba(139,92,246,.35)] rounded-[var(--r-sm)] cursor-pointer transition-[border-color] duration-150">
          <Upload
            size={20}
            className="text-[var(--status-purple-text)] mb-1.5"
          />
          <span className="text-xs text-[var(--status-purple-text)] text-center">
            Cliquez pour ajouter des images
            <br />
            <span className="opacity-60">JPG, PNG — max 5 MB</span>
          </span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
        </label>

        {previewImages.length > 0 && (
          <div className="mt-2.5">
            <span className="text-[11px] font-semibold text-[var(--status-purple-text)] uppercase">
              📸 Images ({previewImages.length})
            </span>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {previewImages.map((src, i) => (
                <div
                  key={i}
                  className="relative rounded-[var(--r-sm)] overflow-hidden border border-[rgba(139,92,246,.3)]">
                  <img src={src} alt="" className="w-full h-20 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-[var(--status-red-bg)] border-none rounded-full p-1 cursor-pointer text-[var(--status-red-text)] flex">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Audio recording */}
      <div className="bg-[var(--status-blue-bg,rgba(59,130,246,.08))] border border-[rgba(59,130,246,.25)] rounded-[var(--r-sm)] p-3.5">
        <div className="flex items-center gap-2 mb-2.5">
          <Mic size={15} className="text-[var(--status-blue-text)]" />
          <span className="text-[11px] font-semibold uppercase tracking-[.05em] text-[var(--status-blue-text)]">
            Enregistrement audio (optionnel)
          </span>
        </div>

        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="w-full py-2.5 px-3.5 bg-[rgba(59,130,246,.15)] border border-[rgba(59,130,246,.4)] rounded-[var(--r-sm)] text-[var(--status-blue-text)] text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-2 transition-[background] duration-150">
            <Mic size={16} /> Démarrer l'enregistrement
          </button>
        ) : (
          <div className="bg-[var(--status-red-bg)] border border-[rgba(239,68,68,.25)] rounded-[var(--r-sm)] p-[10px_14px] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--status-red-dot)] animate-pulse shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-[var(--status-red-text)]">
                  Enregistrement en cours…
                </p>
                <p className="text-xs font-mono text-[var(--status-red-text)] opacity-80">
                  {formatTime(recordingTime)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="py-1.5 px-3 bg-[var(--status-red-dot)] border-none rounded-[var(--r-sm)] text-white text-xs font-semibold cursor-pointer">
              Arrêter
            </button>
          </div>
        )}

        {recordedAudios.length > 0 && (
          <div className="mt-2.5">
            <span className="text-[11px] font-semibold text-[var(--status-blue-text)] uppercase">
              📦 Audios ({recordedAudios.length})
            </span>
            <div className="flex flex-col gap-1.5 mt-2">
              {recordedAudios.map((rec, i) => (
                <div
                  key={i}
                  className="bg-[rgba(59,130,246,.1)] border border-[rgba(59,130,246,.3)] rounded-[var(--r-sm)] p-[8px_12px] flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => playRecordedAudio(i)}
                    className="w-8 h-8 rounded-full bg-[rgba(59,130,246,.3)] border-none text-[var(--status-blue-text)] cursor-pointer flex items-center justify-center shrink-0 text-[13px]">
                    ▶
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--status-blue-text)] overflow-hidden text-ellipsis whitespace-nowrap">
                      {rec.name}
                    </p>
                    <p className="text-[11px] font-mono text-[var(--color-text-muted)]">
                      ⏱ {formatTime(rec.duration)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRecordedAudio(i)}
                    className="bg-transparent border-none text-[var(--color-text-muted)] cursor-pointer flex p-1">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </form>
  );

  const formActions = (
    <div className="flex gap-2 justify-end shrink-0 pt-3 border-t border-[var(--border-subtle)]">
      <Button type="button" onClick={handleClose} className="btn btn-outline">
        Annuler
      </Button>
      <Button
        type="submit"
        form="demande-form"
        disabled={loading}
        className="btn btn-primary"
        style={{ opacity: loading ? 0.6 : 1 }}>
        {loading ? "Envoi…" : "Déclarer la panne"}
      </Button>
    </div>
  );

  // ── Dialog mode ──────────────────────────────────────────
  if (onClose) {
    return (
      <div className="flex flex-col max-h-[80vh]">
        <div className="overflow-y-auto flex-1 min-h-0">{formBody}</div>
        {formActions}
      </div>
    );
  }

  // ── Page mode ────────────────────────────────────────────
  return (
    <div className="page max-w-[720px] mx-auto">
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost" onClick={handleClose}>
          <ArrowLeft size={14} /> Retour
        </button>
        <h1 className="text-[22px] font-semibold">Déclarer une panne</h1>
      </div>

      {/* Card : hauteur max 80vh, body scrollable */}
      <div className="tbl-card mt-5 flex flex-col max-h-[80vh]">
        <div className="tbl-head p-0 pb-3.5 border-b border-[var(--border-subtle)] shrink-0">
          <span className="tbl-title">Informations</span>
        </div>
        <div className="m-body overflow-y-auto flex-1 pt-3.5 min-h-0">
          {formBody}
        </div>
        <div className="px-0 pb-0 shrink-0">{formActions}</div>
      </div>
    </div>
  );
}
