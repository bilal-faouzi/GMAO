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

# ── Nettoyage ─────────────────────────────────────────────────────
Actif.objects.all().delete()
print("🗑️  Anciens actifs supprimés.")

# =======================================================================
# ARBRE 1 : Ligne de production (5 niveaux)
# Ligne → Centrale air → Groupe moto → Moteur/Variateur → Pièces
# =======================================================================

# Niveau 1 — Racine
ligne1 = Actif.objects.create(
    codeActif='LIGNE-01',
    designation='Ligne de production — Atelier principal',
    idUnite=unite, idParent=None,
    type='MECANIQUE', criticite='CRITIQUE', statut='EN_SERVICE',
    fabricant='Interne', modele='LP-2020',
)

# Niveau 2
comp_air = Actif.objects.create(
    codeActif='L01-CA',
    designation='Centrale air comprimé — Ligne 01',
    idUnite=unite, idParent=ligne1,
    type='PNEUMATIQUE', criticite='CRITIQUE', statut='EN_SERVICE',
    fabricant='Atlas Copco', modele='GA55+',
)

# Niveau 3
groupe_moto = Actif.objects.create(
    codeActif='L01-CA-GM',
    designation='Groupe moto-compresseur — Centrale air',
    idUnite=unite, idParent=comp_air,
    type='MECANIQUE', criticite='CRITIQUE', statut='EN_SERVICE',
    fabricant='Atlas Copco', modele='GM55',
)

# Niveau 4
moteur_comp = Actif.objects.create(
    codeActif='L01-CA-GM-MOT',
    designation='Moteur électrique 55kW — Groupe moto-compresseur',
    idUnite=unite, idParent=groupe_moto,
    type='ELECTRIQUE', criticite='ELEVEE', statut='EN_SERVICE',
    fabricant='ABB', modele='M3BP 200MLA',
    numeroSerie='ABB-M3BP-2022-001',
)
variateur = Actif.objects.create(
    codeActif='L01-CA-GM-VSD',
    designation='Variateur de vitesse — Groupe moto-compresseur',
    idUnite=unite, idParent=groupe_moto,
    type='ELECTRIQUE', criticite='CRITIQUE', statut='EN_SERVICE',
    fabricant='Siemens', modele='SINAMICS G120',
    numeroSerie='SIE-G120-2022-001',
)

# Niveau 5
Actif.objects.create(
    codeActif='L01-CA-GM-MOT-RLT',
    designation='Roulement côté accouplement — Moteur 55kW',
    idUnite=unite, idParent=moteur_comp,
    type='MECANIQUE', criticite='MOYENNE', statut='EN_SERVICE',
    fabricant='SKF', modele='6312-2RS1',
)
Actif.objects.create(
    codeActif='L01-CA-GM-MOT-BOB',
    designation='Bobinage stator — Moteur 55kW',
    idUnite=unite, idParent=moteur_comp,
    type='ELECTRIQUE', criticite='ELEVEE', statut='EN_SERVICE',
    fabricant='ABB', modele='Bobinage M3BP',
)
Actif.objects.create(
    codeActif='L01-CA-GM-VSD-CU',
    designation='Control Unit CU240E — Variateur G120',
    idUnite=unite, idParent=variateur,
    type='AUTOMATISME', criticite='CRITIQUE', statut='EN_SERVICE',
    fabricant='Siemens', modele='CU240E-2',
    numeroSerie='SIE-CU240-2022-001',
)

# Niveau 3 bis — circuit de refroidissement
circuit_refroid = Actif.objects.create(
    codeActif='L01-CA-CR',
    designation='Circuit de refroidissement — Centrale air',
    idUnite=unite, idParent=comp_air,
    type='HYDRAULIQUE', criticite='ELEVEE', statut='EN_SERVICE',
    fabricant='Atlas Copco', modele='CR-55',
)

# Niveau 4
echangeur = Actif.objects.create(
    codeActif='L01-CA-CR-ECH',
    designation='Échangeur air/huile — Circuit refroidissement',
    idUnite=unite, idParent=circuit_refroid,
    type='HYDRAULIQUE', criticite='MOYENNE', statut='EN_SERVICE',
    fabricant='Kelvion', modele='GBT-100',
    numeroSerie='KLV-GBT-2021-001',
)

# Niveau 5
Actif.objects.create(
    codeActif='L01-CA-CR-ECH-JNT',
    designation='Joints toriques — Échangeur air/huile',
    idUnite=unite, idParent=echangeur,
    type='MECANIQUE', criticite='FAIBLE', statut='EN_SERVICE',
    fabricant='Parker', modele='OR-70N',
)


# =======================================================================
# ARBRE 2 : Réseau électrique (4 niveaux)
# Poste HTA → Transformateur → TGBT → Disjoncteurs
# =======================================================================

# Niveau 1
poste_hta = Actif.objects.create(
    codeActif='POSTE-HTA',
    designation='Poste de livraison HTA 15kV',
    idUnite=unite, idParent=None,
    type='ELECTRIQUE', criticite='CRITIQUE', statut='EN_SERVICE',
    fabricant='Schneider Electric', modele='SM6',
    numeroSerie='SE-SM6-2018-001',
)

# Niveau 2
transfo = Actif.objects.create(
    codeActif='POSTE-HTA-TR1',
    designation='Transformateur HTA/BT 630kVA',
    idUnite=unite, idParent=poste_hta,
    type='ELECTRIQUE', criticite='CRITIQUE', statut='EN_SERVICE',
    fabricant='Schneider Electric', modele='Trihal 630kVA',
    numeroSerie='SE-TRI-2018-001',
)

# Niveau 3
tgbt = Actif.objects.create(
    codeActif='POSTE-HTA-TR1-TG',
    designation='Tableau général basse tension — TR1',
    idUnite=unite, idParent=transfo,
    type='ELECTRIQUE', criticite='CRITIQUE', statut='EN_SERVICE',
    fabricant='Schneider Electric', modele='Prisma P',
    numeroSerie='SE-PRI-2018-001',
)

# Niveau 4
Actif.objects.create(
    codeActif='POSTE-HTA-TR1-DJ1',
    designation='Disjoncteur départ force — TGBT',
    idUnite=unite, idParent=tgbt,
    type='ELECTRIQUE', criticite='ELEVEE', statut='EN_SERVICE',
    fabricant='Schneider Electric', modele='Compact NSX400',
    numeroSerie='SE-NSX-2018-001',
)
Actif.objects.create(
    codeActif='POSTE-HTA-TR1-DJ2',
    designation='Disjoncteur départ éclairage — TGBT',
    idUnite=unite, idParent=tgbt,
    type='ELECTRIQUE', criticite='FAIBLE', statut='EN_SERVICE',
    fabricant='Schneider Electric', modele='iC60N 32A',
)


# =======================================================================
# ARBRE 3 : Robot de soudure (4 niveaux)
# Robot → Bras → Axe → Réducteur/Encodeur
# =======================================================================

# Niveau 1
robot = Actif.objects.create(
    codeActif='ROB-SW-01',
    designation='Robot de soudure KUKA KR6 R900',
    idUnite=unite, idParent=None,
    type='AUTOMATISME', criticite='CRITIQUE', statut='EN_SERVICE',
    fabricant='KUKA', modele='KR6 R900',
    numeroSerie='KUKA-KR6-2023-001',
)

# Niveau 2
bras = Actif.objects.create(
    codeActif='ROB-SW-01-BRS',
    designation='Bras principal — Robot KR6',
    idUnite=unite, idParent=robot,
    type='MECANIQUE', criticite='CRITIQUE', statut='EN_SERVICE',
    fabricant='KUKA', modele='BRS-KR6',
)

# Niveau 3
axe1 = Actif.objects.create(
    codeActif='ROB-SW-01-BRS-A1',
    designation='Axe 1 rotation base — Bras KR6',
    idUnite=unite, idParent=bras,
    type='MECANIQUE', criticite='ELEVEE', statut='EN_SERVICE',
    fabricant='KUKA', modele='A1-KR6',
)

# Niveau 4
Actif.objects.create(
    codeActif='ROB-SW-01-BRS-RED',
    designation='Réducteur harmonique Axe 1 — Robot KR6',
    idUnite=unite, idParent=axe1,
    type='MECANIQUE', criticite='ELEVEE', statut='EN_SERVICE',
    fabricant='Harmonic Drive', modele='SHF-25',
    numeroSerie='HD-SHF25-2023-001',
)
Actif.objects.create(
    codeActif='ROB-SW-01-BRS-ENC',
    designation='Encodeur absolu Axe 1 — Robot KR6',
    idUnite=unite, idParent=axe1,
    type='AUTOMATISME', criticite='ELEVEE', statut='EN_SERVICE',
    fabricant='Heidenhain', modele='ECI 1119',
    numeroSerie='HH-ECI1119-2023-001',
)


# =======================================================================
# Résumé
# =======================================================================

total   = Actif.objects.count()
racines = Actif.objects.filter(idParent__isnull=True).count()
enfants = Actif.objects.filter(idParent__isnull=False).count()

print(f"✅ {total} actifs créés — {racines} racines + {enfants} sous-composants.")
print()
print("Arborescences créées :")
print("  LIGNE-01    → 5 niveaux (Ligne > Centrale air > Groupe moto > Moteur/Variateur > Pièces)")
print("  POSTE-HTA   → 4 niveaux (Poste HTA > Transformateur > TGBT > Disjoncteurs)")
print("  ROB-SW-01   → 4 niveaux (Robot > Bras > Axe > Réducteur/Encodeur)")

# python manage.py shell
# exec(open("apps/actif/fixtures/actifs_exemple.py", encoding="utf-8").read())