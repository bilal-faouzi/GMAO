import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useParams, useNavigate } from "react-router-dom";
import {
  getActif,
  createActif,
  updateActif,
  deleteActif,
} from "../../services/actifService";
import {
  getSites,
  getUnites,
  getSecteurs,
} from "../../services/organisationService";
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
  Box,
  MapPin,
  Wrench,
  CreditCard,
  Hash,
  Tag,
  FileText,
  CalendarDays,
  Gauge,
  Clock,
  Layers,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {Icon && (
          <Icon
            size={13}
            style={{ color: "var(--text-muted)", flexShrink: 0 }}
          />
        )}
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {label}
        </span>
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color:
            value && value !== "—"
              ? "var(--text-primary)"
              : "var(--text-muted)",
          textAlign: "right",
          maxWidth: "55%",
        }}>
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
      <Tooltip>
        <TooltipTrigger asChild>
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
              background: isSelected
                ? "var(--color-primary-soft)"
                : "transparent",
              color: isSelected ? "var(--accent)" : "var(--text-primary)",
              fontSize: 13,
              fontWeight: isSelected ? 600 : 400,
              transition: "all .15s",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              if (!isSelected)
                e.currentTarget.style.background = "var(--bg-hover)";
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
                {expanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
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
        </TooltipTrigger>
        <TooltipContent>
          <span>
            {actif.code} — {actif.libelle}
          </span>
        </TooltipContent>
      </Tooltip>
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

export function ActifFormModal({
  open,
  onClose,
  onSaved,
  parentId,
  parentActif, // ← nouveau prop : l'actif parent complet
  editActif,
  sites,
  unites,
  secteurs,
  defaultSiteId,
  defaultUniteId,
}) {
  const isEdit = Boolean(editActif);
  // isAddingChild = true quand on ajoute un enfant (pas en mode édition)
  const isAddingChild = !isEdit && Boolean(parentId);

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
      // Ajout d'un enfant : héritage du site et de l'unité du parent
      setForm({
        ...initialFormState,
        idParent: parentId || "",
        idSite: parentActif?.idSite || "" || defaultSiteId,
        idUnite: parentActif?.idUnite || "" || defaultUniteId,
      });
    }
    setErreur(null);
    setErrors({});
  }, [open, isEdit, editActif, parentId, parentActif]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
      // Réinitialise l'unité quand le site change (seulement si non verrouillé)
      ...(name === "idSite" ? { idUnite: "" } : {}),
    }));
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

  // ── Options filtrées site → secteur → unité ────────────────────────────────
  const siteOpts = useMemo(
    () =>
      sites.map((s) => ({ value: s.id, label: `${s.code} — ${s.libelle}` })),
    [sites],
  );

  const uniteOpts = useMemo(() => {
    if (!form.idSite) return [];
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

  if (!open) return null;

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
            {/* <div className="fg">
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
            </div> */}
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

            {/* Site */}
            <div className="fg">
              <label className="flabel">
                Site
                {isAddingChild && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 10,
                      color: "var(--text-muted)",
                      fontWeight: 400,
                    }}>
                    (hérité du parent)
                  </span>
                )}
              </label>
              {isAddingChild ? (
                <input
                  value={
                    parentActif?.site_detail?.libelle
                      ? `${parentActif.site_detail.code ?? ""} — ${parentActif.site_detail.libelle}`.replace(
                          /^— /,
                          "",
                        )
                      : siteOpts.find(
                          (o) => String(o.value) === String(form.idSite),
                        )?.label ||
                        form.idSite ||
                        "—"
                  }
                  disabled
                  className="finput disabled"
                  style={{ opacity: 0.7 }}
                />
              ) : (
                <select
                  name="idSite"
                  value={form.idSite}
                  onChange={handleChange}
                  className="fsel">
                  <option value="">— Sélectionner —</option>
                  {siteOpts.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Unité */}
            <div className="fg">
              <label className="flabel">
                Unité
                {isAddingChild && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 10,
                      color: "var(--text-muted)",
                      fontWeight: 400,
                    }}>
                    (hérité du parent)
                  </span>
                )}
              </label>
              {isAddingChild ? (
                <input
                  value={
                    parentActif?.unite_detail?.libelle
                      ? `${parentActif.unite_detail.code ?? ""} — ${parentActif.unite_detail.libelle}`.replace(
                          /^— /,
                          "",
                        )
                      : uniteOpts.find(
                          (o) => String(o.value) === String(form.idUnite),
                        )?.label ||
                        form.idUnite ||
                        "—"
                  }
                  disabled
                  className="finput disabled"
                  style={{ opacity: 0.7 }}
                />
              ) : (
                <select
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
                  {uniteOpts.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
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
  const [secteurs, setSecteurs] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [parentForNew, setParentForNew] = useState(null);
  const [parentActifForNew, setParentActifForNew] = useState(null); // ← nouveau state

  const chargerArbre = useCallback(async () => {
    setLoading(true);
    try {
      const [rootRes, sitesRes, unitesRes, secteursRes] = await Promise.all([
        getActif(id),
        getSites(),
        getUnites(),
        getSecteurs(),
      ]);
      setRootActif(rootRes.data);
      setSites(sitesRes.data.results || sitesRes.data);
      setUnites(unitesRes.data.results || unitesRes.data);
      setSecteurs(secteursRes.data.results || secteursRes.data);
      if (!selectedId || selectedId === id) {
        setSelectedActif(rootRes.data);
        setSelectedId(id);
      } else {
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
      if (rootActif) {
        const found = findInTree(rootActif, actifId);
        if (found) {
          setSelectedActif(found);
          return;
        }
      }
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
    setParentActifForNew(selectedActif); // ← on passe l'actif parent complet
    setModalOpen(true);
  };

  const handleEdit = () => {
    setEditTarget(selectedActif);
    setParentForNew(null);
    setParentActifForNew(null);
    setModalOpen(true);
  };

  // const handleDelete = async () => {
  //   if (!selectedActif) return;
  //   if (selectedActif.id === id) {
  //     try {
  //       await deleteActif(selectedActif.id);
  //       navigate("/actifs-racines");
  //     } catch {
  //       alert("Erreur lors de la suppression");
  //     }
  //     return;
  //   }
  //   try {
  //     await deleteActif(selectedActif.id);
  //     setSelectedId(id);
  //     await chargerArbre();
  //   } catch {
  //     alert("Erreur lors de la suppression");
  //   }
  // };

  const handleDelete = async () => {
    if (!selectedActif) return;

    try {
      await deleteActif(selectedActif.id);

      if (selectedActif.id === id) {
        navigate("/actifs-racines");
      } else {
        setSelectedId(id);
        await chargerArbre();
      }
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingBottom: 18,
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: 4,
          }}>
          <div
            className="skeleton"
            style={{ width: 32, height: 32, borderRadius: "var(--r-sm)" }}
          />
          <div
            className="skeleton"
            style={{ width: 22, height: 22, borderRadius: 4 }}
          />
          <div
            className="skeleton"
            style={{ width: 220, height: 22, borderRadius: 4 }}
          />
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div
            style={{
              width: 300,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--r)",
              padding: 16,
            }}>
            <div
              className="skeleton"
              style={{
                width: "50%",
                height: 10,
                marginBottom: 16,
                borderRadius: 4,
              }}
            />
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                  paddingLeft: i > 2 ? 18 : 0,
                }}>
                <div
                  className="skeleton"
                  style={{ width: 14, height: 14, borderRadius: 3 }}
                />
                <div
                  className="skeleton"
                  style={{
                    width: `${55 + i * 5}%`,
                    height: 13,
                    borderRadius: 4,
                  }}
                />
              </div>
            ))}
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}>
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r)",
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
              }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div
                  className="skeleton"
                  style={{ width: 80, height: 24, borderRadius: 4 }}
                />
                <div
                  className="skeleton"
                  style={{ width: 60, height: 24, borderRadius: 20 }}
                />
                <div
                  className="skeleton"
                  style={{ width: 70, height: 24, borderRadius: 20 }}
                />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <div
                  className="skeleton"
                  style={{
                    width: 110,
                    height: 32,
                    borderRadius: "var(--r-sm)",
                  }}
                />
                <div
                  className="skeleton"
                  style={{ width: 90, height: 32, borderRadius: "var(--r-sm)" }}
                />
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}>
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
                      width: "40%",
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
                      width: "75%",
                      height: 11,
                      marginBottom: 12,
                      borderRadius: 4,
                    }}
                  />
                  <div
                    className="skeleton"
                    style={{ width: "60%", height: 11, borderRadius: 4 }}
                  />
                </div>
              ))}
            </div>
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
            onClick={() => navigate("/actifs-racines")}
            title="Retour">
            <ArrowLeft size={16} />
          </button>
          <FolderTree
            size={20}
            style={{ color: "var(--accent)", opacity: 0.8 }}
          />
          <div>
            <h1
              style={{
                fontSize: 21,
                fontWeight: 700,
                letterSpacing: "-0.3px",
                color: "var(--text-primary)",
              }}>
              {rootActif.code} — {rootActif.libelle}
            </h1>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 2,
                display: "block",
              }}>
              Arborescence et navigation
            </span>
          </div>
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
              gap: 8,
            }}>
            <Layers
              size={14}
              style={{ color: "var(--accent)", opacity: 0.7 }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="btn btn-danger"
                        title="Supprimer"
                        onClick={(e) => e.stopPropagation()}>
                        <Trash2 size={13} /> Supprimer
                      </button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer l’actif</AlertDialogTitle>

                        <AlertDialogDescription>
                          {selectedActif?.id === id ? (
                            <>
                              Vous allez supprimer{" "}
                              <strong>l’actif racine</strong> ainsi que toute
                              son arborescence.
                              <br />
                              Cette action est irréversible.
                            </>
                          ) : (
                            <>
                              Voulez-vous vraiment supprimer{" "}
                              <strong>{selectedActif?.code}</strong> et tous ses
                              sous-actifs ?
                              <br />
                              Cette action est irréversible.
                            </>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>

                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700">
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Breadcrumb */}
              {selectedActif.chemin_hierarchique &&
                selectedActif.chemin_hierarchique.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: "var(--text-muted)",
                      flexWrap: "wrap",
                      padding: "8px 12px",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--r-sm)",
                    }}>
                    {selectedActif.chemin_hierarchique.map((c, i) => (
                      <span
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}>
                        <span
                          style={{
                            cursor: "pointer",
                            color: "var(--accent)",
                            fontWeight: 500,
                            transition: "opacity .15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "0.7";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                          onClick={() => handleSelect(c.id)}>
                          {c.code}
                        </span>
                        <ChevronRight size={10} style={{ opacity: 0.4 }} />
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
                    padding: "20px 22px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      paddingBottom: 14,
                      borderBottom: "1px solid var(--border-subtle)",
                    }}>
                    <Box size={15} style={{ color: "var(--color-primary)" }} />
                    <span className="tbl-title" style={{ margin: 0 }}>
                      Identification
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "var(--r-sm)",
                        background: "var(--color-primary-soft)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                      <Hash
                        size={20}
                        style={{ color: "var(--color-primary)" }}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 16,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          letterSpacing: ".02em",
                        }}>
                        {selectedActif.code}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          marginTop: 2,
                        }}>
                        {selectedActif.libelle}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <StatutBadge statut={selectedActif.statut} />
                    <TypeBadge type={selectedActif.type} />
                  </div>
                  {selectedActif.description && (
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "var(--bg-elevated)",
                        borderRadius: "var(--r-sm)",
                        borderLeft: "3px solid var(--color-primary)",
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: 1.6,
                      }}>
                      {selectedActif.description}
                    </div>
                  )}
                </div>

                {/* Localisation */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--r)",
                    padding: "20px 22px",
                  }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      paddingBottom: 14,
                      borderBottom: "1px solid var(--border-subtle)",
                    }}>
                    <MapPin
                      size={15}
                      style={{ color: "var(--status-cyan-dot)" }}
                    />
                    <span className="tbl-title" style={{ margin: 0 }}>
                      Localisation
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      marginTop: 14,
                    }}>
                    {[
                      {
                        icon: MapPin,
                        label: "Site",
                        value: selectedActif.site_detail?.libelle,
                        color: "var(--status-cyan-dot)",
                      },
                      {
                        icon: Layers,
                        label: "Unité",
                        value: selectedActif.unite_detail?.libelle,
                        color: "var(--status-blue-dot)",
                      },
                      {
                        icon: FolderTree,
                        label: "Parent",
                        value: selectedActif.parent_detail
                          ? `${selectedActif.parent_detail.code} — ${selectedActif.parent_detail.libelle}`
                          : null,
                        color: "var(--status-purple-dot)",
                      },
                    ].map(({ icon: Ic, label, value: val, color }) => (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          background: "var(--bg-elevated)",
                          borderRadius: "var(--r-sm)",
                        }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: color,
                            opacity: 0.12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                            flexShrink: 0,
                          }}>
                          <Ic
                            size={15}
                            style={{ position: "absolute", color, opacity: 1 }}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              textTransform: "uppercase",
                              letterSpacing: ".05em",
                              fontWeight: 600,
                            }}>
                            {label}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: val
                                ? "var(--text-primary)"
                                : "var(--text-muted)",
                              marginTop: 1,
                            }}>
                            {val || "Non renseigné"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Caractéristiques techniques */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--r)",
                    padding: "20px 22px",
                  }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      paddingBottom: 14,
                      borderBottom: "1px solid var(--border-subtle)",
                    }}>
                    <Wrench
                      size={15}
                      style={{ color: "var(--status-orange-dot)" }}
                    />
                    <span className="tbl-title" style={{ margin: 0 }}>
                      Caractéristiques techniques
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      marginTop: 14,
                    }}>
                    {[
                      { label: "Fabricant", value: selectedActif.fabricant },
                      { label: "Modèle", value: selectedActif.modele },
                    ].map(({ label, value: val }) => (
                      <div
                        key={label}
                        style={{
                          padding: "12px 14px",
                          background: "var(--bg-elevated)",
                          borderRadius: "var(--r-sm)",
                        }}>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: ".05em",
                            fontWeight: 600,
                            marginBottom: 4,
                          }}>
                          {label}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: val
                              ? "var(--text-primary)"
                              : "var(--text-muted)",
                          }}>
                          {val || "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 14px",
                      background: "var(--bg-elevated)",
                      borderRadius: "var(--r-sm)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}>
                    <Hash
                      size={14}
                      style={{
                        color: "var(--status-orange-dot)",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: ".05em",
                          fontWeight: 600,
                          marginBottom: 2,
                        }}>
                        N° de série
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          fontFamily: "var(--font-mono)",
                          color: selectedActif.numSerie
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                        }}>
                        {selectedActif.numSerie || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informations financières */}
                <div
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--r)",
                    padding: "20px 22px",
                  }}>
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
                      style={{ color: "var(--status-green-dot)" }}
                    />
                    <span className="tbl-title" style={{ margin: 0 }}>
                      Informations financières
                    </span>
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      padding: "18px 0 14px",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        fontWeight: 600,
                        marginBottom: 6,
                      }}>
                      Valeur d'acquisition
                    </div>
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: selectedActif.valeur
                          ? "var(--status-green-text)"
                          : "var(--text-muted)",
                        letterSpacing: "-0.5px",
                      }}>
                      {selectedActif.valeur
                        ? `${parseFloat(selectedActif.valeur).toLocaleString("fr-FR")} DH`
                        : "—"}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 8,
                      marginTop: 14,
                    }}>
                    {[
                      {
                        icon: CalendarDays,
                        label: "Acquisition",
                        value: selectedActif.dateAcquisition
                          ? new Date(
                              selectedActif.dateAcquisition,
                            ).toLocaleDateString("fr-FR")
                          : "—",
                      },
                      {
                        icon: Clock,
                        label: "Durée de vie",
                        value:
                          selectedActif.duree_vie != null
                            ? `${selectedActif.duree_vie}j`
                            : "—",
                      },
                      {
                        icon: Gauge,
                        label: "Disponibilité",
                        value:
                          selectedActif.taux_disponibilite != null
                            ? `${selectedActif.taux_disponibilite}%`
                            : "—",
                      },
                    ].map(({ icon: Ic, label, value: val }) => (
                      <div
                        key={label}
                        style={{
                          textAlign: "center",
                          padding: "10px 6px",
                          background: "var(--bg-elevated)",
                          borderRadius: "var(--r-sm)",
                        }}>
                        <Ic
                          size={14}
                          style={{
                            color: "var(--text-muted)",
                            marginBottom: 4,
                          }}
                        />
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color:
                              val !== "—"
                                ? "var(--text-primary)"
                                : "var(--text-muted)",
                          }}>
                          {val}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--text-muted)",
                            marginTop: 2,
                            textTransform: "uppercase",
                            letterSpacing: ".04em",
                          }}>
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
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
                      padding: "20px 22px",
                    }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingBottom: 14,
                        borderBottom: "1px solid var(--border-subtle)",
                      }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}>
                        <Package
                          size={15}
                          style={{ color: "var(--status-purple-dot)" }}
                        />
                        <span className="tbl-title" style={{ margin: 0 }}>
                          Sous-actifs directs
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
                          }}>
                          {selectedActif.sous_actifs.length}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        marginTop: 14,
                      }}>
                      {selectedActif.sous_actifs.map((child) => (
                        <div
                          key={child.id}
                          onClick={() => handleSelect(child.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            borderRadius: "var(--r-sm)",
                            cursor: "pointer",
                            background: "var(--bg-elevated)",
                            border: "1px solid transparent",
                            transition: "all .15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor =
                              "var(--border-subtle)";
                            e.currentTarget.style.background =
                              "var(--bg-hover)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "transparent";
                            e.currentTarget.style.background =
                              "var(--bg-elevated)";
                          }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}>
                            <Package
                              size={14}
                              style={{
                                color: "var(--text-muted)",
                                opacity: 0.6,
                              }}
                            />
                            <span
                              className="code-mono"
                              style={{ fontWeight: 600, fontSize: 12.5 }}>
                              {child.code}
                            </span>
                            <span
                              style={{
                                fontSize: 13,
                                color: "var(--text-secondary)",
                              }}>
                              {child.libelle}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}>
                            <StatutBadge statut={child.statut} />
                            <ChevronRight
                              size={14}
                              style={{
                                color: "var(--text-muted)",
                                opacity: 0.5,
                              }}
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
          setParentActifForNew(null);
        }}
        onSaved={handleSaved}
        parentId={parentForNew}
        parentActif={parentActifForNew} // ← nouveau prop passé au modal
        editActif={editTarget}
        sites={sites}
        unites={unites}
        secteurs={secteurs}
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
