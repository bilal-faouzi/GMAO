import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Shield, X } from 'lucide-react'
import api from '@/services/api'

// ─── Modal générique ──────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl">
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

export default function Utilisateurs() {
  const [utilisateurs, setUtilisateurs] = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [openCreate, setOpenCreate]     = useState(false)
  const [openEdit, setOpenEdit]         = useState(false)
  const [openRoles, setOpenRoles]       = useState(false)
  const [selected, setSelected]         = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [allRoles, setAllRoles]         = useState([])
  const [form, setForm] = useState({ nom_utilisateur:'', email:'', mot_de_passe:'', prenom:'', nom:'' })
  const [error, setError] = useState('')

  const fetchUtilisateurs = async () => {
    try {
      const res = await api.get('/auth/utilisateurs/')
      setUtilisateurs(res.data.results || res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const fetchAllRoles = async () => {
    const res = await api.get('/auth/roles/')
    setAllRoles(Array.isArray(res.data) ? res.data : res.data.results || [])
  }

  useEffect(() => { fetchUtilisateurs() }, [])

  const handleCreate = async (e) => {
    e.preventDefault(); setError('')
    try {
      await api.post('/auth/utilisateurs/', form)
      setOpenCreate(false)
      setForm({ nom_utilisateur:'', email:'', mot_de_passe:'', prenom:'', nom:'' })
      fetchUtilisateurs()
    } catch (err) { setError(err.response?.data?.detail || 'Erreur lors de la création.') }
  }

  const handleEdit = async (e) => {
    e.preventDefault(); setError('')
    try {
      await api.patch(`/auth/utilisateurs/${selected.id}/`, form)
      setOpenEdit(false); fetchUtilisateurs()
    } catch (err) { setError(err.response?.data?.detail || 'Erreur.') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Désactiver cet utilisateur ?')) return
    await api.delete(`/auth/utilisateurs/${id}/`)
    fetchUtilisateurs()
  }

  const openEditModal = (u) => {
    setSelected(u)
    setForm({ prenom: u.prenom, nom: u.nom, email: u.email, mot_de_passe:'', nom_utilisateur: u.nom_utilisateur })
    setError(''); setOpenEdit(true)
  }

  const openRolesModal = (u) => {
    setSelectedUser(u); fetchAllRoles(); setOpenRoles(true)
  }

  const handleAssignRole = async (roleId) => {
    await api.post(`/auth/utilisateurs/${selectedUser.id}/roles/`, { id_role: roleId })
    const role = allRoles.find(r => r.id === roleId)
    setSelectedUser(prev => ({ ...prev, roles: [...(prev.roles || []), role] }))
    fetchUtilisateurs()
  }

  const handleRemoveRole = async (roleId) => {
    await api.delete(`/auth/utilisateurs/${selectedUser.id}/roles/`, { data: { id_role: roleId } })
    setSelectedUser(prev => ({ ...prev, roles: prev.roles.filter(r => r.id !== roleId) }))
    fetchUtilisateurs()
  }

  const filtered = utilisateurs.filter(u =>
    u.nom_utilisateur.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.prenom.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
          <p className="text-slate-400 text-sm mt-1">Gérer les comptes utilisateurs</p>
        </div>
        <button
          onClick={() => { setError(''); setOpenCreate(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Nouvel utilisateur
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          placeholder="Rechercher un utilisateur..."
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
              {['Utilisateur','Email','Rôles','Statut','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">Aucun utilisateur trouvé</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 text-xs font-bold">{u.prenom[0]}{u.nom[0]}</span>
                    </div>
                    <div>
                      <p className="font-medium text-white">{u.prenom} {u.nom}</p>
                      <p className="text-xs text-gray-500">@{u.nom_utilisateur}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm">{u.email}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {u.roles?.length > 0
                      ? u.roles.map(r => (
                        <span key={r.id} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">{r.code}</span>
                      ))
                      : <span className="text-gray-600 text-xs">Aucun rôle</span>
                    }
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    u.est_actif ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {u.est_actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openRolesModal(u)} title="Gérer les rôles"
                      className="p-1.5 rounded hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-400 transition-colors">
                      <Shield size={13}/>
                    </button>
                    <button onClick={() => openEditModal(u)} title="Modifier"
                      className="p-1.5 rounded hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 transition-colors">
                      <Pencil size={13}/>
                    </button>
                    <button onClick={() => handleDelete(u.id)} title="Désactiver"
                      className="p-1.5 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Création */}
      {openCreate && (
        <Modal title="Nouvel utilisateur" onClose={() => setOpenCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Prénom</label>
                <input className={inputCls} value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})} required/></div>
              <div><label className={labelCls}>Nom</label>
                <input className={inputCls} value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} required/></div>
            </div>
            <div><label className={labelCls}>Nom d'utilisateur</label>
              <input className={inputCls} value={form.nom_utilisateur} onChange={e=>setForm({...form,nom_utilisateur:e.target.value})} required/></div>
            <div><label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/></div>
            <div><label className={labelCls}>Mot de passe</label>
              <input type="password" className={inputCls} value={form.mot_de_passe} onChange={e=>setForm({...form,mot_de_passe:e.target.value})} required/></div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Créer</button>
              <button type="button" onClick={() => setOpenCreate(false)} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm">Annuler</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Modification */}
      {openEdit && (
        <Modal title="Modifier l'utilisateur" onClose={() => setOpenEdit(false)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Prénom</label>
                <input className={inputCls} value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})}/></div>
              <div><label className={labelCls}>Nom</label>
                <input className={inputCls} value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})}/></div>
            </div>
            <div><label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
            <div><label className={labelCls}>Nouveau mot de passe (optionnel)</label>
              <input type="password" className={inputCls} value={form.mot_de_passe} onChange={e=>setForm({...form,mot_de_passe:e.target.value})}/></div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Enregistrer</button>
              <button type="button" onClick={() => setOpenEdit(false)} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm">Annuler</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Gestion Rôles */}
      {openRoles && (
        <Modal title={`Rôles — ${selectedUser?.prenom} ${selectedUser?.nom}`} onClose={() => setOpenRoles(false)}>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Rôles assignés</p>
              <div className="space-y-2">
                {selectedUser?.roles?.length > 0
                  ? selectedUser.roles.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">{r.code}</span>
                        <span className="text-xs text-gray-500">{r.libelle}</span>
                      </div>
                      <button onClick={() => handleRemoveRole(r.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                    </div>
                  ))
                  : <p className="text-sm text-gray-600 p-2">Aucun rôle assigné</p>
                }
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Assigner un rôle</p>
              <div className="space-y-2">
                {allRoles.filter(r => !selectedUser?.roles?.find(ur => ur.id === r.id)).map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg border border-white/10">
                    <div>
                      <span className="text-sm font-medium text-white">{r.code}</span>
                      <span className="text-xs text-gray-500 ml-2">{r.libelle}</span>
                    </div>
                    <button onClick={() => handleAssignRole(r.id)}
                      className="text-xs px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                      Assigner
                    </button>
                  </div>
                ))}
                {allRoles.filter(r => !selectedUser?.roles?.find(ur => ur.id === r.id)).length === 0 && (
                  <p className="text-sm text-gray-600 p-2">Tous les rôles sont déjà assignés</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}