import { useEffect, useState } from 'react'
import { Search, Activity } from 'lucide-react'
import api from '@/services/api'

const actionColor = (action) => {
  if (action === 'LOGIN')       return 'bg-blue-500/10 text-blue-400'
  if (action === 'LOGOUT')      return 'bg-white/5 text-gray-400'
  if (action === 'CREATE')      return 'bg-emerald-500/10 text-emerald-400'
  if (action === 'UPDATE')      return 'bg-orange-500/10 text-orange-400'
  if (action === 'DELETE')      return 'bg-red-500/10 text-red-400'
  if (action === 'ASSIGN_ROLE') return 'bg-purple-500/10 text-purple-400'
  if (action === 'DEACTIVATE')  return 'bg-red-500/10 text-red-400'
  return 'bg-white/5 text-gray-400'
}

const formatDate = (d) => new Date(d).toLocaleString('fr-FR', {
  day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
})

export default function JournalAudit() {
  const [journal, setJournal] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    api.get('/auth/journal-audits/')
      .then(res => setJournal(Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = journal.filter(j =>
    j.action?.toLowerCase().includes(search.toLowerCase()) ||
    j.module?.toLowerCase().includes(search.toLowerCase()) ||
    j.type_entite?.toLowerCase().includes(search.toLowerCase()) ||
    j.utilisateur?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Journal d'Audit</h1>
          <p className="text-slate-400 text-sm mt-1">Historique de toutes les actions</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <Activity size={15} className="text-emerald-400"/>
          <span className="text-sm font-medium text-emerald-400">{journal.length} actions enregistrées</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
        <input
          placeholder="Rechercher par action, module, utilisateur..."
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {['Date','Utilisateur','Action','Module','Entité','IP'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">Aucune entrée</td></tr>
            ) : filtered.map(j => (
              <tr key={j.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(j.horodatage)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 text-xs font-bold">{j.utilisateur?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                    <span className="text-sm text-white">{j.utilisateur || '—'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor(j.action)}`}>{j.action}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">{j.module}</td>
                <td className="px-4 py-3 text-sm text-gray-400">{j.type_entite}</td>
                <td className="px-4 py-3"><span className="text-xs font-mono text-gray-600">{j.adresse_ip || '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}