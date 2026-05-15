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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, User, Wrench, MessageSquare, AlertTriangle, Plus, X, Package, Clock } from "lucide-react";

//  Statuts affectation 
const STATUT_AFFECTATION_LABEL = {
  en_attente: "En attente",
  en_cours:   "En cours",
  termine:    "Terminé",
  rejeter:    "Rejeté",
};

//  Couleurs d'audit 
const AUDIT_ACTION_CONFIG = {
  CREATE: { label: "Création", cls: "bg-success-soft text-success border-success/30", dot: "bg-success" },
  UPDATE: { label: "Modification", cls: "bg-primary-soft text-primary border-primary/30", dot: "bg-primary" },
  DELETE: { label: "Suppression", cls: "bg-danger-soft text-danger border-danger/30", dot: "bg-danger" },
  CHANGE_STATUS: { label: "Changement de statut", cls: "bg-warning/20 text-warning border-warning/30", dot: "bg-warning" },
  VALIDER: { label: "Validation", cls: "bg-primary-soft text-primary border-primary/30", dot: "bg-primary" },
  REJECT: { label: "Rejet", cls: "bg-danger-soft text-danger border-danger/30", dot: "bg-danger" },
  UPLOAD_FICHIERS: { label: "Fichiers ajoutés", cls: "bg-status-cyan/20 text-status-cyan border-status-cyan/30", dot: "bg-status-cyan" },
  CLOTURER: { label: "Clôture", cls: "bg-success-soft text-success border-success/30", dot: "bg-success" },
  ENREGISTRER_PIECE: { label: "Pièce utilisée", cls: "bg-primary-soft text-primary border-primary/30", dot: "bg-primary" },
  AJOUTER_COMMENTAIRE: { label: "Commentaire", cls: "bg-primary-soft text-primary border-primary/30", dot: "bg-primary" },
};

function getAuditConfig(action) {
  return AUDIT_ACTION_CONFIG[action] || { label: action, cls: "bg-hover text-text-muted border-border/30", dot: "bg-text-muted" };
}

function formatAuditValue(val) {
  if (!val) return "—";
  if (typeof val === "object") {
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return String(val);
}

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
      {/* Ligne timeline */}
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${cfg.dot} ring-4 ring-surface`} />
        {!isLast && <div className="w-px flex-1 bg-hover my-1" />}
      </div>

      {/* Contenu */}
      <div className={`flex-1 pb-5 ${!isLast ? "" : ""}`}>
        <div className="bg-hover/40 rounded-lg p-3 border border-border/50 hover:border-border transition">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold border border-primary/30">
                {initials || "?"}
              </div>
              <div>
                <p className="text-sm font-medium text-text">{userName}</p>
                <p className="text-[10px] text-text-muted">
                  {new Date(entry.horodatage).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${cfg.cls}`}>
              {cfg.label}
            </span>
          </div>

          {/* Module */}
          <p className="text-xs text-text-muted mb-1.5">
            Module : <span className="text-text-secondary">{entry.module}</span>
            {entry.type_entite && (
              <>
                {" · "}Entité : <span className="text-text-secondary">{entry.type_entite}</span>
              </>
            )}
          </p>

          {/* Valeurs avant/après */}
          {(entry.ancienne_valeur || entry.nouvelle_valeur) && (
            <div className="mt-2 space-y-1.5">
              {entry.ancienne_valeur && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-text-muted shrink-0 w-14">Avant :</span>
                  <span className="text-danger bg-danger-soft rounded px-1.5 py-0.5 break-all">
                    {formatAuditValue(entry.ancienne_valeur)}
                  </span>
                </div>
              )}
              {entry.nouvelle_valeur && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-text-muted shrink-0 w-14">Après :</span>
                  <span className="text-success bg-success-soft rounded px-1.5 py-0.5 break-all">
                    {formatAuditValue(entry.nouvelle_valeur)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Adresse IP */}
          {entry.adresse_ip && (
            <p className="text-[10px] text-text-muted mt-2">
              IP : {entry.adresse_ip}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

//  Statuts 
const STATUT = {
  EN_COURS: {
    label: "En cours",
    cls: "bg-warning/20 text-warning border-warning/30",
  },
  DEPANNE: {
    label: "Dépanné",
    cls: "bg-status-orange/20 text-status-orange border-status-orange/30",
  },
  CLOTURE: {
    label: "Clôturé",
    cls: "bg-success-soft text-success border-success/30",
  },
  REJETE: {
    label: "Rejeté",
    cls: "bg-danger-soft text-danger border-danger/30",
  },
};

//  Composant 
export default function DetailOT() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ot, setOT] = useState(null);
  const [commentaires, setCommentaires] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [audit, setAudit] = useState([]);
  const [onglet, setOnglet] = useState("info");
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

  //  Chargement 
  const charger = async () => {
    try {
      const [o, c, h, a] = await Promise.all([
        getOT(id),
        getCommentaires(id),
        getHistoriqueOT(id),
        getJournalAuditv2({ id_entite: id, type_entite: "OrdreTravail", page_size: 100 }),
      ]);
      setOT(o.data);
      setCommentaires(c.data.results ?? c.data);
      setHistorique(h.data.results ?? h.data);
      setAudit(a.data.results ?? a.data);
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, [id]);

  //  Action : Affecter / Modifier 
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
      // Mode édition : pré-remplir
      setEditStatut(affectation.statut || "");
      const eqId = affectation.equipe_detail?.id || affectation.idEquipe;
      if (eqId) {
        setSelectedEquipe(eqId);
        try {
          const r = await getMembresEquipe(eqId);
          const data = r.data.results ?? r.data ?? [];
          setMembresEquipe(data);
          // Pré-sélectionner les membres actuels
          const currentIds = (affectation.membres || []).map((m) =>
            m.utilisateur_detail?.id || m.idUtilisateur || m.id
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
      const data = r.data.results ?? r.data ?? [];
      setMembresEquipe(data);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMembre = (userId) => {
    setSelectedMembres((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

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

  //  Action : Dépanner 
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

  //  Action : Clôturer 
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

  //  Action : Commentaire 
  const handleCommentaire = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await ajouterCommentaire(id, newComment, estInterne);
    setNewComment("");
    setEstInterne(false);
    charger();
  };

  //  Render 
  if (loading) return <div className="p-6 text-text-muted">Chargement…</div>;
  if (!ot) return <div className="p-6 text-danger">OT introuvable.</div>;

  const s = STATUT[ot.statut];

  return (
    <div className="page">
      {/* ===== Header ===== */}
      <div className="hdr">
        <div className="hdr-l">
          <button
            onClick={() => navigate("/ordres/ots")}
            className="text-text-muted hover:text-text text-sm transition">
            ← Retour
          </button>
          <h1 className="text-2xl font-semibold font-mono">{ot.numero}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${s?.cls}`}>
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
          <button
            onClick={() => navigate(`/ordres/ots/${id}/rapport`)}
            className="btn btn-primary flex items-center gap-1.5">
            <MessageSquare size={16} /> Compte rendu
          </button>
          {!estVerrouille && (
            <>
              <button onClick={() => setModalDepanne(true)} className="btn btn-warning">
                Dépanné
              </button>
              <button onClick={() => setModalCloture(true)} className="btn btn-success">
                Clôturer
              </button>
            </>
          )}
        </div>
      </div>

      {/* ===== Rejet opérateur ===== */}
      {ot.rejetOperateur && (
        <div className="bg-danger-soft border border-danger/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-danger">
                Cette intervention a été rejetée par l'opérateur
              </p>
              {ot.motifRejetOperateur && (
                <p className="text-sm text-text-secondary mt-1">
                  Motif : {ot.motifRejetOperateur}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                {ot.rejetOperateur_detail && (
                  <span>Par {ot.rejetOperateur_detail.prenom} {ot.rejetOperateur_detail.nom}</span>
                )}
                {ot.dateRejetOperateur && (
                  <span>· {new Date(ot.dateRejetOperateur).toLocaleString("fr-FR")}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Tracabilité ===== */}
      {ot.demande_detail && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-surface rounded-xl p-4 border border-border shadow-card">
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">DI créée par</p>
            <p className="text-sm font-medium text-text">
              {ot.demande_detail.signalement_detail
                ? `${ot.demande_detail.signalement_detail.prenom} ${ot.demande_detail.signalement_detail.nom}`
                : "—"}
            </p>
            <p className="text-[10px] text-text-muted mt-1">
              {ot.demande_detail.dateSignalement
                ? new Date(ot.demande_detail.dateSignalement).toLocaleString("fr-FR")
                : "—"}
            </p>
            <p className="text-[10px] text-text-muted mt-1 font-mono">{ot.demande_detail.numero}</p>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border shadow-card">
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">OT créé par</p>
            <p className="text-sm font-medium text-text">
              {ot.createur_detail ? `${ot.createur_detail.prenom} ${ot.createur_detail.nom}` : "—"}
            </p>
            <p className="text-[10px] text-text-muted mt-1">
              {ot.created_at ? new Date(ot.created_at).toLocaleString("fr-FR") : "—"}
            </p>
            <p className="text-[10px] text-text-muted mt-1">
              Depuis une DI {ot.demande_detail.urgence === 'critique' ? 'critique' : 'normale'}
            </p>
          </div>
          <div className={`rounded-xl p-4 border shadow-card ${ot.validation_detail ? 'bg-success-soft border-success/30' : 'bg-surface border-border'}`}>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">OT validé par</p>
            <p className={`text-sm font-medium ${ot.validation_detail ? 'text-success' : 'text-text'}`}>
              {ot.validation_detail
                ? `${ot.validation_detail.prenom} ${ot.validation_detail.nom}`
                : ot.statut === 'CLOTURE' || ot.statut === 'DEPANNE'
                  ? "En attente de validation"
                  : "—"}
            </p>
            <p className="text-[10px] text-text-muted mt-1">
              {ot.dateCloture
                ? new Date(ot.dateCloture).toLocaleString("fr-FR")
                : ot.statut === 'CLOTURE' || ot.statut === 'DEPANNE'
                  ? "Validation opérateur en cours"
                  : "—"}
            </p>
            {ot.validation_detail && (
              <p className="text-[10px] text-success mt-1 font-medium">Approuvé</p>
            )}
          </div>
        </div>
      )}

      {/* ===== Infos & Delais ===== */}
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
            <div key={l} className="flex justify-between text-sm py-2 border-b border-border-subtle last:border-0">
              <span className="text-text-muted">{l}</span>
              <span className="text-text font-medium text-right max-w-[220px]">{v}</span>
            </div>
          ))}
        </div>
        <div className="bg-surface rounded-xl p-5 border border-border shadow-card">
          <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-4 pb-2 border-b border-border-subtle flex items-center gap-2">
            <Clock size={14} /> Délais
          </h2>
          {[
            ["Échéance SLA", ot.echeanceSLA ? new Date(ot.echeanceSLA).toLocaleString("fr-FR") : "—"],
            ["Durée estimée", ot.dureeEstimeeMin ? `${ot.dureeEstimeeMin} min` : "—"],
            ["Durée réelle", ot.dureeReelleMin ? `${ot.dureeReelleMin} min` : "—"],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between text-sm py-2 border-b border-border-subtle last:border-0">
              <span className="text-text-muted">{l}</span>
              <span className="text-text font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Compte rendu ===== */}
      {(() => {
        const stripEmojis = (str) => str?.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') || '';
        const comptesRendus = commentaires.filter(
          (c) => c.estInterne && c.commentaire?.includes("COMPTE RENDU INTERVENTION")
        );
        return comptesRendus.length > 0 ? (
          <div className="mb-6">
            <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
              <MessageSquare size={14} /> Compte rendu d'intervention
            </h2>
            <div className="space-y-3">
              {comptesRendus.map((cr) => (
                <div key={cr.id} className="bg-surface rounded-xl p-4 border border-border shadow-card">
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border-subtle">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold border border-primary/20">
                      {cr.utilisateur_detail
                        ? `${cr.utilisateur_detail.prenom?.[0] || ""}${cr.utilisateur_detail.nom?.[0] || ""}`.toUpperCase()
                        : "?"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text">
                        {cr.utilisateur_detail ? `${cr.utilisateur_detail.prenom} ${cr.utilisateur_detail.nom}` : "Technicien"}
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
            <p className="text-sm text-text-muted mb-3">Aucun compte rendu n'a été rédigé pour cet OT.</p>
            <button
              onClick={() => navigate(`/ordres/ots/${id}/rapport`)}
              className="btn btn-outline flex items-center gap-1.5" style={{fontSize:'12px',padding:'5px 10px'}}>
              <MessageSquare size={12} /> Rédiger le compte rendu
            </button>
          </div>
        );
      })()}

      {/* ===== Actifs corrigés ===== */}
      {ot.actifs_corriges?.length > 0 && (
        <div className="bg-surface rounded-xl p-5 border border-border shadow-card mb-6">
          <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
            <CheckCircle size={14} /> Actifs corrigés
          </h2>
          <div className="flex flex-wrap gap-2">
            {ot.actifs_corriges.map((ac) => (
              <div key={ac.id} className="bg-elevated rounded-lg px-3 py-2 border border-border-subtle flex items-center gap-2">
                <CheckCircle size={14} className="text-success" />
                <div>
                  <p className="text-sm font-medium text-text">{ac.actif_detail?.code}</p>
                  <p className="text-[10px] text-text-muted">{ac.actif_detail?.libelle}</p>
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

      {/* ===== Onglets ===== */}
      <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {[
            ["affectations", `Affectations (${ot.affectations?.length || 0})`],
            ["pieces", `Pièces (${ot.nb_pieces_utilisees || 0})`],
            ["commentaires", `Commentaires (${commentaires.filter((c) => !(c.estInterne && c.commentaire?.includes("COMPTE RENDU INTERVENTION"))).length})`],
            ["historique", `Historique (${historique.length})`],
            ["audit", `Audit (${audit.length})`],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setOnglet(k)}
              className={`py-3 px-4 text-sm font-medium transition border-b-2 -mb-px whitespace-nowrap ${
                onglet === k
                  ? "text-primary border-primary"
                  : "text-text-muted border-transparent hover:text-text"
              }`}>
              {l}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Affectations */}
          {onglet === "affectations" && (
            <div className="space-y-3">
              {!estVerrouille && (
                <div className="flex justify-end">
                  <button onClick={() => openAffectationModal()} className="btn btn-outline flex items-center gap-1.5" style={{fontSize:'12px',padding:'5px 10px'}}>
                    <Plus size={14} /> Affecter une équipe
                  </button>
                </div>
              )}
              {ot.affectations?.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-8">Aucune affectation</p>
              ) : (
                ot.affectations?.map((a) => (
                  <div key={a.id} className="bg-elevated rounded-xl p-4 border border-border-subtle">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-semibold text-text">
                          {a.equipe_detail?.libelle ?? a.soustraitant_detail?.raisonSociale ?? "—"}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {new Date(a.dateDebut).toLocaleString("fr-FR")}
                        </p>
                        {a.chefTechnicien_detail && (
                          <p className="text-[10px] text-text-muted mt-0.5">
                            Affecté par <span className="text-text-secondary">{a.chefTechnicien_detail.prenom} {a.chefTechnicien_detail.nom}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          a.statut === "termine" ? "bg-success-soft text-success" :
                          a.statut === "en_cours" ? "bg-warning-soft text-warning" :
                          a.statut === "rejeter" ? "bg-danger-soft text-danger" :
                          "bg-hover text-text-muted"
                        }`}>
                          {STATUT_AFFECTATION_LABEL[a.statut] || a.statut}
                        </span>
                        {!estVerrouille && (
                          <div className="flex gap-1">
                            <button onClick={() => openAffectationModal(a)} className="text-[10px] px-2 py-0.5 rounded bg-primary-soft text-primary border border-primary/20 hover:bg-primary/20 transition">Modifier</button>
                            <button onClick={() => handleDeleteAffectation(a.id)} className="text-[10px] px-2 py-0.5 rounded bg-danger-soft text-danger border border-danger/20 hover:bg-danger/20 transition">Supprimer</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border-subtle">
                      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                        <User size={10} />
                        {a.membres?.length > 0 ? `Techniciens affectés (${a.membres.length})` : "Aucun membre affecté"}
                      </p>
                      {a.membres?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {a.membres.map((m) => (
                            <span key={m.id} title={m.dateDebut ? `Affecté le ${new Date(m.dateDebut).toLocaleString("fr-FR")}` : ""}
                              className="text-[11px] bg-hover text-text px-2 py-0.5 rounded-full border border-border-subtle flex items-center gap-1">
                              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold border border-primary/20">
                                {m.utilisateur_detail ? `${m.utilisateur_detail.prenom?.[0] || ""}${m.utilisateur_detail.nom?.[0] || ""}`.toUpperCase() : "?"}
                              </span>
                              {m.utilisateur_detail ? `${m.utilisateur_detail.prenom} ${m.utilisateur_detail.nom}` : m.utilisateur_nom || "Technicien"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pièces */}
          {onglet === "pieces" && (
            <div>
              {ot.pieces_utilisees_detail?.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-8">Aucune pièce utilisée</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-text-muted border-b border-border">
                        <th className="pb-2 font-medium">Référence</th>
                        <th className="pb-2 font-medium">Désignation</th>
                        <th className="pb-2 font-medium text-right">Quantité</th>
                        <th className="pb-2 font-medium">Technicien bénéficiaire</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ot.pieces_utilisees_detail?.map((p) => (
                        <tr key={p.id} className="hover:bg-hover/30 transition">
                          <td className="py-2.5 font-mono text-primary text-xs">{p.piece_detail?.reference}</td>
                          <td className="py-2.5 text-text">{p.piece_detail?.designation}</td>
                          <td className="py-2.5 text-right font-semibold text-text">{p.quantite} <span className="text-text-muted font-normal text-xs">{p.idPiece_unite || 'pc'}</span></td>
                          <td className="py-2.5">
                            {p.technicien_detail ? (
                              <span className="inline-flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold border border-primary/20">
                                  {`${p.technicien_detail.prenom?.[0] || ''}${p.technicien_detail.nom?.[0] || ''}`.toUpperCase()}
                                </span>
                                {p.technicien_detail.nom_complet}
                              </span>
                            ) : <span className="text-text-muted text-xs">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-text-muted flex items-center gap-1.5">
                      <Package size={12} /> {ot.nb_pieces_utilisees} pièce(s) utilisée(s)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Commentaires */}
          {onglet === "commentaires" && (
            <div>
              <div className="space-y-3 mb-4">
                {(() => {
                  const vraisCommentaires = commentaires.filter(
                    (c) => !(c.estInterne && c.commentaire?.includes("COMPTE RENDU INTERVENTION"))
                  );
                  return vraisCommentaires.length === 0 ? (
                    <p className="text-text-muted text-sm text-center py-4">Aucun commentaire</p>
                  ) : (
                    vraisCommentaires.map((c) => (
                      <div key={c.id} className={`rounded-xl p-4 border ${c.estInterne ? "bg-warning-soft border-warning/20" : "bg-elevated border-border-subtle"}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold border border-primary/20 shrink-0">
                              {c.utilisateur_detail ? `${c.utilisateur_detail.prenom?.[0] || ""}${c.utilisateur_detail.nom?.[0] || ""}`.toUpperCase() : "?"}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-text">
                                {c.utilisateur_detail ? `${c.utilisateur_detail.prenom} ${c.utilisateur_detail.nom}` : "Utilisateur"}
                                {c.estInterne && <span className="ml-2 text-warning text-[10px]">[Interne]</span>}
                              </p>
                              <p className="text-[10px] text-text-muted">{new Date(c.dateCreation).toLocaleString("fr-FR")}</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-text-secondary whitespace-pre-wrap">{stripEmojis(c.commentaire)}</p>
                      </div>
                    ))
                  );
                })()}
              </div>
              <form onSubmit={handleCommentaire} className="flex gap-2">
                <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ajouter un commentaire…"
                  className="flex-1 bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-primary" />
                <label className="flex items-center gap-1 text-xs text-text-muted cursor-pointer shrink-0">
                  <input type="checkbox" checked={estInterne} onChange={(e) => setEstInterne(e.target.checked)} className="accent-warning" />
                  Interne
                </label>
                <button type="submit" className="btn btn-primary px-3 py-2 text-sm">Envoyer</button>
              </form>
            </div>
          )}

          {/* Historique */}
          {onglet === "historique" && (historique.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">Aucun historique</p>
          ) : (
            <div className="space-y-2">
              {historique.map((h) => (
                <div key={h.id} className="flex items-center gap-3 p-3 bg-elevated rounded-lg border border-border-subtle">
                  <div className="flex items-center gap-2">
                    {h.ancienStatut && (
                      <>
                        <span className={`px-2 py-0.5 rounded text-xs border ${STATUT[h.ancienStatut]?.cls}`}>{STATUT[h.ancienStatut]?.label}</span>
                        <span className="text-text-muted text-xs">→</span>
                      </>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs border ${STATUT[h.nouveauStatut]?.cls}`}>{STATUT[h.nouveauStatut]?.label}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {h.motif && <p className="text-xs text-text-muted truncate">{h.motif}</p>}
                  </div>
                  <span className="text-xs text-text-muted shrink-0">{new Date(h.dateChangement).toLocaleString("fr-FR")}</span>
                </div>
              ))}
            </div>
          ))}

          {/* Audit */}
          {onglet === "audit" && (audit.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">Aucune entrée d'audit pour cet OT</p>
          ) : (
            <div className="space-y-0">
              {audit.map((entry, idx) => (
                <AuditTimelineItem key={entry.id} entry={entry} isLast={idx === audit.length - 1} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ===== Dialog Dépanné ===== */}
      <Dialog open={modalDepanne} onOpenChange={setModalDepanne}>
        <DialogContent className="bg-elevated border border-border text-text max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <Wrench size={18} /> Marquer comme Dépanné
            </DialogTitle>
            <DialogDescription className="text-text-muted text-sm">
              L'OT <span className="font-mono text-text">{ot.numero}</span> sera marqué comme dépanné temporairement. L'actif sera rétabli.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Motif / Commentaire <span className="text-text-muted">(optionnel)</span></label>
              <textarea value={motifDepanne} onChange={(e) => setMotifDepanne(e.target.value)} placeholder="Décrivez l'action de dépannage effectuée…" rows={4}
                className="w-full bg-surface text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-warning resize-none transition" />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <button onClick={() => { setModalDepanne(false); setMotifDepanne(""); }} className="px-4 py-2 text-sm bg-hover hover:bg-active rounded-lg transition text-text">Annuler</button>
            <button onClick={handleDepanner} disabled={loadingDepanne} className="btn btn-warning">
              {loadingDepanne ? "Enregistrement…" : "Confirmer le dépannage"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog Clôturer ===== */}
      <Dialog open={modalCloture} onOpenChange={setModalCloture}>
        <DialogContent className="bg-elevated border border-border text-text max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <CheckCircle size={18} /> Clôturer l'ordre de travail
            </DialogTitle>
            <DialogDescription className="text-text-muted text-sm">
              L'OT <span className="font-mono text-text">{ot.numero}</span> sera clôturé définitivement. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Type de clôture</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "corrige", label: "Corrigé", icon: CheckCircle },
                  { value: "depanne", label: "Dépanné", icon: Wrench },
                  { value: "annule", label: "Annulé", icon: X },
                ].map(({ value, label, icon: BtnIcon }) => (
                  <button key={value} onClick={() => setTypeCloture(value)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border text-xs font-medium transition ${
                      typeCloture === value ? "border-success bg-success-soft text-success" : "border-border bg-surface text-text-muted hover:border-border-strong"
                    }`}>
                    <BtnIcon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Motif / Rapport de clôture <span className="text-text-muted">(optionnel)</span></label>
              <textarea value={motifCloture} onChange={(e) => setMotifCloture(e.target.value)} placeholder="Décrivez les travaux effectués et le résultat final…" rows={4}
                className="w-full bg-surface text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-success resize-none transition" />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <button onClick={() => { setModalCloture(false); setMotifCloture(""); setTypeCloture("corrige"); }} className="px-4 py-2 text-sm bg-hover hover:bg-active rounded-lg transition text-text">Annuler</button>
            <button onClick={handleCloturer} disabled={loadingCloture} className="btn btn-success">
              {loadingCloture ? "Clôture en cours…" : "Clôturer définitivement"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog Affectation ===== */}
      <Dialog open={modalAffectation} onOpenChange={setModalAffectation}>
        <DialogContent className="bg-elevated border border-border text-text max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <User size={18} />
              {editingAffectation ? "Modifier l'affectation" : "Affecter une équipe"}
            </DialogTitle>
            <DialogDescription className="text-text-muted text-sm">
              {editingAffectation ? "Modifiez le statut et les membres de l'affectation" : "Sélectionnez l'équipe et les membres qui interviendront sur l'OT"}{" "}
              <span className="font-mono text-text">{ot?.numero}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Équipe <span className="text-danger">*</span></label>
              {editingAffectation ? (
                <p className="text-sm text-text bg-surface rounded-lg px-3 py-2 border border-border">{editingAffectation.equipe_detail?.libelle ?? "—"}</p>
              ) : (
                <select value={selectedEquipe} onChange={(e) => handleSelectEquipe(e.target.value)}
                  className="w-full bg-surface text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-primary transition">
                  <option value="">— Sélectionner une équipe —</option>
                  {equipes.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.libelle} {eq.chef_nom ? `(${eq.chef_nom})` : ""}</option>
                  ))}
                </select>
              )}
              {!editingAffectation && equipes.length === 0 && (
                <p className="text-xs text-text-muted mt-2">Chargement des équipes…</p>
              )}
            </div>
            {editingAffectation && (
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Statut</label>
                <select value={editStatut} onChange={(e) => setEditStatut(e.target.value)}
                  className="w-full bg-surface text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-primary transition">
                  <option value="en_attente">En attente</option>
                  <option value="en_cours">En cours</option>
                  <option value="termine">Terminé</option>
                  <option value="rejeter">Rejeté</option>
                </select>
              </div>
            )}
            {(selectedEquipe || editingAffectation) && (
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Membres participants <span className="text-danger">*</span></label>
                <div className="max-h-48 overflow-y-auto space-y-1 bg-surface rounded-lg border border-border p-2">
                  {membresEquipe.length === 0 ? (
                    <p className="text-xs text-text-muted py-2">Aucun membre dans cette équipe.</p>
                  ) : (
                    membresEquipe.map((m) => {
                      const uid = typeof m.utilisateur === 'string' ? m.utilisateur : (m.utilisateur?.id || m.id);
                      const nom = m.utilisateur_nom || (typeof m.utilisateur === 'object' ? `${m.utilisateur?.prenom || ""} ${m.utilisateur?.nom || ""}`.trim() : "") || "Membre";
                      const checked = selectedMembres.includes(uid);
                      const alreadyInOther = ot.affectations?.some((aff) => {
                        if (editingAffectation && aff.id === editingAffectation.id) return false;
                        return aff.membres?.some((mm) => (mm.utilisateur_detail?.id || mm.idUtilisateur || mm.id) === uid);
                      });
                      const disabled = alreadyInOther && !checked;
                      return (
                        <label key={uid} className={`flex items-center gap-2 px-2 py-1.5 rounded transition ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-hover"} ${checked && !disabled ? "bg-primary-soft" : ""}`}>
                          <input type="checkbox" checked={checked} onChange={() => !disabled && toggleMembre(uid)} disabled={disabled} className="accent-primary w-4 h-4" />
                          <span className={`text-sm ${disabled ? "text-text-muted" : "text-text"}`}>{nom}</span>
                          {alreadyInOther && <span className="text-[10px] text-warning uppercase ml-auto">Déjà affecté</span>}
                          {!alreadyInOther && m.niveauRole && <span className="text-[10px] text-text-muted uppercase ml-auto">{m.niveauRole}</span>}
                        </label>
                      );
                    })
                  )}
                </div>
                {selectedMembres.length > 0 && (
                  <p className="text-[10px] text-primary mt-1">{selectedMembres.length} sélectionné(s)</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 mt-2">
            <button onClick={closeAffectationModal} className="px-4 py-2 text-sm bg-hover hover:bg-active rounded-lg transition text-text">Annuler</button>
            {editingAffectation ? (
              <button onClick={handleUpdateAffectation} disabled={loadingAffectation || selectedMembres.length === 0} className="btn btn-primary">
                {loadingAffectation ? "Enregistrement…" : "Enregistrer"}
              </button>
            ) : (
              <button onClick={handleAffecter} disabled={loadingAffectation || !selectedEquipe || selectedMembres.length === 0} className="btn btn-primary">
                {loadingAffectation ? "Affectation en cours…" : "Affecter"}
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
