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
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card } from "../ui/card";
import UsersManager from "./UserManager";
import PermissionsManager from "./PermissionsManager";
import RolesManager from "./RolesManager";

const ManagerUserGenerale = () => {
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
      </div>
      <div className="flex flex-col gap-4">
        <Tabs defaultValue="Users" className="flex flex-col ">
          <TabsList>
            <TabsTrigger value="Users">Users</TabsTrigger>
            <TabsTrigger value="Roles">Roles</TabsTrigger>
            <TabsTrigger value="Permissions">Permissions</TabsTrigger>
          </TabsList>
          <TabsContent value="Users">
            <Card className="px-6">
              <UsersManager />
            </Card>
          </TabsContent>
          <TabsContent value="Permissions">
            <Card className="px-6">
              <PermissionsManager />
            </Card>
          </TabsContent>
          <TabsContent value="Roles">
            <Card className="px-6">
              <RolesManager />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ManagerUserGenerale;
