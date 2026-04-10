import api from './api'

// ─── Societes ────────────────────────────────────────────────────────────────
export const getSocietes = (params = {}) =>
  api.get('/v1/organisation/societes/', { params })

export const getSociete = (id) =>
  api.get(`/v1/organisation/societes/${id}/`)

export const createSociete = (data) =>
  api.post('/v1/organisation/societes/', data)

export const updateSociete = (id, data) =>
  api.patch(`/v1/organisation/societes/${id}/`, data)

export const deleteSociete = (id) =>
  api.delete(`/v1/organisation/societes/${id}/`)

export const getArborescence = (id) =>
  api.get(`/v1/organisation/societes/${id}/arborescence/`)

// ─── Sites ───────────────────────────────────────────────────────────────────
export const getSites = (params = {}) =>
  api.get('/v1/organisation/sites/', { params })

export const createSite = (data) =>
  api.post('/v1/organisation/sites/', data)

export const updateSite = (id, data) =>
  api.patch(`/v1/organisation/sites/${id}/`, data)

export const deleteSite = (id) =>
  api.delete(`/v1/organisation/sites/${id}/`)

// ─── Secteurs ────────────────────────────────────────────────────────────────
export const getSecteurs = (params = {}) =>
  api.get('/v1/organisation/secteurs/', { params })

export const createSecteur = (data) =>
  api.post('/v1/organisation/secteurs/', data)

export const updateSecteur = (id, data) =>
  api.patch(`/v1/organisation/secteurs/${id}/`, data)

// ─── Unites ──────────────────────────────────────────────────────────────────
export const getUnites = (params = {}) =>
  api.get('/v1/organisation/unites/', { params })

export const createUnite = (data) =>
  api.post('/v1/organisation/unites/', data)

export const updateUnite = (id, data) =>
  api.patch(`/v1/organisation/unites/${id}/`, data)

// ─── Specialites ─────────────────────────────────────────────────────────────
export const getSpecialites = () =>
  api.get('/v1/organisation/specialites/')

// ─── Equipes ─────────────────────────────────────────────────────────────────


export const createEquipe = (data) =>
  api.post('/v1/organisation/equipes/', data)

export const updateEquipe = (id, data) =>
  api.patch(`/v1/organisation/equipes/${id}/`, data)

export const deleteEquipe = (id) =>
  api.delete(`/v1/organisation/equipes/${id}/`)

// ─── Membres equipe ───────────────────────────────────────────────────────────
export const getMembres = (equipeId) =>
  api.get('/v1/organisation/equipe-utilisateurs/', { params: { equipe: equipeId } })

export const addMembre = (data) =>
  api.post('/v1/organisation/equipe-utilisateurs/', data)

export const updateMembre = (id, data) =>
  api.patch(`/v1/organisation/equipe-utilisateurs/${id}/`, data)

export const removeMembre = (id) =>
  api.delete(`/v1/organisation/equipe-utilisateurs/${id}/`)

// ─── Appartenances ───────────────────────────────────────────────────────────
export const getAppartenances = (params = {}) =>
  api.get('/v1/organisation/appartenances/', { params })

export const createAppartenance = (data) =>
  api.post('/v1/organisation/appartenances/', data)

export const updateAppartenance = (id, data) =>
  api.patch(`/v1/organisation/appartenances/${id}/`, data)

export const deleteAppartenance = (id) =>
  api.delete(`/v1/organisation/appartenances/${id}/`)
export const updateSpecialite = (id, data) =>
  api.patch(`/v1/organisation/specialites/${id}/`, data)

export const createSpecialite = (data) =>
  api.post('/v1/organisation/specialites/', data)
// Dans src/services/organisationService.js
export const getEquipes = (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return api.get(`/v1/organisation/equipes/${params ? '?' + params : ''}`);
};