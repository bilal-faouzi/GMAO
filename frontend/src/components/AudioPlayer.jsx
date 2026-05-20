/**
 * AudioPlayer — Composant audio redessiné
 * Coloré, adaptatif dark/light, clairement identifié comme lecteur audio
 */

import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Music2 } from "lucide-react";

function formatTime(seconds) {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * @param {{ file: { id: string|number, url: string, nomFichier: string } }} props
 */
export default function AudioPlayer({ file }) {
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Nettoyage de l'URL
  const src = file?.url?.startsWith("http")
    ? file.url
    : `${import.meta.env?.VITE_API_URL || ""}${file.url}`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setDuration(audio.duration);
      setLoading(false);
    };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !muted;
    setMuted(!muted);
  };

  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    audio.currentTime = ratio * duration;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Génère 32 barres de visualisation statique (décoratives)
  const bars = Array.from({ length: 32 }, (_, i) => {
    const heights = [
      30, 55, 40, 70, 45, 85, 35, 60, 75, 50, 65, 80, 40, 55, 90, 45, 70, 35,
      60, 80, 50, 65, 40, 75, 55, 85, 30, 60, 70, 45, 55, 40,
    ];
    return heights[i % heights.length];
  });

  const fileName = file?.nomFichier || "Enregistrement audio";
  const barFilled = Math.floor((progress / 100) * bars.length);

  return (
    <div className="audio-player-card">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Badge type */}
      <div className="audio-type-badge">
        <Music2 size={11} />
        <span>Audio</span>
      </div>

      {/* Waveform + contrôles */}
      <div className="audio-body">
        {/* Bouton play */}
        <button
          onClick={togglePlay}
          disabled={loading}
          className="audio-play-btn"
          aria-label={playing ? "Pause" : "Lecture"}>
          {playing ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
        </button>

        {/* Centre : waveform + nom + temps */}
        <div className="audio-center">
          <p className="audio-filename">{fileName}</p>

          {/* Waveform visuelle cliquable */}
          <div
            ref={progressRef}
            className="audio-waveform"
            onClick={handleProgressClick}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}>
            {bars.map((h, i) => (
              <span
                key={i}
                className="audio-bar"
                data-filled={i < barFilled ? "true" : "false"}
                style={{ "--bar-h": `${h}%` }}
              />
            ))}
          </div>

          {/* Timer */}
          <div className="audio-timer">
            <span>{formatTime(currentTime)}</span>
            <span>{loading ? "--:--" : formatTime(duration)}</span>
          </div>
        </div>

        {/* Mute */}
        <button
          onClick={toggleMute}
          className="audio-mute-btn"
          aria-label={muted ? "Activer le son" : "Couper le son"}>
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>

      <style>{`
        .audio-player-card {
          position: relative;
          border-radius: 14px;
          padding: 14px 16px 12px;
          border: 1px solid color-mix(in srgb, var(--color-primary, #6366f1) 25%, transparent);
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--color-primary, #6366f1) 8%, var(--color-surface, #fff)) 0%,
            color-mix(in srgb, var(--color-accent, #8b5cf6) 5%, var(--color-surface, #fff)) 100%
          );
          overflow: hidden;
          transition: box-shadow 0.2s ease;
        }

        .audio-player-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at 10% 50%,
            color-mix(in srgb, var(--color-primary, #6366f1) 12%, transparent) 0%,
            transparent 65%
          );
          pointer-events: none;
        }

        .audio-player-card:hover {
          box-shadow: 0 4px 20px color-mix(in srgb, var(--color-primary, #6366f1) 18%, transparent);
        }

        /* Badge */
        .audio-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-primary, #6366f1);
          background: color-mix(in srgb, var(--color-primary, #6366f1) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--color-primary, #6366f1) 22%, transparent);
          border-radius: 20px;
          padding: 2px 8px;
          margin-bottom: 10px;
          width: fit-content;
        }

        /* Corps principal */
        .audio-body {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        /* Bouton play */
        .audio-play-btn {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            var(--color-primary, #6366f1),
            var(--color-accent, #8b5cf6)
          );
          color: #fff;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s;
          box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary, #6366f1) 40%, transparent);
        }

        .audio-play-btn:hover:not(:disabled) {
          transform: scale(1.08);
          box-shadow: 0 6px 18px color-mix(in srgb, var(--color-primary, #6366f1) 55%, transparent);
        }

        .audio-play-btn:active:not(:disabled) {
          transform: scale(0.96);
        }

        .audio-play-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Centre */
        .audio-center {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .audio-filename {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text, #111);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0;
          opacity: 0.85;
        }

        /* Waveform */
        .audio-waveform {
          display: flex;
          align-items: center;
          gap: 2px;
          height: 28px;
          cursor: pointer;
          user-select: none;
        }

        .audio-bar {
          display: inline-block;
          flex-shrink: 0;
          width: 3px;
          border-radius: 2px;
          height: var(--bar-h, 40%);
          transition: background 0.1s ease, transform 0.1s ease;
        }

        .audio-bar[data-filled="true"] {
          background: linear-gradient(
            to top,
            var(--color-primary, #6366f1),
            var(--color-accent, #8b5cf6)
          );
        }

        .audio-bar[data-filled="false"] {
          background: color-mix(in srgb, var(--color-text-secondary, #888) 28%, transparent);
        }

        .audio-waveform:hover .audio-bar[data-filled="false"] {
          background: color-mix(in srgb, var(--color-primary, #6366f1) 28%, transparent);
        }

        /* Timer */
        .audio-timer {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-variant-numeric: tabular-nums;
          color: var(--color-text-muted, #aaa);
          font-weight: 500;
        }

        /* Mute */
        .audio-mute-btn {
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid color-mix(in srgb, var(--color-border, #ddd) 60%, transparent);
          background: color-mix(in srgb, var(--color-elevated, #f5f5f5) 60%, transparent);
          color: var(--color-text-secondary, #666);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .audio-mute-btn:hover {
          background: color-mix(in srgb, var(--color-primary, #6366f1) 12%, transparent);
          color: var(--color-primary, #6366f1);
          border-color: color-mix(in srgb, var(--color-primary, #6366f1) 30%, transparent);
        }
      `}</style>
    </div>
  );
}
