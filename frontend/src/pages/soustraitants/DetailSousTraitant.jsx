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
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

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
        <div className="hdr">
          <div className="hdr-l">
            <h1>Chargement…</h1>
          </div>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[0, 1].map((i) => (
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
                style={{ width: "40%", height: 14, marginBottom: 16 }}
              />
              <div
                className="skeleton"
                style={{ width: "100%", height: 12, marginBottom: 8 }}
              />
              <div className="skeleton" style={{ width: "80%", height: 12 }} />
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
      <div className="hdr">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="btn btn-ghost"
            onClick={() => navigate("/soustraitants")}>
            <ArrowLeft size={14} /> Retour
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>{st.raisonSociale}</h1>
          <span
            className="badge"
            style={{ background: cfg.bg, color: cfg.text }}>
            <span className="bdot" style={{ background: cfg.dot }} />
            {st.statut}
          </span>
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
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Identification</span>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
            {[
              ["Raison sociale", st.raisonSociale],
              ["ICE / RC", st.ICE || "—"],
              ["Adresse", st.adresse || "—"],
              ["Numéro de contrat", st.numeroContrat || "—"],
              [
                "Date de création",
                st.dateCreation
                  ? new Date(st.dateCreation).toLocaleDateString("fr-FR")
                  : "—",
              ],
            ].map(([l, v]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                }}>
                <span style={{ color: "var(--text-muted)" }}>{l}</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Col droite - Contacts */}
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Contacts</span>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
            {[
              ["Contact principal — Nom", st.contactPrincipalNom || "—"],
              ["Contact principal — Tél", st.contactPrincipalTel || "—"],
              ["Contact principal — Email", st.contactPrincipalEmail || "—"],
              ["Contact technique — Nom", st.contactTechniqueNom || "—"],
              ["Contact technique — Tél", st.contactTechniqueTel || "—"],
              ["Contact technique — Email", st.contactTechniqueEmail || "—"],
            ].map(([l, v]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                }}>
                <span style={{ color: "var(--text-muted)" }}>{l}</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tarifs & Habilitations */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Tarifs</span>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", marginTop: 12 }}>
            {[
              [
                "Tarif horaire normal",
                st.tarifHoraireNormal ? `${st.tarifHoraireNormal} MAD/h` : "—",
              ],
              [
                "Tarif semaine/nuit",
                st.tarifHoraireSemaine
                  ? `${st.tarifHoraireSemaine} MAD/h`
                  : "—",
              ],
            ].map(([l, v]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                }}>
                <span style={{ color: "var(--text-muted)" }}>{l}</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Habilitations</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <p
              style={{
                fontSize: 13,
                color: st.habilitations
                  ? "var(--text-primary)"
                  : "var(--text-muted)",
                whiteSpace: "pre-wrap",
              }}>
              {st.habilitations || "Aucune habilitation renseignée"}
            </p>
          </div>
        </div>
      </div>

      {/* Spécialités assignées */}
      <div className="tbl-card" style={{ padding: "18px 22px" }}>
        <div
          className="tbl-head"
          style={{
            padding: 0,
            paddingBottom: 14,
            borderBottom: "1px solid var(--border-subtle)",
          }}>
          <span className="tbl-title">
            Spécialités assignées ({st.specialites?.length || 0})
          </span>
        </div>
        {!st.specialites || st.specialites.length === 0 ? (
          <p className="empty">Aucune spécialité assignée</p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginTop: 12,
            }}>
            {st.specialites.map((spec) => (
              <div
                key={spec.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "var(--r-sm)",
                  background: "var(--bg-elevated)",
                }}>
                <div>
                  <span
                    className="code-mono"
                    style={{ fontSize: 12, marginRight: 8 }}>
                    {spec.code}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
                    {spec.libelle}
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-icon"
                  title="Retirer"
                  onClick={() => handleRetirerSpec(spec.id)}
                  style={{ color: "var(--status-red-text)" }}>
                  <Trash2 size={14} />
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
            marginTop: 14,
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
            Assigner
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
