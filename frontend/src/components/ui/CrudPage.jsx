import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";
import { FieldError, GlobalError } from "@/components/FieldError";
import { useFormErrors } from "@/hooks/useFormErrors";

//  Badge

function Badge({ active }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${active ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-danger-soft text-red-700 dark:text-danger"}`}>
      {active ? "Actif" : "Inactif"}
    </span>
  );
}

//  ModalForm

function ModalForm({ title, fields, onSave, onClose, initial = {} }) {
  const [form, setForm] = useState(
    Object.fromEntries(
      fields.map((f) => [f.name, initial[f.name] ?? f.default ?? ""]),
    ),
  );
  const [saving, setSaving] = useState(false);

  const { errors, setApiErrors, clearErrors, inputCls } = useFormErrors();

  async function handleSubmit(e) {
    e.preventDefault();
    clearErrors();
    try {
      setSaving(true);
      await onSave(form);
      onClose();
    } catch (err) {
      setApiErrors(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-2xl transition-colors">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-text font-semibold text-lg">{title}</h3>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-text-muted hover:text-text">
            <X size={18} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <GlobalError errors={errors} />

          {fields.map((f) => (
            <div key={f.name}>
              <Label className="text-xs text-text-secondary mb-1 block">
                {f.label}
                {f.required && " *"}
              </Label>

              {f.type === "select" ? (
                <>
                  <Select
                    value={form[f.name]}
                    onValueChange={(value) =>
                      setForm({ ...form, [f.name]: value })
                    }
                    disabled={f.disabled}
                    required={f.required}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="— Sélectionner —" />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      {f.options?.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={errors} field={f.name} />
                </>
              ) : f.type === "checkbox" ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={f.name}
                    checked={!!form[f.name]}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, [f.name]: checked })
                    }
                  />
                  <FieldLabel>{f.checkLabel || f.label}</FieldLabel>
                </div>
              ) : (
                <>
                  <Input
                    className={inputCls(f.name)}
                    placeholder={f.placeholder}
                    value={form[f.name]}
                    onChange={(e) =>
                      setForm({ ...form, [f.name]: e.target.value })
                    }
                    required={f.required}
                  />
                  <FieldError errors={errors} field={f.name} />
                </>
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

//  CrudPage

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
  // Optionnel : personnaliser le message de confirmation de suppression
  // Signature : (row) => ({ title?, description? })
  deleteConfirm,
}) {
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // row._raw

  // Résout le titre et la description du dialog en fonction de la ligne ciblée
  function resolveConfirm(row) {
    if (deleteConfirm) return deleteConfirm(row._raw);

    const raw = row._raw ?? {};
    const PREFERRED = [
      "nom",
      "name",
      "libelle",
      "libellé",
      "titre",
      "title",
      "label",
      "code",
      "designation",
      "désignation",
    ];
    const SKIP = ["id", "uuid", "token", "password", "mot_de_passe"];
    const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);

    const label =
      // 1. Champ au nom sémantique connu
      PREFERRED.map((k) => raw[k]).find(
        (v) => typeof v === "string" && v.trim() !== "",
      ) ??
      // 2. Premier string lisible (pas une date, pas un champ technique)
      Object.entries(raw)
        .filter(
          ([k, v]) =>
            !SKIP.includes(k) &&
            typeof v === "string" &&
            v.trim() !== "" &&
            !isDate(v),
        )
        .map(([, v]) => v)
        .find(Boolean);

    return {
      title: "Confirmer la suppression",
      description: label
        ? `Supprimer « ${label} » ? Cette action est irréversible.`
        : "Cette action est irréversible.",
    };
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    await onDelete(deleteTarget.id);
    setDeleteTarget(null);
  }

  const confirm = deleteTarget ? resolveConfirm(deleteTarget) : {};

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{title}</h1>
          {subtitle && (
            <p className="text-text-secondary text-sm mt-1">{subtitle}</p>
          )}
        </div>
        <Button onClick={() => setModal("create")} variant="custom">
          <Plus size={15} />
          Ajouter
        </Button>
      </div>

      {/* Tableau */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden transition-colors">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-10 text-center text-text-muted">
                  Chargement...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-10 text-center text-text-muted">
                  Aucun élément
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-hover transition-colors">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-text-secondary">
                      {row[c.key]}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          onClick={() => setModal(row._raw)}
                          className="rounded hover:bg-hover text-text-muted hover:text-text transition-colors">
                          <Pencil size={13} />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          onClick={() => setDeleteTarget(row)}
                          className="rounded hover:bg-danger-soft text-text-muted hover:text-danger transition-colors">
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

      {/* 
          AlertDialog — Confirmation suppression
       */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
