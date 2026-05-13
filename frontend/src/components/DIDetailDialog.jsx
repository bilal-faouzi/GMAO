/**
 * DIDetailDialog — Composant partagé (riche, style GestionOTs)
 * @param {{ di: object|null, open: boolean, onOpenChange: (v:boolean)=>void }} props
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText, Music, Image, Video, Download, X,
} from "lucide-react";
import {
  formatDate, getFileUrl,
  AudioPlayer, ImageViewer, VideoViewer, HierarchyPath,
} from "./di/MediaViewers";

export default function DIDetailDialog({ di, open, onOpenChange }) {
  if (!di) return null;

  const audioPieces =
    di.pieces_jointes?.filter((f) => f.typeFichier?.startsWith("audio")) || [];
  const imagePieces =
    di.pieces_jointes?.filter((f) => f.typeFichier?.startsWith("image")) || [];
  const videoPieces =
    di.pieces_jointes?.filter((f) => f.typeFichier?.startsWith("video")) || [];
  const otherPieces =
    di.pieces_jointes?.filter(
      (f) =>
        !f.typeFichier?.startsWith("audio") &&
        !f.typeFichier?.startsWith("image") &&
        !f.typeFichier?.startsWith("video"),
    ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header sticky */}
        <div className="sticky top-0 bg-surface border-b border-border p-6 z-10">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-text">
              <FileText size={20} />
              {di.numero}
            </DialogTitle>
            {di.titre && (
              <p className="text-base font-semibold text-text">
                {di.titre}
              </p>
            )}
            <DialogDescription className="text-text-secondary text-sm">
              {di.actif_detail?.libelle || "—"}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/*  Historique Audit  */}
          <div className="bg-elevated/30 rounded-lg p-4 border border-border-subtle">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg"></span>
              <p className="text-sm font-bold text-text uppercase tracking-wider">
                Historique Audit
              </p>
            </div>
            <div className="space-y-3 text-sm">
              {di.signalement_detail && (
                <div className="flex items-start gap-3">
                  <span className="text-text-secondary min-w-fit"> Créée par :</span>
                  <div>
                    <p className="text-text font-medium">
                      {di.signalement_detail.prenom} {di.signalement_detail.nom}
                    </p>
                    <p className="text-text-muted text-xs">
                      {new Date(di.signalement_detail.date).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              )}
              {di.validation_detail && (
                <div className="flex items-start gap-3 pt-2 border-t border-border-subtle">
                  <span className="text-text-secondary min-w-fit"> OT créé par :</span>
                  <div>
                    <p className="text-text font-medium">
                      {di.validation_detail.prenom} {di.validation_detail.nom}
                    </p>
                    <p className="text-text-muted text-xs">
                      {new Date(di.validation_detail.date).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              )}
              {!di.signalement_detail && !di.validation_detail && (
                <p className="text-text-muted text-xs italic">
                  Aucune information d'audit disponible
                </p>
              )}
            </div>
          </div>

          {/*  Audio Recordings (en haut)  */}
          {audioPieces.length > 0 && (
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
                <Music size={12} /> Enregistrements audio ({audioPieces.length})
              </p>
              <div className="space-y-2">
                {audioPieces.map((f) => (
                  <AudioPlayer key={f.id} file={f} />
                ))}
              </div>
            </div>
          )}

          {/*  Urgence & Date  */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-elevated/30 rounded-lg p-4 border border-border-subtle">
              <p className="text-xs text-text-secondary uppercase font-semibold mb-1">
                Urgence
              </p>
              <p
                className={`text-lg font-bold ${
                  di.urgence === "critique"
                    ? "text-status-red"
                    : di.urgence === "haute"
                      ? "text-status-orange"
                      : di.urgence === "normale"
                        ? "text-status-blue"
                        : "text-text-secondary"
                }`}>
                {di.urgence?.toUpperCase()}
              </p>
            </div>
            <div className="bg-elevated/30 rounded-lg p-4 border border-border-subtle">
              <p className="text-xs text-text-secondary uppercase font-semibold mb-1">
                Date de signalement
              </p>
              <p className="text-sm text-text font-mono">
                {new Date(di.dateSignalement).toLocaleString("fr-FR")}
              </p>
            </div>
          </div>

          {/*  Statut & Rejet  */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-elevated/30 rounded-lg p-4 border border-border-subtle">
              <p className="text-xs text-text-secondary uppercase font-semibold mb-1">
                Statut
              </p>
              <p className="text-sm text-text font-medium capitalize">
                {di.statut?.replace(/_/g, " ")}
              </p>
            </div>
            {di.rejet_info && (
              <div className="bg-danger-soft rounded-lg p-4 border border-danger/30">
                <p className="text-xs text-danger uppercase font-semibold mb-1">
                  Rejet ({di.rejet_info.count}x)
                </p>
                {di.rejet_info.motif && (
                  <p className="text-xs text-text">{di.rejet_info.motif}</p>
                )}
                <p className="text-[10px] text-text-muted mt-1">
                  Dernier rejet : {formatDate(di.rejet_info.date)}
                </p>
              </div>
            )}
          </div>

          {/*  Équipement  */}
          <div className="bg-primary-soft rounded-lg p-4 border border-primary/30">
            <p className="text-xs text-primary uppercase font-semibold mb-2">
              Équipement
            </p>
            <p className="text-sm font-mono text-text-secondary">
              {di.actif_detail?.code || "—"}
            </p>
            <p className="text-sm text-text">
              {di.actif_detail?.libelle || "—"}
            </p>
          </div>

          {/*  Hiérarchie  */}
          <HierarchyPath actifDetail={di.actif_detail} />

          {/*  Description  */}
          {di.description && (
            <div className="bg-primary-soft rounded-lg p-4 border border-primary/30">
              <p className="text-xs text-primary uppercase font-semibold mb-2">
                Description du problème
              </p>
              <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                {di.description}
              </p>
            </div>
          )}

          {/*  Motif de rejet (si pas dans rejet_info)  */}
          {di.motifRejet && !di.rejet_info && (
            <div className="bg-danger-soft rounded-lg p-4 border border-danger/30">
              <p className="text-xs text-danger uppercase font-semibold mb-2">
                Motif de rejet
              </p>
              <p className="text-sm text-text leading-relaxed">
                {di.motifRejet}
              </p>
            </div>
          )}

          {/*  Pièces jointes (Images / Vidéos / Autres)  */}
          {di.pieces_jointes?.length > 0 ? (
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
                <FileText size={12} /> Pièces jointes ({di.pieces_jointes.length})
              </p>

              {/* Images */}
              {imagePieces.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Image size={10} /> Photos ({imagePieces.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {imagePieces.map((f) => (
                      <ImageViewer key={f.id} file={f} />
                    ))}
                  </div>
                </div>
              )}

              {/* Vidéos */}
              {videoPieces.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Video size={10} /> Vidéos ({videoPieces.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {videoPieces.map((f) => (
                      <VideoViewer key={f.id} file={f} />
                    ))}
                  </div>
                </div>
              )}

              {/* Autres fichiers */}
              {otherPieces.length > 0 && (
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                    <FileText size={10} /> Autres fichiers ({otherPieces.length})
                  </p>
                  <div className="space-y-1.5">
                    {otherPieces.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 p-2.5 border border-border-subtle rounded-lg bg-elevated/30">
                        <FileText size={14} className="shrink-0 text-text-muted" />
                        <span className="text-xs text-text flex-1 truncate">
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
            <div className="p-4 text-center text-text-muted text-xs border border-border-subtle rounded-lg bg-elevated/30">
              Aucune pièce jointe pour cette demande
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
