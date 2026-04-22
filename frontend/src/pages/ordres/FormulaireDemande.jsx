import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createDemande } from "../../services/ordreService";
import { getActifs, getActif } from "../../services/actifService";
import { updateUnite } from "../../services/organisationService";
import { ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function FormulaireDemande({ defaultActifId, onClose }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    idActif: defaultActifId ?? "",
    description: "",
    urgence: "normale",
  });

  const [actifs, setActifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [actifDetails, setActifDetails] = useState(null);

  useEffect(() => {
    getActifs({ estActif: true }).then((r) =>
      setActifs(r.data.results || r.data),
    );
  }, []);

  // Charger les détails de l'actif quand defaultActifId change
  useEffect(() => {
    if (defaultActifId) {
      getActif(defaultActifId).then((r) => {
        setActifDetails(r.data);
        setForm((f) => ({ ...f, idActif: String(defaultActifId) }));
      });
    }
  }, [defaultActifId]);

  const handleClose = () => {
    if (onClose) onClose();
    else navigate("/ordres/demandes");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErreur(null);
    try {
      // Créer la demande
      await createDemande(form);

      // Si l'urgence est critique, marquer la production de l'unité comme arrêtée
      if (form.urgence === "critique" && actifDetails?.idUnite) {
        try {
          const res = await updateUnite(actifDetails.idUnite, {
            estProductive: false,
          });
          console.log("Unité mise à jour:", res.data);
        } catch (err) {
          console.error(
            "Erreur lors de la mise à jour du statut production:",
            err,
          );
        }
      }

      handleClose();
    } catch (e) {
      setErreur(e.response?.data || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  // Mode dialog : contenu sans header
  if (onClose) {
    return (
      <div>
        {erreur && (
          <div className="alert-warn" style={{ marginBottom: 16 }}>
            {typeof erreur === "object" ? JSON.stringify(erreur) : erreur}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="fg">
            <label className="flabel">
              Urgence <span className="req">*</span>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                {
                  value: "basse",
                  label: "Basse",
                  description: "Pas urgent, peut attendre quelques jours",
                  color: "var(--status-gray-dot)",
                },
                {
                  value: "normale",
                  label: "Normale",
                  description: "À traiter dans les 24-48 heures",
                  color: "var(--status-blue-dot)",
                },
                {
                  value: "haute",
                  label: "Haute",
                  description: "À traiter en priorité, impact modéré",
                  color: "var(--status-orange-dot)",
                },
                {
                  value: "critique",
                  label: "Critique",
                  description: "Urgence absolue, arrêt de production",
                  color: "var(--status-red-dot)",
                },
              ].map((urgence) => (
                <button
                  key={urgence.value}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, urgence: urgence.value }))
                  }
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: 12,
                    borderRadius: "var(--r-sm)",
                    border:
                      form.urgence === urgence.value
                        ? "2px solid " + urgence.color
                        : "1px solid var(--border-default)",
                    background:
                      form.urgence === urgence.value
                        ? urgence.color + "15"
                        : "var(--bg-elevated)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: urgence.color,
                      marginTop: 4,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ textAlign: "left", flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}>
                      {urgence.label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}>
                      {urgence.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="fg">
            <Label className="flabel">Description</Label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="3"
              className="finput"
              style={{ resize: "none" }}
              placeholder="Décrivez le problème rencontré..."
            />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button
              type="button"
              onClick={handleClose}
              className="btn btn-outline">
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? "Envoi..." : "Déclarer la panne"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // Mode page complète
  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-ghost" onClick={handleClose}>
          <ArrowLeft size={14} /> Retour
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Déclarer une panne</h1>
      </div>

      {erreur && (
        <div className="alert-warn">
          {typeof erreur === "object" ? JSON.stringify(erreur) : erreur}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="tbl-card">
          <div
            className="tbl-head"
            style={{
              padding: 0,
              paddingBottom: 14,
              borderBottom: "1px solid var(--border-subtle)",
            }}>
            <span className="tbl-title">Informations</span>
          </div>
          <div className="m-body" style={{ padding: "14px 0 0" }}>
            {!defaultActifId && (
              <div className="fg">
                <label className="flabel">
                  Actif concerné <span className="req">*</span>
                </label>
                <Select
                  value={form.idActif}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, idActif: value }))
                  }>
                  <SelectTrigger className="fsel">
                    <SelectValue placeholder="— Sélectionner l'équipement en panne —" />
                  </SelectTrigger>
                  <SelectContent>
                    {actifs.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.code} — {a.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className={!defaultActifId ? "fg" : "span2 fg"}>
              <label className="flabel">
                Urgence <span className="req">*</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  {
                    value: "basse",
                    label: "Basse",
                    description: "Pas urgent, peut attendre quelques jours",
                    color: "var(--status-gray-dot)",
                  },
                  {
                    value: "normale",
                    label: "Normale",
                    description: "À traiter dans les 24-48 heures",
                    color: "var(--status-blue-dot)",
                  },
                  {
                    value: "haute",
                    label: "Haute",
                    description: "À traiter en priorité, impact modéré",
                    color: "var(--status-orange-dot)",
                  },
                  {
                    value: "critique",
                    label: "Critique",
                    description: "Urgence absolue, arrêt de production",
                    color: "var(--status-red-dot)",
                  },
                ].map((urgence) => (
                  <button
                    key={urgence.value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, urgence: urgence.value }))
                    }
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: 12,
                      borderRadius: "var(--r-sm)",
                      border:
                        form.urgence === urgence.value
                          ? "2px solid " + urgence.color
                          : "1px solid var(--border-default)",
                      background:
                        form.urgence === urgence.value
                          ? urgence.color + "15"
                          : "var(--bg-elevated)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: urgence.color,
                        marginTop: 4,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ textAlign: "left", flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}>
                        {urgence.label}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}>
                        {urgence.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="span2">
              <div className="fg">
                <label className="flabel">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="3"
                  className="finput"
                  style={{ resize: "none" }}
                  placeholder="Décrivez le problème rencontré..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="m-foot">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-outline">
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? "Envoi..." : "Déclarer la panne"}
          </button>
        </div>
      </form>
    </div>
  );
}
