import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getActif, getHistoriqueStatut,
  getIndisponibilites, getRemplacements
} from '../../services/actifService';

const STATUT_COLORS = {
  actif: 'bg-green-500/20 text-green-400 border-green-500/30',
  en_panne: 'bg-red-500/20 text-red-400 border-red-500/30',
  en_maintenance: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  retire: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function DetailActif() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [actif, setActif]               = useState(null);
  const [historique, setHistorique]     = useState([]);
  const [indisponibilites, setIndispos] = useState([]);
  const [remplacements, setRemplace]    = useState([]);
  const [onglet, setOnglet]             = useState('historique');
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const charger = async () => {
      try {
        const [a, h, i, r] = await Promise.all([
          getActif(id),
          getHistoriqueStatut(id),
          getIndisponibilites(id),
          getRemplacements(id),
        ]);
        setActif(a.data);
        setHistorique(h.data.results || h.data);
        setIndispos(i.data.results || i.data);
        setRemplace(r.data.results || r.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    charger();
  }, [id]);

  if (loading) return <div className="p-6 text-gray-400">Chargement...</div>;
  if (!actif)  return <div className="p-6 text-red-400">Actif introuvable.</div>;

  return (
    <div className="p-6 text-white">
      {/* Header */}
     {/* Header */}
<div className="flex justify-between items-center mb-6">
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate('/actifs')}
        className="text-gray-400 hover:text-white transition text-sm"
      >
        ← Retour
      </button>
      <h1 className="text-2xl font-semibold font-mono">{actif.code}</h1>
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUT_COLORS[actif.statut]}`}>
        {actif.statut.replace('_', ' ')}
      </span>
    </div>

    {/* Chemin hiérarchique */}
    {actif.chemin_hierarchique?.length > 0 && (
      <div className="flex items-center gap-1 flex-wrap ml-1">
        <span className="text-xs text-gray-600">Hiérarchie :</span>
        {actif.chemin_hierarchique.map((p, i) => (
          <span key={p.id} className="flex items-center gap-1">
            <span
              onClick={() => navigate(`/actifs/${p.id}`)}
              className="text-xs text-gray-400 hover:text-purple-300 bg-gray-800 px-2 py-0.5 rounded font-mono cursor-pointer transition"
            >
              {p.code}
            </span>
            <span className="text-gray-600 text-xs">→</span>
          </span>
        ))}
        <span className="text-xs text-purple-300 bg-gray-800 px-2 py-0.5 rounded font-mono font-semibold">
          {actif.code}
        </span>
      </div>
    )}
  </div>

  <button
    onClick={() => navigate(`/actifs/${id}/modifier`)}
    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition"
  >
    Modifier
  </button>
</div>

      {/* Infos principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wide">Informations générales</h2>
          <div className="space-y-3">
            {[
              ['Libellé',     actif.libelle],
              ['Type',        actif.type],
              ['Fabricant',   actif.fabricant || '—'],
              ['Modèle',      actif.modele || '—'],
              ['N° Série',    actif.numSerie || '—'],
              ['Acquisition', actif.dateAcquisition || '—'],
              ['Valeur',      actif.valeur ? `${actif.valeur} MAD` : '—'],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                <span className="text-white font-medium">{val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wide">Localisation & Disponibilité</h2>
          <div className="space-y-3">
            {[
              ['Site',   actif.site_detail?.libelle  || '—'],
              ['Unité',  actif.unite_detail?.libelle || '—'],
              ['Durée de vie', actif.duree_vie ? `${actif.duree_vie} jours` : '—'],
              ['Taux dispo (30j)', `${actif.taux_disponibilite ?? '—'} %`],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                <span className="text-white font-medium">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-700">
          {[
            { key: 'historique',      label: `Historique statut (${historique.length})` },
            { key: 'indisponibilites', label: `Indisponibilités (${indisponibilites.length})` },
            { key: 'remplacements',   label: `Remplacements (${remplacements.length})` },
          ].map(o => (
            <button
              key={o.key}
              onClick={() => setOnglet(o.key)}
              className={`px-5 py-3 text-sm font-medium transition ${
                onglet === o.key
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Historique statut */}
          {onglet === 'historique' && (
            historique.length === 0
              ? <p className="text-gray-400 text-sm text-center py-8">Aucun historique</p>
              : <table className="w-full text-sm">
                  <thead className="text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">Ancien statut</th>
                      <th className="text-left py-2 px-3">Nouveau statut</th>
                      <th className="text-left py-2 px-3">Motif</th>
                      <th className="text-left py-2 px-3">Modifié par</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {historique.map(h => (
                      <tr key={h.id} className="hover:bg-gray-700/30">
                        <td className="py-2 px-3 text-gray-400">
                          {new Date(h.dateChangement).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${STATUT_COLORS[h.ancienStatut]}`}>
                            {h.ancienStatut}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${STATUT_COLORS[h.nouveauStatut]}`}>
                            {h.nouveauStatut}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-400">{h.motif || '—'}</td>
                        <td className="py-2 px-3 text-gray-400">
                          {h.modifiePar_detail
                            ? `${h.modifiePar_detail.prenom} ${h.modifiePar_detail.nom}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          )}

          {/* Indisponibilités */}
          {onglet === 'indisponibilites' && (
            indisponibilites.length === 0
              ? <p className="text-gray-400 text-sm text-center py-8">Aucune indisponibilité</p>
              : <table className="w-full text-sm">
                  <thead className="text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-left py-2 px-3">Début</th>
                      <th className="text-left py-2 px-3">Fin</th>
                      <th className="text-left py-2 px-3">Durée (h)</th>
                      <th className="text-left py-2 px-3">Terminée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {indisponibilites.map(i => (
                      <tr key={i.id} className="hover:bg-gray-700/30">
                        <td className="py-2 px-3">{i.type}</td>
                        <td className="py-2 px-3 text-gray-400">
                          {new Date(i.dateDebut).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-2 px-3 text-gray-400">
                          {i.dateFin ? new Date(i.dateFin).toLocaleString('fr-FR') : '—'}
                        </td>
                        <td className="py-2 px-3">{i.duree_heures ?? '—'}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${i.estTerminee ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {i.estTerminee ? 'Oui' : 'Non'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          )}

          {/* Remplacements */}
          {onglet === 'remplacements' && (
            remplacements.length === 0
              ? <p className="text-gray-400 text-sm text-center py-8">Aucun remplacement</p>
              : <table className="w-full text-sm">
                  <thead className="text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">Remplacé par</th>
                      <th className="text-left py-2 px-3">Motif</th>
                      <th className="text-left py-2 px-3">Effectué par</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {remplacements.map(r => (
                      <tr key={r.id} className="hover:bg-gray-700/30">
                        <td className="py-2 px-3 text-gray-400">{r.dateRemplacement}</td>
                        <td className="py-2 px-3 font-mono text-purple-300">
                          {r.actifRemplacant_detail?.code}
                        </td>
                        <td className="py-2 px-3 text-gray-400">{r.motif || '—'}</td>
                        <td className="py-2 px-3 text-gray-400">{r.effectuePar || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          )}
        </div>
      </div>
    </div>
  );
}