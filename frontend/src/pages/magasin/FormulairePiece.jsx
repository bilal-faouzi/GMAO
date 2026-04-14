import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getPiece,
  createPiece,
  updatePiece,
} from "../../services/magasinService";
import { ArrowLeft } from "lucide-react";

export default function FormulairePiece() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    reference: "",
    designation: "",
    categorie: "",
    unite: "piece",
    emplacement: "",
    quantiteStock: "0",
    seuilMinimum: "0",
    prixUnitaire: "",
    fournisseur: "",
    referenceConstructeur: "",
    estActif: true,
  });
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (isEdit) {
      getPiece(id).then((r) => {
        const p = r.data;
        setForm({
          reference: p.reference,
          designation: p.designation,
          categorie: p.categorie || "",
          unite: p.unite,
          emplacement: p.emplacement || "",
          quantiteStock: p.quantiteStock,
          seuilMinimum: p.seuilMinimum,
          prixUnitaire: p.prixUnitaire || "",
          fournisseur: p.fournisseur || "",
          referenceConstructeur: p.referenceConstructeur || "",
          estActif: p.estActif,
        });
      });
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      const payload = { ...form };
      if (!payload.prixUnitaire) delete payload.prixUnitaire;
      isEdit ? await updatePiece(id, payload) : await createPiece(payload);
      navigate("/magasin");
    } catch (e) {
      setErreur(e.response?.data || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, name, type = "text", required, disabled }) => (
    <div className="fg">
      <label className="flabel">
        {label}
        {required && <span className="req"> *</span>}
      </label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        className="finput"
        disabled={disabled}
        style={
          disabled
            ? {
                opacity: 0.6,
                cursor: "not-allowed",
                background: "var(--bg-muted, #f0f0f0)",
                border: "1px dashed var(--border-subtle)",
                color: "var(--text-muted)",
              }
            : {}
        }
      />
      {disabled && (
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 4,
            fontStyle: "italic",
          }}>
          Utilisez Entrée / Sortie stock pour modifier la quantité
        </span>
      )}
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-ghost" onClick={() => navigate("/magasin")}>
          <ArrowLeft size={14} /> Retour
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>
          {isEdit ? "Modifier la pièce" : "Nouvelle pièce"}
        </h1>
      </div>

      {erreur && (
        <div className="alert-warn">
          {typeof erreur === "object" ? JSON.stringify(erreur) : erreur}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
            <Field label="Référence" name="reference" required />
            <Field label="Désignation" name="designation" required />
            <Field label="Catégorie" name="categorie" />
            <Field label="Unité (pièce/kg/L/m...)" name="unite" />
            <Field label="Emplacement (ex: A1-E3-N2)" name="emplacement" />
            <Field label="Fournisseur" name="fournisseur" />
            <div className="span2">
              <Field
                label="Référence constructeur"
                name="referenceConstructeur"
              />
            </div>
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
            <span className="tbl-title">Stock & Prix</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 14,
              paddingTop: 14,
            }}>
            <Field
              label="Quantité en stock"
              name="quantiteStock"
              type="number"
              disabled={isEdit}
            />
            <Field label="Seuil minimum" name="seuilMinimum" type="number" />
            <Field
              label="Prix unitaire (MAD)"
              name="prixUnitaire"
              type="number"
            />
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 14,
              cursor: "pointer",
            }}>
            <input
              type="checkbox"
              name="estActif"
              checked={form.estActif}
              onChange={handleChange}
              style={{
                width: 16,
                height: 16,
                accentColor: "var(--color-primary)",
              }}
            />
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Actif (visible dans le catalogue)
            </span>
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate("/magasin")}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading
              ? "Enregistrement..."
              : isEdit
                ? "Mettre à jour"
                : "Créer la pièce"}
          </button>
        </div>
      </form>
    </div>
  );
}
