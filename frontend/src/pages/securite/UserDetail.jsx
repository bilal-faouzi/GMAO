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
    bg: "var(--status-blue-bg)",
    text: "var(--status-blue-text)",
    dot: "var(--status-blue-dot)",
  },
  {
    bg: "var(--status-purple-bg)",
    text: "var(--status-purple-text)",
    dot: "var(--status-purple-dot)",
  },
  {
    bg: "var(--status-cyan-bg)",
    text: "var(--status-cyan-text)",
    dot: "var(--status-cyan-dot)",
  },
  {
    bg: "var(--status-orange-bg)",
    text: "var(--status-orange-text)",
    dot: "var(--status-orange-dot)",
  },
  {
    bg: "var(--status-green-bg)",
    text: "var(--status-green-text)",
    dot: "var(--status-green-dot)",
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
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
      <span
        style={{
          fontSize: 13,
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
        {Icon && <Icon size={13} style={{ opacity: 0.6 }} />}
        {label}
      </span>
      {children || (
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            fontFamily: mono ? "var(--font-mono)" : undefined,
          }}>
          {value || "—"}
        </span>
      )}
    </div>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────
// Accepts an optional `action` slot rendered in the card header (right side)

function SectionCard({ icon: Icon, title, children, fullWidth, action }) {
  return (
    <div
      className="tbl-card"
      style={{
        padding: "20px 24px",
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingBottom: 14,
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: 2,
        }}>
        {Icon && (
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "var(--color-primary-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
            <Icon size={14} style={{ color: "var(--color-primary)" }} />
          </span>
        )}
        <span className="tbl-title" style={{ fontSize: 12, flex: 1 }}>
          {title}
        </span>
        {/* Optional action button slot */}
        {action}
      </div>
      <div style={{ marginTop: 4 }}>{children}</div>
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

  // Toggle to show/hide RoleManager panel inside the roles card
  const [showRoleManager, setShowRoleManager] = useState(false);
  // Toggle to show/hide TeamManager panel inside the team card
  const [showTeamManager, setShowTeamManager] = useState(false);
  // Toggle to show/hide AppartenanceManager panel inside the org card
  const [showAppartenanceManager, setShowAppartenanceManager] = useState(false);

  // ── Load ──────────────────────────────────────────────────────
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

  // Called by RoleManager after each add/remove —
  // recharge les permissions depuis l'API pour rester synchronisé
  const handleRolesChange = async () => {
    try {
      const rolesData = await getUserRolesAndPermissions(id);
      setRoles(rolesData.roles);
      setPermissionsByModule(rolesData.permissionsByModule);
    } catch (e) {
      console.error("Erreur lors du rechargement des permissions :", e);
    }
  };

  // Called by TeamManager after each add/remove
  const handleTeamChange = async () => {
    try {
      const teamRes = await getUserTeam(id);
      setTeamMemberships(teamRes.data.results || teamRes.data || []);
    } catch (e) {
      console.error("Erreur lors du rechargement des équipes :", e);
    }
  };

  // Called by AppartenanceManager after each add/remove
  const handleAppartenanceChange = async () => {
    try {
      const orgRes = await getUserOrganisation(id);
      setAppartenances(orgRes.data.results || orgRes.data || []);
    } catch (e) {
      console.error("Erreur lors du rechargement des appartenances :", e);
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="page">
        <div className="hdr">
          <div
            className="hdr-l"
            style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              className="skeleton"
              style={{ width: 32, height: 32, borderRadius: "50%" }}
            />
            <div className="skeleton" style={{ width: 180, height: 20 }} />
          </div>
        </div>
        <div
          className="tbl-card"
          style={{
            padding: 28,
            display: "flex",
            gap: 24,
            alignItems: "center",
          }}>
          <div
            className="skeleton"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
            <div className="skeleton" style={{ width: "40%", height: 18 }} />
            <div className="skeleton" style={{ width: "25%", height: 14 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <div
                className="skeleton"
                style={{ width: 60, height: 22, borderRadius: 20 }}
              />
              <div
                className="skeleton"
                style={{ width: 70, height: 22, borderRadius: 20 }}
              />
            </div>
          </div>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="tbl-card" style={{ padding: 22 }}>
              <div
                className="skeleton"
                style={{ width: "50%", height: 12, marginBottom: 18 }}
              />
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}>
                  <div
                    className="skeleton"
                    style={{ width: `${30 + j * 5}%`, height: 13 }}
                  />
                  <div
                    className="skeleton"
                    style={{ width: `${20 + j * 3}%`, height: 13 }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────
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
        <div
          style={{
            background: "var(--status-red-bg)",
            color: "var(--status-red-text)",
            padding: "16px 20px",
            borderRadius: "var(--r-sm)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
          <AlertTriangle size={16} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            className="btn btn-primary"
            style={{ fontSize: 12, padding: "6px 14px" }}
            onClick={loadData}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ── 404 ────────────────────────────────────────────────────────
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
        <div
          style={{
            background: "var(--status-red-bg)",
            color: "var(--status-red-text)",
            padding: "12px 16px",
            borderRadius: "var(--r-sm)",
            fontSize: 13,
          }}>
          Utilisateur introuvable.
        </div>
      </div>
    );
  }

  // ── Derived ───────────────────────────────────────────────────
  const activeTeam = teamMemberships.find((m) => m.estActif);
  const teamHistory = teamMemberships.filter((m) => !m.estActif);
  const primaryOrg = appartenances.find((a) => a.estPrincipale);
  const secondaryOrgs = appartenances.filter((a) => !a.estPrincipale);
  const hasStockSortie = roles.some((r) =>
    (r.permissions || []).some((p) => p.code?.includes("STOCK_SORTIE")),
  );
  const initials =
    `${(user.prenom || "?")[0]}${(user.nom || "?")[0]}`.toUpperCase();

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="page">
      {/* ── Header nav ── */}
      <div className="hdr">
        <div
          className="hdr-l"
          style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => navigate("/utilisateurs")}
            title="Retour">
            <ArrowLeft size={16} />
          </button>
          <h1>Détail utilisateur</h1>
        </div>
      </div>

      {/* ── Inactive alert ── */}
      {!user.est_actif && (
        <div
          style={{
            background: "var(--status-red-bg)",
            color: "var(--status-red-text)",
            padding: "12px 18px",
            borderRadius: "var(--r-sm)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 500,
            border: "1px solid rgba(239,68,68,.15)",
          }}>
          <Lock size={15} />
          Ce compte utilisateur est désactivé. L'accès au système est bloqué.
        </div>
      )}

      {/* ═══════════════════════ HERO CARD ═══════════════════════ */}
      <div
        className="tbl-card"
        style={{
          padding: "28px 28px 24px",
          display: "flex",
          gap: 24,
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
        }}>
        {/* Accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: user.est_actif
              ? "linear-gradient(90deg, var(--color-primary), var(--status-green-dot))"
              : "linear-gradient(90deg, var(--status-red-dot), var(--status-orange-dot))",
            borderRadius: "var(--r) var(--r) 0 0",
          }}
        />

        {/* Avatar */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            flexShrink: 0,
            background: user.est_actif
              ? "linear-gradient(135deg, var(--color-primary), #818cf8)"
              : "linear-gradient(135deg, var(--status-gray-dot), var(--text-muted))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(79,70,229,.18)",
          }}>
          <span
            style={{
              color: "#fff",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 1,
            }}>
            {initials}
          </span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: -0.3,
                color: "var(--text-primary)",
                margin: 0,
              }}>
              {user.prenom} {user.nom}
            </h2>
            <span
              className="badge"
              style={{
                background: user.est_actif
                  ? "var(--status-green-bg)"
                  : "var(--status-red-bg)",
                color: user.est_actif
                  ? "var(--status-green-text)"
                  : "var(--status-red-text)",
              }}>
              <span
                className="bdot"
                style={{
                  background: user.est_actif
                    ? "var(--status-green-dot)"
                    : "var(--status-red-dot)",
                }}
              />
              {user.est_actif ? "Actif" : "Inactif"}
            </span>
            <span
              className="badge"
              style={{
                background: isOnline
                  ? "var(--status-green-bg)"
                  : "var(--status-gray-bg)",
                color: isOnline
                  ? "var(--status-green-text)"
                  : "var(--status-gray-text)",
              }}>
              <span
                className="bdot"
                style={{
                  background: isOnline
                    ? "var(--status-green-dot)"
                    : "var(--status-gray-dot)",
                  animation: isOnline ? "pulse 2s infinite" : "none",
                }}
              />
              {isOnline ? "En ligne" : "Hors ligne"}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 8,
              flexWrap: "wrap",
            }}>
            <span
              className="code-mono"
              style={{ fontSize: 13, color: "var(--text-muted)" }}>
              @{user.nom_utilisateur}
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                color: "var(--text-secondary)",
              }}>
              <Mail size={12} style={{ opacity: 0.6 }} />
              {user.email}
            </span>
          </div>

          {/* Role badges */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 12,
              flexWrap: "wrap",
            }}>
            {roles.map((r, i) => {
              const c = ROLE_COLORS[i % ROLE_COLORS.length];
              return (
                <span
                  key={r.id}
                  className="badge"
                  style={{ background: c.bg, color: c.text, fontSize: 11 }}>
                  <span className="bdot" style={{ background: c.dot }} />
                  {r.code}
                </span>
              );
            })}
            {roles.length === 0 && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}>
                Aucun rôle
              </span>
            )}
          </div>
        </div>

        {/* Right — connection info */}
        <div
          style={{
            textAlign: "right",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "flex-end",
          }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--text-muted)",
            }}>
            <Clock size={12} />
            {user.derniere_connexion
              ? formatDate(user.derniere_connexion)
              : "Jamais connecté"}
          </div>
          {user.derniere_connexion_ip && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "var(--text-muted)",
              }}>
              <Globe size={12} />
              <span className="code-mono" style={{ fontSize: 11 }}>
                {user.derniere_connexion_ip}
              </span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--text-muted)",
            }}>
            <Calendar size={12} />
            Créé le {formatDateShort(user.date_creation)}
          </div>
        </div>
      </div>

      {/* ═══════════════════ SECTION B — Sécurité & Accès ═══════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* ── Rôles attribués — avec gestion inline ── */}
        <SectionCard
          icon={Shield}
          title="Rôles attribués"
          action={
            <button
              onClick={() => setShowRoleManager((v) => !v)}
              title={showRoleManager ? "Fermer la gestion" : "Gérer les rôles"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--border)",
                background: showRoleManager
                  ? "var(--color-primary-soft)"
                  : "transparent",
                color: showRoleManager
                  ? "var(--color-primary)"
                  : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all .15s",
              }}>
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
          {/* ── Vue lecture seule ── */}
          {!showRoleManager &&
            (roles.length === 0 ? (
              <p className="empty" style={{ padding: "24px 0" }}>
                Aucun rôle attribué
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {roles.map((r, i) => {
                  const c = ROLE_COLORS[i % ROLE_COLORS.length];
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 0",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: c.dot,
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}>
                            {r.libelle}
                          </span>
                          <span
                            className="code-mono"
                            style={{
                              fontSize: 11,
                              marginLeft: 8,
                              color: "var(--text-muted)",
                            }}>
                            {r.code}
                          </span>
                        </div>
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: "var(--bg-elevated)",
                          color: "var(--text-secondary)",
                          fontSize: 10,
                        }}>
                        {NIVEAU_LABELS[r.niveau] || `Niveau ${r.niveau}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}

          {/* ── Panel gestion (toggle) ── */}
          {showRoleManager && (
            <div style={{ paddingTop: 8 }}>
              <RoleManager userId={id} onRolesChange={handleRolesChange} />
            </div>
          )}
        </SectionCard>

        {/* ── Permissions par module ── */}
        <SectionCard icon={Lock} title="Permissions par module">
          {Object.keys(permissionsByModule).length === 0 ? (
            <p className="empty" style={{ padding: "24px 0" }}>
              Aucune permission
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                paddingTop: 8,
              }}>
              {Object.entries(permissionsByModule).map(([mod, perms]) => (
                <div key={mod}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}>
                    <span
                      style={{
                        width: 4,
                        height: 12,
                        borderRadius: 2,
                        background: "var(--color-primary)",
                        flexShrink: 0,
                      }}
                    />
                    {mod}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {perms.map((p) => {
                      const isCritical = p.code?.includes("STOCK_SORTIE");
                      return (
                        <span
                          key={p.id}
                          className="badge"
                          style={{
                            background: isCritical
                              ? "var(--status-orange-bg)"
                              : "var(--bg-elevated)",
                            color: isCritical
                              ? "var(--status-orange-text)"
                              : "var(--text-secondary)",
                            fontSize: 11,
                            fontWeight: isCritical ? 600 : 400,
                            border: isCritical
                              ? "1px solid rgba(234,88,12,.15)"
                              : "none",
                          }}>
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
            <div
              style={{
                background: "var(--status-orange-bg)",
                color: "var(--status-orange-text)",
                padding: "10px 14px",
                borderRadius: "var(--r-sm)",
                fontSize: 12,
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid rgba(234,88,12,.12)",
                fontWeight: 500,
              }}>
              <AlertTriangle size={14} />
              Permission critique : STOCK_SORTIE — accès aux sorties de stock
            </div>
          )}
        </SectionCard>
      </div>

      {/* ═══════════════════ SECTION C — Organisation & Équipe ═══════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* ── Équipe ── */}
        <SectionCard
          icon={Users}
          title="Équipe"
          action={
            <button
              onClick={() => setShowTeamManager((v) => !v)}
              title={showTeamManager ? "Fermer la gestion" : "Gérer l'équipe"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--border)",
                background: showTeamManager
                  ? "var(--color-primary-soft)"
                  : "transparent",
                color: showTeamManager
                  ? "var(--color-primary)"
                  : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all .15s",
              }}>
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
          {/* ── Vue lecture seule ── */}
          {!showTeamManager && (
            <>
              {activeTeam ? (
                <div style={{ paddingTop: 4 }}>
                  <div
                    style={{
                      background: "var(--color-primary-soft)",
                      borderRadius: "var(--r-sm)",
                      padding: "14px 16px",
                      marginBottom: 8,
                      border: "1px solid rgba(79,70,229,.1)",
                    }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}>
                        {activeTeam.equipe_libelle || "—"}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: "var(--status-green-bg)",
                          color: "var(--status-green-text)",
                          fontSize: 10,
                        }}>
                        <span
                          className="bdot"
                          style={{ background: "var(--status-green-dot)" }}
                        />
                        Active
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        fontSize: 12,
                        color: "var(--text-secondary)",
                      }}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}>
                        <Shield size={11} style={{ opacity: 0.6 }} />{" "}
                        {activeTeam.niveauRole}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}>
                        <Calendar size={11} style={{ opacity: 0.6 }} />{" "}
                        {formatDateShort(activeTeam.dateAdhesion)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="empty" style={{ padding: "24px 0" }}>
                  Aucune équipe active
                </p>
              )}

              {teamHistory.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 8,
                    }}>
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
                          <td style={{ fontSize: 13 }}>
                            {m.equipe_libelle || "—"}
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                background: "var(--status-gray-bg)",
                                color: "var(--status-gray-text)",
                                fontSize: 11,
                              }}>
                              {m.niveauRole}
                            </span>
                          </td>
                          <td>
                            <span
                              className="code-mono"
                              style={{ fontSize: 11 }}>
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

          {/* ── Panel gestion (toggle) ── */}
          {showTeamManager && (
            <TeamManager userId={id} onTeamChange={handleTeamChange} />
          )}
        </SectionCard>

        {/* ── Appartenance organisationnelle ── */}
        <SectionCard
          icon={Building2}
          title="Appartenance organisationnelle"
          action={
            <button
              onClick={() => setShowAppartenanceManager((v) => !v)}
              title={
                showAppartenanceManager
                  ? "Fermer la gestion"
                  : "Gérer les appartenances"
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--border)",
                background: showAppartenanceManager
                  ? "var(--color-primary-soft)"
                  : "transparent",
                color: showAppartenanceManager
                  ? "var(--color-primary)"
                  : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all .15s",
              }}>
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
          {/* ── Vue lecture seule ── */}
          {!showAppartenanceManager && (
            <>
              {primaryOrg ? (
                <div style={{ paddingTop: 8 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 10,
                    }}>
                    Rattachement principal
                  </div>
                  <div
                    style={{
                      background: "var(--bg-elevated)",
                      borderRadius: "var(--r-sm)",
                      padding: "12px 14px",
                      border: "1px solid var(--border-subtle)",
                    }}>
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
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "5px 0",
                            paddingLeft: i * 16,
                          }}>
                          {i > 0 && (
                            <ChevronRight
                              size={11}
                              style={{
                                color: "var(--text-muted)",
                                opacity: 0.5,
                              }}
                            />
                          )}
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--text-muted)",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              width: 52,
                              flexShrink: 0,
                            }}>
                            {item.label}
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: i === 0 ? 600 : 500,
                              color:
                                i === 0
                                  ? "var(--color-primary)"
                                  : "var(--text-primary)",
                            }}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="empty" style={{ padding: "24px 0" }}>
                  Aucun rattachement principal
                </p>
              )}

              {secondaryOrgs.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 8,
                    }}>
                    Rattachements secondaires
                  </div>
                  {secondaryOrgs.map((org) => (
                    <div
                      key={org.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 0",
                        borderBottom: "1px solid var(--border-subtle)",
                        flexWrap: "wrap",
                      }}>
                      <span
                        className="badge"
                        style={{
                          background: "var(--status-gray-bg)",
                          color: "var(--status-gray-text)",
                          fontSize: 10,
                          flexShrink: 0,
                        }}>
                        Secondaire
                      </span>
                      {[
                        org.societe_libelle,
                        org.site_libelle,
                        org.secteur_libelle,
                        org.unite_libelle,
                      ]
                        .filter(Boolean)
                        .map((label, i, arr) => (
                          <span
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}>
                            <span
                              style={{
                                fontSize: 12,
                                color: "var(--text-secondary)",
                              }}>
                              {label}
                            </span>
                            {i < arr.length - 1 && (
                              <ChevronRight
                                size={10}
                                style={{
                                  color: "var(--text-muted)",
                                  opacity: 0.4,
                                }}
                              />
                            )}
                          </span>
                        ))}
                    </div>
                  ))}
                </div>
              )}

              {!primaryOrg && secondaryOrgs.length === 0 && (
                <p className="empty" style={{ padding: "24px 0" }}>
                  Aucune appartenance organisationnelle
                </p>
              )}
            </>
          )}

          {/* ── Panel gestion (toggle) ── */}
          {showAppartenanceManager && (
            <AppartenanceManager
              userId={id}
              onAppartenanceChange={handleAppartenanceChange}
            />
          )}
        </SectionCard>
      </div>

      {/* ═══════════════════ SECTION D — Activité (Placeholders) ═══════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Interventions en cours */}
        <div className="tbl-card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "var(--status-blue-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
              <Wrench size={14} style={{ color: "var(--status-blue-text)" }} />
            </span>
            <span className="tbl-title" style={{ fontSize: 12 }}>
              Interventions en cours
            </span>
          </div>
          <div
            style={{
              padding: "32px 24px",
              textAlign: "center",
              background:
                "repeating-linear-gradient(45deg, transparent, transparent 10px, var(--bg-elevated) 10px, var(--bg-elevated) 11px)",
            }}>
            <div
              style={{
                background: "var(--bg-surface)",
                borderRadius: "var(--r-sm)",
                padding: "24px 20px",
                border: "1px dashed var(--border-subtle)",
              }}>
              <Wrench
                size={24}
                style={{
                  color: "var(--text-muted)",
                  margin: "0 auto 10px",
                  opacity: 0.5,
                }}
              />
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 12,
                  lineHeight: 1.5,
                }}>
                Les Ordres de Travail assignés à cet utilisateur seront affichés
                ici.
              </p>
              <span
                className="badge"
                style={{
                  background: "var(--status-blue-bg)",
                  color: "var(--status-blue-text)",
                  fontSize: 11,
                }}>
                Phase 6 — Interventions — Bientôt disponible
              </span>
            </div>
          </div>
        </div>

        {/* Historique des Signalements */}
        <div className="tbl-card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "var(--status-orange-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
              <AlertTriangle
                size={14}
                style={{ color: "var(--status-orange-text)" }}
              />
            </span>
            <span className="tbl-title" style={{ fontSize: 12 }}>
              Historique des Signalements
            </span>
          </div>
          <div
            style={{
              padding: "32px 24px",
              textAlign: "center",
              background:
                "repeating-linear-gradient(45deg, transparent, transparent 10px, var(--bg-elevated) 10px, var(--bg-elevated) 11px)",
            }}>
            <div
              style={{
                background: "var(--bg-surface)",
                borderRadius: "var(--r-sm)",
                padding: "24px 20px",
                border: "1px dashed var(--border-subtle)",
              }}>
              <AlertTriangle
                size={24}
                style={{
                  color: "var(--text-muted)",
                  margin: "0 auto 10px",
                  opacity: 0.5,
                }}
              />
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 12,
                  lineHeight: 1.5,
                }}>
                Les Demandes d'Intervention soumises par cet utilisateur seront
                affichées ici.
              </p>
              <span
                className="badge"
                style={{
                  background: "var(--status-orange-bg)",
                  color: "var(--status-orange-text)",
                  fontSize: 11,
                }}>
                Phase 7 — Notifications — Bientôt disponible
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } }
      `}</style>
    </div>
  );
}
