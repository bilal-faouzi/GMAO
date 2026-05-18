import { useState, useEffect } from "react";
import { Plus, Trash2, Star, Loader2, ChevronRight } from "lucide-react";
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
import {
  getAppartenances,
  createAppartenance,
  deleteAppartenance,
  getSocietes,
  getSites,
  getSecteurs,
  getUnites,
} from "@/services/organisationService";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError, GlobalError } from "@/components/FieldError";
import { useFormErrors } from "@/hooks/useFormErrors";

/**
 * AppartenanceManager
 * -------------------
 * Props:
 *   userId           {string|number}  — ID de l'utilisateur ciblé
 *   onAppartenanceChange {Function}   — callback après chaque modification
 */
export function AppartenanceManager({ userId, onAppartenanceChange }) {
  //  Data
  const [appartenances, setAppartenances] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [sites, setSites] = useState([]);
  const [secteurs, setSecteurs] = useState([]);
  const [unites, setUnites] = useState([]);

  //  UI state
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  //  Form
  const [form, setForm] = useState({
    societe: "",
    site: "",
    secteur: "",
    unites: [],
    estPrincipale: false,
  });

  const { errors, setApiErrors, clearErrors } = useFormErrors();

  //  Load appartenances
  const loadAppartenances = async () => {
    try {
      const res = await getAppartenances({ utilisateur: userId });
      setAppartenances(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  //  Initial load
  useEffect(() => {
    if (!userId) return;
    const init = async () => {
      setLoading(true);
      try {
        const [appRes, socRes] = await Promise.all([
          getAppartenances({ utilisateur: userId }),
          getSocietes(),
        ]);
        setAppartenances(appRes.data.results || appRes.data || []);
        setSocietes(socRes.data.results || socRes.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [userId]);

  //  Cascading selects
  useEffect(() => {
    if (!form.societe) {
      setSites([]);
      setSecteurs([]);
      setUnites([]);
      setForm((f) => ({ ...f, site: "", secteur: "", unites: [] }));
      return;
    }
    getSites({ societe: form.societe }).then((r) =>
      setSites(r.data.results || r.data || []),
    );
  }, [form.societe]);

  useEffect(() => {
    if (!form.site) {
      setSecteurs([]);
      setUnites([]);
      setForm((f) => ({ ...f, secteur: "", unites: [] }));
      return;
    }
    getSecteurs({ site: form.site }).then((r) =>
      setSecteurs(r.data.results || r.data || []),
    );
  }, [form.site]);

  useEffect(() => {
    if (!form.secteur) {
      setUnites([]);
      setForm((f) => ({ ...f, unites: [] }));
      return;
    }
    getUnites({ secteur: form.secteur }).then((r) =>
      setUnites(r.data.results || r.data || []),
    );
  }, [form.secteur]);

  //  Add
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.societe || !form.site) return;
    clearErrors();
    setSaving(true);
    try {
      await createAppartenance({
        utilisateur: userId,
        societe: form.societe,
        site: form.site,
        secteur: form.secteur || null,
        unites: form.unites || [],
        estPrincipale: form.estPrincipale,
      });
      setForm({
        societe: "",
        site: "",
        secteur: "",
        unites: [],
        estPrincipale: false,
      });
      setShowForm(false);
      await loadAppartenances();
      onAppartenanceChange?.();
    } catch (err) {
      setApiErrors(err);
    } finally {
      setSaving(false);
    }
  };

  //  Delete
  const handleDelete = async (id) => {
    setPendingDelete(id);
    try {
      await deleteAppartenance(id);
      await loadAppartenances();
      onAppartenanceChange?.();
    } catch (e) {
      console.error(e);
    } finally {
      setPendingDelete(null);
    }
  };

  //  Helpers
  const resetForm = () => {
    setForm({
      societe: "",
      site: "",
      secteur: "",
      unites: [],
      estPrincipale: false,
    });
    clearErrors();
    setShowForm(false);
  };

  //  Render
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-5 text-xs text-gray-500">
        <Loader2 size={14} className="animate-spin" />
        Chargement…
      </div>
    );
  }

  const principal = appartenances.find((a) => a.estPrincipale);
  const secondaires = appartenances.filter((a) => !a.estPrincipale);

  return (
    <div className="flex flex-col gap-4 pt-2">
      {/*  Liste existante  */}
      {appartenances.length === 0 ? (
        <p className="text-xs text-gray-500 italic">
          Aucune appartenance organisationnelle
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {appartenances.map((a) => (
            <div
              key={a.id}
              className={`flex items-center justify-between px-3 py-2.5 rounded-sm border ${
                a.estPrincipale
                  ? "bg-surface border-primary"
                  : "bg-gray-500 border-gray-400"
              }`}>
              {/* Cascade labels */}
              <div className="flex  items-center gap-1.5 flex-wrap flex-1 min-w-0">
                {a.estPrincipale && (
                  <span className="badge bg-amber-100 text-amber-900 dark:text-amber-400  dark:bg-amber-500/10 text-xs flex-shrink-0 px-2 py-1 rounded inline-flex items-center gap-1">
                    <Star size={9} style={{ fill: "currentColor" }} />{" "}
                    Principale
                  </span>
                )}
                {[
                  a.societe_libelle,
                  a.site_libelle,
                  a.secteur_libelle,
                  a.unites_libelles && a.unites_libelles.length > 0
                    ? a.unites_libelles.join(", ")
                    : null,
                ]
                  .filter(Boolean)
                  .map((label, i, arr) => (
                    <span key={i} className="flex items-center gap-1">
                      <span
                        className={`text-xs ${
                          i === 0
                            ? "font-semibold text-gray-600"
                            : "font-normal text-gray-400"
                        }`}>
                        {label}
                      </span>
                      {i < arr.length - 1 && (
                        <ChevronRight
                          size={10}
                          className="text-gray-400 opacity-50 flex-shrink-0"
                        />
                      )}
                    </span>
                  ))}
              </div>

              {/* Delete */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    disabled={pendingDelete === a.id}
                    title="Supprimer cette appartenance"
                    className="p-1 h-auto flex-shrink-0 ml-2 text-gray-500 hover:text-red-600 transition-colors">
                    {pendingDelete === a.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Supprimer l’appartenance
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action va retirer l’utilisateur de cette structure
                      organisationnelle. Voulez-vous continuer ?
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(a.id)}
                      className="bg-red-600 hover:bg-red-700">
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      {/*  Formulaire d'ajout  */}
      {showForm ? (
        <form
          onSubmit={handleAdd}
          className="flex flex-col gap-2.5 p-3.5 rounded-sm border border-gray-300 bg-gray-50 dark:bg-surface dark:border-gray-700">
          <GlobalError errors={errors} />

          {/* Société */}
          <div>
            <span className="block text-xs font-semibold text-gray-500 mb-1.5">
              Société *
            </span>
            <Select
              value={form.societe}
              onValueChange={(v) => setForm({ ...form, societe: v })}>
              <SelectTrigger className="w-full">
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
            <FieldError errors={errors} field="societe" />
          </div>

          {/* Site */}
          <div>
            <span className="block text-xs font-semibold text-gray-500 mb-1.5">
              Site *
            </span>
            <Select
              value={form.site}
              onValueChange={(v) => setForm({ ...form, site: v })}
              disabled={!form.societe}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    form.societe
                      ? "Sélectionner un site"
                      : "Choisir une société d'abord"
                  }
                />
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
            <FieldError errors={errors} field="site" />
          </div>

          {/* Secteur */}
          <div>
            <span className="block text-xs font-semibold text-gray-500 mb-1.5">
              Secteur{" "}
              <span className="font-normal opacity-70">(optionnel)</span>
            </span>
            <Select
              value={form.secteur}
              onValueChange={(v) => setForm({ ...form, secteur: v })}
              disabled={!form.site}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    form.site ? "Aucun secteur" : "Choisir un site d'abord"
                  }
                />
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
            <FieldError errors={errors} field="secteur" />
          </div>

          {/* Unités (multiples) */}
          <div>
            <span className="block text-xs font-semibold text-gray-500 mb-1.5">
              Unités <span className="font-normal opacity-70">(optionnel)</span>
            </span>
            <div className="bg-gray-50 border border-gray-300 rounded-sm p-2.5 max-h-36 overflow-y-auto flex flex-col gap-2 dark:bg-surface dark:border-gray-700">
              {!form.secteur ? (
                <span className="text-xs text-gray-500">
                  Sélectionnez d'abord un secteur
                </span>
              ) : unites.length === 0 ? (
                <span className="text-xs text-gray-500">
                  Aucune unité pour ce secteur
                </span>
              ) : (
                unites.map((u) => {
                  const checked = form.unites.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      className="flex items-center gap-1.5 dark:bg-surface">
                      <Checkbox
                        id={`unite-mgr-${u.id}`}
                        checked={checked}
                        onCheckedChange={(c) => {
                          setForm((f) => ({
                            ...f,
                            unites: c
                              ? [...f.unites, u.id]
                              : f.unites.filter((uid) => uid !== u.id),
                          }));
                        }}
                      />
                      <Label htmlFor={`unite-mgr-${u.id}`} className="text-xs">
                        {u.libelle}
                      </Label>
                    </div>
                  );
                })
              )}
            </div>
            <FieldError errors={errors} field="unites" />
          </div>

          {/* Principale */}
          <div className="flex items-center gap-2 pt-0.5">
            <Checkbox
              id="estPrincipale"
              checked={form.estPrincipale}
              onCheckedChange={(checked) =>
                setForm({ ...form, estPrincipale: checked })
              }
            />
            <FieldLabel>Appartenance principale</FieldLabel>
          </div>
          <FieldError errors={errors} field="estPrincipale" />

          {/* Actions */}
          <div className="flex gap-2 mt-1">
            <Button
              type="submit"
              disabled={!form.societe || !form.site || saving}
              variant="custom"
              className="flex-1">
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Enregistrement…
                </>
              ) : (
                <>
                  <Plus size={13} /> Créer
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={resetForm}
              variant="customOutline"
              className="flex-1">
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <Button
          onClick={() => setShowForm(true)}
          variant="ghost"
          className="self-start text-xs flex items-center gap-1.5 text-indigo-600 px-2.5 py-1.5 rounded-sm border border-dashed border-gray-300 bg-transparent hover:bg-gray-50">
          <Plus size={13} /> Ajouter une appartenance
        </Button>
      )}
    </div>
  );
}
