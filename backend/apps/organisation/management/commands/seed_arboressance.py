from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Seed de données de test pour les équipes'

    def handle(self, *args, **kwargs):
        from apps.organisation.models import Societe, Site, Secteur, Unite

        # ── 2 Sociétés ────────────────────────────────────────────────
        societes_data = [
            {"code": "ALPHA", "raisonSociale": "Alpha Industries SARL"},
            {"code": "BETA",  "raisonSociale": "Beta Manufacturing SA"},
        ]
        societes = []
        for s in societes_data:
            obj, _ = Societe.objects.get_or_create(code=s["code"], defaults={"raisonSociale": s["raisonSociale"]})
            societes.append(obj)
            self.stdout.write(f"  ✔ Société : {obj}")

        # ── 6 Sites (3 par société) ───────────────────────────────────
        sites_data = {
            "ALPHA": [
                {"code": "CAS", "libelle": "Casablanca",  "ville": "Casablanca"},
                {"code": "RBA", "libelle": "Rabat",        "ville": "Rabat"},
                {"code": "TNG", "libelle": "Tanger",       "ville": "Tanger"},
            ],
            "BETA": [
                {"code": "FES", "libelle": "Fès",          "ville": "Fès"},
                {"code": "MRK", "libelle": "Marrakech",    "ville": "Marrakech"},
                {"code": "AGD", "libelle": "Agadir",       "ville": "Agadir"},
            ],
        }
        sites = []
        for societe in societes:
            for s in sites_data[societe.code]:
                obj, _ = Site.objects.get_or_create(
                    societe=societe, code=s["code"],
                    defaults={"libelle": s["libelle"], "ville": s["ville"]}
                )
                sites.append(obj)
                self.stdout.write(f"    ✔ Site : {obj}")

        # ── 12 Secteurs (2 par site) ──────────────────────────────────
        secteurs_templates = [
            {"code": "PROD", "libelle": "Production"},
            {"code": "MAINT","libelle": "Maintenance"},
        ]
        secteurs = []
        for site in sites:
            for s in secteurs_templates:
                obj, _ = Secteur.objects.get_or_create(
                    site=site, code=s["code"],
                    defaults={"libelle": s["libelle"]}
                )
                secteurs.append(obj)
                self.stdout.write(f"      ✔ Secteur : {obj}")

        # ── 30 Unités (entre 2 et 3 par secteur) ─────────────────────
        unites_par_secteur = {
            "PROD": [
                {"code": "LIG1", "libelle": "Ligne 1",         "estProductive": True},
                {"code": "LIG2", "libelle": "Ligne 2",         "estProductive": True},
                {"code": "CTRL", "libelle": "Contrôle qualité","estProductive": False},
            ],
            "MAINT": [
                {"code": "ELEC", "libelle": "Électrique",      "estProductive": False},
                {"code": "MECA", "libelle": "Mécanique",       "estProductive": False},
            ],
        }
        for secteur in secteurs:
            for u in unites_par_secteur[secteur.code]:
                obj, _ = Unite.objects.get_or_create(
                    secteur=secteur, code=u["code"],
                    defaults={"libelle": u["libelle"], "estProductive": u["estProductive"]}
                )
                self.stdout.write(f"        ✔ Unité : {obj}")

        # ── Récap ─────────────────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write(f"  Sociétés : {Societe.objects.count()}")
        self.stdout.write(f"  Sites    : {Site.objects.count()}")
        self.stdout.write(f"  Secteurs : {Secteur.objects.count()}")
        self.stdout.write(f"  Unités   : {Unite.objects.count()}")