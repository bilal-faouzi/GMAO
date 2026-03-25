import api from "./api";

// ─── Utilisateurs ───────────────────────────────────────────────
export const getUtilisateurs = (params = {}) =>
  api.get("/auth/utilisateurs/", { params });
export const createUtilisateur = (data) =>
  api.post("/auth/utilisateurs/", data);
export const getUtilisateur = (userId) =>
  api.get(`/auth/utilisateurs/${userId}/`);
export const updateUtilisateur = (userId, data) =>
  api.put(`/auth/utilisateurs/${userId}/`, data);
export const deleteUtilisateur = (userId) =>
  api.delete(`/auth/utilisateurs/${userId}/`);
export const assignRoleToUser = (userId, data) =>
  api.post(`/auth/utilisateurs/${userId}/roles/`, data);
export const removeRoleFromUser = (userId, { id_role: roleId }) =>
  api.delete(`/auth/utilisateurs/${userId}/roles/`, {
    data: { id_role: roleId },
  });

// ─── Roles ──────────────────────────────────────────────────────
export const getRoles = (params = {}) => api.get("/auth/roles/", { params });
export const createRole = (data) => api.post("/auth/roles/", data);
export const getRole = (roleId) => api.get(`/auth/roles/${roleId}/`);
export const updateRole = (roleId, data) =>
  api.put(`/auth/roles/${roleId}/`, data);
export const deleteRole = (roleId) => api.delete(`/auth/roles/${roleId}/`);
export const assignPermissionToRole = (roleId, data) =>
  api.post(`/auth/roles/${roleId}/permissions/`, data);

// ─── Permissions ────────────────────────────────────────────────
export const getPermissions = (params = {}) =>
  api.get("/auth/permissions/", { params });
export const createPermission = (data) => api.post("/auth/permissions/", data);

export const deletePermissionfromRole = (roleId, { id_permission: permId }) =>
  api.delete(`/auth/roles/${roleId}/permissions/`, {
    data: { id_permission: permId },
  });

// ─── Sessions ───────────────────────────────────────────────────
export const getSessions = (params = {}) =>
  api.get("/auth/sessions/", { params });

export const forcedLogout = (session_id) =>
  api.delete(`/auth/sessions/${session_id}/logout/`);

// ─── Journal d'audit ────────────────────────────────────────────
export const getJournalAudits = (params = {}) =>
  api.get("/auth/journal-audits/", { params });
export const getJournalAuditv2 = (params = {}) =>
  api.get("/auth/journal-audits/v2/", { params });
