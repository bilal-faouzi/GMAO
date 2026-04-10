import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDemande, getDemandes } from '../../services/ordreService';
import { getActifs } from '../../services/actifService';

const URGENCE_INFO = {
  critique: { label: '🔴 Critique',  desc: 'Production arrêtée — intervention immédiate requise',  cls: 'border-red-500/50 bg-red-500/10 text-red-300' },
  haute:    { label: '🟠 Haute',     desc: 'Impact fort sur la production — traiter dans la journée', cls: 'border-orange-500/50 bg-orange-500/10 text-orange-300' },
  normale:  { label: '🔵 Normale',   desc: 'Gêne partielle — peut attendre quelques jours',          cls: 'border-blue-500/50 bg-blue-500/10 text-blue-300' },
  basse:    { label: '⚪ Basse',     desc: 'Non urgent — à traiter selon disponibilité',             cls: 'border-gray-500/50 bg-gray-500/10 text-gray-300' },
};

const STATUT = {
  en_attente: { label: 'En attente', cls: 'bg-amber-500/20 text-amber-400' },
  validee:    { label: 'Validée → OT créé', cls: 'bg-green-500/20 text-green-400' },
  rejetee:    { label: 'Rejetée', cls: 'bg-red-500/20 text-red-400' },
};

export default function DeclarerPanne() {
  const navigate = useNavigate();
  const [actifs, setActifs]     = useState([]);
  const [mesDemandes, setMesDemandes] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [actifSearch, setActifSearch] = useState('');
  const [actifSelectionne, setActifSelectionne] = useState(null);
  const [form, setForm] = useState({ idActif: '', urgence: 'normale', description: '' });
  const [erreur, setErreur]     = useState('');
  const [succes, setSucces]     = useState('');

  useEffect(() => {
    getActifs({ estActif: true }).then(r => setActifs(r.data.results || r.data));
    getDemandes().then(r => setMesDemandes((r.data.results || r.data).slice(0, 10)));
  }, []);

  const actifsFiltres = actifs.filter(a =>
    a.code?.toLowerCase().includes(actifSearch.toLowerCase()) ||
    a.libelle?.toLowerCase().includes(actifSearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur(''); setSucces('');
    if (!form.idActif)      return setErreur('Sélectionnez l\'équipement en panne.');
    if (!form.description.trim()) return setErreur('Décrivez le problème observé.');
    setLoading(true);
    try {
      const res = await createDemande(form);
      setSucces(`✅ Demande ${res.data.numero} enregistrée avec succès. Le responsable a été notifié.`);
      setForm({ idActif: '', urgence: 'normale', description: '' });
      setActifSelectionne(null); setActifSearch('');
      const r = await getDemandes();
      setMesDemandes((r.data.results || r.data).slice(0, 10));
    } catch(e) {
      setErreur(e.response?.data?.description?.[0] || e.response?.data?.error || 'Erreur lors de la déclaration.');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 text-white max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Déclarer une panne</h1>
        <p className="text-gray-400 text-sm mt-1">Signalez un dysfonctionnement sur un équipement</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulaire */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-5">
            Nouvelle déclaration de panne
          </h2>

          {erreur && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg p-3 mb-4 text-sm">{erreur}</div>
          )}
          {succes && (
            <div className="bg-green-500/20 border border-green-500/40 text-green-400 rounded-lg p-3 mb-4 text-sm">{succes}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Équipement */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-medium">
                Équipement en panne *
              </label>
              <input
                type="text"
                placeholder="Rechercher par code ou nom d'équipement..."
                value={actifSearch}
                onChange={e => { setActifSearch(e.target.value); setActifSelectionne(null); setForm(f => ({...f, idActif: ''})); }}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500 mb-1"
              />
              {actifSearch && !actifSelectionne && (
                <div className="bg-gray-700 border border-gray-600 rounded-lg max-h-40 overflow-y-auto">
                  {actifsFiltres.length === 0 ? (
                    <p className="text-gray-500 text-xs p-3 text-center">Aucun équipement trouvé</p>
                  ) : actifsFiltres.map(a => (
                    <div key={a.id}
                      onClick={() => { setActifSelectionne(a); setActifSearch(a.code); setForm(f => ({...f, idActif: a.id})); }}
                      className="flex items-center justify-between px-3 py-2 hover:bg-gray-600 cursor-pointer border-b border-gray-600/50 last:border-0">
                      <div>
                        <span className="font-mono text-sm text-blue-300">{a.code}</span>
                        <span className="text-xs text-gray-400 ml-2">{a.libelle}</span>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        a.statut === 'en_panne' ? 'bg-red-500/20 text-red-400' :
                        a.statut === 'en_service' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'}`}>
                        {a.statut?.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {actifSelectionne && (
                <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="font-mono text-sm text-blue-300">{actifSelectionne.code}</span>
                    <span className="text-sm text-gray-300 ml-2">{actifSelectionne.libelle}</span>
                  </div>
                  <button type="button" onClick={() => { setActifSelectionne(null); setActifSearch(''); setForm(f => ({...f, idActif:''})); }}
                    className="text-xs text-gray-500 hover:text-gray-300">✕</button>
                </div>
              )}
            </div>

            {/* Niveau d'urgence */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">
                Niveau d'urgence *
              </label>
              <div className="space-y-2">
                {Object.entries(URGENCE_INFO).map(([k, v]) => (
                  <label key={k}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      form.urgence === k ? v.cls + ' border-opacity-100' : 'border-gray-700 bg-gray-700/30 hover:bg-gray-700/60'
                    }`}>
                    <input type="radio" name="urgence" value={k}
                      checked={form.urgence === k}
                      onChange={e => setForm(f => ({...f, urgence: e.target.value}))}
                      className="mt-0.5 accent-purple-500"/>
                    <div>
                      <p className="text-sm font-medium">{v.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{v.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-medium">
                Description du problème *
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({...f, description: e.target.value}))}
                rows={5}
                placeholder={`Décrivez précisément ce que vous observez :\n• Quel est le symptôme ? (bruit, fuite, arrêt, surchauffe...)\n• Depuis quand ?\n• Dans quelles conditions cela se produit-il ?`}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {form.description.length} caractères — plus vous êtes précis, plus vite l'intervention sera réalisée
              </p>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl text-sm font-semibold transition text-white">
              {loading ? 'Envoi en cours...' : '📢 Déclarer la panne'}
            </button>
          </form>
        </div>

        {/* Mes déclarations récentes */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Mes déclarations récentes
          </h2>

          {mesDemandes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-gray-400 text-sm">Aucune déclaration</p>
              <p className="text-gray-600 text-xs mt-1">Vos déclarations apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mesDemandes.map(d => (
                <div key={d.id} className="bg-gray-700/40 rounded-xl p-4 border border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-sm text-purple-300">{d.numero}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT[d.statut]?.cls}`}>
                      {STATUT[d.statut]?.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-blue-300">{d.actif_detail?.code} — {d.actif_detail?.libelle}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{d.description}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${URGENCE_INFO[d.urgence]?.cls}`}>
                      {URGENCE_INFO[d.urgence]?.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(d.dateSignalement).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  {d.statut === 'rejetee' && d.motifRejet && (
                    <div className="mt-2 p-2 bg-red-500/10 rounded-lg">
                      <p className="text-xs text-red-400">Motif rejet : {d.motifRejet}</p>
                    </div>
                  )}
                  {d.statut === 'validee' && (
                    <div className="mt-2 p-2 bg-green-500/10 rounded-lg">
                      <p className="text-xs text-green-400">✅ OT créé — intervention en cours de traitement</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-700">
            <button onClick={() => navigate('/ordres/demandes')}
              className="w-full py-2 text-sm text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/10 transition">
              Voir toutes les demandes →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}