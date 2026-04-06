from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta


class Command(BaseCommand):
    help = 'Seed de données de test pour $CMD'

    def handle(self, *args, **kwargs):

        self.stdout.write("── Début du seed ──")

        # ──────────────────────────────────────────────
        # Imports des modèles (adapte selon ton app)
        # ──────────────────────────────────────────────
        # from apps.monapp.models import MonModel

        # ──────────────────────────────────────────────
        # Logique du seed
        # ──────────────────────────────────────────────
        """
        Seed des permissions et role GMAO — à exécuter via : exec(open('apps/securite/seed_permissions.py', encoding='utf-8').read())
        Supprime toutes les anciennes permissions et RolePermission, puis recrée tout.
        run
        python manage.py shell
        exec(open("apps/securite/seed_permissions.py", encoding="utf-8").read())
        """





        from apps.securite.models import Permission, Role, RolePermission

        print("🗑️  Suppression des anciennes role")
        Role.objects.all().delete()

        roles = [
            {"code": "OPERATEUR",   "libelle": "Opérateur",                "niveau": 5},
            {"code": "MAGASINIER",  "libelle": "Magasinier",               "niveau": 4},
            {"code": "RESP_TECH",   "libelle": "Responsable Techniciens",  "niveau": 3},
            {"code": "RESP_MAINT",  "libelle": "Responsable Maintenance",  "niveau": 2},
            {"code": "RESP_PROD",   "libelle": "Responsable Production",   "niveau": 2},
            {"code": "DIR_TECH",    "libelle": "Directeur Technique",      "niveau": 1},
        ]

        for r in roles:
            Role.objects.get_or_create(code=r["code"], defaults=r)

        print(Role.objects.all())
        # ─────────────────────────────────────────────
        # 1. NETTOYAGE
        # ─────────────────────────────────────────────
        print("🗑️  Suppression des anciennes RolePermission...")
        RolePermission.objects.all().delete()

        print("🗑️  Suppression des anciennes Permission...")
        Permission.objects.all().delete()


        # ─────────────────────────────────────────────
        # 2. DÉFINITION DE TOUTES LES PERMISSIONS
        #    Format : (code, module, action, ressource)
        # ─────────────────────────────────────────────

        PERMISSIONS = [

            # ── MODULE : ADMIN ──────────────────────────────────────────
            ("ADMIN_UTILISATEUR_CREATE",     "ADMIN", "CREATE",     "Utilisateur"),
            ("ADMIN_UTILISATEUR_READ",      "ADMIN", "READ",      "Utilisateur"),
            ("ADMIN_UTILISATEUR_UPDATE",  "ADMIN", "UPDATE",  "Utilisateur"),
            ("ADMIN_UTILISATEUR_DELETE", "ADMIN", "DELETE", "Utilisateur"),

            ("ADMIN_ROLE_CREATE",            "ADMIN", "CREATE",     "Role"),
            ("ADMIN_ROLE_READ",             "ADMIN", "READ",      "Role"),
            ("ADMIN_ROLE_UPDATE",         "ADMIN", "UPDATE",  "Role"),

            ("ADMIN_PERMISSION_READ",       "ADMIN", "READ",      "Permission"),
            ("ADMIN_PERMISSION_UPDATE",   "ADMIN", "UPDATE",  "Permission"),

            ("ADMIN_ORGANISATION_CREATE",    "ADMIN", "CREATE",     "Organisation"),
            ("ADMIN_ORGANISATION_UPDATE", "ADMIN", "UPDATE",  "Organisation"),
            ("ADMIN_ORGANISATION_READ",     "ADMIN", "READ",      "Organisation"),

            ("ADMIN_EQUIPE_CREATE",          "ADMIN", "CREATE",     "Equipe"),
            ("ADMIN_EQUIPE_UPDATE",       "ADMIN", "UPDATE",  "Equipe"),
            ("ADMIN_EQUIPE_READ",           "ADMIN", "READ",      "Equipe"),

            ("ADMIN_JOURNAL_READ",          "ADMIN", "READ",      "JournalAudit"),

            # ── MODULE : ACTIFS ─────────────────────────────────────────
            ("ACTIF_CREATE",                 "ACTIFS", "CREATE",     "Actif"),
            ("ACTIF_READ",                  "ACTIFS", "READ",      "Actif"),
            ("ACTIF_UPDATE",              "ACTIFS", "UPDATE",  "Actif"),
            ("ACTIF_DELETE",             "ACTIFS", "DELETE", "Actif"),
            ("ACTIF_CHANGER_STATUT",        "ACTIFS", "UPDATE",  "ActifStatut"),
            ("ACTIF_HISTORIQUE_READ",       "ACTIFS", "READ",      "HistoriqueStatutActif"),

            # ── MODULE : INTERVENTIONS — Demandes d'Intervention (DI) ───
            ("DI_CREATE",                    "INTERVENTIONS", "CREATE",    "DemandeIntervention"),
            ("DI_READ",                     "INTERVENTIONS", "READ",     "DemandeIntervention"),
            ("DI_UPDATE",                 "INTERVENTIONS", "UPDATE", "DemandeIntervention"),
            ("DI_VALIDER",                  "INTERVENTIONS", "VALIDER",  "DemandeIntervention"),
            ("DI_REJETER",                  "INTERVENTIONS", "UPDATE", "DemandeIntervention"),  # motifRejet

            # ── MODULE : INTERVENTIONS — Ordres de Travail (OT) ─────────
            ("OT_CREATE",                    "INTERVENTIONS", "CREATE",    "OrdreTravail"),
            ("OT_READ",                     "INTERVENTIONS", "READ",     "OrdreTravail"),
            ("OT_UPDATE",                 "INTERVENTIONS", "UPDATE", "OrdreTravail"),
            ("OT_AFFECTER_EQUIPE",          "INTERVENTIONS", "UPDATE", "AffectationEquipe"),
            ("OT_AFFECTER_SOUSTRAIT",       "INTERVENTIONS", "UPDATE", "AffectationSousTraitant"),
            ("OT_SAISIR_COMPTE_RENDU",      "INTERVENTIONS", "UPDATE", "CompteRenduOT"),
            ("OT_CLOTURER",                 "INTERVENTIONS", "CLOTURER", "OrdreTravail"),
            ("OT_VALIDER_CLOTURE",          "INTERVENTIONS", "VALIDER",  "OrdreTravail"),   # confirmation opérateur
            ("OT_REJETER_CONFIRMATION",     "INTERVENTIONS", "UPDATE", "OrdreTravail"),   # résultat = REJETE

            # ── MODULE : MAGASIN ────────────────────────────────────────
            ("STOCK_PIECE_CREATE",           "MAGASIN", "CREATE",     "Piece"),
            ("STOCK_PIECE_READ",            "MAGASIN", "READ",      "Piece"),
            ("STOCK_PIECE_UPDATE",        "MAGASIN", "UPDATE",  "Piece"),
            # Règle critique CDC : SEUL le MAGASINIER peut faire une sortie
            ("STOCK_SORTIE",                "MAGASIN", "CREATE",     "MouvementStockSortie"),
            ("STOCK_ENTREE",                "MAGASIN", "CREATE",     "MouvementStockEntree"),
            ("STOCK_MOUVEMENT_READ",        "MAGASIN", "READ",      "MouvementStock"),

            # ── MODULE : SOUS-TRAITANCE ──────────────────────────────────
            ("ST_CREATE",                    "SOUS_TRAITANCE", "CREATE",     "SousTraitant"),
            ("ST_READ",                     "SOUS_TRAITANCE", "READ",      "SousTraitant"),
            ("ST_UPDATE",                 "SOUS_TRAITANCE", "UPDATE",  "SousTraitant"),
            ("ST_SUSPENDRE",                "SOUS_TRAITANCE", "UPDATE",  "SousTraitantStatut"),

            # ── MODULE : REPORTING / KPI ─────────────────────────────────
            ("KPI_READ",                    "REPORTING", "READ",  "KPI"),
            ("KPI_TABLEAU_BORD_READ",       "REPORTING", "READ",  "TableauBord"),
            ("KPI_RAPPORT_EXPORT",          "REPORTING", "READ",  "Rapport"),
            ("KPI_COUT_READ",               "REPORTING", "READ",  "CoutMaintenance"),
            ("KPI_BUDGET_READ",             "REPORTING", "READ",  "Budget"),

            # ── MODULE : NOTIFICATIONS ───────────────────────────────────
            ("NOTIF_READ",                  "NOTIFICATIONS", "READ",     "Notification"),
            ("NOTIF_REGLE_CREATE",           "NOTIFICATIONS", "CREATE",    "RegleNotification"),
            ("NOTIF_REGLE_UPDATE",        "NOTIFICATIONS", "UPDATE", "RegleNotification"),
        ]

        # ─────────────────────────────────────────────
        # 3. CRÉATION DES PERMISSIONS
        # ─────────────────────────────────────────────
        print(f"\n✅ Création de {len(PERMISSIONS)} permissions...")

        created_perms = {}
        for code, module, action, ressource in PERMISSIONS:
            perm, _ = Permission.objects.get_or_create(
                code=code,
                defaults={
                    "module": module,
                    "action": action,
                    "ressource": ressource,
                    "est_actif": True,
                }
            )
            created_perms[code] = perm

        print(f"   → {Permission.objects.count()} permissions en base.")

        # ─────────────────────────────────────────────
        # 4. ATTRIBUTION DES PERMISSIONS PAR RÔLE
        #
        #  Rôles du système :
        #    OPERATEUR   (niveau 5) — déclare DI, confirme OT
        #    MAGASINIER  (niveau 4) — gère le stock (SEUL à faire STOCK_SORTIE)
        #    RESP_TECH   (niveau 3) — valide DI, crée/gère OT, affecte équipes
        #    RESP_MAINT  (niveau 2) — supervision, SLA, KPI complets
        #    RESP_PROD   (niveau 2) — suivi production, priorités
        #    DIR_TECH    (niveau 1) — tout voir, escalades, budget
        # ─────────────────────────────────────────────

        ROLE_PERMISSIONS = {

            "OPERATEUR": [
                # Peut créer une DI et suivre ses propres DI/OT
                "DI_CREATE",
                "DI_READ",
                # Confirme que l'équipement fonctionne après intervention
                "OT_VALIDER_CLOTURE",
                "OT_REJETER_CONFIRMATION",
                "OT_READ",
                # Lecture actifs de sa zone
                "ACTIF_READ",
                # Ses notifications
                "NOTIF_READ",
                # Tableau de bord limité (ses DI, statuts équipements)
                "KPI_TABLEAU_BORD_READ",
            ],

            "MAGASINIER": [
                # Gestion complète du stock
                "STOCK_PIECE_CREATE",
                "STOCK_PIECE_READ",
                "STOCK_PIECE_UPDATE",
                "STOCK_SORTIE",        # ← EXCLUSIF MAGASINIER (règle CDC)
                "STOCK_ENTREE",
                "STOCK_MOUVEMENT_READ",
                # Lecture OT pour savoir quelles pièces sortir
                "OT_READ",
                "DI_READ",
                "ACTIF_READ",
                "NOTIF_READ",
            ],

            "RESP_TECH": [
                # DI
                "DI_READ",
                "DI_VALIDER",
                "DI_REJETER",
                # OT — gestion complète
                "OT_CREATE",
                "OT_READ",
                "OT_UPDATE",
                "OT_AFFECTER_EQUIPE",
                "OT_AFFECTER_SOUSTRAIT",
                "OT_SAISIR_COMPTE_RENDU",
                "OT_CLOTURER",
                # Actifs
                "ACTIF_READ",
                "ACTIF_CHANGER_STATUT",
                "ACTIF_HISTORIQUE_READ",
                # Stock (lecture pour planification)
                "STOCK_PIECE_READ",
                "STOCK_MOUVEMENT_READ",
                # Sous-traitance (lecture + affectation via OT)
                "ST_READ",
                # KPI propres à son périmètre
                "KPI_TABLEAU_BORD_READ",
                "KPI_READ",
                # Notifications
                "NOTIF_READ",
                # Équipes (lecture)
                "ADMIN_EQUIPE_READ",
            ],

            "RESP_MAINT": [
                # DI
                "DI_READ",
                "DI_VALIDER",
                "DI_REJETER",
                # OT — supervision complète
                "OT_CREATE",
                "OT_READ",
                "OT_UPDATE",
                "OT_AFFECTER_EQUIPE",
                "OT_AFFECTER_SOUSTRAIT",
                "OT_SAISIR_COMPTE_RENDU",
                "OT_CLOTURER",
                # Actifs — gestion complète
                "ACTIF_CREATE",
                "ACTIF_READ",
                "ACTIF_UPDATE",
                "ACTIF_CHANGER_STATUT",
                "ACTIF_HISTORIQUE_READ",
                # Stock (lecture)
                "STOCK_PIECE_READ",
                "STOCK_MOUVEMENT_READ",
                # Sous-traitance
                "ST_CREATE",
                "ST_READ",
                "ST_UPDATE",
                "ST_SUSPENDRE",
                # KPI complets
                "KPI_READ",
                "KPI_TABLEAU_BORD_READ",
                "KPI_RAPPORT_EXPORT",
                "KPI_COUT_READ",
                # Notifications + règles
                "NOTIF_READ",
                "NOTIF_REGLE_CREATE",
                "NOTIF_REGLE_UPDATE",
                # Admin équipes
                "ADMIN_EQUIPE_CREATE",
                "ADMIN_EQUIPE_UPDATE",
                "ADMIN_EQUIPE_READ",
                "ADMIN_ORGANISATION_READ",
            ],

            "RESP_PROD": [
                # Lecture DI/OT — suivi impact production
                "DI_READ",
                "OT_READ",
                # Actifs de sa zone
                "ACTIF_READ",
                "ACTIF_HISTORIQUE_READ",
                # KPI production
                "KPI_READ",
                "KPI_TABLEAU_BORD_READ",
                # Notifications
                "NOTIF_READ",
            ],

            "DIR_TECH": [
                # Vision globale — tout en lecture + actions stratégiques
                "DI_READ",
                "OT_READ",
                "OT_UPDATE",        # peut intervenir sur escalades
                "ACTIF_READ",
                "ACTIF_HISTORIQUE_READ",
                "STOCK_PIECE_READ",
                "STOCK_MOUVEMENT_READ",
                "ST_READ",
                # KPI complets + budget
                "KPI_READ",
                "KPI_TABLEAU_BORD_READ",
                "KPI_RAPPORT_EXPORT",
                "KPI_COUT_READ",
                "KPI_BUDGET_READ",
                # Notifications
                "NOTIF_READ",
                "NOTIF_REGLE_CREATE",
                "NOTIF_REGLE_UPDATE",
                # Admin — gestion utilisateurs et organisation
                "ADMIN_UTILISATEUR_CREATE",
                "ADMIN_UTILISATEUR_READ",
                "ADMIN_UTILISATEUR_UPDATE",
                "ADMIN_UTILISATEUR_DELETE",
                "ADMIN_ROLE_CREATE",
                "ADMIN_ROLE_READ",
                "ADMIN_ROLE_UPDATE",
                "ADMIN_PERMISSION_READ",
                "ADMIN_PERMISSION_UPDATE",
                "ADMIN_ORGANISATION_CREATE",
                "ADMIN_ORGANISATION_UPDATE",
                "ADMIN_ORGANISATION_READ",
                "ADMIN_EQUIPE_CREATE",
                "ADMIN_EQUIPE_UPDATE",
                "ADMIN_EQUIPE_READ",
                "ADMIN_JOURNAL_READ",
            ],
        }

        # ─────────────────────────────────────────────
        # 5. CRÉATION DES RolePermission
        # ─────────────────────────────────────────────
        print("\n🔗 Attribution des permissions aux rôles...")

        total_liens = 0
        for role_code, perm_codes in ROLE_PERMISSIONS.items():
            try:
                role = Role.objects.get(code=role_code)
            except Role.DoesNotExist:
                print(f"   ⚠️  Rôle '{role_code}' introuvable en base — ignoré.")
                continue

            for perm_code in perm_codes:
                perm = created_perms.get(perm_code)
                if not perm:
                    print(f"   ⚠️  Permission '{perm_code}' inconnue — ignorée.")
                    continue
                RolePermission.objects.get_or_create(
                    id_role=role,
                    id_permission=perm,
                )
                total_liens += 1

            print(f"   ✅ {role_code} → {len(perm_codes)} permissions")

        print(f"\n🎉 Terminé. {Permission.objects.count()} permissions · {total_liens} liens rôle↔permission créés.")


        self.stdout.write(self.style.SUCCESS('🎉 Seed terminé !'))
