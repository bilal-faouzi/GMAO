import { useState } from "react";
import {
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  getRoles,
  getRolePermissions,
  setRolePermissions,
  type Permission,
  type Role,
} from "../../data/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const PermissionsManager = () => {
  const [permissions, setPermissions] = useState<Permission[]>(getPermissions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editing, setEditing] = useState<Permission | null>(null);
  const [name, setName] = useState("");

  // Assignment state
  const [roles] = useState<Role[]>(getRoles);
  const [selectedRole, setSelectedRole] = useState(roles[0]?.id || "");
  const [assignedPerms, setAssignedPerms] = useState<string[]>([]);

  const refresh = () => setPermissions(getPermissions());

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  };
  const openEdit = (perm: Permission) => {
    setEditing(perm);
    setName(perm.name);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    try {
      if (editing) {
        updatePermission(editing.id, name);
        toast.success("Permission modifiée");
      } else {
        createPermission(name);
        toast.success("Permission créée");
      }
      refresh();
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer cette permission ?")) return;
    deletePermission(id);
    toast.success("Permission supprimée");
    refresh();
  };

  const openAssign = () => {
    const rp = getRolePermissions()
      .filter((rp) => rp.role_id === selectedRole)
      .map((rp) => rp.permission_id);
    setAssignedPerms(rp);
    setAssignOpen(true);
  };

  const handleRoleChange = (roleId: string) => {
    setSelectedRole(roleId);
    const rp = getRolePermissions()
      .filter((rp) => rp.role_id === roleId)
      .map((rp) => rp.permission_id);
    setAssignedPerms(rp);
  };

  const togglePerm = (permId: string) => {
    setAssignedPerms((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId],
    );
  };

  const saveAssignment = () => {
    setRolePermissions(selectedRole, assignedPerms);
    toast.success("Permissions attribuées");
    setAssignOpen(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Permissions
          </h1>
          <p className="text-muted-foreground">
            Gérez les permissions et leur attribution aux rôles
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openAssign} className="gap-2">
            <ShieldCheck className="w-4 h-4" /> Attribuer
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Créer
          </Button>
        </div>
      </div>

      <div className="admin-card p-0 overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm) => (
              <tr key={perm.id}>
                <td className="font-medium">{perm.name}</td>
                <td className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(perm)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(perm.id)}
                    className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {permissions.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="text-center text-muted-foreground py-8">
                  Aucune permission
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier la permission" : "Créer une permission"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nom de la permission</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit}>
              {editing ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attribuer des permissions à un rôle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={selectedRole} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-3 max-h-60 overflow-auto">
                {getPermissions().map((perm) => (
                  <div key={perm.id} className="flex items-center gap-3">
                    <Checkbox
                      id={perm.id}
                      checked={assignedPerms.includes(perm.id)}
                      onCheckedChange={() => togglePerm(perm.id)}
                    />
                    <label htmlFor={perm.id} className="text-sm cursor-pointer">
                      {perm.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveAssignment}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PermissionsManager;
