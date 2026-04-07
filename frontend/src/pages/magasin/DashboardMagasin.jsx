import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardMagasin, getAlertes } from '../../services/magasinService';

export default function DashboardMagasin() {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardMagasin(), getAlertes()])
      .then(([d, a]) => {
        setData(d.data);
        setAlertes(a.data.results || a.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-400">Chargement...</div>;
  if (!data)   return <div className="p-6 text-red-400">Erreur de chargement.</div>;

  return (
    <div className="p-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard Magasin</h1>
          <p className="text-gray-400 text-sm mt-1">Stock des pièces détachées</p>
        </div>
        <button
          onClick={() => navigate('/magasin')}
          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition"
        >
          Catalogue pièces
        </button>
      </div>

      {/* Cards KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">Total pièces</p>
          <p className="text-4xl font-bold text-white">{data.total_pieces}</p>
          <p className="text-xs text-purple-400 mt-2">références actives</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">Valeur totale stock</p>
          <p className="text-3xl font-bold text-white">
            {Number(data.valeur_totale).toLocaleString('fr-FR', {minimumFractionDigits:2})}
          </p>
          <p className="text-xs text-teal-400 mt-2">MAD</p>
        </div>
        <div className={`rounded-xl p-5 border ${data.nb_alertes > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-gray-800 border-gray-700'}`}>
          <p className={`text-sm mb-1 ${data.nb_alertes > 0 ? 'text-red-400' : 'text-gray-400'}`}>Alertes stock</p>
          <p className={`text-4xl font-bold ${data.nb_alertes > 0 ? 'text-red-400' : 'text-white'}`}>{data.nb_alertes}</p>
          <p className={`text-xs mt-2 ${data.nb_alertes > 0 ? 'text-red-500' : 'text-gray-500'}`}>
            {data.nb_alertes > 0 ? 'pièces sous seuil minimum' : 'tout est OK'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alertes */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
            Pièces en alerte
          </h2>
          {alertes.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Aucune alerte</p>
          ) : (
            <div className="space-y-2">
              {alertes.slice(0, 8).map(p => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/magasin/${p.id}`)}
                  className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg cursor-pointer hover:bg-red-500/20 transition"
                >
                  <div>
                    <p className="text-sm font-mono text-red-300">{p.reference}</p>
                    <p className="text-xs text-gray-400">{p.designation}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-400">{p.quantiteStock} {p.unite}</p>
                    <p className="text-xs text-gray-500">min: {p.seuilMinimum}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Derniers mouvements */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
            Derniers mouvements
          </h2>
          {data.derniers_mouvements.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Aucun mouvement</p>
          ) : (
            <div className="space-y-2">
              {data.derniers_mouvements.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-gray-700/40 rounded-lg">
                  <div>
                    <p className="text-sm font-mono text-purple-300">{m.piece_detail?.reference}</p>
                    <p className="text-xs text-gray-400">{new Date(m.dateHeure).toLocaleString('fr-FR')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.typeMouvement === 'entree'
                        ? 'bg-green-500/20 text-green-400'
                        : m.typeMouvement === 'sortie'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {m.typeMouvement}
                    </span>
                    <span className="text-sm font-bold text-white">{m.quantite}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate('/magasin/nouveau')}
            className="w-full mt-4 py-2 text-sm text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/10 transition"
          >
            + Ajouter une pièce
          </button>
        </div>
      </div>
    </div>
  );
}