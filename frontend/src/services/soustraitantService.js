import api from "./api";

// ─── Sous-Traitants ──────────────────────────────────────────────────────────

export const getSousTraitants = (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  return api.get(`/v1/soustraitants/${params ? "?" + params : ""}`);
};

export const getSousTraitant = (id) => api.get(`/v1/soustraitants/${id}/`);

export const createSousTraitant = (data) =>
  api.post("/v1/soustraitants/", data);

export const updateSousTraitant = (id, data) =>
  api.put(`/v1/soustraitants/${id}/`, data);

export const deleteSousTraitant = (id) =>
  api.delete(`/v1/soustraitants/${id}/`);

// ─── Spécialités ─────────────────────────────────────────────────────────────

export const assignerSpecialite = (id, idSpecialite) =>
  api.post(`/v1/soustraitants/${id}/specialites/`, { idSpecialite });

export const retirerSpecialite = (id, idSpecialite) =>
  api.delete(`/v1/soustraitants/${id}/specialites/${idSpecialite}/`);

// ─── Actions ─────────────────────────────────────────────────────────────────

export const changerStatut = (id, statut) =>
  api.post(`/v1/soustraitants/${id}/changer_statut/`, { statut });

export const getDashboardSousTraitants = () =>
  api.get("/v1/soustraitants/?limit=1000");
