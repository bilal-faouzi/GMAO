import { Users, ShieldCheck, Key, Link } from "lucide-react";
import {
  getUsers,
  getRoles,
  getPermissions,
  getRolePermissions,
} from "../../data/store";

const DashboardOverview = () => {
  const users = getUsers();
  const roles = getRoles();
  const permissions = getPermissions();
  const rolePerms = getRolePermissions();

  const stats = [
    {
      label: "Utilisateurs",
      count: users.length,
      icon: Users,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Rôles",
      count: roles.length,
      icon: ShieldCheck,
      color: "bg-success/10 text-success",
    },
    {
      label: "Permissions",
      count: permissions.length,
      icon: Key,
      color: "bg-warning/10 text-warning",
    },
    {
      label: "Attributions",
      count: rolePerms.length,
      icon: Link,
      color: "bg-destructive/10 text-destructive",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground mb-1">Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Vue d'ensemble de la gestion des accès
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className={`stat-icon ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {stat.count}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-card mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Utilisateurs récents
        </h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Rôle</th>
            </tr>
          </thead>
          <tbody>
            {users.slice(0, 5).map((user) => {
              const role = roles.find((r) => r.id === user.role_id);
              return (
                <tr key={user.id}>
                  <td className="font-medium">{user.username}</td>
                  <td>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {role?.name || "N/A"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardOverview;
