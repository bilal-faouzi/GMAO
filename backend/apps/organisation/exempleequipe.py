from apps.securite.models import Utilisateur
from apps.organisation.models import Site, Specialite, Equipe, EquipeUtilisateur

# Récupère quelques utilisateurs existants
users = list(Utilisateur.objects.all())
sites = list(Site.objects.all())

if not sites:
    print("❌ Aucun site trouvé — lance d'abord le seed organisation")
else:
    print(f"✅ {len(sites)} sites trouvés, {len(users)} utilisateurs trouvés")

    # ── Spécialités ──────────────────────────────────────────────
    specialites_data = [
        ("ELEC", "Électricité"),
        ("MECA", "Mécanique"),
        ("INST", "Instrumentation"),
        ("UTIL", "Utilités"),
        ("CIVIL", "Génie Civil"),
    ]

    specialites = {}
    for code, libelle in specialites_data:
        sp, _ = Specialite.objects.get_or_create(
            code=code, defaults={"libelle": libelle, "estActif": True}
        )
        specialites[code] = sp
        print(f"   + Spécialité {libelle}")

    # ── Équipes (2 par site) ──────────────────────────────────────
    equipes_data = [
        ("Équipe Électricité A", "ELEC"),
        ("Équipe Mécanique B",   "MECA"),
        ("Équipe Instrumentation", "INST"),
        ("Équipe Utilités",      "UTIL"),
    ]

    equipes = []
    for site in sites[:2]:  # 2 premiers sites suffisent pour le test
        for libelle, spec_code in equipes_data:
            chef = users[len(equipes) % len(users)] if users else None
            eq, created = Equipe.objects.get_or_create(
                site=site,
                libelle=libelle,
                defaults={
                    "specialite": specialites[spec_code],
                    "chefEquipe": chef,
                    "estActif": True,
                }
            )
            equipes.append(eq)
            print(f"   + Équipe '{libelle}' — site {site.code}")

    # ── Membres ───────────────────────────────────────────────────
    roles = ["CHEF", "MEMBRE", "MEMBRE", "REMPLACANT"]

    for i, eq in enumerate(equipes):
        # 4 membres par équipe, pris en rotation dans la liste users
        membres = users[i % len(users) : i % len(users) + 4]
        if len(membres) < 4:
            membres += users[: 4 - len(membres)]  # complète si besoin

        for j, user in enumerate(membres):
            EquipeUtilisateur.objects.get_or_create(
                equipe=eq,
                utilisateur=user,
                defaults={
                    "niveauRole": roles[j],
                    "estActif": True,
                }
            )
            print(f"      · {user.nom_utilisateur} → {roles[j]}")

    print(f"\n✨ {len(equipes)} équipes créées avec leurs membres.")

# run
# python manage.py shell
# exec(open("apps/organisation/exempleequipe.py", encoding="utf-8").read())