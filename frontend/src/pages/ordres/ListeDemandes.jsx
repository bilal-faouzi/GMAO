import DIDetailDialog from "@/components/DIDetailDialog";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDemandes,
  validerDemande,
  rejeterDemande,
} from "../../services/ordreService";
import {
  Plus,
  Check,
  X,
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

const URGENCE_CONFIG = {
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

const STATUT_CONFIG = {
  en_attente: {
    bg: "var(--status-yellow-bg)",
    text: "var(--status-yellow-text)",
    dot: "var(--status-yellow-dot)",
  },
  validee: {
    bg: "var(--status-green-bg)",
    text: "var(--status-green-text)",
    dot: "var(--status-green-dot)",
  },
  rejetee: {
    bg: "var(--status-red-bg)",
    text: "var(--status-red-text)",
    dot: "var(--status-red-dot)",
  },
  rejetee_apres_validation: {
    bg: "var(--status-red-bg)",
    text: "var(--status-red-text)",
    dot: "var(--status-red-dot)",
  },
};

export default function ListeDemandes() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtreUrgence, setFiltreUrgence] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalRejet, setModalRejet] = useState(null);
  const [motifRejet, setMotifRejet] = useState("");
  const [selectedDI, setSelectedDI] = useState(null);
  const [showDIDialog, setShowDIDialog] = useState(false);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE, my_unite: true };
      if (search.trim()) params.search = search.trim();
      if (filtreStatut) params.statut = filtreStatut;
      if (filtreUrgence) params.urgence = filtreUrgence;

      const res = await getDemandes(params);
      const body = res.data;

      if (body.data) {
        setItems(body.data);
        // ✅ Chercher le total dans tous les emplacements possibles
        setTotal(
          body.pagination?.total ??
            body.total ??
            body.count ??
            body.data.length, // dernier recours (pagination impossible)
        );
      } else if (body.results) {
        setItems(body.results);
        setTotal(body.count ?? body.total ?? body.results.length);
      } else if (Array.isArray(body)) {
        setItems(body);
        setTotal(body.length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, filtreStatut, filtreUrgence]);

  useEffect(() => {
    charger();
  }, [charger]);

  const resetFiltersAndPage = (setter) => {
    setPage(1);
    setter();
  };

  const handleValider = async (id) => {
    try {
      await validerDemande(id);
      charger();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejeter = async () => {
    if (!motifRejet.trim()) {
      alert("Motif de rejet requis");
      return;
    }
    try {
      await rejeterDemande(modalRejet, motifRejet);
      setModalRejet(null);
      setMotifRejet("");
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
          <h1>Demandes d'Intervention</h1>
          <p>
            {total} demande{total > 1 ? "s" : ""}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/ordres/demandes/nouveau")}>
          <Plus size={14} /> Nouvelle demande
        </button>
      </div>

      {/* Filtres */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="search-wrap">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher numéro, description..."
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
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="validee">Validée</SelectItem>
              <SelectItem value="rejetee">Rejetée</SelectItem>
              <SelectItem value="rejetee_apres_validation">Rejetée après validation</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filtreUrgence || "__all__"}
            onValueChange={(v) =>
              resetFiltersAndPage(() =>
                setFiltreUrgence(v === "__all__" ? "" : v),
              )
            }>
            <SelectTrigger
              className="finput"
              style={{ width: "auto", minWidth: 160 }}>
              <SelectValue placeholder="Toutes urgences" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="__all__">Toutes urgences</SelectItem>
              <SelectItem value="critique">Critique</SelectItem>
              <SelectItem value="haute">Haute</SelectItem>
              <SelectItem value="normale">Normale</SelectItem>
              <SelectItem value="basse">Basse</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tableau */}
      <div className="tbl-card">
        {loading ? (
          <p className="empty">Chargement...</p>
        ) : items.length === 0 ? (
          <p className="empty">Aucune demande trouvée</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Actif</th>
                <th>Hiérarchie</th>
                <th>Urgence</th>
                <th>Statut</th>
                <th>Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => {
                const urgencyCfg =
                  URGENCE_CONFIG[d.urgence] || URGENCE_CONFIG.normale;
                const statusCfg =
                  STATUT_CONFIG[d.statut] || STATUT_CONFIG.en_attente;
                return (
                  <tr
                    key={d.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDI(d);
                      setShowDIDialog(true);
                    }}
                    style={{ cursor: "pointer" }}>
                    <td style={{ fontWeight: 500 }}>
                      <span
                        className="badge"
                        style={{
                          background: urgencyCfg.bg,
                          color: urgencyCfg.text,
                        }}>
                        {d.numero || "—"}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: "13px" }}>
                        {d.actif_detail?.code || "—"}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}>
                        {d.actif_detail?.libelle || "—"}
                      </div>
                    </td>
                    <td>
                      {d.actif_detail?.chemin_hierarchique?.length > 0 ? (
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {d.actif_detail.chemin_hierarchique.map((h, i) => (
                            <span key={h.id}>
                              <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>{h.code}</span>
                              {i < d.actif_detail.chemin_hierarchique.length - 1 && (
                                <span style={{ margin: "0 3px", color: "var(--text-muted)" }}>›</span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                          Actif racine
                        </span>
                      )}
                      {d.actif_detail?.fils?.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <span style={{ fontSize: "10px", color: "var(--color-primary)" }}>
                            {d.actif_detail.fils.length} fil(s):
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 2 }}>
                            {d.actif_detail.fils.slice(0, 3).map(f => (
                              <span key={f.id} className="badge" style={{
                                fontSize: "10px",
                                background: "var(--primary-soft)",
                                color: "var(--color-primary)",
                                padding: "1px 6px",
                              }}>
                                {f.code}
                              </span>
                            ))}
                            {d.actif_detail.fils.length > 3 && (
                              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                                +{d.actif_detail.fils.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: urgencyCfg.bg,
                          color: urgencyCfg.text,
                        }}>
                        <span
                          className="bdot"
                          style={{ background: urgencyCfg.dot }}
                        />
                        {d.urgence}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span
                          className="badge"
                          style={{
                            background: statusCfg.bg,
                            color: statusCfg.text,
                          }}>
                          <span
                            className="bdot"
                            style={{ background: statusCfg.dot }}
                          />
                          {d.statut?.replace(/_/g, " ")}
                        </span>
                        {d.rejet_info && (
                          <span className="text-[10px] text-red-400">
                            Rejet {d.rejet_info.count}x
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                      {new Date(d.dateSignalement).toLocaleString("fr-FR")}
                    </td>
                    <td>
                      <div
                        style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
                        className="justify-center">
                        {(d.statut === "en_attente" || d.statut === "rejetee_apres_validation") && (
                          <>
                            <button
                              className="btn btn-ghost btn-icon"
                              title={d.statut === "rejetee_apres_validation" ? "Re-créer un OT" : "Valider"}
                              onClick={(e) => {
                                handleValider(d.id);
                                e.stopPropagation();
                              }}
                              style={{ color: "var(--status-green-text)" }}>
                              <Check size={14} />
                            </button>
                            {d.statut === "en_attente" && (
                              <button
                                className="btn btn-ghost btn-icon"
                                title="Rejeter"
                                onClick={(e) => {
                                  setModalRejet(d.id);
                                  setMotifRejet("");
                                  e.stopPropagation();
                                }}
                                style={{ color: "var(--status-red-text)" }}>
                                <X size={14} />
                              </button>
                            )}
                          </>
                        )}
                        {d.statut === "validee" &&
                          d.ordres_travail?.length > 0 && (
                            <button
                              className="btn btn-ghost btn-icon"
                              title="Voir OT"
                              onClick={() => navigate("/ordres/ots")}
                              style={{ color: "var(--status-purple-text)" }}>
                              📋
                            </button>
                          )}
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
            disabled={page <= 1}
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
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Modal Rejet */}
      {modalRejet && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}>
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--r)",
              padding: 24,
              maxWidth: 400,
              width: "90%",
            }}>
            <h2 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>
              Motif de rejet
            </h2>
            <textarea
              placeholder="Expliquer pourquoi cette demande est rejetée..."
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value)}
              style={{
                width: "100%",
                minHeight: 100,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r-sm)",
                color: "var(--text-primary)",
                padding: 12,
                fontFamily: "inherit",
                fontSize: 13,
                marginBottom: 16,
                outline: "none",
              }}
            />
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                className="btn btn-outline"
                onClick={() => setModalRejet(null)}>
                Annuler
              </button>
              <button
                className="btn btn-ghost"
                style={{ color: "var(--status-red-text)" }}
                onClick={handleRejeter}>
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}
      <DIDetailDialog
        di={selectedDI}
        open={showDIDialog}
        onOpenChange={setShowDIDialog}
      />
    </div>
  );
}
