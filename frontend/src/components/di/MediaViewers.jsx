import { useState, useRef } from "react";
import {
  FileText, Download, AlertTriangle, Play, Pause,
  Image, Music, Video, ChevronRight, FolderTree,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function formatDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

export function getFileUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// ─── AudioPlayer ──────────────────────────────────────────────────────────────
export function AudioPlayer({ file }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700"
      style={{ borderColor: playing ? "var(--color-primary, #a78bfa)" : undefined }}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        style={{ display: "none" }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onError={() => setError(true)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          disabled={error}
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white text-xs transition ${
            error ? "bg-red-500/20 cursor-not-allowed" :
            playing ? "bg-purple-500" : "bg-blue-600 hover:bg-blue-700"
          }`}>
          {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-200 truncate mb-1">{file.nomFichier}</p>
          <div onClick={handleSeek} className="h-1 rounded-full bg-gray-700 cursor-pointer relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full rounded-full bg-purple-400 transition-all"
              style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-500">
            {error ? <span className="text-red-400">Impossible de charger l'audio</span> : <>
              <span>{fmt(currentTime)}</span>
              <span>{fmt(duration)}</span>
            </>}
          </div>
        </div>
        <a href={url} download target="_blank" rel="noopener noreferrer"
          className="text-gray-500 hover:text-purple-400 transition shrink-0 p-1">
          <Download size={14} />
        </a>
      </div>
    </div>
  );
}

// ─── ImageViewer ──────────────────────────────────────────────────────────────
export function ImageViewer({ file }) {
  const url = getFileUrl(file.url);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
        {error ? (
          <div className="p-4 text-center">
            <AlertTriangle size={20} className="mx-auto mb-1 text-red-400" />
            <p className="text-[10px] text-gray-500">Image non disponible</p>
          </div>
        ) : (
          <div className="relative group cursor-pointer" onClick={() => setExpanded(true)}>
            <img src={url} alt={file.nomFichier} onError={() => setError(true)}
              className="w-full h-28 object-cover bg-gray-800" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition opacity-0 group-hover:opacity-100">
              <span className="bg-black/70 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1">
                <Image size={10} /> Agrandir
              </span>
            </div>
          </div>
        )}
        <div className="px-2 py-1.5 flex items-center justify-between border-t border-gray-700 bg-gray-800">
          <p className="text-[10px] text-gray-500 truncate flex-1">{file.nomFichier}</p>
          <a href={url} download target="_blank" rel="noopener noreferrer"
            className="text-gray-500 hover:text-purple-400 ml-2 shrink-0"
            onClick={(e) => e.stopPropagation()}>
            <Download size={12} />
          </a>
        </div>
      </div>

      {expanded && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}>
          <img src={url} alt={file.nomFichier} className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white/70 hover:text-white text-sm"
            onClick={() => setExpanded(false)}>✕ Fermer</button>
        </div>
      )}
    </>
  );
}

// ─── VideoViewer ──────────────────────────────────────────────────────────────
export function VideoViewer({ file }) {
  const url = getFileUrl(file.url);
  const [error, setError] = useState(false);

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800">
      {error ? (
        <div className="p-4 text-center">
          <AlertTriangle size={20} className="mx-auto mb-1 text-red-400" />
          <p className="text-[10px] text-gray-500">Vidéo non disponible</p>
        </div>
      ) : (
        <video src={url} controls className="w-full h-36 object-contain bg-gray-800"
          onError={() => setError(true)} />
      )}
      <div className="px-2 py-1.5 flex items-center justify-between border-t border-gray-700 bg-gray-800">
        <p className="text-[10px] text-gray-500 truncate flex-1">{file.nomFichier}</p>
        <a href={url} download target="_blank" rel="noopener noreferrer"
          className="text-gray-500 hover:text-purple-400 ml-2 shrink-0">
          <Download size={12} />
        </a>
      </div>
    </div>
  );
}

// ─── HierarchyPath ────────────────────────────────────────────────────────────
export function HierarchyPath({ actifDetail }) {
  if (!actifDetail) return null;
  const chemin = actifDetail.chemin_hierarchique || [];
  const hasParent = chemin.length > 0;
  const hasChildren = actifDetail.fils && actifDetail.fils.length > 0;

  return (
    <div className="mt-3 p-3 border border-gray-700 rounded-lg bg-gray-800/50">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <FolderTree size={12} /> Hiérarchie de l'actif
      </p>
      <div className="flex items-center flex-wrap gap-1 text-xs">
        {hasParent ? (
          <>
            {chemin.map((h, i) => (
              <span key={h.id} className="flex items-center">
                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-medium">
                  {h.code}
                </span>
                {i < chemin.length && <ChevronRight size={12} className="text-gray-600 mx-0.5" />}
              </span>
            ))}
            <span className="px-2 py-0.5 rounded bg-purple-500 text-white font-medium">
              {actifDetail.code}
            </span>
          </>
        ) : (
          <span className="px-2 py-0.5 rounded bg-purple-500 text-white font-medium">
            {actifDetail.code}
          </span>
        )}
        <span className="text-gray-500 ml-1">— {actifDetail.libelle}</span>
      </div>
      {hasChildren && (
        <div className="mt-2">
          <p className="text-[10px] text-gray-500 mb-1">Fils directs ({actifDetail.fils.length}):</p>
          <div className="flex flex-wrap gap-1.5">
            {actifDetail.fils.map(f => (
              <span key={f.id} className="px-2 py-0.5 rounded border border-gray-700 text-[11px] text-gray-300 bg-gray-800">
                {f.code}
                <span className={`ml-1 text-[9px] px-1 rounded ${
                  f.statut === 'en_panne' ? 'bg-red-500/20 text-red-400' :
                  f.statut === 'en_maintenance' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-green-500/20 text-green-400'
                }`}>{f.statut?.replace(/_/g, " ")}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
