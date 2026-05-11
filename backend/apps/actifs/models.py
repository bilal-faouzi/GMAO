import uuid
from django.db import models
from apps.core.models import BaseModel


class TypeActif(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)
    libelle = models.CharField(max_length=100)
    ordre = models.IntegerField(default=0)
    est_actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['ordre', 'libelle']
        verbose_name = 'Type d\'actif'
        verbose_name_plural = 'Types d\'actifs'

    def __str__(self):
        return self.libelle


class Actif(BaseModel):
    STATUT_CHOICES = [
        ('actif', 'Actif'),
        ('en_panne', 'En panne'),
        ('en_maintenance', 'En maintenance'),
        ('retire', 'Retiré'),
    ]

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idParent        = models.ForeignKey(
                        'self',
                        on_delete=models.SET_NULL,
                        null=True, blank=True,
                        related_name='sous_actifs'
                      )
    code            = models.CharField(max_length=50, unique=True)
    libelle         = models.CharField(max_length=200)
    description     = models.TextField(blank=True)
    type            = models.CharField(max_length=20, default='equipement')
    statut          = models.CharField(max_length=20, choices=STATUT_CHOICES, default='actif')
    idSite          = models.ForeignKey(
                        'organisation.Site',
                        on_delete=models.SET_NULL,
                        null=True, blank=True,
                        related_name='actifs'
                      )
    idUnite         = models.ForeignKey(
                        'organisation.Unite',
                        on_delete=models.SET_NULL,
                        null=True, blank=True,
                        related_name='actifs'
                      )
    dateAcquisition = models.DateField(null=True, blank=True)
    valeur          = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    fabricant       = models.CharField(max_length=100, blank=True)
    modele          = models.CharField(max_length=100, blank=True)
    numSerie        = models.CharField(max_length=100, blank=True)
    estActif        = models.BooleanField(default=True)

    class Meta:
        ordering = ['code']
        verbose_name = 'Actif'
        verbose_name_plural = 'Actifs'

    def __str__(self):
        return f"{self.code} — {self.libelle}"


class HistoriqueStatut(models.Model):
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idActif        = models.ForeignKey(
                       Actif,
                       on_delete=models.CASCADE,
                       related_name='historiques_statut'
                     )
    ancienStatut   = models.CharField(max_length=20)
    nouveauStatut  = models.CharField(max_length=20)
    dateChangement = models.DateTimeField(auto_now_add=True)
    motif          = models.TextField(blank=True)
    modifiePar     = models.ForeignKey(
                       'securite.Utilisateur',
                       on_delete=models.SET_NULL,
                       null=True, blank=True,
                       related_name='historiques_statut'
                     )

    class Meta:
        ordering = ['-dateChangement']
        verbose_name = 'Historique de statut'
        verbose_name_plural = 'Historiques de statut'

    def __str__(self):
        return f"{self.idActif.code} : {self.ancienStatut} → {self.nouveauStatut}"


class Indisponibilite(models.Model):
    TYPE_CHOICES = [
        ('planifiee', 'Planifiée'),
        ('panne', 'Panne'),
        ('maintenance', 'Maintenance'),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idActif     = models.ForeignKey(
                    Actif,
                    on_delete=models.CASCADE,
                    related_name='indisponibilites'
                  )
    dateDebut   = models.DateTimeField()
    dateFin     = models.DateTimeField(null=True, blank=True)
    motif       = models.TextField(blank=True)
    type        = models.CharField(max_length=20, choices=TYPE_CHOICES, default='panne')
    estTerminee = models.BooleanField(default=False)

    class Meta:
        ordering = ['-dateDebut']
        verbose_name = 'Indisponibilité'
        verbose_name_plural = 'Indisponibilités'

    def __str__(self):
        return f"{self.idActif.code} — {self.type} ({self.dateDebut})"

    @property
    def duree_heures(self):
        if self.estTerminee and self.dateFin:
            delta = self.dateFin - self.dateDebut
            return round(delta.total_seconds() / 3600, 2)
        return None


class Remplacement(models.Model):
    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actifOriginal     = models.ForeignKey(
                          Actif,
                          on_delete=models.CASCADE,
                          related_name='remplacements_sortants'
                        )
    actifRemplacant   = models.ForeignKey(
                          Actif,
                          on_delete=models.CASCADE,
                          related_name='remplacements_entrants'
                        )
    dateRemplacement  = models.DateField()
    motif             = models.TextField(blank=True)
    effectuePar       = models.ForeignKey(
                          'securite.Utilisateur',
                          on_delete=models.SET_NULL,
                          null=True, blank=True,
                          related_name='remplacements_effectues'
                        )

    class Meta:
        ordering = ['-dateRemplacement']
        verbose_name = 'Remplacement'
        verbose_name_plural = 'Remplacements'

    def __str__(self):
        return f"{self.actifOriginal.code} → {self.actifRemplacant.code}"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.actifOriginal == self.actifRemplacant:
            raise ValidationError("Un actif ne peut pas se remplacer lui-même.")