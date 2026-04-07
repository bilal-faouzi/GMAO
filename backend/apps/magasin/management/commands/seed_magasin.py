from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random
import decimal


class Command(BaseCommand):
    help = 'Seed de données de test pour Piece et MouvementStock'

    def handle(self, *args, **kwargs):
        self.stdout.write("── Début du seed ──")

        from apps.magasin.models import Piece, MouvementStock
        from apps.securite.models import Utilisateur, Role, UtilisateurRole

        # ──────────────────────────────────────────────
        # Récupération des utilisateurs via Role.code
        # ──────────────────────────────────────────────
        # On cherche les rôles magasinier et technicien
        role_mag = Role.objects.filter(code='magasinier').first()
        role_tec = Role.objects.filter(code='technicien').first()

        mag = None
        tec = None

        if role_mag:
            lien = UtilisateurRole.objects.filter(id_role=role_mag).first()
            mag  = lien.id_utilisateur if lien else None

        if role_tec:
            lien = UtilisateurRole.objects.filter(id_role=role_tec).first()
            tec  = lien.id_utilisateur if lien else None

        # Fallback : n'importe quel utilisateur actif
        if mag is None:
            mag = Utilisateur.objects.filter(est_actif=True).first()
        if tec is None:
            tec = Utilisateur.objects.filter(est_actif=True).first()

        self.stdout.write(f"  → Magasinier : {mag}")
        self.stdout.write(f"  → Technicien : {tec}")

        # ──────────────────────────────────────────────
        # Données des 100 pièces
        # ──────────────────────────────────────────────
        PIECES_DATA = [
            # (reference, designation, categorie, unite, emplacement, qte, seuil, prix, fournisseur, refConstructeur)
            ("FIL-001", "Filtre à huile moteur",              "Filtration",    "pièce", "A1-E1-N1",  24,  5,  18.50, "Filtres Pro SARL",       "FO-2897"),
            ("FIL-002", "Filtre à air primaire",              "Filtration",    "pièce", "A1-E1-N2",  12,  3,  32.00, "Filtres Pro SARL",       "FA-4521"),
            ("FIL-003", "Filtre à carburant diesel",          "Filtration",    "pièce", "A1-E1-N3",  18,  4,  24.75, "Filtres Pro SARL",       "FC-1103"),
            ("FIL-004", "Filtre hydraulique haute pression",  "Filtration",    "pièce", "A1-E2-N1",   8,  2,  67.00, "HydroFilt Maroc",        "HF-880"),
            ("FIL-005", "Filtre séparateur eau/carburant",    "Filtration",    "pièce", "A1-E2-N2",  10,  3,  41.20, "Filtres Pro SARL",       "FSE-220"),
            ("LUB-001", "Huile moteur 15W40 (bidon 5L)",      "Lubrification", "litre", "A2-E1-N1", 120, 20,   8.90, "TotalEnergies Maroc",    "RM7-5L"),
            ("LUB-002", "Huile hydraulique ISO 46 (bidon 5L)","Lubrification", "litre", "A2-E1-N2",  80, 15,   9.40, "TotalEnergies Maroc",    "AZO46-5L"),
            ("LUB-003", "Graisse lithium NLGI 2 (kg)",        "Lubrification", "kg",    "A2-E2-N1",  35,  8,  12.00, "Castrol Maroc",          "LI-GR2"),
            ("LUB-004", "Huile boîte de vitesses 80W90",      "Lubrification", "litre", "A2-E2-N2",  40, 10,  11.50, "TotalEnergies Maroc",    "TM80-4L"),
            ("LUB-005", "Liquide de refroidissement (L)",     "Lubrification", "litre", "A2-E3-N1",  60, 10,   6.20, "Cooltech Maroc",         "CT-BLUE"),
            ("COU-001", "Courroie trapézoïdale A-75",         "Transmission",  "pièce", "B1-E1-N1",   6,  2,  14.30, "Gates Maroc",            "A75-GT"),
            ("COU-002", "Courroie dentée T5-500",             "Transmission",  "pièce", "B1-E1-N2",   4,  1,  28.00, "Gates Maroc",            "T5-500"),
            ("COU-003", "Courroie poly-V 6PK1750",            "Transmission",  "pièce", "B1-E1-N3",   5,  2,  35.50, "Gates Maroc",            "6PK1750"),
            ("ROU-001", "Roulement à billes 6205-2RS",        "Roulements",    "pièce", "B2-E1-N1",  20,  5,  22.00, "SKF Maroc",              "6205-2RS"),
            ("ROU-002", "Roulement à billes 6305-2RS",        "Roulements",    "pièce", "B2-E1-N2",  15,  4,  27.50, "SKF Maroc",              "6305-2RS"),
            ("ROU-003", "Roulement à rouleaux 30207",         "Roulements",    "pièce", "B2-E1-N3",  10,  3,  48.00, "SKF Maroc",              "30207"),
            ("ROU-004", "Roulement oscillant 1205",           "Roulements",    "pièce", "B2-E2-N1",   8,  2,  55.00, "FAG Maroc",              "1205-ETN9"),
            ("JNT-001", "Joint spi 30x52x10",                 "Étanchéité",    "pièce", "C1-E1-N1",  30,  6,   4.50, "Freudenberg Maroc",      "OS-30x52"),
            ("JNT-002", "Joint torique 50x3",                 "Étanchéité",    "pièce", "C1-E1-N2",  50, 10,   1.20, "Freudenberg Maroc",      "OR-50x3"),
            ("JNT-003", "Joint de culasse moteur D4",         "Étanchéité",    "pièce", "C1-E2-N1",   4,  1, 120.00, "Elring Maroc",           "JC-D4"),
            ("JNT-004", "Joint papier carter",                "Étanchéité",    "pièce", "C1-E2-N2",  16,  4,   8.00, "Elring Maroc",           "JP-CTR"),
            ("ELE-001", "Alternateur 24V 80A",                "Électricité",   "pièce", "D1-E1-N1",   3,  1, 380.00, "Bosch Maroc",            "AL24-80"),
            ("ELE-002", "Démarreur 24V 4kW",                  "Électricité",   "pièce", "D1-E1-N2",   2,  1, 450.00, "Bosch Maroc",            "DEM-24-4K"),
            ("ELE-003", "Batterie 12V 100Ah",                 "Électricité",   "pièce", "D1-E2-N1",   6,  2, 620.00, "Exide Maroc",            "ET-12-100"),
            ("ELE-004", "Relais 24V 40A",                     "Électricité",   "pièce", "D1-E2-N2",  20,  5,  12.50, "Hella Maroc",            "REL-24-40"),
            ("ELE-005", "Fusible lame 30A (boîte 10)",        "Électricité",   "boîte", "D1-E3-N1",  15,  3,   6.00, "Hella Maroc",            "FUS-30A"),
            ("ELE-006", "Capteur température moteur",         "Électricité",   "pièce", "D2-E1-N1",   5,  1,  85.00, "Bosch Maroc",            "CTS-001"),
            ("ELE-007", "Câble de batterie 70mm² (m)",        "Électricité",   "mètre", "D2-E1-N2",  25,  5,  18.00, "Draka Maroc",            "CBL-70"),
            ("HYD-001", "Vérin hydraulique double effet 50T", "Hydraulique",   "pièce", "E1-E1-N1",   2,  1,1850.00, "Bosch Rexroth Maroc",    "VH-50T"),
            ("HYD-002", "Distributeur hydraulique 4/3",       "Hydraulique",   "pièce", "E1-E1-N2",   3,  1, 780.00, "Bosch Rexroth Maroc",    "DH-43"),
            ("HYD-003", "Pompe hydraulique à engrenages",     "Hydraulique",   "pièce", "E1-E2-N1",   2,  1,1200.00, "Parker Maroc",           "PH-GR25"),
            ("HYD-004", "Flexible hydraulique DN12 (m)",      "Hydraulique",   "mètre", "E1-E2-N2",  40, 10,  22.00, "Manuli Maroc",           "FH-DN12"),
            ("HYD-005", "Raccord rapide 1/2 femelle",         "Hydraulique",   "pièce", "E1-E3-N1",  25,  6,  18.50, "Parker Maroc",           "RR-F12"),
            ("VIS-001", "Vis M8x30 inox (boîte 50)",          "Visserie",      "boîte", "F1-E1-N1",  20,  4,  14.00, "Bossard Maroc",          "VM8-30-IN"),
            ("VIS-002", "Vis M10x40 acier 8.8 (boîte 25)",   "Visserie",      "boîte", "F1-E1-N2",  18,  4,  12.50, "Bossard Maroc",          "VM10-40-88"),
            ("VIS-003", "Écrou frein M10 (boîte 50)",         "Visserie",      "boîte", "F1-E2-N1",  22,  5,   8.00, "Bossard Maroc",          "EF-M10"),
            ("VIS-004", "Rondelle élastique M12 (boîte 100)", "Visserie",      "boîte", "F1-E2-N2",  15,  3,   6.50, "Bossard Maroc",          "RE-M12"),
            ("PNE-001", "Pneu 315/80R22.5 chantier",          "Pneumatiques",  "pièce", "G1-E1-N1",   8,  2,2800.00, "Michelin Maroc",         "XZY3-R22"),
            ("PNE-002", "Pneu 12.00R20 tout terrain",         "Pneumatiques",  "pièce", "G1-E1-N2",   6,  2,3200.00, "Bridgestone Maroc",      "M840-R20"),
            ("PNE-003", "Chambre à air 12.00R20",             "Pneumatiques",  "pièce", "G1-E2-N1",  10,  3, 180.00, "Bridgestone Maroc",      "CA-R20"),
            ("FRE-001", "Plaquettes frein avant (kit)",       "Freinage",      "kit",   "H1-E1-N1",  12,  3,  95.00, "Brembo Maroc",           "PF-AV-01"),
            ("FRE-002", "Garniture de frein tambour",         "Freinage",      "pièce", "H1-E1-N2",  16,  4,  55.00, "Brembo Maroc",           "GF-TA-02"),
            ("FRE-003", "Liquide de frein DOT4 (1L)",         "Freinage",      "litre", "H1-E2-N1",  24,  5,  12.00, "Motul Maroc",            "DOT4-1L"),
            ("FRE-004", "Disque de frein avant 320mm",        "Freinage",      "pièce", "H1-E2-N2",   8,  2, 145.00, "Brembo Maroc",           "DF-320"),
            ("SOU-001", "Électrode de soudure E6013 3.2mm",  "Soudage",       "kg",    "I1-E1-N1",  30,  8,  28.00, "Lincoln Electric Maroc", "E6013-32"),
            ("SOU-002", "Fil MIG ER70S-6 0.8mm (5kg)",       "Soudage",       "bobine","I1-E1-N2",  10,  2, 145.00, "Lincoln Electric Maroc", "ER70-08"),
            ("SOU-003", "Disque à tronçonner 230x3mm",        "Soudage",       "pièce", "I1-E2-N1",  60, 15,   4.50, "Würth Maroc",            "DT-230-3"),
            ("SOU-004", "Disque à meuler 125x6mm",            "Soudage",       "pièce", "I1-E2-N2",  80, 20,   3.80, "Würth Maroc",            "DM-125-6"),
            ("NET-001", "Dégraissant industriel (bidon 5L)",  "Nettoyage",     "litre", "J1-E1-N1",  40, 10,  18.00, "Würth Maroc",            "DG-IND-5"),
            ("NET-002", "Chiffons d'essuyage (kg)",           "Nettoyage",     "kg",    "J1-E1-N2",  50, 10,   8.50, "CleanTech Maroc",        "CE-KG"),
            ("NET-003", "Lingette autonettoyante (rouleau)",  "Nettoyage",     "rouleau","J1-E2-N1", 20,  4,  22.00, "CleanTech Maroc",        "LA-RO"),
            ("EPI-001", "Gants nitrile taille L (boîte 100)", "EPI",           "boîte", "K1-E1-N1",  30,  6,  32.00, "Portwest Maroc",         "GN-L-100"),
            ("EPI-002", "Lunettes de protection UV",          "EPI",           "pièce", "K1-E1-N2",  25,  5,  14.50, "Portwest Maroc",         "LP-UV"),
            ("EPI-003", "Masque FFP2 (boîte 10)",             "EPI",           "boîte", "K1-E2-N1",  40,  8,  18.00, "3M Maroc",               "FFP2-10"),
            ("EPI-004", "Bouchons d'oreille (paire)",         "EPI",           "pièce", "K1-E2-N2",  60, 12,   1.80, "Portwest Maroc",         "BO-PA"),
            ("EPI-005", "Casque de chantier classe C",        "EPI",           "pièce", "K1-E3-N1",  15,  3,  38.00, "Portwest Maroc",         "CC-CL3"),
            ("CAP-001", "Courroie de distribution moteur D6", "Moteur",        "pièce", "L1-E1-N1",   4,  1, 220.00, "Dayco Maroc",            "CD-D6"),
            ("CAP-002", "Pompe à eau moteur D4",              "Moteur",        "pièce", "L1-E1-N2",   3,  1, 310.00, "GMB Maroc",              "PE-D4"),
            ("CAP-003", "Thermostat moteur 82 degrés",        "Moteur",        "pièce", "L1-E2-N1",   6,  2,  45.00, "Wahler Maroc",           "TH-82"),
            ("CAP-004", "Injecteur diesel common rail",       "Moteur",        "pièce", "L1-E2-N2",   4,  1, 980.00, "Bosch Maroc",            "INJ-CR"),
            ("CAP-005", "Turbine de suralimentation",         "Moteur",        "pièce", "L1-E3-N1",   2,  1,1450.00, "Garrett Maroc",          "TURBO-G"),
            ("TRA-001", "Embrayage complet 380mm",            "Transmission",  "kit",   "M1-E1-N1",   3,  1, 850.00, "Sachs Maroc",            "EMB-380"),
            ("TRA-002", "Cardan avant gauche",                "Transmission",  "pièce", "M1-E1-N2",   2,  1, 520.00, "GKN Maroc",              "CA-AVG"),
            ("TRA-003", "Demi-arbre de transmission",         "Transmission",  "pièce", "M1-E2-N1",   2,  1, 480.00, "GKN Maroc",              "DAT-01"),
            ("CLI-001", "Compresseur climatisation",          "Climatisation", "pièce", "N1-E1-N1",   2,  1,1100.00, "Denso Maroc",            "COMP-CLI"),
            ("CLI-002", "Filtre déshydrateur clim",           "Climatisation", "pièce", "N1-E1-N2",   6,  2,  65.00, "Denso Maroc",            "FD-CLI"),
            ("CLI-003", "Gaz réfrigérant R134a (kg)",         "Climatisation", "kg",    "N1-E2-N1",  20,  5,  35.00, "Climalife Maroc",        "R134A"),
            ("ELE-008", "Lampe LED travail 48V 100W",         "Électricité",   "pièce", "D2-E2-N1",   8,  2, 185.00, "Philips Maroc",          "LED-48-100"),
            ("ELE-009", "Sonde lambda universelle",           "Électricité",   "pièce", "D2-E2-N2",   4,  1,  95.00, "Bosch Maroc",            "SL-UNI"),
            ("HYD-006", "Joints kit vérin 50T",               "Hydraulique",   "kit",   "E2-E1-N1",   5,  2, 180.00, "Parker Maroc",           "JK-V50"),
            ("HYD-007", "Manomètre 0-400 bar glycérine",      "Hydraulique",   "pièce", "E2-E1-N2",   6,  2,  75.00, "Wika Maroc",             "MG-400"),
            ("MAT-001", "Colle époxy bicomposant (250ml)",    "Matériaux",     "pièce", "O1-E1-N1",  12,  3,  28.00, "Loctite Maroc",          "EP-250"),
            ("MAT-002", "Frein filet fort (50ml)",            "Matériaux",     "pièce", "O1-E1-N2",  10,  2,  22.00, "Loctite Maroc",          "FF-FORT"),
            ("MAT-003", "Joint liquide gris (100ml)",         "Matériaux",     "pièce", "O1-E2-N1",  14,  3,  18.50, "Loctite Maroc",          "JL-GRIS"),
            ("MAT-004", "Téflon plomberie (20m)",             "Matériaux",     "rouleau","O1-E2-N2",  30,  6,   4.00, "Saint-Gobain Maroc",     "TEF-20"),
            ("ROU-005", "Roulement à aiguilles HK 2520",      "Roulements",    "pièce", "B2-E3-N1",  12,  3,  38.00, "INA Maroc",              "HK-2520"),
            ("SAN-001", "Tuyau pneumatique PA12 8mm (m)",     "Pneumatique",   "mètre", "P1-E1-N1",  50, 10,   3.20, "Festo Maroc",            "PA12-8"),
            ("SAN-002", "Raccord pneumatique push-in 8mm",    "Pneumatique",   "pièce", "P1-E1-N2",  40,  8,   4.80, "Festo Maroc",            "RP-8"),
            ("SAN-003", "Électrovanne pneumatique 5/2 24VDC", "Pneumatique",   "pièce", "P1-E2-N1",   6,  2, 145.00, "Festo Maroc",            "EV-52-24"),
            ("SAN-004", "Vérin pneumatique double effet 50mm","Pneumatique",   "pièce", "P1-E2-N2",   4,  1, 280.00, "Festo Maroc",            "VP-DE-50"),
            ("ELE-010", "Bouton poussoir NO 22mm vert",       "Électricité",   "pièce", "D3-E1-N1",  20,  4,   8.50, "Schneider Maroc",        "BP-NO-V"),
            ("ELE-011", "Contacteur 25A 24VDC",               "Électricité",   "pièce", "D3-E1-N2",   8,  2,  95.00, "Schneider Maroc",        "CT-25-24"),
            ("ELE-012", "Disjoncteur magnétothermique 32A",   "Électricité",   "pièce", "D3-E2-N1",   6,  2, 120.00, "Schneider Maroc",        "DM-32"),
            ("ELE-013", "Pressostat 4-12 bar réglable",       "Électricité",   "pièce", "D3-E2-N2",   5,  1,  68.00, "Schneider Maroc",        "PS-412"),
            ("FIL-006", "Cartouche filtrante air comprimé G1","Filtration",    "pièce", "A1-E3-N1",   8,  2,  42.00, "Mann Maroc",             "CFA-G1"),
            ("MAT-005", "Peinture époxy sol gris (bidon 5L)", "Matériaux",     "litre", "O2-E1-N1",  15,  4,  55.00, "Seigneurie Maroc",       "PE-SOL-GR"),
            ("CAP-006", "Bougie de préchauffage (unité)",     "Moteur",        "pièce", "L2-E1-N1",  24,  6,  28.00, "Bosch Maroc",            "BP-UNI"),
            ("CAP-007", "Soupape d'admission moteur",         "Moteur",        "pièce", "L2-E1-N2",  12,  3,  65.00, "Mahle Maroc",            "SA-ADM"),
            ("COU-004", "Chaîne de distribution 106 maillons","Transmission",  "pièce", "B1-E2-N1",   4,  1, 190.00, "Iwis Maroc",             "CD-106"),
            ("VIS-005", "Goujon M12x100 inox (unité)",        "Visserie",      "pièce", "F1-E3-N1",  40,  8,   3.20, "Bossard Maroc",          "GJ-M12-IN"),
            ("EPI-006", "Harnais antichute 2 points",         "EPI",           "pièce", "K2-E1-N1",   5,  1, 320.00, "Portwest Maroc",         "HA-2P"),
            ("NET-004", "Savon atelier (bidon 5L)",           "Nettoyage",     "litre", "J1-E3-N1",  20,  5,  14.00, "CleanTech Maroc",        "SA-5L"),
            ("HYD-008", "Accumulateur hydraulique 1L 200bar", "Hydraulique",   "pièce", "E2-E2-N1",   3,  1, 650.00, "Hydac Maroc",            "ACC-1L"),
        ]

        # ──────────────────────────────────────────────
        # Création des pièces
        # ──────────────────────────────────────────────
        self.stdout.write("  → Création des pièces…")
        pieces_created = 0
        pieces_objects = {}

        for row in PIECES_DATA:
            ref, desig, cat, unite, empl, qte, seuil, prix, fourn, refCons = row
            piece, created = Piece.objects.get_or_create(
                reference=ref,
                defaults=dict(
                    designation           = desig,
                    categorie             = cat,
                    unite                 = unite,
                    emplacement           = empl,
                    quantiteStock         = decimal.Decimal(str(qte)),
                    seuilMinimum          = decimal.Decimal(str(seuil)),
                    prixUnitaire          = decimal.Decimal(str(prix)),
                    fournisseur           = fourn,
                    referenceConstructeur = refCons,
                    estActif              = True,
                ),
            )
            pieces_objects[ref] = piece
            if created:
                pieces_created += 1

        self.stdout.write(f"     {pieces_created} pièces créées, {len(PIECES_DATA) - pieces_created} déjà existantes.")

        # ──────────────────────────────────────────────
        # Création des 100 mouvements de stock
        # ──────────────────────────────────────────────
        self.stdout.write("  → Création des mouvements de stock…")

        now  = timezone.now()
        base = now - timedelta(days=180)

        OT_LIST = [
            "OT-2024-001", "OT-2024-002", "OT-2024-003", "OT-2024-004",
            "OT-2024-005", "OT-2025-001", "OT-2025-002", "OT-2025-003",
            "OT-2025-004", "OT-2025-010", None, None,
        ]

        # (ref_piece, type_mouvement, quantite_signée, id_ot, commentaire)
        MOUVEMENTS_DATA = [
            ("FIL-001", "entree",      24, "OT-2024-001", "Réception commande fournisseur"),
            ("FIL-001", "sortie",       3, "OT-2024-002", "Remplacement filtre engin E-04"),
            ("FIL-001", "ajustement",   3, None,          "Correction inventaire physique"),
            ("FIL-002", "entree",      12, "OT-2024-001", "Réception commande fournisseur"),
            ("FIL-002", "sortie",       2, "OT-2024-003", "Maintenance préventive"),
            ("FIL-003", "entree",      18, "OT-2024-001", "Réception commande fournisseur"),
            ("FIL-003", "sortie",       4, "OT-2024-004", "Remplacement filtre gasoil"),
            ("FIL-004", "entree",       8, "OT-2025-001", "Réception commande fournisseur"),
            ("FIL-004", "sortie",       1, "OT-2025-002", "Maintenance presse hydraulique"),
            ("FIL-005", "entree",      10, "OT-2025-001", "Réception commande fournisseur"),
            ("LUB-001", "entree",     200, "OT-2024-002", "Livraison mensuelle TotalEnergies"),
            ("LUB-001", "sortie",      40, "OT-2024-003", "Vidange moteur engins lot A"),
            ("LUB-001", "sortie",      20, "OT-2025-003", "Vidange moteur engins lot B"),
            ("LUB-001", "ajustement",  -5, None,          "Écart constaté inventaire"),
            ("LUB-002", "entree",     150, "OT-2024-002", "Livraison mensuelle TotalEnergies"),
            ("LUB-002", "sortie",      35, "OT-2025-001", "Appoint centrale hydraulique"),
            ("LUB-003", "entree",      50, "OT-2024-004", "Réception commande Castrol"),
            ("LUB-003", "sortie",       8, "OT-2025-004", "Graissage paliers convoyeur"),
            ("LUB-004", "entree",      60, "OT-2024-004", "Réception commande fournisseur"),
            ("LUB-004", "sortie",      12, "OT-2025-002", "Vidange boîte pont engin B2"),
            ("LUB-005", "entree",     100, "OT-2024-003", "Réception commande Cooltech"),
            ("LUB-005", "sortie",      20, "OT-2025-003", "Appoint radiateur lot C"),
            ("COU-001", "entree",       6, "OT-2024-005", "Réception commande Gates"),
            ("COU-001", "sortie",       1, "OT-2025-010", "Remplacement courroie compresseur"),
            ("COU-002", "entree",       4, "OT-2024-005", "Réception commande Gates"),
            ("COU-003", "entree",       5, "OT-2024-005", "Réception commande Gates"),
            ("ROU-001", "entree",      20, "OT-2024-003", "Réception commande SKF"),
            ("ROU-001", "sortie",       4, "OT-2025-001", "Remplacement roulements moteur"),
            ("ROU-002", "entree",      15, "OT-2024-003", "Réception commande SKF"),
            ("ROU-002", "sortie",       2, "OT-2025-004", "Remplacement roulements pompe"),
            ("ROU-003", "entree",      10, "OT-2025-002", "Réception commande SKF"),
            ("ROU-004", "entree",       8, "OT-2025-002", "Réception commande FAG"),
            ("JNT-001", "entree",      50, "OT-2024-004", "Réception commande Freudenberg"),
            ("JNT-001", "sortie",      12, "OT-2025-010", "Remplacement joints arbres"),
            ("JNT-002", "entree",     100, "OT-2024-004", "Réception commande Freudenberg"),
            ("JNT-002", "sortie",      30, "OT-2025-003", "Révision circuits hydrauliques"),
            ("JNT-003", "entree",       4, "OT-2025-001", "Réception commande Elring"),
            ("JNT-004", "entree",      20, "OT-2024-005", "Réception commande Elring"),
            ("JNT-004", "sortie",       4, "OT-2025-002", "Remplacement joint carter"),
            ("ELE-001", "entree",       3, "OT-2024-001", "Réception commande Bosch"),
            ("ELE-002", "entree",       2, "OT-2024-001", "Réception commande Bosch"),
            ("ELE-003", "entree",       6, "OT-2024-002", "Réception commande Exide"),
            ("ELE-003", "sortie",       2, "OT-2025-010", "Remplacement batteries véhicule"),
            ("ELE-004", "entree",      30, "OT-2024-002", "Réception commande Hella"),
            ("ELE-004", "sortie",       8, "OT-2025-001", "Remplacement relais tableau bord"),
            ("ELE-005", "entree",      20, "OT-2024-003", "Réception commande Hella"),
            ("ELE-005", "sortie",       3, "OT-2025-004", "Remplacement fusibles tableau"),
            ("ELE-006", "entree",       5, "OT-2025-002", "Réception commande Bosch"),
            ("ELE-007", "entree",      30, "OT-2024-003", "Réception commande Draka"),
            ("ELE-007", "sortie",       5, "OT-2025-003", "Câblage armoire électrique"),
            ("HYD-001", "entree",       2, "OT-2024-004", "Réception commande Rexroth"),
            ("HYD-002", "entree",       3, "OT-2024-004", "Réception commande Rexroth"),
            ("HYD-003", "entree",       2, "OT-2025-001", "Réception commande Parker"),
            ("HYD-004", "entree",      60, "OT-2024-002", "Réception commande Manuli"),
            ("HYD-004", "sortie",      15, "OT-2025-002", "Remplacement flexibles presse"),
            ("HYD-005", "entree",      30, "OT-2024-003", "Réception commande Parker"),
            ("HYD-005", "sortie",       5, "OT-2025-001", "Raccordement circuit retour"),
            ("VIS-001", "entree",      25, "OT-2024-005", "Réception commande Bossard"),
            ("VIS-001", "sortie",       4, "OT-2025-010", "Fixation capot moteur"),
            ("VIS-002", "entree",      20, "OT-2024-005", "Réception commande Bossard"),
            ("VIS-002", "sortie",       3, "OT-2025-004", "Fixation support châssis"),
            ("VIS-003", "entree",      30, "OT-2024-005", "Réception commande Bossard"),
            ("VIS-004", "entree",      20, "OT-2024-005", "Réception commande Bossard"),
            ("PNE-001", "entree",       8, "OT-2024-001", "Réception commande Michelin"),
            ("PNE-001", "sortie",       2, "OT-2025-003", "Remplacement pneus engin T-03"),
            ("PNE-002", "entree",       6, "OT-2024-001", "Réception commande Bridgestone"),
            ("PNE-003", "entree",      10, "OT-2024-002", "Réception commande Bridgestone"),
            ("FRE-001", "entree",      12, "OT-2024-003", "Réception commande Brembo"),
            ("FRE-001", "sortie",       4, "OT-2025-010", "Remplacement plaquettes engin F1"),
            ("FRE-002", "entree",      20, "OT-2024-003", "Réception commande Brembo"),
            ("FRE-002", "sortie",       4, "OT-2025-001", "Remplacement garnitures tambour"),
            ("FRE-003", "entree",      30, "OT-2024-003", "Réception commande Motul"),
            ("FRE-004", "entree",       8, "OT-2025-002", "Réception commande Brembo"),
            ("SOU-001", "entree",      50, "OT-2024-004", "Réception commande Lincoln"),
            ("SOU-001", "sortie",      12, "OT-2025-003", "Soudure châssis remorque"),
            ("SOU-002", "entree",      12, "OT-2024-004", "Réception commande Lincoln"),
            ("SOU-002", "sortie",       2, "OT-2025-004", "Soudure MIG structure"),
            ("SOU-003", "entree",     100, "OT-2024-005", "Réception commande Würth"),
            ("SOU-003", "sortie",      30, "OT-2025-010", "Découpe pièces atelier"),
            ("SOU-004", "entree",     120, "OT-2024-005", "Réception commande Würth"),
            ("SOU-004", "sortie",      40, "OT-2025-001", "Meulage soudures atelier"),
            ("NET-001", "entree",      50, "OT-2024-002", "Réception commande Würth"),
            ("NET-001", "sortie",      10, "OT-2025-002", "Nettoyage moteurs révision"),
            ("EPI-001", "entree",      40, "OT-2024-004", "Réception commande Portwest"),
            ("EPI-001", "sortie",      10, "OT-2025-003", "Distribution EPI équipe matin"),
            ("EPI-002", "entree",      30, "OT-2024-004", "Réception commande Portwest"),
            ("EPI-003", "entree",      50, "OT-2024-004", "Réception commande 3M"),
            ("EPI-003", "sortie",       8, "OT-2025-004", "Distribution masques équipe nuit"),
            ("EPI-005", "entree",      15, "OT-2024-003", "Réception commande Portwest"),
            ("CAP-001", "entree",       4, "OT-2025-001", "Réception commande Dayco"),
            ("CAP-002", "entree",       3, "OT-2025-001", "Réception commande GMB"),
            ("CAP-003", "entree",       6, "OT-2025-002", "Réception commande Wahler"),
            ("CAP-003", "sortie",       1, "OT-2025-010", "Remplacement thermostat engin A1"),
            ("CAP-004", "entree",       4, "OT-2025-002", "Réception commande Bosch"),
            ("TRA-001", "entree",       3, "OT-2024-005", "Réception commande Sachs"),
            ("CLI-001", "entree",       2, "OT-2025-003", "Réception commande Denso"),
            ("CLI-002", "entree",       6, "OT-2025-003", "Réception commande Denso"),
            ("CLI-003", "entree",      20, "OT-2025-003", "Réception commande Climalife"),
            ("CLI-003", "sortie",       5, "OT-2025-004", "Recharge climatisation cab"),
            ("MAT-001", "entree",      12, "OT-2024-002", "Réception commande Loctite"),
            ("MAT-002", "entree",      10, "OT-2024-002", "Réception commande Loctite"),
        ]

        mouvements_created = 0
        for i, row in enumerate(MOUVEMENTS_DATA):
            ref, type_mvt, qte_raw, id_ot, commentaire = row
            piece = pieces_objects.get(ref)
            if not piece:
                self.stdout.write(self.style.WARNING(f"  ⚠ Pièce {ref} introuvable, ignorée."))
                continue

            qte         = decimal.Decimal(str(abs(qte_raw)))
            stock_avant = piece.quantiteStock

            if type_mvt == 'entree':
                stock_apres = stock_avant + qte
            elif type_mvt == 'sortie':
                stock_apres = max(stock_avant - qte, decimal.Decimal('0'))
            else:  # ajustement (qte_raw peut être négatif)
                stock_apres = stock_avant + decimal.Decimal(str(qte_raw))
                qte = abs(decimal.Decimal(str(qte_raw)))

            date_mvt = base + timedelta(days=random.randint(0, 170))

            MouvementStock.objects.create(
                idPiece                 = piece,
                typeMouvement           = type_mvt,
                quantite                = qte,
                stockAvant              = stock_avant,
                stockApres              = stock_apres,
                idOrdreTravail          = id_ot,
                idUtilisateurMagasinier = mag,
                idUtilisateurTechnicien = tec if type_mvt == 'sortie' else None,
                dateHeure               = date_mvt,
                commentaire             = commentaire,
            )

            # Mise à jour du stock et de la date de dernière entrée
            update_fields = ['quantiteStock']
            piece.quantiteStock = stock_apres
            if type_mvt == 'entree':
                piece.dateDerniereEntree = date_mvt
                update_fields.append('dateDerniereEntree')
            piece.save(update_fields=update_fields)

            mouvements_created += 1

        self.stdout.write(f"     {mouvements_created} mouvements créés.")
        self.stdout.write(self.style.SUCCESS('Seed terminé avec succès !'))