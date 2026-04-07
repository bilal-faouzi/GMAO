import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Search,
  RotateCcw,
  Plus,
  Eye,
  Pencil,
  PlusCircle,
  Package,
  List,
  Settings,
  Zap,
  Waves,
  Wind,
  Cpu,
  MapPin,
  Factory,
  Hash,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUT_CONFIG = {
  actif: {
    label: "Actif",
    bg: "var(--status-green-bg)",
    text: "var(--status-green-text)",
    dot: "var(--status-green-dot)",
  },
  en_panne: {
    label: "En panne",
    bg: "var(--status-red-bg)",
    text: "var(--status-red-text)",
    dot: "var(--status-red-dot)",
  },
  en_maintenance: {
    label: "Maintenance",
    bg: "var(--status-orange-bg)",
    text: "var(--status-orange-text)",
    dot: "var(--status-orange-dot)",
  },
  retire: {
    label: "Retiré",
    bg: "var(--status-gray-bg)",
    text: "var(--status-gray-text)",
    dot: "var(--status-gray-dot)",
  },
};

const TYPE_ICONS = {
  equipement: <Settings size={12} />,
  infrastructure: <Factory size={12} />,
  vehicule: <Package size={12} />,
  autre: <Package size={12} />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatutBadge({ statut }) {
  const cfg = STATUT_CONFIG[statut] || {
    label: statut,
    bg: "var(--color-elevated)",
    text: "var(--color-text-muted)",
    dot: "var(--color-text-muted)",
  };
  return (
    <span className="badge" style={{ background: cfg.bg, color: cfg.text }}>
      <span className="bdot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }) {
  const icon = TYPE_ICONS[type] || <Package size={12} />;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 7px",
        borderRadius: 4,
        background: "var(--color-elevated)",
        border: "1px solid var(--color-border-subtle)",
        color: "var(--color-text-muted)",
        fontSize: 11,
      }}>
      {icon} {type}
    </span>
  );
}

// ─── Tree Node ────────────────────────────────────────────────────────────────

function ActifNode({ actif, niveau = 0, navigate }) {
  const [ouvert, setOuvert] = useState(true);
  const hasChildren = actif.sous_actifs && actif.sous_actifs.length > 0;

  return (
    <div style={{ position: "relative" }}>
      {/* Ligne verticale */}
      {niveau > 0 && (
        <div
          style={{
            position: "absolute",
            left: niveau * 22 - 12,
            top: 0,
            bottom: 0,
            width: 1,
            background: "var(--color-border-subtle)",
            pointerEvents: "none",
          }}
        />
      )}
      {/* Ligne horizontale */}
      {niveau > 0 && (
        <div
          style={{
            position: "absolute",
            left: niveau * 22 - 12,
            top: 22,
            width: 10,
            height: 1,
            background: "var(--color-border-subtle)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Node content */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px 8px 0",
          paddingLeft: niveau * 22 + 4,
          borderRadius: "var(--r-sm)",
          cursor: hasChildren ? "pointer" : "default",
          transition: "background .15s",
          position: "relative",
          zIndex: 1,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--color-hover)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        onClick={() => hasChildren && setOuvert((v) => !v)}>
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
                color: "var(--color-text-muted)",
                transform: ouvert ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform .2s",
              }}
            />
          ) : (
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--color-active)",
                margin: "auto",
              }}
            />
          )}
        </div>

        {/* Icône type */}
        <Package
          size={14}
          style={{ color: "var(--color-text-muted)", flexShrink: 0 }}
        />

        {/* Infos */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}>
            <span
              className="code-mono"
              style={{ fontWeight: 600, fontSize: 12 }}>
              {actif.code}
            </span>
            <span
              style={{
                fontSize: 13,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
              {actif.libelle}
            </span>
            <StatutBadge statut={actif.statut} />
            {hasChildren && (
              <span className="ch-count">{actif.sous_actifs.length}</span>
            )}
          </div>

          {/* Breadcrumb */}
          {actif.chemin_hierarchique?.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                flexWrap: "wrap",
              }}>
              {actif.chemin_hierarchique.map((p, i) => (
                <span
                  key={p.id}
                  style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span
                    className="code-mono"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/actifs/${p.id}`);
                    }}
                    style={{
                      cursor: "pointer",
                      padding: "0 4px",
                      borderRadius: 3,
                      background: "var(--bg-elevated)",
                      transition: "color .15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--color-primary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-secondary)")
                    }>
                    {p.code}
                  </span>
                  {i < actif.chemin_hierarchique.length - 1 && (
                    <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                      →
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div
            style={{
              display: "flex",
              gap: 12,
              fontSize: 11,
              color: "var(--text-muted)",
              flexWrap: "wrap",
            }}>
            {actif.site_detail && (
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <MapPin size={10} /> {actif.site_detail.libelle}
              </span>
            )}
            {actif.unite_detail && (
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Factory size={10} /> {actif.unite_detail.libelle}
              </span>
            )}
            {actif.fabricant && <span>{actif.fabricant}</span>}
            {actif.numSerie && (
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Hash size={10} /> {actif.numSerie}
              </span>
            )}
            {actif.taux_disponibilite !== undefined && (
              <span
                style={{
                  color:
                    actif.taux_disponibilite >= 80
                      ? "var(--status-green-text)"
                      : "var(--status-red-text)",
                }}>
                Dispo : {actif.taux_disponibilite} %
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            className="act-btn"
            title="Détail"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/actifs/${actif.id}`);
            }}>
            <Eye size={14} />
          </button>
          <button
            className="act-btn"
            title="Modifier"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/actifs/${actif.id}/modifier`);
            }}>
            <Pencil size={14} />
          </button>
          <button
            className="act-btn"
            title="Ajouter sous-actif"
            onClick={(e) => {
              e.stopPropagation();
              navigate(
                `/actifs/nouveau?parent=${actif.id}&parentCode=${actif.code}`,
              );
            }}>
            <PlusCircle size={14} />
          </button>
        </div>
      </div>

      {/* Enfants */}
      {hasChildren && ouvert && (
        <div>
          {actif.sous_actifs.map((enfant) => (
            <ActifNode
              key={enfant.id}
              actif={enfant}
              niveau={niveau + 1}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ArborescenceActifs() {
  const navigate = useNavigate();
  const [actifs, setActifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const charger = async () => {
    setLoading(true);
    try {
      const res = await api.get("/v1/actifs/actifs/arborescence/");
      setActifs(res.data.results || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const filtres = actifs.filter(
    (a) =>
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.libelle.toLowerCase().includes(search.toLowerCase()),
  );

  const totalActifs = (nodes) =>
    nodes.reduce((acc, n) => acc + 1 + totalActifs(n.sous_actifs || []), 0);

  return (
    <div className="page">
      {/* Header */}
      <div className="hdr">
        <div className="hdr-l">
          <h1>Arborescence des actifs</h1>
          <p>Hiérarchie parent → sous-actifs</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-outline"
            onClick={() => navigate("/actifs")}>
            <List size={14} /> Vue liste
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/actifs/nouveau")}>
            <Plus size={14} /> Nouvel actif
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-chip">
          <strong>{actifs.length}</strong>&nbsp;actifs racines
        </div>
        <div className="stat-chip">
          <strong>{totalActifs(actifs)}</strong>&nbsp;actifs au total
        </div>
      </div>

      {/* Filtres */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="search-wrap" style={{ flex: 1 }}>
            <Search size={14} className="search-icon" />
            <Input
              className="search-input"
              placeholder="Rechercher un actif racine…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button className="pill" onClick={charger} title="Rafraîchir">
            <RotateCcw size={13} /> Rafraîchir
          </Button>
        </div>
      </div>

      {/* Légende */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          fontSize: 11,
          color: "var(--text-muted)",
        }}>
        {Object.entries(TYPE_ICONS).map(([type, icon]) => (
          <span
            key={type}
            style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {icon} {type}
          </span>
        ))}
      </div>

      {/* Arbre */}
      <div className="tbl-card" style={{ padding: "8px 16px" }}>
        <div className="tbl-head" style={{ marginBottom: 8 }}>
          <span className="tbl-title">Hiérarchie des équipements</span>
          <span className="tbl-count">
            {loading ? "Chargement…" : `${filtres.length} racine(s)`}
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
                  paddingLeft: (i % 3) * 22,
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
        ) : filtres.length === 0 ? (
          <p className="empty">
            {search
              ? `Aucun actif trouvé pour « ${search} »`
              : "Aucun actif racine"}
          </p>
        ) : (
          <div style={{ paddingBottom: 8 }}>
            {filtres.map((actif) => (
              <ActifNode
                key={actif.id}
                actif={actif}
                niveau={0}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
