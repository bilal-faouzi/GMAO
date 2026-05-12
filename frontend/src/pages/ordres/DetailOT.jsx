import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getOT,
  changerStatutOT,
  ajouterCommentaire,
  getCommentaires,
  getHistoriqueOT,
  affecterEquipe,
} from "../../services/ordreService";
import { getJournalAuditv2, getUtilisateurs } from "../../services/securiteService";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, User, Wrench, MessageSquare, AlertTriangle, Plus, X } from "lucide-react";

// ─── Couleurs d'audit ─────────────────────────────────────────────────────────
const AUDIT_ACTION_CONFIG = {
  CREATE: { label: "Création", cls: "bg-green-500/20 text-green-400 border-green-500/30", dot: "bg-green-400" },
  UPDATE: { label: "Modification", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30", dot: "bg-blue-400" },
  DELETE: { label: "Suppression", cls: "bg-red-500/20 text-red-400 border-red-500/30", dot: "bg-red-400" },
  CHANGE_STATUS: { label: "Changement de statut", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30", dot: "bg-amber-400" },
  VALIDER: { label: "Validation", cls: "bg-purple-500/20 text-purple-400 border-purple-500/30", dot: "bg-purple-400" },
  REJECT: { label: "Rejet", cls: "bg-red-500/20 text-red-400 border-red-500/30", dot: "bg-red-400" },
  UPLOAD_FICHIERS: { label: "Fichiers ajoutés", cls: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", dot: "bg-cyan-400" },
  CLOTURER: { label: "Clôture", cls: "bg-green-500/20 text-green-400 border-green-500/30", dot: "bg-green-400" },
  ENREGISTRER_PIECE: { label: "Pièce utilisée", cls: "bg-pink-500/20 text-pink-400 border-pink-500/30", dot: "bg-pink-400" },
  AJOUTER_COMMENTAIRE: { label: "Commentaire", cls: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30", dot: "bg-indigo-400" },
};

function getAuditConfig(action) {
  return AUDIT_ACTION_CONFIG[action] || { label: action, cls: "bg-gray-500/20 text-gray-400 border-gray-500/30", dot: "bg-gray-400" };
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
        <div className={`w-3 h-3 rounded-full ${cfg.dot} ring-4 ring-gray-800`} />
        {!isLast && <div className="w-px flex-1 bg-gray-700 my-1" />}
      </div>

      {/* Contenu */}
      <div className={`flex-1 pb-5 ${!isLast ? "" : ""}`}>
        <div className="bg-gray-700/40 rounded-lg p-3 border border-gray-700/50 hover:border-gray-600 transition">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center text-[10px] font-bold border border-purple-500/30">
                {initials || "?"}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{userName}</p>
                <p className="text-[10px] text-gray-500">
                  {new Date(entry.horodatage).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${cfg.cls}`}>
              {cfg.label}
            </span>
          </div>

          {/* Module */}
          <p className="text-xs text-gray-400 mb-1.5">
            Module : <span className="text-gray-300">{entry.module}</span>
            {entry.type_entite && (
              <>
                {" · "}Entité : <span className="text-gray-300">{entry.type_entite}</span>
              </>
            )}
          </p>

          {/* Valeurs avant/après */}
          {(entry.ancienne_valeur || entry.nouvelle_valeur) && (
            <div className="mt-2 space-y-1.5">
              {entry.ancienne_valeur && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-gray-500 shrink-0 w-14">Avant :</span>
                  <span className="text-red-300 bg-red-500/10 rounded px-1.5 py-0.5 break-all">
                    {formatAuditValue(entry.ancienne_valeur)}
                  </span>
                </div>
              )}
              {entry.nouvelle_valeur && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-gray-500 shrink-0 w-14">Après :</span>
                  <span className="text-green-300 bg-green-500/10 rounded px-1.5 py-0.5 break-all">
                    {formatAuditValue(entry.nouvelle_valeur)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Adresse IP */}
          {entry.adresse_ip && (
            <p className="text-[10px] text-gray-600 mt-2">
              IP : {entry.adresse_ip}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Statuts ──────────────────────────────────────────────────────────────────
const STATUT = {
  EN_COURS: {
    label: "En cours",
    cls: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  DEPANNE: {
    label: "Dépanné",
    cls: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  CLOTURE: {
    label: "Clôturé",
    cls: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  REJETE: {
    label: "Rejeté",
    cls: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

// ─── Composant ────────────────────────────────────────────────────────────────
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
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [loadingAffectation, setLoadingAffectation] = useState(false);

  const estVerrouille = ["DEPANNE", "CLOTURE", "REJETE"].includes(ot?.statut);

  // ─── Chargement ─────────────────────────────────────────────────────────────
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

  // ─── Action : Affecter une personne ──────────────────────────────────────────
  const openAffectationModal = async () => {
    setModalAffectation(true);
    setSelectedUser("");
    try {
      const r = await getUtilisateurs({ est_actif: true, no_page: true });
      setUsers(r.data.results ?? r.data ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAffecter = async () => {
    if (!selectedUser) return;
    setLoadingAffectation(true);
    try {
      await affecterEquipe(id, {
        idChefTechnicien: selectedUser,
        dateDebut: new Date().toISOString(),
        membres: [selectedUser],
      });
      setModalAffectation(false);
      setSelectedUser("");
      charger();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'affectation");
    } finally {
      setLoadingAffectation(false);
    }
  };

  // ─── Action : Dépanner ──────────────────────────────────────────────────────
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

  // ─── Action : Clôturer ──────────────────────────────────────────────────────
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

  // ─── Action : Commentaire ───────────────────────────────────────────────────
  const handleCommentaire = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await ajouterCommentaire(id, newComment, estInterne);
    setNewComment("");
    setEstInterne(false);
    charger();
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <div className="p-6 text-gray-400">Chargement…</div>;
  if (!ot) return <div className="p-6 text-red-400">OT introuvable.</div>;

  const s = STATUT[ot.statut];

  return (
    <div className="p-6 text-white">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate("/ordres/ots")}
            className="text-gray-400 hover:text-white text-sm transition">
            ← Retour
          </button>
          <h1 className="text-2xl font-semibold font-mono">{ot.numero}</h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${s?.cls}`}>
            {s?.label}
          </span>
          {ot.est_en_retard && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">
              ⚠ Retard
            </span>
          )}
          {ot.rejetOperateur && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/30 text-red-300 border border-red-500/40 animate-pulse">
              ❌ Rejeté opérateur
            </span>
          )}
        </div>

        {/* Boutons d'action — cachés si l'OT est verrouillé */}
        {!estVerrouille && (
          <div className="flex gap-2">
            {/* Bouton Dépanné */}
            <button
              onClick={() => setModalDepanne(true)}
              className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg text-sm font-medium transition">
              🔧 Dépanné
            </button>

            {/* Bouton Clôturer */}
            <button
              onClick={() => setModalCloture(true)}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition">
              ✓ Clôturer
            </button>
          </div>
        )}
      </div>

      {/* ── Notification rejet opérateur ─────────────────────────────────── */}
      {ot.rejetOperateur && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-300">
                ⚠️ Cette intervention a été rejetée par l'opérateur
              </p>
              {ot.motifRejetOperateur && (
                <p className="text-sm text-red-200/80 mt-1">
                  Motif : {ot.motifRejetOperateur}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
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

      {/* ── Traçabilité ────────────────────────────────────────────────────── */}
      {ot.demande_detail && (
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700 mb-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
            📋 Traçabilité
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* DI créée par */}
            <div className="bg-gray-900/40 rounded-lg p-3 border border-gray-700/50">
              <p className="text-[10px] text-gray-500 mb-1">DI créée par</p>
              <p className="text-sm font-medium text-white">
                {ot.demande_detail.signalement_detail
                  ? `${ot.demande_detail.signalement_detail.prenom} ${ot.demande_detail.signalement_detail.nom}`
                  : "—"}
              </p>
              <p className="text-[10px] text-gray-500">
                {ot.demande_detail.dateSignalement
                  ? new Date(ot.demande_detail.dateSignalement).toLocaleString("fr-FR")
                  : "—"}
              </p>
              <p className="text-[10px] text-gray-600 mt-1 font-mono">
                {ot.demande_detail.numero}
              </p>
            </div>

            {/* OT créé par */}
            <div className="bg-gray-900/40 rounded-lg p-3 border border-gray-700/50">
              <p className="text-[10px] text-gray-500 mb-1">OT créé par</p>
              <p className="text-sm font-medium text-white">
                {ot.createur_detail
                  ? `${ot.createur_detail.prenom} ${ot.createur_detail.nom}`
                  : "—"}
              </p>
              <p className="text-[10px] text-gray-500">
                {ot.created_at
                  ? new Date(ot.created_at).toLocaleString("fr-FR")
                  : "—"}
              </p>
              <p className="text-[10px] text-gray-600 mt-1">
                Depuis une DI {ot.demande_detail.urgence === 'critique' ? '🔴 critique' : ''}
              </p>
            </div>

            {/* OT validé par */}
            <div className={`rounded-lg p-3 border ${ot.validation_detail ? 'bg-green-900/20 border-green-700/30' : 'bg-gray-900/40 border-gray-700/50'}`}>
              <p className="text-[10px] text-gray-500 mb-1">OT validé par</p>
              <p className={`text-sm font-medium ${ot.validation_detail ? 'text-green-300' : 'text-white'}`}>
                {ot.validation_detail
                  ? `${ot.validation_detail.prenom} ${ot.validation_detail.nom}`
                  : ot.statut === 'CLOTURE' || ot.statut === 'DEPANNE'
                    ? "En attente de validation"
                    : "—"}
              </p>
              <p className="text-[10px] text-gray-500">
                {ot.dateCloture
                  ? new Date(ot.dateCloture).toLocaleString("fr-FR")
                  : ot.statut === 'CLOTURE' || ot.statut === 'DEPANNE'
                    ? "Validation opérateur en cours"
                    : "—"}
              </p>
              {ot.validation_detail && (
                <p className="text-[10px] text-green-500 mt-1">✅ Approuvé</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Infos & Délais ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Informations générales */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            Informations
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
              className="flex justify-between text-sm py-1.5 border-b border-gray-700/50 last:border-0">
              <span className="text-gray-400">{l}</span>
              <span className="text-white font-medium text-right max-w-[200px]">
                {v}
              </span>
            </div>
          ))}
        </div>

        {/* Délais & Coûts */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            Délais &amp; Coûts
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
            ["Coût M.O.", ot.coutMainOeuvre ? `${ot.coutMainOeuvre} MAD` : "—"],
            [
              "Coût ST",
              ot.coutSousTraitance ? `${ot.coutSousTraitance} MAD` : "—",
            ],
            ["Coût total", `${ot.cout_total} MAD`],
          ].map(([l, v]) => (
            <div
              key={l}
              className="flex justify-between text-sm py-1.5 border-b border-gray-700/50 last:border-0">
              <span className="text-gray-400">{l}</span>
              <span className="text-white font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Compte rendu ─────────────────────────────────────────────────── */}
      {(() => {
        const comptesRendus = commentaires.filter(
          (c) => c.estInterne && c.commentaire?.includes("📋 COMPTE RENDU INTERVENTION")
        );
        return comptesRendus.length > 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
            <h2 className="text-xs text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MessageSquare size={14} /> Compte rendu d'intervention
            </h2>
            <div className="space-y-3">
              {comptesRendus.map((cr) => (
                <div key={cr.id} className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center text-[10px] font-bold border border-purple-500/30">
                      {cr.utilisateur_detail
                        ? `${cr.utilisateur_detail.prenom?.[0] || ""}${cr.utilisateur_detail.nom?.[0] || ""}`.toUpperCase()
                        : "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {cr.utilisateur_detail
                          ? `${cr.utilisateur_detail.prenom} ${cr.utilisateur_detail.nom}`
                          : "Technicien"}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(cr.dateCreation).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">{cr.commentaire}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* ── Actifs corrigés ──────────────────────────────────────────────── */}
      {ot.actifs_corriges?.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
          <h2 className="text-xs text-teal-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <CheckCircle size={14} /> Actifs corrigés pendant l'intervention
          </h2>
          <div className="flex flex-wrap gap-2">
            {ot.actifs_corriges.map((ac) => (
              <div key={ac.id} className="bg-teal-500/10 rounded-lg px-3 py-2 border border-teal-500/20 flex items-center gap-2">
                <CheckCircle size={12} className="text-teal-400" />
                <div>
                  <p className="text-sm font-medium text-teal-300">{ac.actif_detail?.code}</p>
                  <p className="text-[10px] text-teal-400/70">{ac.actif_detail?.libelle}</p>
                </div>
                {ac.corrigePar_detail && (
                  <span className="text-[10px] text-gray-500 ml-2 border-l border-teal-500/20 pl-2">
                    par {ac.corrigePar_detail.prenom} {ac.corrigePar_detail.nom}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Onglets ────────────────────────────────────────────────────────── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-700">
          {[
            ["affectations", `Affectations (${ot.affectations?.length || 0})`],
            ["pieces", `Pièces (${ot.nb_pieces_utilisees || 0})`],
            ["commentaires", `Commentaires (${commentaires.filter((c) => !(c.estInterne && c.commentaire?.includes("📋 COMPTE RENDU INTERVENTION"))).length})`],
            ["historique", `Historique (${historique.length})`],
            ["audit", `Audit complet (${audit.length})`],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setOnglet(k)}
              className={`py-3 px-4 text-sm font-medium transition border-b-2 -mb-px ${
                onglet === k
                  ? "text-purple-400 border-purple-400"
                  : "text-gray-500 border-transparent hover:text-white"
              }`}>
              {l}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Affectations */}
          {onglet === "affectations" && (
            <div className="space-y-3">
              {!estVerrouille && (
                <div className="flex justify-end">
                  <button
                    onClick={openAffectationModal}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition">
                    <Plus size={14} />
                    Affecter une personne
                  </button>
                </div>
              )}
              {ot.affectations?.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  Aucune affectation
                </p>
              ) : (
                <>
                  {ot.affectations?.map((a) => (
                  <div
                    key={a.id}
                    className="bg-gray-700/40 rounded-lg p-3 border border-gray-700/50">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {a.equipe_detail?.libelle ??
                            a.soustraitant_detail?.raisonSociale ??
                            "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(a.dateDebut).toLocaleString("fr-FR")}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          a.statut === "termine"
                            ? "bg-green-500/20 text-green-400"
                            : a.statut === "en_cours"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-gray-500/20 text-gray-400"
                        }`}>
                        {a.statut}
                      </span>
                    </div>
                    {/* Membres de l'affectation */}
                    {a.membres?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700/50">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <User size={10} /> Techniciens affectés
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {a.membres.map((m) => (
                            <span
                              key={m.id}
                              className="text-[11px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1">
                              <span className="w-4 h-4 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center text-[8px] font-bold border border-purple-500/30">
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
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

          {/* Pièces */}
          {onglet === "pieces" && (
            <p className="text-gray-500 text-sm text-center py-8">
              {ot.nb_pieces_utilisees === 0
                ? "Aucune pièce utilisée"
                : `${ot.nb_pieces_utilisees} pièce(s) utilisée(s)`}
            </p>
          )}

          {/* Commentaires */}
          {onglet === "commentaires" && (
            <div>
              <div className="space-y-3 mb-4">
                {(() => {
                  const vraisCommentaires = commentaires.filter(
                    (c) => !(c.estInterne && c.commentaire?.includes("📋 COMPTE RENDU INTERVENTION"))
                  );
                  return vraisCommentaires.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      Aucun commentaire
                    </p>
                  ) : (
                    vraisCommentaires.map((c) => (
                      <div
                        key={c.id}
                        className={`rounded-lg p-3 ${
                          c.estInterne
                            ? "bg-amber-500/10 border border-amber-500/20"
                            : "bg-gray-700/40 border border-gray-700/50"
                        }`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center text-[10px] font-bold border border-purple-500/30 shrink-0">
                              {c.utilisateur_detail
                                ? `${c.utilisateur_detail.prenom?.[0] || ""}${c.utilisateur_detail.nom?.[0] || ""}`.toUpperCase()
                                : "?"}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-200">
                                {c.utilisateur_detail
                                  ? `${c.utilisateur_detail.prenom} ${c.utilisateur_detail.nom}`
                                  : "Utilisateur"}
                                {c.estInterne && (
                                  <span className="ml-2 text-amber-400 text-[10px]">[Interne]</span>
                                )}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {new Date(c.dateCreation).toLocaleString("fr-FR")}
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{c.commentaire}</p>
                      </div>
                    ))
                  );
                })()}
              </div>
              <form onSubmit={handleCommentaire} className="flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter un commentaire…"
                  className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500"
                />
                <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={estInterne}
                    onChange={(e) => setEstInterne(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Interne
                </label>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-lg text-sm transition text-white">
                  Envoyer
                </button>
              </form>
            </div>
          )}

          {/* Historique */}
          {onglet === "historique" &&
            (historique.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                Aucun historique
              </p>
            ) : (
              <div className="space-y-2">
                {historique.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 p-3 bg-gray-700/40 rounded-lg">
                    <div className="flex items-center gap-2">
                      {h.ancienStatut && (
                        <>
                          <span
                            className={`px-2 py-0.5 rounded text-xs border ${STATUT[h.ancienStatut]?.cls}`}>
                            {STATUT[h.ancienStatut]?.label}
                          </span>
                          <span className="text-gray-500 text-xs">→</span>
                        </>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-xs border ${STATUT[h.nouveauStatut]?.cls}`}>
                        {STATUT[h.nouveauStatut]?.label}
                      </span>
                    </div>
                    <div className="flex-1">
                      {h.motif && (
                        <p className="text-xs text-gray-400">{h.motif}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(h.dateChangement).toLocaleString("fr-FR")}
                    </span>
                  </div>
                ))}
              </div>
            ))}

          {/* Audit complet — Timeline */}
          {onglet === "audit" &&
            (audit.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                Aucune entrée d'audit pour cet OT
              </p>
            ) : (
              <div className="space-y-0">
                {audit.map((entry, idx) => (
                  <AuditTimelineItem
                    key={entry.id}
                    entry={entry}
                    isLast={idx === audit.length - 1}
                  />
                ))}
              </div>
            ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          Dialog — Dépanné
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={modalDepanne} onOpenChange={setModalDepanne}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              🔧 Marquer comme Dépanné
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              L'OT <span className="font-mono text-white">{ot.numero}</span>{" "}
              sera marqué comme dépanné temporairement. L'actif sera rétabli.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                Motif / Commentaire{" "}
                <span className="text-gray-600">(optionnel)</span>
              </label>
              <textarea
                value={motifDepanne}
                onChange={(e) => setMotifDepanne(e.target.value)}
                placeholder="Décrivez l'action de dépannage effectuée…"
                rows={4}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-orange-500 resize-none transition"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <button
              onClick={() => {
                setModalDepanne(false);
                setMotifDepanne("");
              }}
              className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white">
              Annuler
            </button>
            <button
              onClick={handleDepanner}
              disabled={loadingDepanne}
              className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg transition text-white font-medium">
              {loadingDepanne ? "Enregistrement…" : "Confirmer le dépannage"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          Dialog — Clôturer
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={modalCloture} onOpenChange={setModalCloture}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-400">
              ✓ Clôturer l'ordre de travail
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              L'OT <span className="font-mono text-white">{ot.numero}</span>{" "}
              sera clôturé définitivement. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Type de clôture */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                Type de clôture
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "corrige", label: "Corrigé", icon: "✅" },
                  { value: "depanne", label: "Dépanné", icon: "🔧" },
                  { value: "annule", label: "Annulé", icon: "❌" },
                ].map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => setTypeCloture(value)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border text-xs font-medium transition ${
                      typeCloture === value
                        ? "border-green-500 bg-green-500/15 text-green-400"
                        : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500"
                    }`}>
                    <span className="text-base">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Motif */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                Motif / Rapport de clôture{" "}
                <span className="text-gray-600">(optionnel)</span>
              </label>
              <textarea
                value={motifCloture}
                onChange={(e) => setMotifCloture(e.target.value)}
                placeholder="Décrivez les travaux effectués et le résultat final…"
                rows={4}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-green-500 resize-none transition"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <button
              onClick={() => {
                setModalCloture(false);
                setMotifCloture("");
                setTypeCloture("corrige");
              }}
              className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white">
              Annuler
            </button>
            <button
              onClick={handleCloturer}
              disabled={loadingCloture}
              className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition text-white font-medium">
              {loadingCloture ? "Clôture en cours…" : "Clôturer définitivement"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          Dialog — Affecter une personne
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={modalAffectation} onOpenChange={setModalAffectation}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-400">
              <User size={18} /> Affecter une personne
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Sélectionnez la personne qui interviendra sur l'OT{" "}
              <span className="font-mono text-white">{ot?.numero}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-xs text-gray-400 mb-1.5 block">
              Personne <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500 transition">
              <option value="">— Sélectionner une personne —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom} ({u.nom_utilisateur})
                </option>
              ))}
            </select>
            {users.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">Chargement des utilisateurs…</p>
            )}
          </div>

          <DialogFooter className="gap-2 mt-2">
            <button
              onClick={() => {
                setModalAffectation(false);
                setSelectedUser("");
              }}
              className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white">
              Annuler
            </button>
            <button
              onClick={handleAffecter}
              disabled={loadingAffectation || !selectedUser}
              className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition text-white font-medium">
              {loadingAffectation ? "Affectation en cours…" : "Affecter"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
