import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActifs } from '../../services/actifService';
import api from '../../services/api';
const STATUT_COLORS = {
  actif:          'bg-green-500/20 text-green-400 border-green-500/30',
  en_panne:       'bg-red-500/20 text-red-400 border-red-500/30',
  en_maintenance: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  retire:         'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const TYPE_ICONS = {
  equipement:     '⚙️',
  infrastructure: '🏗️',
  vehicule:       '🚗',
  autre:          '📦',
};

function ActifNode({ actif, niveau = 0, navigate }) {
  const [ouvert, setOuvert] = useState(true);
  const hasChildren = actif.sous_actifs && actif.sous_actifs.length > 0;

  return (
    <div className={`${niveau > 0 ? 'ml-6 border-l border-gray-700 pl-4 mt-2' : 'mt-3'}`}>
      <div
        className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer
          ${niveau === 0
            ? 'bg-gray-800 border-gray-700 hover:border-purple-500/50'
            : 'bg-gray-800/60 border-gray-700/50 hover:border-blue-500/40'
          }`}
      >
        {/* Toggle expand */}
        <button
          onClick={() => setOuvert(!ouvert)}
          className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold transition
            ${hasChildren
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'text-gray-600 cursor-default'
            }`}
        >
          {hasChildren ? (ouvert ? '▼' : '▶') : '·'}
        </button>

        {/* Icône type */}
        <span className="text-lg">{TYPE_ICONS[actif.type] || '📦'}</span>

        {/* Infos principales */}
{/* Infos principales */}
<div className="flex-1 min-w-0">
  <div className="flex items-center gap-2 flex-wrap">
    <span className="font-mono text-sm font-semibold text-purple-300">{actif.code}</span>
    <span className="text-white text-sm font-medium truncate">{actif.libelle}</span>
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUT_COLORS[actif.statut]}`}>
      {actif.statut.replace('_', ' ')}
    </span>
    {hasChildren && (
      <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">
        {actif.sous_actifs.length} sous-actif{actif.sous_actifs.length > 1 ? 's' : ''}
      </span>
    )}
    {!hasChildren && (
      <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
        feuille
      </span>
    )}
  </div>

  {/* Chemin hiérarchique complet */}
  {actif.chemin_hierarchique?.length > 0 && (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      <span className="text-xs text-gray-600">↑</span>
      {actif.chemin_hierarchique.map((p, i) => (
        <span key={p.id} className="flex items-center gap-1">
          <span
            onClick={(e) => { e.stopPropagation(); navigate(`/actifs/${p.id}`); }}
            className="text-xs text-gray-500 hover:text-purple-300 font-mono cursor-pointer transition bg-gray-800 px-1.5 py-0.5 rounded"
          >
            {p.code}
          </span>
          {i < actif.chemin_hierarchique.length - 1 && (
            <span className="text-gray-600 text-xs">→</span>
          )}
        </span>
      ))}
      <span className="text-gray-600 text-xs">→</span>
      <span className="text-xs text-purple-400 font-mono">{actif.code}</span>
    </div>
  )}

  <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
    {actif.site_detail  && <span>📍 {actif.site_detail.libelle}</span>}
    {actif.unite_detail && <span>🏭 {actif.unite_detail.libelle}</span>}
    {actif.fabricant    && <span>🔧 {actif.fabricant}</span>}
    {actif.numSerie     && <span>🔢 {actif.numSerie}</span>}
    {actif.taux_disponibilite !== undefined && (
      <span className={actif.taux_disponibilite >= 80 ? 'text-green-500' : 'text-red-400'}>
        ✅ Dispo : {actif.taux_disponibilite} %
      </span>
    )}
  </div>
</div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/actifs/${actif.id}`); }}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition"
          >
            Détail
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/actifs/${actif.id}/modifier`); }}
            className="text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-2 py-1 rounded transition"
          >
            Modifier
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/actifs/nouveau?parent=${actif.id}&parentCode=${actif.code}`); }}
            className="text-xs bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 px-2 py-1 rounded transition"
          >
            + Sous-actif
          </button>
        </div>
      </div>

      {/* Enfants */}
      {hasChildren && ouvert && (
        <div>
          {actif.sous_actifs.map(enfant => (
            <ActifNode key={enfant.id} actif={enfant} niveau={niveau + 1} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArborescenceActifs() {
  const navigate = useNavigate();
  const [actifs, setActifs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

useEffect(() => {
  const charger = async () => {
    try {
      const res = await api.get('/v1/actifs/actifs/arborescence/');
      setActifs(res.data.results || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  charger();
}, []);

  const filtres = actifs.filter(a =>
    a.code.toLowerCase().includes(search.toLowerCase()) ||
    a.libelle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Arborescence des actifs</h1>
          <p className="text-gray-400 text-sm mt-1">Hiérarchie parent → sous-actifs</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/actifs')}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition"
          >
            Vue liste
          </button>
          <button
            onClick={() => navigate('/actifs/nouveau')}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm transition"
          >
            + Nouvel actif
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher un actif racine..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md bg-gray-800 text-white rounded-lg px-4 py-2 text-sm border border-gray-700 outline-none focus:border-purple-500"
        />
      </div>

      {/* Légende */}
      <div className="flex gap-4 mb-4 text-xs text-gray-500 flex-wrap">
        {Object.entries(TYPE_ICONS).map(([type, icon]) => (
          <span key={type}>{icon} {type}</span>
        ))}
        <span className="ml-4">▶ = expand · ▼ = collapse</span>
      </div>

      {/* Arbre */}
      {loading ? (
        <div className="text-gray-400 text-center py-12">Chargement...</div>
      ) : filtres.length === 0 ? (
        <div className="text-gray-400 text-center py-12">Aucun actif racine trouvé</div>
      ) : (
        <div>
          {filtres.map(actif => (
            <ActifNode key={actif.id} actif={actif} niveau={0} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}