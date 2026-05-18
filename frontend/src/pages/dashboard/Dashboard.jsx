import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

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

// ─── Remplace useParams par useAuthStore ───────────────────────────────────────
import useAuthStore from "@/store/authStore";

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

// ─── InfoRow ───────────────────────────────────────────────────────────────────

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

// ─── SectionCard ───────────────────────────────────────────────────────────────

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
    if (playing) {
      el.pause();
    } else {
      el.play().catch(() => setError(true));
    }
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
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

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
          className="outline-none focus:outline-none"
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
            transition: "background 0.2s, transform 0.1s",
            background: error
              ? "var(--status-red-bg)"
              : playing
                ? "var(--color-primary)"
                : "var(--primary-soft)",
            color: playing ? "#fff" : "var(--color-primary)",
          }}
          title={playing ? "Pause" : "Lire"}>
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
            className="outline-none focus:outline-none"
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
                width: `${progress}%`,
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
              fontVariantNumeric: "tabular-nums",
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
          title="Télécharger"
          style={{
            color: "var(--text-muted)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            transition: "color 0.15s",
          }}
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
          className="text-text-muted hover:text-primary ml-2 shrink-0"
          title="Télécharger">
          <Download size={12} />
        </a>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function Dasshboard() {
  const navigate = useNavigate();

  // ✅ Récupère l'utilisateur connecté depuis le store Zustand
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

  const loadData = async () => {
    // Sécurité : si l'id n'est pas encore disponible, on attend
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
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

  const handleValiderDI = async (di) => {
    setValidatingDI(di.id);
    setDemandesIntervention((prev) => prev.filter((d) => d.id !== di.id));

    try {
      const res = await validerDemande(di.id);
      const ot = res.data;

      await affecterEquipe(ot.id, {
        idChefTechnicien: id,
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

  // ✅ useEffect déclenché dès que l'id est disponible
  useEffect(() => {
    if (id) loadData();
  }, [id]);

  // ─── Handlers managers ────────────────────────────────────────────────────

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

  // ─── Rendu : ID non disponible ────────────────────────────────────────────

  if (!id) {
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
  }

  // ─── Rendu : chargement ───────────────────────────────────────────────────

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

  // ─── Rendu : erreur ───────────────────────────────────────────────────────

  if (error) {
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
  }

  // ─── Rendu : utilisateur introuvable ──────────────────────────────────────

  if (!user) {
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

  // ─── Rendu principal ──────────────────────────────────────────────────────

  return (
    <div className="page">
      <div className="hdr">
        <div className="hdr-l flex items-center gap-2.5">
          {/* ✅ Pas de bouton retour vers /utilisateurs — c'est le profil propre */}
          <h1>Mon profil</h1>
        </div>
      </div>

      {!user.est_actif && (
        <div className="bg-status-red-bg text-status-red-text p-3 rounded-sm text-xs flex items-center gap-2.5 font-medium border border-red-200/15">
          <Lock size={15} />
          Ce compte utilisateur est désactivé. L'accès au système est bloqué.
        </div>
      )}

      {/* ── HERO CARD ─────────────────────────────────────────────────────── */}
      <div className="tbl-card p-7 flex gap-6 items-center relative overflow-hidden">
        <div
          className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--r)] ${
            user.est_actif
              ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--status-green-dot)]"
              : "bg-gradient-to-r from-[var(--status-red-dot)] to-[var(--status-orange-dot)]"
          }`}
        />

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

      {/* ── SECTION B — Sécurité & Accès ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
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
                  <div className="flex flex-wrap gap-2">
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

      {/* ── SECTION C — Organisation & Équipe ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <SectionCard
          icon={Users}
          title="Équipe"
          action={
            <button
              onClick={() => setShowTeamManager((v) => !v)}
              className={`flex items-center gap-1.25 text-[10px] font-semibold px-2.5 py-1 rounded-sm border transition-all ${
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
                <div className="pt-1">
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
                    <div className="flex gap-4 text-xs text-text-secondary">
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
                <div className="mt-3.5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
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
                            <span className="code-mono text-[10px]">
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

      {/* ── SECTION D — Activité ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* DIs en attente */}
        <SectionCard
          icon={FileText}
          title="Demandes en attente"
          action={
            <span className="badge bg-[var(--status-yellow-bg)] text-[var(--status-yellow-text)] text-[10px]">
              {
                demandesIntervention.filter((d) => d.statut === "en_attente")
                  .length
              }
            </span>
          }>
          {demandesIntervention.filter((d) => d.statut === "en_attente")
            .length === 0 ? (
            <div className="p-8 text-center">
              <FileText
                size={24}
                className="text-text-muted mx-auto mb-2.5 opacity-40"
              />
              <p className="text-xs text-text-muted">
                Aucune demande en attente
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {demandesIntervention
                .filter((d) => d.statut === "en_attente")
                .map((di) => {
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
                      className="flex items-start gap-3 p-4 cursor-pointer hover:bg-[var(--bg-elevated)] transition"
                      onClick={() => {
                        setSelectedDI(di);
                        setShowDIDialog(true);
                      }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-text-primary code-mono">
                            {di.numero}
                          </span>
                          <span
                            className="badge text-[10px]"
                            style={{
                              background: urgenceCfg.bg,
                              color: urgenceCfg.text,
                            }}>
                            <span
                              className="bdot"
                              style={{ background: urgenceCfg.dot }}
                            />
                            {di.urgence}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary line-clamp-2 mb-1">
                          {di.description}
                          {di.nb_pieces_jointes > 0 && (
                            <span className="ml-2 text-[10px]">
                              ({di.nb_pieces_jointes} pièce(s))
                            </span>
                          )}
                        </p>
                      </div>

                      <button
                        className="btn btn-primary text-[11px] px-2.5 py-1.5 shrink-0 flex items-center gap-1.5"
                        disabled={isValidating}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleValiderDI(di);
                        }}>
                        {isValidating ? (
                          <span className="opacity-70">Validation...</span>
                        ) : (
                          <>
                            <CheckCircle size={12} /> Participer
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </SectionCard>

        {/* OTs assignés */}
        <SectionCard
          icon={Wrench}
          title="OTs assignés"
          action={
            <span className="badge bg-[var(--bg-elevated)] text-[var(--text-muted)] text-[10px]">
              {affectations.length}
            </span>
          }>
          {affectations.length === 0 ? (
            <div className="p-8 text-center">
              <Wrench
                size={24}
                className="text-text-muted mx-auto mb-2.5 opacity-40"
              />
              <p className="text-xs text-text-muted">Aucun OT assigné</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>OT</th>
                  <th>Statut OT</th>
                  <th>Début</th>
                </tr>
              </thead>
              <tbody>
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
                    <tr
                      key={aff.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate(`/ordres/ots/${aff.idOrdreTravail}`)
                      }>
                      <td>
                        <span className="code-mono text-xs font-semibold text-text-primary">
                          {aff.ot_numero || aff.idOrdreTravail}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge text-[10px]"
                          style={{
                            background: statutCfg.bg,
                            color: statutCfg.text,
                          }}>
                          {aff.statut?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="text-[10px] text-text-muted">
                        {aff.dateDebut
                          ? new Intl.DateTimeFormat("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }).format(new Date(aff.dateDebut))
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      <DIDetailDialog
        di={selectedDI}
        open={showDIDialog}
        onOpenChange={setShowDIDialog}
      />
    </div>
  );
}
