import { useEffect, useState } from 'react'
import { Users, Shield, Key, Activity } from 'lucide-react'
import api from '@/services/api'
import useAuthStore from '@/store/authStore'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({ utilisateurs: 0, roles: 0, permissions: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [users, roles, perms] = await Promise.all([
          api.get('/auth/utilisateurs/'),
          api.get('/auth/roles/'),
          api.get('/auth/permissions/'),
        ])
        setStats({
          utilisateurs: users.data.count || users.data.length,
          roles: Array.isArray(roles.data) ? roles.data.length : roles.data.count,
          permissions: Array.isArray(perms.data) ? perms.data.length : perms.data.count,
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const cards = [
    { title: 'Utilisateurs', value: stats.utilisateurs, icon: Users,    color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
    { title: 'Rôles',        value: stats.roles,        icon: Shield,   color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Permissions',  value: stats.permissions,  icon: Key,      color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
    { title: 'Statut API',   value: 'En ligne',         icon: Activity, color: 'text-orange-400',  bg: 'bg-orange-500/10'  },
  ]

  return (
    <div className="p-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Bonjour, {user?.prenom} 👋
        </h1>
        <p className="text-slate-400 mt-1">Bienvenue sur le tableau de bord GMAO</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ title, value, icon: Icon, color, bg }) => (
          <div key={title} className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">{title}</p>
              <p className="text-3xl font-bold text-white mt-1">
                {loading ? '...' : value}
              </p>
            </div>
            <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center`}>
              <Icon className={color} size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Profil */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Mon Profil</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Nom complet',      value: `${user?.prenom} ${user?.nom}` },
            { label: 'Nom utilisateur',  value: user?.nom_utilisateur           },
            { label: 'Email',            value: user?.email                     },
            { label: 'Rôle',             value: user?.roles?.[0]?.code || '—'  },
          ].map(({ label, value }) => (
            <div key={label} className="p-4 bg-white/5 rounded-lg border border-white/10">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-white mt-1">{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}