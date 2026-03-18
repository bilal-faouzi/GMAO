import { useState, useEffect } from 'react'
import { Users, Plus, Pencil, Trash2, UserPlus, UserMinus, ChevronDown } from 'lucide-react'
import {
  getEquipes, createEquipe, updateEquipe, deleteEquipe,
  getMembres, addMembre, removeMembre,
  getSites, getSpecialites
} from '@/services/organisationService'


// ─── Badge niveau rôle ────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const styles = {
    CHEF:       'bg-amber-500/10 text-amber-400',
    MEMBRE:     'bg-blue-500/10 text-blue-400',
    REMPLACANT: 'bg-gray-500/10 text-gray-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[role] || styles.MEMBRE}`}>
      {role}
    </span>
  )
}

// ─── Modal générique ──────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Panel membres ────────────────────────────────────────────────────────────
function MembresPanel({ equipe, onClose }) {
  const [membres, setMembres] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newMembre, setNewMembre] = useState({ utilisateur: '', niveauRole: 'MEMBRE' })
  const [utilisateurs, setUtilisateurs] = useState([])

  useEffect(() => {
    fetchMembres()
    // Charger les utilisateurs depuis l'API Phase 1
    import('@/services/api').then(({ default: api }) => {
      api.get('/auth/utilisateurs/').then(r => {
        setUtilisateurs(r.data.results || r.data)
      })
    })
  }, [equipe.id])

  async function fetchMembres() {
    try {
      setLoading(true)
      const res = await getMembres(equipe.id)
      setMembres(res.data.results || res.data)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!newMembre.utilisateur) return
    await addMembre({ equipe: equipe.id, ...newMembre })
    setNewMembre({ utilisateur: '', niveauRole: 'MEMBRE' })
    setShowAdd(false)
    fetchMembres()
  }

  async function handleRemove(membreId) {
    if (!confirm('Retirer ce membre ?')) return
    await removeMembre(membreId)
    fetchMembres()
  }

  return (
    <Modal title={`Membres — ${equipe.libelle}`} onClose={onClose}>
      <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-4">Chargement...</p>
        ) : membres.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">Aucun membre</p>
        ) : (
          membres.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
              <div>
                <p className="text-sm text-white">{m.utilisateur_nom}</p>
                <RoleBadge role={m.niveauRole} />
              </div>
              <button
                onClick={() => handleRemove(m.id)}
                className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
              >
                <UserMinus size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {showAdd ? (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <select
            value={newMembre.utilisateur}
            onChange={(e) => setNewMembre({ ...newMembre, utilisateur: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">Sélectionner un utilisateur</option>
            {utilisateurs.map((u) => (
              <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>
            ))}
          </select>
          <select
            value={newMembre.niveauRole}
            onChange={(e) => setNewMembre({ ...newMembre, niveauRole: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="MEMBRE">Membre</option>
            <option value="CHEF">Chef</option>
            <option value="REMPLACANT">Remplaçant</option>
          </select>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
              Confirmer
            </button>
            <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm">
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm border border-white/10 border-dashed"
        >
          <UserPlus size={14} />
          Ajouter un membre
        </button>
      )}
    </Modal>
  )
}

// ─── Modal équipe ─────────────────────────────────────────────────────────────
function EquipeModal({ equipe, sites, specialites, onClose, onSaved }) {
  const [form, setForm] = useState({
    libelle: equipe?.libelle || '',
    site: equipe?.site || '',
    specialite: equipe?.specialite || '',
    estActif: equipe?.estActif ?? true,
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.libelle || !form.site) return
    try {
      setSaving(true)
      if (equipe) {
        await updateEquipe(equipe.id, form)
      } else {
        await createEquipe(form)
      }
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"

  return (
    <Modal title={equipe ? 'Modifier l\'équipe' : 'Nouvelle équipe'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Libellé *</label>
          <input
            className={inputClass}
            value={form.libelle}
            onChange={(e) => setForm({ ...form, libelle: e.target.value })}
            placeholder="Ex: Équipe Électricité Nord"
            required
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Site *</label>
          <select
            className={inputClass}
            value={form.site}
            onChange={(e) => setForm({ ...form, site: e.target.value })}
            required
          >
            <option value="">Sélectionner un site</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.libelle}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Spécialité</label>
          <select
            className={inputClass}
            value={form.specialite}
            onChange={(e) => setForm({ ...form, specialite: e.target.value || null })}
          >
            <option value="">Aucune spécialité</option>
            {specialites.map((s) => (
              <option key={s.id} value={s.id}>{s.libelle}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="estActif"
            checked={form.estActif}
            onChange={(e) => setForm({ ...form, estActif: e.target.checked })}
            className="accent-blue-500"
          />
          <label htmlFor="estActif" className="text-sm text-gray-300">Active</label>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : equipe ? 'Modifier' : 'Créer'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm"
          >
            Annuler
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Equipes() {
  const [equipes, setEquipes] = useState([])
  const [sites, setSites] = useState([])
  const [specialites, setSpecialites] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalEquipe, setModalEquipe] = useState(null) // null | 'new' | equipe
  const [panelMembres, setPanelMembres] = useState(null)
  const [filterSite, setFilterSite] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

async function fetchAll() {
  try {
    setLoading(true)
    const [eqRes, siRes, spRes] = await Promise.all([
      getEquipes(),
      getSites(),
      getSpecialites(),
    ])
    const eqs = eqRes.data.results || eqRes.data
    console.log('Équipes reçues:', eqs)  // ← ajoute ça
    setEquipes(eqs)
    setSites(siRes.data.results || siRes.data)
    setSpecialites(spRes.data.results || spRes.data)
  } finally {
    setLoading(false)
  }
}

  async function handleDelete(equipe) {
    if (!confirm(`Supprimer l'équipe "${equipe.libelle}" ?`)) return
    await deleteEquipe(equipe.id)
    fetchAll()
  }

  const filtered = filterSite
    ? equipes.filter((e) => e.site === filterSite)
    : equipes

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Équipes</h1>
          <p className="text-gray-400 text-sm mt-1">{equipes.length} équipe(s) au total</p>
        </div>
        <button
          onClick={() => setModalEquipe('new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nouvelle équipe
        </button>
      </div>

      {/* Filtre */}
      <div className="flex gap-3">
        <select
          value={filterSite}
          onChange={(e) => setFilterSite(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-w-[180px]"
        >
          <option value="">Tous les sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>{s.libelle}</option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {['Équipe', 'Site', 'Spécialité', 'Chef', 'Membres', 'Statut', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Aucune équipe</td></tr>
            ) : (
              filtered.map((eq) => (
                <tr key={eq.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{eq.libelle}</td>
                  <td className="px-4 py-3 text-gray-400">{eq.site_libelle || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{eq.specialite_libelle || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{eq.chef_nom || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setPanelMembres(eq)}
                      className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Users size={13} />
                      <span>{eq.membres_count ?? 0}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${eq.estActif ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {eq.estActif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setModalEquipe(eq)}
                        className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(eq)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {modalEquipe && (
        <EquipeModal
          equipe={modalEquipe === 'new' ? null : modalEquipe}
          sites={sites}
          specialites={specialites}
          onClose={() => setModalEquipe(null)}
          onSaved={fetchAll}
        />
      )}

      {panelMembres && (
        <MembresPanel
          equipe={panelMembres}
          onClose={() => setPanelMembres(null)}
        />
      )}
    </div>
  )
}