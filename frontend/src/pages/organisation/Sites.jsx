import { useState, useEffect } from 'react'
import CrudPage, { Badge } from '@/components/ui/CrudPage'
import { getSites, createSite, updateSite, deleteSite, getSocietes } from '@/services/organisationService'

export default function Sites() {
  const [data, setData]       = useState([])
  const [societes, setSocietes] = useState([])
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    load()
    getSocietes().then(r => setSocietes(r.data.results || r.data))
  }, [])

  async function load() {
    setLoading(true)
    const r = await getSites()
    setData(r.data.results || r.data)
    setLoading(false)
  }

  const columns = [
    { key: 'societe', label: 'Société' },
    { key: 'code',    label: 'Code'    },
    { key: 'libelle', label: 'Libellé' },
    { key: 'ville',   label: 'Ville'   },
    { key: 'pays',    label: 'Pays'    },
    { key: 'statut',  label: 'Statut'  },
  ]

  const fields = [
    { name: 'societe', label: 'Société',  type: 'select', required: true,
      options: societes.map(s => ({ value: s.id, label: s.raisonSociale })) },
    { name: 'code',    label: 'Code',    placeholder: 'S1',             required: true },
    { name: 'libelle', label: 'Libellé', placeholder: 'Site Casablanca', required: true },
    { name: 'ville',   label: 'Ville',   placeholder: 'Casablanca'      },
    { name: 'pays',    label: 'Pays',    placeholder: 'Maroc', default: 'Maroc' },
    { name: 'estActif', label: 'Actif',  type: 'checkbox', default: true },
  ]

  const rows = data.map(s => ({
    id:      s.id,
    societe: <span className="text-gray-400 text-xs">{s.societe_libelle}</span>,
    code:    <span className="font-mono text-blue-400 text-xs font-bold">{s.code}</span>,
    libelle: <span className="font-medium text-white">{s.libelle}</span>,
    ville:   <span className="text-gray-400">{s.ville || '—'}</span>,
    pays:    <span className="text-gray-400">{s.pays}</span>,
    statut:  <Badge active={s.estActif} />,
    _raw:    s,
  }))

  async function onCreate(form) { await createSite(form);         load() }
  async function onEdit(id, form) { await updateSite(id, form);   load() }
  async function onDelete(id) {
    if (!confirm('Supprimer ce site ?')) return
    await deleteSite(id); load()
  }

  return (
    <CrudPage
      title="Sites"
      subtitle={`${data.length} site(s) enregistré(s)`}
      columns={columns} rows={rows} fields={fields}
      onCreate={onCreate} onEdit={onEdit} onDelete={onDelete} loading={loading}
    />
  )
}