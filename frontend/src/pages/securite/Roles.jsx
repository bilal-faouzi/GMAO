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
  Check,
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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FieldError, GlobalError } from "@/components/FieldError";
import { useFormErrors } from "@/hooks/useFormErrors";

//  Helpers

const niveauStyles = {
  1: {
    bg: "bg-status-red-bg",
    text: "text-status-red",
    border: "border-red-500/30",
    icon: "bg-status-red/10",
    label: "Admin — Accès complet",
  },
  2: {
    bg: "bg-status-orange-bg",
    text: "text-status-orange",
    border: "border-orange-500/30",
    icon: "bg-status-orange/10",
    label: "Manager — Supervision",
  },
  3: {
    bg: "bg-status-blue-bg",
    text: "text-status-blue",
    border: "border-blue-500/30",
    icon: "bg-status-blue/10",
    label: "Superviseur — Modération",
  },
  4: {
    bg: "bg-status-green-bg",
    text: "text-status-green",
    border: "border-green-500/30",
    icon: "bg-status-green/10",
    label: "Opérateur — Opérations",
  },
  5: {
    bg: "bg-status-gray-bg",
    text: "text-status-gray",
    border: "border-gray-500/30",
    icon: "bg-status-gray/10",
    label: "Utilisateur — Lecture",
  },
};

const actionColor = (action) => {
  if (action === "READ")
    return "bg-blue-100 dark:bg-primary-soft text-blue-700 dark:text-primary";
  if (action === "CREATE")
    return "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (action === "UPDATE")
    return "bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400";
  if (action === "DELETE")
    return "bg-red-100 dark:bg-danger-soft text-red-700 dark:text-danger";
  return "bg-surface text-text-secondary";
};

const niveaux = [1, 2, 3, 4, 5];

// Helper pour grouper les permissions par module
const groupPermissionsByModule = (permissions) => {
  const grouped = {};
  permissions.forEach((p) => {
    const module = p.module || "AUTRE";
    if (!grouped[module]) {
      grouped[module] = [];
    }
    grouped[module].push(p);
  });
  return grouped;
};

//  Component

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

  //  Fetch

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

  //  Handlers

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
      await assignInterfaceToRole(selectedRole.id, {
        id_interface: interfaceId,
      });
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

  //  Render

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
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${role.est_actif !== false ? "bg-blue-100 dark:bg-primary-soft" : "bg-gray-100 dark:bg-gray-500/10"}`}>
                    <Key
                      size={18}
                      className={
                        role.est_actif !== false
                          ? "text-blue-700 dark:text-primary"
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
                    className="p-2 rounded hover:bg-status-blue-bg/30 text-status-blue/60 hover:text-status-blue transition-colors">
                    <LayoutDashboard size={13} />
                  </Button>
                  <Button
                    onClick={() => openPermsModal(role)}
                    title="Permissions"
                    variant="ghost"
                    className="p-2 rounded hover:bg-status-green-bg/30 text-status-green/60 hover:text-status-green transition-colors">
                    <Shield size={13} />
                  </Button>
                  <Button
                    onClick={() => handleDesactive(role.id)}
                    title={
                      role.est_actif !== false ? "Désactiver" : "Réactiver"
                    }
                    variant="ghost"
                    className="p-2 rounded hover:bg-status-orange-bg/30 text-status-orange/60 hover:text-status-orange transition-colors">
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
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${niveauStyles[role.niveau].bg} ${niveauStyles[role.niveau].text}  shadow ${niveauStyles[role.niveau].shadow}`}>
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

      {/*  Dialog Création  */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus size={20} className="text-blue-500" />
              Nouveau rôle
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 mt-4">
            <GlobalError errors={errors} />

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Code</Label>
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

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Libellé</Label>
              <Input
                placeholder="ex: Technicien de maintenance"
                className={inputCls("libelle")}
                value={form.libelle}
                onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                required
              />
              <FieldError errors={errors} field="libelle" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Niveau hiérarchique
              </Label>
              <div className="flex items-center gap-2">
                {niveaux.map((n) => (
                  <Button
                    key={n}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, niveau: n });
                      setSelectedNiveau(n);
                    }}
                    className={`transition-all duration-200 h-10 w-10 p-0 rounded-lg ${niveauStyles[n].bg} ${
                      selectedNiveau === n
                        ? ` ${niveauStyles[n].text} ring-offset-2 ${niveauStyles[n].border} border ${niveauStyles[n].border} scale-110 opacity-100 shadow-lg`
                        : "opacity-50 hover:opacity-80 scale-100"
                    }`}>
                    {n}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-text-muted">
                1 = plus haut niveau (Admin)
              </p>
              <FieldError errors={errors} field="niveau" />
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                onClick={() => setOpenCreate(false)}
                variant="outline">
                Annuler
              </Button>
              <Button type="submit" variant="custom">
                <Plus size={15} /> Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/*  Dialog Permissions  */}
      <Dialog open={openPerms} onOpenChange={setOpenPerms}>
        <DialogContent className="sm:max-w-[700px] ">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Shield size={20} className="text-green-500" />
              Permissions — {selectedRole?.code}
            </DialogTitle>
          </DialogHeader>

          <div className=" mt-4 ">
            <div className="max-h-[60vh] overflow-y-auto  space-y-4 rounded-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {allPermissions && allPermissions.length > 0 ? (
                Object.entries(groupPermissionsByModule(allPermissions)).map(
                  ([module, permissions]) => (
                    <div key={module} className="space-y-2  ">
                      {/* Module Header */}
                      <div className="flex items-center px-5  py-3 sticky top-[-3px] bg-surface/95 backdrop-blur-lg rounded-bl-lg rounded-br-lg border-b border-border">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <h3 className="text-sm font-bold text-text uppercase tracking-wide">
                          {module}s
                        </h3>
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-text-muted">
                          {
                            permissions.filter((p) =>
                              selectedRole?.permissions?.find(
                                (sp) => sp.id === p.id,
                              ),
                            ).length
                          }
                          /{permissions.length}
                        </span>
                      </div>

                      {/* Permissions Grid */}
                      <div className="grid grid-cols-2 gap-2 px-2">
                        {permissions.map((p) => {
                          const isAssigned = selectedRole?.permissions?.find(
                            (sp) => sp.id === p.id,
                          );
                          return (
                            <div
                              key={p.id}
                              onClick={() =>
                                isAssigned
                                  ? handleRemovePermission(p.id)
                                  : handleAssignPermission(p.id)
                              }
                              className={`cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 hover:scale-[1.02] ${
                                isAssigned
                                  ? "bg-green-500/10 border-green-500 ring-1 ring-green-500/30"
                                  : "bg-surface border-border hover:border-text-muted"
                              }`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-semibold inline-block ${actionColor(p.action)}`}>
                                    {p.action}
                                  </span>
                                  <p className="text-xs font-mono text-text-secondary mt-2 truncate">
                                    {p.code}
                                  </p>
                                  {p.ressource && (
                                    <p className="text-[10px] text-text-muted mt-1 truncate">
                                      {p.ressource}
                                    </p>
                                  )}
                                </div>
                                {isAssigned && (
                                  <Check
                                    size={16}
                                    className="text-green-500 flex-shrink-0 mt-0.5"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ),
                )
              ) : (
                <p className="text-sm text-text-muted text-center py-8">
                  Aucune permission disponible
                </p>
              )}
            </div>
            <p className="text-xs text-text-muted mt-3">
              Cliquez sur une permission pour l'ajouter ou la retirer
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/*  Dialog Interfaces  */}
      <Dialog open={openInterfaces} onOpenChange={setOpenInterfaces}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <LayoutDashboard size={20} className="text-blue-500" />
              Interfaces — {selectedRole?.code}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {allInterfaces && allInterfaces.length > 0 ? (
                allInterfaces.map((iface) => {
                  const isAssigned = selectedRole?.interfaces?.find(
                    (si) => si.id === iface.id,
                  );
                  return (
                    <div
                      key={iface.id}
                      onClick={() =>
                        isAssigned
                          ? handleRemoveInterface(iface.id)
                          : handleAssignInterface(iface.id)
                      }
                      className={`cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 hover:scale-[1.02] ${
                        isAssigned
                          ? "bg-blue-500/10 border-blue-500 ring-1 ring-blue-500/30"
                          : "bg-surface border-border hover:border-text-muted"
                      }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text truncate">
                            {iface.libelle}
                          </p>
                          <p className="text-xs font-mono text-text-muted mt-1 truncate">
                            {iface.route}
                          </p>
                        </div>
                        {isAssigned && (
                          <Check
                            size={18}
                            className="text-blue-500 flex-shrink-0 mt-0.5"
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-text-muted text-center py-8">
                  Aucune interface disponible
                </p>
              )}
            </div>
            <p className="text-xs text-text-muted mt-3">
              Cliquez sur une interface pour l'ajouter ou la retirer
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
