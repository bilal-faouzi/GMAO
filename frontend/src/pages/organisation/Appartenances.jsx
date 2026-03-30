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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

import { Checkbox } from "@/components/ui/checkbox";

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

  return (
    <Modal title="Nouvelle appartenance" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Utilisateur */}
        <div>
          <Label className="text-xs text-gray-400 mb-1 block">
            Utilisateur *
          </Label>
          <Select
            value={form.utilisateur}
            onValueChange={(v) => setForm({ ...form, utilisateur: v })}
            required>
            <SelectTrigger className="w-full bg-white/5 border border-white/10 text-white">
              <SelectValue placeholder="Sélectionner un utilisateur" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {utilisateurs.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.prenom} {u.nom}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Société */}
        <div>
          <Label className="text-xs text-gray-400 mb-1 block">Société *</Label>
          <Select
            value={form.societe}
            onValueChange={(v) => setForm({ ...form, societe: v })}
            required>
            <SelectTrigger className="w-full bg-white/5 border border-white/10 text-white">
              <SelectValue placeholder="Sélectionner une société" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {societes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.raisonSociale}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Site */}
        <div>
          <Label className="text-xs text-gray-400 mb-1 block">Site *</Label>
          <Select
            value={form.site}
            onValueChange={(v) => setForm({ ...form, site: v })}
            disabled={!form.societe}
            required>
            <SelectTrigger className="w-full bg-white/5 border border-white/10 text-white disabled:opacity-50">
              <SelectValue placeholder="Sélectionner un site" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.libelle}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Secteur */}
        <div>
          <Label className="text-xs text-gray-400 mb-1 block">
            Secteur (optionnel)
          </Label>
          <Select
            value={form.secteur}
            onValueChange={(v) => setForm({ ...form, secteur: v })}
            disabled={!form.site}>
            <SelectTrigger className="w-full bg-white/5 border border-white/10 text-white disabled:opacity-50">
              <SelectValue placeholder="Aucun" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {secteurs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.libelle}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Unité */}
        <div>
          <Label className="text-xs text-gray-400 mb-1 block">
            Unité (optionnel)
          </Label>
          <Select
            value={form.unite}
            onValueChange={(v) => setForm({ ...form, unite: v })}
            disabled={!form.secteur}>
            <SelectTrigger className="w-full bg-white/5 border border-white/10 text-white disabled:opacity-50">
              <SelectValue placeholder="Aucune" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {unites.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.libelle}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Principale */}
        <div className="flex items-left gap-2 pt-1">
          <Checkbox
            id="principale"
            // On utilise 'checked' pour l'état actuel
            checked={form.estPrincipale}
            // On utilise 'onCheckedChange' qui donne directement le booléen
            onCheckedChange={(checked) =>
              setForm({ ...form, estPrincipale: checked })
            }
          />
          <FieldLabel>Appartenance principale</FieldLabel>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            variant="custom"
            className="flex-1 py-2 rounded-lg ">
            {saving ? "Enregistrement..." : "Créer"}
          </Button>
          <Button
            type="button"
            onClick={onClose}
            variant="customOutline"
            className="flex-1 py-2 rounded-lg">
            Annuler
          </Button>
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
        <Button
          onClick={() => setShowModal(true)}
          variant="custom"
          className="flex items-center gap-2 py-2 rounded-lg">
          <Plus size={15} />
          Nouvelle appartenance
        </Button>
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
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
              <th
                key="actions"
                className="px-4 py-3 text-center  text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
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
                    <Button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </Button>
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
