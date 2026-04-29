import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getOT,
  changerStatutOT,
  cloturerOT,
  ajouterCommentaire,
  getCommentaires,
  getHistoriqueOT,
} from "../../services/ordreService";

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

export default function DetailOT() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ot, setOT] = useState(null);
  const [commentaires, setCommentaires] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [onglet, setOnglet] = useState("info");
  const [loading, setLoading] = useState(true);
  const [modalStatut, setModalStatut] = useState(false);
  const [nvStatut, setNvStatut] = useState("");
  const [motif, setMotif] = useState("");
  const [newComment, setNewComment] = useState("");
  const [estInterne, setEstInterne] = useState(false);
  const estVerrouille = ["DEPANNE", "CLOTURE"].includes(ot?.statut);

  const charger = async () => {
    try {
      const [o, c, h] = await Promise.all([
        getOT(id),
        getCommentaires(id),
        getHistoriqueOT(id),
      ]);
      console.log("Historique:", h.data);
      setOT(o.data);
      setCommentaires(c.data.results || c.data);
      setHistorique(h.data.results || h.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, [id]);

  const handleChangerStatut = async () => {
    await changerStatutOT(id, nvStatut, motif);
    setModalStatut(false);
    setNvStatut("");
    setMotif("");
    charger();
  };

  const handleCloturer = async () => {
    if (!confirm("Clôturer définitivement cet OT ?")) return;
    await cloturerOT(id);
    charger();
  };

  const handleCommentaire = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await ajouterCommentaire(id, newComment, estInterne);
    setNewComment("");
    setEstInterne(false);
    charger();
  };

  if (loading) return <div className="p-6 text-gray-400">Chargement...</div>;
  if (!ot) return <div className="p-6 text-red-400">OT introuvable.</div>;

  const s = STATUT[ot.statut];

  return (
    <div className="p-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
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
        </div>
        <div className="flex gap-2">
          {!estVerrouille && (
            <>
              <button
                onClick={() => {
                  setModalStatut(true);
                  setNvStatut(ot.statut);
                }}
                className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-sm transition">
                Changer statut
              </button>
              <button
                onClick={handleCloturer}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm transition">
                Clôturer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Infos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            Délais & Coûts
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

      {/* Onglets */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-700">
          {[
            ["affectations", `Affectations (${ot.affectations?.length || 0})`],
            ["pieces", `Pièces (${ot.nb_pieces_utilisees || 0})`],
            ["commentaires", `Commentaires (${commentaires.length})`],
            ["historique", `Historique (${historique.length})`],
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
          {onglet === "affectations" &&
            (ot.affectations?.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                Aucune affectation
              </p>
            ) : (
              <div className="space-y-2">
                {ot.affectations?.map((a) => (
                  <div
                    key={a.id}
                    className="bg-gray-700/40 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">
                        {a.equipe_detail?.libelle ||
                          a.soustraitant_detail?.raisonSociale ||
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
                ))}
              </div>
            ))}

          {/* Pièces utilisées */}
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
              <div className="space-y-2 mb-4">
                {commentaires.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Aucun commentaire
                  </p>
                ) : (
                  commentaires.map((c) => (
                    <div
                      key={c.id}
                      className={`rounded-lg p-3 ${c.estInterne ? "bg-amber-500/10 border border-amber-500/20" : "bg-gray-700/40"}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-300">
                          {c.utilisateur_detail?.prenom}{" "}
                          {c.utilisateur_detail?.nom}
                          {c.estInterne && (
                            <span className="ml-2 text-amber-400 text-xs">
                              [Interne]
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(c.dateCreation).toLocaleString("fr-FR")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{c.commentaire}</p>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleCommentaire} className="flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter un commentaire..."
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
                        <span
                          className={`px-2 py-0.5 rounded text-xs border ${STATUT[h.ancienStatut]?.cls}`}>
                          {STATUT[h.ancienStatut]?.label}
                        </span>
                      )}
                      {h.ancienStatut && (
                        <span className="text-gray-500 text-xs">→</span>
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
        </div>
      </div>

      {/* Modal changer statut */}
      {modalStatut && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Changer le statut</h2>
            <select
              value={nvStatut}
              onChange={(e) => setNvStatut(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none mb-3">
              {Object.entries(STATUT)
                .filter(([k]) => k !== "REJETE")
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
            </select>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Motif (optionnel)"
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none mb-4 resize-none h-16"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalStatut(false)}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white">
                Annuler
              </button>
              <button
                onClick={handleChangerStatut}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition text-white">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
