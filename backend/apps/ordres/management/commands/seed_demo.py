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

        # ── NETTOYAGE DES DONNÉES EXISTANTES ──────────
        self.stdout.write('🧹 Nettoyage des données existantes...')
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
        self.stdout.write('✅ Tables nettoyées')

        pwd = sha('Admin123!')

        # ── ROLES ─────────────────────────────────────
        r_admin = Role.objects.create(code='ADMIN',      libelle='Administrateur',          niveau=5, est_actif=True)
        r_resp  = Role.objects.create(code='RESP_TECH',  libelle='Responsable Techniciens', niveau=3, est_actif=True)
        r_resp_maint = Role.objects.create(code='RESP_MAINT', libelle='Responsable Maintenance', niveau=3, est_actif=True)
        r_dir_tech = Role.objects.create(code='DIR_TECH', libelle='Directeur Technique',    niveau=4, est_actif=True)
        r_op    = Role.objects.create(code='OPERATEUR',  libelle='Opérateur',               niveau=1, est_actif=True)
        r_mag   = Role.objects.create(code='MAGASINIER', libelle='Magasinier',              niveau=1, est_actif=True)
        self.stdout.write('✅ Rôles créés')

        # ── PERMISSIONS ───────────────────────────────
        p1 = Permission.objects.create(code='LIRE_OT',      module='ordres',  action='lire',    ressource='OrdreTravail',   est_actif=True)
        p2 = Permission.objects.create(code='CREER_OT',     module='ordres',  action='creer',   ressource='OrdreTravail',   est_actif=True)
        p3 = Permission.objects.create(code='LIRE_STOCK',   module='magasin', action='lire',    ressource='Piece',          est_actif=True)
        p4 = Permission.objects.create(code='SORTIE_STOCK', module='magasin', action='modifier',ressource='MouvementStock', est_actif=True)
        p5 = Permission.objects.create(code='LIRE_ACTIF',   module='actifs',  action='lire',    ressource='Actif',          est_actif=True)
        for role in [r_admin, r_resp, r_resp_maint, r_dir_tech]:
            for perm in [p1, p2, p3, p4, p5]:
                RolePermission.objects.create(id_role=role, id_permission=perm)
        RolePermission.objects.create(id_role=r_mag, id_permission=p3)
        RolePermission.objects.create(id_role=r_mag, id_permission=p4)
        RolePermission.objects.create(id_role=r_op,  id_permission=p1)
        RolePermission.objects.create(id_role=r_op,  id_permission=p5)
        self.stdout.write('✅ Permissions créées')

        # ── UTILISATEURS ──────────────────────────────
        u_admin = Utilisateur.objects.create(nom_utilisateur='admin',       email='admin@gmao.ma',  mot_de_passe_hash=pwd, prenom='Mohammed', nom='Admin',   est_actif=True)
        u_resp  = Utilisateur.objects.create(nom_utilisateur='responsable', email='resp@gmao.ma',   mot_de_passe_hash=pwd, prenom='Ahmed',    nom='Benali',  est_actif=True)
        u_op1   = Utilisateur.objects.create(nom_utilisateur='operateur1',  email='op1@gmao.ma',    mot_de_passe_hash=pwd, prenom='Karim',    nom='Alaoui',  est_actif=True)
        u_op2   = Utilisateur.objects.create(nom_utilisateur='operateur2',  email='op2@gmao.ma',    mot_de_passe_hash=pwd, prenom='Youssef',  nom='Bennani', est_actif=True)
        u_mag   = Utilisateur.objects.create(nom_utilisateur='magasinier1', email='mag1@gmao.ma',   mot_de_passe_hash=pwd, prenom='Sara',     nom='Tazi',    est_actif=True)
        u_dir   = Utilisateur.objects.create(nom_utilisateur='directeur',   email='dir@gmao.ma',    mot_de_passe_hash=pwd, prenom='Rachid',   nom='Idrissi', est_actif=True)
        for u, r in [(u_admin,r_admin),(u_resp,r_resp),(u_op1,r_op),(u_op2,r_op),(u_mag,r_mag),(u_dir,r_dir_tech)]:
            UtilisateurRole.objects.create(id_utilisateur=u, id_role=r)
        JournalAudit.objects.create(id_utilisateur=u_admin, action='CONNEXION', module='securite', type_entite='Utilisateur', id_entite=str(u_admin.id), adresse_ip='127.0.0.1')
        self.stdout.write('✅ Utilisateurs créés')

        # ── ORGANISATION ──────────────────────────────
# ── ORGANISATION ──────────────────────────────
        soc   = Societe.objects.create(code='SOC-001', raisonSociale='Industrie Maroc SA', estActif=True)
        site1 = Site.objects.create(societe=soc, code='SITE-CAS', libelle='Usine Casablanca', ville='Casablanca', estActif=True)
        site2 = Site.objects.create(societe=soc, code='SITE-RBA', libelle='Usine Rabat',      ville='Rabat',      estActif=True)
        sect1 = Secteur.objects.create(site=site1, code='PROD-A', libelle='Production Ligne A')
        sect2 = Secteur.objects.create(site=site1, code='PROD-B', libelle='Production Ligne B')
        sect3 = Secteur.objects.create(site=site2, code='PROD-C', libelle='Production Ligne C')
        unit1 = Unite.objects.create(secteur=sect1, code='UNIT-A1', libelle='Unité Embouteillage')
        unit2 = Unite.objects.create(secteur=sect1, code='UNIT-A2', libelle='Unité Conditionnement')
        unit3 = Unite.objects.create(secteur=sect2, code='UNIT-B1', libelle='Unité Assemblage')
        unit4 = Unite.objects.create(secteur=sect3, code='UNIT-C1', libelle='Unité Découpe')
        sp_meca = Specialite.objects.create(code='MECA', libelle='Mécanique')
        sp_elec = Specialite.objects.create(code='ELEC', libelle='Électricien')
        sp_auto = Specialite.objects.create(code='AUTO', libelle='Automatisme')
        sp_hydr = Specialite.objects.create(code='HYDR', libelle='Hydraulique')
        sp_pneu = Specialite.objects.create(code='PNEU', libelle='Pneumatique')
        eq1 = Equipe.objects.create(site=site1, specialite=sp_meca, libelle='Équipe Mécanique CAS',   estActif=True)
        eq2 = Equipe.objects.create(site=site1, specialite=sp_elec, libelle='Équipe Électrique CAS',  estActif=True)
        eq3 = Equipe.objects.create(site=site2, specialite=sp_auto, libelle='Équipe Automatisme RBA', estActif=True)
        EquipeUtilisateur.objects.create(equipe=eq1, utilisateur=u_resp, niveauRole='chef',   estActif=True)
        EquipeUtilisateur.objects.create(equipe=eq1, utilisateur=u_op1,  niveauRole='membre', estActif=True)
        EquipeUtilisateur.objects.create(equipe=eq2, utilisateur=u_op2,  niveauRole='membre', estActif=True)
        AppartenanceOrganisationnelle.objects.create(utilisateur=u_resp, societe=soc, site=site1, estPrincipale=True)
        AppartenanceOrganisationnelle.objects.create(utilisateur=u_op1,  societe=soc, site=site1, estPrincipale=True)
        AppartenanceOrganisationnelle.objects.create(utilisateur=u_mag,  societe=soc, site=site1, estPrincipale=True)
        self.stdout.write('✅ Organisation créée')

        # ── ACTIFS ────────────────────────────────────
# ── ACTIFS ────────────────────────────────────
        a1 = Actif.objects.create(idUnite=unit1, code='ACT-001', libelle='Compresseur Principal',   type='machine',    statut='en_service', numSerie='CP-2021-001', fabricant='Atlas Copco', estActif=True)
        a2 = Actif.objects.create(idUnite=unit1, code='ACT-002', libelle='Pompe Hydraulique PH-01', type='machine',    statut='en_service', numSerie='PH-2020-002', fabricant='Parker',      estActif=True)
        a3 = Actif.objects.create(idUnite=unit2, code='ACT-003', libelle='Convoyeur Ligne A',       type='equipement', statut='en_service', numSerie='CV-2019-003', fabricant='Interroll',   estActif=True)
        a4 = Actif.objects.create(idUnite=unit3, code='ACT-004', libelle='Robot Assemblage R1',     type='machine',    statut='en_panne',   numSerie='RA-2022-004', fabricant='ABB',         estActif=True)
        a5 = Actif.objects.create(idUnite=unit4, code='ACT-005', libelle='Presse Hydraulique 50T',  type='machine',    statut='en_service', numSerie='PH-2018-005', fabricant='Schuler',     estActif=True)
        Actif.objects.create(idUnite=unit1, idParent=a1, code='ACT-006', libelle='Moteur Électrique M1', type='composant', statut='en_service', fabricant='Siemens', estActif=True)
        HistoriqueStatut.objects.create(idActif=a4, ancienStatut='en_service', nouveauStatut='en_panne', motif='Panne bras robotique', modifiePar=u_op1)
        Indisponibilite.objects.create(idActif=a4, dateDebut=timezone.now()-timedelta(hours=5), motif='Panne bras robotique', type='panne')

        # ── MAGASIN ───────────────────────────────────
        pc1 = Piece.objects.create(reference='ROUL-001', designation='Roulement à billes 6205',   categorie='Roulements',   unite='piece', emplacement='A1-E1-N1', quantiteStock=Decimal('13'), seuilMinimum=Decimal('5'),  prixUnitaire=Decimal('85.00'),  fournisseur='SKF Maroc',   estActif=True)
        pc2 = Piece.objects.create(reference='JOINT-002',designation='Joint torique 50x3',        categorie='Joints',       unite='piece', emplacement='A1-E2-N1', quantiteStock=Decimal('1'),  seuilMinimum=Decimal('10'), prixUnitaire=Decimal('12.50'),  fournisseur='Parker',      estActif=True)
        pc3 = Piece.objects.create(reference='HUILE-003',designation='Huile hydraulique ISO 46',  categorie='Lubrifiants',  unite='L',     emplacement='A2-E1-N1', quantiteStock=Decimal('50'), seuilMinimum=Decimal('20'), prixUnitaire=Decimal('18.00'),  fournisseur='Total Maroc', estActif=True)
        pc4 = Piece.objects.create(reference='COURR-004',designation='Courroie trapézoïdale B75', categorie='Transmission', unite='piece', emplacement='A1-E3-N2', quantiteStock=Decimal('2'),  seuilMinimum=Decimal('3'),  prixUnitaire=Decimal('145.00'), fournisseur='Gates',       estActif=True)
        pc5 = Piece.objects.create(reference='FILTR-005',designation='Filtre hydraulique HF-200', categorie='Filtration',   unite='piece', emplacement='A2-E2-N1', quantiteStock=Decimal('8'),  seuilMinimum=Decimal('4'),  prixUnitaire=Decimal('65.00'),  fournisseur='Bosch',       estActif=True)
        pc6 = Piece.objects.create(reference='FUSIB-006',designation='Fusible 16A rapide',        categorie='Électrique',   unite='piece', emplacement='A3-E1-N1', quantiteStock=Decimal('25'), seuilMinimum=Decimal('10'), prixUnitaire=Decimal('3.50'),   fournisseur='Schneider',   estActif=True)
        MouvementStock.objects.create(idPiece=pc1, typeMouvement='entree', quantite=Decimal('15'), stockAvant=Decimal('0'),  stockApres=Decimal('15'), idUtilisateurMagasinier=u_mag, commentaire='Stock initial')
        MouvementStock.objects.create(idPiece=pc1, typeMouvement='sortie', quantite=Decimal('2'),  stockAvant=Decimal('15'),stockApres=Decimal('13'), idUtilisateurMagasinier=u_mag, commentaire='OT-2026-0001')
        MouvementStock.objects.create(idPiece=pc2, typeMouvement='entree', quantite=Decimal('15'), stockAvant=Decimal('0'),  stockApres=Decimal('15'), idUtilisateurMagasinier=u_mag, commentaire='Stock initial')
        MouvementStock.objects.create(idPiece=pc2, typeMouvement='sortie', quantite=Decimal('14'), stockAvant=Decimal('15'),stockApres=Decimal('1'),  idUtilisateurMagasinier=u_mag, commentaire='OT-2026-0004')
        self.stdout.write('✅ Magasin créé')

        # ── SOUS-TRAITANTS ────────────────────────────
        st1 = SousTraitant.objects.create(raisonSociale='TechMaint Maroc SARL', adresse='Zone Industrielle Ain Sebaa', contactPrincipalNom='Hassan Filali',  contactPrincipalTel='0661234567', contactPrincipalEmail='h.filali@techmaint.ma',  tarifHoraireNormal=Decimal('350'), tarifHoraireSemaine=Decimal('500'), statut='actif',    estActif=True, idUtilisateurCreateur=u_admin)
        st2 = SousTraitant.objects.create(raisonSociale='ElectroPro Services',  adresse='Quartier Industriel, Rabat', contactPrincipalNom='Mehdi Chraibi',  contactPrincipalTel='0677654321', contactPrincipalEmail='m.chraibi@electropro.ma', tarifHoraireNormal=Decimal('400'), tarifHoraireSemaine=Decimal('600'), statut='actif',    estActif=True, idUtilisateurCreateur=u_admin)
        st3 = SousTraitant.objects.create(raisonSociale='AutoSystems SARL',     adresse='Technopole Casablanca',      contactPrincipalNom='Nadia Berrada',  contactPrincipalTel='0655443322', contactPrincipalEmail='n.berrada@autosystems.ma', tarifHoraireNormal=Decimal('500'), tarifHoraireSemaine=Decimal('750'), statut='suspendu', estActif=False, idUtilisateurCreateur=u_admin)
        SousTraitantSpecialite.objects.create(idSousTraitant=st1, idSpecialite=sp_meca)
        SousTraitantSpecialite.objects.create(idSousTraitant=st1, idSpecialite=sp_hydr)
        SousTraitantSpecialite.objects.create(idSousTraitant=st2, idSpecialite=sp_elec)
        SousTraitantSpecialite.objects.create(idSousTraitant=st3, idSpecialite=sp_auto)
        self.stdout.write('✅ Sous-traitants créés')

        # ── SLA ───────────────────────────────────────
        ConfigurationSLA.objects.create(idSite=site1, typeOrdreTravail='correctif', priorite='critique', delaiAffectationMin=30,  delaiResolutionMin=120,  estActif=True)
        ConfigurationSLA.objects.create(idSite=site1, typeOrdreTravail='correctif', priorite='haute',    delaiAffectationMin=120, delaiResolutionMin=480,  estActif=True)
        ConfigurationSLA.objects.create(idSite=site1, typeOrdreTravail='correctif', priorite='normale',  delaiAffectationMin=240, delaiResolutionMin=1440, estActif=True)
        ConfigurationSLA.objects.create(idSite=site2, typeOrdreTravail='correctif', priorite='critique', delaiAffectationMin=45,  delaiResolutionMin=180,  estActif=True)
        self.stdout.write('✅ Configuration SLA créée')

        # ── DEMANDES & OT ─────────────────────────────
        di1 = DemandeIntervention.objects.create(idActif=a1, idUtilisateurSignalement=u_op1, description='Bruit anormal compresseur, vibrations importantes', urgence='haute',    statut='validee',    idUtilisateurValidation=u_resp, dateValidation=timezone.now()-timedelta(days=3))
        di2 = DemandeIntervention.objects.create(idActif=a4, idUtilisateurSignalement=u_op1, description='Robot bras bloqué en position initiale, alarme rouge', urgence='critique', statut='validee',    idUtilisateurValidation=u_resp, dateValidation=timezone.now()-timedelta(hours=4))
        di3 = DemandeIntervention.objects.create(idActif=a2, idUtilisateurSignalement=u_op2, description='Fuite légère huile hydraulique joint pompe PH-01',   urgence='normale',  statut='en_attente')
        di4 = DemandeIntervention.objects.create(idActif=a3, idUtilisateurSignalement=u_op1, description='Bruit convoyeur',                                     urgence='basse',    statut='rejetee',    idUtilisateurValidation=u_resp, dateValidation=timezone.now()-timedelta(days=1), motifRejet='Bruit normal de fonctionnement.')

        # OT1 — CLOTURE
        ot1 = OrdreTravail.objects.create(idActif=a1, idDemandeIntervention=di1, type='correctif', priorite='haute', statut='CLOTURE', description='Remplacement roulement compresseur', dureeEstimeeMin=120, dureeReelleMin=95, dateCloture=timezone.now()-timedelta(days=2), typeCloture='corrige', echeanceSLA=timezone.now()-timedelta(days=2)+timedelta(minutes=480))
        aff1 = AffectationEquipe.objects.create(idOrdreTravail=ot1, idEquipe=eq1, idChefTechnicien=u_resp, dateDebut=timezone.now()-timedelta(days=3), dateFin=timezone.now()-timedelta(days=2), statut='termine')
        MembreIntervention.objects.create(idAffectationEquipe=aff1, idUtilisateur=u_op1, dateDebut=timezone.now()-timedelta(days=3), dateFin=timezone.now()-timedelta(days=2), minutesTravailles=95)
        SuiviTemps.objects.create(idOrdreTravail=ot1, idAffectationEquipe=aff1, idUtilisateur=u_op1, heureDebut=timezone.now()-timedelta(days=3), heureFin=timezone.now()-timedelta(days=3)+timedelta(minutes=95), minutesTravailles=95, descriptionTravail='Remplacement roulement 6205')
        PieceUtiliseeOT.objects.create(idOrdreTravail=ot1, idPiece=pc1, quantite=Decimal('2'), prixUnitaireCapture=Decimal('85.00'))
        CommentaireOT.objects.create(idOrdreTravail=ot1, idUtilisateur=u_resp, commentaire='Roulement usé. Prévoir inspection dans 6 mois.', estInterne=False)
        CommentaireOT.objects.create(idOrdreTravail=ot1, idUtilisateur=u_resp, commentaire='Fournisseur SKF délai 3j. Prévoir stock de sécurité.', estInterne=True)
        CauseRacine.objects.create(idOrdreTravail=ot1, categorie='mecanique', description='Roulement en fin de vie après 18 mois.', dateIdentification=timezone.now().date()-timedelta(days=2), idUtilisateur=u_resp)
        for anc, nouv, motif in [('','OUVERT','Créé depuis DI'),('OUVERT','EN_COURS','Équipe affectée'),('EN_COURS','EN_VALIDATION','Intervention terminée'),('EN_VALIDATION','CLOTURE','Machine OK confirmée')]:
            HistoriqueStatutOT.objects.create(idOrdreTravail=ot1, ancienStatut=anc, nouveauStatut=nouv, idUtilisateur=u_resp, motif=motif)

        # OT2 — EN_COURS critique
        ot2 = OrdreTravail.objects.create(idActif=a4, idDemandeIntervention=di2, type='correctif', priorite='critique', statut='EN_COURS', description='Diagnostic et réparation bras robotique ABB', dureeEstimeeMin=240, echeanceSLA=timezone.now()+timedelta(hours=2), estBloquant=True)
        aff2 = AffectationEquipe.objects.create(idOrdreTravail=ot2, idEquipe=eq1, idChefTechnicien=u_resp, dateDebut=timezone.now()-timedelta(hours=3), statut='en_cours')
        MembreIntervention.objects.create(idAffectationEquipe=aff2, idUtilisateur=u_resp, dateDebut=timezone.now()-timedelta(hours=3), minutesTravailles=180)
        SuiviTemps.objects.create(idOrdreTravail=ot2, idAffectationEquipe=aff2, idUtilisateur=u_resp, heureDebut=timezone.now()-timedelta(hours=3), minutesTravailles=180, descriptionTravail='Diagnostic servo-moteur axe 2')
        CommentaireOT.objects.create(idOrdreTravail=ot2, idUtilisateur=u_resp, commentaire='Servo-moteur axe 2 grillé. En attente devis.', estInterne=False)
        for anc, nouv, motif in [('','OUVERT','Créé depuis DI'),('OUVERT','EN_COURS','Équipe affectée — urgence critique')]:
            HistoriqueStatutOT.objects.create(idOrdreTravail=ot2, ancienStatut=anc, nouveauStatut=nouv, idUtilisateur=u_resp, motif=motif)

        # OT3 — OUVERT préventif
        ot3 = OrdreTravail.objects.create(idActif=a5, type='preventif', priorite='normale', statut='OUVERT', description='Maintenance préventive trimestrielle presse hydraulique', dureeEstimeeMin=180, echeanceSLA=timezone.now()+timedelta(days=3))
        HistoriqueStatutOT.objects.create(idOrdreTravail=ot3, ancienStatut='', nouveauStatut='OUVERT', idUtilisateur=u_resp, motif='Maintenance préventive planifiée')

        # OT4 — EN_ATTENTE_CORRECTION sous-traité
        ot4 = OrdreTravail.objects.create(idActif=a2, type='correctif', priorite='haute', statut='EN_ATTENTE_CORRECTION', description='Remplacement joint pompe hydraulique PH-01', dureeEstimeeMin=90, estSousTraite=True, echeanceSLA=timezone.now()-timedelta(hours=1))
        AffectationEquipe.objects.create(idOrdreTravail=ot4, idSousTraitant=st1, dateDebut=timezone.now()-timedelta(days=1), dateFin=timezone.now()-timedelta(hours=6), statut='termine', coutPrestation=Decimal('1200.00'), evaluationSousTraitant=4)
        PieceUtiliseeOT.objects.create(idOrdreTravail=ot4, idPiece=pc2, quantite=Decimal('2'), prixUnitaireCapture=Decimal('12.50'))
        for anc, nouv, motif in [('','OUVERT',''),('OUVERT','EN_COURS','Sous-traitant TechMaint affecté'),('EN_COURS','DEPANNE','Dépannage temporaire'),('DEPANNE','EN_ATTENTE_CORRECTION','Correction définitive à planifier')]:
            HistoriqueStatutOT.objects.create(idOrdreTravail=ot4, ancienStatut=anc, nouveauStatut=nouv, idUtilisateur=u_resp, motif=motif)

        self.stdout.write('✅ Demandes & OT créés')

        # ── RÉSUMÉ ────────────────────────────────────
        self.stdout.write('\n' + '='*50)
        self.stdout.write('🎉 DONNÉES DE DÉMO INSÉRÉES AVEC SUCCÈS')
        self.stdout.write('='*50)
        self.stdout.write(f'  Utilisateurs  : {Utilisateur.objects.count()} (mdp: Admin123!)')
        self.stdout.write(f'  Actifs        : {Actif.objects.count()}')
        self.stdout.write(f'  Pièces        : {Piece.objects.count()}')
        self.stdout.write(f'  Sous-traitants: {SousTraitant.objects.count()}')
        self.stdout.write(f'  Demandes (DI) : {DemandeIntervention.objects.count()}')
        self.stdout.write(f'  Ordres (OT)   : {OrdreTravail.objects.count()}')
        self.stdout.write('='*50)
        self.stdout.write('  admin        / Admin123!')
        self.stdout.write('  responsable  / Admin123!')
        self.stdout.write('  operateur1   / Admin123!')
        self.stdout.write('  magasinier1  / Admin123!')
        self.stdout.write('  directeur    / Admin123!')
        self.stdout.write('='*50)