import api from './api';

// ── Pièces ───────────────────────────────────────────────
export const getPieces = (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return api.get(`/v1/magasin/pieces/${params ? '?' + params : ''}`);
};

export const getPiece = (id) =>
    api.get(`/v1/magasin/pieces/${id}/`);

export const createPiece = (data) =>
    api.post('/v1/magasin/pieces/', data);

export const updatePiece = (id, data) =>
    api.put(`/v1/magasin/pieces/${id}/`, data);

export const patchPiece = (id, data) =>
    api.patch(`/v1/magasin/pieces/${id}/`, data);

export const deletePiece = (id) =>
    api.delete(`/v1/magasin/pieces/${id}/`);

// ── Actions stock ────────────────────────────────────────
export const sortiePiece = (id, quantite, commentaire = '', idOrdreTravail = '') =>
    api.post(`/v1/magasin/pieces/${id}/sortie/`, { quantite, commentaire, idOrdreTravail });

export const entreePiece = (id, quantite, commentaire = '') =>
    api.post(`/v1/magasin/pieces/${id}/entree/`, { quantite, commentaire });

// ── Alertes & Dashboard ──────────────────────────────────
export const getAlertes = () =>
    api.get('/v1/magasin/pieces/alertes/');

export const getDashboardMagasin = () =>
    api.get('/v1/magasin/pieces/dashboard/');

// ── Mouvements ───────────────────────────────────────────
export const getMouvements = (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return api.get(`/v1/magasin/mouvements/${params ? '?' + params : ''}`);
};

export const getMouvementsByPiece = (idPiece) =>
    api.get(`/v1/magasin/mouvements/?idPiece=${idPiece}`);