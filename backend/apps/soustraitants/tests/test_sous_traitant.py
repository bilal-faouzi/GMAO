import uuid
import hashlib
from decimal import Decimal
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.securite.models import (
    Utilisateur, Role, Permission, UtilisateurRole, RolePermission, SessionActive,
)
from apps.organisation.models import Specialite
from apps.soustraitants.models import SousTraitant, SousTraitantSpecialite


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def create_user(username='testuser', email='test@test.com', password='admin'):
    return Utilisateur.objects.create(
        nom_utilisateur=username,
        email=email,
        mot_de_passe_hash=hash_password(password),
        prenom='Test',
        nom='User',
        est_actif=True,
    )


def create_role(code, niveau=2):
    role, _ = Role.objects.get_or_create(
        code=code,
        defaults={'libelle': code, 'niveau': niveau, 'est_actif': True}
    )
    return role


def assign_role(user, role_code):
    role = create_role(role_code)
    UtilisateurRole.objects.get_or_create(id_utilisateur=user, id_role=role)


def get_authenticated_client(user):
    """Create an authenticated APIClient with JWT + session."""
    client = APIClient()
    refresh = RefreshToken()
    refresh['user_id'] = str(user.id)
    refresh['nom_utilisateur'] = user.nom_utilisateur

    session = SessionActive.objects.create(
        id_utilisateur=user,
        date_expiration=timezone.now() + timedelta(hours=8),
        adresse_ip='127.0.0.1',
    )
    refresh['session_id'] = str(session.id)
    access = refresh.access_token

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
    return client


def create_specialite(code='HYDRAULIQUE', libelle='Hydraulique', est_actif=True):
    return Specialite.objects.create(code=code, libelle=libelle, estActif=est_actif)


def valid_sous_traitant_data():
    return {
        'raisonSociale': 'HYDRO SYSTEMES SARL',
        'contactPrincipalNom': 'Ahmed Benali',
        'contactPrincipalTel': '+212612345678',
        'contactPrincipalEmail': 'ahmed@hydro.ma',
        'contactTechniqueNom': 'Karim Fassi',
        'contactTechniqueTel': '0612345679',
        'tarifHoraireNormal': '450.00',
        'tarifHoraireSemaine': '600.00',
    }


BASE_URL = '/api/v1/soustraitants/'


# ─── TESTS DE CRÉATION ───────────────────────────────────────────────────────

class SousTraitantCreateTests(TestCase):

    def setUp(self):
        self.user = create_user()
        assign_role(self.user, 'RESP_MAINT')
        self.client = get_authenticated_client(self.user)

    def test_creation_valide_201(self):
        data = valid_sous_traitant_data()
        resp = self.client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data['succes'])
        self.assertEqual(resp.data['data']['raisonSociale'], 'HYDRO SYSTEMES SARL')
        self.assertEqual(resp.data['data']['statut'], 'actif')

    def test_raison_sociale_doublon_casse_differente_409(self):
        data = valid_sous_traitant_data()
        self.client.post(BASE_URL, data, format='json')
        data2 = valid_sous_traitant_data()
        data2['raisonSociale'] = 'hydro systemes sarl'
        data2['contactPrincipalEmail'] = 'other@hydro.ma'
        resp = self.client.post(BASE_URL, data2, format='json')
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(resp.data['erreur'], 'RAISON_SOCIALE_DEJA_EXISTANTE')

    def test_email_invalide_422(self):
        data = valid_sous_traitant_data()
        data['contactPrincipalEmail'] = 'not-an-email'
        resp = self.client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 422)

    def test_tarif_semaine_inferieur_tarif_normal_422(self):
        data = valid_sous_traitant_data()
        data['tarifHoraireNormal'] = '500.00'
        data['tarifHoraireSemaine'] = '300.00'
        resp = self.client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 422)

    def test_statut_force_actif(self):
        data = valid_sous_traitant_data()
        data['statut'] = 'inactif'
        resp = self.client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['data']['statut'], 'actif')

    def test_telephone_marocain_accepte(self):
        data = valid_sous_traitant_data()
        data['contactPrincipalTel'] = '0612345678'
        resp = self.client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 201)

    def test_telephone_international_accepte(self):
        data = valid_sous_traitant_data()
        data['contactPrincipalTel'] = '+33612345678'
        resp = self.client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 201)

    def test_audit_enregistre_creation(self):
        from apps.securite.models import JournalAudit
        data = valid_sous_traitant_data()
        self.client.post(BASE_URL, data, format='json')
        audit = JournalAudit.objects.filter(action='SOUS_TRAITANT_CREE').first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.module, 'SOUS_TRAITANCE')

    def test_tarif_semaine_sans_normal_422(self):
        data = valid_sous_traitant_data()
        del data['tarifHoraireNormal']
        data['tarifHoraireSemaine'] = '500.00'
        resp = self.client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 422)

    def test_tarif_negatif_422(self):
        data = valid_sous_traitant_data()
        data['tarifHoraireNormal'] = '-10.00'
        resp = self.client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 422)

    def test_body_vide_400(self):
        resp = self.client.post(BASE_URL, {}, format='json')
        self.assertIn(resp.status_code, [400, 422])

    def test_email_stocke_lowercase(self):
        data = valid_sous_traitant_data()
        data['contactPrincipalEmail'] = 'Ahmed@HYDRO.MA'
        resp = self.client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['data']['contactPrincipalEmail'], 'ahmed@hydro.ma')

    def test_ICE_valide_9_chiffres(self):
        data = valid_sous_traitant_data()
        data['ICE'] = '123456789'
        resp = self.client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 201)

    def test_ICE_valide_14_chiffres(self):
        data = valid_sous_traitant_data()
        data['ICE'] = '12345678901234'
        resp = self.client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 201)

    def test_ICE_invalide_422(self):
        data = valid_sous_traitant_data()
        data['ICE'] = 'ABC123'
        resp = self.client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 422)

    def test_creation_avec_adresse(self):
        data = valid_sous_traitant_data()
        data['adresse'] = '123 Rue Mohammed V, Casablanca'
        resp = self.client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['data']['adresse'], '123 Rue Mohammed V, Casablanca')

    def test_creation_contacts_optionnels(self):
        data = {
            'raisonSociale': 'ST Sans Contacts',
            'contactPrincipalEmail': 'contact@st.ma',
            'tarifHoraireNormal': '300.00',
        }
        resp = self.client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['data']['contactPrincipalNom'], '')

    def test_est_actif_true_a_creation(self):
        data = valid_sous_traitant_data()
        resp = self.client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data['data']['estActif'])


# ─── TESTS DE MISE À JOUR STATUT ─────────────────────────────────────────────

class SousTraitantStatutTests(TestCase):

    def setUp(self):
        self.user = create_user()
        assign_role(self.user, 'RESP_MAINT')
        self.client = get_authenticated_client(self.user)
        self.st = SousTraitant.objects.create(
            raisonSociale='Test ST',
            contactPrincipalNom='Nom',
            contactPrincipalTel='+212612345678',
            contactPrincipalEmail='test@st.ma',
            contactTechniqueNom='Tech',
            contactTechniqueTel='0612345678',
            statut='actif',
            idUtilisateurCreateur=self.user,
        )

    def test_actif_suspendu_sans_motif_422(self):
        resp = self.client.post(
            f'{BASE_URL}{self.st.id}/changer_statut/',
            {'statut': 'suspendu'},
            format='json',
        )
        self.assertEqual(resp.status_code, 422)

    def test_actif_suspendu_avec_motif_200(self):
        resp = self.client.post(
            f'{BASE_URL}{self.st.id}/changer_statut/',
            {'statut': 'suspendu', 'motif': 'Manquement contractuel'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['statut'], 'suspendu')

    def test_actif_actif_422(self):
        resp = self.client.post(
            f'{BASE_URL}{self.st.id}/changer_statut/',
            {'statut': 'actif'},
            format='json',
        )
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(resp.data['erreur'], 'TRANSITION_STATUT_INVALIDE')

    def test_inactif_suspendu_200(self):
        self.st.statut = 'inactif'
        self.st.save()
        resp = self.client.post(
            f'{BASE_URL}{self.st.id}/changer_statut/',
            {'statut': 'suspendu', 'motif': 'Test'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)

    def test_suspendu_actif_200(self):
        self.st.statut = 'suspendu'
        self.st.save()
        resp = self.client.post(
            f'{BASE_URL}{self.st.id}/changer_statut/',
            {'statut': 'actif'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['statut'], 'actif')

    def test_sans_champ_statut_422(self):
        resp = self.client.post(
            f'{BASE_URL}{self.st.id}/changer_statut/',
            {'motif': 'test'},
            format='json',
        )
        self.assertEqual(resp.status_code, 422)

    def test_audit_enregistre_changement_statut(self):
        from apps.securite.models import JournalAudit
        self.client.post(
            f'{BASE_URL}{self.st.id}/changer_statut/',
            {'statut': 'inactif'},
            format='json',
        )
        audit = JournalAudit.objects.filter(action='SOUS_TRAITANT_STATUT_CHANGE').first()
        self.assertIsNotNone(audit)

    def test_avertissement_dernier_actif_specialite(self):
        spec = create_specialite()
        SousTraitantSpecialite.objects.create(idSousTraitant=self.st, idSpecialite=spec)
        resp = self.client.post(
            f'{BASE_URL}{self.st.id}/changer_statut/',
            {'statut': 'suspendu', 'motif': 'Test dernier actif'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn('avertissements', resp.data)
        self.assertTrue(any('seul prestataire' in str(a.get('message', '')) for a in resp.data['avertissements']))

    def test_est_actif_mis_a_jour(self):
        resp = self.client.post(
            f'{BASE_URL}{self.st.id}/changer_statut/',
            {'statut': 'inactif'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.st.refresh_from_db()
        self.assertFalse(self.st.estActif)

    def test_est_actif_retabli(self):
        self.st.statut = 'suspendu'
        self.st.estActif = False
        self.st.save()
        resp = self.client.post(
            f'{BASE_URL}{self.st.id}/changer_statut/',
            {'statut': 'actif'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.st.refresh_from_db()
        self.assertTrue(self.st.estActif)


# ─── TESTS DE SUPPRESSION ────────────────────────────────────────────────────

class SousTraitantDeleteTests(TestCase):

    def setUp(self):
        self.user = create_user()
        assign_role(self.user, 'RESP_MAINT')
        self.client = get_authenticated_client(self.user)

    def test_suppression_sans_historique_200(self):
        st = SousTraitant.objects.create(
            raisonSociale='Suppr Test',
            contactPrincipalNom='Nom',
            contactPrincipalTel='+212612345678',
            contactPrincipalEmail='suppr@test.ma',
            contactTechniqueNom='Tech',
            contactTechniqueTel='0612345678',
            statut='actif',
            idUtilisateurCreateur=self.user,
        )
        resp = self.client.delete(f'{BASE_URL}{st.id}/')
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(SousTraitant.objects.filter(id=st.id).exists())

    def test_uuid_malformed_400(self):
        resp = self.client.delete(f'{BASE_URL}not-a-uuid/')
        self.assertEqual(resp.status_code, 400)

    def test_uuid_inexistant_404(self):
        fake_id = uuid.uuid4()
        resp = self.client.delete(f'{BASE_URL}{fake_id}/')
        self.assertEqual(resp.status_code, 404)

    def test_audit_enregistre_suppression(self):
        from apps.securite.models import JournalAudit
        st = SousTraitant.objects.create(
            raisonSociale='Audit Suppr',
            contactPrincipalNom='Nom',
            contactPrincipalTel='+212612345678',
            contactPrincipalEmail='audit@test.ma',
            contactTechniqueNom='Tech',
            contactTechniqueTel='0612345678',
            statut='actif',
            idUtilisateurCreateur=self.user,
        )
        self.client.delete(f'{BASE_URL}{st.id}/')
        audit = JournalAudit.objects.filter(action='SOUS_TRAITANT_SUPPRIME').first()
        self.assertIsNotNone(audit)


# ─── TESTS DES SPÉCIALITÉS ───────────────────────────────────────────────────

class SousTraitantSpecialiteTests(TestCase):

    def setUp(self):
        self.user = create_user()
        assign_role(self.user, 'RESP_MAINT')
        self.client = get_authenticated_client(self.user)
        self.st = SousTraitant.objects.create(
            raisonSociale='Spec Test',
            contactPrincipalNom='Nom',
            contactPrincipalTel='+212612345678',
            contactPrincipalEmail='spec@test.ma',
            contactTechniqueNom='Tech',
            contactTechniqueTel='0612345678',
            statut='actif',
            idUtilisateurCreateur=self.user,
        )
        self.specialite = create_specialite()

    def test_ajout_specialite_valide_201(self):
        resp = self.client.post(
            f'{BASE_URL}{self.st.id}/specialites/',
            {'idSpecialite': str(self.specialite.id)},
            format='json',
        )
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data['succes'])

    def test_specialite_inexistante_404(self):
        resp = self.client.post(
            f'{BASE_URL}{self.st.id}/specialites/',
            {'idSpecialite': str(uuid.uuid4())},
            format='json',
        )
        self.assertEqual(resp.status_code, 404)

    def test_specialite_inactive_422(self):
        spec_inactive = create_specialite(code='INACTIVE', libelle='Inactive', est_actif=False)
        resp = self.client.post(
            f'{BASE_URL}{self.st.id}/specialites/',
            {'idSpecialite': str(spec_inactive.id)},
            format='json',
        )
        self.assertEqual(resp.status_code, 422)

    def test_doublon_specialite_409(self):
        SousTraitantSpecialite.objects.create(
            idSousTraitant=self.st, idSpecialite=self.specialite
        )
        resp = self.client.post(
            f'{BASE_URL}{self.st.id}/specialites/',
            {'idSpecialite': str(self.specialite.id)},
            format='json',
        )
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(resp.data['erreur'], 'SPECIALITE_DEJA_ASSIGNEE')

    def test_suppression_derniere_specialite_avertissement(self):
        SousTraitantSpecialite.objects.create(
            idSousTraitant=self.st, idSpecialite=self.specialite
        )
        resp = self.client.delete(
            f'{BASE_URL}{self.st.id}/specialites/{self.specialite.id}/',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn('avertissements', resp.data)
        self.assertTrue(any('aucune spécialité' in str(a) for a in resp.data['avertissements']))

    def test_get_specialites(self):
        assign_role(self.user, 'RESP_TECH')
        SousTraitantSpecialite.objects.create(
            idSousTraitant=self.st, idSpecialite=self.specialite
        )
        resp = self.client.get(f'{BASE_URL}{self.st.id}/specialites/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data['data']), 1)


# ─── TESTS ENDPOINT /disponibles ─────────────────────────────────────────────

class SousTraitantDisponiblesTests(TestCase):

    def setUp(self):
        self.user = create_user()
        assign_role(self.user, 'RESP_TECH')
        self.client = get_authenticated_client(self.user)
        self.specialite = create_specialite()

    def test_sans_id_specialite_422(self):
        resp = self.client.get(f'{BASE_URL}disponibles/')
        self.assertEqual(resp.status_code, 422)

    def test_date_debut_apres_date_fin_422(self):
        now = timezone.now()
        resp = self.client.get(f'{BASE_URL}disponibles/', {
            'idSpecialite': str(self.specialite.id),
            'dateDebut': (now + timedelta(days=10)).isoformat(),
            'dateFin': (now + timedelta(days=5)).isoformat(),
        })
        self.assertEqual(resp.status_code, 422)

    def test_date_debut_dans_passe_422(self):
        now = timezone.now()
        resp = self.client.get(f'{BASE_URL}disponibles/', {
            'idSpecialite': str(self.specialite.id),
            'dateDebut': (now - timedelta(days=1)).isoformat(),
            'dateFin': (now + timedelta(days=5)).isoformat(),
        })
        self.assertEqual(resp.status_code, 422)

    def test_resultats_uniquement_actifs(self):
        user_maint = create_user('maint', 'maint@test.com')
        assign_role(user_maint, 'RESP_MAINT')

        st_actif = SousTraitant.objects.create(
            raisonSociale='ST Actif',
            contactPrincipalNom='Nom',
            contactPrincipalTel='+212612345678',
            contactPrincipalEmail='actif@test.ma',
            contactTechniqueNom='Tech',
            contactTechniqueTel='0612345678',
            statut='actif',
            idUtilisateurCreateur=user_maint,
        )
        st_inactif = SousTraitant.objects.create(
            raisonSociale='ST Inactif',
            contactPrincipalNom='Nom2',
            contactPrincipalTel='+212612345679',
            contactPrincipalEmail='inactif@test.ma',
            contactTechniqueNom='Tech2',
            contactTechniqueTel='0612345680',
            statut='inactif',
            idUtilisateurCreateur=user_maint,
        )

        SousTraitantSpecialite.objects.create(idSousTraitant=st_actif, idSpecialite=self.specialite)
        SousTraitantSpecialite.objects.create(idSousTraitant=st_inactif, idSpecialite=self.specialite)

        now = timezone.now()
        resp = self.client.get(f'{BASE_URL}disponibles/', {
            'idSpecialite': str(self.specialite.id),
            'dateDebut': (now + timedelta(days=1)).isoformat(),
            'dateFin': (now + timedelta(days=5)).isoformat(),
        })
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data['data']), 1)
        self.assertEqual(resp.data['data'][0]['raisonSociale'], 'ST Actif')

    def test_date_invalide_422(self):
        resp = self.client.get(f'{BASE_URL}disponibles/', {
            'idSpecialite': str(self.specialite.id),
            'dateDebut': '2024-13-45',
            'dateFin': '2024-12-31',
        })
        self.assertEqual(resp.status_code, 422)


# ─── TESTS RBAC ──────────────────────────────────────────────────────────────

class SousTraitantRBACTests(TestCase):

    def setUp(self):
        self.resp_tech_user = create_user('resp_tech', 'rt@test.com')
        assign_role(self.resp_tech_user, 'RESP_TECH')
        self.resp_tech_client = get_authenticated_client(self.resp_tech_user)

        self.operateur_user = create_user('operateur', 'op@test.com')
        assign_role(self.operateur_user, 'OPERATEUR')
        self.operateur_client = get_authenticated_client(self.operateur_user)

    def test_resp_tech_ne_peut_pas_creer_403(self):
        data = valid_sous_traitant_data()
        resp = self.resp_tech_client.post(BASE_URL, data, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_operateur_ne_peut_pas_lire_403(self):
        resp = self.operateur_client.get(BASE_URL)
        self.assertEqual(resp.status_code, 403)

    def test_non_authentifie_401(self):
        client = APIClient()
        resp = client.get(BASE_URL)
        self.assertEqual(resp.status_code, 401)

    def test_resp_tech_peut_lire_200(self):
        resp = self.resp_tech_client.get(BASE_URL)
        self.assertEqual(resp.status_code, 200)


# ─── TESTS DE LISTE ET PAGINATION ────────────────────────────────────────────

class SousTraitantListTests(TestCase):

    def setUp(self):
        self.user = create_user()
        assign_role(self.user, 'RESP_MAINT')
        self.client = get_authenticated_client(self.user)

        for i in range(25):
            SousTraitant.objects.create(
                raisonSociale=f'ST Test {i:03d}',
                contactPrincipalNom=f'Contact {i}',
                contactPrincipalTel='+212612345678',
                contactPrincipalEmail=f'st{i}@test.ma',
                contactTechniqueNom=f'Tech {i}',
                contactTechniqueTel='0612345678',
                statut='actif' if i % 3 != 0 else 'inactif',
                idUtilisateurCreateur=self.user,
                tarifHoraireNormal=Decimal(str(100 + i * 10)),
            )

    def test_pagination_defaut(self):
        resp = self.client.get(BASE_URL)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['pagination']['limit'], 20)
        self.assertEqual(len(resp.data['data']), 20)

    def test_pagination_custom(self):
        resp = self.client.get(BASE_URL, {'page': 2, 'limit': 10})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data['data']), 10)

    def test_filtre_statut(self):
        resp = self.client.get(BASE_URL, {'statut': 'inactif', 'limit': 100})
        self.assertEqual(resp.status_code, 200)
        for item in resp.data['data']:
            self.assertEqual(item['statut'], 'inactif')

    def test_recherche_textuelle(self):
        resp = self.client.get(BASE_URL, {'search': 'ST Test 001'})
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.data['data']), 1)

    def test_filtre_tarif_max(self):
        resp = self.client.get(BASE_URL, {'tarifMax': '150', 'limit': 100})
        self.assertEqual(resp.status_code, 200)
        for item in resp.data['data']:
            if item['tarifHoraireNormal']:
                self.assertLessEqual(Decimal(str(item['tarifHoraireNormal'])), Decimal('150'))

    def test_tri(self):
        resp = self.client.get(BASE_URL, {'ordering': '-tarifHoraireNormal', 'limit': 5})
        self.assertEqual(resp.status_code, 200)
        tarifs = [
            Decimal(str(item['tarifHoraireNormal']))
            for item in resp.data['data']
            if item['tarifHoraireNormal'] is not None
        ]
        self.assertEqual(tarifs, sorted(tarifs, reverse=True))

    def test_page_au_dela_total_retourne_vide(self):
        resp = self.client.get(BASE_URL, {'page': 999, 'limit': 20})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data['data']), 0)

    def test_filtre_est_actif(self):
        resp = self.client.get(BASE_URL, {'estActif': 'true', 'limit': 100})
        self.assertEqual(resp.status_code, 200)
        for item in resp.data['data']:
            self.assertTrue(item['estActif'])


# ─── TESTS MISE À JOUR (PUT) ─────────────────────────────────────────────────

class SousTraitantUpdateTests(TestCase):

    def setUp(self):
        self.user = create_user()
        assign_role(self.user, 'RESP_MAINT')
        self.client = get_authenticated_client(self.user)
        self.st = SousTraitant.objects.create(
            raisonSociale='MAJ Test',
            contactPrincipalNom='Nom',
            contactPrincipalTel='+212612345678',
            contactPrincipalEmail='maj@test.ma',
            contactTechniqueNom='Tech',
            contactTechniqueTel='0612345678',
            statut='actif',
            tarifHoraireNormal=Decimal('400.00'),
            tarifHoraireSemaine=Decimal('500.00'),
            idUtilisateurCreateur=self.user,
        )

    def test_mise_a_jour_valide(self):
        data = valid_sous_traitant_data()
        data['raisonSociale'] = 'MAJ Test Updated'
        resp = self.client.put(f'{BASE_URL}{self.st.id}/', data, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['data']['raisonSociale'], 'MAJ Test Updated')

    def test_body_vide_400(self):
        resp = self.client.put(f'{BASE_URL}{self.st.id}/', {}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_raison_sociale_doublon_409(self):
        SousTraitant.objects.create(
            raisonSociale='Existing ST',
            contactPrincipalNom='N',
            contactPrincipalTel='+212612345678',
            contactPrincipalEmail='exist@test.ma',
            contactTechniqueNom='T',
            contactTechniqueTel='0612345678',
            statut='actif',
            idUtilisateurCreateur=self.user,
        )
        data = valid_sous_traitant_data()
        data['raisonSociale'] = 'Existing ST'
        resp = self.client.put(f'{BASE_URL}{self.st.id}/', data, format='json')
        self.assertEqual(resp.status_code, 409)

    def test_date_creation_ignoree(self):
        data = valid_sous_traitant_data()
        data['raisonSociale'] = 'MAJ Test'
        data['dateCreation'] = '2020-01-01T00:00:00Z'
        resp = self.client.put(f'{BASE_URL}{self.st.id}/', data, format='json')
        self.assertEqual(resp.status_code, 200)
        self.st.refresh_from_db()
        self.assertNotEqual(str(self.st.dateCreation), '2020-01-01T00:00:00Z')

    def test_audit_enregistre_modification(self):
        from apps.securite.models import JournalAudit
        data = valid_sous_traitant_data()
        data['raisonSociale'] = 'MAJ Test Audit'
        self.client.put(f'{BASE_URL}{self.st.id}/', data, format='json')
        audit = JournalAudit.objects.filter(action='SOUS_TRAITANT_MODIFIE').first()
        self.assertIsNotNone(audit)

    def test_avertissement_tarif_modifie(self):
        data = valid_sous_traitant_data()
        data['raisonSociale'] = 'MAJ Test'
        data['tarifHoraireNormal'] = '500.00'
        data['tarifHoraireSemaine'] = '700.00'
        resp = self.client.put(f'{BASE_URL}{self.st.id}/', data, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('avertissements', resp.data)


# ─── TESTS HISTORIQUE ET STATISTIQUES ─────────────────────────────────────────

class SousTraitantHistoriqueStatistiquesTests(TestCase):

    def setUp(self):
        self.user = create_user()
        assign_role(self.user, 'RESP_MAINT')
        assign_role(self.user, 'DIR_TECH')
        self.client = get_authenticated_client(self.user)
        self.st = SousTraitant.objects.create(
            raisonSociale='Hist Test',
            contactPrincipalNom='Nom',
            contactPrincipalTel='+212612345678',
            contactPrincipalEmail='hist@test.ma',
            contactTechniqueNom='Tech',
            contactTechniqueTel='0612345678',
            statut='actif',
            idUtilisateurCreateur=self.user,
        )

    def test_historique_vide(self):
        resp = self.client.get(f'{BASE_URL}{self.st.id}/historique-interventions/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['data'], [])
        self.assertEqual(resp.data['pagination']['total'], 0)

    def test_historique_sous_traitant_inexistant_404(self):
        fake_id = uuid.uuid4()
        resp = self.client.get(f'{BASE_URL}{fake_id}/historique-interventions/')
        self.assertEqual(resp.status_code, 404)

    def test_statistiques_vide(self):
        resp = self.client.get(f'{BASE_URL}{self.st.id}/statistiques/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['data']['nbInterventionsTotal'], 0)

    def test_statistiques_sous_traitant_inexistant_404(self):
        fake_id = uuid.uuid4()
        resp = self.client.get(f'{BASE_URL}{fake_id}/statistiques/')
        self.assertEqual(resp.status_code, 404)

    def test_statistiques_avec_annee(self):
        resp = self.client.get(f'{BASE_URL}{self.st.id}/statistiques/', {'annee': '2024'})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['data']['periode']['debut'], '2024-01-01')
