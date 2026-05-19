"""
Synchronise les permissions existantes avec les interfaces deja assignees.
Usage : python manage.py sync_interface_permissions
"""
from django.core.management.base import BaseCommand
from apps.securite.models import RoleInterface, RolePermission, Permission
from apps.securite.interface_registry import INTERFACE_PERMISSIONS


class Command(BaseCommand):
    help = "Assigne les permissions manquantes basees sur les interfaces deja assignees"

    def handle(self, *args, **options):
        total_added = 0
        for ri in RoleInterface.objects.select_related("id_role", "id_interface").all():
            role = ri.id_role
            interface = ri.id_interface
            codes = INTERFACE_PERMISSIONS.get(interface.code, [])
            for code in codes:
                try:
                    perm = Permission.objects.get(code=code)
                    _, created = RolePermission.objects.get_or_create(
                        id_role=role, id_permission=perm
                    )
                    if created:
                        total_added += 1
                        self.stdout.write(f"  {role.code} <- {code}")
                except Permission.DoesNotExist:
                    pass

        self.stdout.write(self.style.SUCCESS(
            f"\nTermine! {total_added} permissions ajoutees."
        ))
