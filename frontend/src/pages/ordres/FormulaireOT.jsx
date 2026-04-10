import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createOT, updateOT, getOT } from '../../services/ordreService';
import { getActifs } from '../../services/actifService';

export default function FormulaireOT() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState({
    idActif:'', type:'correctif', priorite:'normale',
    description:'', dureeEstimeeMin:'', estSousTraite:false, estBloquant:false,
  });
  const [actifs, setActifs]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur]   = useState(null);

  useEffect(() => {
    getActifs({estActif:true}).then(r => setActifs(r.data.results || r.data));
    if (isEdit) getOT(id).then(r => {
      const o = r.data;
      setForm({ idActif:o.idActif, type:o.type, priorite:o.priorite,
        description:o.description||'', dureeEstimeeMin:o.dureeEstimeeMin||'',
        estSousTraite:o.estSousTraite, estBloquant:o.estBloquant });
    });
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErreur(null);
    try {
      const payload = {...form};
      if (!payload.dureeEstimeeMin) delete payload.dureeEstimeeMin;
      isEdit ? await updateOT(id, payload) : await createOT(payload);
      navigate('/ordres/ots');
    } catch(e) { setErreur(e.response?.data || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 text-white max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/ordres/ots')} className="text-gray-400 hover:text-white text-sm transition">← Retour</button>
        <h1 className="text-2xl font-semibold">{isEdit ? "Modifier l'OT" : 'Nouvel Ordre de Travail'}</h1>
      </div>
      {erreur && <div className="bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg p-4 mb-6 text-sm">{typeof erreur==='object'?JSON.stringify(erreur):erreur}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 space-y-4">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider">Informations</h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Actif concerné *</label>
            <select value={form.idActif} onChange={e => setForm(f=>({...f,idActif:e.target.value}))}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none" required>
              <option value="">— Sélectionner —</option>
              {actifs.map(a => <option key={a.id} value={a.id}>{a.code} — {a.libelle}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none">
                <option value="correctif">Correctif</option>
                <option value="preventif">Préventif</option>
                <option value="amelioration">Amélioration</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Priorité</label>
              <select value={form.priorite} onChange={e => setForm(f=>({...f,priorite:e.target.value}))}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none">
                <option value="critique">Critique</option>
                <option value="haute">Haute</option>
                <option value="normale">Normale</option>
                <option value="basse">Basse</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Durée estimée (minutes)</label>
            <input type="number" value={form.dureeEstimeeMin} onChange={e => setForm(f=>({...f,dureeEstimeeMin:e.target.value}))}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none"/>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
              rows={3} className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none resize-none"/>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.estSousTraite} onChange={e => setForm(f=>({...f,estSousTraite:e.target.checked}))} className="accent-purple-500"/>
              <span className="text-sm text-gray-300">Sous-traité</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.estBloquant} onChange={e => setForm(f=>({...f,estBloquant:e.target.checked}))} className="accent-red-500"/>
              <span className="text-sm text-gray-300">Bloquant production</span>
            </label>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/ordres/ots')} className="px-5 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white">Annuler</button>
          <button type="submit" disabled={loading} className="px-5 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition text-white disabled:opacity-50">
            {loading ? 'Enregistrement...' : isEdit ? "Mettre à jour" : "Créer l'OT"}
          </button>
        </div>
      </form>
    </div>
  );
}