import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardMagasin, getAlertes } from "../../services/magasinService";
import { Package, Plus } from "lucide-react";

const MOUVEMENT_CONFIG = {
  entree: {
    bg: "var(--status-green-bg)",
    text: "var(--status-green-text)",
    dot: "var(--status-green-dot)",
  },
  sortie: {
    bg: "var(--status-red-bg)",
    text: "var(--status-red-text)",
    dot: "var(--status-red-dot)",
  },
  ajustement: {
    bg: "var(--status-orange-bg)",
    text: "var(--status-orange-text)",
    dot: "var(--status-orange-dot)",
  },
};

const fmtQty = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? v : n % 1 === 0 ? String(Math.trunc(n)) : String(n);
};

export default function DashboardMagasin() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardMagasin(), getAlertes()])
      .then(([d, a]) => {
        setData(d.data);
        setAlertes(a.data.results || a.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l">
            <h1>Dashboard Magasin</h1>
            <p>Chargement…</p>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
            gap: 12,
          }}>
          {Array.from({ length: 3 }).map((_, i) => (
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
          <h1>Dashboard Magasin</h1>
          <p>Stock des pièces détachées</p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => navigate("/magasin")}>
          <Package size={14} /> Catalogue pièces
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
            Total pièces
          </p>
          <p
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.1,
            }}>
            {data.total_pieces}
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-primary)",
              marginTop: 8,
            }}>
            références actives
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
            Valeur totale stock
          </p>
          <p
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.1,
            }}>
            {Number(data.valeur_totale).toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
            })}
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--status-cyan-text)",
              marginTop: 8,
            }}>
            MAD
          </p>
        </div>
        <div
          style={{
            background:
              data.nb_alertes > 0
                ? "var(--status-red-bg)"
                : "var(--bg-surface)",
            border: `1px solid ${data.nb_alertes > 0 ? "var(--status-red-dot)22" : "var(--border-subtle)"}`,
            borderRadius: "var(--r)",
            padding: "18px 20px",
          }}>
          <p
            style={{
              fontSize: 12,
              color:
                data.nb_alertes > 0
                  ? "var(--status-red-text)"
                  : "var(--text-muted)",
              marginBottom: 4,
            }}>
            Alertes stock
          </p>
          <p
            style={{
              fontSize: 32,
              fontWeight: 700,
              color:
                data.nb_alertes > 0
                  ? "var(--status-red-text)"
                  : "var(--text-primary)",
              lineHeight: 1.1,
            }}>
            {data.nb_alertes}
          </p>
          <p
            style={{
              fontSize: 12,
              color:
                data.nb_alertes > 0
                  ? "var(--status-red-text)"
                  : "var(--text-muted)",
              marginTop: 8,
            }}>
            {data.nb_alertes > 0 ? "pièces sous seuil minimum" : "tout est OK"}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Alertes */}
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Pièces en alerte</span>
          </div>
          {alertes.length === 0 ? (
            <p className="empty">Aucune alerte</p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginTop: 12,
              }}>
              {alertes.slice(0, 8).map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/magasin/${p.id}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "var(--r-sm)",
                    background: "var(--status-red-bg)",
                    border: "1px solid var(--status-red-dot)22",
                    cursor: "pointer",
                    transition: "opacity .15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = ".85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
                  <div>
                    <p
                      className="code-mono"
                      style={{ color: "var(--status-red-text)" }}>
                      {p.reference}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginTop: 1,
                      }}>
                      {p.designation}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--status-red-text)",
                      }}>
                      {fmtQty(p.quantiteStock)} {p.unite}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      min: {fmtQty(p.seuilMinimum)} {p.unite}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Derniers mouvements */}
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
            <span className="tbl-title">Derniers mouvements</span>
          </div>
          {data.derniers_mouvements.length === 0 ? (
            <p className="empty">Aucun mouvement</p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginTop: 12,
                flex: 1,
              }}>
              {data.derniers_mouvements.map((m) => {
                const cfg =
                  MOUVEMENT_CONFIG[m.typeMouvement] ||
                  MOUVEMENT_CONFIG.ajustement;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "var(--r-sm)",
                      background: "var(--bg-elevated)",
                      transition: "background .15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "var(--bg-elevated)")
                    }
                    onClick={() => navigate(`/magasin/${m.piece_detail?.id}`)}>
                    <div>
                      <p
                        className="code-mono"
                        style={{ fontWeight: 600, fontSize: 12 }}>
                        {m.piece_detail?.reference}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          marginTop: 1,
                        }}>
                        {new Date(m.dateHeure).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        className="badge"
                        style={{ background: cfg.bg, color: cfg.text }}>
                        <span
                          className="bdot"
                          style={{ background: cfg.dot }}
                        />
                        {m.typeMouvement}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}>
                        {fmtQty(m.quantite)} {m.piece_detail?.unite}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button
            className="btn btn-outline"
            onClick={() => navigate("/magasin/nouveau")}
            style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
            <Plus size={13} /> Ajouter une pièce
          </button>
        </div>
      </div>
    </div>
  );
}
