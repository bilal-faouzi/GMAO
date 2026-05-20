import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getOT,
  changerStatutOT,
  ajouterCommentaire,
  getCommentaires,
  getHistoriqueOT,
  affecterEquipe,
  getMembresEquipe,
  deleteAffectation,
  updateAffectation,
} from "../../services/ordreService";
import { getJournalAuditv2 } from "../../services/securiteService";
import { getEquipes } from "../../services/organisationService";
import useAuthStore from "@/store/authStore";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  User,
  Wrench,
  MessageSquare,
  AlertTriangle,
  Plus,
  X,
  Package,
  Clock,
  ArrowLeft,
  ChevronRight,
  Send,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const stripEmojis = (str) =>
  str?.replace(
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
    "",
  ) || "";

// ─── Statuts affectation ──────────────────────────────────────────────────────
const STATUT_AFFECTATION_LABEL = {
  en_attente: "En attente",
  en_cours: "En cours",
  termine: "Terminé",
  rejeter: "Rejeté",
};

// ─── Config audit ─────────────────────────────────────────────────────────────
const AUDIT_ACTION_CONFIG = {
  CREATE: {
    label: "Création",
    cls: "bg-success-soft text-success border-success/30",
    dot: "bg-success",
  },
  UPDATE: {
    label: "Modification",
    cls: "bg-primary-soft text-primary border-primary/30",
    dot: "bg-primary",
  },
  DELETE: {
    label: "Suppression",
    cls: "bg-danger-soft text-danger border-danger/30",
    dot: "bg-danger",
  },
  CHANGE_STATUS: {
    label: "Changement de statut",
    cls: "bg-warning/20 text-warning border-warning/30",
    dot: "bg-warning",
  },
  VALIDER: {
    label: "Validation",
    cls: "bg-primary-soft text-primary border-primary/30",
    dot: "bg-primary",
  },
  REJECT: {
    label: "Rejet",
    cls: "bg-danger-soft text-danger border-danger/30",
    dot: "bg-danger",
  },
  UPLOAD_FICHIERS: {
    label: "Fichiers ajoutés",
    cls: "bg-status-cyan/20 text-status-cyan border-status-cyan/30",
    dot: "bg-status-cyan",
  },
  CLOTURER: {
    label: "Clôture",
    cls: "bg-success-soft text-success border-success/30",
    dot: "bg-success",
  },
  ENREGISTRER_PIECE: {
    label: "Pièce utilisée",
    cls: "bg-primary-soft text-primary border-primary/30",
    dot: "bg-primary",
  },
  AJOUTER_COMMENTAIRE: {
    label: "Commentaire",
    cls: "bg-primary-soft text-primary border-primary/30",
    dot: "bg-primary",
  },
};

function getAuditConfig(action) {
  return (
    AUDIT_ACTION_CONFIG[action] || {
      label: action,
      cls: "bg-hover text-text-muted border-border/30",
      dot: "bg-text-muted",
    }
  );
}

function formatAuditValue(val) {
  if (!val) return "—";
  if (typeof val === "object")
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  return String(val);
}

// ─── Timeline Audit ───────────────────────────────────────────────────────────
function AuditTimelineItem({ entry, isLast }) {
  const cfg = getAuditConfig(entry.action);
  const userName = entry.utilisateur
    ? `${entry.utilisateur.prenom || ""} ${entry.utilisateur.nom || ""}`.trim()
    : "Système";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full ${cfg.dot} ring-4 ring-surface`}
        />
        {!isLast && <div className="w-px flex-1 bg-hover my-1" />}
      </div>
      <div className="flex-1 pb-4">
        <div className="bg-elevated border border-border-subtle rounded-xl p-3 hover:border-border transition-colors">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold border border-blue-200 dark:border-blue-500/30 flex-shrink-0">
                {initials || "?"}
              </div>
              <div>
                <p className="text-xs font-semibold text-text">{userName}</p>
                <p className="text-[10px] text-text-muted">
                  {new Date(entry.horodatage).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${cfg.cls}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-[11px] text-text-muted mb-1.5">
            Module : <span className="text-text-secondary">{entry.module}</span>
            {entry.type_entite && (
              <>
                {" "}
                · Entité :{" "}
                <span className="text-text-secondary">{entry.type_entite}</span>
              </>
            )}
          </p>
          {(entry.ancienne_valeur || entry.nouvelle_valeur) && (
            <div className="mt-2 space-y-1.5">
              {entry.ancienne_valeur && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-text-muted shrink-0 w-12">Avant :</span>
                  <span className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 rounded px-1.5 py-0.5 break-all">
                    {formatAuditValue(entry.ancienne_valeur)}
                  </span>
                </div>
              )}
              {entry.nouvelle_valeur && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-text-muted shrink-0 w-12">Après :</span>
                  <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 rounded px-1.5 py-0.5 break-all">
                    {formatAuditValue(entry.nouvelle_valeur)}
                  </span>
                </div>
              )}
            </div>
          )}
          {entry.adresse_ip && (
            <p className="text-[10px] text-text-muted mt-2 font-mono">
              IP : {entry.adresse_ip}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Statuts OT ───────────────────────────────────────────────────────────────
const STATUT = {
  EN_COURS: {
    label: "En cours",
    cls: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/40",
  },
  DEPANNE: {
    label: "Dépanné",
    cls: "bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/40",
  },
  CLOTURE: {
    label: "Clôturé",
    cls: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40",
  },
  REJETE: {
    label: "Rejeté",
    cls: "bg-danger-soft text-danger border-danger/30",
  },
};

// ─── Empty State helper ────────────────────────────────────────────────────────
function EmptyState({ message }) {
  return <p className="text-text-muted text-sm text-center py-8">{message}</p>;
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function DetailOT() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore();

  const [ot, setOT] = useState(null);
  const [commentaires, setCommentaires] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog Dépanné
  const [modalDepanne, setModalDepanne] = useState(false);
  const [motifDepanne, setMotifDepanne] = useState("");
  const [loadingDepanne, setLoadingDepanne] = useState(false);

  // Dialog Clôturer
  const [modalCloture, setModalCloture] = useState(false);
  const [motifCloture, setMotifCloture] = useState("");
  const [typeCloture, setTypeCloture] = useState("corrige");
  const [loadingCloture, setLoadingCloture] = useState(false);

  // Commentaire
  const [newComment, setNewComment] = useState("");
  const [estInterne, setEstInterne] = useState(false);

  // Affectation
  const [modalAffectation, setModalAffectation] = useState(false);
  const [editingAffectation, setEditingAffectation] = useState(null);
  const [equipes, setEquipes] = useState([]);
  const [selectedEquipe, setSelectedEquipe] = useState("");
  const [membresEquipe, setMembresEquipe] = useState([]);
  const [selectedMembres, setSelectedMembres] = useState([]);
  const [editStatut, setEditStatut] = useState("");
  const [loadingAffectation, setLoadingAffectation] = useState(false);

  const estVerrouille = ["DEPANNE", "CLOTURE", "REJETE"].includes(ot?.statut);

  // ─── Chargement ──────────────────────────────────────────────────────────────
  const charger = async () => {
    try {
      const [o, c, h, a] = await Promise.all([
        getOT(id),
        getCommentaires(id),
        getHistoriqueOT(id),
        getJournalAuditv2({
          id_entite: id,
          type_entite: "OrdreTravail",
          page_size: 100,
        }),
      ]);
      setOT(o.data);
      setCommentaires(c.data.results ?? c.data);
      setHistorique(h.data.results ?? h.data);
      setAudit(a.data.results ?? a.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, [id]);

  // ─── Affectation ─────────────────────────────────────────────────────────────
  const openAffectationModal = async (affectation = null) => {
    setEditingAffectation(affectation);
    setModalAffectation(true);
    setSelectedEquipe("");
    setMembresEquipe([]);
    setSelectedMembres([]);
    setEditStatut("");
    try {
      const r = await getEquipes({ estActif: true, no_page: true });
      setEquipes(r.data.results ?? r.data ?? []);
    } catch (e) {
      console.error(e);
    }
    if (affectation) {
      setEditStatut(affectation.statut || "");
      const eqId = affectation.equipe_detail?.id || affectation.idEquipe;
      if (eqId) {
        setSelectedEquipe(eqId);
        try {
          const r = await getMembresEquipe(eqId);
          const data = r.data.results ?? r.data ?? [];
          setMembresEquipe(data);
          const currentIds = (affectation.membres || []).map(
            (m) => m.utilisateur_detail?.id || m.idUtilisateur || m.id,
          );
          setSelectedMembres(currentIds);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handleSelectEquipe = async (equipeId) => {
    setSelectedEquipe(equipeId);
    setSelectedMembres([]);
    if (!equipeId) {
      setMembresEquipe([]);
      return;
    }
    try {
      const r = await getMembresEquipe(equipeId);
      setMembresEquipe(r.data.results ?? r.data ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMembre = (userId) =>
    setSelectedMembres((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );

  const handleAffecter = async () => {
    if (!selectedEquipe || selectedMembres.length === 0) return;
    setLoadingAffectation(true);
    try {
      await affecterEquipe(id, {
        idEquipe: selectedEquipe,
        dateDebut: new Date().toISOString(),
        membres: selectedMembres,
      });
      closeAffectationModal();
      await charger();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'affectation");
    } finally {
      setLoadingAffectation(false);
    }
  };

  const handleUpdateAffectation = async () => {
    if (!editingAffectation || selectedMembres.length === 0) return;
    setLoadingAffectation(true);
    try {
      await updateAffectation(editingAffectation.id, {
        statut: editStatut,
        membres: selectedMembres,
      });
      closeAffectationModal();
      await charger();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la modification");
    } finally {
      setLoadingAffectation(false);
    }
  };

  const handleDeleteAffectation = async (affId) => {
    if (!confirm("Supprimer cette affectation ?")) return;
    try {
      await deleteAffectation(affId);
      charger();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression");
    }
  };

  const closeAffectationModal = () => {
    setModalAffectation(false);
    setEditingAffectation(null);
    setSelectedEquipe("");
    setMembresEquipe([]);
    setSelectedMembres([]);
    setEditStatut("");
  };

  // ─── Actions statut ───────────────────────────────────────────────────────────
  const handleDepanner = async () => {
    setLoadingDepanne(true);
    try {
      await changerStatutOT(id, "DEPANNE", motifDepanne, "depanne");
      setModalDepanne(false);
      setMotifDepanne("");
      charger();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDepanne(false);
    }
  };

  const handleCloturer = async () => {
    setLoadingCloture(true);
    try {
      await changerStatutOT(id, "CLOTURE", motifCloture, typeCloture);
      setModalCloture(false);
      setMotifCloture("");
      setTypeCloture("corrige");
      charger();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCloture(false);
    }
  };

  const handleCommentaire = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await ajouterCommentaire(id, newComment, estInterne);
    setNewComment("");
    setEstInterne(false);
    charger();
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  if (loading) return <div className="p-6 text-text-muted">Chargement…</div>;
  if (!ot) return <div className="p-6 text-danger">OT introuvable.</div>;

  const s = STATUT[ot.statut];
  const vraisCommentaires = commentaires.filter(
    (c) =>
      !(c.estInterne && c.commentaire?.includes("COMPTE RENDU INTERVENTION")),
  );
  const comptesRendus = commentaires.filter(
    (c) => c.estInterne && c.commentaire?.includes("COMPTE RENDU INTERVENTION"),
  );

  return (
    <div className="page">
      {/* ===== Header ===== */}
      <div className="hdr">
        <div className="hdr-l">
          <button
            onClick={() => navigate("/ordres/ots")}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors mb-2">
            <ArrowLeft size={13} />
            Retour aux OTs
          </button>
          <h1 className="text-2xl font-semibold font-mono">{ot.numero}</h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${s?.cls}`}>
            {s?.label}
          </span>
          {ot.est_en_retard && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-danger-soft text-danger border border-danger/30">
              Retard
            </span>
          )}
          {ot.rejetOperateur && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-danger-soft text-danger border border-danger/40 animate-pulse">
              Rejeté opérateur
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate(`/ordres/ots/${id}/rapport`)}
            className="btn btn-primary flex items-center gap-1.5">
            <MessageSquare size={16} /> Compte rendu
          </Button>
          {!estVerrouille && (
            <>
              <Button
                onClick={() => setModalDepanne(true)}
                className="btn btn-warning bg-orange-500">
                Dépanné
              </Button>
              <Button
                onClick={() => setModalCloture(true)}
                className="btn btn-success bg-green-600">
                Clôturer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ===== Rejet opérateur ===== */}
      {ot.rejetOperateur && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={16}
              className="text-red-500 mt-0.5 flex-shrink-0"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-danger">
                Cette intervention a été rejetée par l'opérateur
              </p>
              {ot.motifRejetOperateur && (
                <p className="text-sm text-text-secondary mt-1">
                  Motif : {ot.motifRejetOperateur}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5 text-xs text-text-muted">
                {ot.rejetOperateur_detail && (
                  <span>
                    Par {ot.rejetOperateur_detail.prenom}{" "}
                    {ot.rejetOperateur_detail.nom}
                  </span>
                )}
                {ot.dateRejetOperateur && (
                  <span>
                    · {new Date(ot.dateRejetOperateur).toLocaleString("fr-FR")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Traçabilité ===== */}
      {ot.demande_detail && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-surface rounded-xl p-4 border border-border shadow-card">
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">
              DI créée par
            </p>
            <p className="text-sm font-medium text-text">
              {ot.demande_detail.signalement_detail
                ? `${ot.demande_detail.signalement_detail.prenom} ${ot.demande_detail.signalement_detail.nom}`
                : "—"}
            </p>
            <p className="text-[10px] text-text-muted mt-1">
              {ot.demande_detail.dateSignalement
                ? new Date(ot.demande_detail.dateSignalement).toLocaleString(
                    "fr-FR",
                  )
                : "—"}
            </p>
            <p className="text-[10px] text-text-muted mt-1 font-mono">
              {ot.demande_detail.numero}
            </p>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border shadow-card">
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">
              OT créé par
            </p>
            <p className="text-sm font-medium text-text">
              {ot.createur_detail
                ? `${ot.createur_detail.prenom} ${ot.createur_detail.nom}`
                : "—"}
            </p>
            <p className="text-[10px] text-text-muted mt-1">
              {ot.created_at
                ? new Date(ot.created_at).toLocaleString("fr-FR")
                : "—"}
            </p>
            <p className="text-[10px] text-text-muted mt-1">
              Depuis une DI{" "}
              {ot.demande_detail.urgence === "critique"
                ? "critique"
                : "normale"}
            </p>
          </div>
          <div
            className={`rounded-xl p-4 border shadow-card ${ot.validation_detail ? "bg-success-soft border-success/30" : "bg-surface border-border"}`}>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">
              OT validé par
            </p>
            <p
              className={`text-sm font-medium ${ot.validation_detail ? "text-success" : "text-text"}`}>
              {ot.validation_detail
                ? `${ot.validation_detail.prenom} ${ot.validation_detail.nom}`
                : ot.statut === "CLOTURE" || ot.statut === "DEPANNE"
                  ? "En attente de validation"
                  : "—"}
            </p>
            <p className="text-[10px] text-text-muted mt-1">
              {ot.dateCloture
                ? new Date(ot.dateCloture).toLocaleString("fr-FR")
                : ot.statut === "CLOTURE" || ot.statut === "DEPANNE"
                  ? "Validation opérateur en cours"
                  : "—"}
            </p>
            {ot.validation_detail && (
              <p className="text-[10px] text-success mt-1 font-medium">
                Approuvé
              </p>
            )}
          </div>
        </div>
      )}

      {/* ===== Infos & Délais ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-surface rounded-xl p-5 border border-border shadow-card">
          <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-4 pb-2 border-b border-border-subtle flex items-center gap-2">
            <Wrench size={14} /> Informations
          </h2>
          {[
            ["Actif", `${ot.actif_detail?.code} — ${ot.actif_detail?.libelle}`],
            ["Type", ot.type],
            ["Priorité", ot.priorite],
            ["Sous-traité", ot.estSousTraite ? "Oui" : "Non"],
            ["Description", ot.description || "—"],
          ].map(([l, v]) => (
            <div
              key={l}
              className="flex justify-between text-sm py-2 border-b border-border-subtle last:border-0">
              <span className="text-text-muted">{l}</span>
              <span className="text-text font-medium text-right max-w-[220px]">
                {v}
              </span>
            </div>
          ))}
        </div>
        <div className="bg-surface rounded-xl p-5 border border-border shadow-card">
          <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-4 pb-2 border-b border-border-subtle flex items-center gap-2">
            <Clock size={14} /> Délais
          </h2>
          {[
            [
              "Échéance SLA",
              ot.echeanceSLA
                ? new Date(ot.echeanceSLA).toLocaleString("fr-FR")
                : "—",
            ],
            [
              "Durée estimée",
              ot.dureeEstimeeMin ? `${ot.dureeEstimeeMin} min` : "—",
            ],
            [
              "Durée réelle",
              ot.dureeReelleMin ? `${ot.dureeReelleMin} min` : "—",
            ],
          ].map(([l, v]) => (
            <div
              key={l}
              className="flex justify-between text-sm py-2 border-b border-border-subtle last:border-0">
              <span className="text-text-muted">{l}</span>
              <span className="text-text font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Compte rendu ===== */}
      {comptesRendus.length > 0 ? (
        <div className="mb-6">
          <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
            <MessageSquare size={14} /> Compte rendu d'intervention
          </h2>
          <div className="space-y-3">
            {comptesRendus.map((cr) => (
              <div
                key={cr.id}
                className="bg-surface rounded-xl p-4 border border-border shadow-card">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border-subtle">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold border border-primary/20">
                    {cr.utilisateur_detail
                      ? `${cr.utilisateur_detail.prenom?.[0] || ""}${cr.utilisateur_detail.nom?.[0] || ""}`.toUpperCase()
                      : "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">
                      {cr.utilisateur_detail
                        ? `${cr.utilisateur_detail.prenom} ${cr.utilisateur_detail.nom}`
                        : "Technicien"}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {new Date(cr.dateCreation).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                  {stripEmojis(cr.commentaire)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-xl p-5 border border-border shadow-card mb-6">
          <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
            <MessageSquare size={14} /> Compte rendu d'intervention
          </h2>
          <p className="text-sm text-text-muted mb-3">
            Aucun compte rendu n'a été rédigé pour cet OT.
          </p>
          <Button
            onClick={() => navigate(`/ordres/ots/${id}/rapport`)}
            className="btn btn-outline flex items-center gap-1.5"
            style={{ fontSize: "12px", padding: "5px 10px" }}>
            <MessageSquare size={12} /> Rédiger le compte rendu
          </Button>
        </div>
      )}

      {/* ===== Actifs corrigés ===== */}
      {ot.actifs_corriges?.length > 0 && (
        <div className="bg-surface rounded-xl p-5 border border-border shadow-card mb-6">
          <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
            <CheckCircle size={14} /> Actifs corrigés
          </h2>
          <div className="flex flex-wrap gap-2">
            {ot.actifs_corriges.map((ac) => (
              <div
                key={ac.id}
                className="bg-elevated rounded-lg px-3 py-2 border border-border-subtle flex items-center gap-2">
                <CheckCircle size={14} className="text-success" />
                <div>
                  <p className="text-sm font-medium text-text">
                    {ac.actif_detail?.code}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {ac.actif_detail?.libelle}
                  </p>
                </div>
                {ac.dateCorrection && (
                  <span className="text-[10px] text-text-muted ml-2 border-l border-border-subtle pl-2">
                    {new Date(ac.dateCorrection).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Onglets (shadcn Tabs) ===== */}
      <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
        <Tabs defaultValue="affectations">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0 gap-0 overflow-x-auto">
            <TabsTrigger
              value="affectations"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent text-text-muted px-4 py-3 text-sm font-medium transition-colors hover:text-text whitespace-nowrap">
              Affectations ({ot.affectations?.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="pieces"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent text-text-muted px-4 py-3 text-sm font-medium transition-colors hover:text-text whitespace-nowrap">
              Pièces ({ot.nb_pieces_utilisees || 0})
            </TabsTrigger>
            <TabsTrigger
              value="commentaires"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent text-text-muted px-4 py-3 text-sm font-medium transition-colors hover:text-text whitespace-nowrap">
              Commentaires ({vraisCommentaires.length})
            </TabsTrigger>
            <TabsTrigger
              value="historique"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent text-text-muted px-4 py-3 text-sm font-medium transition-colors hover:text-text whitespace-nowrap">
              Historique ({historique.length})
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent text-text-muted px-4 py-3 text-sm font-medium transition-colors hover:text-text whitespace-nowrap">
              Audit ({audit.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Affectations ── */}
          <TabsContent value="affectations" className="p-5">
            <div className="space-y-3">
              {!estVerrouille && (
                <div className="flex justify-center">
                  <Button
                    onClick={() => openAffectationModal()}
                    className="btn btn-outline  gap-1.5"
                    style={{ fontSize: "12px", padding: "5px 10px" }}>
                    <Plus size={14} /> Affecter une équipe
                  </Button>
                </div>
              )}
              {ot.affectations?.length === 0 ? (
                <EmptyState message="Aucune affectation" />
              ) : (
                ot.affectations?.map((a) => (
                  <div
                    key={a.id}
                    className="bg-elevated rounded-xl p-4 border border-border-subtle">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-semibold text-text">
                          {a.equipe_detail?.libelle ??
                            a.soustraitant_detail?.raisonSociale ??
                            "—"}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {new Date(a.dateDebut).toLocaleString("fr-FR")}
                        </p>
                        {a.chefTechnicien_detail && (
                          <p className="text-[10px] text-text-muted mt-0.5">
                            Affecté par{" "}
                            <span className="text-text-secondary">
                              {a.chefTechnicien_detail.prenom}{" "}
                              {a.chefTechnicien_detail.nom}
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            a.statut === "termine"
                              ? "bg-success-soft text-success"
                              : a.statut === "en_cours"
                                ? "bg-warning-soft text-warning"
                                : a.statut === "rejeter"
                                  ? "bg-danger-soft text-danger"
                                  : "bg-hover text-text-muted"
                          }`}>
                          {STATUT_AFFECTATION_LABEL[a.statut] || a.statut}
                        </span>
                        {!estVerrouille && (
                          <div className="flex gap-1">
                            <Button
                              onClick={() => openAffectationModal(a)}
                              className="text-[10px] px-2 py-0.5 rounded bg-primary-soft text-primary hover:bg-primary/20 transition">
                              Modifier
                            </Button>
                            <Button
                              onClick={() => handleDeleteAffectation(a.id)}
                              className="text-[10px] px-2 py-0.5 rounded bg-danger-soft text-danger hover:bg-danger/20 transition">
                              Supprimer
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border-subtle">
                      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                        <User size={10} />
                        {a.membres?.length > 0
                          ? `Techniciens affectés (${a.membres.length})`
                          : "Aucun membre affecté"}
                      </p>
                      {a.membres?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {a.membres.map((m) => (
                            <span
                              key={m.id}
                              title={
                                m.dateDebut
                                  ? `Affecté le ${new Date(m.dateDebut).toLocaleString("fr-FR")}`
                                  : ""
                              }
                              className="text-[11px] bg-hover text-text px-2 py-0.5 rounded-full border border-border-subtle flex items-center gap-1">
                              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold border border-primary/20">
                                {m.utilisateur_detail
                                  ? `${m.utilisateur_detail.prenom?.[0] || ""}${m.utilisateur_detail.nom?.[0] || ""}`.toUpperCase()
                                  : "?"}
                              </span>
                              {m.utilisateur_detail
                                ? `${m.utilisateur_detail.prenom} ${m.utilisateur_detail.nom}`
                                : m.utilisateur_nom || "Technicien"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* ── Pièces ── */}
          <TabsContent value="pieces" className="p-5">
            {ot.pieces_utilisees_detail?.length === 0 ? (
              <EmptyState message="Aucune pièce utilisée" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-text-muted border-b border-border">
                      <th className="pb-2 font-medium">Référence</th>
                      <th className="pb-2 font-medium">Désignation</th>
                      <th className="pb-2 font-medium text-right">Quantité</th>
                      <th className="pb-2 font-medium">
                        Technicien bénéficiaire
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ot.pieces_utilisees_detail?.map((p) => (
                      <tr key={p.id} className="hover:bg-hover/30 transition">
                        <td className="py-2.5 font-mono text-primary text-xs">
                          {p.piece_detail?.reference}
                        </td>
                        <td className="py-2.5 text-text">
                          {p.piece_detail?.designation}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-text">
                          {p.quantite}{" "}
                          <span className="text-text-muted font-normal text-xs">
                            {p.idPiece_unite || "pc"}
                          </span>
                        </td>
                        <td className="py-2.5">
                          {p.technicien_detail ? (
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold border border-primary/20">
                                {`${p.technicien_detail.prenom?.[0] || ""}${p.technicien_detail.nom?.[0] || ""}`.toUpperCase()}
                              </span>
                              {p.technicien_detail.nom_complet}
                            </span>
                          ) : (
                            <span className="text-text-muted text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-text-muted flex items-center gap-1.5">
                    <Package size={12} /> {ot.nb_pieces_utilisees} pièce(s)
                    utilisée(s)
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Commentaires (style bulles) ── */}
          <TabsContent value="commentaires" className="mt-3">
            <div className="bg-surface border border-border rounded-xl p-4 space-y-4 mx-5 mb-5">
              {/* Liste */}
              <div className="flex flex-col gap-3">
                {vraisCommentaires.length === 0 ? (
                  <EmptyState message="Aucun commentaire" />
                ) : (
                  vraisCommentaires.map((c) => {
                    const isOwn = c.idUtilisateur == user.user?.id;
                    return (
                      <div
                        key={c.id}
                        className={`flex flex-col gap-1 ${isOwn ? "items-start" : "items-end"}`}>
                        {/* Nom + heure */}
                        <div
                          className={`flex items-center gap-2 px-1 ${isOwn ? "flex-row" : "flex-row-reverse"}`}>
                          <span className="text-[11px] font-medium text-text-muted">
                            {isOwn
                              ? "Vous"
                              : `${c.utilisateur_detail?.prenom} ${c.utilisateur_detail?.nom}`}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {new Date(c.dateCreation).toLocaleString("fr-FR")}
                          </span>
                          {c.estInterne && (
                            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-1.5 py-0 rounded">
                              Interne
                            </span>
                          )}
                        </div>
                        {/* Bulle */}
                        {isOwn ? (
                          <div className="max-w-[75%] px-4 py-2.5 text-sm leading-relaxed rounded-2xl rounded-tl-sm border bg-blue-600 text-white border-blue-700">
                            {stripEmojis(c.commentaire)}
                          </div>
                        ) : (
                          <div className="max-w-[75%] px-4 py-2.5 text-sm leading-relaxed rounded-2xl rounded-tr-sm border bg-slate-300 dark:bg-slate-700 text-text border-border-subtle">
                            {stripEmojis(c.commentaire)}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {/* Formulaire */}
              <form
                onSubmit={handleCommentaire}
                className="flex items-center gap-2 pt-2 border-t border-border">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter un commentaire…"
                  className="flex-1 bg-elevated border border-border text-text placeholder:text-text-muted rounded-full px-4 py-2 text-sm outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
                />
                <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={estInterne}
                    onChange={(e) => setEstInterne(e.target.checked)}
                    className="accent-amber-500 w-3.5 h-3.5"
                  />
                  Interne
                </label>
                <Button
                  type="submit"
                  size="sm"
                  className="gap-1.5 rounded-full text-white">
                  <Send size={13} />
                  Envoyer
                </Button>
              </form>
            </div>
          </TabsContent>

          {/* ── Historique ── */}
          <TabsContent value="historique" className="p-5">
            {historique.length === 0 ? (
              <EmptyState message="Aucun historique" />
            ) : (
              <div className="space-y-2">
                {historique.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 p-3 bg-elevated rounded-lg border border-border-subtle">
                    <div className="flex items-center gap-2">
                      {h.ancienStatut && (
                        <>
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded border ${STATUT[h.ancienStatut]?.cls}`}>
                            {STATUT[h.ancienStatut]?.label}
                          </span>
                          <ChevronRight size={12} className="text-text-muted" />
                        </>
                      )}
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded border ${STATUT[h.nouveauStatut]?.cls}`}>
                        {STATUT[h.nouveauStatut]?.label}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {h.motif && (
                        <p className="text-xs text-text-muted truncate">
                          {h.motif}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-text-muted shrink-0">
                      {new Date(h.dateChangement).toLocaleString("fr-FR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Audit ── */}
          <TabsContent value="audit" className="p-5">
            {audit.length === 0 ? (
              <EmptyState message="Aucune entrée d'audit pour cet OT" />
            ) : (
              <div className="space-y-0 pt-1">
                {audit.map((entry, idx) => (
                  <AuditTimelineItem
                    key={entry.id}
                    entry={entry}
                    isLast={idx === audit.length - 1}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== Dialog Dépanné ===== */}
      <Dialog open={modalDepanne} onOpenChange={setModalDepanne}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <Wrench size={18} /> Marquer comme Dépanné
            </DialogTitle>
            <DialogDescription className="text-text-muted text-sm">
              L'OT <span className="font-mono text-text">{ot.numero}</span> sera
              marqué comme dépanné temporairement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">
                Motif / Commentaire{" "}
                <span className="text-text-muted">(optionnel)</span>
              </label>
              <textarea
                value={motifDepanne}
                onChange={(e) => setMotifDepanne(e.target.value)}
                placeholder="Décrivez l'action de dépannage effectuée…"
                rows={4}
                className="w-full bg-surface text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-warning resize-none transition"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button
              onClick={() => {
                setModalDepanne(false);
                setMotifDepanne("");
              }}
              className="px-4 py-2 text-sm bg-hover hover:bg-active rounded-lg transition text-text">
              Annuler
            </Button>
            <Button
              onClick={handleDepanner}
              disabled={loadingDepanne}
              className="btn btn-warning bg-orange-500">
              {loadingDepanne ? "Enregistrement…" : "Confirmer le dépannage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog Clôturer ===== */}
      <Dialog open={modalCloture} onOpenChange={setModalCloture}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <CheckCircle size={18} /> Clôturer l'ordre de travail
            </DialogTitle>
            <DialogDescription className="text-text-muted text-sm">
              L'OT <span className="font-mono text-text">{ot.numero}</span> sera
              clôturé définitivement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium mb-1.5 block">
                Rapport de clôture{" "}
                <span className="text-text-muted font-normal">(optionnel)</span>
              </label>
              <textarea
                value={motifCloture}
                onChange={(e) => setMotifCloture(e.target.value)}
                placeholder="Décrivez les travaux effectués et le résultat final…"
                rows={4}
                className="w-full bg-elevated border border-border text-text placeholder:text-text-muted rounded-lg px-3 py-2 text-sm outline-none resize-none focus:border-emerald-400 dark:focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button
              onClick={() => {
                setModalCloture(false);
                setMotifCloture("");
                setTypeCloture("corrige");
              }}
              className="px-4 py-2 text-sm bg-hover hover:bg-active rounded-md transition text-text">
              Annuler
            </Button>
            <Button
              onClick={handleCloturer}
              disabled={loadingCloture}
              className="btn btn-success bg-green-600">
              {loadingCloture ? "Clôture en cours…" : "Clôturer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog Affectation ===== */}
      <Dialog open={modalAffectation} onOpenChange={setModalAffectation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <User size={18} />
              {editingAffectation
                ? "Modifier l'affectation"
                : "Affecter une équipe"}
            </DialogTitle>
            <DialogDescription className="text-text-muted text-sm">
              {editingAffectation
                ? "Modifiez le statut et les membres de l'affectation."
                : "Sélectionnez l'équipe et les membres qui interviendront sur cet OT."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block">
                Équipe <span className="text-red-500">*</span>
              </label>
              {editingAffectation ? (
                <p className="text-sm text-text bg-elevated rounded-lg px-3 py-2 border border-border">
                  {editingAffectation.equipe_detail?.libelle ?? "—"}
                </p>
              ) : (
                <Select
                  value={selectedEquipe}
                  onValueChange={handleSelectEquipe}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="— Sélectionner une équipe —" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipes.map((eq) => (
                      <SelectItem key={eq.id} value={String(eq.id)}>
                        {eq.libelle} {eq.chef_nom ? `(${eq.chef_nom})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!editingAffectation && equipes.length === 0 && (
                <p className="text-xs text-text-muted mt-2">
                  Chargement des équipes…
                </p>
              )}
            </div>
            {editingAffectation && (
              <div>
                <label className="text-xs font-medium mb-1.5 block">
                  Statut
                </label>
                <Select
                  value={editStatut}
                  onValueChange={(value) => setEditStatut(value)}
                  className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="— Sélectionner un statut —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
                    <SelectItem value="rejeter">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {(selectedEquipe || editingAffectation) && (
              <div>
                <label className="text-xs font-medium mb-1.5 block">
                  Membres participants <span className="text-red-500">*</span>
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1 bg-elevated rounded-lg border border-border p-2">
                  {membresEquipe.length === 0 ? (
                    <p className="text-xs text-text-muted py-2">
                      Aucun membre dans cette équipe.
                    </p>
                  ) : (
                    membresEquipe.map((m) => {
                      const uid =
                        typeof m.utilisateur === "string"
                          ? m.utilisateur
                          : m.utilisateur?.id || m.id;
                      const nom =
                        m.utilisateur_nom ||
                        (typeof m.utilisateur === "object"
                          ? `${m.utilisateur?.prenom || ""} ${m.utilisateur?.nom || ""}`.trim()
                          : "") ||
                        "Membre";
                      const checked = selectedMembres.includes(uid);
                      const alreadyInOther = ot.affectations?.some((aff) => {
                        if (
                          editingAffectation &&
                          aff.id === editingAffectation.id
                        )
                          return false;
                        return aff.membres?.some(
                          (mm) =>
                            (mm.utilisateur_detail?.id ||
                              mm.idUtilisateur ||
                              mm.id) === uid,
                        );
                      });
                      const disabled = alreadyInOther && !checked;
                      return (
                        <label
                          key={uid}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded transition ${
                            disabled
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer hover:bg-surface"
                          } ${checked && !disabled ? "bg-blue-50 dark:bg-blue-500/10" : ""}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => !disabled && toggleMembre(uid)}
                            disabled={disabled}
                            className="accent-blue-500 w-4 h-4"
                          />
                          <span
                            className={`text-sm ${disabled ? "text-text-muted" : "text-text"}`}>
                            {nom}
                          </span>
                          {alreadyInOther ? (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase ml-auto">
                              Déjà affecté
                            </span>
                          ) : m.niveauRole ? (
                            <span className="text-[10px] text-text-muted uppercase ml-auto">
                              {m.niveauRole}
                            </span>
                          ) : null}
                        </label>
                      );
                    })
                  )}
                </div>
                {selectedMembres.length > 0 && (
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                    {selectedMembres.length} sélectionné(s)
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button
              onClick={closeAffectationModal}
              className="px-4 py-2 text-sm bg-hover hover:bg-active rounded-lg transition text-text">
              Annuler
            </Button>
            {editingAffectation ? (
              <Button
                onClick={handleUpdateAffectation}
                disabled={loadingAffectation || selectedMembres.length === 0}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition text-white font-medium">
                {loadingAffectation ? "Enregistrement…" : "Enregistrer"}
              </Button>
            ) : (
              <Button
                onClick={handleAffecter}
                disabled={
                  loadingAffectation ||
                  !selectedEquipe ||
                  selectedMembres.length === 0
                }
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition text-white font-medium">
                {loadingAffectation ? "Affectation en cours…" : "Affecter"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
