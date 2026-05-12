import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Wrench, ChevronRight, X } from "lucide-react";
import { getOTs, validerOT } from "../../services/ordreService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const prioriteStyles = {
  critique: {
    bg: "bg-red-100 dark:bg-red-500/10",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-300 dark:border-red-500/40",
    dot: "bg-red-500",
  },
  haute: {
    bg: "bg-orange-100 dark:bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-300 dark:border-orange-500/40",
    dot: "bg-orange-500",
  },
  normale: {
    bg: "bg-blue-100 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-300 dark:border-blue-500/40",
    dot: "bg-blue-500",
  },
};

const statutLabel = {
  CLOTURE: "Clôturé",
  DEPANNE: "Dépanné",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ValidationOperateur() {
  const [ots, setOTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { ot, type: 'ok'|'panne' }
  const [motif, setMotif] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  const charger = async () => {
    setLoading(true);
    try {
      const res = await getOTs({ isvalide: "false" });
      const data = res.data.results || res.data || [];
      const liste = Array.isArray(data) ? data : [];
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
    setSubmitting(true);
    setErreur("");
    try {
      if (modal.type === "ok") {
        await validerOT(
          modal.ot.id,
          true,
          motif || "Intervention validée par opérateur, équipement fonctionnel",
        );
        setMessage("Intervention validée. Merci pour votre confirmation.");
      } else {
        await validerOT(
          modal.ot.id,
          false,
          motif ||
            "Problème persistant signalé par opérateur, intervention à reprendre",
        );
        setMessage("Signalement enregistré. Le responsable a été notifié.");
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

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">
            Validation des interventions
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Confirmez le bon fonctionnement des équipements après intervention
          </p>
        </div>
        {!loading && ots.length > 0 && (
          <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/40">
            {ots.length} en attente
          </span>
        )}
      </div>

      {/* Toasts */}
      {message && (
        <div className="flex items-center justify-between gap-3 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 rounded-xl px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle size={15} />
            <span>{message}</span>
          </div>
          <button
            onClick={() => setMessage("")}
            className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {erreur && (
        <div className="flex items-center justify-between gap-3 bg-red-100 dark:bg-red-500/10 border border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <XCircle size={15} />
            <span>{erreur}</span>
          </div>
          <button
            onClick={() => setErreur("")}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <p className="text-center text-text-muted py-16">Chargement...</p>
      ) : ots.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle
              size={26}
              className="text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <p className="font-semibold text-text">Tout est à jour</p>
          <p className="text-text-muted text-sm mt-1">
            Aucune intervention en attente de validation
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ots.map((ot) => {
            const prio = prioriteStyles[ot.priorite] || prioriteStyles.normale;
            return (
              <div
                key={ot.id}
                className="bg-surface border border-border rounded-xl p-5 hover:bg-hover transition-colors">
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Wrench
                        size={17}
                        className="text-amber-600 dark:text-amber-400"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-text">
                          {ot.numero}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 font-medium">
                          {statutLabel[ot.statut] || ot.statut}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-text mt-0.5">
                        {ot.actif_detail?.libelle}
                      </p>
                      <p className="text-xs text-text-muted font-mono">
                        {ot.actif_detail?.code}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${prio.bg} ${prio.text} ${prio.border}`}>
                    {ot.priorite}
                  </span>
                </div>

                {/* Intervention details */}
                <div className="bg-elevated rounded-lg border border-border-subtle p-3.5 mb-4 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mb-2">
                    Résumé de l'intervention
                  </p>

                  {ot.description && (
                    <Row label="Description" value={ot.description} />
                  )}
                  {ot.dureeReelleMin && (
                    <Row
                      label="Durée réelle"
                      value={`${ot.dureeReelleMin} min`}
                    />
                  )}
                  {ot.affectations?.length > 0 && (
                    <Row
                      label="Intervenant(s)"
                      value={ot.affectations
                        .map(
                          (a) =>
                            a.equipe_detail?.libelle ||
                            a.soustraitant_detail?.raisonSociale,
                        )
                        .filter(Boolean)
                        .join(", ")}
                    />
                  )}
                  {ot.nb_pieces_utilisees > 0 && (
                    <Row
                      label="Pièces utilisées"
                      value={`${ot.nb_pieces_utilisees} pièce(s)`}
                    />
                  )}
                  {ot.typeCloture && (
                    <Row
                      label="Type clôture"
                      value={
                        ot.typeCloture === "corrige"
                          ? "Corrigé définitivement"
                          : "Dépanné temporairement"
                      }
                    />
                  )}
                </div>

                {/* Operator notice */}
                <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-lg px-4 py-3 mb-4">
                  <p className="text-blue-700 dark:text-blue-400 text-xs font-medium">
                    Veuillez tester <strong>{ot.actif_detail?.libelle}</strong>{" "}
                    avant de confirmer. Votre validation est requise pour la
                    traçabilité.
                  </p>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      setModal({ ot, type: "ok" });
                      setMotif("");
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold
                      bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400
                      border border-emerald-300 dark:border-emerald-500/40
                      hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors">
                    <CheckCircle size={15} />
                    Équipement OK
                  </button>
                  <button
                    onClick={() => {
                      setModal({ ot, type: "panne" });
                      setMotif("");
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold
                      bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400
                      border border-red-300 dark:border-red-500/40
                      hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors">
                    <XCircle size={15} />
                    Toujours en panne
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dialog shadcn ── */}
      <Dialog open={!!modal} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  modal?.type === "ok"
                    ? "bg-emerald-100 dark:bg-emerald-500/10"
                    : "bg-red-100 dark:bg-red-500/10"
                }`}>
                {modal?.type === "ok" ? (
                  <CheckCircle
                    size={16}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                ) : (
                  <XCircle
                    size={16}
                    className="text-red-600 dark:text-red-400"
                  />
                )}
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold leading-tight">
                  {modal?.type === "ok"
                    ? "Confirmer la remise en service"
                    : "Signaler une panne persistante"}
                </DialogTitle>
                <p className="text-xs text-text-muted font-mono mt-0.5">
                  {modal?.ot?.numero}
                </p>
              </div>
            </div>
            <DialogDescription className="text-xs">
              {modal?.type === "ok"
                ? `L'OT ${modal?.ot?.numero} sera clôturé définitivement après confirmation.`
                : `L'OT ${modal?.ot?.numero} sera renvoyé en intervention et le responsable notifié.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-1">
            <Label className="text-xs font-medium">
              {modal?.type === "ok"
                ? "Observations (optionnel)"
                : "Description du problème"}
            </Label>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder={
                modal?.type === "ok"
                  ? "Ex : machine testée 10 min, fonctionnement normal"
                  : "Ex : bruit toujours présent au démarrage"
              }
              rows={3}
              className="w-full bg-elevated border border-border text-text placeholder:text-text-muted
                rounded-lg px-3 py-2 text-sm outline-none resize-none
                focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="customOutline" onClick={() => setModal(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirmer}
              disabled={submitting}
              className={`flex items-center gap-2 disabled:opacity-50 ${
                modal?.type === "ok"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}>
              {!submitting && <ChevronRight size={14} />}
              {submitting
                ? "Enregistrement..."
                : modal?.type === "ok"
                  ? "Confirmer OK"
                  : "Signaler la panne"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-component ─────────────────────────────────────────────────────────────

function Row({ label, value }) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="text-text-muted min-w-[110px] flex-shrink-0">
        {label}
      </span>
      <span className="text-text-secondary">{value}</span>
    </div>
  );
}
