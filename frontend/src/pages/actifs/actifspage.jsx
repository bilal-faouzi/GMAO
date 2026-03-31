import { useEffect, useState, useCallback } from "react";
import {
  ChevronRight,
  RotateCcw,
  Search,
  Package,
  Zap,
  Settings,
  Waves,
  Wind,
  Cpu,
} from "lucide-react";
import { getActifsArborescence } from "@/services/actif";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ─── Config badges ────────────────────────────────────────────────────────────

const STATUT_CONFIG = {
  EN_SERVICE: {
    label: "En service",
    bg: "#052e16",
    text: "#4ade80",
    dot: "#22c55e",
  },
  EN_MAINTENANCE: {
    label: "Maintenance",
    bg: "#431407",
    text: "#fdba74",
    dot: "#f97316",
  },
  EN_PANNE: {
    label: "En panne",
    bg: "#450a0a",
    text: "#f87171",
    dot: "#ef4444",
  },
  HORS_SERVICE: {
    label: "Hors service",
    bg: "#1c1917",
    text: "#a8a29e",
    dot: "#78716c",
  },
  RESERVE: { label: "Réservé", bg: "#0c1a4b", text: "#93c5fd", dot: "#3b82f6" },
};

const CRITICITE_CONFIG = {
  CRITIQUE: { label: "Critique", color: "#ef4444" },
  ELEVEE: { label: "Élevée", color: "#f97316" },
  MOYENNE: { label: "Moyenne", color: "#eab308" },
  FAIBLE: { label: "Faible", color: "#22c55e" },
};

const TYPE_ICONS = {
  MECANIQUE: <Settings size={12} />,
  ELECTRIQUE: <Zap size={12} />,
  HYDRAULIQUE: <Waves size={12} />,
  PNEUMATIQUE: <Wind size={12} />,
  AUTOMATISME: <Cpu size={12} />,
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function matchSearch(node, q) {
  if (!q) return true;
  const lower = q.toLowerCase();
  if (
    node.codeActif?.toLowerCase().includes(lower) ||
    node.designation?.toLowerCase().includes(lower)
  )
    return true;
  return (node.enfants || []).some((c) => matchSearch(c, q));
}

function filterTree(nodes, q) {
  if (!q) return nodes;
  return nodes
    .filter((n) => matchSearch(n, q))
    .map((n) => ({
      ...n,
      enfants: filterTree(n.enfants || [], q),
    }));
}

// ─── Badge Statut ─────────────────────────────────────────────────────────────

function StatutBadge({ statut }) {
  const cfg = STATUT_CONFIG[statut] || {
    label: statut,
    bg: "#1f1f23",
    text: "#71717a",
    dot: "#71717a",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 999,
        background: cfg.bg,
        color: cfg.text,
        fontSize: 11,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}

// ─── Badge Criticité ──────────────────────────────────────────────────────────

function CriticiteBadge({ criticite }) {
  const cfg = CRITICITE_CONFIG[criticite];
  if (!cfg) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 7px",
        borderRadius: 4,
        border: `1px solid ${cfg.color}33`,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 500,
      }}>
      {cfg.label}
    </span>
  );
}

// ─── Badge Type ───────────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  const icon = TYPE_ICONS[type];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 7px",
        borderRadius: 4,
        background: "#ffffff0a",
        border: "1px solid #ffffff12",
        color: "#94a3b8",
        fontSize: 11,
      }}>
      {icon}
      {type}
    </span>
  );
}

// ─── Tree Node ────────────────────────────────────────────────────────────────

function TreeNode({ node, depth = 0, searchQuery }) {
  const hasChildren = node.enfants && node.enfants.length > 0;
  const autoExpand = !!searchQuery && matchSearch(node, searchQuery);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchQuery) setOpen(autoExpand);
  }, [searchQuery, autoExpand]);

  const isHighlighted =
    searchQuery &&
    (node.codeActif?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.designation?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ position: "relative" }}>
      {/* Ligne de connexion verticale pour les enfants */}
      {depth > 0 && (
        <div
          style={{
            position: "absolute",
            left: depth * 20 - 12,
            top: 0,
            bottom: 0,
            width: 1,
            background: "#ffffff0d",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Ligne horizontale vers le nœud */}
      {depth > 0 && (
        <div
          style={{
            position: "absolute",
            left: depth * 20 - 12,
            top: 20,
            width: 10,
            height: 1,
            background: "#ffffff0d",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Nœud principal */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px 7px 0",
          paddingLeft: depth * 20 + 4,
          borderRadius: 8,
          background: isHighlighted ? "#1e3a5f" : "transparent",
          cursor: hasChildren ? "pointer" : "default",
          transition: "background 0.15s",
          position: "relative",
          zIndex: 1,
        }}
        onMouseEnter={(e) =>
          !isHighlighted && (e.currentTarget.style.background = "#ffffff07")
        }
        onMouseLeave={(e) =>
          !isHighlighted && (e.currentTarget.style.background = "transparent")
        }
        onClick={() => hasChildren && setOpen((v) => !v)}>
        {/* Chevron */}
        <div
          style={{
            width: 16,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
          {hasChildren ? (
            <ChevronRight
              size={14}
              style={{
                color: "#64748b",
                transform: open ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          ) : (
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#334155",
                margin: "auto",
              }}
            />
          )}
        </div>

        {/* Icône package */}
        <Package size={14} style={{ color: "#475569", flexShrink: 0 }} />

        {/* Code + Désignation */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontFamily: "monospace",
                color: "#64748b",
                fontWeight: 600,
                flexShrink: 0,
              }}>
              {node.codeActif}
            </span>
            <span
              style={{
                fontSize: 13,
                color: "#e2e8f0",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
              {node.designation}
            </span>
          </div>
        </div>

        {/* Badges — masqués sur mobile via flex-wrap */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}>
          <TypeBadge type={node.type} />
          <CriticiteBadge criticite={node.criticite} />
          <StatutBadge statut={node.statut} />
          {hasChildren && (
            <span
              style={{
                fontSize: 11,
                color: "#475569",
                background: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 4,
                padding: "1px 6px",
              }}>
              {node.enfants.length} enfant{node.enfants.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Enfants */}
      {hasChildren && open && (
        <div>
          {node.enfants.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Actifspage() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandAll, setExpandAll] = useState(false);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getActifsArborescence();
      setTree(res.data ?? []);
    } catch {
      // toast.error("Erreur lors du chargement des actifs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const displayed = filterTree(tree, search);

  const totalActifs = (nodes) =>
    nodes.reduce((acc, n) => acc + 1 + totalActifs(n.enfants || []), 0);

  return (
    <div className="page" style={{ fontFamily: "'DM Mono', monospace" }}>
      {/* Header */}
      <div className="hdr">
        <div className="hdr-l">
          <h1>Arborescence des actifs</h1>
          <p>Vue hiérarchique de tous les équipements</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-chip">
          <strong>{tree.length}</strong>&nbsp;actifs racines
        </div>
        <div className="stat-chip">
          <strong>{totalActifs(tree)}</strong>&nbsp;actifs au total
        </div>
      </div>

      {/* Barre de recherche + actions */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="search-wrap" style={{ flex: 1 }}>
            <Search size={14} className="search-icon" />
            <Input
              className="search-input"
              placeholder="Rechercher par code ou désignation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button className="pill" onClick={fetchTree} title="Rafraîchir">
            <RotateCcw size={13} />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* Tree */}
      <div className="tbl-card" style={{ padding: "8px 16px" }}>
        <div className="tbl-head" style={{ marginBottom: 8 }}>
          <span className="tbl-title">Hiérarchie des équipements</span>
          <span className="tbl-count">
            {loading
              ? "Chargement…"
              : `${displayed.length} racine${displayed.length > 1 ? "s" : ""}`}
          </span>
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "8px 0",
            }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  paddingLeft: (i % 3) * 20,
                }}>
                <div
                  className="skeleton"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                />
                <div
                  className="skeleton"
                  style={{ width: `${30 + Math.random() * 40}%`, height: 14 }}
                />
                <div
                  className="skeleton"
                  style={{
                    width: 80,
                    height: 20,
                    borderRadius: 999,
                    marginLeft: "auto",
                  }}
                />
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--text-muted)",
              fontSize: 14,
            }}>
            {search
              ? `Aucun actif trouvé pour « ${search} »`
              : "Aucun actif disponible"}
          </div>
        ) : (
          <div style={{ paddingBottom: 8 }}>
            {displayed.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                searchQuery={search}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
