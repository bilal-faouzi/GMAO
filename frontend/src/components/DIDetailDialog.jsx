/**
 * DIDetailDialog — Composant partagé
 * @param {{ di: object|null, open: boolean, onOpenChange: (v:boolean)=>void }} props
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FileText, Music, Image, Video } from "lucide-react";
import {
  formatDate, getFileUrl,
  AudioPlayer, ImageViewer, VideoViewer, HierarchyPath,
} from "./di/MediaViewers";

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
                {di.numero} — {di.titre || "Sans titre"}
              </DialogTitle>
              <DialogDescription>
                Déclaré par{" "}
                {di.signalement_detail
                  ? `${di.signalement_detail.nom} ${di.signalement_detail.prenom}`
                  : "Anonyme"}{" "}
                le {formatDate(di.dateSignalement)}
              </DialogDescription>
            </DialogHeader>

            {/* Infos */}
            <div className="grid grid-cols-2 gap-3 text-xs mt-3">
              <div>
                <span className="text-text-muted">Urgence :</span>{" "}
                <span className="font-medium capitalize">{di.urgence}</span>
              </div>
              <div>
                <span className="text-text-muted">Statut :</span>{" "}
                <span className="font-medium">
                  {di.statut?.replace(/_/g, " ")}
                </span>
              </div>
              <div>
                <span className="text-text-muted">Date :</span>{" "}
                {formatDate(di.dateSignalement)}
              </div>
              <div>
                <span className="text-text-muted">Actif :</span>{" "}
                {di.actif_detail?.libelle || "—"}
              </div>
            </div>
            
            {/* Hiérarchie */}
            <HierarchyPath actifDetail={di.actif_detail} />
            
            {di.motifRejet && (
              <div className="bg-surface shadow shadow-indigo-600/50 rounded-md m-2 p-2 gap-1">
                {di.motifRejet}
              </div>
            )}

            {/* Pièces jointes */}
            {di.pieces_jointes?.length > 0 ? (
              <div className="mt-4">
                <div className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                  <FileText size={13} />
                  Pièces jointes ({di.pieces_jointes.length})
                </div>

                {/* Audio */}
                {di.pieces_jointes.some((f) =>
                  f.typeFichier?.startsWith("audio"),
                ) && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Music size={12} />{" "}
                      Enregistrements audio
                    </p>
                    <div className="flex flex-col gap-2">
                      {di.pieces_jointes
                        .filter((f) => f.typeFichier?.startsWith("audio"))
                        .map((f) => (
                          <AudioPlayer key={f.id} file={f} />
                        ))}
                    </div>
                  </div>
                )}

                {/* Images */}
                {di.pieces_jointes.some((f) =>
                  f.typeFichier?.startsWith("image"),
                ) && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Image size={12} /> Images
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {di.pieces_jointes
                        .filter((f) => f.typeFichier?.startsWith("image"))
                        .map((f) => (
                          <ImageViewer key={f.id} file={f} />
                        ))}
                    </div>
                  </div>
                )}

                {/* Vidéos */}
                {di.pieces_jointes.some((f) =>
                  f.typeFichier?.startsWith("video"),
                ) && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Video size={12} /> Vidéos
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {di.pieces_jointes
                        .filter((f) => f.typeFichier?.startsWith("video"))
                        .map((f) => (
                          <VideoViewer key={f.id} file={f} />
                        ))}
                    </div>
                  </div>
                )}

                {/* Autres fichiers */}
                {di.pieces_jointes.filter(
                  (f) =>
                    !f.typeFichier?.startsWith("audio") &&
                    !f.typeFichier?.startsWith("image") &&
                    !f.typeFichier?.startsWith("video"),
                ).length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText size={12} /> Autres fichiers
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {di.pieces_jointes
                        .filter(
                          (f) =>
                            !f.typeFichier?.startsWith("audio") &&
                            !f.typeFichier?.startsWith("image") &&
                            !f.typeFichier?.startsWith("video"),
                        )
                        .map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center gap-3 p-2.5 border border-border-subtle rounded-sm bg-[var(--bg-elevated)]">
                            <FileText
                              size={14}
                              className="shrink-0 text-text-muted"
                            />
                            <span className="text-xs text-text-primary flex-1 truncate">
                              {f.nomFichier}
                            </span>
                            <a
                              href={getFileUrl(f.url)}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
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
