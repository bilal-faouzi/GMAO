import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Play } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MessageCircle, User, Wrench } from "lucide-react";

// Variantes de badges pour shadcn/ui
const PRIORITE_VARIANT = {
  critique: "destructive",
  haute: "secondary",
  normale: "default",
  basse: "outline",
};

const STATUT_VARIANT = {
  OUVERT: "default",
  EN_COURS: "secondary",
  DEPANNE: "secondary",
  EN_ATTENTE_CORRECTION: "outline",
  EN_VALIDATION: "secondary",
  CLOTURE: "default",
};

const PRIORITE_COULEUR = {
  critique: "text-red-400",
  haute: "text-orange-400",
  normale: "text-blue-400",
  basse: "text-gray-400",
};

const STATUT_COULEUR = {
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
    <form onSubmit={handleSubmit} className="space-y-4">
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
          variant={type === "interne" ? "default" : "outline"}
          size="sm"
          className="flex-1">
          👥 Équipe interne
        </Button>
        <Button
          type="button"
          onClick={() => setType("externe")}
          variant={type === "externe" ? "default" : "outline"}
          size="sm"
          className="flex-1">
          🏢 Sous-traitant
        </Button>
      </div>

      {type === "interne" && (
        <div className="space-y-2">
          <Label htmlFor="equipe-select" className="text-xs">
            Équipe
          </Label>
          <Select value={idEquipe} onValueChange={setIdEquipe}>
            <SelectTrigger id="equipe-select" className="h-9">
              <SelectValue placeholder="Sélectionner une équipe" />
            </SelectTrigger>
            <SelectContent>
              {equipes.map((eq) => (
                <SelectItem key={eq.id} value={eq.id.toString()}>
                  {eq.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {type === "externe" && (
        <div className="space-y-2">
          <Label htmlFor="soustraitant-select" className="text-xs">
            Sous-traitant
          </Label>
          <Select value={idST} onValueChange={setIdST}>
            <SelectTrigger id="soustraitant-select" className="h-9">
              <SelectValue placeholder="Sélectionner un sous-traitant" />
            </SelectTrigger>
            <SelectContent>
              {soustraitants.map((st) => (
                <SelectItem key={st.id} value={st.id.toString()}>
                  {st.raisonSociale}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="date-debut" className="text-xs text-gray-400">
          Date début (optionnel)
        </Label>
        <Input
          id="date-debut"
          type="datetime-local"
          value={dateDebut}
          onChange={(e) => setDateDebut(e.target.value)}
          className="h-9 text-sm"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full" size="sm">
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

    // Build full URL if it's relative
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
    <TooltipProvider>
      <div className="flex h-full text-white overflow-hidden bg-backdrop">
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
                size="sm"
                className="gap-1">
                + Nouvel OT
              </Button>
            </div>

            <Tabs
              value={onglet}
              onValueChange={setOnglet}
              className="w-full mb-4">
              <TabsList className="grid w-full grid-cols-2 h-9 gap-1">
                <TabsTrigger
                  value="ots"
                  className="text-xs relative bg-surface">
                  Ordres de travail
                  {demandes.length > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {ots.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="demandes"
                  className="text-xs relative bg-surface">
                  Demandes en attente
                  {demandes.length > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {demandes.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {onglet === "ots" && (
              <div className="flex gap-2 mb-4 flex-wrap">
                <Select
                  value={filtreStatut || "all"}
                  onValueChange={(v) => {
                    setFiltreStatut(v === "all" ? "" : v);
                  }}>
                  <SelectTrigger className="w-40 h-9 text-xs">
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

                <Select
                  value={filtrePriorite || "all"}
                  onValueChange={(v) => {
                    setFiltrePriorite(v === "all" ? "" : v);
                  }}>
                  <SelectTrigger className="w-40 h-9 text-xs">
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
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0">
                  ↺
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {loading ? (
              <div className="space-y-3 mt-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-lg" />
                ))}
              </div>
            ) : onglet === "ots" ? (
              <div className="space-y-2">
                {otsTries.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-3xl mb-2">📋</p>
                    <p>Aucun OT trouvé</p>
                  </div>
                ) : (
                  otsTries.map((ot) => (
                    <motion.div
                      key={ot.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}>
                      <Card
                        onClick={() => {
                          setOtSelectionne(ot);
                          setPanneauOnglet("actions");
                        }}
                        className={`cursor-pointer border-l-4 transition-all ${
                          otSelectionne?.id === ot.id
                            ? "border-purple-500 bg-purple-500/5 ring-1 ring-purple-500/30"
                            : "border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"
                        } ${STATUT_COULEUR[ot.statut]}`}>
                        <CardContent className="p-4 bg-surface rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm text-purple-300 font-semibold">
                                {ot.numero}
                              </span>
                              {ot.est_en_retard && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="destructive"
                                      className="text-xs">
                                      ⚠ Retard
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Cette intervention a dépassé l'échéance SLA
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {ot.estBloquant && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="destructive"
                                      className="text-xs">
                                      🔴 Bloquant
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Cette intervention bloque la production
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {ot.estSousTraite && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs">
                                      🏢 ST
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Intervention sous-traitée
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Badge
                                variant={PRIORITE_VARIANT[ot.priorite]}
                                className="text-xs capitalize">
                                {ot.priorite}
                              </Badge>
                              <Badge
                                variant={STATUT_VARIANT[ot.statut]}
                                className="text-xs">
                                {STATUT_LABEL[ot.statut]}
                              </Badge>
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

                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700">
                            <div className="flex gap-3 text-xs text-gray-500">
                              <span className="relative flex items-center">
                                <MessageCircle size={18} />
                                <span className="absolute -bottom-1 -right-1 bg- bg-surface text-gray-500  font-bold text-sm/1 rounded-full h-3 w-2.5 flex items-center justify-center ">
                                  {ot.nb_commentaires || 0}
                                </span>
                              </span>

                              <span className="relative items-center gap-1">
                                <Wrench size={18} />
                                <span className="absolute -bottom-1 -right-1 bg-surface text-gray-500 font-bold text-sm/1 rounded-full h-3 w-3 flex items-center justify-center">
                                  {ot.nb_pieces_utilisees || 0}
                                </span>
                              </span>
                              <span className="relative items-center gap-1">
                                <User size={18} />
                                <span className="absolute -bottom-1 -right-1 bg-surface text-gray-500 font-bold text-sm/1 rounded-full h-3 w-3 flex items-center justify-center">
                                  {ot.affectations?.length || 0}
                                </span>
                              </span>
                            </div>
                            {ot.echeanceSLA && (
                              <span
                                className={`text-xs whitespace-nowrap ${
                                  ot.est_en_retard
                                    ? "text-red-400 font-medium"
                                    : "text-gray-500"
                                }`}>
                                SLA:{" "}
                                {new Date(ot.echeanceSLA).toLocaleString(
                                  "fr-FR",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3 mt-4">
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
                      animate={{ opacity: 1, x: 0 }}>
                      <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-mono text-sm text-purple-300 font-semibold">
                              {d.numero}
                            </span>
                            <Badge
                              variant={PRIORITE_VARIANT[d.urgence]}
                              className="text-xs capitalize">
                              {d.urgence}
                            </Badge>
                          </div>
                          <p className="text-sm font-semibold text-white">
                            {d.actif_detail?.code} — {d.actif_detail?.libelle}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {d.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(d.dateSignalement).toLocaleString(
                              "fr-FR",
                            )}
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
                              👁️ Voir détails
                            </button>
                            <Button
                              onClick={() => handleValider(d.id)}
                              size="sm"
                              className="flex-1 h-8">
                              ✓ Valider
                            </Button>
                            <Button
                              onClick={() => {
                                setModalRejet(d.id);
                                setMotifRejet("");
                              }}
                              variant="destructive"
                              size="sm"
                              className="flex-1 h-8">
                              ✗ Rejeter
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
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
              <Card className="border-0  ">
                <CardHeader className="pb-3 border-b border-gray-700 bg-black/50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono text-lg text-purple-300 font-bold">
                          {otSelectionne.numero}
                        </span>
                        <Badge variant={STATUT_VARIANT[otSelectionne.statut]}>
                          {STATUT_LABEL[otSelectionne.statut]}
                        </Badge>
                        {otSelectionne.est_en_retard && (
                          <Badge variant="destructive" className="text-xs">
                            ⚠ Retard
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-white/70 ">
                        {otSelectionne.actif_detail?.libelle}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => setOtSelectionne(null)}
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-8 w-8 p-0 ">
                      ✕
                    </Button>
                  </div>

                  <Tabs
                    value={panneauOnglet}
                    onValueChange={setPanneauOnglet}
                    className="w-full mt-4">
                    <TabsList className="grid grid-cols-3 gap-2 h-8">
                      <TabsTrigger
                        value="actions"
                        className="text-xs bg-surface">
                        Actions
                      </TabsTrigger>
                      <TabsTrigger value="infos" className="text-xs bg-surface">
                        Infos
                      </TabsTrigger>
                      <TabsTrigger
                        value="historique"
                        className="text-xs bg-surface">
                        Historique
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
              </Card>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/50 ">
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
                      <Card className="bg-surface border-0 pop-shadow">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">
                            Changer le statut
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 ">
                          {TRANSITIONS[otSelectionne.statut].map((s) => (
                            <Button
                              key={s}
                              onClick={() => {
                                setNvStatut(s);
                                setMotifStatut("");
                                setModalStatut(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="w-full justify-start gap-2">
                              → {STATUT_LABEL[s]}
                            </Button>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Clôturer */}
                    {otSelectionne.statut === "EN_VALIDATION" && (
                      <Button
                        onClick={handleCloturer}
                        disabled={submitting}
                        size="sm"
                        className="w-full">
                        ✅ Clôturer l'OT définitivement
                      </Button>
                    )}

                    {/* Affecter équipe */}
                    {["OUVERT", "EN_COURS"].includes(otSelectionne.statut) && (
                      <Card className="bg-surface border-0 pop-shadow">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">
                            Affecter une équipe / sous-traitant
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <AffectationForm
                            otId={otSelectionne.id}
                            onSuccess={charger}
                          />
                        </CardContent>
                      </Card>
                    )}

                    {/* Affectations existantes */}
                    {otSelectionne.affectations?.length > 0 && (
                      <Card className="bg-surface border-0 pop-shadow">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">
                            Affectations en cours (
                            {otSelectionne.affectations.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {otSelectionne.affectations.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between p-2 bg-gray-800 rounded-lg border border-gray-700">
                              <div>
                                <p className="text-xs font-medium text-white">
                                  {a.equipe_detail?.libelle ||
                                    a.soustraitant_detail?.raisonSociale ||
                                    "—"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(a.dateDebut).toLocaleString(
                                    "fr-FR",
                                  )}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  a.statut === "termine"
                                    ? "default"
                                    : a.statut === "en_cours"
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-xs">
                                {a.statut}
                              </Badge>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Commentaire */}
                    <Card className="bg-surface border-0 pop-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">
                          Compte rendu / Commentaire
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Button
                          onClick={() => setModalComment(true)}
                          variant="outline"
                          size="sm"
                          className="w-full">
                          ✏️ Saisir compte rendu
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Voir détail */}
                    <Button
                      onClick={() =>
                        navigate(`/ordres/ots/${otSelectionne.id}`)
                      }
                      variant="outline"
                      size="sm"
                      className="w-full">
                      Voir détail complet →
                    </Button>
                  </motion.div>
                )}

                {/* ── Infos ── */}
                {panneauOnglet === "infos" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-1">
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
                        className="flex justify-between text-sm py-2 px-2 border-b border-gray-700 last:border-0">
                        <span className="text-gray-400 font-medium">{l}</span>
                        <span className="text-white font-semibold text-right max-w-[55%] break-words">
                          {v}
                        </span>
                      </div>
                    ))}
                    {otSelectionne.description && (
                      <Card className="mt-3">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs">Description</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-gray-300">
                          {otSelectionne.description}
                        </CardContent>
                      </Card>
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
                        <Card key={h.id} className="bg-gray-800">
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-2 flex-wrap mb-2">
                              {h.ancienStatut && (
                                <>
                                  <Badge
                                    variant={STATUT_VARIANT[h.ancienStatut]}
                                    className="text-xs">
                                    {STATUT_LABEL[h.ancienStatut]}
                                  </Badge>
                                  <span className="text-gray-500 text-xs">
                                    →
                                  </span>
                                </>
                              )}
                              <Badge
                                variant={STATUT_VARIANT[h.nouveauStatut]}
                                className="text-xs">
                                {STATUT_LABEL[h.nouveauStatut]}
                              </Badge>
                            </div>
                            {h.motif && (
                              <p className="text-xs text-gray-400 mb-2">
                                {h.motif}
                              </p>
                            )}
                            <span className="text-xs text-gray-500">
                              {new Date(h.dateChangement).toLocaleString(
                                "fr-FR",
                              )}
                            </span>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Modal changer statut ── */}
        <Dialog open={modalStatut} onOpenChange={setModalStatut}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirmer le changement</DialogTitle>
              <DialogDescription>
                {otSelectionne?.numero} →{" "}
                <Badge variant={STATUT_VARIANT[nvStatut]} className="ml-2">
                  {STATUT_LABEL[nvStatut]}
                </Badge>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="motif-statut" className="text-sm">
                  Motif / compte rendu (optionnel)
                </Label>
                <Textarea
                  id="motif-statut"
                  value={motifStatut}
                  onChange={(e) => setMotifStatut(e.target.value)}
                  placeholder="Décrivez les raisons du changement..."
                  className="resize-none h-24 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setModalStatut(false)}
                variant="outline"
                size="sm">
                Annuler
              </Button>
              <Button
                onClick={handleChangerStatut}
                disabled={submitting}
                size="sm">
                {submitting ? "..." : "Confirmer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Modal rejet DI ── */}
        <Dialog open={!!modalRejet} onOpenChange={() => setModalRejet(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Motif de rejet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="motif-rejet" className="text-sm">
                  Motif
                </Label>
                <Textarea
                  id="motif-rejet"
                  value={motifRejet}
                  onChange={(e) => setMotifRejet(e.target.value)}
                  placeholder="Expliquez pourquoi cette demande est rejetée..."
                  className="resize-none h-24 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setModalRejet(null)}
                variant="outline"
                size="sm">
                Annuler
              </Button>
              <Button onClick={handleRejeter} variant="destructive" size="sm">
                Rejeter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Modal commentaire ── */}
        <Dialog open={modalComment} onOpenChange={setModalComment}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Compte rendu / Commentaire</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="commentaire-text" className="text-sm">
                  Détails du travail réalisé
                </Label>
                <Textarea
                  id="commentaire-text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Décrivez les travaux réalisés, observations, pièces utilisées..."
                  className="resize-none h-32 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="est-interne"
                  checked={estInterne}
                  onCheckedChange={setEstInterne}
                />
                <Label
                  htmlFor="est-interne"
                  className="text-sm font-normal cursor-pointer">
                  Commentaire interne (non visible par l'opérateur)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setModalComment(false)}
                variant="outline"
                size="sm">
                Annuler
              </Button>
              <Button
                onClick={handleCommentaire}
                disabled={submitting || !newComment.trim()}
                size="sm">
                {submitting ? "..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Modal Affectation Automatique ── */}
        <Dialog
          open={modalAffectationAuto}
          onOpenChange={setModalAffectationAuto}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>✅ Nouvel OT créé</DialogTitle>
              <DialogDescription>
                <span className="font-mono text-purple-300">
                  {otAffectationAuto?.numero}
                </span>{" "}
                - {otAffectationAuto?.actif_detail?.code}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-white font-medium">
                Qui allez-vous affecter à cette intervention ?
              </p>
              {otAffectationAuto && (
                <AffectationForm
                  otId={otAffectationAuto.id}
                  onSuccess={() => {
                    setModalAffectationAuto(false);
                    charger();
                  }}
                />
              )}

              {/* ── Modal Détails Demande ────────────────────────── */}
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
                      <button
                        onClick={() => setDemandeDetail(null)}
                        className="text-gray-400 hover:text-white text-2xl">
                        <X size={24} />
                      </button>
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
                          {/* Créée par */}
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

                          {/* Validée/OT créé */}
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

                      {/* Audio Recordings - PROMINENT */}
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
                                  Écoutez les enregistrements audio de
                                  l'opérateur
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {demandeDetail.pieces_jointes
                                .filter((p) =>
                                  p.typeFichier?.startsWith("audio"),
                                )
                                .map((piece, idx) => (
                                  <div
                                    key={idx}
                                    className={`bg-blue-600/20 border border-blue-500/40 rounded-lg p-3 hover:bg-blue-600/30 transition ${
                                      playingAudioId === piece.id
                                        ? "ring-2 ring-blue-400 bg-blue-600/40"
                                        : ""
                                    }`}>
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() =>
                                          playAudio(piece.url, piece.id)
                                        }
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
                                      </button>
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
                            {new Date(
                              demandeDetail.dateSignalement,
                            ).toLocaleString("fr-FR")}
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
                                .filter(
                                  (p) => !p.typeFichier?.startsWith("audio"),
                                )
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

                      {/* Images principales */}
                      {/* Removed - Images already shown in Fichiers attachés section */}
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-6 flex gap-3">
                      <button
                        onClick={() => setDemandeDetail(null)}
                        className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition text-gray-300">
                        Fermer
                      </button>
                      <button
                        onClick={() => {
                          handleValider(demandeDetail.id);
                          setDemandeDetail(null);
                        }}
                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition text-white">
                        ✓ Valider
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={() => setModalAffectationAuto(false)}
                variant="outline"
                size="sm"
                className="w-full">
                Ignorer pour maintenant
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
