import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  getRoles,
  assignRoleToUser,
  removeRoleFromUser,
} from "@/services/securiteService";
import { getUserRolesAndPermissions } from "@/services/userDetailService";
import { Switch } from "@/components/ui/switch";

const ROLE_COLORS = [
  {
    bg: "bg-[var(--status-blue-bg)]",
    text: "text-[var(--status-blue-text)]",
    dot: "bg-[var(--status-blue-dot)]",
    border: "border-[var(--status-blue-dot)]",
  },
  {
    bg: "bg-[var(--status-purple-bg)]",
    text: "text-[var(--status-purple-text)]",
    dot: "bg-[var(--status-purple-dot)]",
    border: "border-[var(--status-purple-dot)]",
  },
  {
    bg: "bg-[var(--status-cyan-bg)]",
    text: "text-[var(--status-cyan-text)]",
    dot: "bg-[var(--status-cyan-dot)]",
    border: "border-[var(--status-cyan-dot)]",
  },
  {
    bg: "bg-[var(--status-orange-bg)]",
    text: "text-[var(--status-orange-text)]",
    dot: "bg-[var(--status-orange-dot)]",
    border: "border-[var(--status-orange-dot)]",
  },
  {
    bg: "bg-[var(--status-green-bg)]",
    text: "text-[var(--status-green-text)]",
    dot: "bg-[var(--status-green-dot)]",
    border: "border-[var(--status-green-dot)]",
  },
];

/**
 * RoleManager
 * -----------
 * Props:
 *   userId        {string|number}  — ID de l'utilisateur ciblé
 *   onRolesChange {Function}       — callback appelé après chaque changement
 */
export function RoleManager({ userId, onRolesChange }) {
  const [assignedRoles, setAssignedRoles] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState(null);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [rolesData, allRes] = await Promise.all([
        getUserRolesAndPermissions(userId),
        getRoles(),
      ]);
      setAssignedRoles(rolesData.roles || []);
      const list = Array.isArray(allRes.data)
        ? allRes.data
        : allRes.data.results || [];
      setAllRoles(list);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les rôles.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (role) => {
    if (pendingId === role.id) return; // déjà en cours
    const isActive = assignedRoles.some((r) => r.id === role.id);
    setPendingId(role.id);
    setError(null);

    // Optimistic update
    const updated = isActive
      ? assignedRoles.filter((r) => r.id !== role.id)
      : [...assignedRoles, role];
    setAssignedRoles(updated);
    onRolesChange?.(updated);

    try {
      if (isActive) {
        await removeRoleFromUser(userId, { id_role: role.id });
      } else {
        await assignRoleToUser(userId, { id_role: role.id });
      }
    } catch (e) {
      console.error(e);
      // Rollback
      const rolled = isActive
        ? [...updated, role]
        : updated.filter((r) => r.id !== role.id);
      setAssignedRoles(rolled);
      onRolesChange?.(rolled);
      setError(
        isActive
          ? "Échec de la suppression du rôle."
          : "Échec de l'assignation du rôle.",
      );
    } finally {
      setPendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-text-muted text-xs">
        <Loader2 size={13} className="animate-spin" />
        Chargement des rôles…
      </div>
    );
  }

  // Assignés en premier, puis les autres
  const sorted = [
    ...allRoles.filter((r) => assignedRoles.some((ar) => ar.id === r.id)),
    ...allRoles.filter((r) => !assignedRoles.some((ar) => ar.id === r.id)),
  ];

  // Couleur stable par index dans la liste assignée
  const colorMap = {};
  assignedRoles.forEach((r, i) => {
    colorMap[r.id] = ROLE_COLORS[i % ROLE_COLORS.length];
  });

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-[var(--status-red-bg)] text-[var(--status-red-text)] border border-red-200/10">
          <AlertTriangle size={12} />
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {sorted.map((role) => {
          const isActive = assignedRoles.some((r) => r.id === role.id);
          const isPending = pendingId === role.id;
          const c = isActive ? colorMap[role.id] : null;
          const disabled = !role.est_actif || isPending;

          return (
            <button
              key={role.id}
              type="button"
              disabled={disabled}
              onClick={() => handleToggle(role)}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-lg border
                text-left transition-all duration-150
                ${
                  isActive
                    ? `${c.bg} ${c.border} border`
                    : "bg-transparent border-border border-dashed hover:border-border-subtle"
                }
                ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
              `}>
              <div className="flex items-center gap-2 min-w-0">
                {/* Dot indicateur */}
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                    isActive ? c.dot : "bg-text-muted opacity-40"
                  }`}
                />

                {/* Libellé */}
                <span
                  className={`text-[11px] font-medium truncate transition-colors ${
                    isActive ? c.text : "text-text-muted"
                  }`}>
                  {role.libelle}
                </span>

                {/* Code */}
                <span className="code-mono text-[9px] opacity-50 shrink-0">
                  {role.code}
                </span>

                {/* Niveau si assigné */}
                {isActive && role.niveau && (
                  <span className={`text-[9px] opacity-60 shrink-0 ${c.text}`}>
                    N{role.niveau}
                  </span>
                )}
              </div>

              {/* Switch ou spinner — pointer-events:none car le clic est géré par le bouton parent */}
              <div
                className="shrink-0 ml-3 flex items-center"
                onClick={(e) => e.stopPropagation()}>
                {isPending ? (
                  <Loader2 size={13} className="animate-spin text-text-muted" />
                ) : (
                  <Switch
                    checked={isActive}
                    disabled={disabled}
                    onCheckedChange={() => handleToggle(role)}
                  />
                )}
              </div>
            </button>
          );
        })}

        {sorted.length === 0 && (
          <p className="text-xs text-text-muted italic py-3 text-center">
            Aucun rôle disponible.
          </p>
        )}
      </div>
    </div>
  );
}
