import { useState, useEffect } from "react";
import {
  Plus,
  X,
  Users,
  Loader2,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import {
  getEquipes,
  addMembre,
  removeMembre,
} from "@/services/organisationService";
import { getUserTeam } from "@/services/userDetailService";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError, GlobalError } from "@/components/FieldError";
import { useFormErrors } from "@/hooks/useFormErrors";

const ROLE_STYLES = {
  CHEF: {
    bg: "var(--status-amber-bg, rgba(245,158,11,.1))",
    text: "var(--status-amber-text, #b45309)",
    dot: "var(--status-amber-dot, #f59e0b)",
    label: "Chef",
  },
  MEMBRE: {
    bg: "var(--status-blue-bg)",
    text: "var(--status-blue-text)",
    dot: "var(--status-blue-dot)",
    label: "Membre",
  },
  REMPLACANT: {
    bg: "var(--status-gray-bg)",
    text: "var(--status-gray-text)",
    dot: "var(--status-gray-dot)",
    label: "Remplaçant",
  },
};

function RoleBadge({ role }) {
  const s = ROLE_STYLES[role] || ROLE_STYLES.MEMBRE;
  return (
    <span
      className="badge"
      style={{ background: s.bg, color: s.text, fontSize: 11 }}>
      <span className="bdot" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

/**
 * TeamManager
 * -----------
 * Props:
 *   userId         {string|number}  — ID de l'utilisateur ciblé
 *   onTeamChange   {Function}       — callback après chaque modification
 */
export function TeamManager({ userId, onTeamChange }) {
  const [memberships, setMemberships] = useState([]);
  const [allEquipes, setAllEquipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    equipe: "",
    niveauRole: "MEMBRE",
  });

  const { errors, setApiErrors, clearErrors } = useFormErrors();

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const [teamRes, equipesRes] = await Promise.all([
        getUserTeam(userId),
        getEquipes(),
      ]);
      setMemberships(teamRes.data.results || teamRes.data || []);
      setAllEquipes(equipesRes.data.results || equipesRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  // ── Add ───────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.equipe) return;
    clearErrors();
    setSaving(true);
    try {
      await addMembre({
        equipe: form.equipe,
        utilisateur: userId,
        niveauRole: form.niveauRole,
      });
      setForm({ equipe: "", niveauRole: "MEMBRE" });
      setShowForm(false);
      await loadData();
      onTeamChange?.();
    } catch (err) {
      setApiErrors(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Remove ────────────────────────────────────────────────────────────────
  const handleRemove = async (membershipId) => {
    if (!confirm("Retirer l'utilisateur de cette équipe ?")) return;
    setPendingRemove(membershipId);
    try {
      await removeMembre(membershipId);
      await loadData();
      onTeamChange?.();
    } catch (e) {
      console.error(e);
    } finally {
      setPendingRemove(null);
    }
  };

  // ── Equipes disponibles (non déjà rejointes) ──────────────────────────────
  const assignedEquipeIds = memberships
    .filter((m) => m.estActif)
    .map((m) => m.equipe || m.equipe_id);

  const disponibles = allEquipes.filter(
    (e) => e.estActif && !assignedEquipeIds.includes(e.id),
  );

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "20px 0",
          color: "var(--text-muted)",
          fontSize: 13,
        }}>
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
        Chargement…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const activeTeams = memberships.filter((m) => m.estActif);
  const historyTeams = memberships.filter((m) => !m.estActif);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        paddingTop: 8,
      }}>
      {/* ── Équipes actives ── */}
      {activeTeams.length === 0 ? (
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            fontStyle: "italic",
          }}>
          Aucune équipe active
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 4,
            }}>
            Équipes actives
          </p>
          {activeTeams.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: "var(--r-sm)",
                background: "var(--color-primary-soft)",
                border: "1px solid rgba(79,70,229,.1)",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Users
                  size={13}
                  style={{ color: "var(--color-primary)", opacity: 0.8 }}
                />
                <div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}>
                    {m.equipe_libelle || "—"}
                  </span>
                  <span style={{ marginLeft: 10 }}>
                    <RoleBadge role={m.niveauRole} />
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                disabled={pendingRemove === m.id}
                onClick={() => handleRemove(m.id)}
                title="Retirer de cette équipe"
                style={{ padding: "4px 8px", height: "auto" }}
                className="text-text-muted hover:text-danger transition-colors">
                {pendingRemove === m.id ? (
                  <Loader2
                    size={13}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                ) : (
                  <X size={13} />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* ── Formulaire d'affectation ── */}
      {showForm ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "14px 14px",
            borderRadius: "var(--r-sm)",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}>
          <GlobalError errors={errors} />

          {/* Select équipe */}
          <div>
            <p
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginBottom: 6,
                fontWeight: 600,
              }}>
              Équipe
            </p>
            <Select
              value={form.equipe}
              onValueChange={(v) => setForm({ ...form, equipe: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner une équipe…" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {disponibles.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      Aucune équipe disponible
                    </SelectItem>
                  ) : (
                    disponibles.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.libelle}
                        {e.site_libelle && (
                          <span
                            style={{
                              opacity: 0.6,
                              marginLeft: 6,
                              fontSize: 11,
                            }}>
                            — {e.site_libelle}
                          </span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError errors={errors} field="equipe" />
          </div>

          {/* Select rôle */}
          <div>
            <p
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginBottom: 6,
                fontWeight: 600,
              }}>
              Rôle dans l'équipe
            </p>
            <Select
              value={form.niveauRole}
              onValueChange={(v) => setForm({ ...form, niveauRole: v })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="MEMBRE">Membre</SelectItem>
                  <SelectItem value="CHEF">Chef</SelectItem>
                  <SelectItem value="REMPLACANT">Remplaçant</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError errors={errors} field="niveauRole" />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Button
              onClick={handleAdd}
              disabled={!form.equipe || saving}
              variant="custom"
              style={{ flex: 1 }}>
              {saving ? (
                <>
                  <Loader2
                    size={13}
                    style={{ animation: "spin 1s linear infinite" }}
                  />{" "}
                  Enregistrement…
                </>
              ) : (
                <>
                  <Plus size={13} /> Affecter
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setShowForm(false);
                clearErrors();
                setForm({ equipe: "", niveauRole: "MEMBRE" });
              }}
              variant="customOutline"
              style={{ flex: 1 }}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        disponibles.length > 0 && (
          <Button
            onClick={() => setShowForm(true)}
            variant="ghost"
            style={{
              alignSelf: "flex-start",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--color-primary)",
              padding: "6px 10px",
              borderRadius: "var(--r-sm)",
              border: "1px dashed var(--border)",
              background: "transparent",
            }}>
            <Plus size={13} /> Affecter à une équipe
          </Button>
        )
      )}

      {/* ── Historique ── */}
      {historyTeams.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}>
            Historique
          </p>
          <table>
            <thead>
              <tr>
                <th>Équipe</th>
                <th>Rôle</th>
              </tr>
            </thead>
            <tbody>
              {historyTeams.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {m.equipe_libelle || "—"}
                  </td>
                  <td>
                    <RoleBadge role={m.niveauRole} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
