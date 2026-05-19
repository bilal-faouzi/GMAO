from django.core.management.base import BaseCommand
from apps.securite.sync_access_control import run_sync


class Command(BaseCommand):
    help = "Synchronise interfaces/permissions et assigne l'admin automatiquement."

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-auto-admin",
            action="store_true",
            help="Ne pas assigner le rôle ADMIN aux utilisateurs sans rôle",
        )

    def handle(self, *args, **options):
        assign_admin = not options["no_auto_admin"]
        run_sync(assign_admin_to_no_role=assign_admin)
        self.stdout.write(self.style.SUCCESS("Synchronisation terminée."))
