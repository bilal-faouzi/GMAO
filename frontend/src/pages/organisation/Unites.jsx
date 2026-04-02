import { useState, useEffect } from 'react'
import CrudPage, { Badge } from '@/components/ui/CrudPage'
import { getUnites, createUnite, updateUnite, getSecteurs } from '@/services/organisationService'

export default function Unites() {
  const [data, setData]       = useState([])
  const [secteurs, setSecteurs] = useState([])
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    load()
    getSecteurs().then(r => setSecteurs(r.data.results || r.data))
  }, [])

  async function load() {
    setLoading(true)
    const r = await getUnites()
    setData(r.data.results || r.data)
    setLoading(false)
  }

  const columns = [
    { key: 'secteur',      label: 'Secteur'    },
    { key: 'code',         label: 'Code'       },
    { key: 'libelle',      label: 'Libellé'    },
    { key: 'productive',   label: 'Productive' },
    { key: 'statut',       label: 'Statut'     },
  ]

  const fields = [
    { name: 'secteur', label: 'Secteur', type: 'select', required: true,
      options: secteurs.map(s => ({ value: s.id, label: `${s.site_libelle} / ${s.libelle}` })) },
    { name: 'code',          label: 'Code',          placeholder: 'U1',       required: true },
    { name: 'libelle',       label: 'Libellé',       placeholder: 'Atelier 1', required: true },
    { name: 'estProductive', label: 'Productive',    type: 'checkbox', default: true,
      checkLabel: 'Unité de production' },
    { name: 'estActif',      label: 'Actif',         type: 'checkbox', default: true },
  ]

  const rows = data.map(u => ({
    id:         u.id,
    secteur:    <span className="text-text-secondary text-xs">{u.secteur_libelle}</span>,
    code:       <span className="font-mono text-blue-700 dark:text-blue-400 text-xs font-bold">{u.code}</span>,
    libelle:    <span className="font-medium text-text">{u.libelle}</span>,
    productive: <span className={`text-xs font-medium ${u.estProductive ? 'text-emerald-700 dark:text-emerald-400' : 'text-text-muted'}`}>
                  {u.estProductive ? '✓ Oui' : '— Non'}
                </span>,
    statut:     <Badge active={u.estActif} />,
    _raw:       u,
  }))

  async function onCreate(form) { await createUnite(form); load() }
  async function onEdit(id, form) { await updateUnite(id, form); load() }

  return (
    <CrudPage
      title="Unités"
      subtitle={`${data.length} unité(s) enregistrée(s)`}
      columns={columns} rows={rows} fields={fields}
      onCreate={onCreate} onEdit={onEdit} loading={loading}
    />
  )
}