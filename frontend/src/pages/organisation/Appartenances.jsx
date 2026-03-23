import { useState, useEffect } from "react";
import { Link2, Plus, Trash2, Star } from "lucide-react";
import {
  getAppartenances,
  createAppartenance,
  deleteAppartenance,
  getSocietes,
  getSites,
  getSecteurs,
  getUnites,
} from "@/services/organisationService";
import { getUtilisateurs } from "@/services/securiteService";
import { Modal } from "@/components/Modal";

function AddAppartenanceModal({ onClose, onSaved }) {
  const [societes, setSocietes] = useState([]);
  const [sites, setSites] = useState([]);
  const [secteurs, setSecteurs] = useState([]);
  const [unites, setUnites] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [form, setForm] = useState({
    utilisateur: "",
    societe: "",
    site: "",
    secteur: "",
    unite: "",
    estPrincipale: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSocietes().then((r) => setSocietes(r.data.results || r.data));
    getUtilisateurs().then((r) => setUtilisateurs(r.data.results || r.data));
  }, []);

  useEffect(() => {
    if (form.societe)
      getSites({ societe: form.societe }).then((r) =>
        setSites(r.data.results || r.data),
      );
    else {
      setSites([]);
      setForm((f) => ({ ...f, site: "", secteur: "", unite: "" }));
    }
  }, [form.societe]);

  useEffect(() => {
    if (form.site)
      getSecteurs({ site: form.site }).then((r) =>
        setSecteurs(r.data.results || r.data),
      );
    else {
      setSecteurs([]);
      setForm((f) => ({ ...f, secteur: "", unite: "" }));
    }
  }, [form.site]);

  useEffect(() => {
    if (form.secteur)
      getUnites({ secteur: form.secteur }).then((r) =>
        setUnites(r.data.results || r.data),
      );
    else {
      setUnites([]);
      setForm((f) => ({ ...f, unite: "" }));
    }
  }, [form.secteur]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.utilisateur || !form.societe || !form.site) return;
    try {
      setSaving(true);
      await createAppartenance({
        utilisateur: form.utilisateur,
        societe: form.societe,
        site: form.site,
        secteur: form.secteur || null,
        unite: form.unite || null,
        estPrincipale: form.estPrincipale,
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const sel =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500";

  return (
    <Modal title="Nouvelle appartenance" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Utilisateur *
          </label>
          <select
            className={sel}
            value={form.utilisateur}
            onChange={(e) => setForm({ ...form, utilisateur: e.target.value })}
            required>
            <option value="">Sélectionner</option>
            {utilisateurs.map((u) => (
              <option key={u.id} value={u.id}>
                {u.prenom} {u.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Société *</label>
          <select
            className={sel}
            value={form.societe}
            onChange={(e) => setForm({ ...form, societe: e.target.value })}
            required>
            <option value="">Sélectionner</option>
            {societes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.raisonSociale}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Site *</label>
          <select
            className={sel}
            value={form.site}
            onChange={(e) => setForm({ ...form, site: e.target.value })}
            required
            disabled={!form.societe}>
            <option value="">Sélectionner</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.libelle}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Secteur (optionnel)
          </label>
          <select
            className={sel}
            value={form.secteur}
            onChange={(e) => setForm({ ...form, secteur: e.target.value })}
            disabled={!form.site}>
            <option value="">Aucun</option>
            {secteurs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.libelle}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Unité (optionnel)
          </label>
          <select
            className={sel}
            value={form.unite}
            onChange={(e) => setForm({ ...form, unite: e.target.value })}
            disabled={!form.secteur}>
            <option value="">Aucune</option>
            {unites.map((u) => (
              <option key={u.id} value={u.id}>
                {u.libelle}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="principale"
            checked={form.estPrincipale}
            onChange={(e) =>
              setForm({ ...form, estPrincipale: e.target.checked })
            }
            className="accent-amber-500"
          />
          <label htmlFor="principale" className="text-sm text-gray-300">
            Appartenance principale
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
            {saving ? "Enregistrement..." : "Créer"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm">
            Annuler
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Appartenances() {
  const [appartenances, setAppartenances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await getAppartenances();
      setAppartenances(res.data.results || res.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cette appartenance ?")) return;
    await deleteAppartenance(id);
    fetchData();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Appartenances</h1>
          <p className="text-gray-400 text-sm mt-1">
            Périmètre organisationnel des utilisateurs
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
          <Plus size={15} />
          Nouvelle appartenance
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {[
                "Utilisateur",
                "Société",
                "Site",
                "Secteur",
                "Unité",
                "Type",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Chargement...
                </td>
              </tr>
            ) : appartenances.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Aucune appartenance
                </td>
              </tr>
            ) : (
              appartenances.map((a) => (
                <tr key={a.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">
                    {a.utilisateur_nom || a.utilisateur}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {a.societe_libelle || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {a.site_libelle || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {a.secteur_libelle || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {a.unite_libelle || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {a.estPrincipale ? (
                      <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full w-fit">
                        <Star size={10} fill="currentColor" /> Principale
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                        Secondaire
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <AddAppartenanceModal
          onClose={() => setShowModal(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
