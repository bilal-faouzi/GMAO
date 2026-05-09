import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Key,
  Shield,
  PowerOff,
  Power,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
} from "lucide-react";
import {
  getRoles,
  getPermissions,
  getInterfaces,
  createRole,
  updateRole,
  assignPermissionToRole,
  deletePermissionfromRole,
  assignInterfaceToRole,
  removeInterfaceFromRole,
  deleteRole,
} from "@/services/securiteService";

import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FieldError, GlobalError } from "@/components/FieldError";
import { useFormErrors } from "@/hooks/useFormErrors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const niveauStyles = {
  1: {
    bg: "bg-red-100 dark:bg-red-500/10",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-300 dark:border-red-500",
    shadow: "shadow-red-300/30 dark:shadow-red-500/30",
  },
  2: {
    bg: "bg-orange-100 dark:bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-300 dark:border-orange-500",
    shadow: "shadow-orange-300/30 dark:shadow-orange-500/30",
  },
  3: {
    bg: "bg-blue-100 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-300 dark:border-blue-500",
    shadow: "shadow-blue-300/30 dark:shadow-blue-500/30",
  },
  4: {
    bg: "bg-emerald-100 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-300 dark:border-emerald-500",
    shadow: "shadow-emerald-300/30 dark:shadow-emerald-500/30",
  },
  5: {
    bg: "bg-cyan-100 dark:bg-cyan-500/10",
    text: "text-cyan-700 dark:text-cyan-400",
    border: "border-cyan-300 dark:border-cyan-500",
    shadow: "shadow-cyan-300/30 dark:shadow-cyan-500/30",
  },
};

const actionColor = (action) => {
  if (action === "READ")
    return "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400";
  if (action === "CREATE")
    return "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (action === "UPDATE")
    return "bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400";
  if (action === "DELETE")
    return "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400";
  return "bg-surface text-text-secondary";
};

const niveaux = [1, 2, 3, 4, 5];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openPerms, setOpenPerms] = useState(false);
  const [openInterfaces, setOpenInterfaces] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [allPermissions, setAllPermissions] = useState([]);
  const [allInterfaces, setAllInterfaces] = useState([]);
  const [form, setForm] = useState({ code: "", libelle: "", niveau: "" });
  const [selectedNiveau, setSelectedNiveau] = useState(null);
  const [expandedRoles, setExpandedRoles] = useState({});

  const toggleExpand = (id) =>
    setExpandedRoles((prev) => ({ ...prev, [id]: !prev[id] }));

  const { errors, setApiErrors, clearErrors, inputCls } = useFormErrors();

  // ── Fetch ──────────────────────────────────────────────────────────────────

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

  const fetchAllInterfaces = async () => {
    const res = await getInterfaces();
    setAllInterfaces(
      Array.isArray(res.data) ? res.data : res.data.results || [],
    );
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCreate = async (e) => {
    e.preventDefault();
    clearErrors();
    try {
      await createRole(form);
      setOpenCreate(false);
      setForm({ code: "", libelle: "", niveau: "" });
      setSelectedNiveau(null);
      fetchRoles();
    } catch (err) {
      setApiErrors(err);
    }
  };

  const handleDesactive = async (id) => {
    const roleActuel = roles.find((r) => r.id === id);
    if (!roleActuel) return;

    if (roleActuel.est_actif === true) {
      if (!confirm("Désactiver ce rôle ?")) return;
      try {
        await deleteRole(id, { est_actif: false });
        fetchRoles();
      } catch (err) {
        console.error(err);
      }
    } else {
      if (!confirm("Réactiver ce rôle ?")) return;
      try {
        await updateRole(id, { est_actif: true });
        fetchRoles();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const openPermsModal = (role) => {
    setSelectedRole(role);
    fetchAllPermissions();
    setOpenPerms(true);
  };

  const openInterfacesModal = (role) => {
    setSelectedRole(role);
    fetchAllInterfaces();
    setOpenInterfaces(true);
  };

  const handleAssignPermission = async (permId) => {
    try {
      await assignPermissionToRole(selectedRole.id, { id_permission: permId });
      const perm = allPermissions.find((p) => p.id === permId);
      setSelectedRole((prev) => ({
        ...prev,
        permissions: [...(prev.permissions || []), perm],
      }));
      fetchRoles();
    } catch (err) {
      console.error(err);
    }
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

  const handleAssignInterface = async (interfaceId) => {
    try {
      await assignInterfaceToRole(selectedRole.id, { id_interface: interfaceId });
      const iface = allInterfaces.find((i) => i.id === interfaceId);
      setSelectedRole((prev) => ({
        ...prev,
        interfaces: [...(prev.interfaces || []), iface],
      }));
      fetchRoles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveInterface = async (interfaceId) => {
    try {
      await removeInterfaceFromRole(selectedRole.id, {
        id_interface: interfaceId,
      });
      setSelectedRole((prev) => ({
        ...prev,
        interfaces: prev.interfaces.filter((i) => i.id !== interfaceId),
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Rôles</h1>
          <p className="text-text-secondary text-sm mt-1">
            Gérer les rôles et leurs permissions
          </p>
        </div>
        <Button
          onClick={() => {
            clearErrors();
            setForm({ code: "", libelle: "", niveau: "" });
            setSelectedNiveau(null);
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
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <Input
          placeholder="Rechercher un rôle..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Cards */}
      {loading ? (
        <p className="text-center text-text-muted py-12">Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((role) => (
            <div
              key={role.id}
              className={`border rounded-xl p-5 transition-colors ${
                role.est_actif !== false
                  ? "bg-surface border-border hover:bg-hover"
                  : "bg-elevated border-border-subtle opacity-50 grayscale"
              }`}>
              {/* Header carte */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${role.est_actif !== false ? "bg-blue-100 dark:bg-blue-500/10" : "bg-gray-100 dark:bg-gray-500/10"}`}>
                    <Key
                      size={18}
                      className={
                        role.est_actif !== false
                          ? "text-blue-700 dark:text-blue-400"
                          : "text-text-muted"
                      }
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-text">{role.code}</h3>
                      {role.est_actif === false && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-500/10 text-text-muted border border-gray-300/20 dark:border-gray-500/20">
                          Désactivé
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">{role.libelle}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <Button
                    onClick={() => openInterfacesModal(role)}
                    title="Interfaces"
                    variant="ghost"
                    className="p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-500/10 text-text-muted hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                    <LayoutDashboard size={13} />
                  </Button>
                  <Button
                    onClick={() => openPermsModal(role)}
                    title="Permissions"
                    variant="ghost"
                    className="p-2 rounded hover:bg-emerald-100 dark:hover:bg-emerald-500/10 text-text-muted hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                    <Shield size={13} />
                  </Button>
                  <Button
                    onClick={() => handleDesactive(role.id)}
                    title={
                      role.est_actif !== false ? "Désactiver" : "Réactiver"
                    }
                    variant="ghost"
                    className="p-2 rounded hover:bg-orange-100 dark:hover:bg-orange-500/10 text-text-muted hover:text-orange-700 dark:hover:text-orange-400 transition-colors">
                    {role.est_actif !== false ? (
                      <PowerOff size={13} />
                    ) : (
                      <Power size={13} />
                    )}
                  </Button>
                </div>
              </div>

              {/* Niveau */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-text-muted">Niveau :</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${niveauStyles[role.niveau].bg} ${niveauStyles[role.niveau].text} border ${niveauStyles[role.niveau].border} shadow ${niveauStyles[role.niveau].shadow}`}>
                  Niveau {role.niveau}
                </span>
              </div>

              {/* Permissions preview */}
              <div>
                <div
                  className="flex items-center justify-between cursor-pointer mb-2"
                  onClick={() =>
                    role.permissions?.length > 3 && toggleExpand(role.id)
                  }>
                  <p className="text-xs text-text-muted">
                    Permissions ({role.permissions?.length || 0}) :
                  </p>
                  {role.permissions?.length > 3 &&
                    (expandedRoles[role.id] ? (
                      <ChevronUp size={14} className="text-text-muted" />
                    ) : (
                      <ChevronDown size={14} className="text-text-muted" />
                    ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {role.permissions?.length > 0 ? (
                    (expandedRoles[role.id]
                      ? role.permissions
                      : role.permissions.slice(0, 3)
                    ).map((p) => (
                      <span
                        key={p.id}
                        className="text-xs px-2 py-0.5 rounded-full bg-surface text-text-secondary border border-border">
                        {p.code}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-text-muted">
                      Aucune permission
                    </span>
                  )}
                  {!expandedRoles[role.id] && role.permissions?.length > 3 && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border cursor-pointer hover:bg-hover"
                      onClick={() => toggleExpand(role.id)}>
                      +{role.permissions.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Création ── */}
      {openCreate && (
        <Modal title="Nouveau rôle" onClose={() => setOpenCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <GlobalError errors={errors} />

            <div>
              <Label>Code</Label>
              <Input
                placeholder="ex: TECHNICIEN"
                className={inputCls("code")}
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                required
              />
              <FieldError errors={errors} field="code" />
            </div>

            <div>
              <Label>Libellé</Label>
              <Input
                placeholder="ex: Technicien de maintenance"
                className={inputCls("libelle")}
                value={form.libelle}
                onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                required
              />
              <FieldError errors={errors} field="libelle" />
            </div>

            <div className="space-y-1">
              <Label>Niveau hiérarchique</Label>
              <div className="flex items-center gap-2">
                {niveaux.map((n) => (
                  <Button
                    key={n}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, niveau: n });
                      setSelectedNiveau(n);
                    }}
                    className={`transition-all duration-200 ${niveauStyles[n].bg} ${
                      selectedNiveau === n
                        ? `ring-2 ${niveauStyles[n].text} ring-offset-2 ${niveauStyles[n].border} ring-offset-bg scale-110 opacity-100 shadow-lg ${niveauStyles[n].shadow}`
                        : "opacity-50 hover:opacity-80 scale-100"
                    }`}>
                    {n}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-text-muted mt-1">
                1 = plus haut niveau (Admin)
              </p>
              <FieldError errors={errors} field="niveau" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 py-2" variant="custom">
                Créer
              </Button>
              <Button
                type="button"
                onClick={() => setOpenCreate(false)}
                className="flex-1 py-2"
                variant="customOutline">
                Annuler
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal Permissions ── */}
      {openPerms && (
        <Modal
          title={`Permissions — ${selectedRole?.code}`}
          onClose={() => setOpenPerms(false)}>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Assignées */}
            <div>
              <p className="text-xs text-text-secondary mb-2 uppercase tracking-wider">
                Assignées ({selectedRole?.permissions?.length || 0})
              </p>
              <div className="space-y-2">
                {selectedRole?.permissions?.length > 0 ? (
                  selectedRole.permissions.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-surface">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor(p.action)}`}>
                          {p.action}
                        </span>
                        <span className="text-xs font-mono text-text-secondary">
                          {p.code}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleRemovePermission(p.id)}
                        className="text-text-muted hover:text-danger transition-colors text-lg leading-none"
                        variant="ghost">
                        ×
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-muted p-2">
                    Aucune permission assignée
                  </p>
                )}
              </div>
            </div>

            {/* Ajouter */}
            <div>
              <p className="text-xs text-text-secondary mb-2 uppercase tracking-wider">
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
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor(p.action)}`}>
                          {p.action}
                        </span>
                        <span className="text-xs font-mono text-text-secondary">
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
                  <p className="text-sm text-text-muted p-2">
                    Toutes les permissions sont assignées
                  </p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal Interfaces ── */}
      {openInterfaces && (
        <Modal
          title={`Interfaces — ${selectedRole?.code}`}
          onClose={() => setOpenInterfaces(false)}>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Assignées */}
            <div>
              <p className="text-xs text-text-secondary mb-2 uppercase tracking-wider">
                Assignées ({selectedRole?.interfaces?.length || 0})
              </p>
              <div className="space-y-2">
                {selectedRole?.interfaces?.length > 0 ? (
                  selectedRole.interfaces.map((iface) => (
                    <div
                      key={iface.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-surface">
                      <div>
                        <span className="text-sm font-medium text-text">
                          {iface.libelle}
                        </span>
                        <span className="text-xs text-text-muted ml-2">
                          {iface.route}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleRemoveInterface(iface.id)}
                        className="text-text-muted hover:text-danger transition-colors text-lg leading-none"
                        variant="ghost">
                        ×
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-muted p-2">
                    Aucune interface assignée
                  </p>
                )}
              </div>
            </div>

            {/* Ajouter */}
            <div>
              <p className="text-xs text-text-secondary mb-2 uppercase tracking-wider">
                Ajouter
              </p>
              <div className="space-y-2">
                {allInterfaces
                  .filter(
                    (iface) =>
                      !selectedRole?.interfaces?.find((si) => si.id === iface.id),
                  )
                  .map((iface) => (
                    <div
                      key={iface.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border">
                      <div>
                        <span className="text-sm font-medium text-text">
                          {iface.libelle}
                        </span>
                        <span className="text-xs text-text-muted ml-2">
                          {iface.route}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleAssignInterface(iface.id)}
                        variant="custom">
                        Ajouter
                      </Button>
                    </div>
                  ))}
                {allInterfaces.filter(
                  (iface) =>
                    !selectedRole?.interfaces?.find((si) => si.id === iface.id),
                ).length === 0 && (
                  <p className="text-sm text-text-muted p-2">
                    Toutes les interfaces sont assignées
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
