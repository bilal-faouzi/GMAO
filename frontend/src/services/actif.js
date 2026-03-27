import api from "./api";

// ─── Actifs ─────────────────────────────────────────────────────
export const getActifs = (params = {}) => api.get("/actifs/", { params });

export const createActif = (data) => api.post("/actifs/", data);

export const getActif = (actifId) => api.get(`/actifs/${actifId}/`);

export const updateActif = (actifId, data) =>
  api.put(`/actifs/${actifId}/`, data);

export const patchActif = (actifId, data) =>
  api.patch(`/actifs/${actifId}/`, data);

export const deleteActif = (actifId) => api.delete(`/actifs/${actifId}/`);

// ─── Actions métier ─────────────────────────────────────────────
export const changerStatutActif = (actifId, nouveauStatut) =>
  api.post(`/actifs/${actifId}/changer-statut/`, { nouveauStatut });

export const getEnfantsActif = (actifId, params = {}) =>
  api.get(`/actifs/${actifId}/enfants/`, { params });

export const getHistoriqueActif = (actifId, params = {}) =>
  api.get(`/actifs/${actifId}/historique/`, { params });

export const getArborescenceActifs = (params = {}) =>
  api.get("/actifs/arborescence/", { params });

// ─── Historique statuts ─────────────────────────────────────────
export const getHistoriqueStatuts = (params = {}) =>
  api.get("/historique-statuts/", { params });

export const getHistoriqueStatut = (historiqueId) =>
  api.get(`/historique-statuts/${historiqueId}/`);
