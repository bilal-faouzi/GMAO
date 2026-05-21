import { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  Grid3x3,
  Factory,
  ChevronRight,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { getSocietes, getArborescence } from "@/services/organisationService";
import { Button } from "@/components/ui/button";

//  Nœud de l'arbre
function TreeNode({ node, level = 0, icon: Icon, color }) {
  const [open, setOpen] = useState(level < 2);
  const children = node.sites || node.secteurs || node.unites || [];
  const hasChildren = children.length > 0;

  const icons = {
    0: {
      Icon: Building2,
      color: "text-blue-700 dark:text-primary",
      bg: "bg-blue-100 dark:bg-primary-soft",
    },
    1: {
      Icon: MapPin,
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-500/10",
    },
    2: {
      Icon: Grid3x3,
      color: "text-violet-700 dark:text-violet-400",
      bg: "bg-violet-100 dark:bg-violet-500/10",
    },
    3: {
      Icon: Factory,
      color: "text-amber-700 dark:text-warning",
      bg: "bg-amber-100 dark:bg-amber-500/10",
    },
  };
  const { Icon: NodeIcon, color: nodeColor, bg } = icons[level] || icons[3];

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface transition-colors ${level === 0 ? "mb-1" : ""}`}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={() => hasChildren && setOpen(!open)}>
        {hasChildren ? (
          <span className="text-text-muted w-4">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span className="w-4" />
        )}

        <span className={`p-1 rounded ${bg}`}>
          <NodeIcon size={13} className={nodeColor} />
        </span>

        <span className="flex-1 text-sm text-text font-medium truncate">
          {node.raisonSociale || node.libelle}
        </span>

        <span className="text-xs text-text-muted font-mono">{node.code}</span>

        {!node.estActif && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-danger-soft text-red-700 dark:text-danger">
            Inactif
          </span>
        )}
      </div>

      {open && hasChildren && (
        <div>
          {children.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

//  Page principale
export default function Organisation() {
  const [societes, setSocietes] = useState([]);
  const [arbres, setArbres] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingArbres, setLoadingArbres] = useState({});
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    fetchSocietes();
  }, []);

  async function fetchSocietes() {
    try {
      setLoading(true);
      const res = await getSocietes();
      const list = res.data.results || res.data;
      setSocietes(list);
      // Charger automatiquement l'arborescence de chaque société
      list.forEach((s) => fetchArborescence(s.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchArborescence(societeId) {
    try {
      setLoadingArbres((prev) => ({ ...prev, [societeId]: true }));
      const res = await getArborescence(societeId);
      setArbres((prev) => ({ ...prev, [societeId]: res.data }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingArbres((prev) => ({ ...prev, [societeId]: false }));
    }
  }

  // Statistiques
  const stats = societes.reduce(
    (acc, s) => {
      const arbre = arbres[s.id];
      if (!arbre) return acc;
      const sites = arbre.sites || [];
      const secteurs = sites.flatMap((si) => si.secteurs || []);
      const unites = secteurs.flatMap((se) => se.unites || []);
      return {
        sites: acc.sites + sites.length,
        secteurs: acc.secteurs + secteurs.length,
        unites: acc.unites + unites.length,
      };
    },
    { sites: 0, secteurs: 0, unites: 0 },
  );

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Organisation</h1>
          <p className="text-text-secondary text-sm mt-1">
            Structure hiérarchique de l'entreprise
          </p>
        </div>
        <Button onClick={fetchSocietes} variant="customOutline">
          <RefreshCw size={14} />
          Actualiser
        </Button>
      </div>

      {/* Cartes stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Sociétés",
            value: societes.length,
            icon: Building2,
            color: "text-blue-700 dark:text-primary",
            bg: "bg-blue-100 dark:bg-primary-soft",
          },
          {
            label: "Sites",
            value: stats.sites,
            icon: MapPin,
            color: "text-emerald-700 dark:text-emerald-400",
            bg: "bg-emerald-100 dark:bg-emerald-500/10",
          },
          {
            label: "Secteurs",
            value: stats.secteurs,
            icon: Grid3x3,
            color: "text-violet-700 dark:text-violet-400",
            bg: "bg-violet-100 dark:bg-violet-500/10",
          },
          {
            label: "Unités",
            value: stats.unites,
            icon: Factory,
            color: "text-amber-700 dark:text-amber-400",
            bg: "bg-amber-100 dark:bg-amber-500/10",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${bg}`}>
              <Icon size={20} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-text">
                {loading ? "—" : value}
              </p>
              <p className="text-xs text-text-secondary">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Arbre */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2">
          <Building2 size={15} className="text-blue-700 dark:text-primary" />
          Arborescence complète
        </h2>

        {loading ? (
          <div className="text-center py-12 text-text-muted">Chargement...</div>
        ) : societes.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            Aucune société. Créez-en une depuis l'admin Django.
          </div>
        ) : (
          <div className="space-y-1">
            {societes.map((s) =>
              arbres[s.id] ? (
                <TreeNode key={s.id} node={arbres[s.id]} level={0} />
              ) : (
                <div key={s.id} className="px-3 py-2 text-sm text-text-muted">
                  {s.raisonSociale} — chargement...
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
