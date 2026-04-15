import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDemande } from '../../services/ordreService';
import { getActifs } from '../../services/actifService';

export default function FormulaireDemande() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ idActif:'', description:'', urgence:'normale' });
  const [actifs, setActifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur]   = useState(null);

  useEffect(() => {
    getActifs({ estActif: true }).then(r => setActifs(r.data.results || r.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErreur(null);
    try {
      await createDemande(form);
      navigate('/ordres/demandes');
    } catch(e) { setErreur(e.response?.data || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 text-white max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/ordres/demandes')}
          className="text-gray-400 hover:text-white text-sm transition">← Retour</button>
        <h1 className="text-2xl font-semibold">Déclarer une panne</h1>
      </div>

      {erreur && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg p-4 mb-6 text-sm">
          {typeof erreur==='object' ? JSON.stringify(erreur) : erreur}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Informations</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Actif concerné *</label>
              <select name="idActif" value={form.idActif}
                onChange={e => setForm(f => ({...f, idActif: e.target.value}))}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500" required>
                <option value="">— Sélectionner l'équipement en panne —</option>
                {actifs.map(a => (
                  <option key={a.id} value={a.id}>{a.code} — {a.libelle}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Urgence *</label>
              <select value={form.urgence}
                onChange={e => setForm(f => ({...f, urgence: e.target.value}))}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500">
                <option value="critique">🔴 Critique — Production arrêtée</option>
                <option value="haute">🟠 Haute — Impact fort</option>
                <option value="normale">🔵 Normale — Gêne partielle</option>
                <option value="basse">⚪ Basse — Non urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Description de la panne *</label>
              <textarea value={form.description}
                onChange={e => setForm(f => ({...f, description: e.target.value}))}
                rows={4} required
                placeholder="Décrivez le problème observé, les symptômes, ce qui s'est passé..."
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500 resize-none"/>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/ordres/demandes')}
            className="px-5 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white">Annuler</button>
          <button type="submit" disabled={loading}
            className="px-5 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition text-white disabled:opacity-50">
            {loading ? 'Envoi...' : 'Déclarer la panne'}
          </button>
        </div>
      </form>
    </div>
  );
}