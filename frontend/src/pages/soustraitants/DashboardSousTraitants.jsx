import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardSousTraitants } from "../../services/soustraitantService";
import { Users } from "lucide-react";

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

export default function DashboardSousTraitants() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardSousTraitants()
      .then((res) => {
        const items = res.data.data || res.data.results || res.data;
        const total = items.length;
        const actifs = items.filter((s) => s.statut === "actif").length;
        const suspendus = items.filter((s) => s.statut === "suspendu").length;
        const inactifs = items.filter((s) => s.statut === "inactif").length;
        const recents = [...items]
          .sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation))
          .slice(0, 5);
        setData({ total, actifs, suspendus, inactifs, recents });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l">
            <h1>Dashboard Sous-Traitants</h1>
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

  return (
    <div className="page">
      {/* Header */}
      <div className="hdr">
        <div className="hdr-l">
          <h1>Dashboard Sous-Traitants</h1>
          <p>Vue d'ensemble des prestataires</p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => navigate("/soustraitants")}>
          <Users size={14} /> Liste sous-traitants
        </button>
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
            Total sous-traitants
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
            prestataires enregistrés
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
            Actifs
          </p>
          <p
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "var(--status-green-text)",
              lineHeight: 1.1,
            }}>
            {data.actifs}
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--status-green-text)",
              marginTop: 8,
            }}>
            en service
          </p>
        </div>
        <div
          style={{
            background:
              data.suspendus > 0 ? "var(--status-red-bg)" : "var(--bg-surface)",
            border: `1px solid ${data.suspendus > 0 ? "var(--status-red-dot)22" : "var(--border-subtle)"}`,
            borderRadius: "var(--r)",
            padding: "18px 20px",
          }}>
          <p
            style={{
              fontSize: 12,
              color:
                data.suspendus > 0
                  ? "var(--status-red-text)"
                  : "var(--text-muted)",
              marginBottom: 4,
            }}>
            Suspendus
          </p>
          <p
            style={{
              fontSize: 32,
              fontWeight: 700,
              color:
                data.suspendus > 0
                  ? "var(--status-red-text)"
                  : "var(--text-primary)",
              lineHeight: 1.1,
            }}>
            {data.suspendus}
          </p>
          <p
            style={{
              fontSize: 12,
              color:
                data.suspendus > 0
                  ? "var(--status-red-text)"
                  : "var(--text-muted)",
              marginTop: 8,
            }}>
            {data.suspendus > 0 ? "contrats suspendus" : "aucun suspendu"}
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
            Inactifs
          </p>
          <p
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.1,
            }}>
            {data.inactifs}
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginTop: 8,
            }}>
            hors service
          </p>
        </div>
      </div>

      {/* Sous-traitants récents */}
      <div className="tbl-card" style={{ padding: "18px 22px" }}>
        <div
          className="tbl-head"
          style={{
            padding: 0,
            paddingBottom: 14,
            borderBottom: "1px solid var(--border-subtle)",
          }}>
          <span className="tbl-title">Derniers sous-traitants ajoutés</span>
        </div>
        {data.recents.length === 0 ? (
          <p className="empty">Aucun sous-traitant</p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginTop: 12,
            }}>
            {data.recents.map((st) => {
              const cfg = STATUT_CONFIG[st.statut] || STATUT_CONFIG.inactif;
              return (
                <div
                  key={st.id}
                  onClick={() => navigate(`/soustraitants/${st.id}`)}
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
                    <p style={{ fontWeight: 600, fontSize: 13 }}>
                      {st.raisonSociale}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginTop: 1,
                      }}>
                      {st.contactPrincipalNom || "—"} ·{" "}
                      {st.dateCreation
                        ? new Date(st.dateCreation).toLocaleDateString("fr-FR")
                        : ""}
                    </p>
                  </div>
                  <span
                    className="badge"
                    style={{ background: cfg.bg, color: cfg.text }}>
                    <span className="bdot" style={{ background: cfg.dot }} />
                    {st.statut}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <button
          className="btn btn-outline"
          onClick={() => navigate("/soustraitants")}
          style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
          Voir tous les sous-traitants
        </button>
      </div>
    </div>
  );
}
