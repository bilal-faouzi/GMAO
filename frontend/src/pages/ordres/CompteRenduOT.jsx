import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  getOT,
  changerStatutOT,
  ajouterCommentaire,
  changerActifOT,
  enregistrerActifsCorriges,
} from "../../services/ordreService";
import { getActifs, getActif } from "../../services/actifService";
import {
  Send,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Package,
  MessageCircle,
  Clock,
  User,
  Image,
  Music,
  Film,
  FileText,
  ChevronDown,
  ChevronUp,
  History,
  MapPin,
  ArrowRightLeft,
  Plus,
  Trash2,
} from "lucide-react";

const CATEGORIES_CAUSE = {
  mecanique: {
    label: "Mécanique",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  electrique: {
    label: "Électrique",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  humain: {
    label: "Erreur humaine",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  externe: {
    label: "Facteur externe",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  autre: {
    label: "Autre",
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  },
};

export default function CompteRenduOT() {
  const { idOT } = useParams();
  const navigate = useNavigate();
  const [ot, setOT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [changingActif, setChangingActif] = useState(false);

  const [rapport, setRapport] = useState({
    descriptionTravail: "",
    constatations: "",
    causeRacine: "",
    solutionApportee: "",
    estCloture: false,
    typeCloture: "depanne",
  });

  // Actifs corrigés
  const [actifsCorriges, setActifsCorriges] = useState([]);
  const [showActifCorrigeSelector, setShowActifCorrigeSelector] = useState(false);
  const [corrigeSelectionPath, setCorrigeSelectionPath] = useState([]);
  const [corrigeOptionsAtLevel, setCorrigeOptionsAtLevel] = useState([]);
  const [corrigeLoading, setCorrigeLoading] = useState(false);

  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    contexte: true,
    pieces: false,
    commentaires: false,
    historique: false,
    tracabilite: false,
  });

  // ── Sélecteur hiérarchique d'actif ──
  const [showActifSelector, setShowActifSelector] = useState(false);
  const [selectionPath, setSelectionPath] = useState([]);
  const [optionsAtLevel, setOptionsAtLevel] = useState([]);
  const [actifLoading, setActifLoading] = useState(false);

  const charger = async () => {
    setLoading(true);
    try {
      const r = await getOT(idOT);
      const data = r.data;
      setOT(data);
      // Pré-remplir le sélecteur avec l'actif actuel
      if (data.actif_detail?.id) {
        await initActifSelector(data.actif_detail.id);
      }
    } catch (e) {
      setErreur("Impossible de charger l'OT");
    } finally {
      setLoading(false);
    }
  };

  const initActifSelector = async (actifId) => {
    setActifLoading(true);
    try {
      const r = await getActif(actifId);
      const actif = r.data;
      // Construire le chemin depuis la racine
      const chemin = [];
      let current = actif;
      while (current.idParent) {
        const parentR = await getActif(current.idParent);
        const parent = parentR.data;
        chemin.unshift(parent);
        current = parent;
      }
      // Charger les options à chaque niveau
      const options = [];
      const racines = await getActifs({ estActif: true, idParent: "null", my_unite: true });
      options[0] = racines.data.results || racines.data || [];
      for (let i = 0; i < chemin.length; i++) {
        const childrenR = await getActifs({ estActif: true, idParent: chemin[i].id, my_unite: true });
        options[i + 1] = childrenR.data.results || childrenR.data || [];
      }
      const path = [...chemin, actif];
      setSelectionPath(path);
      setOptionsAtLevel(options);
    } catch (e) {
      console.error(e);
    } finally {
      setActifLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, [idOT]);

  const toggleSection = (key) =>
    setExpandedSections((s) => ({ ...s, [key]: !s[key] }));

  const handleSelectAtLevel = async (levelIndex, assetId) => {
    const selectedAsset = optionsAtLevel[levelIndex].find((a) => a.id === assetId);
    if (!selectedAsset) return;
    const newPath = selectionPath.slice(0, levelIndex);
    newPath[levelIndex] = selectedAsset;
    setSelectionPath(newPath);
    // Fetch children
    try {
      const r = await getActifs({ estActif: true, idParent: selectedAsset.id, my_unite: true });
      const children = r.data.results || r.data || [];
      if (children.length > 0) {
        setOptionsAtLevel((prev) => {
          const updated = [...prev.slice(0, levelIndex + 1)];
          updated[levelIndex + 1] = children;
          return updated;
        });
      } else {
        setOptionsAtLevel((prev) => prev.slice(0, levelIndex + 1));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangerActif = async () => {
    const selected = selectionPath[selectionPath.length - 1];
    if (!selected || selected.id === ot.actif_detail?.id) {
      setShowActifSelector(false);
      return;
    }
    setChangingActif(true);
    try {
      await changerActifOT(idOT, selected.id);
      setSucces("✅ Équipement modifié avec succès.");
      await charger();
      setShowActifSelector(false);
    } catch (e) {
      setErreur(e.response?.data?.error || "Erreur lors du changement d'équipement.");
    } finally {
      setChangingActif(false);
    }
  };

  // ── Gestion actifs corrigés ──
  const initCorrigeSelector = async () => {
    setCorrigeLoading(true);
    try {
      const racines = await getActifs({ estActif: true, idParent: "null", my_unite: true });
      setCorrigeOptionsAtLevel([racines.data.results || racines.data || []]);
      setCorrigeSelectionPath([]);
    } catch (e) {
      console.error(e);
    } finally {
      setCorrigeLoading(false);
    }
  };

  const handleCorrigeSelectAtLevel = async (levelIndex, assetId) => {
    const selectedAsset = corrigeOptionsAtLevel[levelIndex].find((a) => a.id === assetId);
    if (!selectedAsset) return;
    const newPath = corrigeSelectionPath.slice(0, levelIndex);
    newPath[levelIndex] = selectedAsset;
    setCorrigeSelectionPath(newPath);
    try {
      const r = await getActifs({ estActif: true, idParent: selectedAsset.id, my_unite: true });
      const children = r.data.results || r.data || [];
      if (children.length > 0) {
        setCorrigeOptionsAtLevel((prev) => {
          const updated = [...prev.slice(0, levelIndex + 1)];
          updated[levelIndex + 1] = children;
          return updated;
        });
      } else {
        setCorrigeOptionsAtLevel((prev) => prev.slice(0, levelIndex + 1));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const ajouterActifCorrige = () => {
    const selected = corrigeSelectionPath[corrigeSelectionPath.length - 1];
    if (!selected) return;
    if (actifsCorriges.find((a) => a.id === selected.id)) {
      setErreur("Cet actif est déjà dans la liste.");
      return;
    }
    setActifsCorriges((prev) => [...prev, selected]);
    setShowActifCorrigeSelector(false);
    setCorrigeSelectionPath([]);
    setCorrigeOptionsAtLevel([]);
    setErreur("");
  };

  const retirerActifCorrige = (id) => {
    setActifsCorriges((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmitRapport = async (e) => {
    e.preventDefault();
    setErreur("");
    setSucces("");

    if (!rapport.descriptionTravail.trim())
      return setErreur("Décrivez les travaux réalisés.");
    if (!rapport.solutionApportee.trim())
      return setErreur("Décrivez la solution apportée.");

    setSubmitting(true);
    try {
      // Enregistrer les actifs corrigés d'abord
      if (actifsCorriges.length > 0) {
        await enregistrerActifsCorriges(
          idOT,
          actifsCorriges.map((a) => ({ idActif: a.id, description: a.libelle })),
        );
      }

      const compteRendu =
        `📋 COMPTE RENDU INTERVENTION\n\n` +
        `📝 Travaux réalisés:\n${rapport.descriptionTravail}\n\n` +
        `🔍 Constatations:\n${rapport.constatations || "Voir description"}\n\n` +
        `🎯 Solution apportée:\n${rapport.solutionApportee}\n\n` +
        (actifsCorriges.length > 0
          ? `🔧 Actifs corrigés: ${actifsCorriges.map((a) => a.code).join(", ")}\n\n`
          : "") +
        `⚙️ Cause racine: ${CATEGORIES_CAUSE[rapport.causeRacine]?.label || "Non identifiée"}`;

      await ajouterCommentaire(idOT, compteRendu, true);

      if (rapport.estCloture) {
        if (rapport.typeCloture === "corrige") {
          await changerStatutOT(idOT, "CLOTURE", "", "corrige");
        } else {
          await changerStatutOT(idOT, "DEPANNE", "", "depanne");
        }
        setSucces(
          `✅ Rapport enregistré. OT en attente de validation opérateur.`,
        );
      } else {
        setSucces("✅ Rapport enregistré. OT reste en cours.");
      }

      setRapport({
        descriptionTravail: "",
        constatations: "",
        causeRacine: "",
        solutionApportee: "",
        estCloture: false,
        typeCloture: "depanne",
      });
      setActifsCorriges([]);

      setTimeout(() => navigate("/ordres/ots"), 1500);
    } catch (e) {
      setErreur(e.response?.data?.error || "Erreur lors de la sauvegarde.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

  if (loading)
    return (
      <div className="p-6 text-gray-400 text-center py-12">Chargement...</div>
    );
  if (!ot) return <div className="p-6 text-red-400">OT non trouvé</div>;

  const di = ot.demande_detail;
  const pieces = ot.pieces_utilisees_detail || [];
  const commentaires = ot.commentaires_detail || [];
  const historiques = ot.historiques_statut || [];

  // Pièces jointes DI
  const pjImages = di?.pieces_jointes?.filter((p) => p.typeFichier?.startsWith("image")) || [];
  const pjAudio = di?.pieces_jointes?.filter((p) => p.typeFichier?.startsWith("audio")) || [];
  const pjVideo = di?.pieces_jointes?.filter((p) => p.typeFichier?.startsWith("video")) || [];
  const pjOther = di?.pieces_jointes?.filter(
    (p) => !p.typeFichier?.startsWith("image") && !p.typeFichier?.startsWith("audio") && !p.typeFichier?.startsWith("video")
  ) || [];

  const SectionHeader = ({ title, icon: Icon, sectionKey, count }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between py-3 px-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl border border-gray-700/50 transition">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
        {Icon && <Icon size={14} className="text-purple-400" />}
        {title}
        {count !== undefined && count > 0 && (
          <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {expandedSections[sectionKey] ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
    </button>
  );

  return (
    <div className="p-6 text-white max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-purple-400 text-sm mb-3 hover:text-purple-300">
          ← Retour
        </button>
        <h1 className="text-2xl font-semibold">Compte rendu d'intervention</h1>
        <p className="text-gray-400 text-sm mt-1">
          Documentez l'intervention réalisée sur {ot.actif_detail?.code}
        </p>
      </div>

      {/* Infos OT */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Numéro OT</p>
            <p className="text-lg font-mono text-purple-300">{ot.numero}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Équipement</p>
            <p className="text-sm font-medium">{ot.actif_detail?.code}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Priorité</p>
            <p className={`text-sm font-semibold ${
              ot.priorite === "critique" ? "text-red-400" : ot.priorite === "haute" ? "text-orange-400" : "text-blue-400"
            }`}>{ot.priorite}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Statut</p>
            <p className="text-sm text-amber-400">{ot.statut}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {erreur && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg p-4 mb-4 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {erreur}
        </div>
      )}
      {succes && (
        <div className="bg-green-500/20 border border-green-500/40 text-green-400 rounded-lg p-4 mb-4 text-sm flex items-start gap-2">
          <CheckCircle size={16} className="mt-0.5 shrink-0" />
          {succes}
        </div>
      )}

      {/* ── Section: Équipement concerné (avec sélecteur) ── */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-2">
            <MapPin size={14} /> Équipement concerné
          </h3>
          <button
            onClick={() => setShowActifSelector((s) => !s)}
            className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 rounded-lg transition">
            <ArrowRightLeft size={12} />
            {showActifSelector ? "Annuler" : "Changer d'équipement"}
          </button>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
          <p className="text-sm font-medium text-white">{ot.actif_detail?.libelle}</p>
          <p className="text-xs text-gray-400 font-mono">{ot.actif_detail?.code}</p>
          {di?.actif_detail?.chemin_hierarchique?.length > 0 && (
            <p className="text-[11px] text-gray-500 mt-1">
              {di.actif_detail.chemin_hierarchique.map((h, i) => (
                <span key={h.id}>
                  <span className="text-gray-400">{h.code}</span>
                  {i < di.actif_detail.chemin_hierarchique.length - 1 && <span className="mx-1 text-gray-600">›</span>}
                </span>
              ))}
              <span className="mx-1 text-gray-600">›</span>
              <span className="text-blue-400">{di?.actif_detail?.code}</span>
            </p>
          )}
        </div>

        <AnimatePresence>
          {showActifSelector && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="mt-3 bg-gray-900/50 rounded-lg p-4 border border-gray-700/50 space-y-3">
                <p className="text-xs text-gray-400">Sélectionnez le nouvel équipement concerné par cette intervention :</p>
                {actifLoading ? (
                  <p className="text-sm text-gray-500">Chargement...</p>
                ) : (
                  <>
                    {optionsAtLevel.map((options, levelIndex) => (
                      <div key={levelIndex}>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
                          {levelIndex === 0 ? "Site / Zone" : `Niveau ${levelIndex + 1}`}
                        </label>
                        <select
                          value={selectionPath[levelIndex]?.id || ""}
                          onChange={(e) => handleSelectAtLevel(levelIndex, e.target.value)}
                          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500">
                          <option value="">Sélectionner...</option>
                          {options.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} — {a.libelle}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                    {selectionPath.length > 0 && (
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-gray-400">
                          Sélection : <span className="text-white font-medium">{selectionPath[selectionPath.length - 1]?.code}</span>
                        </p>
                        <button
                          onClick={handleChangerActif}
                          disabled={changingActif || selectionPath[selectionPath.length - 1]?.id === ot.actif_detail?.id}
                          className="text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg transition flex items-center gap-1">
                          <ArrowRightLeft size={12} />
                          {changingActif ? "..." : "Confirmer"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Section: Contexte de l'intervention ── */}
      <div className="mb-4 space-y-2">
        <SectionHeader title="Contexte de l'intervention" icon={AlertTriangle} sectionKey="contexte" />
        <AnimatePresence>
          {expandedSections.contexte && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4 space-y-3">
                {di?.titre && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Titre de la demande</p>
                    <p className="text-sm font-medium text-white">{di.titre}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Problème signalé</p>
                  <p className="text-sm text-gray-300 mt-1">{di?.description || "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
                  <div>
                    <span className="text-gray-500">Urgence : </span>
                    <span className={`font-medium ${
                      di?.urgence === "critique" ? "text-red-400" : di?.urgence === "haute" ? "text-orange-400" : "text-blue-400"
                    }`}>{di?.urgence}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Date : </span>
                    {formatDate(di?.dateSignalement)}
                  </div>
                  <div>
                    <span className="text-gray-500">Signalé par : </span>
                    {di?.signalement_detail ? `${di.signalement_detail.prenom} ${di.signalement_detail.nom}` : "—"}
                  </div>
                  <div>
                    <span className="text-gray-500">DI : </span>
                    <span className="font-mono text-purple-300">{di?.numero}</span>
                  </div>
                </div>

                {/* Pièces jointes DI */}
                {di?.nb_pieces_jointes > 0 && (
                  <div className="pt-2 border-t border-gray-700/30">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Image size={10} /> Pièces jointes de la demande ({di.nb_pieces_jointes})
                    </p>
                    <div className="space-y-2">
                      {pjImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {pjImages.map((img) => (
                            <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="relative group rounded-lg overflow-hidden border border-gray-600 bg-gray-800">
                              <img src={img.url} alt={img.nomFichier} className="w-full h-16 object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                            </a>
                          ))}
                        </div>
                      )}
                      {pjAudio.length > 0 && (
                        <div className="space-y-1">
                          {pjAudio.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 bg-gray-900/50 rounded-lg px-2 py-1.5 text-xs border border-gray-700/30">
                              <Music size={12} className="text-blue-400" />
                              <span className="text-gray-300 flex-1 truncate">{a.nomFichier}</span>
                              <audio src={a.url} controls className="h-6 w-32" />
                            </div>
                          ))}
                        </div>
                      )}
                      {pjVideo.length > 0 && (
                        <div className="space-y-1">
                          {pjVideo.map((v) => (
                            <div key={v.id} className="bg-gray-900/50 rounded-lg p-2 border border-gray-700/30">
                              <p className="text-[10px] text-gray-500 mb-1 flex items-center gap-1"><Film size={10} /> {v.nomFichier}</p>
                              <video src={v.url} controls className="w-full h-24 rounded" />
                            </div>
                          ))}
                        </div>
                      )}
                      {pjOther.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {pjOther.map((f) => (
                            <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-gray-900/50 rounded-lg px-2 py-1 text-xs border border-gray-700/30 text-gray-300 hover:text-white transition">
                              <FileText size={12} /> {f.nomFichier}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Section: Pièces utilisées ── */}
      {pieces.length > 0 && (
        <div className="mb-4 space-y-2">
          <SectionHeader title="Pièces utilisées" icon={Package} sectionKey="pieces" count={pieces.length} />
          <AnimatePresence>
            {expandedSections.pieces && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4 space-y-2">
                  {pieces.map((p, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-900/50 rounded-lg px-3 py-2 text-sm border border-gray-700/30">
                      <div>
                        <p className="text-gray-300">{p.piece_detail?.reference || p.piece_detail?.libelle || "Pièce"}</p>
                        {p.piece_detail?.description && <p className="text-[11px] text-gray-500">{p.piece_detail.description}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-gray-300 font-medium">× {p.quantite}</p>
                        {p.coutUnitaire && <p className="text-[11px] text-gray-500">{p.coutUnitaire} €/u</p>}
                      </div>
                    </div>
                  ))}
                  {ot.cout_total > 0 && (
                    <p className="text-right text-xs text-gray-400 pt-1">Coût total matériel : <span className="text-white font-medium">{ot.cout_total} €</span></p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Section: Commentaires ── */}
      {commentaires.length > 0 && (
        <div className="mb-4 space-y-2">
          <SectionHeader title="Commentaires" icon={MessageCircle} sectionKey="commentaires" count={commentaires.length} />
          <AnimatePresence>
            {expandedSections.commentaires && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4 space-y-2">
                  {commentaires.map((c, i) => (
                    <div key={i} className={`bg-gray-900/50 rounded-lg px-3 py-2 text-sm border ${c.estInterne ? "border-purple-500/20" : "border-gray-700/30"}`}>
                      <p className="text-gray-300 whitespace-pre-wrap">{c.commentaire}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(c.dateCreation)}</span>
                        {c.estInterne && <span className="text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded text-[10px]">Interne</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Section: Historique statut ── */}
      {historiques.length > 0 && (
        <div className="mb-4 space-y-2">
          <SectionHeader title="Historique des statuts" icon={History} sectionKey="historique" count={historiques.length} />
          <AnimatePresence>
            {expandedSections.historique && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4 space-y-2">
                  {historiques.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-gray-300">
                          <span className="text-gray-500">{h.ancienStatut || "—"}</span>
                          <span className="mx-1 text-gray-600">→</span>
                          <span className="text-white font-medium">{h.nouveauStatut}</span>
                        </p>
                        {h.motif && <p className="text-xs text-gray-500 mt-0.5">{h.motif}</p>}
                        <p className="text-[11px] text-gray-600 mt-0.5">{formatDate(h.dateChangement)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Section: Traçabilité ── */}
      <div className="mb-6 space-y-2">
        <SectionHeader title="Traçabilité" icon={User} sectionKey="tracabilite" />
        <AnimatePresence>
          {expandedSections.tracabilite && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {di?.signalement_detail && (
                    <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                      <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">DI créée par</p>
                      <p className="text-sm font-medium text-white">{di.signalement_detail.prenom} {di.signalement_detail.nom}</p>
                      <p className="text-xs text-gray-500">{formatDate(di.dateSignalement)}</p>
                    </div>
                  )}
                  {ot.createur_detail && (
                    <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                      <p className="text-[10px] text-purple-400 uppercase tracking-wider mb-1">OT créé par</p>
                      <p className="text-sm font-medium text-white">{ot.createur_detail.prenom} {ot.createur_detail.nom}</p>
                    </div>
                  )}
                  {ot.affectations?.length > 0 && (
                    <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                      <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">Intervenant(s)</p>
                      <p className="text-sm font-medium text-white">
                        {ot.affectations.map(a => a.equipe_detail?.libelle || a.soustraitant_detail?.raisonSociale).filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Formulaire de compte rendu ── */}
      <div className="border-t border-gray-700 pt-6 mb-4">
        <h2 className="text-lg font-semibold mb-1">Rédiger le compte rendu</h2>
        <p className="text-gray-400 text-sm mb-5">Décrivez l'intervention réalisée pour l'historique</p>
      </div>

      <form onSubmit={handleSubmitRapport} className="space-y-5">
        {/* Actifs corrigés */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle size={14} /> Actifs corrigés pendant l'intervention
            </h3>
            <button
              type="button"
              onClick={() => { setShowActifCorrigeSelector((s) => !s); if (!showActifCorrigeSelector) initCorrigeSelector(); }}
              className="text-xs flex items-center gap-1 text-teal-400 hover:text-teal-300 border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 rounded-lg transition">
              <Plus size={12} />
              {showActifCorrigeSelector ? "Annuler" : "Ajouter un actif"}
            </button>
          </div>

          {/* Liste des actifs corrigés */}
          {(ot?.actifs_corriges?.length > 0 || actifsCorriges.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {/* Actifs déjà enregistrés sur l'OT */}
              {ot?.actifs_corriges?.map((ac) => (
                <span key={ac.id} className="text-xs bg-teal-500/10 text-teal-300 px-2.5 py-1 rounded-full border border-teal-500/20 flex items-center gap-1.5">
                  <CheckCircle size={10} />
                  {ac.actif_detail?.code} — {ac.actif_detail?.libelle}
                </span>
              ))}
              {/* Actifs sélectionnés dans le formulaire */}
              {actifsCorriges.map((a) => (
                <span key={a.id} className="text-xs bg-teal-500/10 text-teal-300 px-2.5 py-1 rounded-full border border-teal-500/20 flex items-center gap-1.5">
                  <CheckCircle size={10} />
                  {a.code} — {a.libelle}
                  <button type="button" onClick={() => retirerActifCorrige(a.id)}
                    className="text-teal-400 hover:text-red-400 transition ml-1">
                    <Trash2 size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Sélecteur hiérarchique */}
          <AnimatePresence>
            {showActifCorrigeSelector && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden">
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50 space-y-3">
                  <p className="text-xs text-gray-400">Sélectionnez l'équipement qui a été réparé ou modifié :</p>
                  {corrigeLoading ? (
                    <p className="text-sm text-gray-500">Chargement...</p>
                  ) : (
                    <>
                      {corrigeOptionsAtLevel.map((options, levelIndex) => (
                        <div key={levelIndex}>
                          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
                            {levelIndex === 0 ? "Site / Zone" : `Niveau ${levelIndex + 1}`}
                          </label>
                          <select
                            value={corrigeSelectionPath[levelIndex]?.id || ""}
                            onChange={(e) => handleCorrigeSelectAtLevel(levelIndex, e.target.value)}
                            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-teal-500"
                          >
                            <option value="">Sélectionner...</option>
                            {options.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} — {a.libelle}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                      {corrigeSelectionPath.length > 0 && (
                        <div className="flex items-center justify-between pt-2">
                          <p className="text-xs text-gray-400">
                            Sélection : <span className="text-white font-medium">{corrigeSelectionPath[corrigeSelectionPath.length - 1]?.code}</span>
                          </p>
                          <button
                            type="button"
                            onClick={ajouterActifCorrige}
                            className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-1">
                            <Plus size={12} /> Ajouter
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Travaux réalisés */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Wrench size={14} /> Travaux réalisés
          </h3>
          <textarea
            value={rapport.descriptionTravail}
            onChange={(e) => setRapport((r) => ({ ...r, descriptionTravail: e.target.value }))}
            placeholder="Détaillez les actions effectuées, les pièces changées, les réglages..."
            rows={4}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500 resize-none"
          />
        </div>

        {/* Constatations */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle size={14} /> Constatations
          </h3>
          <textarea
            value={rapport.constatations}
            onChange={(e) => setRapport((r) => ({ ...r, constatations: e.target.value }))}
            placeholder="État de l'équipement avant/après, observations importantes..."
            rows={3}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {/* Cause racine */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-3">
            ⚙️ Cause racine identifiée
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(CATEGORIES_CAUSE).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => setRapport((r) => ({ ...r, causeRacine: k }))}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${
                  rapport.causeRacine === k
                    ? v.color + " border-opacity-100"
                    : "bg-gray-700 border-gray-600 text-gray-400 hover:text-gray-200"
                }`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Solution apportée */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle size={14} /> Solution apportée
          </h3>
          <textarea
            value={rapport.solutionApportee}
            onChange={(e) => setRapport((r) => ({ ...r, solutionApportee: e.target.value }))}
            placeholder="Résumé de la solution définitive. L'équipement est-il revenu à la normale ?"
            rows={3}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-green-500 resize-none"
          />
        </div>

        {/* État final */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            🏁 État final de l'équipement
          </h3>
          <div className="space-y-3">
            <label
              className="flex items-start gap-3 p-3 rounded-lg border border-green-600/30 bg-green-600/10 cursor-pointer hover:bg-green-600/20 transition"
              onClick={() => setRapport((r) => ({ ...r, estCloture: true, typeCloture: "corrige" }))}>
              <input type="radio" name="etatFinal" checked={rapport.estCloture && rapport.typeCloture === "corrige"} onChange={() => {}} className="mt-1 accent-green-500" />
              <div>
                <p className="text-sm font-medium text-green-300"><CheckCircle className="inline mr-1" size={16} /> Réparation définitive</p>
                <p className="text-xs text-green-400 mt-0.5">L'équipement fonctionne normalement — prêt pour la clôture</p>
              </div>
            </label>
            <label
              className="flex items-start gap-3 p-3 rounded-lg border border-orange-600/30 bg-orange-600/10 cursor-pointer hover:bg-orange-600/20 transition"
              onClick={() => setRapport((r) => ({ ...r, estCloture: true, typeCloture: "depanne" }))}>
              <input type="radio" name="etatFinal" checked={rapport.estCloture && rapport.typeCloture === "depanne"} onChange={() => {}} className="mt-1 accent-orange-500" />
              <div>
                <p className="text-sm font-medium text-orange-300"><AlertTriangle className="inline mr-1" size={16} /> Dépannage temporaire</p>
                <p className="text-xs text-orange-400 mt-0.5">Solution temporaire — l'équipement fonctionne partiellement, intervention ultérieure nécessaire</p>
              </div>
            </label>
            <label
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-600/30 bg-gray-700/30 cursor-pointer hover:bg-gray-700/50 transition"
              onClick={() => setRapport((r) => ({ ...r, estCloture: false, typeCloture: "depanne" }))}>
              <input type="radio" name="etatFinal" checked={!rapport.estCloture} onChange={() => {}} className="mt-1 accent-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-300">Ne pas clôturer — rester en cours</p>
                <p className="text-xs text-gray-500 mt-0.5">L'intervention n'est pas terminée, enregistrer uniquement le rapport</p>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-semibold transition">
            Annuler
          </button>
          <button type="submit" disabled={submitting} className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
            <Send size={16} /> {submitting ? "Envoi..." : "Envoyer le rapport"}
          </button>
        </div>
      </form>
    </div>
  );
}
