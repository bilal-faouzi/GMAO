import { useEffect, useState } from "react";
import { Monitor, Wifi, WifiOff, LogOut, RefreshCw } from "lucide-react";
import { getSessions, forcedLogout } from "@/services/securiteService";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formatDate = (d) =>
  new Date(d).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forcing, setForcing] = useState(null);

  //  Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    session: null,
    errorMessage: null,
  });

  async function fetchSessions() {
    try {
      setLoading(true);
      const res = await getSessions();
      setSessions(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSessions();
  }, []);

  function handleForceLogout(session) {
    setConfirmDialog({ open: true, session, errorMessage: null });
  }

  async function handleConfirmLogout() {
    const session = confirmDialog.session;
    try {
      setForcing(session.id);
      setConfirmDialog((prev) => ({ ...prev, open: false }));
      await forcedLogout(session.id);
      fetchSessions();
    } catch (err) {
      setConfirmDialog({
        open: true,
        session: null,
        errorMessage:
          err.response?.data?.detail || "Erreur lors de la déconnexion.",
      });
    } finally {
      setForcing(null);
    }
  }

  const actives = sessions.filter((s) => s.est_active);
  const inactives = sessions.filter((s) => !s.est_active);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Sessions</h1>
          <p className="text-text-secondary text-sm mt-1">
            Surveillance des connexions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg border border-emerald-300/20 dark:border-emerald-300 dark:border-emerald-500/20">
            <Wifi
              size={15}
              className="text-emerald-700 dark:text-emerald-400"
            />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {actives.length} actives
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-surface rounded-lg border border-border">
            <WifiOff size={15} className="text-text-muted" />
            <span className="text-sm font-medium text-text-muted">
              {inactives.length} expirées
            </span>
          </div>
          <Button onClick={fetchSessions} title="Actualiser" variant="outline">
            <RefreshCw size={15} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {[
                "Utilisateur",
                "IP",
                "Créée le",
                "Expire le",
                "Statut",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-text-muted">
                  Chargement...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-text-muted">
                  Aucune session
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id} className="hover:bg-surface transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-100 dark:bg-primary-soft rounded-full flex items-center justify-center flex-shrink-0">
                        <Monitor
                          size={12}
                          className="text-blue-700 dark:text-primary"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text">
                          {s.utilisateur || "—"}
                        </p>
                        <p className="text-xs text-text-muted">
                          @{s.nom_utilisateur}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-text-secondary">
                      {s.adresse_ip}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {formatDate(s.date_creation)}
                  </td>

                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {formatDate(s.date_expiration)}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.est_active
                          ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-surface text-text-muted"
                      }`}>
                      {s.est_active ? " Active" : " Expirée"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {s.est_active ? (
                      <Button
                        onClick={() => handleForceLogout(s)}
                        disabled={forcing === s.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-danger-soft hover:bg-red-200 dark:hover:bg-danger-soft text-red-700 dark:text-danger text-xs font-medium transition-colors disabled:opacity-50">
                        <LogOut size={12} />
                        {forcing === s.id ? "En cours..." : "Déconnecter"}
                      </Button>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 
          AlertDialog — Confirmation déconnexion forcée
       */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open &&
          setConfirmDialog({ open: false, session: null, errorMessage: null })
        }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.errorMessage
                ? "Une erreur est survenue"
                : "Forcer la déconnexion ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.errorMessage
                ? confirmDialog.errorMessage
                : `La session de ${confirmDialog.session?.utilisateur} sera immédiatement invalidée.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {confirmDialog.errorMessage ? (
              <AlertDialogCancel>Fermer</AlertDialogCancel>
            ) : (
              <>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmLogout}
                  className="bg-red-600 hover:bg-red-700 text-white">
                  Déconnecter
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
