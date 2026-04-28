import { useState, useEffect } from "react";
import { getPieces, getAlertes } from "../../services/magasinService";
import { getOTs } from "../../services/ordreService";
import { enregistrerPiece } from "../../services/ordreService";

const STATUTS_ACTIFS = [, "EN_COURS", "DEPANNE"];

export default function InterfaceMagasinier() {
  const [ots, setOTs] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulaire sortie
  const [otSelectionne, setOtSelectionne] = useState("");
  const [otSearch, setOtSearch] = useState("");
  const [pieceSelectionnee, setPieceSelectionnee] = useState(null);
  const [pieceSearch, setPieceSearch] = useState("");
  const [quantite, setQuantite] = useState("");
  const [technicien, setTechnicien] = useState("");
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      getOTs({ statut__in: STATUTS_ACTIFS.join(",") }),
      getPieces({ estActif: true }),
      getAlertes(),
    ])
      .then(([o, p, a]) => {
        setOTs(o.data.results || o.data);
        setPieces(p.data.results || p.data);
        setAlertes(a.data.results || a.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const otsFiltres = ots.filter(
    (o) =>
      o.numero?.toLowerCase().includes(otSearch.toLowerCase()) ||
      o.actif_detail?.code?.toLowerCase().includes(otSearch.toLowerCase()) ||
      o.actif_detail?.libelle?.toLowerCase().includes(otSearch.toLowerCase()),
  );

  const piecesFiltrees = pieces.filter(
    (p) =>
      p.reference?.toLowerCase().includes(pieceSearch.toLowerCase()) ||
      p.designation?.toLowerCase().includes(pieceSearch.toLowerCase()) ||
      p.emplacement?.toLowerCase().includes(pieceSearch.toLowerCase()),
  );

  const otCourant = ots.find((o) => o.id === otSelectionne);

  const handleSortie = async (e) => {
    e.preventDefault();
    setErreur("");
    setSucces("");
    if (!otSelectionne) return setErreur("Sélectionnez un OT.");
    if (!pieceSelectionnee) return setErreur("Sélectionnez une pièce.");
    if (!quantite || quantite <= 0) return setErreur("Quantité invalide.");
    if (Number(quantite) > Number(pieceSelectionnee.quantiteStock))
      return setErreur(
        `Stock insuffisant : ${pieceSelectionnee.quantiteStock} ${pieceSelectionnee.unite} disponible(s).`,
      );

    setSubmitting(true);
    try {
      await enregistrerPiece(otSelectionne, pieceSelectionnee.id, quantite);
      setSucces(
        `✅ Sortie enregistrée : ${quantite} × ${pieceSelectionnee.reference} → ${otCourant?.numero}`,
      );
      setQuantite("");
      setTechnicien("");
      setPieceSelectionnee(null);
      setPieceSearch("");
      // Rafraîchir les pièces
      const res = await getPieces({ estActif: true });
      setPieces(res.data.results || res.data);
      const al = await getAlertes();
      setAlertes(al.data.results || al.data);
    } catch (e) {
      setErreur(e.response?.data?.error || "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-400">Chargement...</div>;

  return (
    <div className="p-6 text-white">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Interface Magasinier</h1>
        <p className="text-gray-400 text-sm mt-1">
          Enregistrement des sorties de pièces détachées
        </p>
      </div>

      {/* Alertes stock */}
      {alertes.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <p className="text-red-400 font-medium text-sm mb-2">
            ⚠ {alertes.length} pièce(s) sous le seuil minimum
          </p>
          <div className="flex flex-wrap gap-2">
            {alertes.slice(0, 5).map((a) => (
              <span
                key={a.id}
                className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full font-mono">
                {a.reference} — {a.quantiteStock} {a.unite} (min:{" "}
                {a.seuilMinimum})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulaire sortie pièce */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-5">
            Enregistrer une sortie de pièce
          </h2>

          {erreur && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg p-3 mb-4 text-sm">
              {erreur}
            </div>
          )}
          {succes && (
            <div className="bg-green-500/20 border border-green-500/40 text-green-400 rounded-lg p-3 mb-4 text-sm">
              {succes}
            </div>
          )}

          <form onSubmit={handleSortie} className="space-y-4">
            {/* Sélection OT */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-medium">
                1. Numéro d'intervention (OT) *
              </label>
              <input
                type="text"
                placeholder="Rechercher OT par numéro ou actif..."
                value={otSearch}
                onChange={(e) => setOtSearch(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500 mb-1"
              />
              <select
                value={otSelectionne}
                onChange={(e) => setOtSelectionne(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500"
                size={Math.min(otsFiltres.length + 1, 5)}>
                <option value="">— Sélectionner l'OT —</option>
                {otsFiltres.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.numero} | {o.actif_detail?.code} —{" "}
                    {o.actif_detail?.libelle?.slice(0, 30)}
                  </option>
                ))}
              </select>
              {otCourant && (
                <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs">
                  <span className="text-purple-300 font-mono">
                    {otCourant.numero}
                  </span>
                  <span className="text-gray-400 ml-2">
                    {otCourant.actif_detail?.libelle}
                  </span>
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                      otCourant.priorite === "critique"
                        ? "bg-red-500/20 text-red-400"
                        : otCourant.priorite === "haute"
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-blue-500/20 text-blue-400"
                    }`}>
                    {otCourant.priorite}
                  </span>
                </div>
              )}
            </div>

            {/* Sélection Pièce */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-medium">
                2. Référence de la pièce *
              </label>
              <input
                type="text"
                placeholder="Rechercher par référence, désignation ou emplacement..."
                value={pieceSearch}
                onChange={(e) => {
                  setPieceSearch(e.target.value);
                  setPieceSelectionnee(null);
                }}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500 mb-1"
              />
              {pieceSearch && !pieceSelectionnee && (
                <div className="bg-gray-700 border border-gray-600 rounded-lg max-h-40 overflow-y-auto">
                  {piecesFiltrees.length === 0 ? (
                    <p className="text-gray-500 text-xs p-3 text-center">
                      Aucune pièce trouvée
                    </p>
                  ) : (
                    piecesFiltrees.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setPieceSelectionnee(p);
                          setPieceSearch(p.reference);
                        }}
                        className="flex items-center justify-between px-3 py-2 hover:bg-gray-600 cursor-pointer border-b border-gray-600/50 last:border-0">
                        <div>
                          <span className="font-mono text-sm text-purple-300">
                            {p.reference}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            {p.designation}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            📍 {p.emplacement}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold ml-2 ${p.est_sous_seuil ? "text-red-400" : "text-green-400"}`}>
                          {p.quantiteStock} {p.unite}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
              {pieceSelectionnee && (
                <div className="mt-2 p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm text-teal-300">
                        {pieceSelectionnee.reference}
                      </p>
                      <p className="text-xs text-gray-300">
                        {pieceSelectionnee.designation}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        📍 {pieceSelectionnee.emplacement}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${pieceSelectionnee.est_sous_seuil ? "text-red-400" : "text-green-400"}`}>
                        {pieceSelectionnee.quantiteStock}{" "}
                        {pieceSelectionnee.unite}
                      </p>
                      <p className="text-xs text-gray-500">en stock</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPieceSelectionnee(null);
                      setPieceSearch("");
                    }}
                    className="text-xs text-gray-500 hover:text-gray-300 mt-2">
                    ✕ Changer de pièce
                  </button>
                </div>
              )}
            </div>

            {/* Quantité */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-medium">
                3. Quantité délivrée *
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={quantite}
                  onChange={(e) => setQuantite(e.target.value)}
                  placeholder="0"
                  className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500"
                />
                {pieceSelectionnee && (
                  <span className="text-gray-400 text-sm">
                    {pieceSelectionnee.unite}
                  </span>
                )}
              </div>
              {pieceSelectionnee &&
                quantite &&
                Number(quantite) > Number(pieceSelectionnee.quantiteStock) && (
                  <p className="text-red-400 text-xs mt-1">
                    ⚠ Stock insuffisant
                  </p>
                )}
            </div>

            {/* Technicien bénéficiaire */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-medium">
                4. Technicien bénéficiaire
              </label>
              <input
                type="text"
                value={technicien}
                onChange={(e) => setTechnicien(e.target.value)}
                placeholder="Nom du technicien bénéficiaire"
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Date/heure et identité magasinier enregistrées automatiquement
              </p>
            </div>

            <button
              type="submit"
              disabled={
                submitting || !otSelectionne || !pieceSelectionnee || !quantite
              }
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 rounded-xl text-sm font-semibold transition text-white">
              {submitting
                ? "Enregistrement..."
                : "✓ Confirmer la sortie de pièce"}
            </button>
          </form>
        </div>

        {/* Côté droit — stock et OT actifs */}
        <div className="space-y-4">
          {/* Résumé stock */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              État du stock en temps réel
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{pieces.length}</p>
                <p className="text-xs text-gray-400 mt-1">Références</p>
              </div>
              <div
                className={`rounded-lg p-3 text-center ${alertes.length > 0 ? "bg-red-500/20" : "bg-gray-700/50"}`}>
                <p
                  className={`text-2xl font-bold ${alertes.length > 0 ? "text-red-400" : "text-white"}`}>
                  {alertes.length}
                </p>
                <p className="text-xs text-gray-400 mt-1">Alertes</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{ots.length}</p>
                <p className="text-xs text-gray-400 mt-1">OT actifs</p>
              </div>
            </div>

            {/* Liste pièces alertes */}
            {alertes.length > 0 && (
              <div>
                <p className="text-xs text-red-400 font-medium mb-2">
                  Pièces à réapprovisionner :
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {alertes.map((a) => (
                    <div
                      key={a.id}
                      className="flex justify-between items-center text-xs p-2 bg-red-500/10 rounded-lg">
                      <span className="font-mono text-red-300">
                        {a.reference}
                      </span>
                      <span className="text-gray-400 truncate mx-2">
                        {a.designation?.slice(0, 25)}
                      </span>
                      <span className="text-red-400 font-bold whitespace-nowrap">
                        {a.quantiteStock} / {a.seuilMinimum}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* OT actifs */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Interventions en cours
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ots.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  Aucune intervention active
                </p>
              ) : (
                ots.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => {
                      setOtSelectionne(o.id);
                      setOtSearch("");
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${
                      otSelectionne === o.id
                        ? "bg-purple-500/20 border border-purple-500/40"
                        : "bg-gray-700/40 hover:bg-gray-700/70"
                    }`}>
                    <div>
                      <p className="font-mono text-sm text-purple-300">
                        {o.numero}
                      </p>
                      <p className="text-xs text-gray-400">
                        {o.actif_detail?.libelle?.slice(0, 35)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          o.priorite === "critique"
                            ? "bg-red-500/20 text-red-400"
                            : o.priorite === "haute"
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-blue-500/20 text-blue-400"
                        }`}>
                        {o.priorite}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
