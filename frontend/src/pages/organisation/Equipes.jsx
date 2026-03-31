import { useState, useEffect } from "react";
import { Users, Plus, Pencil, Trash2, UserPlus, UserMinus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";
import { FieldError, GlobalError } from "@/components/FieldError";
import { useFormErrors } from "@/hooks/useFormErrors";

// ─── RoleBadge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const styles = {
    CHEF: "bg-amber-500/10 text-amber-400",
    MEMBRE: "bg-blue-500/10 text-blue-400",
    REMPLACANT: "bg-gray-500/10 text-gray-400",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[role] || styles.MEMBRE}`}>
      {role}
    </span>
  );
}

// ─── MembresPanel ─────────────────────────────────────────────────────────────

function MembresPanel({ equipe, onClose }) {
  const [membres, setMembres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newMembre, setNewMembre] = useState({
    utilisateur: "",
    niveauRole: "MEMBRE",
  });
  const [utilisateurs, setUtilisateurs] = useState([]);

  // Hook dédié aux erreurs du panel membres
  const { errors, setApiErrors, clearErrors } = useFormErrors();

  useEffect(() => {
    fetchMembres();
    getUtilisateurs().then((r) => setUtilisateurs(r.data.results || r.data));
  }, [equipe.id]);

  async function fetchMembres() {
    try {
      setLoading(true);
      const res = await getMembres(equipe.id);
      setMembres(res.data.results || res.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newMembre.utilisateur) return;
    clearErrors();
    try {
      const payload = {
        equipe: equipe.id,
        utilisateur: parseInt(newMembre.utilisateur, 10), // ← Conversion ici
        niveauRole: newMembre.niveauRole,
      };
      console.log("Payload pour ajout de membre :", payload);
      await addMembre(payload);
      setNewMembre({ utilisateur: "", niveauRole: "MEMBRE" });
      setShowAdd(false);
      fetchMembres();
    } catch (err) {
      setApiErrors(err);
    }
  }

  async function handleRemove(membreId) {
    if (!confirm("Retirer ce membre ?")) return;
    await removeMembre(membreId);
    fetchMembres();
  }

  return (
    <Modal title={`Membres — ${equipe.libelle}`} onClose={onClose}>
      <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-4">
            Chargement...
          </p>
        ) : membres.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">Aucun membre</p>
        ) : (
          membres.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-2 rounded-lg bg-white/5">
              <div>
                <p className="text-sm text-white">{m.utilisateur_nom}</p>
                <RoleBadge role={m.niveauRole} />
              </div>
              <Button
                onClick={() => handleRemove(m.id)}
                className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors">
                <UserMinus size={14} />
              </Button>
            </div>
          ))
        )}
      </div>

      {showAdd ? (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <GlobalError errors={errors} />

          <Select
            value={newMembre.utilisateur}
            onValueChange={(v) =>
              setNewMembre({ ...newMembre, utilisateur: v })
            }>
            <SelectTrigger className="w-full">
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
          <FieldError errors={errors} field="utilisateur" />

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

// ─── EquipeModal ──────────────────────────────────────────────────────────────

function EquipeModal({ equipe, sites, specialites, onClose, onSaved }) {
  const [form, setForm] = useState({
    libelle: equipe?.libelle || "",
    site: equipe?.site || "",
    specialite: equipe?.specialite || "",
    estActif: equipe?.estActif ?? true,
  });
  const [saving, setSaving] = useState(false);

  // Hook dédié aux erreurs du modal équipe
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
          <Label className="text-xs text-gray-400 mb-1 block">Libellé *</Label>
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
          <Label className="text-xs text-gray-400 mb-1 block">Site *</Label>
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
          <Label className="text-xs text-gray-400 mb-1 block">Spécialité</Label>
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

// ─── Page principale ──────────────────────────────────────────────────────────

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
    if (!confirm(`Supprimer l'équipe "${equipe.libelle}" ?`)) return;
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
          <h1 className="text-2xl font-bold text-white">Équipes</h1>
          <p className="text-gray-400 text-sm mt-1">
            {equipes.length} équipe(s) au total
          </p>
        </div>
        <Button onClick={() => setModalEquipe("new")} variant="custom">
          <Plus size={15} />
          Nouvelle équipe
        </Button>
      </div>

      {/* Filtre site */}
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

      {/* Tableau */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
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
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Aucune équipe
                </td>
              </tr>
            ) : (
              filtered.map((eq) => (
                <tr key={eq.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">
                    {eq.libelle}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {eq.site_libelle || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {eq.specialite_libelle || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {eq.chef_nom || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      onClick={() => setPanelMembres(eq)}
                      className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors">
                      <Users size={13} />
                      <span>{eq.membres_count ?? 0}</span>
                    </Button>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${eq.estActif ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {eq.estActif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={() => setModalEquipe(eq)}
                        className="rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <Pencil size={13} />
                      </Button>
                      <Button
                        onClick={() => handleDelete(eq)}
                        className="rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </Button>
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
          onClose={() => setPanelMembres(null)}
        />
      )}
    </div>
  );
}
