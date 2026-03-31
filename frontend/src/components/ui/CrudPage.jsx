import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";

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
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-gray-400 hover:text-white">
            <X size={18} />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((f) => (
            <div key={f.name}>
              <Label className="text-xs text-gray-400 mb-1 block">
                {f.label}
                {f.required && " *"}
              </Label>

              {f.type === "select" ? (
                <Select
                  value={form[f.name]}
                  onValueChange={(value) =>
                    setForm({ ...form, [f.name]: value })
                  }
                  disabled={f.disabled}
                  required={f.required}>
                  <SelectTrigger
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                               focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                               disabled:opacity-40 data-[placeholder]:text-gray-500
                               [&>span]:flex [&>span]:items-center">
                    <SelectValue placeholder="— Sélectionner —" />
                  </SelectTrigger>
                  <SelectContent
                    className="bg-slate-900 border border-white/10 rounded-lg shadow-xl
                               text-white z-[60]">
                    {f.options?.map((o) => (
                      <SelectItem
                        key={o.value}
                        value={String(o.value)}
                        className="text-sm text-gray-300 px-3 py-2 cursor-pointer rounded
                                   focus:bg-white/10 focus:text-white
                                   data-[state=checked]:text-blue-400">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === "checkbox" ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={f.name}
                    // On utilise 'checked' pour l'état actuel
                    checked={!!form[f.name]}
                    // On utilise 'onCheckedChange' qui donne directement le booléen
                    onCheckedChange={(e) =>
                      setForm({ ...form, [f.name]: e.target.checked })
                    }
                  />
                  <FieldLabel>{f.checkLabel || f.label}</FieldLabel>
                </div>
              ) : (
                <Input
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
            <Button type="submit" disabled={saving} variant="custom">
              {saving ? "Enregistrement..." : initial.id ? "Modifier" : "Créer"}
            </Button>
            <Button type="button" onClick={onClose} variant="customOutline">
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { Badge, ModalForm };

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
  const [modal, setModal] = useState(null);

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
        </div>
        <Button onClick={() => setModal("create")} variant="custom">
          <Plus size={15} />
          Ajouter
        </Button>
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
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
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
                    <div className="flex items-center justify-center gap-2">
                      {onEdit && (
                        <Button
                          onClick={() => setModal(row._raw)}
                          className=" rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                          <Pencil size={13} />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          onClick={() => onDelete(row.id)}
                          className=" rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </Button>
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
