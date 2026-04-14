import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getSousTraitant,
  deleteSousTraitant,
  changerStatut,
  assignerSpecialite,
  retirerSpecialite,
} from "../../services/soustraitantService";
import { getSpecialites } from "../../services/organisationService";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Phone,
  Mail,
  UserRound,
  Wrench,
  Building2,
  CreditCard,
  ShieldCheck,
  Tags,
  Plus,
  X,
  CalendarDays,
  FileText,
  MapPin,
  Hash,
} from "lucide-react";

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

const STATUT_OPTIONS = ["actif", "inactif", "suspendu"];

export default function DetailSousTraitant() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [st, setSt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [specialitesAll, setSpecialitesAll] = useState([]);
  const [selectedSpec, setSelectedSpec] = useState("");
  const [statutModal, setStatutModal] = useState(false);
  const [nouveauStatut, setNouveauStatut] = useState("");

  const charger = async () => {
    try {
      const [res, specRes] = await Promise.all([
        getSousTraitant(id),
        getSpecialites(),
      ]);
      setSt(res.data.data || res.data);
      setSpecialitesAll(specRes.data.results || specRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Supprimer ce sous-traitant ?")) return;
    try {
      await deleteSousTraitant(id);
      navigate("/soustraitants");
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangerStatut = async () => {
    if (!nouveauStatut || nouveauStatut === st.statut) return;
    try {
      await changerStatut(id, nouveauStatut);
      setStatutModal(false);
      setNouveauStatut("");
      charger();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignerSpec = async () => {
    if (!selectedSpec) return;
    try {
      await assignerSpecialite(id, selectedSpec);
      setSelectedSpec("");
      charger();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRetirerSpec = async (idSpec) => {
    if (!confirm("Retirer cette spécialité ?")) return;
    try {
      await retirerSpecialite(id, idSpec);
      charger();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return (
      <div className="page">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
          }}>
          <div
            className="skeleton"
            style={{ width: 32, height: 32, borderRadius: "var(--r-sm)" }}
          />
          <div
            className="skeleton"
            style={{ width: 200, height: 22, borderRadius: "var(--r-sm)" }}
          />
          <div
            className="skeleton"
            style={{ width: 64, height: 22, borderRadius: 20 }}
          />
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r)",
                padding: 22,
              }}>
              <div
                className="skeleton"
                style={{
                  width: "35%",
                  height: 12,
                  marginBottom: 18,
                  borderRadius: 4,
                }}
              />
              <div
                className="skeleton"
                style={{
                  width: "100%",
                  height: 11,
                  marginBottom: 12,
                  borderRadius: 4,
                }}
              />
              <div
                className="skeleton"
                style={{
                  width: "70%",
                  height: 11,
                  marginBottom: 12,
                  borderRadius: 4,
                }}
              />
              <div
                className="skeleton"
                style={{ width: "85%", height: 11, borderRadius: 4 }}
              />
            </div>
          ))}
        </div>
      </div>
    );

  if (!st)
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
          Sous-traitant introuvable.
        </div>
      </div>
    );

  const cfg = STATUT_CONFIG[st.statut] || STATUT_CONFIG.inactif;

  // Spécialités déjà assignées (ids)
  const assignedIds = new Set((st.specialites || []).map((s) => s.id));
  const availableSpecs = specialitesAll.filter(
    (s) => !assignedIds.has(String(s.id)),
  );

  return (
    <div className="page">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 18,
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: 4,
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => navigate("/soustraitants")}
            title="Retour">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1
                style={{
                  fontSize: 21,
                  fontWeight: 700,
                  letterSpacing: "-0.3px",
                  color: "var(--text-primary)",
                }}>
                {st.raisonSociale}
              </h1>
              <span
                className="badge"
                style={{ background: cfg.bg, color: cfg.text }}>
                <span className="bdot" style={{ background: cfg.dot }} />
                {st.statut}
              </span>
            </div>
            {st.ICE && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 2,
                  display: "block",
                }}>
                ICE: {st.ICE}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-outline"
            onClick={() => setStatutModal(true)}>
            Changer le statut
          </button>
          <button
            className="btn btn-outline"
            onClick={() => navigate(`/soustraitants/${id}/modifier`)}>
            <Pencil size={13} /> Modifier
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            <Trash2 size={13} /> Supprimer
          </button>
        </div>
      </div>

      {/* Infos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Col gauche - Identification */}
        <div className="tbl-card" style={{ padding: "20px 22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <Building2
              size={15}
              style={{ color: "var(--color-primary)", marginBottom: 4 }}
            />
            <span className="tbl-title" style={{ margin: 0 }}>
              Identification
            </span>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", marginTop: 6 }}>
            {[
              {
                icon: Building2,
                label: "Raison sociale",
                value: st.raisonSociale,
              },
              { icon: Hash, label: "ICE / RC", value: st.ICE || "—" },
              { icon: MapPin, label: "Adresse", value: st.adresse || "—" },
              {
                icon: FileText,
                label: "N° de contrat",
                value: st.numeroContrat || "—",
              },
              {
                icon: CalendarDays,
                label: "Date de création",
                value: st.dateCreation
                  ? new Date(st.dateCreation).toLocaleDateString("fr-FR")
                  : "—",
              },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon
                    size={13}
                    style={{ color: "var(--text-muted)", flexShrink: 0 }}
                  />
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                </div>
                <span
                  style={{
                    color:
                      value === "—"
                        ? "var(--text-muted)"
                        : "var(--text-primary)",
                    fontWeight: 500,
                    textAlign: "right",
                    maxWidth: "55%",
                  }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Col droite - Contacts */}
        <div className="tbl-card" style={{ padding: "20px 22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <Phone
              size={15}
              style={{ color: "var(--status-cyan-dot)", marginBottom: 4 }}
            />
            <span className="tbl-title" style={{ margin: 0 }}>
              Contacts
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 14,
            }}>
            {/* Contact Principal */}
            <div
              style={{
                borderLeft: "3px solid var(--color-primary)",
                borderRadius: "var(--r-sm)",
                background: "var(--bg-elevated)",
                padding: "14px 16px",
              }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}>
                <UserRound
                  size={15}
                  style={{ color: "var(--color-primary)" }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    color: "var(--color-primary)",
                  }}>
                  Contact principal
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  paddingLeft: 2,
                }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}>
                  {st.contactPrincipalNom || "Non renseigné"}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                  }}>
                  <Phone
                    size={13}
                    style={{ color: "var(--text-muted)", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      color: st.contactPrincipalTel
                        ? "var(--text-secondary)"
                        : "var(--text-muted)",
                    }}>
                    {st.contactPrincipalTel || "—"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                  }}>
                  <Mail
                    size={13}
                    style={{ color: "var(--text-muted)", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      color: st.contactPrincipalEmail
                        ? "var(--text-secondary)"
                        : "var(--text-muted)",
                    }}>
                    {st.contactPrincipalEmail || "—"}
                  </span>
                </div>
              </div>
            </div>
            {/* Contact Technique */}
            <div
              style={{
                borderLeft: "3px solid var(--status-orange-dot)",
                borderRadius: "var(--r-sm)",
                background: "var(--bg-elevated)",
                padding: "14px 16px",
              }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}>
                <Wrench
                  size={14}
                  style={{ color: "var(--status-orange-dot)" }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    color: "var(--status-orange-dot)",
                  }}>
                  Contact technique
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  paddingLeft: 2,
                }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}>
                  {st.contactTechniqueNom || "Non renseigné"}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                  }}>
                  <Phone
                    size={13}
                    style={{ color: "var(--text-muted)", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      color: st.contactTechniqueTel
                        ? "var(--text-secondary)"
                        : "var(--text-muted)",
                    }}>
                    {st.contactTechniqueTel || "—"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                  }}>
                  <Mail
                    size={13}
                    style={{ color: "var(--text-muted)", flexShrink: 0 }}
                  />
                  <span
                    style={{
                      color: st.contactTechniqueEmail
                        ? "var(--text-secondary)"
                        : "var(--text-muted)",
                    }}>
                    {st.contactTechniqueEmail || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tarifs & Habilitations */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="tbl-card" style={{ padding: "20px 22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <CreditCard
              size={15}
              style={{ color: "var(--status-green-dot)", marginBottom: 4 }}
            />
            <span className="tbl-title" style={{ margin: 0 }}>
              Tarifs
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              marginTop: 6,
            }}>
            {[
              {
                label: "Tarif horaire normal",
                value: st.tarifHoraireNormal
                  ? `${st.tarifHoraireNormal} MAD/h`
                  : "—",
              },
              {
                label: "Tarif semaine/nuit",
                value: st.tarifHoraireSemaine
                  ? `${st.tarifHoraireSemaine} MAD/h`
                  : "—",
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 13,
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                }}>
                <span style={{ color: "var(--text-muted)" }}>{label}</span>
                <span
                  style={{
                    color:
                      value === "—"
                        ? "var(--text-muted)"
                        : "var(--status-green-text)",
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                  }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="tbl-card" style={{ padding: "20px 22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <ShieldCheck
              size={15}
              style={{ color: "var(--status-blue-dot)", marginBottom: 4 }}
            />
            <span className="tbl-title" style={{ margin: 0 }}>
              Habilitations
            </span>
          </div>
          <div style={{ marginTop: 14 }}>
            {st.habilitations ? (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-primary)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.7,
                  padding: "10px 14px",
                  background: "var(--bg-elevated)",
                  borderRadius: "var(--r-sm)",
                  borderLeft: "3px solid var(--status-blue-dot)",
                }}>
                {st.habilitations}
              </p>
            ) : (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}>
                Aucune habilitation renseignée
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Spécialités assignées */}
      <div className="tbl-card" style={{ padding: "20px 22px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 14,
            borderBottom: "1px solid var(--border-subtle)",
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Tags
              size={15}
              style={{ color: "var(--status-purple-dot)", marginBottom: 4 }}
            />
            <span className="tbl-title" style={{ margin: 0 }}>
              Spécialités assignées
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 20,
                height: 20,
                padding: "0 6px",
                borderRadius: 10,
                background: "var(--status-purple-bg)",
                color: "var(--status-purple-text)",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                marginBottom: 2,
              }}>
              {st.specialites?.length || 0}
            </span>
          </div>
        </div>
        {!st.specialites || st.specialites.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "24px 0 12px",
              color: "var(--text-muted)",
              fontSize: 13,
            }}>
            <Tags
              size={28}
              style={{ color: "var(--border-subtle)", marginBottom: 8 }}
            />
            <p>Aucune spécialité assignée</p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 14,
            }}>
            {st.specialites.map((spec) => (
              <div
                key={spec.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px 7px 12px",
                  borderRadius: 20,
                  background: "var(--status-purple-bg)",
                  border: "1px solid transparent",
                  transition: "all .15s",
                }}>
                <span
                  className="code-mono"
                  style={{ fontSize: 11, color: "var(--status-purple-text)" }}>
                  {spec.code}
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    color: "var(--text-primary)",
                    fontWeight: 500,
                  }}>
                  {spec.libelle}
                </span>
                <button
                  title="Retirer"
                  onClick={() => handleRetirerSpec(spec.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "none",
                    background: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 0,
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--status-red-bg)";
                    e.currentTarget.style.color = "var(--status-red-text)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Assigner une nouvelle spécialité */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid var(--border-subtle)",
            alignItems: "center",
          }}>
          <select
            value={selectedSpec}
            onChange={(e) => setSelectedSpec(e.target.value)}
            className="finput"
            style={{ flex: 1 }}>
            <option value="">Sélectionner une spécialité…</option>
            {availableSpecs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.libelle}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            disabled={!selectedSpec}
            onClick={handleAssignerSpec}>
            <Plus size={14} /> Assigner
          </button>
        </div>
      </div>

      {/* Modal changer statut */}
      {statutModal && (
        <div className="backdrop">
          <div className="modal modal-sm">
            <div className="m-hdr">
              <span className="m-title">Changer le statut</span>
              <button className="m-close" onClick={() => setStatutModal(false)}>
                ✕
              </button>
            </div>
            <div className="m-body-plain">
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 16,
                }}>
                Statut actuel :{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {st.statut}
                </strong>
              </p>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label className="flabel">Nouveau statut</label>
                <select
                  value={nouveauStatut}
                  onChange={(e) => setNouveauStatut(e.target.value)}
                  className="finput">
                  <option value="">Sélectionner…</option>
                  {STATUT_OPTIONS.filter((s) => s !== st.statut).map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="m-foot">
              <button
                className="btn btn-outline"
                onClick={() => setStatutModal(false)}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                disabled={!nouveauStatut}
                onClick={handleChangerStatut}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
