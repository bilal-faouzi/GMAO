import { useNavigate } from "react-router-dom";
import {
  Package,
  Store,
  ClipboardCheck,
  Shield,
  Users,
  Wrench,
  Building2,
  DatabaseBackup,
  ArrowRight,
} from "lucide-react";

const categories = [
  {
    id: "actifs",
    title: "Actifs",
    description: "Types, statuts, catégories et classifications des actifs",
    icon: Package,
    color: "bg-primary-soft text-blue-600 dark:text-primary",
    border: "border-blue-200 dark:border-primary/20",
    hover: "hover:border-blue-400 dark:hover:border-blue-400/40",
    path: "/parametrage/actifs",
    count: 1,
  },
  {
    id: "magasin",
    title: "Magasin",
    description: "Catégories de pièces, unités de mesure, emplacements",
    icon: Store,
    color: "bg-warning/10 text-amber-600 dark:text-warning",
    border: "border-amber-200 dark:border-warning/20",
    hover: "hover:border-amber-400 dark:hover:border-amber-400/40",
    path: "/parametrage/magasin",
    count: 0,
  },
  {
    id: "ordres",
    title: "Interventions",
    description: "Types de demandes, priorités, motifs d'indisponibilité",
    icon: ClipboardCheck,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-500/20",
    hover: "hover:border-emerald-400 dark:hover:border-emerald-400/40",
    path: "/parametrage/ordres",
    count: 0,
  },
  {
    id: "organisation",
    title: "Organisation",
    description: "Secteurs, spécialités, types d'appartenance",
    icon: Building2,
    color: "bg-primary-soft text-purple-600 dark:text-primary",
    border: "border-purple-200 dark:border-primary/20",
    hover: "hover:border-purple-400 dark:hover:border-purple-400/40",
    path: "/parametrage/organisation",
    count: 0,
  },
  {
    id: "securite",
    title: "Sécurité",
    description: "Rôles, permissions, règles de session",
    icon: Shield,
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-500/20",
    hover: "hover:border-rose-400 dark:hover:border-rose-400/40",
    path: "/parametrage/securite",
    count: 0,
  },
  {
    id: "utilisateurs",
    title: "Utilisateurs",
    description: "Profils, niveaux d'accès, habilitations",
    icon: Users,
    color: "bg-status-cyan/10 text-cyan-600 dark:text-status-cyan",
    border: "border-cyan-200 dark:border-cyan-500/20",
    hover: "hover:border-cyan-400 dark:hover:border-cyan-400/40",
    path: "/parametrage/utilisateurs",
    count: 0,
  },
  {
    id: "soustraitants",
    title: "Sous-traitants",
    description: "Spécialités, statuts, types de contrat",
    icon: Wrench,
    color: "bg-status-orange/10 text-orange-600 dark:text-status-orange",
    border: "border-orange-200 dark:border-orange-500/20",
    hover: "hover:border-orange-400 dark:hover:border-orange-400/40",
    path: "/parametrage/soustraitants",
    count: 0,
  },
  {
    id: "backup",
    title: "Sauvegarde",
    description: "Exporter et télécharger un backup complet",
    icon: DatabaseBackup,
    color: "bg-blue-50 text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-500/20",
    hover: "hover:border-blue-400 dark:hover:border-blue-400/40",
    path: "/parametrage/backup",
    count: 1,
  },
];

export default function ParametrageHome() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Paramétrage</h1>
        <p className="text-text-secondary text-sm mt-1">
          Configurez les données de référence de votre application
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-text">8</div>
          <div className="text-xs text-text-secondary mt-1">Modules paramétrables</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-600 dark:text-primary">1</div>
          <div className="text-xs text-text-secondary mt-1">Module actif</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">4</div>
          <div className="text-xs text-text-secondary mt-1">Types d'actifs</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-text-muted">—</div>
          <div className="text-xs text-text-secondary mt-1">À venir</div>
        </div>
      </div>

      {/* Categories grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = cat.count > 0;
          return (
            <button
              key={cat.id}
              onClick={() => navigate(cat.path)}
              className={`group relative bg-surface border ${cat.border} ${cat.hover} rounded-xl p-5 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                isActive ? "ring-1 ring-blue-500/20" : "opacity-80"
              }`}>
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-lg ${cat.color}`}>
                  <Icon size={22} />
                </div>
                {isActive && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                    Actif
                  </span>
                )}
              </div>
              <h3 className="text-text font-semibold mt-3">{cat.title}</h3>
              <p className="text-text-secondary text-sm mt-1 leading-relaxed">
                {cat.description}
              </p>
              <div className="flex items-center gap-1 mt-4 text-sm font-medium text-text-muted group-hover:text-text transition-colors">
                <span>Configurer</span>
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
