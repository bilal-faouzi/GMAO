import uuid
from django.db import models
from apps.core.models import BaseModel
from apps.securite.models import Utilisateur
from apps.organisation.models import Specialite


class SousTraitant(BaseModel):
    STATUT_CHOICES = [
        ('actif', 'Actif'),
        ('inactif', 'Inactif'),
        ('suspendu', 'Suspendu'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    raisonSociale = models.CharField(max_length=200, unique=True)
    ICE = models.CharField(max_length=50, null=True, blank=True)
    adresse = models.TextField(blank=True, default='')
    contactPrincipalNom = models.CharField(max_length=100, blank=True, default='')
    contactPrincipalTel = models.CharField(max_length=30, blank=True, default='')
    contactPrincipalEmail = models.EmailField(max_length=150)
    contactTechniqueNom = models.CharField(max_length=100, blank=True, default='')
    contactTechniqueTel = models.CharField(max_length=30, blank=True, default='')
    contactTechniqueEmail = models.EmailField(max_length=150, null=True, blank=True)
    numeroContrat = models.CharField(max_length=100, null=True, blank=True)
    tarifHoraireNormal = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    tarifHoraireSemaine = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    habilitations = models.TextField(null=True, blank=True)
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='actif')
    estActif = models.BooleanField(default=True)
    dateCreation = models.DateTimeField(auto_now_add=True)
    dateModification = models.DateTimeField(auto_now=True)
    idUtilisateurCreateur = models.ForeignKey(
        Utilisateur, on_delete=models.PROTECT,
        db_column='id_utilisateur_createur',
        related_name='sous_traitants_crees'
    )

    class Meta:
        db_table = 'sous_traitant'
        ordering = ['raisonSociale']
        verbose_name = 'Sous-traitant'
        verbose_name_plural = 'Sous-traitants'

    def __str__(self):
        return f"{self.raisonSociale} ({self.statut})"


class SousTraitantSpecialite(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idSousTraitant = models.ForeignKey(
        SousTraitant, on_delete=models.CASCADE,
        db_column='id_sous_traitant',
        related_name='specialites'
    )
    idSpecialite = models.ForeignKey(
        Specialite, on_delete=models.CASCADE,
        db_column='id_specialite',
        related_name='sous_traitants'
    )
    dateAttribution = models.DateField(auto_now_add=True)

    class Meta:
        db_table = 'sous_traitant_specialite'
        unique_together = [('idSousTraitant', 'idSpecialite')]
        constraints = [
            models.UniqueConstraint(
                fields=['idSousTraitant', 'idSpecialite'],
                name='unique_sous_traitant_specialite'
            )
        ]
        verbose_name = 'Spécialité sous-traitant'
        verbose_name_plural = 'Spécialités sous-traitant'

    def __str__(self):
        return f"{self.idSousTraitant.raisonSociale} — {self.idSpecialite.libelle}"
