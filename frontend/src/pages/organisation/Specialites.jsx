import { useState, useEffect } from 'react'
import CrudPage, { Badge } from '@/components/ui/CrudPage'
import { getSpecialites, createSpecialite, updateSpecialite } from '@/services/organisationService'

// Ajouter updateSpecialite dans organisationService.js :
// export const updateSpecialite = (id, data) => api.patch(`/v1/organisation/specialites/${id}/`, data)

export default function Specialites() {
  const [data, setData]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await getSpecialites()
    setData(r.data.results || r.data)
    setLoading(false)
  }

  const columns = [
    { key: 'code',    label: 'Code'    },
    { key: 'libelle', label: 'Libellé' },
    { key: 'statut',  label: 'Statut'  },
  ]

  const fields = [
    { name: 'code',     label: 'Code',     placeholder: 'ELEC',        required: true },
    { name: 'libelle',  label: 'Libellé',  placeholder: 'Électricité', required: true },
    { name: 'estActif', label: 'Active',   type: 'checkbox', default: true },
  ]

  const rows = data.map(s => ({
    id:      s.id,
    code:    <span className="font-mono text-amber-400 text-xs font-bold">{s.code}</span>,
    libelle: <span className="font-medium text-white">{s.libelle}</span>,
    statut:  <Badge active={s.estActif} />,
    _raw:    s,
  }))

  async function onCreate(form) { await createSpecialite(form); load() }
  async function onEdit(id, form) { await updateSpecialite(id, form); load() }

  return (
    <CrudPage
      title="Spécialités"
      subtitle={`${data.length} spécialité(s) enregistrée(s)`}
      columns={columns} rows={rows} fields={fields}
      onCreate={onCreate} onEdit={onEdit} loading={loading}
    />
  )
}