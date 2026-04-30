/**
 * DIDetailDialog — Composant partagé
 * @param {{ di: object|null, open: boolean, onOpenChange: (v:boolean)=>void }} props
 */

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FileText, Download, AlertTriangle, Play, Pause } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function formatDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function getFileUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// ─── AudioPlayer ──────────────────────────────────────────────────────────────

function AudioPlayer({ file }) {
  const audioRef = useRef(null);
  const [playing, setPlaying]         = useState(false);
  const [error, setError]             = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const url = getFileUrl(file.url);

  const toggle = () => {
    const el = audioRef.current;
    if (!el || error) return;
    playing ? el.pause() : el.play().catch(() => setError(true));
  };

  const handleSeek = (e) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: `1px solid ${playing ? "var(--color-primary)" : "var(--border-subtle)"}`,
      borderRadius: 10, padding: "10px 12px",
      display: "flex", flexDirection: "column", gap: 8, transition: "border-color 0.2s",
    }}>
      <audio
        ref={audioRef} src={url} preload="metadata" style={{ display: "none" }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onError={() => setError(true)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={toggle} disabled={error} style={{
          width: 36, height: 36, borderRadius: "50%", border: "none",
          cursor: error ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          background: error ? "var(--status-red-bg)" : playing ? "var(--color-primary)" : "var(--primary-soft)",
          color: playing ? "#fff" : "var(--color-primary)",
        }}>
          {playing ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 2 }} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.nomFichier}
          </p>
          <div onClick={handleSeek} style={{
            height: 4, borderRadius: 4, background: "var(--border-subtle)",
            cursor: "pointer", position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", left: 0, top: 0, height: "100%",
              width: `${progress}%`,
              background: error ? "var(--status-red-dot)" : "var(--color-primary)",
              borderRadius: 4, transition: "width 0.1s linear",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--text-muted)" }}>
            {error
              ? <span style={{ color: "var(--status-red-text)" }}>Impossible de charger l'audio</span>
              : <><span>{fmt(currentTime)}</span><span>{fmt(duration)}</span></>
            }
          </div>
        </div>
        <a href={url} download target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--text-muted)", flexShrink: 0, display: "flex", alignItems: "center" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--color-primary)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>
          <Download size={13} />
        </a>
      </div>
    </div>
  );
}

// ─── ImageViewer ──────────────────────────────────────────────────────────────

function ImageViewer({ file }) {
  const url = getFileUrl(file.url);
  const [error, setError] = useState(false);

  return (
    <div className="border border-border-subtle rounded-sm overflow-hidden">
      {error ? (
        <div className="p-4 text-center bg-[var(--bg-elevated)]">
          <AlertTriangle size={20} className="mx-auto mb-1 text-[var(--status-red-text)]" />
          <p className="text-[10px] text-text-muted">Image non disponible</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline mt-1 block">Ouvrir le lien</a>
        </div>
      ) : (
        <div className="relative group">
          <img src={url} alt={file.nomFichier} onError={() => setError(true)}
            className="w-full max-h-56 object-contain bg-[var(--bg-elevated)]" />
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition opacity-0 group-hover:opacity-100">
            <span className="bg-black/70 text-white text-[10px] px-2 py-1 rounded">Ouvrir en plein écran</span>
          </a>
        </div>
      )}
      <div className="px-2 py-1.5 flex items-center justify-between border-t border-border-subtle bg-[var(--bg-elevated)]">
        <p className="text-[10px] text-text-muted truncate flex-1">{file.nomFichier}</p>
        <a href={url} download target="_blank" rel="noopener noreferrer"
          className="text-text-muted hover:text-primary ml-2 shrink-0" title="Télécharger">
          <Download size={12} />
        </a>
      </div>
    </div>
  );
}

// ─── DIDetailDialog ───────────────────────────────────────────────────────────

export default function DIDetailDialog({ di, open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {di && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText size={16} />
                {di.numero}
              </DialogTitle>
              <DialogDescription>
                {di.description || "Aucune description"}
              </DialogDescription>
            </DialogHeader>

            {/* Infos */}
            <div className="grid grid-cols-2 gap-3 text-xs mt-3">
              <div><span className="text-text-muted">Urgence :</span> <span className="font-medium capitalize">{di.urgence}</span></div>
              <div><span className="text-text-muted">Statut :</span> <span className="font-medium">{di.statut?.replace(/_/g, " ")}</span></div>
              <div><span className="text-text-muted">Date :</span> {formatDate(di.dateSignalement)}</div>
              <div><span className="text-text-muted">Actif :</span> {di.actif_detail?.libelle || "—"}</div>
            </div>

            {/* Pièces jointes */}
            {di.pieces_jointes?.length > 0 ? (
              <div className="mt-4">
                <div className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                  <FileText size={13} />
                  Pièces jointes ({di.pieces_jointes.length})
                </div>

                {/* Audio */}
                {di.pieces_jointes.some(f => f.typeFichier?.startsWith("audio")) && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="w-1 h-3 rounded-sm bg-primary" /> Enregistrements audio
                    </p>
                    <div className="flex flex-col gap-2">
                      {di.pieces_jointes.filter(f => f.typeFichier?.startsWith("audio")).map(f => (
                        <AudioPlayer key={f.id} file={f} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Images */}
                {di.pieces_jointes.some(f => f.typeFichier?.startsWith("image")) && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="w-1 h-3 rounded-sm bg-primary" /> Images
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {di.pieces_jointes.filter(f => f.typeFichier?.startsWith("image")).map(f => (
                        <ImageViewer key={f.id} file={f} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Autres fichiers */}
                {di.pieces_jointes.filter(f =>
                  !f.typeFichier?.startsWith("audio") && !f.typeFichier?.startsWith("image")
                ).length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="w-1 h-3 rounded-sm bg-primary" /> Autres fichiers
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {di.pieces_jointes
                        .filter(f => !f.typeFichier?.startsWith("audio") && !f.typeFichier?.startsWith("image"))
                        .map(f => (
                          <div key={f.id} className="flex items-center gap-3 p-2.5 border border-border-subtle rounded-sm bg-[var(--bg-elevated)]">
                            <FileText size={14} className="shrink-0 text-text-muted" />
                            <span className="text-xs text-text-primary flex-1 truncate">{f.nomFichier}</span>
                            <a href={getFileUrl(f.url)} download target="_blank" rel="noopener noreferrer"
                              className="text-primary text-xs flex items-center gap-1 shrink-0 hover:underline">
                              <Download size={12} /> Télécharger
                            </a>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 p-4 text-center text-text-muted text-xs border border-border-subtle rounded-sm">
                Aucune pièce jointe pour cette demande
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
