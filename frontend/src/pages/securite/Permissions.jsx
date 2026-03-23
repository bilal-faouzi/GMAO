import { useEffect, useState } from "react";
import { Plus, Search, Shield, X } from "lucide-react";
import api from "@/services/api";
import { getPermissions, createPermission } from "@/services/securiteService";

import { Modal } from "@/components/Modal";

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500";
const labelCls = "text-xs text-gray-400 mb-1 block";

const actionColor = (action) => {
  if (action === "READ") return "bg-blue-500/10 text-blue-400";
  if (action === "CREATE") return "bg-emerald-500/10 text-emerald-400";
  if (action === "UPDATE") return "bg-orange-500/10 text-orange-400";
  if (action === "DELETE") return "bg-red-500/10 text-red-400";
  return "bg-white/5 text-gray-400";
};

const moduleColors = [
  "bg-purple-500/10 text-purple-400",
  "bg-pink-500/10 text-pink-400",
  "bg-indigo-500/10 text-indigo-400",
  "bg-cyan-500/10 text-cyan-400",
  "bg-teal-500/10 text-teal-400",
];

export default function Permissions() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    code: "",
    module: "",
    action: "",
    ressource: "",
  });
  const [error, setError] = useState("");

  const fetchPermissions = async () => {
    try {
      const res = await getPermissions();

      setPermissions(
        Array.isArray(res.data) ? res.data : res.data.results || [],
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createPermission({
        ...form,
        code: `${form.module}.${form.action}.${form.ressource}`,
      });
      setOpenCreate(false);
      setForm({ code: "", module: "", action: "", ressource: "" });
      fetchPermissions();
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur.");
      console.error(err);
    }
  };

  const filtered = permissions.filter(
    (p) =>
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.module.toLowerCase().includes(search.toLowerCase()) ||
      p.action.toLowerCase().includes(search.toLowerCase()),
  );

  const grouped = filtered.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Permissions</h1>
          <p className="text-slate-400 text-sm mt-1">
            Gérer les permissions du système
          </p>
        </div>
        <button
          onClick={() => {
            setError("");
            setOpenCreate(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
          <Plus size={15} /> Nouvelle permission
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {["READ", "CREATE", "UPDATE", "DELETE"].map((action) => (
          <div
            key={action}
            className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{action}</p>
              <p className="text-2xl font-bold text-white">
                {permissions.filter((p) => p.action === action).length}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${actionColor(action)}`}>
              {action}
            </span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          placeholder="Rechercher une permission..."
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Groupé par module */}
      {loading ? (
        <p className="text-center text-gray-500 py-12">Chargement...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-center text-gray-500 py-12">
          Aucune permission trouvée
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([module, perms], idx) => (
            <div
              key={module}
              className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                  <Shield size={15} className="text-gray-400" />
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold ${moduleColors[idx % moduleColors.length]}`}>
                  {module}
                </span>
                <span className="text-xs text-gray-500">
                  {perms.length} permission{perms.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {perms.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor(p.action)}`}>
                        {p.action}
                      </span>
                      <span className="text-sm font-mono text-gray-300">
                        {p.code}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 border border-white/10 px-2 py-0.5 rounded-full">
                      {p.ressource}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {openCreate && (
        <Modal title="Nouvelle permission" onClose={() => setOpenCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className={labelCls}>Module</label>
              <input
                className={inputCls}
                placeholder="ex: ACTIFS"
                value={form.module}
                onChange={(e) =>
                  setForm({ ...form, module: e.target.value.toUpperCase() })
                }
                required
              />
            </div>
            <div>
              <label className={labelCls}>Action</label>
              <select
                className={inputCls}
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
                required>
                <option value="">Sélectionner</option>
                {["READ", "CREATE", "UPDATE", "DELETE"].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ressource</label>
              <input
                className={inputCls}
                placeholder="ex: ALL ou PROPRE"
                value={form.ressource}
                onChange={(e) =>
                  setForm({ ...form, ressource: e.target.value.toUpperCase() })
                }
                required
              />
            </div>
            {form.module && form.action && form.ressource && (
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-xs text-gray-500 mb-1">Code généré :</p>
                <code className="text-sm font-mono text-blue-400">
                  {form.module}.{form.action}.{form.ressource}
                </code>
              </div>
            )}
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
                Créer
              </button>
              <button
                type="button"
                onClick={() => setOpenCreate(false)}
                className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm">
                Annuler
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
