import { useState, useEffect, useCallback } from "react";
import { Plus, X, Shield, Loader2, AlertTriangle } from "lucide-react";
import {
  getRoles,
  assignRoleToUser,
  removeRoleFromUser,
} from "@/services/securiteService";
import { getUserRolesAndPermissions } from "@/services/userDetailService";
import { Button } from "@/components/ui/button";

/**
 * RoleManager
 * -----------
 * Props:
 *   userId  {string|number}  — ID de l'utilisateur ciblé
 *   onRolesChange {Function} — callback optionnel appelé après chaque changement
 *                              avec la liste mise à jour des rôles
 */
export function RoleManager({ userId, onRolesChange }) {
  const [assignedRoles, setAssignedRoles] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingAdd, setPendingAdd] = useState(null);
  const [pendingRemove, setPendingRemove] = useState(null);
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

  const handleAssign = async (role) => {
    setPendingAdd(role.id);
    setError(null);
    try {
      await assignRoleToUser(userId, { id_role: role.id });
      const updated = [...assignedRoles, role];
      setAssignedRoles(updated);
      onRolesChange?.(updated);
    } catch (e) {
      console.error(e);
      setError("Échec de l'assignation du rôle.");
    } finally {
      setPendingAdd(null);
    }
  };

  const handleRemove = async (roleId) => {
    setPendingRemove(roleId);
    setError(null);
    try {
      await removeRoleFromUser(userId, { id_role: roleId });
      const updated = assignedRoles.filter((r) => r.id !== roleId);
      setAssignedRoles(updated);
      onRolesChange?.(updated);
    } catch (e) {
      console.error(e);
      setError("Échec de la suppression du rôle.");
    } finally {
      setPendingRemove(null);
    }
  };

  const availableRoles = allRoles.filter(
    (r) => !assignedRoles.find((ar) => ar.id === r.id),
  );

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "24px 0",
          color: "var(--text-muted)",
          fontSize: 13,
        }}>
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
        Chargement des rôles…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && (
        <div
          style={{
            background: "var(--status-red-bg)",
            color: "var(--status-red-text)",
            borderRadius: "var(--r-sm)",
            padding: "10px 14px",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid rgba(239,68,68,.12)",
          }}>
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {/* ── Rôles assignés ── */}
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 8,
          }}>
          Rôles assignés
        </p>

        {assignedRoles.length === 0 ? (
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              fontStyle: "italic",
              padding: "8px 0",
            }}>
            Aucun rôle assigné
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {assignedRoles.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: "var(--bg-surface)",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border-subtle)",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Shield
                    size={13}
                    style={{ color: "var(--color-primary)", opacity: 0.8 }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "var(--status-blue-bg, rgba(59,130,246,.1))",
                      color: "var(--status-blue-text, #2563eb)",
                    }}>
                    {r.code}
                  </span>
                  {r.libelle && (
                    <span
                      style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {r.libelle}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  disabled={pendingRemove === r.id}
                  onClick={() => handleRemove(r.id)}
                  title="Retirer ce rôle"
                  style={{ padding: "4px 8px", height: "auto" }}
                  className="text-text-muted hover:text-danger transition-colors">
                  {pendingRemove === r.id ? (
                    <Loader2
                      size={13}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <X size={13} />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Rôles disponibles ── */}
      {availableRoles.length > 0 && (
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}>
            Assigner un rôle
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {availableRoles.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                  opacity: r.est_actif ? 1 : 0.45,
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: r.est_actif
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                      textDecoration: r.est_actif ? "none" : "line-through",
                    }}>
                    {r.code}
                  </span>
                  {r.libelle && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        textDecoration: r.est_actif ? "none" : "line-through",
                      }}>
                      {r.libelle}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  disabled={!r.est_actif || pendingAdd === r.id}
                  onClick={() => handleAssign(r)}
                  title="Assigner ce rôle"
                  style={{ padding: "4px 8px", height: "auto" }}
                  className="text-green-600 hover:text-green-700 transition-colors disabled:text-text-muted">
                  {pendingAdd === r.id ? (
                    <Loader2
                      size={13}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <Plus size={13} />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {availableRoles.length === 0 && assignedRoles.length > 0 && (
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            fontStyle: "italic",
          }}>
          Tous les rôles disponibles sont déjà assignés.
        </p>
      )}
    </div>
  );
}
