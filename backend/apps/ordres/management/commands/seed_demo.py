from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import hashlib


def sha(p):
    return hashlib.sha256(p.encode()).hexdigest()


class Command(BaseCommand):
    help = 'Insère les données de démo GMAO'

    def handle(self, *args, **kwargs):

        from apps.securite.models import Utilisateur, Role, Permission, RolePermission, UtilisateurRole, JournalAudit
        from apps.organisation.models import Societe, Site, Secteur, Unite, Specialite, Equipe, EquipeUtilisateur, AppartenanceOrganisationnelle
        from apps.actifs.models import Actif, HistoriqueStatut, Indisponibilite
        from apps.magasin.models import Piece, MouvementStock
        from apps.soustraitants.models import SousTraitant, SousTraitantSpecialite
        from apps.ordres.models import (
            DemandeIntervention, OrdreTravail, AffectationEquipe,
            MembreIntervention, SuiviTemps, PieceUtiliseeOT,
            CommentaireOT, CauseRacine, HistoriqueStatutOT, ConfigurationSLA
        )

        # ── NETTOYAGE ─────────────────────────────────
        self.stdout.write('Nettoyage des donnees existantes...')
        OrdreTravail.objects.all().delete()
        DemandeIntervention.objects.all().delete()
        Piece.objects.all().delete()
        SousTraitant.objects.all().delete()
        Actif.objects.all().delete()
        Equipe.objects.all().delete()
        Specialite.objects.all().delete()
        Unite.objects.all().delete()
        Secteur.objects.all().delete()
        Site.objects.all().delete()
        Societe.objects.all().delete()
        UtilisateurRole.objects.all().delete()
        Utilisateur.objects.all().delete()
        RolePermission.objects.all().delete()
        Role.objects.all().delete()
        Permission.objects.all().delete()
        self.stdout.write('Tables nettoyees')

        pwd = sha('Admin123!')

        # ── ROLES ─────────────────────────────────────
        r_admin      = Role.objects.create(code='ADMIN',      libelle='Administrateur',          niveau=5, est_actif=True)
        r_resp        = Role.objects.create(code='RESP_TECH',  libelle='Responsable Techniciens', niveau=3, est_actif=True)
        r_resp_maint  = Role.objects.create(code='RESP_MAINT', libelle='Responsable Maintenance', niveau=3, est_actif=True)
        r_dir_tech    = Role.objects.create(code='DIR_TECH',   libelle='Directeur Technique',     niveau=4, est_actif=True)
        r_op          = Role.objects.create(code='OPERATEUR',  libelle='Operateur',               niveau=1, est_actif=True)
        r_mag         = Role.objects.create(code='MAGASINIER', libelle='Magasinier',              niveau=1, est_actif=True)
        self.stdout.write('Roles crees')

        # ── PERMISSIONS ───────────────────────────────
        p1 = Permission.objects.create(code='LIRE_OT',      module='ordres',  action='lire',     ressource='OrdreTravail',   est_actif=True)
        p2 = Permission.objects.create(code='CREER_OT',     module='ordres',  action='creer',    ressource='OrdreTravail',   est_actif=True)
        p3 = Permission.objects.create(code='LIRE_STOCK',   module='magasin', action='lire',     ressource='Piece',          est_actif=True)
        p4 = Permission.objects.create(code='SORTIE_STOCK', module='magasin', action='modifier', ressource='MouvementStock', est_actif=True)
        p5 = Permission.objects.create(code='LIRE_ACTIF',   module='actifs',  action='lire',     ressource='Actif',          est_actif=True)
        for role in [r_admin, r_resp, r_resp_maint, r_dir_tech]:
            for perm in [p1, p2, p3, p4, p5]:
                RolePermission.objects.create(id_role=role, id_permission=perm)
        RolePermission.objects.create(id_role=r_mag, id_permission=p3)
        RolePermission.objects.create(id_role=r_mag, id_permission=p4)
        RolePermission.objects.create(id_role=r_op,  id_permission=p1)
        RolePermission.objects.create(id_role=r_op,  id_permission=p5)
        self.stdout.write('Permissions creees')

        # ── UTILISATEURS ──────────────────────────────
        u_admin = Utilisateur.objects.create(nom_utilisateur='admin',       email='admin@carriprefa.ma',  mot_de_passe_hash=pwd, prenom='Mohammed', nom='Amine',    est_actif=True)
        u_resp  = Utilisateur.objects.create(nom_utilisateur='responsable', email='resp@carriprefa.ma',   mot_de_passe_hash=pwd, prenom='Youssef',  nom='Bensouda', est_actif=True)
        u_op1   = Utilisateur.objects.create(nom_utilisateur='operateur1',  email='op1@carriprefa.ma',    mot_de_passe_hash=pwd, prenom='Karim',    nom='Berrada',  est_actif=True)
        u_op2   = Utilisateur.objects.create(nom_utilisateur='operateur2',  email='op2@carriprefa.ma',    mot_de_passe_hash=pwd, prenom='Hamza',    nom='Talbi',    est_actif=True)
        u_op3   = Utilisateur.objects.create(nom_utilisateur='operateur3',  email='op3@carriprefa.ma',    mot_de_passe_hash=pwd, prenom='Nabil',    nom='Lahlou',   est_actif=True)
        u_mag   = Utilisateur.objects.create(nom_utilisateur='magasinier1', email='mag1@carriprefa.ma',   mot_de_passe_hash=pwd, prenom='Salma',    nom='Ouazzani', est_actif=True)
        u_dir   = Utilisateur.objects.create(nom_utilisateur='directeur',   email='dir@carriprefa.ma',    mot_de_passe_hash=pwd, prenom='Rachid',   nom='Filali',   est_actif=True)
        u_resp2 = Utilisateur.objects.create(nom_utilisateur='resp_ssm',    email='resp@sosamac.ma',      mot_de_passe_hash=pwd, prenom='Mustapha', nom='Chraibi',  est_actif=True)

        for u, r in [
            (u_admin, r_admin),
            (u_resp,  r_resp),
            (u_op1,   r_op),
            (u_op2,   r_op),
            (u_op3,   r_op),
            (u_mag,   r_mag),
            (u_dir,   r_dir_tech),
            (u_resp2, r_resp_maint),
        ]:
            UtilisateurRole.objects.create(id_utilisateur=u, id_role=r)

        JournalAudit.objects.create(id_utilisateur=u_admin, action='CONNEXION', module='securite', type_entite='Utilisateur', id_entite=str(u_admin.id), adresse_ip='127.0.0.1')
        JournalAudit.objects.create(id_utilisateur=u_resp,  action='CONNEXION', module='securite', type_entite='Utilisateur', id_entite=str(u_resp.id),  adresse_ip='127.0.0.1')
        self.stdout.write('Utilisateurs crees')

        # ── ORGANISATION ──────────────────────────────
        soc1 = Societe.objects.create(code='SOC-CPF', raisonSociale='CarriPrefa', estActif=True)
        soc2 = Societe.objects.create(code='SOC-SSM', raisonSociale='SOSAMAC',    estActif=True)

        # Sites CarriPrefa
        site_siege = Site.objects.create(societe=soc1, code='CPF-SIG', libelle='Siege CarriPrefa',    ville='Marrakech',  estActif=True)
        site_tam   = Site.objects.create(societe=soc1, code='CPF-TAM', libelle='Carriere Tamansourt', ville='Tamansourt', estActif=True)
        site_aio   = Site.objects.create(societe=soc1, code='CPF-AIO', libelle='Carriere Ait Ourir',  ville='Ait Ourir',  estActif=True)

        # Site SOSAMAC
        site_ssm   = Site.objects.create(societe=soc2, code='SSM-001', libelle='Site SOSAMAC',        ville='Marrakech',  estActif=True)

        # Secteurs Siege
        sect_adm = Secteur.objects.create(site=site_siege, code='SIG-ADM', libelle='Administration')
        sect_prf = Secteur.objects.create(site=site_siege, code='SIG-PRF', libelle='Prefa')
        sect_btn = Secteur.objects.create(site=site_siege, code='SIG-BTN', libelle='Beton')
        sect_put = Secteur.objects.create(site=site_siege, code='SIG-PUT', libelle='Poutrelle')

        # Secteurs Carrieres
        sect_tam = Secteur.objects.create(site=site_tam, code='TAM-EXP', libelle='Exploitation Tamansourt')
        sect_aio = Secteur.objects.create(site=site_aio, code='AIO-EXP', libelle='Exploitation Ait Ourir')

        # Secteur SOSAMAC
        sect_ssm = Secteur.objects.create(site=site_ssm, code='SSM-EXP', libelle='Exploitation SOSAMAC')

        # Unites Siege
        unit_adm = Unite.objects.create(secteur=sect_adm, code='SIG-ADM-U0', libelle='Administration')
        unit_mag = Unite.objects.create(secteur=sect_adm, code='SIG-MAG-U0', libelle='Magasin')
        unit_p1  = Unite.objects.create(secteur=sect_prf, code='SIG-PRF-U1', libelle='Unite 1 - Prefa')
        unit_p2  = Unite.objects.create(secteur=sect_prf, code='SIG-PRF-U2', libelle='Unite 2 - Prefa')
        unit_p3  = Unite.objects.create(secteur=sect_prf, code='SIG-PRF-U3', libelle='Unite 3 - Prefa')
        unit_p4  = Unite.objects.create(secteur=sect_prf, code='SIG-PRF-U4', libelle='Unite 4 - Prefa')
        unit_b5  = Unite.objects.create(secteur=sect_btn, code='SIG-BTN-U5', libelle='Unite 5 - Beton')
        unit_b6  = Unite.objects.create(secteur=sect_btn, code='SIG-BTN-U6', libelle='Unite 6 - Beton')
        unit_pt7 = Unite.objects.create(secteur=sect_put, code='SIG-PUT-U7', libelle='Unite 7 - Poutrelle')

        # Unites Carrieres & SOSAMAC
        unit_tam = Unite.objects.create(secteur=sect_tam, code='TAM-U1', libelle='Unite Exploitation Tamansourt')
        unit_aio = Unite.objects.create(secteur=sect_aio, code='AIO-U1', libelle='Unite Exploitation Ait Ourir')
        unit_ssm = Unite.objects.create(secteur=sect_ssm, code='SSM-U1', libelle='Unite Exploitation SOSAMAC')

        # Specialites
        sp_meca = Specialite.objects.create(code='MECA', libelle='Mecanique')
        sp_elec = Specialite.objects.create(code='ELEC', libelle='Electricite')
        sp_auto = Specialite.objects.create(code='AUTO', libelle='Automatisme')
        sp_hydr = Specialite.objects.create(code='HYDR', libelle='Hydraulique')
        sp_pneu = Specialite.objects.create(code='PNEU', libelle='Pneumatique')
        sp_soud = Specialite.objects.create(code='SOUD', libelle='Soudure')

        # Equipes
        eq1 = Equipe.objects.create(site=site_siege, specialite=sp_meca, libelle='Equipe Mecanique - Siege CarriPrefa',    estActif=True)
        eq2 = Equipe.objects.create(site=site_siege, specialite=sp_elec, libelle='Equipe Electrique - Siege CarriPrefa',   estActif=True)
        eq3 = Equipe.objects.create(site=site_siege, specialite=sp_hydr, libelle='Equipe Hydraulique - Siege CarriPrefa',  estActif=True)
        eq4 = Equipe.objects.create(site=site_tam,   specialite=sp_meca, libelle='Equipe Mecanique - Carriere Tamansourt', estActif=True)
        eq5 = Equipe.objects.create(site=site_aio,   specialite=sp_meca, libelle='Equipe Mecanique - Carriere Ait Ourir',  estActif=True)
        eq6 = Equipe.objects.create(site=site_ssm,   specialite=sp_meca, libelle='Equipe Mecanique - SOSAMAC',             estActif=True)

        EquipeUtilisateur.objects.create(equipe=eq1, utilisateur=u_resp,  niveauRole='chef',   estActif=True)
        EquipeUtilisateur.objects.create(equipe=eq1, utilisateur=u_op1,   niveauRole='membre', estActif=True)
        EquipeUtilisateur.objects.create(equipe=eq1, utilisateur=u_op2,   niveauRole='membre', estActif=True)
        EquipeUtilisateur.objects.create(equipe=eq2, utilisateur=u_op3,   niveauRole='membre', estActif=True)
        EquipeUtilisateur.objects.create(equipe=eq6, utilisateur=u_resp2, niveauRole='chef',   estActif=True)

        AppartenanceOrganisationnelle.objects.create(utilisateur=u_resp,  societe=soc1, site=site_siege, estPrincipale=True)
        AppartenanceOrganisationnelle.objects.create(utilisateur=u_op1,   societe=soc1, site=site_siege, estPrincipale=True)
        AppartenanceOrganisationnelle.objects.create(utilisateur=u_op2,   societe=soc1, site=site_siege, estPrincipale=True)
        AppartenanceOrganisationnelle.objects.create(utilisateur=u_op3,   societe=soc1, site=site_siege, estPrincipale=True)
        AppartenanceOrganisationnelle.objects.create(utilisateur=u_mag,   societe=soc1, site=site_siege, estPrincipale=True)
        AppartenanceOrganisationnelle.objects.create(utilisateur=u_dir,   societe=soc1, site=site_siege, estPrincipale=True)
        AppartenanceOrganisationnelle.objects.create(utilisateur=u_resp2, societe=soc2, site=site_ssm,   estPrincipale=True)
        self.stdout.write('Organisation creee')

        # ── ACTIFS ────────────────────────────────────
        # Siege - Unites Prefa
        a1  = Actif.objects.create(idUnite=unit_p1,  code='ACT-P1-001',   libelle='Betoniere Prefa 1000L',           type='machine',    statut='en_service', numSerie='BP-2021-001',  fabricant='MaterioPro',  estActif=True)
        a2  = Actif.objects.create(idUnite=unit_p1,  code='ACT-P1-002',   libelle='Vibrateur de Table Prefa',        type='equipement', statut='en_service', numSerie='VT-2020-002',  fabricant='VibroTech',   estActif=True)
        a3  = Actif.objects.create(idUnite=unit_p2,  code='ACT-P2-001',   libelle='Moule Poutre Prefa 6m',           type='equipement', statut='en_service', numSerie='MP-2019-003',  fabricant='MouldCast',   estActif=True)
        a4  = Actif.objects.create(idUnite=unit_p2,  code='ACT-P2-002',   libelle='Betoniere Prefa 750L',            type='machine',    statut='en_service', numSerie='BP-2020-004',  fabricant='MaterioPro',  estActif=True)
        a5  = Actif.objects.create(idUnite=unit_p3,  code='ACT-P3-001',   libelle='Pont Roulant 5T - Unite 3',       type='machine',    statut='en_panne',   numSerie='PR-2022-005',  fabricant='LevagePro',   estActif=True)
        a6  = Actif.objects.create(idUnite=unit_p3,  code='ACT-P3-002',   libelle='Table Vibrante Hydraulique',      type='machine',    statut='en_service', numSerie='TVH-2021-006', fabricant='HydroPress',  estActif=True)
        a7  = Actif.objects.create(idUnite=unit_p4,  code='ACT-P4-001',   libelle='Malaxeur 750L - Unite 4',         type='machine',    statut='en_service', numSerie='ML-2020-007',  fabricant='MixTech',     estActif=True)
        a8  = Actif.objects.create(idUnite=unit_p4,  code='ACT-P4-002',   libelle='Compresseur Air 7 bars - Prefa',  type='machine',    statut='en_service', numSerie='CA-2019-008',  fabricant='AirTech',     estActif=True)

        # Siege - Unites Beton
        a9  = Actif.objects.create(idUnite=unit_b5,  code='ACT-B5-001',   libelle='Centrale a Beton 30m3/h',         type='machine',    statut='en_service', numSerie='CB-2018-009',  fabricant='BetonEquip',  estActif=True)
        a10 = Actif.objects.create(idUnite=unit_b5,  code='ACT-B5-002',   libelle='Pompe Eau Centrale Beton',         type='machine',    statut='en_service', numSerie='PE-2018-010',  fabricant='HydroFlow',   estActif=True)
        a11 = Actif.objects.create(idUnite=unit_b6,  code='ACT-B6-001',   libelle='Malaxeur Beton 1500L',             type='machine',    statut='en_service', numSerie='MB-2019-011',  fabricant='MixTech',     estActif=True)
        a12 = Actif.objects.create(idUnite=unit_b6,  code='ACT-B6-002',   libelle='Tapis Doseur Granulats',           type='equipement', statut='maintenance',numSerie='TDG-2020-012', fabricant='ConveyPro',   estActif=True)

        # Siege - Unite Poutrelle
        a13 = Actif.objects.create(idUnite=unit_pt7, code='ACT-PT7-001',  libelle='Ligne de Precontrainte 12m',       type='machine',    statut='en_service', numSerie='LP-2021-013',  fabricant='StressTech',  estActif=True)
        a14 = Actif.objects.create(idUnite=unit_pt7, code='ACT-PT7-002',  libelle='Verins Hydrauliques Tension',      type='equipement', statut='en_service', numSerie='VH-2021-014',  fabricant='HydroPress',  estActif=True)
        a15 = Actif.objects.create(idUnite=unit_pt7, code='ACT-PT7-003',  libelle='Etuve Sechage Poutrelle',          type='machine',    statut='en_service', numSerie='ES-2022-015',  fabricant='ThermoTech',  estActif=True)

        # Carriere Tamansourt
        a16 = Actif.objects.create(idUnite=unit_tam, code='ACT-TAM-001',  libelle='Concasseur Primaire 250T/h',       type='machine',    statut='en_service', numSerie='CP-2017-016',  fabricant='RockCrush',   estActif=True)
        a17 = Actif.objects.create(idUnite=unit_tam, code='ACT-TAM-002',  libelle='Tapis Transporteur 60m',           type='equipement', statut='en_service', numSerie='TT-2017-017',  fabricant='ConveyPro',   estActif=True)
        a18 = Actif.objects.create(idUnite=unit_tam, code='ACT-TAM-003',  libelle='Crible Vibrant 3 Etages',          type='machine',    statut='maintenance',numSerie='CV-2019-018',  fabricant='SieveTech',   estActif=True)
        a19 = Actif.objects.create(idUnite=unit_tam, code='ACT-TAM-004',  libelle='Chargeur Frontal 3m3 - Tamansourt',type='vehicule',   statut='en_service', numSerie='CF-2020-019',  fabricant='LoadTech',    estActif=True)

        # Carriere Ait Ourir
        a20 = Actif.objects.create(idUnite=unit_aio, code='ACT-AIO-001',  libelle='Concasseur Secondaire 150T/h',     type='machine',    statut='en_service', numSerie='CS-2018-020',  fabricant='RockCrush',   estActif=True)
        a21 = Actif.objects.create(idUnite=unit_aio, code='ACT-AIO-002',  libelle='Chargeur Frontal 3m3 - Ait Ourir', type='vehicule',   statut='en_service', numSerie='CF-2020-021',  fabricant='LoadTech',    estActif=True)
        a22 = Actif.objects.create(idUnite=unit_aio, code='ACT-AIO-003',  libelle='Groupe Electrogene 200KVA',         type='machine',    statut='en_service', numSerie='GE-2021-022',  fabricant='PowerGen',    estActif=True)

        # SOSAMAC
        a23 = Actif.objects.create(idUnite=unit_ssm, code='ACT-SSM-001',  libelle='Concasseur Mobile 200T/h',          type='machine',    statut='en_service', numSerie='CM-2022-023',  fabricant='RockCrush',   estActif=True)
        a24 = Actif.objects.create(idUnite=unit_ssm, code='ACT-SSM-002',  libelle='Generateur 250 KVA - SOSAMAC',      type='machine',    statut='en_service', numSerie='GE-2021-024',  fabricant='PowerGen',    estActif=True)
        a25 = Actif.objects.create(idUnite=unit_ssm, code='ACT-SSM-003',  libelle='Tapis Transporteur 40m - SOSAMAC',  type='equipement', statut='en_service', numSerie='TT-2022-025',  fabricant='ConveyPro',   estActif=True)

        # Composants rattaches
        Actif.objects.create(idUnite=unit_b5,  idParent=a9,  code='ACT-B5-009A',   libelle='Moteur Malaxeur Centrale',   type='composant', statut='en_service', fabricant='ElecMotors', estActif=True)
        Actif.objects.create(idUnite=unit_pt7, idParent=a13, code='ACT-PT7-013A',  libelle='Verin Principal Ligne',       type='composant', statut='en_service', fabricant='HydroPress', estActif=True)
        Actif.objects.create(idUnite=unit_tam, idParent=a16, code='ACT-TAM-016A',  libelle='Moteur Concasseur Primaire',  type='composant', statut='en_service', fabricant='ElecMotors', estActif=True)

        # Historiques & indisponibilites
        HistoriqueStatut.objects.create(idActif=a5,  ancienStatut='en_service', nouveauStatut='en_panne',    motif='Moteur pont roulant hors service',     modifiePar=u_op1)
        HistoriqueStatut.objects.create(idActif=a12, ancienStatut='en_service', nouveauStatut='maintenance', motif='Maintenance preventive tapis doseur',  modifiePar=u_resp)
        HistoriqueStatut.objects.create(idActif=a18, ancienStatut='en_service', nouveauStatut='maintenance', motif='Remplacement grilles crible',           modifiePar=u_resp2)
        Indisponibilite.objects.create(idActif=a5,  dateDebut=timezone.now()-timedelta(hours=6), motif='Moteur pont roulant hors service',     type='panne')
        Indisponibilite.objects.create(idActif=a12, dateDebut=timezone.now()-timedelta(hours=3), motif='Maintenance preventive tapis doseur',  type='maintenance')
        Indisponibilite.objects.create(idActif=a18, dateDebut=timezone.now()-timedelta(hours=2), motif='Remplacement grilles crible',           type='maintenance')
        self.stdout.write('Actifs crees')

        # ── MAGASIN ───────────────────────────────────
        pc1  = Piece.objects.create(reference='ROUL-001',  designation='Roulement a billes 50mm',            categorie='Roulements',   unite='piece', emplacement='A1-E1-N1', quantiteStock=Decimal('14'), seuilMinimum=Decimal('5'),  prixUnitaire=Decimal('95.00'),  fournisseur='RoulDistrib',       estActif=True)
        pc2  = Piece.objects.create(reference='ROUL-002',  designation='Roulement a rouleaux 80mm',           categorie='Roulements',   unite='piece', emplacement='A1-E1-N2', quantiteStock=Decimal('8'),  seuilMinimum=Decimal('3'),  prixUnitaire=Decimal('180.00'), fournisseur='RoulDistrib',       estActif=True)
        pc3  = Piece.objects.create(reference='JOINT-001', designation='Joint torique 50x3mm',                categorie='Joints',       unite='piece', emplacement='A1-E2-N1', quantiteStock=Decimal('2'),  seuilMinimum=Decimal('10'), prixUnitaire=Decimal('12.50'),  fournisseur='SealTech',          estActif=True)
        pc4  = Piece.objects.create(reference='JOINT-002', designation='Joint spi 60x80x10mm',                categorie='Joints',       unite='piece', emplacement='A1-E2-N2', quantiteStock=Decimal('6'),  seuilMinimum=Decimal('4'),  prixUnitaire=Decimal('28.00'),  fournisseur='SealTech',          estActif=True)
        pc5  = Piece.objects.create(reference='HUILE-001', designation='Huile hydraulique ISO 46 - 20L',      categorie='Lubrifiants',  unite='L',     emplacement='A2-E1-N1', quantiteStock=Decimal('60'), seuilMinimum=Decimal('20'), prixUnitaire=Decimal('18.00'),  fournisseur='LubriMaroc',        estActif=True)
        pc6  = Piece.objects.create(reference='HUILE-002', designation='Graisse lithium multi-usage 1kg',     categorie='Lubrifiants',  unite='kg',    emplacement='A2-E1-N2', quantiteStock=Decimal('12'), seuilMinimum=Decimal('5'),  prixUnitaire=Decimal('55.00'),  fournisseur='LubriMaroc',        estActif=True)
        pc7  = Piece.objects.create(reference='COURR-001', designation='Courroie trapezoidale type B-80',     categorie='Transmission', unite='piece', emplacement='A1-E3-N1', quantiteStock=Decimal('2'),  seuilMinimum=Decimal('3'),  prixUnitaire=Decimal('155.00'), fournisseur='TransmissProMaroc', estActif=True)
        pc8  = Piece.objects.create(reference='COURR-002', designation='Courroie plate 80x5mm',               categorie='Transmission', unite='m',     emplacement='A1-E3-N2', quantiteStock=Decimal('10'), seuilMinimum=Decimal('5'),  prixUnitaire=Decimal('95.00'),  fournisseur='TransmissProMaroc', estActif=True)
        pc9  = Piece.objects.create(reference='FILTR-001', designation='Filtre hydraulique HF-200',            categorie='Filtration',   unite='piece', emplacement='A2-E2-N1', quantiteStock=Decimal('7'),  seuilMinimum=Decimal('4'),  prixUnitaire=Decimal('70.00'),  fournisseur='FiltrEquip',        estActif=True)
        pc10 = Piece.objects.create(reference='FILTR-002', designation='Filtre a air moteur 150kW',            categorie='Filtration',   unite='piece', emplacement='A2-E2-N2', quantiteStock=Decimal('5'),  seuilMinimum=Decimal('3'),  prixUnitaire=Decimal('45.00'),  fournisseur='FiltrEquip',        estActif=True)
        pc11 = Piece.objects.create(reference='ELEC-001',  designation='Fusible 16A rapide',                   categorie='Electrique',   unite='piece', emplacement='A3-E1-N1', quantiteStock=Decimal('30'), seuilMinimum=Decimal('10'), prixUnitaire=Decimal('3.50'),   fournisseur='ElecDistrib',       estActif=True)
        pc12 = Piece.objects.create(reference='ELEC-002',  designation='Contacteur 25A 220V',                  categorie='Electrique',   unite='piece', emplacement='A3-E1-N2', quantiteStock=Decimal('4'),  seuilMinimum=Decimal('2'),  prixUnitaire=Decimal('220.00'), fournisseur='ElecDistrib',       estActif=True)
        pc13 = Piece.objects.create(reference='ELEC-003',  designation='Disjoncteur magneto-thermique 32A',    categorie='Electrique',   unite='piece', emplacement='A3-E1-N3', quantiteStock=Decimal('6'),  seuilMinimum=Decimal('3'),  prixUnitaire=Decimal('185.00'), fournisseur='ElecDistrib',       estActif=True)
        pc14 = Piece.objects.create(reference='CABL-001',  designation='Cable acier 12mm',                     categorie='Cablerie',     unite='m',     emplacement='A3-E2-N1', quantiteStock=Decimal('100'),seuilMinimum=Decimal('50'), prixUnitaire=Decimal('35.00'),  fournisseur='CablePro',          estActif=True)
        pc15 = Piece.objects.create(reference='SOUD-001',  designation='Electrodes soudure 3.2mm - 5kg',       categorie='Soudure',      unite='kg',    emplacement='A3-E3-N1', quantiteStock=Decimal('20'), seuilMinimum=Decimal('10'), prixUnitaire=Decimal('85.00'),  fournisseur='SoudTech',          estActif=True)
        pc16 = Piece.objects.create(reference='GRLL-001',  designation='Grille crible maille 40mm',             categorie='Criblage',     unite='piece', emplacement='A4-E1-N1', quantiteStock=Decimal('4'),  seuilMinimum=Decimal('2'),  prixUnitaire=Decimal('650.00'), fournisseur='SieveTech',         estActif=True)
        pc17 = Piece.objects.create(reference='GRLL-002',  designation='Grille crible maille 20mm',             categorie='Criblage',     unite='piece', emplacement='A4-E1-N2', quantiteStock=Decimal('4'),  seuilMinimum=Decimal('2'),  prixUnitaire=Decimal('620.00'), fournisseur='SieveTech',         estActif=True)

        # Mouvements de stock
        for piece, qty_e, qty_s, ref_ot in [
            (pc1,  Decimal('20'), Decimal('6'),  'OT-2026-0001'),
            (pc3,  Decimal('15'), Decimal('13'), 'OT-2026-0004'),
            (pc7,  Decimal('5'),  Decimal('3'),  'OT-2026-0002'),
            (pc9,  Decimal('10'), Decimal('3'),  'OT-2026-0007'),
            (pc16, Decimal('6'),  Decimal('2'),  'OT-2026-0005'),
        ]:
            MouvementStock.objects.create(idPiece=piece, typeMouvement='entree', quantite=qty_e, stockAvant=Decimal('0'), stockApres=qty_e, idUtilisateurMagasinier=u_mag, commentaire='Stock initial')
            MouvementStock.objects.create(idPiece=piece, typeMouvement='sortie', quantite=qty_s, stockAvant=qty_e, stockApres=qty_e - qty_s, idUtilisateurMagasinier=u_mag, commentaire=ref_ot)

        self.stdout.write('Magasin cree')

        # ── SOUS-TRAITANTS ────────────────────────────
        st1 = SousTraitant.objects.create(
            raisonSociale='MaintIndustriel SARL',
            adresse='Zone Industrielle Sidi Ghanem, Marrakech',
            contactPrincipalNom='Hassan Ouali',
            contactPrincipalTel='0661100200',
            contactPrincipalEmail='h.ouali@maintindustriel.ma',
            tarifHoraireNormal=Decimal('350'), tarifHoraireSemaine=Decimal('500'),
            statut='actif', estActif=True, idUtilisateurCreateur=u_admin
        )
        st2 = SousTraitant.objects.create(
            raisonSociale='ElectroPro Services SARL',
            adresse='Quartier Industriel, Marrakech',
            contactPrincipalNom='Mehdi Benhaddou',
            contactPrincipalTel='0677654321',
            contactPrincipalEmail='m.benhaddou@electropro.ma',
            tarifHoraireNormal=Decimal('400'), tarifHoraireSemaine=Decimal('600'),
            statut='actif', estActif=True, idUtilisateurCreateur=u_admin
        )
        st3 = SousTraitant.objects.create(
            raisonSociale='AutoSystemes Maroc SARL',
            adresse='Technopole Marrakech',
            contactPrincipalNom='Nadia Sekkat',
            contactPrincipalTel='0655443322',
            contactPrincipalEmail='n.sekkat@autosystemes.ma',
            tarifHoraireNormal=Decimal('500'), tarifHoraireSemaine=Decimal('750'),
            statut='suspendu', estActif=False, idUtilisateurCreateur=u_admin
        )
        st4 = SousTraitant.objects.create(
            raisonSociale='HydroMecanique Sud SARL',
            adresse='Zone Franche, Marrakech',
            contactPrincipalNom='Khalid Mansouri',
            contactPrincipalTel='0662334455',
            contactPrincipalEmail='k.mansouri@hydromec.ma',
            tarifHoraireNormal=Decimal('420'), tarifHoraireSemaine=Decimal('630'),
            statut='actif', estActif=True, idUtilisateurCreateur=u_admin
        )

        SousTraitantSpecialite.objects.create(idSousTraitant=st1, idSpecialite=sp_meca)
        SousTraitantSpecialite.objects.create(idSousTraitant=st1, idSpecialite=sp_hydr)
        SousTraitantSpecialite.objects.create(idSousTraitant=st2, idSpecialite=sp_elec)
        SousTraitantSpecialite.objects.create(idSousTraitant=st2, idSpecialite=sp_auto)
        SousTraitantSpecialite.objects.create(idSousTraitant=st3, idSpecialite=sp_auto)
        SousTraitantSpecialite.objects.create(idSousTraitant=st4, idSpecialite=sp_hydr)
        SousTraitantSpecialite.objects.create(idSousTraitant=st4, idSpecialite=sp_pneu)
        self.stdout.write('Sous-traitants crees')

        # ── SLA ───────────────────────────────────────
        ConfigurationSLA.objects.create(idSite=site_siege, typeOrdreTravail='correctif', priorite='critique', delaiAffectationMin=30,  delaiResolutionMin=120,  estActif=True)
        ConfigurationSLA.objects.create(idSite=site_siege, typeOrdreTravail='correctif', priorite='haute',    delaiAffectationMin=120, delaiResolutionMin=480,  estActif=True)
        ConfigurationSLA.objects.create(idSite=site_siege, typeOrdreTravail='correctif', priorite='normale',  delaiAffectationMin=240, delaiResolutionMin=1440, estActif=True)
        ConfigurationSLA.objects.create(idSite=site_siege, typeOrdreTravail='preventif', priorite='normale',  delaiAffectationMin=480, delaiResolutionMin=2880, estActif=True)
        ConfigurationSLA.objects.create(idSite=site_tam,   typeOrdreTravail='correctif', priorite='critique', delaiAffectationMin=45,  delaiResolutionMin=180,  estActif=True)
        ConfigurationSLA.objects.create(idSite=site_tam,   typeOrdreTravail='correctif', priorite='haute',    delaiAffectationMin=120, delaiResolutionMin=480,  estActif=True)
        ConfigurationSLA.objects.create(idSite=site_aio,   typeOrdreTravail='correctif', priorite='critique', delaiAffectationMin=60,  delaiResolutionMin=240,  estActif=True)
        ConfigurationSLA.objects.create(idSite=site_ssm,   typeOrdreTravail='correctif', priorite='critique', delaiAffectationMin=60,  delaiResolutionMin=240,  estActif=True)
        self.stdout.write('Configuration SLA creee')

        # ── DEMANDES D'INTERVENTION ───────────────────
        di1 = DemandeIntervention.objects.create(
            idActif=a5, idUtilisateurSignalement=u_op1,
            description='Moteur pont roulant Unite 3 - bruit anormal, pas de mouvement possible',
            urgence='critique', statut='validee',
            idUtilisateurValidation=u_resp, dateValidation=timezone.now()-timedelta(hours=5)
        )
        di2 = DemandeIntervention.objects.create(
            idActif=a9, idUtilisateurSignalement=u_op2,
            description='Fuite huile hydraulique sur verin principale centrale beton',
            urgence='haute', statut='validee',
            idUtilisateurValidation=u_resp, dateValidation=timezone.now()-timedelta(days=2)
        )
        di3 = DemandeIntervention.objects.create(
            idActif=a12, idUtilisateurSignalement=u_op2,
            description='Tapis doseur granulats - vibrations anormales, bruit courroie',
            urgence='normale', statut='validee',
            idUtilisateurValidation=u_resp, dateValidation=timezone.now()-timedelta(days=1)
        )
        di4 = DemandeIntervention.objects.create(
            idActif=a18, idUtilisateurSignalement=u_resp2,
            description='Grilles crible vibrant usees, remplacement necessaire',
            urgence='haute', statut='validee',
            idUtilisateurValidation=u_resp2, dateValidation=timezone.now()-timedelta(hours=3)
        )
        di5 = DemandeIntervention.objects.create(
            idActif=a16, idUtilisateurSignalement=u_resp2,
            description='Temperature moteur concasseur primaire elevee - alarme surchauffe',
            urgence='critique', statut='en_attente'
        )
        di6 = DemandeIntervention.objects.create(
            idActif=a1, idUtilisateurSignalement=u_op1,
            description='Betoniere Prefa - tambour mal equilibre, bruit sourd',
            urgence='basse', statut='rejetee',
            idUtilisateurValidation=u_resp, dateValidation=timezone.now()-timedelta(days=1),
            motifRejet='Bruit normal lie au chargement. Aucune intervention requise.'
        )

        # ── ORDRES DE TRAVAIL ─────────────────────────

        # OT1 - CLOTURE (correctif pont roulant siege)
        ot1 = OrdreTravail.objects.create(
            idActif=a5, idDemandeIntervention=di1,
            type='correctif', priorite='critique', statut='CLOTURE',
            description='Remplacement moteur pont roulant 5T - Unite 3 Prefa',
            dureeEstimeeMin=180, dureeReelleMin=210,
            dateCloture=timezone.now()-timedelta(days=1),
            typeCloture='corrige',
            echeanceSLA=timezone.now()-timedelta(days=1)+timedelta(minutes=120)
        )
        aff1 = AffectationEquipe.objects.create(
            idOrdreTravail=ot1, idEquipe=eq1, idChefTechnicien=u_resp,
            dateDebut=timezone.now()-timedelta(days=2),
            dateFin=timezone.now()-timedelta(days=1),
            statut='termine'
        )
        MembreIntervention.objects.create(idAffectationEquipe=aff1, idUtilisateur=u_op1, dateDebut=timezone.now()-timedelta(days=2), dateFin=timezone.now()-timedelta(days=1), minutesTravailles=210)
        MembreIntervention.objects.create(idAffectationEquipe=aff1, idUtilisateur=u_op2, dateDebut=timezone.now()-timedelta(days=2), dateFin=timezone.now()-timedelta(days=1), minutesTravailles=180)
        SuiviTemps.objects.create(idOrdreTravail=ot1, idAffectationEquipe=aff1, idUtilisateur=u_op1, heureDebut=timezone.now()-timedelta(days=2), heureFin=timezone.now()-timedelta(days=2)+timedelta(minutes=210), minutesTravailles=210, descriptionTravail='Demontage ancien moteur, pose nouveau moteur, alignement')
        PieceUtiliseeOT.objects.create(idOrdreTravail=ot1, idPiece=pc1, quantite=Decimal('2'),  prixUnitaireCapture=Decimal('95.00'))
        PieceUtiliseeOT.objects.create(idOrdreTravail=ot1, idPiece=pc4, quantite=Decimal('1'),  prixUnitaireCapture=Decimal('28.00'))
        CommentaireOT.objects.create(idOrdreTravail=ot1, idUtilisateur=u_resp, commentaire='Moteur KO - bobinage grille. Remplacement complet effectue. Machine operationnelle.', estInterne=False)
        CommentaireOT.objects.create(idOrdreTravail=ot1, idUtilisateur=u_resp, commentaire='Prevoir moteur de rechange en stock. Delai fournisseur 5 jours.', estInterne=True)
        CauseRacine.objects.create(idOrdreTravail=ot1, categorie='electrique', description='Surcharge repetee moteur due a un mauvais reglage de la protection thermique.', dateIdentification=timezone.now().date()-timedelta(days=1), idUtilisateur=u_resp)
        for anc, nouv, motif in [
            ('EN_COURS',     'CLOTURE', 'Intervention terminee, test en cours'),
        ]:
            HistoriqueStatutOT.objects.create(idOrdreTravail=ot1, ancienStatut=anc, nouveauStatut=nouv, idUtilisateur=u_resp, motif=motif)

        # OT2 - EN_COURS (fuite centrale beton)
        ot2 = OrdreTravail.objects.create(
            idActif=a9, idDemandeIntervention=di2,
            type='correctif', priorite='haute', statut='EN_COURS',
            description='Reparation fuite huile hydraulique centrale beton 30m3/h',
            dureeEstimeeMin=120,
            echeanceSLA=timezone.now()+timedelta(hours=3),
            estBloquant=False
        )
        aff2 = AffectationEquipe.objects.create(
            idOrdreTravail=ot2, idEquipe=eq3, idChefTechnicien=u_resp,
            dateDebut=timezone.now()-timedelta(hours=2), statut='en_cours'
        )
        MembreIntervention.objects.create(idAffectationEquipe=aff2, idUtilisateur=u_op1, dateDebut=timezone.now()-timedelta(hours=2), minutesTravailles=120)
        SuiviTemps.objects.create(idOrdreTravail=ot2, idAffectationEquipe=aff2, idUtilisateur=u_op1, heureDebut=timezone.now()-timedelta(hours=2), minutesTravailles=120, descriptionTravail='Vidange, remplacement joint spi verin hydraulique')
        PieceUtiliseeOT.objects.create(idOrdreTravail=ot2, idPiece=pc4,  quantite=Decimal('2'),  prixUnitaireCapture=Decimal('28.00'))
        PieceUtiliseeOT.objects.create(idOrdreTravail=ot2, idPiece=pc5,  quantite=Decimal('20'), prixUnitaireCapture=Decimal('18.00'))
        CommentaireOT.objects.create(idOrdreTravail=ot2, idUtilisateur=u_resp, commentaire='Joint spi use cote tige verin. Remplacement en cours.', estInterne=False)
        for anc, nouv, motif in [
            ('EN_COURS', 'CLOTURE', 'Equipe hydraulique siege affectee'),
        ]:
            HistoriqueStatutOT.objects.create(idOrdreTravail=ot2, ancienStatut=anc, nouveauStatut=nouv, idUtilisateur=u_resp, motif=motif)

        # OT3 - EN_COURS preventif (ligne precontrainte)
        ot3 = OrdreTravail.objects.create(
            idActif=a13, type='preventif', priorite='normale', statut='en_cours',
            description='Maintenance preventive trimestrielle - ligne de precontrainte 12m',
            dureeEstimeeMin=240,
            echeanceSLA=timezone.now()+timedelta(days=3)
        )
        HistoriqueStatutOT.objects.create(idOrdreTravail=ot3, ancienStatut='', nouveauStatut='EN_COURS', idUtilisateur=u_resp, motif='Maintenance preventive planifiee Q2 2026')

        # OT4 - EN_ATTENTE_CORRECTION sous-traite (tapis doseur)
        ot4 = OrdreTravail.objects.create(
            idActif=a12, idDemandeIntervention=di3,
            type='correctif', priorite='haute', statut='EN_ATTENTE_CORRECTION',
            description='Remplacement courroie tapis doseur granulats - Unite 6 Beton',
            dureeEstimeeMin=90,
            estSousTraite=True,
            echeanceSLA=timezone.now()-timedelta(hours=1)
        )
        AffectationEquipe.objects.create(
            idOrdreTravail=ot4, idSousTraitant=st1,
            dateDebut=timezone.now()-timedelta(days=1),
            dateFin=timezone.now()-timedelta(hours=5),
            statut='termine',
            coutPrestation=Decimal('1400.00'),
            evaluationSousTraitant=4
        )
        PieceUtiliseeOT.objects.create(idOrdreTravail=ot4, idPiece=pc7, quantite=Decimal('2'), prixUnitaireCapture=Decimal('155.00'))
        for anc, nouv, motif in [
            ('EN_COURS','DEPANNE',               'Depannage temporaire realise'),
            ('DEPANNE', 'EN_ATTENTE_CORRECTION', 'Correction definitive a planifier'),
        ]:
            HistoriqueStatutOT.objects.create(idOrdreTravail=ot4, ancienStatut=anc, nouveauStatut=nouv, idUtilisateur=u_resp, motif=motif)

        # OT5 - EN_COURS (crible vibrant Tamansourt)
        ot5 = OrdreTravail.objects.create(
            idActif=a18, idDemandeIntervention=di4,
            type='correctif', priorite='haute', statut='EN_COURS',
            description='Remplacement grilles crible vibrant 3 etages - Carriere Tamansourt',
            dureeEstimeeMin=300,
            echeanceSLA=timezone.now()+timedelta(hours=5),
            estBloquant=True
        )
        aff5 = AffectationEquipe.objects.create(
            idOrdreTravail=ot5, idEquipe=eq4, idChefTechnicien=u_resp2,
            dateDebut=timezone.now()-timedelta(hours=2), statut='en_cours'
        )
        MembreIntervention.objects.create(idAffectationEquipe=aff5, idUtilisateur=u_resp2, dateDebut=timezone.now()-timedelta(hours=2), minutesTravailles=120)
        SuiviTemps.objects.create(idOrdreTravail=ot5, idAffectationEquipe=aff5, idUtilisateur=u_resp2, heureDebut=timezone.now()-timedelta(hours=2), minutesTravailles=120, descriptionTravail='Demontage grilles usees, pose grilles neuves maille 40mm')
        PieceUtiliseeOT.objects.create(idOrdreTravail=ot5, idPiece=pc16, quantite=Decimal('2'), prixUnitaireCapture=Decimal('650.00'))
        PieceUtiliseeOT.objects.create(idOrdreTravail=ot5, idPiece=pc17, quantite=Decimal('2'), prixUnitaireCapture=Decimal('620.00'))
        CommentaireOT.objects.create(idOrdreTravail=ot5, idUtilisateur=u_resp2, commentaire='Grilles maille 40mm remplacees. Grilles maille 20mm en attente.', estInterne=False)
        for anc, nouv, motif in [
            ('EN_COURS', 'DEPANNE', 'Equipe mecanique Tamansourt affectee'),
        ]:
            HistoriqueStatutOT.objects.create(idOrdreTravail=ot5, ancienStatut=anc, nouveauStatut=nouv, idUtilisateur=u_resp2, motif=motif)

        # OT6 - EN_COURS preventif (concasseur Ait Ourir)
        ot6 = OrdreTravail.objects.create(
            idActif=a20, type='preventif', priorite='normale', statut='EN_COURS',
            description='Maintenance preventive mensuelle - concasseur secondaire Ait Ourir',
            dureeEstimeeMin=180,
            echeanceSLA=timezone.now()+timedelta(days=5)
        )
        HistoriqueStatutOT.objects.create(idOrdreTravail=ot6, ancienStatut='', nouveauStatut='EN_COURS', idUtilisateur=u_resp2, motif='Maintenance preventive mensuelle planifiee')

        # OT7 - CLOTURE (filtre hydraulique SOSAMAC)
        ot7 = OrdreTravail.objects.create(
            idActif=a23, type='correctif', priorite='normale', statut='CLOTURE',
            description='Remplacement filtre hydraulique concasseur mobile SOSAMAC',
            dureeEstimeeMin=60, dureeReelleMin=50,
            dateCloture=timezone.now()-timedelta(days=4),
            typeCloture='corrige',
            echeanceSLA=timezone.now()-timedelta(days=4)+timedelta(minutes=480)
        )
        aff7 = AffectationEquipe.objects.create(
            idOrdreTravail=ot7, idEquipe=eq6, idChefTechnicien=u_resp2,
            dateDebut=timezone.now()-timedelta(days=5),
            dateFin=timezone.now()-timedelta(days=4),
            statut='termine'
        )
        MembreIntervention.objects.create(idAffectationEquipe=aff7, idUtilisateur=u_resp2, dateDebut=timezone.now()-timedelta(days=5), dateFin=timezone.now()-timedelta(days=4), minutesTravailles=50)
        SuiviTemps.objects.create(idOrdreTravail=ot7, idAffectationEquipe=aff7, idUtilisateur=u_resp2, heureDebut=timezone.now()-timedelta(days=5), heureFin=timezone.now()-timedelta(days=5)+timedelta(minutes=50), minutesTravailles=50, descriptionTravail='Vidange, remplacement filtre hydraulique HF-200, purge circuit')
        PieceUtiliseeOT.objects.create(idOrdreTravail=ot7, idPiece=pc9, quantite=Decimal('1'),  prixUnitaireCapture=Decimal('70.00'))
        PieceUtiliseeOT.objects.create(idOrdreTravail=ot7, idPiece=pc5, quantite=Decimal('20'), prixUnitaireCapture=Decimal('18.00'))
        CommentaireOT.objects.create(idOrdreTravail=ot7, idUtilisateur=u_resp2, commentaire='Filtre colmate. Remplacement effectue. Pression hydraulique revenue a la normale.', estInterne=False)
        CauseRacine.objects.create(idOrdreTravail=ot7, categorie='mecanique', description='Filtre non remplace a la frequence preconisee. Plan de maintenance a revoir.', dateIdentification=timezone.now().date()-timedelta(days=4), idUtilisateur=u_resp2)
        for anc, nouv, motif in [
            ('',             'EN_COURS',        'Cree suite constat terrain SOSAMAC'),
            ('EN_COURS',       'CLOTURE',      'Equipe SOSAMAC affectee'),
            ('CLOTURE','DEPANNE',          'Pression hydraulique OK, machine validee'),
        ]:
            HistoriqueStatutOT.objects.create(idOrdreTravail=ot7, ancienStatut=anc, nouveauStatut=nouv, idUtilisateur=u_resp2, motif=motif)

        self.stdout.write('Demandes et OT crees')

        # ── RESUME ────────────────────────────────────
        self.stdout.write('\n' + '=' * 55)
        self.stdout.write('DONNEES DE DEMO INSEREES AVEC SUCCES')
        self.stdout.write('=' * 55)
        self.stdout.write(f'  Societes       : {Societe.objects.count()}  (CarriPrefa, SOSAMAC)')
        self.stdout.write(f'  Sites          : {Site.objects.count()}  (Siege, Tamansourt, Ait Ourir, SOSAMAC)')
        self.stdout.write(f'  Utilisateurs   : {Utilisateur.objects.count()} (mdp: Admin123!)')
        self.stdout.write(f'  Actifs         : {Actif.objects.count()}')
        self.stdout.write(f'  Pieces         : {Piece.objects.count()}')
        self.stdout.write(f'  Sous-traitants : {SousTraitant.objects.count()}')
        self.stdout.write(f'  Demandes (DI)  : {DemandeIntervention.objects.count()}')
        self.stdout.write(f'  Ordres (OT)    : {OrdreTravail.objects.count()}')
        self.stdout.write('=' * 55)
        self.stdout.write('  admin        / Admin123!  - Administrateur')
        self.stdout.write('  responsable  / Admin123!  - Resp. Techniciens (CarriPrefa Siege)')
        self.stdout.write('  operateur1   / Admin123!  - Operateur')
        self.stdout.write('  operateur2   / Admin123!  - Operateur')
        self.stdout.write('  operateur3   / Admin123!  - Operateur')
        self.stdout.write('  magasinier1  / Admin123!  - Magasinier')
        self.stdout.write('  directeur    / Admin123!  - Directeur Technique')
        self.stdout.write('  resp_ssm     / Admin123!  - Resp. Maintenance (SOSAMAC)')
        self.stdout.write('=' * 55)