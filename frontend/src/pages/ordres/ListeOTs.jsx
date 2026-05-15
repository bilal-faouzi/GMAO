import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getOTs, changerStatutOT } from "../../services/ordreService";
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

const PAGE_SIZE = 10;

const STATUT_CONFIG = {
  EN_COURS: {
    bg: "var(--status-orange-bg)",
    text: "var(--status-orange-text)",
    dot: "var(--status-orange-dot)",
  },
  DEPANNE: {
    bg: "var(--status-orange-bg)",
    text: "var(--status-orange-text)",
    dot: "var(--status-orange-dot)",
  },
  CLOTURE: {
    bg: "var(--status-green-bg)",
    text: "var(--status-green-text)",
    dot: "var(--status-green-dot)",
  },
};

const PRIORITE_CONFIG = {
  critique: {
    bg: "var(--status-red-bg)",
    text: "var(--status-red-text)",
    dot: "var(--status-red-dot)",
  },
  haute: {
    bg: "var(--status-orange-bg)",
    text: "var(--status-orange-text)",
    dot: "var(--status-orange-dot)",
  },
  normale: {
    bg: "var(--status-blue-bg)",
    text: "var(--status-blue-text)",
    dot: "var(--status-blue-dot)",
  },
  basse: {
    bg: "var(--bg-elevated)",
    text: "var(--text-muted)",
    dot: "var(--text-muted)",
  },
};

export default function ListeOTs() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtrePriorite, setFiltrePriorite] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (search.trim()) params.search = search.trim();
      if (filtreStatut) params.statut = filtreStatut;
      if (filtrePriorite) params.priorite = filtrePriorite;
      const res = await getOTs(params);
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
  }, [page, search, filtreStatut, filtrePriorite]);

  useEffect(() => {
    charger();
  }, [charger]);

  const resetFiltersAndPage = (setter) => {
    setPage(1);
    setter();
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Supprimer cet OT ?")) return;
    try {
      await changerStatutOT(id, { statut: "ANNULE" });
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
          <h1>Ordres de Travail</h1>
          <p>
            {total} ordre{total > 1 ? "s" : ""}
          </p>
        </div>

      </div>

      {/* Filtres */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="search-wrap">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher numéro, actif..."
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
              {Object.keys(STATUT_CONFIG).map((k) => (
                <SelectItem key={k} value={k}>
                  {k.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filtrePriorite || "__all__"}
            onValueChange={(v) =>
              resetFiltersAndPage(() =>
                setFiltrePriorite(v === "__all__" ? "" : v),
              )
            }>
            <SelectTrigger
              className="finput"
              style={{ width: "auto", minWidth: 160 }}>
              <SelectValue placeholder="Toutes priorités" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="__all__">Toutes priorités</SelectItem>
              {Object.keys(PRIORITE_CONFIG).map((k) => (
                <SelectItem key={k} value={k}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tableau */}
      <div className="tbl-card">
        {loading ? (
          <p className="empty">Chargement...</p>
        ) : items.length === 0 ? (
          <p className="empty">Aucun OT trouvé</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Actif</th>
                <th>Type</th>
                <th>Priorité</th>
                <th>Statut</th>
                <th>SLA</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((ot) => {
                const statusCfg = STATUT_CONFIG[ot.statut] || {
                  bg: "var(--bg-elevated)",
                  text: "var(--text-muted)",
                  dot: "var(--text-muted)",
                };
                const priorityCfg =
                  PRIORITE_CONFIG[ot.priorite] || PRIORITE_CONFIG.normale;
                return (
                  <tr
                    key={ot.id}
                    onClick={() => navigate(`/ordres/ots/${ot.id}`)}>
                    <td style={{ fontWeight: 500 }}>
                      <span
                        className="badge"
                        style={{
                          background: priorityCfg.bg,
                          color: priorityCfg.text,
                        }}>
                        {ot.numero || "—"}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: "13px" }}>
                        {ot.actif_detail?.code || "—"}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}>
                        {ot.actif_detail?.libelle || "—"}
                      </div>
                    </td>
                    <td
                      style={{
                        textTransform: "capitalize",
                        color: "var(--text-muted)",
                      }}>
                      {ot.type || "—"}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: priorityCfg.bg,
                          color: priorityCfg.text,
                        }}>
                        <span
                          className="bdot"
                          style={{ background: priorityCfg.dot }}
                        />
                        {ot.priorite || "—"}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: statusCfg.bg || "var(--bg-elevated)",
                          color: statusCfg.text,
                        }}>
                        <span
                          className="bdot"
                          style={{ background: statusCfg.dot }}
                        />
                        {ot.statut?.replace(/_/g, " ") || "—"}
                      </span>
                    </td>
                    <td
                      style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                      {ot.echeanceSLA
                        ? new Date(ot.echeanceSLA).toLocaleString("fr-FR")
                        : "—"}
                    </td>
                    <td>
                      <div
                        style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
                        className="justify-center">
                        <button
                          className="btn btn-ghost btn-icon"
                          title="Voir"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/ordres/ots/${ot.id}`);
                          }}
                          style={{ color: "var(--status-blue-text)" }}>
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          title="Modifier"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/ordres/ots/${ot.id}/modifier`);
                          }}
                          style={{ color: "var(--status-blue-text)" }}>
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          title="Supprimer"
                          onClick={(e) => handleDelete(e, ot.id)}
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
