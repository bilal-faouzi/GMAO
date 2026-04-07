
# apps/actifs/management/commands/seed_actifs.py

from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Remplit la base avec des données de test pour les actifs'

    def handle(self, *args, **kwargs):
        """
        Seed script pour l'application actifs.
        ~100 actifs avec hiérarchie profonde (4 niveaux), historiques, indisponibilités, remplacements.
        """
        from django.utils import timezone
        from datetime import date, timedelta
        from apps.actifs.models import Actif, HistoriqueStatut, Indisponibilite, Remplacement
        from apps.organisation.models import Site, Unite
        from apps.securite.models import Utilisateur

        # ──────────────────────────────────────────────
        # 0. Prérequis FK
        # ──────────────────────────────────────────────
        sites  = list(Site.objects.all()[:3])
        unites = list(Unite.objects.all()[:3])
        users  = list(Utilisateur.objects.all()[:3])

        def s(i):   return sites[i % len(sites)]
        def u(i):   return unites[i % len(unites)]
        def usr(i): return users[i % len(users)] if users else None

        now    = timezone.now()
        actifs = {}   # code → instance


        def make_actif(code, libelle, description, type_, statut, site, unite,
                       acquisition, valeur, fabricant, modele, num_serie,
                       parent=None, est_actif=True):
            obj, created = Actif.objects.get_or_create(
                code=code,
                defaults=dict(
                    libelle=libelle, description=description,
                    type=type_, statut=statut,
                    idSite=site, idUnite=unite,
                    dateAcquisition=acquisition, valeur=valeur,
                    fabricant=fabricant, modele=modele, numSerie=num_serie,
                    idParent=parent, estActif=est_actif,
                )
            )
            actifs[code] = obj
            # compute depth for display
            d, p = 0, obj
            while p.idParent:
                p = p.idParent
                d += 1
            indent = "  " * d + ("└─ " if d else "")
            print(f"{'✅' if created else '⚠️ '} {indent}{obj}")
            return obj


        # ══════════════════════════════════════════════════════════════════════
        # NIVEAU 1 — 10 actifs racines
        # ══════════════════════════════════════════════════════════════════════
        print("\n── Niveau 1 : Actifs racines ──")

        make_actif("GE-001","Groupe électrogène 1000 kVA","GE principal site A","equipement","actif",
            s(0),u(0),date(2018,4,10),180000,"Caterpillar","C32","CAT-2018-GE-001")
        make_actif("SP-001","Station de pompage principale","Pompage eau process","infrastructure","actif",
            s(0),u(1),date(2016,9,1),320000,"KSB","Movitec","KSB-2016-SP-001")
        make_actif("HT-001","Réseau haute tension 20 kV","Distribution HT bâtiment A","infrastructure","actif",
            s(0),u(0),date(2012,3,20),500000,"Schneider Electric","HVX","SE-2012-HT-001")
        make_actif("LP-001","Ligne de production n°1","Ligne assemblage produit X","equipement","actif",
            s(1),u(1),date(2019,6,15),750000,"Siemens","S7-1500","SIE-2019-LP-001")
        make_actif("PV-001","Parc véhicules légers","Flotte VL transport personnel","vehicule","actif",
            s(1),u(2),date(2020,1,5),0,"Divers","Divers","PV-2020-001")
        make_actif("TAR-001","Tour aéroréfrigérante","Refroidissement circuit eau","equipement","actif",
            s(0),u(1),date(2017,7,22),95000,"Baltimore Aircoil","VXT","BAC-2017-TAR-001")
        make_actif("CTA-001","Centrale traitement air bâtiment B","CTA double flux","equipement","en_maintenance",
            s(1),u(0),date(2021,2,10),65000,"Carrier","AHU-50","CAR-2021-CTA-001")
        make_actif("INC-001","Réseau sprinkler incendie","Protection incendie niveau 1","infrastructure","actif",
            s(0),u(2),date(2014,11,3),140000,"Tyco","Sprinkler Pro","TYC-2014-INC-001")
        make_actif("PR-001","Pont roulant 10T atelier","Levage pièces lourdes","equipement","actif",
            s(1),u(1),date(2015,5,18),78000,"Demag","EKKE 10","DEM-2015-PR-001")
        make_actif("GF-001","Groupe de froid 500 kW","Réfrigération chambre froide","equipement","en_panne",
            s(2),u(2),date(2013,8,30),110000,"Daikin","EWAD550","DAI-2013-GF-001")


        # ══════════════════════════════════════════════════════════════════════
        # NIVEAU 2 — sous-systèmes
        # ══════════════════════════════════════════════════════════════════════
        print("\n── Niveau 2 : Sous-systèmes ──")

        # GE-001
        make_actif("GE-001-MOT","Moteur diesel GE 1000 kVA","Moteur C32 principal","equipement","actif",
            s(0),u(0),date(2018,4,10),70000,"Caterpillar","C32 Engine","CAT-ENG-2018-001",parent=actifs["GE-001"])
        make_actif("GE-001-ALT","Alternateur GE 1000 kVA","Alternateur LSA 50","equipement","actif",
            s(0),u(0),date(2018,4,10),45000,"Leroy-Somer","LSA 50","LS-2018-ALT-001",parent=actifs["GE-001"])
        make_actif("GE-001-TAB","Tableau de contrôle GE","Armoire TGBT groupe","equipement","actif",
            s(0),u(0),date(2018,4,10),18000,"Schneider","TGBT-GE","SE-2018-TAB-001",parent=actifs["GE-001"])
        make_actif("GE-001-RES","Réservoir carburant GE","Cuve fioul 3000 L","autre","actif",
            s(0),u(0),date(2018,4,10),8500,"Fuelmaster","FM-3000","FM-2018-RES-001",parent=actifs["GE-001"])

        # SP-001
        make_actif("SP-001-P1","Pompe centrifuge n°1","Pompe principale SP","equipement","actif",
            s(0),u(1),date(2016,9,1),28000,"KSB","Etanorm","KSB-2016-P1-001",parent=actifs["SP-001"])
        make_actif("SP-001-P2","Pompe centrifuge n°2","Pompe de secours SP","equipement","actif",
            s(0),u(1),date(2016,9,1),28000,"KSB","Etanorm","KSB-2016-P2-001",parent=actifs["SP-001"])
        make_actif("SP-001-MAN","Manifold distribution","Collecteur acier inox DN200","infrastructure","actif",
            s(0),u(1),date(2016,9,1),12000,"Inoxline","DN200","INX-2016-MAN-001",parent=actifs["SP-001"])
        make_actif("SP-001-AUTO","Automate station pompage","API Siemens S7-300","equipement","actif",
            s(0),u(1),date(2016,9,1),9500,"Siemens","S7-300","SIE-2016-AUTO-001",parent=actifs["SP-001"])

        # LP-001
        make_actif("LP-001-ROB","Bras robotisé LP1","Robot assemblage 6 axes","equipement","actif",
            s(1),u(1),date(2019,6,15),150000,"KUKA","KR 16","KUK-2019-ROB-001",parent=actifs["LP-001"])
        make_actif("LP-001-CONV","Convoyeur principal LP1","Tapis roulant 50m","equipement","actif",
            s(1),u(1),date(2019,6,15),35000,"Interroll","RollerDrive","INT-2019-CONV-001",parent=actifs["LP-001"])
        make_actif("LP-001-VIS","Système vision LP1","Contrôle qualité caméra","equipement","actif",
            s(1),u(1),date(2019,6,15),22000,"Cognex","In-Sight 9000","COG-2019-VIS-001",parent=actifs["LP-001"])
        make_actif("LP-001-ELEC","Armoire électrique LP1","Coffret distribution LP","equipement","actif",
            s(1),u(1),date(2019,6,15),15000,"Rittal","AX 1000","RIT-2019-ELEC-001",parent=actifs["LP-001"])

        # PV-001
        make_actif("PV-001-V1","Véhicule utilitaire 1","Renault Kangoo utilitaire","vehicule","actif",
            s(1),u(2),date(2021,3,10),22000,"Renault","Kangoo","REN-2021-V1-001",parent=actifs["PV-001"])
        make_actif("PV-001-V2","Véhicule utilitaire 2","Peugeot Partner utilitaire","vehicule","actif",
            s(1),u(2),date(2021,3,10),21500,"Peugeot","Partner","PEU-2021-V2-001",parent=actifs["PV-001"])
        make_actif("PV-001-V3","Camionnette 3T5","Ford Transit 3T5","vehicule","en_panne",
            s(1),u(2),date(2019,7,5),32000,"Ford","Transit","FOR-2019-V3-001",parent=actifs["PV-001"])
        make_actif("PV-001-V4","Véhicule direction","Toyota Corolla direction","vehicule","actif",
            s(1),u(2),date(2022,1,15),28000,"Toyota","Corolla","TOY-2022-V4-001",parent=actifs["PV-001"])

        # GF-001
        make_actif("GF-001-COMP","Compresseur froid","Compresseur scroll 100 kW","equipement","en_panne",
            s(2),u(2),date(2013,8,30),35000,"Copeland","ZR144","COP-2013-COMP-001",parent=actifs["GF-001"])
        make_actif("GF-001-EVAP","Évaporateur chambre","Batterie évaporation NH3","equipement","actif",
            s(2),u(2),date(2013,8,30),18000,"Güntner","AGHN","GUN-2013-EVAP-001",parent=actifs["GF-001"])
        make_actif("GF-001-COND","Condenseur aéraulique","Condenseur ventilé 500 kW","equipement","actif",
            s(2),u(2),date(2013,8,30),22000,"Güntner","AGVN","GUN-2013-COND-001",parent=actifs["GF-001"])


        # ══════════════════════════════════════════════════════════════════════
        # NIVEAU 3 — composants
        # ══════════════════════════════════════════════════════════════════════
        print("\n── Niveau 3 : Composants ──")

        # GE-001-MOT
        make_actif("GE-001-MOT-INJ","Rampe injection diesel","Rampe common rail C32","equipement","actif",
            s(0),u(0),date(2018,4,10),4200,"Bosch","CRI3","BSH-2018-INJ-001",parent=actifs["GE-001-MOT"])
        make_actif("GE-001-MOT-TUR","Turbocompresseur","Turbo double volute","equipement","actif",
            s(0),u(0),date(2018,4,10),3800,"BorgWarner","B2G","BWR-2018-TUR-001",parent=actifs["GE-001-MOT"])
        make_actif("GE-001-MOT-RAD","Radiateur refroidissement","Radiateur eau moteur","equipement","actif",
            s(0),u(0),date(2018,4,10),2100,"Modine","TXD","MOD-2018-RAD-001",parent=actifs["GE-001-MOT"])

        # GE-001-TAB
        make_actif("GE-001-TAB-DIS","Disjoncteur principal","Disj. 1600A courbe D","equipement","actif",
            s(0),u(0),date(2018,4,10),1800,"Schneider","Compact NS 1600","SE-2018-DIS-001",parent=actifs["GE-001-TAB"])
        make_actif("GE-001-TAB-IHM","Interface opérateur TGBT","Écran tactile 10 pouces","equipement","actif",
            s(0),u(0),date(2018,4,10),950,"Weintek","MT8103iE","WEI-2018-IHM-001",parent=actifs["GE-001-TAB"])

        # SP-001-P1
        make_actif("SP-001-P1-MOT","Moteur pompe P1","Moteur IE3 11 kW","equipement","actif",
            s(0),u(1),date(2016,9,1),2200,"ABB","M3BP 160","ABB-2016-MOT-001",parent=actifs["SP-001-P1"])
        make_actif("SP-001-P1-VAR","Variateur fréquence P1","VFD 11 kW P1","equipement","actif",
            s(0),u(1),date(2016,9,1),1800,"Danfoss","FC 302","DAN-2016-VAR-001",parent=actifs["SP-001-P1"])
        make_actif("SP-001-P1-CLQ","Clapet anti-retour P1","Clapet DN100 PN16","equipement","actif",
            s(0),u(1),date(2016,9,1),320,"Watts","CVFR","WAT-2016-CLQ-001",parent=actifs["SP-001-P1"])

        # LP-001-ROB
        make_actif("LP-001-ROB-CTRL","Contrôleur robot KR16","KRC4 controller","equipement","actif",
            s(1),u(1),date(2019,6,15),28000,"KUKA","KRC4","KUK-2019-CTRL-001",parent=actifs["LP-001-ROB"])
        make_actif("LP-001-ROB-PINCE","Préhenseur robot","Pince pneumatique 3 doigts","equipement","actif",
            s(1),u(1),date(2019,6,15),4500,"Schunk","PGN-plus","SCH-2019-PINCE-001",parent=actifs["LP-001-ROB"])
        make_actif("LP-001-ROB-SERVO","Servo-moteurs axes 1-3","Servos axes principaux","equipement","actif",
            s(1),u(1),date(2019,6,15),9000,"KUKA","KSD 48A","KUK-2019-SERVO-001",parent=actifs["LP-001-ROB"])

        # LP-001-CONV
        make_actif("LP-001-CONV-MOT","Motoréducteur convoyeur","Motoréducteur 2,2 kW","equipement","actif",
            s(1),u(1),date(2019,6,15),1200,"SEW","SA37 DR63","SEW-2019-MOT-001",parent=actifs["LP-001-CONV"])
        make_actif("LP-001-CONV-COUR","Courroie convoyeur","Courroie PVC alimentaire","equipement","actif",
            s(1),u(1),date(2019,6,15),450,"Habasit","F-1E","HAB-2019-COUR-001",parent=actifs["LP-001-CONV"])

        # GF-001-COMP
        make_actif("GF-001-COMP-HUI","Séparateur huile compresseur","Séparateur cyclonique","equipement","actif",
            s(2),u(2),date(2013,8,30),1800,"Parker","OFS","PAR-2013-HUI-001",parent=actifs["GF-001-COMP"])
        make_actif("GF-001-COMP-PRES","Pressostat HP/BP","Pressostat sécurité","equipement","en_panne",
            s(2),u(2),date(2013,8,30),380,"Danfoss","RT 116","DAN-2013-PRES-001",parent=actifs["GF-001-COMP"])


        # ══════════════════════════════════════════════════════════════════════
        # NIVEAU 4 — pièces / sous-composants
        # ══════════════════════════════════════════════════════════════════════
        print("\n── Niveau 4 : Pièces / sous-composants ──")

        # GE-001-MOT-INJ
        make_actif("GE-001-MOT-INJ-FLT","Filtre carburant fin","Filtre 2 microns diesel","equipement","actif",
            s(0),u(0),date(2018,4,10),85,"Mann+Hummel","WK720/6","MAN-2018-FLT-001",parent=actifs["GE-001-MOT-INJ"])
        make_actif("GE-001-MOT-INJ-CLE","Capteur débit rail","Capteur débit common rail","equipement","actif",
            s(0),u(0),date(2018,4,10),210,"Bosch","0 928 400 726","BSH-2018-CLE-001",parent=actifs["GE-001-MOT-INJ"])

        # GE-001-MOT-TUR
        make_actif("GE-001-MOT-TUR-JNT","Joint turbo entrée","Joint céramique turbine","equipement","actif",
            s(0),u(0),date(2018,4,10),45,"BorgWarner","TJ-B2G-IN","BWR-2018-JNT-001",parent=actifs["GE-001-MOT-TUR"])

        # SP-001-P1-MOT
        make_actif("SP-001-P1-MOT-RLT","Roulements moteur P1","Roulements 6308-2RS","equipement","actif",
            s(0),u(1),date(2016,9,1),48,"SKF","6308-2RS","SKF-2016-RLT-001",parent=actifs["SP-001-P1-MOT"])
        make_actif("SP-001-P1-MOT-SEL","Joints d'étanchéité P1","Kit joints SIC/SIC","equipement","actif",
            s(0),u(1),date(2016,9,1),120,"Burgmann","MG1 G60","BUR-2016-SEL-001",parent=actifs["SP-001-P1-MOT"])

        # LP-001-ROB-CTRL
        make_actif("LP-001-ROB-CTRL-CPU","Module CPU KRC4","Carte CPU principale","equipement","actif",
            s(1),u(1),date(2019,6,15),6200,"KUKA","KPC2","KUK-2019-CPU-001",parent=actifs["LP-001-ROB-CTRL"])
        make_actif("LP-001-ROB-CTRL-BAT","Batterie sauvegarde KRC4","Batterie Li-ion 12V","equipement","actif",
            s(1),u(1),date(2019,6,15),95,"Panasonic","LC-R127R2PG","PAN-2019-BAT-001",parent=actifs["LP-001-ROB-CTRL"])

        # GE-001-TAB-DIS
        make_actif("GE-001-TAB-DIS-BOB","Bobine déclenchement MX","Bobine MX 220V","equipement","actif",
            s(0),u(0),date(2018,4,10),145,"Schneider","LV429385","SE-2018-BOB-001",parent=actifs["GE-001-TAB-DIS"])
        make_actif("GE-001-TAB-DIS-AUX","Contact auxiliaire disj.","Contact OF 1NO+1NF","equipement","actif",
            s(0),u(0),date(2018,4,10),62,"Schneider","LV429687","SE-2018-AUX-001",parent=actifs["GE-001-TAB-DIS"])

        # GF-001-COMP-PRES
        make_actif("GF-001-COMP-PRES-MEM","Membrane pressostat HP","Membrane inox 316L","equipement","en_panne",
            s(2),u(2),date(2013,8,30),65,"Danfoss","MBS 1900","DAN-2013-MEM-001",parent=actifs["GF-001-COMP-PRES"])


        # ══════════════════════════════════════════════════════════════════════
        # Actifs supplémentaires (compléter jusqu'à ~100)
        # ══════════════════════════════════════════════════════════════════════
        print("\n── Actifs supplémentaires ──")

        extra = [
            ("EQ-010","Chaudière vapeur 5T/h","Chaudière fioul 5T/h 10 bar","equipement","actif",0,0,date(2017,5,3),95000,"Bosch Industrial","Universal ZFR","BOS-2017-CH-001"),
            ("EQ-011","Surpresseur eau potable","Surpresseur 4 bar eau","equipement","actif",1,1,date(2020,8,22),14000,"Grundfos","CM5","GRU-2020-SUR-001"),
            ("EQ-012","Pont élévateur 4T","Pont élévateur atelier VL","equipement","actif",1,2,date(2019,3,14),9500,"Ravaglioli","KP540","RAV-2019-PE-001"),
            ("EQ-013","Presse hydraulique 200T","Presse emboutissage 200T","equipement","en_maintenance",1,1,date(2014,10,8),185000,"Schuler","MSD 200","SCH-2014-PRS-001"),
            ("EQ-014","Perceuse radiale","Perceuse radiale Ø50","equipement","actif",1,1,date(2016,6,17),12000,"Knuth","RB 50","KNT-2016-PER-001"),
            ("EQ-015","Tour CNC","Tour à commande numérique","equipement","actif",1,1,date(2021,9,30),145000,"Mazak","Quick Turn 250","MAZ-2021-TUR-001"),
            ("EQ-016","Centre usinage CNC","Centre 3 axes","equipement","actif",1,1,date(2022,4,11),320000,"Haas","VF-3","HAS-2022-CNC-001"),
            ("EQ-017","Soudeuse TIG automatique","Soudage TIG orbital","equipement","actif",0,1,date(2020,11,20),22000,"Lincoln Electric","Aspect 375","LNE-2020-SOD-001"),
            ("EQ-018","Banc de test étanchéité","Test fuite gaz N2","equipement","actif",0,1,date(2018,2,28),18500,"Ateq","F620","ATQ-2018-BTE-001"),
            ("EQ-019","Analyseur vibratoire","Collecteur données vibra.","equipement","actif",0,0,date(2022,7,5),8900,"SKF","Microlog AX","SKF-2022-VIB-001"),
            ("INF-002","Réseau air comprimé","Réseau distribution 7 bar","infrastructure","actif",0,1,date(2013,4,19),75000,"Prevost","CS","PRE-2013-AIR-001"),
            ("INF-003","Réseau eau glacée","Circuit eau 6/12 degrés C","infrastructure","actif",1,0,date(2018,6,30),120000,"Grundfos","NB","GRU-2018-EG-001"),
            ("INF-004","Fibre optique interne","Réseau fibre OM4","infrastructure","actif",0,2,date(2020,1,15),35000,"Corning","InfiniCor","COR-2020-FO-001"),
            ("INF-005","Réseau CCTV","Vidéosurveillance 64 cam.","infrastructure","actif",2,2,date(2021,5,7),48000,"Axis","P3245","AXS-2021-CAM-001"),
            ("VEH-003","Chariot élévateur 5T","Chariot diesel 5T","vehicule","actif",2,2,date(2020,4,22),45000,"Linde","H50D","LND-2020-CH-001"),
            ("VEH-004","Nacelle élévatrice 18m","PEMP articulée 18m","vehicule","actif",1,2,date(2019,12,3),68000,"Haulotte","HA18PX","HAU-2019-NAC-001"),
            ("VEH-005","Tracteur de manœuvre","Tracteur industriel 15T","vehicule","actif",2,1,date(2017,8,14),55000,"Charlatte","T135","CHA-2017-TRAC-001"),
            ("VEH-006","Chariot à mât rétractable","Reach truck 2T5","vehicule","en_maintenance",2,2,date(2018,3,27),38000,"Still","FM-X14","STI-2018-RTR-001"),
            ("EQ-020","Compresseur vis 37 kW","Compresseur vis Atlas Copco","equipement","actif",0,1,date(2021,10,18),28000,"Atlas Copco","GA 37+","AC-2021-COMP-001"),
            ("EQ-021","Sécheur frigorifique","Sécheur air comprimé","equipement","actif",0,1,date(2021,10,18),4500,"Atlas Copco","FD 160","AC-2021-SEC-001"),
            ("EQ-022","Groupe hydraulique","Centrale hydraulique 45 kW","equipement","actif",1,1,date(2016,3,8),32000,"Bosch Rexroth","SYDFEe","BRX-2016-HYD-001"),
            ("EQ-023","Transformateur 1000 kVA","Transfo HT/BT 1000 kVA","equipement","actif",0,0,date(2012,9,12),85000,"ABB","TrafoStar","ABB-2012-TRF-001"),
            ("EQ-024","UPS 100 kVA","Onduleur salle serveurs","equipement","actif",0,2,date(2020,3,25),42000,"Eaton","9PX","EAT-2020-UPS-001"),
            ("EQ-025","Climatisation salle IT","Précision cooling 30 kW","equipement","actif",0,2,date(2020,3,25),18000,"Stulz","CSD062","STU-2020-CLIM-001"),
            ("EQ-026","Rack serveur principal","Rack 42U datacenter","equipement","actif",0,2,date(2022,11,10),3500,"APC","NetShelter SX","APC-2022-RACK-001"),
            ("EQ-027","NAS stockage 100 To","Baie NAS 100 To","equipement","actif",0,2,date(2022,11,10),35000,"Synology","RS3621xs+","SYN-2022-NAS-001"),
            ("EQ-028","Switch réseau cœur","Switch 48 ports 10 GbE","equipement","actif",0,2,date(2022,11,10),12000,"Cisco","Catalyst 9300","CIS-2022-SW-001"),
            ("EQ-029","Firewall périmétrique","Pare-feu NGFW","equipement","actif",0,2,date(2022,11,10),9500,"Fortinet","FG-200E","FOR-2022-FW-001"),
            ("EQ-030","Bascule poids lourds","Pont bascule 80T","equipement","actif",2,0,date(2015,7,6),95000,"Mettler-Toledo","ICS685","MTT-2015-BAS-001"),
            ("EQ-031","Portique de lavage PL","Portique lavage auto PL","equipement","actif",2,0,date(2018,5,14),62000,"WashTec","SoftCare","WTC-2018-LAV-001"),
            ("EQ-032","Groupe électrogène secours","GE secours 250 kVA","equipement","actif",2,0,date(2019,1,20),55000,"FG Wilson","P250","FGW-2019-GES-001"),
            ("EQ-033","Chargeur de batterie","Chargeur 48V 150A","equipement","actif",2,2,date(2021,6,8),2800,"Fronius","Selectiva","FRO-2021-CHG-001"),
            ("EQ-034","Convoyeur aérien","Convoyeur overhead 200 kg","equipement","en_maintenance",1,1,date(2017,9,19),48000,"Jervis B. Webb","EHC","JBW-2017-CONV-001"),
            ("EQ-035","Banc d'essai moteurs","Banc test moteurs élec.","equipement","actif",1,1,date(2016,12,1),78000,"Magtrol","HD-825","MAG-2016-BAE-001"),
            ("EQ-036","Spectromètre émission","Analyse composition alliages","equipement","actif",0,1,date(2020,9,7),95000,"Bruker","Q8 Magellan","BRU-2020-SPE-001"),
            ("EQ-037","Cabine de peinture","Cabine peinture 10x6m","equipement","actif",1,1,date(2015,4,28),130000,"Junair","4000","JUN-2015-CAB-001"),
            ("EQ-038","Four de traitement","Four trempe 1000 degrés C","equipement","actif",1,1,date(2014,8,12),115000,"Nabertherm","N 200/12","NAB-2014-FOU-001"),
            ("EQ-039","Palan électrique 3T","Palan 3T hall B","equipement","actif",1,1,date(2021,2,25),6500,"Pfaff-silberblau","GH3000","PFA-2021-PAL-001"),
            ("EQ-040","Pompe doseuse","Dosage réactifs chimiques","equipement","actif",0,1,date(2019,7,3),1800,"ProMinent","gamma L","PRO-2019-DOS-001"),
            ("EQ-041","Déshuileur","Traitement eaux huileuses","equipement","actif",0,1,date(2017,11,25),22000,"Tramfloc","OF-5000","TRM-2017-DHU-001"),
            ("EQ-042","Station météo","Station météorologique","autre","actif",2,0,date(2022,3,14),4200,"Davis","Vantage Pro 2","DAV-2022-MET-001"),
            ("EQ-043","Groupe moto-ventilateur","GMV extraction 11 kW","equipement","actif",0,0,date(2019,4,9),5800,"Soler & Palau","CHGT/6-630","SAP-2019-GMV-001"),
            ("EQ-044","Centrale d'alarme","Centrale intrusion","equipement","actif",0,2,date(2021,8,30),3500,"Vanderbilt","SPC5350","VDB-2021-ALA-001"),
            ("EQ-045","Contrôle d'accès","Système biométrique 20 points","equipement","actif",0,2,date(2021,8,30),12000,"HID","VertX V1000","HID-2021-ACC-001"),
            ("EQ-046","Osmoseur industriel","Traitement eau déminéralisée","equipement","actif",0,1,date(2018,1,22),28000,"Lenntech","RO-5000","LNT-2018-OSM-001"),
            ("EQ-047","Extracteur de fumées","Captation fumées soudage","equipement","actif",1,1,date(2020,6,15),8500,"Kemper","X-Tract","KEM-2020-EXT-001"),
            ("EQ-048","Tablette de maintenance","Tablette CMMS terrain","equipement","actif",0,0,date(2023,1,10),850,"Panasonic","FZ-G2","PAN-2023-TAB-001"),
            ("EQ-049","Thermographe infrarouge","Caméra thermique","equipement","actif",0,0,date(2022,5,20),6200,"FLIR","E96","FLR-2022-THG-001"),
            ("EQ-050","Testeur d'isolement","Mégohmmètre 5 kV","equipement","actif",0,0,date(2021,3,17),1850,"Megger","MIT525","MEG-2021-ISO-001"),
        ]

        for row in extra:
            code, lib, desc, typ, stat, si, ui, acq, val, fab, mod, num = row
            make_actif(code, lib, desc, typ, stat, s(si), u(ui), acq, val, fab, mod, num)

        print(f"\n📦 Total actifs créés : {len(actifs)}")


        # ══════════════════════════════════════════════════════════════════════
        # HISTORIQUES DE STATUT
        # ══════════════════════════════════════════════════════════════════════
        print("\n── Historiques de statut ──")

        hist_data = [
            ("GE-001",          "en_maintenance", "actif",         "Maintenance préventive 2000h terminée"),
            ("GE-001",          "actif",          "en_maintenance", "Révision programmée 4000h"),
            ("GE-001",          "en_maintenance", "actif",         "Remise en service après révision 4000h"),
            ("GE-001-MOT",      "actif",          "en_panne",      "Fuite huile joint culasse détectée"),
            ("GE-001-MOT",      "en_panne",       "en_maintenance", "Remplacement joint culasse en cours"),
            ("GE-001-MOT",      "en_maintenance", "actif",         "Joint remplacé, test pression OK"),
            ("SP-001-P1",       "actif",          "en_maintenance", "Remplacement garniture mécanique"),
            ("SP-001-P1",       "en_maintenance", "actif",         "Garniture changée, étanchéité vérifiée"),
            ("LP-001-ROB",      "actif",          "en_panne",      "Défaut axe 3 — encoder fault"),
            ("LP-001-ROB",      "en_panne",       "en_maintenance", "Remplacement résolveur axe 3"),
            ("LP-001-ROB",      "en_maintenance", "actif",         "Robot recalibré et opérationnel"),
            ("GF-001",          "actif",          "en_panne",      "Défaut pressostat HP — arrêt sécurité"),
            ("GF-001",          "en_panne",       "en_maintenance", "Diagnostic et commande pièces"),
            ("GF-001-COMP",     "actif",          "en_panne",      "Blocage mécanique compresseur scroll"),
            ("CTA-001",         "actif",          "en_maintenance", "Nettoyage filtres et vérification courroies"),
            ("PV-001-V3",       "actif",          "en_panne",      "Panne boîte de vitesses"),
            ("PV-001-V3",       "en_panne",       "en_maintenance", "Entrée atelier pour réparation BV"),
            ("EQ-013",          "actif",          "en_maintenance", "Maintenance hydraulique annuelle"),
            ("EQ-034",          "actif",          "en_maintenance", "Remplacement chaîne convoyeur aérien"),
            ("VEH-006",         "actif",          "en_maintenance", "Révision 1000h reach truck"),
            ("EQ-032",          "actif",          "en_maintenance", "Test annuel groupe secours"),
            ("EQ-032",          "en_maintenance", "actif",         "Groupe secours validé — remis en service"),
            ("GE-001-TAB",      "actif",          "en_maintenance", "Vérification disjoncteurs et contacteurs"),
            ("GE-001-TAB",      "en_maintenance", "actif",         "Contrôle terminé, tableau opérationnel"),
            ("LP-001-CONV",     "actif",          "en_panne",      "Rupture courroie principale convoyeur"),
            ("LP-001-CONV",     "en_panne",       "en_maintenance", "Remplacement courroie en cours"),
            ("LP-001-CONV",     "en_maintenance", "actif",         "Courroie remplacée, alignement vérifié"),
            ("GF-001-COMP-PRES","actif",          "en_panne",      "Membrane pressostat HP percée"),
            ("EQ-020",          "actif",          "en_maintenance", "Vidange huile compresseur 4000h"),
            ("EQ-020",          "en_maintenance", "actif",         "Vidange effectuée, filtre changé"),
            ("EQ-038",          "actif",          "en_maintenance", "Calibration thermocouple four trempe"),
            ("EQ-038",          "en_maintenance", "actif",         "Calibration effectuée, PV joint"),
        ]

        for code, old, new, motif in hist_data:
            if code in actifs:
                HistoriqueStatut.objects.create(
                    idActif=actifs[code],
                    ancienStatut=old,
                    nouveauStatut=new,
                    motif=motif,
                    modifiePar=usr(0),
                )
                print(f"  ✅ {code}: {old} → {new}")


        # ══════════════════════════════════════════════════════════════════════
        # INDISPONIBILITÉS
        # ══════════════════════════════════════════════════════════════════════
        print("\n── Indisponibilités ──")

        # (code, delta_debut_j, delta_fin_j_ou_None, type, terminee, motif)
        indispo_data = [
            ("GE-001",          180, 178, "planifiee",   True,  "Révision 4000h programmée"),
            ("GE-001",           30,  28, "planifiee",   True,  "Contrôle réglementaire annuel"),
            ("GE-001-MOT",      200, 192, "panne",       True,  "Fuite huile joint culasse"),
            ("SP-001-P1",        90,  88, "maintenance", True,  "Remplacement garniture mécanique"),
            ("SP-001-P1",        15,  14, "maintenance", True,  "Graissage roulements trimestriel"),
            ("LP-001-ROB",       60,  55, "panne",       True,  "Défaut résolveur axe 3"),
            ("LP-001-ROB",        5,  None,"panne",      False, "Fuite huile réducteur axe 1 — diagnostic en cours"),
            ("GF-001",           10,  None,"panne",      False, "Arrêt sécurité pressostat HP"),
            ("GF-001-COMP",      10,  None,"panne",      False, "Blocage mécanique scroll"),
            ("GF-001-COMP-PRES", 10,  None,"panne",      False, "Membrane percée en attente de livraison"),
            ("CTA-001",           3,  None,"maintenance",False, "Nettoyage filtres G4 et F7"),
            ("PV-001-V3",        45,  None,"panne",      False, "Réparation boîte de vitesses en cours"),
            ("EQ-013",            7,   5, "planifiee",   True,  "Maintenance hydraulique annuelle"),
            ("EQ-034",            4,   2, "maintenance", True,  "Remplacement chaîne convoyeur"),
            ("VEH-006",           2,   1, "maintenance", True,  "Révision 1000h"),
            ("EQ-032",            1,  None,"planifiee",  False, "Test groupe secours mensuel"),
            ("INF-001",         400, 399, "panne",       True,  "Court-circuit tableau BT — coupure 6h"),
            ("GE-001-TAB",       50,  49, "maintenance", True,  "Vérification disjoncteurs et contacteurs"),
            ("LP-001-CONV",      20,  19, "panne",       True,  "Rupture courroie principale"),
            ("EQ-020",           14,  13, "planifiee",   True,  "Vidange huile compresseur"),
            ("EQ-038",           30,  27, "planifiee",   True,  "Calibration thermocouple four"),
            ("SP-001-P1-MOT",    25,  24, "maintenance", True,  "Remplacement roulements moteur"),
            ("LP-001-ROB-CTRL",  35,  33, "panne",       True,  "Défaut alimentation CPU KRC4"),
            ("GE-001-MOT-INJ",   45,  43, "maintenance", True,  "Nettoyage injecteurs diesel"),
            ("GF-001-EVAP",      80,  78, "maintenance", True,  "Décongélation et nettoyage batterie"),
            ("EQ-015",            3,   2, "planifiee",   True,  "Remplacement plaquettes tour CNC"),
            ("EQ-016",            2,  None,"maintenance",False, "Calibration géométrique centre usinage"),
            ("EQ-023",          365, 364, "planifiee",   True,  "Maintenance préventive transformateur annuelle"),
            ("EQ-024",           90,  88, "maintenance", True,  "Test batterie UPS 100 kVA"),
            ("PR-001",           12,  11, "maintenance", True,  "Vérification décennale pont roulant"),
        ]

        for code, dd, df, typ, term, motif in indispo_data:
            if code not in actifs:
                continue
            date_debut = now - timedelta(days=dd)
            date_fin   = (now - timedelta(days=df)) if df is not None else None
            Indisponibilite.objects.create(
                idActif=actifs[code],
                dateDebut=date_debut,
                dateFin=date_fin,
                motif=motif,
                type=typ,
                estTerminee=term,
            )
            print(f"  ✅ {code} — {typ} ({'terminée' if term else 'en cours'})")


        # ══════════════════════════════════════════════════════════════════════
        # REMPLACEMENTS
        # ══════════════════════════════════════════════════════════════════════
        print("\n── Remplacements ──")

        remp_data = [
            ("GF-001-COMP", "GF-001-EVAP",  date(2024,1,15),  "Remplacement temporaire pendant réparation compresseur"),
            ("PV-001-V3",   "PV-001-V2",    date(2024,2,10),  "Remplacement VL pendant réparation Transit"),
            ("SP-001-P1",   "SP-001-P2",    date(2023,11,5),  "Bascule sur pompe secours pour maintenance P1"),
            ("LP-001-ROB",  "LP-001-CONV",  date(2023,6,20),  "Déviation production pendant réparation robot"),
            ("GE-001",      "EQ-032",       date(2023,9,12),  "GE secours en relève pendant révision GE principal"),
            ("EQ-013",      "EQ-039",       date(2024,3,1),   "Remplacement temporaire presse par palan"),
            ("VEH-006",     "VEH-003",      date(2024,3,18),  "Reach truck en maintenance — remplacement chariot diesel"),
            ("LP-001-CONV", "LP-001-VIS",   date(2023,12,5),  "Arrêt convoyeur — déviation vers contrôle visuel"),
            ("GF-001",      "TAR-001",      date(2024,1,20),  "Froid groupe en panne — refroidissement via TAR"),
            ("EQ-020",      "INF-002",      date(2024,2,28),  "Compresseur vis en vidange — alimentation réseau existant"),
        ]

        for orig_code, remp_code, dt, motif in remp_data:
            if orig_code not in actifs or remp_code not in actifs:
                print(f"  ⚠️  Ignoré : {orig_code} ou {remp_code} introuvable")
                continue
            Remplacement.objects.create(
                actifOriginal=actifs[orig_code],
                actifRemplacant=actifs[remp_code],
                dateRemplacement=dt,
                motif=motif,
                effectuePar=usr(0),
            )
            print(f"  ✅ {orig_code} → {remp_code}")


        # ══════════════════════════════════════════════════════════════════════
        # RÉSUMÉ
        # ══════════════════════════════════════════════════════════════════════
        total = Actif.objects.count()
        print(f"""
        ╔═══════════════════════════════════════════════╗
        ║            Seed terminé avec succès!          ║  
        ╠═══════════════════════════════════════════════╣
        ║  Actifs en base      : {total:<14}         ║
        ║  Niveaux hiérarchie  : 4                      ║
        ║  Historiques créés   : {len(hist_data):<14}         ║
        ║  Indisponibilités    : {len(indispo_data):<14}         ║
        ║  Remplacements       : {len(remp_data):<14}         ║
        ╚═══════════════════════════════════════════════╝
        """)
        self.stdout.write(self.style.SUCCESS('🎉 Seed terminé !'))
