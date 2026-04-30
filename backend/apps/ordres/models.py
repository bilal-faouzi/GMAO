import uuid
from django.db import models
from django.utils import timezone
from apps.core.models import BaseModel
from django.db import transaction
from django.db.models import Max


def generer_numero_di():
    annee = timezone.now().year
    with transaction.atomic():
        dernier = (
            DemandeIntervention.objects
            .select_for_update()          # Verrouille les lectures concurrentes
            .filter(numero__startswith=f"DI-{annee}-")
            .aggregate(Max('numero'))['numero__max']
        )
        if dernier:
            dernier_num = int(dernier.split('-')[-1])
        else:
            dernier_num = 0
        return f"DI-{annee}-{dernier_num + 1:04d}"


def generer_numero_ot():
    annee = timezone.now().year
    with transaction.atomic():
        dernier = (
            OrdreTravail.objects
            .select_for_update()
            .filter(numero__startswith=f"OT-{annee}-")
            .aggregate(Max('numero'))['numero__max']
        )
        if dernier:
            dernier_num = int(dernier.split('-')[-1])
        else:
            dernier_num = 0
        return f"OT-{annee}-{dernier_num + 1:04d}"


class DemandeIntervention(BaseModel):
    URGENCE_CHOICES = [
        ('critique', 'Critique'),
        ('haute',    'Haute'),
        ('normale',  'Normale'),
        ('basse',    'Basse'),
    ]
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('validee',    'Validée'),
        ('rejetee',    'Rejetée'),
    ]

    id                       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    titre                    = models.CharField(blank=True)
    numero                   = models.CharField(max_length=20, unique=True, blank=True)
    idActif                  = models.ForeignKey('actifs.Actif', on_delete=models.CASCADE, related_name='demandes')
    idUtilisateurSignalement = models.ForeignKey('securite.Utilisateur', on_delete=models.SET_NULL, null=True, related_name='demandes_signalee')
    dateSignalement          = models.DateTimeField(auto_now_add=True)
    description              = models.TextField(blank=True)
    urgence                  = models.CharField(max_length=10, choices=URGENCE_CHOICES)
    statut                   = models.CharField(max_length=15, choices=STATUT_CHOICES, default='en_attente')
    idUtilisateurValidation  = models.ForeignKey('securite.Utilisateur', on_delete=models.SET_NULL, null=True, blank=True, related_name='demandes_validees')
    dateValidation           = models.DateTimeField(null=True, blank=True)
    motifRejet               = models.TextField(blank=True)
    isencours                 = models.BooleanField(default=True)
    class Meta:
        ordering = ['-dateSignalement']
        verbose_name = "Demande d'intervention"
        verbose_name_plural = "Demandes d'intervention"

    # ✅ models.py — DemandeIntervention.save()
    def save(self, *args, **kwargs):
        if not self.numero:
            with transaction.atomic():
                self.numero = generer_numero_di()
                super().save(*args, **kwargs)
                return   # évite le double save()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.numero} — {self.idActif.code}"


class PieceJointeDI(models.Model):
    id                    = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idDemandeIntervention = models.ForeignKey(DemandeIntervention, on_delete=models.CASCADE, related_name='pieces_jointes')
    nomFichier            = models.CharField(max_length=255)
    typeFichier           = models.CharField(max_length=50)
    url                   = models.URLField()
    dateTeleversement     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-dateTeleversement']
        verbose_name = 'Pièce jointe DI'

    def __str__(self):
        return f"{self.nomFichier} ({self.idDemandeIntervention.numero})"


class OrdreTravail(BaseModel):
    TYPE_CHOICES = [
        ('correctif',    'Correctif'),
        ('preventif',    'Préventif'),
        ('amelioration', 'Amélioration'),
    ]
    PRIORITE_CHOICES = [
        ('critique', 'Critique'),
        ('haute',    'Haute'),
        ('normale',  'Normale'),
        ('basse',    'Basse'),
    ]
    STATUT_CHOICES = [
        ('REJETE',               'Rejeté'),
        ('EN_COURS',              'En cours'),
        ('DEPANNE',               'Dépanné'),
        ('CLOTURE',               'Clôturé'),
    ]
    CLOTURE_CHOICES = [
        ('corrige', 'Corrigé définitivement'),
        ('depanne', 'Dépanné temporairement'),
        ('annule',  'Annulé'),
    ]

    id                    = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    numero                = models.CharField(max_length=20, unique=True, blank=True)
    idActif               = models.ForeignKey('actifs.Actif', on_delete=models.CASCADE, related_name='ordres_travail')
    idDemandeIntervention = models.ForeignKey(DemandeIntervention, on_delete=models.SET_NULL, null=True, blank=True, related_name='ordres_travail')
    type                  = models.CharField(max_length=15, choices=TYPE_CHOICES, default='correctif')
    priorite              = models.CharField(max_length=10, choices=PRIORITE_CHOICES)
    statut                = models.CharField(max_length=25, choices=STATUT_CHOICES, default='EN_COURS')
    estSousTraite         = models.BooleanField(default=False)
    estBloquant           = models.BooleanField(default=False)
    echeanceSLA           = models.DateTimeField(null=True, blank=True)
    dureeEstimeeMin       = models.IntegerField(null=True, blank=True)
    dureeReelleMin        = models.IntegerField(null=True, blank=True)
    coutMainOeuvre        = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    coutSousTraitance     = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    dateCloture           = models.DateTimeField(null=True, blank=True)
    typeCloture           = models.CharField(max_length=10, choices=CLOTURE_CHOICES, blank=True)
    description           = models.TextField(blank=True)
    isvalide              = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Ordre de travail'
        verbose_name_plural = 'Ordres de travail'

    # ✅ models.py — DemandeIntervention.save()
    def save(self, *args, **kwargs):
        if not self.numero:
            with transaction.atomic():
                self.numero = generer_numero_ot()
                super().save(*args, **kwargs)
                return   # évite le double save()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.numero} — {self.idActif.code} [{self.statut}]"

    @property
    def est_en_retard(self):
        if self.echeanceSLA and self.statut != 'CLOTURE':
            return timezone.now() > self.echeanceSLA
        return False

    @property
    def cout_total(self):
        mo     = float(self.coutMainOeuvre or 0)
        st     = float(self.coutSousTraitance or 0)
        pieces = sum(float(p.cout_total or 0) for p in self.pieces_utilisees.all())
        return round(mo + st + pieces, 2)


class AffectationEquipe(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('en_cours',   'En cours'),
        ('termine',    'Terminé'),
        ('rejeter',    'Rejeté'),
    ]

    id                     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idOrdreTravail         = models.ForeignKey(OrdreTravail, on_delete=models.CASCADE, related_name='affectations')
    idEquipe               = models.ForeignKey('organisation.Equipe', on_delete=models.SET_NULL, null=True, blank=True, related_name='affectations')
    idChefTechnicien       = models.ForeignKey('securite.Utilisateur', on_delete=models.SET_NULL, null=True, blank=True, related_name='affectations_chef')
    idSousTraitant         = models.ForeignKey('soustraitants.SousTraitant', on_delete=models.SET_NULL, null=True, blank=True, related_name='affectations')
    dateDebut              = models.DateTimeField()
    dateFin                = models.DateTimeField(null=True, blank=True)
    statut                 = models.CharField(max_length=15, choices=STATUT_CHOICES, default='en_attente')
    coutPrestation         = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    evaluationSousTraitant = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-dateDebut']
        verbose_name = 'Affectation équipe'

    def __str__(self):
        equipe = self.idEquipe.libelle if self.idEquipe else str(self.idSousTraitant)
        return f"{self.idOrdreTravail.numero} → {equipe}"


class MembreIntervention(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idAffectationEquipe = models.ForeignKey(AffectationEquipe, on_delete=models.CASCADE, related_name='membres')
    idUtilisateur       = models.ForeignKey('securite.Utilisateur', on_delete=models.CASCADE, related_name='interventions')
    dateDebut           = models.DateTimeField()
    dateFin             = models.DateTimeField(null=True, blank=True)
    minutesTravailles   = models.IntegerField(default=0)

    class Meta:
        ordering = ['-dateDebut']
        verbose_name = 'Membre intervention'

    def __str__(self):
        return f"{self.idUtilisateur} — {self.idAffectationEquipe}"
    
class SuiviTemps(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idOrdreTravail      = models.ForeignKey(
                            OrdreTravail,
                            on_delete=models.CASCADE,
                            related_name='suivis_temps'
                          )
    idAffectationEquipe = models.ForeignKey(
                            AffectationEquipe,
                            on_delete=models.CASCADE,
                            related_name='suivis_temps'
                          )
    idUtilisateur       = models.ForeignKey(
                            'securite.Utilisateur',
                            on_delete=models.CASCADE,
                            related_name='suivis_temps'
                          )
    heureDebut          = models.DateTimeField()
    heureFin            = models.DateTimeField(null=True, blank=True)
    minutesTravailles   = models.IntegerField(default=0)
    descriptionTravail  = models.TextField(blank=True)

    class Meta:
        ordering = ['-heureDebut']
        verbose_name = 'Suivi temps'

    def __str__(self):
        return f"{self.idUtilisateur} — {self.idOrdreTravail.numero}"

    @property
    def duree_calculee(self):
        if self.heureFin:
            delta = self.heureFin - self.heureDebut
            return int(delta.total_seconds() / 60)
        return None
    
class PieceUtiliseeOT(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idOrdreTravail      = models.ForeignKey(
                            OrdreTravail,
                            on_delete=models.CASCADE,
                            related_name='pieces_utilisees'
                          )
    idPiece             = models.ForeignKey(
                            'magasin.Piece',
                            on_delete=models.CASCADE,
                            related_name='utilisations_ot'
                          )
    idMouvementStock    = models.ForeignKey(
                            'magasin.MouvementStock',
                            on_delete=models.SET_NULL,
                            null=True, blank=True,
                            related_name='utilisations_ot'
                          )
    quantite            = models.DecimalField(max_digits=12, decimal_places=3)
    prixUnitaireCapture = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    dateUtilisation     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-dateUtilisation']
        verbose_name = 'Pièce utilisée OT'

    def __str__(self):
        return f"{self.idPiece.reference} × {self.quantite} → {self.idOrdreTravail.numero}"

    @property
    def cout_total(self):
        return round(float(self.quantite) * float(self.prixUnitaireCapture), 2)
    
class CommentaireOT(models.Model):
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idOrdreTravail = models.ForeignKey(
                       OrdreTravail,
                       on_delete=models.CASCADE,
                       related_name='commentaires'
                     )
    idUtilisateur  = models.ForeignKey(
                       'securite.Utilisateur',
                       on_delete=models.SET_NULL,
                       null=True,
                       related_name='commentaires_ot'
                     )
    commentaire    = models.TextField()
    estInterne     = models.BooleanField(default=False)
    dateCreation   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-dateCreation']
        verbose_name = 'Commentaire OT'

    def __str__(self):
        return f"{self.idOrdreTravail.numero} — {'[Interne] ' if self.estInterne else ''}{self.commentaire[:50]}"


class CauseRacine(models.Model):
    CATEGORIE_CHOICES = [
        ('mecanique',   'Mécanique'),
        ('electrique',  'Électrique'),
        ('humain',      'Humain'),
        ('externe',     'Externe'),
        ('autre',       'Autre'),
    ]

    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idOrdreTravail      = models.ForeignKey(
                            OrdreTravail,
                            on_delete=models.CASCADE,
                            related_name='causes_racine'
                          )
    categorie           = models.CharField(max_length=15, choices=CATEGORIE_CHOICES)
    description         = models.TextField()
    dateIdentification  = models.DateField()
    idUtilisateur       = models.ForeignKey(
                            'securite.Utilisateur',
                            on_delete=models.SET_NULL,
                            null=True,
                            related_name='causes_racine'
                          )

    class Meta:
        ordering = ['-dateIdentification']
        verbose_name = 'Cause racine'

    def __str__(self):
        return f"{self.idOrdreTravail.numero} — {self.categorie}"
    
class HistoriqueStatutOT(models.Model):
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idOrdreTravail = models.ForeignKey(
                       OrdreTravail,
                       on_delete=models.CASCADE,
                       related_name='historiques_statut'
                     )
    ancienStatut   = models.CharField(max_length=25)
    nouveauStatut  = models.CharField(max_length=25)
    dateChangement = models.DateTimeField(auto_now_add=True)
    idUtilisateur  = models.ForeignKey(
                       'securite.Utilisateur',
                       on_delete=models.SET_NULL,
                       null=True, blank=True,
                       related_name='historiques_statut_ot'
                     )
    motif          = models.TextField(blank=True)

    class Meta:
        ordering = ['-dateChangement']
        verbose_name = 'Historique statut OT'

    def __str__(self):
        return f"{self.idOrdreTravail.numero} : {self.ancienStatut} → {self.nouveauStatut}"


class ConfigurationSLA(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idSite              = models.ForeignKey(
                            'organisation.Site',
                            on_delete=models.CASCADE,
                            null=True, blank=True,
                            related_name='configurations_sla'
                          )
    typeOrdreTravail    = models.CharField(max_length=15)
    priorite            = models.CharField(max_length=10)
    delaiAffectationMin = models.IntegerField()
    delaiResolutionMin  = models.IntegerField()
    estActif            = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Configuration SLA'
        unique_together = [('idSite', 'typeOrdreTravail', 'priorite')]

    def __str__(self):
        return f"SLA {self.typeOrdreTravail}/{self.priorite} — {self.delaiResolutionMin} min"