import { useState, useEffect, useRef } from "react";
import { getPieces, getAlertes } from "../../services/magasinService";
import { getOTs, enregistrerPiece } from "../../services/ordreService";
import { getUtilisateurs } from "@/services/securiteService";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Package,
  Search,
  X,
  Plus,
  Minus,
  CheckCircle2,
  Loader2,
  ChevronRight,
  User,
  ClipboardList,
  Boxes,
  Activity,
  MapPin,
  Hash,
  ChevronsUpDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUTS_ACTIFS = ["EN_COURS", "DEPANNE"];

function InfoChip({ icon, label, value, variant = "default" }) {
  const variants = {
    default: "bg-surface border-border text-text-muted",
    warning:
      "bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400",
    danger:
      "bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400",
    success:
      "bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border ${variants[variant]}`}>
      {icon}
      {label && <span className="text-text-muted">{label}</span>}
      {value}
    </span>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function InterfaceMagasinier() {
  const [ots, setOTs] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Sélections ──────────────────────────────────────────────────────────
  const [otSelectionne, setOtSelectionne] = useState(null);
  const [otSearch, setOtSearch] = useState("");
  const [otDropdown, setOtDropdown] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [userSelectionnee, setUserSelectionnee] = useState(null);
  const [userDropdown, setUserDropdown] = useState(false);

  const [pieceSearch, setPieceSearch] = useState("");
  const [pieceDropdown, setPieceDropdown] = useState(false);

  // Panier multi-pièces : [{piece, quantite}]
  const [panier, setPanier] = useState([]);

  // ─── Feedback ────────────────────────────────────────────────────────────
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const otRef = useRef(null);
  const userRef = useRef(null);
  const pieceRef = useRef(null);

  const [otOpen, setOtOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  // ─── Chargement ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      getOTs({ statut__in: STATUTS_ACTIFS.join(",") }),
      getPieces({ estActif: true }),
      getAlertes(),
      getUtilisateurs(),
    ])
      .then(([o, p, a, u]) => {
        setOTs(o.data.results || o.data);
        setPieces(p.data.results || p.data);
        setAlertes(a.data.results || a.data);
        setUtilisateurs(u.data.results || u.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fermer dropdowns au clic extérieur
  useEffect(() => {
    const handle = (e) => {
      if (otRef.current && !otRef.current.contains(e.target))
        setOtDropdown(false);
      if (userRef.current && !userRef.current.contains(e.target))
        setUserDropdown(false);
      if (pieceRef.current && !pieceRef.current.contains(e.target))
        setPieceDropdown(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ─── Filtres ─────────────────────────────────────────────────────────────
  const otsFiltres = ots.filter((o) => {
    const q = otSearch.toLowerCase();
    return (
      o.numero?.toLowerCase().includes(q) ||
      o.actif_detail?.code?.toLowerCase().includes(q) ||
      o.actif_detail?.libelle?.toLowerCase().includes(q)
    );
  });

  const usersFiltres = utilisateurs.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.prenom?.toLowerCase().includes(q) ||
      u.nom?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const piecesFiltrees = pieces.filter((p) => {
    const q = pieceSearch.toLowerCase();
    const dejaDansLePanier = panier.some((item) => item.piece.id === p.id);
    return (
      !dejaDansLePanier &&
      (p.reference?.toLowerCase().includes(q) ||
        p.designation?.toLowerCase().includes(q) ||
        p.emplacement?.toLowerCase().includes(q))
    );
  });

  // ─── Panier ──────────────────────────────────────────────────────────────
  const ajouterAuPanier = (piece) => {
    setPanier((prev) => [...prev, { piece, quantite: "" }]);
    setPieceSearch("");
    setPieceDropdown(false);
  };

  const retirerDuPanier = (pieceId) => {
    setPanier((prev) => prev.filter((item) => item.piece.id !== pieceId));
  };

  const modifierQuantite = (pieceId, val) => {
    setPanier((prev) =>
      prev.map((item) =>
        item.piece.id === pieceId ? { ...item, quantite: val } : item,
      ),
    );
  };

  // ─── Soumission ──────────────────────────────────────────────────────────
  const handleSortie = async (e) => {
    e.preventDefault();
    setErreur("");
    setSucces("");

    if (!otSelectionne)
      return setErreur("Veuillez sélectionner un ordre de travail.");
    if (!userSelectionnee)
      return setErreur("Veuillez sélectionner un technicien bénéficiaire.");
    if (panier.length === 0) return setErreur("Ajoutez au moins une pièce.");

    for (const item of panier) {
      if (!item.quantite || Number(item.quantite) <= 0)
        return setErreur(`Quantité invalide pour : ${item.piece.reference}`);
      if (Number(item.quantite) > Number(item.piece.quantiteStock))
        return setErreur(
          `Stock insuffisant pour : ${item.piece.reference} (${item.piece.quantiteStock} ${item.piece.unite} dispo)`,
        );
    }

    setSubmitting(true);
    try {
      for (const item of panier) {
        await enregistrerPiece(
          otSelectionne.id,
          item.piece.id,
          item.quantite,
          userSelectionnee.id,
        );
      }

      setSucces(
        `${panier.length} sortie(s) enregistrée(s) → ${otSelectionne.numero}`,
      );
      setPanier([]);
      setOtSelectionne(null);
      setOtSearch("");
      setUserSelectionnee(null);
      setUserSearch("");

      // Rafraîchir stock
      const [p, a] = await Promise.all([
        getPieces({ estActif: true }),
        getAlertes(),
      ]);
      setPieces(p.data.results || p.data);
      setAlertes(a.data.results || a.data);
    } catch (err) {
      setErreur(
        err.response?.data?.error ||
          "Une erreur est survenue lors de l'enregistrement.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const panierValide =
    otSelectionne &&
    userSelectionnee &&
    panier.length > 0 &&
    panier.every((item) => item.quantite && Number(item.quantite) > 0);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-text-muted animate-pulse">Chargement…</p>
      </div>
    );

  return (
    <div className="p-6 space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="space-y-0.5">
        <h1 className="text-xl font-bold text-text tracking-tight">
          Interface Magasinier
        </h1>
        <p className="text-sm text-text-muted">
          Enregistrement des sorties de pièces détachées
        </p>
      </div>

      {/* ── Alertes stock ──────────────────────────────────────────────────── */}
      {alertes.length > 0 && (
        <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-red-500" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {alertes.length} pièce(s) sous le seuil minimum
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {alertes.slice(0, 6).map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-1 rounded-lg border bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30">
                {a.reference}
                <span className="text-red-400 dark:text-red-500">
                  {a.quantiteStock}/{a.seuilMinimum} {a.unite}
                </span>
              </span>
            ))}
            {alertes.length > 6 && (
              <span className="text-[11px] text-red-500 dark:text-red-400 py-1">
                +{alertes.length - 6} autres
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Corps ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Formulaire (2/3) ─────────────────────────────────────────────── */}
        <form onSubmit={handleSortie} className="lg:col-span-2 space-y-4">
          {/* Feedback */}
          {erreur && (
            <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              {erreur}
            </div>
          )}
          {succes && (
            <div className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl px-4 py-3 text-sm">
              <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
              {succes}
            </div>
          )}

          {/* ── Bloc 1 : OT + Technicien ─────────────────────────────────── */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">
              Intervention
            </p>

            {/* Sélecteur OT */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-text">
                Ordre de travail <span className="text-red-500">*</span>
              </Label>

              <Popover open={otOpen} onOpenChange={setOtOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={otOpen}
                    className="w-full justify-between bg-elevated border-border text-sm font-normal h-9 px-3">
                    {otSelectionne ? (
                      <span className="text-text">{otSelectionne.numero}</span>
                    ) : (
                      <span className="text-text-muted">
                        Sélectionner un OT…
                      </span>
                    )}
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {otSelectionne && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOtSelectionne(null);
                            setOtSearch("");
                          }}
                          onKeyDown={(e) =>
                            e.key === "Enter" && e.currentTarget.click()
                          }
                          className="text-text-muted hover:text-text rounded p-0.5">
                          <X size={12} />
                        </span>
                      )}
                      <ChevronsUpDown size={12} className="text-text-muted" />
                    </div>
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0 bg-surface border border-border shadow-lg rounded-xl overflow-hidden"
                  align="start">
                  <Command shouldFilter={false}>
                    <div className="flex items-center border-b border-border px-3">
                      <Search
                        size={13}
                        className="text-text-muted shrink-0 mr-2"
                      />
                      <input
                        value={otSearch}
                        onChange={(e) => setOtSearch(e.target.value)}
                        placeholder="Numéro, actif…"
                        className="flex-1 bg-transparent py-2.5 text-sm text-text placeholder:text-text-muted outline-none"
                      />
                      {otSearch && (
                        <button
                          type="button"
                          onClick={() => setOtSearch("")}
                          className="text-text-muted hover:text-text ml-1">
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <CommandList className="max-h-60 overflow-y-auto">
                      <CommandEmpty className="py-6 text-center text-sm text-text-muted">
                        Aucun ordre de travail trouvé.
                      </CommandEmpty>
                      {otsFiltres.map((ot) => (
                        <CommandItem
                          key={ot.id}
                          value={ot.id.toString()}
                          onSelect={() => {
                            setOtSelectionne(ot);
                            setOtSearch("");
                            setOtOpen(false);
                          }}
                          className={`flex flex-col items-start gap-0.5 px-4 py-2.5 cursor-pointer border-b border-border last:border-0 rounded-none
                ${
                  otSelectionne?.id === ot.id
                    ? "bg-blue-50 dark:bg-blue-500/10"
                    : "hover:bg-elevated"
                }`}>
                          <span className="text-sm font-mono font-semibold text-text">
                            {ot.numero}
                          </span>
                          {ot.actif_detail?.libelle && (
                            <span className="text-xs text-text-muted">
                              {ot.actif_detail.libelle}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Sélecteur Technicien */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-text">
              Technicien bénéficiaire <span className="text-red-500">*</span>
            </Label>

            <Popover open={userOpen} onOpenChange={setUserOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={userOpen}
                  className="w-full justify-between bg-elevated border-border text-sm font-normal h-9 px-3">
                  {userSelectionnee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          {userSelectionnee.prenom?.[0]}
                          {userSelectionnee.nom?.[0]}
                        </span>
                      </div>
                      <span className="text-text">
                        {userSelectionnee.prenom} {userSelectionnee.nom}
                      </span>
                    </div>
                  ) : (
                    <span className="text-text-muted">
                      Sélectionner un technicien…
                    </span>
                  )}
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {userSelectionnee && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserSelectionnee(null);
                          setUserSearch("");
                        }}
                        onKeyDown={(e) =>
                          e.key === "Enter" && e.currentTarget.click()
                        }
                        className="text-text-muted hover:text-text rounded p-0.5">
                        <X size={12} />
                      </span>
                    )}
                    <ChevronsUpDown size={12} className="text-text-muted" />
                  </div>
                </Button>
              </PopoverTrigger>

              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0 bg-surface border border-border shadow-lg rounded-xl overflow-hidden"
                align="start">
                <Command shouldFilter={false}>
                  <div className="flex items-center border-b border-border px-3">
                    <User size={13} className="text-text-muted shrink-0 mr-2" />
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Prénom, nom ou email…"
                      className="flex-1 bg-transparent py-2.5 text-sm text-text placeholder:text-text-muted outline-none"
                    />
                    {userSearch && (
                      <button
                        type="button"
                        onClick={() => setUserSearch("")}
                        className="text-text-muted hover:text-text ml-1">
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <CommandList className="max-h-60 overflow-y-auto">
                    <CommandEmpty className="py-6 text-center text-sm text-text-muted">
                      Aucun technicien trouvé.
                    </CommandEmpty>
                    {usersFiltres.map((u) => (
                      <CommandItem
                        key={u.id}
                        value={u.id.toString()}
                        onSelect={() => {
                          setUserSelectionnee(u);
                          setUserSearch("");
                          setUserOpen(false);
                        }}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-border last:border-0 rounded-none
                ${
                  userSelectionnee?.id === u.id
                    ? "bg-blue-50 dark:bg-blue-500/10"
                    : "hover:bg-elevated"
                }`}>
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            {u.prenom?.[0]}
                            {u.nom?.[0]}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text">
                            {u.prenom} {u.nom}
                          </p>
                          {u.email && (
                            <p className="text-xs text-text-muted truncate">
                              {u.email}
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {/* ── Bloc 2 : Pièces ──────────────────────────────────────────── */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">
                Pièces détachées
              </p>
              {panier.length > 0 && (
                <span className="text-[11px] font-medium text-text-muted">
                  {panier.length} article(s)
                </span>
              )}
            </div>

            {/* Searchbox pièce */}
            <div ref={pieceRef} className="space-y-1.5">
              <Label className="text-xs font-medium text-text">
                Ajouter une pièce <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
                <input
                  value={pieceSearch}
                  onChange={(e) => {
                    setPieceSearch(e.target.value);
                    setPieceDropdown(true);
                  }}
                  onFocus={() => setPieceDropdown(true)}
                  placeholder="Référence, désignation ou emplacement…"
                  className="w-full bg-elevated border border-border text-text placeholder:text-text-muted rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Dropdown pièces */}
              {pieceDropdown && pieceSearch && (
                <div className="bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-20 relative">
                  <ScrollArea className="max-h-52">
                    {piecesFiltrees.length === 0 ? (
                      <p className="text-xs text-text-muted text-center py-6">
                        Aucune pièce trouvée
                      </p>
                    ) : (
                      piecesFiltrees.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => ajouterAuPanier(p)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-elevated text-left transition-colors border-b border-border last:border-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <Package
                              size={13}
                              className="text-text-muted flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-semibold text-text">
                                  {p.reference}
                                </span>
                                {p.est_sous_seuil && (
                                  <AlertTriangle
                                    size={11}
                                    className="text-amber-500 flex-shrink-0"
                                  />
                                )}
                              </div>
                              <p className="text-xs text-text-muted truncate">
                                {p.designation}
                              </p>
                              {p.emplacement && (
                                <p className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                                  <MapPin size={10} />
                                  {p.emplacement}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <span
                              className={`text-sm font-bold ${p.est_sous_seuil ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                              {p.quantiteStock}
                            </span>
                            <span className="text-xs text-text-muted">
                              {p.unite}
                            </span>
                            <Plus size={13} className="text-text-muted" />
                          </div>
                        </button>
                      ))
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Panier */}
            {panier.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-border rounded-xl">
                <Boxes size={28} className="text-border mb-2" />
                <p className="text-xs text-text-muted">
                  Recherchez et sélectionnez des pièces ci-dessus
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* En-têtes */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-1">
                  <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">
                    Pièce
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold text-center w-28">
                    Quantité
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold text-right w-6"></p>
                </div>

                {panier.map((item) => {
                  const depasse =
                    Number(item.quantite) > Number(item.piece.quantiteStock);
                  return (
                    <div
                      key={item.piece.id}
                      className={`grid grid-cols-[1fr_auto_auto] gap-3 items-center p-3 rounded-lg border transition-colors ${
                        depasse
                          ? "bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20"
                          : "bg-elevated border-border-subtle"
                      }`}>
                      {/* Infos pièce */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-semibold text-text">
                            {item.piece.reference}
                          </span>
                          {item.piece.est_sous_seuil && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-50 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 font-medium">
                              Stock faible
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted truncate">
                          {item.piece.designation}
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          Dispo :{" "}
                          <span
                            className={`font-semibold ${depasse ? "text-red-500" : "text-text"}`}>
                            {item.piece.quantiteStock} {item.piece.unite}
                          </span>
                        </p>
                      </div>

                      {/* Saisie quantité */}
                      <div className="flex items-center gap-1 w-28">
                        <button
                          type="button"
                          onClick={() =>
                            modifierQuantite(
                              item.piece.id,
                              String(
                                Math.max(0, Number(item.quantite || 0) - 1),
                              ),
                            )
                          }
                          className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center hover:bg-elevated transition-colors text-text-muted">
                          <Minus size={11} />
                        </button>
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={item.quantite}
                          onChange={(e) =>
                            modifierQuantite(item.piece.id, e.target.value)
                          }
                          placeholder="0"
                          className={`w-12 text-center bg-surface border rounded-lg px-1 py-1.5 text-sm font-semibold outline-none transition-colors ${
                            depasse
                              ? "border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 focus:border-red-400"
                              : "border-border text-text focus:border-blue-400 dark:focus:border-blue-500"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            modifierQuantite(
                              item.piece.id,
                              String(Number(item.quantite || 0) + 1),
                            )
                          }
                          className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center hover:bg-elevated transition-colors text-text-muted">
                          <Plus size={11} />
                        </button>
                      </div>

                      {/* Supprimer */}
                      <button
                        type="button"
                        onClick={() => retirerDuPanier(item.piece.id)}
                        className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Bouton Soumettre ─────────────────────────────────────────────── */}
          <Button
            type="submit"
            disabled={submitting || !panierValide}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 h-10">
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Enregistrement en cours…
              </>
            ) : (
              <>
                <ChevronRight size={14} />
                Confirmer{" "}
                {panier.length > 0
                  ? `${panier.length} sortie(s)`
                  : "les sorties"}
              </>
            )}
          </Button>
        </form>

        {/* ── Sidebar droite (1/3) ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Résumé stock */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mb-4">
              État du stock
            </p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <StockStat label="Références" value={pieces.length} />
              <StockStat
                label="Alertes"
                value={alertes.length}
                variant={alertes.length > 0 ? "danger" : "default"}
              />
              <StockStat label="OT actifs" value={ots.length} />
            </div>

            {alertes.length > 0 && (
              <>
                <Separator className="bg-border mb-3" />
                <p className="text-[10px] uppercase tracking-widest text-red-500 font-semibold mb-2">
                  À réapprovisionner
                </p>
                <ScrollArea className="max-h-36">
                  <div className="space-y-1.5">
                    {alertes.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between text-xs p-2 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 rounded-lg">
                        <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                          {a.reference}
                        </span>
                        <span className="text-red-500 font-bold tabular-nums">
                          {a.quantiteStock}/{a.seuilMinimum}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>

          {/* OT actifs */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">
                Interventions actives
              </p>
              <span className="text-[10px] text-text-muted bg-elevated border border-border px-1.5 py-0.5 rounded-full">
                {ots.length}
              </span>
            </div>
            <ScrollArea className="max-h-72">
              <div className="space-y-1.5">
                {ots.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6">
                    Aucune intervention active
                  </p>
                ) : (
                  ots.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setOtSelectionne(o);
                        setOtSearch("");
                        setOtDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                        otSelectionne?.id === o.id
                          ? "bg-blue-50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20"
                          : "bg-elevated border-border-subtle hover:border-border"
                      }`}>
                      <div className="min-w-0">
                        <p className="text-sm font-mono font-semibold text-text">
                          {o.numero}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {o.actif_detail?.libelle?.slice(0, 30)}
                        </p>
                      </div>
                      <PrioriteBadge priorite={o.priorite} />
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Récapitulatif panier */}
          {panier.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mb-3">
                Récapitulatif
              </p>
              <div className="space-y-1.5">
                {panier.map((item) => (
                  <div
                    key={item.piece.id}
                    className="flex items-center justify-between text-xs">
                    <span className="font-mono text-text truncate">
                      {item.piece.reference}
                    </span>
                    <span className="text-text-muted tabular-nums flex-shrink-0 ml-2">
                      {item.quantite || "—"} {item.piece.unite}
                    </span>
                  </div>
                ))}
                <Separator className="bg-border mt-2 mb-2" />
                <div className="flex items-center justify-between text-xs font-semibold text-text">
                  <span>Total articles</span>
                  <span>{panier.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function PrioriteBadge({ priorite }) {
  const map = {
    critique:
      "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
    haute:
      "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    normale:
      "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
    basse: "bg-surface text-text-muted border-border",
  };
  return (
    <span
      className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-lg border flex-shrink-0 ${map[priorite] ?? map.basse}`}>
      {priorite}
    </span>
  );
}

function StockStat({ label, value, variant = "default" }) {
  const variants = {
    default: "text-text",
    danger: "text-red-600 dark:text-red-400",
    success: "text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div className="bg-elevated border border-border-subtle rounded-lg p-3 text-center">
      <p className={`text-xl font-bold tabular-nums ${variants[variant]}`}>
        {value}
      </p>
      <p className="text-[10px] text-text-muted mt-0.5">{label}</p>
    </div>
  );
}
