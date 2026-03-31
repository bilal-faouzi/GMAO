import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Shield, Power, PowerOff } from "lucide-react";

import {
  createUtilisateur,
  getRoles,
  getUtilisateurs,
  updateUtilisateur,
  deleteUtilisateur,
  assignRoleToUser,
  removeRoleFromUser,
} from "@/services/securiteService";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { FieldError, GlobalError } from "@/components/FieldError";
import { useFormErrors } from "@/hooks/useFormErrors";

const labelCls = "text-xs text-gray-400 mb-1 block";

export default function Utilisateurs() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openRoles, setOpenRoles] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [allRoles, setAllRoles] = useState([]);
  const [form, setForm] = useState({
    nom_utilisateur: "",
    email: "",
    mot_de_passe: "",
    prenom: "",
    nom: "",
  });

  const { errors, setApiErrors, clearErrors, inputCls } = useFormErrors();

  const fetchUtilisateurs = async () => {
    try {
      const res = await getUtilisateurs();
      setUtilisateurs(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRoles = async () => {
    const res = await getRoles();
    setAllRoles(Array.isArray(res.data) ? res.data : res.data.results || []);
  };

  useEffect(() => {
    fetchUtilisateurs();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    clearErrors();
    try {
      await createUtilisateur(form);
      setOpenCreate(false);
      setForm({
        nom_utilisateur: "",
        email: "",
        mot_de_passe: "",
        prenom: "",
        nom: "",
      });
      fetchUtilisateurs();
    } catch (err) {
      setApiErrors(err);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    clearErrors();
    try {
      await updateUtilisateur(selected.id, form);
      setOpenEdit(false);
      fetchUtilisateurs();
    } catch (err) {
      setApiErrors(err);
    }
  };

  const handleDelete = async (id, est_actif) => {
    if (!confirm(`${est_actif ? "Désactiver" : "Activer"} cet utilisateur ?`))
      return;
    await deleteUtilisateur(id);
    fetchUtilisateurs();
  };

  const openEditModal = (u) => {
    setSelected(u);
    setForm({
      prenom: u.prenom,
      nom: u.nom,
      email: u.email,
      mot_de_passe: "",
      nom_utilisateur: u.nom_utilisateur,
    });
    clearErrors();
    setOpenEdit(true);
  };

  const openRolesModal = (u) => {
    setSelectedUser(u);
    fetchAllRoles();
    setOpenRoles(true);
  };

  const handleAssignRole = async (roleId) => {
    await assignRoleToUser(selectedUser.id, { id_role: roleId });
    const role = allRoles.find((r) => r.id === roleId);
    setSelectedUser((prev) => ({
      ...prev,
      roles: [...(prev.roles || []), role],
    }));
    fetchUtilisateurs();
  };

  const handleRemoveRole = async (roleId) => {
    await removeRoleFromUser(selectedUser.id, { id_role: roleId });
    setSelectedUser((prev) => ({
      ...prev,
      roles: prev.roles.filter((r) => r.id !== roleId),
    }));
    fetchUtilisateurs();
  };

  const filtered = utilisateurs.filter(
    (u) =>
      u.nom_utilisateur.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.prenom.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
          <p className="text-slate-400 text-sm mt-1">
            Gérer les comptes utilisateurs
          </p>
        </div>
        <Button
          onClick={() => {
            clearErrors();
            setOpenCreate(true);
          }}
          variant="custom">
          <Plus size={15} /> Nouvel utilisateur
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <Input
          placeholder="Rechercher un utilisateur..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {["Utilisateur", "Email", "Rôles", "Statut"].map((h) => (
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
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-gray-500">
                  Chargement...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-gray-500">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 text-xs font-bold">
                          {u.prenom[0]}
                          {u.nom[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {u.prenom} {u.nom}
                        </p>
                        <p className="text-xs text-gray-500">
                          @{u.nom_utilisateur}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {u.roles?.length > 0 ? (
                        u.roles.map((r) => (
                          <span
                            key={r.id}
                            className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">
                            {r.code}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-600 text-xs">
                          Aucun rôle
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.est_actif ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {u.est_actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        onClick={() => openRolesModal(u)}
                        title="Gérer les rôles"
                        className="rounded hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-400 transition-colors">
                        <Shield size={13} />
                      </Button>
                      <Button
                        onClick={() => openEditModal(u)}
                        title="Modifier"
                        className="rounded hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 transition-colors">
                        <Pencil size={13} />
                      </Button>
                      <Button
                        onClick={() => handleDelete(u.id, u.est_actif)}
                        title={u.est_actif ? "Désactiver" : "Activer"}
                        className="rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                        {u.est_actif ? (
                          <Power size={13} />
                        ) : (
                          <PowerOff size={13} />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal Création ── */}
      {openCreate && (
        <Modal title="Nouvel utilisateur" onClose={() => setOpenCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <GlobalError errors={errors} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelCls}>Prénom</Label>
                <Input
                  className={inputCls("prenom")}
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                  required
                />
                <FieldError errors={errors} field="prenom" />
              </div>
              <div>
                <Label className={labelCls}>Nom</Label>
                <Input
                  className={inputCls("nom")}
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  required
                />
                <FieldError errors={errors} field="nom" />
              </div>
            </div>

            <div>
              <Label className={labelCls}>Nom d'utilisateur</Label>
              <Input
                className={inputCls("nom_utilisateur")}
                value={form.nom_utilisateur}
                onChange={(e) =>
                  setForm({ ...form, nom_utilisateur: e.target.value })
                }
                required
              />
              <FieldError errors={errors} field="nom_utilisateur" />
            </div>

            <div>
              <Label className={labelCls}>Email</Label>
              <Input
                type="email"
                className={inputCls("email")}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <FieldError errors={errors} field="email" />
            </div>

            <div>
              <Label className={labelCls}>Mot de passe</Label>
              <Input
                type="password"
                className={inputCls("mot_de_passe")}
                value={form.mot_de_passe}
                onChange={(e) =>
                  setForm({ ...form, mot_de_passe: e.target.value })
                }
                required
              />
              <FieldError errors={errors} field="mot_de_passe" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                variant="custom"
                className="flex-1 py-2 rounded-lg">
                Créer
              </Button>
              <Button
                type="button"
                onClick={() => setOpenCreate(false)}
                variant="customOutline"
                className="flex-1 py-2 rounded-lg">
                Annuler
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal Modification ── */}
      {openEdit && (
        <Modal
          title="Modifier l'utilisateur"
          onClose={() => setOpenEdit(false)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <GlobalError errors={errors} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelCls}>Prénom</Label>
                <Input
                  className={inputCls("prenom")}
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                />
                <FieldError errors={errors} field="prenom" />
              </div>
              <div>
                <Label className={labelCls}>Nom</Label>
                <Input
                  className={inputCls("nom")}
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
                <FieldError errors={errors} field="nom" />
              </div>
            </div>

            <div>
              <Label className={labelCls}>Email</Label>
              <Input
                type="email"
                className={inputCls("email")}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <FieldError errors={errors} field="email" />
            </div>

            <div>
              <Label className={labelCls}>
                Nouveau mot de passe (optionnel)
              </Label>
              <Input
                type="password"
                className={inputCls("mot_de_passe")}
                value={form.mot_de_passe}
                onChange={(e) =>
                  setForm({ ...form, mot_de_passe: e.target.value })
                }
              />
              <FieldError errors={errors} field="mot_de_passe" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                variant="custom"
                className="flex-1 py-2 rounded-lg">
                Enregistrer
              </Button>
              <Button
                type="button"
                onClick={() => setOpenEdit(false)}
                variant="customOutline"
                className="flex-1 py-2 rounded-lg">
                Annuler
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal Gestion Rôles ── */}
      {openRoles && (
        <Modal
          title={`Rôles — ${selectedUser?.prenom} ${selectedUser?.nom}`}
          onClose={() => setOpenRoles(false)}>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">
                Rôles assignés
              </p>
              <div className="space-y-2">
                {selectedUser?.roles?.length > 0 ? (
                  selectedUser.roles.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">
                          {r.code}
                        </span>
                        <span className="text-xs text-gray-500">
                          {r.libelle}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleRemoveRole(r.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors text-lg leading-none">
                        ×
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600 p-2">
                    Aucun rôle assigné
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">
                Assigner un rôle
              </p>
              <div className="space-y-2">
                {allRoles
                  .filter(
                    (r) => !selectedUser?.roles?.find((ur) => ur.id === r.id),
                  )
                  .map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-white/10">
                      <div>
                        <span className="text-sm font-medium text-white">
                          {r.code}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {r.libelle}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleAssignRole(r.id)}
                        variant="custom"
                        className="flex py-2">
                        Assigner
                      </Button>
                    </div>
                  ))}
                {allRoles.filter(
                  (r) => !selectedUser?.roles?.find((ur) => ur.id === r.id),
                ).length === 0 && (
                  <p className="text-sm text-gray-600 p-2">
                    Tous les rôles sont déjà assignés
                  </p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
