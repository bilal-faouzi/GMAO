/**
 * Script de test pour valider le chargement des fichiers médias avec authentification
 * À lancer dans la console du navigateur dans une page affichant une demande d'intervention
 *
 * Usage: Copiez-collez ce code dans la console du navigateur
 */

// ─── Test 1: Vérifier que le token existe ───────────────────────────────────
console.log("=== TEST 1: Vérifier le token ===");
const token = localStorage.getItem("access_token");
if (!token) {
  console.error("❌ Token manquant ! Vous n'êtes pas authentifié.");
} else {
  console.log("✅ Token trouvé");
  const parts = token.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1]));
      console.log(
        "✅ Token valide. Utilisateur:",
        payload.username,
        "Session:",
        payload.session_id?.substring(0, 8) + "...",
      );
      const exp = new Date(payload.exp * 1000);
      console.log("⏱️  Expiration:", exp.toLocaleString());
    } catch (e) {
      console.error("❌ Erreur de parsing du token");
    }
  }
}

// ─── Test 2: Simuler un fetch authentifié ───────────────────────────────────
console.log("\n=== TEST 2: Simuler un fetch authentifié ===");
const testUrl = "/media/demandes_intervention/test.mp3"; // À adapter avec une vrai URL
console.log("URL test:", testUrl);

fetch(testUrl, {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  method: "HEAD",
})
  .then((res) => {
    console.log("✅ Réponse HTTP:", res.status, res.statusText);
    console.log("   Content-Type:", res.headers.get("content-type"));
    console.log(
      "   Content-Length:",
      res.headers.get("content-length"),
      "bytes",
    );
  })
  .catch((err) => {
    console.error("❌ Erreur fetch:", err.message);
  });

// ─── Test 3: Chercher les fichiers médias en page ───────────────────────────
console.log("\n=== TEST 3: Fichiers médias trouvés en page ===");
const audios = document.querySelectorAll("audio");
const videos = document.querySelectorAll("video");
const images = document.querySelectorAll(
  'img[alt*="fichier"], img[alt*="file"]',
);

console.log(`🎵 Audios: ${audios.length}`);
audios.forEach((a, i) => {
  console.log(`   [${i}] src="${a.src.substring(0, 80)}..."`);
  console.log(
    `       src vide: ${!a.src}, loading: ${a.buffered.length === 0}`,
  );
});

console.log(`🎬 Vidéos: ${videos.length}`);
videos.forEach((v, i) => {
  console.log(`   [${i}] src="${v.src.substring(0, 80)}..."`);
  console.log(
    `       src vide: ${!v.src}, loading: ${v.buffered.length === 0}`,
  );
});

console.log(`🖼️  Images: ${images.length}`);

// ─── Test 4: Chercher les erreurs de chargement ──────────────────────────────
console.log("\n=== TEST 4: Messages d'erreur ===");
const errorMsgs = document.querySelectorAll(
  '[class*="error"], [class*="danger"]',
);
console.log(`Messages d'erreur trouvés: ${errorMsgs.length}`);
errorMsgs.forEach((el, i) => {
  if (
    el.textContent.toLowerCase().includes("fichier") ||
    el.textContent.toLowerCase().includes("erreur")
  ) {
    console.log(`   [${i}] "${el.textContent}"`);
  }
});

// ─── Test 5: Vérifier les logs du service ───────────────────────────────────
console.log("\n=== TEST 5: Logs du service blobService ===");
console.log("Ouvrez l'onglet Console pour voir les logs [blobService]");
console.log(
  "En cas d'erreur, vous devriez voir un log [blobService] avec détails",
);

// ─── Résumé ──────────────────────────────────────────────────────────────────
console.log("\n=== RÉSUMÉ ===");
console.log(
  "✅ Si tout est vert, le chargement des médias devrait fonctionner",
);
console.log("❌ Si du rouge, voir les détails ci-dessus");
console.log("\nDébugage avancé: ");
console.log("  - Vérifier l'onglet Network pour les statuts HTTP");
console.log("  - Chercher les erreurs CORS");
console.log("  - Vérifier que file.url = /media/demandes_intervention/...");
