import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getActif, createActif, updateActif, getActifs } from '../../services/actifService';
import { getSites, getUnites } from '../../services/organisationService';

// Constantes extraites
const ACTIF_TYPES = {
  EQUIPEMENT: { value: 'equipement', label: 'Équipement' },
  INFRASTRUCTURE: { value: 'infrastructure', label: 'Infrastructure' },
  VEHICULE: { value: 'vehicule', label: 'Véhicule' },
  AUTRE: { value: 'autre', label: 'Autre' }
};

const STATUTS = {
  ACTIF: { value: 'actif', label: 'Actif' },
  EN_PANNE: { value: 'en_panne', label: 'En panne' },
  EN_MAINTENANCE: { value: 'en_maintenance', label: 'En maintenance' },
  RETIRE: { value: 'retire', label: 'Retiré' }
};

const initialFormState = {
  code: '', libelle: '', description: '',
  type: 'equipement', statut: 'actif',
  idSite: '', idUnite: '', idParent: '',
  dateAcquisition: '', valeur: '',
  fabricant: '', modele: '', numSerie: '',
  estActif: true,
};

// 💡 DÉPLACÉ À L'EXTÉRIEUR : Composant Field réutilisable
const Field = ({ label, name, type = 'text', options, required = false, value, onChange, error, step }) => (
  <div>
    <label htmlFor={name} className="block text-sm text-gray-400 mb-1">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {options ? (
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        aria-required={required}
        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500 transition-colors"
      >
        <option value="">— Sélectionner —</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    ) : (
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        aria-required={required}
        step={step}
        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500 transition-colors"
      />
    )}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

export default function FormulaireActif() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(initialFormState);
  const [sites, setSites] = useState([]);
  const [unites, setUnites] = useState([]);
  const [actifs, setActifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Formatage des dates pour l'input type="date"
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  // Validation du formulaire
  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!form.code?.trim()) newErrors.code = 'Le code est requis';
    if (!form.libelle?.trim()) newErrors.libelle = 'Le libellé est requis';
    if (form.valeur && isNaN(parseFloat(form.valeur))) newErrors.valeur = 'La valeur doit être un nombre';
    if (form.dateAcquisition && isNaN(new Date(form.dateAcquisition).getTime())) {
      newErrors.dateAcquisition = 'Date invalide';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form.code, form.libelle, form.valeur, form.dateAcquisition]);

  // Chargement initial
  useEffect(() => {
    const init = async () => {
      try {
        const [s, u, a] = await Promise.all([getSites(), getUnites(), getActifs()]);
        setSites(s.data.results || s.data);
        setUnites(u.data.results || u.data);
        setActifs(a.data.results || a.data);
        
        if (isEdit) {
          const res = await getActif(id);
          const a2 = res.data;
          setForm({
            code: a2.code || '',
            libelle: a2.libelle || '',
            description: a2.description || '',
            type: a2.type || 'equipement',
            statut: a2.statut || 'actif',
            idSite: a2.idSite || '',
            idUnite: a2.idUnite || '',
            idParent: a2.idParent || '',
            dateAcquisition: formatDateForInput(a2.dateAcquisition),
            valeur: a2.valeur || '',
            fabricant: a2.fabricant || '',
            modele: a2.modele || '',
            numSerie: a2.numSerie || '',
            estActif: a2.estActif !== undefined ? a2.estActif : true,
          });
        }
      } catch (e) {
        console.error(e);
        setErreur('Erreur lors du chargement des données');
      }
    };
    init();
  }, [id, isEdit]);

  // Alerte avant de quitter si modifications non sauvegardées
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setIsDirty(true);
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(err => ({ ...err, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErreur(null);
    try {
      const payload = { ...form };
      // Nettoyer les champs vides
      if (!payload.idSite) delete payload.idSite;
      if (!payload.idUnite) delete payload.idUnite;
      if (!payload.idParent) delete payload.idParent;
      if (!payload.dateAcquisition) delete payload.dateAcquisition;
      if (!payload.valeur) delete payload.valeur;

      if (isEdit) {
        await updateActif(id, payload);
      } else {
        await createActif(payload);
      }
      navigate('/actifs');
    } catch (e) {
      setErreur(e.response?.data || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  // Options mémorisées pour éviter les recalculs
  const siteOptions = useMemo(() => 
    sites.map(s => ({ value: s.id, label: `${s.code} — ${s.libelle}` })),
    [sites]
  );

  const uniteOptions = useMemo(() => 
    unites.map(u => ({ value: u.id, label: `${u.code} — ${u.libelle}` })),
    [unites]
  );

  const typeOptions = useMemo(() => Object.values(ACTIF_TYPES), []);
  const statutOptions = useMemo(() => Object.values(STATUTS), []);

  const parentOptions = useMemo(() => 
    actifs.filter(a => a.id !== id).map(a => ({
      value: a.id,
      label: `${a.code} — ${a.libelle}`
    })),
    [actifs, id]
  );

  return (
    <div className="p-6 text-white max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/actifs')}
          className="text-gray-400 hover:text-white transition text-sm flex items-center gap-1"
        >
          <span>&larr;</span> Retour
        </button>
        <h1 className="text-2xl font-semibold">
          {isEdit ? "Modifier l'actif" : 'Nouvel actif'}
        </h1>
      </div>

      {erreur && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg p-4 mb-6 text-sm">
          {typeof erreur === 'object' ? JSON.stringify(erreur) : erreur}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identification */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-sm">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Identification</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field 
              label="Code" 
              name="code" 
              required 
              value={form.code} 
              onChange={handleChange} 
              error={errors.code} 
            />
            <Field 
              label="Libellé" 
              name="libelle" 
              required 
              value={form.libelle} 
              onChange={handleChange} 
              error={errors.libelle} 
            />
            <Field 
              label="Type" 
              name="type" 
              options={typeOptions} 
              value={form.type} 
              onChange={handleChange} 
              error={errors.type} 
            />
            <Field 
              label="Statut" 
              name="statut" 
              options={statutOptions} 
              value={form.statut} 
              onChange={handleChange} 
              error={errors.statut} 
            />
          </div>
          <div className="mt-4">
            <label htmlFor="description" className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500 resize-none transition-colors"
            />
          </div>
        </div>

        {/* Localisation */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-sm">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Localisation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field 
              label="Site" 
              name="idSite" 
              options={siteOptions} 
              value={form.idSite} 
              onChange={handleChange} 
              error={errors.idSite} 
            />
            <Field 
              label="Unité" 
              name="idUnite" 
              options={uniteOptions} 
              value={form.idUnite} 
              onChange={handleChange} 
              error={errors.idUnite} 
            />
          </div>
          <div className="mt-4">
            <label htmlFor="idParent" className="block text-sm text-gray-400 mb-1">Actif parent (sous-actif de...)</label>
            <select
              id="idParent"
              name="idParent"
              value={form.idParent}
              onChange={handleChange}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500 transition-colors"
            >
              <option value="">— Aucun parent (actif racine) —</option>
              {parentOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Caractéristiques techniques */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-sm">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Caractéristiques techniques</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field 
              label="Fabricant" 
              name="fabricant" 
              value={form.fabricant} 
              onChange={handleChange} 
              error={errors.fabricant} 
            />
            <Field 
              label="Modèle" 
              name="modele" 
              value={form.modele} 
              onChange={handleChange} 
              error={errors.modele} 
            />
            <Field 
              label="Numéro de série" 
              name="numSerie" 
              value={form.numSerie} 
              onChange={handleChange} 
              error={errors.numSerie} 
            />
            <Field 
              label="Date d'acquisition" 
              name="dateAcquisition" 
              type="date" 
              value={form.dateAcquisition} 
              onChange={handleChange} 
              error={errors.dateAcquisition} 
            />
            <Field 
              label="Valeur (MAD)" 
              name="valeur" 
              type="number" 
              step="0.01" 
              value={form.valeur} 
              onChange={handleChange} 
              error={errors.valeur} 
            />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="checkbox"
              name="estActif"
              id="estActif"
              checked={form.estActif}
              onChange={handleChange}
              className="w-4 h-4 accent-purple-500 rounded bg-gray-700 border-gray-600 focus:ring-purple-500 focus:ring-offset-gray-800"
            />
            <label htmlFor="estActif" className="text-sm text-gray-300 select-none cursor-pointer">
              Actif (visible dans les listes)
            </label>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={() => navigate('/actifs')}
            className="px-5 py-2.5 text-sm font-medium bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : "Créer l'actif"}
          </button>
        </div>
      </form>
    </div>
  );
}