from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Seed de données de test pour les équipes'

    def handle(self, *args, **kwargs):
        self.stdout.write("── Début du seed ──")

        from apps.securite.models import Utilisateur
        from apps.organisation.models import Site, Specialite, Equipe, EquipeUtilisateur

        # ── Nettoyage complet avant seed ──────────────────────────────
        EquipeUtilisateur.objects.all().delete()
        Equipe.objects.all().delete()
        Specialite.objects.all().delete()
        self.stdout.write("🧹 Tables nettoyées")

        # ── Prérequis ─────────────────────────────────────────────────
        users = list(Utilisateur.objects.all())
        sites = list(Site.objects.all())

        if not sites:
            self.stdout.write(self.style.ERROR("❌ Aucun site trouvé — lance d'abord le seed organisation"))
            return

        self.stdout.write(f"✅ {len(sites)} sites trouvés, {len(users)} utilisateurs trouvés")

        # ── Spécialités ───────────────────────────────────────────────
        specialites_data = [
            ("ELEC",  "Électricité"),
            ("MECA",  "Mécanique"),
            ("INST",  "Instrumentation"),
            ("UTIL",  "Utilités"),
            ("CIVIL", "Génie Civil"),
        ]

        specialites = {}
        for code, libelle in specialites_data:
            sp = Specialite.objects.create(code=code, libelle=libelle, estActif=True)
            specialites[code] = sp
            self.stdout.write(f"   + Spécialité {libelle}")

        # ── Équipes ───────────────────────────────────────────────────
        equipes_data = [
            ("Équipe Électricité A",   "ELEC"),
            ("Équipe Mécanique B",     "MECA"),
            ("Équipe Instrumentation", "INST"),
            ("Équipe Utilités",        "UTIL"),
        ]

        equipes = []
        for site in sites[:2]:
            for libelle, spec_code in equipes_data:
                chef = users[len(equipes) % len(users)] if users else None
                eq = Equipe.objects.create(
                    site=site,
                    libelle=libelle,
                    specialite=specialites[spec_code],
                    chefEquipe=chef,
                    estActif=True,
                )
                equipes.append(eq)
                self.stdout.write(f"   + Équipe '{libelle}' — site {site.code}")

        # ── Membres ───────────────────────────────────────────────────
        roles = ["CHEF", "MEMBRE", "MEMBRE", "REMPLACANT"]
        # Garde une trace des utilisateurs déjà assignés pour éviter les doublons
        utilisateurs_assignes = set()

        for i, eq in enumerate(equipes):
            membres = users[i % len(users): i % len(users) + 4]
            if len(membres) < 4:
                membres += users[:4 - len(membres)]

            for j, user in enumerate(membres):
                if user.pk in utilisateurs_assignes:
                    self.stdout.write(
                        self.style.WARNING(f"      ⚠ {user.nom_utilisateur} déjà assigné, ignoré")
                    )
                    continue

                EquipeUtilisateur.objects.create(
                    equipe=eq,
                    utilisateur=user,
                    niveauRole=roles[j],
                    estActif=True,
                )
                utilisateurs_assignes.add(user.pk)
                self.stdout.write(f"      · {user.nom_utilisateur} → {roles[j]}")

        self.stdout.write(self.style.SUCCESS(f'\n🎉 Seed terminé ! {len(equipes)} équipes créées.'))