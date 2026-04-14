import { useState, useEffect } from 'react'
import CrudPage, { Badge } from '@/components/ui/CrudPage'
import { getSecteurs, createSecteur, updateSecteur, getSites } from '@/services/organisationService'

export default function Secteurs() {
  const [data, setData]   = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
    getSites().then(r => setSites(r.data.results || r.data))
  }, [])

  async function load() {
    setLoading(true)
    const r = await getSecteurs()
    setData(r.data.results || r.data)
    setLoading(false)
  }

  const columns = [
    { key: 'site',    label: 'Site'    },
    { key: 'code',    label: 'Code'    },
    { key: 'libelle', label: 'Libellé' },
    { key: 'statut',  label: 'Statut'  },
  ]

  const fields = [
    { name: 'site',    label: 'Site',    type: 'select', required: true,
      options: sites.map(s => ({ value: s.id, label: `${s.societe_libelle} — ${s.libelle}` })) },
    { name: 'code',    label: 'Code',    placeholder: 'SEC1',       required: true },
    { name: 'libelle', label: 'Libellé', placeholder: 'Production', required: true },
    { name: 'estActif', label: 'Actif',  type: 'checkbox', default: true },
  ]

  const rows = data.map(s => ({
    id:      s.id,
    site:    <span className="text-text-secondary text-xs">{s.site_libelle}</span>,
    code:    <span className="font-mono text-blue-700 dark:text-blue-400 text-xs font-bold">{s.code}</span>,
    libelle: <span className="font-medium text-text">{s.libelle}</span>,
    statut:  <Badge active={s.estActif} />,
    _raw:    s,
  }))

  async function onCreate(form) { await createSecteur(form); load() }
  async function onEdit(id, form) { await updateSecteur(id, form); load() }

  return (
    <CrudPage
      title="Secteurs"
      subtitle={`${data.length} secteur(s) enregistré(s)`}
      columns={columns} rows={rows} fields={fields}
      onCreate={onCreate} onEdit={onEdit} loading={loading}
    />
  )
}