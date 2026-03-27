# apps/actif/fixtures/actifs_exemple.py
# Lancer avec : python manage.py shell < apps/actif/fixtures/actifs_exemple.py

import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.actif.models import Actif
from apps.organisation.models import Unite

unite = Unite.objects.first()
if not unite:
    print("❌ Aucune unité trouvée — crée d'abord une unité.")
    exit()

# ── Nettoyage optionnel ───────────────────────────────────────────
Actif.objects.all().delete()
print("🗑️  Anciens actifs supprimés.")

# ── Actifs racines ────────────────────────────────────────────────
comp001 = Actif.objects.create(
    codeActif='COMP-001', designation='Compresseur Atlas Copco GA55 — Ligne 1',
    idUnite=unite, type='MECANIQUE', criticite='CRITIQUE', statut='EN_SERVICE',
    fabricant='Atlas Copco', modele='GA55', numeroSerie='AC-GA55-2021-001',
)
comp002 = Actif.objects.create(
    codeActif='COMP-002', designation='Compresseur Ingersoll Rand 55kW — Ligne 2',
    idUnite=unite, type='MECANIQUE', criticite='CRITIQUE', statut='EN_MAINTENANCE',
    fabricant='Ingersoll Rand', modele='R55i', numeroSerie='IR-R55-2020-002',
)
pompe_p12 = Actif.objects.create(
    codeActif='POMPE-P12', designation='Pompe centrifuge KSB Etanorm — Ligne 1',
    idUnite=unite, type='MECANIQUE', criticite='CRITIQUE', statut='EN_PANNE',
    fabricant='KSB', modele='Etanorm 32-125', numeroSerie='KSB-ETN-2020-012',
)
pompe_p13 = Actif.objects.create(
    codeActif='POMPE-P13', designation='Pompe doseuse ProMinent — Circuit eau',
    idUnite=unite, type='HYDRAULIQUE', criticite='MOYENNE', statut='EN_SERVICE',
    fabricant='ProMinent', modele='Sigma S2Ba', numeroSerie='PR-S2BA-2022-013',
)
pont03 = Actif.objects.create(
    codeActif='PONT-03', designation='Pont roulant 5T — Atelier principal',
    idUnite=unite, type='MECANIQUE', criticite='ELEVEE', statut='EN_SERVICE',
    fabricant='Verlinde', modele='EUROBLOC VT5', numeroSerie='VT5-2019-003',
)
plc_l1 = Actif.objects.create(
    codeActif='PLC-L1', designation='Automate Siemens S7-300 — Ligne 1',
    idUnite=unite, type='AUTOMATISME', criticite='CRITIQUE', statut='EN_SERVICE',
    fabricant='Siemens', modele='S7-300 CPU 314C', numeroSerie='SIE-S7-2022-001',
)
plc_l2 = Actif.objects.create(
    codeActif='PLC-L2', designation='Automate Schneider M340 — Ligne 2',
    idUnite=unite, type='AUTOMATISME', criticite='CRITIQUE', statut='EN_SERVICE',
    fabricant='Schneider Electric', modele='Modicon M340', numeroSerie='SE-M340-2021-002',
)
conv_l1 = Actif.objects.create(
    codeActif='CONV-L1', designation='Convoyeur à bande — Ligne 1',
    idUnite=unite, type='MECANIQUE', criticite='ELEVEE', statut='EN_SERVICE',
    fabricant='Interroll', modele='RM8400', numeroSerie='INT-RM84-2020-001',
)
chaud_01 = Actif.objects.create(
    codeActif='CHAUD-01', designation='Chaudière vapeur 500kg/h — Salle chauffe',
    idUnite=unite, type='HYDRAULIQUE', criticite='CRITIQUE', statut='EN_SERVICE',
    fabricant='Bosch', modele='Universal ZD 500', numeroSerie='BSH-ZD500-2019-001',
)
transfo_01 = Actif.objects.create(
    codeActif='TRANSFO-01', designation='Transformateur HTA/BT 630kVA',
    idUnite=unite, type='ELECTRIQUE', criticite='CRITIQUE', statut='EN_SERVICE',
    fabricant='Schneider Electric', modele='Trihal 630kVA', numeroSerie='SE-TRI-2018-001',
)

# ── Sous-composants COMP-001 ──────────────────────────────────────
Actif.objects.create(
    codeActif='COMP-001-MOT', designation='Moteur électrique 15kW — COMP-001',
    idUnite=unite, idParent=comp001, type='ELECTRIQUE', criticite='ELEVEE',
    statut='EN_SERVICE', fabricant='ABB', modele='M2BAX 15kW', numeroSerie='ABB-M2BAX-2021-001',
)
Actif.objects.create(
    codeActif='COMP-001-SV', designation='Soupape de sécurité — COMP-001',
    idUnite=unite, idParent=comp001, type='MECANIQUE', criticite='MOYENNE',
    statut='EN_SERVICE', fabricant='Spirax Sarco', modele='SV615', numeroSerie='SS-SV615-2021-001',
)
Actif.objects.create(
    codeActif='COMP-001-VN', designation='Vanne pneumatique entrée — COMP-001',
    idUnite=unite, idParent=comp001, type='PNEUMATIQUE', criticite='MOYENNE',
    statut='EN_SERVICE', fabricant='Festo', modele='VZWF-B-L-M22U', numeroSerie='FESTO-VZ-2021-003',
)

# ── Sous-composants COMP-002 ──────────────────────────────────────
Actif.objects.create(
    codeActif='COMP-002-MOT', designation='Moteur électrique 55kW — COMP-002',
    idUnite=unite, idParent=comp002, type='ELECTRIQUE', criticite='ELEVEE',
    statut='EN_MAINTENANCE', fabricant='Leroy Somer', modele='LSES 200L', numeroSerie='LS-200L-2020-002',
)
Actif.objects.create(
    codeActif='COMP-002-FLT', designation='Filtre à huile — COMP-002',
    idUnite=unite, idParent=comp002, type='MECANIQUE', criticite='FAIBLE',
    statut='EN_MAINTENANCE', fabricant='Ingersoll Rand', modele='OFP-55', numeroSerie=None,
)

# ── Sous-composants POMPE-P12 ─────────────────────────────────────
Actif.objects.create(
    codeActif='POMPE-P12-MOT', designation='Moteur électrique 7.5kW — POMPE-P12',
    idUnite=unite, idParent=pompe_p12, type='ELECTRIQUE', criticite='ELEVEE',
    statut='EN_PANNE', fabricant='Leroy Somer', modele='LSES 132S', numeroSerie='LS-132S-2020-012',
)
Actif.objects.create(
    codeActif='POMPE-P12-RLT', designation='Roulement avant — POMPE-P12',
    idUnite=unite, idParent=pompe_p12, type='MECANIQUE', criticite='FAIBLE',
    statut='EN_PANNE', fabricant='SKF', modele='6205-2RS', numeroSerie=None,
)

# ── Sous-composants PONT-03 ───────────────────────────────────────
Actif.objects.create(
    codeActif='PONT-03-MOT', designation='Moteur translation pont — PONT-03',
    idUnite=unite, idParent=pont03, type='ELECTRIQUE', criticite='ELEVEE',
    statut='EN_SERVICE', fabricant='SEW Eurodrive', modele='DRS71S4', numeroSerie='SEW-DRS71-2019-003',
)
Actif.objects.create(
    codeActif='PONT-03-CMD', designation='Armoire commande pont — PONT-03',
    idUnite=unite, idParent=pont03, type='ELECTRIQUE', criticite='ELEVEE',
    statut='EN_SERVICE', fabricant='Schneider Electric', modele='TeSys D', numeroSerie='SE-TSY-2019-003',
)

# ── Sous-composant CHAUD-01 ───────────────────────────────────────
Actif.objects.create(
    codeActif='CHAUD-01-BRL', designation='Brûleur gaz — CHAUD-01',
    idUnite=unite, idParent=chaud_01, type='MECANIQUE', criticite='CRITIQUE',
    statut='EN_SERVICE', fabricant='Weishaupt', modele='WG20N/1-C', numeroSerie='WP-WG20-2019-001',
)

total = Actif.objects.count()
racines = Actif.objects.filter(idParent__isnull=True).count()
enfants = Actif.objects.filter(idParent__isnull=False).count()
print(f"✅ {total} actifs créés — {racines} racines + {enfants} sous-composants.")


# python manage.py shell
# exec(open("apps/actif/actifexemple.py", encoding="utf-8").read()) 