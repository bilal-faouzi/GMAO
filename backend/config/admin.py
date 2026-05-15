from django.contrib.admin import AdminSite
from django.core.management import call_command
from django.http import HttpResponse
from django.template.response import TemplateResponse
from django.urls import path
from django.utils import timezone
from django.conf import settings
import io
import os


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
                "--indent",
                "2",
                stdout=buffer,
            )
            content = buffer.getvalue()
            file_path = backup_dir / filename
            with open(file_path, "w", encoding="utf-8") as output_file:
                output_file.write(content)

            response = HttpResponse(content, content_type="application/json")
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response

        context = {
            **self.each_context(request),
            "title": "Sauvegarde",
        }
        return TemplateResponse(request, "admin/backup.html", context)

    def restore_view(self, request):
        if request.method == "POST":
            upload = request.FILES.get("backup_file")
            if not upload:
                context = {
                    **self.each_context(request),
                    "title": "Restaurer un backup",
                    "error": "Veuillez sélectionner un fichier JSON.",
                }
                return TemplateResponse(request, "admin/restore.html", context)

            backup_dir = settings.MEDIA_ROOT / "backups" / "uploads"
            os.makedirs(backup_dir, exist_ok=True)
            file_path = backup_dir / upload.name
            with open(file_path, "wb") as output_file:
                for chunk in upload.chunks():
                    output_file.write(chunk)

            call_command("loaddata", str(file_path))

            context = {
                **self.each_context(request),
                "title": "Restaurer un backup",
                "success": "Backup restauré avec succès.",
            }
            return TemplateResponse(request, "admin/restore.html", context)

        context = {
            **self.each_context(request),
            "title": "Restaurer un backup",
        }
        return TemplateResponse(request, "admin/restore.html", context)


gmao_admin_site = GMAOAdminSite(name="gmao_admin")
