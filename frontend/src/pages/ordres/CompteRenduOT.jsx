import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, convertOffsetToTimes } from "framer-motion";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const CATEGORIES_CAUSE = {
  mecanique: {
    label: "Mécanique",
    color: "bg-purple-500/30 dark:bg-primary-soft text-primary border-primary",
  },
  electrique: {
    label: "Électrique",
    color: "bg-orange-300/30 dark:bg-warning/20 text-warning border-warning",
  },
  humain: {
    label: "Erreur humaine",
    color:
      "bg-green-500/30 dark:bg-status-orange/20 text-status-green border-status-green",
  },
  externe: {
    label: "Facteur externe",
    color: "bg-red-500/30 dark:bg-danger-soft text-danger border-danger",
  },
  autre: {
    label: "Autre",
    color:
      "bg-slate-200 dark:bg-slate-500/20 text-text-muted border-border-subtle",
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
  const [showActifCorrigeSelector, setShowActifCorrigeSelector] =
    useState(false);
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
      const racines = await getActifs({
        estActif: true,
        is_parent: true,
        my_unite: true,
      });
      options[0] = racines.data.results || racines.data || [];
      for (let i = 0; i < chemin.length; i++) {
        const childrenR = await getActifs({
          estActif: true,
          idParent: chemin[i].id,
          my_unite: true,
        });
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
    const selectedAsset = optionsAtLevel[levelIndex].find(
      (a) => a.id === assetId,
    );
    if (!selectedAsset) return;
    const newPath = selectionPath.slice(0, levelIndex);
    newPath[levelIndex] = selectedAsset;
    setSelectionPath(newPath);
    // Fetch children
    try {
      const r = await getActifs({
        estActif: true,
        idParent: selectedAsset.id,
        my_unite: true,
      });
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
      setErreur(
        e.response?.data?.error || "Erreur lors du changement d'équipement.",
      );
    } finally {
      setChangingActif(false);
    }
  };

  //  Gestion actifs corrigés
  const initCorrigeSelector = async () => {
    setCorrigeLoading(true);
    try {
      const racines = await getActifs({
        estActif: true,
        is_parent: true,
        idUnite: ot?.actif_detail?.idUnite || undefined,
      });
      setCorrigeOptionsAtLevel([racines.data.results || racines.data || []]);
      setCorrigeSelectionPath([]);
    } catch (e) {
      console.error(e);
    } finally {
      setCorrigeLoading(false);
    }
  };

  const handleCorrigeSelectAtLevel = async (levelIndex, assetId) => {
    const selectedAsset = corrigeOptionsAtLevel[levelIndex].find(
      (a) => a.id === assetId,
    );
    if (!selectedAsset) return;
    const newPath = corrigeSelectionPath.slice(0, levelIndex);
    newPath[levelIndex] = selectedAsset;
    setCorrigeSelectionPath(newPath);
    try {
      const r = await getActifs({
        estActif: true,
        idParent: selectedAsset.id,
        idUnite: ot?.actif_detail?.idUnite || undefined,
      });
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
          actifsCorriges.map((a) => ({
            idActif: a.id,
            description: a.libelle,
          })),
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
    d
      ? new Date(d).toLocaleString("fr-FR", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "—";

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
  const pjImages =
    di?.pieces_jointes?.filter((p) => p.typeFichier?.startsWith("image")) || [];
  const pjAudio =
    di?.pieces_jointes?.filter((p) => p.typeFichier?.startsWith("audio")) || [];
  const pjVideo =
    di?.pieces_jointes?.filter((p) => p.typeFichier?.startsWith("video")) || [];
  const pjOther =
    di?.pieces_jointes?.filter(
      (p) =>
        !p.typeFichier?.startsWith("image") &&
        !p.typeFichier?.startsWith("audio") &&
        !p.typeFichier?.startsWith("video"),
    ) || [];

  const SectionHeader = ({ title, icon: Icon, sectionKey, count }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between py-3 px-4 bg-surface hover:bg-hover rounded-xl border border-border transition">
      <div className="flex items-center gap-2 text-sm font-semibold text-text">
        {Icon && <Icon size={14} className="text-text-muted" />}
        {title}
        {count !== undefined && count > 0 && (
          <span className="text-xs bg-elevated text-text-muted border border-border-subtle px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {expandedSections[sectionKey] ? (
        <ChevronUp size={16} className="text-text-muted" />
      ) : (
        <ChevronDown size={16} className="text-text-muted" />
      )}
    </button>
  );

  return (
    <div className="page">
      {/* ===== Header ===== */}
      <div className="hdr">
        <div className="hdr-l">
          <button
            onClick={() => navigate(-1)}
            className="text-text-muted hover:text-text text-sm transition block mb-1">
            ← Retour
          </button>
          <h1>Compte rendu d'intervention</h1>
          <p>
            Documentez l'ordre de travail réalisé sur {ot.actif_detail?.code}
          </p>
        </div>
      </div>

      {/* Messages */}
      {erreur && (
        <div className="bg-danger-soft border border-danger/30 rounded-xl p-4 text-sm flex items-start gap-3">
          <AlertTriangle size={18} className="text-danger mt-0.5 shrink-0" />
          <span className="text-danger font-medium">{erreur}</span>
        </div>
      )}
      {succes && (
        <div className="bg-success-soft border border-success/30 rounded-xl p-4 text-sm flex items-start gap-3">
          <CheckCircle size={18} className="text-success mt-0.5 shrink-0" />
          <span className="text-success font-medium">{succes}</span>
        </div>
      )}

      {/* Infos OT */}
      <div className="bg-surface rounded-xl border border-border shadow-card p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">
              Numéro OT
            </p>
            <p className="text-lg font-mono text-text font-semibold">
              {ot.numero}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">
              Équipement
            </p>
            <p className="text-sm font-medium text-text">
              {ot.actif_detail?.code}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">
              Priorité
            </p>
            <p
              className={`text-sm font-semibold ${
                ot.priorite === "critique"
                  ? "text-danger"
                  : ot.priorite === "haute"
                    ? "text-status-orange"
                    : "text-primary"
              }`}>
              {ot.priorite}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">
              Statut
            </p>
            <p className="text-sm font-medium text-text">{ot.statut}</p>
          </div>
        </div>
      </div>

      {/* Équipement concerné */}
      <div className="bg-surface rounded-xl border border-border shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs text-text-muted uppercase tracking-wider font-semibold flex items-center gap-2">
            <MapPin size={14} /> Équipement concerné
          </h3>
          <span className="text-xs text-text-muted border border-border-subtle bg-elevated px-3 py-1.5 rounded-lg opacity-60 flex items-center gap-1">
            <ArrowRightLeft size={12} /> Équipement verrouillé
          </span>
        </div>
        <div className="bg-elevated rounded-lg p-3 border border-border-subtle">
          <p className="text-sm font-semibold text-text">
            {ot.actif_detail?.libelle}
          </p>
          <p className="text-xs text-text-muted font-mono mt-0.5">
            {ot.actif_detail?.code}
          </p>
          {di?.actif_detail?.chemin_hierarchique?.length > 0 && (
            <p className="text-[11px] text-text-muted mt-1.5">
              {di.actif_detail.chemin_hierarchique.map((h, i) => (
                <span key={h.id}>
                  <span>{h.libelle}</span>
                  {i < di.actif_detail.chemin_hierarchique.length - 1 && (
                    <span className="mx-1 text-text-muted">›</span>
                  )}
                </span>
              ))}
              <span className="mx-1 text-text-muted">›</span>
              <span className="text-primary font-medium">
                {di?.actif_detail?.libelle}
              </span>
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
              <div className="mt-3 bg-elevated rounded-lg p-4 border border-border-subtle space-y-3">
                <p className="text-xs text-text-muted">
                  Sélectionnez le nouvel équipement concerné par cette
                  intervention :
                </p>
                {actifLoading ? (
                  <p className="text-sm text-text-muted">Chargement...</p>
                ) : (
                  <>
                    {optionsAtLevel.map((options, levelIndex) => (
                      <div key={levelIndex}>
                        <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">
                          {levelIndex === 0
                            ? "Site / Zone"
                            : `Niveau ${levelIndex + 1}`}
                        </label>
                        <Select
                          value={selectionPath[levelIndex]?.id || ""}
                          onValueChange={(value) =>
                            handleSelectAtLevel(levelIndex, value)
                          }>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent>
                            {options.map((a) => (
                              <SelectItem key={a.id} value={String(a.id)}>
                                {a.code} — {a.libelle}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    {selectionPath.length > 0 && (
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-text-muted">
                          Sélection :{" "}
                          <span className="text-text font-medium">
                            {selectionPath[selectionPath.length - 1]?.code}
                          </span>
                        </p>
                        <button
                          onClick={handleChangerActif}
                          disabled={
                            changingActif ||
                            selectionPath[selectionPath.length - 1]?.id ===
                              ot.actif_detail?.id
                          }
                          className="btn btn-primary text-xs">
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

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche */}
        <div className="lg:col-span-1 space-y-4">
          {/* Contexte */}
          <div className="space-y-2">
            <SectionHeader
              title="Contexte de l'ordre de travail"
              icon={AlertTriangle}
              sectionKey="contexte"
            />
            <AnimatePresence>
              {expandedSections.contexte && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden">
                  <div className="bg-surface rounded-xl border border-border-subtle p-4 space-y-3">
                    {di?.titre && (
                      <div>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">
                          Titre de la demande
                        </p>
                        <p className="text-sm font-medium text-text">
                          {di.titre}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">
                        Problème signalé
                      </p>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {di?.description || "—"}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-text-muted">Urgence : </span>
                        <span
                          className={`font-semibold ${di?.urgence === "critique" ? "text-danger" : di?.urgence === "haute" ? "text-status-orange" : "text-primary"}`}>
                          {di?.urgence || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted">Date : </span>
                        <span className="text-text">
                          {formatDate(di?.dateSignalement)}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted">Signalé par : </span>
                        <span className="text-text">
                          {di?.signalement_detail
                            ? `${di.signalement_detail.prenom} ${di.signalement_detail.nom}`
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted">DI : </span>
                        <span className="font-mono text-primary">
                          {di?.numero}
                        </span>
                      </div>
                    </div>
                    {/* Pièces jointes DI */}
                    {di?.nb_pieces_jointes > 0 && (
                      <div className="pt-3 border-t border-border-subtle">
                        <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
                          <Image size={10} /> Pièces jointes (
                          {di.nb_pieces_jointes})
                        </p>
                        <div className="space-y-2">
                          {pjImages.length > 0 && (
                            <div className="grid grid-cols-4 gap-2">
                              {pjImages.map((img) => (
                                <a
                                  key={img.id}
                                  href={img.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative rounded-lg overflow-hidden border border-border-subtle bg-elevated">
                                  <img
                                    src={img.url}
                                    alt={img.nomFichier}
                                    className="w-full h-16 object-cover"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                    }}
                                  />
                                </a>
                              ))}
                            </div>
                          )}
                          {pjAudio.length > 0 && (
                            <div className="space-y-1">
                              {pjAudio.map((a) => (
                                <div
                                  key={a.id}
                                  className="flex items-center gap-2 bg-elevated rounded-lg px-2 py-1.5 text-xs border border-border-subtle">
                                  <Music size={12} className="text-primary" />
                                  <span className="text-text-secondary flex-1 truncate">
                                    {a.nomFichier}
                                  </span>
                                  <audio
                                    src={a.url}
                                    controls
                                    className="h-6 w-32"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {pjVideo.length > 0 && (
                            <div className="space-y-1">
                              {pjVideo.map((v) => (
                                <div
                                  key={v.id}
                                  className="bg-elevated rounded-lg p-2 border border-border-subtle">
                                  <p className="text-[10px] text-text-muted mb-1 flex items-center gap-1">
                                    <Film size={10} /> {v.nomFichier}
                                  </p>
                                  <video
                                    src={v.url}
                                    controls
                                    className="w-full h-24 rounded"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {pjOther.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {pjOther.map((f) => (
                                <a
                                  key={f.id}
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 bg-elevated rounded-lg px-2 py-1 text-xs border border-border-subtle text-text-secondary hover:text-text transition">
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

          {/* Pièces utilisées */}
          {pieces.length > 0 && (
            <div className="space-y-2">
              <SectionHeader
                title="Pièces utilisées"
                icon={Package}
                sectionKey="pieces"
                count={pieces.length}
              />
              <AnimatePresence>
                {expandedSections.pieces && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="bg-surface rounded-xl border border-border-subtle p-4 space-y-2">
                      {pieces.map((p, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center bg-elevated rounded-lg px-3 py-2.5 text-sm border border-border-subtle">
                          <div>
                            <p className="text-text font-medium">
                              {p.piece_detail?.reference ||
                                p.piece_detail?.libelle ||
                                "Pièce"}
                            </p>
                            {p.piece_detail?.description && (
                              <p className="text-[11px] text-text-muted">
                                {p.piece_detail.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-text font-semibold">
                              × {p.quantite}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Commentaires */}
          {commentaires.length > 0 && (
            <div className="space-y-2">
              <SectionHeader
                title="Commentaires"
                icon={MessageCircle}
                sectionKey="commentaires"
                count={commentaires.length}
              />
              <AnimatePresence>
                {expandedSections.commentaires && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="bg-surface rounded-xl border border-border-subtle p-4 space-y-2">
                      {commentaires.map((c, i) => (
                        <div
                          key={i}
                          className={`bg-elevated rounded-lg px-3 py-2.5 text-sm border ${c.estInterne ? "border-warning/20" : "border-border-subtle"}`}>
                          <p className="text-text-secondary whitespace-pre-wrap">
                            {c.commentaire?.replace(
                              /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
                              "",
                            )}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-text-muted">
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {formatDate(c.dateCreation)}
                            </span>
                            {c.estInterne && (
                              <span className="text-warning bg-warning-soft px-1.5 py-0.5 rounded text-[10px] font-medium">
                                Interne
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Historique */}
          {historiques.length > 0 && (
            <div className="space-y-2">
              <SectionHeader
                title="Historique des statuts"
                icon={History}
                sectionKey="historique"
                count={historiques.length}
              />
              <AnimatePresence>
                {expandedSections.historique && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="bg-surface rounded-xl border border-border-subtle p-4 space-y-3">
                      {historiques.map((h, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-text-secondary">
                              <span className="text-text-muted">
                                {h.ancienStatut || "—"}
                              </span>
                              <span className="mx-1 text-text-muted">→</span>
                              <span className="text-text font-semibold">
                                {h.nouveauStatut}
                              </span>
                            </p>
                            {h.motif && (
                              <p className="text-xs text-text-muted mt-0.5">
                                {h.motif}
                              </p>
                            )}
                            <p className="text-[11px] text-text-muted mt-0.5">
                              {formatDate(h.dateChangement)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Traçabilité */}
          <div className="space-y-2">
            <SectionHeader
              title="Traçabilité"
              icon={User}
              sectionKey="tracabilite"
            />
            <AnimatePresence>
              {expandedSections.tracabilite && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden">
                  <div className="bg-surface rounded-xl border border-border-subtle p-4">
                    <div className="grid grid-cols-1 gap-2">
                      {di?.signalement_detail && (
                        <div className="bg-elevated rounded-lg p-3 border border-border-subtle">
                          <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">
                            DI créée par
                          </p>
                          <p className="text-sm font-medium text-text">
                            {di.signalement_detail.prenom}{" "}
                            {di.signalement_detail.nom}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {formatDate(di.dateSignalement)}
                          </p>
                        </div>
                      )}
                      {ot.createur_detail && (
                        <div className="bg-elevated rounded-lg p-3 border border-border-subtle">
                          <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">
                            OT créé par
                          </p>
                          <p className="text-sm font-medium text-text">
                            {ot.createur_detail.prenom} {ot.createur_detail.nom}
                          </p>
                        </div>
                      )}
                      {ot.affectations?.length > 0 && (
                        <div className="bg-elevated rounded-lg p-3 border border-border-subtle">
                          <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1">
                            Intervenant(s)
                          </p>
                          <p className="text-sm font-medium text-text">
                            {ot.affectations
                              .map(
                                (a) =>
                                  a.equipe_detail?.libelle ||
                                  a.soustraitant_detail?.raisonSociale,
                              )
                              .filter(Boolean)
                              .join(", ")}
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

        {/* Colonne droite : Formulaire */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text">
              Rédiger le compte rendu
            </h2>
            <p className="text-text-muted text-sm mt-1">
              Décrivez l'ordre de travail réalisé pour l'historique
            </p>
          </div>

          <form onSubmit={handleSubmitRapport} className="space-y-4">
            {/* Actifs corrigés */}
            <div className="bg-surface rounded-xl border border-border shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-text-muted uppercase tracking-wider font-semibold flex items-center gap-2">
                  <CheckCircle size={14} /> Actifs corrigés
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowActifCorrigeSelector((s) => !s);
                    if (!showActifCorrigeSelector) initCorrigeSelector();
                  }}
                  className="btn btn-outline"
                  style={{ fontSize: "12px", padding: "5px 10px" }}>
                  <Plus size={12} />{" "}
                  {showActifCorrigeSelector ? "Annuler" : "Ajouter un actif"}
                </button>
              </div>
              {(ot?.actifs_corriges?.length > 0 ||
                actifsCorriges.length > 0) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {ot?.actifs_corriges?.map((ac) => (
                    <span
                      key={ac.id}
                      className="text-xs bg-elevated text-text px-2.5 py-1 rounded-full border border-border-subtle flex items-center gap-1.5">
                      <CheckCircle size={10} className="text-success" />
                      {ac.actif_detail?.code} — {ac.actif_detail?.libelle}
                    </span>
                  ))}
                  {actifsCorriges.map((a) => (
                    <span
                      key={a.id}
                      className="text-xs bg-elevated text-text px-2.5 py-1 rounded-full border border-border-subtle flex items-center gap-1.5">
                      <CheckCircle size={10} className="text-success" />
                      {a.code} — {a.libelle}
                      <button
                        type="button"
                        onClick={() => retirerActifCorrige(a.id)}
                        className="text-text-muted hover:text-danger transition ml-1">
                        <Trash2 size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <AnimatePresence>
                {showActifCorrigeSelector && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="bg-elevated rounded-lg p-4 border border-border-subtle space-y-3">
                      <p className="text-xs text-text-muted">
                        Sélectionnez l'équipement qui a été réparé ou modifié :
                      </p>
                      {corrigeLoading ? (
                        <p className="text-sm text-text-muted">Chargement...</p>
                      ) : (
                        <>
                          {corrigeOptionsAtLevel.map((options, levelIndex) => (
                            <div key={levelIndex}>
                              <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">
                                {levelIndex === 0
                                  ? "Site / Zone"
                                  : `Niveau ${levelIndex + 1}`}
                              </label>
                              <Select
                                value={
                                  corrigeSelectionPath[levelIndex]?.id || ""
                                }
                                onValueChange={(value) =>
                                  handleCorrigeSelectAtLevel(levelIndex, value)
                                }>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Sélectionner..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {options.map((a) => (
                                    <SelectItem key={a.id} value={String(a.id)}>
                                      {a.code} — {a.libelle}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                          {corrigeSelectionPath.length > 0 && (
                            <div className="flex items-center justify-between pt-2">
                              <p className="text-xs text-text-muted">
                                Sélection :{" "}
                                <span className="text-text font-medium">
                                  {
                                    corrigeSelectionPath[
                                      corrigeSelectionPath.length - 1
                                    ]?.code
                                  }
                                </span>
                              </p>
                              <Button
                                type="button"
                                onClick={ajouterActifCorrige}
                                className="btn btn-success text-xs">
                                <Plus size={12} /> Ajouter
                              </Button>
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
            <div className="bg-surface rounded-xl border border-border shadow-card p-5">
              <h3 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                <Wrench size={14} /> Travaux réalisés
              </h3>
              <textarea
                value={rapport.descriptionTravail}
                onChange={(e) =>
                  setRapport((r) => ({
                    ...r,
                    descriptionTravail: e.target.value,
                  }))
                }
                placeholder="Détaillez les actions effectuées, les pièces changées, les réglages..."
                rows={4}
                className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Constatations */}
            <div className="bg-surface rounded-xl border border-border shadow-card p-5">
              <h3 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle size={14} /> Constatations
              </h3>
              <textarea
                value={rapport.constatations}
                onChange={(e) =>
                  setRapport((r) => ({ ...r, constatations: e.target.value }))
                }
                placeholder="État de l'équipement avant/après, observations importantes..."
                rows={3}
                className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Cause racine */}
            <div className="bg-surface rounded-xl border border-border shadow-card p-5">
              <h3 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3">
                Cause racine identifiée
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {Object.entries(CATEGORIES_CAUSE).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() =>
                      setRapport((r) => ({ ...r, causeRacine: k }))
                    }
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${
                      rapport.causeRacine === k
                        ? v.color + " border-opacity-100"
                        : "bg-elevated border-border-subtle text-text-muted hover:text-text"
                    }`}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Solution apportée */}
            <div className="bg-surface rounded-xl border border-border shadow-card p-5">
              <h3 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                <CheckCircle size={14} /> Solution apportée
              </h3>
              <textarea
                value={rapport.solutionApportee}
                onChange={(e) =>
                  setRapport((r) => ({
                    ...r,
                    solutionApportee: e.target.value,
                  }))
                }
                placeholder="Résumé de la solution définitive. L'équipement est-il revenu à la normale ?"
                rows={3}
                className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-success resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 btn btn-ghost justify-center py-3">
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 btn btn-primary justify-center py-3">
                <Send size={16} />{" "}
                {submitting ? "Envoi..." : "Envoyer le rapport"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
