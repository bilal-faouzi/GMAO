import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getActif,
  createActif,
  updateActif,
  deleteActif,
} from "../../services/actifService";
import { getSites, getUnites } from "../../services/organisationService";
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  FolderTree,
  Package,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUTS = {
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
    label: "En maintenance",
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

const TYPES = {
  equipement: {
    label: "Équipement",
    bg: "var(--status-blue-bg)",
    text: "var(--status-blue-text)",
  },
  infrastructure: {
    label: "Infrastructure",
    bg: "var(--status-purple-bg)",
    text: "var(--status-purple-text)",
  },
  vehicule: {
    label: "Véhicule",
    bg: "var(--status-cyan-bg)",
    text: "var(--status-cyan-text)",
  },
  autre: {
    label: "Autre",
    bg: "var(--status-gray-bg)",
    text: "var(--status-gray-text)",
  },
};

const ACTIF_TYPES_OPTIONS = [
  { value: "equipement", label: "Équipement" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "vehicule", label: "Véhicule" },
  { value: "autre", label: "Autre" },
];

const STATUTS_OPTIONS = [
  { value: "actif", label: "Actif" },
  { value: "en_panne", label: "En panne" },
  { value: "en_maintenance", label: "En maintenance" },
  { value: "retire", label: "Retiré" },
];

function StatutBadge({ statut }) {
  const cfg = STATUTS[statut] || {
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

function TypeBadge({ type }) {
  const cfg = TYPES[type] || {
    label: type,
    bg: "var(--color-elevated)",
    text: "var(--color-text-muted)",
  };
  return (
    <span className="badge" style={{ background: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}

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

// ─── Tree Node ────────────────────────────────────────────────────────────────

function TreeNode({ actif, selectedId, onSelect, level = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = actif.sous_actifs && actif.sous_actifs.length > 0;
  const isSelected = actif.id === selectedId;

  return (
    <div>
      <div
        onClick={() => onSelect(actif.id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          paddingLeft: 10 + level * 18,
          cursor: "pointer",
          borderRadius: "var(--r-sm)",
          background: isSelected ? "var(--color-primary-soft)" : "transparent",
          color: isSelected ? "var(--accent)" : "var(--text-primary)",
          fontSize: 13,
          fontWeight: isSelected ? 600 : 400,
          transition: "all .15s",
          userSelect: "none",
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.background = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.background = "transparent";
        }}>
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              cursor: "pointer",
            }}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
        )}
        <Package size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
          {actif.code} — {actif.libelle}
        </span>
      </div>
      {hasChildren && expanded && (
        <div>
          {actif.sous_actifs.map((child) => (
            <TreeNode
              key={child.id}
              actif={child}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

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

function ActifFormModal({
  open,
  onClose,
  onSaved,
  parentId,
  editActif,
  sites,
  unites,
}) {
  const isEdit = Boolean(editActif);
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    if (isEdit && editActif) {
      setForm({
        code: editActif.code || "",
        libelle: editActif.libelle || "",
        description: editActif.description || "",
        type: editActif.type || "equipement",
        statut: editActif.statut || "actif",
        idSite: editActif.idSite || "",
        idUnite: editActif.idUnite || "",
        idParent: editActif.idParent || "",
        dateAcquisition: editActif.dateAcquisition
          ? editActif.dateAcquisition.split("T")[0]
          : "",
        valeur: editActif.valeur || "",
        fabricant: editActif.fabricant || "",
        modele: editActif.modele || "",
        numSerie: editActif.numSerie || "",
        estActif: editActif.estActif !== undefined ? editActif.estActif : true,
      });
    } else {
      setForm({ ...initialFormState, idParent: parentId || "" });
    }
    setErreur(null);
    setErrors({});
  }, [open, isEdit, editActif, parentId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((err) => ({ ...err, [name]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = "Requis";
    if (!form.libelle.trim()) e.libelle = "Requis";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErreur(null);
    try {
      const payload = { ...form };
      if (!payload.idSite) delete payload.idSite;
      if (!payload.idUnite) delete payload.idUnite;
      if (!payload.idParent) delete payload.idParent;
      if (!payload.dateAcquisition) delete payload.dateAcquisition;
      if (!payload.valeur) delete payload.valeur;
      if (isEdit) await updateActif(editActif.id, payload);
      else await createActif(payload);
      onSaved();
      onClose();
    } catch (err) {
      setErreur(
        err.response?.data
          ? JSON.stringify(err.response.data)
          : "Erreur lors de la sauvegarde",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const siteOpts = sites.map((s) => ({
    value: s.id,
    label: `${s.code} — ${s.libelle}`,
  }));
  const uniteOpts = unites.map((u) => ({
    value: u.id,
    label: `${u.code} — ${u.libelle}`,
  }));

  return (
    <div className="backdrop">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="m-hdr">
          <span className="m-title">
            {isEdit ? "Modifier l'actif" : "Ajouter un sous-actif"}
          </span>
          <button className="m-close" onClick={onClose}>
            ✕
          </button>
        </div>
        {erreur && (
          <div
            style={{
              background: "var(--status-red-bg)",
              color: "var(--status-red-text)",
              padding: "8px 14px",
              fontSize: 12,
              margin: "0 18px",
            }}>
            {erreur}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="m-body" style={{ gap: 10, padding: "14px 18px" }}>
            <div className="fg">
              <label className="flabel">
                Code <span className="req">*</span>
              </label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                className={`finput${errors.code ? " err" : ""}`}
              />
              {errors.code && <span className="ferr">{errors.code}</span>}
            </div>
            <div className="fg">
              <label className="flabel">
                Libellé <span className="req">*</span>
              </label>
              <input
                name="libelle"
                value={form.libelle}
                onChange={handleChange}
                className={`finput${errors.libelle ? " err" : ""}`}
              />
              {errors.libelle && <span className="ferr">{errors.libelle}</span>}
            </div>
            <div className="fg">
              <label className="flabel">Type</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="fsel">
                {ACTIF_TYPES_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="flabel">Statut</label>
              <select
                name="statut"
                value={form.statut}
                onChange={handleChange}
                className="fsel">
                {STATUTS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg span2">
              <label className="flabel">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                className="finput"
                style={{ resize: "none" }}
              />
            </div>
            <div className="fg">
              <label className="flabel">Site</label>
              <select
                name="idSite"
                value={form.idSite}
                onChange={handleChange}
                className="fsel">
                <option value="">— Aucun —</option>
                {siteOpts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="flabel">Unité</label>
              <select
                name="idUnite"
                value={form.idUnite}
                onChange={handleChange}
                className="fsel">
                <option value="">— Aucune —</option>
                {uniteOpts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg span2">
              <label className="flabel">Parent</label>
              <input
                value={form.idParent}
                disabled
                className="finput"
                style={{ opacity: 0.6 }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Rempli automatiquement
              </span>
            </div>
            <div className="fg">
              <label className="flabel">Fabricant</label>
              <input
                name="fabricant"
                value={form.fabricant}
                onChange={handleChange}
                className="finput"
              />
            </div>
            <div className="fg">
              <label className="flabel">Modèle</label>
              <input
                name="modele"
                value={form.modele}
                onChange={handleChange}
                className="finput"
              />
            </div>
            <div className="fg">
              <label className="flabel">N° de série</label>
              <input
                name="numSerie"
                value={form.numSerie}
                onChange={handleChange}
                className="finput"
              />
            </div>
            <div className="fg">
              <label className="flabel">Date d'acquisition</label>
              <input
                name="dateAcquisition"
                type="date"
                value={form.dateAcquisition}
                onChange={handleChange}
                className="finput"
              />
            </div>
            <div className="fg">
              <label className="flabel">Valeur (DH)</label>
              <input
                name="valeur"
                type="number"
                step="0.01"
                value={form.valeur}
                onChange={handleChange}
                className="finput"
              />
            </div>
          </div>
          <div className="m-foot">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={loading}>
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}>
              {loading ? (
                "En cours…"
              ) : (
                <>
                  <Save size={13} /> {isEdit ? "Modifier" : "Ajouter"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ActifArborescencePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rootActif, setRootActif] = useState(null);
  const [selectedId, setSelectedId] = useState(id);
  const [selectedActif, setSelectedActif] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [unites, setUnites] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [parentForNew, setParentForNew] = useState(null);

  const chargerArbre = useCallback(async () => {
    setLoading(true);
    try {
      const [rootRes, sitesRes, unitesRes] = await Promise.all([
        getActif(id),
        getSites(),
        getUnites(),
      ]);
      setRootActif(rootRes.data);
      setSites(sitesRes.data.results || sitesRes.data);
      setUnites(unitesRes.data.results || unitesRes.data);
      // Select root by default if nothing selected or if current selection was deleted
      if (!selectedId || selectedId === id) {
        setSelectedActif(rootRes.data);
        setSelectedId(id);
      } else {
        // Find selected in tree
        const found = findInTree(rootRes.data, selectedId);
        if (found) {
          setSelectedActif(found);
        } else {
          setSelectedActif(rootRes.data);
          setSelectedId(id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    chargerArbre();
  }, [chargerArbre]);

  const handleSelect = useCallback(
    async (actifId) => {
      setSelectedId(actifId);
      // Find in tree first
      if (rootActif) {
        const found = findInTree(rootActif, actifId);
        if (found) {
          setSelectedActif(found);
          return;
        }
      }
      // Fallback: fetch from API
      try {
        const res = await getActif(actifId);
        setSelectedActif(res.data);
      } catch (e) {
        console.error(e);
      }
    },
    [rootActif],
  );

  const handleAddChild = () => {
    setEditTarget(null);
    setParentForNew(selectedId);
    setModalOpen(true);
  };

  const handleEdit = () => {
    setEditTarget(selectedActif);
    setParentForNew(null);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedActif) return;
    if (selectedActif.id === id) {
      if (
        !window.confirm("Supprimer l'actif racine et toute son arborescence ?")
      )
        return;
      try {
        await deleteActif(selectedActif.id);
        navigate("/actifs-racines");
      } catch {
        alert("Erreur lors de la suppression");
      }
      return;
    }
    if (
      !window.confirm(
        `Supprimer "${selectedActif.code}" et tous ses sous-actifs ?`,
      )
    )
      return;
    try {
      await deleteActif(selectedActif.id);
      setSelectedId(id);
      await chargerArbre();
    } catch {
      alert("Erreur lors de la suppression");
    }
  };

  const handleSaved = () => {
    chargerArbre();
  };

  if (loading) {
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l">
            <h1>Chargement…</h1>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div
            style={{
              width: 280,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--r)",
              padding: 16,
            }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{
                  width: `${60 + i * 5}%`,
                  height: 14,
                  marginBottom: 10,
                }}
              />
            ))}
          </div>
          <div
            style={{
              flex: 1,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--r)",
              padding: 20,
            }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{
                  width: `${50 + i * 6}%`,
                  height: 14,
                  marginBottom: 12,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!rootActif) {
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
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="hdr">
        <div
          className="hdr-l"
          style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => navigate("/actifs-racines")}
              title="Retour">
              <ArrowLeft size={16} />
            </button>
            <FolderTree
              size={20}
              style={{ color: "var(--accent)", opacity: 0.8 }}
            />
            <h1>
              {rootActif.code} — {rootActif.libelle}
            </h1>
          </div>
          <p style={{ paddingLeft: 42 }}>Arborescence et navigation</p>
        </div>
      </div>

      {/* Main content: Tree + Details */}
      <div
        style={{ display: "flex", gap: 16, minHeight: "calc(100vh - 180px)" }}>
        {/* Left: Tree */}
        <div
          style={{
            width: 300,
            minWidth: 260,
            maxWidth: 360,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--r)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-muted)",
              }}>
              Arborescence
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 4px" }}>
            <TreeNode
              actif={rootActif}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>
        </div>

        {/* Center: Details */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}>
          {selectedActif && (
            <>
              {/* Actions bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--r)",
                  padding: "10px 16px",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className="code-mono"
                    style={{ fontWeight: 600, fontSize: 15 }}>
                    {selectedActif.code}
                  </span>
                  <StatutBadge statut={selectedActif.statut} />
                  <TypeBadge type={selectedActif.type} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleAddChild}
                    title="Ajouter un sous-actif">
                    <Plus size={13} /> Ajouter enfant
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={handleEdit}
                    title="Modifier">
                    <Pencil size={13} /> Modifier
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleDelete}
                    title="Supprimer">
                    <Trash2 size={13} /> Supprimer
                  </button>
                </div>
              </div>

              {/* Breadcrumb */}
              {selectedActif.chemin_hierarchique &&
                selectedActif.chemin_hierarchique.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      color: "var(--text-muted)",
                      flexWrap: "wrap",
                    }}>
                    {selectedActif.chemin_hierarchique.map((c, i) => (
                      <span
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}>
                        <span
                          style={{
                            cursor: "pointer",
                            color: "var(--accent)",
                            textDecoration: "underline",
                          }}
                          onClick={() => handleSelect(c.id)}>
                          {c.code}
                        </span>
                        <ChevronRight size={10} />
                      </span>
                    ))}
                    <span
                      style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {selectedActif.code}
                    </span>
                  </div>
                )}

              {/* Info cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}>
                {/* Identification */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--r)",
                    padding: "18px 22px",
                  }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 12,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}>
                    Identification
                  </div>
                  <InfoRow label="Code" value={selectedActif.code} />
                  <InfoRow label="Libellé" value={selectedActif.libelle} />
                  <InfoRow
                    label="Type"
                    value={
                      TYPES[selectedActif.type]?.label || selectedActif.type
                    }
                  />
                  <InfoRow
                    label="Statut"
                    value={
                      STATUTS[selectedActif.statut]?.label ||
                      selectedActif.statut
                    }
                  />
                  <InfoRow
                    label="Description"
                    value={selectedActif.description}
                  />
                </div>

                {/* Localisation */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--r)",
                    padding: "18px 22px",
                  }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 12,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}>
                    Localisation
                  </div>
                  <InfoRow
                    label="Site"
                    value={selectedActif.site_detail?.libelle}
                  />
                  <InfoRow
                    label="Unité"
                    value={selectedActif.unite_detail?.libelle}
                  />
                  <InfoRow
                    label="Parent"
                    value={
                      selectedActif.parent_detail
                        ? `${selectedActif.parent_detail.code} — ${selectedActif.parent_detail.libelle}`
                        : "Aucun (racine)"
                    }
                  />
                </div>

                {/* Caractéristiques techniques */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--r)",
                    padding: "18px 22px",
                  }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 12,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}>
                    Caractéristiques techniques
                  </div>
                  <InfoRow label="Fabricant" value={selectedActif.fabricant} />
                  <InfoRow label="Modèle" value={selectedActif.modele} />
                  <InfoRow label="N° de série" value={selectedActif.numSerie} />
                </div>

                {/* Informations financières */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--r)",
                    padding: "18px 22px",
                  }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 12,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}>
                    Informations financières
                  </div>
                  <InfoRow
                    label="Date d'acquisition"
                    value={
                      selectedActif.dateAcquisition
                        ? new Date(
                            selectedActif.dateAcquisition,
                          ).toLocaleDateString("fr-FR")
                        : null
                    }
                  />
                  <InfoRow
                    label="Valeur"
                    value={
                      selectedActif.valeur
                        ? `${parseFloat(selectedActif.valeur).toLocaleString("fr-FR")} DH`
                        : null
                    }
                  />
                  <InfoRow
                    label="Durée de vie"
                    value={
                      selectedActif.duree_vie != null
                        ? `${selectedActif.duree_vie} jours`
                        : null
                    }
                  />
                  <InfoRow
                    label="Taux disponibilité"
                    value={
                      selectedActif.taux_disponibilite != null
                        ? `${selectedActif.taux_disponibilite}%`
                        : null
                    }
                  />
                </div>
              </div>

              {/* Sous-actifs directs */}
              {selectedActif.sous_actifs &&
                selectedActif.sous_actifs.length > 0 && (
                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--r)",
                      padding: "18px 22px",
                    }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 12,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}>
                      Sous-actifs directs ({selectedActif.sous_actifs.length})
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}>
                      {selectedActif.sous_actifs.map((child) => (
                        <div
                          key={child.id}
                          onClick={() => handleSelect(child.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: "var(--r-sm)",
                            cursor: "pointer",
                            border: "1px solid var(--border-subtle)",
                            transition: "all .15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "var(--bg-hover)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}>
                            <Package size={14} style={{ opacity: 0.5 }} />
                            <span
                              className="code-mono"
                              style={{ fontWeight: 600, fontSize: 13 }}>
                              {child.code}
                            </span>
                            <span
                              style={{
                                fontSize: 13,
                                color: "var(--text-muted)",
                              }}>
                              {child.libelle}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}>
                            <StatutBadge statut={child.statut} />
                            <ChevronRight
                              size={14}
                              style={{ color: "var(--text-muted)" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      <ActifFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditTarget(null);
        }}
        onSaved={handleSaved}
        parentId={parentForNew}
        editActif={editTarget}
        sites={sites}
        unites={unites}
      />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findInTree(node, targetId) {
  if (node.id === targetId) return node;
  if (node.sous_actifs) {
    for (const child of node.sous_actifs) {
      const found = findInTree(child, targetId);
      if (found) return found;
    }
  }
  return null;
}
