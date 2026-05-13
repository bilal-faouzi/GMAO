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

const labelCls = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-muted)",
  marginBottom: 6,
  display: "block",
};

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
    unite: "",
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
      setForm((f) => ({ ...f, site: "", secteur: "", unite: "" }));
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
      setForm((f) => ({ ...f, secteur: "", unite: "" }));
      return;
    }
    getSecteurs({ site: form.site }).then((r) =>
      setSecteurs(r.data.results || r.data || []),
    );
  }, [form.site]);

  useEffect(() => {
    if (!form.secteur) {
      setUnites([]);
      setForm((f) => ({ ...f, unite: "" }));
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
        unite: form.unite || null,
        estPrincipale: form.estPrincipale,
      });
      setForm({
        societe: "",
        site: "",
        secteur: "",
        unite: "",
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
      unite: "",
      estPrincipale: false,
    });
    clearErrors();
    setShowForm(false);
  };

  //  Render 
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "20px 0",
          color: "var(--text-muted)",
          fontSize: 13,
        }}>
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
        Chargement…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const principal = appartenances.find((a) => a.estPrincipale);
  const secondaires = appartenances.filter((a) => !a.estPrincipale);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        paddingTop: 8,
      }}>
      {/*  Liste existante  */}
      {appartenances.length === 0 ? (
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            fontStyle: "italic",
          }}>
          Aucune appartenance organisationnelle
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {appartenances.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: "var(--r-sm)",
                background: a.estPrincipale
                  ? "var(--color-primary-soft)"
                  : "var(--bg-elevated)",
                border: a.estPrincipale
                  ? "1px solid rgba(79,70,229,.1)"
                  : "1px solid var(--border-subtle)",
              }}>
              {/* Cascade labels */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                  flex: 1,
                  minWidth: 0,
                }}>
                {a.estPrincipale && (
                  <span
                    className="badge"
                    style={{
                      background: "var(--status-amber-bg, rgba(245,158,11,.1))",
                      color: "var(--status-amber-text, #b45309)",
                      fontSize: 10,
                      flexShrink: 0,
                    }}>
                    <Star size={9} style={{ fill: "currentColor" }} />{" "}
                    Principale
                  </span>
                )}
                {[
                  a.societe_libelle,
                  a.site_libelle,
                  a.secteur_libelle,
                  a.unite_libelle,
                ]
                  .filter(Boolean)
                  .map((label, i, arr) => (
                    <span
                      key={i}
                      style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: i === 0 ? 600 : 400,
                          color:
                            i === 0
                              ? "var(--text-primary)"
                              : "var(--text-secondary)",
                        }}>
                        {label}
                      </span>
                      {i < arr.length - 1 && (
                        <ChevronRight
                          size={10}
                          style={{
                            color: "var(--text-muted)",
                            opacity: 0.5,
                            flexShrink: 0,
                          }}
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
                    style={{
                      padding: "4px 8px",
                      height: "auto",
                      flexShrink: 0,
                    }}
                    className="text-text-muted hover:text-danger transition-colors ml-2">
                    {pendingDelete === a.id ? (
                      <Loader2
                        size={13}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
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
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "14px",
            borderRadius: "var(--r-sm)",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}>
          <GlobalError errors={errors} />

          {/* Société */}
          <div>
            <span style={labelCls}>Société *</span>
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
            <span style={labelCls}>Site *</span>
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
            <span style={labelCls}>
              Secteur{" "}
              <span style={{ fontWeight: 400, opacity: 0.7 }}>(optionnel)</span>
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

          {/* Unité */}
          <div>
            <span style={labelCls}>
              Unité{" "}
              <span style={{ fontWeight: 400, opacity: 0.7 }}>(optionnel)</span>
            </span>
            <Select
              value={form.unite}
              onValueChange={(v) => setForm({ ...form, unite: v })}
              disabled={!form.secteur}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    form.secteur ? "Aucune unité" : "Choisir un secteur d'abord"
                  }
                />
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
            <FieldError errors={errors} field="unite" />
          </div>

          {/* Principale */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingTop: 2,
            }}>
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
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Button
              type="submit"
              disabled={!form.societe || !form.site || saving}
              variant="custom"
              style={{ flex: 1 }}>
              {saving ? (
                <>
                  <Loader2
                    size={13}
                    style={{ animation: "spin 1s linear infinite" }}
                  />{" "}
                  Enregistrement…
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
              style={{ flex: 1 }}>
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <Button
          onClick={() => setShowForm(true)}
          variant="ghost"
          style={{
            alignSelf: "flex-start",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--color-primary)",
            padding: "6px 10px",
            borderRadius: "var(--r-sm)",
            border: "1px dashed var(--border)",
            background: "transparent",
          }}>
          <Plus size={13} /> Ajouter une appartenance
        </Button>
      )}
    </div>
  );
}
