import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  getDemandes,
  validerDemande,
  affecterEquipe,
  getAffectationsByChef,
} from "@/services/ordreService";
import {
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
  CheckCircle,
  FileText,
  MapPin,
  ArrowRight,
} from "lucide-react";
import {
  getUserById,
  getUserRolesAndPermissions, // ← Importation restaurée ici
  getUserActiveSessions,
  getUserTeam,
  getUserOrganisation,
} from "../../services/userDetailService";
import DIDetailDialog from "@/components/DIDetailDialog";
import useAuthStore from "@/store/authStore";

// ─── Config & Thématisation COULEURS ──────────────────────────────────────────

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

const URGENCE_MAP = {
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
};

const STATUT_OT_MAP = {
  rejeter: { bg: "var(--status-red-bg)", text: "var(--status-red-text)" },
  en_attente: {
    bg: "var(--status-yellow-bg)",
    text: "var(--status-yellow-text)",
  },
  en_cours: {
    bg: "var(--status-orange-bg)",
    text: "var(--status-orange-text)",
  },
  termine: { bg: "var(--status-green-bg)", text: "var(--status-green-text)" },
};

// ─── Helpers Dates ───────────────────────────────────────────────────────────

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

// ─── Composants de Structure (Bento UI) ───────────────────────────────────────

function BentoCard({ children, className = "" }) {
  return (
    <div
      className={`tbl-card p-6 flex flex-col gap-4 border border-border-subtle hover:border-border transition-all duration-200 ${className}`}>
      {children}
    </div>
  );
}

// Modifier le composant BentoHeader pour retirer 'counter' et utiliser une icône plus adaptée
function BentoHeader({ icon: Icon, title, totalCount }) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
      <div className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[var(--primary-soft)]">
          {Icon && <Icon size={14} className="text-[var(--color-primary)]" />}
        </span>
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider m-0">
          {title}
        </h3>
      </div>
      {totalCount !== undefined && (
        <span className="badge bg-[var(--bg-elevated)] text-text-secondary font-semibold text-[11px] px-2.5 py-0.5 rounded-full border border-border-subtle">
          {totalCount}
        </span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const id = authUser?.id;

  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [teamMemberships, setTeamMemberships] = useState([]);
  const [appartenances, setAppartenances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [demandesIntervention, setDemandesIntervention] = useState([]);
  const [validatingDI, setValidatingDI] = useState(null);
  const [affectations, setAffectations] = useState([]);

  const [selectedDI, setSelectedDI] = useState(null);
  const [showDIDialog, setShowDIDialog] = useState(false);

  // ─── Chargement des Données ────────────────────────────────────────────────

  const loadData = async () => {
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
      setRoles(rolesData.roles || []);
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
    } catch (e) {
      console.error(e);
      if (e.response?.status === 404) setUser(null);
      else setError("Impossible de charger les données du tableau de bord.");
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

      const activeTeam = teamMemberships.find((m) => m.estActif);

      if (!activeTeam) {
        throw new Error("Aucune équipe active trouvée.");
      }

      const payload = {
        idEquipe: activeTeam.equipe,

        // utilisateur connecté comme membre
        membres: [id],

        idChefTechnicien: id,
      };

      console.log("PAYLOAD", payload);

      await affecterEquipe(ot.id, payload);

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

  // ─── Guards & Skeletons ────────────────────────────────────────────────────

  if (!id) {
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l">
            <h1>Mon profil</h1>
          </div>
        </div>
        <div className="bg-status-red-bg text-status-red-text p-4 rounded-sm text-xs border border-red-200/10">
          Impossible de récupérer votre session. Veuillez vous reconnecter.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page animate-pulse">
        <div className="hdr">
          <div className="skeleton w-36 h-6 rounded" />
        </div>
        <div className="tbl-card p-6 flex gap-6 items-center mb-6">
          <div className="skeleton w-16 h-16 rounded-2xl shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="skeleton w-1/4 h-5" />
            <div className="skeleton w-1/3 h-3" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="skeleton h-64 rounded-xl lg:col-span-2" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="page">
        <div className="hdr">
          <div className="hdr-l">
            <h1>Tableau de bord</h1>
          </div>
        </div>
        <div className="bg-status-red-bg text-status-red-text p-5 rounded-sm text-xs flex items-center justify-between border border-red-200/10">
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} />
            <span>{error || "Utilisateur introuvable."}</span>
          </div>
          {error && (
            <button
              className="btn btn-primary text-xs px-4 py-2"
              onClick={loadData}>
              Réessayer
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Computed Properties ───────────────────────────────────────────────────

  const activeTeam = teamMemberships.find((m) => m.estActif);
  const primaryOrg = appartenances.find((a) => a.estPrincipale);
  const initials =
    `${(user.prenom || "?")[0]}${(user.nom || "?")[0]}`.toUpperCase();
  const pendingDIs = demandesIntervention.filter(
    (d) => d.statut === "en_attente",
  );

  return (
    <div className="page">
      {/* HEADER DE PAGE */}
      <div className="hdr">
        <div className="hdr-l flex items-center gap-2.5">
          <h1>Tableau de bord</h1>
        </div>
      </div>

      {/* ALERT COMPTE DÉSACTIVÉ */}
      {!user.est_actif && (
        <div className="bg-status-red-bg text-status-red-text p-3 rounded-lg text-xs flex items-center gap-2.5 font-medium border border-red-200/15 mb-4">
          <Lock size={15} />
          Ce compte utilisateur est désactivé. L'accès au système est restreint.
        </div>
      )}

      {/* ════ HERO CARD PROFIL ════════════════════════════════════════════════ */}
      <div className="tbl-card relative overflow-hidden mb-6 bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-base)]">
        <div
          className={`absolute top-0 left-0 right-0 h-[4px] ${user.est_actif ? "bg-[var(--color-primary)]" : "bg-[var(--status-red-dot)]"}`}
        />

        <div className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          {/* Section Identité principale */}
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center shadow-lg text-white font-bold text-xl bg-gradient-to-br from-[var(--color-primary)] to-[#818cf8]">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-1">
                <h2 className="text-xl font-bold tracking-tight text-text-primary m-0">
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
                    className={`bdot ${isOnline ? "bg-[var(--status-green-dot)] animate-pulse" : "bg-[var(--status-gray-dot)]"}`}
                  />
                  {isOnline ? "En ligne" : "Hors ligne"}
                </span>
              </div>
              <div className="flex items-center gap-4 flex-wrap text-xs text-text-secondary">
                <span className="code-mono opacity-80">
                  @{user.nom_utilisateur}
                </span>
                <span className="flex items-center gap-1">
                  <Mail size={12} className="opacity-60" /> {user.email}
                </span>
              </div>
            </div>
          </div>

          {/* Section Rôles Intégrés */}
          <div className="flex flex-col gap-1.5 md:items-end w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-border-subtle">
            <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
              Rôles système
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {roles.map((r, i) => {
                const c = ROLE_COLORS[i % ROLE_COLORS.length];
                return (
                  <span
                    key={r.id}
                    className={`badge ${c.bg} ${c.text} text-[10px] font-medium`}>
                    <span className={`bdot ${c.dot}`} /> {r.libelle}
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
        </div>

        {/* Informations Équipe & Organisation Intégrées */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-[var(--bg-elevated)] border-t border-border-subtle text-xs">
          {/* Bloc Équipe Active */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-base)] border border-border-subtle">
            <div className="p-2 rounded-lg bg-[var(--primary-soft)] text-[var(--color-primary)] mt-0.5">
              <Users size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">
                Équipe assignée
              </div>
              {activeTeam ? (
                <div>
                  <div className="font-semibold text-text-primary text-sm truncate">
                    {activeTeam.equipe_libelle}
                  </div>
                  <div className="text-text-secondary text-[11px] mt-0.5 flex items-center gap-3">
                    <span>
                      Rôle :{" "}
                      <strong>{activeTeam.niveauRole || "Technicien"}</strong>
                    </span>
                    <span className="text-text-muted opacity-50">•</span>
                    <span>
                      Depuis le {formatDateShort(activeTeam.dateAdhesion)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-text-muted italic mt-0.5">
                  Aucune équipe active
                </div>
              )}
            </div>
          </div>

          {/* Bloc Structure Organisationnelle */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-base)] border border-border-subtle">
            <div className="p-2 rounded-lg bg-[var(--primary-soft)] text-[var(--color-primary)] mt-0.5">
              <Building2 size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">
                Rattachement Structurel
              </div>
              {primaryOrg ? (
                <div className="flex items-center gap-1 text-xs font-medium text-text-primary mt-1 flex-wrap">
                  <span className="text-[var(--color-primary)] font-bold">
                    {primaryOrg.societe_libelle}
                  </span>
                  <ChevronRight
                    size={12}
                    className="text-text-muted opacity-40 shrink-0"
                  />
                  <span className="flex items-center gap-1 text-text-secondary">
                    <MapPin size={11} className="opacity-60" />{" "}
                    {primaryOrg.site_libelle}
                  </span>
                  {primaryOrg.secteur_libelle && (
                    <>
                      <ChevronRight
                        size={12}
                        className="text-text-muted opacity-40 shrink-0"
                      />
                      <span className="text-text-muted">
                        {primaryOrg.secteur_libelle}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-text-muted italic mt-0.5">
                  Aucun rattachement principal
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Métadonnées compact */}
        <div className="px-6 py-2.5 bg-[var(--bg-base)] border-t border-border-subtle flex flex-wrap justify-between gap-4 text-[11px] text-text-muted">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock size={12} /> Connexion :{" "}
              {user.derniere_connexion
                ? formatDate(user.derniere_connexion)
                : "Jamais"}
            </span>
            {user.derniere_connexion_ip && (
              <span className="flex items-center gap-1">
                <Globe size={12} /> IP :{" "}
                <span className="code-mono">{user.derniere_connexion_ip}</span>
              </span>
            )}
          </div>
          <span className="flex items-center gap-1">
            <Calendar size={12} /> Membre depuis le{" "}
            {formatDateShort(user.date_creation)}
          </span>
        </div>
      </div>

      {/* ════ BENTO GRID OPÉRATIONNELLE : DIs & OTs ═════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* COLONNE INTERVENTIONS EN ATTENTE */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <BentoCard>
            <BentoHeader
              icon={FileText}
              title="Demandes d'intervention en attente"
              totalCount={pendingDIs.length}
            />

            {pendingDIs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 bg-[var(--bg-elevated)]/30 rounded-xl border border-dashed border-border-subtle">
                <FileText size={28} className="text-text-muted opacity-25" />
                <p className="text-xs text-text-muted font-medium">
                  Aucune demande en attente de validation
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                {pendingDIs.map((di) => {
                  const cfg = URGENCE_MAP[di.urgence] || URGENCE_MAP.normale;
                  const isValidating = validatingDI === di.id;

                  return (
                    <div
                      key={di.id}
                      onClick={() => {
                        setSelectedDI(di);
                        setShowDIDialog(true);
                      }}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border-subtle bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/70 hover:border-[var(--color-primary)]/30 transition-all duration-150 cursor-pointer">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                          style={{
                            background: cfg.dot,
                            boxShadow: `0 0 0 3px ${cfg.bg}`,
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="code-mono text-xs font-bold text-text-primary group-hover:text-[var(--color-primary)] transition-colors">
                              {di.numero}
                            </span>
                            <span
                              className="badge text-[10px] uppercase font-semibold px-2 py-0.5 rounded"
                              style={{ background: cfg.bg, color: cfg.text }}>
                              {di.urgence}
                            </span>
                            {di.nb_pieces_jointes > 0 && (
                              <span className="text-[10px] text-text-muted bg-[var(--bg-base)] border border-border-subtle px-1.5 py-0.5 rounded">
                                {di.nb_pieces_jointes} doc(s)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary line-clamp-2 m-0 pr-2">
                            {di.description}
                          </p>
                        </div>
                      </div>

                      <button
                        disabled={isValidating}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleValiderDI(di);
                        }}
                        className="btn btn-primary text-[11px] font-semibold px-3 py-2 shrink-0 self-end sm:self-center flex items-center gap-2 shadow-sm">
                        {isValidating ? (
                          <span className="opacity-70">Traitement...</span>
                        ) : (
                          <>
                            <CheckCircle size={12} /> Prendre en charge
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </BentoCard>
        </div>

        {/* COLONNE ORDRES DE TRAVAIL ASSIGNÉS */}
        <div className="flex flex-col gap-4">
          <BentoCard>
            <BentoHeader
              icon={Wrench}
              title="Mes ordres de travail"
              totalCount={affectations.length}
            />

            {affectations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 bg-[var(--bg-elevated)]/30 rounded-xl border border-dashed border-border-subtle">
                <Wrench size={26} className="text-text-muted opacity-25" />
                <p className="text-xs text-text-muted font-medium">
                  Aucun ordre de travail en cours
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto">
                {affectations.map((aff) => {
                  const tokenStatut = STATUT_OT_MAP[aff.statut] || {
                    bg: "var(--bg-elevated)",
                    text: "var(--text-muted)",
                  };

                  return (
                    <div
                      key={aff.id}
                      onClick={() =>
                        navigate(`/ordres/ots/${aff.idOrdreTravail}`)
                      }
                      className="group p-3.5 rounded-xl border border-border-subtle bg-[var(--bg-elevated)] hover:border-[var(--color-primary)]/30 transition-all duration-150 cursor-pointer flex flex-col gap-3 justify-between">
                      <div className="flex justify-between items-start gap-2">
                        <span className="code-mono text-xs font-bold text-text-primary group-hover:text-[var(--color-primary)] transition-colors">
                          {aff.ot_numero || `#${aff.idOrdreTravail}`}
                        </span>
                        <span
                          className="badge text-[10px] font-semibold uppercase px-2 py-0.5 rounded"
                          style={{
                            background: tokenStatut.bg,
                            color: tokenStatut.text,
                          }}>
                          {aff.statut?.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-text-muted pt-1 border-t border-border-subtle/40">
                        <span className="font-medium">
                          Démarré le :{" "}
                          {aff.dateDebut
                            ? new Intl.DateTimeFormat("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                              }).format(new Date(aff.dateDebut))
                            : "—"}
                        </span>
                        <span className="text-[var(--color-primary)] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                          Ouvrir <ArrowRight size={10} />
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

      {/* DIALOG DETAILS DI */}
      <DIDetailDialog
        di={selectedDI}
        open={showDIDialog}
        onOpenChange={setShowDIDialog}
      />
    </div>
  );
}
