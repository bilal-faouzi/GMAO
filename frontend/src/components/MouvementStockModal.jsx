import { useState } from "react";
import { sortiePiece, entreePiece } from "../services/magasinService";

const fmtQty = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? v : n % 1 === 0 ? String(Math.trunc(n)) : String(n);
};

export default function MouvementStockModal({
  type,
  piece,
  onClose,
  onSuccess,
}) {
  const [quantite, setQuantite] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [errModal, setErrModal] = useState("");

  const handleMouvement = async () => {
    setErrModal("");
    try {
      if (type === "sortie") {
        await sortiePiece(piece.id, quantite, commentaire);
      } else {
        await entreePiece(piece.id, quantite, commentaire);
      }
      onSuccess();
    } catch (e) {
      setErrModal(e.response?.data?.error || "Erreur");
    }
  };

  return (
    <div className="backdrop">
      <div className="modal modal-sm">
        <div className="m-hdr">
          <span className="m-title">
            {type === "entree" ? "+ Entrée stock" : "- Sortie stock"}
          </span>
          <button className="m-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="m-body-plain">
          <p className="code-mono" style={{ marginBottom: 4 }}>
            {piece.reference} — {piece.designation}
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 16,
            }}>
            Stock actuel :{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {fmtQty(piece.quantiteStock)} {piece.unite}
            </strong>
          </p>
          {errModal && (
            <div
              className="alert-warn"
              style={{ marginTop: 0, marginBottom: 12 }}>
              {errModal}
            </div>
          )}
          <div className="fg" style={{ marginBottom: 12 }}>
            <label className="flabel">Quantité</label>
            <input
              type="number"
              placeholder="Quantité"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              className="finput"
            />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="flabel">Commentaire (optionnel)</label>
            <textarea
              placeholder="Commentaire"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              className="finput"
              style={{ resize: "none", height: 64 }}
            />
          </div>
        </div>
        <div className="m-foot">
          <button className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button
            className={type === "entree" ? "btn btn-primary" : "btn btn-danger"}
            onClick={handleMouvement}
            style={
              type === "entree" ? { background: "var(--color-success)" } : {}
            }>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
