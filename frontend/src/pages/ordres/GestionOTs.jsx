import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getOTs, getDemandes, validerDemande, rejeterDemande,
  changerStatutOT, affecterEquipe, ajouterCommentaire, cloturerOT
} from '../../services/ordreService';

const PRIORITE_CLS = {
  critique: 'bg-red-500/20 text-red-400 border-red-500/40',
  haute:    'bg-orange-500/20 text-orange-400 border-orange-500/40',
  normale:  'bg-blue-500/20 text-blue-400 border-blue-500/40',
  basse:    'bg-gray-500/20 text-gray-400 border-gray-500/40',
};
const STATUT_CLS = {
  OUVERT:                'bg-blue-500/20 text-blue-400 border-blue-500/30',
  EN_COURS:              'bg-amber-500/20 text-amber-400 border-amber-500/30',
  DEPANNE:               'bg-orange-500/20 text-orange-400 border-orange-500/30',
  EN_ATTENTE_CORRECTION: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  EN_VALIDATION:         'bg-purple-500/20 text-purple-400 border-purple-500/30',
  CLOTURE:               'bg-green-500/20 text-green-400 border-green-500/30',
};
const STATUT_LABEL = {
  OUVERT:'Ouvert', EN_COURS:'En cours', DEPANNE:'Dépanné',
  EN_ATTENTE_CORRECTION:'En attente', EN_VALIDATION:'En validation', CLOTURE:'Clôturé',
};
const TRANSITIONS = {
  OUVERT:                ['EN_COURS'],
  EN_COURS:              ['DEPANNE','EN_VALIDATION'],
  DEPANNE:               ['EN_ATTENTE_CORRECTION','EN_COURS'],
  EN_ATTENTE_CORRECTION: ['EN_COURS'],
  EN_VALIDATION:         ['CLOTURE','EN_COURS'],
};

// ── Composant Affectation ───────────────────────────
function AffectationForm({ otId, onSuccess }) {
  const [equipes, setEquipes]     = useState([]);
  const [soustraitants, setST]    = useState([]);
  const [type, setType]           = useState('interne');
  const [idEquipe, setIdEquipe]   = useState('');
  const [idST, setIdST]           = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [loading, setLoading]     = useState(false);
  const [erreur, setErreur]       = useState('');
  const [succes, setSucces]       = useState('');

  useEffect(() => {
    import('../../services/api').then(({ default: api }) => {
      api.get('/v1/organisation/equipes/').then(r => setEquipes(r.data.results || r.data));
      api.get('/v1/soustraitants/?statut=actif').then(r => setST(r.data.results || r.data));
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur(''); setSucces('');
    if (type === 'interne' && !idEquipe)  return setErreur('Sélectionnez une équipe.');
    if (type === 'externe' && !idST)      return setErreur('Sélectionnez un sous-traitant.');
    setLoading(true);
    try {
      await affecterEquipe(otId, {
        idEquipe:       type === 'interne' ? idEquipe : null,
        idSousTraitant: type === 'externe' ? idST : null,
        dateDebut:      dateDebut || new Date().toISOString(),
      });
      setSucces('✅ Affectation enregistrée');
      setIdEquipe(''); setIdST(''); setDateDebut('');
      onSuccess();
    } catch(e) {
      setErreur(e.response?.data?.error || 'Erreur affectation.');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {erreur && <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded">{erreur}</p>}
      {succes && <p className="text-green-400 text-xs bg-green-500/10 p-2 rounded">{succes}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={() => setType('interne')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
            type==='interne' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-400 hover:text-white'}`}>
          👥 Équipe interne
        </button>
        <button type="button" onClick={() => setType('externe')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
            type==='externe' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-400 hover:text-white'}`}>
          🏢 Sous-traitant
        </button>
      </div>

      {type === 'interne' && (
        <select value={idEquipe} onChange={e => setIdEquipe(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-xs border border-gray-600 outline-none focus:border-purple-500">
          <option value="">— Sélectionner une équipe —</option>
          {equipes.map(eq => (
            <option key={eq.id} value={eq.id}>{eq.libelle}</option>
          ))}
        </select>
      )}

      {type === 'externe' && (
        <select value={idST} onChange={e => setIdST(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-xs border border-gray-600 outline-none focus:border-amber-500">
          <option value="">— Sélectionner un sous-traitant —</option>
          {soustraitants.map(st => (
            <option key={st.id} value={st.id}>{st.raisonSociale}</option>
          ))}
        </select>
      )}

      <div>
        <label className="block text-xs text-gray-500 mb-1">Date début (optionnel)</label>
        <input type="datetime-local" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-xs border border-gray-600 outline-none"/>
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition disabled:opacity-50">
        {loading ? 'Affectation...' : '👥 Confirmer l\'affectation'}
      </button>
    </form>
  );
}

// ── Composant principal ────────────────────────────
export default function GestionOTs() {
  const navigate = useNavigate();
  const [ots, setOTs]           = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [onglet, setOnglet]     = useState('ots');
  const [filtreStatut, setFiltreStatut]     = useState('');
  const [filtrePriorite, setFiltrePriorite] = useState('');
  const [otSelectionne, setOtSelectionne]   = useState(null);
  const [panneauOnglet, setPanneauOnglet]   = useState('actions');
  const [modalStatut, setModalStatut]       = useState(false);
  const [nvStatut, setNvStatut]             = useState('');
  const [motifStatut, setMotifStatut]       = useState('');
  const [modalRejet, setModalRejet]         = useState(null);
  const [motifRejet, setMotifRejet]         = useState('');
  const [modalComment, setModalComment]     = useState(false);
  const [newComment, setNewComment]         = useState('');
  const [estInterne, setEstInterne]         = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [modalAffectationAuto, setModalAffectationAuto] = useState(false);
  const [otAffectationAuto, setOtAffectationAuto] = useState(null);

  const charger = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtreStatut)   params.statut   = filtreStatut;
      if (filtrePriorite) params.priorite = filtrePriorite;
      const [o, d] = await Promise.all([
        getOTs(params),
        getDemandes({ statut: 'en_attente' })
      ]);
      const otsData = o.data.results || o.data;
      setOTs(otsData);
      setDemandes(d.data.results || d.data);
      if (otSelectionne) {
        const updated = otsData.find(x => x.id === otSelectionne.id);
        if (updated) setOtSelectionne(updated);
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { charger(); }, [filtreStatut, filtrePriorite]);

  const handleChangerStatut = async () => {
    setSubmitting(true);
    try {
      await changerStatutOT(otSelectionne.id, nvStatut, motifStatut);
      setModalStatut(false); setNvStatut(''); setMotifStatut('');
      charger();
    } finally { setSubmitting(false); }
  };

  const handleCloturer = async () => {
    if (!confirm('Clôturer définitivement cet OT ?')) return;
    setSubmitting(true);
    try {
      await cloturerOT(otSelectionne.id, 'corrige', '');
      charger();
    } finally { setSubmitting(false); }
  };

  const handleValider = async (id) => {
    try {
      await validerDemande(id);
      // Rafraîchir et récupérer l'OT nouvellement créé
      const params = {};
      if (filtreStatut)   params.statut   = filtreStatut;
      if (filtrePriorite) params.priorite = filtrePriorite;
      const [oRes, dRes] = await Promise.all([
        getOTs(params),
        getDemandes({ statut: 'en_attente' })
      ]);
      
      const allOTs = oRes.data.results || oRes.data;
      const allDemandes = dRes.data.results || dRes.data;
      
      setOTs(allOTs);
      setDemandes(allDemandes);
      setOnglet('ots');
      
      // Trouver le nouvel OT créé pour cette demande
      const demandeObj = demandes.find(d => d.id === id);
      if (demandeObj) {
        const newOT = allOTs.find(ot => ot.idDemandeIntervention?.toString() === id?.toString() || ot.idDemandeIntervention === demandeObj.id);
        if (newOT) {
          // Attendre un peu pour s'assurer que le DOM est à jour
          setTimeout(() => {
            setOtSelectionne(newOT);
            setOtAffectationAuto(newOT);
            setModalAffectationAuto(true);
            setPanneauOnglet('actions');
          }, 200);
        }
      }
    } catch(e) {
      console.error('Erreur validation:', e);
    }
  };

  const handleRejeter = async () => {
    await rejeterDemande(modalRejet, motifRejet);
    setModalRejet(null); setMotifRejet('');
    charger();
  };

  const handleCommentaire = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await ajouterCommentaire(otSelectionne.id, newComment, estInterne);
      setModalComment(false); setNewComment(''); setEstInterne(false);
      charger();
    } finally { setSubmitting(false); }
  };

  const otsTries = [...ots].sort((a, b) => {
    const ord = { critique:0, haute:1, normale:2, basse:3 };
    return (ord[a.priorite]||2) - (ord[b.priorite]||2);
  });

  return (
    <div className="flex h-full text-white overflow-hidden">

      {/* ── Liste principale ───────────────────────── */}
      <div className={`flex flex-col ${otSelectionne ? 'w-1/2' : 'w-full'} transition-all duration-300 min-h-0`}>
        <div className="p-6 pb-0 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-semibold">Gestion des Interventions</h1>
              <p className="text-gray-400 text-sm mt-1">Responsable Techniciens</p>
            </div>
            <button onClick={() => navigate('/ordres/ots/nouveau')}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm transition">
              + Nouvel OT
            </button>
          </div>

          <div className="flex gap-1 mb-4">
            <button onClick={() => setOnglet('ots')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${onglet==='ots' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              Ordres de travail ({ots.length})
            </button>
            <button onClick={() => setOnglet('demandes')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition relative ${onglet==='demandes' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              Demandes en attente
              {demandes.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {demandes.length}
                </span>
              )}
            </button>
          </div>

          {onglet === 'ots' && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 outline-none">
                <option value="">Tous statuts</option>
                {Object.entries(STATUT_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={filtrePriorite} onChange={e => setFiltrePriorite(e.target.value)}
                className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 outline-none">
                <option value="">Toutes priorités</option>
                <option value="critique">Critique</option>
                <option value="haute">Haute</option>
                <option value="normale">Normale</option>
                <option value="basse">Basse</option>
              </select>
              <button onClick={charger} className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm transition">↺</button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="text-gray-400 text-center py-12">Chargement...</div>
          ) : onglet === 'ots' ? (
            <div className="space-y-2">
              {otsTries.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Aucun OT trouvé</div>
              ) : otsTries.map(ot => (
                <div key={ot.id}
                  onClick={() => { setOtSelectionne(ot); setPanneauOnglet('actions'); }}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    otSelectionne?.id === ot.id
                      ? 'bg-purple-500/10 border-purple-500/40'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-purple-300">{ot.numero}</span>
                      {ot.est_en_retard && <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">⚠ Retard</span>}
                      {ot.estBloquant   && <span className="text-xs bg-red-500/30 text-red-300 px-1.5 py-0.5 rounded-full">🔴 Bloquant</span>}
                      {ot.estSousTraite && <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">🏢 ST</span>}
                    </div>
                    <div className="flex gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITE_CLS[ot.priorite]}`}>{ot.priorite}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUT_CLS[ot.statut]}`}>{STATUT_LABEL[ot.statut]}</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium">{ot.actif_detail?.code} — {ot.actif_detail?.libelle}</p>
                  {ot.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{ot.description}</p>}
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span>💬 {ot.nb_commentaires || 0}</span>
                      <span>🔧 {ot.nb_pieces_utilisees || 0} pièces</span>
                      <span>👥 {ot.affectations?.length || 0} affect.</span>
                    </div>
                    {ot.echeanceSLA && (
                      <span className={`text-xs ${ot.est_en_retard ? 'text-red-400' : 'text-gray-500'}`}>
                        SLA: {new Date(ot.echeanceSLA).toLocaleString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {demandes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">✅</p>
                  <p className="text-gray-400 text-sm">Aucune demande en attente</p>
                </div>
              ) : demandes.map(d => (
                <div key={d.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-sm text-purple-300">{d.numero}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITE_CLS[d.urgence]}`}>{d.urgence}</span>
                  </div>
                  <p className="text-sm font-medium">{d.actif_detail?.code} — {d.actif_detail?.libelle}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{d.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(d.dateSignalement).toLocaleString('fr-FR')}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleValider(d.id)}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition">
                      ✓ Valider → Créer OT
                    </button>
                    <button onClick={() => { setModalRejet(d.id); setMotifRejet(''); }}
                      className="flex-1 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm font-medium border border-red-500/30 transition">
                      ✗ Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Panneau latéral ────────────────────────── */}
      {otSelectionne && (
        <div className="w-1/2 border-l border-gray-700 flex flex-col bg-gray-900 min-h-0">
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-lg text-purple-300">{otSelectionne.numero}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUT_CLS[otSelectionne.statut]}`}>
                    {STATUT_LABEL[otSelectionne.statut]}
                  </span>
                  {otSelectionne.est_en_retard && <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">⚠ Retard</span>}
                </div>
                <p className="text-sm text-gray-300">{otSelectionne.actif_detail?.libelle}</p>
              </div>
              <button onClick={() => setOtSelectionne(null)} className="text-gray-500 hover:text-white text-lg ml-2">✕</button>
            </div>
            <div className="flex gap-1 mt-3">
              {['actions','infos','historique'].map(o => (
                <button key={o} onClick={() => setPanneauOnglet(o)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${panneauOnglet===o ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">

            {/* ── Actions ── */}
            {panneauOnglet === 'actions' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Actions disponibles</p>

                {/* Changer statut */}
                {TRANSITIONS[otSelectionne.statut] && (
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-3 font-medium">Changer le statut</p>
                    <div className="grid grid-cols-1 gap-2">
                      {TRANSITIONS[otSelectionne.statut].map(s => (
                        <button key={s}
                          onClick={() => { setNvStatut(s); setMotifStatut(''); setModalStatut(true); }}
                          className={`py-2 px-3 rounded-lg text-sm font-medium border transition ${STATUT_CLS[s]} hover:opacity-80`}>
                          → {STATUT_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clôturer */}
                {otSelectionne.statut === 'EN_VALIDATION' && (
                  <button onClick={handleCloturer} disabled={submitting}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold transition disabled:opacity-50">
                    ✅ Clôturer l'OT définitivement
                  </button>
                )}

                {/* Affecter équipe */}
                {['OUVERT','EN_COURS'].includes(otSelectionne.statut) && (
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-3 font-medium">Affecter une équipe / sous-traitant</p>
                    <AffectationForm otId={otSelectionne.id} onSuccess={charger} />
                  </div>
                )}

                {/* Affectations existantes */}
                {otSelectionne.affectations?.length > 0 && (
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-2 font-medium">Affectations en cours ({otSelectionne.affectations.length})</p>
                    <div className="space-y-2">
                      {otSelectionne.affectations.map(a => (
                        <div key={a.id} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg">
                          <div>
                            <p className="text-xs font-medium text-white">
                              {a.equipe_detail?.libelle || a.soustraitant_detail?.raisonSociale || '—'}
                            </p>
                            <p className="text-xs text-gray-500">{new Date(a.dateDebut).toLocaleString('fr-FR')}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            a.statut==='termine'  ? 'bg-green-500/20 text-green-400' :
                            a.statut==='en_cours' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-gray-500/20 text-gray-400'}`}>{a.statut}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commentaire */}
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <p className="text-xs text-gray-400 mb-3 font-medium">Compte rendu / Commentaire</p>
                  <button onClick={() => setModalComment(true)}
                    className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition">
                    ✏️ Saisir compte rendu
                  </button>
                </div>

                {/* Voir détail */}
                <button onClick={() => navigate(`/ordres/ots/${otSelectionne.id}`)}
                  className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-xl text-sm border border-purple-500/30 transition">
                  Voir détail complet →
                </button>
              </div>
            )}

            {/* ── Infos ── */}
            {panneauOnglet === 'infos' && (
              <div className="space-y-2">
                {[
                  ['Actif',         `${otSelectionne.actif_detail?.code} — ${otSelectionne.actif_detail?.libelle}`],
                  ['Type',          otSelectionne.type],
                  ['Priorité',      otSelectionne.priorite],
                  ['Sous-traité',   otSelectionne.estSousTraite ? 'Oui' : 'Non'],
                  ['Bloquant',      otSelectionne.estBloquant ? 'Oui' : 'Non'],
                  ['Durée estimée', otSelectionne.dureeEstimeeMin ? `${otSelectionne.dureeEstimeeMin} min` : '—'],
                  ['Durée réelle',  otSelectionne.dureeReelleMin ? `${otSelectionne.dureeReelleMin} min` : '—'],
                  ['Échéance SLA',  otSelectionne.echeanceSLA ? new Date(otSelectionne.echeanceSLA).toLocaleString('fr-FR') : '—'],
                  ['Coût total',    `${otSelectionne.cout_total || 0} MAD`],
                ].map(([l,v]) => (
                  <div key={l} className="flex justify-between text-sm py-2 border-b border-gray-800">
                    <span className="text-gray-400">{l}</span>
                    <span className="text-white font-medium text-right max-w-[55%]">{v}</span>
                  </div>
                ))}
                {otSelectionne.description && (
                  <div className="bg-gray-800 rounded-lg p-3 mt-2">
                    <p className="text-xs text-gray-400 mb-1">Description</p>
                    <p className="text-sm text-gray-300">{otSelectionne.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Historique ── */}
            {panneauOnglet === 'historique' && (
              <div className="space-y-2">
                {!otSelectionne.historiques_statut?.length ? (
                  <p className="text-gray-500 text-sm text-center py-8">Aucun historique</p>
                ) : otSelectionne.historiques_statut.map(h => (
                  <div key={h.id} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {h.ancienStatut && <>
                          <span className={`text-xs px-2 py-0.5 rounded border ${STATUT_CLS[h.ancienStatut]}`}>{STATUT_LABEL[h.ancienStatut]}</span>
                          <span className="text-gray-500 text-xs">→</span>
                        </>}
                        <span className={`text-xs px-2 py-0.5 rounded border ${STATUT_CLS[h.nouveauStatut]}`}>{STATUT_LABEL[h.nouveauStatut]}</span>
                      </div>
                      {h.motif && <p className="text-xs text-gray-400 mt-1">{h.motif}</p>}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(h.dateChangement).toLocaleString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal changer statut ── */}
      {modalStatut && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-1">Confirmer le changement</h2>
            <p className="text-gray-400 text-sm mb-4">
              {otSelectionne?.numero} →
              <span className={`ml-2 px-2 py-0.5 rounded text-xs border ${STATUT_CLS[nvStatut]}`}>{STATUT_LABEL[nvStatut]}</span>
            </p>
            <textarea value={motifStatut} onChange={e => setMotifStatut(e.target.value)}
              placeholder="Motif / compte rendu (optionnel)"
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none mb-4 resize-none h-20"/>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalStatut(false)} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white">Annuler</button>
              <button onClick={handleChangerStatut} disabled={submitting}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition text-white disabled:opacity-50">
                {submitting ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal rejet DI ── */}
      {modalRejet && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Motif de rejet</h2>
            <textarea value={motifRejet} onChange={e => setMotifRejet(e.target.value)}
              placeholder="Expliquez pourquoi cette demande est rejetée..."
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none mb-4 resize-none h-24"/>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalRejet(null)} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white">Annuler</button>
              <button onClick={handleRejeter} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 rounded-lg transition text-white">Rejeter</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal commentaire ── */}
      {modalComment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Compte rendu / Commentaire</h2>
            <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
              placeholder="Décrivez les travaux réalisés, observations, pièces utilisées..."
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none mb-3 resize-none h-32"/>
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input type="checkbox" checked={estInterne} onChange={e => setEstInterne(e.target.checked)} className="accent-amber-500"/>
              <span className="text-sm text-gray-300">Commentaire interne (non visible par l'opérateur)</span>
            </label>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalComment(false)} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white">Annuler</button>
              <button onClick={handleCommentaire} disabled={submitting || !newComment.trim()}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition text-white disabled:opacity-50">
                {submitting ? '...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Affectation Automatique (après création OT) ── */}
      {modalAffectationAuto && otAffectationAuto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-1">✅ Nouvel OT créé</h2>
            <p className="text-gray-400 text-sm mb-4">
              <span className="font-mono text-purple-300">{otAffectationAuto.numero}</span>
              {' '}- {otAffectationAuto.actif_detail?.code}
            </p>
            
            <p className="text-sm text-gray-300 mb-4 font-medium">
              Qui allez-vous affecter à cette intervention ?
            </p>
            
            <AffectationForm 
              otId={otAffectationAuto.id} 
              onSuccess={() => {
                setModalAffectationAuto(false);
                charger();
              }}
            />
            
            <button onClick={() => setModalAffectationAuto(false)}
              className="w-full mt-3 px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition text-gray-300">
              Ignorer pour maintenant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}