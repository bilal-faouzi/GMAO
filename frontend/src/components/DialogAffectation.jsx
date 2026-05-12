import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Users,
  Briefcase,
  Search,
  X,
  Check,
  ChevronRight,
  Shield,
  UserCheck,
  CalendarDays,
  CalendarCheck,
  BadgeDollarSign,
  Loader2,
  Filter,
} from "lucide-react";
import { getUtilisateurs, getRoles } from "@/services/securiteService";
import { getSousTraitants } from "@/services/soustraitantService";
import { affecterEquipe } from "@/services/ordreService";

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Avatar initiales ─────────────────────────────────────────────────────────
function Avatar({ prenom = "", nom = "", className = "" }) {
  return (
    <div
      className={`rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0 ${className}`}>
      {prenom[0] ?? ""}
      {nom[0] ?? ""}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function DialogAffectation({
  open,
  onOpenChange,
  idOT,
  numeroOT,
  onSuccess,
}) {
  const [mode, setMode] = useState("interne"); // "interne" | "soustraitant"

  // ── État Équipe interne ───────────────────────────────────────────────────
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [searchUsers, setSearchUsers] = useState("");
  const debouncedSearchUsers = useDebounce(searchUsers);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [chefId, setChefId] = useState("");

  // ── État Sous-traitant ────────────────────────────────────────────────────
  const [searchST, setSearchST] = useState("");
  const debouncedSearchST = useDebounce(searchST);
  const [soustraitants, setSoustraitants] = useState([]);
  const [loadingST, setLoadingST] = useState(false);
  const [selectedST, setSelectedST] = useState(null);
  const [coutPrestation, setCoutPrestation] = useState("");

  // ── Dates communes ────────────────────────────────────────────────────────
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  // ── Soumission ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ─── Chargement des rôles ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    getRoles()
      .then((r) => setRoles(r.data.results ?? r.data))
      .catch(console.error);
  }, [open]);

  // ─── Chargement des utilisateurs ─────────────────────────────────────────
  useEffect(() => {
    if (!open || mode !== "interne") return;
    const params = {};
    if (selectedRole) params.role = selectedRole;
    if (debouncedSearchUsers) params.search = debouncedSearchUsers;
    setLoadingUsers(true);
    getUtilisateurs(params)
      .then((r) => setUsers(r.data.results ?? r.data))
      .catch(console.error)
      .finally(() => setLoadingUsers(false));
  }, [open, mode, selectedRole, debouncedSearchUsers]);

  // ─── Chargement des sous-traitants ───────────────────────────────────────
  useEffect(() => {
    if (!open || mode !== "soustraitant") return;
    const filters = {};
    if (debouncedSearchST) filters.search = debouncedSearchST;
    setLoadingST(true);
    getSousTraitants(filters)
      .then((r) => setSoustraitants(r.data.results ?? r.data))
      .catch(console.error)
      .finally(() => setLoadingST(false));
  }, [open, mode, debouncedSearchST]);

  // ─── Reset complet ────────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    setMode("interne");
    setSelectedUsers([]);
    setChefId("");
    setSelectedST(null);
    setDateDebut("");
    setDateFin("");
    setCoutPrestation("");
    setSearchUsers("");
    setSearchST("");
    setSelectedRole("");
    setError("");
  }, []);

  const handleClose = (val) => {
    if (!val) resetAll();
    onOpenChange(val);
  };

  // ─── Sélection utilisateurs ───────────────────────────────────────────────
  const toggleUser = (user) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      if (exists) {
        if (chefId === user.id) setChefId("");
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, user];
    });
  };

  // ─── Soumission ───────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "interne") {
        await affecterEquipe(idOT, {
          idChefTechnicien: chefId || null,
          membres: selectedUsers.map((u) => ({ idUtilisateur: u.id })),
          dateDebut,
          dateFin: dateFin || null,
        });
      } else {
        await affecterEquipe(idOT, {
          idSousTraitant: selectedST.id,
          dateDebut,
          dateFin: dateFin || null,
          coutPrestation: coutPrestation ? Number(coutPrestation) : null,
        });
      }
      handleClose(false);
      onSuccess?.();
    } catch (e) {
      console.error(e);
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !!dateDebut &&
    (mode === "interne" ? selectedUsers.length > 0 : !!selectedST);

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <UserCheck size={16} className="text-primary" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold leading-tight">
                Nouvelle affectation
              </DialogTitle>
              <p className="text-xs text-text-muted font-mono mt-0.5">
                {numeroOT}
              </p>
            </div>
          </div>
          <DialogDescription className="text-xs text-text-muted">
            Affectez une équipe interne ou un sous-traitant à l'OT{" "}
            <span className="font-mono text-text">{numeroOT}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* ── Corps scrollable ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          <Tabs value={mode} onValueChange={setMode}>
            {/* Switcher mode */}
            <TabsList className="bg-surface border border-border p-1 h-auto rounded-xl gap-0.5 w-full">
              <TabsTrigger
                value="interne"
                className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-elevated data-[state=active]:shadow-sm data-[state=active]:text-text text-text-muted transition-all">
                <Users size={13} />
                Équipe interne
              </TabsTrigger>
              <TabsTrigger
                value="soustraitant"
                className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-elevated data-[state=active]:shadow-sm data-[state=active]:text-text text-text-muted transition-all">
                <Briefcase size={13} />
                Sous-traitant
              </TabsTrigger>
            </TabsList>

            {/* ════════════════════════════════════════════════════════════════
                Onglet — Équipe interne
            ════════════════════════════════════════════════════════════════ */}
            <TabsContent value="interne" className="space-y-3 mt-3">
              {/* Filtre rôle + recherche */}
              <div className="flex gap-2">
                <div className="relative flex-shrink-0">
                  <Filter
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                  />
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="appearance-none pl-7 pr-3 py-2 bg-elevated border border-border text-text text-xs rounded-lg outline-none focus:border-primary/50 transition-colors cursor-pointer min-w-[130px]">
                    <option value="">Tous les rôles</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative flex-1">
                  <Search
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    value={searchUsers}
                    onChange={(e) => setSearchUsers(e.target.value)}
                    placeholder="Nom, prénom, email…"
                    className="w-full pl-8 pr-3 py-2 bg-elevated border border-border text-text placeholder:text-text-muted text-xs rounded-lg outline-none focus:border-primary/50 transition-colors"
                  />
                  {searchUsers && (
                    <button
                      onClick={() => setSearchUsers("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors">
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>

              {/* Badges sélectionnés */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-elevated border border-border rounded-lg">
                  {selectedUsers.map((u) => (
                    <span
                      key={u.id}
                      className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                        chefId === u.id
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-surface border-border text-text-muted"
                      }`}>
                      {chefId === u.id && (
                        <Shield size={9} className="flex-shrink-0" />
                      )}
                      {u.prenom} {u.nom}
                      <button
                        onClick={() => toggleUser(u)}
                        className="ml-0.5 hover:text-red-500 transition-colors">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Liste des utilisateurs */}
              <div className="border border-border rounded-lg overflow-hidden">
                {loadingUsers ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-text-muted">
                    <Loader2 size={13} className="animate-spin" />
                    Chargement…
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-center text-xs text-text-muted py-8">
                    Aucun utilisateur trouvé
                  </p>
                ) : (
                  <div className="max-h-44 overflow-y-auto divide-y divide-border">
                    {users.map((u) => {
                      const isSelected = !!selectedUsers.find(
                        (s) => s.id === u.id,
                      );
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleUser(u)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-elevated transition-colors ${
                            isSelected ? "bg-primary/5" : ""
                          }`}>
                          <Avatar
                            prenom={u.prenom}
                            nom={u.nom}
                            className="w-7 h-7"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text truncate">
                              {u.prenom} {u.nom}
                            </p>
                            <p className="text-[10px] text-text-muted truncate">
                              {u.email}
                            </p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-border"
                            }`}>
                            {isSelected && (
                              <Check size={10} className="text-white" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Chef désigné */}
              {selectedUsers.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5 text-text">
                    <Shield size={11} className="text-primary" />
                    Chef technicien
                    <span className="text-text-muted font-normal">
                      (optionnel)
                    </span>
                  </Label>
                  <select
                    value={chefId}
                    onChange={(e) => setChefId(e.target.value)}
                    className="w-full appearance-none px-3 py-2 bg-elevated border border-border text-text text-xs rounded-lg outline-none focus:border-primary/50 transition-colors cursor-pointer">
                    <option value="">— Aucun chef désigné —</option>
                    {selectedUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.prenom} {u.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════════
                Onglet — Sous-traitant
            ════════════════════════════════════════════════════════════════ */}
            <TabsContent value="soustraitant" className="space-y-3 mt-3">
              {/* Recherche */}
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  value={searchST}
                  onChange={(e) => setSearchST(e.target.value)}
                  placeholder="Raison sociale, email…"
                  className="w-full pl-8 pr-8 py-2 bg-elevated border border-border text-text placeholder:text-text-muted text-xs rounded-lg outline-none focus:border-primary/50 transition-colors"
                />
                {searchST && (
                  <button
                    onClick={() => setSearchST("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors">
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Liste des sous-traitants */}
              <div className="border border-border rounded-lg overflow-hidden">
                {loadingST ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-text-muted">
                    <Loader2 size={13} className="animate-spin" />
                    Chargement…
                  </div>
                ) : soustraitants.length === 0 ? (
                  <p className="text-center text-xs text-text-muted py-8">
                    Aucun sous-traitant trouvé
                  </p>
                ) : (
                  <div className="max-h-44 overflow-y-auto divide-y divide-border">
                    {soustraitants.map((st) => {
                      const isSelected = selectedST?.id === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setSelectedST(isSelected ? null : st)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-elevated transition-colors ${
                            isSelected ? "bg-primary/5" : ""
                          }`}>
                          <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 flex items-center justify-center flex-shrink-0">
                            <Briefcase
                              size={13}
                              className="text-orange-600 dark:text-orange-400"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text truncate">
                              {st.raisonSociale}
                            </p>
                            <p className="text-[10px] text-text-muted truncate">
                              {st.email ?? st.telephone ?? "—"}
                            </p>
                          </div>
                          {/* Radio visuel */}
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? "border-primary" : "border-border"
                            }`}>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Coût prestation */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5 text-text">
                  <BadgeDollarSign size={11} className="text-primary" />
                  Coût prestation
                  <span className="text-text-muted font-normal">
                    (optionnel)
                  </span>
                </Label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={coutPrestation}
                    onChange={(e) => setCoutPrestation(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-3 pr-14 py-2 bg-elevated border border-border text-text placeholder:text-text-muted text-xs rounded-lg outline-none focus:border-primary/50 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-text-muted font-medium">
                    MAD
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* ── Dates communes ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5 text-text">
                <CalendarDays size={11} className="text-primary" />
                Date début
                <span className="text-red-500">*</span>
              </Label>
              <input
                type="datetime-local"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full px-3 py-2 bg-elevated border border-border text-text text-xs rounded-lg outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5 text-text">
                <CalendarCheck size={11} className="text-primary" />
                Date fin
                <span className="text-[10px] text-text-muted font-normal">
                  (optionnelle)
                </span>
              </Label>
              <input
                type="datetime-local"
                value={dateFin}
                min={dateDebut}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full px-3 py-2 bg-elevated border border-border text-text text-xs rounded-lg outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* ── Erreur ────────────────────────────────────────────────────── */}
          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <DialogFooter className="px-5 py-4 border-t border-border flex-shrink-0 gap-2">
          {/* Résumé sélection */}
          <div className="flex-1 text-xs text-text-muted">
            {mode === "interne" && selectedUsers.length > 0 && (
              <span>
                {selectedUsers.length} membre
                {selectedUsers.length > 1 ? "s" : ""} sélectionné
                {selectedUsers.length > 1 ? "s" : ""}
              </span>
            )}
            {mode === "soustraitant" && selectedST && (
              <span className="truncate">{selectedST.raisonSociale}</span>
            )}
          </div>

          <Button
            variant="customOutline"
            onClick={() => handleClose(false)}
            disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="gap-2 disabled:opacity-50">
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <ChevronRight size={14} />
            )}
            {loading ? "Affectation…" : "Affecter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
