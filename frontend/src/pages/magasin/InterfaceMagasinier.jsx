import { useState, useEffect, useRef, useCallback } from "react";
import { getPieces, getAlertes, importerPiecesCSV } from "../../services/magasinService";
import { getOTs, enregistrerPieces } from "../../services/ordreService";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Trash2, Plus, ShoppingCart, AlertTriangle, CheckCircle, Upload, FileSpreadsheet } from "lucide-react";

const STATUTS_ACTIFS = [, "EN_COURS", "DEPANNE"];

export default function InterfaceMagasinier() {
  const [ots, setOTs] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [totalPieces, setTotalPieces] = useState(0);
  const [tablePage, setTablePage] = useState(1);
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Recherche backend pièce
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState(null);

  // Sélection OT
  const [otSelectionne, setOtSelectionne] = useState("");
  const [otSearch, setOtSearch] = useState("");

  // Panier
  const [panier, setPanier] = useState([]);

  // Sélection pièce courante
  const [pieceSearch, setPieceSearch] = useState("");
  const [quantite, setQuantite] = useState("");
  const [technicien, setTechnicien] = useState("");

  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const chargerDonnees = useCallback(async () => {
    setLoading(true);
    try {
      const [o, p, a] = await Promise.all([
        getOTs({ statut__in: STATUTS_ACTIFS.join(",") }),
        getPieces({ estActif: true, page: tablePage, page_size: 50 }),
        getAlertes(),
      ]);
      setOTs(o.data.results || o.data);
      setPieces(p.data.results || p.data);
      setTotalPieces(p.data.count || p.data.length);
      setAlertes(a.data.results || a.data);
    } finally {
      setLoading(false);
    }
  }, [tablePage]);

  useEffect(() => {
    chargerDonnees();
  }, [chargerDonnees]);

  // Recherche backend debounce (300ms)
  useEffect(() => {
    if (!pieceSearch || pieceSearch.length < 2) {
      setSearchResults([]);
      setSelectedPiece(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await getPieces({ search: pieceSearch, estActif: true, page_size: 20 });
        setSearchResults(res.data.results || res.data);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [pieceSearch]);

  const otsFiltres = ots.filter(
    (o) =>
      o.numero?.toLowerCase().includes(otSearch.toLowerCase()) ||
      o.actif_detail?.code?.toLowerCase().includes(otSearch.toLowerCase()) ||
      o.actif_detail?.libelle?.toLowerCase().includes(otSearch.toLowerCase()),
  );

  const otCourant = ots.find((o) => o.id === otSelectionne);

  const ajouterAuPanier = (piece) => {
    setErreur("");
    const qte = parseFloat(quantite);
    if (!qte || qte <= 0) {
      setErreur("Quantité invalide.");
      return;     
    }
    if (qte > Number(piece.quantiteStock)) {
      setErreur(`Stock insuffisant : ${piece.quantiteStock} ${piece.unite} disponible(s).`);
      return;
    }
    // Vérifier si déjà dans le panier
    const existant = panier.find((l) => l.piece.id === piece.id);
    if (existant) {
      const nouvelleQte = existant.quantite + qte;
      if (nouvelleQte > Number(piece.quantiteStock)) {
        setErreur(`Total demandé (${nouvelleQte}) dépasse le stock (${piece.quantiteStock} ${piece.unite}).`);
        return;
      }
      setPanier((prev) =>
        prev.map((l) =>
          l.piece.id === piece.id ? { ...l, quantite: nouvelleQte } : l
        )
      );
    } else {
      setPanier((prev) => [...prev, { piece, quantite: qte }]);
    }
    setPieceSearch("");
    setSelectedPiece(null);
    setQuantite("");
  };

  const retirerDuPanier = (pieceId) => {
    setPanier((prev) => prev.filter((l) => l.piece.id !== pieceId));
  };

  const modifierQtePanier = (pieceId, nouvelleQte) => {
    const qte = parseFloat(nouvelleQte);
    const ligne = panier.find((l) => l.piece.id === pieceId);
    if (!ligne) return;
    if (!qte || qte <= 0) {
      retirerDuPanier(pieceId);
      return;
    }
    if (qte > Number(ligne.piece.quantiteStock)) {
      setErreur(`Stock insuffisant pour ${ligne.piece.reference}.`);
      return;
    }
    setPanier((prev) =>
      prev.map((l) => (l.piece.id === pieceId ? { ...l, quantite: qte } : l))
    );
  };

  const handleSortieBatch = async (e) => {
    e.preventDefault();
    setErreur("");
    setSucces("");
    if (!otSelectionne) return setErreur("Sélectionnez un OT.");
    if (panier.length === 0) return setErreur("Le panier est vide. Ajoutez au moins une pièce.");

    setSubmitting(true);
    try {
      const piecesPayload = panier.map((l) => ({
        idPiece: l.piece.id,
        quantite: l.quantite,
      }));
      const res = await enregistrerPieces(otSelectionne, piecesPayload);
      setSucces(` ${res.data.message || "Sorties enregistrées"} → ${otCourant?.numero}`);
      setPanier([]);
      setTechnicien("");
      await chargerDonnees();
    } catch (e) {
      const msg = e.response?.data?.error || "Erreur lors de l'enregistrement.";
      setErreur(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // const coutTotalPanier = panier.reduce(
  //   (sum, l) => sum + (l.piece.prixUnitaire || 0) * l.quantite,
  //   0
  // );

  if (loading) return <div className="p-6 text-text-secondary">Chargement...</div>;

  return (
    <div className="p-6 text-text">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Interface Magasinier</h1>
          <p className="text-text-secondary text-sm mt-1">
            Enregistrement des sorties de pièces détachées — mode batch
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg text-sm font-semibold transition text-white">
            {importLoading ? (
              <><span className="animate-spin"></span> Import en cours...</>
            ) : (
              <><Upload size={16} /> Importer CSV SAGE X3</>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImportLoading(true);
              setErreur("");
              setSucces("");
              setImportResult(null);
              try {
                const res = await importerPiecesCSV(file);
                setImportResult(res.data);
                setSucces(` Import terminé : ${res.data.creees} créées, ${res.data.mises_a_jour} mises à jour${res.data.erreurs?.length ? `, ${res.data.erreurs.length} erreurs` : ""}`);
                await chargerDonnees();
              } catch (err) {
                const msg = err.response?.data?.error || "Erreur lors de l'import CSV.";
                setErreur(msg);
              } finally {
                setImportLoading(false);
                e.target.value = "";
              }
            }}
          />
          {importResult && (
            <div className="text-xs text-text-secondary text-right">
              <p>Fichier : <span className="text-text">{importResult.fichier}</span></p>
              <p>Lignes : <span className="text-text">{importResult.total_lignes}</span> | Créées : <span className="text-success dark:text-success">{importResult.creees}</span> | MàJ : <span className="text-blue-500 dark:text-primary">{importResult.mises_a_jour}</span></p>
              {importResult.erreurs?.length > 0 && (
                <p className="text-danger">Erreurs : {importResult.erreurs.length}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Alertes stock */}
      {alertes.length > 0 && (
        <div className="bg-red-100 dark:bg-danger-soft border border-red-300 dark:border-danger/30 rounded-xl p-4 mb-6">
          <p className="text-red-700 dark:text-danger font-medium text-sm mb-2 flex items-center gap-2">
            <AlertTriangle size={14} /> {alertes.length} pièce(s) sous le seuil minimum
          </p>
          <div className="flex flex-wrap gap-2">
            {alertes.slice(0, 5).map((a) => (
              <span key={a.id} className="text-xs bg-red-200 dark:bg-danger-soft text-red-700 dark:text-danger px-2 py-1 rounded-full font-mono">
                {a.reference} — {a.quantiteStock} {a.unite} (min: {a.seuilMinimum})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/*  Colonne gauche : formulaire + panier  */}
        <div className="space-y-5">
          {/* Messages */}
          {erreur && (
            <div className="bg-red-100 dark:bg-danger-soft border border-red-300 dark:border-danger/40 text-red-700 dark:text-danger rounded-lg p-3 text-sm flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {erreur}
            </div>
          )}
          {succes && (
            <div className="bg-green-100 dark:bg-success-soft border border-green-300 dark:border-success/40 text-green-700 dark:text-success rounded-lg p-3 text-sm flex items-start gap-2">
              <CheckCircle size={16} className="mt-0.5 shrink-0" />
              {succes}
            </div>
          )}

          {/* Sélection OT */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-purple-600 dark:text-primary uppercase tracking-wider mb-4">
              1. Sélectionner l'intervention (OT)
            </h2>
            <input
              type="text"
              placeholder="Rechercher OT par numéro ou actif..."
              value={otSearch}
              onChange={(e) => setOtSearch(e.target.value)}
              className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-primary mb-2"
            />
            <select
              value={otSelectionne}
              onChange={(e) => { setOtSelectionne(e.target.value); setPanier([]); }}
              className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-primary"
              size={Math.min(otsFiltres.length + 1, 4)}>
              <option value="">— Sélectionner l'OT —</option>
              {otsFiltres.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.numero} | {o.actif_detail?.code} — {o.actif_detail?.libelle?.slice(0, 30)}
                </option>
              ))}
            </select>
            {otCourant && (
              <div className="mt-3 p-3 bg-purple-100 dark:bg-primary-soft border border-purple-300 dark:border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm text-purple-700 dark:text-primary">{otCourant.numero}</p>
                    <p className="text-xs text-text-secondary">{otCourant.actif_detail?.libelle}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    otCourant.priorite === "critique" ? "bg-red-200 dark:bg-danger-soft text-red-700 dark:text-danger" :
                    otCourant.priorite === "haute" ? "bg-orange-200 dark:bg-status-orange/20 text-orange-700 dark:text-status-orange" :
                    "bg-blue-200 dark:bg-primary-soft text-blue-700 dark:text-primary"
                  }`}>{otCourant.priorite}</span>
                </div>
              </div>
            )}
          </div>

          {/* Ajout pièce */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-teal-600 dark:text-status-cyan uppercase tracking-wider mb-4">
              2. Ajouter des pièces au panier
            </h2>

            {/* Recherche pièce */}
            <div className="mb-3">
              <label className="block text-xs text-text-secondary mb-1 font-medium">Référence / Désignation</label>
              <input
                id="input-piece-search"
                type="text"
                placeholder="Rechercher par référence, désignation ou emplacement..."
                value={pieceSearch}
                onChange={(e) => { setPieceSearch(e.target.value); setSelectedPiece(null); }}
                disabled={!otSelectionne}
                className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-status-cyan disabled:opacity-40"
              />
              {pieceSearch && (
                <div className="bg-elevated border border-border rounded-lg max-h-40 overflow-y-auto mt-1">
                  {searchLoading ? (
                    <p className="text-text-muted text-xs p-3 text-center">Recherche...</p>
                  ) : searchResults.length === 0 ? (
                    <p className="text-text-muted text-xs p-3 text-center">Aucune pièce trouvée</p>
                  ) : (
                    searchResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setPieceSearch(p.reference);
                          setSelectedPiece(p);
                        }}
                        className={`flex items-center justify-between px-3 py-2 hover:bg-surface cursor-pointer border-b border-border/50 last:border-0 ${
                          selectedPiece?.id === p.id ? "bg-teal-100 dark:bg-status-cyan/20" : ""
                        }`}>
                        <div>
                          <span className="font-mono text-sm text-purple-700 dark:text-primary">{p.reference}</span>
                          <span className="text-xs text-text-secondary ml-2">{p.designation}</span>
                        </div>
                        <span className={`text-xs font-bold ml-2 ${p.est_sous_seuil ? "text-red-700 dark:text-danger" : "text-green-700 dark:text-success"}`}>
                          {p.quantiteStock} {p.unite}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Quantité + bouton ajouter */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs text-text-secondary mb-1 font-medium">Quantité</label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={quantite}
                  onChange={(e) => setQuantite(e.target.value)}
                  disabled={!otSelectionne}
                  placeholder="0"
                  className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-status-cyan disabled:opacity-40"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedPiece) {
                    ajouterAuPanier(selectedPiece);
                  } else {
                    const p = searchResults.find((x) => x.reference === pieceSearch);
                    if (p) ajouterAuPanier(p);
                    else setErreur("Sélectionnez une pièce dans la liste.");
                  }
                }}
                disabled={!otSelectionne || !quantite}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700 disabled:opacity-40 rounded-lg text-sm font-semibold transition text-white flex items-center gap-1.5">
                <Plus size={14} /> Ajouter
              </button>
            </div>

            {/* Technicien */}
            <div className="mt-3">
              <label className="block text-xs text-text-secondary mb-1 font-medium">Technicien bénéficiaire</label>
              <input
                type="text"
                value={technicien}
                onChange={(e) => setTechnicien(e.target.value)}
                disabled={!otSelectionne}
                placeholder="Nom du technicien bénéficiaire"
                className="w-full bg-elevated text-text rounded-lg px-3 py-2 text-sm border border-border outline-none focus:border-status-cyan disabled:opacity-40"
              />
            </div>
          </div>

          {/* Panier */}
          <AnimatePresence>
            {panier.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-surface rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-amber-600 dark:text-warning uppercase tracking-wider flex items-center gap-2">
                    <ShoppingCart size={14} /> Panier ({panier.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => setPanier([])}
                    className="text-xs text-text-muted hover:text-red-600 dark:hover:text-danger transition">
                    Vider
                  </button>
                </div>

                <div className="space-y-2">
                  {panier.map((ligne) => (
                    <div key={ligne.piece.id} className="flex items-center gap-3 bg-elevated rounded-lg p-3 border border-border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{ligne.piece.reference}</p>
                        <p className="text-xs text-text-secondary truncate">{ligne.piece.designation}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={ligne.quantite}
                          onChange={(e) => modifierQtePanier(ligne.piece.id, e.target.value)}
                          className="w-20 bg-surface text-text rounded-lg px-2 py-1 text-sm border border-border outline-none focus:border-amber-500 text-center"
                        />
                        <span className="text-xs text-text-secondary w-12">{ligne.piece.unite}</span>
                      </div>
                      {/* Prix masqué - À implémenter ultérieurement */}
                      <button
                        type="button"
                        onClick={() => retirerDuPanier(ligne.piece.id)}
                        className="text-text-muted hover:text-danger p-1 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Total + validation */}
                <div className="mt-4 pt-3 border-t border-border">
                  {/* Coût total masqué - À implémenter ultérieurement */}
                  <button
                    type="button"
                    onClick={handleSortieBatch}
                    disabled={submitting}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700 disabled:opacity-40 rounded-xl text-sm font-semibold transition text-white flex items-center justify-center gap-2">
                    {submitting ? (
                      <><span className="animate-spin"></span> Enregistrement...</>
                    ) : (
                      <><Package size={16} /> Confirmer les {panier.length} sortie(s)</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/*  Colonne droite : stock et OT  */}
        <div className="space-y-4">
          {/* Résumé stock */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
              État du stock en temps réel
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-elevated rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-text">{totalPieces}</p>
                <p className="text-xs text-text-secondary mt-1">Références</p>
              </div>
              <div className={`rounded-lg p-3 text-center ${alertes.length > 0 ? "bg-red-100 dark:bg-danger-soft" : "bg-elevated"}`}>
                <p className={`text-2xl font-bold ${alertes.length > 0 ? "text-red-700 dark:text-danger" : "text-text"}`}>{alertes.length}</p>
                <p className="text-xs text-text-secondary mt-1">Alertes</p>
              </div>
              <div className="bg-elevated rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-text">{ots.length}</p>
                <p className="text-xs text-text-secondary mt-1">OT actifs</p>
              </div>
            </div>

            {alertes.length > 0 && (
              <div>
                <p className="text-xs text-red-700 dark:text-danger font-medium mb-2">Pièces à réapprovisionner :</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {alertes.map((a) => (
                    <div key={a.id} className="flex justify-between items-center text-xs p-2 bg-red-100 dark:bg-danger-soft rounded-lg">
                      <span className="font-mono text-red-700 dark:text-danger">{a.reference}</span>
                      <span className="text-text-secondary truncate mx-2">{a.designation?.slice(0, 25)}</span>
                      <span className="text-red-700 dark:text-danger font-bold whitespace-nowrap">{a.quantiteStock} / {a.seuilMinimum}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tableau stock style SAGE X3 */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet size={14} /> Stock pièces (style SAGE X3)
              </h2>
              <span className="text-xs text-text-muted">{totalPieces} références</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-text-muted border-b border-border">
                    <th className="pb-2 font-medium">Référence</th>
                    <th className="pb-2 font-medium">Désignation</th>
                    <th className="pb-2 font-medium">Catégorie</th>
                    <th className="pb-2 font-medium">Empl.</th>
                    <th className="pb-2 font-medium text-right">Stock</th>
                    <th className="pb-2 font-medium">Unité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pieces.slice(0, 50).map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setPieceSearch(p.reference);
                        const el = document.getElementById('input-piece-search');
                        if (el) el.focus();
                      }}
                      className={`cursor-pointer transition hover:bg-elevated ${
                        p.est_sous_seuil ? "bg-red-100 dark:bg-red-500/5" : ""
                      }`}>
                      <td className="py-2 font-mono text-purple-700 dark:text-primary">{p.reference}</td>
                      <td className="py-2 text-text truncate max-w-[120px]">{p.designation}</td>
                      <td className="py-2 text-text-secondary">{p.categorie || "—"}</td>
                      <td className="py-2 text-text-secondary">{p.emplacement || "—"}</td>
                      <td className={`py-2 text-right font-bold ${p.est_sous_seuil ? "text-red-700 dark:text-danger" : "text-green-700 dark:text-success"}`}>
                        {p.quantiteStock}
                      </td>
                      <td className="py-2 text-text-secondary">{p.unite}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination tableau SAGE */}
              {totalPieces > 50 && (
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                  <button
                    className="text-xs text-text-muted hover:text-text disabled:opacity-30 transition"
                    disabled={tablePage === 1}
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}>
                    ← Précédent
                  </button>
                  <span className="text-xs text-text-muted">
                    Page {tablePage} / {Math.ceil(totalPieces / 50)}
                  </span>
                  <button
                    className="text-xs text-text-muted hover:text-text disabled:opacity-30 transition"
                    disabled={tablePage >= Math.ceil(totalPieces / 50)}
                    onClick={() => setTablePage((p) => p + 1)}>
                    Suivant →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* OT actifs */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
              Interventions en cours
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ots.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-4">Aucune intervention active</p>
              ) : (
                ots.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => { setOtSelectionne(o.id); setOtSearch(""); setPanier([]); }}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${
                      otSelectionne === o.id
                        ? "bg-purple-100 dark:bg-primary-soft border border-purple-300 dark:border-purple-500/40"
                        : "bg-elevated hover:bg-surface"
                    }`}>
                    <div>
                      <p className="font-mono text-sm text-purple-700 dark:text-primary">{o.numero}</p>
                      <p className="text-xs text-text-secondary">{o.actif_detail?.libelle?.slice(0, 35)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        o.priorite === "critique" ? "bg-red-200 dark:bg-danger-soft text-red-700 dark:text-danger" :
                        o.priorite === "haute" ? "bg-orange-200 dark:bg-status-orange/20 text-orange-700 dark:text-status-orange" :
                        "bg-blue-200 dark:bg-primary-soft text-blue-700 dark:text-primary"
                      }`}>{o.priorite}</span>
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
