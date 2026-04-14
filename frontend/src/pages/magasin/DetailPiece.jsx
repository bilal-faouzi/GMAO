import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPiece, getMouvementsByPiece } from "../../services/magasinService";
import { ArrowLeft, Pencil } from "lucide-react";
import MouvementStockModal from "../../components/MouvementStockModal";

const fmtQty = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? v : n % 1 === 0 ? String(Math.trunc(n)) : String(n);
};

const MOUVEMENT_CONFIG = {
  entree: {
    bg: "var(--status-green-bg)",
    text: "var(--status-green-text)",
    dot: "var(--status-green-dot)",
  },
  sortie: {
    bg: "var(--status-red-bg)",
    text: "var(--status-red-text)",
    dot: "var(--status-red-dot)",
  },
  ajustement: {
    bg: "var(--status-orange-bg)",
    text: "var(--status-orange-text)",
    dot: "var(--status-orange-dot)",
  },
};

export default function DetailPiece() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [piece, setPiece] = useState(null);
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const charger = async () => {
    try {
      const [p, m] = await Promise.all([
        getPiece(id),
        getMouvementsByPiece(id),
      ]);
      setPiece(p.data);
      setMouvements(m.data.results || m.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, [id]);

  if (loading)
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l">
            <h1>Chargement…</h1>
          </div>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[0, 1].map((i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r)",
                padding: 20,
              }}>
              <div
                className="skeleton"
                style={{ width: "40%", height: 14, marginBottom: 16 }}
              />
              <div
                className="skeleton"
                style={{ width: "100%", height: 12, marginBottom: 8 }}
              />
              <div className="skeleton" style={{ width: "80%", height: 12 }} />
            </div>
          ))}
        </div>
      </div>
    );

  if (!piece)
    return (
      <div className="page">
        <div
          style={{
            background: "var(--status-red-bg)",
            color: "var(--status-red-text)",
            padding: "12px 16px",
            borderRadius: "var(--r-sm)",
            fontSize: 13,
          }}>
          Pièce introuvable.
        </div>
      </div>
    );

  return (
    <div className="page">
      {/* Header */}
      <div className="hdr">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="btn btn-ghost"
            onClick={() => navigate("/magasin")}>
            <ArrowLeft size={14} /> Retour
          </button>
          <h1 className="code-mono" style={{ fontSize: 22, fontWeight: 600 }}>
            {piece.reference}
          </h1>
          {piece.est_sous_seuil && (
            <span
              className="badge"
              style={{
                background: "var(--status-red-bg)",
                color: "var(--status-red-text)",
              }}>
              <span
                className="bdot"
                style={{ background: "var(--status-red-dot)" }}
              />
              Stock critique
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setModal("entree");
            }}
            style={{ background: "var(--color-success)" }}>
            + Entrée
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              setModal("sortie");
            }}>
            - Sortie
          </button>
          <button
            className="btn btn-outline"
            onClick={() => navigate(`/magasin/${id}/modifier`)}>
            <Pencil size={13} /> Modifier
          </button>
        </div>
      </div>

      {/* Infos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Identification</span>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
            {[
              ["Désignation", piece.designation],
              ["Catégorie", piece.categorie || "—"],
              ["Unité", piece.unite],
              ["Emplacement", piece.emplacement || "—"],
              ["Fournisseur", piece.fournisseur || "—"],
              ["Réf. constructeur", piece.referenceConstructeur || "—"],
            ].map(([l, v]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                }}>
                <span style={{ color: "var(--text-muted)" }}>{l}</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Stock & Valeur</span>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
            {[
              [
                "Stock actuel",
                `${fmtQty(piece.quantiteStock)} ${piece.unite}`,
                piece.est_sous_seuil,
              ],
              ["Seuil minimum", `${fmtQty(piece.seuilMinimum)} ${piece.unite}`],
              [
                "Prix unitaire",
                piece.prixUnitaire ? `${piece.prixUnitaire} MAD` : "—",
              ],
              [
                "Valeur totale",
                piece.valeur_stock_total
                  ? `${piece.valeur_stock_total} MAD`
                  : "—",
              ],
              [
                "Dernière entrée",
                piece.dateDerniereEntree
                  ? new Date(piece.dateDerniereEntree).toLocaleString("fr-FR")
                  : "—",
              ],
            ].map(([l, v, isAlert]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                }}>
                <span style={{ color: "var(--text-muted)" }}>{l}</span>
                <span
                  style={{
                    color: isAlert
                      ? "var(--status-red-text)"
                      : "var(--text-primary)",
                    fontWeight: 500,
                  }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historique mouvements */}
      <div className="tbl-card">
        <div className="tbl-head">
          <span className="tbl-title">
            Historique des mouvements ({mouvements.length})
          </span>
        </div>
        {mouvements.length === 0 ? (
          <p className="empty">Aucun mouvement</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th className="text-center">Quantité</th>
                <th className="text-center">Avant</th>
                <th className="text-center">Après</th>
                <th>Date</th>
                <th>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {mouvements.map((m) => {
                const cfg =
                  MOUVEMENT_CONFIG[m.typeMouvement] ||
                  MOUVEMENT_CONFIG.ajustement;
                return (
                  <tr key={m.id}>
                    <td>
                      <span
                        className="badge"
                        style={{ background: cfg.bg, color: cfg.text }}>
                        <span
                          className="bdot"
                          style={{ background: cfg.dot }}
                        />
                        {m.typeMouvement}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }} className="text-center">
                      {m.typeMouvement === "sortie" ? "-" : "+"}
                      {fmtQty(m.quantite)}
                    </td>
                    <td
                      style={{ color: "var(--text-muted)" }}
                      className="text-center">
                      {fmtQty(m.stockAvant)}
                    </td>
                    <td style={{ fontWeight: 500 }} className="text-center">
                      {fmtQty(m.stockApres)}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {new Date(m.dateHeure).toLocaleString("fr-FR")}
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {m.commentaire || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <MouvementStockModal
          type={modal}
          piece={piece}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            charger();
          }}
        />
      )}
    </div>
  );
}
