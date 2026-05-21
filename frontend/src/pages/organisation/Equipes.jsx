import { useState, useEffect, useRef } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  Check,
  ChevronsUpDown,
  AlertTriangle,
} from "lucide-react";
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
  getEquipes,
  createEquipe,
  updateEquipe,
  deleteEquipe,
  getMembres,
  addMembre,
  removeMembre,
  getSites,
  getSpecialites,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";
import { FieldError, GlobalError } from "@/components/FieldError";
import { useFormErrors } from "@/hooks/useFormErrors";
import { cn } from "@/lib/utils";

//  RoleBadge

function RoleBadge({ role }) {
  const styles = {
    CHEF: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
    MEMBRE: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
    REMPLACANT: "bg-gray-100 dark:bg-gray-500/10 text-text-secondary",
  };
  return (
    <span
      className={`text-xxs px-2 py-0.5  rounded-full font-medium ${styles[role] || styles.MEMBRE}`}>
      {role}
    </span>
  );
}

//  MembresPanel

function MembresPanel({ equipe, onClose }) {
  const [membres, setMembres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newMembre, setNewMembre] = useState({
    utilisateur: "",
    niveauRole: "MEMBRE",
  });
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [openCombo, setOpenCombo] = useState(false);
  const searchTimer = useRef(null);
  const { errors, setApiErrors, clearErrors } = useFormErrors();

  useEffect(() => {
    fetchMembres();
  }, [equipe.id]);

  useEffect(() => {
    if (!showAdd) return;
    fetchUsers("");
  }, [showAdd]);

  async function fetchMembres() {
    try {
      setLoading(true);
      const res = await getMembres(equipe.id);
      setMembres(res.data.results || res.data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers(q) {
    setUsersLoading(true);
    try {
      const res = await getUtilisateurs({ all: "true", search: q });
      setUtilisateurs(res.data.results);
    } finally {
      setUsersLoading(false);
    }
  }

  function handleSearch(q) {
    setSearch(q);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchUsers(q), 300);
  }

  async function handleAdd() {
    if (!newMembre.utilisateur) return;
    clearErrors();
    try {
      await addMembre({
        equipe: equipe.id,
        utilisateur: newMembre.utilisateur,
        niveauRole: newMembre.niveauRole,
      });
      setNewMembre({ utilisateur: "", niveauRole: "MEMBRE" });
      setSearch("");
      fetchMembres();
      await fetchUsers("");
    } catch (err) {
      setApiErrors(err);
    }
  }

  async function handleRemove(membreId) {
    await removeMembre(membreId);
    fetchMembres();
  }

  const usersDisponibles = utilisateurs.filter(
    (u) => !membres.some((m) => m.utilisateur === u.id),
  );

  const selectedUser = utilisateurs.find((u) => u.id === newMembre.utilisateur);

  return (
    <Modal title={`Membres — ${equipe.libelle}`} onClose={onClose}>
      {/*  Liste membres actuels  */}
      <div className="space-y-2 max-h-64 overflow-y-auto mb-10">
        {loading ? (
          <p className="text-text-secondary text-sm text-center py-4">
            Chargement...
          </p>
        ) : membres.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-4">
            Aucun membre
          </p>
        ) : (
          membres.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-2 mx-2 my-1  shadow-xl hover:ring dark:bg-neutral-900/50  rounded-sm bg-blue-100/50 ring-blue-200/50 transition-all">
              <div>
                <p className="text-sm text-text ">{m.utilisateur_nom}</p>
                <RoleBadge role={m.niveauRole} />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="rounded hover:bg-red-100 dark:hover:bg-danger-soft text-text-muted hover:text-danger transition-colors">
                    <UserMinus size={14} />
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-500" />
                      Supprimer l’équipe
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Voulez-vous vraiment retirer ce membre de l’équipe ?
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemove(m.id)}
                      className="bg-red-600 hover:bg-red-700">
                      Retirer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
      </div>

      {/*  Formulaire ajout  */}
      {showAdd ? (
        <div className="space-y-3 border-t border-border pt-4">
          <GlobalError errors={errors} />

          {/* Combobox utilisateur avec recherche */}
          <Popover open={openCombo} onOpenChange={setOpenCombo}>
            <PopoverTrigger asChild>
              <Button
                variant="customOutline"
                role="combobox"
                className="w-full justify-between font-normal">
                {selectedUser
                  ? `${selectedUser.prenom} ${selectedUser.nom}`
                  : "Sélectionner un utilisateur..."}
                <ChevronsUpDown size={14} className="ml-2 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-1 bg-elevated border border-border rounded-md shadow-xl"
              align="start">
              <Command shouldFilter={false} className="bg-transparent">
                <CommandInput
                  placeholder="Rechercher..."
                  value={search}
                  onValueChange={handleSearch}
                  className="text-sm text-text border-b border-border px-3 py-2 placeholder:text-text-muted bg-transparent outline-none"
                />
                <CommandList className="max-h-52 overflow-y-auto">
                  {usersLoading ? (
                    <div className="py-4 text-center text-sm text-text-muted">
                      Chargement...
                    </div>
                  ) : usersDisponibles.length === 0 ? (
                    <CommandEmpty>Aucun résultat</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {usersDisponibles.map((u) => (
                        <CommandItem
                          key={u.id}
                          value={u.id}
                          onSelect={() => {
                            setNewMembre({ ...newMembre, utilisateur: u.id });
                            setOpenCombo(false);
                          }}
                          className="flex items-center  px-3 py-2 text-sm cursor-pointer rounded-sm text-text hover:bg-hover data-[selected=true]:bg-hover">
                          <Check
                            size={14}
                            className={cn(
                              "mr-2 flex-shrink-0",
                              newMembre.utilisateur === u.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <span>
                            {u.prenom} {u.nom}
                          </span>
                          <span className="ml-2 text-xs text-text-muted ">
                            {u.nom_utilisateur}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FieldError errors={errors} field="utilisateur" />

          {/* Select rôle */}
          <Select
            value={newMembre.niveauRole}
            onValueChange={(v) =>
              setNewMembre({ ...newMembre, niveauRole: v })
            }>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="MEMBRE">Membre</SelectItem>
                <SelectItem value="CHEF">Chef</SelectItem>
                <SelectItem value="REMPLACANT">Remplaçant</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldError errors={errors} field="niveauRole" />

          <div className="flex gap-2">
            <Button onClick={handleAdd} variant="custom">
              Confirmer
            </Button>
            <Button
              onClick={() => {
                setShowAdd(false);
                clearErrors();
                setSearch("");
                setUtilisateurs([]);
                setNewMembre({ utilisateur: "", niveauRole: "MEMBRE" });
              }}
              variant="customOutline">
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowAdd(true)} variant="customOutline">
          <UserPlus size={14} />
          Ajouter un membre
        </Button>
      )}
    </Modal>
  );
}

//  EquipeModal

function EquipeModal({ equipe, sites, specialites, onClose, onSaved }) {
  const [form, setForm] = useState({
    libelle: equipe?.libelle || "",
    site: equipe?.site || "",
    specialite: equipe?.specialite || "",
    estActif: equipe?.estActif ?? true,
  });
  const [saving, setSaving] = useState(false);
  const { errors, setApiErrors, clearErrors, inputCls } = useFormErrors();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.libelle || !form.site) return;
    clearErrors();
    try {
      setSaving(true);
      equipe ? await updateEquipe(equipe.id, form) : await createEquipe(form);
      onSaved();
      onClose();
    } catch (err) {
      setApiErrors(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={equipe ? "Modifier l'équipe" : "Nouvelle équipe"}
      onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <GlobalError errors={errors} />

        <div>
          <Label className="text-xs text-text-secondary mb-1 block">
            Libellé *
          </Label>
          <Input
            className={inputCls("libelle")}
            value={form.libelle}
            onChange={(e) => setForm({ ...form, libelle: e.target.value })}
            placeholder="Ex: Équipe Électricité Nord"
            required
          />
          <FieldError errors={errors} field="libelle" />
        </div>

        <div>
          <Label className="text-xs text-text-secondary mb-1 block">
            Site *
          </Label>
          <Select
            value={form.site}
            onValueChange={(v) => setForm({ ...form, site: v })}
            required>
            <SelectTrigger className="w-full">
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
          <FieldError errors={errors} field="site" />
        </div>

        <div>
          <Label className="text-xs text-text-secondary mb-1 block">
            Spécialité
          </Label>
          <Select
            value={form.specialite || ""}
            onValueChange={(v) =>
              setForm({ ...form, specialite: v === "__none__" ? null : v })
            }>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Aucune spécialité" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="__none__">Aucune spécialité</SelectItem>
                {specialites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.libelle}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldError errors={errors} field="specialite" />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="estActif"
            checked={form.estActif}
            onCheckedChange={(checked) =>
              setForm({ ...form, estActif: checked })
            }
          />
          <FieldLabel>Active</FieldLabel>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 disabled:opacity-50"
            variant="custom">
            {saving ? "Enregistrement..." : equipe ? "Modifier" : "Créer"}
          </Button>
          <Button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg"
            variant="customOutline">
            Annuler
          </Button>
        </div>
      </form>
    </Modal>
  );
}

//  Page principale

export default function Equipes() {
  const [equipes, setEquipes] = useState([]);
  const [sites, setSites] = useState([]);
  const [specialites, setSpecialites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalEquipe, setModalEquipe] = useState(null);
  const [panelMembres, setPanelMembres] = useState(null);
  const [filterSite, setFilterSite] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      setLoading(true);
      const [eqRes, siRes, spRes] = await Promise.all([
        getEquipes(),
        getSites(),
        getSpecialites(),
      ]);
      setEquipes(eqRes.data.results || eqRes.data);
      setSites(siRes.data.results || siRes.data);
      setSpecialites(spRes.data.results || spRes.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(equipe) {
    await deleteEquipe(equipe.id);
    fetchAll();
  }

  const filtered = filterSite
    ? equipes.filter((e) => e.site === filterSite)
    : equipes;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Équipes</h1>
          <p className="text-text-secondary text-sm mt-1">
            {equipes.length} équipe(s) au total
          </p>
        </div>
        <Button onClick={() => setModalEquipe("new")} variant="custom">
          <Plus size={15} /> Nouvelle équipe
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={filterSite} onValueChange={setFilterSite}>
          <SelectTrigger className="min-w-[180px]">
            <SelectValue placeholder="Tous les sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="__none__">Tous les sites</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.libelle}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {[
                "Équipe",
                "Site",
                "Spécialité",
                "Chef",
                "Membres",
                "Statut",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {h}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
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
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-text-muted">
                  Aucune équipe
                </td>
              </tr>
            ) : (
              filtered.map((eq) => (
                <tr key={eq.id} className="hover:bg-surface transition-colors">
                  <td className="px-4 py-3 font-medium text-text">
                    {eq.libelle}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {eq.site_libelle || "—"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {eq.specialite_libelle || "—"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {eq.chef_nom || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      onClick={() => setPanelMembres(eq)}
                      variant="ghost"
                      className="flex items-center gap-1.5 text-blue-700 dark:text-primary dark:hover:bg-blue-300/10 hover:bg-blue-600/10 transition-colors">
                      <Users size={13} />
                      <span>{eq.membres_count ?? 0}</span>
                    </Button>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${eq.estActif ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-danger-soft text-red-700 dark:text-danger"}`}>
                      {eq.estActif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={() => setModalEquipe(eq)}
                        variant="ghost"
                        className="rounded hover:bg-hover text-text-secondary hover:text-text transition-colors">
                        <Pencil size={13} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="rounded hover:bg-red-100 dark:hover:bg-danger-soft text-text-secondary hover:text-danger transition-colors">
                            <Trash2 size={13} />
                          </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle
                                size={16}
                                className="text-red-500"
                              />
                              Supprimer l’équipe
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action supprimera l’équipe{" "}
                              <strong>{eq.libelle}</strong>. Cette action est
                              irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(eq)}
                              className="bg-red-600 hover:bg-red-700">
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalEquipe && (
        <EquipeModal
          equipe={modalEquipe === "new" ? null : modalEquipe}
          sites={sites}
          specialites={specialites}
          onClose={() => setModalEquipe(null)}
          onSaved={fetchAll}
        />
      )}
      {panelMembres && (
        <MembresPanel
          equipe={panelMembres}
          onClose={() => {
            setPanelMembres(null);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}
