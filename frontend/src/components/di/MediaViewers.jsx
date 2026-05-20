// di/MediaViewers.jsx
import { useState, useRef, useEffect } from "react";
import {
  FileText,
  Download,
  AlertTriangle,
  Play,
  Pause,
  Image,
  Music,
  Video,
  ChevronRight,
  FolderTree,
} from "lucide-react";
import { fetchAuthenticatedBlob, revokeBlobUrl } from "@/services/blobService";

const BASE_URL = import.meta.env.VITE_API_URL || "";

export function formatDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function getFileUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// ─── Hook central : fetch authentifié via blobService → Blob URL ──────────
/**
 * Hook pour charger des fichiers médias avec authentification JWT
 * Utilise le service blobService qui gère le token automatiquement
 *
 * @param {string} rawUrl - URL du fichier (ex: /media/demandes_intervention/.../file.mp3)
 * @returns {{blobUrl: string|null, loading: boolean, error: string|null}}
 */
function useAuthBlobUrl(rawUrl) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const blobUrlRef = useRef(null); // Ref pour cleanup sans créer de boucle infinie

  useEffect(() => {
    if (!rawUrl) {
      setBlobUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;

    const loadBlob = async () => {
      setLoading(true);
      setError(null);
      setBlobUrl(null);

      try {
        const { blobUrl: url } = await fetchAuthenticatedBlob(rawUrl);

        if (isMounted) {
          setBlobUrl(url);
          blobUrlRef.current = url; // Stocker dans ref pour cleanup
        } else {
          // Si composant démonté, libérer la mémoire immédiatement
          revokeBlobUrl(url);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Erreur lors du chargement du fichier");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadBlob();

    // Cleanup: libérer l'URL de blob si démontage du composant
    return () => {
      isMounted = false;
      if (blobUrlRef.current) {
        revokeBlobUrl(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [rawUrl]); // ✅ FIXE: uniquement rawUrl dans les dépendances

  return { blobUrl, loading, error };
}

// ─── AudioPlayer ────────────────────────────────────────────────────────────
/**
 * Lecteur audio avec barre de progression interactive
 * Charge le fichier de manière authentifiée via useAuthBlobUrl
 */
export function AudioPlayer({ file }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const { blobUrl, loading, error } = useAuthBlobUrl(getFileUrl(file.url));

  // Stocker blobUrl dans une ref pour éviter les re-rendus inutiles
  const blobUrlRef = useRef(blobUrl);
  useEffect(() => {
    blobUrlRef.current = blobUrl;
    // Réinitialiser la lecture si nouveau blob
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setPlaying(false);
    }
  }, [blobUrl]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el || error || loading) return;

    if (playing) {
      el.pause();
    } else {
      el.play().catch((err) => {
        console.error("[AudioPlayer] Erreur lors du play:", err);
        setPlaying(false);
      });
    }
  };

  const handleSeek = (e) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    el.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  // État du bouton play
  const isDisabled = error || loading;
  const buttonClass = isDisabled
    ? error
      ? "bg-danger-soft cursor-not-allowed"
      : "bg-primary/50 cursor-wait animate-pulse"
    : playing
      ? "bg-primary"
      : "bg-primary hover:bg-primary-dark";

  return (
    <div
      className="bg-surface rounded-lg p-3 border border-border"
      style={{
        borderColor:
          playing && !isDisabled ? "var(--color-primary, #a78bfa)" : undefined,
      }}>
      {blobUrl && (
        <audio
          ref={audioRef}
          src={blobUrl}
          preload="metadata"
          style={{ display: "none" }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setCurrentTime(0);
          }}
          onTimeUpdate={() => {
            const current = audioRef.current?.currentTime || 0;
            setCurrentTime(current);
          }}
          onLoadedMetadata={() => {
            const dur = audioRef.current?.duration || 0;
            setDuration(dur);
          }}
          onError={(e) => {
            console.error("[AudioPlayer] Erreur audio:", e.currentTarget.error);
            setPlaying(false);
          }}
        />
      )}

      <div className="flex items-center gap-3">
        {/* Bouton play / état */}
        <button
          onClick={toggle}
          disabled={isDisabled}
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white text-xs transition ${buttonClass}`}
          title={
            error
              ? error
              : loading
                ? "Chargement..."
                : playing
                  ? "Pause"
                  : "Lecture"
          }>
          {loading ? (
            <span className="text-[9px]">…</span>
          ) : playing ? (
            <Pause size={14} />
          ) : (
            <Play size={14} className="ml-0.5" />
          )}
        </button>

        {/* Barre de progression */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text truncate mb-1">
            {file.nomFichier}
          </p>
          <div
            onClick={handleSeek}
            className="h-1 rounded-full bg-hover cursor-pointer relative overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-text-muted">
            {error ? (
              <span className="text-danger flex items-center gap-1 col-span-2">
                <AlertTriangle size={10} />
                <span className="truncate">{error}</span>
              </span>
            ) : (
              <>
                <span>{fmt(currentTime)}</span>
                <span>{fmt(duration)}</span>
              </>
            )}
          </div>
        </div>

        {/* Téléchargement direct (URL réelle, pas blob) */}
        <a
          href={getFileUrl(file.url)}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-primary transition shrink-0 p-1"
          title="Télécharger">
          <Download size={14} />
        </a>
      </div>
    </div>
  );
}

// ─── ImageViewer ─────────────────────────────────────────────────────────────
/**
 * Visionneur d'images avec préview et modal
 * Charge l'image de manière authentifiée via useAuthBlobUrl
 */
export function ImageViewer({ file }) {
  const { blobUrl, loading, error } = useAuthBlobUrl(getFileUrl(file.url));
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden bg-surface">
        {error ? (
          <div className="p-4 text-center h-28 flex flex-col items-center justify-center gap-2">
            <AlertTriangle size={20} className="text-danger" />
            <p className="text-[10px] text-text-muted max-w-xs truncate">
              {error}
            </p>
          </div>
        ) : loading ? (
          <div className="h-28 flex items-center justify-center bg-elevated/30 animate-pulse">
            <Image size={20} className="text-text-muted/40" />
          </div>
        ) : (
          <div
            className="relative group cursor-pointer"
            onClick={() => setExpanded(true)}>
            <img
              src={blobUrl}
              alt={file.nomFichier}
              className="w-full h-28 object-cover bg-surface"
              onError={() =>
                console.error(`Erreur affichage image: ${file.nomFichier}`)
              }
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition opacity-0 group-hover:opacity-100">
              <span className="bg-black/70 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1">
                <Image size={10} /> Agrandir
              </span>
            </div>
          </div>
        )}

        <div className="px-2 py-1.5 flex items-center justify-between border-t border-border bg-surface">
          <p
            className="text-[10px] text-text-muted truncate flex-1"
            title={file.nomFichier}>
            {file.nomFichier}
          </p>
          <a
            href={getFileUrl(file.url)}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-primary ml-2 shrink-0 transition"
            onClick={(e) => e.stopPropagation()}
            title="Télécharger">
            <Download size={12} />
          </a>
        </div>
      </div>

      {/* Modal d'agrandissement */}
      {expanded && blobUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={blobUrl}
              alt={file.nomFichier}
              className="w-full h-auto max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute top-4 right-4 text-white/70 hover:text-white transition text-lg font-bold bg-black/50 hover:bg-black/70 w-8 h-8 rounded flex items-center justify-center"
              onClick={() => setExpanded(false)}
              title="Fermer">
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── VideoViewer ─────────────────────────────────────────────────────────────
/**
 * Lecteur vidéo natif avec contrôles HTML5
 * Charge la vidéo de manière authentifiée via useAuthBlobUrl
 */
export function VideoViewer({ file }) {
  const { blobUrl, loading, error } = useAuthBlobUrl(getFileUrl(file.url));

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      {error ? (
        <div className="p-4 text-center h-36 flex flex-col items-center justify-center gap-2">
          <AlertTriangle size={20} className="text-danger" />
          <p className="text-[10px] text-text-muted max-w-xs truncate">
            {error}
          </p>
        </div>
      ) : loading ? (
        <div className="h-36 flex items-center justify-center bg-elevated/30 animate-pulse">
          <Video size={24} className="text-text-muted/40" />
        </div>
      ) : (
        <video
          src={blobUrl}
          controls
          controlsList="nodownload"
          className="w-full h-36 object-contain bg-surface"
          onError={() =>
            console.error(`Erreur affichage vidéo: ${file.nomFichier}`)
          }
        />
      )}

      <div className="px-2 py-1.5 flex items-center justify-between border-t border-border bg-surface">
        <p
          className="text-[10px] text-text-muted truncate flex-1"
          title={file.nomFichier}>
          {file.nomFichier}
        </p>
        <a
          href={getFileUrl(file.url)}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-primary ml-2 shrink-0 transition"
          title="Télécharger">
          <Download size={12} />
        </a>
      </div>
    </div>
  );
}

// ─── HierarchyPath (inchangé) ────────────────────────────────────────────────
export function HierarchyPath({ actifDetail }) {
  if (!actifDetail) return null;
  const chemin = actifDetail.chemin_hierarchique || [];
  const hasParent = chemin.length > 0;
  const hasChildren = actifDetail.fils && actifDetail.fils.length > 0;
  const [showNames, setShowNames] = useState({});
  const toggleName = (id) =>
    setShowNames((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="mt-3 p-3 border border-border rounded-lg bg-elevated/50">
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <FolderTree size={12} /> Hiérarchie de l'actif
      </p>
      <div className="flex items-center flex-wrap gap-1 text-xs">
        {hasParent ? (
          <>
            {chemin.map((h, i) => (
              <span key={h.id} className="flex items-center">
                <span
                  className="px-2 py-0.5 rounded bg-primary-soft text-primary font-medium cursor-pointer hover:bg-primary/20 transition"
                  onClick={() => toggleName(h.id)}
                  title={h.libelle}>
                  {showNames[h.id] ? h.libelle : h.code}
                </span>
                {i < chemin.length && (
                  <ChevronRight size={12} className="text-text-muted mx-0.5" />
                )}
              </span>
            ))}
            <span className="px-2 py-0.5 rounded bg-primary text-white font-medium">
              {actifDetail.libelle}
            </span>
          </>
        ) : (
          <span className="px-2 py-0.5 rounded bg-primary text-white font-medium">
            {actifDetail.libelle}
          </span>
        )}
        <span className="text-text-muted ml-1 text-[10px]">
          ({actifDetail.code})
        </span>
      </div>
      {hasChildren && (
        <div className="mt-2">
          <p className="text-[10px] text-text-muted mb-1">
            Fils directs ({actifDetail.fils.length}) :
          </p>
          <div className="flex flex-wrap gap-1.5">
            {actifDetail.fils.map((f) => (
              <span
                key={f.id}
                className="px-2 py-0.5 rounded border border-border text-[11px] text-text-secondary bg-surface">
                {f.libelle}
                <span
                  className={`ml-1 text-[9px] px-1 rounded ${
                    f.statut === "en_panne"
                      ? "bg-danger-soft text-danger"
                      : f.statut === "en_maintenance"
                        ? "bg-warning/20 text-warning"
                        : "bg-success/20 text-success"
                  }`}>
                  {f.statut?.replace(/_/g, " ")}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
