import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getActifs, deleteActif } from "../../services/actifService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Search,
  RotateCcw,
  Plus,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  TriangleAlert,
} from "lucide-react";
import FormulaireDemande from "../ordres/FormulaireDemande";

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

export default function ActifUnite() {
  const navigate = useNavigate();
  const [actifs, setActifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [erreur, setErreur] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const [dialogActif, setDialogActif] = useState(null);

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur(null);
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        is_parent: "true",
        my_unite: "true",
      };
      if (search.trim()) params.search = search.trim();
      const res = await getActifs(params);
      if (res.data.results !== undefined) {
        setActifs(res.data.results);
        setTotal(res.data.count);
      } else {
        setActifs(res.data);
        setTotal(res.data.length);
      }
    } catch {
      setErreur("Erreur lors du chargement des actifs");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  // ✅ ICI — manquant dans ta version
  useEffect(() => {
    charger();
  }, [charger]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "Supprimer définitivement cet actif et tous ses sous-actifs ?",
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

  return (
    <div className="page">
      {/* Header */}
      <div className="hdr">
        <div className="hdr-l">
          <h1>Actifs racines</h1>
          <p>Équipements et infrastructures principaux</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/actifs/nouveau")}>
          <Plus size={14} /> Nouvel actif
        </button>
      </div>

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

      {/* Search */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="search-wrap" style={{ flex: 1 }}>
            <Search size={14} className="search-icon" />
            <Input
              className="search-input"
              placeholder="Rechercher par code, libellé…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e) => e.key === "Enter" && charger()}
            />
          </div>
          <Button
            className="btn btn-ghost btn-icon"
            title="Rafraîchir"
            onClick={charger}>
            <RotateCcw size={13} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="tbl-card">
        <div className="tbl-head">
          <span className="tbl-title">Actifs racines</span>
          <span className="tbl-count">{total}</span>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Libellé</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Site</th>
                <th className="c">Enfants</th>
                <th className="c">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}>
                        <div className="skeleton" style={{ width: "70%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : actifs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    Aucun actif racine trouvé
                  </td>
                </tr>
              ) : (
                actifs.map((actif) => (
                  <tr
                    key={actif.id}
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      navigate(`/actifs/${actif.id}/arborescence`)
                    }>
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
                      {actif.site_detail?.libelle || "—"}
                    </td>
                    <td className="c">
                      <span
                        className="badge"
                        style={{
                          background: actif.sous_actifs?.length
                            ? "var(--status-blue-bg)"
                            : "var(--color-elevated)",
                          color: actif.sous_actifs?.length
                            ? "var(--status-blue-text)"
                            : "var(--color-text-muted)",
                          fontWeight: 600,
                        }}>
                        {actif.sous_actifs?.length || 0}
                      </span>
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
                          title="Déclarer une panne"
                          disabled={actionLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDialogActif(actif); // ← ouvre le dialog avec l'actif courant
                          }}>
                          <TriangleAlert size={14} />
                        </button>
                        <button
                          className="act-btn"
                          title="Supprimer"
                          disabled={actionLoading}
                          onClick={(e) => handleDelete(e, actif.id)}
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

      <Dialog
        open={!!dialogActif}
        onOpenChange={(open) => !open && setDialogActif(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Déclarer une panne —{" "}
              <span className="font-mono text-sm font-normal text-muted-foreground">
                {dialogActif?.code}
              </span>
            </DialogTitle>
            <DialogDescription>
              Remplissez le formulaire pour signaler une panne sur cet actif.
            </DialogDescription>
          </DialogHeader>

          {dialogActif && (
            <FormulaireDemande
              defaultActifId={dialogActif.id}
              onClose={() => setDialogActif(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
