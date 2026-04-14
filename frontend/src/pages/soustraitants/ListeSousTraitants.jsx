import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSousTraitants,
  deleteSousTraitant,
} from "../../services/soustraitantService";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Search,
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

const PAGE_SIZE = 20;

const STATUT_CONFIG = {
  actif: {
    bg: "var(--status-green-bg)",
    text: "var(--status-green-text)",
    dot: "var(--status-green-dot)",
  },
  inactif: {
    bg: "var(--bg-elevated)",
    text: "var(--text-muted)",
    dot: "var(--text-muted)",
  },
  suspendu: {
    bg: "var(--status-red-bg)",
    text: "var(--status-red-text)",
    dot: "var(--status-red-dot)",
  },
};

export default function ListeSousTraitants() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (search.trim()) params.search = search.trim();
      if (filtreStatut) params.statut = filtreStatut;
      const res = await getSousTraitants(params);
      if (res.data.data) {
        setItems(res.data.data);
        setTotal(res.data.pagination?.total || res.data.data.length);
      } else if (res.data.results) {
        setItems(res.data.results);
        setTotal(res.data.count);
      } else {
        setItems(res.data);
        setTotal(res.data.length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, filtreStatut]);

  useEffect(() => {
    charger();
  }, [charger]);

  const resetFiltersAndPage = (setter) => {
    setPage(1);
    setter();
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Supprimer ce sous-traitant ?")) return;
    try {
      await deleteSousTraitant(id);
      charger();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="hdr">
        <div className="hdr-l">
          <h1>Sous-Traitants</h1>
          <p>
            {total} sous-traitant{total > 1 ? "s" : ""}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/soustraitants/nouveau")}>
          <Plus size={14} /> Nouveau sous-traitant
        </button>
      </div>

      {/* Filtres */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="search-wrap">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher raison sociale, contact..."
              value={search}
              onChange={(e) =>
                resetFiltersAndPage(() => setSearch(e.target.value))
              }
              className="search-input"
            />
          </div>
          <Select
            value={filtreStatut || "__all__"}
            onValueChange={(v) =>
              resetFiltersAndPage(() =>
                setFiltreStatut(v === "__all__" ? "" : v),
              )
            }>
            <SelectTrigger
              className="finput"
              style={{ width: "auto", minWidth: 160 }}>
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="__all__">Tous les statuts</SelectItem>
              <SelectItem value="actif">Actif</SelectItem>
              <SelectItem value="inactif">Inactif</SelectItem>
              <SelectItem value="suspendu">Suspendu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tableau */}
      <div className="tbl-card">
        {loading ? (
          <p className="empty">Chargement...</p>
        ) : items.length === 0 ? (
          <p className="empty">Aucun sous-traitant trouvé</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Raison sociale</th>
                <th>Contact principal</th>
                <th>Téléphone</th>
                <th>Spécialités</th>
                <th>Tarif horaire</th>
                <th>Statut</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((st) => {
                const cfg = STATUT_CONFIG[st.statut] || STATUT_CONFIG.inactif;
                return (
                  <tr
                    key={st.id}
                    onClick={() => navigate(`/soustraitants/${st.id}`)}>
                    <td style={{ fontWeight: 500 }}>{st.raisonSociale}</td>
                    <td>{st.contactPrincipalNom || "—"}</td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {st.contactPrincipalTel || "—"}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: "var(--bg-elevated)",
                          color: "var(--text-secondary)",
                        }}>
                        {st.specialites?.length || 0}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {st.tarifHoraireNormal
                        ? `${st.tarifHoraireNormal} MAD/h`
                        : "—"}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{ background: cfg.bg, color: cfg.text }}>
                        <span
                          className="bdot"
                          style={{ background: cfg.dot }}
                        />
                        {st.statut}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
                        className="justify-center">
                        <button
                          className="btn btn-ghost btn-icon"
                          title="Modifier"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/soustraitants/${st.id}/modifier`);
                          }}
                          style={{ color: "var(--status-blue-text)" }}>
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          title="Supprimer"
                          onClick={(e) => handleDelete(e, st.id)}
                          style={{ color: "var(--status-red-text)" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
    </div>
  );
}
