import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardOT } from "../../services/ordreService";
import {
  List,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  TrendingUp,
  Clock,
  Activity,
  CalendarDays,
  Zap,
  BarChart3,
  Wrench,
  ChevronRight,
  Building2,
  Users,
} from "lucide-react";

const STATUT_CONFIG = {
  EN_COURS: {
    bg: "var(--status-orange-bg)",
    text: "var(--status-orange-text)",
    dot: "var(--status-orange-dot)",
    label: "En cours",
  },
  DEPANNE: {
    bg: "var(--status-orange-bg)",
    text: "var(--status-orange-text)",
    dot: "var(--status-orange-dot)",
    label: "Dépanné",
  },
  CLOTURE: {
    bg: "var(--status-green-bg)",
    text: "var(--status-green-text)",
    dot: "var(--status-green-dot)",
    label: "Clôturé",
  },
  REJETE: {
    bg: "var(--status-red-bg)",
    text: "var(--status-red-text)",
    dot: "var(--status-red-dot)",
    label: "Rejeté",
  },
};

const PRIORITE_CONFIG = {
  critique: {
    label: "Critique",
    bg: "var(--status-red-bg)",
    text: "var(--status-red-text)",
    dot: "var(--status-red-dot)",
    icon: AlertTriangle,
  },
  haute: {
    label: "Haute",
    bg: "var(--status-orange-bg)",
    text: "var(--status-orange-text)",
    dot: "var(--status-orange-dot)",
    icon: Zap,
  },
  normale: {
    label: "Normale",
    bg: "var(--status-blue-bg)",
    text: "var(--status-blue-text)",
    dot: "var(--status-blue-dot)",
    icon: Activity,
  },
  basse: {
    label: "Basse",
    bg: "var(--status-gray-bg)",
    text: "var(--status-gray-text)",
    dot: "var(--status-gray-dot)",
    icon: Clock,
  },
};

const KPI_CARD = ({ icon: Icon, label, value, sub, colorVar, alert }) => (
  <div
    className="rounded-xl border p-5 transition hover:shadow-md"
    style={{
      background: alert ? "var(--status-red-bg)" : "var(--bg-surface)",
      borderColor: alert ? "var(--status-red-dot)22" : "var(--border-subtle)",
    }}>
    <div className="flex items-center gap-2 mb-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{
          background: alert ? "var(--status-red-dot)18" : `${colorVar}18`,
        }}>
        <Icon
          size={16}
          style={{ color: alert ? "var(--status-red-text)" : colorVar }}
        />
      </div>
      <span
        className="text-xs font-medium uppercase tracking-wider"
        style={{
          color: alert ? "var(--status-red-text)" : "var(--text-muted)",
        }}>
        {label}
      </span>
    </div>
    <p
      className="text-3xl font-bold"
      style={{
        color: alert ? "var(--status-red-text)" : "var(--text-primary)",
        lineHeight: 1.1,
      }}>
      {value}
    </p>
    {sub && (
      <p
        className="text-xs mt-2"
        style={{
          color: alert ? "var(--status-red-text)" : "var(--text-muted)",
        }}>
        {sub}
      </p>
    )}
  </div>
);

export default function DashboardOTs() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardOT()
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l">
            <h1>Dashboard Interventions</h1>
            <p>Chargement…</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-border-subtle rounded-xl p-5 animate-pulse">
              <div className="h-3 bg-hover rounded w-1/2 mb-3" />
              <div className="h-8 bg-hover rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );

  if (!data)
    return (
      <div className="page">
        <div className="bg-danger-soft text-danger rounded-lg p-3 text-sm">
          Erreur de chargement du dashboard.
        </div>
      </div>
    );

  const maxStatut = Math.max(...(data.par_statut?.map((s) => s.nb) || [1]), 1);
  const maxPriorite = Math.max(
    ...(data.par_priorite?.map((s) => s.nb) || [1]),
    1,
  );

  return (
    <div className="page">
      {/* Header */}
      <div className="hdr">
        <div className="hdr-l">
          <h1>Dashboard Interventions</h1>
          <p className="text-text-muted text-sm">
            Vue d'ensemble des ordres de travail et demandes
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => navigate("/ordres/ots")}>
          <List size={14} /> Liste OT
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KPI_CARD
          icon={ClipboardList}
          label="Total OT"
          value={data.total}
          sub={`+${data.ot_jour} aujourd'hui, +${data.ot_semaine} cette semaine`}
          colorVar="var(--color-primary)"
        />
        <KPI_CARD
          icon={Activity}
          label="En cours"
          value={data.en_cours}
          sub="OT actifs"
          colorVar="var(--status-orange-text)"
        />
        <KPI_CARD
          icon={AlertTriangle}
          label="En retard"
          value={data.en_retard}
          sub="SLA dépassé"
          colorVar="var(--status-red-text)"
          alert={data.en_retard > 0}
        />
        <KPI_CARD
          icon={CheckCircle}
          label="Clôturés"
          value={data.clotures}
          sub="Interventions terminées"
          colorVar="var(--status-green-text)"
        />
        <KPI_CARD
          icon={Timer}
          label="MTTR"
          value={`${data.mttr} min`}
          sub="Temps moyen de résolution"
          colorVar="var(--status-blue-text)"
        />
        <KPI_CARD
          icon={TrendingUp}
          label="Taux résolution"
          value={`${data.taux_resolution}%`}
          sub="OT clôturés / total"
          colorVar="var(--status-green-text)"
        />
      </div>

      {/* ── Row 2 : Stats & Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Par statut */}
        <div className="bg-surface rounded-xl border border-border p-5 shadow-card">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border-subtle">
            <BarChart3 size={16} className="text-text-muted" />
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
              Répartition par statut
            </h3>
          </div>
          <div className="flex flex-col gap-4">
            {Object.entries(STATUT_CONFIG).map(([k, v]) => {
              const nb = data.par_statut?.find((s) => s.statut === k)?.nb || 0;
              const pct = data.total ? Math.round((nb / data.total) * 100) : 0;
              return (
                <div key={k}>
                  <div className="flex justify-between items-center mb-1.5 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: v.dot }}
                      />
                      <span style={{ color: v.text }}>{v.label}</span>
                    </span>
                    <span className="font-semibold text-text">
                      {nb}{" "}
                      <span className="text-text-muted font-normal">
                        ({pct}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((nb / maxStatut) * 100)}%`,
                        background: v.dot,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Par priorité */}
        <div className="bg-surface rounded-xl border border-border p-5 shadow-card">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border-subtle">
            <Zap size={16} className="text-text-muted" />
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
              Répartition par priorité
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(PRIORITE_CONFIG).map(([k, v]) => {
              const nb =
                data.par_priorite?.find((p) => p.priorite === k)?.nb || 0;
              const Icon = v.icon;
              return (
                <div
                  key={k}
                  className="rounded-lg  p-3 transition hover:shadow-sm cursor-pointer"
                  style={{
                    background: v.bg,
                    borderColor: v.dot + "30",
                  }}
                  onClick={() => navigate(`/ordres/ots?priorite=${k}`)}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} style={{ color: v.dot }} />
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: v.text }}>
                      {v.label}
                    </span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: v.text }}>
                    {nb}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: v.text }}>
                    OT
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top équipes */}
        <div className="bg-surface rounded-xl border border-border p-5 shadow-card">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border-subtle">
            <Users size={16} className="text-text-muted" />
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
              Top équipes actives
            </h3>
          </div>
          {data.par_equipe?.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-6">
              Aucune équipe assignée
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.par_equipe?.map((eq, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-elevated border border-border-subtle">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: "var(--color-primary-soft)",
                        color: "var(--color-primary)",
                      }}>
                      {i + 1}
                    </span>
                    <span className="text-sm text-text">
                      {eq.idEquipe__libelle || "Équipe"}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-text">
                    {eq.nb} OT
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3 : Recent OTs + Demandes en attente ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Derniers OT */}
        <div className="bg-surface rounded-xl border border-border p-5 shadow-card">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-text-muted" />
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
                Derniers OT créés
              </h3>
            </div>
            <button
              onClick={() => navigate("/ordres/ots")}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: "var(--color-primary)" }}>
              Voir tout <ChevronRight size={12} />
            </button>
          </div>
          {data.ots_recents?.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">Aucun OT</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.ots_recents?.map((ot) => {
                const cfg = STATUT_CONFIG[ot.statut];
                return (
                  <div
                    key={ot.id}
                    onClick={() => navigate(`/ordres/ots/${ot.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg bg-elevated border border-border-subtle cursor-pointer transition hover:bg-surface hover:border-primary/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "var(--color-primary-soft)" }}>
                        <Wrench
                          size={14}
                          style={{ color: "var(--color-primary)" }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text truncate">
                          {ot.numero}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {ot.actif_detail?.code} — {ot.actif_detail?.libelle}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {ot.priorite && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            background:
                              PRIORITE_CONFIG[ot.priorite]?.bg ||
                              "var(--bg-elevated)",
                            color:
                              PRIORITE_CONFIG[ot.priorite]?.text ||
                              "var(--text-muted)",
                          }}>
                          {PRIORITE_CONFIG[ot.priorite]?.label || ot.priorite}
                        </span>
                      )}
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: cfg?.bg || "var(--bg-elevated)",
                          color: cfg?.text || "var(--text-muted)",
                        }}>
                        {cfg?.label || ot.statut}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Demandes en attente */}
        <div className="bg-surface rounded-xl border border-border p-5 shadow-card">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-text-muted" />
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
                Demandes en attente
              </h3>
              {data.demandes_attente > 0 && (
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                  style={{
                    background: "var(--status-red-bg)",
                    color: "var(--status-red-text)",
                  }}>
                  {data.demandes_attente}
                </span>
              )}
            </div>
            <button
              onClick={() => navigate("/ordres/demandes")}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: "var(--color-primary)" }}>
              Voir tout <ChevronRight size={12} />
            </button>
          </div>
          {data.demandes_recentes?.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "var(--bg-elevated)" }}>
                <CheckCircle size={20} className="text-success" />
              </div>
              <p className="text-sm font-medium text-text-secondary">
                Aucune demande en attente
              </p>
              <p className="text-xs text-text-muted mt-1">
                Toutes les demandes sont traitées
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {data.demandes_recentes?.map((d) => {
                const ur =
                  PRIORITE_CONFIG[d.urgence] || PRIORITE_CONFIG.normale;
                return (
                  <div
                    key={d.id}
                    onClick={() => navigate(`/ordres/demandes/${d.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg bg-elevated border border-border-subtle cursor-pointer transition hover:bg-surface hover:border-primary/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: ur.bg }}>
                        <AlertTriangle size={14} style={{ color: ur.text }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text truncate">
                          {d.numero}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {d.titre || "(Sans titre)"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{
                          background: ur.bg,
                          color: ur.text,
                        }}>
                        {ur.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4 : Top unités + Activité ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top unités */}
        <div className="bg-surface rounded-xl border border-border p-5 shadow-card">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border-subtle">
            <Building2 size={16} className="text-text-muted" />
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
              Top unités concernées
            </h3>
          </div>
          {data.par_unite?.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-6">
              Aucune donnée
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.par_unite?.map((u, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-text-muted w-4">{i + 1}</span>
                  <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((u.nb / (data.par_unite[0]?.nb || 1)) * 100)}%`,
                        background: "var(--color-primary)",
                      }}
                    />
                  </div>
                  <span className="text-xs text-text-muted w-20 text-right truncate">
                    {u.idActif__idUnite__libelle || "Unité"}
                  </span>
                  <span className="text-xs font-semibold text-text w-8 text-right">
                    {u.nb}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Résumé activité */}
        <div className="bg-surface rounded-xl border border-border p-5 shadow-card">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border-subtle">
            <CalendarDays size={16} className="text-text-muted" />
            <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
              Activité récente
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg  bg-elevated text-center">
              <p className="text-2xl font-bold text-text">{data.ot_jour}</p>
              <p className="text-xs text-text-muted mt-1">
                OT créés aujourd'hui
              </p>
            </div>
            <div className="p-4 rounded-lg  bg-elevated text-center">
              <p className="text-2xl font-bold text-text">{data.ot_semaine}</p>
              <p className="text-xs text-text-muted mt-1">
                OT créés cette semaine
              </p>
            </div>
            <div className="p-4 rounded-lg  bg-elevated text-center">
              <p className="text-2xl font-bold text-text">
                {data.demandes_attente}
              </p>
              <p className="text-xs text-text-muted mt-1">
                Demandes en attente
              </p>
            </div>
            <div className="p-4 rounded-lg  bg-elevated text-center">
              <p className="text-2xl font-bold text-danger">{data.rejetes}</p>
              <p className="text-xs text-text-muted mt-1">OT rejetés</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
