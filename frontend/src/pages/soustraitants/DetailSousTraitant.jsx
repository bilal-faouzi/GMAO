import { useState, useEffect, useCallback } from "react";
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
  AlertTriangle,
  ShieldX,
  ServerCrash,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// ─── STATUT ───────────────────────────────────────────────────────────────────

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

// ─── MESSAGES D'ERREUR SPÉCIALISÉS ───────────────────────────────────────────

/**
 * Extrait le code d'erreur et le contexte d'une réponse axios.
 * Retourne { icon, title, description, variant }
 */
function parseApiError(error, context = "default") {
  const data = error?.response?.data;
  const httpStatus = error?.response?.status;
  const code = data?.erreur;

  // --- Accès refusé ---
  if (httpStatus === 403 || code === "ACCES_REFUSE") {
    return {
      icon: ShieldX,
      title: "Accès refusé",
      description:
        context === "delete"
          ? "Vous n'avez pas les droits pour supprimer un sous-traitant. Contactez un administrateur."
          : context === "statut"
            ? "Vous n'avez pas les droits pour modifier le statut de ce sous-traitant."
            : context === "specialite_add"
              ? "Vous n'avez pas les droits pour assigner une spécialité."
              : context === "specialite_remove"
                ? "Vous n'avez pas les droits pour retirer une spécialité."
                : "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
      variant: "error",
    };
  }

  // --- Introuvable ---
  if (httpStatus === 404 || code === "SOUS_TRAITANT_INTROUVABLE") {
    return {
      icon: AlertCircle,
      title: "Sous-traitant introuvable",
      description:
        "Ce sous-traitant n'existe plus ou a déjà été supprimé. La page va se recharger.",
      variant: "warning",
    };
  }

  // --- UUID malformé ---
  if (code === "UUID_INVALIDE") {
    return {
      icon: AlertCircle,
      title: "Identifiant invalide",
      description: "L'identifiant fourni est malformé. Vérifiez l'URL.",
      variant: "error",
    };
  }

  // --- Doublons ---
  if (code === "RAISON_SOCIALE_DEJA_EXISTANTE") {
    return {
      icon: AlertTriangle,
      title: "Raison sociale déjà existante",
      description:
        data?.message ||
        "Un autre sous-traitant avec cette raison sociale existe déjà.",
      variant: "warning",
    };
  }

  // --- Statut déjà identique ---
  if (code === "TRANSITION_STATUT_INVALIDE") {
    return {
      icon: AlertCircle,
      title: "Changement de statut impossible",
      description: "Le nouveau statut est identique au statut actuel.",
      variant: "warning",
    };
  }

  // --- Spécialité déjà assignée ---
  if (code === "SPECIALITE_DEJA_ASSIGNEE") {
    return {
      icon: AlertTriangle,
      title: "Spécialité déjà assignée",
      description: "Ce sous-traitant possède déjà cette spécialité.",
      variant: "warning",
    };
  }

  // --- Spécialité inactive ---
  if (code === "SPECIALITE_INACTIVE") {
    return {
      icon: AlertTriangle,
      title: "Spécialité archivée",
      description:
        "Cette spécialité est archivée et ne peut plus être assignée.",
      variant: "warning",
    };
  }

  // --- Spécialité introuvable ---
  if (code === "SPECIALITE_INTROUVABLE") {
    return {
      icon: AlertCircle,
      title: "Spécialité introuvable",
      description:
        context === "specialite_remove"
          ? "Cette spécialité n'est pas assignée à ce sous-traitant."
          : "La spécialité sélectionnée est introuvable.",
      variant: "error",
    };
  }

  // --- Validation ---
  if (code === "VALIDATION_ECHEC" || httpStatus === 422) {
    const details = data?.details;
    const detail =
      Array.isArray(details) && details.length > 0
        ? details.map((d) => d.message || d.champ).join(", ")
        : data?.message || "Données invalides.";
    return {
      icon: AlertTriangle,
      title: "Erreur de validation",
      description: detail,
      variant: "warning",
    };
  }

  // --- Réseau / serveur ---
  if (!error?.response) {
    return {
      icon: ServerCrash,
      title: "Problème réseau",
      description:
        "Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.",
      variant: "error",
    };
  }

  if (httpStatus >= 500) {
    return {
      icon: ServerCrash,
      title: "Erreur serveur",
      description: "Une erreur inattendue s'est produite côté serveur (5xx).",
      variant: "error",
    };
  }

  // --- Fallback ---
  return {
    icon: AlertCircle,
    title: "Erreur inattendue",
    description:
      data?.message || error?.message || "Une erreur s'est produite.",
    variant: "error",
  };
}

// ─── COMPOSANT NOTIFICATION ───────────────────────────────────────────────────

const VARIANT_STYLES = {
  error: {
    bg: "var(--status-red-bg)",
    border: "var(--status-red-dot)",
    title: "var(--status-red-text)",
    icon: "var(--status-red-dot)",
    bar: "var(--status-red-dot)",
  },
  warning: {
    bg: "var(--status-orange-bg, #fff7ed)",
    border: "var(--status-orange-dot)",
    title: "var(--status-orange-text, #9a3412)",
    icon: "var(--status-orange-dot)",
    bar: "var(--status-orange-dot)",
  },
  success: {
    bg: "var(--status-green-bg)",
    border: "var(--status-green-dot)",
    title: "var(--status-green-text)",
    icon: "var(--status-green-dot)",
    bar: "var(--status-green-dot)",
  },
};

function Notification({
  id,
  icon: Icon,
  title,
  description,
  variant,
  onClose,
}) {
  const s = VARIANT_STYLES[variant] || VARIANT_STYLES.error;

  useEffect(() => {
    const t = setTimeout(() => onClose(id), 5500);
    return () => clearTimeout(t);
  }, [id, onClose]);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderLeft: `3px solid ${s.bar}`,
        borderRadius: "var(--r-sm)",
        padding: "12px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,.08)",
        minWidth: 300,
        maxWidth: 400,
        animation: "slideIn .22s ease",
      }}>
      <Icon size={16} style={{ color: s.icon, flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: s.title,
            marginBottom: 2,
          }}>
          {title}
        </p>
        {description && (
          <p
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}>
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: "none",
          background: "transparent",
          color: "var(--text-muted)",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
        }}>
        <X size={12} />
      </button>
    </div>
  );
}

function NotificationStack({ notifications, onClose }) {
  if (!notifications.length) return null;
  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}>
        {notifications.map((n) => (
          <div key={n.id} style={{ pointerEvents: "auto" }}>
            <Notification {...n} onClose={onClose} />
          </div>
        ))}
      </div>
    </>
  );
}

// ─── HOOK NOTIFICATIONS ───────────────────────────────────────────────────────

let _notifId = 0;
function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  const push = useCallback((notif) => {
    const id = ++_notifId;
    setNotifications((prev) => [...prev, { ...notif, id }]);
  }, []);

  const remove = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const pushError = useCallback(
    (error, context) => {
      push(parseApiError(error, context));
    },
    [push],
  );

  const pushSuccess = useCallback(
    (title, description) => {
      push({ icon: CheckCircle2, title, description, variant: "success" });
    },
    [push],
  );

  return { notifications, push, pushError, pushSuccess, remove };
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

export default function DetailSousTraitant() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [st, setSt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [specialitesAll, setSpecialitesAll] = useState([]);
  const [selectedSpec, setSelectedSpec] = useState("");

  // Modals
  const [statutModal, setStatutModal] = useState(false);
  const [nouveauStatut, setNouveauStatut] = useState("");
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [specRemoveModal, setSpecRemoveModal] = useState(null); // { id, libelle, code }
  const [specRemoveLoading, setSpecRemoveLoading] = useState(false);

  const { notifications, pushError, pushSuccess, remove } = useNotifications();

  const charger = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    charger();
  }, [charger]);

  // ── Suppression ──────────────────────────────────────────────────────────

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteSousTraitant(id);
      setDeleteModal(false);
      navigate("/soustraitants");
    } catch (e) {
      setDeleteLoading(false);
      setDeleteModal(false);
      pushError(e, "delete");
    }
  };

  // ── Changer statut ───────────────────────────────────────────────────────

  const handleChangerStatut = async () => {
    if (!nouveauStatut || nouveauStatut === st.statut) return;
    try {
      const res = await changerStatut(id, nouveauStatut);
      setStatutModal(false);
      setNouveauStatut("");
      // Avertissements côté API (uniquement prestataire, pas d'erreur)
      const avertissements = res?.data?.avertissements;
      if (avertissements?.length) {
        avertissements.forEach((a) => {
          push({
            icon: AlertTriangle,
            title: "Avertissement",
            description: a.message || a,
            variant: "warning",
          });
        });
      } else {
        pushSuccess(
          "Statut mis à jour",
          `Le sous-traitant est désormais « ${nouveauStatut} ».`,
        );
      }
      charger();
    } catch (e) {
      setStatutModal(false);
      setNouveauStatut("");
      pushError(e, "statut");
    }
  };

  // ── Assigner spécialité ──────────────────────────────────────────────────

  const handleAssignerSpec = async () => {
    if (!selectedSpec) return;
    try {
      await assignerSpecialite(id, selectedSpec);
      setSelectedSpec("");
      pushSuccess(
        "Spécialité assignée",
        "La spécialité a été ajoutée avec succès.",
      );
      charger();
    } catch (e) {
      pushError(e, "specialite_add");
    }
  };

  // ── Retirer spécialité ───────────────────────────────────────────────────

  const handleRetirerSpec = async () => {
    if (!specRemoveModal) return;
    setSpecRemoveLoading(true);
    try {
      await retirerSpecialite(id, specRemoveModal.id);
      setSpecRemoveModal(null);
      setSpecRemoveLoading(false);
      pushSuccess(
        "Spécialité retirée",
        `« ${specRemoveModal.libelle} » a été retirée.`,
      );
      charger();
    } catch (e) {
      setSpecRemoveModal(null);
      setSpecRemoveLoading(false);
      pushError(e, "specialite_remove");
    }
  };

  // ── push helper (needed for avertissements) ──────────────────────────────
  const { push } = useNotifications(); // eslint-disable-line
  // NOTE: on réutilise le hook localement — en production, passer par un contexte global.

  // ── Loading skeleton ─────────────────────────────────────────────────────

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
  const assignedIds = new Set((st.specialites || []).map((s) => s.id));
  const availableSpecs = specialitesAll.filter(
    (s) => !assignedIds.has(String(s.id)),
  );

  return (
    <div className="page">
      {/* ── Notifications ── */}
      <NotificationStack notifications={notifications} onClose={remove} />

      {/* ── Header ── */}
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
          <button
            className="btn btn-danger"
            onClick={() => setDeleteModal(true)}>
            <Trash2 size={13} /> Supprimer
          </button>
        </div>
      </div>

      {/* ── Infos ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Identification */}
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

        {/* Contacts */}
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
            {[
              {
                label: "Contact principal",
                color: "var(--color-primary)",
                icon: UserRound,
                nom: st.contactPrincipalNom,
                tel: st.contactPrincipalTel,
                email: st.contactPrincipalEmail,
              },
              {
                label: "Contact technique",
                color: "var(--status-orange-dot)",
                icon: Wrench,
                nom: st.contactTechniqueNom,
                tel: st.contactTechniqueTel,
                email: st.contactTechniqueEmail,
              },
            ].map(({ label, color, icon: Icon, nom, tel, email }) => (
              <div
                key={label}
                style={{
                  borderLeft: `3px solid ${color}`,
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
                  <Icon size={14} style={{ color }} />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      color,
                    }}>
                    {label}
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
                    {nom || "Non renseigné"}
                  </div>
                  {[
                    { icon: Phone, value: tel },
                    { icon: Mail, value: email },
                  ].map(({ icon: I, value }) => (
                    <div
                      key={value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                      }}>
                      <I
                        size={13}
                        style={{ color: "var(--text-muted)", flexShrink: 0 }}
                      />
                      <span
                        style={{
                          color: value
                            ? "var(--text-secondary)"
                            : "var(--text-muted)",
                        }}>
                        {value || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tarifs & Habilitations ── */}
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

      {/* ── Spécialités ── */}
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
                  onClick={() =>
                    setSpecRemoveModal({
                      id: spec.id,
                      libelle: spec.libelle,
                      code: spec.code,
                    })
                  }
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

        {/* Assigner */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid var(--border-subtle)",
            alignItems: "center",
          }}>
          <Select value={selectedSpec} onValueChange={setSelectedSpec}>
            <SelectTrigger style={{ flex: 1 }}>
              <SelectValue placeholder="Sélectionner une spécialité…" />
            </SelectTrigger>
            <SelectContent>
              {availableSpecs.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.code} — {s.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            className="btn btn-primary"
            disabled={!selectedSpec}
            onClick={handleAssignerSpec}>
            <Plus size={14} /> Assigner
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          DIALOG — Changer le statut
      ════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={statutModal}
        onOpenChange={(o) => {
          setStatutModal(o);
          if (!o) setNouveauStatut("");
        }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Changer le statut</DialogTitle>
            <DialogDescription>
              Statut actuel :{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {st.statut}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="space-y-1.5">
              <Label>Nouveau statut</Label>
              <Select value={nouveauStatut} onValueChange={setNouveauStatut}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {STATUT_OPTIONS.filter((s) => s !== st.statut).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatutModal(false)}>
              Annuler
            </Button>
            <Button disabled={!nouveauStatut} onClick={handleChangerStatut}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════
          DIALOG — Confirmer la suppression du sous-traitant
      ════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={deleteModal}
        onOpenChange={(o) => !deleteLoading && setDeleteModal(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle
              style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "var(--status-red-bg)",
                  flexShrink: 0,
                }}>
                <Trash2 size={16} style={{ color: "var(--status-red-dot)" }} />
              </div>
              Supprimer le sous-traitant
            </DialogTitle>
            <DialogDescription style={{ paddingTop: 4 }}>
              Vous êtes sur le point de supprimer définitivement{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {st.raisonSociale}
              </strong>
              . Cette action est irréversible et supprimera également toutes les
              spécialités associées.
            </DialogDescription>
          </DialogHeader>

          {/* Récap rapide */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: "12px 14px",
              background: "var(--status-red-bg)",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--status-red-dot)",
              fontSize: 12,
            }}>
            {st.ICE && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>ICE</span>
                <span
                  style={{ fontWeight: 600, color: "var(--status-red-text)" }}>
                  {st.ICE}
                </span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Spécialités</span>
              <span
                style={{ fontWeight: 600, color: "var(--status-red-text)" }}>
                {st.specialites?.length || 0} assignée(s)
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Statut</span>
              <span
                style={{ fontWeight: 600, color: "var(--status-red-text)" }}>
                {st.statut}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModal(false)}
              disabled={deleteLoading}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
              style={{ background: "var(--status-red-dot)" }}>
              {deleteLoading ? "Suppression…" : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════
          DIALOG — Confirmer le retrait d'une spécialité
      ════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={!!specRemoveModal}
        onOpenChange={(o) =>
          !specRemoveLoading && !o && setSpecRemoveModal(null)
        }>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle
              style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "var(--status-orange-bg, #fff7ed)",
                  flexShrink: 0,
                }}>
                <Tags size={16} style={{ color: "var(--status-orange-dot)" }} />
              </div>
              Retirer la spécialité
            </DialogTitle>
            {specRemoveModal && (
              <DialogDescription style={{ paddingTop: 4 }}>
                Voulez-vous retirer{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {specRemoveModal.code} — {specRemoveModal.libelle}
                </strong>{" "}
                de ce sous-traitant ?
              </DialogDescription>
            )}
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSpecRemoveModal(null)}
              disabled={specRemoveLoading}>
              Annuler
            </Button>
            <Button
              onClick={handleRetirerSpec}
              disabled={specRemoveLoading}
              style={{
                background: "var(--status-orange-dot)",
                color: "#fff",
                border: "none",
              }}>
              {specRemoveLoading ? "Retrait…" : "Retirer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
