import { useState } from "react";
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  type Role,
} from "../../data/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const RolesManager = () => {
  const [roles, setRoles] = useState<Role[]>(getRoles);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState("");

  const refresh = () => setRoles(getRoles());

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  };
  const openEdit = (role: Role) => {
    setEditing(role);
    setName(role.name);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    try {
      if (editing) {
        updateRole(editing.id, name);
        toast.success("Rôle modifié");
      } else {
        createRole(name);
        toast.success("Rôle créé");
      }
      refresh();
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = (id: string) => {
    try {
      if (!confirm("Supprimer ce rôle ?")) return;
      deleteRole(id);
      toast.success("Rôle supprimé");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Roles</h1>
          <p className="text-muted-foreground">Gérez les rôles du système</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Créer
        </Button>
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
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="font-medium">{role.name}</td>
                <td className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(role)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(role.id)}
                    className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="text-center text-muted-foreground py-8">
                  Aucun rôle
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier le rôle" : "Créer un rôle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nom du rôle</Label>
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
    </div>
  );
};

export default RolesManager;
