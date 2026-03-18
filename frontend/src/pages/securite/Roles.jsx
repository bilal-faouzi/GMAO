import { useEffect, useState } from 'react'
import { Plus, Search, Trash2, Key, Shield, X } from 'lucide-react'
import api from '@/services/api'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
const labelCls = "text-xs text-gray-400 mb-1 block"

const niveauColor = (n) => {
  if (n === 1) return 'bg-red-500/10 text-red-400'
  if (n === 2) return 'bg-orange-500/10 text-orange-400'
  if (n === 3) return 'bg-blue-500/10 text-blue-400'
  return 'bg-white/5 text-gray-400'
}

const actionColor = (action) => {
  if (action === 'READ')   return 'bg-blue-500/10 text-blue-400'
  if (action === 'CREATE') return 'bg-emerald-500/10 text-emerald-400'
  if (action === 'UPDATE') return 'bg-orange-500/10 text-orange-400'
  if (action === 'DELETE') return 'bg-red-500/10 text-red-400'
  return 'bg-white/5 text-gray-400'
}

export default function Roles() {
  const [roles, setRoles]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [openCreate, setOpenCreate]     = useState(false)
  const [openPerms, setOpenPerms]       = useState(false)
  const [selectedRole, setSelectedRole] = useState(null)
  const [allPermissions, setAllPermissions] = useState([])
  const [form, setForm] = useState({ code: '', libelle: '', niveau: '' })
  const [error, setError] = useState('')

  const fetchRoles = async () => {
    try {
      const res = await api.get('/auth/roles/')
      setRoles(Array.isArray(res.data) ? res.data : res.data.results || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const fetchAllPermissions = async () => {
    const res = await api.get('/auth/permissions/')
    setAllPermissions(Array.isArray(res.data) ? res.data : res.data.results || [])
  }

  useEffect(() => { fetchRoles() }, [])

  const handleCreate = async (e) => {
    e.preventDefault(); setError('')
    try {
      await api.post('/auth/roles/', form)
      setOpenCreate(false)
      setForm({ code: '', libelle: '', niveau: '' })
      fetchRoles()
    } catch (err) { setError(err.response?.data?.detail || 'Erreur.') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Désactiver ce rôle ?')) return
    await api.delete(`/auth/roles/${id}/`)
    fetchRoles()
  }

  const openPermsModal = (role) => {
    setSelectedRole(role); fetchAllPermissions(); setOpenPerms(true)
  }

  const handleAssignPermission = async (permId) => {
    await api.post(`/auth/roles/${selectedRole.id}/permissions/`, { id_permission: permId })
    const perm = allPermissions.find(p => p.id === permId)
    setSelectedRole(prev => ({ ...prev, permissions: [...(prev.permissions || []), perm] }))
    fetchRoles()
  }

  const handleRemovePermission = async (permId) => {
    await api.delete(`/auth/roles/${selectedRole.id}/permissions/`, { data: { id_permission: permId } })
    setSelectedRole(prev => ({ ...prev, permissions: prev.permissions.filter(p => p.id !== permId) }))
    fetchRoles()
  }

  const filtered = roles.filter(r =>
    r.code.toLowerCase().includes(search.toLowerCase()) ||
    r.libelle.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rôles</h1>
          <p className="text-slate-400 text-sm mt-1">Gérer les rôles et leurs permissions</p>
        </div>
        <button
          onClick={() => { setError(''); setOpenCreate(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15}/> Nouveau rôle
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
        <input
          placeholder="Rechercher un rôle..."
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Cards */}
      {loading ? (
        <p className="text-center text-gray-500 py-12">Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(role => (
            <div key={role.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Key size={18} className="text-blue-400"/>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{role.code}</h3>
                    <p className="text-xs text-gray-500">{role.libelle}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openPermsModal(role)} title="Permissions"
                    className="p-1.5 rounded hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 transition-colors">
                    <Shield size={13}/>
                  </button>
                  <button onClick={() => handleDelete(role.id)} title="Désactiver"
                    className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-500">Niveau :</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${niveauColor(role.niveau)}`}>
                  Niveau {role.niveau}
                </span>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Permissions ({role.permissions?.length || 0}) :</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions?.length > 0
                    ? role.permissions.slice(0, 3).map(p => (
                      <span key={p.id} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">{p.code}</span>
                    ))
                    : <span className="text-xs text-gray-600">Aucune permission</span>
                  }
                  {role.permissions?.length > 3 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/10">
                      +{role.permissions.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Création */}
      {openCreate && (
        <Modal title="Nouveau rôle" onClose={() => setOpenCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div><label className={labelCls}>Code</label>
              <input className={inputCls} placeholder="ex: TECHNICIEN"
                value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} required/></div>
            <div><label className={labelCls}>Libellé</label>
              <input className={inputCls} placeholder="ex: Technicien de maintenance"
                value={form.libelle} onChange={e => setForm({...form, libelle: e.target.value})} required/></div>
            <div><label className={labelCls}>Niveau hiérarchique</label>
              <input type="number" min="1" max="10" className={inputCls} placeholder="ex: 3"
                value={form.niveau} onChange={e => setForm({...form, niveau: e.target.value})} required/>
              <p className="text-xs text-gray-600 mt-1">1 = plus haut niveau (Admin)</p></div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Créer</button>
              <button type="button" onClick={() => setOpenCreate(false)} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm">Annuler</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Permissions */}
      {openPerms && (
        <Modal title={`Permissions — ${selectedRole?.code}`} onClose={() => setOpenPerms(false)}>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div>
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">
                Assignées ({selectedRole?.permissions?.length || 0})
              </p>
              <div className="space-y-2">
                {selectedRole?.permissions?.length > 0
                  ? selectedRole.permissions.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor(p.action)}`}>{p.action}</span>
                        <span className="text-xs font-mono text-gray-400">{p.code}</span>
                      </div>
                      <button onClick={() => handleRemovePermission(p.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                    </div>
                  ))
                  : <p className="text-sm text-gray-600 p-2">Aucune permission assignée</p>
                }
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Ajouter</p>
              <div className="space-y-2">
                {allPermissions.filter(p => !selectedRole?.permissions?.find(sp => sp.id === p.id)).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor(p.action)}`}>{p.action}</span>
                      <span className="text-xs font-mono text-gray-400">{p.code}</span>
                    </div>
                    <button onClick={() => handleAssignPermission(p.id)}
                      className="text-xs px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                      Ajouter
                    </button>
                  </div>
                ))}
                {allPermissions.filter(p => !selectedRole?.permissions?.find(sp => sp.id === p.id)).length === 0 && (
                  <p className="text-sm text-gray-600 p-2">Toutes les permissions sont assignées</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}