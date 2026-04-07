import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPiece, getMouvementsByPiece, sortiePiece, entreePiece } from '../../services/magasinService';

export default function DetailPiece() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [piece, setPiece]         = useState(null);
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [quantite, setQuantite]   = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [errModal, setErrModal]   = useState('');

  const charger = async () => {
    try {
      const [p, m] = await Promise.all([getPiece(id), getMouvementsByPiece(id)]);
      setPiece(p.data);
      setMouvements(m.data.results || m.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { charger(); }, [id]);

  const handleMouvement = async () => {
    setErrModal('');
    try {
      if (modal === 'sortie') await sortiePiece(id, quantite, commentaire);
      else await entreePiece(id, quantite, commentaire);
      setModal(null); setQuantite(''); setCommentaire('');
      charger();
    } catch(e) { setErrModal(e.response?.data?.error || 'Erreur'); }
  };

  if (loading) return <div className="p-6 text-gray-400">Chargement...</div>;
  if (!piece)  return <div className="p-6 text-red-400">Pièce introuvable.</div>;

  return (
    <div className="p-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/magasin')} className="text-gray-400 hover:text-white text-sm transition">← Retour</button>
          <h1 className="text-2xl font-semibold font-mono">{piece.reference}</h1>
          {piece.est_sous_seuil && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
              Stock critique
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setModal('entree'); setQuantite(''); setErrModal(''); }}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm transition">+ Entrée</button>
          <button onClick={() => { setModal('sortie'); setQuantite(''); setErrModal(''); }}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm transition">- Sortie</button>
          <button onClick={() => navigate(`/magasin/${id}/modifier`)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm transition">Modifier</button>
        </div>
      </div>

      {/* Infos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Identification</h2>
          {[
            ['Désignation',    piece.designation],
            ['Catégorie',      piece.categorie || '—'],
            ['Unité',          piece.unite],
            ['Emplacement',    piece.emplacement || '—'],
            ['Fournisseur',    piece.fournisseur || '—'],
            ['Réf. constructeur', piece.referenceConstructeur || '—'],
          ].map(([l,v]) => (
            <div key={l} className="flex justify-between text-sm py-1.5 border-b border-gray-700/50 last:border-0">
              <span className="text-gray-400">{l}</span>
              <span className="text-white font-medium">{v}</span>
            </div>
          ))}
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Stock & Valeur</h2>
          {[
            ['Stock actuel',   `${piece.quantiteStock} ${piece.unite}`],
            ['Seuil minimum',  `${piece.seuilMinimum} ${piece.unite}`],
            ['Prix unitaire',  piece.prixUnitaire ? `${piece.prixUnitaire} MAD` : '—'],
            ['Valeur totale',  piece.valeur_stock_total ? `${piece.valeur_stock_total} MAD` : '—'],
            ['Dernière entrée', piece.dateDerniereEntree ? new Date(piece.dateDerniereEntree).toLocaleString('fr-FR') : '—'],
          ].map(([l,v]) => (
            <div key={l} className="flex justify-between text-sm py-1.5 border-b border-gray-700/50 last:border-0">
              <span className="text-gray-400">{l}</span>
              <span className={`font-medium ${l==='Stock actuel' && piece.est_sous_seuil ? 'text-red-400' : 'text-white'}`}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Historique mouvements */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-700">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            Historique des mouvements ({mouvements.length})
          </h2>
        </div>
        {mouvements.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">Aucun mouvement</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-gray-400 text-xs uppercase bg-gray-700/30">
              <tr>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Quantité</th>
                <th className="px-4 py-3 text-left">Avant</th>
                <th className="px-4 py-3 text-left">Après</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Commentaire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {mouvements.map(m => (
                <tr key={m.id} className="hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.typeMouvement==='entree' ? 'bg-green-500/20 text-green-400' :
                      m.typeMouvement==='sortie' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>{m.typeMouvement}</span>
                  </td>
                  <td className="px-4 py-3 font-bold">{m.typeMouvement==='sortie' ? '-' : '+'}{m.quantite}</td>
                  <td className="px-4 py-3 text-gray-400">{m.stockAvant}</td>
                  <td className="px-4 py-3 font-medium">{m.stockApres}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(m.dateHeure).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3 text-gray-400">{m.commentaire || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-1">{modal==='entree' ? '+ Entrée stock' : '- Sortie stock'}</h2>
            <p className="text-gray-400 text-sm mb-4">Stock actuel : <span className="text-white font-bold">{piece.quantiteStock} {piece.unite}</span></p>
            {errModal && <div className="bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg p-3 mb-3 text-xs">{errModal}</div>}
            <input type="number" placeholder="Quantité" value={quantite} onChange={e=>setQuantite(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none mb-3"/>
            <textarea placeholder="Commentaire (optionnel)" value={commentaire} onChange={e=>setCommentaire(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none mb-4 resize-none h-16"/>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white">Annuler</button>
              <button onClick={handleMouvement}
                className={`px-4 py-2 text-sm rounded-lg transition text-white ${modal==='entree' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}