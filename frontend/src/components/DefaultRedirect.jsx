import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";

// Priority-ordered list of default routes for each interface code
const DEFAULT_ROUTES = [
  { code: "DASHBOARD", route: "/dashboard" },
  { code: "ORDRES_OTS", route: "/ordres/ots" },
  { code: "ORDRES_DEMANDES", route: "/ordres/demandes" },
  { code: "ORDRES_GESTION", route: "/ordres/gestion" },
  { code: "ORDRES_DASHBOARD_OT", route: "/ordres/ots/dashboard" },
  { code: "ORDRES_DECLARER", route: "/ordres/declarer" },
  { code: "ORDRES_VALIDATION", route: "/ordres/validation" },
  { code: "ACTIFS_LISTE", route: "/actifs" },
  { code: "ACTIFS_DASHBOARD", route: "/actifs/dashboard" },
  { code: "ACTIFS_ARBORESCENCE", route: "/actifs/arborescence" },
  { code: "ACTIFS_RACINES", route: "/actifs-racines" },
  { code: "ACTIFS_UNITE", route: "/actifs/unite" },
  { code: "MAGASIN_CATALOGUE", route: "/magasin" },
  { code: "MAGASIN_DASHBOARD", route: "/magasin/dashboard" },
  { code: "MAGASIN_SORTIE", route: "/magasin/sortie" },
  { code: "SOUS_TRAITANTS_LISTE", route: "/soustraitants" },
  { code: "SOUS_TRAITANTS_DASHBOARD", route: "/soustraitants/dashboard" },
  { code: "PARAMETRAGE", route: "/parametrage" },
  { code: "ORGANISATION", route: "/organisation" },
  { code: "SEC_UTILISATEURS", route: "/utilisateurs" },
  { code: "SEC_ROLES", route: "/roles" },
  { code: "SEC_PERMISSIONS", route: "/permissions" },
  { code: "SEC_SESSIONS", route: "/sessions" },
  { code: "SEC_JOURNAL_AUDIT", route: "/journal-audit" },
];

export default function DefaultRedirect() {
  const navigate = useNavigate();
  const { user, hasInterface } = useAuthStore();

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    const interfaces = user.interfaces || [];

    // Backward compatibility: no interfaces assigned → allow access to dashboard
    if (interfaces.length === 0) {
      navigate("/dashboard", { replace: true });
      return;
    }

    // Try to find the best default route based on priority list
    for (const def of DEFAULT_ROUTES) {
      if (hasInterface(def.code)) {
        navigate(def.route, { replace: true });
        return;
      }
    }

    // Fallback: use the first interface's route if it has one
    const firstWithRoute = interfaces.find((i) => i.route);
    if (firstWithRoute) {
      navigate(firstWithRoute.route, { replace: true });
      return;
    }

    // Ultimate fallback
    navigate("/login", { replace: true });
  }, [user, navigate, hasInterface]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
