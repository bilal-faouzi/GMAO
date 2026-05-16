from asyncio import subprocess
import io
import os
import json
from urllib import request  # ← ajout

from django.contrib.admin import AdminSite
from django.core.management import call_command
from django.core.management.base import CommandError  # ← ajout
from django.http import HttpResponse, JsonResponse  # ← ajout JsonResponse
from django.template.response import TemplateResponse
from django.urls import path
from django.utils import timezone
from django.conf import settings


class GMAOAdminSite(AdminSite):
    site_header = "GMAO Administration"
    site_title = "GMAO Admin"
    index_title = "Administration"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path("backup/", self.admin_view(self.backup_view), name="gmao-backup"),
            path("restore/", self.admin_view(self.restore_view), name="gmao-restore"),
        ]
        return custom_urls + urls

    def backup_view(self, request):
        if request.method == "POST":
            timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
            filename = f"gmao_backup_{timestamp}.json"
            backup_dir = settings.MEDIA_ROOT / "backups"
            os.makedirs(backup_dir, exist_ok=True)

            buffer = io.StringIO()
            call_command(
                "dumpdata",
                "--natural-foreign",
                "--natural-primary",
                "--indent", "2",
                stdout=buffer,
            )
            content = buffer.getvalue()
            file_path = backup_dir / filename
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)

            response = HttpResponse(content, content_type="application/json")
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response

        context = {**self.each_context(request), "title": "Sauvegarde"}
        return TemplateResponse(request, "admin/backup.html", context)

    def restore_view(self, request):
        is_ajax = "application/json" in request.headers.get("Accept", "")

        if request.method == "POST":
            upload = request.FILES.get("backup_file")

            if not upload:
                if is_ajax:
                    return JsonResponse({"status": "error", "message": "Aucun fichier reçu."}, status=400)
                context = {**self.each_context(request), "title": "Restaurer", "error": "Fichier manquant."}
                return TemplateResponse(request, "admin/restore.html", context)

            try:
                # Sauvegarde le fichier
                backup_dir = settings.MEDIA_ROOT / "backups" / "uploads"
                os.makedirs(backup_dir, exist_ok=True)
                file_path = backup_dir / upload.name
                with open(file_path, "wb") as f:
                    for chunk in upload.chunks():
                        f.write(chunk)

                # Lance exactement : python manage.py loaddata /chemin/fichier.json
                result = subprocess.run(
                    [sys.executable, "manage.py", "loaddata", str(file_path)],
                    capture_output=True,
                    text=True,
                    cwd=settings.BASE_DIR,  # ← important : même répertoire que le shell
                )

                if result.returncode != 0:
                    # Affiche l'erreur réelle de la commande
                    raise Exception(result.stderr or result.stdout)

                msg = result.stdout or "Restauration réussie."
                if is_ajax:
                    return JsonResponse({"status": "ok", "message": msg})

                context = {**self.each_context(request), "title": "Restaurer", "success": msg}
                return TemplateResponse(request, "admin/restore.html", context)

            except Exception as e:
                err = str(e)
                if is_ajax:
                    return JsonResponse({"status": "error", "message": err}, status=500)
                context = {**self.each_context(request), "title": "Restaurer", "error": err}
                return TemplateResponse(request, "admin/restore.html", context)

        context = {**self.each_context(request), "title": "Restaurer"}
        return TemplateResponse(request, "admin/restore.html", context)

gmao_admin_site = GMAOAdminSite(name="gmao_admin")