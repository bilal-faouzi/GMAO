import { useEffect, useState } from "react";
import { Monitor, Wifi, WifiOff, LogOut, RefreshCw } from "lucide-react";
import { getSessions } from "@/services/securiteService";
import api from "@/services/api";

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

  async function fetchSessions() {
    try {
      setLoading(true);
      const res = await getSessions();
      setSessions(Array.isArray(res.data) ? res.data : res.data.results || []);
      console.log(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSessions();
  }, []);

  async function handleForceLogout(session) {
    if (!confirm(`Forcer la déconnexion de ${session.utilisateur} ?`)) return;
    try {
      setForcing(session.id);
      await api.delete(`/auth/sessions/${session.id}/logout/`);
      fetchSessions();
    } catch (err) {
      alert(err.response?.data?.detail || "Erreur lors de la déconnexion.");
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
          <h1 className="text-2xl font-bold text-white">Sessions</h1>
          <p className="text-slate-400 text-sm mt-1">
            Surveillance des connexions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Wifi size={15} className="text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              {actives.length} actives
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
            <WifiOff size={15} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-500">
              {inactives.length} expirées
            </span>
          </div>
          <button
            onClick={fetchSessions}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/10"
            title="Actualiser">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
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
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-gray-500">
                  Chargement...
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-gray-500">
                  Aucune session
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Monitor size={12} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {s.utilisateur || "—"}
                        </p>
                        <p className="text-xs text-gray-500">
                          @{s.nom_utilisateur}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-gray-400">
                      {s.adresse_ip}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-400">
                    {formatDate(s.date_creation)}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-400">
                    {formatDate(s.date_expiration)}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.est_active
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-white/5 text-gray-500"
                      }`}>
                      {s.est_active ? "● Active" : "○ Expirée"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {s.est_active ? (
                      <button
                        onClick={() => handleForceLogout(s)}
                        disabled={forcing === s.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors disabled:opacity-50">
                        <LogOut size={12} />
                        {forcing === s.id ? "En cours..." : "Déconnecter"}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
