import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getActifs,
  deleteActif,
  changerStatut,
} from "../../services/actifService";
import { getSites } from "../../services/organisationService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  RotateCcw,
  Plus,
  Eye,
  Pencil,
  RefreshCw,
  Trash2,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Config statuts & types ───────────────────────────────────────────────────

const STATUTS = {
  actif: {
    label: "Actif",
    bg: "var(--status-green-bg)",
    text: "var(--status-green-text)",
    dot: "var(--status-green-dot)",
  },
  en_panne: {
    label: "En panne",
    bg: "var(--status-red-bg)",
    text: "var(--status-red-text)",
    dot: "var(--status-red-dot)",
  },
  en_maintenance: {
    label: "En maintenance",
    bg: "var(--status-orange-bg)",
    text: "var(--status-orange-text)",
    dot: "var(--status-orange-dot)",
  },
  retire: {
    label: "Retiré",
    bg: "var(--status-gray-bg)",
    text: "var(--status-gray-text)",
    dot: "var(--status-gray-dot)",
  },
};

const TYPES = {
  equipement: {
    label: "Équipement",
    bg: "var(--status-blue-bg)",
    text: "var(--status-blue-text)",
  },
  infrastructure: {
    label: "Infrastructure",
    bg: "var(--status-purple-bg)",
    text: "var(--status-purple-text)",
  },
  vehicule: {
    label: "Véhicule",
    bg: "var(--status-cyan-bg)",
    text: "var(--status-cyan-text)",
  },
  autre: {
    label: "Autre",
    bg: "var(--status-gray-bg)",
    text: "var(--status-gray-text)",
  },
};

const ALL = "__all__";
const PAGE_SIZE = 10;

function StatutBadge({ statut }) {
  const cfg = STATUTS[statut] || {
    label: statut,
    bg: "var(--color-elevated)",
    text: "var(--color-text-muted)",
    dot: "var(--color-text-muted)",
  };
  return (
    <span className="badge" style={{ background: cfg.bg, color: cfg.text }}>
      <span className="bdot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }) {
  const cfg = TYPES[type] || {
    label: type,
    bg: "var(--color-elevated)",
    text: "var(--color-text-muted)",
  };
  return (
    <span className="badge" style={{ background: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}

// ─── Composant Pagination ─────────────────────────────────────────────────────

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ListeActifs() {
  const navigate = useNavigate();
  const [actifs, setActifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    statut: "",
    type: "",
    site: "",
    parentFilter: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [modalStatut, setModalStatut] = useState(null);
  const [nouveauStatut, setNouveauStatut] = useState("");
  const [motif, setMotif] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [sites, setSites] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Charger la liste des sites pour le filtre
  useEffect(() => {
    getSites()
      .then((res) => {
        setSites(res.data.results || res.data);
      })
      .catch(() => {});
  }, []);

  const buildParams = useCallback(() => {
    const params = { page, page_size: PAGE_SIZE };
    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.statut) params.statut = filters.statut;
    if (filters.type) params.type = filters.type;
    if (filters.site) params.idSite = filters.site; // correspond au filterset_field backend
    if (filters.parentFilter) params.is_parent = filters.parentFilter;
    return params;
  }, [filters, page]);

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await getActifs(buildParams());
      // Réponse paginée : { count, next, previous, results }
      if (res.data.results !== undefined) {
        setActifs(res.data.results);
        setTotal(res.data.count);
      } else {
        // fallback si pagination non activée côté backend
        setActifs(res.data);
        setTotal(res.data.length);
      }
    } catch {
      setErreur("Erreur lors du chargement des actifs");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Remettre à la page 1 quand les filtres changent
  const setFiltersAndReset = (updater) => {
    setPage(1);
    setFilters(updater);
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Supprimer définitivement cet actif ? Cette action est irréversible.",
      )
    )
      return;
    setActionLoading(true);
    try {
      await deleteActif(id);
      await charger();
    } catch {
      setErreur("Erreur lors de la suppression");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangerStatut = async () => {
    if (!nouveauStatut) return;
    setActionLoading(true);
    try {
      await changerStatut(modalStatut.id, nouveauStatut, motif);
      setModalStatut(null);
      setNouveauStatut("");
      setMotif("");
      await charger();
    } catch {
      setErreur("Erreur lors du changement de statut");
    } finally {
      setActionLoading(false);
    }
  };

  const hasFilters = !!(
    filters.statut ||
    filters.type ||
    filters.site ||
    filters.parentFilter
  );
  const filterCount = [
    filters.statut,
    filters.type,
    filters.site,
    filters.parentFilter,
  ].filter(Boolean).length;
  const clearFilters = () => {
    setPage(1);
    setFilters({
      search: "",
      statut: "",
      type: "",
      site: "",
      parentFilter: "",
    });
  };

  const stats = {
    total: actifs.length,
    actif: actifs.filter((a) => a.statut === "actif").length,
    panne: actifs.filter((a) => a.statut === "en_panne").length,
    maint: actifs.filter((a) => a.statut === "en_maintenance").length,
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="hdr">
        <div className="hdr-l">
          <h1>Actifs</h1>
          <p>Gestion des équipements et infrastructures</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/actifs/nouveau")}>
          <Plus size={14} /> Nouvel actif
        </button>
      </div>

      {/* Erreur globale */}
      {erreur && (
        <div
          style={{
            background: "var(--status-red-bg)",
            border: "1px solid rgba(239,68,68,.25)",
            color: "var(--status-red-text)",
            borderRadius: "var(--r-sm)",
            padding: "10px 14px",
            fontSize: 13,
          }}>
          {erreur}
          <button
            onClick={() => setErreur(null)}
            style={{ marginLeft: 12, cursor: "pointer", opacity: 0.7 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-chip">
          <strong>{total}</strong>&nbsp;actifs
        </div>
        <div className="stat-chip">
          <span
            className="dot"
            style={{ background: "var(--status-green-dot)" }}
          />
          <strong>{stats.actif}</strong>&nbsp;en service
        </div>
        <div className="stat-chip">
          <span
            className="dot"
            style={{ background: "var(--status-red-dot)" }}
          />
          <strong>{stats.panne}</strong>&nbsp;en panne
        </div>
        <div className="stat-chip">
          <span
            className="dot"
            style={{ background: "var(--status-orange-dot)" }}
          />
          <strong>{stats.maint}</strong>&nbsp;maintenance
        </div>
      </div>

      {/* Filtres */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="search-wrap" style={{ flex: 1 }}>
            <Search size={14} className="search-icon" />
            <Input
              className="search-input"
              placeholder="Rechercher code, libellé, série..."
              value={filters.search}
              onChange={(e) =>
                setFiltersAndReset((f) => ({ ...f, search: e.target.value }))
              }
              onKeyDown={(e) => e.key === "Enter" && charger()}
            />
          </div>
          <Button
            className={`pill ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters((v) => !v)}>
            <Filter size={11} /> Filtres
            {hasFilters && <span className="pill-count">{filterCount}</span>}
          </Button>
          {hasFilters && (
            <Button className="pill" onClick={clearFilters}>
              <X size={11} /> Effacer
            </Button>
          )}
          <Button
            className="btn btn-ghost btn-icon"
            title="Rafraîchir"
            onClick={charger}>
            <RotateCcw size={13} />
          </Button>
        </div>

        {showFilters && (
          <div className="filters-exp">
            {/* Filtre statut */}
            <Select
              value={filters.statut || ALL}
              onValueChange={(v) =>
                setFiltersAndReset((f) => ({
                  ...f,
                  statut: v === ALL ? "" : v,
                }))
              }>
              <SelectTrigger className="sel-mini">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value={ALL}>Tous les statuts</SelectItem>
                {Object.entries(STATUTS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtre type */}
            <Select
              value={filters.type || ALL}
              onValueChange={(v) =>
                setFiltersAndReset((f) => ({ ...f, type: v === ALL ? "" : v }))
              }>
              <SelectTrigger className="sel-mini">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value={ALL}>Tous les types</SelectItem>
                {Object.entries(TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtre site */}
            <Select
              value={filters.site || ALL}
              onValueChange={(v) =>
                setFiltersAndReset((f) => ({ ...f, site: v === ALL ? "" : v }))
              }>
              <SelectTrigger className="sel-mini">
                <SelectValue placeholder="Tous les sites" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value={ALL}>Tous les sites</SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtre parent / enfant */}
            <Select
              value={filters.parentFilter || ALL}
              onValueChange={(v) =>
                setFiltersAndReset((f) => ({
                  ...f,
                  parentFilter: v === ALL ? "" : v,
                }))
              }>
              <SelectTrigger className="sel-mini">
                <SelectValue placeholder="Parent / Enfant" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value={ALL}>Parent / Enfant</SelectItem>
                <SelectItem value="true">Parent (sans parent)</SelectItem>
                <SelectItem value="false">Enfant (sous-actif)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="tbl-card">
        <div className="tbl-head">
          <span className="tbl-title">Liste des actifs</span>
          <span className="tbl-count">
            {loading
              ? "Chargement…"
              : `${total} actif${total > 1 ? "s" : ""} · page ${page}/${totalPages || 1}`}
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Libellé</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Site</th>
                <th className="c">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}>
                        <div className="skeleton" style={{ width: "70%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : actifs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty">
                    Aucun actif trouvé
                  </td>
                </tr>
              ) : (
                actifs.map((actif) => (
                  <tr key={actif.id}>
                    <td>
                      <span className="code-mono" style={{ fontWeight: 600 }}>
                        {actif.code}
                      </span>
                    </td>
                    <td className="desig">{actif.libelle}</td>
                    <td>
                      <TypeBadge type={actif.type} />
                    </td>
                    <td>
                      <StatutBadge statut={actif.statut} />
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      {actif.site_detail?.libelle || actif.site?.libelle || "—"}
                    </td>
                    <td className="c">
                      <div
                        style={{
                          display: "flex",
                          gap: 4,
                          justifyContent: "center",
                        }}>
                        <button
                          className="act-btn"
                          title="Détail"
                          disabled={actionLoading}
                          onClick={() => navigate(`/actifs/${actif.id}`)}>
                          <Eye size={14} />
                        </button>
                        <button
                          className="act-btn"
                          title="Modifier"
                          disabled={actionLoading}
                          onClick={() =>
                            navigate(`/actifs/${actif.id}/modifier`)
                          }>
                          <Pencil size={14} />
                        </button>
                        <button
                          className="act-btn"
                          title="Changer statut"
                          disabled={actionLoading}
                          onClick={() => {
                            setModalStatut(actif);
                            setNouveauStatut(actif.statut);
                            setMotif("");
                          }}>
                          <RefreshCw size={14} />
                        </button>
                        <button
                          className="act-btn"
                          title="Supprimer"
                          disabled={actionLoading}
                          onClick={() => handleDelete(actif.id)}
                          style={{ color: "var(--status-red-text)" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
          <Button
            className="btn btn-outline btn-icon"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft size={16} />
          </Button>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}>
            {page} / {totalPages}
          </span>
          <Button
            className="btn btn-outline btn-icon"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {/* Modal changer statut */}
      {modalStatut && (
        <div className="backdrop">
          <div className="modal modal-sm">
            <div className="m-hdr">
              <span className="m-title">Changer le statut</span>
              <button className="m-close" onClick={() => setModalStatut(null)}>
                ✕
              </button>
            </div>
            <div
              className="m-body-plain"
              style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Actif :{" "}
                <span className="code-mono" style={{ fontWeight: 600 }}>
                  {modalStatut.code}
                </span>
              </p>
              <div className="fg">
                <label className="flabel">Nouveau statut</label>
                <select
                  className="fsel"
                  value={nouveauStatut}
                  onChange={(e) => setNouveauStatut(e.target.value)}>
                  {Object.entries(STATUTS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="flabel">Motif (optionnel)</label>
                <textarea
                  className="finput"
                  placeholder="Raison du changement…"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  rows={3}
                  style={{ resize: "none" }}
                />
              </div>
            </div>
            <div className="m-foot">
              <button
                className="btn btn-outline"
                onClick={() => setModalStatut(null)}
                disabled={actionLoading}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={handleChangerStatut}
                disabled={actionLoading}>
                {actionLoading ? "En cours…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
