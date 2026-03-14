import { useState } from "react";
import {
  getUsers,
  getRoles,
  createUser,
  updateUser,
  deleteUser,
  type User,
  type Role,
} from "../../data/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "../ui/switch";

const UsersManager = () => {
  const [users, setUsers] = useState<User[]>(getUsers);
  const [roles] = useState<Role[]>(getRoles);
  const [estActif, setEstActif] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    role_id: "",
    email: "",
    nom: "",
    prenom: "",
    estActif: true,
    dateCreation: new Date(),
    dateConnection: new Date(),
    DerniereConnectionIP: "",
  });

  const refresh = () => setUsers(getUsers());

  const openCreate = () => {
    setEditing(null);
    setForm({
      username: "",
      password: "",
      role_id: roles[0]?.id || "",
      email: "",
      nom: "",
      prenom: "",
      estActif: true,
      dateCreation: new Date(),
      dateConnection: new Date(),
      DerniereConnectionIP: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      username: user.username,
      password: "",
      role_id: user.role_id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      estActif: user.estActif,
      dateCreation: user.dateCreation,
      dateConnection: user.dateConnection,
      DerniereConnectionIP: user.DerniereConnectionIP,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateUser(editing.id, {
          username: form.username,
          password: form.password || undefined,
          role_id: form.role_id,
          estActif: form.estActif,
        });
        toast.success("Utilisateur modifié");
      } else {
        if (!form.password) {
          toast.error("Le mot de passe est requis");
          return;
        }
        await createUser(form.username, form.password, form.role_id);
        toast.success("Utilisateur créé");
      }
      refresh();
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    deleteUser(id);
    toast.success("Utilisateur supprimé");
    refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="text-muted-foreground">
            Gérez les utilisateurs du système
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Créer
        </Button>
      </div>

      <div className="admin-card p-0 overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Rôle</th>
              <th>Actif</th>
              <th>Email</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Date de création</th>
              <th>Date de dernière connexion</th>
              <th>Dernière IP</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const role = roles.find((r) => r.id === user.role_id);
              return (
                <tr key={user.id}>
                  <td className="font-medium">{user.username}</td>
                  <td>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {role?.name || "N/A"}
                    </span>
                  </td>
                  <td>
                    {user.estActif ? (
                      <CheckCheck className="bg-green-100 text-green-800" />
                    ) : (
                      <Check className="destructive" />
                    )}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.nom}</td>
                  <td>{user.prenom}</td>
                  <td>{new Date(user.dateCreation).toLocaleDateString()}</td>
                  <td>{new Date(user.dateConnection).toLocaleDateString()}</td>
                  <td>{user.DerniereConnectionIP}</td>
                  <td className="inline-flex text-center items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(user)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(user.id)}
                      className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="text-center text-muted-foreground py-8">
                  Aucun utilisateur
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
              {editing ? "Modifier l'utilisateur" : "Créer un utilisateur"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={form.nom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nom: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input
                value={form.prenom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, prenom: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 flex items-center space-x-4">
              <Label>Actif</Label>
              <Switch
                className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                size="sm"
                checked={form.estActif}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, estActif: checked }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>
                Password{" "}
                {editing && (
                  <span className="text-muted-foreground">
                    (laisser vide pour ne pas changer)
                  </span>
                )}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select
                value={form.role_id}
                onValueChange={(v) => setForm((f) => ({ ...f, role_id: v }))}>
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

export default UsersManager;
