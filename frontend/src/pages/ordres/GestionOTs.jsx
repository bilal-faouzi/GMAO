import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Play,
  MessageCircle,
  User,
  Users,
  Wrench,
  ChevronDown,
  ChevronUp,
  Image,
  Music,
  Video,
  FileText,
  Plus,
  Trash2,
  Check,
  CheckCircle,
  AlertTriangle,
  MapPin,
  ArrowRightLeft,
} from "lucide-react";
import {
  getOTs,
  getDemandes,
  validerDemande,
  rejeterDemande,
  changerStatutOT,
  affecterEquipe,
  getMembresEquipe,
  ajouterCommentaire,
  cloturerOT,
  enregistrerActifsCorriges,
  deleteAffectation,
} from "../../services/ordreService";
import { getActifs } from "../../services/actifService";
import {
  AudioPlayer,
  ImageViewer,
  VideoViewer,
  HierarchyPath,
} from "../../components/di/MediaViewers";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

//  Constants
const PRIORITE_CLS = {
  critique: "bg-danger-soft text-danger border-danger/40",
  haute: "bg-status-orange-soft text-status-orange border-status-orange/40",
  normale: "bg-primary-soft text-primary border-primary/40",
  basse: "bg-hover text-text-secondary border-border/40",
};
const STATUT_CLS = {
  EN_COURS: "bg-warning-soft text-warning border-warning/30",
  DEPANNE: "bg-status-orange-soft text-status-orange border-status-orange/30",
  CLOTURE: "bg-success-soft text-success border-success/30",
};
const STATUT_BORDER = {
  EN_COURS: "border-l-warning",
  DEPANNE: "border-l-status-orange",
  CLOTURE: "border-l-success",
};
const STATUT_LABEL = {
  EN_COURS: "En cours",
  DEPANNE: "Dépanné",
  CLOTURE: "Clôturé",
};
const TRANSITIONS = {
  EN_COURS: ["DEPANNE", "CLOTURE"],
};

//  Composant Affectation enrichi
function AffectationForm({ otId, onSuccess, prefillData, onCancelPrefill }) {
  const [equipes, setEquipes] = useState([]);
  const [soustraitants, setST] = useState([]);
  const [soustraitantSelectionne, setSoustraitantSelectionne] = useState("");
  const [type, setType] = useState("interne");
  const [dateDebut, setDateDebut] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  // Sélections: [{ equipeId, equipeLibelle, membres: [userId, ...], membresDetails: [{id, nom, prenom}, ...] }]
  const [selections, setSelections] = useState([]);
  const [equipeCourante, setEquipeCourante] = useState("");
  const [membresEquipe, setMembresEquipe] = useState([]);
  const [membresSelectionnes, setMembresSelectionnes] = useState([]);
  const [loadingMembres, setLoadingMembres] = useState(false);

  useEffect(() => {
    import("../../services/api").then(({ default: api }) => {
      api
        .get("/v1/organisation/equipes/")
        .then((r) =>
          setEquipes(
            Array.isArray(r.data?.results)
              ? r.data.results
              : Array.isArray(r.data)
                ? r.data
                : [],
          ),
        );
      api
        .get("/v1/soustraitants/?statut=actif")
        .then((r) =>
          setST(
            Array.isArray(r.data?.results)
              ? r.data.results
              : Array.isArray(r.data)
                ? r.data
                : [],
          ),
        );
    });
  }, []);

  // Pré-remplissage en mode édition
  useEffect(() => {
    if (!prefillData) return;
    setType("interne");
    setDateDebut(
      prefillData.dateDebut
        ? new Date(prefillData.dateDebut).toISOString().slice(0, 16)
        : "",
    );
    if (prefillData.equipeId) {
      setEquipeCourante(String(prefillData.equipeId));
      // Charger membres et pré-sélectionner
      (async () => {
        setLoadingMembres(true);
        try {
          const res = await getMembresEquipe(prefillData.equipeId);
          const data = res.data.results || res.data || [];
          setMembresEquipe(data);
          const ids = (prefillData.membres || []).map((m) =>
            String(m.utilisateur?.id || m.idUtilisateur || m.id),
          );
          setMembresSelectionnes(ids);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingMembres(false);
        }
      })();
    }
    setSelections([]);
    setErreur("");
    setSucces("");
  }, [prefillData]);

  const chargerMembres = async (equipeId) => {
    if (!equipeId) return;
    setLoadingMembres(true);
    try {
      const res = await getMembresEquipe(equipeId);
      const data = res.data.results || res.data || [];
      setMembresEquipe(data);
      setMembresSelectionnes([]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMembres(false);
    }
  };

  const toggleMembre = (userId) => {
    setMembresSelectionnes((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const ajouterSelection = () => {
    if (!equipeCourante) return setErreur("Sélectionnez une équipe.");
    if (membresSelectionnes.length === 0)
      return setErreur("Cochez au moins un technicien.");

    const eq = equipes.find((e) => String(e.id) === String(equipeCourante));
    const membresDetails = membresEquipe
      .filter((m) =>
        membresSelectionnes.includes(String(m.utilisateur?.id || m.id)),
      )
      .map((m) => ({
        id: m.utilisateur?.id || m.id,
        nom:
          m.utilisateur?.nom ||
          m.utilisateur_nom?.split(" ").slice(-1)[0] ||
          "",
        prenom: m.utilisateur?.prenom || m.utilisateur_nom?.split(" ")[0] || "",
      }));

    // Vérifier si cette équipe est déjà dans les sélections
    const existant = selections.find(
      (s) => String(s.equipeId) === String(equipeCourante),
    );
    if (existant) {
      // Fusionner les membres
      const nouveauxIds = [
        ...new Set([...existant.membres, ...membresSelectionnes]),
      ];
      const nouveauxDetails = [...existant.membresDetails];
      membresDetails.forEach((md) => {
        if (!nouveauxDetails.find((d) => String(d.id) === String(md.id))) {
          nouveauxDetails.push(md);
        }
      });
      setSelections((prev) =>
        prev.map((s) =>
          String(s.equipeId) === String(equipeCourante)
            ? { ...s, membres: nouveauxIds, membresDetails: nouveauxDetails }
            : s,
        ),
      );
    } else {
      setSelections((prev) => [
        ...prev,
        {
          equipeId: equipeCourante,
          equipeLibelle: eq?.libelle || "Équipe",
          membres: [...membresSelectionnes],
          membresDetails,
        },
      ]);
    }

    setEquipeCourante("");
    setMembresEquipe([]);
    setMembresSelectionnes([]);
    setErreur("");
  };

  const retirerSelection = (equipeId) => {
    setSelections((prev) =>
      prev.filter((s) => String(s.equipeId) !== String(equipeId)),
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setSucces("");

    if (type === "externe") {
      if (!soustraitantSelectionne)
        return setErreur("Sélectionnez un sous-traitant.");
      setLoading(true);
      try {
        await affecterEquipe(otId, {
          idSousTraitant: soustraitantSelectionne,
          dateDebut: dateDebut || new Date().toISOString(),
        });
        setSucces(" Sous-traitant affecté");
        setSoustraitantSelectionne("");
        setDateDebut("");
        onSuccess();
      } catch (e) {
        setErreur(e.response?.data?.error || "Erreur lors de l'affectation.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (selections.length === 0)
      return setErreur("Ajoutez au moins une équipe avec des techniciens.");

    setLoading(true);
    try {
      // Si édition, supprimer l'ancienne affectation d'abord
      if (prefillData?.id) {
        await deleteAffectation(prefillData.id);
      }
      for (const sel of selections) {
        await affecterEquipe(otId, {
          idEquipe: sel.equipeId,
          dateDebut: dateDebut || new Date().toISOString(),
          membres: sel.membres,
        });
      }
      setSucces(` ${selections.length} affectation(s) enregistrée(s)`);
      setSelections([]);
      setDateDebut("");
      if (prefillData && onCancelPrefill) onCancelPrefill();
      onSuccess();
    } catch (e) {
      setErreur(e.response?.data?.error || "Erreur lors de l'affectation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {erreur && (
        <div className="text-danger text-xs bg-danger-soft p-3 rounded-lg border border-danger/30 flex items-start gap-2">
          <X size={14} className="mt-0.5 shrink-0" /> {erreur}
        </div>
      )}
      {succes && (
        <div className="text-success text-xs bg-success-soft p-3 rounded-lg border border-success/30 flex items-start gap-2">
          <Check size={14} className="mt-0.5 shrink-0" /> {succes}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => {
            setType("interne");
            setErreur("");
          }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
            type === "interne" ? "btn btn-primary" : "btn btn-ghost"
          }`}>
          Équipe interne
        </Button>
        <Button
          type="button"
          onClick={() => {
            setType("externe");
            setErreur("");
          }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
            type === "externe" ? "btn btn-warning" : "btn btn-ghost"
          }`}>
          Sous-traitant
        </Button>
      </div>

      {type === "interne" && (
        <>
          {/*  Sélection d'équipe et membres  */}
          <div className="bg-surface rounded-xl border border-border shadow-card p-5 space-y-3">
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
              Sélectionner une équipe et ses techniciens
            </p>

            <Select
              value={equipeCourante}
              onValueChange={(v) => {
                setEquipeCourante(v);
                chargerMembres(v);
              }}>
              <SelectTrigger>
                <SelectValue placeholder="— Choisir une équipe —" />
              </SelectTrigger>
              <SelectContent>
                {equipes.map((eq) => (
                  <SelectItem key={eq.id} value={String(eq.id)}>
                    {eq.libelle} ({eq.membres_count || 0} membres)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {loadingMembres && (
              <p className="text-xs text-text-muted">
                Chargement des membres...
              </p>
            )}

            {membresEquipe.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                  Techniciens disponibles
                </p>
                {membresEquipe.map((m) => {
                  const uid = String(m.utilisateur?.id || m.id);
                  const nom =
                    m.utilisateur_nom ||
                    `${m.utilisateur?.prenom || ""} ${m.utilisateur?.nom || ""}`.trim() ||
                    "Technicien";
                  const role = m.niveauRole || "Membre";
                  const checked = membresSelectionnes.includes(uid);
                  return (
                    <label
                      key={uid}
                      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition border ${
                        checked
                          ? "bg-primary-soft border-primary/30"
                          : "bg-elevated border-border-subtle hover:bg-hover"
                      }`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMembre(uid)}
                        className="accent-primary w-4 h-4 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-medium truncate ${checked ? "text-primary" : "text-text"}`}>
                          {nom}
                        </p>
                        <p className="text-[10px] text-text-muted">{role}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {membresSelectionnes.length > 0 && (
              <button
                type="button"
                onClick={ajouterSelection}
                className="w-full py-2 btn btn-primary rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5">
                <Plus size={14} /> Ajouter {membresSelectionnes.length}{" "}
                technicien(s) à l'affectation
              </button>
            )}
          </div>

          {/*  Récapitulatif des sélections  */}
          {selections.length > 0 && (
            <div className="bg-surface rounded-xl border border-border shadow-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-muted uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Users size={12} /> Affectations préparées (
                  {selections.length})
                </p>
                <button
                  type="button"
                  onClick={() => setSelections([])}
                  className="text-[10px] text-text-muted hover:text-danger transition">
                  Tout effacer
                </button>
              </div>

              <div className="space-y-2">
                {selections.map((sel) => (
                  <div
                    key={sel.equipeId}
                    className="bg-elevated rounded-lg p-3 border border-border-subtle">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-text">
                        {sel.equipeLibelle}
                      </p>
                      <button
                        type="button"
                        onClick={() => retirerSelection(sel.equipeId)}
                        className="text-text-muted hover:text-danger transition p-0.5">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sel.membresDetails.map((m) => (
                        <span
                          key={m.id}
                          className="text-[10px] bg-primary-soft text-primary px-2 py-0.5 rounded-full border border-primary/20">
                          {m.prenom} {m.nom}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {type === "externe" && (
        <Select
          value={soustraitantSelectionne}
          onValueChange={setSoustraitantSelectionne}>
          <SelectTrigger>
            <SelectValue placeholder="— Sélectionner un sous-traitant —" />
          </SelectTrigger>
          <SelectContent>
            {soustraitants.map((st) => (
              <SelectItem key={st.id} value={String(st.id)}>
                {st.raisonSociale}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div>
        <Label className="block text-xs text-text-muted mb-1">
          Date début (optionnel)
        </Label>
        <Input
          type="datetime-local"
          value={dateDebut}
          onChange={(e) => setDateDebut(e.target.value)}
          className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-xs border border-border-subtle outline-none"
        />
      </div>

      <div className="flex gap-2">
        {prefillData && (
          <Button
            type="button"
            onClick={onCancelPrefill}
            className="flex-1 py-2.5 btn btn-ghost rounded-lg text-sm font-medium transition">
            Annuler
          </Button>
        )}
        <Button
          type="submit"
          disabled={
            loading ||
            (type === "interne" && selections.length === 0 && !prefillData)
          }
          className={`py-2.5 btn btn-primary rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 ${prefillData ? "flex-1" : "w-full"}`}>
          {loading ? (
            <>
              <span className="animate-spin"></span> Enregistrement...
            </>
          ) : prefillData ? (
            <>
              <Users size={16} /> Modifier l'affectation
            </>
          ) : (
            <>
              <Users size={16} /> Confirmer l'affectation
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

//  Composant principal
export default function GestionOTs() {
  const navigate = useNavigate();
  const [ots, setOTs] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onglet, setOnglet] = useState("ots");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtrePriorite, setFiltrePriorite] = useState("");
  const [otSelectionne, setOtSelectionne] = useState(null);
  const [panneauOnglet, setPanneauOnglet] = useState("actions");
  const [modalStatut, setModalStatut] = useState(false);
  const [nvStatut, setNvStatut] = useState("");
  const [motifStatut, setMotifStatut] = useState("");
  const [modalRejet, setModalRejet] = useState(null);
  const [motifRejet, setMotifRejet] = useState("");
  const [modalComment, setModalComment] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [estInterne, setEstInterne] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  //  Compte rendu enrichi
  const [rapport, setRapport] = useState({
    descriptionTravail: "",
    constatations: "",
    causeRacine: "",
    solutionApportee: "",
    estCloture: false,
    typeCloture: "depanne",
  });
  const [actifsCorriges, setActifsCorriges] = useState([]);
  const [showActifCorrigeSelector, setShowActifCorrigeSelector] =
    useState(false);
  const [corrigeSelectionPath, setCorrigeSelectionPath] = useState([]);
  const [corrigeOptionsAtLevel, setCorrigeOptionsAtLevel] = useState([]);
  const [corrigeLoading, setCorrigeLoading] = useState(false);

  const [modalAffectationAuto, setModalAffectationAuto] = useState(false);
  const [otAffectationAuto, setOtAffectationAuto] = useState(null);
  const [editAffectation, setEditAffectation] = useState(null);
  const [demandeDetail, setDemandeDetail] = useState(null);
  const [expandedDemandeId, setExpandedDemandeId] = useState(null);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);

  const charger = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtreStatut) params.statut = filtreStatut;
      if (filtrePriorite) params.priorite = filtrePriorite;
      const [o, d] = await Promise.all([
        getOTs(params),
        getDemandes({ statut__in: "en_attente,rejetee_apres_validation" }),
      ]);
      const otsData = o.data.results || o.data;
      const demandesData = d.data.results || d.data;
      demandesData.forEach((dm) => {});
      setOTs(otsData);
      setDemandes(demandesData);
      if (otSelectionne) {
        const updated = otsData.find((x) => x.id === otSelectionne.id);
        if (updated) setOtSelectionne(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, [filtreStatut, filtrePriorite]);

  const handleChangerStatut = async () => {
    setSubmitting(true);
    try {
      await changerStatutOT(otSelectionne.id, nvStatut, motifStatut);
      setModalStatut(false);
      setNvStatut("");
      setMotifStatut("");
      charger();
    } finally {
      setSubmitting(false);
    }
  };

  const handleValider = async (id) => {
    try {
      await validerDemande(id);
      const params = {};
      if (filtreStatut) params.statut = filtreStatut;
      if (filtrePriorite) params.priorite = filtrePriorite;
      const [oRes, dRes] = await Promise.all([
        getOTs(params),
        getDemandes({ statut__in: "en_attente,rejetee_apres_validation" }),
      ]);

      const allOTs = oRes.data.results || oRes.data;
      const allDemandes = dRes.data.results || dRes.data;

      setOTs(allOTs);
      setDemandes(allDemandes);
      setOnglet("ots");

      const demandeObj = demandes.find((d) => d.id === id);
      if (demandeObj) {
        const newOT = allOTs.find(
          (ot) =>
            ot.idDemandeIntervention?.toString() === id?.toString() ||
            ot.idDemandeIntervention === demandeObj.id,
        );
        if (newOT) {
          setTimeout(() => {
            setOtSelectionne(newOT);
            setOtAffectationAuto(newOT);
            setModalAffectationAuto(true);
            setPanneauOnglet("actions");
          }, 200);
        }
      }
    } catch (e) {
      console.error("Erreur validation:", e);
    }
  };

  const handleRejeter = async () => {
    await rejeterDemande(modalRejet, motifRejet);
    setModalRejet(null);
    setMotifRejet("");
    charger();
  };

  const viewDemandeDetail = (demande) => {
    console.log(" Viewing demande detail:", demande);
    console.log(" pieces_jointes:", demande.pieces_jointes);
    console.log(" signalement_detail:", demande.signalement_detail);
    console.log(" validation_detail:", demande.validation_detail);
    if (demande.pieces_jointes && demande.pieces_jointes.length > 0) {
      console.log(
        " Audio files found:",
        demande.pieces_jointes.filter((p) =>
          p.typeFichier?.startsWith("audio"),
        ),
      );
    } else {
      console.warn(" No pieces_jointes found in demande!");
    }
    setDemandeDetail(demande);
  };

  const playAudio = (audioUrl, audioId) => {
    console.log(" Playing audio:", { audioUrl, audioId });

    if (currentPlayingAudio) {
      currentPlayingAudio.pause();
      currentPlayingAudio.currentTime = 0;
    }

    const fullUrl = audioUrl.startsWith("http")
      ? audioUrl
      : `${window.location.origin}${audioUrl}`;
    console.log(" Full audio URL:", fullUrl);

    const audio = new Audio(fullUrl);
    setCurrentPlayingAudio(audio);
    setPlayingAudioId(audioId);

    audio.addEventListener("ended", () => {
      setPlayingAudioId(null);
    });
    audio.addEventListener("error", (e) => {
      console.error(" Audio error:", e, "URL was:", fullUrl);
      console.error(
        "Audio error code:",
        audio.error?.code,
        audio.error?.message,
      );
    });

    audio.play().catch((err) => {
      console.error(" Erreur lecture:", err);
      console.error("Audio element error:", audio.error);
      setPlayingAudioId(null);
    });
  };

  const handleCommentaire = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await ajouterCommentaire(otSelectionne.id, newComment, estInterne);
      setModalComment(false);
      setNewComment("");
      setEstInterne(false);
      charger();
    } finally {
      setSubmitting(false);
    }
  };

  //  Compte rendu complet (depuis GestionOTs)
  const handleCompteRendu = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // 1. Enregistrer les actifs corrigés
      if (actifsCorriges.length > 0) {
        await enregistrerActifsCorriges(
          otSelectionne.id,
          actifsCorriges.map((a) => ({
            idActif: a.id,
            description: a.libelle,
          })),
        );
      }

      // 2. Construire et envoyer le commentaire / compte rendu
      const compteRendu =
        ` COMPTE RENDU INTERVENTION\n\n` +
        ` Travaux réalisés:\n${rapport.descriptionTravail}\n\n` +
        ` Constatations:\n${rapport.constatations || "N/A"}\n\n` +
        ` Solution apportée:\n${rapport.solutionApportee}\n\n` +
        (actifsCorriges.length > 0
          ? ` Actifs corrigés: ${actifsCorriges.map((a) => a.code).join(", ")}\n\n`
          : "") +
        ` Cause racine: ${CATEGORIES_CAUSE[rapport.causeRacine]?.label || "Non identifiée"}`;

      await ajouterCommentaire(otSelectionne.id, compteRendu, true);

      // 3. Changer statut si clôture demandée
      if (rapport.estCloture) {
        if (rapport.typeCloture === "corrige") {
          await changerStatutOT(otSelectionne.id, "CLOTURE", "", "corrige");
        } else {
          await changerStatutOT(otSelectionne.id, "DEPANNE", "", "depanne");
        }
      }

      // Reset
      setRapport({
        descriptionTravail: "",
        constatations: "",
        causeRacine: "",
        solutionApportee: "",
        estCloture: false,
        typeCloture: "depanne",
      });
      setActifsCorriges([]);
      setShowActifCorrigeSelector(false);
      setCorrigeSelectionPath([]);
      setCorrigeOptionsAtLevel([]);
      setModalComment(false);
      charger();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  //  Gestion actifs corrigés
  const initCorrigeSelector = async () => {
    setCorrigeLoading(true);
    try {
      const racines = await getActifs({
        estActif: true,
        idParent: "null",
        my_unite: true,
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
        my_unite: true,
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
    if (actifsCorriges.find((a) => a.id === selected.id)) return;
    setActifsCorriges((prev) => [...prev, selected]);
    setShowActifCorrigeSelector(false);
    setCorrigeSelectionPath([]);
    setCorrigeOptionsAtLevel([]);
  };

  const retirerActifCorrige = (id) => {
    setActifsCorriges((prev) => prev.filter((a) => a.id !== id));
  };

  const CATEGORIES_CAUSE = {
    mecanique: {
      label: "Mécanique",
      color: "bg-primary-soft text-primary border-primary/30",
    },
    electrique: {
      label: "Électrique",
      color: "bg-warning-soft text-warning border-warning/30",
    },
    humain: {
      label: "Erreur humaine",
      color: "bg-status-orange-soft text-status-orange border-status-orange/30",
    },
    externe: {
      label: "Facteur externe",
      color: "bg-danger-soft text-danger border-danger/30",
    },
    autre: {
      label: "Autre",
      color: "bg-hover text-text-secondary border-border-subtle",
    },
  };

  const otsTries = [...ots].sort((a, b) => {
    const ord = { critique: 0, haute: 1, normale: 2, basse: 3 };
    return (ord[a.priorite] || 2) - (ord[b.priorite] || 2);
  });

  return (
    <div className="page">
      {/*  Liste principale  */}
      <div
        className={`flex flex-col ${otSelectionne ? "w-1/2" : "w-full"} transition-all duration-300 min-h-0 border-r border-border`}>
        <div className="p-6 pb-0 flex-shrink-0">
          <div className="hdr">
            <div className="hdr-l">
              <h1 className="text-2xl font-bold text-text">
                Gestion des Interventions
              </h1>
              <p className="text-text-muted text-sm mt-1">
                Responsable Techniciens
              </p>
            </div>
          </div>

          {/*  Tabs  */}
          <div className="flex gap-1 mb-4 bg-surface p-1 rounded-md">
            <button
              onClick={() => setOnglet("ots")}
              className={`flex-1 px-4 py-2 rounded-md text-xs font-medium transition flex items-center justify-center gap-2 pop-shadow ${
                onglet === "ots"
                  ? "bg-elevated text-text shadow"
                  : "text-text-secondary hover:text-text"
              }`}>
              Ordres de travail
              {ots.length > 0 && (
                <span
                  className={`h-5 min-w-5 px-1 rounded-full text-xs flex items-center justify-center font-bold ${
                    onglet === "ots"
                      ? "bg-primary text-text"
                      : "bg-active text-text"
                  }`}>
                  {ots.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setOnglet("demandes")}
              variant="outline"
              className={`flex-1 px-4 py-2 rounded-md text-xs font-medium transition flex items-center justify-center gap-2 ${
                onglet === "demandes"
                  ? "bg-elevated text-text shadow"
                  : "text-text-secondary hover:text-text"
              }`}>
              Demandes en attente
              {demandes.length > 0 && (
                <span className="h-5 min-w-5 px-1 bg-danger text-text text-xs rounded-full flex items-center justify-center font-bold">
                  {demandes.length}
                </span>
              )}
            </button>
          </div>

          {onglet === "ots" && (
            <div className="flex gap-2 mb-4 ">
              {/* Filtre Statut */}
              <Select value={filtreStatut} onValueChange={setFiltreStatut}>
                <SelectTrigger className="bg-surface text-text text-xs  focus:border-border-strong">
                  <SelectValue placeholder="Tous statuts" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  {Object.entries(STATUT_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtre Priorité */}
              <Select value={filtrePriorite} onValueChange={setFiltrePriorite}>
                <SelectTrigger className="bg-surface text-text text-xs  focus:border-border-strong">
                  <SelectValue placeholder="Toutes priorités" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">Toutes priorités</SelectItem>
                  <SelectItem value="critique">Critique</SelectItem>
                  <SelectItem value="haute">Haute</SelectItem>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="basse">Basse</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={charger}
                className="bg-surface hover:bg-active px-3 py-2 rounded-md text-sm transition font-medium">
                ↺
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 ">
          {loading ? (
            <div className="space-y-3 mt-4 ">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 bg-surface rounded-xl animate-pulse border border-border-subtle"
                />
              ))}
            </div>
          ) : onglet === "ots" ? (
            <div className="space-y-2 mt-2 ">
              {otsTries.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  <p className="text-3xl mb-2"></p>
                  <p>Aucun OT trouvé</p>
                </div>
              ) : (
                otsTries.map((ot) => (
                  <motion.div
                    key={ot.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      setOtSelectionne(ot);
                      setPanneauOnglet("actions");
                    }}
                    className={`p-4 rounded-xl border-l-4 border border-border cursor-pointer transition-all ${STATUT_BORDER[ot.statut]} ${
                      otSelectionne?.id === ot.id
                        ? "bg-primary-soft ring-1 ring-primary/30 border-r-primary/30 border-t-primary/30 border-b-primary/30"
                        : "bg-surface hover:bg-hover hover:border-border-subtle pop-shadow"
                    }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-primary font-semibold">
                          {ot.numero}
                        </span>
                        {ot.est_en_retard && (
                          <span
                            title="Cette intervention a dépassé l'échéance SLA"
                            className="text-xs bg-danger-soft text-danger px-1.5 py-0.5 rounded-full border border-danger/30 cursor-help">
                            Retard
                          </span>
                        )}
                        {ot.estBloquant && (
                          <span
                            title="Cette intervention bloque la production"
                            className="text-xs bg-danger/30 text-danger px-1.5 py-0.5 rounded-full border border-danger/30 cursor-help">
                            Bloquant
                          </span>
                        )}
                        {ot.estSousTraite && (
                          <span
                            title="Intervention sous-traitée"
                            className="text-xs bg-warning-soft text-warning px-1.5 py-0.5 rounded-full border border-warning/30 cursor-help">
                            ST
                          </span>
                        )}
                        {ot.rejetOperateur && (
                          <span
                            title="Rejeté par l'opérateur"
                            className="text-xs bg-danger/30 text-danger px-1.5 py-0.5 rounded-full border border-danger/40 cursor-help animate-pulse">
                            Rejet opérateur
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${PRIORITE_CLS[ot.priorite]}`}>
                          {ot.priorite}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${STATUT_CLS[ot.statut]}`}>
                          {STATUT_LABEL[ot.statut]}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-text mb-1">
                      {ot.actif_detail?.code} — {ot.actif_detail?.libelle}
                    </p>
                    {ot.description && (
                      <p className="text-xs text-text-secondary line-clamp-1">
                        {ot.description}
                      </p>
                    )}

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-border-subtle">
                      <div className="flex gap-3 text-xs text-text-muted">
                        <span className="relative flex items-center">
                          <MessageCircle size={15} />
                          <span className="ml-1">
                            {ot.nb_commentaires || 0}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Wrench size={15} />
                          <span>{ot.nb_pieces_utilisees || 0}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={15} />
                          <span>{ot.affectations?.length || 0}</span>
                        </span>
                      </div>
                      {ot.echeanceSLA && (
                        <span
                          className={`text-xs whitespace-nowrap ${ot.est_en_retard ? "text-danger font-medium" : "text-text-muted"}`}>
                          SLA:{" "}
                          {new Date(ot.echeanceSLA).toLocaleString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {demandes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3"></p>
                  <p className="text-text-secondary text-sm">
                    Aucune demande en attente
                  </p>
                </div>
              ) : (
                demandes.map((d) => {
                  const isExpanded = expandedDemandeId === d.id;
                  const audioPieces =
                    d.pieces_jointes?.filter((p) =>
                      p.typeFichier?.startsWith("audio"),
                    ) || [];
                  const imagePieces =
                    d.pieces_jointes?.filter((p) =>
                      p.typeFichier?.startsWith("image"),
                    ) || [];
                  const videoPieces =
                    d.pieces_jointes?.filter((p) =>
                      p.typeFichier?.startsWith("video"),
                    ) || [];
                  const otherPieces =
                    d.pieces_jointes?.filter(
                      (p) =>
                        !p.typeFichier?.startsWith("audio") &&
                        !p.typeFichier?.startsWith("image") &&
                        !p.typeFichier?.startsWith("video"),
                    ) || [];

                  return (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`bg-surface border border-border border-l-4 border-l-primary rounded-xl pop-shadow transition-all ${isExpanded ? "ring-1 ring-primary/30" : ""}`}>
                      {/*  Header toujours visible  */}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-primary font-semibold">
                              {d.numero}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${PRIORITE_CLS[d.urgence]}`}>
                              {d.urgence}
                            </span>
                            {d.nb_pieces_jointes > 0 && (
                              <span className="text-xs text-primary bg-primary-soft px-1.5 py-0.5 rounded-full border border-primary/20">
                                {d.nb_pieces_jointes}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              setExpandedDemandeId(isExpanded ? null : d.id)
                            }
                            className="text-text-muted hover:text-text p-1 rounded-lg hover:bg-elevated transition"
                            title={isExpanded ? "Réduire" : "Développer"}>
                            {isExpanded ? (
                              <ChevronUp size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </button>
                        </div>

                        {/* Bannière rejet */}
                        {d.statut === "rejetee_apres_validation" &&
                          d.rejet_info && (
                            <div className="mt-2 bg-danger-soft border border-danger/30 rounded-lg p-2.5">
                              <p className="text-xs text-danger font-semibold flex items-center gap-1.5">
                                <span></span>
                                Cette DI a été rejetée par l'opérateur (
                                {d.rejet_info.count}x)
                              </p>
                              {d.rejet_info.motif && (
                                <p className="text-[11px] text-danger/80 mt-1">
                                  Motif : {d.rejet_info.motif}
                                </p>
                              )}
                              <p className="text-[10px] text-text-muted mt-1">
                                Dernier rejet :{" "}
                                {new Date(d.rejet_info.date).toLocaleString(
                                  "fr-FR",
                                )}
                              </p>
                            </div>
                          )}

                        {/* Titre */}
                        {d.titre && (
                          <p className="text-sm font-bold text-text mb-1">
                            {d.titre}
                          </p>
                        )}

                        {/* Équipement + Hiérarchie */}
                        <p className="text-sm font-medium text-text">
                          {d.actif_detail?.code} — {d.actif_detail?.libelle}
                        </p>
                        {d.actif_detail?.chemin_hierarchique?.length > 0 && (
                          <p className="text-[11px] text-text-muted mt-0.5">
                            {d.actif_detail.chemin_hierarchique.map((h, i) => (
                              <span key={h.id}>
                                <span className="text-text-secondary">
                                  {h.libelle}
                                </span>
                                {i <
                                  d.actif_detail.chemin_hierarchique.length -
                                    1 && (
                                  <span className="mx-1 text-text-muted">
                                    ›
                                  </span>
                                )}
                              </span>
                            ))}
                            <span className="mx-1 text-text-muted">›</span>
                            <span className="text-primary">
                              {d.actif_detail.libelle}
                            </span>
                          </p>
                        )}

                        {/* Description (tronquée si fermé, complète si ouvert) */}
                        <p
                          className={`text-xs text-text-secondary mt-2 ${isExpanded ? "" : "line-clamp-2"}`}>
                          {d.description}
                        </p>

                        {/* Métadonnées */}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-text-muted">
                          <span>
                            {" "}
                            {new Date(d.dateSignalement).toLocaleString(
                              "fr-FR",
                            )}
                          </span>
                          {d.signalement_detail && (
                            <span>
                              {" "}
                              {d.signalement_detail.prenom}{" "}
                              {d.signalement_detail.nom}
                            </span>
                          )}
                        </div>

                        {/*  Contenu expansible  */}
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.2 }}
                            className="mt-4 pt-4 border-t border-border-subtle space-y-4">
                            {/* Images */}
                            {imagePieces.length > 0 && (
                              <div>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
                                  <Image size={12} /> Photos (
                                  {imagePieces.length})
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                  {imagePieces.map((img) => (
                                    <div
                                      key={img.id}
                                      className="relative group rounded-lg overflow-hidden border border-border-subtle bg-surface">
                                      <img
                                        src={img.url}
                                        alt={img.nomFichier}
                                        className="w-full h-20 object-cover"
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                        }}
                                      />
                                      <a
                                        href={img.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition opacity-0 group-hover:opacity-100">
                                        <span className="text-[10px] text-text bg-black/60 px-2 py-0.5 rounded">
                                          Voir
                                        </span>
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Vidéos */}
                            {videoPieces.length > 0 && (
                              <div>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
                                  <FileText size={12} /> Vidéos (
                                  {videoPieces.length})
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {videoPieces.map((vid) => (
                                    <video
                                      key={vid.id}
                                      src={vid.url}
                                      controls
                                      className="w-full h-32 object-cover rounded-lg border border-border-subtle bg-surface"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Audio */}
                            {audioPieces.length > 0 && (
                              <div>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
                                  <Music size={12} /> Enregistrements audio (
                                  {audioPieces.length})
                                </p>
                                <div className="space-y-2">
                                  {audioPieces.map((audio) => (
                                    <div
                                      key={audio.id}
                                      className={`bg-primary/10 border border-primary/30 rounded-lg p-2.5 flex items-center gap-3 transition ${playingAudioId === audio.id ? "ring-1 ring-primary" : ""}`}>
                                      <button
                                        onClick={() =>
                                          playAudio(audio.url, audio.id)
                                        }
                                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-text text-xs transition ${playingAudioId === audio.id ? "bg-primary animate-pulse" : "bg-primary hover:bg-primary/80"}`}>
                                        {playingAudioId === audio.id ? "⏸" : ""}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs text-primary truncate">
                                          {audio.nomFichier}
                                        </p>
                                        <p className="text-[10px] text-text-muted">
                                          {new Date(
                                            audio.dateTeleversement,
                                          ).toLocaleString("fr-FR")}
                                        </p>
                                      </div>
                                      <a
                                        href={audio.url}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-text-muted hover:text-primary transition">
                                        <Download size={14} />
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Autres fichiers */}
                            {otherPieces.length > 0 && (
                              <div>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">
                                  Autres fichiers ({otherPieces.length})
                                </p>
                                <div className="space-y-1.5">
                                  {otherPieces.map((f) => (
                                    <div
                                      key={f.id}
                                      className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-border">
                                      <FileText
                                        size={14}
                                        className="text-text-muted"
                                      />
                                      <span className="text-xs text-text flex-1 truncate">
                                        {f.nomFichier}
                                      </span>
                                      <a
                                        href={f.url}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-text-muted hover:text-text">
                                        <Download size={14} />
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleValider(d.id)}
                                className="flex-1 py-2.5 btn btn-success rounded-lg text-sm font-medium transition text-text">
                                Valider → Créer OT
                              </button>
                              <button
                                onClick={() => {
                                  setModalRejet(d.id);
                                  setMotifRejet("");
                                }}
                                className="flex-1 py-2.5 btn btn-danger rounded-lg text-sm font-medium transition">
                                Rejeter
                              </button>
                            </div>
                          </motion.div>
                        )}

                        {/* Actions rapides (visible quand fermé) */}
                        {!isExpanded && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => viewDemandeDetail(d)}
                              className="flex-1 py-2 btn btn-primary rounded-lg text-sm font-medium transition">
                              Voir détails
                            </button>
                            <button
                              onClick={() => handleValider(d.id)}
                              className="flex-1 py-2 btn btn-success rounded-lg text-sm font-medium transition text-text">
                              Valider
                            </button>
                            <button
                              onClick={() => {
                                setModalRejet(d.id);
                                setMotifRejet("");
                              }}
                              className="flex-1 py-2 btn btn-danger rounded-lg text-sm font-medium transition">
                              Rejeter
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/*  Panneau latéral  */}
      <AnimatePresence>
        {otSelectionne && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-1/2 flex flex-col bg-elevated min-h-0 border-l border-border">
            {/* Header panneau */}
            <div className="p-4 border-b border-border bg-elevated flex-shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-lg text-primary font-bold">
                      {otSelectionne.numero}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${STATUT_CLS[otSelectionne.statut]}`}>
                      {STATUT_LABEL[otSelectionne.statut]}
                    </span>
                    {otSelectionne.est_en_retard && (
                      <span className="text-xs bg-danger-soft text-danger px-1.5 py-0.5 rounded-full border border-danger/30">
                        Retard
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">
                    {otSelectionne.actif_detail?.libelle}
                  </p>
                </div>
                <button
                  onClick={() => setOtSelectionne(null)}
                  className="text-text-muted hover:text-text ml-2 p-1 rounded-lg hover:bg-elevated transition"></button>
              </div>

              {/* Tabs panneau */}
              <div className="flex gap-1 mt-3 bg-surface p-1 rounded-md">
                {["actions", "infos", "historique"].map((o) => (
                  <button
                    key={o}
                    onClick={() => setPanneauOnglet(o)}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium capitalize transition ${
                      panneauOnglet === o
                        ? "bg-elevated text-text shadow"
                        : "text-text-secondary hover:text-text"
                    }`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface">
              {/*  Actions  */}
              {panneauOnglet === "actions" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3">
                  <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                    Actions disponibles
                  </p>

                  {/* Changer statut */}
                  {TRANSITIONS[otSelectionne.statut] && (
                    <div className="bg-surface rounded-xl p-4 border border-border shadow-card">
                      <p className="text-xs text-text-secondary mb-3 font-semibold">
                        Changer le statut
                      </p>
                      <div className="space-y-2 gap-2 ">
                        {TRANSITIONS[otSelectionne.statut].map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              setNvStatut(s);
                              setMotifStatut("");
                              setModalStatut(true);
                            }}
                            className={` py-2 px-5 mx-2 rounded-lg text-sm font-medium border transition text-left hover:opacity-80 ${STATUT_CLS[s]}`}>
                            {STATUT_LABEL[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Affecter équipe */}
                  {["EN_COURS"].includes(otSelectionne.statut) && (
                    <div className="bg-surface rounded-xl p-4 border border-border shadow-card">
                      <p className="text-xs text-text-secondary mb-3 font-semibold">
                        {editAffectation
                          ? "Modifier l'affectation"
                          : "Affecter une équipe / sous-traitant"}
                      </p>
                      <AffectationForm
                        otId={otSelectionne.id}
                        onSuccess={charger}
                        prefillData={editAffectation}
                        onCancelPrefill={() => setEditAffectation(null)}
                      />
                    </div>
                  )}

                  {/* Affectations existantes */}
                  {otSelectionne.affectations?.length > 0 && (
                    <div className="bg-surface rounded-xl p-4 border border-border shadow-card">
                      <p className="text-xs text-text-secondary mb-2 font-semibold">
                        Affectations en cours (
                        {otSelectionne.affectations.length})
                      </p>
                      <div className="space-y-2">
                        {otSelectionne.affectations.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center justify-between p-2 bg-elevated rounded-lg border border-border-subtle">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-text">
                                {a.equipe_detail?.libelle ||
                                  a.soustraitant_detail?.raisonSociale ||
                                  "—"}
                              </p>
                              <p className="text-xs text-text-muted">
                                {new Date(a.dateDebut).toLocaleString("fr-FR")}
                              </p>
                              {/* Membres */}
                              <div className="flex flex-wrap gap-1 mt-1 items-center">
                                {a.membres?.length > 0 ? (
                                  a.membres.map((m) => (
                                    <span
                                      key={m.id}
                                      className="text-[9px] bg-primary-soft text-primary px-1.5 py-0.5 rounded border border-primary/20 flex items-center gap-1">
                                      <span className="w-3 h-3 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[7px] font-bold border border-primary/30">
                                        {m.utilisateur_detail
                                          ? `${m.utilisateur_detail.prenom?.[0] || ""}${m.utilisateur_detail.nom?.[0] || ""}`.toUpperCase()
                                          : "?"}
                                      </span>
                                      {m.utilisateur_detail
                                        ? `${m.utilisateur_detail.prenom} ${m.utilisateur_detail.nom}`
                                        : m.utilisateur_nom ||
                                          `Tech #${m.id?.slice(-4)}`}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[9px] text-text-muted italic">
                                    Aucun technicien
                                  </span>
                                )}
                                {["EN_COURS"].includes(
                                  otSelectionne.statut,
                                ) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditAffectation({
                                        id: a.id,
                                        equipeId:
                                          a.equipe_detail?.id || a.idEquipe,
                                        membres: a.membres || [],
                                        dateDebut: a.dateDebut,
                                      });
                                    }}
                                    className="text-[9px] bg-success-soft text-success px-1.5 py-0.5 rounded border border-success/30 hover:bg-success-soft transition flex items-center gap-0.5"
                                    title="Ajouter un technicien">
                                    <Plus size={8} /> Ajouter
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border ${
                                  a.statut === "termine"
                                    ? "bg-success-soft text-success border-success/30"
                                    : a.statut === "en_cours"
                                      ? "bg-warning-soft text-warning border-warning/30"
                                      : "bg-hover text-text-secondary border-border-subtle"
                                }`}>
                                {a.statut}
                              </span>
                              {["EN_COURS"].includes(otSelectionne.statut) && (
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditAffectation({
                                        id: a.id,
                                        equipeId:
                                          a.equipe_detail?.id || a.idEquipe,
                                        membres: a.membres || [],
                                        dateDebut: a.dateDebut,
                                      });
                                    }}
                                    className="p-1 text-text-secondary hover:text-primary hover:bg-primary-soft rounded transition"
                                    title="Modifier">
                                    <Wrench size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (
                                        !confirm(
                                          "Supprimer cette affectation ?",
                                        )
                                      )
                                        return;
                                      try {
                                        await deleteAffectation(a.id);
                                        charger();
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }}
                                    className="p-1 text-text-secondary hover:text-danger hover:bg-danger-soft rounded transition"
                                    title="Supprimer">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Commentaire */}
                  <div className="bg-surface rounded-xl p-4 border border-border shadow-card">
                    <p className="text-xs text-text-secondary mb-3 font-semibold">
                      Compte rendu / Commentaire
                    </p>
                    <Button
                      onClick={() => setModalComment(true)}
                      className="w-full py-2 btn btn-ghost rounded-lg text-sm transition">
                      Saisir compte rendu
                    </Button>
                  </div>

                  {/* Voir détail */}
                  <Button
                    onClick={() => navigate(`/ordres/ots/${otSelectionne.id}`)}
                    className="w-full py-2 btn btn-primary rounded-xl text-sm transition">
                    Voir détail complet →
                  </Button>
                </motion.div>
              )}

              {/*  Infos  */}
              {panneauOnglet === "infos" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-0">
                  {[
                    [
                      "Actif",
                      `${otSelectionne.actif_detail?.code} — ${otSelectionne.actif_detail?.libelle}`,
                    ],
                    ["Type", otSelectionne.type],
                    ["Priorité", otSelectionne.priorite],
                    [
                      "Sous-traité",
                      otSelectionne.estSousTraite ? "Oui" : "Non",
                    ],
                    ["Bloquant", otSelectionne.estBloquant ? "Oui" : "Non"],
                    [
                      "Durée estimée",
                      otSelectionne.dureeEstimeeMin
                        ? `${otSelectionne.dureeEstimeeMin} min`
                        : "—",
                    ],
                    [
                      "Durée réelle",
                      otSelectionne.dureeReelleMin
                        ? `${otSelectionne.dureeReelleMin} min`
                        : "—",
                    ],
                    [
                      "Échéance SLA",
                      otSelectionne.echeanceSLA
                        ? new Date(otSelectionne.echeanceSLA).toLocaleString(
                            "fr-FR",
                          )
                        : "—",
                    ],
                  ].map(([l, v]) => (
                    <div
                      key={l}
                      className="flex justify-between text-sm py-2 px-2 border-b border-border-subtle last:border-0">
                      <span className="text-text-secondary font-medium">
                        {l}
                      </span>
                      <span className="text-text font-semibold text-right max-w-[55%] break-words">
                        {v}
                      </span>
                    </div>
                  ))}
                  {otSelectionne.description && (
                    <div className="bg-surface rounded-lg p-3 mt-2 border border-border">
                      <p className="text-xs text-text-secondary mb-1 font-semibold">
                        Description
                      </p>
                      <p className="text-sm text-text">
                        {otSelectionne.description}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/*  Historique  */}
              {panneauOnglet === "historique" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2">
                  {!otSelectionne.historiques_statut?.length ? (
                    <p className="text-text-muted text-sm text-center py-8">
                      Aucun historique
                    </p>
                  ) : (
                    otSelectionne.historiques_statut.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-start gap-3 p-3 bg-surface rounded-xl border border-border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {h.ancienStatut && (
                              <>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full border ${STATUT_CLS[h.ancienStatut]}`}>
                                  {STATUT_LABEL[h.ancienStatut]}
                                </span>
                                <span className="text-text-muted text-xs">
                                  →
                                </span>
                              </>
                            )}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${STATUT_CLS[h.nouveauStatut]}`}>
                              {STATUT_LABEL[h.nouveauStatut]}
                            </span>
                          </div>
                          {h.motif && (
                            <p className="text-xs text-text-secondary mt-1">
                              {h.motif}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-text-muted whitespace-nowrap">
                          {new Date(h.dateChangement).toLocaleString("fr-FR")}
                        </span>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/*  Modal changer statut  */}
      {modalStatut && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl border border-border p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-semibold mb-1">
              Confirmer le changement
            </h2>
            <p className="text-text-secondary text-sm mb-4">
              {otSelectionne?.numero} →
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs border ${STATUT_CLS[nvStatut]}`}>
                {STATUT_LABEL[nvStatut]}
              </span>
            </p>
            <Label className="block text-xs text-text-secondary mb-1">
              Motif / compte rendu (optionnel)
            </Label>
            <Textarea
              value={motifStatut}
              onChange={(e) => setMotifStatut(e.target.value)}
              placeholder="Décrivez les raisons du changement..."
              className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border-subtle outline-none mb-4 resize-none h-24 focus:border-primary"
            />
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setModalStatut(false)}
                className="px-4 py-2 text-sm btn btn-ghost rounded-lg transition text-text">
                Annuler
              </Button>
              <Button
                onClick={handleChangerStatut}
                disabled={submitting}
                className="px-4 py-2 text-sm btn btn-primary rounded-lg transition text-text disabled:opacity-50">
                {submitting ? "..." : "Confirmer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/*  Modal rejet DI  */}
      {modalRejet && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl border border-border p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">Motif de rejet</h2>
            <label className="block text-xs text-text-secondary mb-1">
              Motif
            </label>
            <Textarea
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value)}
              placeholder="Expliquez pourquoi cette demande est rejetée..."
              className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border-subtle outline-none mb-4 resize-none h-24 focus:border-danger"
            />
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setModalRejet(null)}
                className="px-4 py-2 text-sm btn btn-ghost rounded-lg transition text-text">
                Annuler
              </Button>
              <Button
                onClick={handleRejeter}
                className="px-4 py-2 text-sm btn btn-danger rounded-lg transition text-text">
                Rejeter
              </Button>
            </div>
          </div>
        </div>
      )}

      {/*  Modal compte rendu enrichi  */}
      {modalComment && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 py-8 overflow-y-auto">
          <div className="bg-surface rounded-2xl border border-border p-6 w-full max-w-2xl shadow-2xl my-auto">
            <h2 className="text-lg font-semibold mb-1">
              {" "}
              Compte rendu d'intervention
            </h2>
            <p className="text-text-secondary text-sm mb-4">
              {otSelectionne?.numero} — {otSelectionne?.actif_detail?.code}
            </p>

            <form
              onSubmit={handleCompteRendu}
              className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Actifs corrigés */}
              <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-status-cyan uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle size={12} /> Actifs corrigés
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowActifCorrigeSelector((s) => !s);
                      if (!showActifCorrigeSelector) initCorrigeSelector();
                    }}
                    className="text-[10px] flex items-center gap-1 text-status-cyan hover:text-status-cyan border border-status-cyan/30 bg-status-cyan/10 px-2 py-1 rounded-lg transition">
                    <Plus size={10} />{" "}
                    {showActifCorrigeSelector ? "Annuler" : "Ajouter"}
                  </button>
                </div>
                {actifsCorriges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {actifsCorriges.map((a) => (
                      <span
                        key={a.id}
                        className="text-[10px] bg-status-cyan/10 text-status-cyan px-2 py-0.5 rounded-full border border-status-cyan/20 flex items-center gap-1">
                        <CheckCircle size={8} /> {a.code}
                        <button
                          type="button"
                          onClick={() => retirerActifCorrige(a.id)}
                          className="text-status-cyan hover:text-danger ml-0.5">
                          <Trash2 size={8} />
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
                      <div className="bg-elevated rounded-lg p-3 border border-border-subtle space-y-2">
                        <p className="text-[10px] text-text-secondary">
                          Sélectionnez l'équipement réparé :
                        </p>
                        {corrigeLoading ? (
                          <p className="text-xs text-text-muted">
                            Chargement...
                          </p>
                        ) : (
                          <>
                            {corrigeOptionsAtLevel.map(
                              (options, levelIndex) => (
                                <div key={levelIndex}>
                                  <label className="text-[9px] text-text-muted uppercase tracking-wider block mb-0.5">
                                    {levelIndex === 0
                                      ? "Site / Zone"
                                      : `Niveau ${levelIndex + 1}`}
                                  </label>
                                  <select
                                    value={
                                      corrigeSelectionPath[levelIndex]?.id || ""
                                    }
                                    onChange={(e) =>
                                      handleCorrigeSelectAtLevel(
                                        levelIndex,
                                        e.target.value,
                                      )
                                    }
                                    className="w-full bg-elevated text-text rounded-lg px-2 py-1.5 text-xs border border-border-subtle outline-none focus:border-status-cyan">
                                    <option value="">Sélectionner...</option>
                                    {options.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.code} — {a.libelle}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ),
                            )}
                            {corrigeSelectionPath.length > 0 && (
                              <div className="flex items-center justify-between pt-1">
                                <p className="text-[10px] text-text-secondary">
                                  Sélection :{" "}
                                  <span className="text-text font-medium">
                                    {
                                      corrigeSelectionPath[
                                        corrigeSelectionPath.length - 1
                                      ]?.code
                                    }
                                  </span>
                                </p>
                                <button
                                  type="button"
                                  onClick={ajouterActifCorrige}
                                  className="text-[10px] btn btn-success text-text px-3 py-1 rounded-lg transition flex items-center gap-1">
                                  <Plus size={10} /> Ajouter
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
              <div>
                <Label className="text-xs text-text-secondary mb-1 flex items-center gap-1">
                  <Wrench size={10} className="text-primary" /> Travaux réalisés
                  *
                </Label>
                <Textarea
                  value={rapport.descriptionTravail}
                  onChange={(e) =>
                    setRapport((r) => ({
                      ...r,
                      descriptionTravail: e.target.value,
                    }))
                  }
                  placeholder="Détaillez les actions effectuées..."
                  rows={3}
                  className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border-subtle outline-none focus:border-primary resize-none"
                  required
                />
              </div>

              {/* Constatations */}
              <div>
                <Label className="text-xs text-text-secondary mb-1 flex items-center gap-1">
                  <AlertTriangle size={10} className="text-primary" />{" "}
                  Constatations
                </Label>
                <Textarea
                  value={rapport.constatations}
                  onChange={(e) =>
                    setRapport((r) => ({ ...r, constatations: e.target.value }))
                  }
                  placeholder="État avant/après, observations..."
                  rows={2}
                  className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border-subtle outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Cause racine */}
              <div>
                <Label className="text-xs text-text-secondary mb-1.5">
                  {" "}
                  Cause racine
                </Label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">
                  {Object.entries(CATEGORIES_CAUSE).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() =>
                        setRapport((r) => ({ ...r, causeRacine: k }))
                      }
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-medium transition border ${
                        rapport.causeRacine === k
                          ? v.color + " border-opacity-100"
                          : "bg-elevated border-border-subtle text-text-secondary hover:text-text"
                      }`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Solution apportée */}
              <div>
                <Label className="text-xs text-text-secondary mb-1 flex items-center gap-1">
                  <CheckCircle size={10} className="text-success" /> Solution
                  apportée *
                </Label>
                <Textarea
                  value={rapport.solutionApportee}
                  onChange={(e) =>
                    setRapport((r) => ({
                      ...r,
                      solutionApportee: e.target.value,
                    }))
                  }
                  placeholder="Résumé de la solution définitive..."
                  rows={2}
                  className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border-subtle outline-none focus:border-success resize-none"
                  required
                />
              </div>

              {/* État final */}
              <div className="bg-surface rounded-xl border border-border p-3 shadow-card">
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">
                  {" "}
                  État final
                </p>
                <div className="space-y-2">
                  <label
                    className="flex items-start gap-2 p-2 rounded-lg border border-success/30 bg-success/10 cursor-pointer hover:bg-success/20 transition"
                    onClick={() =>
                      setRapport((r) => ({
                        ...r,
                        estCloture: true,
                        typeCloture: "corrige",
                      }))
                    }>
                    <input
                      type="radio"
                      name="etatFinal"
                      checked={
                        rapport.estCloture && rapport.typeCloture === "corrige"
                      }
                      onChange={() => {}}
                      className="mt-0.5 accent-success"
                    />
                    <div>
                      <p className="text-xs font-medium text-success">
                        Réparation définitive
                      </p>
                      <p className="text-[10px] text-success/80">
                        Clôturer l'OT — équipement réparé
                      </p>
                    </div>
                  </label>
                  <label
                    className="flex items-start gap-2 p-2 rounded-lg border border-status-orange/30 bg-status-orange/10 cursor-pointer hover:bg-status-orange/20 transition"
                    onClick={() =>
                      setRapport((r) => ({
                        ...r,
                        estCloture: true,
                        typeCloture: "depanne",
                      }))
                    }>
                    <input
                      type="radio"
                      name="etatFinal"
                      checked={
                        rapport.estCloture && rapport.typeCloture === "depanne"
                      }
                      onChange={() => {}}
                      className="mt-0.5 accent-status-orange"
                    />
                    <div>
                      <p className="text-xs font-medium text-status-orange">
                        Dépannage temporaire
                      </p>
                      <p className="text-[10px] text-status-orange/80">
                        Marquer dépanné — intervention ultérieure nécessaire
                      </p>
                    </div>
                  </label>
                  <label
                    className="flex items-start gap-2 p-2 rounded-lg border border-border-subtle bg-elevated cursor-pointer hover:bg-hover transition"
                    onClick={() =>
                      setRapport((r) => ({
                        ...r,
                        estCloture: false,
                        typeCloture: "depanne",
                      }))
                    }>
                    <input
                      type="radio"
                      name="etatFinal"
                      checked={!rapport.estCloture}
                      onChange={() => {}}
                      className="mt-0.5 accent-text-secondary"
                    />
                    <div>
                      <p className="text-xs font-medium text-text">
                        Ne pas clôturer
                      </p>
                      <p className="text-[10px] text-text-muted">
                        Enregistrer le rapport, OT reste en cours
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  onClick={() => setModalComment(false)}
                  className="px-4 py-2 text-sm btn btn-ghost rounded-lg transition text-text">
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    !rapport.descriptionTravail.trim() ||
                    !rapport.solutionApportee.trim()
                  }
                  className="px-4 py-2 text-sm btn btn-primary rounded-lg transition text-text disabled:opacity-50 flex items-center gap-1.5">
                  {submitting ? (
                    "..."
                  ) : (
                    <>
                      <CheckCircle size={14} /> Envoyer le rapport
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/*  Modal Affectation Automatique (après création OT)  */}
      {modalAffectationAuto && otAffectationAuto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold mb-1"> Nouvel OT créé</h2>
            <p className="text-text-secondary text-sm mb-4">
              <span className="font-mono text-primary">
                {otAffectationAuto.numero}
              </span>{" "}
              - {otAffectationAuto.actif_detail?.code}
            </p>
            <p className="text-sm text-text mb-4 font-medium">
              Qui allez-vous affecter à cette intervention ?
            </p>
            <AffectationForm
              otId={otAffectationAuto.id}
              onSuccess={() => {
                setModalAffectationAuto(false);
                charger();
              }}
            />
            <Button
              onClick={() => setModalAffectationAuto(false)}
              className="w-full mt-3 px-4 py-2 text-sm btn btn-ghost rounded-lg transition text-text">
              Ignorer pour maintenant
            </Button>
          </div>
        </div>
      )}

      {/*  Modal Détails Demande  */}
      {demandeDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-surface border-b border-border p-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-text">
                  {demandeDetail.numero}
                </h2>
                {demandeDetail.titre && (
                  <p className="text-base font-semibold text-text mt-1">
                    {demandeDetail.titre}
                  </p>
                )}
                <p className="text-text-secondary text-sm mt-1">
                  {demandeDetail.actif_detail?.libelle}
                </p>
              </div>
              <Button
                onClick={() => setDemandeDetail(null)}
                className="text-text-secondary hover:text-text transition">
                <X size={24} />
              </Button>
            </div>

            {/* Contenu */}
            <div className="p-6 space-y-6">
              {/* Historique Audit */}
              <div className="bg-elevated rounded-lg p-4 border border-border-subtle">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg"></span>
                  <p className="text-sm font-bold text-text uppercase tracking-wider">
                    Historique Audit
                  </p>
                </div>
                <div className="space-y-3 text-sm">
                  {demandeDetail.signalement_detail && (
                    <div className="flex items-start gap-3">
                      <span className="text-text-secondary min-w-fit">
                        Créée par:
                      </span>
                      <div>
                        <p className="text-text font-medium">
                          {demandeDetail.signalement_detail.prenom}{" "}
                          {demandeDetail.signalement_detail.nom}
                        </p>
                        <p className="text-text-muted text-xs">
                          {new Date(
                            demandeDetail.signalement_detail.date,
                          ).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  )}
                  {demandeDetail.validation_detail && (
                    <div className="flex items-start gap-3 pt-2 border-t border-border-subtle">
                      <span className="text-text-secondary min-w-fit">
                        OT créé par:
                      </span>
                      <div>
                        <p className="text-text font-medium">
                          {demandeDetail.validation_detail.prenom}{" "}
                          {demandeDetail.validation_detail.nom}
                        </p>
                        <p className="text-text-muted text-xs">
                          {new Date(
                            demandeDetail.validation_detail.date,
                          ).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  )}
                  {!demandeDetail.signalement_detail &&
                    !demandeDetail.validation_detail && (
                      <p className="text-text-muted text-xs italic">
                        Aucune information d'audit disponible
                      </p>
                    )}
                </div>
              </div>

              {/* Audio Recordings */}
              {demandeDetail.pieces_jointes &&
                demandeDetail.pieces_jointes.filter((p) =>
                  p.typeFichier?.startsWith("audio"),
                ).length > 0 && (
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
                      <Music size={12} /> Enregistrements audio (
                      {
                        demandeDetail.pieces_jointes.filter((p) =>
                          p.typeFichier?.startsWith("audio"),
                        ).length
                      }
                      )
                    </p>
                    <div className="space-y-2">
                      {demandeDetail.pieces_jointes
                        .filter((p) => p.typeFichier?.startsWith("audio"))
                        .map((piece) => (
                          <AudioPlayer key={piece.id} file={piece} />
                        ))}
                    </div>
                  </div>
                )}

              {/* Status & Urgence */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-elevated rounded-lg p-4 border border-border-subtle">
                  <p className="text-xs text-text-secondary uppercase font-semibold mb-1">
                    Urgence
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      demandeDetail.urgence === "critique"
                        ? "text-danger"
                        : demandeDetail.urgence === "haute"
                          ? "text-status-orange"
                          : demandeDetail.urgence === "normale"
                            ? "text-primary"
                            : "text-text-secondary"
                    }`}>
                    {demandeDetail.urgence?.toUpperCase()}
                  </p>
                </div>
                <div className="bg-elevated rounded-lg p-4 border border-border-subtle">
                  <p className="text-xs text-text-secondary uppercase font-semibold mb-1">
                    Date
                  </p>
                  <p className="text-sm text-text font-mono">
                    {new Date(demandeDetail.dateSignalement).toLocaleString(
                      "fr-FR",
                    )}
                  </p>
                </div>
              </div>

              {/* Équipement */}
              <div className="bg-primary-soft rounded-lg p-4 border border-primary/30">
                <p className="text-xs text-text-muted uppercase font-semibold mb-2">
                  Équipement
                </p>
                <p className="text-sm font-mono text-primary">
                  {demandeDetail.actif_detail?.code}
                </p>
                <p className="text-sm text-text">
                  {demandeDetail.actif_detail?.libelle}
                </p>
              </div>

              {/* Hiérarchie complète */}
              <HierarchyPath actifDetail={demandeDetail.actif_detail} />

              {/* Description */}
              <div className="bg-primary-soft rounded-lg p-4 border border-primary/30">
                <p className="text-xs text-text-muted uppercase font-semibold mb-2">
                  Description du problème
                </p>
                <p className="text-sm text-text leading-relaxed">
                  {demandeDetail.description}
                </p>
              </div>

              {/* Pièces jointes */}
              {demandeDetail.pieces_jointes &&
                demandeDetail.pieces_jointes.length > 0 && (
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
                      <FileText size={12} /> Pièces jointes (
                      {demandeDetail.pieces_jointes.length})
                    </p>

                    {/* Images */}
                    {demandeDetail.pieces_jointes.some((f) =>
                      f.typeFichier?.startsWith("image"),
                    ) && (
                      <div className="mb-4">
                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Image size={10} /> Photos
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {demandeDetail.pieces_jointes
                            .filter((f) => f.typeFichier?.startsWith("image"))
                            .map((f) => (
                              <ImageViewer key={f.id} file={f} />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Vidéos */}
                    {demandeDetail.pieces_jointes.some((f) =>
                      f.typeFichier?.startsWith("video"),
                    ) && (
                      <div className="mb-4">
                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Video size={10} /> Vidéos
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {demandeDetail.pieces_jointes
                            .filter((f) => f.typeFichier?.startsWith("video"))
                            .map((f) => (
                              <VideoViewer key={f.id} file={f} />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Autres fichiers */}
                    {demandeDetail.pieces_jointes.filter(
                      (f) =>
                        !f.typeFichier?.startsWith("audio") &&
                        !f.typeFichier?.startsWith("image") &&
                        !f.typeFichier?.startsWith("video"),
                    ).length > 0 && (
                      <div>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                          <FileText size={10} /> Autres fichiers
                        </p>
                        <div className="space-y-1.5">
                          {demandeDetail.pieces_jointes
                            .filter(
                              (f) =>
                                !f.typeFichier?.startsWith("audio") &&
                                !f.typeFichier?.startsWith("image") &&
                                !f.typeFichier?.startsWith("video"),
                            )
                            .map((f) => (
                              <div
                                key={f.id}
                                className="flex items-center gap-3 p-2.5 border border-border rounded-lg bg-surface">
                                <FileText
                                  size={14}
                                  className="shrink-0 text-text-muted"
                                />
                                <span className="text-xs text-text flex-1 truncate">
                                  {f.nomFichier}
                                </span>
                                <a
                                  href={f.url}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary text-xs flex items-center gap-1 shrink-0 hover:underline">
                                  <Download size={12} /> Télécharger
                                </a>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-surface border-t border-border p-6 flex gap-3">
              <Button
                onClick={() => setDemandeDetail(null)}
                className="flex-1 py-2 btn btn-ghost rounded-lg text-sm font-medium transition text-text">
                Fermer
              </Button>
              <Button
                onClick={() => {
                  handleValider(demandeDetail.id);
                  setDemandeDetail(null);
                }}
                className="flex-1 py-2 btn btn-success rounded-lg text-sm font-medium transition text-text">
                Valider
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
