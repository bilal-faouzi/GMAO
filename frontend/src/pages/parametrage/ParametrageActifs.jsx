import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Tags,
  Activity,
  Layers,
  BarChart3,
  ArrowRight,
  Package,
} from "lucide-react";

const items = [
  {
    id: "types",
    title: "Types d'actifs",
    description: "Gérez les types d'actifs (Équipement, Infrastructure, Véhicule, etc.)",
    icon: Tags,
    color: "bg-primary-soft text-blue-600 dark:text-primary",
    border: "border-blue-200 dark:border-primary/20",
    hover: "hover:border-blue-400 dark:hover:border-blue-400/40",
    path: "/parametrage/actifs/types",
    active: true,
    count: 4,
  },
  {
    id: "statuts",
    title: "Statuts d'actifs",
    description: "Définissez les statuts possibles (Actif, En panne, En maintenance, Retiré)",
    icon: Activity,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-500/20",
    hover: "hover:border-emerald-400 dark:hover:border-emerald-400/40",
    path: "#",
    active: false,
    count: 0,
  },
  {
    id: "categories",
    title: "Catégories",
    description: "Classez vos actifs par catégories métier",
    icon: Layers,
    color: "bg-primary-soft text-purple-600 dark:text-primary",
    border: "border-purple-200 dark:border-primary/20",
    hover: "hover:border-purple-400 dark:hover:border-purple-400/40",
    path: "#",
    active: false,
    count: 0,
  },
  {
    id: "indicateurs",
    title: "Indicateurs de santé",
    description: "Paramétrez les seuils de disponibilité et criticité",
    icon: BarChart3,
    color: "bg-warning/10 text-amber-600 dark:text-warning",
    border: "border-amber-200 dark:border-warning/20",
    hover: "hover:border-amber-400 dark:hover:border-amber-400/40",
    path: "#",
    active: false,
    count: 0,
  },
];

export default function ParametrageActifs() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/parametrage")}
          className="p-2 rounded-lg hover:bg-hover text-text-muted hover:text-text transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-xs text-text-secondary font-medium">Paramétrage</div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <Package size={20} className="text-blue-500" />
            Actifs
          </h1>
        </div>
      </div>

      <p className="text-text-secondary text-sm">
        Gérez les paramètres de référence du module Actifs
      </p>

      {/* Items grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => item.active && navigate(item.path)}
              disabled={!item.active}
              className={`group relative bg-surface border ${item.border} ${
                item.active ? item.hover : ""
              } rounded-xl p-5 text-left transition-all duration-200 ${
                item.active
                  ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                  : "opacity-50 cursor-not-allowed"
              }`}>
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-lg ${item.color} shrink-0`}>
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-text font-semibold">{item.title}</h3>
                    {item.active && item.count > 0 && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-secondary text-text-secondary">
                        {item.count} élément(s)
                      </span>
                    )}
                    {!item.active && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-secondary text-text-muted">
                        Bientôt
                      </span>
                    )}
                  </div>
                  <p className="text-text-secondary text-sm mt-1 leading-relaxed">
                    {item.description}
                  </p>
                  {item.active && (
                    <div className="flex items-center gap-1 mt-3 text-sm font-medium text-text-muted group-hover:text-text transition-colors">
                      <span>Gérer</span>
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
