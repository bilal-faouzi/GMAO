import { useEffect, useState, useCallback } from "react";
import { RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getJournalAuditv2, getUtilisateurs } from "@/services/securiteService";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  {
    value: "CREATE",
    label: "CREATE",
    bg: "#052e16",
    text: "#4ade80",
    dot: "#22c55e",
  },
  {
    value: "UPDATE",
    label: "UPDATE",
    bg: "#431407",
    text: "#fdba74",
    dot: "#f97316",
  },
  {
    value: "DELETE",
    label: "DELETE",
    bg: "#450a0a",
    text: "#f87171",
    dot: "#ef4444",
  },
  {
    value: "LOGIN",
    label: "LOGIN",
    bg: "#0c1a4b",
    text: "#93c5fd",
    dot: "#3b82f6",
  },
  {
    value: "LOGOUT",
    label: "LOGOUT",
    bg: "#111827",
    text: "#9ca3af",
    dot: "#6b7280",
  },
  {
    value: "FORCE_LOGOUT",
    label: "FORCE_LOGOUT",
    bg: "#1c1917",
    text: "#a8a29e",
    dot: "#78716c",
  },
  {
    value: "ASSIGN_ROLE",
    label: "ASSIGN_ROLE",
    bg: "#2e1065",
    text: "#c4b5fd",
    dot: "#a855f7",
  },
  {
    value: "DEACTIVATE",
    label: "DEACTIVATE",
    bg: "#450a0a",
    text: "#f87171",
    dot: "#ef4444",
  },
];

const ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "FORCE_LOGOUT",
  "ASSIGN_ROLE",
  "DEACTIVATE",
];
const MODULES = [
  "AUTH",
  "UTILISATEURS",
  "ROLES",
  "PERMISSIONS",
  "INTERVENTIONS",
];

const ALL_USERS = "__ALL_USERS__";
const ALL_ACTIONS = "__ALL_ACTIONS__";
const ALL_MODULES = "__ALL_MODULES__";

// ─── ActionBadge ──────────────────────────────────────────────────────────────

function ActionBadge({ action }) {
  const opt = ACTION_OPTIONS.find((a) => a.value === action);
  if (!opt)
    return (
      <span
        className="badge"
        style={{ background: "#1f1f23", color: "#71717a" }}>
        {action}
      </span>
    );
  return (
    <span className="badge" style={{ background: opt.bg, color: opt.text }}>
      <span className="bdot" style={{ background: opt.dot }} />
      {opt.label}
    </span>
  );
}

// ─── UserCell ─────────────────────────────────────────────────────────────────

function UserCell({ entry }) {
  const display =
    entry.utilisateur?.nom_utilisateur ||
    entry.utilisateur?.username ||
    entry.nom_utilisateur ||
    entry.username;

  if (!display)
    return <span style={{ fontSize: 13, color: "var(--text-muted)" }}>—</span>;

  const initials = display
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "#1d4ed8",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
          letterSpacing: "0.03em",
        }}>
        {initials}
      </div>
      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
        {display}
      </span>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function JournalAudit() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]); // liste { id, nom_utilisateur, prenom, nom }

  const [search, setSearch] = useState("");
  const [filterUtilisateur, setFilterUtilisateur] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ── Charger la liste complète des utilisateurs pour le Select ──────────────
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await getUtilisateurs();
        setUsers(res.data?.results || res.data || []);
      } catch {
        toast.error("Erreur lors du chargement des utilisateurs");
      }
    };
    fetchUsers();
  }, []);

  // ── Charger l'audit — filterUtilisateur est maintenant dans les deps ────────
  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: String(page), page_size: "10" };
      if (search) params.search = search;
      if (filterUtilisateur) params.utilisateur = filterUtilisateur; // ← nom_utilisateur envoyé au backend
      if (filterAction) params.action = filterAction;
      if (filterModule) params.module = filterModule;
      if (dateDebut) params.date_debut = dateDebut;
      if (dateFin) params.date_fin = dateFin;

      const res = await getJournalAuditv2(params);
      setEntries(res.data?.results ?? []);
      setTotalPages(res.data?.total_pages ?? 1);
    } catch {
      toast.error("Erreur lors du chargement de l'audit");
    } finally {
      setLoading(false);
    }
    // ← filterUtilisateur ajouté ici — c'était le bug
  }, [
    page,
    search,
    filterUtilisateur,
    filterAction,
    filterModule,
    dateDebut,
    dateFin,
  ]);

  useEffect(() => {
    const t = setTimeout(fetchAudit, 300);
    return () => clearTimeout(t);
  }, [fetchAudit]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const hasFilters = !!(
    filterUtilisateur ||
    filterAction ||
    filterModule ||
    dateDebut ||
    dateFin
  );
  const filterCount = [
    filterUtilisateur,
    filterAction,
    filterModule,
    dateDebut,
    dateFin,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilterUtilisateur("");
    setFilterAction("");
    setFilterModule("");
    setDateDebut("");
    setDateFin("");
    setSearch("");
    setPage(1);
  };

  const creates = entries.filter((e) => e.action === "CREATE").length;
  const updates = entries.filter((e) => e.action === "UPDATE").length;
  const deletes = entries.filter((e) => e.action === "DELETE").length;
  const logins = entries.filter((e) => e.action === "LOGIN").length;

  return (
    <div className="page">
      {/* Header */}
      <div className="hdr">
        <div className="hdr-l">
          <h1>Journal d'Audit</h1>
          <p>Historique des actions de sécurité et d'administration</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-chip">
          <span className="dot" style={{ background: "#22c55e" }} />
          <strong>{creates}</strong> créations
        </div>
        <div className="stat-chip">
          <span className="dot" style={{ background: "#f97316" }} />
          <strong>{updates}</strong> modifications
        </div>
        <div className="stat-chip">
          <span className="dot" style={{ background: "#ef4444" }} />
          <strong>{deletes}</strong> suppressions
        </div>
        <div className="stat-chip">
          <span className="dot" style={{ background: "#3b82f6" }} />
          <strong>{logins}</strong> connexions
        </div>
        <div className="stat-chip">
          <strong>{entries.length}</strong>&nbsp;sur cette page
        </div>
      </div>

      {/* Filtres */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="search-wrap">
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <Input
              className="search-input"
              placeholder="Rechercher par utilisateur ou description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Button
            className={`pill ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters((v) => !v)}>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filtres avancés
            {hasFilters && <span className="pill-count">{filterCount}</span>}
          </Button>

          {hasFilters && (
            <Button className="pill" onClick={resetFilters}>
              ✕ Effacer
            </Button>
          )}

          <Button
            className="btn btn-ghost btn-icon"
            style={{ marginLeft: "auto" }}
            title="Rafraîchir"
            onClick={fetchAudit}>
            <RotateCcw size={13} />
          </Button>
        </div>

        {showFilters && (
          <div className="filters-exp">
            {/* ── Filtre Utilisateur ── */}
            <Select
              value={filterUtilisateur === "" ? ALL_USERS : filterUtilisateur}
              onValueChange={(value) => {
                setFilterUtilisateur(value === ALL_USERS ? "" : value);
                setPage(1);
              }}>
              <SelectTrigger className="sel-mini">
                <SelectValue placeholder="Tous les utilisateurs" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value={ALL_USERS}>Tous les utilisateurs</SelectItem>
                {users.map((u) => (
                  // On envoie nom_utilisateur au backend (icontains sur nom_utilisateur)
                  <SelectItem key={u.id} value={u.nom_utilisateur}>
                    {u.prenom} {u.nom}
                    <span
                      style={{ color: "#6b7280", fontSize: 11, marginLeft: 6 }}>
                      @{u.nom_utilisateur}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* ── Filtre Action ── */}
            <Select
              value={filterAction === "" ? ALL_ACTIONS : filterAction}
              onValueChange={(value) => {
                setFilterAction(value === ALL_ACTIONS ? "" : value);
                setPage(1);
              }}>
              <SelectTrigger className="sel-mini">
                <SelectValue placeholder="Toutes les actions" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value={ALL_ACTIONS}>Toutes les actions</SelectItem>
                {ACTIONS.map((act) => (
                  <SelectItem key={act} value={act}>
                    {act}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* ── Filtre Module ── */}
            <Select
              value={filterModule === "" ? ALL_MODULES : filterModule}
              onValueChange={(value) => {
                setFilterModule(value === ALL_MODULES ? "" : value);
                setPage(1);
              }}>
              <SelectTrigger className="sel-mini">
                <SelectValue placeholder="Tous les modules" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value={ALL_MODULES}>Tous les modules</SelectItem>
                {MODULES.map((mod) => (
                  <SelectItem key={mod} value={mod}>
                    {mod}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* ── Dates ── */}
            <Input
              type="date"
              className="sel-mini"
              style={{ color: "var(--text-secondary)" }}
              value={dateDebut}
              onChange={(e) => {
                setDateDebut(e.target.value);
                setPage(1);
              }}
            />
            <Input
              type="date"
              className="sel-mini"
              style={{ color: "var(--text-secondary)" }}
              value={dateFin}
              onChange={(e) => {
                setDateFin(e.target.value);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="tbl-card">
        <div className="tbl-head">
          <span className="tbl-title">Historique des événements</span>
          <span className="tbl-count">
            {loading ? "Chargement…" : `Page ${page} sur ${totalPages}`}
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 170 }}>Date / Heure</th>
                <th style={{ width: 180 }}>Utilisateur</th>
                <th style={{ width: 150 }}>Action</th>
                <th style={{ width: 130 }}>Module</th>
                <th>Type entité</th>
                <th style={{ width: 130 }}>Adresse IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}>
                        <div className="skeleton" style={{ width: "70%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty">
                    Aucune entrée trouvée
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <span className="code-mono">
                        {entry.horodatage
                          ? new Date(entry.horodatage).toLocaleString()
                          : "—"}
                      </span>
                    </td>
                    <td>
                      <UserCell entry={entry} />
                    </td>
                    <td>
                      <ActionBadge action={entry.action} />
                    </td>
                    <td className="desig">{entry.module}</td>
                    <td
                      style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {entry.type_entite || "—"}
                    </td>
                    <td>
                      <span className="code-mono" style={{ fontSize: 12 }}>
                        {entry.adresse_ip || "—"}
                      </span>
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
    </div>
  );
}
