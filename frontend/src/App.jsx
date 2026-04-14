import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Login from "@/pages/auth/Login";
import Dashboard from "@/pages/dashboard/Dashboard";
import Utilisateurs from "@/pages/securite/Utilisateurs";
import UserDetail from "@/pages/securite/UserDetail";
import Roles from "@/pages/securite/Roles";
import Permissions from "@/pages/securite/Permissions";
import Sessions from "@/pages/securite/Sessions";
import JournalAudit from "@/pages/securite/JournalAudit";
import Organisation from "@/pages/organisation/Organisation";
import Societes from "@/pages/organisation/Societes";
import Sites from "@/pages/organisation/Sites";
import Secteurs from "@/pages/organisation/Secteurs";
import Unites from "@/pages/organisation/Unites";
import Specialites from "@/pages/organisation/Specialites";
import Equipes from "@/pages/organisation/Equipes";
import Appartenances from "@/pages/organisation/Appartenances";
import ListeActifs from "@/pages/actifs/ListeActifs";
import DetailActif from "@/pages/actifs/DetailActif";
import FormulaireActif from "@/pages/actifs/FormulaireActif";
import DashboardActifs from "@/pages/actifs/DashboardActifs";
import ArborescenceActifs from "@/pages/actifs/ArborescenceActifs";
import ActifsRacines from "@/pages/actifs/ActifsRacines";
import ActifArborescencePage from "@/pages/actifs/ActifArborescencePage";
import ThemeProvider from "./providers/ThemProvider";
import CataloguePieces from "@/pages/magasin/CataloguePieces";
import DetailPiece from "@/pages/magasin/DetailPiece";
import FormulairePiece from "@/pages/magasin/FormulairePiece";
import DashboardMagasin from "@/pages/magasin/DashboardMagasin";
import ListeSousTraitants from "@/pages/soustraitants/ListeSousTraitants";
import DetailSousTraitant from "@/pages/soustraitants/DetailSousTraitant";
import FormulaireSousTraitant from "@/pages/soustraitants/FormulaireSousTraitant";
import DashboardSousTraitants from "@/pages/soustraitants/DashboardSousTraitants";
import { TooltipProvider } from "./components/ui/tooltip";

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="utilisateurs" element={<Utilisateurs />} />
              <Route path="utilisateurs/:id" element={<UserDetail />} />
              <Route path="roles" element={<Roles />} />
              <Route path="permissions" element={<Permissions />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="journal-audit" element={<JournalAudit />} />
              <Route path="organisation" element={<Organisation />} />
              <Route path="societes" element={<Societes />} />
              <Route path="sites" element={<Sites />} />
              <Route path="secteurs" element={<Secteurs />} />
              <Route path="unites" element={<Unites />} />
              <Route path="specialites" element={<Specialites />} />
              <Route path="equipes" element={<Equipes />} />
              <Route path="appartenances" element={<Appartenances />} />

              {/* ── Routes statiques AVANT :id ── */}
              <Route path="actifs" element={<ListeActifs />} />
              <Route path="actifs/dashboard" element={<DashboardActifs />} />
              <Route path="actifs/nouveau" element={<FormulaireActif />} />
              <Route
                path="actifs/arborescence"
                element={<ArborescenceActifs />}
              />
              <Route path="actifs-racines" element={<ActifsRacines />} />

              {/* ── Routes dynamiques APRÈS ── */}
              <Route path="actifs/:id" element={<DetailActif />} />
              <Route path="actifs/:id/modifier" element={<FormulaireActif />} />
              <Route
                path="actifs/:id/arborescence"
                element={<ActifArborescencePage />}
              />
              <Route path="magasin" element={<CataloguePieces />} />
              <Route path="magasin/dashboard" element={<DashboardMagasin />} />
              <Route path="magasin/nouveau" element={<FormulairePiece />} />
              <Route path="magasin/:id" element={<DetailPiece />} />
              <Route
                path="magasin/:id/modifier"
                element={<FormulairePiece />}
              />

              {/* ── Sous-Traitants — statiques AVANT :id ── */}
              <Route path="soustraitants" element={<ListeSousTraitants />} />
              <Route
                path="soustraitants/dashboard"
                element={<DashboardSousTraitants />}
              />
              <Route
                path="soustraitants/nouveau"
                element={<FormulaireSousTraitant />}
              />
              {/* ── Sous-Traitants — dynamiques APRÈS ── */}
              <Route
                path="soustraitants/:id"
                element={<DetailSousTraitant />}
              />
              <Route
                path="soustraitants/:id/modifier"
                element={<FormulaireSousTraitant />}
              />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  );
}
