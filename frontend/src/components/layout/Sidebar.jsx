import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
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
  Package,
  BarChart2,
  GitBranch,
  FolderTree,
  ChevronDown,
  Drama,
  Pyramid,
  Package2,
  Store,
  Hammer,
  ClipboardCheck,
  FileText,
  ArrowDownToLine,
  AlertTriangle,
  Settings2,
  CheckCircle2,
  FactoryIcon,
  Settings,
} from "lucide-react";
import useAuthStore from "@/store/authStore";
import api from "@/services/api";
import ThemeToggle from "@/components/ui/ThemeToggle";

const navSections = [
  {
    label: null,
    icon: null,
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", code: "DASHBOARD" },
      { to: "/journal-audit", icon: ClipboardList, label: "Journal Audit", code: "SEC_JOURNAL_AUDIT" },
    ],
  },

  {
    label: "Accès & Sécurité",
    icon: Shield,
    items: [
      { to: "/roles", icon: Drama, label: "Rôles", code: "SEC_ROLES" },
      { to: "/permissions", icon: Key, label: "Permissions", code: "SEC_PERMISSIONS" },
      { to: "/utilisateurs", icon: Users, label: "Utilisateurs", code: "SEC_UTILISATEURS" },
      { to: "/sessions", icon: MonitorSmartphone, label: "Sessions", code: "SEC_SESSIONS" },
    ],
  },
  {
    label: null,
    icon: null,
    items: [{ to: "/organisation", icon: Building2, label: "Arborescence", code: "ORGANISATION" }],
  },
  {
    label: "Organisation",
    icon: Pyramid,
    items: [
      { to: "/societes", icon: Building2, label: "Sociétés", code: "ORG_SOCIETES" },
      { to: "/sites", icon: MapPin, label: "Sites", code: "ORG_SITES" },
      { to: "/secteurs", icon: Grid3x3, label: "Secteurs", code: "ORG_SECTEURS" },
      { to: "/unites", icon: Factory, label: "Unités", code: "ORG_UNITES" },
    ],
  },
  {
    label: "Ressources",
    icon: UsersRound,
    items: [
      { to: "/specialites", icon: Wrench, label: "Spécialités", code: "ORG_SPECIALITES" },
      { to: "/equipes", icon: UsersRound, label: "Équipes", code: "ORG_EQUIPES" },
      { to: "/appartenances", icon: Link2, label: "Appartenances", code: "ORG_APPARTENANCES" },
    ],
  },
  {
    label: "Actifs",
    icon: Package,
    items: [
      { to: "/actifs/dashboard", icon: BarChart2, label: "Dashboard", code: "ACTIFS_DASHBOARD" },
      { to: "/actifs", icon: Package, label: "Liste des actifs", end: true, code: "ACTIFS_LISTE" },
      {
        to: "/actifs-racines",
        icon: FolderTree,
        label: "Actifs racines",
        end: true,
        code: "ACTIFS_RACINES",
      },
      { to: "/actifs/arborescence", icon: GitBranch, label: "Arborescence", code: "ACTIFS_ARBORESCENCE" },
      { to: "/actifs/unite", icon: FactoryIcon, label: "Unités", code: "ACTIFS_UNITE" },
    ],
  },
  {
    label: "Magasin",
    icon: Store,
    items: [
      { to: "/magasin/dashboard", icon: BarChart2, label: "Dashboard Magasin", code: "MAGASIN_DASHBOARD" },
      { to: "/magasin", icon: Package2, label: "Catalogue pièces", end: true, code: "MAGASIN_CATALOGUE" },
      {
        to: "/magasin/sortie",
        icon: ArrowDownToLine,
        label: "Sortie pièces",
        end: true,
        code: "MAGASIN_SORTIE",
      },
    ],
  },
  {
    label: "Sous-Traitants",
    icon: Hammer,
    items: [
      {
        to: "/soustraitants/dashboard",
        icon: ClipboardCheck,
        label: "Dashboard Sous-Traitants",
        code: "SOUS_TRAITANTS_DASHBOARD",
      },
      {
        to: "/soustraitants",
        icon: Hammer,
        label: "Liste Sous-Traitants",
        end: true,
        code: "SOUS_TRAITANTS_LISTE",
      },
    ],
  },
  {
    label: "Interventions",
    icon: ClipboardCheck,
    items: [
      { to: "/ordres/demandes", icon: FileText, label: "Demandes (DI)", code: "ORDRES_DEMANDES" },
      {
        to: "/ordres/ots",
        icon: ClipboardCheck,
        label: "Ordres (OT)",
        end: true,
        code: "ORDRES_OTS",
      },
      { to: "/ordres/ots/dashboard", icon: BarChart2, label: "Dashboard OT", code: "ORDRES_DASHBOARD_OT" },
      {
        to: "/ordres/declarer",
        icon: AlertTriangle,
        label: "Déclarer une panne",
        end: true,
        code: "ORDRES_DECLARER",
      },
      {
        to: "/ordres/gestion",
        icon: Settings2,
        label: "Gestion OT (Resp.)",
        end: true,
        code: "ORDRES_GESTION",
      },
      {
        to: "/ordres/validation",
        icon: CheckCircle2,
        label: "Valider interventions",
        end: true,
        code: "ORDRES_VALIDATION",
      },
    ],
  },
  {
    label: "Administration",
    icon: Settings,
    items: [
      {
        to: "/parametrage",
        icon: Settings2,
        label: "Paramétrage",
        end: true,
        code: "PARAMETRAGE",
      },
    ],
  },
];

function filterNavSections(sections, interfaces) {
  if (!interfaces || interfaces.length === 0) return sections;
  const allowedCodes = new Set(interfaces.map((i) => i.code));
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => allowedCodes.has(item.code)),
    }))
    .filter((section) => section.items.length > 0);
}

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const interfaces = user?.interfaces || [];
  const visibleSections = filterNavSections(navSections, interfaces);

  // Calcule les groupes ouverts basé sur la location actuelle
  const getOpenGroups = (pathname) => {
    return navSections.reduce((acc, s, i) => {
      if (
        s.label &&
        s.items.some((item) =>
          item.end ? pathname === item.to : pathname.startsWith(item.to),
        )
      )
        acc.add(i);
      return acc;
    }, new Set());
  };

  const [openGroups, setOpenGroups] = useState(() =>
    getOpenGroups(location.pathname),
  );

  // Mets à jour les groupes ouverts quand la location change
  useEffect(() => {
    setOpenGroups(getOpenGroups(location.pathname));
  }, [location.pathname]);

  const toggleGroup = (i) => {
    setOpenGroups((prev) => {
      if (prev.has(i)) return new Set();
      return new Set([i]);
    });
  };

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem("refresh_token");
      await api.post("/auth/logout/", { refresh });
    } catch {}
    logout();
    navigate("/login");
  };

  return (
    <div
      className="
        group/sidebar
        w-16 hover:w-60
        min-h-screen max-h-screen sticky top-0
        bg-[var(--color-sidebar-bg)]
        border-r border-[var(--color-sidebar-border)]
        flex flex-col
        overflow-hidden
        transition-[width] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]
        z-30
      ">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-[18px] border-b border-[var(--color-sidebar-border)] min-h-[64px] overflow-hidden">
        <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">G</span>
        </div>
        <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[280ms] whitespace-nowrap">
          <h1 className="text-text font-medium text-sm">GMAO</h1>
          <p className="text-[var(--color-sidebar-text)] text-xs">
            Maintenance
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto overflow-x-hidden">
        {visibleSections.map((section, i) => {
          const isOpen = openGroups.has(i);
          const isGroupActive = section.items.some((item) =>
            item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to),
          );
          const GroupIcon = section.icon;

          return (
            <div key={i} className="mb-1.5">
              {/* Header du groupe (seulement pour les sections labelisées) */}
              {section.label && (
                <button
                  onClick={() => toggleGroup(i)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
                    transition-colors duration-200 overflow-hidden whitespace-nowrap
                    ${
                      isGroupActive && !isOpen
                        ? "bg-[var(--color-primary-soft)] text-[var(--color-sidebar-active)]"
                        : "text-text-muted hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-text)]"
                    }
                  `}>
                  <GroupIcon size={18} className="flex-shrink-0 opacity-70" />

                  <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[280ms] flex-1 text-left text-[10px] font-semibold uppercase tracking-widest">
                    {section.label}
                  </span>
                  <ChevronDown
                    size={13}
                    className={`
                      flex-shrink-0
                      opacity-0 group-hover/sidebar:opacity-100
                      transition-[opacity,transform] duration-[280ms]
                      ${isOpen ? "rotate-180" : "rotate-0"}
                    `}
                  />
                </button>
              )}

              {/* Items du groupe */}
              {/* Sans label : toujours visible */}
              {/* Avec label : visible si ouvert OU si sidebar collapsed (icônes seules) */}
              <div
                className={`
                  space-y-0.5 overflow-hidden
                  transition-[max-height,opacity] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]
                  ${
                    section.label
                      ? isOpen
                        ? "max-h-96 opacity-100" // expanded + open
                        : "max-h-0 opacity-0 group-hover/sidebar:max-h-0" // expanded + closed = caché
                      : "max-h-96 opacity-100" // sans label = toujours visible
                  }
                `}>
                {section.items.map(({ to, icon: Icon, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                       transition-colors duration-200 overflow-hidden whitespace-nowrap
                       ${
                         isActive
                           ? "bg-[var(--color-primary-soft)] text-[var(--color-sidebar-active)]"
                           : "text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-text)]"
                       }`
                    }>
                    <Icon size={18} className="flex-shrink-0 opacity-70" />
                    <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[280ms]">
                      {label}
                    </span>
                  </NavLink>
                ))}
              </div>

              {/* Collapsed : petit dot sous le groupe actif fermé */}
              {section.label && isGroupActive && !isOpen && (
                <span
                  className="
                  block w-1.5 h-1.5 rounded-full bg-[var(--color-sidebar-active)]
                  mx-auto mt-1
                  group-hover/sidebar:hidden
                "
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-[var(--color-sidebar-border)]">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1 overflow-hidden whitespace-nowrap">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.prenom?.[0]}
              {user?.nom?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[280ms]">
            <p className="text-text text-sm font-medium truncate">
              {user?.prenom} {user?.nom}
            </p>
            <p className="text-slate-400 text-xs truncate">
              {user?.roles?.[0]?.code || "Utilisateur"}
            </p>
          </div>
          <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[280ms] flex-shrink-0">
            <ThemeToggle />
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="
            w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
            text-sm font-medium whitespace-nowrap overflow-hidden
            text-[var(--color-sidebar-text)]
            hover:bg-[var(--color-sidebar-hover)] hover:text-danger
            transition-colors duration-200
          ">
          <LogOut size={18} className="flex-shrink-0" />
          <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-[280ms]">
            Déconnexion
          </span>
        </button>
      </div>
    </div>
  );
}
