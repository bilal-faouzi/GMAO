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
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {URGENCES.map((urgence) => (
        <button
          key={urgence.value}
          type="button"
          onClick={() => onChange(urgence.value)}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: 12,
            borderRadius: "var(--r-sm)",
            border:
              value === urgence.value
                ? "2px solid " + urgence.color
                : "1px solid var(--border-default)",
            background:
              value === urgence.value
                ? urgence.color + "15"
                : "var(--bg-elevated)",
            cursor: "pointer",
            transition: "all 0.15s",
          }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: urgence.color,
              marginTop: 4,
              flexShrink: 0,
            }}
          />
          <div style={{ textAlign: "left", flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}>
              {urgence.label}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 2,
              }}>
              {urgence.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function FormulaireDemande({ defaultActifId, onClose }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    idActif: defaultActifId ?? "",
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

  // Recording timer
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Cleanup on unmount
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

      handleClose();
    } catch (e) {
      setErreur(e.response?.data || "Erreur lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  };

  // ── Shared form body ─────────────────────────────────────
  const formBody = (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

      {/* Description */}
      <div className="fg">
        <Label className="flabel">Description</Label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows="3"
          className="finput"
          style={{ resize: "none" }}
          placeholder="Décrivez le problème rencontré..."
        />
      </div>

      {/* Upload images */}
      <div
        style={{
          background: "var(--status-purple-bg, rgba(139,92,246,.08))",
          border: "1px solid rgba(139,92,246,.25)",
          borderRadius: "var(--r-sm)",
          padding: 14,
        }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}>
          <Image size={15} style={{ color: "var(--status-purple-text)" }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: ".05em",
              color: "var(--status-purple-text)",
            }}>
            Photos (optionnel)
          </span>
        </div>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "14px 12px",
            border: "2px dashed rgba(139,92,246,.35)",
            borderRadius: "var(--r-sm)",
            cursor: "pointer",
            transition: "border-color .15s",
          }}>
          <Upload
            size={20}
            style={{ color: "var(--status-purple-text)", marginBottom: 6 }}
          />
          <span
            style={{
              fontSize: 12,
              color: "var(--status-purple-text)",
              textAlign: "center",
            }}>
            Cliquez pour ajouter des images
            <br />
            <span style={{ opacity: 0.6 }}>JPG, PNG — max 5 MB</span>
          </span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: "none" }}
          />
        </label>

        {previewImages.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--status-purple-text)",
                textTransform: "uppercase",
              }}>
              📸 Images ({previewImages.length})
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                marginTop: 8,
              }}>
              {previewImages.map((src, i) => (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    borderRadius: "var(--r-sm)",
                    overflow: "hidden",
                    border: "1px solid rgba(139,92,246,.3)",
                  }}>
                  <img
                    src={src}
                    alt=""
                    style={{ width: "100%", height: 80, objectFit: "cover" }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      background: "var(--status-red-bg)",
                      border: "none",
                      borderRadius: "50%",
                      padding: 4,
                      cursor: "pointer",
                      color: "var(--status-red-text)",
                      display: "flex",
                    }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Audio recording */}
      <div
        style={{
          background: "var(--status-blue-bg, rgba(59,130,246,.08))",
          border: "1px solid rgba(59,130,246,.25)",
          borderRadius: "var(--r-sm)",
          padding: 14,
        }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}>
          <Mic size={15} style={{ color: "var(--status-blue-text)" }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: ".05em",
              color: "var(--status-blue-text)",
            }}>
            Enregistrement audio (optionnel)
          </span>
        </div>

        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "rgba(59,130,246,.15)",
              border: "1px solid rgba(59,130,246,.4)",
              borderRadius: "var(--r-sm)",
              color: "var(--status-blue-text)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background .15s",
            }}>
            <Mic size={16} /> Démarrer l'enregistrement
          </button>
        ) : (
          <div
            style={{
              background: "var(--status-red-bg)",
              border: "1px solid rgba(239,68,68,.25)",
              borderRadius: "var(--r-sm)",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "var(--status-red-dot)",
                  animation: "pulse 1s infinite",
                  flexShrink: 0,
                }}
              />
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--status-red-text)",
                  }}>
                  Enregistrement en cours…
                </p>
                <p
                  style={{
                    fontSize: 12,
                    fontFamily: "monospace",
                    color: "var(--status-red-text)",
                    opacity: 0.8,
                  }}>
                  {formatTime(recordingTime)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              style={{
                padding: "6px 12px",
                background: "var(--status-red-dot)",
                border: "none",
                borderRadius: "var(--r-sm)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}>
              Arrêter
            </button>
          </div>
        )}

        {recordedAudios.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--status-blue-text)",
                textTransform: "uppercase",
              }}>
              📦 Audios ({recordedAudios.length})
            </span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginTop: 8,
              }}>
              {recordedAudios.map((rec, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(59,130,246,.1)",
                    border: "1px solid rgba(59,130,246,.3)",
                    borderRadius: "var(--r-sm)",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}>
                  <button
                    type="button"
                    onClick={() => playRecordedAudio(i)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "rgba(59,130,246,.3)",
                      border: "none",
                      color: "var(--status-blue-text)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 13,
                    }}>
                    ▶
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--status-blue-text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                      {rec.name}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "var(--color-text-muted)",
                      }}>
                      ⏱ {formatTime(rec.duration)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRecordedAudio(i)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-text-muted)",
                      cursor: "pointer",
                      display: "flex",
                      padding: 4,
                    }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button type="button" onClick={handleClose} className="btn btn-outline">
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ opacity: loading ? 0.6 : 1 }}>
          {loading ? "Envoi…" : "Déclarer la panne"}
        </Button>
      </div>
    </form>
  );

  // ── Dialog mode ──────────────────────────────────────────
  if (onClose) {
    return <div>{formBody}</div>;
  }

  // ── Page mode ────────────────────────────────────────────
  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-ghost" onClick={handleClose}>
          <ArrowLeft size={14} /> Retour
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Déclarer une panne</h1>
      </div>

      <div className="tbl-card" style={{ marginTop: 20 }}>
        <div
          className="tbl-head"
          style={{
            padding: 0,
            paddingBottom: 14,
            borderBottom: "1px solid var(--border-subtle)",
          }}>
          <span className="tbl-title">Informations</span>
        </div>
        <div className="m-body" style={{ padding: "14px 0 0" }}>
          {formBody}
        </div>
      </div>
    </div>
  );
}
