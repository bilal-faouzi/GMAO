import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActifs, deleteActif, changerStatut } from '../../services/actifService';

// Constantes partagées (idéalement dans un fichier séparé)
const STATUTS = {
  ACTIF: { value: 'actif', label: 'Actif', color: 'bg-green-500/20 text-green-400' },
  EN_PANNE: { value: 'en_panne', label: 'En panne', color: 'bg-red-500/20 text-red-400' },
  EN_MAINTENANCE: { value: 'en_maintenance', label: 'En maintenance', color: 'bg-amber-500/20 text-amber-400' },
  RETIRE: { value: 'retire', label: 'Retiré', color: 'bg-gray-500/20 text-gray-400' }
};

const TYPES = {
  EQUIPEMENT: { value: 'equipement', label: 'Équipement', color: 'bg-blue-500/20 text-blue-400' },
  INFRASTRUCTURE: { value: 'infrastructure', label: 'Infrastructure', color: 'bg-purple-500/20 text-purple-400' },
  VEHICULE: { value: 'vehicule', label: 'Véhicule', color: 'bg-teal-500/20 text-teal-400' },
  AUTRE: { value: 'autre', label: 'Autre', color: 'bg-gray-500/20 text-gray-400' }
};

const STATUT_COLORS = Object.fromEntries(Object.values(STATUTS).map(s => [s.value, s.color]));
const TYPE_COLORS = Object.fromEntries(Object.values(TYPES).map(t => [t.value, t.color]));

export default function ListeActifs() {
  const navigate = useNavigate();
  const [actifs, setActifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', statut: '', type: '', estActif: '' });
  const [modalStatut, setModalStatut] = useState(null);
  const [nouveauStatut, setNouveauStatut] = useState('');
  const [motif, setMotif] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [erreur, setErreur] = useState(null);

  // Nettoyage des filtres avant envoi
  const buildParams = useCallback(() => {
    const params = {};
    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.statut) params.statut = filters.statut;
    if (filters.type) params.type = filters.type;
    if (filters.estActif) params.estActif = filters.estActif === 'true';
    return params;
  }, [filters]);

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur(null);
    try {
      const params = buildParams();
      const res = await getActifs(params);
      setActifs(res.data.results || res.data);
    } catch (e) {
      console.error(e);
      setErreur('Erreur lors du chargement des actifs');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // Rechargement automatique quand les filtres changent (sauf search géré manuellement)
  useEffect(() => {
    charger();
  }, [charger, filters.statut, filters.type, filters.estActif]);

  const handleSearch = (e) => {
    e.preventDefault();
    charger();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer définitivement cet actif ? Cette action est irréversible.')) return;
    setActionLoading(true);
    try {
      await deleteActif(id);
      await charger();
    } catch (e) {
      console.error(e);
      setErreur('Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangerStatut = async () => {
    if (!nouveauStatut) return;
    setActionLoading(true);
    try {
      await changerStatut(modalStatut.id, nouveauStatut, motif);
      setModalStatut(null);
      setNouveauStatut('');
      setMotif('');
      await charger();
    } catch (e) {
      console.error(e);
      setErreur('Erreur lors du changement de statut');
    } finally {
      setActionLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({ search: '', statut: '', type: '', estActif: '' });
  };

  return (
    <div className="p-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Actifs</h1>
          <p className="text-gray-400 text-sm mt-1">Gestion des équipements et infrastructures</p>
        </div>
        <button
          onClick={() => navigate('/actifs/nouveau')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + Nouvel actif
        </button>
      </div>

      {/* Message d'erreur global */}
      {erreur && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg p-4 mb-6 text-sm">
          {erreur}
        </div>
      )}

      {/* Filtres */}
      <div className="bg-gray-800 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Rechercher code, libellé, série..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm flex-1 outline-none border border-gray-600 focus:border-purple-500"
          />
          <button type="submit" className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm transition">
            🔍
          </button>
        </form>

        <select
          value={filters.statut}
          onChange={e => setFilters(f => ({ ...f, statut: e.target.value }))}
          className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none"
        >
          <option value="">Tous les statuts</option>
          {Object.values(STATUTS).map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select
          value={filters.type}
          onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none"
        >
          <option value="">Tous les types</option>
          {Object.values(TYPES).map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <button
          onClick={resetFilters}
          className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm transition"
        >
          Réinitialiser
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Chargement...</div>
        ) : actifs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Aucun actif trouvé</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700/50 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Libellé</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Site</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {actifs.map(actif => (
                  <tr key={actif.id} className="hover:bg-gray-700/30 transition">
                    <td className="px-4 py-3 font-mono text-purple-300">{actif.code}</td>
                    <td className="px-4 py-3 font-medium">{actif.libelle}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[actif.type] || 'bg-gray-500/20 text-gray-400'}`}>
                        {TYPES[actif.type?.toUpperCase()]?.label || actif.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUT_COLORS[actif.statut] || 'bg-gray-500/20 text-gray-400'}`}>
                        {STATUTS[actif.statut?.toUpperCase()]?.label || actif.statut?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {actif.site_detail?.libelle || actif.site?.libelle || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/actifs/${actif.id}`)}
                          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition"
                          disabled={actionLoading}
                        >
                          Détail
                        </button>
                        <button
                          onClick={() => navigate(`/actifs/${actif.id}/modifier`)}
                          className="text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-2 py-1 rounded transition"
                          disabled={actionLoading}
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => { setModalStatut(actif); setNouveauStatut(actif.statut); setMotif(''); }}
                          className="text-xs bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 px-2 py-1 rounded transition"
                          disabled={actionLoading}
                        >
                          Statut
                        </button>
                        <button
                          onClick={() => handleDelete(actif.id)}
                          className="text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 px-2 py-1 rounded transition"
                          disabled={actionLoading}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal changer statut */}
      {modalStatut && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Changer le statut</h2>
            <p className="text-gray-400 text-sm mb-4">
              Actif : <span className="text-white font-mono">{modalStatut.code}</span>
            </p>
            <select
              value={nouveauStatut}
              onChange={e => setNouveauStatut(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none mb-3"
            >
              {Object.values(STATUTS).map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <textarea
              placeholder="Motif (optionnel)"
              value={motif}
              onChange={e => setMotif(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none mb-4 resize-none h-20"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalStatut(null)}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                disabled={actionLoading}
              >
                Annuler
              </button>
              <button
                onClick={handleChangerStatut}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition disabled:opacity-50"
                disabled={actionLoading}
              >
                {actionLoading ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}