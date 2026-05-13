import api from "./api";

//  Demandes d'Intervention 
export const getDemandes = (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  return api.get(`/v1/ordres/demandes/${params ? "?" + params : ""}`);
};

export const getDemande = (id) => api.get(`/v1/ordres/demandes/${id}/`);

export const createDemande = (data) => api.post("/v1/ordres/demandes/", data);

export const validerDemande = (id) =>
  api.post(`/v1/ordres/demandes/${id}/valider/`);

export const rejeterDemande = (id, motif) =>
  api.post(`/v1/ordres/demandes/${id}/rejeter/`, { motif });

//  Ordres de Travail 
export const getOTs = (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  return api.get(`/v1/ordres/ots/${params ? "?" + params : ""}`);
};

export const getOT = (id) => api.get(`/v1/ordres/ots/${id}/`);

export const createOT = (data) => api.post("/v1/ordres/ots/", data);

export const updateOT = (id, data) => api.put(`/v1/ordres/ots/${id}/`, data);

export const deleteOT = (id) => api.delete(`/v1/ordres/ots/${id}/`);

export const changerStatutOT = (id, statut, motif = "", typeCloture = "") =>
  api.post(`/v1/ordres/ots/${id}/changer_statut/`, {
    statut,
    motif,
    typeCloture,
  });

export const affecterEquipe = (id, data) =>
  api.post(`/v1/ordres/ots/${id}/affecter_equipe/`, data);

export const getMembresEquipe = (equipeId) =>
  api.get(`/v1/organisation/equipe-utilisateurs/?equipe=${equipeId}`);

export const enregistrerPiece = (id, idPiece, quantite) =>
  api.post(`/v1/ordres/ots/${id}/enregistrer_piece/`, { idPiece, quantite });

export const enregistrerPieces = (id, pieces, idTechnicien = null) =>
  api.post(`/v1/ordres/ots/${id}/enregistrer_pieces/`, { pieces, idTechnicien });

export const ajouterCommentaire = (id, commentaire, estInterne = false) =>
  api.post(`/v1/ordres/ots/${id}/ajouter_commentaire/`, {
    commentaire,
    estInterne,
  });

export const cloturerOT = (id) => api.post(`/v1/ordres/ots/${id}/cloturer/`);

export const validerOT = (id, isValide, motif) =>
  api.post(`/v1/ordres/ots/${id}/valider/`, { isValide, motif });

export const changerActifOT = (id, idActif) =>
  api.post(`/v1/ordres/ots/${id}/changer_actif/`, { idActif });

export const enregistrerActifsCorriges = (id, actifs) =>
  api.post(`/v1/ordres/ots/${id}/enregistrer_actifs_corriges/`, { actifs });

export const getDashboardOT = () => api.get("/v1/ordres/ots/dashboard/");

//  Données secondaires 
export const getAffectations = (idOT) =>
  api.get(`/v1/ordres/affectations/?idOrdreTravail=${idOT}`);

export const deleteAffectation = (id) =>
  api.delete(`/v1/ordres/affectations/${id}/`);

export const updateAffectation = (id, data) =>
  api.post(`/v1/ordres/affectations/${id}/modifier/`, data);

export const getSuiviTemps = (idOT) =>
  api.get(`/v1/ordres/suivitemps/?idOrdreTravail=${idOT}`);

export const getCommentaires = (idOT, estInterne = null) => {
  const params =
    estInterne !== null
      ? `?idOrdreTravail=${idOT}&estInterne=${estInterne}`
      : `?idOrdreTravail=${idOT}`;
  return api.get(`/v1/ordres/commentaires/${params}`);
};

export const getHistoriqueOT = (idOT) =>
  api.get(`/v1/ordres/historiques/?idOrdreTravail=${idOT}`);

export const getAffectationsByChef = (userId) =>
  api.get(`/v1/ordres/affectations/?idChefTechnicien=${userId}`);
