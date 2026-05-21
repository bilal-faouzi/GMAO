import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CrudPage, { Badge } from "@/components/ui/CrudPage";
import {
  getTypesActifs,
  createTypeActif,
  updateTypeActif,
  deleteTypeActif,
} from "@/services/actifService";
import { ArrowLeft, Tags } from "lucide-react";

export default function TypeActifsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await getTypesActifs();
      setData(r.data.results || r.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const columns = [
    { key: "code", label: "Code" },
    { key: "libelle", label: "Libellé" },
    { key: "statut", label: "Statut" },
  ];

  const fields = [
    { name: "code", label: "Code", placeholder: "equipement", required: true },
    {
      name: "libelle",
      label: "Libellé",
      placeholder: "Équipement",
      required: true,
    },
    { name: "ordre", label: "Ordre", placeholder: "1", type: "number" },
    { name: "estActif", label: "Active", type: "checkbox", default: true },
  ];

  const rows = data.map((s) => ({
    id: s.id,
    code: (
      <span className="font-mono text-amber-700 dark:text-warning text-xs font-bold">
        {s.code}
      </span>
    ),
    libelle: <span className="font-medium text-text">{s.libelle}</span>,
    statut: <Badge active={s.estActif} />,
    _raw: s,
  }));

  async function onCreate(form) {
    await createTypeActif(form);
    load();
  }
  async function onEdit(id, form) {
    await updateTypeActif(id, form);
    load();
  }
  async function onDelete(id) {
    await deleteTypeActif(id);
    load();
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/parametrage/actifs")}
          className="p-2 rounded-lg hover:bg-hover text-text-muted hover:text-text transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-xs text-text-secondary font-medium">
            Paramétrage / Actifs
          </div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <Tags size={20} className="text-blue-500" />
            Types d'actifs
          </h1>
        </div>
      </div>

      <CrudPage
        title="Types d'actifs"
        description="Gérer les types d'actifs de l'organisation."
        subtitle={`${data.length} type(s) enregistré(s)`}
        columns={columns}
        rows={rows}
        fields={fields}
        onCreate={onCreate}
        onEdit={onEdit}
        onDelete={onDelete}
        loading={loading}
      />
    </div>
  );
}
