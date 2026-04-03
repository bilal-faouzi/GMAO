import api from './api';

// ── Actifs ──────────────────────────────────────────────
export const getActifs = (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return api.get(`/v1/actifs/actifs/${params ? '?' + params : ''}`);
};

export const getActif = (id) =>
    api.get(`/v1/actifs/actifs/${id}/`);

export const createActif = (data) =>
    api.post('/v1/actifs/actifs/', data);

export const updateActif = (id, data) =>
    api.put(`/v1/actifs/actifs/${id}/`, data);

export const patchActif = (id, data) =>
    api.patch(`/v1/actifs/actifs/${id}/`, data);

export const deleteActif = (id) =>
    api.delete(`/v1/actifs/actifs/${id}/`);

export const changerStatut = (id, nouveauStatut, motif = '') =>
    api.post(`/v1/actifs/actifs/${id}/changer_statut/`, { nouveauStatut, motif });

export const getDashboard = () =>
    api.get('/v1/actifs/actifs/dashboard/');

// ── Historique statut ────────────────────────────────────
export const getHistoriqueStatut = (idActif) =>
    api.get(`/v1/actifs/historiques/?idActif=${idActif}`);

// ── Indisponibilités ─────────────────────────────────────
export const getIndisponibilites = (idActif) =>
    api.get(`/v1/actifs/indisponibilites/?idActif=${idActif}`);

export const createIndisponibilite = (data) =>
    api.post('/v1/actifs/indisponibilites/', data);

export const updateIndisponibilite = (id, data) =>
    api.put(`/v1/actifs/indisponibilites/${id}/`, data);

export const deleteIndisponibilite = (id) =>
    api.delete(`/v1/actifs/indisponibilites/${id}/`);

// ── Remplacements ────────────────────────────────────────
export const getRemplacements = (idActif) =>
    api.get(`/v1/actifs/remplacements/?actifOriginal=${idActif}`);

export const createRemplacement = (data) =>
    api.post('/v1/actifs/remplacements/', data);

export const deleteRemplacement = (id) =>
    api.delete(`/v1/actifs/remplacements/${id}/`);