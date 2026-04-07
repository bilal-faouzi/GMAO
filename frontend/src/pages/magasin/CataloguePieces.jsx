import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPieces,
  deletePiece,
  sortiePiece,
  entreePiece,
} from "../../services/magasinService";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

const PAGE_SIZE = 10;

const fmtQty = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? v : n % 1 === 0 ? String(Math.trunc(n)) : String(n);
};

export default function CataloguePieces() {
  const navigate = useNavigate();
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtreAlerte, setFiltreAlerte] = useState(false);
  const [filtreCategorie, setFiltreCategorie] = useState("");
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(null);
  const [quantite, setQuantite] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [errModal, setErrModal] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildParams = useCallback(() => {
    const params = { page, page_size: PAGE_SIZE };
    if (search.trim()) params.search = search.trim();
    if (filtreAlerte) params.sous_seuil = "true";
    if (filtreCategorie) params.categorie = filtreCategorie;
    return params;
  }, [page, search, filtreAlerte, filtreCategorie]);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPieces(buildParams());
      if (res.data.results !== undefined) {
        setPieces(res.data.results);
        setTotal(res.data.count);
      } else {
        setPieces(res.data);
        setTotal(res.data.length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Charger les catégories distinctes une seule fois
  useEffect(() => {
    getPieces({ page_size: 1000 })
      .then((res) => {
        const data = res.data.results || res.data;
        const cats = [
          ...new Set(data.map((p) => p.categorie).filter(Boolean)),
        ].sort();
        setCategories(cats);
      })
      .catch(() => {});
  }, []);

  const resetFiltersAndPage = (setter) => {
    setPage(1);
    setter();
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette pièce ?")) return;
    await deletePiece(id);
    charger();
  };

  const handleMouvement = async () => {
    setErrModal("");
    try {
      if (modal.type === "sortie") {
        await sortiePiece(modal.piece.id, quantite, commentaire);
      } else {
        await entreePiece(modal.piece.id, quantite, commentaire);
      }
      setModal(null);
      setQuantite("");
      setCommentaire("");
      charger();
    } catch (e) {
      setErrModal(e.response?.data?.error || "Erreur");
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="hdr">
        <div className="hdr-l">
          <h1>Catalogue des pièces</h1>
          <p>{total} références</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/magasin/nouveau")}>
          <Plus size={14} /> Nouvelle pièce
        </button>
      </div>

      {/* Filtres */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="search-wrap">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher référence, désignation..."
              value={search}
              onChange={(e) =>
                resetFiltersAndPage(() => setSearch(e.target.value))
              }
              className="search-input"
            />
          </div>
          <select
            value={filtreCategorie}
            onChange={(e) =>
              resetFiltersAndPage(() => setFiltreCategorie(e.target.value))
            }
            className="finput"
            style={{ width: "auto", minWidth: 160 }}>
            <option value="">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              resetFiltersAndPage(() => setFiltreAlerte(!filtreAlerte))
            }
            className={`pill ${filtreAlerte ? "active" : ""}`}>
            {filtreAlerte ? "🔴 Alertes uniquement" : "🔴 Voir alertes"}
          </button>
        </div>
      </div>

      {/* Tableau */}
      <div className="tbl-card">
        {loading ? (
          <p className="empty">Chargement...</p>
        ) : pieces.length === 0 ? (
          <p className="empty">Aucune pièce trouvée</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Désignation</th>
                <th>Stock</th>
                <th>Seuil min</th>
                <th>Emplacement</th>
                <th>Prix unit.</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pieces.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/magasin/${p.id}`)}>
                  <td>
                    <span className="code-mono">{p.reference}</span>
                    {p.est_sous_seuil && (
                      <span
                        className="badge"
                        style={{
                          background: "var(--status-red-bg)",
                          color: "var(--status-red-text)",
                          marginLeft: 8,
                        }}>
                        <span
                          className="bdot"
                          style={{ background: "var(--status-red-dot)" }}
                        />
                        alerte
                      </span>
                    )}
                  </td>
                  <td className="desig">{p.designation}</td>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        color: p.est_sous_seuil
                          ? "var(--status-red-text)"
                          : "var(--status-green-text)",
                      }}>
                      {fmtQty(p.quantiteStock)}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginLeft: 4,
                      }}>
                      {p.unite}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>
                    {fmtQty(p.seuilMinimum)} {p.unite}
                  </td>
                  <td>
                    <span className="code-mono">{p.emplacement || "—"}</span>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>
                    {p.prixUnitaire ? `${p.prixUnitaire} MAD` : "—"}
                  </td>
                  <td>
                    <div
                      style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
                      className="justify-center">
                      <button
                        className="btn btn-ghost btn-icon"
                        title="Entrée"
                        onClick={() => {
                          setModal({ type: "entree", piece: p });
                          setQuantite("");
                          setErrModal("");
                        }}
                        style={{ color: "var(--status-green-text)" }}>
                        <ArrowUpFromLine size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        title="Sortie"
                        onClick={() => {
                          setModal({ type: "sortie", piece: p });
                          setQuantite("");
                          setErrModal("");
                        }}
                        style={{ color: "var(--status-red-text)" }}>
                        <ArrowDownToLine size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        title="Modifier"
                        onClick={() => navigate(`/magasin/${p.id}/modifier`)}
                        style={{ color: "var(--status-blue-text)" }}>
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        title="Supprimer"
                        onClick={() => handleDelete(p.id)}
                        style={{ color: "var(--status-red-text)" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 12,
          }}>
          <button
            className="btn btn-outline btn-icon"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft size={16} />
          </button>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}>
            {page} / {totalPages}
          </span>
          <button
            className="btn btn-outline btn-icon"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Modal Entrée/Sortie */}
      {modal && (
        <div className="backdrop">
          <div className="modal modal-sm">
            <div className="m-hdr">
              <span className="m-title">
                {modal.type === "entree" ? "+ Entrée stock" : "- Sortie stock"}
              </span>
              <button className="m-close" onClick={() => setModal(null)}>
                ✕
              </button>
            </div>
            <div className="m-body-plain">
              <p className="code-mono" style={{ marginBottom: 4 }}>
                {modal.piece.reference} — {modal.piece.designation}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 16,
                }}>
                Stock actuel :{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {fmtQty(modal.piece.quantiteStock)} {modal.piece.unite}
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
              <button
                className="btn btn-outline"
                onClick={() => setModal(null)}>
                Annuler
              </button>
              <button
                className={
                  modal.type === "entree" ? "btn btn-primary" : "btn btn-danger"
                }
                onClick={handleMouvement}
                style={
                  modal.type === "entree"
                    ? { background: "var(--color-success)" }
                    : {}
                }>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
