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
import ListeDemandes from "@/pages/ordres/ListeDemandes";
import FormulaireDemande from "@/pages/ordres/FormulaireDemande";
import DashboardOTs from "@/pages/ordres/DashboardOTs";
import ListeOTs from "@/pages/ordres/ListeOTs";
import DetailOT from "@/pages/ordres/DetailOT";
import FormulaireOT from "@/pages/ordres/FormulaireOT";
import CompteRenduOT from "@/pages/ordres/CompteRenduOT";
import InterfaceMagasinier from "@/pages/magasin/InterfaceMagasinier";
import DeclarerPanne from "@/pages/ordres/DeclarerPanne";
import GestionOTs from "@/pages/ordres/GestionOTs";
import { TooltipProvider } from "./components/ui/tooltip";
import ValidationOperateur from "@/pages/ordres/ValidationOperateur";
import ActifUnite from "./pages/actifs/actifunite";
import ParametrageHome from "@/pages/parametrage/ParametrageHome";
import ParametrageActifs from "@/pages/parametrage/ParametrageActifs";
import TypeActifsPage from "@/pages/parametrage/TypeActifsPage";
import BackupPage from "@/pages/parametrage/BackupPage";
import useAuthStore from "@/store/authStore";
import AccessDenied from "@/components/AccessDenied";
import DefaultRedirect from "@/components/DefaultRedirect";

function ProtectedRoute({ children, requiredInterface }) {
  const { hasInterface, user } = useAuthStore();
  // If user has no interfaces yet (backward compat), allow access
  const interfaces = user?.interfaces;
  if (!interfaces || interfaces.length === 0) return children;
  if (!requiredInterface) return children;
  if (!hasInterface(requiredInterface)) {
    return <AccessDenied />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<DefaultRedirect />} />
              <Route path="dashboard" element={<ProtectedRoute requiredInterface="DASHBOARD"><Dashboard /></ProtectedRoute>} />
              <Route path="utilisateurs" element={<ProtectedRoute requiredInterface="SEC_UTILISATEURS"><Utilisateurs /></ProtectedRoute>} />
              <Route path="utilisateurs/:id" element={<ProtectedRoute requiredInterface="SEC_UTILISATEURS"><UserDetail /></ProtectedRoute>} />
              <Route path="roles" element={<ProtectedRoute requiredInterface="SEC_ROLES"><Roles /></ProtectedRoute>} />
              <Route path="permissions" element={<ProtectedRoute requiredInterface="SEC_PERMISSIONS"><Permissions /></ProtectedRoute>} />
              <Route path="sessions" element={<ProtectedRoute requiredInterface="SEC_SESSIONS"><Sessions /></ProtectedRoute>} />
              <Route path="journal-audit" element={<ProtectedRoute requiredInterface="SEC_JOURNAL_AUDIT"><JournalAudit /></ProtectedRoute>} />
              <Route path="organisation" element={<ProtectedRoute requiredInterface="ORGANISATION"><Organisation /></ProtectedRoute>} />
              <Route path="societes" element={<ProtectedRoute requiredInterface="ORG_SOCIETES"><Societes /></ProtectedRoute>} />
              <Route path="sites" element={<ProtectedRoute requiredInterface="ORG_SITES"><Sites /></ProtectedRoute>} />
              <Route path="secteurs" element={<ProtectedRoute requiredInterface="ORG_SECTEURS"><Secteurs /></ProtectedRoute>} />
              <Route path="unites" element={<ProtectedRoute requiredInterface="ORG_UNITES"><Unites /></ProtectedRoute>} />
              <Route path="specialites" element={<ProtectedRoute requiredInterface="ORG_SPECIALITES"><Specialites /></ProtectedRoute>} />
              <Route path="equipes" element={<ProtectedRoute requiredInterface="ORG_EQUIPES"><Equipes /></ProtectedRoute>} />
              <Route path="appartenances" element={<ProtectedRoute requiredInterface="ORG_APPARTENANCES"><Appartenances /></ProtectedRoute>} />

              {/*  Routes statiques AVANT :id  */}
              <Route path="actifs" element={<ProtectedRoute requiredInterface="ACTIFS_LISTE"><ListeActifs /></ProtectedRoute>} />
              <Route path="actifs/dashboard" element={<ProtectedRoute requiredInterface="ACTIFS_DASHBOARD"><DashboardActifs /></ProtectedRoute>} />
              <Route path="actifs/nouveau" element={<ProtectedRoute requiredInterface="ACTIFS_LISTE"><FormulaireActif /></ProtectedRoute>} />
              <Route path="actifs/arborescence" element={<ProtectedRoute requiredInterface="ACTIFS_ARBORESCENCE"><ArborescenceActifs /></ProtectedRoute>} />
              <Route path="actifs-racines" element={<ProtectedRoute requiredInterface="ACTIFS_RACINES"><ActifsRacines /></ProtectedRoute>} />
              <Route path="actifs/unite" element={<ProtectedRoute requiredInterface="ACTIFS_UNITE"><ActifUnite /></ProtectedRoute>} />

              {/*  Routes dynamiques APRÈS  */}
              <Route path="actifs/:id" element={<ProtectedRoute requiredInterface="ACTIFS_LISTE"><DetailActif /></ProtectedRoute>} />
              <Route path="actifs/:id/modifier" element={<ProtectedRoute requiredInterface="ACTIFS_LISTE"><FormulaireActif /></ProtectedRoute>} />
              <Route path="actifs/:id/arborescence" element={<ProtectedRoute requiredInterface="ACTIFS_ARBORESCENCE"><ActifArborescencePage /></ProtectedRoute>} />
              <Route path="magasin" element={<ProtectedRoute requiredInterface="MAGASIN_CATALOGUE"><CataloguePieces /></ProtectedRoute>} />
              <Route path="magasin/dashboard" element={<ProtectedRoute requiredInterface="MAGASIN_DASHBOARD"><DashboardMagasin /></ProtectedRoute>} />
              <Route path="magasin/nouveau" element={<ProtectedRoute requiredInterface="MAGASIN_CATALOGUE"><FormulairePiece /></ProtectedRoute>} />
              <Route path="magasin/:id" element={<ProtectedRoute requiredInterface="MAGASIN_CATALOGUE"><DetailPiece /></ProtectedRoute>} />
              <Route path="magasin/:id/modifier" element={<ProtectedRoute requiredInterface="MAGASIN_CATALOGUE"><FormulairePiece /></ProtectedRoute>} />

              {/*  Sous-Traitants — statiques AVANT :id  */}
              <Route path="soustraitants" element={<ProtectedRoute requiredInterface="SOUS_TRAITANTS_LISTE"><ListeSousTraitants /></ProtectedRoute>} />
              <Route path="soustraitants/dashboard" element={<ProtectedRoute requiredInterface="SOUS_TRAITANTS_DASHBOARD"><DashboardSousTraitants /></ProtectedRoute>} />
              <Route path="soustraitants/nouveau" element={<ProtectedRoute requiredInterface="SOUS_TRAITANTS_LISTE"><FormulaireSousTraitant /></ProtectedRoute>} />
              {/*  Sous-Traitants — dynamiques APRÈS  */}
              <Route path="soustraitants/:id" element={<ProtectedRoute requiredInterface="SOUS_TRAITANTS_LISTE"><DetailSousTraitant /></ProtectedRoute>} />
              <Route path="soustraitants/:id/modifier" element={<ProtectedRoute requiredInterface="SOUS_TRAITANTS_LISTE"><FormulaireSousTraitant /></ProtectedRoute>} />

              {/*  Interventions (Ordres) — statiques AVANT :id  */}
              <Route path="ordres/demandes" element={<ProtectedRoute requiredInterface="ORDRES_DEMANDES"><ListeDemandes /></ProtectedRoute>} />
              <Route path="ordres/demandes/nouveau" element={<ProtectedRoute requiredInterface="ORDRES_DEMANDES"><FormulaireDemande /></ProtectedRoute>} />
              <Route path="ordres/ots/dashboard" element={<ProtectedRoute requiredInterface="ORDRES_DASHBOARD_OT"><DashboardOTs /></ProtectedRoute>} />
              <Route path="ordres/ots/nouveau" element={<ProtectedRoute requiredInterface="ORDRES_OTS"><FormulaireOT /></ProtectedRoute>} />
              <Route path="ordres/ots" element={<ProtectedRoute requiredInterface="ORDRES_OTS"><ListeOTs /></ProtectedRoute>} />
              {/*  Interventions — dynamiques APRÈS  */}
              <Route path="ordres/ots/:id" element={<ProtectedRoute requiredInterface="ORDRES_OTS"><DetailOT /></ProtectedRoute>} />
              <Route path="ordres/ots/:id/modifier" element={<ProtectedRoute requiredInterface="ORDRES_OTS"><FormulaireOT /></ProtectedRoute>} />
              <Route path="ordres/ots/:id/rapport" element={<ProtectedRoute requiredInterface="ORDRES_OTS"><CompteRenduOT /></ProtectedRoute>} />

              {/*  Interventions supplémentaires  */}
              <Route path="ordres/declarer" element={<ProtectedRoute requiredInterface="ORDRES_DECLARER"><DeclarerPanne /></ProtectedRoute>} />
              <Route path="ordres/gestion" element={<ProtectedRoute requiredInterface="ORDRES_GESTION"><GestionOTs /></ProtectedRoute>} />
              <Route path="ordres/validation" element={<ProtectedRoute requiredInterface="ORDRES_VALIDATION"><ValidationOperateur /></ProtectedRoute>} />

              {/*  Magasin supplémentaire  */}
              <Route path="magasin/sortie" element={<ProtectedRoute requiredInterface="MAGASIN_SORTIE"><InterfaceMagasinier /></ProtectedRoute>} />

              {/*  Paramétrage  */}
              <Route path="parametrage" element={<ProtectedRoute requiredInterface="PARAMETRAGE"><ParametrageHome /></ProtectedRoute>} />
              <Route path="parametrage/actifs" element={<ProtectedRoute requiredInterface="PARAMETRAGE"><ParametrageActifs /></ProtectedRoute>} />
              <Route path="parametrage/actifs/types" element={<ProtectedRoute requiredInterface="PARAMETRAGE"><TypeActifsPage /></ProtectedRoute>} />
              <Route path="parametrage/backup" element={<ProtectedRoute requiredInterface="PARAMETRAGE_BACKUP"><BackupPage /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  );
}
