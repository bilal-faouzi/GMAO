/**
 * Service pour récupérer des fichiers médias avec authentification JWT
 * Utilise axios plutôt que fetch pour bénéficier:
 * - De l'injection automatique du token Bearer
 * - Du refresh automatique si le token expire
 * - De la gestion CORS correcte
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "";

/**
 * Récupère un fichier média avec authentification et le retourne sous forme de Blob URL
 * @param {string} url - L'URL relative du fichier (ex: /media/demandes_intervention/.../file.mp3)
 * @returns {Promise<{blobUrl: string, mimeType: string}>} URL de blob et type MIME
 */
export async function fetchAuthenticatedBlob(url) {
  if (!url) {
    throw new Error("URL du fichier manquante");
  }

  // Construire l'URL complète si nécessaire
  const urlToFetch = url.startsWith("http")
    ? url
    : `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;

  console.log("[blobService] Chargement fichier:", {
    originalUrl: url,
    baseUrl: BASE_URL,
    fullUrl: urlToFetch,
    timestamp: new Date().toISOString(),
  });

  try {
    // Récupérer le token
    const token = localStorage.getItem("access_token");

    if (!token) {
      console.warn("[blobService] ⚠️ Pas de token trouvé dans localStorage");
    }

    // Configuration des headers
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    console.log("[blobService] Headers envoyés:", {
      hasAuth: !!headers.Authorization,
      authLength: headers.Authorization?.length || 0,
    });

    // Faire la requête
    const response = await axios.get(urlToFetch, {
      headers,
      responseType: "blob",
      timeout: 30000, // 30 secondes timeout
    });

    console.log("[blobService] ✅ Réponse reçue:", {
      status: response.status,
      contentType: response.headers["content-type"],
      size: response.data.size,
      type: response.data.type,
    });

    // Récupérer le type MIME depuis les headers ou le blob
    const mimeType =
      response.headers["content-type"] ||
      response.data.type ||
      "application/octet-stream";

    // Vérifier que nous avons bien du contenu
    if (response.data.size === 0) {
      throw new Error(`Fichier vide reçu pour: ${url}`);
    }

    // Vérifier que le blob a un type MIME valide
    if (!mimeType || mimeType === "application/octet-stream") {
      console.warn(
        "[blobService] ⚠️ Type MIME inconnu, le fichier pourrait ne pas jouer",
      );
    }

    // Créer une URL de blob valide
    const blobUrl = URL.createObjectURL(response.data);

    console.log("[blobService] ✅ Blob URL créé:", {
      blobUrl: blobUrl.substring(0, 50) + "...",
      mimeType,
    });

    return { blobUrl, mimeType };
  } catch (error) {
    // Améliorer le message d'erreur
    let errorMsg = `Impossible de charger le fichier: ${url}`;
    let debugInfo = {
      originalUrl: url,
      fullUrl: urlToFetch,
      timestamp: new Date().toISOString(),
    };

    if (error.response?.status === 401) {
      errorMsg = "Session expirée. Veuillez vous reconnecter.";
      debugInfo.status = 401;
    } else if (error.response?.status === 403) {
      errorMsg = "Vous n'avez pas la permission d'accéder à ce fichier.";
      debugInfo.status = 403;
    } else if (error.response?.status === 404) {
      errorMsg = "Fichier non trouvé sur le serveur.";
      debugInfo.status = 404;
    } else if (
      error.code === "ERR_NETWORK" ||
      error.message.includes("Network Error")
    ) {
      errorMsg = "Erreur réseau. Vérifiez que le backend est accessible.";
      debugInfo.networkError = true;
    } else if (error.code === "ECONNABORTED") {
      errorMsg =
        "Délai d'attente dépassé. Le fichier prend trop de temps à charger.";
      debugInfo.timeout = true;
    }

    console.error("[blobService] ❌ Erreur:", errorMsg, {
      ...debugInfo,
      errorCode: error.code,
      errorMessage: error.message,
      responseStatus: error.response?.status,
      responseStatusText: error.response?.statusText,
    });

    throw new Error(errorMsg);
  }
}

/**
 * Nettoie une URL de blob pour libérer la mémoire
 * @param {string} blobUrl - L'URL de blob créée par fetchAuthenticatedBlob
 */
export function revokeBlobUrl(blobUrl) {
  if (blobUrl) {
    try {
      URL.revokeObjectURL(blobUrl);
      console.log(
        "[blobService] 🗑️ Blob URL libéré:",
        blobUrl.substring(0, 50) + "...",
      );
    } catch (err) {
      console.warn(
        "[blobService] ⚠️ Erreur en libérant blob URL:",
        err.message,
      );
    }
  }
}
