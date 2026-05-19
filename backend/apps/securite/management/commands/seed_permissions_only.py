"""
Commande Django pour creer les permissions et les assigner aux roles.
Ne supprime aucune donnee existante (roles, interfaces preserves).
Usage :  python manage.py seed_permissions_only
"""
from django.core.management.base import BaseCommand
from apps.securite.models import Permission, Role, RolePermission
from apps.securite.interface_registry import PERMISSIONS

ROLE_PERMISSIONS = {
    "OPERATEUR": [
        "DI_CREATE", "DI_READ", "OT_VALIDER_CLOTURE", "OT_REJETER_CONFIRMATION",
        "OT_READ", "ACTIF_READ", "NOTIF_READ", "KPI_TABLEAU_BORD_READ",
    ],
    "MAGASINIER": [
        "STOCK_PIECE_CREATE", "STOCK_PIECE_READ", "STOCK_PIECE_UPDATE",
        "STOCK_SORTIE", "STOCK_ENTREE", "STOCK_MOUVEMENT_READ",
        "OT_READ", "DI_READ", "ACTIF_READ", "NOTIF_READ",
    ],
    "RESP_TECH": [
        "DI_READ", "DI_VALIDER", "DI_REJETER",
        "OT_CREATE", "OT_READ", "OT_UPDATE", "OT_AFFECTER_EQUIPE",
        "OT_AFFECTER_SOUSTRAIT", "OT_SAISIR_COMPTE_RENDU", "OT_CLOTURER",
        "ACTIF_READ", "ACTIF_CHANGER_STATUT", "ACTIF_HISTORIQUE_READ",
        "STOCK_PIECE_READ", "STOCK_MOUVEMENT_READ", "ST_READ",
        "KPI_TABLEAU_BORD_READ", "KPI_READ", "NOTIF_READ", "ADMIN_EQUIPE_READ",
    ],
    "RESP_MAINT": [
        "DI_READ", "DI_VALIDER", "DI_REJETER",
        "OT_CREATE", "OT_READ", "OT_UPDATE", "OT_AFFECTER_EQUIPE",
        "OT_AFFECTER_SOUSTRAIT", "OT_SAISIR_COMPTE_RENDU", "OT_CLOTURER",
        "ACTIF_CREATE", "ACTIF_READ", "ACTIF_UPDATE", "ACTIF_CHANGER_STATUT",
        "ACTIF_HISTORIQUE_READ", "STOCK_PIECE_READ", "STOCK_MOUVEMENT_READ",
        "ST_CREATE", "ST_READ", "ST_UPDATE", "ST_SUSPENDRE",
        "KPI_READ", "KPI_TABLEAU_BORD_READ", "KPI_RAPPORT_EXPORT", "KPI_COUT_READ",
        "NOTIF_READ", "NOTIF_REGLE_CREATE", "NOTIF_REGLE_UPDATE",
        "ADMIN_EQUIPE_CREATE", "ADMIN_EQUIPE_UPDATE", "ADMIN_EQUIPE_READ",
        "ADMIN_ORGANISATION_READ",
    ],
    "RESP_PROD": [
        "DI_READ", "OT_READ", "ACTIF_READ", "ACTIF_HISTORIQUE_READ",
        "KPI_READ", "KPI_TABLEAU_BORD_READ", "NOTIF_READ",
    ],
    "DIR_TECH": [
        "DI_READ", "OT_READ", "OT_UPDATE", "ACTIF_READ", "ACTIF_HISTORIQUE_READ",
        "STOCK_PIECE_READ", "STOCK_MOUVEMENT_READ", "ST_READ",
        "KPI_READ", "KPI_TABLEAU_BORD_READ", "KPI_RAPPORT_EXPORT",
        "KPI_COUT_READ", "KPI_BUDGET_READ", "NOTIF_READ",
        "NOTIF_REGLE_CREATE", "NOTIF_REGLE_UPDATE",
        "ADMIN_UTILISATEUR_CREATE", "ADMIN_UTILISATEUR_READ",
        "ADMIN_UTILISATEUR_UPDATE", "ADMIN_UTILISATEUR_DELETE",
        "ADMIN_ROLE_CREATE", "ADMIN_ROLE_READ", "ADMIN_ROLE_UPDATE",
        "ADMIN_PERMISSION_READ", "ADMIN_PERMISSION_UPDATE",
        "ADMIN_ORGANISATION_CREATE", "ADMIN_ORGANISATION_UPDATE", "ADMIN_ORGANISATION_READ",
        "ADMIN_EQUIPE_CREATE", "ADMIN_EQUIPE_UPDATE", "ADMIN_EQUIPE_READ",
        "ADMIN_JOURNAL_READ",
    ],
}


class Command(BaseCommand):
    help = "Cree les permissions et les assigne aux roles (sans supprimer les donnees existantes)"

    def handle(self, *args, **options):
        self.stdout.write("Creation des permissions...")

        created_perms = {}
        for code, module, action, ressource in PERMISSIONS:
            perm, created = Permission.objects.get_or_create(
                code=code,
                defaults={
                    "module": module,
                    "action": action,
                    "ressource": ressource,
                    "est_actif": True,
                },
            )
            created_perms[code] = perm
            status = "cree" if created else "deja existant"
            self.stdout.write(f"  {code} -> {status}")

        self.stdout.write(f"\nTotal permissions en base: {Permission.objects.count()}")

        self.stdout.write("\nAttribution des permissions aux roles...")
        total_liens = 0
        for role_code, perm_codes in ROLE_PERMISSIONS.items():
            try:
                role = Role.objects.get(code=role_code)
            except Role.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"  Role {role_code} introuvable -- ignore"))
                continue

            count = 0
            for perm_code in perm_codes:
                perm = created_perms.get(perm_code)
                if not perm:
                    self.stdout.write(self.style.WARNING(f"  Permission {perm_code} inconnue -- ignoree"))
                    continue
                RolePermission.objects.get_or_create(id_role=role, id_permission=perm)
                count += 1
                total_liens += 1

            self.stdout.write(f"  {role_code} -> {count} permissions")

        self.stdout.write(self.style.SUCCESS(
            f"\nTermine! {Permission.objects.count()} permissions - {total_liens} liens role/permission"
        ))
