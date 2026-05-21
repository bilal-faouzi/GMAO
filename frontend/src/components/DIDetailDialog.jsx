/**
 * DIDetailDialog — Compact redesign
 */

import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  FileText,
  Image,
  Video,
  Download,
  Wrench,
  Mic,
  AlertTriangle,
  Ban,
  Paperclip,
  ChevronRight,
  Play,
  FileIcon,
} from "lucide-react";
import {
  formatDate,
  getFileUrl,
  ImageViewer,
  VideoViewer,
  HierarchyPath,
} from "./di/MediaViewers";
import AudioPlayer from "./AudioPlayer";

/* ─── helpers ─────────────────────────────────────── */

const URGENCE_STYLES = {
  critique: "bg-red-500/20 text-red-600 border border-red-500",
  haute: "bg-orange-500/20 text-orange-600 border border-orange-500",
  normale: "bg-blue-500/20 text-blue-600 border border-blue-500",
  basse: "bg-muted text-text-secondary border border-border-subtle",
};

const STATUT_STYLES = {
  en_attente: "bg-amber-500/20 text-amber-700",
  validee: "bg-green-500/20 text-green-700",
  rejetee: "bg-red-500/20 text-red-600",
  en_cours: "bg-blue-500/20 text-blue-700",
};

function Label({ children }) {
  return (
    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">
      {children}
    </p>
  );
}

function Cell({ label, children, className = "" }) {
  return (
    <div
      className={`bg-elevated/30 rounded-lg p-3 border border-border-subtle ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/* ─── composant principal ─────────────────────────── */

export default function DIDetailDialog({ di, open, onOpenChange }) {
  if (!di) return null;

  const audioPieces =
    di.pieces_jointes?.filter(
      (f) =>
        f.typeFichier?.startsWith("audio") || f.nomFichier?.endsWith(".webm"),
    ) ?? [];
  const imagePieces =
    di.pieces_jointes?.filter((f) => f.typeFichier?.startsWith("image")) ?? [];
  const videoPieces =
    di.pieces_jointes?.filter(
      (f) =>
        f.typeFichier?.startsWith("video") && !f.nomFichier?.endsWith(".webm"),
    ) ?? [];
  const otherPieces =
    di.pieces_jointes?.filter(
      (f) =>
        !f.typeFichier?.startsWith("audio") &&
        !f.typeFichier?.startsWith("image") &&
        !f.typeFichier?.startsWith("video"),
    ) ?? [];

  const totalPieces = di.pieces_jointes?.length ?? 0;
  const urgenceClass = URGENCE_STYLES[di.urgence] ?? URGENCE_STYLES.basse;
  const statutClass =
    STATUT_STYLES[di.statut] ?? "bg-muted text-text-secondary";

  /* rejet unifié (rejet_info OU motifRejet) */
  const rejet = di.rejet_info
    ? {
        count: di.rejet_info.count,
        motif: di.rejet_info.motif,
        date: di.rejet_info.date,
      }
    : di.motifRejet
      ? { count: null, motif: di.motifRejet, date: null }
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto scrollbar-none p-0 gap-0">
        {/* ── Header sticky ─────────────────────────── */}
        <div className="sticky top-0 bg-surface border-b border-border z-10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <FileText size={14} className="text-text-secondary shrink-0" />
                <span className="text-base font-bold text-text">
                  {di.numero}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statutClass}`}>
                  {di.statut?.replace(/_/g, " ")}
                </span>
              </div>
              {di.titre && (
                <p className="text-sm font-medium text-text truncate">
                  {di.titre}
                </p>
              )}
              <p className="text-xs text-text-secondary truncate mt-0.5">
                {di.actif_detail?.libelle || "—"}
              </p>
            </div>

            {di.urgence && (
              <span
                className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${urgenceClass}`}>
                <AlertTriangle size={10} />
                {di.urgence.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* ── Corps ─────────────────────────────────── */}
        <div className="px-5 py-4 space-y-4">
          {/* Métadonnées : date + audit en grille 3 colonnes */}
          <div className="grid grid-cols-3 gap-2">
            <Cell label="Signalé le">
              <p className="text-xs font-mono text-text">
                {new Date(di.dateSignalement).toLocaleDateString("fr-FR")}
              </p>
              <p className="text-[10px] text-text-muted font-mono">
                {new Date(di.dateSignalement).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </Cell>

            {di.signalement_detail ? (
              <Cell label="Créé par">
                <p className="text-xs font-medium text-text truncate">
                  {di.signalement_detail.prenom} {di.signalement_detail.nom}
                </p>
                <p className="text-[10px] text-text-muted font-mono">
                  {new Date(di.signalement_detail.date).toLocaleString(
                    "fr-FR",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </p>
              </Cell>
            ) : (
              <Cell label="Créé par">
                <p className="text-xs text-text-muted italic">—</p>
              </Cell>
            )}

            {di.validation_detail ? (
              <Cell label="OT créé par">
                <p className="text-xs font-medium text-text truncate">
                  {di.validation_detail.prenom} {di.validation_detail.nom}
                </p>
                <p className="text-[10px] text-text-muted font-mono">
                  {new Date(di.validation_detail.date).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </Cell>
            ) : (
              <Cell label="OT créé par">
                <p className="text-xs text-text-muted italic">—</p>
              </Cell>
            )}
          </div>

          {/* Équipement + hiérarchie fusionnés */}
          <div className="flex items-center gap-3 bg-elevated/30 rounded-lg px-3 py-2.5 border border-border-subtle">
            <Wrench size={14} className="text-text-muted shrink-0" />
            <div className="min-w-0 flex-1">
              {/* Breadcrumb hiérarchie */}
              {di.actif_detail && (
                <HierarchyPath
                  actifDetail={di.actif_detail}
                  className="flex items-center gap-1 flex-wrap text-[10px] text-text-muted mb-1"
                  separatorClassName="opacity-40"
                  separator={<ChevronRight size={9} />}
                />
              )}
              <div className="flex items-center gap-2 mt-2">
                {di.actif_detail?.code && (
                  <span className="text-[10px] font-mono bg-surface border border-border-subtle rounded px-1.5 py-0.5 text-text-secondary whitespace-nowrap">
                    {di.actif_detail.code}
                  </span>
                )}
                <span className="text-xs font-medium text-text truncate">
                  {di.actif_detail?.libelle || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {di.description && (
            <div className="border-l-2 border-primary rounded-r-lg bg-primary-soft px-3 py-2.5">
              <Label>Description du problème</Label>
              <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">
                {di.description}
              </p>
            </div>
          )}

          {/* Rejet (unifié) */}
          {rejet && (
            <div className="border-l-2 border-danger rounded-r-lg bg-danger-soft px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Ban size={11} className="text-danger" />
                <span className="text-[10px] font-semibold text-danger uppercase tracking-wide">
                  Rejet{rejet.count ? ` (${rejet.count}×)` : ""}
                  {rejet.date ? ` · ${formatDate(rejet.date)}` : ""}
                </span>
              </div>
              {rejet.motif && (
                <p className="text-xs text-text">{rejet.motif}</p>
              )}
            </div>
          )}

          {/* Pièces jointes — section unique */}
          {totalPieces > 0 ? (
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2.5 flex items-center gap-1.5">
                <Paperclip size={11} />
                Pièces jointes ({totalPieces})
              </p>

              {/* Images */}
              {imagePieces.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-text-muted mb-1.5 flex items-center gap-1">
                    <Image size={10} /> Photos ({imagePieces.length})
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {imagePieces.map((f) => (
                      <ImageViewer key={f.id} file={f} />
                    ))}
                  </div>
                </div>
              )}

              {/* Vidéos */}
              {videoPieces.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-text-muted mb-1.5 flex items-center gap-1">
                    <Video size={10} /> Vidéos ({videoPieces.length})
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {videoPieces.map((f) => (
                      <VideoViewer key={f.id} file={f} />
                    ))}
                  </div>
                </div>
              )}

              {/* Audio */}
              {audioPieces.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-text-muted mb-1.5 flex items-center gap-1">
                    <Mic size={10} /> Audio ({audioPieces.length})
                  </p>
                  <div className="space-y-1.5">
                    {audioPieces.map((f) => (
                      <AudioPlayer key={f.id} file={f} />
                    ))}
                  </div>
                </div>
              )}

              {/* Autres */}
              {otherPieces.length > 0 && (
                <div>
                  <p className="text-[10px] text-text-muted mb-1.5 flex items-center gap-1">
                    <FileIcon size={10} /> Autres ({otherPieces.length})
                  </p>
                  <div className="space-y-1">
                    {otherPieces.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-2.5 px-2.5 py-2 border border-border-subtle rounded-lg bg-elevated/30">
                        <FileText
                          size={13}
                          className="shrink-0 text-text-muted"
                        />
                        <span className="text-xs text-text flex-1 truncate">
                          {f.nomFichier}
                        </span>
                        <a
                          href={getFileUrl(f.url)}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary flex items-center gap-1 shrink-0 hover:underline">
                          <Download size={11} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-text-muted text-xs py-3 border border-border-subtle rounded-lg bg-elevated/30">
              Aucune pièce jointe
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
