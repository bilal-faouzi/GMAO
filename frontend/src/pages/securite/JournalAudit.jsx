import { useEffect, useState, useCallback } from "react";
import { Search, Activity } from "lucide-react";
import { getJournalAuditv2 } from "../../services/securiteService";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const ACTION_COLORS = {
  CREATE: "bg-emerald-500/10 text-emerald-400",
  UPDATE: "bg-orange-500/10 text-orange-400",
  DELETE: "bg-red-500/10 text-red-400",
  LOGIN: "bg-blue-500/10 text-blue-400",
  LOGOUT: "bg-white/5 text-gray-400",
  ASSIGN_ROLE: "bg-purple-500/10 text-purple-400",
  DEACTIVATE: "bg-red-500/10 text-red-400",
};

const MODULES = ["UTILISATEURS", "ROLES", "PERMISSIONS", "INTERVENTIONS"];
const ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "ASSIGN_ROLE",
];

export default function JournalAudit() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    search: "",
    action: "",
    module: "",
    date_debut: "",
    date_fin: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: String(page),
        page_size: "10",
      };
      if (appliedFilters.search) params.search = appliedFilters.search;
      if (appliedFilters.action) params.action = appliedFilters.action;
      if (appliedFilters.module) params.module = appliedFilters.module;
      if (appliedFilters.date_debut)
        params.date_debut = appliedFilters.date_debut;
      if (appliedFilters.date_fin) params.date_fin = appliedFilters.date_fin;

      const res = await getJournalAuditv2(params);
      setEntries(res.data.results);
      setTotal(res.data.count);
      setTotalPages(res.data.total_pages);
    } catch (e) {
      toast.error("Erreur lors du chargement de l'audit");
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilters]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    const empty = {
      search: "",
      action: "",
      module: "",
      date_debut: "",
      date_fin: "",
    };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  };

  const hasActiveFilters = Object.values(appliedFilters).some((v) => v !== "");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Journal d'Audit</h1>
          <p className="text-slate-400 text-sm mt-1">
            Historique des actions effectuées dans le système
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <Activity size={15} className="text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">
            {total} entrée{total !== 1 ? "s" : ""} enregistrée
            {total !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs text-slate-400">Recherche</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                className="pl-9"
                placeholder="Action, module, utilisateur, IP..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Action</Label>
            <Select
              value={filters.action}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, action: v === "all" ? "" : v }))
              }>
              <SelectTrigger>
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Module</Label>
            <Select
              value={filters.module}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, module: v === "all" ? "" : v }))
              }>
              <SelectTrigger>
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {MODULES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Date début</Label>
            <Input
              type="date"
              value={filters.date_debut}
              onChange={(e) =>
                setFilters((f) => ({ ...f, date_debut: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Date fin</Label>
            <Input
              type="date"
              value={filters.date_fin}
              onChange={(e) =>
                setFilters((f) => ({ ...f, date_fin: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={applyFilters} variant="outline_secondary" size="sm">
            <Search className="w-4 h-4 mr-2" /> Filtrer
          </Button>
          {hasActiveFilters && (
            <Button
              variant="outline_secondary"
              size="sm"
              onClick={resetFilters}>
              <X className="w-4 h-4 mr-2" /> Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {[
                "Horodatage",
                "Utilisateur",
                "Action",
                "Module",
                "Entité",
                "Adresse IP",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-gray-500">
                  Chargement...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-gray-500">
                  Aucune entrée
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(entry.horodatage).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 text-xs font-bold">
                          {entry.utilisateur?.nom_utilisateur?.[0]?.toUpperCase() ||
                            "?"}
                        </span>
                      </div>
                      <span className="text-sm text-white">
                        {entry.utilisateur?.nom_utilisateur || "—"}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[entry.action] || "bg-white/5 text-gray-400"}`}>
                      {entry.action}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/5 text-gray-400">
                      {entry.module}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-400">
                    <span className="font-medium text-white">
                      {entry.type_entite}
                    </span>
                    {entry.id_entite && (
                      <span className="text-gray-600 text-xs ml-1">
                        #{entry.id_entite.slice(0, 8)}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-gray-600">
                      {entry.adresse_ip || "—"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline_secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline_secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
