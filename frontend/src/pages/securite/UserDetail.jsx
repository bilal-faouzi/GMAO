import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
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
} from "lucide-react";
import {
  getUserById,
  getUserRolesAndPermissions,
  getUserActiveSessions,
  getUserTeam,
  getUserOrganisation,
} from "../../services/userDetailService";
import { RoleManager } from "@/components/RoleManager";
import { TeamManager } from "@/components/TeamManager";
import { AppartenanceManager } from "@/components/AppartenanceManager";

// ─── Config ───────────────────────────────────────────────────────────────────

const NIVEAU_LABELS = {
  1: "Niveau 1 — Directeur Technique",
  2: "Niveau 2 — Responsable",
  3: "Niveau 3 — Responsable Techniciens",
  4: "Niveau 4 — Magasinier",
  5: "Niveau 5 — Opérateur",
};

const ROLE_COLORS = [
  {
    bg: "bg-[var(--status-blue-bg)]",
    text: "text-[var(--status-blue-text)]",
    dot: "bg-[var(--status-blue-dot)]",
  },
  {
    bg: "bg-[var(--status-purple-bg)]",
    text: "text-[var(--status-purple-text)]",
    dot: "bg-[var(--status-purple-dot)]",
  },
  {
    bg: "bg-[var(--status-cyan-bg)]",
    text: "text-[var(--status-cyan-text)]",
    dot: "bg-[var(--status-cyan-dot)]",
  },
  {
    bg: "bg-[var(--status-orange-bg)]",
    text: "text-[var(--status-orange-text)]",
    dot: "bg-[var(--status-orange-dot)]",
  },
  {
    bg: "bg-[var(--status-green-bg)]",
    text: "text-[var(--status-green-text)]",
    dot: "bg-[var(--status-green-dot)]",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, icon: Icon, children, mono }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-border-subtle">
      <span className="text-xs text-text-muted flex items-center gap-1.5">
        {Icon && <Icon size={13} className="opacity-60" />}
        {label}
      </span>
      {children || (
        <span
          className={`text-xs font-medium text-text-primary ${mono ? "font-mono" : ""}`}>
          {value || "—"}
        </span>
      )}
    </div>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children, fullWidth, action }) {
  return (
    <div className={`tbl-card p-6 ${fullWidth ? "col-span-full" : ""}`}>
      <div className="flex items-center gap-2 pb-3.5 border-b border-border-subtle mb-0.5">
        {Icon && (
          <span className="w-7 h-7 rounded flex items-center justify-center bg-primary-soft shrink-0">
            <Icon size={14} className="text-primary" />
          </span>
        )}
        <span className="tbl-title text-xs flex-1">{title}</span>
        {action}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

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

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, rolesData, sessionsRes, teamRes, orgRes] =
        await Promise.all([
          getUserById(id),
          getUserRolesAndPermissions(id),
          getUserActiveSessions(id).catch(() => ({ data: { results: [] } })),
          getUserTeam(id).catch(() => ({ data: { results: [] } })),
          getUserOrganisation(id).catch(() => ({ data: { results: [] } })),
        ]);

      setUser(userRes.data);
      setRoles(rolesData.roles);
      setPermissionsByModule(rolesData.permissionsByModule);

      const sessions = sessionsRes.data.results || sessionsRes.data || [];
      const now = new Date();
      const userNom = userRes.data.nom_utilisateur;
      const hasActive = sessions.some(
        (s) =>
          s.nom_utilisateur === userNom &&
          s.est_active &&
          new Date(s.date_expiration) > now,
      );
      setIsOnline(hasActive);

      setTeamMemberships(teamRes.data.results || teamRes.data || []);
      setAppartenances(orgRes.data.results || orgRes.data || []);
    } catch (e) {
      console.error(e);
      if (e.response?.status === 404) setUser(null);
      else setError("Impossible de charger les données de l'utilisateur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleRolesChange = async () => {
    try {
      const rolesData = await getUserRolesAndPermissions(id);
      setRoles(rolesData.roles);
      setPermissionsByModule(rolesData.permissionsByModule);
    } catch (e) {
      console.error("Erreur lors du rechargement des permissions :", e);
    }
  };

  const handleTeamChange = async () => {
    try {
      const teamRes = await getUserTeam(id);
      setTeamMemberships(teamRes.data.results || teamRes.data || []);
    } catch (e) {
      console.error("Erreur lors du rechargement des équipes :", e);
    }
  };

  const handleAppartenanceChange = async () => {
    try {
      const orgRes = await getUserOrganisation(id);
      setAppartenances(orgRes.data.results || orgRes.data || []);
    } catch (e) {
      console.error("Erreur lors du rechargement des appartenances :", e);
    }
  };

  if (loading) {
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
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="tbl-card p-5.5">
              <div className="skeleton w-1/2 h-3 mb-4.5" />
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  className="flex justify-between py-2.5 border-b border-border-subtle">
                  <div
                    className="skeleton"
                    style={{ width: `${30 + j * 5}%` }}
                  />
                  <div
                    className="skeleton"
                    style={{ width: `${20 + j * 3}%` }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l">
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => navigate("/utilisateurs")}
              title="Retour">
              <ArrowLeft size={16} />
            </button>
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
  }

  if (!user) {
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l">
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => navigate("/utilisateurs")}
              title="Retour">
              <ArrowLeft size={16} />
            </button>
            <h1>Utilisateur</h1>
          </div>
        </div>
        <div className="bg-status-red-bg text-status-red-text p-4 rounded-sm text-xs">
          Utilisateur introuvable.
        </div>
      </div>
    );
  }

  const activeTeam = teamMemberships.find((m) => m.estActif);
  const teamHistory = teamMemberships.filter((m) => !m.estActif);
  const primaryOrg = appartenances.find((a) => a.estPrincipale);
  const secondaryOrgs = appartenances.filter((a) => !a.estPrincipale);
  const hasStockSortie = roles.some((r) =>
    (r.permissions || []).some((p) => p.code?.includes("STOCK_SORTIE")),
  );
  const initials =
    `${(user.prenom || "?")[0]}${(user.nom || "?")[0]}`.toUpperCase();

  return (
    <div className="page">
      <div className="hdr">
        <div className="hdr-l flex items-center gap-2.5">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => navigate("/utilisateurs")}
            title="Retour">
            <ArrowLeft size={16} />
          </button>
          <h1>Détail utilisateur</h1>
        </div>
      </div>

      {!user.est_actif && (
        <div className="bg-status-red-bg text-status-red-text p-3 rounded-sm text-xs flex items-center gap-2.5 font-medium border border-red-200/15">
          <Lock size={15} />
          Ce compte utilisateur est désactivé. L'accès au système est bloqué.
        </div>
      )}

      {/* ═══════════════════════ HERO CARD ═══════════════════════ */}
      <div className="tbl-card p-7 flex gap-6 items-center relative overflow-hidden">
        {/* Accent bar */}
        <div
          className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--r)] ${
            user.est_actif
              ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--status-green-dot)]"
              : "bg-gradient-to-r from-[var(--status-red-dot)] to-[var(--status-orange-dot)]"
          }`}
        />

        {/* Avatar */}
        <div
          className={`w-[72px] h-[72px] rounded-full shrink-0 flex items-center justify-center shadow-[0_4px_16px_rgba(79,70,229,0.18)] ${
            user.est_actif
              ? "bg-gradient-to-br from-[var(--color-primary)] to-[#818cf8]"
              : "bg-gradient-to-br from-[var(--status-gray-dot)] to-[var(--text-muted)]"
          }`}>
          <span className="text-white text-[22px] font-bold tracking-wider">
            {initials}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-semibold tracking-tight text-text-primary m-0">
              {user.prenom} {user.nom}
            </h2>
            <span
              className={`badge ${
                user.est_actif
                  ? "bg-[var(--status-green-bg)] text-[var(--status-green-text)]"
                  : "bg-[var(--status-red-bg)] text-[var(--status-red-text)]"
              }`}>
              <span
                className={`bdot ${
                  user.est_actif
                    ? "bg-[var(--status-green-dot)]"
                    : "bg-[var(--status-red-dot)]"
                }`}
              />
              {user.est_actif ? "Actif" : "Inactif"}
            </span>
            <span
              className={`badge ${
                isOnline
                  ? "bg-[var(--status-green-bg)] text-[var(--status-green-text)]"
                  : "bg-[var(--status-gray-bg)] text-[var(--status-gray-text)]"
              }`}>
              <span
                className={`bdot ${
                  isOnline
                    ? "bg-[var(--status-green-dot)] animate-[pulse_2s_infinite]"
                    : "bg-[var(--status-gray-dot)]"
                }`}
              />
              {isOnline ? "En ligne" : "Hors ligne"}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className="code-mono text-xs text-text-muted">
              @{user.nom_utilisateur}
            </span>
            <span className="flex items-center gap-1.25 text-xs text-text-secondary">
              <Mail size={12} className="opacity-60" />
              {user.email}
            </span>
          </div>

          <div className="flex gap-2 mt-3 flex-wrap">
            {roles.map((r, i) => {
              const c = ROLE_COLORS[i % ROLE_COLORS.length];
              return (
                <span
                  key={r.id}
                  className={`badge ${c.bg} ${c.text} text-[11px]`}>
                  <span className={`bdot ${c.dot}`} />
                  {r.code}
                </span>
              );
            })}
            {roles.length === 0 && (
              <span className="text-xs text-text-muted italic">Aucun rôle</span>
            )}
          </div>
        </div>

        {/* Right — connection info */}
        <div className="text-right shrink-0 flex flex-col gap-1.5 items-end">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Clock size={12} />
            {user.derniere_connexion
              ? formatDate(user.derniere_connexion)
              : "Jamais connecté"}
          </div>
          {user.derniere_connexion_ip && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Globe size={12} />
              <span className="code-mono text-[10px]">
                {user.derniere_connexion_ip}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Calendar size={12} />
            Créé le {formatDateShort(user.date_creation)}
          </div>
        </div>
      </div>

      {/* ═══════════════════ SECTION B — Sécurité & Accès ═══════════════════ */}
      <div className="grid grid-cols-2 gap-4 ">
        <SectionCard
          icon={Shield}
          title="Rôles attribués"
          action={
            <button
              onClick={() => setShowRoleManager((v) => !v)}
              className={`flex items-center gap-1.25 text-[10px] font-semibold px-2.5 py-1 rounded-sm border transition-all ${
                showRoleManager
                  ? "bg-primary-soft border-primary text-primary"
                  : "bg-transparent border-border text-text-secondary"
              }`}>
              {showRoleManager ? (
                <>
                  <X size={11} /> Fermer
                </>
              ) : (
                <>
                  <Settings2 size={11} /> Gérer
                </>
              )}
            </button>
          }>
          {!showRoleManager &&
            (roles.length === 0 ? (
              <p className="empty py-6">Aucun rôle attribué</p>
            ) : (
              <div className="flex flex-col gap-0">
                {roles.map((r, i) => {
                  const c = ROLE_COLORS[i % ROLE_COLORS.length];
                  return (
                    <div
                      key={r.id}
                      className="flex justify-between items-center py-3 border-b border-border-subtle">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`}
                        />
                        <div>
                          <span className="text-xs font-semibold text-text-primary">
                            {r.libelle}
                          </span>
                          <span className="code-mono text-[10px] ml-2 text-text-muted">
                            {r.code}
                          </span>
                        </div>
                      </div>
                      <span className="badge bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px]">
                        {NIVEAU_LABELS[r.niveau] || `Niveau ${r.niveau}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}

          {showRoleManager && (
            <div className="pt-2">
              <RoleManager userId={id} onRolesChange={handleRolesChange} />
            </div>
          )}
        </SectionCard>

        <SectionCard icon={Lock} title="Permissions par module">
          {Object.keys(permissionsByModule).length === 0 ? (
            <p className="empty py-6">Aucune permission</p>
          ) : (
            <div className="flex flex-col gap-3.5 pt-2">
              {Object.entries(permissionsByModule).map(([mod, perms]) => (
                <div key={mod}>
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-1 h-3 rounded-sm bg-primary shrink-0" />
                    {mod}
                  </div>
                  <div className="flex flex-wrap gap-1.25">
                    {perms.map((p) => {
                      const isCritical = p.code?.includes("STOCK_SORTIE");
                      return (
                        <span
                          key={`${p.id}-${p.role_code}`}
                          className={`badge text-[11px] ${
                            isCritical
                              ? "bg-[var(--status-orange-bg)] text-[var(--status-orange-text)] font-semibold border border-orange-200/20"
                              : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-normal border-none"
                          }`}>
                          {isCritical && <AlertTriangle size={10} />}
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
            <div className="bg-status-orange-bg text-status-orange-text p-2.5 rounded-sm text-xs mt-3.5 flex items-center gap-2 border border-orange-200/20 font-medium">
              <AlertTriangle size={14} />
              Permission critique : STOCK_SORTIE — accès aux sorties de stock
            </div>
          )}
        </SectionCard>
      </div>

      {/* ═══════════════════ SECTION C — Organisation & Équipe ═══════════════════ */}
      <div className="grid grid-cols-2 gap-4 ">
        <SectionCard
          icon={Users}
          title="Équipe"
          action={
            <button
              onClick={() => setShowTeamManager((v) => !v)}
              className={`flex items-center gap-1.25 text-[10px] font-semibold px-2.5 py-1 rounded-sm border transition-all  ${
                showTeamManager
                  ? "bg-primary-soft border-primary text-primary"
                  : "bg-transparent border-border text-text-secondary"
              }`}>
              {showTeamManager ? (
                <>
                  <X size={11} /> Fermer
                </>
              ) : (
                <>
                  <Settings2 size={11} /> Gérer
                </>
              )}
            </button>
          }>
          {!showTeamManager && (
            <>
              {activeTeam ? (
                <div className="pt-1  ">
                  <div className="bg-primary-soft rounded-sm p-3.5 mb-2 border border-indigo-700/10">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-semibold text-text-primary">
                        {activeTeam.equipe_libelle || "—"}
                      </span>
                      <span className="badge bg-[var(--status-green-bg)] text-[var(--status-green-text)] text-[10px]">
                        <span className="bdot bg-[var(--status-green-dot)]" />
                        Active
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-text-secondary ">
                      <span className="flex items-center gap-1">
                        <Shield size={11} className="opacity-60" />{" "}
                        {activeTeam.niveauRole}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="opacity-60" />{" "}
                        {formatDateShort(activeTeam.dateAdhesion)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="empty py-6">Aucune équipe active</p>
              )}

              {teamHistory.length > 0 && (
                <div className="mt-3.5 ">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 ">
                    Historique
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Équipe</th>
                        <th>Rôle</th>
                        <th>Adhésion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamHistory.map((m) => (
                        <tr key={m.id}>
                          <td className="text-xs">{m.equipe_libelle || "—"}</td>
                          <td>
                            <span className="badge bg-[var(--status-gray-bg)] text-[var(--status-gray-text)] text-[11px]">
                              {m.niveauRole}
                            </span>
                          </td>
                          <td>
                            <span className="code-mono text-[10px ] ">
                              {formatDateShort(m.dateAdhesion)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {showTeamManager && (
            <TeamManager userId={id} onTeamChange={handleTeamChange} />
          )}
        </SectionCard>

        <SectionCard
          icon={Building2}
          title="Appartenance organisationnelle"
          action={
            <button
              onClick={() => setShowAppartenanceManager((v) => !v)}
              className={`flex items-center gap-1.25 text-[10px] font-semibold px-2.5 py-1 rounded-sm border transition-all ${
                showAppartenanceManager
                  ? "bg-primary-soft border-primary text-primary"
                  : "bg-transparent border-border text-text-secondary"
              }`}>
              {showAppartenanceManager ? (
                <>
                  <X size={11} /> Fermer
                </>
              ) : (
                <>
                  <Settings2 size={11} /> Gérer
                </>
              )}
            </button>
          }>
          {!showAppartenanceManager && (
            <>
              {primaryOrg ? (
                <div className="pt-2">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2.5">
                    Rattachement principal
                  </div>
                  <div className="bg-elevated rounded-sm p-3.5 border border-border-subtle">
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
                          className="flex items-center gap-2 py-1.25"
                          style={{ paddingLeft: i * 16 }}>
                          {i > 0 && (
                            <ChevronRight
                              size={11}
                              className="text-text-muted opacity-50"
                            />
                          )}
                          <span className="text-[10px] text-text-muted uppercase tracking-tighter w-13 shrink-0">
                            {item.label}
                          </span>
                          <span
                            className={`text-xs ${
                              i === 0
                                ? "font-semibold text-primary"
                                : "font-medium text-text-primary"
                            }`}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="empty py-6">Aucun rattachement principal</p>
              )}

              {secondaryOrgs.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                    Rattachements secondaires
                  </div>
                  {secondaryOrgs.map((org) => (
                    <div
                      key={org.id}
                      className="flex flex-wrap items-center gap-2 p-2 border-b border-indigo-700 bg-elevated rounded-sm mb-2">
                      {[
                        org.societe_libelle,
                        org.site_libelle,
                        org.secteur_libelle,
                        org.unite_libelle,
                      ]
                        .filter(Boolean)
                        .map((label, i, arr) => (
                          <span key={i} className="flex items-center gap-1">
                            <span className="text-xs text-text-secondary">
                              {label}
                            </span>
                            {i < arr.length - 1 && (
                              <ChevronRight
                                size={18}
                                className="text-text-muted opacity-90"
                              />
                            )}
                          </span>
                        ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {showAppartenanceManager && (
            <AppartenanceManager
              userId={id}
              onAppartenanceChange={handleAppartenanceChange}
            />
          )}
        </SectionCard>
      </div>

      {/* ═══════════════════ SECTION D — Activité ═══════════════════ */}
      <div className="grid grid-cols-2 gap-4">
        <div className="tbl-card p-0 overflow-hidden">
          <div className="p-6 border-b border-border-subtle flex items-center gap-2">
            <span className="w-7 h-7 rounded flex items-center justify-center bg-status-blue-bg shrink-0">
              <Wrench size={14} className="text-status-blue-text" />
            </span>
            <span className="tbl-title text-xs">Interventions en cours</span>
          </div>
          <div className="p-8 text-center bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,var(--bg-elevated)_10px,var(--bg-elevated)_11px)]">
            <div className="bg-surface rounded-sm p-6 border border-dashed border-border-subtle">
              <Wrench
                size={24}
                className="text-text-muted mx-auto mb-2.5 opacity-50"
              />
              <p className="text-xs text-text-muted mb-3 leading-relaxed">
                Les Ordres de Travail assignés à cet utilisateur seront affichés
                ici.
              </p>
              <span className="badge bg-[var(--status-blue-bg)] text-[var(--status-blue-text)] text-[11px]">
                Phase 6 — Interventions — Bientôt disponible
              </span>
            </div>
          </div>
        </div>

        <div className="tbl-card p-0 overflow-hidden">
          <div className="p-6 border-b border-border-subtle flex items-center gap-2">
            <span className="w-7 h-7 rounded flex items-center justify-center bg-status-orange-bg shrink-0">
              <AlertTriangle size={14} className="text-status-orange-text" />
            </span>
            <span className="tbl-title text-xs">
              Historique des Signalements
            </span>
          </div>
          <div className="p-8 text-center bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,var(--bg-elevated)_10px,var(--bg-elevated)_11px)]">
            <div className="bg-surface rounded-sm p-6 border border-dashed border-border-subtle">
              <AlertTriangle
                size={24}
                className="text-text-muted mx-auto mb-2.5 opacity-50"
              />
              <p className="text-xs text-text-muted mb-3 leading-relaxed">
                Les Demandes d'Intervention soumises par cet utilisateur seront
                affichées ici.
              </p>
              <span className="badge bg-[var(--status-orange-bg)] text-[var(--status-orange-text)] text-[11px]">
                Phase 7 — Notifications — Bientôt disponible
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
