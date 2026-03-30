import api from "./api";

// ─── Actifs ─────────────────────────────────────────────────────
export const getActifs = (params = {}) => api.get("/v1/actifs/", { params });

export const createActif = (data) => api.post("/v1/actifs/", data);

export const getActif = (actifId) => api.get(`/v1/actifs/${actifId}/`);

export const updateActif = (actifId, data) =>
  api.put(`/v1/actifs/${actifId}/`, data);

export const patchActif = (actifId, data) =>
  api.patch(`/v1/actifs/${actifId}/`, data);

export const deleteActif = (actifId) => api.delete(`/v1/actifs/${actifId}/`);

// ─── Actions métier ─────────────────────────────────────────────
export const changerStatutActif = (actifId, nouveauStatut) =>
  api.post(`/v1/actifs/${actifId}/changer-statut/`, { nouveauStatut });

export const getEnfantsActif = (actifId, params = {}) =>
  api.get(`/v1/actifs/${actifId}/enfants/`, { params });

export const getHistoriqueActif = (actifId, params = {}) =>
  api.get(`/v1/actifs/${actifId}/historique/`, { params });

export const getArborescenc = (params = {}) =>
  api.get("/v1/actifs/arborescence/", { params });

// ─── Historique statuts ─────────────────────────────────────────
export const getHistoriqueStatuts = (params = {}) =>
  api.get("/v1/historique-statuts/", { params });

export const getHistoriqueStatut = (historiqueId) =>
  api.get(`/v1/historique-statuts/${historiqueId}/`);
