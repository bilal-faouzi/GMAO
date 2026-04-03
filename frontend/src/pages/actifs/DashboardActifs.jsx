import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../../services/actifService';

const STATUT_CONFIG = {
  actif:           { label: 'Actifs',          color: 'text-green-400',  bg: 'bg-green-500/20',  border: 'border-green-500/30' },
  en_panne:        { label: 'En panne',         color: 'text-red-400',    bg: 'bg-red-500/20',    border: 'border-red-500/30' },
  en_maintenance:  { label: 'En maintenance',   color: 'text-amber-400',  bg: 'bg-amber-500/20',  border: 'border-amber-500/30' },
  retire:          { label: 'Retirés',          color: 'text-gray-400',   bg: 'bg-gray-500/20',   border: 'border-gray-500/30' },
};

export default function DashboardActifs() {
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-400">Chargement...</div>;
  if (!data)   return <div className="p-6 text-red-400">Erreur de chargement.</div>;

  const getStatutNb = (statut) =>
    data.par_statut.find(s => s.statut === statut)?.nb || 0;

  const maxNb = Math.max(...data.par_statut.map(s => s.nb), 1);

  return (
    <div className="p-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard Actifs</h1>
          <p className="text-gray-400 text-sm mt-1">Vue d'ensemble du parc d'actifs</p>
        </div>
        <button
          onClick={() => navigate('/actifs')}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition"
        >
          Liste des actifs
        </button>
      </div>

      {/* Cards statuts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 md:col-span-1">
          <p className="text-gray-400 text-sm mb-1">Total actifs</p>
          <p className="text-4xl font-bold text-white">{data.total}</p>
          <p className="text-sm text-purple-400 mt-2">
            Taux dispo : {data.taux_disponibilite} %
          </p>
        </div>

        {/* Par statut */}
        {Object.entries(STATUT_CONFIG).map(([key, cfg]) => (
          <div
            key={key}
            className={`rounded-xl p-5 border ${cfg.bg} ${cfg.border} cursor-pointer hover:opacity-80 transition`}
            onClick={() => navigate(`/actifs?statut=${key}`)}
          >
            <p className={`text-sm mb-1 ${cfg.color}`}>{cfg.label}</p>
            <p className={`text-4xl font-bold ${cfg.color}`}>{getStatutNb(key)}</p>
            <p className="text-xs text-gray-500 mt-2">
              {data.total ? Math.round(getStatutNb(key) / data.total * 100) : 0} %
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Graphe barres */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-5">
            Répartition par statut
          </h2>
          <div className="space-y-4">
            {Object.entries(STATUT_CONFIG).map(([key, cfg]) => {
              const nb = getStatutNb(key);
              const pct = Math.round((nb / maxNb) * 100);
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={cfg.color}>{cfg.label}</span>
                    <span className="text-white font-medium">{nb}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${cfg.bg.replace('/20', '')}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Taux disponibilité */}
          <div className="mt-6 pt-5 border-t border-gray-700">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Taux de disponibilité global</span>
              <span className="text-green-400 font-bold">{data.taux_disponibilite} %</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-green-500 transition-all duration-700"
                style={{ width: `${data.taux_disponibilite}%` }}
              />
            </div>
          </div>
        </div>

        {/* Derniers actifs */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
            Derniers actifs ajoutés
          </h2>
          {data.actifs_recents.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Aucun actif</p>
          ) : (
            <div className="space-y-3">
              {data.actifs_recents.map(actif => {
                const cfg = STATUT_CONFIG[actif.statut];
                return (
                  <div
                    key={actif.id}
                    className="flex items-center justify-between p-3 bg-gray-700/40 rounded-lg cursor-pointer hover:bg-gray-700/60 transition"
                    onClick={() => navigate(`/actifs/${actif.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium font-mono text-purple-300">{actif.code}</p>
                      <p className="text-xs text-gray-400">{actif.libelle}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg?.bg} ${cfg?.color}`}>
                      {actif.statut.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <button
            onClick={() => navigate('/actifs/nouveau')}
            className="w-full mt-4 py-2 text-sm text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/10 transition"
          >
            + Ajouter un actif
          </button>
        </div>
      </div>
    </div>
  );
}