import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getSousTraitant,
  createSousTraitant,
  updateSousTraitant,
} from "../../services/soustraitantService";
import { ArrowLeft } from "lucide-react";

function Field({
  label,
  name,
  type = "text",
  required,
  value,
  onChange,
  erreur,
}) {
  // Normalise error details: peut être un tableau, un objet {champ,message}[], ou un dict DRF {field: [msgs]}
  const fieldErrors = [];
  if (erreur?.details) {
    const d = erreur.details;
    // Flat array of {champ, message}
    if (Array.isArray(d)) {
      d.filter((e) => e.champ === name).forEach((e) =>
        fieldErrors.push(e.message),
      );
    } else if (typeof d === "object") {
      // Nested: d.details is array of {champ, message}
      if (Array.isArray(d.details)) {
        d.details
          .filter((e) => e.champ === name)
          .forEach((e) => fieldErrors.push(e.message));
      }
      // DRF dict: { fieldName: ["msg", ...] }
      if (Array.isArray(d[name])) {
        d[name].forEach((msg) => fieldErrors.push(msg));
      }
    }
  }

  return (
    <div className="fg">
      <label className="flabel">
        {label}
        {required && <span className="req"> *</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="finput"
      />
      {fieldErrors.map((msg, i) => (
        <p
          key={i}
          style={{
            fontSize: 12,
            color: "var(--status-red-text)",
            marginTop: 4,
          }}>
          {msg}
        </p>
      ))}
    </div>
  );
}

export default function FormulaireSousTraitant() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    raisonSociale: "",
    ICE: "",
    adresse: "",
    contactPrincipalNom: "",
    contactPrincipalTel: "",
    contactPrincipalEmail: "",
    contactTechniqueNom: "",
    contactTechniqueTel: "",
    contactTechniqueEmail: "",
    numeroContrat: "",
    tarifHoraireNormal: "",
    tarifHoraireSemaine: "",
    habilitations: "",
  });
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (isEdit) {
      getSousTraitant(id).then((r) => {
        const d = r.data.data || r.data;
        setForm({
          raisonSociale: d.raisonSociale || "",
          ICE: d.ICE || "",
          adresse: d.adresse || "",
          contactPrincipalNom: d.contactPrincipalNom || "",
          contactPrincipalTel: d.contactPrincipalTel || "",
          contactPrincipalEmail: d.contactPrincipalEmail || "",
          contactTechniqueNom: d.contactTechniqueNom || "",
          contactTechniqueTel: d.contactTechniqueTel || "",
          contactTechniqueEmail: d.contactTechniqueEmail || "",
          numeroContrat: d.numeroContrat || "",
          tarifHoraireNormal: d.tarifHoraireNormal || "",
          tarifHoraireSemaine: d.tarifHoraireSemaine || "",
          habilitations: d.habilitations || "",
        });
      });
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      const payload = { ...form };
      // Nettoyer les champs optionnels vides
      if (!payload.ICE) delete payload.ICE;
      if (!payload.tarifHoraireNormal) delete payload.tarifHoraireNormal;
      if (!payload.tarifHoraireSemaine) delete payload.tarifHoraireSemaine;
      if (!payload.numeroContrat) delete payload.numeroContrat;

      isEdit
        ? await updateSousTraitant(id, payload)
        : await createSousTraitant(payload);
      navigate("/soustraitants");
    } catch (e) {
      setErreur(e.response?.data || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate("/soustraitants")}>
          <ArrowLeft size={14} /> Retour
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>
          {isEdit ? "Modifier le sous-traitant" : "Nouveau sous-traitant"}
        </h1>
      </div>

      {erreur && (
        <div className="alert-warn">
          {typeof erreur === "object"
            ? erreur.message || JSON.stringify(erreur)
            : erreur}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Identification */}
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
          <div className="m-body" style={{ padding: "14px 0 0" }}>
            <Field
              label="Raison sociale"
              name="raisonSociale"
              required
              value={form.raisonSociale}
              onChange={handleChange}
              erreur={erreur}
            />
            <Field
              label="ICE / RC"
              name="ICE"
              value={form.ICE}
              onChange={handleChange}
              erreur={erreur}
            />
            <div className="fg">
              <label className="flabel">Adresse</label>
              <textarea
                name="adresse"
                value={form.adresse}
                onChange={handleChange}
                className="finput"
                style={{ resize: "none", height: 64 }}
              />
            </div>
          </div>
        </div>

        {/* Contact principal */}
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Contact principal</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 14,
              paddingTop: 14,
            }}>
            <Field
              label="Nom"
              name="contactPrincipalNom"
              required
              value={form.contactPrincipalNom}
              onChange={handleChange}
              erreur={erreur}
            />
            <Field
              label="Téléphone"
              name="contactPrincipalTel"
              required
              value={form.contactPrincipalTel}
              onChange={handleChange}
              erreur={erreur}
            />
            <Field
              label="Email"
              name="contactPrincipalEmail"
              required
              value={form.contactPrincipalEmail}
              onChange={handleChange}
              erreur={erreur}
            />
          </div>
        </div>

        {/* Contact technique */}
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Contact technique</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 14,
              paddingTop: 14,
            }}>
            <Field
              label="Nom"
              name="contactTechniqueNom"
              required
              value={form.contactTechniqueNom}
              onChange={handleChange}
              erreur={erreur}
            />
            <Field
              label="Téléphone"
              name="contactTechniqueTel"
              required
              value={form.contactTechniqueTel}
              onChange={handleChange}
              erreur={erreur}
            />
            <Field
              label="Email"
              name="contactTechniqueEmail"
              value={form.contactTechniqueEmail}
              onChange={handleChange}
              erreur={erreur}
            />
          </div>
        </div>

        {/* Contrat & Tarifs */}
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Contrat & Tarifs</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 14,
              paddingTop: 14,
            }}>
            <Field
              label="Numéro de contrat"
              name="numeroContrat"
              value={form.numeroContrat}
              onChange={handleChange}
              erreur={erreur}
            />
            <Field
              label="Tarif horaire normal (MAD)"
              name="tarifHoraireNormal"
              type="number"
              value={form.tarifHoraireNormal}
              onChange={handleChange}
              erreur={erreur}
            />
            <Field
              label="Tarif semaine/nuit (MAD)"
              name="tarifHoraireSemaine"
              type="number"
              value={form.tarifHoraireSemaine}
              onChange={handleChange}
              erreur={erreur}
            />
          </div>
          <div style={{ paddingTop: 14 }}>
            <div className="fg">
              <label className="flabel">Habilitations</label>
              <textarea
                name="habilitations"
                value={form.habilitations}
                onChange={handleChange}
                className="finput"
                style={{ resize: "none", height: 80 }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate("/soustraitants")}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading
              ? "Enregistrement..."
              : isEdit
                ? "Mettre à jour"
                : "Créer le sous-traitant"}
          </button>
        </div>
      </form>
    </div>
  );
}
