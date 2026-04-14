import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOT, changerStatutOT, ajouterCommentaire } from '../../services/ordreService';
import { Send, AlertTriangle, CheckCircle } from 'lucide-react';

const CATEGORIES_CAUSE = {
  mecanique:   { label: 'Mécanique', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  electrique:  { label: 'Électrique', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  humain:      { label: 'Erreur humaine', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  externe:     { label: 'Facteur externe', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  autre:       { label: 'Autre', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

export default function CompteRenduOT() {
  const { idOT } = useParams();
  const navigate = useNavigate();
  const [ot, setOT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [rapport, setRapport] = useState({
    descriptionTravail: '',
    constatations: '',
    causeRacine: '',
    solutionApportee: '',
    estCloture: false,
    typeCloture: 'depanne' // 'depanne' ou 'corrige'
  });
  
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  useEffect(() => {
    getOT(idOT)
      .then(r => setOT(r.data))
      .catch(e => setErreur('Impossible charger la commande'))
      .finally(() => setLoading(false));
  }, [idOT]);

  const handleSubmitRapport = async (e) => {
    e.preventDefault();
    setErreur(''); setSucces('');
    
    if (!rapport.descriptionTravail.trim())
      return setErreur('Décrivez les travaux réalisés.');
    if (!rapport.solutionApportee.trim())
      return setErreur('Décrivez la solution apportée.');
    
    setSubmitting(true);
    try {
      // Ajouter le compte rendu comme commentaire interne
      const compteRendu = `📋 COMPTE RENDU INTERVENTION\n\n` +
        `📝 Travaux réalisés:\n${rapport.descriptionTravail}\n\n` +
        `🔍 Constatations:\n${rapport.constatations || 'Voir description'}\n\n` +
        `🎯 Solution apportée:\n${rapport.solutionApportee}\n\n` +
        `⚙️ Cause racine: ${CATEGORIES_CAUSE[rapport.causeRacine]?.label || 'Non identifiée'}`;
      
      await ajouterCommentaire(idOT, compteRendu, true);
      
      // Mettre à jour le statut si clôture demandée
      if (rapport.estCloture) {
        await changerStatutOT(idOT, 'EN_VALIDATION', rapport.typeCloture);
        setSucces(`✅ Rapport enregistré. OT en attente de validation opérateur.`);
      } else {
        setSucces('✅ Rapport enregistré. OT reste en cours.');
      }
      
      setRapport({
        descriptionTravail: '',
        constatations: '',
        causeRacine: '',
        solutionApportee: '',
        estCloture: false,
        typeCloture: 'depanne'
      });
      
      setTimeout(() => navigate('/ordres/ots'), 1500);
    } catch(e) {
      setErreur(e.response?.data?.error || 'Erreur lors de la sauvegarde.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-6 text-gray-400 text-center py-12">Chargement...</div>;
  if (!ot) return <div className="p-6 text-red-400">OT non trouvé</div>;

  return (
    <div className="p-6 text-white max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="text-purple-400 text-sm mb-3 hover:text-purple-300">
          ← Retour
        </button>
        <h1 className="text-2xl font-semibold">Compte rendu d'intervention</h1>
        <p className="text-gray-400 text-sm mt-1">Documentez l'intervention réalisée sur {ot.actif_detail?.code}</p>
      </div>

      {/* Infos OT */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Numéro OT</p>
            <p className="text-lg font-mono text-purple-300">{ot.numero}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Équipement</p>
            <p className="text-sm font-medium">{ot.actif_detail?.code}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Priorité</p>
            <p className={`text-sm font-semibold ${
              ot.priorite === 'critique' ? 'text-red-400' :
              ot.priorite === 'haute' ? 'text-orange-400' :
              'text-blue-400'
            }`}>{ot.priorite}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Statut</p>
            <p className="text-sm text-amber-400">{ot.statut}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {erreur && <div className="bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg p-4 mb-4 text-sm">{erreur}</div>}
      {succes && <div className="bg-green-500/20 border border-green-500/40 text-green-400 rounded-lg p-4 mb-4 text-sm">{succes}</div>}

      {/* Formulaire rapport */}
      <form onSubmit={handleSubmitRapport} className="space-y-5">
        
        {/* Travaux réalisés */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">
            📋 Travaux réalisés
          </h3>
          <textarea
            value={rapport.descriptionTravail}
            onChange={e => setRapport(r => ({...r, descriptionTravail: e.target.value}))}
            placeholder="Détaillez les actions effectuées, les pièces changées, les réglages..."
            rows={4}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500 resize-none"
          />
        </div>

        {/* Constatations */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">
            🔍 Constatations
          </h3>
          <textarea
            value={rapport.constatations}
            onChange={e => setRapport(r => ({...r, constatations: e.target.value}))}
            placeholder="État de l'équipement avant/après, observations importantes..."
            rows={3}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {/* Cause racine */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-3">
            ⚙️ Cause racine identifiée
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(CATEGORIES_CAUSE).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => setRapport(r => ({...r, causeRacine: k}))}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${
                  rapport.causeRacine === k 
                    ? v.color + ' border-opacity-100'
                    : 'bg-gray-700 border-gray-600 text-gray-400 hover:text-gray-200'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Solution apportée */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3">
            ✅ Solution apportée
          </h3>
          <textarea
            value={rapport.solutionApportee}
            onChange={e => setRapport(r => ({...r, solutionApportee: e.target.value}))}
            placeholder="Résumé de la solution définitive. L'équipement est-il revenu à la normale ?"
            rows={3}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-green-500 resize-none"
          />
        </div>

        {/* État final */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            🏁 État final de l'équipement
          </h3>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-green-600/30 bg-green-600/10 cursor-pointer hover:bg-green-600/20 transition"
              onClick={() => setRapport(r => ({...r, estCloture: true, typeCloture: 'corrige'}))}>
              <input type="radio" name="etatFinal" checked={rapport.estCloture && rapport.typeCloture === 'corrige'}
                onChange={() => {}} className="mt-1 accent-green-500" />
              <div>
                <p className="text-sm font-medium text-green-300"><CheckCircle className="inline mr-1" size={16}/>Réparation définitive</p>
                <p className="text-xs text-green-400 mt-0.5">L'équipement fonctionne normalement — prêt pour la clôture</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-orange-600/30 bg-orange-600/10 cursor-pointer hover:bg-orange-600/20 transition"
              onClick={() => setRapport(r => ({...r, estCloture: true, typeCloture: 'depanne'}))}>
              <input type="radio" name="etatFinal" checked={rapport.estCloture && rapport.typeCloture === 'depanne'}
                onChange={() => {}} className="mt-1 accent-orange-500" />
              <div>
                <p className="text-sm font-medium text-orange-300"><AlertTriangle className="inline mr-1" size={16}/>Dépannage temporaire</p>
                <p className="text-xs text-orange-400 mt-0.5">Solution temporaire — l'équipement fonctionne partiellement, intervention ultérieure nécessaire</p>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-semibold transition">
            Annuler
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
            <Send size={16} /> {submitting ? 'Envoi...' : 'Envoyer le rapport'}
          </button>
        </div>
      </form>
    </div>
  );
}
