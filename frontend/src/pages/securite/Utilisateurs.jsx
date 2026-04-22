import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Pencil,
  Shield,
  Power,
  PowerOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  createUtilisateur,
  getUtilisateurs,
  updateUtilisateur,
  deleteUtilisateur,
} from "@/services/securiteService";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, GlobalError } from "@/components/FieldError";
import { useFormErrors } from "@/hooks/useFormErrors";
import { RoleManager } from "@/components/RoleManager";

const labelCls = "text-xs text-text-secondary mb-1 block";

export default function Utilisateurs() {
  const navigate = useNavigate();

  // ── Data state ──
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // ── Modal state ──
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openRoles, setOpenRoles] = useState(false);

  // ── Selection ──
  const [selected, setSelected] = useState(null); // for edit
  const [roleTarget, setRoleTarget] = useState(null); // for role modal

  // ── Form ──
  const [form, setForm] = useState({
    nom_utilisateur: "",
    email: "",
    mot_de_passe: "",
    prenom: "",
    nom: "",
  });

  const { errors, setApiErrors, clearErrors, inputCls } = useFormErrors();

  // ─────────────────────────────────────────────────────────────
  // Fetch
  // ─────────────────────────────────────────────────────────────
  const fetchUtilisateurs = async (currentPage = page) => {
    try {
      const res = await getUtilisateurs({ page: currentPage });
      setUtilisateurs(res.data.results || res.data);
      setTotalPages(res.data.total_pages || 1);
      setPage(res.data.page || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUtilisateurs();
  }, [page]);

  // ─────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    clearErrors();
    try {
      await createUtilisateur(form);
      setOpenCreate(false);
      setForm({
        nom_utilisateur: "",
        email: "",
        mot_de_passe: "",
        prenom: "",
        nom: "",
      });
      fetchUtilisateurs();
    } catch (err) {
      setApiErrors(err);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    clearErrors();
    const payload = { ...form };
    if (!payload.mot_de_passe) delete payload.mot_de_passe;
    try {
      await updateUtilisateur(selected.id, payload);
      setOpenEdit(false);
      fetchUtilisateurs();
    } catch (err) {
      setApiErrors(err);
    }
  };

  const handleToggleActive = async (id, est_actif) => {
    if (!confirm(`${est_actif ? "Désactiver" : "Activer"} cet utilisateur ?`))
      return;
    await deleteUtilisateur(id);
    fetchUtilisateurs();
  };

  const openEditModal = (u) => {
    setSelected(u);
    setForm({
      prenom: u.prenom,
      nom: u.nom,
      email: u.email,
      mot_de_passe: "",
      nom_utilisateur: u.nom_utilisateur,
    });
    clearErrors();
    setOpenEdit(true);
  };

  const openRolesModal = (u) => {
    setRoleTarget(u);
    setOpenRoles(true);
  };

  // After RoleManager updates roles, refresh the row in the table
  const handleRolesChange = (updatedRoles) => {
    setUtilisateurs((prev) =>
      prev.map((u) =>
        u.id === roleTarget?.id ? { ...u, roles: updatedRoles } : u,
      ),
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Filtered list
  // ─────────────────────────────────────────────────────────────
  const filtered = utilisateurs.filter(
    (u) =>
      u.nom_utilisateur.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.prenom.toLowerCase().includes(search.toLowerCase()),
  );

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Utilisateurs</h1>
          <p className="text-text-secondary text-sm mt-1">
            Gérer les comptes utilisateurs
          </p>
        </div>
        <Button
          onClick={() => {
            clearErrors();
            setOpenCreate(true);
          }}
          variant="custom">
          <Plus size={15} /> Nouvel utilisateur
        </Button>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <Input
          placeholder="Rechercher un utilisateur..."
          className="pl-9"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* ── Table ── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Utilisateur", "Email", "Rôles", "Statut"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {h}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-text-muted">
                  Chargement...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-text-muted">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => navigate(`/utilisateurs/${u.id}`)}
                  style={{ cursor: "pointer" }}
                  className={`hover:bg-surface ${
                    u.est_actif
                      ? ""
                      : "bg-elevated border-border-subtle opacity-50 grayscale"
                  } transition-colors`}>
                  {/* Utilisateur */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 dark:text-blue-400 text-xs font-bold">
                          {u.prenom[0]}
                          {u.nom[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-text">
                          {u.prenom} {u.nom}
                        </p>
                        <p className="text-xs text-text-muted">
                          @{u.nom_utilisateur}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-text-secondary text-sm">
                    {u.email}
                  </td>

                  {/* Rôles */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {u.roles?.length > 0 ? (
                        u.roles.map((r) => (
                          <span
                            key={r.id}
                            className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium">
                            {r.code}
                          </span>
                        ))
                      ) : (
                        <span className="text-text-muted text-xs">
                          Aucun rôle
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.est_actif
                          ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                      }`}>
                      {u.est_actif ? "Actif" : "Inactif"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRolesModal(u);
                        }}
                        title="Gérer les rôles"
                        className="rounded hover:bg-emerald-100 dark:hover:bg-emerald-500/10 text-text-secondary hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                        <Shield size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(u);
                        }}
                        title="Modifier"
                        className="rounded hover:bg-blue-100 dark:hover:bg-blue-500/10 text-text-secondary hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(u.id, u.est_actif);
                        }}
                        title={u.est_actif ? "Désactiver" : "Activer"}
                        className="rounded hover:bg-red-100 dark:hover:bg-red-500/10 text-text-secondary hover:text-danger transition-colors">
                        {u.est_actif ? (
                          <Power size={13} />
                        ) : (
                          <PowerOff size={13} />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm text-text-secondary">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          Modal — Création
      ══════════════════════════════════════════════ */}
      {openCreate && (
        <Modal title="Nouvel utilisateur" onClose={() => setOpenCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <GlobalError errors={errors} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelCls}>Prénom</Label>
                <Input
                  className={inputCls("prenom")}
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                  required
                />
                <FieldError errors={errors} field="prenom" />
              </div>
              <div>
                <Label className={labelCls}>Nom</Label>
                <Input
                  className={inputCls("nom")}
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  required
                />
                <FieldError errors={errors} field="nom" />
              </div>
            </div>

            <div>
              <Label className={labelCls}>Nom d'utilisateur</Label>
              <Input
                className={inputCls("nom_utilisateur")}
                value={form.nom_utilisateur}
                onChange={(e) =>
                  setForm({ ...form, nom_utilisateur: e.target.value })
                }
                required
              />
              <FieldError errors={errors} field="nom_utilisateur" />
            </div>

            <div>
              <Label className={labelCls}>Email</Label>
              <Input
                type="email"
                className={inputCls("email")}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <FieldError errors={errors} field="email" />
            </div>

            <div>
              <Label className={labelCls}>Mot de passe</Label>
              <Input
                type="password"
                className={inputCls("mot_de_passe")}
                value={form.mot_de_passe}
                onChange={(e) =>
                  setForm({ ...form, mot_de_passe: e.target.value })
                }
                required
              />
              <FieldError errors={errors} field="mot_de_passe" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                variant="custom"
                className="flex-1 py-2 rounded-lg">
                Créer
              </Button>
              <Button
                type="button"
                onClick={() => setOpenCreate(false)}
                variant="customOutline"
                className="flex-1 py-2 rounded-lg">
                Annuler
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════
          Modal — Modification
      ══════════════════════════════════════════════ */}
      {openEdit && (
        <Modal
          title="Modifier l'utilisateur"
          onClose={() => setOpenEdit(false)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <GlobalError errors={errors} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelCls}>Prénom</Label>
                <Input
                  className={inputCls("prenom")}
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                />
                <FieldError errors={errors} field="prenom" />
              </div>
              <div>
                <Label className={labelCls}>Nom</Label>
                <Input
                  className={inputCls("nom")}
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
                <FieldError errors={errors} field="nom" />
              </div>
            </div>

            <div>
              <Label className={labelCls}>Email</Label>
              <Input
                type="email"
                className={inputCls("email")}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <FieldError errors={errors} field="email" />
            </div>

            <div>
              <Label className={labelCls}>
                Nouveau mot de passe (optionnel)
              </Label>
              <Input
                type="password"
                className={inputCls("mot_de_passe")}
                value={form.mot_de_passe}
                onChange={(e) =>
                  setForm({ ...form, mot_de_passe: e.target.value })
                }
              />
              <FieldError errors={errors} field="mot_de_passe" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                variant="custom"
                className="flex-1 py-2 rounded-lg">
                Enregistrer
              </Button>
              <Button
                type="button"
                onClick={() => setOpenEdit(false)}
                variant="customOutline"
                className="flex-1 py-2 rounded-lg">
                Annuler
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════
          Modal — Gestion des rôles (via RoleManager)
      ══════════════════════════════════════════════ */}
      {openRoles && roleTarget && (
        <Modal
          title={`Rôles — ${roleTarget.prenom} ${roleTarget.nom}`}
          onClose={() => setOpenRoles(false)}>
          <RoleManager
            userId={roleTarget.id}
            onRolesChange={handleRolesChange}
          />
        </Modal>
      )}
    </div>
  );
}
