from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Seed de données de test pour les sous-traitants'

    def handle(self, *args, **kwargs):
        self.stdout.write("── Début du seed ──")

        from apps.soustraitants.models import SousTraitant, SousTraitantSpecialite
        from apps.organisation.models import Specialite
        from apps.securite.models import Utilisateur

        # ──────────────────────────────────────────────
        # Récupérer un utilisateur existant (créateur)
        # ──────────────────────────────────────────────
        createur = Utilisateur.objects.first()
        if not createur:
            self.stdout.write(self.style.ERROR(
                '❌ Aucun utilisateur trouvé. Lance le seed utilisateurs d\'abord.'
            ))
            return

        # ──────────────────────────────────────────────
        # Récupérer les spécialités existantes
        # ──────────────────────────────────────────────
        specialites = list(Specialite.objects.filter(estActif=True)[:4])
        if not specialites:
            self.stdout.write(self.style.WARNING(
                '⚠️  Aucune spécialité active trouvée. '
                'Les sous-traitants seront créés sans spécialités.'
            ))

        # ──────────────────────────────────────────────
        # Données de test
        # ──────────────────────────────────────────────
        sous_traitants_data = [
            {
                'raisonSociale':         'HYDRO SYSTEMES SARL',
                'ICE':                   '123456789',          # RC Maroc (9 chiffres)
                'adresse':               '12 Rue des Oliviers, Casablanca 20000',
                'contactPrincipalNom':   'Karim Benali',
                'contactPrincipalTel':   '+212661234567',
                'contactPrincipalEmail': 'k.benali@hydrosystemes.ma',
                'contactTechniqueNom':   'Hassan Rhazi',
                'contactTechniqueTel':   '0522345678',
                'contactTechniqueEmail': 'h.rhazi@hydrosystemes.ma',
                'numeroContrat':         'CTR-2024-001',
                'tarifHoraireNormal':    450.00,
                'tarifHoraireSemaine':   600.00,
                'habilitations':         'Travaux sous pression, installations hydrauliques industrielles',
                'statut':                'actif',
                'estActif':              True,
            },
            {
                'raisonSociale':         'ELECTRO MAROC MAINTENANCE',
                'ICE':                   '987654321',
                'adresse':              '45 Boulevard Zerktouni, Rabat 10000',
                'contactPrincipalNom':   'Samira Alaoui',
                'contactPrincipalTel':   '+212698765432',
                'contactPrincipalEmail': 's.alaoui@electro-maroc.ma',
                'contactTechniqueNom':   'Youssef Tazi',
                'contactTechniqueTel':   '0537456789',
                'contactTechniqueEmail': None,
                'numeroContrat':         'CTR-2024-002',
                'tarifHoraireNormal':    380.00,
                'tarifHoraireSemaine':   520.00,
                'habilitations':         'Habilitation électrique B2V, travaux HTA/HTB',
                'statut':                'actif',
                'estActif':              True,
            },
            {
                'raisonSociale':         'PNEUMA TECH SERVICES',
                'ICE':                   None,                 # ICE non renseigné
                'adresse':               '8 Zone Industrielle Sidi Bernoussi, Casablanca',
                'contactPrincipalNom':   'Omar Chraibi',
                'contactPrincipalTel':   '0661987654',
                'contactPrincipalEmail': 'o.chraibi@pneumatech.ma',
                'contactTechniqueNom':   'Rachid Mouhib',
                'contactTechniqueTel':   '0522987654',
                'contactTechniqueEmail': 'r.mouhib@pneumatech.ma',
                'numeroContrat':         None,
                'tarifHoraireNormal':    320.00,
                'tarifHoraireSemaine':   None,
                'habilitations':         None,
                'statut':                'actif',
                'estActif':              True,
            },
            {
                'raisonSociale':         'FROID INDUSTRIE MAROC',
                'ICE':                   '11223344556677',
                'adresse':               '22 Rue Ibn Sina, Tanger 90000',
                'contactPrincipalNom':   'Fatima Zahrae Idrissi',
                'contactPrincipalTel':   '+212539112233',
                'contactPrincipalEmail': 'fz.idrissi@froidindustrie.ma',
                'contactTechniqueNom':   'Mehdi Lahlou',
                'contactTechniqueTel':   '+212661445566',
                'contactTechniqueEmail': 'm.lahlou@froidindustrie.ma',
                'numeroContrat':         'CTR-2023-089',
                'tarifHoraireNormal':    410.00,
                'tarifHoraireSemaine':   560.00,
                'habilitations':         'Attestation capacité fluides frigorigènes, CACES nacelle',
                'statut':                'inactif',            # ← inactif volontairement
                'estActif':              False,
            },
            {
                'raisonSociale':         'MECANICA PLUS SARL',
                'ICE':                   '555666777',
                'adresse':               '3 Quartier Industriel, Fès 30000',
                'contactPrincipalNom':   'Amine Kettani',
                'contactPrincipalTel':   '0535778899',
                'contactPrincipalEmail': 'a.kettani@mecanicaplus.ma',
                'contactTechniqueNom':   'Saad Filali',
                'contactTechniqueTel':   '0661334455',
                'contactTechniqueEmail': None,
                'numeroContrat':         'CTR-2024-003',
                'tarifHoraireNormal':    290.00,
                'tarifHoraireSemaine':   390.00,
                'habilitations':         'Soudure TIG/MIG, chaudronnerie industrielle',
                'statut':                'suspendu',           # ← suspendu (manquement contractuel)
                'estActif':              False,
            },
        ]

        # ──────────────────────────────────────────────
        # Création des sous-traitants (idempotent)
        # ──────────────────────────────────────────────
        created_count  = 0
        skipped_count  = 0
        instances      = []

        for data in sous_traitants_data:
            st, created = SousTraitant.objects.get_or_create(
                raisonSociale=data['raisonSociale'],
                defaults={
                    **data,
                    'idUtilisateurCreateur': createur,
                }
            )
            instances.append(st)

            if created:
                created_count += 1
                self.stdout.write(f"  ✅ Créé  : {st.raisonSociale} [{st.statut}]")
            else:
                skipped_count += 1
                self.stdout.write(f"  ⏭️  Existe : {st.raisonSociale}")

        # ──────────────────────────────────────────────
        # Assignation des spécialités
        # ──────────────────────────────────────────────
        if specialites:
            self.stdout.write("\n── Assignation des spécialités ──")

            # Répartition : chaque ST actif reçoit 1 à 2 spécialités
            assignations = [
                (instances[0], specialites[0:2]),   # HYDRO SYSTEMES      → 2 spécialités
                (instances[1], specialites[1:3]),   # ELECTRO MAROC       → 2 spécialités
                (instances[2], specialites[2:3]),   # PNEUMA TECH         → 1 spécialité
                (instances[3], specialites[0:1]),   # FROID INDUSTRIE     → 1 spécialité
                (instances[4], []),                 # MECANICA PLUS       → aucune (suspendu)
            ]

            for st, specs in assignations:
                for spec in specs:
                    _, created = SousTraitantSpecialite.objects.get_or_create(
                        idSousTraitant=st,
                        idSpecialite=spec,
                    )
                    if created:
                        self.stdout.write(
                            f"  🔗 {st.raisonSociale} ← {spec.libelle}"
                        )

        # ──────────────────────────────────────────────
        # Résumé final
        # ──────────────────────────────────────────────
        self.stdout.write("\n── Résumé ──")
        self.stdout.write(f"  Sous-traitants créés  : {created_count}")
        self.stdout.write(f"  Déjà existants        : {skipped_count}")
        self.stdout.write(
            f"  Répartition statuts   : "
            f"{SousTraitant.objects.filter(statut='actif').count()} actifs · "
            f"{SousTraitant.objects.filter(statut='inactif').count()} inactifs · "
            f"{SousTraitant.objects.filter(statut='suspendu').count()} suspendus"
        )
        self.stdout.write(self.style.SUCCESS('\n🎉 Seed terminé !'))