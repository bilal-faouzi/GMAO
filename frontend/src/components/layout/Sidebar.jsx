import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Shield,
  Key,
  LogOut,
  MonitorSmartphone,
  ClipboardList,
  Building2,
  UsersRound,
  Link2,
  MapPin,
  Grid3x3,
  Factory,
  Wrench,
} from "lucide-react";
import useAuthStore from "@/store/authStore";
import api from "@/services/api";

const navSections = [
  {
    label: null,
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/utilisateurs", icon: Users, label: "Utilisateurs" },
      { to: "/roles", icon: Shield, label: "Rôles" },
      { to: "/permissions", icon: Key, label: "Permissions" },
      { to: "/sessions", icon: MonitorSmartphone, label: "Sessions" },
      { to: "/journal-audit", icon: ClipboardList, label: "Journal Audit" },
    ],
  },
  {
    label: "Organisation",
    items: [
      { to: "/organisation", icon: Building2, label: "Arborescence" },
      { to: "/societes", icon: Building2, label: "Sociétés" },
      { to: "/sites", icon: MapPin, label: "Sites" },
      { to: "/secteurs", icon: Grid3x3, label: "Secteurs" },
      { to: "/unites", icon: Factory, label: "Unités" },
      { to: "/specialites", icon: Wrench, label: "Spécialités" },
      { to: "/equipes", icon: UsersRound, label: "Équipes" },
      { to: "/appartenances", icon: Link2, label: "Appartenances" },
    ],
  },
  {
    label: "actif",
    items: [
      {
        to: "/Actif",
        icon: Building2,
        label: "Actif",
      },
      {
        to: "/Historiquestatuts",
        icon: Building2,
        label: "Historiquestatuts",
      },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem("refresh_token");
      await api.post("/auth/logout/", { refresh });
    } catch {}
    logout();
    navigate("/login");
  };

  return (
    <div className="w-64 min-h-screen bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">GMAO</h1>
            <p className="text-slate-400 text-xs">Maintenance</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {navSections.map((section, i) => (
          <div key={i}>
            {section.label && (
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest px-3 mb-2">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`
                  }>
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {user?.prenom?.[0]}
              {user?.nom?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.prenom} {user?.nom}
            </p>
            <p className="text-slate-400 text-xs truncate">
              {user?.roles?.[0]?.code || "Utilisateur"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors">
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </div>
  );
}
