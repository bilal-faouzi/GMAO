import { useState, useEffect } from "react";
import { Link2, Plus, Trash2, Star, AlertTriangle } from "lucide-react";
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
import { useFormErrors } from "@/hooks/useFormErrors"; // ← import du hook
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
function FieldError({ name, errors }) {
  if (!errors[name]) return null;
  return (
    <p className="text-red-700 dark:text-danger text-xs mt-1">
      {errors[name]}
    </p>
  );
}

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

  // ← Hook d'erreurs
  const { errors, setApiErrors, clearErrors } = useFormErrors();

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
    clearErrors(); // ← reset des erreurs avant chaque tentative
    try {
      setSaving(true);
      const payload = {
        utilisateur: form.utilisateur,
        societe: form.societe,
        site: form.site,
        secteur: form.secteur || null,
        unite: form.unite || null,
        estPrincipale: form.estPrincipale,
      };
      await createAppartenance(payload);
      onSaved();
      onClose();
    } catch (err) {
      setApiErrors(err); // ← les erreurs s'affichent dans le formulaire
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nouvelle appartenance" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Erreur globale */}
        {errors.__global__ && (
          <div className="bg-red-100 dark:bg-danger-soft border border-red-300 dark:border-danger/30 rounded-lg px-3 py-2">
            <p className="text-red-700 dark:text-danger text-xs">
              {errors.__global__}
            </p>
          </div>
        )}

        {/* Utilisateur */}
        <div>
          <Label className="text-xs text-text-secondary mb-1 block">
            Utilisateur *
          </Label>
          <Select
            value={form.utilisateur}
            onValueChange={(v) => setForm({ ...form, utilisateur: v })}
            required>
            <SelectTrigger
              className={`w-full bg-surface border text-text ${
                errors.utilisateur
                  ? "border-red-300 dark:border-red-500"
                  : "border-border"
              }`}>
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
          <FieldError name="utilisateur" errors={errors} />
        </div>

        {/* Société */}
        <div>
          <Label className="text-xs text-text-secondary mb-1 block">
            Société *
          </Label>
          <Select
            value={form.societe}
            onValueChange={(v) => setForm({ ...form, societe: v })}
            required>
            <SelectTrigger
              className={`w-full bg-surface border text-text ${
                errors.societe
                  ? "border-red-300 dark:border-red-500"
                  : "border-border"
              }`}>
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
          <FieldError name="societe" errors={errors} />
        </div>

        {/* Site */}
        <div>
          <Label className="text-xs text-text-secondary mb-1 block">
            Site *
          </Label>
          <Select
            value={form.site}
            onValueChange={(v) => setForm({ ...form, site: v })}
            disabled={!form.societe}
            required>
            <SelectTrigger
              className={`w-full bg-surface border text-text disabled:opacity-50 ${
                errors.site
                  ? "border-red-300 dark:border-red-500"
                  : "border-border"
              }`}>
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
          <FieldError name="site" errors={errors} />
        </div>

        {/* Secteur */}
        <div>
          <Label className="text-xs text-text-secondary mb-1 block">
            Secteur (optionnel)
          </Label>
          <Select
            value={form.secteur}
            onValueChange={(v) => setForm({ ...form, secteur: v })}
            disabled={!form.site}>
            <SelectTrigger
              className={`w-full bg-surface border text-text disabled:opacity-50 ${
                errors.secteur
                  ? "border-red-300 dark:border-red-500"
                  : "border-border"
              }`}>
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
          <FieldError name="secteur" errors={errors} />
        </div>

        {/* Unité */}
        <div>
          <Label className="text-xs text-text-secondary mb-1 block">
            Unité (optionnel)
          </Label>
          <Select
            value={form.unite}
            onValueChange={(v) => setForm({ ...form, unite: v })}
            disabled={!form.secteur}>
            <SelectTrigger
              className={`w-full bg-surface border text-text disabled:opacity-50 ${
                errors.unite
                  ? "border-red-300 dark:border-red-500"
                  : "border-border"
              }`}>
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
          <FieldError name="unite" errors={errors} />
        </div>

        {/* Principale */}
        <div className="flex items-left gap-2 pt-1">
          <Checkbox
            id="principale"
            checked={form.estPrincipale}
            onCheckedChange={(checked) =>
              setForm({ ...form, estPrincipale: checked })
            }
          />
          <FieldLabel>Appartenance principale</FieldLabel>
        </div>
        {/* Erreur contrainte unique principale */}
        <FieldError name="estPrincipale" errors={errors} />

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            variant="custom"
            className="flex-1 py-2 rounded-lg">
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
    await deleteAppartenance(id);
    fetchData();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Appartenances</h1>
          <p className="text-text-secondary text-sm mt-1">
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

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
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
                  className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {h}
                </th>
              ))}
              <th
                key="actions"
                className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-text-muted">
                  Chargement...
                </td>
              </tr>
            ) : appartenances.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-text-muted">
                  Aucune appartenance
                </td>
              </tr>
            ) : (
              appartenances.map((a) => (
                <tr key={a.id} className="hover:bg-surface transition-colors">
                  <td className="px-4 py-3 font-medium text-text">
                    {a.utilisateur_nom || a.utilisateur}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {a.societe_libelle || "—"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {a.site_libelle || "—"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {a.secteur_libelle || "—"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {a.unite_libelle || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {a.estPrincipale ? (
                      <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-warning bg-amber-100 dark:bg-warning/10 px-2 py-0.5 rounded-full w-fit">
                        <Star size={10} fill="currentColor" /> Principale
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded-full">
                        Secondaire
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 flex items-center justify-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          className="rounded hover:bg-red-100 dark:hover:bg-danger-soft text-text-muted hover:text-danger transition-colors">
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle size={16} className="text-red-500" />
                            Supprimer l’appartenance
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Voulez-vous vraiment retirer cette utilisateur de
                            son affectation ?
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(a.id)}
                            className="bg-red-600 hover:bg-red-700">
                            Retirer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
