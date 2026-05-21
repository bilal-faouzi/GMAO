import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  getDemandes,
  validerDemande,
  affecterEquipe,
  getAffectationsByChef,
} from "@/services/ordreService";
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
  CheckCircle,
  FileText,
  Play,
  Pause,
  Download,
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
import DIDetailDialog from "@/components/DIDetailDialog";

// ─── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || "";

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

function getFileUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
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

function BentoHeader({ icon: Icon, title, action }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
      <span className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-[var(--primary-soft)]">
        {Icon && <Icon size={12} style={{ color: "var(--color-primary)" }} />}
      </span>
      <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider flex-1">
        {title}
      </span>
      {action}
    </div>
  );
}

// ─── GererButton ───────────────────────────────────────────────────────────────

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

// ─── AudioPlayer ───────────────────────────────────────────────────────────────

function AudioPlayer({ file }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const url = getFileUrl(file.url);

  const toggle = () => {
    const el = audioRef.current;
    if (!el || error) return;
    if (playing) el.pause();
    else el.play().catch(() => setError(true));
  };

  const handleSeek = (e) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    el.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60)
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "border-color 0.2s",
        ...(playing && { borderColor: "var(--color-primary)" }),
      }}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => setError(true)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        style={{ display: "none" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={toggle}
          disabled={error}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            cursor: error ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            background: error
              ? "var(--status-red-bg)"
              : playing
                ? "var(--color-primary)"
                : "var(--primary-soft)",
            color: playing ? "#fff" : "var(--color-primary)",
          }}>
          {playing ? (
            <Pause size={14} />
          ) : (
            <Play size={14} style={{ marginLeft: 2 }} />
          )}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: "0 0 5px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
            {file.nomFichier}
          </p>
          <div
            onClick={handleSeek}
            style={{
              height: 4,
              borderRadius: 4,
              background: "var(--border-subtle)",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
            }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                background: error
                  ? "var(--status-red-dot)"
                  : "var(--color-primary)",
                borderRadius: 4,
                transition: "width 0.1s linear",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
              fontSize: 10,
              color: "var(--text-muted)",
            }}>
            {error ? (
              <span style={{ color: "var(--status-red-text)" }}>
                Impossible de charger l'audio
              </span>
            ) : (
              <>
                <span>{fmt(currentTime)}</span>
                <span>{fmt(duration)}</span>
              </>
            )}
          </div>
        </div>
        <a
          href={url}
          download
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--text-muted)", flexShrink: 0, display: "flex" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--color-primary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-muted)")
          }>
          <Download size={13} />
        </a>
      </div>
    </div>
  );
}

// ─── ImageViewer ───────────────────────────────────────────────────────────────

function ImageViewer({ file }) {
  const url = getFileUrl(file.url);
  const [error, setError] = useState(false);
  return (
    <div className="border border-border-subtle rounded-sm overflow-hidden">
      {error ? (
        <div className="p-4 text-center bg-[var(--bg-elevated)]">
          <AlertTriangle
            size={20}
            className="mx-auto mb-1 text-[var(--status-red-text)]"
          />
          <p className="text-[10px] text-text-muted">Image non disponible</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary underline mt-1 block">
            Ouvrir le lien
          </a>
        </div>
      ) : (
        <div className="relative group">
          <img
            src={url}
            alt={file.nomFichier}
            className="w-full max-h-56 object-contain bg-[var(--bg-elevated)]"
            onError={() => setError(true)}
          />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition opacity-0 group-hover:opacity-100">
            <span className="bg-black/70 text-white text-[10px] px-2 py-1 rounded">
              Ouvrir en plein écran
            </span>
          </a>
        </div>
      )}
      <div className="px-2 py-1.5 flex items-center justify-between border-t border-border-subtle bg-[var(--bg-elevated)]">
        <p className="text-[10px] text-text-muted truncate flex-1">
          {file.nomFichier}
        </p>
        <a
          href={url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-primary ml-2 shrink-0">
          <Download size={12} />
        </a>
      </div>
    </div>
  );
}

// ─── PermissionsCard ───────────────────────────────────────────────────────────
// Pleine largeur. Grille de modules auto-adaptée (1→4 colonnes selon le nombre).
// Pills ultra-compactes : action + ressource uniquement.

function PermissionsCard({ permissionsByModule, hasStockSortie }) {
  const modules = Object.entries(permissionsByModule);

  // Colonnes adaptatives : 1-2 → égal au nombre; 3-4 → 2 col; 5-6 → 3 col; 7 → 4 col
  const colCount =
    modules.length <= 2
      ? modules.length
      : modules.length <= 4
        ? 2
        : modules.length <= 6
          ? 3
          : 4;

  return (
    <BentoCard>
      <BentoHeader
        icon={Lock}
        title="Permissions par module"
        action={
          hasStockSortie && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded bg-[var(--status-orange-bg)] text-[var(--status-orange-text)] border border-orange-200/20">
              <AlertTriangle size={10} /> STOCK_SORTIE critique
            </span>
          )
        }
      />

      {modules.length === 0 ? (
        <p className="empty py-4 text-xs">Aucune permission</p>
      ) : (
        <div
          className="pt-1"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
            gap: "14px 24px",
          }}>
          {modules.map(([mod, perms]) => (
            <div key={mod} className="flex flex-col gap-1.5 min-w-0">
              {/* En-tête module */}
              <div className="flex items-center gap-1.5">
                <span
                  className="shrink-0 rounded-full bg-primary"
                  style={{ width: 3, height: 12 }}
                />
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest truncate">
                  {mod}
                </span>
                <span className="text-[9px] text-text-muted opacity-40 shrink-0 ml-auto">
                  {perms.length}
                </span>
              </div>

              {/* Pills */}
              <div className="flex flex-wrap gap-1">
                {perms
                  .filter(
                    (p, idx, arr) =>
                      arr.findIndex(
                        (x) =>
                          x.action === p.action && x.ressource === p.ressource,
                      ) === idx,
                  )
                  .map((p) => {
                    const isCritical = p.code?.includes("STOCK_SORTIE");
                    return (
                      <span
                        key={`${p.id}-${p.role_code}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: 10,
                          fontWeight: isCritical ? 600 : 400,
                          padding: "2px 7px",
                          borderRadius: 4,
                          whiteSpace: "nowrap",
                          background: isCritical
                            ? "var(--status-orange-bg)"
                            : "var(--bg-elevated)",
                          color: isCritical
                            ? "var(--status-orange-text)"
                            : "var(--text-secondary)",
                          border: isCritical
                            ? "1px solid color-mix(in srgb, var(--status-orange-dot) 20%, transparent)"
                            : "1px solid var(--border-subtle)",
                        }}>
                        {isCritical && <AlertTriangle size={8} />}
                        {p.action} {p.ressource}
                      </span>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </BentoCard>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

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

  const [demandesIntervention, setDemandesIntervention] = useState([]);
  const [validatingDI, setValidatingDI] = useState(null);
  const [affectations, setAffectations] = useState([]);

  const [selectedDI, setSelectedDI] = useState(null);
  const [showDIDialog, setShowDIDialog] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────────────────────

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

  const loadData = async () => {
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

  const refreshData = async () => {
    try {
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

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

  const handleValiderDI = async (di) => {
    setValidatingDI(di.id);
    setDemandesIntervention((prev) => prev.filter((d) => d.id !== di.id));
    try {
      const res = await validerDemande(di.id);
      const ot = res.data;
      await affecterEquipe(ot.id, {
        idChefTechnicien: user.utilisateur_id || id,
      });
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

  // ─── Guards ───────────────────────────────────────────────────────────────

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
          <div className="skeleton w-18 h-18 rounded-2xl shrink-0" />
          <div className="flex-1 flex flex-col gap-2.5">
            <div className="skeleton w-2/5 h-4.5" />
            <div className="skeleton w-1/4 h-3.5" />
            <div className="flex gap-2">
              <div className="skeleton w-15 h-5.5 rounded-full" />
              <div className="skeleton w-17.5 h-5.5 rounded-full" />
            </div>
          </div>
        </div>
        {/* Permissions skeleton pleine largeur */}
        <div className="tbl-card p-5">
          <div className="skeleton w-40 h-3 mb-5" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="skeleton w-20 h-2.5" />
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: 3 + i }).map((_, j) => (
                    <div
                      key={j}
                      className="skeleton h-5 rounded"
                      style={{ width: `${40 + j * 10}px` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Grille inférieure skeleton */}
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
          {[1, 2, 3, 4, 5].map((i) => (
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
  }

  if (error) {
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l">
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => navigate("/utilisateurs")}>
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
              onClick={() => navigate("/utilisateurs")}>
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

  // ─── Rendu ────────────────────────────────────────────────────────────────

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
        <div className="bg-status-red-bg text-status-red-text p-3 rounded-sm text-xs flex items-center gap-2.5 font-medium border border-red-200/15 mb-4">
          <Lock size={15} />
          Ce compte utilisateur est désactivé. L'accès au système est bloqué.
        </div>
      )}

      {/* ══ 1. HERO — pleine largeur ══════════════════════════════════════════ */}
      <div className="tbl-card relative overflow-hidden mb-4">
        <div
          className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--r)] ${user.est_actif ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--status-green-dot)]" : "bg-gradient-to-r from-[var(--status-red-dot)] to-[var(--status-orange-dot)]"}`}
        />
        <div className="flex gap-6 items-center p-6">
          {/* Avatar */}
          <div
            className={`w-[68px] h-[68px] rounded-2xl shrink-0 flex items-center justify-center shadow-[0_6px_20px_rgba(79,70,229,0.20)] ${user.est_actif ? "bg-gradient-to-br from-[var(--color-primary)] to-[#818cf8]" : "bg-gradient-to-br from-[var(--status-gray-dot)] to-[var(--text-muted)]"}`}>
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

          {/* Meta */}
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
              {[
                { val: roles.length, label: "Rôles" },
                { val: pendingDIs.length, label: "DIs" },
                { val: affectations.length, label: "OTs" },
              ].map(({ val, label }) => (
                <div key={label} className="text-center">
                  <div className="text-base font-bold text-text-primary leading-none">
                    {val}
                  </div>
                  <div className="text-[9px] text-text-muted mt-0.5">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 2. PERMISSIONS — pleine largeur, grille adaptive ══════════════════ */}
      <div className="mb-4">
        <PermissionsCard
          permissionsByModule={permissionsByModule}
          hasStockSortie={hasStockSortie}
        />
      </div>

      {/* ══ 3. GRID PROFIL ═══════════════════════════════════════════════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr 1fr",
          gap: 16,
          alignItems: "start",
        }}>
        {/* ── Rôles ───────────────────────────────────────────── */}
        <BentoCard className="h-full">
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
            roles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Shield size={22} className="text-text-muted opacity-30" />
                <p className="text-xs text-text-muted">Aucun rôle attribué</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                {roles.map((r, i) => {
                  const c = ROLE_COLORS[i % ROLE_COLORS.length];

                  return (
                    <div
                      key={r.id}
                      className={`group relative overflow-hidden rounded-xl border px-4 py-3 transition-all duration-200 hover:translate-y-[-1px] hover:shadow-md ${c.bg} ${c.activeBorder}`}>
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`}
                        />

                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${c.text}`}>
                            {r.libelle}
                          </p>

                          <p className="text-[10px] text-text-muted mt-0.5">
                            {NIVEAU_LABELS[r.niveau] || `Niveau ${r.niveau}`}
                          </p>
                        </div>

                        <span className="code-mono text-[10px] opacity-60">
                          {r.code}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <RoleManager userId={id} onRolesChange={handleRolesChange} />
          )}
        </BentoCard>

        {/* ── Équipe ─────────────────────────────────────────── */}
        <BentoCard className="h-full">
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
                <div className="relative overflow-hidden rounded-xl border border-border-subtle bg-[var(--bg-elevated)] p-4">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--color-primary)]" />

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {activeTeam.equipe_libelle || "—"}
                      </p>

                      <p className="text-[11px] text-text-muted mt-1">
                        {activeTeam.niveauRole}
                      </p>
                    </div>

                    <span className="badge bg-[var(--status-green-bg)] text-[var(--status-green-text)] text-[10px]">
                      <span className="bdot bg-[var(--status-green-dot)]" />
                      Active
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-text-muted">
                    <Calendar size={11} />
                    <span>
                      Depuis {formatDateShort(activeTeam.dateAdhesion)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Users size={22} className="text-text-muted opacity-30" />
                  <p className="text-xs text-text-muted">
                    Aucune équipe active
                  </p>
                </div>
              )}

              {teamHistory.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                    Historique
                  </p>

                  <div className="flex flex-col gap-2">
                    {teamHistory.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2 bg-[var(--bg-elevated)]">
                        <span className="text-xs text-text-secondary truncate">
                          {m.equipe_libelle || "—"}
                        </span>

                        <span className="code-mono text-[10px] text-text-muted">
                          {formatDateShort(m.dateAdhesion)}
                        </span>
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

        {/* ── Organisation ───────────────────────────────────── */}
        <BentoCard className="h-full">
          <BentoHeader
            icon={Building2}
            title="Organisation"
            action={
              <GererButton
                open={showAppartenanceManager}
                onClick={() => setShowAppartenanceManager((v) => !v)}
              />
            }
          />

          {!showAppartenanceManager ? (
            <div className="flex flex-col gap-3">
              {primaryOrg ? (
                <div className="rounded-xl border border-border-subtle bg-[var(--bg-elevated)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-border-subtle bg-[var(--primary-soft)]">
                    <p className="text-xs font-semibold text-primary">
                      Organisation principale
                    </p>
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    {[
                      {
                        label: "Société",
                        value: primaryOrg.societe_libelle,
                      },
                      {
                        label: "Site",
                        value: primaryOrg.site_libelle,
                      },
                      {
                        label: "Secteur",
                        value: primaryOrg.secteur_libelle,
                      },
                      {
                        label: "Unité",
                        value: primaryOrg.unite_libelle,
                      },
                    ]
                      .filter((i) => i.value)
                      .map((item) => (
                        <div key={item.label} className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-wider text-text-muted">
                            {item.label}
                          </span>

                          <span className="text-xs font-medium text-text-primary">
                            {item.value}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Building2 size={22} className="text-text-muted opacity-30" />
                  <p className="text-xs text-text-muted">Aucun rattachement</p>
                </div>
              )}
            </div>
          ) : (
            <AppartenanceManager
              userId={id}
              onAppartenanceChange={handleAppartenanceChange}
            />
          )}
        </BentoCard>
      </div>

      <DIDetailDialog
        di={selectedDI}
        open={showDIDialog}
        onOpenChange={setShowDIDialog}
      />
    </div>
  );
}
