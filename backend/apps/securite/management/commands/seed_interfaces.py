"""
Commande Django pour créer les interfaces et les assigner aux rôles.
Usage :  python manage.py seed_interfaces
"""
from django.core.management.base import BaseCommand
from apps.securite.models import InterfaceApp, Role, RoleInterface


INTERFACES = [
    # (code, libelle, route, icon, module, ordre)
    ("DASHBOARD", "Tableau de bord", "/dashboard", "LayoutDashboard", "GENERAL", 10),
    ("SEC_UTILISATEURS", "Utilisateurs", "/utilisateurs", "Users", "SECURITE", 20),
    ("SEC_ROLES", "Rôles", "/roles", "Shield", "SECURITE", 21),
    ("SEC_PERMISSIONS", "Permissions", "/permissions", "Key", "SECURITE", 22),
    ("SEC_SESSIONS", "Sessions", "/sessions", "Monitor", "SECURITE", 23),
    ("SEC_JOURNAL_AUDIT", "Journal d'audit", "/journal-audit", "FileText", "SECURITE", 24),
    ("ORGANISATION", "Organisation", "/organisation", "Building2", "ORGANISATION", 30),
    ("ORG_SOCIETES", "Sociétés", "/societes", "Briefcase", "ORGANISATION", 31),
    ("ORG_SITES", "Sites", "/sites", "MapPin", "ORGANISATION", 32),
    ("ORG_SECTEURS", "Secteurs", "/secteurs", "Layers", "ORGANISATION", 33),
    ("ORG_UNITES", "Unités", "/unites", "Factory", "ORGANISATION", 34),
    ("ORG_SPECIALITES", "Spécialités", "/specialites", "Wrench", "ORGANISATION", 35),
    ("ORG_EQUIPES", "Équipes", "/equipes", "UsersRound", "ORGANISATION", 36),
    ("ORG_APPARTENANCES", "Appartenances", "/appartenances", "Link", "ORGANISATION", 37),
    ("ACTIFS_LISTE", "Liste des actifs", "/actifs", "Boxes", "ACTIFS", 40),
    ("ACTIFS_DASHBOARD", "Dashboard Actifs", "/actifs/dashboard", "BarChart3", "ACTIFS", 41),
    ("ACTIFS_ARBORESCENCE", "Arborescence", "/actifs/arborescence", "GitBranch", "ACTIFS", 42),
    ("ACTIFS_RACINES", "Actifs Racines", "/actifs-racines", "TreePine", "ACTIFS", 43),
    ("ACTIFS_UNITE", "Actifs par Unité", "/actifs/unite", "Building", "ACTIFS", 44),
    ("MAGASIN_CATALOGUE", "Catalogue Pièces", "/magasin", "Package", "MAGASIN", 50),
    ("MAGASIN_DASHBOARD", "Dashboard Magasin", "/magasin/dashboard", "BarChart3", "MAGASIN", 51),
    ("MAGASIN_SORTIE", "Sortie de Stock", "/magasin/sortie", "ArrowUpFromLine", "MAGASIN", 52),
    ("SOUS_TRAITANTS_LISTE", "Sous-traitants", "/soustraitants", "HardHat", "SOUS_TRAITANTS", 60),
    ("SOUS_TRAITANTS_DASHBOARD", "Dashboard Sous-traitants", "/soustraitants/dashboard", "BarChart3", "SOUS_TRAITANTS", 61),
    ("ORDRES_DEMANDES", "Demandes d'intervention", "/ordres/demandes", "ClipboardList", "ORDRES", 70),
    ("ORDRES_DASHBOARD_OT", "Dashboard OT", "/ordres/ots/dashboard", "BarChart3", "ORDRES", 71),
    ("ORDRES_OTS", "Ordres de Travail", "/ordres/ots", "Wrench", "ORDRES", 72),
    ("ORDRES_DECLARER", "Déclarer une panne", "/ordres/declarer", "AlertTriangle", "ORDRES", 73),
    ("ORDRES_GESTION", "Gestion des OT", "/ordres/gestion", "Settings", "ORDRES", 74),
    ("ORDRES_VALIDATION", "Validation Opérateur", "/ordres/validation", "CheckCircle", "ORDRES", 75),
]

ROLE_INTERFACES = {
    "OPERATEUR": [
        "DASHBOARD", "ORDRES_DEMANDES", "ORDRES_DECLARER", "ORDRES_VALIDATION", "ACTIFS_LISTE",
    ],
    "MAGASINIER": [
        "DASHBOARD", "MAGASIN_CATALOGUE", "MAGASIN_DASHBOARD", "MAGASIN_SORTIE", "ACTIFS_LISTE",
    ],
    "RESP_TECH": [
        "DASHBOARD", "ORDRES_DEMANDES", "ORDRES_DASHBOARD_OT", "ORDRES_OTS", "ORDRES_DECLARER",
        "ORDRES_VALIDATION", "ACTIFS_LISTE", "ACTIFS_DASHBOARD", "ACTIFS_ARBORESCENCE",
        "ACTIFS_RACINES", "ACTIFS_UNITE", "SOUS_TRAITANTS_LISTE", "SOUS_TRAITANTS_DASHBOARD",
        "ORGANISATION", "ORG_EQUIPES",
    ],
    "RESP_MAINT": [
        "DASHBOARD", "ORDRES_DEMANDES", "ORDRES_DASHBOARD_OT", "ORDRES_OTS", "ORDRES_DECLARER",
        "ORDRES_VALIDATION", "ORDRES_GESTION", "ACTIFS_LISTE", "ACTIFS_DASHBOARD",
        "ACTIFS_ARBORESCENCE", "ACTIFS_RACINES", "ACTIFS_UNITE", "SOUS_TRAITANTS_LISTE",
        "SOUS_TRAITANTS_DASHBOARD", "ORGANISATION", "ORG_SOCIETES", "ORG_SITES", "ORG_SECTEURS",
        "ORG_UNITES", "ORG_SPECIALITES", "ORG_EQUIPES", "ORG_APPARTENANCES", "SEC_UTILISATEURS",
        "SEC_ROLES", "SEC_PERMISSIONS", "SEC_SESSIONS", "SEC_JOURNAL_AUDIT",
    ],
    "DIR_TECH": [
        "DASHBOARD", "SEC_UTILISATEURS", "SEC_ROLES", "SEC_PERMISSIONS", "SEC_SESSIONS",
        "SEC_JOURNAL_AUDIT", "ORGANISATION", "ORG_SOCIETES", "ORG_SITES", "ORG_SECTEURS",
        "ORG_UNITES", "ORG_SPECIALITES", "ORG_EQUIPES", "ORG_APPARTENANCES", "ACTIFS_LISTE",
        "ACTIFS_DASHBOARD", "ACTIFS_ARBORESCENCE", "ACTIFS_RACINES", "ACTIFS_UNITE",
        "MAGASIN_CATALOGUE", "MAGASIN_DASHBOARD", "MAGASIN_SORTIE", "SOUS_TRAITANTS_LISTE",
        "SOUS_TRAITANTS_DASHBOARD", "ORDRES_DEMANDES", "ORDRES_DASHBOARD_OT", "ORDRES_OTS",
        "ORDRES_DECLARER", "ORDRES_GESTION", "ORDRES_VALIDATION",
    ],
}


class Command(BaseCommand):
    help = "Crée les interfaces et les assigne aux rôles"

    def handle(self, *args, **options):
        self.stdout.write("Création des interfaces...")

        # 1. Créer les interfaces
        for code, libelle, route, icon, module, ordre in INTERFACES:
            obj, created = InterfaceApp.objects.get_or_create(
                code=code,
                defaults={
                    "libelle": libelle,
                    "route": route,
                    "icon": icon,
                    "module": module,
                    "ordre": ordre,
                    "est_actif": True,
                },
            )
            action = "cree" if created else "deja existante"
            self.stdout.write(f"  {code} -> {action}")

        # 2. Créer les rôles s'ils n'existent pas
        self.stdout.write("\nCreation des roles...")
        for role_code in ROLE_INTERFACES.keys():
            role, created = Role.objects.get_or_create(
                code=role_code,
                defaults={"libelle": role_code.replace("_", " "), "niveau": 1, "est_actif": True},
            )
            action = "cree" if created else "deja existant"
            self.stdout.write(f"  {role_code} -> {action}")

        # 3. Assigner aux rôles
        self.stdout.write("\nAssignation des interfaces aux roles...")
        for role_code, interface_codes in ROLE_INTERFACES.items():
            try:
                role = Role.objects.get(code=role_code)
            except Role.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"  Role {role_code} introuvable -- ignore"))
                continue

            for icode in interface_codes:
                try:
                    iface = InterfaceApp.objects.get(code=icode)
                    ri, created = RoleInterface.objects.get_or_create(
                        id_role=role, id_interface=iface
                    )
                    if created:
                        self.stdout.write(f"  {role_code} <- {icode}")
                except InterfaceApp.DoesNotExist:
                    self.stdout.write(self.style.WARNING(f"  Interface {icode} introuvable -- ignoree"))

        self.stdout.write(self.style.SUCCESS("\nTerminé !"))
