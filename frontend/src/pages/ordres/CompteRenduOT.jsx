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
    color: "bg-primary-soft text-primary border-primary/30",
  },
  electrique: {
    label: "Électrique",
    color: "bg-warning/20 text-warning border-warning/30",
  },
  humain: {
    label: "Erreur humaine",
    color: "bg-status-orange/20 text-status-orange border-status-orange/30",
  },
  externe: {
    label: "Facteur externe",
    color: "bg-danger-soft text-danger border-danger/30",
  },
  autre: {
    label: "Autre",
    color: "bg-hover text-text-muted border-border/30",
  },
};

export default function CompteRenduOT() {
  const { id: idOT } = useParams();
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

  //  Sélecteur hiérarchique d'actif 
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
      const racines = await getActifs({ estActif: true, is_parent: true, my_unite: true });
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
      setSucces("Équipement modifié avec succès.");
      await charger();
      setShowActifSelector(false);
    } catch (e) {
      setErreur(e.response?.data?.error || "Erreur lors du changement d'équipement.");
    } finally {
      setChangingActif(false);
    }
  };

  //  Gestion actifs corrigés 
  const initCorrigeSelector = async () => {
    setCorrigeLoading(true);
    try {
      const racines = await getActifs({ estActif: true, is_parent: true, idUnite: ot?.actif_detail?.idUnite || undefined });
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
      const r = await getActifs({ estActif: true, idParent: selectedAsset.id, idUnite: ot?.actif_detail?.idUnite || undefined });
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
        `COMPTE RENDU INTERVENTION\n\n` +
        `Travaux réalisés:\n${rapport.descriptionTravail}\n\n` +
        `Constatations:\n${rapport.constatations || "Voir description"}\n\n` +
        `Solution apportée:\n${rapport.solutionApportee}\n\n` +
        (actifsCorriges.length > 0
          ? `Actifs corrigés: ${actifsCorriges.map((a) => a.code).join(", ")}\n\n`
          : "") +
        `Cause racine: ${CATEGORIES_CAUSE[rapport.causeRacine]?.label || "Non identifiée"}`;

      await ajouterCommentaire(idOT, compteRendu, true);

      setSucces("Rapport enregistré.");

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
      <div className="p-6 text-text-muted text-center py-12">Chargement...</div>
    );
  if (!ot) return <div className="p-6 text-danger">OT non trouvé</div>;

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
      className="w-full flex items-center justify-between py-3 px-4 bg-surface/50 hover:bg-surface rounded-xl border border-border/50 transition">
      <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
        {Icon && <Icon size={14} className="text-primary" />}
        {title}
        {count !== undefined && count > 0 && (
          <span className="text-xs bg-hover text-text-muted px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {expandedSections[sectionKey] ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
    </button>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-primary text-sm mb-3 hover:text-primary">
          ← Retour
        </button>
        <h1 className="text-2xl font-semibold">Compte rendu d'ordre de travail</h1>
        <p className="text-text-muted text-sm mt-1">
          Documentez l'ordre de travail réalisé sur {ot.actif_detail?.code}
        </p>
      </div>

      {/* Infos OT */}
      <div className="bg-surface rounded-xl border border-border p-5 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-text-muted uppercase">Numéro OT</p>
            <p className="text-lg font-mono text-primary">{ot.numero}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase">Équipement</p>
            <p className="text-sm font-medium">{ot.actif_detail?.code}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase">Priorité</p>
            <p className={`text-sm font-semibold ${
              ot.priorite === "critique" ? "text-danger" : ot.priorite === "haute" ? "text-status-orange" : "text-primary"
            }`}>{ot.priorite}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase">Statut</p>
            <p className="text-sm text-warning">{ot.statut}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {erreur && (
        <div className="bg-danger-soft border border-danger/40 text-danger rounded-lg p-4 mb-4 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {erreur}
        </div>
      )}
      {succes && (
        <div className="bg-success-soft border border-success/40 text-success rounded-lg p-4 mb-4 text-sm flex items-start gap-2">
          <CheckCircle size={16} className="mt-0.5 shrink-0" />
          {succes}
        </div>
      )}

      {/*  Section: Équipement concerné (avec sélecteur)  */}
      <div className="bg-surface rounded-xl border border-border p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
            <MapPin size={14} /> Équipement concerné
          </h3>
          <button
            className="text-xs flex items-center gap-1 text-text-muted border border-border bg-surface px-3 py-1.5 rounded-lg transition cursor-not-allowed opacity-50">
            <ArrowRightLeft size={12} />
            Équipement verrouillé
          </button>
        </div>

        <div className="bg-elevated/50 rounded-lg p-3 border border-border/50">
          <p className="text-sm font-medium text-text">{ot.actif_detail?.libelle}</p>
          <p className="text-xs text-text-muted font-mono">{ot.actif_detail?.code}</p>
          {di?.actif_detail?.chemin_hierarchique?.length > 0 && (
            <p className="text-[11px] text-text-muted mt-1">
              {di.actif_detail.chemin_hierarchique.map((h, i) => (
                <span key={h.id}>
                  <span className="text-text-muted">{h.libelle}</span>
                  {i < di.actif_detail.chemin_hierarchique.length - 1 && <span className="mx-1 text-text-muted">›</span>}
                </span>
              ))}
              <span className="mx-1 text-text-muted">›</span>
              <span className="text-primary">{di?.actif_detail?.libelle}</span>
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
              <div className="mt-3 bg-elevated/50 rounded-lg p-4 border border-border/50 space-y-3">
                <p className="text-xs text-text-muted">Sélectionnez le nouvel équipement concerné par cette intervention :</p>
                {actifLoading ? (
                  <p className="text-sm text-text-muted">Chargement...</p>
                ) : (
                  <>
                    {optionsAtLevel.map((options, levelIndex) => (
                      <div key={levelIndex}>
                        <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">
                          {levelIndex === 0 ? "Site / Zone" : `Niveau ${levelIndex + 1}`}
                        </label>
                        <select
                          value={selectionPath[levelIndex]?.id || ""}
                          onChange={(e) => handleSelectAtLevel(levelIndex, e.target.value)}
                          className="w-full bg-hover text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-primary">
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
                        <p className="text-xs text-text-muted">
                          Sélection : <span className="text-text font-medium">{selectionPath[selectionPath.length - 1]?.code}</span>
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

      {/*  Layout 2 colonnes  */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Contexte & infos DI */}
        <div className="lg:col-span-1 space-y-4">
          {/*  Section: Contexte de l'ordre de travail  */}
          <div className="space-y-2">
        <SectionHeader title="Contexte de l'ordre de travail" icon={AlertTriangle} sectionKey="contexte" />
        <AnimatePresence>
          {expandedSections.contexte && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="bg-surface/50 rounded-xl border border-border/50 p-4 space-y-3">
                {di?.titre && (
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Titre de la demande</p>
                    <p className="text-sm font-medium text-text">{di.titre}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">Problème signalé</p>
                  <p className="text-sm text-text-secondary mt-1">{di?.description || "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-text-muted">
                  <div>
                    <span className="text-text-muted">Urgence : </span>
                    <span className={`font-medium ${
                      di?.urgence === "critique" ? "text-danger" : di?.urgence === "haute" ? "text-status-orange" : "text-primary"
                    }`}>{di?.urgence}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Date : </span>
                    {formatDate(di?.dateSignalement)}
                  </div>
                  <div>
                    <span className="text-text-muted">Signalé par : </span>
                    {di?.signalement_detail ? `${di.signalement_detail.prenom} ${di.signalement_detail.nom}` : "—"}
                  </div>
                  <div>
                    <span className="text-text-muted">DI : </span>
                    <span className="font-mono text-primary">{di?.numero}</span>
                  </div>
                </div>

                {/* Pièces jointes DI */}
                {di?.nb_pieces_jointes > 0 && (
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Image size={10} /> Pièces jointes de la demande ({di.nb_pieces_jointes})
                    </p>
                    <div className="space-y-2">
                      {pjImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {pjImages.map((img) => (
                            <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="relative group rounded-lg overflow-hidden border border-border bg-surface">
                              <img src={img.url} alt={img.nomFichier} className="w-full h-16 object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                            </a>
                          ))}
                        </div>
                      )}
                      {pjAudio.length > 0 && (
                        <div className="space-y-1">
                          {pjAudio.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 bg-elevated/50 rounded-lg px-2 py-1.5 text-xs border border-border/30">
                              <Music size={12} className="text-primary" />
                              <span className="text-text-secondary flex-1 truncate">{a.nomFichier}</span>
                              <audio src={a.url} controls className="h-6 w-32" />
                            </div>
                          ))}
                        </div>
                      )}
                      {pjVideo.length > 0 && (
                        <div className="space-y-1">
                          {pjVideo.map((v) => (
                            <div key={v.id} className="bg-elevated/50 rounded-lg p-2 border border-border/30">
                              <p className="text-[10px] text-text-muted mb-1 flex items-center gap-1"><Film size={10} /> {v.nomFichier}</p>
                              <video src={v.url} controls className="w-full h-24 rounded" />
                            </div>
                          ))}
                        </div>
                      )}
                      {pjOther.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {pjOther.map((f) => (
                            <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-elevated/50 rounded-lg px-2 py-1 text-xs border border-border/30 text-text-secondary hover:text-text transition">
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

      {/*  Section: Pièces utilisées  */}
      {pieces.length > 0 && (
        <div className="mb-4 space-y-2">
          <SectionHeader title="Pièces utilisées" icon={Package} sectionKey="pieces" count={pieces.length} />
          <AnimatePresence>
            {expandedSections.pieces && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-surface/50 rounded-xl border border-border/50 p-4 space-y-2">
                  {pieces.map((p, i) => (
                    <div key={i} className="flex justify-between items-center bg-elevated/50 rounded-lg px-3 py-2 text-sm border border-border/30">
                      <div>
                        <p className="text-text-secondary">{p.piece_detail?.reference || p.piece_detail?.libelle || "Pièce"}</p>
                        {p.piece_detail?.description && <p className="text-[11px] text-text-muted">{p.piece_detail.description}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-text-secondary font-medium">× {p.quantite}</p>
                        {p.coutUnitaire && <p className="text-[11px] text-text-muted">{p.coutUnitaire} €/u</p>}
                      </div>
                    </div>
                  ))}
                  {ot.cout_total > 0 && (
                    <p className="text-right text-xs text-text-muted pt-1">Coût total matériel : <span className="text-text font-medium">{ot.cout_total} €</span></p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/*  Section: Commentaires  */}
      {commentaires.length > 0 && (
        <div className="mb-4 space-y-2">
          <SectionHeader title="Commentaires" icon={MessageCircle} sectionKey="commentaires" count={commentaires.length} />
          <AnimatePresence>
            {expandedSections.commentaires && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-surface/50 rounded-xl border border-border/50 p-4 space-y-2">
                  {commentaires.map((c, i) => (
                    <div key={i} className={`bg-elevated/50 rounded-lg px-3 py-2 text-sm border ${c.estInterne ? "border-primary/20" : "border-border/30"}`}>
                      <p className="text-text-secondary whitespace-pre-wrap">{c.commentaire?.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-text-muted">
                        <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(c.dateCreation)}</span>
                        {c.estInterne && <span className="text-primary bg-primary-soft px-1.5 py-0.5 rounded text-[10px]">Interne</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/*  Section: Historique statut  */}
      {historiques.length > 0 && (
        <div className="mb-4 space-y-2">
          <SectionHeader title="Historique des statuts" icon={History} sectionKey="historique" count={historiques.length} />
          <AnimatePresence>
            {expandedSections.historique && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-surface/50 rounded-xl border border-border/50 p-4 space-y-2">
                  {historiques.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-text-secondary">
                          <span className="text-text-muted">{h.ancienStatut || "—"}</span>
                          <span className="mx-1 text-text-muted">→</span>
                          <span className="text-text font-medium">{h.nouveauStatut}</span>
                        </p>
                        {h.motif && <p className="text-xs text-text-muted mt-0.5">{h.motif}</p>}
                        <p className="text-[11px] text-text-muted mt-0.5">{formatDate(h.dateChangement)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/*  Section: Traçabilité  */}
      <div className="mb-6 space-y-2">
        <SectionHeader title="Traçabilité" icon={User} sectionKey="tracabilite" />
        <AnimatePresence>
          {expandedSections.tracabilite && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="bg-surface/50 rounded-xl border border-border/50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {di?.signalement_detail && (
                    <div className="bg-primary-soft rounded-lg p-3 border border-primary/20">
                      <p className="text-[10px] text-primary uppercase tracking-wider mb-1">DI créée par</p>
                      <p className="text-sm font-medium text-text">{di.signalement_detail.prenom} {di.signalement_detail.nom}</p>
                      <p className="text-xs text-text-muted">{formatDate(di.dateSignalement)}</p>
                    </div>
                  )}
                  {ot.createur_detail && (
                    <div className="bg-primary-soft rounded-lg p-3 border border-primary/20">
                      <p className="text-[10px] text-primary uppercase tracking-wider mb-1">OT créé par</p>
                      <p className="text-sm font-medium text-text">{ot.createur_detail.prenom} {ot.createur_detail.nom}</p>
                    </div>
                  )}
                  {ot.affectations?.length > 0 && (
                    <div className="bg-warning/10 rounded-lg p-3 border border-warning/20">
                      <p className="text-[10px] text-warning uppercase tracking-wider mb-1">Intervenant(s)</p>
                      <p className="text-sm font-medium text-text">
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

        </div>

        {/* Colonne droite : Formulaire de compte rendu */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Rédiger le compte rendu</h2>
            <p className="text-text-muted text-sm mb-5">Décrivez l'ordre de travail réalisé pour l'historique</p>
          </div>

          <form onSubmit={handleSubmitRapport} className="space-y-5">
        {/* Actifs corrigés */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-status-cyan uppercase tracking-wider flex items-center gap-2">
              <CheckCircle size={14} /> Actifs corrigés pendant l'ordre de travail
            </h3>
            <button
              type="button"
              onClick={() => { setShowActifCorrigeSelector((s) => !s); if (!showActifCorrigeSelector) initCorrigeSelector(); }}
              className="text-xs flex items-center gap-1 text-status-cyan hover:text-status-cyan border border-status-cyan/30 bg-status-cyan/10 px-3 py-1.5 rounded-lg transition">
              <Plus size={12} />
              {showActifCorrigeSelector ? "Annuler" : "Ajouter un actif"}
            </button>
          </div>

          {/* Liste des actifs corrigés */}
          {(ot?.actifs_corriges?.length > 0 || actifsCorriges.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {/* Actifs déjà enregistrés sur l'OT */}
              {ot?.actifs_corriges?.map((ac) => (
                <span key={ac.id} className="text-xs bg-status-cyan/10 text-status-cyan px-2.5 py-1 rounded-full border border-status-cyan/20 flex items-center gap-1.5">
                  <CheckCircle size={10} />
                  {ac.actif_detail?.code} — {ac.actif_detail?.libelle}
                </span>
              ))}
              {/* Actifs sélectionnés dans le formulaire */}
              {actifsCorriges.map((a) => (
                <span key={a.id} className="text-xs bg-status-cyan/10 text-status-cyan px-2.5 py-1 rounded-full border border-status-cyan/20 flex items-center gap-1.5">
                  <CheckCircle size={10} />
                  {a.code} — {a.libelle}
                  <button type="button" onClick={() => retirerActifCorrige(a.id)}
                    className="text-status-cyan hover:text-danger transition ml-1">
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
                <div className="bg-elevated/50 rounded-lg p-4 border border-border/50 space-y-3">
                  <p className="text-xs text-text-muted">Sélectionnez l'équipement qui a été réparé ou modifié :</p>
                  {corrigeLoading ? (
                    <p className="text-sm text-text-muted">Chargement...</p>
                  ) : (
                    <>
                      {corrigeOptionsAtLevel.map((options, levelIndex) => (
                        <div key={levelIndex}>
                          <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">
                            {levelIndex === 0 ? "Site / Zone" : `Niveau ${levelIndex + 1}`}
                          </label>
                          <select
                            value={corrigeSelectionPath[levelIndex]?.id || ""}
                            onChange={(e) => handleCorrigeSelectAtLevel(levelIndex, e.target.value)}
                            className="w-full bg-hover text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-status-cyan"
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
                          <p className="text-xs text-text-muted">
                            Sélection : <span className="text-text font-medium">{corrigeSelectionPath[corrigeSelectionPath.length - 1]?.code}</span>
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
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Wrench size={14} /> Travaux réalisés
          </h3>
          <textarea
            value={rapport.descriptionTravail}
            onChange={(e) => setRapport((r) => ({ ...r, descriptionTravail: e.target.value }))}
            placeholder="Détaillez les actions effectuées, les pièces changées, les réglages..."
            rows={4}
            className="w-full bg-hover text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Constatations */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle size={14} /> Constatations
          </h3>
          <textarea
            value={rapport.constatations}
            onChange={(e) => setRapport((r) => ({ ...r, constatations: e.target.value }))}
            placeholder="État de l'équipement avant/après, observations importantes..."
            rows={3}
            className="w-full bg-hover text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Cause racine */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-warning uppercase tracking-wider mb-3">
            Cause racine identifiée
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
                    : "bg-hover border-border text-text-muted hover:text-text"
                }`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Solution apportée */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-success uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle size={14} /> Solution apportée
          </h3>
          <textarea
            value={rapport.solutionApportee}
            onChange={(e) => setRapport((r) => ({ ...r, solutionApportee: e.target.value }))}
            placeholder="Résumé de la solution définitive. L'équipement est-il revenu à la normale ?"
            rows={3}
            className="w-full bg-hover text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-success resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="flex-1 py-3 bg-hover hover:bg-active rounded-xl text-sm font-semibold transition">
            Annuler
          </button>
          <button type="submit" disabled={submitting} className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
            <Send size={16} /> {submitting ? "Envoi..." : "Envoyer le rapport"}
          </button>
        </div>
      </form>
        </div>
      </div>
    </div>
  );
}
