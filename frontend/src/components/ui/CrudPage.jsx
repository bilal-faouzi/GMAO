import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-40";

function Badge({ active }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        active
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-red-500/10 text-red-400"
      }`}>
      {active ? "Actif" : "Inactif"}
    </span>
  );
}

function ModalForm({ title, fields, onSave, onClose, initial = {} }) {
  const [form, setForm] = useState(
    Object.fromEntries(
      fields.map((f) => [f.name, initial[f.name] ?? f.default ?? ""]),
    ),
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave(form);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="text-xs text-gray-400 mb-1 block">
                {f.label}
                {f.required && " *"}
              </label>
              {f.type === "select" ? (
                <select
                  className={inputCls}
                  value={form[f.name]}
                  onChange={(e) =>
                    setForm({ ...form, [f.name]: e.target.value })
                  }
                  required={f.required}
                  disabled={f.disabled}>
                  <option className="text-black" value="">
                    — Sélectionner —
                  </option>
                  {f.options?.map((o) => (
                    <option
                      className="text-black"
                      key={o.value}
                      value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "checkbox" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={f.name}
                    checked={!!form[f.name]}
                    onChange={(e) =>
                      setForm({ ...form, [f.name]: e.target.checked })
                    }
                    className="accent-blue-500"
                  />
                  <label htmlFor={f.name} className="text-sm text-gray-300">
                    {f.checkLabel || f.label}
                  </label>
                </div>
              ) : (
                <input
                  className={inputCls}
                  placeholder={f.placeholder}
                  value={form[f.name]}
                  onChange={(e) =>
                    setForm({ ...form, [f.name]: e.target.value })
                  }
                  required={f.required}
                />
              )}
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
              {saving ? "Enregistrement..." : initial.id ? "Modifier" : "Créer"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { Badge, ModalForm, inputCls };

export default function CrudPage({
  title,
  subtitle,
  columns,
  rows,
  fields,
  onCreate,
  onEdit,
  onDelete,
  loading,
}) {
  const [modal, setModal] = useState(null); // null | 'create' | rowObject

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
        </div>
        <button
          onClick={() => setModal("create")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
          <Plus size={15} />
          Ajouter
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-10 text-center text-gray-500">
                  Chargement...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-10 text-center text-gray-500">
                  Aucun élément
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-white/5 transition-colors">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-gray-300">
                      {row[c.key]}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {onEdit && (
                        <button
                          onClick={() => setModal(row._raw)}
                          className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                          <Pencil size={13} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal création */}
      {modal === "create" && (
        <ModalForm
          title={`Nouveau — ${title}`}
          fields={fields}
          onSave={onCreate}
          onClose={() => setModal(null)}
        />
      )}

      {/* Modal édition */}
      {modal && modal !== "create" && onEdit && (
        <ModalForm
          title={`Modifier — ${title}`}
          fields={fields}
          initial={modal}
          onSave={(data) => onEdit(modal.id, data)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
