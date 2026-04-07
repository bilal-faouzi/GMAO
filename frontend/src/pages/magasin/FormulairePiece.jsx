import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPiece, createPiece, updatePiece } from '../../services/magasinService';

export default function FormulairePiece() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    reference:'', designation:'', categorie:'', unite:'piece',
    emplacement:'', quantiteStock:'0', seuilMinimum:'0',
    prixUnitaire:'', fournisseur:'', referenceConstructeur:'', estActif:true,
  });
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur]   = useState(null);

  useEffect(() => {
    if (isEdit) {
      getPiece(id).then(r => {
        const p = r.data;
        setForm({
          reference: p.reference, designation: p.designation,
          categorie: p.categorie||'', unite: p.unite,
          emplacement: p.emplacement||'', quantiteStock: p.quantiteStock,
          seuilMinimum: p.seuilMinimum, prixUnitaire: p.prixUnitaire||'',
          fournisseur: p.fournisseur||'', referenceConstructeur: p.referenceConstructeur||'',
          estActif: p.estActif,
        });
      });
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type==='checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErreur(null);
    try {
      const payload = { ...form };
      if (!payload.prixUnitaire) delete payload.prixUnitaire;
      isEdit ? await updatePiece(id, payload) : await createPiece(payload);
      navigate('/magasin');
    } catch(e) { setErreur(e.response?.data || 'Erreur'); }
    finally { setLoading(false); }
  };

  const Field = ({ label, name, type='text', required }) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}{required && ' *'}</label>
      <input type={type} name={name} value={form[name]} onChange={handleChange}
        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500"/>
    </div>
  );

  return (
    <div className="p-6 text-white max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/magasin')} className="text-gray-400 hover:text-white text-sm transition">← Retour</button>
        <h1 className="text-2xl font-semibold">{isEdit ? 'Modifier la pièce' : 'Nouvelle pièce'}</h1>
      </div>

      {erreur && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg p-4 mb-6 text-sm">
          {typeof erreur==='object' ? JSON.stringify(erreur) : erreur}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Identification</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Référence" name="reference" required />
            <Field label="Désignation" name="designation" required />
            <Field label="Catégorie" name="categorie" />
            <Field label="Unité (pièce/kg/L/m...)" name="unite" />
            <Field label="Emplacement (ex: A1-E3-N2)" name="emplacement" />
            <Field label="Fournisseur" name="fournisseur" />
            <Field label="Référence constructeur" name="referenceConstructeur" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Stock & Prix</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Quantité en stock" name="quantiteStock" type="number" />
            <Field label="Seuil minimum" name="seuilMinimum" type="number" />
            <Field label="Prix unitaire (MAD)" name="prixUnitaire" type="number" />
          </div>
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input type="checkbox" name="estActif" checked={form.estActif} onChange={handleChange} className="w-4 h-4 accent-purple-500"/>
            <span className="text-sm text-gray-300">Actif (visible dans le catalogue)</span>
          </label>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/magasin')}
            className="px-5 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white">Annuler</button>
          <button type="submit" disabled={loading}
            className="px-5 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition text-white disabled:opacity-50">
            {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer la pièce'}
          </button>
        </div>
      </form>
    </div>
  );
}