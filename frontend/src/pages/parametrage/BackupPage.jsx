import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, DatabaseBackup, ExternalLink, Upload } from "lucide-react";

export default function BackupPage() {
  const navigate = useNavigate();
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreStatus, setRestoreStatus] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const handleBackup = () => {
    const url = `${window.location.origin}/admin/backup/`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      setRestoreStatus({
        type: "error",
        message: "Sélectionnez un fichier JSON.",
      });
      return;
    }

    // Récupère le token CSRF depuis le cookie
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];

    setRestoreLoading(true);
    setRestoreStatus(null);
    try {
      const formData = new FormData();
      formData.append("backup_file", restoreFile);

      const response = await fetch("/admin/restore/", {
        method: "POST",
        headers: {
          "X-CSRFToken": csrfToken || "", // ← ajout du token
          Accept: "application/json",
        },
        body: formData,
        credentials: "include",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || `Erreur HTTP ${response.status}`);
      }

      // ✅ Vérifier aussi le statut métier dans le JSON
      if (data?.status === "error" || data?.success === false) {
        throw new Error(
          data?.message || "La restauration a échoué côté serveur.",
        );
      }

      setRestoreStatus({
        type: "success",
        message: "Backup restauré avec succès.",
      });
      setRestoreFile(null);
    } catch (error) {
      setRestoreStatus({
        type: "error",
        message: error.message || "Échec de la restauration.",
      });
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/parametrage")}
          className="text-text-muted hover:text-text text-sm transition flex items-center gap-2">
          <ArrowLeft size={16} /> Retour
        </button>
        <h1 className="text-2xl font-semibold text-text">Sauvegarde</h1>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <DatabaseBackup size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">
              Créer un backup complet
            </p>
            <p className="text-xs text-text-muted">
              Export JSON de toute la base de données. Le fichier sera aussi
              stocké dans <code>media/backups</code> côté serveur.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleBackup}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-dark transition">
            Lancer la sauvegarde
            <ExternalLink size={14} />
          </button>
          <span className="text-xs text-text-muted">
            Vous devrez être authentifié sur l'admin Django.
          </span>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Upload size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">
              Restaurer un backup
            </p>
            <p className="text-xs text-text-muted">
              Sélectionnez un fichier JSON de sauvegarde pour restaurer la base.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="application/json"
            onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
            className="text-xs text-text-muted"
          />
          <button
            onClick={handleRestore}
            disabled={!restoreFile || restoreLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 transition disabled:opacity-50">
            {restoreLoading ? "Restauration..." : "Restaurer"}
          </button>
        </div>

        {restoreStatus && (
          <p
            className={`text-xs ${
              restoreStatus.type === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-500"
            }`}>
            {restoreStatus.message}
          </p>
        )}
      </div>
    </div>
  );
}
