import { useState, useEffect } from "react";
import { getOTs, validerOT } from "../../services/ordreService";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, MessageCircle, Package, Clock, User, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export default function ValidationOperateur() {
  const [ots, setOTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { ot, type: 'ok'|'panne' }
  const [motif, setMotif] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [expandedOT, setExpandedOT] = useState(null);

  const charger = async () => {
    setLoading(true);
    try {
      const res = await getOTs({ isvalide: "false", no_page: "true" });
      const data = res.data.results || res.data || [];
      const liste = Array.isArray(data) ? data : [];
      // Ne garder que les OT clôturés ou dépannés en attente de validation
      const filtres = liste.filter(
        (ot) =>
          ot.isvalide === false &&
          (ot.statut === "CLOTURE" || ot.statut === "DEPANNE"),
      );
      setOTs(filtres);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const handleConfirmer = async () => {
    setErreur("");

    // Motif obligatoire pour le rejet
    if (modal.type === "panne" && !motif.trim()) {
      setErreur("Veuillez décrire le problème persistant avant de rejeter.");
      return;
    }

    setSubmitting(true);
    try {
      if (modal.type === "ok") {
        await validerOT(
          modal.ot.id,
          true,
          motif || "Intervention validée par opérateur, équipement fonctionnel",
        );
        setMessage("✅ Intervention validée. L'équipement est remis en service.");
      } else {
        await validerOT(
          modal.ot.id,
          false,
          motif.trim(),
        );
        setMessage("🔄 Signalement enregistré. La demande a été ré-ouverte et le responsable notifié.");
      }
      setModal(null);
      setMotif("");
      await charger();
    } catch (e) {
      setErreur(
        e.response?.data?.error ||
          "Erreur lors de la validation. Veuillez réessayer.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

  return (
    <div className="page max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Validation des interventions</h1>
        <p className="text-text-secondary text-sm mt-1">
          Confirmez que l'équipement fonctionne correctement après intervention
        </p>
      </div>

      {message && (
        <div className="bg-green-500/20 border border-green-500/40 text-green-400 rounded-xl p-4 mb-6 text-sm flex items-start gap-3">
          <CheckCircle size={18} className="mt-0.5 shrink-0" />
          <span className="flex-1">{message}</span>
          <button
            onClick={() => setMessage("")}
            className="text-green-300 hover:text-text shrink-0">
            ✕
          </button>
        </div>
      )}

      {erreur && !modal && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl p-4 mb-6 text-sm flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span className="flex-1">{erreur}</span>
          <button
            onClick={() => setErreur("")}
            className="text-red-300 hover:text-text shrink-0">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-text-secondary text-center py-12">Chargement...</div>
      ) : ots.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center">
          <p className="text-5xl mb-4">✅</p>
          <p className="text-text font-medium">
            Aucune intervention en attente de validation
          </p>
          <p className="text-text-muted text-sm mt-2">
            Les interventions terminées apparaîtront ici pour votre confirmation
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-amber-400 font-medium flex items-center gap-2">
            <Clock size={14} />
            {ots.length} intervention{ots.length > 1 ? "s" : ""} en attente de votre confirmation
          </p>
          {ots.map((ot) => {
            const isExpanded = expandedOT === ot.id;
            const di = ot.demande_detail;
            const pieces = ot.pieces_utilisees_detail || [];
            const commentaires = ot.commentaires_detail || [];
            const historiques = ot.historiques_statut || [];
            const dernierStatut = historiques.length > 0 ? historiques[historiques.length - 1] : null;

            return (
              <motion.div
                key={ot.id}
                layout
                className="bg-surface rounded-2xl border border-purple-500/30 overflow-hidden">
                {/* Header */}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-purple-300 font-semibold">
                          {ot.numero}
                        </span>
                        <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
                          En validation
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          ot.priorite === "critique"
                            ? "bg-red-500/20 text-red-400 border-red-500/40"
                            : ot.priorite === "haute"
                              ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                              : "bg-blue-500/20 text-blue-400 border-blue-500/40"
                        }`}>
                          {ot.priorite}
                        </span>
                      </div>
                      <p className="text-lg font-medium">
                        {ot.actif_detail?.libelle}
                      </p>
                      <p className="text-sm text-text-secondary font-mono">
                        {ot.actif_detail?.code}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedOT(isExpanded ? null : ot.id)}
                      className="text-text-secondary hover:text-text text-sm underline underline-offset-2">
                      {isExpanded ? "Réduire" : "Voir le détail complet"}
                    </button>
                  </div>

                  {/* Résumé compact */}
                  <div className="bg-elevated/30 rounded-xl p-3 mb-3 space-y-1.5 text-sm">
                    {di?.titre && (
                      <p className="text-text font-medium">{di.titre}</p>
                    )}
                    {di?.description && (
                      <p className="text-text-secondary line-clamp-2">{di.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                      {ot.dureeReelleMin && (
                        <span className="flex items-center gap-1"><Clock size={12} /> {ot.dureeReelleMin} min</span>
                      )}
                      {ot.nb_pieces_utilisees > 0 && (
                        <span className="flex items-center gap-1"><Package size={12} /> {ot.nb_pieces_utilisees} pièce(s)</span>
                      )}
                      {ot.nb_commentaires > 0 && (
                        <span className="flex items-center gap-1"><MessageCircle size={12} /> {ot.nb_commentaires} commentaire(s)</span>
                      )}
                      {ot.affectations?.length > 0 && (
                        <span className="flex items-center gap-1"><User size={12} /> {ot.affectations.map(a => a.equipe_detail?.libelle || a.soustraitant_detail?.raisonSociale).filter(Boolean).join(", ")}</span>
                      )}
                    </div>
                  </div>

                  {/* Détail complet (expandable) */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden">
                        <div className="space-y-4 pt-3 border-t border-border/50">
                          {/* Description complète DI */}
                          {di?.description && (
                            <div>
                              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                                <AlertTriangle size={10} /> Problème initial signalé
                              </p>
                              <div className="bg-[var(--color-bg)]/50 rounded-lg p-3 text-sm text-text border border-border/50">
                                {di.description}
                              </div>
                            </div>
                          )}

                          {/* Travail effectué — historique statut */}
                          {dernierStatut && (
                            <div>
                              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                                <Wrench size={10} /> Dernier compte rendu
                              </p>
                              <div className="bg-[var(--color-bg)]/50 rounded-lg p-3 text-sm text-text border border-border/50">
                                <p className="font-medium text-text">{dernierStatut.nouveauStatut}</p>
                                {dernierStatut.motif && <p className="text-text-secondary mt-1">{dernierStatut.motif}</p>}
                                <p className="text-[11px] text-text-muted mt-1">{formatDate(dernierStatut.dateChangement)}</p>
                              </div>
                            </div>
                          )}

                          {/* Pièces utilisées */}
                          {pieces.length > 0 && (
                            <div>
                              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                                <Package size={10} /> Pièces utilisées ({pieces.length})
                              </p>
                              <div className="space-y-1.5">
                                {pieces.map((p, i) => (
                                  <div key={i} className="flex justify-between bg-[var(--color-bg)]/50 rounded-lg px-3 py-2 text-sm border border-border/50">
                                    <span className="text-text">{p.piece_detail?.reference || p.piece_detail?.libelle || "Pièce"}</span>
                                    <span className="text-text-muted">× {p.quantite}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Commentaires */}
                          {commentaires.length > 0 && (
                            <div>
                              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                                <MessageCircle size={10} /> Commentaires ({commentaires.length})
                              </p>
                              <div className="space-y-2">
                                {commentaires.map((c, i) => (
                                  <div key={i} className="bg-[var(--color-bg)]/50 rounded-lg px-3 py-2 text-sm border border-border/50">
                                    <p className="text-text">{c.commentaire}</p>
                                    <p className="text-[11px] text-text-muted mt-1">{formatDate(c.dateCreation)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Affectations */}
                          {ot.affectations?.length > 0 && (
                            <div>
                              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                                <User size={10} /> Intervenant(s)
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {ot.affectations.map((a, i) => (
                                  <span key={i} className="bg-[var(--color-bg)]/50 rounded-lg px-3 py-1.5 text-sm border border-border/50 text-text">
                                    {a.equipe_detail?.libelle || a.soustraitant_detail?.raisonSociale || "Intervenant"}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Question à l'opérateur */}
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 my-4">
                    <p className="text-amber-300 font-medium text-sm flex items-center gap-2">
                      <AlertTriangle size={14} />
                      Avez-vous vérifié que <strong>{ot.actif_detail?.libelle}</strong> fonctionne correctement ?
                    </p>
                    <p className="text-amber-400/70 text-xs mt-1">
                      Testez l'équipement avant de confirmer. Votre validation est importante pour la traçabilité.
                    </p>
                  </div>

                  {/* Boutons validation */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setModal({ ot, type: "ok" });
                        setMotif("");
                        setErreur("");
                      }}
                      className="py-3 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                      <CheckCircle size={16} />
                      <span>Machine OK — Valider</span>
                    </button>
                    <button
                      onClick={() => {
                        setModal({ ot, type: "panne" });
                        setMotif("");
                        setErreur("");
                      }}
                      className="py-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/40 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                      <XCircle size={16} />
                      <span>Toujours en panne</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal confirmation */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--color-bg)] rounded-2xl border border-border p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                {modal.type === "ok" ? (
                  <><CheckCircle size={20} className="text-green-400" /> Confirmer la remise en service</>
                ) : (
                  <><XCircle size={20} className="text-red-400" /> Signaler une panne persistante</>
                )}
              </h2>
              <p className="text-text-secondary text-sm mb-4">
                {modal.type === "ok"
                  ? `L'OT ${modal.ot.numero} sera validé définitivement et l'équipement remis en service.`
                  : `L'OT ${modal.ot.numero} sera rejeté. La demande d'intervention sera ré-ouverte pour un nouvel ordre de travail.`}
              </p>

              {modal.type === "panne" && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-xs text-red-300">
                  <strong>Obligatoire :</strong> décrivez le problème persistant observé. Cette information sera transmise au responsable.
                </div>
              )}

              <textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder={
                  modal.type === "ok"
                    ? "Observations (optionnel) — ex: machine testée 10 min, fonctionnement normal"
                    : "Décrivez le problème persistant — ex: bruit toujours présent au démarrage"
                }
                className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border-subtle outline-none mb-4 resize-none h-24"
              />

              {erreur && modal && (
                <div className="bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg p-3 mb-4 text-sm flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  {erreur}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setModal(null); setErreur(""); }}
                  className="px-4 py-2 text-sm bg-elevated hover:bg-gray-600 rounded-lg transition text-text">
                  Annuler
                </button>
                <button
                  onClick={handleConfirmer}
                  disabled={submitting}
                  className={`px-4 py-2 text-sm rounded-lg transition text-text disabled:opacity-50 flex items-center gap-2 ${
                    modal.type === "ok"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}>
                  {submitting ? (
                    <span className="animate-spin">⟳</span>
                  ) : modal.type === "ok" ? (
                    <><CheckCircle size={14} /> Confirmer OK</>
                  ) : (
                    <><XCircle size={14} /> Signaler panne</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
