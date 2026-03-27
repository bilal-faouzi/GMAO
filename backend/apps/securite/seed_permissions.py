"""
Seed des permissions et role GMAO — à exécuter via : exec(open('apps/securite/seed_permissions.py', encoding='utf-8').read())
Supprime toutes les anciennes permissions et RolePermission, puis recrée tout.
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
    ("ADMIN_UTILISATEUR_CREER",     "ADMIN", "CREER",     "Utilisateur"),
    ("ADMIN_UTILISATEUR_LIRE",      "ADMIN", "LIRE",      "Utilisateur"),
    ("ADMIN_UTILISATEUR_MODIFIER",  "ADMIN", "MODIFIER",  "Utilisateur"),
    ("ADMIN_UTILISATEUR_SUPPRIMER", "ADMIN", "SUPPRIMER", "Utilisateur"),

    ("ADMIN_ROLE_CREER",            "ADMIN", "CREER",     "Role"),
    ("ADMIN_ROLE_LIRE",             "ADMIN", "LIRE",      "Role"),
    ("ADMIN_ROLE_MODIFIER",         "ADMIN", "MODIFIER",  "Role"),

    ("ADMIN_PERMISSION_LIRE",       "ADMIN", "LIRE",      "Permission"),
    ("ADMIN_PERMISSION_MODIFIER",   "ADMIN", "MODIFIER",  "Permission"),

    ("ADMIN_ORGANISATION_CREER",    "ADMIN", "CREER",     "Organisation"),
    ("ADMIN_ORGANISATION_MODIFIER", "ADMIN", "MODIFIER",  "Organisation"),
    ("ADMIN_ORGANISATION_LIRE",     "ADMIN", "LIRE",      "Organisation"),

    ("ADMIN_EQUIPE_CREER",          "ADMIN", "CREER",     "Equipe"),
    ("ADMIN_EQUIPE_MODIFIER",       "ADMIN", "MODIFIER",  "Equipe"),
    ("ADMIN_EQUIPE_LIRE",           "ADMIN", "LIRE",      "Equipe"),

    ("ADMIN_JOURNAL_LIRE",          "ADMIN", "LIRE",      "JournalAudit"),

    # ── MODULE : ACTIFS ─────────────────────────────────────────
    ("ACTIF_CREER",                 "ACTIFS", "CREER",     "Actif"),
    ("ACTIF_LIRE",                  "ACTIFS", "LIRE",      "Actif"),
    ("ACTIF_MODIFIER",              "ACTIFS", "MODIFIER",  "Actif"),
    ("ACTIF_SUPPRIMER",             "ACTIFS", "SUPPRIMER", "Actif"),
    ("ACTIF_CHANGER_STATUT",        "ACTIFS", "MODIFIER",  "ActifStatut"),
    ("ACTIF_HISTORIQUE_LIRE",       "ACTIFS", "LIRE",      "HistoriqueStatutActif"),

    # ── MODULE : INTERVENTIONS — Demandes d'Intervention (DI) ───
    ("DI_CREER",                    "INTERVENTIONS", "CREER",    "DemandeIntervention"),
    ("DI_LIRE",                     "INTERVENTIONS", "LIRE",     "DemandeIntervention"),
    ("DI_MODIFIER",                 "INTERVENTIONS", "MODIFIER", "DemandeIntervention"),
    ("DI_VALIDER",                  "INTERVENTIONS", "VALIDER",  "DemandeIntervention"),
    ("DI_REJETER",                  "INTERVENTIONS", "MODIFIER", "DemandeIntervention"),  # motifRejet

    # ── MODULE : INTERVENTIONS — Ordres de Travail (OT) ─────────
    ("OT_CREER",                    "INTERVENTIONS", "CREER",    "OrdreTravail"),
    ("OT_LIRE",                     "INTERVENTIONS", "LIRE",     "OrdreTravail"),
    ("OT_MODIFIER",                 "INTERVENTIONS", "MODIFIER", "OrdreTravail"),
    ("OT_AFFECTER_EQUIPE",          "INTERVENTIONS", "MODIFIER", "AffectationEquipe"),
    ("OT_AFFECTER_SOUSTRAIT",       "INTERVENTIONS", "MODIFIER", "AffectationSousTraitant"),
    ("OT_SAISIR_COMPTE_RENDU",      "INTERVENTIONS", "MODIFIER", "CompteRenduOT"),
    ("OT_CLOTURER",                 "INTERVENTIONS", "CLOTURER", "OrdreTravail"),
    ("OT_VALIDER_CLOTURE",          "INTERVENTIONS", "VALIDER",  "OrdreTravail"),   # confirmation opérateur
    ("OT_REJETER_CONFIRMATION",     "INTERVENTIONS", "MODIFIER", "OrdreTravail"),   # résultat = REJETE

    # ── MODULE : MAGASIN ────────────────────────────────────────
    ("STOCK_PIECE_CREER",           "MAGASIN", "CREER",     "Piece"),
    ("STOCK_PIECE_LIRE",            "MAGASIN", "LIRE",      "Piece"),
    ("STOCK_PIECE_MODIFIER",        "MAGASIN", "MODIFIER",  "Piece"),
    # Règle critique CDC : SEUL le MAGASINIER peut faire une sortie
    ("STOCK_SORTIE",                "MAGASIN", "CREER",     "MouvementStockSortie"),
    ("STOCK_ENTREE",                "MAGASIN", "CREER",     "MouvementStockEntree"),
    ("STOCK_MOUVEMENT_LIRE",        "MAGASIN", "LIRE",      "MouvementStock"),

    # ── MODULE : SOUS-TRAITANCE ──────────────────────────────────
    ("ST_CREER",                    "SOUS_TRAITANCE", "CREER",     "SousTraitant"),
    ("ST_LIRE",                     "SOUS_TRAITANCE", "LIRE",      "SousTraitant"),
    ("ST_MODIFIER",                 "SOUS_TRAITANCE", "MODIFIER",  "SousTraitant"),
    ("ST_SUSPENDRE",                "SOUS_TRAITANCE", "MODIFIER",  "SousTraitantStatut"),

    # ── MODULE : REPORTING / KPI ─────────────────────────────────
    ("KPI_LIRE",                    "REPORTING", "LIRE",  "KPI"),
    ("KPI_TABLEAU_BORD_LIRE",       "REPORTING", "LIRE",  "TableauBord"),
    ("KPI_RAPPORT_EXPORT",          "REPORTING", "LIRE",  "Rapport"),
    ("KPI_COUT_LIRE",               "REPORTING", "LIRE",  "CoutMaintenance"),
    ("KPI_BUDGET_LIRE",             "REPORTING", "LIRE",  "Budget"),

    # ── MODULE : NOTIFICATIONS ───────────────────────────────────
    ("NOTIF_LIRE",                  "NOTIFICATIONS", "LIRE",     "Notification"),
    ("NOTIF_REGLE_CREER",           "NOTIFICATIONS", "CREER",    "RegleNotification"),
    ("NOTIF_REGLE_MODIFIER",        "NOTIFICATIONS", "MODIFIER", "RegleNotification"),
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
        "DI_CREER",
        "DI_LIRE",
        # Confirme que l'équipement fonctionne après intervention
        "OT_VALIDER_CLOTURE",
        "OT_REJETER_CONFIRMATION",
        "OT_LIRE",
        # Lecture actifs de sa zone
        "ACTIF_LIRE",
        # Ses notifications
        "NOTIF_LIRE",
        # Tableau de bord limité (ses DI, statuts équipements)
        "KPI_TABLEAU_BORD_LIRE",
    ],

    "MAGASINIER": [
        # Gestion complète du stock
        "STOCK_PIECE_CREER",
        "STOCK_PIECE_LIRE",
        "STOCK_PIECE_MODIFIER",
        "STOCK_SORTIE",        # ← EXCLUSIF MAGASINIER (règle CDC)
        "STOCK_ENTREE",
        "STOCK_MOUVEMENT_LIRE",
        # Lecture OT pour savoir quelles pièces sortir
        "OT_LIRE",
        "DI_LIRE",
        "ACTIF_LIRE",
        "NOTIF_LIRE",
    ],

    "RESP_TECH": [
        # DI
        "DI_LIRE",
        "DI_VALIDER",
        "DI_REJETER",
        # OT — gestion complète
        "OT_CREER",
        "OT_LIRE",
        "OT_MODIFIER",
        "OT_AFFECTER_EQUIPE",
        "OT_AFFECTER_SOUSTRAIT",
        "OT_SAISIR_COMPTE_RENDU",
        "OT_CLOTURER",
        # Actifs
        "ACTIF_LIRE",
        "ACTIF_CHANGER_STATUT",
        "ACTIF_HISTORIQUE_LIRE",
        # Stock (lecture pour planification)
        "STOCK_PIECE_LIRE",
        "STOCK_MOUVEMENT_LIRE",
        # Sous-traitance (lecture + affectation via OT)
        "ST_LIRE",
        # KPI propres à son périmètre
        "KPI_TABLEAU_BORD_LIRE",
        "KPI_LIRE",
        # Notifications
        "NOTIF_LIRE",
        # Équipes (lecture)
        "ADMIN_EQUIPE_LIRE",
    ],

    "RESP_MAINT": [
        # DI
        "DI_LIRE",
        "DI_VALIDER",
        "DI_REJETER",
        # OT — supervision complète
        "OT_CREER",
        "OT_LIRE",
        "OT_MODIFIER",
        "OT_AFFECTER_EQUIPE",
        "OT_AFFECTER_SOUSTRAIT",
        "OT_SAISIR_COMPTE_RENDU",
        "OT_CLOTURER",
        # Actifs — gestion complète
        "ACTIF_CREER",
        "ACTIF_LIRE",
        "ACTIF_MODIFIER",
        "ACTIF_CHANGER_STATUT",
        "ACTIF_HISTORIQUE_LIRE",
        # Stock (lecture)
        "STOCK_PIECE_LIRE",
        "STOCK_MOUVEMENT_LIRE",
        # Sous-traitance
        "ST_CREER",
        "ST_LIRE",
        "ST_MODIFIER",
        "ST_SUSPENDRE",
        # KPI complets
        "KPI_LIRE",
        "KPI_TABLEAU_BORD_LIRE",
        "KPI_RAPPORT_EXPORT",
        "KPI_COUT_LIRE",
        # Notifications + règles
        "NOTIF_LIRE",
        "NOTIF_REGLE_CREER",
        "NOTIF_REGLE_MODIFIER",
        # Admin équipes
        "ADMIN_EQUIPE_CREER",
        "ADMIN_EQUIPE_MODIFIER",
        "ADMIN_EQUIPE_LIRE",
        "ADMIN_ORGANISATION_LIRE",
    ],

    "RESP_PROD": [
        # Lecture DI/OT — suivi impact production
        "DI_LIRE",
        "OT_LIRE",
        # Actifs de sa zone
        "ACTIF_LIRE",
        "ACTIF_HISTORIQUE_LIRE",
        # KPI production
        "KPI_LIRE",
        "KPI_TABLEAU_BORD_LIRE",
        # Notifications
        "NOTIF_LIRE",
    ],

    "DIR_TECH": [
        # Vision globale — tout en lecture + actions stratégiques
        "DI_LIRE",
        "OT_LIRE",
        "OT_MODIFIER",        # peut intervenir sur escalades
        "ACTIF_LIRE",
        "ACTIF_HISTORIQUE_LIRE",
        "STOCK_PIECE_LIRE",
        "STOCK_MOUVEMENT_LIRE",
        "ST_LIRE",
        # KPI complets + budget
        "KPI_LIRE",
        "KPI_TABLEAU_BORD_LIRE",
        "KPI_RAPPORT_EXPORT",
        "KPI_COUT_LIRE",
        "KPI_BUDGET_LIRE",
        # Notifications
        "NOTIF_LIRE",
        "NOTIF_REGLE_CREER",
        "NOTIF_REGLE_MODIFIER",
        # Admin — gestion utilisateurs et organisation
        "ADMIN_UTILISATEUR_CREER",
        "ADMIN_UTILISATEUR_LIRE",
        "ADMIN_UTILISATEUR_MODIFIER",
        "ADMIN_UTILISATEUR_SUPPRIMER",
        "ADMIN_ROLE_CREER",
        "ADMIN_ROLE_LIRE",
        "ADMIN_ROLE_MODIFIER",
        "ADMIN_PERMISSION_LIRE",
        "ADMIN_PERMISSION_MODIFIER",
        "ADMIN_ORGANISATION_CREER",
        "ADMIN_ORGANISATION_MODIFIER",
        "ADMIN_ORGANISATION_LIRE",
        "ADMIN_EQUIPE_CREER",
        "ADMIN_EQUIPE_MODIFIER",
        "ADMIN_EQUIPE_LIRE",
        "ADMIN_JOURNAL_LIRE",
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