import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getActif,
  createActif,
  updateActif,
  getActifs,
} from "../../services/actifService";
import {
  getSites,
  getUnites,
  getSecteurs,
} from "../../services/organisationService";
import { ArrowLeft, Save, X } from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────

const ACTIF_TYPES = [
  { value: "equipement", label: "Équipement" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "vehicule", label: "Véhicule" },
  { value: "autre", label: "Autre" },
];

const STATUTS = [
  { value: "actif", label: "Actif" },
  { value: "en_panne", label: "En panne" },
  { value: "en_maintenance", label: "En maintenance" },
  { value: "retire", label: "Retiré" },
];

const initialFormState = {
  code: "",
  libelle: "",
  description: "",
  type: "equipement",
  statut: "actif",
  idSite: "",
  idUnite: "",
  idParent: "",
  dateAcquisition: "",
  valeur: "",
  fabricant: "",
  modele: "",
  numSerie: "",
  estActif: true,
};

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  name,
  type = "text",
  options,
  required,
  value,
  onChange,
  error,
  step,
}) {
  return (
    <div className="fg">
      <label htmlFor={name} className="flabel">
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {options ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          aria-required={required}
          className={`fsel${error ? " err" : ""}`}>
          <option value="">— Sélectionner —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          aria-required={required}
          step={step}
          className={`finput${error ? " err" : ""}`}
        />
      )}
      {error && <span className="ferr">{error}</span>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FormulaireActif() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(initialFormState);
  const [sites, setSites] = useState([]);
  const [unites, setUnites] = useState([]);
  const [actifs, setActifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [secteurs, setSecteurs] = useState([]);

  const formatDateForInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!form.code?.trim()) newErrors.code = "Le code est requis";
    if (!form.libelle?.trim()) newErrors.libelle = "Le libellé est requis";
    if (!form.idSite) newErrors.idSite = "Le site est requis";
    if (form.valeur && isNaN(parseFloat(form.valeur)))
      newErrors.valeur = "La valeur doit être un nombre";
    if (form.dateAcquisition && isNaN(new Date(form.dateAcquisition).getTime()))
      newErrors.dateAcquisition = "Date invalide";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form.code, form.libelle, form.valeur, form.dateAcquisition, form.idSite]);

  useEffect(() => {
    const init = async () => {
      try {
        const [s, u, a, sec] = await Promise.all([
          getSites(),
          getUnites(),
          getActifs(),
          getSecteurs(),
        ]);
        setSites(s.data.results || s.data);
        setUnites(u.data.results || u.data);
        setActifs(a.data.results || a.data);
        setSecteurs(sec.data.results || sec.data);
        if (isEdit) {
          const res = await getActif(id);
          const a2 = res.data;
          setForm({
            code: a2.code || "",
            libelle: a2.libelle || "",
            description: a2.description || "",
            type: a2.type || "equipement",
            statut: a2.statut || "actif",
            idSite: a2.idSite || "",
            idUnite: a2.idUnite || "",
            idParent: a2.idParent || "",
            dateAcquisition: formatDateForInput(a2.dateAcquisition),
            valeur: a2.valeur || "",
            fabricant: a2.fabricant || "",
            modele: a2.modele || "",
            numSerie: a2.numSerie || "",
            estActif: a2.estActif !== undefined ? a2.estActif : true,
          });
        }
      } catch {
        setErreur("Erreur lors du chargement des données");
      }
    };
    init();
  }, [id, isEdit]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "idSite" ? { idUnite: "" } : {}),
    }));
    setIsDirty(true);
    if (errors[name]) setErrors((err) => ({ ...err, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setErreur(null);
    try {
      const payload = { ...form };
      if (!payload.idSite) delete payload.idSite;
      if (!payload.idUnite) delete payload.idUnite;
      if (!payload.idParent) delete payload.idParent;
      if (!payload.dateAcquisition) delete payload.dateAcquisition;
      if (!payload.valeur) delete payload.valeur;
      if (isEdit) await updateActif(id, payload);
      else await createActif(payload);
      navigate("/actifs");
    } catch (e) {
      setErreur(e.response?.data || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const siteOptions = useMemo(
    () =>
      sites.map((s) => ({ value: s.id, label: `${s.code} — ${s.libelle}` })),
    [sites],
  );
  const uniteOptions = useMemo(() => {
    if (!form.idSite) return [];
    // Récupérer les IDs des secteurs appartenant au site sélectionné
    const secteurIds = new Set(
      secteurs
        .filter(
          (sec) =>
            String(sec.site) === String(form.idSite) ||
            String(sec.site?.id) === String(form.idSite),
        )
        .map((sec) => sec.id),
    );
    return unites
      .filter((u) => secteurIds.has(u.secteur) || secteurIds.has(u.secteur?.id))
      .map((u) => ({ value: u.id, label: `${u.code} — ${u.libelle}` }));
  }, [unites, secteurs, form.idSite]);
  const parentOptions = useMemo(
    () =>
      actifs
        .filter((a) => a.id !== id)
        .map((a) => ({ value: a.id, label: `${a.code} — ${a.libelle}` })),
    [actifs, id],
  );

  return (
    <div className="page" style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div className="hdr">
        <div
          className="hdr-l"
          style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => navigate("/actifs")}
            title="Retour">
            <ArrowLeft size={16} />
          </button>
          <h1>{isEdit ? "Modifier l'actif" : "Nouvel actif"}</h1>
        </div>
      </div>

      {/* Erreur globale */}
      {erreur && (
        <div
          style={{
            background: "var(--status-red-bg)",
            border: "1px solid rgba(239,68,68,.25)",
            color: "var(--status-red-text)",
            borderRadius: "var(--r-sm)",
            padding: "10px 14px",
            fontSize: 13,
          }}>
          {typeof erreur === "object" ? JSON.stringify(erreur) : erreur}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Section: Identification */}
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 12,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Identification</span>
          </div>
          <div className="m-body" style={{ padding: "14px 0 0", gap: 12 }}>
            <Field
              label="Code"
              name="code"
              required
              value={form.code}
              onChange={handleChange}
              error={errors.code}
            />
            <Field
              label="Libellé"
              name="libelle"
              required
              value={form.libelle}
              onChange={handleChange}
              error={errors.libelle}
            />
            <Field
              label="Type"
              name="type"
              options={ACTIF_TYPES}
              value={form.type}
              onChange={handleChange}
            />
            {/* <Field
              label="Statut"
              name="statut"
              options={STATUTS}
              value={form.statut}
              onChange={handleChange}
            /> */}
            <div className="span2 fg">
              <label htmlFor="description" className="flabel">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="finput"
                style={{ resize: "none" }}
              />
            </div>
          </div>
        </div>

        {/* Section: Localisation */}
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 12,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Localisation</span>
          </div>
          <div className="m-body" style={{ padding: "14px 0 0", gap: 12 }}>
            <Field
              label="Site"
              name="idSite"
              required
              options={siteOptions}
              value={form.idSite}
              onChange={handleChange}
              error={errors.idSite}
            />
            <div className="fg">
              <label htmlFor="idUnite" className="flabel">
                Unité
              </label>
              <select
                id="idUnite"
                name="idUnite"
                value={form.idUnite}
                onChange={handleChange}
                disabled={!form.idSite}
                className={`fsel${!form.idSite ? " disabled" : ""}`}
                title={
                  !form.idSite ? "Veuillez d'abord sélectionner un site" : ""
                }>
                <option value="">
                  {!form.idSite
                    ? "— Sélectionner un site d'abord —"
                    : "— Sélectionner —"}
                </option>
                {uniteOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="span2 fg">
              <label htmlFor="idParent" className="flabel">
                Actif parent (sous-actif de...)
              </label>
              <select
                id="idParent"
                name="idParent"
                value={form.idParent}
                onChange={handleChange}
                className="fsel">
                <option value="">— Aucun parent (actif racine) —</option>
                {parentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section: Caractéristiques techniques */}
        <div className="tbl-card" style={{ padding: "18px 22px" }}>
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 12,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Caractéristiques techniques</span>
          </div>
          <div className="m-body" style={{ padding: "14px 0 0", gap: 12 }}>
            <Field
              label="Fabricant"
              name="fabricant"
              value={form.fabricant}
              onChange={handleChange}
            />
            <Field
              label="Modèle"
              name="modele"
              value={form.modele}
              onChange={handleChange}
            />
            <Field
              label="Numéro de série"
              name="numSerie"
              value={form.numSerie}
              onChange={handleChange}
            />
            <Field
              label="Date d'acquisition"
              name="dateAcquisition"
              type="date"
              value={form.dateAcquisition}
              onChange={handleChange}
              error={errors.dateAcquisition}
            />
            <Field
              label="Valeur (MAD)"
              name="valeur"
              type="number"
              step="0.01"
              value={form.valeur}
              onChange={handleChange}
              error={errors.valeur}
            />
            <div
              className="span2"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 4,
              }}>
              <input
                type="checkbox"
                name="estActif"
                id="estActif"
                checked={form.estActif}
                onChange={handleChange}
                style={{
                  width: 16,
                  height: 16,
                  accentColor: "var(--color-primary)",
                  cursor: "pointer",
                }}
              />
              <label
                htmlFor="estActif"
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  userSelect: "none",
                }}>
                Actif (visible dans les listes)
              </label>
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            paddingTop: 4,
          }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate("/actifs")}>
            <X size={13} /> Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={13} />{" "}
            {loading
              ? "Enregistrement…"
              : isEdit
                ? "Mettre à jour"
                : "Créer l'actif"}
          </button>
        </div>
      </form>
    </div>
  );
}
