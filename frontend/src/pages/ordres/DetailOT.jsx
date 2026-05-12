import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getOT,
  changerStatutOT,
  ajouterCommentaire,
  getCommentaires,
  getHistoriqueOT,
} from "../../services/ordreService";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Lock,
  ChevronRight,
  Users,
  Package,
  MessageSquare,
  History,
  CalendarDays,
  CalendarCheck,
  Briefcase,
  UserCheck,
  BadgeDollarSign,
  Star,
  Shield,
} from "lucide-react";
import DialogAffectation from "@/components/DialogAffectation";
import useAuthStore from "@/store/authStore";
import { div } from "framer-motion/client";
// ─── Statuts ──────────────────────────────────────────────────────────────────
const STATUT = {
  EN_COURS: {
    label: "En cours",
    variant: "warning",
    cls: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/40",
  },
  DEPANNE: {
    label: "Dépanné",
    cls: "bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/40",
  },
  CLOTURE: {
    label: "Clôturé",
    cls: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40",
  },
  REJETE: {
    label: "Rejeté",
    cls: "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/40",
  },
};

// ─── Sub-component : ligne de données ─────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-muted min-w-[120px] flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-xs font-medium text-text text-right">
        {value || "—"}
      </span>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function DetailOT() {
  const { id } = useParams();
  const user = useAuthStore();

  const navigate = useNavigate();

  const [modalAffectation, setModalAffectation] = useState(false);

  const [ot, setOT] = useState(null);
  const [commentaires, setCommentaires] = useState([]);
  const [historique, setHistorique] = useState([]);
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

  const estVerrouille = ["DEPANNE", "CLOTURE", "REJETE"].includes(ot?.statut);

  // ─── Chargement ─────────────────────────────────────────────────────────────
  const charger = async () => {
    try {
      const [o, c, h] = await Promise.all([
        getOT(id),
        getCommentaires(id),
        getHistoriqueOT(id),
      ]);
      setOT(o.data);
      setCommentaires(c.data.results ?? c.data);
      setHistorique(h.data.results ?? h.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, [id]);

  // ─── Actions ─────────────────────────────────────────────────────────────────
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

  const handleCommentaire = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await ajouterCommentaire(id, newComment, estInterne);
    setNewComment("");
    setEstInterne(false);
    charger();
  };

  // ─── États de chargement ─────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-text-muted animate-pulse">Chargement…</p>
      </div>
    );

  if (!ot)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-red-500">OT introuvable.</p>
      </div>
    );

  const s = STATUT[ot.statut];

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          {/* Retour */}
          <button
            onClick={() => navigate("/ordres/ots")}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors mb-2">
            <ArrowLeft size={13} />
            Retour aux OTs
          </button>

          {/* Titre + badge statut */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold font-mono text-text tracking-tight">
              {ot.numero}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${s?.cls}`}>
              {s?.label}
            </span>
            {ot.est_en_retard && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/40">
                <AlertTriangle size={11} />
                Retard
              </span>
            )}
          </div>

          <p className="text-sm text-text-muted">
            {ot.actif_detail?.code} — {ot.actif_detail?.libelle}
          </p>
        </div>

        {/* Actions */}
        {estVerrouille ? (
          <div className="flex items-center gap-1.5 text-xs text-text-muted bg-surface border border-border rounded-lg px-3 py-2">
            <Lock size={12} />
            OT verrouillé
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalDepanne(true)}
              className="gap-2 border-orange-300 dark:border-orange-500/40 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10">
              <Wrench size={14} />
              Dépanné
            </Button>
            <Button
              size="sm"
              onClick={() => setModalCloture(true)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 size={14} />
              Clôturer
            </Button>
          </div>
        )}
      </div>

      {/* ── Infos & Délais ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Informations générales */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mb-3">
            Informations générales
          </p>
          <InfoRow
            label="Actif"
            value={`${ot.actif_detail?.code} — ${ot.actif_detail?.libelle}`}
          />
          <InfoRow label="Type" value={ot.type} />
          <InfoRow label="Priorité" value={ot.priorite} />
          <InfoRow
            label="Sous-traité"
            value={ot.estSousTraite ? "Oui" : "Non"}
          />
          <InfoRow label="Description" value={ot.description} />
        </div>

        {/* Délais & Coûts */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mb-3">
            Délais &amp; Coûts
          </p>
          <InfoRow
            label="Échéance SLA"
            value={
              ot.echeanceSLA
                ? new Date(ot.echeanceSLA).toLocaleString("fr-FR")
                : null
            }
          />
          <InfoRow
            label="Durée estimée"
            value={ot.dureeEstimeeMin ? `${ot.dureeEstimeeMin} min` : null}
          />
          <InfoRow
            label="Durée réelle"
            value={ot.dureeReelleMin ? `${ot.dureeReelleMin} min` : null}
          />
          <InfoRow
            label="Coût M.O."
            value={ot.coutMainOeuvre ? `${ot.coutMainOeuvre} MAD` : null}
          />
          <InfoRow
            label="Coût ST"
            value={ot.coutSousTraitance ? `${ot.coutSousTraitance} MAD` : null}
          />
          <InfoRow label="Coût total" value={`${ot.cout_total} MAD`} />
        </div>
      </div>

      {/* ── Onglets ────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="affectations" className="w-full">
        <TabsList className="bg-surface border border-border p-1 h-auto rounded-xl gap-0.5">
          {[
            {
              value: "affectations",
              icon: <Users size={13} />,
              label: "Affectations",
              count: ot.affectations?.length || 0,
            },
            {
              value: "pieces",
              icon: <Package size={13} />,
              label: "Pièces",
              count: ot.nb_pieces_utilisees || 0,
            },
            {
              value: "commentaires",
              icon: <MessageSquare size={13} />,
              label: "Commentaires",
              count: commentaires.length,
            },
            {
              value: "historique",
              icon: <History size={13} />,
              label: "Historique",
              count: historique.length,
            },
          ].map(({ value, icon, label, count }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-elevated data-[state=active]:shadow-sm data-[state=active]:text-text text-text-muted transition-all">
              {icon}
              {label}
              <span className="text-[10px] px-1.5 py-0 rounded-full bg-border text-text-muted ml-0.5">
                {count}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Affectations ──────────────────────────────────────────────────── */}
        <TabsContent value="affectations" className="mt-3">
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            {!ot.affectations?.length ? (
              <div className="py-8 flex flex-col items-center gap-3">
                <p className="text-xs text-text-muted">Aucune affectation</p>
                {!estVerrouille && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setModalAffectation(true)}
                    className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5">
                    <UserCheck size={12} />
                    Ajouter une affectation
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Header résumé */}
                <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {ot.affectations.length} affectation
                    {ot.affectations.length > 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      OT · {ot.numero}
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setModalAffectation(true)}
                      className="h-6 px-2 text-[11px] gap-1 border-primary/30 text-primary hover:bg-primary/5">
                      <UserCheck size={11} />
                      Affecter
                    </Button>
                  </div>
                </div>

                {ot.affectations.map((a, idx) => {
                  const isTermine = a.statut === "termine";
                  const isEnCours = a.statut === "en_cours";
                  const isEnAttente = a.statut === "en_attente";

                  const statutConfig = isTermine
                    ? {
                        label: "Terminé",
                        cls: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40",
                        dot: "bg-emerald-500",
                      }
                    : isEnCours
                      ? {
                          label: "En cours",
                          cls: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/40",
                          dot: "bg-amber-500",
                        }
                      : {
                          label: "En attente",
                          cls: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/40",
                          dot: "bg-blue-400",
                        };

                  const estSousTraitee = !!a.idSousTraitant;
                  const nomIntervenant =
                    a.equipe_detail?.libelle ??
                    a.soustraitant_detail?.raisonSociale ??
                    null;

                  const dureeMs = a.dateFin
                    ? new Date(a.dateFin) - new Date(a.dateDebut)
                    : null;
                  const dureeH = dureeMs ? Math.floor(dureeMs / 3600000) : null;
                  const dureeMin = dureeMs
                    ? Math.floor((dureeMs % 3600000) / 60000)
                    : null;

                  return (
                    <div
                      key={a.id}
                      className="relative bg-elevated border border-border-subtle rounded-xl overflow-hidden">
                      {/* Barre latérale colorée */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${statutConfig.dot}`}
                      />

                      <div className="pl-4 pr-4 py-4 space-y-3">
                        {/* Ligne 1 : Intervenant + Statut */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                              {estSousTraitee ? (
                                <Briefcase size={14} className="text-primary" />
                              ) : (
                                <Users size={14} className="text-primary" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-text truncate">
                                {nomIntervenant ?? (
                                  <span className="italic text-text-muted font-normal">
                                    {a.idChefTechnicien
                                      ? "Chef technicien assigné"
                                      : "Non assigné"}
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-text-muted mt-0.5">
                                {estSousTraitee
                                  ? "Sous-traitant"
                                  : a.idEquipe
                                    ? "Équipe interne"
                                    : "Technicien"}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${statutConfig.cls}`}>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statutConfig.dot}`}
                            />
                            {statutConfig.label}
                          </span>
                        </div>

                        {/* Séparateur */}
                        <div className="border-t border-border-subtle" />

                        {/* Grille d'informations */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                          {/* Début */}
                          <div className="flex items-start gap-2">
                            <CalendarDays
                              size={13}
                              className="text-text-muted mt-0.5 shrink-0"
                            />
                            <div>
                              <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
                                Début
                              </p>
                              <p className="text-xs text-text font-medium">
                                {new Date(a.dateDebut).toLocaleDateString(
                                  "fr-FR",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </p>
                              <p className="text-[11px] text-text-muted">
                                {new Date(a.dateDebut).toLocaleTimeString(
                                  "fr-FR",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Fin */}
                          <div className="flex items-start gap-2">
                            <CalendarCheck
                              size={13}
                              className="text-text-muted mt-0.5 shrink-0"
                            />
                            <div>
                              <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
                                Fin
                              </p>
                              {a.dateFin ? (
                                <>
                                  <p className="text-xs text-text font-medium">
                                    {new Date(a.dateFin).toLocaleDateString(
                                      "fr-FR",
                                      {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      },
                                    )}
                                  </p>
                                  <p className="text-[11px] text-text-muted">
                                    {new Date(a.dateFin).toLocaleTimeString(
                                      "fr-FR",
                                      { hour: "2-digit", minute: "2-digit" },
                                    )}
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs text-text-muted italic">
                                  En cours…
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Durée */}
                          {dureeMs !== null && (
                            <div className="flex items-start gap-2">
                              <Clock
                                size={13}
                                className="text-text-muted mt-0.5 shrink-0"
                              />
                              <div>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
                                  Durée
                                </p>
                                <p className="text-xs text-text font-medium">
                                  {dureeH}h{" "}
                                  {dureeMin > 0 ? `${dureeMin}min` : ""}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Coût prestation */}
                          <div className="flex items-start gap-2">
                            <BadgeDollarSign
                              size={13}
                              className="text-text-muted mt-0.5 shrink-0"
                            />
                            <div>
                              <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
                                Coût prestation
                              </p>
                              <p className="text-xs text-text font-medium">
                                {a.coutPrestation != null ? (
                                  `${Number(a.coutPrestation).toLocaleString("fr-FR")} MAD`
                                ) : (
                                  <span className="text-text-muted italic">
                                    —
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Membres */}
                          <div className="flex items-start gap-2 col-span-2">
                            <UserCheck
                              size={13}
                              className="text-text-muted mt-0.5 shrink-0"
                            />
                            <div>
                              <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
                                Membres
                              </p>
                              {a.membres?.length ? (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {a.membres.map((m, i) => (
                                    <span
                                      key={i}
                                      className="text-[11px] px-2 py-0.5 rounded-full bg-surface border border-border text-text-muted">
                                      {m.prenom ??
                                        m.nom ??
                                        m.id ??
                                        `Membre ${i + 1}`}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-text-muted italic">
                                  Aucun membre
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Évaluation sous-traitant */}
                          {estSousTraitee && (
                            <div className="flex items-start gap-2 col-span-2">
                              <Star
                                size={13}
                                className="text-text-muted mt-0.5 shrink-0"
                              />
                              <div>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
                                  Évaluation
                                </p>
                                {a.evaluationSousTraitant != null ? (
                                  <div className="flex gap-0.5 mt-0.5">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                      <Star
                                        key={n}
                                        size={12}
                                        className={
                                          n <= a.evaluationSousTraitant
                                            ? "text-amber-400 fill-amber-400"
                                            : "text-border"
                                        }
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-text-muted italic">
                                    Non évaluée
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Footer : ID discret */}
                        <div className="pt-1 border-t border-border-subtle flex items-center justify-between">
                          <p
                            className="text-[10px] text-text-muted font-mono truncate"
                            title={a.id}>
                            #{a.id.split("-")[0].toUpperCase()}
                          </p>
                          {a.idChefTechnicien && (
                            <p className="text-[10px] text-text-muted flex items-center gap-1">
                              <Shield size={10} />
                              Chef assigné
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
          <DialogAffectation
            open={modalAffectation}
            onOpenChange={setModalAffectation}
            idOT={id}
            numeroOT={ot.numero}
            onSuccess={charger}
          />
        </TabsContent>

        {/* ── Pièces ────────────────────────────────────────────────────────── */}

        <TabsContent value="pieces" className="mt-3">
          <div className="bg-surface border border-border rounded-xl p-4">
            {!ot.pieces_utilisees?.length ? (
              <EmptyState message="Aucune pièce utilisée" />
            ) : (
              <div className="space-y-3">
                {/* ── En-tête ──────────────────────────────────────────────── */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-3 pb-1 border-b border-border">
                  <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">
                    Pièce
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold text-right w-20">
                    Quantité
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold text-right w-24">
                    P.U. capturé
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold text-right w-24">
                    Coût total
                  </span>
                </div>

                {/* ── Lignes ───────────────────────────────────────────────── */}
                {ot.pieces_utilisees.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center p-3 bg-elevated border border-border-subtle rounded-lg">
                    {/* Infos pièce */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono font-semibold text-text">
                          {p.piece_detail?.reference ?? "—"}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {new Date(p.dateUtilisation).toLocaleDateString(
                            "fr-FR",
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {p.piece_detail?.designation ?? "—"}
                      </p>
                    </div>

                    {/* Quantité */}
                    <span className="text-sm font-semibold text-text tabular-nums text-right w-20">
                      {Number(p.quantite).toLocaleString("fr-FR")}
                    </span>

                    {/* Prix unitaire capturé */}
                    <span className="text-sm text-text-muted tabular-nums text-right w-24">
                      {p.prixUnitaireCapture
                        ? `${Number(p.prixUnitaireCapture).toLocaleString("fr-FR")} MAD`
                        : "—"}
                    </span>

                    {/* Coût total */}
                    <span className="text-sm font-semibold text-text tabular-nums text-right w-24">
                      {p.cout_total != null
                        ? `${Number(p.cout_total).toLocaleString("fr-FR")} MAD`
                        : "—"}
                    </span>
                  </div>
                ))}

                {/* ── Ligne total ──────────────────────────────────────────── */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-3 pt-2 border-t border-border">
                  <span className="text-xs font-semibold text-text">
                    Total pièces ({ot.pieces_utilisees.length})
                  </span>
                  <span className="w-20" />
                  <span className="w-24" />
                  <span className="text-sm font-bold text-text tabular-nums text-right w-24">
                    {ot.pieces_utilisees
                      .reduce((acc, p) => acc + Number(p.cout_total ?? 0), 0)
                      .toLocaleString("fr-FR")}{" "}
                    MAD
                  </span>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Commentaires ──────────────────────────────────────────────────── */}
        <TabsContent value="commentaires" className="mt-3">
          <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
            {/* Liste */}
            <div className="flex flex-col gap-3">
              {commentaires.length === 0 ? (
                <EmptyState message="Aucun commentaire" />
              ) : (
                commentaires.map((c) => {
                  const isOwn = c.idUtilisateur == user.user.id;
                  return (
                    <div
                      key={c.id}
                      className={`flex flex-col gap-1 ${isOwn ? "items-start" : "items-end"}`}>
                      {/* Nom + heure */}
                      <div
                        className={`flex items-center gap-2 px-1 ${isOwn ? "flex-row" : "flex-row-reverse"}`}>
                        <span className="text-[11px] font-medium text-text-muted">
                          {isOwn
                            ? "Vous"
                            : `${c.utilisateur_detail?.prenom} ${c.utilisateur_detail?.nom}`}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {new Date(c.dateCreation).toLocaleString("fr-FR")}
                        </span>
                        {c.estInterne && (
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-1.5 py-0 rounded">
                            Interne
                          </span>
                        )}
                      </div>

                      {/* Bulle */}
                      {isOwn ? (
                        <div
                          className={
                            "max-w-[75%] px-4 py-2.5 text-sm leading-relaxed rounded-2xl border rounded-tl-sm bg-blue-600 text-white border-blue-700"
                          }>
                          {c.commentaire}
                        </div>
                      ) : (
                        <div
                          className={
                            "max-w-[75%] px-4 py-2.5 text-sm leading-relaxed rounded-2xl border rounded-tr-sm bg-elevated text-text border-border-subtle"
                          }>
                          {c.commentaire}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Formulaire */}
            <form
              onSubmit={handleCommentaire}
              className="flex items-center gap-2 pt-2 border-t border-border">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire…"
                className="flex-1 bg-elevated border border-border text-text placeholder:text-text-muted rounded-full px-4 py-2 text-sm outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
              />
              <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={estInterne}
                  onChange={(e) => setEstInterne(e.target.checked)}
                  className="accent-amber-500 w-3.5 h-3.5"
                />
                Interne
              </label>
              <Button type="submit" size="sm" className="gap-1.5 rounded-full">
                <Send size={13} />
                Envoyer
              </Button>
            </form>
          </div>
        </TabsContent>
        {/* ── Historique ────────────────────────────────────────────────────── */}
        <TabsContent value="historique" className="mt-3">
          <div className="bg-surface border border-border rounded-xl p-4">
            {historique.length === 0 ? (
              <EmptyState message="Aucun historique" />
            ) : (
              <div className="space-y-2">
                {historique.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 p-3 bg-elevated border border-border-subtle rounded-lg">
                    {/* Transition statuts */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {h.ancienStatut && (
                        <>
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded border ${STATUT[h.ancienStatut]?.cls}`}>
                            {STATUT[h.ancienStatut]?.label}
                          </span>
                          <ChevronRight size={12} className="text-text-muted" />
                        </>
                      )}
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded border ${STATUT[h.nouveauStatut]?.cls}`}>
                        {STATUT[h.nouveauStatut]?.label}
                      </span>
                    </div>

                    {/* Motif */}
                    <div className="flex-1 min-w-0">
                      {h.motif && (
                        <p className="text-xs text-text-muted truncate">
                          {h.motif}
                        </p>
                      )}
                    </div>

                    {/* Date */}
                    <span className="text-[11px] text-text-muted flex-shrink-0">
                      {new Date(h.dateChangement).toLocaleString("fr-FR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════════════════════════════════
          Dialog — Dépanné
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={modalDepanne} onOpenChange={setModalDepanne}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Wrench
                  size={16}
                  className="text-orange-600 dark:text-orange-400"
                />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold leading-tight">
                  Marquer comme Dépanné
                </DialogTitle>
                <p className="text-xs text-text-muted font-mono mt-0.5">
                  {ot.numero}
                </p>
              </div>
            </div>
            <DialogDescription className="text-xs">
              L'OT <span className="font-mono text-text">{ot.numero}</span>{" "}
              passera au statut <strong>Dépanné</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-1">
            <Label className="text-xs font-medium">
              Motif{" "}
              <span className="text-text-muted font-normal">(optionnel)</span>
            </Label>
            <textarea
              value={motifDepanne}
              onChange={(e) => setMotifDepanne(e.target.value)}
              placeholder="Décrivez l'action de dépannage effectuée…"
              rows={4}
              className="w-full bg-elevated border border-border text-text placeholder:text-text-muted rounded-lg px-3 py-2 text-sm outline-none resize-none focus:border-orange-400 dark:focus:border-orange-500 transition-colors"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="customOutline"
              onClick={() => {
                setModalDepanne(false);
                setMotifDepanne("");
              }}>
              Annuler
            </Button>
            <Button
              onClick={handleDepanner}
              disabled={loadingDepanne}
              className="gap-2 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50">
              {!loadingDepanne && <ChevronRight size={14} />}
              {loadingDepanne ? "Enregistrement…" : "Confirmer le dépannage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          Dialog — Clôturer
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={modalCloture} onOpenChange={setModalCloture}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2
                  size={16}
                  className="text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold leading-tight">
                  Clôturer l'ordre de travail
                </DialogTitle>
                <p className="text-xs text-text-muted font-mono mt-0.5">
                  {ot.numero}
                </p>
              </div>
            </div>
            <DialogDescription className="text-xs">
              L'OT <span className="font-mono text-text">{ot.numero}</span> sera
              définitivement clôturé.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-1">
            <Label className="text-xs font-medium">
              Rapport de clôture{" "}
              <span className="text-text-muted font-normal">(optionnel)</span>
            </Label>
            <textarea
              value={motifCloture}
              onChange={(e) => setMotifCloture(e.target.value)}
              placeholder="Décrivez les travaux effectués et le résultat final…"
              rows={4}
              className="w-full bg-elevated border border-border text-text placeholder:text-text-muted rounded-lg px-3 py-2 text-sm outline-none resize-none focus:border-emerald-400 dark:focus:border-emerald-500 transition-colors"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="customOutline"
              onClick={() => {
                setModalCloture(false);
                setMotifCloture("");
                setTypeCloture("corrige");
              }}>
              Annuler
            </Button>
            <Button
              onClick={handleCloturer}
              disabled={loadingCloture}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
              {!loadingCloture && <ChevronRight size={14} />}
              {loadingCloture ? "Clôture en cours…" : "Clôturer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
function EmptyState({ message }) {
  return <p className="text-center text-xs text-text-muted py-8">{message}</p>;
}
