import { useState, useEffect } from "react";
import { getOTs, validerOT } from "../../services/ordreService";

export default function ValidationOperateur() {
  const [ots, setOTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { ot, type: 'ok'|'panne' }
  const [motif, setMotif] = useState("");
  const [typeCloture, setTypeCloture] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  const charger = async () => {
    setLoading(true);
    try {
      const res = await getOTs({ isvalidee: "false" });
      const data = res.data.results || res.data || [];
      const liste = Array.isArray(data) ? data : [];
      // Ne garder que les OT clôturés ou dépannés en attente de validation
      const filtres = liste.filter(
        (ot) =>
          ot.isvalidee === false &&
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
    setSubmitting(true);
    setErreur("");
    try {
      if (modal.type === "ok") {
        await validerOT(
          modal.ot.id,
          true,
          motif || "Intervention validée par opérateur, équipement fonctionnel",
          typeCloture || modal.ot.typeCloture || "corrige",
        );
        setMessage("✅ Intervention validée. Merci pour votre confirmation.");
      } else {
        await validerOT(
          modal.ot.id,
          false,
          motif ||
            "Problème persistant signalé par opérateur, intervention à reprendre",
        );
        setMessage("🔄 Signalement enregistré. Le responsable a été notifié.");
      }
      setModal(null);
      setMotif("");
      setTypeCloture("");
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

  return (
    <div className="p-6 text-white max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Validation des interventions</h1>
        <p className="text-gray-400 text-sm mt-1">
          Confirmez que l'équipement fonctionne correctement après intervention
        </p>
      </div>

      {message && (
        <div className="bg-green-500/20 border border-green-500/40 text-green-400 rounded-xl p-4 mb-6 text-sm">
          {message}
          <button
            onClick={() => setMessage("")}
            className="ml-3 text-green-300 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {erreur && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl p-4 mb-6 text-sm">
          {erreur}
          <button
            onClick={() => setErreur("")}
            className="ml-3 text-red-300 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-center py-12">Chargement...</div>
      ) : ots.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-12 text-center">
          <p className="text-5xl mb-4">✅</p>
          <p className="text-gray-300 font-medium">
            Aucune intervention en attente de validation
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Les interventions terminées apparaîtront ici pour votre confirmation
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-amber-400 font-medium">
            ⏳ {ots.length} intervention(s) en attente de votre confirmation
          </p>
          {ots.map((ot) => (
            <div
              key={ot.id}
              className="bg-gray-800 rounded-2xl border border-purple-500/30 p-5">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-purple-300 font-semibold">
                      {ot.numero}
                    </span>
                    <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
                      En validation
                    </span>
                  </div>
                  <p className="text-lg font-medium">
                    {ot.actif_detail?.libelle}
                  </p>
                  <p className="text-sm text-gray-400 font-mono">
                    {ot.actif_detail?.code}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full border font-medium ${
                    ot.priorite === "critique"
                      ? "bg-red-500/20 text-red-400 border-red-500/40"
                      : ot.priorite === "haute"
                        ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                        : "bg-blue-500/20 text-blue-400 border-blue-500/40"
                  }`}>
                  {ot.priorite}
                </span>
              </div>

              {/* Infos intervention */}
              <div className="bg-gray-700/30 rounded-xl p-4 mb-4 space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">
                  Résumé de l'intervention
                </p>
                {ot.description && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-gray-400 min-w-[100px]">
                      Description :
                    </span>
                    <span className="text-gray-300">{ot.description}</span>
                  </div>
                )}
                {ot.dureeReelleMin && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-gray-400 min-w-[100px]">
                      Durée réelle :
                    </span>
                    <span className="text-gray-300">
                      {ot.dureeReelleMin} minutes
                    </span>
                  </div>
                )}
                {ot.affectations?.length > 0 && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-gray-400 min-w-[100px]">
                      Intervenant(s) :
                    </span>
                    <span className="text-gray-300">
                      {ot.affectations
                        .map(
                          (a) =>
                            a.equipe_detail?.libelle ||
                            a.soustraitant_detail?.raisonSociale,
                        )
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
                {ot.nb_pieces_utilisees > 0 && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-gray-400 min-w-[100px]">
                      Pièces utilisées :
                    </span>
                    <span className="text-gray-300">
                      {ot.nb_pieces_utilisees} pièce(s)
                    </span>
                  </div>
                )}
                {ot.typeCloture && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-gray-400 min-w-[100px]">
                      Type clôture :
                    </span>
                    <span className="text-gray-300">
                      {ot.typeCloture === "corrige"
                        ? "Corrigé définitivement"
                        : "Dépanné temporairement"}
                    </span>
                  </div>
                )}
              </div>

              {/* Question à l'opérateur */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
                <p className="text-amber-300 font-medium text-sm">
                  🔍 Avez-vous vérifié que l'équipement{" "}
                  <strong>{ot.actif_detail?.libelle}</strong> fonctionne
                  correctement ?
                </p>
                <p className="text-amber-400/70 text-xs mt-1">
                  Testez l'équipement avant de confirmer. Votre validation est
                  importante pour la traçabilité.
                </p>
              </div>

              {/* Boutons validation */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setModal({ ot, type: "ok" });
                    setMotif("");
                    setTypeCloture(ot.typeCloture || "corrige");
                  }}
                  className="py-3 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                  <span>✅</span>
                  <span>Machine OK — Valider</span>
                </button>
                <button
                  onClick={() => {
                    setModal({ ot, type: "panne" });
                    setMotif("");
                    setTypeCloture("");
                  }}
                  className="py-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/40 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                  <span>❌</span>
                  <span>Toujours en panne</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal confirmation */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">
              {modal.type === "ok"
                ? "✅ Confirmer la remise en service"
                : "❌ Signaler une panne persistante"}
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              {modal.type === "ok"
                ? `L'OT ${modal.ot.numero} sera validé définitivement.`
                : `L'OT ${modal.ot.numero} sera renvoyé en intervention.`}
            </p>
            {modal.type === "ok" && (
              <div className="mb-4">
                <label className="text-xs text-gray-400 mb-1 block">
                  Type de clôture
                </label>
                <select
                  value={typeCloture}
                  onChange={(e) => setTypeCloture(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none">
                  <option value="corrige">Corrigé définitivement</option>
                  <option value="depanne">Dépanné temporairement</option>
                </select>
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
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none mb-4 resize-none h-20"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white">
                Annuler
              </button>
              <button
                onClick={handleConfirmer}
                disabled={submitting}
                className={`px-4 py-2 text-sm rounded-lg transition text-white disabled:opacity-50 ${
                  modal.type === "ok"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}>
                {submitting
                  ? "..."
                  : modal.type === "ok"
                    ? "Confirmer OK"
                    : "Signaler panne"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
