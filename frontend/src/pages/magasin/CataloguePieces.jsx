import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getPieces, deletePiece, getCategoriesPieces, importerPiecesCSV } from "../../services/magasinService";
import MouvementStockModal from "../../components/MouvementStockModal";
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
  List,
  Upload,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const PAGE_SIZE_OPTIONS = [
  { label: "10", value: 10 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "Tout", value: 5000 },
];

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
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const totalPages = Math.ceil(total / pageSize);

  const buildParams = useCallback(() => {
    const params = { page, page_size: pageSize };
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
    getCategoriesPieces()
      .then((res) => {
        setCategories(res.data || []);
      })
      .catch(() => {});
  }, []);

  const resetFiltersAndPage = (setter) => {
    setPage(1);
    setter();
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(Number(newSize));
    setPage(1);
  };

  const handleDelete = async (id) => {
    try {
      await deletePiece(id);
      await charger();
    } catch (e) {
      console.error(e);
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
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
            className="btn btn-outline"
            title="Importer CSV (Référence, Désignation, Unité)">
            {importLoading ? (
              <><span className="animate-spin" /> Import...</>
            ) : (
              <><Upload size={14} /> Importer CSV</>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImportLoading(true);
              try {
                const res = await importerPiecesCSV(file);
                alert(`Import terminé : ${res.data.creees} créées, ${res.data.mises_a_jour} mises à jour`);
                await charger();
              } catch (err) {
                const msg = err.response?.data?.error || "Erreur lors de l'import CSV.";
                alert(msg);
              } finally {
                setImportLoading(false);
                e.target.value = "";
              }
            }}
          />
          <button
            className="btn btn-primary"
            onClick={() => navigate("/magasin/nouveau")}>
            <Plus size={14} /> Nouvelle pièce
          </button>
        </div>
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
          <Select
            value={filtreCategorie || "__all__"}
            onValueChange={(v) =>
              resetFiltersAndPage(() =>
                setFiltreCategorie(v === "__all__" ? "" : v),
              )
            }>
            <SelectTrigger
              className="finput"
              style={{ width: "auto", minWidth: 160 }}>
              <SelectValue placeholder="Toutes catégories" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="__all__">Toutes catégories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() =>
              resetFiltersAndPage(() => setFiltreAlerte(!filtreAlerte))
            }
            className={` pill   ${filtreAlerte ? "active" : ""} `}>
            {filtreAlerte ? " Alertes uniquement" : " Voir alertes"}
          </Button>
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
                <tr
                  key={p.id}
                  onClick={(e) => {
                    if (e.target.closest("button")) return;
                    navigate(`/magasin/${p.id}`);
                  }}>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setModal({ type: "entree", piece: p });
                        }}
                        style={{ color: "var(--status-green-text)" }}>
                        <ArrowUpFromLine size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        title="Sortie"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModal({ type: "sortie", piece: p });
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="btn btn-ghost btn-icon"
                            title="Supprimer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: "var(--status-red-text)" }}>
                            <Trash2 size={14} />
                          </button>
                        </AlertDialogTrigger>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Supprimer la pièce
                            </AlertDialogTitle>

                            <AlertDialogDescription>
                              Voulez-vous vraiment supprimer cette pièce ?
                              <br />
                              Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>

                            <AlertDialogAction
                              onClick={(e) => {
                                handleDelete(p.id);
                                e.stopPropagation();
                              }}
                              className="bg-red-600 hover:bg-red-700">
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
            gap: 8,
          }}>
          {/* Page size selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <List size={14} style={{ color: "var(--text-muted)" }} />
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Afficher :
            </span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(e.target.value)}
              style={{
                background: "var(--card-bg)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 13,
                outline: "none",
                cursor: "pointer",
              }}>
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              sur {total} références
            </span>
          </div>

          {/* Page navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
        </div>
      )}

      {/* Modal Entrée/Sortie */}
      {modal && (
        <MouvementStockModal
          type={modal.type}
          piece={modal.piece}
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
