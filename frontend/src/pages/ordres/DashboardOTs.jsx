import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardOT } from "../../services/ordreService";
import { Plus, List } from "lucide-react";

const STATUT_CONFIG = {
  EN_COURS: {
    bg: "var(--status-orange-bg)",
    text: "var(--status-orange-text)",
    label: "En cours",
  },
  DEPANNE: {
    bg: "var(--status-orange-bg)",
    text: "var(--status-orange-text)",
    label: "Dépanné",
  },
  CLOTURE: {
    bg: "var(--status-green-bg)",
    text: "var(--status-green-text)",
    label: "Clôturé",
  },
  REJETE: {
    bg: "var(--status-red-bg)",
    text: "var(--status-red-text)",
    label: "Rejeté",
  },
};

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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
            gap: 12,
          }}>
          {Array.from({ length: 4 }).map((_, i) => (
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

  const maxNb = Math.max(...(data.par_statut?.map((s) => s.nb) || [1]), 1);

  return (
    <div className="page">
      {/* Header */}
      <div className="hdr">
        <div className="hdr-l">
          <h1>Dashboard Interventions</h1>
          <p>Vue d'ensemble des ordres de travail</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-outline"
            onClick={() => navigate("/ordres/ots")}>
            <List size={14} /> Liste OT
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/ordres/ots/nouveau")}>
            <Plus size={14} /> Nouvel OT
          </button>
        </div>
      </div>

      {/* Cards KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
          gap: 12,
        }}>
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
            Total OT
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
            tous statuts
          </p>
        </div>
        <div
          style={{
            background:
              data.en_retard > 0 ? "var(--status-red-bg)" : "var(--bg-surface)",
            border: `1px solid ${
              data.en_retard > 0
                ? "var(--status-red-dot)22"
                : "var(--border-subtle)"
            }`,
            borderRadius: "var(--r)",
            padding: "18px 20px",
          }}>
          <p
            style={{
              fontSize: 12,
              color:
                data.en_retard > 0
                  ? "var(--status-red-text)"
                  : "var(--text-muted)",
              marginBottom: 4,
            }}>
            En retard
          </p>
          <p
            style={{
              fontSize: 32,
              fontWeight: 700,
              color:
                data.en_retard > 0
                  ? "var(--status-red-text)"
                  : "var(--text-primary)",
              lineHeight: 1.1,
            }}>
            {data.en_retard}
          </p>
          <p
            style={{
              fontSize: 12,
              color:
                data.en_retard > 0
                  ? "var(--status-red-text)"
                  : "var(--text-muted)",
              marginTop: 8,
            }}>
            SLA dépassé
          </p>
        </div>
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
            MTTR
          </p>
          <p
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "var(--color-primary)",
              lineHeight: 1.1,
            }}>
            {data.mttr}
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-primary)",
              marginTop: 8,
            }}>
            minutes en moyenne
          </p>
        </div>
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
            Taux résolution
          </p>
          <p
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "var(--status-green-text)",
              lineHeight: 1.1,
            }}>
            {data.taux_resolution}%
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--status-green-text)",
              marginTop: 8,
            }}>
            OT clôturés
          </p>
        </div>
      </div>

      {/* Charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
          gap: 12,
        }}>
        {/* Statuts */}
        <div className="tbl-card">
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 16,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}>
            Répartition par statut
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.entries(STATUT_CONFIG).map(([k, v]) => {
              const nb = data.par_statut?.find((s) => s.statut === k)?.nb || 0;
              return (
                <div key={k}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      fontSize: 12,
                    }}>
                    <span style={{ color: v.text }}>{v.label}</span>
                    <span
                      style={{
                        color: "var(--text-primary)",
                        fontWeight: 600,
                      }}>
                      {nb}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 6,
                      background: "var(--bg-elevated)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}>
                    <div
                      style={{
                        height: "100%",
                        background: v.bg,
                        width: `${Math.round((nb / maxNb) * 100)}%`,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Récents */}
        <div className="tbl-card">
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 16,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}>
            Derniers OT créés
          </h3>
          {data.ots_recents?.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                padding: "20px 0",
              }}>
              Aucun OT
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.ots_recents?.map((ot) => {
                const cfg = STATUT_CONFIG[ot.statut];
                return (
                  <div
                    key={ot.id}
                    onClick={() => navigate(`/ordres/ots/${ot.id}`)}
                    style={{
                      padding: "12px 14px",
                      background: "var(--bg-elevated)",
                      borderRadius: "var(--r-sm)",
                      cursor: "pointer",
                      transition: "background 0.2s",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-surface)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "var(--bg-elevated)")
                    }>
                    <div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          marginBottom: 4,
                        }}>
                        {ot.numero}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {ot.actif_detail?.code}
                      </p>
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: cfg.bg,
                        color: cfg.text,
                        fontSize: 11,
                      }}>
                      {ot.statut?.replace(/_/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
