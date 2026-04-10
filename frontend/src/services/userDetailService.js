import api from "./api";

// ─── Utilisateur (infos de base) ────────────────────────────────
export const getUserById = (id) => api.get(`/auth/utilisateurs/${id}/`);

// ─── Rôles & Permissions (via UtilisateurRole → Role → Permission) ──
export const getUserRolesAndPermissions = (userId) =>
  api.get(`/auth/utilisateurs/${userId}/`).then((res) => {
    const roles = res.data.roles || [];
    const permissionsByModule = {};
    roles.forEach((role) => {
      (role.permissions || []).forEach((perm) => {
        const mod = perm.module || "AUTRE";
        if (!permissionsByModule[mod]) permissionsByModule[mod] = [];
        permissionsByModule[mod].push({
          ...perm,
          role_code: role.code,
          role_libelle: role.libelle,
        });
      });
    });
    return { roles, permissionsByModule };
  });

// ─── Session active ─────────────────────────────────────────────
export const getUserActiveSessions = (userId) =>
  api.get("/auth/sessions/", { params: { id_utilisateur: userId } });

// ─── Équipe (membre actif + historique) ─────────────────────────
export const getUserTeam = (userId) =>
  api.get("/v1/organisation/equipe-utilisateurs/", {
    params: { utilisateur: userId },
  });

// ─── Équipe détail (pour récupérer spécialité et chef) ─────────
export const getEquipeDetail = (equipeId) =>
  api.get(`/v1/organisation/equipes/`, { params: { id: equipeId } });

// ─── Appartenance organisationnelle ─────────────────────────────
export const getUserOrganisation = (userId) =>
  api.get("/v1/organisation/appartenances/", {
    params: { utilisateur: userId },
  });
