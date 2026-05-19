import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  getDemandes,
  validerDemande,
  affecterEquipe,
  getAffectationsByChef,
} from "@/services/ordreService";
import {
  Shield,
  Users,
  Building2,
  Wrench,
  AlertTriangle,
  Clock,
  ChevronRight,
  Mail,
  Globe,
  Calendar,
  Lock,
  Settings2,
  X,
  CheckCircle,
  FileText,
} from "lucide-react";
import {
  getUserById,
  getUserRolesAndPermissions,
  getUserActiveSessions,
  getUserTeam,
  getUserOrganisation,
} from "../../services/userDetailService";
import { TeamManager } from "@/components/TeamManager";
import { AppartenanceManager } from "@/components/AppartenanceManager";
import { RoleManager } from "@/components/RoleManager"; // ← import du composant dédié
import DIDetailDialog from "@/components/DIDetailDialog";
import useAuthStore from "@/store/authStore";

// ─── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || "";

const ROLE_COLORS = [
  {
    bg: "bg-[var(--status-blue-bg)]",
    text: "text-[var(--status-blue-text)]",
    dot: "bg-[var(--status-blue-dot)]",
    activeBorder: "border-[var(--status-blue-dot)]",
  },
  {
    bg: "bg-[var(--status-purple-bg)]",
    text: "text-[var(--status-purple-text)]",
    dot: "bg-[var(--status-purple-dot)]",
    activeBorder: "border-[var(--status-purple-dot)]",
  },
  {
    bg: "bg-[var(--status-cyan-bg)]",
    text: "text-[var(--status-cyan-text)]",
    dot: "bg-[var(--status-cyan-dot)]",
    activeBorder: "border-[var(--status-cyan-dot)]",
  },
  {
    bg: "bg-[var(--status-orange-bg)]",
    text: "text-[var(--status-orange-text)]",
    dot: "bg-[var(--status-orange-dot)]",
    activeBorder: "border-[var(--status-orange-dot)]",
  },
  {
    bg: "bg-[var(--status-green-bg)]",
    text: "text-[var(--status-green-text)]",
    dot: "bg-[var(--status-green-dot)]",
    activeBorder: "border-[var(--status-green-dot)]",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDateShort(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

// ─── BentoCard ─────────────────────────────────────────────────────────────────

function BentoCard({ children, className = "", style = {} }) {
  return (
    <div
      className={`tbl-card p-5 flex flex-col gap-3 ${className}`}
      style={style}>
      {children}
    </div>
  );
}

function BentoHeader({ icon: Icon, title, action, accent }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
      <span
        className="w-6 h-6 rounded flex items-center justify-center shrink-0"
        style={{ background: accent || "var(--primary-soft)" }}>
        {Icon && (
          <Icon
            size={12}
            style={{
              color: accent ? "#fff" : "var(--color-primary)",
              opacity: accent ? 0.9 : 1,
            }}
          />
        )}
      </span>
      <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider flex-1">
        {title}
      </span>
      {action}
    </div>
  );
}

// ─── GérerButton ───────────────────────────────────────────────────────────────

function GererButton({ open, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border transition-all duration-200 ${
        open
          ? "bg-primary-soft border-primary text-primary"
          : "bg-transparent border-border text-text-muted hover:border-primary hover:text-primary"
      }`}>
      {open ? (
        <>
          <X size={10} /> Fermer
        </>
      ) : (
        <>
          <Settings2 size={10} /> Gérer
        </>
      )}
    </button>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const id = authUser?.id;

  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissionsByModule, setPermissionsByModule] = useState({});
  const [isOnline, setIsOnline] = useState(false);
  const [teamMemberships, setTeamMemberships] = useState([]);
  const [appartenances, setAppartenances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showRoleManager, setShowRoleManager] = useState(false);
  const [showTeamManager, setShowTeamManager] = useState(false);
  const [showAppartenanceManager, setShowAppartenanceManager] = useState(false);

  const [demandesIntervention, setDemandesIntervention] = useState([]);
  const [validatingDI, setValidatingDI] = useState(null);
  const [affectations, setAffectations] = useState([]);

  const [selectedDI, setSelectedDI] = useState(null);
  const [showDIDialog, setShowDIDialog] = useState(false);

  // ─── Chargement initial ────────────────────────────────────────────────────

  // Logique de fetch partagée entre loadData (avec skeleton) et refreshData (silencieux)
  const fetchData = async () => {
    const [userRes, rolesData, sessionsRes, teamRes, orgRes, disRes, affRes] =
      await Promise.all([
        getUserById(id),
        getUserRolesAndPermissions(id),
        getUserActiveSessions(id).catch(() => ({ data: { results: [] } })),
        getUserTeam(id).catch(() => ({ data: { results: [] } })),
        getUserOrganisation(id).catch(() => ({ data: { results: [] } })),
        getDemandes({ statut: "en_attente" }).catch(() => ({
          data: { results: [] },
        })),
        getAffectationsByChef(id).catch(() => ({ data: { results: [] } })),
      ]);

    setUser(userRes.data);
    setRoles(rolesData.roles);
    setPermissionsByModule(rolesData.permissionsByModule);
    setDemandesIntervention(disRes.data.results || disRes.data || []);
    setAffectations(affRes.data.results || affRes.data || []);

    const sessions = sessionsRes.data.results || sessionsRes.data || [];
    const now = new Date();
    const userNom = userRes.data.nom_utilisateur;
    setIsOnline(
      sessions.some(
        (s) =>
          s.nom_utilisateur === userNom &&
          s.est_active &&
          new Date(s.date_expiration) > now,
      ),
    );
    setTeamMemberships(teamRes.data.results || teamRes.data || []);
    setAppartenances(orgRes.data.results || orgRes.data || []);
  };

  // Avec skeleton — utilisé au montage et sur "Réessayer"
  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await fetchData();
    } catch (e) {
      console.error(e);
      if (e.response?.status === 404) setUser(null);
      else setError("Impossible de charger les données de l'utilisateur.");
    } finally {
      setLoading(false);
    }
  };

  // Silencieux — pas de skeleton, appelé au clic "Fermer"
  const refreshData = async () => {
    if (!id) return;
    try {
      await fetchData();
      window.location.reload(); // forcer le rafraîchissement de la page pour réinitialiser les états internes des composants enfants
    } catch (e) {
      console.error(e);
    }
  };

  const handleValiderDI = async (di) => {
    setValidatingDI(di.id);
    setDemandesIntervention((prev) => prev.filter((d) => d.id !== di.id));
    try {
      const res = await validerDemande(di.id);
      const ot = res.data;
      await affecterEquipe(ot.id, { idChefTechnicien: id });
      const affRes = await getAffectationsByChef(id).catch(() => ({
        data: { results: [] },
      }));
      setAffectations(affRes.data.results || affRes.data || []);
    } catch (err) {
      console.error("Erreur validation DI :", err.response?.data || err);
      setDemandesIntervention((prev) => [...prev, di]);
    } finally {
      setValidatingDI(null);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  // Appelé par RoleManager après chaque toggle — toujours re-fetch pour avoir
  // les permissions à jour en plus des rôles
  const handleRolesChange = async () => {
    try {
      const rolesData = await getUserRolesAndPermissions(id);
      setRoles(rolesData.roles);
      setPermissionsByModule(rolesData.permissionsByModule);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTeamChange = async () => {
    try {
      const teamRes = await getUserTeam(id);
      setTeamMemberships(teamRes.data.results || teamRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAppartenanceChange = async () => {
    try {
      const orgRes = await getUserOrganisation(id);
      setAppartenances(orgRes.data.results || orgRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Guards ───────────────────────────────────────────────────────────────

  if (!id)
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l">
            <h1>Mon profil</h1>
          </div>
        </div>
        <div className="bg-status-red-bg text-status-red-text p-4 rounded-sm text-xs">
          Impossible de récupérer votre session. Veuillez vous reconnecter.
        </div>
      </div>
    );

  if (loading)
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l flex items-center gap-2.5">
            <div className="skeleton w-8 h-8 rounded-full" />
            <div className="skeleton w-45 h-5" />
          </div>
        </div>
        <div className="tbl-card p-7 flex gap-6 items-center">
          <div className="skeleton w-18 h-18 rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-2.5">
            <div className="skeleton w-2/5 h-4.5" />
            <div className="skeleton w-1/4 h-3.5" />
            <div className="flex gap-2">
              <div className="skeleton w-15 h-5.5 rounded-full" />
              <div className="skeleton w-17.5 h-5.5 rounded-full" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="tbl-card p-5">
              <div className="skeleton w-1/2 h-3 mb-4" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  key={j}
                  className="flex justify-between py-2.5 border-b border-border-subtle">
                  <div
                    className="skeleton"
                    style={{ width: `${30 + j * 8}%` }}
                  />
                  <div
                    className="skeleton"
                    style={{ width: `${20 + j * 4}%` }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );

  if (error)
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l">
            <h1>Erreur</h1>
          </div>
        </div>
        <div className="bg-status-red-bg text-status-red-text p-5 rounded-sm text-xs flex items-center gap-3">
          <AlertTriangle size={16} />
          <span className="flex-1">{error}</span>
          <button
            className="btn btn-primary text-xs px-3.5 py-1.5"
            onClick={loadData}>
            Réessayer
          </button>
        </div>
      </div>
    );

  if (!user)
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l">
            <h1>Mon profil</h1>
          </div>
        </div>
        <div className="bg-status-red-bg text-status-red-text p-4 rounded-sm text-xs">
          Utilisateur introuvable.
        </div>
      </div>
    );

  // ─── Computed ─────────────────────────────────────────────────────────────

  const activeTeam = teamMemberships.find((m) => m.estActif);
  const teamHistory = teamMemberships.filter((m) => !m.estActif);
  const primaryOrg = appartenances.find((a) => a.estPrincipale);
  const secondaryOrgs = appartenances.filter((a) => !a.estPrincipale);
  const hasStockSortie = roles.some((r) =>
    (r.permissions || []).some((p) => p.code?.includes("STOCK_SORTIE")),
  );
  const initials =
    `${(user.prenom || "?")[0]}${(user.nom || "?")[0]}`.toUpperCase();
  const pendingDIs = demandesIntervention.filter(
    (d) => d.statut === "en_attente",
  );

  // ─── Rendu principal ──────────────────────────────────────────────────────

  return (
    <div className="page">
      <div className="hdr">
        <div className="hdr-l flex items-center gap-2.5">
          <h1>Mon profil</h1>
        </div>
      </div>

      {!user.est_actif && (
        <div className="bg-status-red-bg text-status-red-text p-3 rounded-sm text-xs flex items-center gap-2.5 font-medium border border-red-200/15 mb-4">
          <Lock size={15} />
          Ce compte utilisateur est désactivé. L'accès au système est bloqué.
        </div>
      )}

      {/* ══ HERO CARD — full width ════════════════════════════════════════════ */}
      <div className="tbl-card relative overflow-hidden mb-4">
        <div
          className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--r)] ${
            user.est_actif
              ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--status-green-dot)]"
              : "bg-gradient-to-r from-[var(--status-red-dot)] to-[var(--status-orange-dot)]"
          }`}
        />

        <div className="flex gap-6 items-center p-6">
          {/* Avatar */}
          <div
            className={`w-[68px] h-[68px] rounded-2xl shrink-0 flex items-center justify-center shadow-[0_6px_20px_rgba(79,70,229,0.20)] ${
              user.est_actif
                ? "bg-gradient-to-br from-[var(--color-primary)] to-[#818cf8]"
                : "bg-gradient-to-br from-[var(--status-gray-dot)] to-[var(--text-muted)]"
            }`}>
            <span className="text-white text-[20px] font-bold tracking-wider">
              {initials}
            </span>
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h2 className="text-lg font-semibold tracking-tight text-text-primary m-0">
                {user.prenom} {user.nom}
              </h2>
              <span
                className={`badge ${user.est_actif ? "bg-[var(--status-green-bg)] text-[var(--status-green-text)]" : "bg-[var(--status-red-bg)] text-[var(--status-red-text)]"}`}>
                <span
                  className={`bdot ${user.est_actif ? "bg-[var(--status-green-dot)]" : "bg-[var(--status-red-dot)]"}`}
                />
                {user.est_actif ? "Actif" : "Inactif"}
              </span>
              <span
                className={`badge ${isOnline ? "bg-[var(--status-green-bg)] text-[var(--status-green-text)]" : "bg-[var(--status-gray-bg)] text-[var(--status-gray-text)]"}`}>
                <span
                  className={`bdot ${isOnline ? "bg-[var(--status-green-dot)] animate-[pulse_2s_infinite]" : "bg-[var(--status-gray-dot)]"}`}
                />
                {isOnline ? "En ligne" : "Hors ligne"}
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap mb-2.5">
              <span className="code-mono text-xs text-text-muted">
                @{user.nom_utilisateur}
              </span>
              <span className="flex items-center gap-1.25 text-xs text-text-secondary">
                <Mail size={11} className="opacity-60" />
                {user.email}
              </span>
            </div>

            {/* Roles compact pills */}
            <div className="flex gap-1.5 flex-wrap">
              {roles.map((r, i) => {
                const c = ROLE_COLORS[i % ROLE_COLORS.length];
                return (
                  <span
                    key={r.id}
                    className={`badge ${c.bg} ${c.text} text-[10px]`}>
                    <span className={`bdot ${c.dot}`} />
                    {r.code}
                  </span>
                );
              })}
              {roles.length === 0 && (
                <span className="text-xs text-text-muted italic">
                  Aucun rôle
                </span>
              )}
            </div>
          </div>

          {/* Meta info */}
          <div className="shrink-0 flex flex-col gap-2 items-end border-l border-border-subtle pl-6 ml-2">
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <Clock size={11} />
              <span>
                {user.derniere_connexion
                  ? formatDate(user.derniere_connexion)
                  : "Jamais connecté"}
              </span>
            </div>
            {user.derniere_connexion_ip && (
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <Globe size={11} />
                <span className="code-mono text-[10px]">
                  {user.derniere_connexion_ip}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <Calendar size={11} />
              <span>Créé le {formatDateShort(user.date_creation)}</span>
            </div>
            <div className="flex gap-3 mt-1 pt-2 border-t border-border-subtle w-full justify-end">
              <div className="text-center">
                <div className="text-base font-bold text-text-primary leading-none">
                  {roles.length}
                </div>
                <div className="text-[9px] text-text-muted mt-0.5">Rôles</div>
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-text-primary leading-none">
                  {pendingDIs.length}
                </div>
                <div className="text-[9px] text-text-muted mt-0.5">DIs</div>
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-text-primary leading-none">
                  {affectations.length}
                </div>
                <div className="text-[9px] text-text-muted mt-0.5">OTs</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ BENTO GRID — 3 colonnes : [gauche: rôles+équipe+org] [droite: permissions+DIs+OTs] ══ */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 2fr" }}>
        {/* ══ COLONNE GAUCHE : Rôles · Équipe · Organisation ════════════════ */}
        <div className="flex flex-col gap-4">
          {/* ── RÔLES CARD ─────────────────────────────────────────────────── */}
          <BentoCard>
            <BentoHeader
              icon={Shield}
              title="Rôles attribués"
              action={
                <GererButton
                  open={showRoleManager}
                  onClick={() => {
                    if (showRoleManager) refreshData();
                    setShowRoleManager((v) => !v);
                  }}
                />
              }
            />

            {!showRoleManager ? (
              /* Vue lecture : seulement les rôles de l'utilisateur */
              roles.length === 0 ? (
                <p className="empty py-4 text-xs">Aucun rôle attribué</p>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  {roles.map((r, i) => {
                    const c = ROLE_COLORS[i % ROLE_COLORS.length];
                    return (
                      <div
                        key={r.id}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium border ${c.bg} ${c.text} ${c.activeBorder} border shadow-sm`}>
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`}
                        />
                        <span className="truncate">{r.libelle}</span>
                        <span className="code-mono text-[9px] opacity-70 shrink-0">
                          {r.code}
                        </span>
                        <span className="text-[9px] font-normal opacity-70 shrink-0">
                          N{r.niveau}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Vue gestion : RoleManager avec toggles shadcn */
              <RoleManager userId={id} onRolesChange={handleRolesChange} />
            )}
          </BentoCard>

          {/* ── ÉQUIPE CARD ─────────────────────────────────────────────────── */}
          <BentoCard>
            <BentoHeader
              icon={Users}
              title="Équipe"
              action={
                <GererButton
                  open={showTeamManager}
                  onClick={() => setShowTeamManager((v) => !v)}
                />
              }
            />

            {!showTeamManager ? (
              <>
                {activeTeam ? (
                  <div className="rounded-lg p-3.5 border border-border-subtle bg-[var(--bg-elevated)]">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold text-text-primary leading-tight">
                        {activeTeam.equipe_libelle || "—"}
                      </span>
                      <span className="badge bg-[var(--status-green-bg)] text-[var(--status-green-text)] text-[10px] shrink-0 ml-2">
                        <span className="bdot bg-[var(--status-green-dot)]" />
                        Active
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                        <Shield size={10} className="opacity-60" />
                        <span>{activeTeam.niveauRole}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                        <Calendar size={10} className="opacity-60" />
                        <span>{formatDateShort(activeTeam.dateAdhesion)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="empty py-4 text-xs">Aucune équipe active</p>
                )}

                {teamHistory.length > 0 && (
                  <div className="mt-1">
                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-2">
                      Historique
                    </p>
                    <div className="flex flex-col gap-1">
                      {teamHistory.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between py-1.5 border-b border-border-subtle">
                          <span className="text-xs text-text-secondary">
                            {m.equipe_libelle || "—"}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="badge bg-[var(--status-gray-bg)] text-[var(--status-gray-text)] text-[10px]">
                              {m.niveauRole}
                            </span>
                            <span className="code-mono text-[9px] text-text-muted">
                              {formatDateShort(m.dateAdhesion)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <TeamManager userId={id} onTeamChange={handleTeamChange} />
            )}
          </BentoCard>

          {/* ── ORGANISATION CARD ──────────────────────────────────────────── */}
          <BentoCard>
            <BentoHeader
              icon={Building2}
              title="Appartenance organisationnelle"
              action={
                <GererButton
                  open={showAppartenanceManager}
                  onClick={() => setShowAppartenanceManager((v) => !v)}
                />
              }
            />

            {!showAppartenanceManager ? (
              <div className="flex flex-col gap-4 pt-1">
                {/* Rattachement principal */}
                <div>
                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-2">
                    Principal
                  </p>
                  {primaryOrg ? (
                    <div className="rounded-lg border border-border-subtle bg-[var(--bg-elevated)] p-3">
                      {[
                        { label: "Société", value: primaryOrg.societe_libelle },
                        { label: "Site", value: primaryOrg.site_libelle },
                        { label: "Secteur", value: primaryOrg.secteur_libelle },
                        { label: "Unité", value: primaryOrg.unite_libelle },
                      ]
                        .filter((item) => item.value)
                        .map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 py-1"
                            style={{ paddingLeft: i * 12 }}>
                            {i > 0 && (
                              <ChevronRight
                                size={10}
                                className="text-text-muted opacity-40"
                              />
                            )}
                            <span className="text-[9px] text-text-muted uppercase w-11 shrink-0">
                              {item.label}
                            </span>
                            <span
                              className={`text-xs ${i === 0 ? "font-semibold text-primary" : "font-medium text-text-primary"}`}>
                              {item.value}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="empty text-xs py-3">
                      Aucun rattachement principal
                    </p>
                  )}
                </div>

                {/* Rattachements secondaires */}
                <div>
                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-2">
                    Secondaires
                  </p>
                  {secondaryOrgs.length === 0 ? (
                    <p className="empty text-xs py-3">Aucun</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {secondaryOrgs.map((org) => (
                        <div
                          key={org.id}
                          className="flex flex-wrap items-center gap-1 p-2 rounded border border-border-subtle bg-[var(--bg-elevated)]">
                          {[
                            org.societe_libelle,
                            org.site_libelle,
                            org.secteur_libelle,
                            org.unite_libelle,
                          ]
                            .filter(Boolean)
                            .map((label, i, arr) => (
                              <span key={i} className="flex items-center gap-1">
                                <span className="text-[11px] text-text-secondary">
                                  {label}
                                </span>
                                {i < arr.length - 1 && (
                                  <ChevronRight
                                    size={10}
                                    className="text-text-muted opacity-60"
                                  />
                                )}
                              </span>
                            ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <AppartenanceManager
                userId={id}
                onAppartenanceChange={handleAppartenanceChange}
              />
            )}
          </BentoCard>
        </div>

        {/* ══ COLONNE DROITE : Permissions · DIs · OTs ══════════════════════ */}
        <div className="flex flex-col gap-4">
          {/* ── PERMISSIONS CARD ───────────────────────────────────────────── */}
          <BentoCard>
            <BentoHeader icon={Lock} title="Permissions par module" />

            {Object.keys(permissionsByModule).length === 0 ? (
              <p className="empty py-4 text-xs">Aucune permission</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-1">
                {Object.entries(permissionsByModule).map(([mod, perms]) => (
                  <div key={mod}>
                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <span className="w-1 h-2.5 rounded-sm bg-primary shrink-0" />
                      {mod}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {perms.map((p) => {
                        const isCritical = p.code?.includes("STOCK_SORTIE");
                        return (
                          <span
                            key={`${p.id}-${p.role_code}`}
                            className={`badge text-[10px] ${
                              isCritical
                                ? "bg-[var(--status-orange-bg)] text-[var(--status-orange-text)] font-semibold border border-orange-200/20"
                                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-none"
                            }`}>
                            {isCritical && <AlertTriangle size={9} />}
                            {p.action} {p.ressource}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasStockSortie && (
              <div className="bg-status-orange-bg text-status-orange-text p-2.5 rounded-sm text-[11px] flex items-center gap-2 border border-orange-200/20 font-medium mt-auto">
                <AlertTriangle size={13} />
                Permission critique :{" "}
                <span className="code-mono">STOCK_SORTIE</span> — accès aux
                sorties de stock
              </div>
            )}
          </BentoCard>

          {/* ── BLOC DIs + OTs ─────────────────────────────────────────────── */}
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "2fr 1fr" }}>
            {/* DIs EN ATTENTE */}
            <BentoCard>
              <BentoHeader
                icon={FileText}
                title="Demandes en attente"
                action={
                  pendingDIs.length > 0 && (
                    <span className="badge bg-[var(--status-yellow-bg)] text-[var(--status-yellow-text)] text-[10px]">
                      {pendingDIs.length}
                    </span>
                  )
                }
              />

              {pendingDIs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <FileText size={22} className="text-text-muted opacity-30" />
                  <p className="text-xs text-text-muted">
                    Aucune demande en attente
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  {pendingDIs.map((di) => {
                    const urgenceCfg =
                      {
                        critique: {
                          bg: "var(--status-red-bg)",
                          text: "var(--status-red-text)",
                          dot: "var(--status-red-dot)",
                        },
                        haute: {
                          bg: "var(--status-orange-bg)",
                          text: "var(--status-orange-text)",
                          dot: "var(--status-orange-dot)",
                        },
                        normale: {
                          bg: "var(--status-blue-bg)",
                          text: "var(--status-blue-text)",
                          dot: "var(--status-blue-dot)",
                        },
                        basse: {
                          bg: "var(--bg-elevated)",
                          text: "var(--text-muted)",
                          dot: "var(--text-muted)",
                        },
                      }[di.urgence] || {};

                    const isValidating = validatingDI === di.id;

                    return (
                      <div
                        key={di.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle bg-[var(--bg-elevated)] cursor-pointer hover:border-primary/30 transition-all duration-150"
                        onClick={() => {
                          setSelectedDI(di);
                          setShowDIDialog(true);
                        }}>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: urgenceCfg.dot,
                            boxShadow: `0 0 0 3px ${urgenceCfg.bg}`,
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="code-mono text-xs font-semibold text-text-primary">
                              {di.numero}
                            </span>
                            <span
                              className="badge text-[10px]"
                              style={{
                                background: urgenceCfg.bg,
                                color: urgenceCfg.text,
                              }}>
                              {di.urgence}
                            </span>
                            {di.nb_pieces_jointes > 0 && (
                              <span className="text-[10px] text-text-muted">
                                {di.nb_pieces_jointes} pièce(s)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-text-secondary line-clamp-1">
                            {di.description}
                          </p>
                        </div>
                        <button
                          className="btn btn-primary text-[10px] px-2.5 py-1.5 shrink-0 flex items-center gap-1.5 whitespace-nowrap"
                          disabled={isValidating}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleValiderDI(di);
                          }}>
                          {isValidating ? (
                            <span className="opacity-70">…</span>
                          ) : (
                            <>
                              <CheckCircle size={11} /> Participer
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </BentoCard>

            {/* OTs ASSIGNÉS */}
            <BentoCard>
              <BentoHeader
                icon={Wrench}
                title="OTs assignés"
                action={
                  <span className="badge bg-[var(--bg-elevated)] text-[var(--text-muted)] text-[10px]">
                    {affectations.length}
                  </span>
                }
              />

              {affectations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Wrench size={22} className="text-text-muted opacity-30" />
                  <p className="text-xs text-text-muted">Aucun OT assigné</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 pt-1">
                  {affectations.map((aff) => {
                    const statutCfg = {
                      rejeter: {
                        bg: "var(--status-red-bg)",
                        text: "var(--status-red-text)",
                      },
                      en_attente: {
                        bg: "var(--status-yellow-bg)",
                        text: "var(--status-yellow-text)",
                      },
                      en_cours: {
                        bg: "var(--status-orange-bg)",
                        text: "var(--status-orange-text)",
                      },
                      termine: {
                        bg: "var(--status-green-bg)",
                        text: "var(--status-green-text)",
                      },
                    }[aff.statut] || {
                      bg: "var(--bg-elevated)",
                      text: "var(--text-muted)",
                    };

                    return (
                      <div
                        key={aff.id}
                        className="flex items-center justify-between p-2.5 rounded border border-border-subtle bg-[var(--bg-elevated)] cursor-pointer hover:border-primary/30 transition-all duration-150"
                        onClick={() =>
                          navigate(`/ordres/ots/${aff.idOrdreTravail}`)
                        }>
                        <span className="code-mono text-xs font-semibold text-text-primary">
                          {aff.ot_numero || aff.idOrdreTravail}
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className="badge text-[9px]"
                            style={{
                              background: statutCfg.bg,
                              color: statutCfg.text,
                            }}>
                            {aff.statut?.replace(/_/g, " ")}
                          </span>
                          <span className="code-mono text-[9px] text-text-muted">
                            {aff.dateDebut
                              ? new Intl.DateTimeFormat("fr-FR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                }).format(new Date(aff.dateDebut))
                              : "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </BentoCard>
          </div>
        </div>
      </div>

      <DIDetailDialog
        di={selectedDI}
        open={showDIDialog}
        onOpenChange={setShowDIDialog}
      />
    </div>
  );
}
