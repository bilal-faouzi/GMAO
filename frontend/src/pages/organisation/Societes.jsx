import { useState, useEffect } from "react";
import CrudPage, { Badge } from "@/components/ui/CrudPage";
import {
  getSocietes,
  createSociete,
  updateSociete,
  deleteSociete,
} from "@/services/organisationService";

export default function Societes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const r = await getSocietes();
    setData(r.data.results || r.data);
    setLoading(false);
  }

  const columns = [
    { key: "code", label: "Code" },
    { key: "raisonSociale", label: "Raison Sociale" },
    { key: "statut", label: "Statut" },
  ];

  const fields = [
    { name: "code", label: "Code", placeholder: "SOC1", required: true },
    {
      name: "raisonSociale",
      label: "Raison Sociale",
      placeholder: "GMAO Industries SA",
      required: true,
    },
    { name: "estActif", label: "Active", type: "checkbox", default: true },
  ];

  const rows = data.map((s) => ({
    id: s.id,
    code: (
      <span className="font-mono text-blue-700 dark:text-primary text-xs font-bold">
        {s.code}
      </span>
    ),
    raisonSociale: (
      <span className="font-medium text-text">{s.raisonSociale}</span>
    ),
    statut: <Badge active={s.estActif} />,
    _raw: s,
  }));

  async function onCreate(form) {
    await createSociete(form);
    load();
  }

  async function onEdit(id, form) {
    await updateSociete(id, form);
    load();
  }

  async function onDelete(id) {
    if (!confirm("Supprimer cette société ?")) return;
    await deleteSociete(id);
    load();
  }

  return (
    <CrudPage
      title="Sociétés"
      description="Gérer les sociétés de l'organisation."
      subtitle={`${data.length} société(s) enregistrée(s)`}
      columns={columns}
      rows={rows}
      fields={fields}
      onCreate={onCreate}
      onEdit={onEdit}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
