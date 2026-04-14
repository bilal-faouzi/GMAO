import { useState, useEffect, useCallback } from "react";
import { getHistoriqueStatuts, getActifs } from "@/services/actif";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Search,
  ArrowRight,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Clock,
  Wrench,
  User,
  Calendar,
  Filter,
  X,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUT_OPTIONS = [
  {
    value: "EN_SERVICE",
    label: "En service",
    icon: CheckCircle2,
    bg: "var(--status-green-bg)",
    text: "var(--status-green-text)",
    dot: "var(--status-green-dot)",
  },
  {
    value: "EN_PANNE",
    label: "En panne",
    icon: XCircle,
    bg: "var(--status-red-bg)",
    text: "var(--status-red-text)",
    dot: "var(--status-red-dot)",
  },
  {
    value: "EN_MAINTENANCE",
    label: "En maintenance",
    icon: Wrench,
    bg: "var(--status-orange-bg)",
    text: "var(--status-orange-text)",
    dot: "var(--status-orange-dot)",
  },
  {
    value: "HORS_SERVICE",
    label: "Hors service",
    icon: PauseCircle,
    bg: "var(--status-stone-bg)",
    text: "var(--status-stone-text)",
    dot: "var(--status-stone-dot)",
  },
  {
    value: "EN_VEILLE",
    label: "En veille",
    icon: Clock,
    bg: "var(--status-purple-bg)",
    text: "var(--status-purple-text)",
    dot: "var(--status-purple-dot)",
  },
];

const ALL = "__all__";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatutBadge({ statut }) {
  const opt = STATUT_OPTIONS.find((s) => s.value === statut);
  if (!opt)
    return (
      <span
        style={{
          fontSize: 11,
          color: "var(--color-text-muted)",
          background: "var(--color-elevated)",
          padding: "2px 8px",
          borderRadius: 999,
        }}>
        {statut}
      </span>
    );
  const Icon = opt.icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 999,
        background: opt.bg,
        color: opt.text,
        fontSize: 11,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: opt.dot,
          flexShrink: 0,
        }}
      />
      {opt.label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HistoriqueStatutsPage() {
  const [historique, setHistorique] = useState([]);
  const [actifs, setActifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [filterActif, setFilterActif] = useState("");
  const [filterAncien, setFilterAncien] = useState("");
  const [filterNouveau, setFilterNouveau] = useState("");
  const [filterDateDeb, setFilterDateDeb] = useState("");
  const [filterDateFin, setFilterDateFin] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getActifs()
      .then((r) => setActifs(r.data?.results ?? r.data ?? []))
      .catch(console.error);
  }, []);

  const fetchHistorique = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterActif) params.actif = filterActif;
      if (filterAncien) params.ancienStatut = filterAncien;
      if (filterNouveau) params.nouveauStatut = filterNouveau;
      if (filterDateDeb) params.dateDebut = filterDateDeb;
      if (filterDateFin) params.dateFin = filterDateFin;

      const res = await getHistoriqueStatuts(params);
      let data = res.data?.results ?? res.data ?? [];

      if (search.trim()) {
        const q = search.toLowerCase();
        data = data.filter(
          (h) =>
            h.idActif?.codeActif?.toLowerCase().includes(q) ||
            h.idActif?.designation?.toLowerCase().includes(q) ||
            h.idUtilisateurNom?.toLowerCase().includes(q),
        );
      }
      setHistorique(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    filterActif,
    filterAncien,
    filterNouveau,
    filterDateDeb,
    filterDateFin,
    search,
  ]);

  useEffect(() => {
    const t = setTimeout(fetchHistorique, 300);
    return () => clearTimeout(t);
  }, [fetchHistorique]);

  const hasFilters = !!(
    filterActif ||
    filterAncien ||
    filterNouveau ||
    filterDateDeb ||
    filterDateFin
  );
  const filterCount = [
    filterActif,
    filterAncien,
    filterNouveau,
    filterDateDeb,
    filterDateFin,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterActif("");
    setFilterAncien("");
    setFilterNouveau("");
    setFilterDateDeb("");
    setFilterDateFin("");
  };

  const stats = {
    total: historique.length,
    enPanne: historique.filter((h) => h.nouveauStatut === "EN_PANNE").length,
    enMaintenance: historique.filter(
      (h) => h.nouveauStatut === "EN_MAINTENANCE",
    ).length,
    enService: historique.filter((h) => h.nouveauStatut === "EN_SERVICE")
      .length,
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="hdr">
        <div className="hdr-l">
          <h1>Historique des statuts</h1>
          <p>Traçabilité de tous les changements d'état des actifs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-chip">
          <strong>{loading ? "—" : stats.total}</strong>&nbsp;changements
        </div>
        <div className="stat-chip">
          <span
            className="dot"
            style={{ background: "var(--status-red-dot)" }}
          />
          <strong>{loading ? "—" : stats.enPanne}</strong>&nbsp;pannes
        </div>
        <div className="stat-chip">
          <span
            className="dot"
            style={{ background: "var(--status-orange-dot)" }}
          />
          <strong>{loading ? "—" : stats.enMaintenance}</strong>
          &nbsp;maintenances
        </div>
        <div className="stat-chip">
          <span
            className="dot"
            style={{ background: "var(--status-green-dot)" }}
          />
          <strong>{loading ? "—" : stats.enService}</strong>&nbsp;retours
          service
        </div>
      </div>

      {/* Filtres */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="search-wrap" style={{ flex: 1 }}>
            <Search size={14} className="search-icon" />
            <Input
              className="search-input"
              placeholder="Code actif, désignation, utilisateur…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
          </div>

          <Button
            className={`pill ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters((v) => !v)}>
            <Filter size={11} />
            Filtres avancés
            {hasFilters && <span className="pill-count">{filterCount}</span>}
          </Button>

          {hasFilters && (
            <Button className="pill" onClick={clearFilters}>
              <X size={11} /> Effacer
            </Button>
          )}

          <Button
            className="btn btn-ghost btn-icon"
            style={{ marginLeft: "auto" }}
            title="Rafraîchir"
            onClick={fetchHistorique}>
            <RefreshCw size={13} />
          </Button>
        </div>

        {showFilters && (
          <div className="filters-exp">
            {/* Actif */}
            <Select
              value={filterActif || ALL}
              onValueChange={(v) => setFilterActif(v === ALL ? "" : v)}>
              <SelectTrigger className="sel-mini">
                <SelectValue placeholder="Tous les actifs" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value={ALL}>Tous les actifs</SelectItem>
                {actifs.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.codeActif} — {a.designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Ancien statut */}
            <Select
              value={filterAncien || ALL}
              onValueChange={(v) => setFilterAncien(v === ALL ? "" : v)}>
              <SelectTrigger className="sel-mini">
                <SelectValue placeholder="Ancien statut" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value={ALL}>Tous les statuts</SelectItem>
                {STATUT_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Nouveau statut */}
            <Select
              value={filterNouveau || ALL}
              onValueChange={(v) => setFilterNouveau(v === ALL ? "" : v)}>
              <SelectTrigger className="sel-mini">
                <SelectValue placeholder="Nouveau statut" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value={ALL}>Tous les statuts</SelectItem>
                {STATUT_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date début */}
            <Input
              type="date"
              className="sel-mini"
              style={{ color: "var(--text-secondary)" }}
              value={filterDateDeb}
              onChange={(e) => setFilterDateDeb(e.target.value)}
            />

            {/* Date fin */}
            <Input
              type="date"
              className="sel-mini"
              style={{ color: "var(--text-secondary)" }}
              value={filterDateFin}
              onChange={(e) => setFilterDateFin(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="tbl-card">
        <div className="tbl-head">
          <span className="tbl-title">Historique des changements</span>
          <span className="tbl-count">
            {loading ? "Chargement…" : `${historique.length} entrée(s)`}
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 150 }}>Date / Heure</th>
                <th style={{ width: 130 }}>Code actif</th>
                <th>Désignation</th>
                <th style={{ width: 150 }}>Ancien statut</th>
                <th style={{ width: 24, padding: 0 }} />
                <th style={{ width: 150 }}>Nouveau statut</th>
                <th style={{ width: 160 }}>Utilisateur</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}>
                        <div className="skeleton" style={{ width: "70%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : historique.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    Aucun historique trouvé
                  </td>
                </tr>
              ) : (
                historique.map((entry) => (
                  <tr key={entry.id}>
                    {/* Date */}
                    <td>
                      <span
                        className="code-mono"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 12,
                        }}>
                        <Calendar
                          size={12}
                          style={{ color: "var(--text-muted)", flexShrink: 0 }}
                        />
                        {formatDate(entry.dateChangement)}
                      </span>
                    </td>

                    {/* Code actif */}
                    <td>
                      <span
                        className="code-mono"
                        style={{ fontSize: 12, fontWeight: 600 }}>
                        {entry.idActif?.codeActif ?? entry.idActif ?? "—"}
                      </span>
                    </td>

                    {/* Désignation */}
                    <td className="desig" style={{ fontSize: 13 }}>
                      {entry.idActif?.designation ?? "—"}
                    </td>

                    {/* Ancien statut */}
                    <td>
                      <StatutBadge statut={entry.ancienStatut} />
                    </td>

                    {/* Flèche */}
                    <td style={{ padding: 0, textAlign: "center" }}>
                      <ArrowRight
                        size={13}
                        style={{ color: "var(--color-text-muted)" }}
                      />
                    </td>

                    {/* Nouveau statut */}
                    <td>
                      <StatutBadge statut={entry.nouveauStatut} />
                    </td>

                    {/* Utilisateur */}
                    <td>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          color: "var(--text-secondary)",
                        }}>
                        <User size={12} style={{ flexShrink: 0 }} />
                        {entry.idUtilisateurNom ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
