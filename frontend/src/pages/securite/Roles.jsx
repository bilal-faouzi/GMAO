import { useEffect, useState } from "react";
import { Plus, Search, Trash2, Key, Shield, X } from "lucide-react";
import api from "@/services/api";
import {
  getRoles,
  getPermissions,
  createRole,
  deleteRole,
  assignPermissionToRole,
  deletePermissionfromRole,
} from "@/services/securiteService";

import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const niveauColor = (n) => {
  if (n === 1) return "bg-red-500/10 text-red-400";
  if (n === 2) return "bg-orange-500/10 text-orange-400";
  if (n === 3) return "bg-blue-500/10 text-blue-400";
  return "bg-white/5 text-gray-400";
};

const actionColor = (action) => {
  if (action === "READ") return "bg-blue-500/10 text-blue-400";
  if (action === "CREATE") return "bg-emerald-500/10 text-emerald-400";
  if (action === "UPDATE") return "bg-orange-500/10 text-orange-400";
  if (action === "DELETE") return "bg-red-500/10 text-red-400";
  return "bg-white/5 text-gray-400";
};

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openPerms, setOpenPerms] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [allPermissions, setAllPermissions] = useState([]);
  const [form, setForm] = useState({ code: "", libelle: "", niveau: "" });
  const [error, setError] = useState("");

  const fetchRoles = async () => {
    try {
      const res = await getRoles();
      setRoles(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPermissions = async () => {
    const res = await getPermissions();
    setAllPermissions(
      Array.isArray(res.data) ? res.data : res.data.results || [],
    );
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createRole(form);
      setOpenCreate(false);
      setForm({ code: "", libelle: "", niveau: "" });
      fetchRoles();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur.");
    }
  };

  const handleDelete = async (id) => {
    try {
      if (!confirm("Désactiver ce rôle ?")) return;
      await deleteRole(id);
      fetchRoles();
    } catch (err) {
      console.error(err);
    }
  };

  const openPermsModal = (role) => {
    setSelectedRole(role);
    fetchAllPermissions();
    setOpenPerms(true);
  };

  const handleAssignPermission = async (permId) => {
    try {
      await assignPermissionToRole(selectedRole.id, { id_permission: permId });
      const perm = allPermissions.find((p) => p.id === permId);
      setSelectedRole((prev) => ({
        ...prev,
        permissions: [...(prev.permissions || []), perm],
      }));
    } catch (err) {
      console.error(err);
    }
    fetchRoles();
  };

  const handleRemovePermission = async (permId) => {
    try {
      await deletePermissionfromRole(selectedRole.id, {
        id_permission: permId,
      });
      setSelectedRole((prev) => ({
        ...prev,
        permissions: prev.permissions.filter((p) => p.id !== permId),
      }));
      fetchRoles();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = roles.filter(
    (r) =>
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.libelle.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rôles</h1>
          <p className="text-slate-400 text-sm mt-1">
            Gérer les rôles et leurs permissions
          </p>
        </div>
        <Button
          onClick={() => {
            setError("");
            setOpenCreate(true);
          }}
          variant="custom">
          <Plus size={15} /> Nouveau rôle
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <Input
          placeholder="Rechercher un rôle..."
          className="  pl-9 "
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Cards */}
      {loading ? (
        <p className="text-center text-gray-500 py-12">Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((role) => (
            <div
              key={role.id}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Key size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{role.code}</h3>
                    <p className="text-xs text-gray-500">{role.libelle}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={() => openPermsModal(role)}
                    title="Permissions"
                    className="p-1.5 rounded hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 transition-colors">
                    <Shield size={13} />
                  </Button>
                  <Button
                    onClick={() => handleDelete(role.id)}
                    title="Désactiver"
                    className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-500">Niveau :</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${niveauColor(role.niveau)}`}>
                  Niveau {role.niveau}
                </span>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">
                  Permissions ({role.permissions?.length || 0}) :
                </p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions?.length > 0 ? (
                    role.permissions.slice(0, 3).map((p) => (
                      <span
                        key={p.id}
                        className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                        {p.code}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-600">
                      Aucune permission
                    </span>
                  )}
                  {role.permissions?.length > 3 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/10">
                      +{role.permissions.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Création */}
      {openCreate && (
        <Modal title="Nouveau rôle" onClose={() => setOpenCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Code</Label>
              <Input
                placeholder="ex: TECHNICIEN"
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                required
              />
            </div>
            <div>
              <Label>Libellé</Label>
              <Input
                placeholder="ex: Technicien de maintenance"
                value={form.libelle}
                onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Niveau hiérarchique</Label>
              <Input
                type="number"
                min="1"
                max="10"
                placeholder="ex: 3"
                value={form.niveau}
                onChange={(e) => setForm({ ...form, niveau: e.target.value })}
                required
              />
              <p className="text-xs text-gray-600 mt-1">
                1 = plus haut niveau (Admin)
              </p>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 py-2 " variant="custom">
                Créer
              </Button>
              <Button
                type="button"
                onClick={() => setOpenCreate(false)}
                className="flex-1 py-2 "
                variant="customOutline">
                Annuler
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Permissions */}
      {openPerms && (
        <Modal
          title={`Permissions — ${selectedRole?.code}`}
          onClose={() => setOpenPerms(false)}>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div>
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">
                Assignées ({selectedRole?.permissions?.length || 0})
              </p>
              <div className="space-y-2">
                {selectedRole?.permissions?.length > 0 ? (
                  selectedRole.permissions.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor(p.action)}`}>
                          {p.action}
                        </span>
                        <span className="text-xs font-mono text-gray-400">
                          {p.code}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleRemovePermission(p.id)}
                        className="text-gray-500 hover:text-red-400 transition-colors text-lg leading-none">
                        ×
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600 p-2">
                    Aucune permission assignée
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">
                Ajouter
              </p>
              <div className="space-y-2">
                {allPermissions
                  .filter(
                    (p) =>
                      !selectedRole?.permissions?.find((sp) => sp.id === p.id),
                  )
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor(p.action)}`}>
                          {p.action}
                        </span>
                        <span className="text-xs font-mono text-gray-400">
                          {p.code}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleAssignPermission(p.id)}
                        variant="custom">
                        Ajouter
                      </Button>
                    </div>
                  ))}
                {allPermissions.filter(
                  (p) =>
                    !selectedRole?.permissions?.find((sp) => sp.id === p.id),
                ).length === 0 && (
                  <p className="text-sm text-gray-600 p-2">
                    Toutes les permissions sont assignées
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
