from django.db import transaction
from apps.securite.models import InterfaceApp, Permission, Role, RoleInterface, RolePermission, UtilisateurRole, Utilisateur
from apps.securite.interface_registry import INTERFACES, PERMISSIONS, INTERFACE_PERMISSIONS


def sync_interfaces():
    for interface in INTERFACES:
        InterfaceApp.objects.update_or_create(
            code=interface["code"],
            defaults={
                "libelle": interface["libelle"],
                "route": interface["route"],
                "icon": interface.get("icon", ""),
                "module": interface.get("module", ""),
                "ordre": interface.get("ordre", 0),
                "est_actif": True,
            },
        )


def sync_permissions():
    for code, module, action, ressource in PERMISSIONS:
        Permission.objects.update_or_create(
            code=code,
            defaults={
                "module": module,
                "action": action,
                "ressource": ressource,
                "est_actif": True,
            },
        )


def ensure_admin_role():
    role, _ = Role.objects.get_or_create(
        code="ADMIN",
        defaults={"libelle": "Administrateur", "niveau": 99, "est_actif": True},
    )
    if not role.est_actif:
        role.est_actif = True
        role.save(update_fields=["est_actif"])
    return role


def assign_admin_interfaces(role):
    interfaces = InterfaceApp.objects.filter(code__in=[i["code"] for i in INTERFACES])
    for interface in interfaces:
        RoleInterface.objects.get_or_create(id_role=role, id_interface=interface)
        for code in INTERFACE_PERMISSIONS.get(interface.code, []):
            try:
                perm = Permission.objects.get(code=code)
                RolePermission.objects.get_or_create(id_role=role, id_permission=perm)
            except Permission.DoesNotExist:
                continue


def assign_admin_to_users_without_role(role):
    users_without_role = Utilisateur.objects.exclude(roles__isnull=False).distinct()
    for user in users_without_role:
        UtilisateurRole.objects.get_or_create(id_utilisateur=user, id_role=role)


def run_sync(assign_admin_to_no_role=True):
    with transaction.atomic():
        sync_interfaces()
        sync_permissions()
        admin_role = ensure_admin_role()
        assign_admin_interfaces(admin_role)
        if assign_admin_to_no_role:
            assign_admin_to_users_without_role(admin_role)
