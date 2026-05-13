import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getActif,
  getHistoriqueStatut,
  getIndisponibilites,
  getRemplacements,
} from "../../services/actifService";
import { ArrowLeft, Pencil, ArrowRight, Calendar, User } from "lucide-react";

//  Config 

const STATUT_CONFIG = {
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
    label: "Maintenance",
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

function StatutBadge({ statut }) {
  const cfg = STATUT_CONFIG[statut] || {
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

//  Info Row 

function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      <span
        style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
        {value || "—"}
      </span>
    </div>
  );
}

//  Main 

export default function DetailActif() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [actif, setActif] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [indisponibilites, setIndispos] = useState([]);
  const [remplacements, setRemplace] = useState([]);
  const [onglet, setOnglet] = useState("historique");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const charger = async () => {
      try {
        const [a, h, i, r] = await Promise.all([
          getActif(id),
          getHistoriqueStatut(id),
          getIndisponibilites(id),
          getRemplacements(id),
        ]);
        setActif(a.data);
        setHistorique(h.data.results || h.data);
        setIndispos(i.data.results || i.data);
        setRemplace(r.data.results || r.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    charger();
  }, [id]);

  if (loading)
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l">
            <h1>Chargement…</h1>
          </div>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r)",
                padding: 20,
              }}>
              {Array.from({ length: 5 }).map((_, j) => (
                <div
                  key={j}
                  className="skeleton"
                  style={{
                    width: `${50 + j * 10}%`,
                    height: 14,
                    marginBottom: 12,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );

  if (!actif)
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
          Actif introuvable.
        </div>
      </div>
    );

  const onglets = [
    { key: "historique", label: `Historique statut (${historique.length})` },
    {
      key: "indisponibilites",
      label: `Indisponibilités (${indisponibilites.length})`,
    },
    { key: "remplacements", label: `Remplacements (${remplacements.length})` },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div className="hdr">
        <div
          className="hdr-l"
          style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => navigate("/actifs")}
              title="Retour">
              <ArrowLeft size={16} />
            </button>
            <h1 style={{ fontFamily: "var(--font-mono)" }}>{actif.code}</h1>
            <StatutBadge statut={actif.statut} />
          </div>

          {/* Breadcrumb hiérarchique */}
          {actif.chemin_hierarchique?.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexWrap: "wrap",
                marginLeft: 42,
              }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Hiérarchie :
              </span>
              {actif.chemin_hierarchique.map((p, i) => (
                <span
                  key={p.id}
                  style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span
                    onClick={() => navigate(`/actifs/${p.id}`)}
                    className="code-mono"
                    style={{
                      cursor: "pointer",
                      padding: "1px 6px",
                      borderRadius: 4,
                      background: "var(--bg-elevated)",
                      transition: "color .15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--color-primary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-secondary)")
                    }>
                    {p.code}
                  </span>
                  <ArrowRight
                    size={10}
                    style={{ color: "var(--text-muted)" }}
                  />
                </span>
              ))}
              <span
                className="code-mono"
                style={{
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "var(--color-primary-soft)",
                  color: "var(--color-primary)",
                }}>
                {actif.code}
              </span>
            </div>
          )}
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate(`/actifs/${id}/modifier`)}>
          <Pencil size={13} /> Modifier
        </button>
      </div>

      {/* Info cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Informations générales */}
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 12,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Informations générales</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <InfoRow label="Libellé" value={actif.libelle} />
            <InfoRow label="Type" value={actif.type} />
            <InfoRow label="Fabricant" value={actif.fabricant} />
            <InfoRow label="Modèle" value={actif.modele} />
            <InfoRow label="N° Série" value={actif.numSerie} />
            <InfoRow label="Acquisition" value={actif.dateAcquisition} />
            <InfoRow
              label="Valeur"
              value={actif.valeur ? `${actif.valeur} MAD` : null}
            />
          </div>
        </div>

        {/* Localisation & Disponibilité */}
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 12,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Localisation & Disponibilité</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <InfoRow label="Site" value={actif.site_detail?.libelle} />
            <InfoRow label="Unité" value={actif.unite_detail?.libelle} />
            <InfoRow
              label="Durée de vie"
              value={actif.duree_vie ? `${actif.duree_vie} jours` : null}
            />
            <InfoRow
              label="Taux dispo (30j)"
              value={
                actif.taux_disponibilite != null
                  ? `${actif.taux_disponibilite} %`
                  : null
              }
            />
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="tbl-card">
        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border-subtle)",
          }}>
          {onglets.map((o) => (
            <button
              key={o.key}
              onClick={() => setOnglet(o.key)}
              style={{
                padding: "11px 18px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                color:
                  onglet === o.key
                    ? "var(--color-primary)"
                    : "var(--text-muted)",
                borderBottom:
                  onglet === o.key
                    ? "2px solid var(--color-primary)"
                    : "2px solid transparent",
                background: "transparent",
                border: "none",
                borderBottomStyle: "solid",
                transition: "all .15s",
                fontFamily: "var(--font-sans)",
              }}
              onMouseEnter={(e) => {
                if (onglet !== o.key)
                  e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                if (onglet !== o.key)
                  e.currentTarget.style.color = "var(--text-muted)";
              }}>
              {o.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 4 }}>
          {/* Historique statut */}
          {onglet === "historique" &&
            (historique.length === 0 ? (
              <p className="empty">Aucun historique</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Ancien statut</th>
                    <th>Nouveau statut</th>
                    <th>Motif</th>
                    <th>Modifié par</th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map((h) => (
                    <tr key={h.id}>
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
                            style={{ color: "var(--text-muted)" }}
                          />
                          {formatDate(h.dateChangement)}
                        </span>
                      </td>
                      <td>
                        <StatutBadge statut={h.ancienStatut} />
                      </td>
                      <td>
                        <StatutBadge statut={h.nouveauStatut} />
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        {h.motif || "—"}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 13,
                            color: "var(--text-secondary)",
                          }}>
                          <User size={12} />
                          {h.modifiePar_detail
                            ? `${h.modifiePar_detail.prenom} ${h.modifiePar_detail.nom}`
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}

          {/* Indisponibilités */}
          {onglet === "indisponibilites" &&
            (indisponibilites.length === 0 ? (
              <p className="empty">Aucune indisponibilité</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Début</th>
                    <th>Fin</th>
                    <th>Durée (h)</th>
                    <th>Terminée</th>
                  </tr>
                </thead>
                <tbody>
                  {indisponibilites.map((i) => (
                    <tr key={i.id}>
                      <td style={{ fontSize: 13 }}>{i.type}</td>
                      <td>
                        <span className="code-mono" style={{ fontSize: 12 }}>
                          {formatDate(i.dateDebut)}
                        </span>
                      </td>
                      <td>
                        <span className="code-mono" style={{ fontSize: 12 }}>
                          {i.dateFin ? formatDate(i.dateFin) : "—"}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>{i.duree_heures ?? "—"}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: i.estTerminee
                              ? "var(--status-green-bg)"
                              : "var(--status-red-bg)",
                            color: i.estTerminee
                              ? "var(--status-green-text)"
                              : "var(--status-red-text)",
                          }}>
                          {i.estTerminee ? "Oui" : "Non"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}

          {/* Remplacements */}
          {onglet === "remplacements" &&
            (remplacements.length === 0 ? (
              <p className="empty">Aucun remplacement</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Remplacé par</th>
                    <th>Motif</th>
                    <th>Effectué par</th>
                  </tr>
                </thead>
                <tbody>
                  {remplacements.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="code-mono" style={{ fontSize: 12 }}>
                          {r.dateRemplacement}
                        </span>
                      </td>
                      <td>
                        <span className="code-mono" style={{ fontWeight: 600 }}>
                          {r.actifRemplacant_detail?.code}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        {r.motif || "—"}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        {r.effectuePar || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
        </div>
      </div>
    </div>
  );
}
