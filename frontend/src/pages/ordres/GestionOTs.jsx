import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Play, MessageCircle, User, Wrench } from "lucide-react";
import {
  getOTs,
  getDemandes,
  validerDemande,
  rejeterDemande,
  changerStatutOT,
  affecterEquipe,
  ajouterCommentaire,
  cloturerOT,
} from "../../services/ordreService";
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

// ── Constants ───────────────────────────────────────
const PRIORITE_CLS = {
  critique: "bg-red-500/20 text-red-400 border-red-500/40",
  haute: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  normale: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  basse: "bg-gray-500/20 text-gray-400 border-gray-500/40",
};
const STATUT_CLS = {
  OUVERT: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  EN_COURS: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DEPANNE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  EN_ATTENTE_CORRECTION:
    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  EN_VALIDATION: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  CLOTURE: "bg-green-500/20 text-green-400 border-green-500/30",
};
const STATUT_BORDER = {
  OUVERT: "border-l-blue-500",
  EN_COURS: "border-l-amber-500",
  DEPANNE: "border-l-orange-500",
  EN_ATTENTE_CORRECTION: "border-l-yellow-500",
  EN_VALIDATION: "border-l-purple-500",
  CLOTURE: "border-l-green-500",
};
const STATUT_LABEL = {
  OUVERT: "Ouvert",
  EN_COURS: "En cours",
  DEPANNE: "Dépanné",
  EN_ATTENTE_CORRECTION: "En attente",
  EN_VALIDATION: "En validation",
  CLOTURE: "Clôturé",
};
const TRANSITIONS = {
  OUVERT: ["EN_COURS"],
  EN_COURS: ["DEPANNE", "EN_VALIDATION"],
  DEPANNE: ["EN_ATTENTE_CORRECTION", "EN_COURS"],
  EN_ATTENTE_CORRECTION: ["EN_COURS"],
  EN_VALIDATION: ["CLOTURE", "EN_COURS"],
};

// ── Composant Affectation ───────────────────────────
function AffectationForm({ otId, onSuccess }) {
  const [equipes, setEquipes] = useState([]);
  const [soustraitants, setST] = useState([]);
  const [type, setType] = useState("interne");
  const [idEquipe, setIdEquipe] = useState("");
  const [idST, setIdST] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  useEffect(() => {
    import("../../services/api").then(({ default: api }) => {
      api
        .get("/v1/organisation/equipes/")
        .then((r) => setEquipes(r.data.results || r.data));
      api
        .get("/v1/soustraitants/?statut=actif")
        .then((r) => setST(r.data.results || r.data));
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setSucces("");
    if (type === "interne" && !idEquipe)
      return setErreur("Sélectionnez une équipe.");
    if (type === "externe" && !idST)
      return setErreur("Sélectionnez un sous-traitant.");
    setLoading(true);
    try {
      await affecterEquipe(otId, {
        idEquipe: type === "interne" ? idEquipe : null,
        idSousTraitant: type === "externe" ? idST : null,
        dateDebut: dateDebut || new Date().toISOString(),
      });
      setSucces("✅ Affectation enregistrée");
      setIdEquipe("");
      setIdST("");
      setDateDebut("");
      onSuccess();
    } catch (e) {
      setErreur(e.response?.data?.error || "Erreur affectation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {erreur && (
        <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">
          {erreur}
        </div>
      )}
      {succes && (
        <div className="text-green-400 text-xs bg-green-500/10 p-3 rounded-lg border border-green-500/20">
          {succes}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => setType("interne")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
            type === "interne"
              ? "bg-purple-600 border-purple-500 text-white"
              : "bg-gray-700 border-gray-600 text-gray-400 hover:text-white"
          }`}>
          👥 Équipe interne
        </Button>
        <Button
          type="button"
          onClick={() => setType("externe")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
            type === "externe"
              ? "bg-amber-600 border-amber-500 text-white"
              : "bg-gray-700 border-gray-600 text-gray-400 hover:text-white"
          }`}>
          🏢 Sous-traitant
        </Button>
      </div>
      {type === "interne" && (
        <Select value={idEquipe} onValueChange={setIdEquipe}>
          <SelectTrigger>
            <SelectValue placeholder="— Sélectionner une équipe —" />
          </SelectTrigger>

          <SelectContent>
            {equipes.map((eq) => (
              <SelectItem key={eq.id} value={String(eq.id)}>
                {eq.libelle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {type === "externe" && (
        <Select value={idST} onValueChange={setIdST}>
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
        <Label className="block text-xs text-gray-500 mb-1">
          Date début (optionnel)
        </Label>
        <Input
          type="datetime-local"
          value={dateDebut}
          onChange={(e) => setDateDebut(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-xs border border-gray-600 outline-none"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition disabled:opacity-50">
        {loading ? "Affectation..." : "👥 Confirmer l'affectation"}
      </Button>
    </form>
  );
}

// ── Composant principal ────────────────────────────
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
  const [modalAffectationAuto, setModalAffectationAuto] = useState(false);
  const [otAffectationAuto, setOtAffectationAuto] = useState(null);
  const [demandeDetail, setDemandeDetail] = useState(null);
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
        getDemandes({ statut: "en_attente" }),
      ]);
      const otsData = o.data.results || o.data;
      const demandesData = d.data.results || d.data;
      console.log("📊 Demandes loaded from API:");
      demandesData.forEach((dm) => {
        console.log(`  - ${dm.numero}:`, {
          nb_pieces_jointes: dm.nb_pieces_jointes,
          pieces_jointes: dm.pieces_jointes,
          has_audio:
            dm.pieces_jointes?.some((p) =>
              p.typeFichier?.startsWith("audio"),
            ) || false,
        });
      });
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

  const handleCloturer = async () => {
    if (!confirm("Clôturer définitivement cet OT ?")) return;
    setSubmitting(true);
    try {
      await cloturerOT(otSelectionne.id, "corrige", "");
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
        getDemandes({ statut: "en_attente" }),
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
    console.log("📋 Viewing demande detail:", demande);
    console.log("📁 pieces_jointes:", demande.pieces_jointes);
    console.log("👤 signalement_detail:", demande.signalement_detail);
    console.log("✅ validation_detail:", demande.validation_detail);
    if (demande.pieces_jointes && demande.pieces_jointes.length > 0) {
      console.log(
        "🎙️ Audio files found:",
        demande.pieces_jointes.filter((p) =>
          p.typeFichier?.startsWith("audio"),
        ),
      );
    } else {
      console.warn("⚠️ No pieces_jointes found in demande!");
    }
    setDemandeDetail(demande);
  };

  const playAudio = (audioUrl, audioId) => {
    console.log("🔊 Playing audio:", { audioUrl, audioId });

    if (currentPlayingAudio) {
      currentPlayingAudio.pause();
      currentPlayingAudio.currentTime = 0;
    }

    const fullUrl = audioUrl.startsWith("http")
      ? audioUrl
      : `http://localhost:8000${audioUrl}`;
    console.log("🔗 Full audio URL:", fullUrl);

    const audio = new Audio(fullUrl);
    setCurrentPlayingAudio(audio);
    setPlayingAudioId(audioId);

    audio.addEventListener("ended", () => {
      setPlayingAudioId(null);
    });
    audio.addEventListener("error", (e) => {
      console.error("❌ Audio error:", e, "URL was:", fullUrl);
      console.error(
        "Audio error code:",
        audio.error?.code,
        audio.error?.message,
      );
    });

    audio.play().catch((err) => {
      console.error("❌ Erreur lecture:", err);
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

  const otsTries = [...ots].sort((a, b) => {
    const ord = { critique: 0, haute: 1, normale: 2, basse: 3 };
    return (ord[a.priorite] || 2) - (ord[b.priorite] || 2);
  });

  return (
    <div className="flex h-full text-white overflow-hidden">
      {/* ── Liste principale ───────────────────────── */}
      <div
        className={`flex flex-col ${otSelectionne ? "w-1/2" : "w-full"} transition-all duration-300 min-h-0 border-r border-gray-700`}>
        <div className="p-6 pb-0 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Gestion des Interventions
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Responsable Techniciens
              </p>
            </div>
            <Button
              onClick={() => navigate("/ordres/ots/nouveau")}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md text-sm font-medium transition">
              + Nouvel OT
            </Button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 mb-4 bg-gray-800/60 p-1 rounded-md">
            <button
              onClick={() => setOnglet("ots")}
              className={`flex-1 px-4 py-2 rounded-md text-xs font-medium transition flex items-center justify-center gap-2 pop-shadow ${
                onglet === "ots"
                  ? "bg-surface text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}>
              Ordres de travail
              {ots.length > 0 && (
                <span
                  className={`h-5 min-w-5 px-1 rounded-full text-xs flex items-center justify-center font-bold ${
                    onglet === "ots"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-600 text-gray-300"
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
                  ? "bg-surface text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}>
              Demandes en attente
              {demandes.length > 0 && (
                <span className="h-5 min-w-5 px-1 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {demandes.length}
                </span>
              )}
            </button>
          </div>

          {onglet === "ots" && (
            <div className="flex gap-2 mb-4 ">
              {/* Filtre Statut */}
              <Select value={filtreStatut} onValueChange={setFiltreStatut}>
                <SelectTrigger className="bg-surface text-white text-xs  focus:border-gray-500">
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
                <SelectTrigger className="bg-surface text-white text-xs  focus:border-gray-500">
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
                className="bg-surface hover:bg-gray-600 px-3 py-2 rounded-md text-sm transition font-medium">
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
                  className="h-28 bg-gray-800/60 rounded-xl animate-pulse border border-gray-700/50"
                />
              ))}
            </div>
          ) : onglet === "ots" ? (
            <div className="space-y-2 mt-2 ">
              {otsTries.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-3xl mb-2">📋</p>
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
                    className={`p-4 rounded-xl border-l-4 border border-gray-700 cursor-pointer transition-all ${STATUT_BORDER[ot.statut]} ${
                      otSelectionne?.id === ot.id
                        ? "bg-purple-500/10 ring-1 ring-purple-500/30 border-r-purple-500/30 border-t-purple-500/30 border-b-purple-500/30"
                        : "bg-surface hover:bg-gray-800/80 hover:border-gray-600 pop-shadow"
                    }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-purple-300 font-semibold">
                          {ot.numero}
                        </span>
                        {ot.est_en_retard && (
                          <span
                            title="Cette intervention a dépassé l'échéance SLA"
                            className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full border border-red-500/30 cursor-help">
                            ⚠ Retard
                          </span>
                        )}
                        {ot.estBloquant && (
                          <span
                            title="Cette intervention bloque la production"
                            className="text-xs bg-red-500/30 text-red-300 px-1.5 py-0.5 rounded-full border border-red-500/30 cursor-help">
                            🔴 Bloquant
                          </span>
                        )}
                        {ot.estSousTraite && (
                          <span
                            title="Intervention sous-traitée"
                            className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/30 cursor-help">
                            🏢 ST
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

                    <p className="text-sm font-semibold text-white mb-1">
                      {ot.actif_detail?.code} — {ot.actif_detail?.libelle}
                    </p>
                    {ot.description && (
                      <p className="text-xs text-gray-400 line-clamp-1">
                        {ot.description}
                      </p>
                    )}

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-700/50">
                      <div className="flex gap-3 text-xs text-gray-500">
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
                          className={`text-xs whitespace-nowrap ${ot.est_en_retard ? "text-red-400 font-medium" : "text-gray-500"}`}>
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
                  <p className="text-4xl mb-3">✅</p>
                  <p className="text-gray-400 text-sm">
                    Aucune demande en attente
                  </p>
                </div>
              ) : (
                demandes.map((d) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-surface border border-gray-700 border-l-4 border-l-blue-500 rounded-xl p-4 pop-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-sm text-purple-300 font-semibold">
                        {d.numero}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${PRIORITE_CLS[d.urgence]}`}>
                        {d.urgence}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {d.actif_detail?.code} — {d.actif_detail?.libelle}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {d.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(d.dateSignalement).toLocaleString("fr-FR")}
                    </p>
                    {d.nb_pieces_jointes > 0 && (
                      <p className="text-xs text-blue-400 mt-2">
                        📎 {d.nb_pieces_jointes} fichier(s) joint(s)
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => viewDemandeDetail(d)}
                        className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg text-sm font-medium border border-blue-500/30 transition">
                        Voir détails
                      </button>
                      <button
                        onClick={() => handleValider(d.id)}
                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition">
                        Valider → Créer OT
                      </button>
                      <button
                        onClick={() => {
                          setModalRejet(d.id);
                          setMotifRejet("");
                        }}
                        className="flex-1 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm font-medium border border-red-500/30 transition">
                        Rejeter
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Panneau latéral ────────────────────────── */}
      <AnimatePresence>
        {otSelectionne && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-1/2 flex flex-col bg-gray-900/50 backdrop-blur min-h-0 border-l border-gray-700">
            {/* Header panneau */}
            <div className="p-4 border-b border-gray-700 bg-black/40 flex-shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-lg text-purple-300 font-bold">
                      {otSelectionne.numero}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${STATUT_CLS[otSelectionne.statut]}`}>
                      {STATUT_LABEL[otSelectionne.statut]}
                    </span>
                    {otSelectionne.est_en_retard && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full border border-red-500/30">
                        ⚠ Retard
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    {otSelectionne.actif_detail?.libelle}
                  </p>
                </div>
                <button
                  onClick={() => setOtSelectionne(null)}
                  className="text-gray-500 hover:text-white ml-2 p-1 rounded-lg hover:bg-gray-700 transition">
                  ✕
                </button>
              </div>

              {/* Tabs panneau */}
              <div className="flex gap-1 mt-3 bg-gray-800/60 p-1 rounded-md">
                {["actions", "infos", "historique"].map((o) => (
                  <button
                    key={o}
                    onClick={() => setPanneauOnglet(o)}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium capitalize transition ${
                      panneauOnglet === o
                        ? "bg-surface text-white shadow"
                        : "text-gray-400 hover:text-white"
                    }`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/30">
              {/* ── Actions ── */}
              {panneauOnglet === "actions" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    Actions disponibles
                  </p>

                  {/* Changer statut */}
                  {TRANSITIONS[otSelectionne.statut] && (
                    <div className="bg-surface rounded-xl p-4 border border-gray-700">
                      <p className="text-xs text-gray-400 mb-3 font-semibold">
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

                  {/* Clôturer */}
                  {otSelectionne.statut === "EN_VALIDATION" && (
                    <Button
                      onClick={handleCloturer}
                      disabled={submitting}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold transition disabled:opacity-50">
                      ✅ Clôturer l'OT définitivement
                    </Button>
                  )}

                  {/* Affecter équipe */}
                  {["OUVERT", "EN_COURS"].includes(otSelectionne.statut) && (
                    <div className="bg-surface rounded-xl p-4 border border-gray-700">
                      <p className="text-xs text-gray-400 mb-3 font-semibold">
                        Affecter une équipe / sous-traitant
                      </p>
                      <AffectationForm
                        otId={otSelectionne.id}
                        onSuccess={charger}
                      />
                    </div>
                  )}

                  {/* Affectations existantes */}
                  {otSelectionne.affectations?.length > 0 && (
                    <div className="bg-surface rounded-xl p-4 border border-gray-700">
                      <p className="text-xs text-gray-400 mb-2 font-semibold">
                        Affectations en cours (
                        {otSelectionne.affectations.length})
                      </p>
                      <div className="space-y-2">
                        {otSelectionne.affectations.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg border border-gray-600">
                            <div>
                              <p className="text-xs font-medium text-white">
                                {a.equipe_detail?.libelle ||
                                  a.soustraitant_detail?.raisonSociale ||
                                  "—"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(a.dateDebut).toLocaleString("fr-FR")}
                              </p>
                            </div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${
                                a.statut === "termine"
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : a.statut === "en_cours"
                                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                    : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                              }`}>
                              {a.statut}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Commentaire */}
                  <div className="bg-surface rounded-xl p-4 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-3 font-semibold">
                      Compte rendu / Commentaire
                    </p>
                    <Button
                      onClick={() => setModalComment(true)}
                      className="w-full py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-sm transition">
                      ✏️ Saisir compte rendu
                    </Button>
                  </div>

                  {/* Voir détail */}
                  <Button
                    onClick={() => navigate(`/ordres/ots/${otSelectionne.id}`)}
                    className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-xl text-sm border border-purple-500/30 transition">
                    Voir détail complet →
                  </Button>
                </motion.div>
              )}

              {/* ── Infos ── */}
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
                    ["Coût total", `${otSelectionne.cout_total || 0} MAD`],
                  ].map(([l, v]) => (
                    <div
                      key={l}
                      className="flex justify-between text-sm py-2 px-2 border-b border-gray-700/70 last:border-0">
                      <span className="text-gray-400 font-medium">{l}</span>
                      <span className="text-white font-semibold text-right max-w-[55%] break-words">
                        {v}
                      </span>
                    </div>
                  ))}
                  {otSelectionne.description && (
                    <div className="bg-gray-800 rounded-lg p-3 mt-2 border border-gray-700">
                      <p className="text-xs text-gray-400 mb-1 font-semibold">
                        Description
                      </p>
                      <p className="text-sm text-gray-300">
                        {otSelectionne.description}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Historique ── */}
              {panneauOnglet === "historique" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2">
                  {!otSelectionne.historiques_statut?.length ? (
                    <p className="text-gray-500 text-sm text-center py-8">
                      Aucun historique
                    </p>
                  ) : (
                    otSelectionne.historiques_statut.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-start gap-3 p-3 bg-gray-800 rounded-xl border border-gray-700">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {h.ancienStatut && (
                              <>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full border ${STATUT_CLS[h.ancienStatut]}`}>
                                  {STATUT_LABEL[h.ancienStatut]}
                                </span>
                                <span className="text-gray-500 text-xs">→</span>
                              </>
                            )}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${STATUT_CLS[h.nouveauStatut]}`}>
                              {STATUT_LABEL[h.nouveauStatut]}
                            </span>
                          </div>
                          {h.motif && (
                            <p className="text-xs text-gray-400 mt-1">
                              {h.motif}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
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

      {/* ── Modal changer statut ── */}
      {modalStatut && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-semibold mb-1">
              Confirmer le changement
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              {otSelectionne?.numero} →
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs border ${STATUT_CLS[nvStatut]}`}>
                {STATUT_LABEL[nvStatut]}
              </span>
            </p>
            <Label className="block text-xs text-gray-400 mb-1">
              Motif / compte rendu (optionnel)
            </Label>
            <Textarea
              value={motifStatut}
              onChange={(e) => setMotifStatut(e.target.value)}
              placeholder="Décrivez les raisons du changement..."
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none mb-4 resize-none h-24 focus:border-purple-500"
            />
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setModalStatut(false)}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg transition text-white">
                Annuler
              </Button>
              <Button
                onClick={handleChangerStatut}
                disabled={submitting}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition text-white disabled:opacity-50">
                {submitting ? "..." : "Confirmer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal rejet DI ── */}
      {modalRejet && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">Motif de rejet</h2>
            <label className="block text-xs text-gray-400 mb-1">Motif</label>
            <Textarea
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value)}
              placeholder="Expliquez pourquoi cette demande est rejetée..."
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none mb-4 resize-none h-24 focus:border-red-500"
            />
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setModalRejet(null)}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg transition text-white">
                Annuler
              </Button>
              <Button
                onClick={handleRejeter}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 rounded-lg transition text-white">
                Rejeter
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal commentaire ── */}
      {modalComment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">
              Compte rendu / Commentaire
            </h2>
            <Label className="block text-xs text-gray-400 mb-1">
              Détails du travail réalisé
            </Label>
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Décrivez les travaux réalisés, observations, pièces utilisées..."
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none mb-3 resize-none h-32 focus:border-purple-500"
            />
            <Label className="flex items-center gap-2 cursor-pointer mb-4">
              <Input
                type="checkbox"
                checked={estInterne}
                onChange={(e) => setEstInterne(e.target.checked)}
                className="accent-amber-500 w-4 h-4"
              />
              <span className="text-sm text-gray-300">
                Commentaire interne (non visible par l'opérateur)
              </span>
            </Label>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setModalComment(false)}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg transition text-white">
                Annuler
              </Button>
              <Button
                onClick={handleCommentaire}
                disabled={submitting || !newComment.trim()}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition text-white disabled:opacity-50">
                {submitting ? "..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Affectation Automatique (après création OT) ── */}
      {modalAffectationAuto && otAffectationAuto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold mb-1">✅ Nouvel OT créé</h2>
            <p className="text-gray-400 text-sm mb-4">
              <span className="font-mono text-purple-300">
                {otAffectationAuto.numero}
              </span>{" "}
              - {otAffectationAuto.actif_detail?.code}
            </p>
            <p className="text-sm text-gray-300 mb-4 font-medium">
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
              className="w-full mt-3 px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition text-gray-300">
              Ignorer pour maintenant
            </Button>
          </div>
        </div>
      )}

      {/* ── Modal Détails Demande ── */}
      {demandeDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {demandeDetail.numero}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {demandeDetail.actif_detail?.libelle}
                </p>
              </div>
              <Button
                onClick={() => setDemandeDetail(null)}
                className="text-gray-400 hover:text-white transition">
                <X size={24} />
              </Button>
            </div>

            {/* Contenu */}
            <div className="p-6 space-y-6">
              {/* Historique Audit */}
              <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📋</span>
                  <p className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                    Historique Audit
                  </p>
                </div>
                <div className="space-y-3 text-sm">
                  {demandeDetail.signalement_detail && (
                    <div className="flex items-start gap-3">
                      <span className="text-gray-400 min-w-fit">
                        📝 Créée par:
                      </span>
                      <div>
                        <p className="text-gray-200 font-medium">
                          {demandeDetail.signalement_detail.prenom}{" "}
                          {demandeDetail.signalement_detail.nom}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {new Date(
                            demandeDetail.signalement_detail.date,
                          ).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  )}
                  {demandeDetail.validation_detail && (
                    <div className="flex items-start gap-3 pt-2 border-t border-gray-600">
                      <span className="text-gray-400 min-w-fit">
                        ✅ OT créé par:
                      </span>
                      <div>
                        <p className="text-gray-200 font-medium">
                          {demandeDetail.validation_detail.prenom}{" "}
                          {demandeDetail.validation_detail.nom}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {new Date(
                            demandeDetail.validation_detail.date,
                          ).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  )}
                  {!demandeDetail.signalement_detail &&
                    !demandeDetail.validation_detail && (
                      <p className="text-gray-500 text-xs italic">
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
                  <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/10 rounded-lg p-4 border-2 border-blue-500/50 shadow-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">🎙️</span>
                      <div>
                        <p className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                          Enregistrements Audio
                        </p>
                        <p className="text-xs text-blue-300/70">
                          Écoutez les enregistrements audio de l'opérateur
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {demandeDetail.pieces_jointes
                        .filter((p) => p.typeFichier?.startsWith("audio"))
                        .map((piece, idx) => (
                          <div
                            key={idx}
                            className={`bg-blue-600/20 border border-blue-500/40 rounded-lg p-3 hover:bg-blue-600/30 transition ${
                              playingAudioId === piece.id
                                ? "ring-2 ring-blue-400 bg-blue-600/40"
                                : ""
                            }`}>
                            <div className="flex items-center gap-3">
                              <Button
                                onClick={() => playAudio(piece.url, piece.id)}
                                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition text-white shadow-md border ${
                                  playingAudioId === piece.id
                                    ? "bg-blue-500 border-blue-300 animate-pulse"
                                    : "bg-blue-600 hover:bg-blue-700 border-blue-500/50"
                                }`}>
                                {playingAudioId === piece.id ? (
                                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                ) : (
                                  <Play size={18} />
                                )}
                              </Button>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-blue-300">
                                  {piece.nomFichier}
                                </p>
                                <p className="text-xs text-gray-400">
                                  📅{" "}
                                  {new Date(
                                    piece.dateTeleversement,
                                  ).toLocaleString("fr-FR")}
                                </p>
                              </div>
                              <a
                                href={piece.url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 text-gray-400 hover:text-blue-400 transition">
                                <Download size={18} />
                              </a>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

              {/* Status & Urgence */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">
                    Urgence
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      demandeDetail.urgence === "critique"
                        ? "text-red-400"
                        : demandeDetail.urgence === "haute"
                          ? "text-orange-400"
                          : demandeDetail.urgence === "normale"
                            ? "text-blue-400"
                            : "text-gray-400"
                    }`}>
                    {demandeDetail.urgence?.toUpperCase()}
                  </p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">
                    Date
                  </p>
                  <p className="text-sm text-gray-300 font-mono">
                    {new Date(demandeDetail.dateSignalement).toLocaleString(
                      "fr-FR",
                    )}
                  </p>
                </div>
              </div>

              {/* Équipement */}
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                <p className="text-xs text-blue-400 uppercase font-semibold mb-2">
                  Équipement
                </p>
                <p className="text-sm font-mono text-blue-300">
                  {demandeDetail.actif_detail?.code}
                </p>
                <p className="text-sm text-gray-300">
                  {demandeDetail.actif_detail?.libelle}
                </p>
              </div>

              {/* Description */}
              <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/30">
                <p className="text-xs text-purple-400 uppercase font-semibold mb-2">
                  Description du problème
                </p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {demandeDetail.description}
                </p>
              </div>

              {/* Pièces jointes */}
              {demandeDetail.pieces_jointes &&
                demandeDetail.pieces_jointes.filter(
                  (p) => !p.typeFichier?.startsWith("audio"),
                ).length > 0 && (
                  <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-3">
                      📎 Fichiers attachés
                    </p>
                    <div className="space-y-3">
                      {demandeDetail.pieces_jointes
                        .filter((p) => !p.typeFichier?.startsWith("audio"))
                        .map((piece, idx) => {
                          const isImage =
                            piece.typeFichier?.startsWith("image");
                          return (
                            <div
                              key={idx}
                              className="bg-gray-800 rounded-lg p-3 border border-gray-600 flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {isImage && (
                                  <>
                                    <div className="flex-shrink-0 w-10 h-10 bg-gray-700 rounded-lg border border-gray-600 overflow-hidden">
                                      <img
                                        src={piece.url}
                                        alt={piece.nomFichier}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-gray-300 truncate">
                                        📸 {piece.nomFichier}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {new Date(
                                          piece.dateTeleversement,
                                        ).toLocaleString("fr-FR")}
                                      </p>
                                    </div>
                                  </>
                                )}
                                {!isImage && (
                                  <>
                                    <div className="flex-shrink-0 w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-gray-400">
                                      📄
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-gray-300 truncate">
                                        {piece.nomFichier}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {new Date(
                                          piece.dateTeleversement,
                                        ).toLocaleString("fr-FR")}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                              <a
                                href={piece.url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-200 transition">
                                <Download size={16} />
                              </a>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-6 flex gap-3">
              <Button
                onClick={() => setDemandeDetail(null)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition text-gray-300">
                Fermer
              </Button>
              <Button
                onClick={() => {
                  handleValider(demandeDetail.id);
                  setDemandeDetail(null);
                }}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition text-white">
                ✓ Valider
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
