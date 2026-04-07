import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboard } from "../../services/actifService";
import { Plus, ArrowRight, Package, BarChart2, Activity } from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUT_CONFIG = {
  actif: {
    label: "Actifs",
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
    label: "Retirés",
    bg: "var(--status-gray-bg)",
    text: "var(--status-gray-text)",
    dot: "var(--status-gray-dot)",
  },
};

export default function DashboardActifs() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l">
            <h1>Dashboard Actifs</h1>
            <p>Chargement…</p>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
            gap: 16,
          }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r)",
                padding: 20,
              }}>
              <div
                className="skeleton"
                style={{ width: "60%", height: 14, marginBottom: 12 }}
              />
              <div className="skeleton" style={{ width: "40%", height: 32 }} />
            </div>
          ))}
        </div>
      </div>
    );

  if (!data)
    return (
      <div className="page">
        <div
          style={{
            background: "var(--status-red-bg)",
            color: "var(--status-red-text)",
            padding: "12px 16px",
            borderRadius: "var(--r-sm)",
            fontSize: 13,
          }}>
          Erreur de chargement.
        </div>
      </div>
    );

  const getStatutNb = (statut) =>
    data.par_statut.find((s) => s.statut === statut)?.nb || 0;
  const maxNb = Math.max(...data.par_statut.map((s) => s.nb), 1);

  return (
    <div className="page">
      {/* Header */}
      <div className="hdr">
        <div className="hdr-l">
          <h1>Dashboard Actifs</h1>
          <p>Vue d'ensemble du parc d'équipements</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate("/actifs")}>
          <Package size={14} /> Liste des actifs
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
          gap: 12,
        }}>
        {/* Total */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--r)",
            padding: "18px 20px",
          }}>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 4,
            }}>
            Total actifs
          </p>
          <p
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.1,
            }}>
            {data.total}
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-primary)",
              marginTop: 8,
            }}>
            <Activity
              size={12}
              style={{
                display: "inline",
                marginRight: 4,
                verticalAlign: "middle",
              }}
            />
            Dispo : {data.taux_disponibilite} %
          </p>
        </div>

        {/* Par statut */}
        {Object.entries(STATUT_CONFIG).map(([key, cfg]) => {
          const nb = getStatutNb(key);
          return (
            <div
              key={key}
              onClick={() => navigate(`/actifs?statut=${key}`)}
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.dot}22`,
                borderRadius: "var(--r)",
                padding: "18px 20px",
                cursor: "pointer",
                transition: "opacity .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = ".85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
              <p style={{ fontSize: 12, color: cfg.text, marginBottom: 4 }}>
                {cfg.label}
              </p>
              <p
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: cfg.text,
                  lineHeight: 1.1,
                }}>
                {nb}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 8,
                }}>
                {data.total ? Math.round((nb / data.total) * 100) : 0} %
              </p>
            </div>
          );
        })}
      </div>

      {/* Grille 2 colonnes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Répartition par statut */}
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Répartition par statut</span>
            <BarChart2 size={14} style={{ color: "var(--text-muted)" }} />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginTop: 16,
            }}>
            {Object.entries(STATUT_CONFIG).map(([key, cfg]) => {
              const nb = getStatutNb(key);
              const pct = Math.round((nb / maxNb) * 100);
              return (
                <div key={key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      marginBottom: 5,
                    }}>
                    <span style={{ color: cfg.text }}>{cfg.label}</span>
                    <span
                      style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                      {nb}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 6,
                      borderRadius: 99,
                      background: "var(--bg-active)",
                    }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: 6,
                        borderRadius: 99,
                        background: cfg.dot,
                        transition: "width .5s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Taux dispo */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid var(--border-subtle)",
            }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                marginBottom: 6,
              }}>
              <span style={{ color: "var(--text-secondary)" }}>
                Taux de disponibilité global
              </span>
              <span
                style={{ color: "var(--status-green-text)", fontWeight: 700 }}>
                {data.taux_disponibilite} %
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 99,
                background: "var(--bg-active)",
              }}>
              <div
                style={{
                  width: `${data.taux_disponibilite}%`,
                  height: 8,
                  borderRadius: 99,
                  background: "var(--status-green-dot)",
                  transition: "width .7s ease",
                }}
              />
            </div>
          </div>
        </div>

        {/* Derniers actifs */}
        <div
          className="tbl-card"
          style={{
            padding: "18px 22px",
            display: "flex",
            flexDirection: "column",
          }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Derniers actifs ajoutés</span>
          </div>

          {data.actifs_recents.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "var(--text-muted)",
                fontSize: 14,
              }}>
              Aucun actif
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginTop: 12,
                flex: 1,
              }}>
              {data.actifs_recents.map((actif) => {
                const cfg = STATUT_CONFIG[actif.statut];
                return (
                  <div
                    key={actif.id}
                    onClick={() => navigate(`/actifs/${actif.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "var(--r-sm)",
                      background: "var(--bg-elevated)",
                      cursor: "pointer",
                      transition: "background .15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "var(--bg-elevated)")
                    }>
                    <div>
                      <p
                        className="code-mono"
                        style={{ fontWeight: 600, fontSize: 12 }}>
                        {actif.code}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          marginTop: 1,
                        }}>
                        {actif.libelle}
                      </p>
                    </div>
                    <span
                      className="badge"
                      style={{ background: cfg?.bg, color: cfg?.text }}>
                      <span className="bdot" style={{ background: cfg?.dot }} />
                      {cfg?.label || actif.statut}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <button
            className="btn btn-outline"
            onClick={() => navigate("/actifs/nouveau")}
            style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
            <Plus size={13} /> Ajouter un actif
          </button>
        </div>
      </div>
    </div>
  );
}
