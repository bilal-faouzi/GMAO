import { useEffect, useState } from 'react'
import { Monitor, Wifi, WifiOff } from 'lucide-react'
import api from '@/services/api'

export default function Sessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get('/auth/sessions/')
      .then(res => setSessions(Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (d) => new Date(d).toLocaleString('fr-FR', {
    day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
  })

  const actives   = sessions.filter(s => s.est_active)
  const inactives = sessions.filter(s => !s.est_active)

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sessions</h1>
          <p className="text-slate-400 text-sm mt-1">Surveillance des connexions</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Wifi size={15} className="text-emerald-400"/>
            <span className="text-sm font-medium text-emerald-400">{actives.length} actives</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
            <WifiOff size={15} className="text-gray-500"/>
            <span className="text-sm font-medium text-gray-500">{inactives.length} expirées</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {['Utilisateur','IP','Créée le','Expire le','Statut'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">Chargement...</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">Aucune session</td></tr>
            ) : sessions.map(s => (
              <tr key={s.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-500/10 rounded-full flex items-center justify-center">
                      <Monitor size={12} className="text-blue-400"/>
                    </div>
                    <span className="text-sm font-medium text-white">
                      {s.id_utilisateur?.nom_utilisateur || '—'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3"><span className="text-xs font-mono text-gray-400">{s.adresse_ip}</span></td>
                <td className="px-4 py-3 text-sm text-gray-400">{formatDate(s.date_creation)}</td>
                <td className="px-4 py-3 text-sm text-gray-400">{formatDate(s.date_expiration)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.est_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-500'
                  }`}>
                    {s.est_active ? '● Active' : '○ Expirée'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}