from django.db import models

# Create your models here.
import uuid
from django.db import models
from django.utils import timezone


class Actif(models.Model):
    """Équipement ou installation à maintenir."""

    class Type(models.TextChoices):
        MECANIQUE    = 'MECANIQUE',    'Mécanique'
        ELECTRIQUE   = 'ELECTRIQUE',   'Électrique'
        HYDRAULIQUE  = 'HYDRAULIQUE',  'Hydraulique'
        PNEUMATIQUE  = 'PNEUMATIQUE',  'Pneumatique'
        AUTOMATISME  = 'AUTOMATISME',  'Automatisme'
        AUTRE        = 'AUTRE',        'Autre'

    class Criticite(models.TextChoices):
        CRITIQUE = 'CRITIQUE', 'Critique'
        ELEVEE   = 'ELEVEE',   'Élevée'
        MOYENNE  = 'MOYENNE',  'Moyenne'
        FAIBLE   = 'FAIBLE',   'Faible'

    class Statut(models.TextChoices):
        EN_SERVICE    = 'EN_SERVICE',    'En service'
        EN_PANNE      = 'EN_PANNE',      'En panne'
        EN_MAINTENANCE = 'EN_MAINTENANCE', 'En maintenance'
        HORS_SERVICE  = 'HORS_SERVICE',  'Hors service'
        EN_VEILLE     = 'EN_VEILLE',     'En veille'

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codeActif     = models.CharField(max_length=20, unique=True, verbose_name="Code actif")
    designation   = models.CharField(max_length=200, verbose_name="Désignation")
    idUnite       = models.ForeignKey(
        'organisation.Unite',
        on_delete=models.PROTECT,
        related_name='actifs',
        verbose_name="Unité"
    )
    idParent      = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='enfants',
        verbose_name="Actif parent"
    )
    type          = models.CharField(max_length=20, choices=Type.choices, verbose_name="Type")
    criticite     = models.CharField(max_length=10, choices=Criticite.choices, verbose_name="Criticité")
    statut        = models.CharField(
        max_length=20,
        choices=Statut.choices,
        default=Statut.EN_SERVICE,
        verbose_name="Statut"
    )
    numeroSerie   = models.CharField(max_length=100, blank=True, null=True, verbose_name="Numéro de série")
    fabricant     = models.CharField(max_length=100, blank=True, null=True, verbose_name="Fabricant")
    modele        = models.CharField(max_length=100, blank=True, null=True, verbose_name="Modèle")
    createdAt     = models.DateTimeField(auto_now_add=True)
    updatedAt     = models.DateTimeField(auto_now=True)

    class Meta:
        db_table   = 'actif'
        ordering   = ['codeActif']
        verbose_name = 'Actif'
        verbose_name_plural = 'Actifs'

    def __str__(self):
        return f"{self.codeActif} — {self.designation}"

    def changer_statut(self, nouveau_statut, utilisateur):
        """
        Applique un changement de statut et enregistre l'historique.
        Déclenche une notification d'escalade si CRITIQUE + EN_PANNE.
        """
        if self.statut == nouveau_statut:
            return

        HistoriqueStatutActif.objects.create(
            idActif=self,
            ancienStatut=self.statut,
            nouveauStatut=nouveau_statut,
            dateChangement=timezone.now(),
            idUtilisateur=utilisateur,
        )

        self.statut = nouveau_statut
        self.save(update_fields=['statut', 'updatedAt'])

        # Règle métier : escalade automatique
        if self.criticite == self.Criticite.CRITIQUE and nouveau_statut == self.Statut.EN_PANNE:
            self._notifier_escalade()

    def _notifier_escalade(self):
        """Notification vers le Directeur Technique (à brancher sur le système de notifications)."""
        # TODO: envoyer notification via le module notifications
        pass


class HistoriqueStatutActif(models.Model):
    """Traçabilité de chaque changement d'état d'un équipement."""

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idActif         = models.ForeignKey(
        Actif,
        on_delete=models.CASCADE,
        related_name='historique_statuts',
        verbose_name="Actif"
    )
    ancienStatut    = models.CharField(max_length=20, choices=Actif.Statut.choices, verbose_name="Ancien statut")
    nouveauStatut   = models.CharField(max_length=20, choices=Actif.Statut.choices, verbose_name="Nouveau statut")
    dateChangement  = models.DateTimeField(verbose_name="Date du changement")
    idUtilisateur   = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='changements_statut_actif',
        verbose_name="Utilisateur"
    )

    class Meta:
        db_table   = 'historique_statut_actif'
        ordering   = ['-dateChangement']
        verbose_name = 'Historique statut actif'
        verbose_name_plural = 'Historiques statuts actifs'

    def __str__(self):
        return (
            f"{self.idActif.codeActif} : "
            f"{self.ancienStatut} → {self.nouveauStatut} "
            f"({self.dateChangement:%Y-%m-%d %H:%M})"
        )