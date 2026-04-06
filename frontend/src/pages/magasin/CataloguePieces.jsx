import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPieces, deletePiece, sortiePiece, entreePiece } from '../../services/magasinService';

export default function CataloguePieces() {
  const navigate = useNavigate();
  const [pieces, setPieces]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filtreAlerte, setFiltreAlerte] = useState(false);
  const [modal, setModal]       = useState(null); // { type: 'sortie'|'entree', piece }
  const [quantite, setQuantite] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [errModal, setErrModal] = useState('');

  const charger = async () => {
    setLoading(true);
    try {
      const res = await getPieces();
      setPieces(res.data.results || res.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { charger(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette pièce ?')) return;
    await deletePiece(id);
    charger();
  };

  const handleMouvement = async () => {
    setErrModal('');
    try {
      if (modal.type === 'sortie') {
        await sortiePiece(modal.piece.id, quantite, commentaire);
      } else {
        await entreePiece(modal.piece.id, quantite, commentaire);
      }
      setModal(null); setQuantite(''); setCommentaire('');
      charger();
    } catch(e) {
      setErrModal(e.response?.data?.error || 'Erreur');
    }
  };

  const filtered = pieces.filter(p => {
    const matchSearch = p.reference.toLowerCase().includes(search.toLowerCase()) ||
                        p.designation.toLowerCase().includes(search.toLowerCase());
    const matchAlerte = filtreAlerte ? p.est_sous_seuil : true;
    return matchSearch && matchAlerte;
  });

  return (
    <div className="p-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Catalogue des pièces</h1>
          <p className="text-gray-400 text-sm mt-1">{pieces.length} références</p>
        </div>
        <button
          onClick={() => navigate('/magasin/nouveau')}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm transition"
        >
          + Nouvelle pièce
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Rechercher référence, désignation..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 outline-none focus:border-purple-500 flex-1 min-w-[200px]"
        />
        <button
          onClick={() => setFiltreAlerte(!filtreAlerte)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
            filtreAlerte
              ? 'bg-red-500/20 border-red-500/40 text-red-400'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          {filtreAlerte ? '🔴 Alertes uniquement' : '🔴 Voir alertes'}
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Aucune pièce trouvée</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-700/50 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Référence</th>
                <th className="px-4 py-3 text-left">Désignation</th>
                <th className="px-4 py-3 text-left">Stock</th>
                <th className="px-4 py-3 text-left">Seuil min</th>
                <th className="px-4 py-3 text-left">Emplacement</th>
                <th className="px-4 py-3 text-left">Prix unit.</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-700/30 transition">
                  <td className="px-4 py-3">
                    <span className="font-mono text-purple-300">{p.reference}</span>
                    {p.est_sous_seuil && (
                      <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">alerte</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.designation}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${p.est_sous_seuil ? 'text-red-400' : 'text-green-400'}`}>
                      {p.quantiteStock}
                    </span>
                    <span className="text-gray-500 text-xs ml-1">{p.unite}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{p.seuilMinimum} {p.unite}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{p.emplacement || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {p.prixUnitaire ? `${p.prixUnitaire} MAD` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={() => navigate(`/magasin/${p.id}`)}
                        className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition"
                      >Détail</button>
                      <button
                        onClick={() => { setModal({type:'entree', piece:p}); setQuantite(''); setErrModal(''); }}
                        className="text-xs bg-green-600/20 hover:bg-green-600/40 text-green-400 px-2 py-1 rounded transition"
                      >+ Entrée</button>
                      <button
                        onClick={() => { setModal({type:'sortie', piece:p}); setQuantite(''); setErrModal(''); }}
                        className="text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 px-2 py-1 rounded transition"
                      >- Sortie</button>
                      <button
                        onClick={() => navigate(`/magasin/${p.id}/modifier`)}
                        className="text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-2 py-1 rounded transition"
                      >Modifier</button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 px-2 py-1 rounded transition"
                      >×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Entrée/Sortie */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-1">
              {modal.type === 'entree' ? '+ Entrée stock' : '- Sortie stock'}
            </h2>
            <p className="text-gray-400 text-sm mb-4 font-mono">{modal.piece.reference} — {modal.piece.designation}</p>
            <p className="text-xs text-gray-500 mb-4">
              Stock actuel : <span className="text-white font-bold">{modal.piece.quantiteStock} {modal.piece.unite}</span>
            </p>
            {errModal && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg p-3 mb-3 text-xs">{errModal}</div>
            )}
            <input
              type="number"
              placeholder="Quantité"
              value={quantite}
              onChange={e => setQuantite(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none mb-3"
            />
            <textarea
              placeholder="Commentaire (optionnel)"
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none mb-4 resize-none h-16"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition">Annuler</button>
              <button
                onClick={handleMouvement}
                className={`px-4 py-2 text-sm rounded-lg transition ${
                  modal.type === 'entree'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}