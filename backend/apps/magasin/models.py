import uuid
from django.db import models
from apps.core.models import BaseModel


class Piece(BaseModel):
    id                    = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference             = models.CharField(max_length=50, unique=True)
    designation           = models.CharField(max_length=200)
    categorie             = models.CharField(max_length=100, blank=True)
    unite                 = models.CharField(max_length=20, default='piece')
    emplacement           = models.CharField(max_length=100, blank=True, help_text="Ex: A1-E3-N2")
    quantiteStock         = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    seuilMinimum          = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    prixUnitaire          = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    fournisseur           = models.CharField(max_length=200, blank=True)
    referenceConstructeur = models.CharField(max_length=100, blank=True)
    dateDerniereEntree    = models.DateTimeField(null=True, blank=True)
    estActif              = models.BooleanField(default=True)

    class Meta:
        ordering = ['reference']
        verbose_name = 'Pièce'
        verbose_name_plural = 'Pièces'

    def __str__(self):
        return f"{self.reference} — {self.designation}"

    @property
    def est_sous_seuil(self):
        return self.quantiteStock <= self.seuilMinimum

    @property
    def valeur_stock_total(self):
        if self.prixUnitaire:
            return round(float(self.quantiteStock) * float(self.prixUnitaire), 2)
        return None


class MouvementStock(models.Model):
    TYPE_CHOICES = [
        ('entree',     'Entrée'),
        ('sortie',     'Sortie'),
        ('ajustement', 'Ajustement'),
    ]

    id                      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idPiece                 = models.ForeignKey(
                                Piece,
                                on_delete=models.CASCADE,
                                related_name='mouvements'
                              )
    typeMouvement           = models.CharField(max_length=20, choices=TYPE_CHOICES)
    quantite                = models.DecimalField(max_digits=12, decimal_places=3)
    stockAvant              = models.DecimalField(max_digits=12, decimal_places=3)
    stockApres              = models.DecimalField(max_digits=12, decimal_places=3)
    idOrdreTravail          = models.CharField(max_length=100, blank=True, null=True)
    idUtilisateurMagasinier = models.ForeignKey(
                                'securite.Utilisateur',
                                on_delete=models.SET_NULL,
                                null=True, blank=True,
                                related_name='mouvements_magasinier'
                              )
    idUtilisateurTechnicien = models.ForeignKey(
                                'securite.Utilisateur',
                                on_delete=models.SET_NULL,
                                null=True, blank=True,
                                related_name='mouvements_technicien'
                              )
    dateHeure               = models.DateTimeField(auto_now_add=True)
    commentaire             = models.TextField(blank=True)

    class Meta:
        ordering = ['-dateHeure']
        verbose_name = 'Mouvement de stock'
        verbose_name_plural = 'Mouvements de stock'

    def __str__(self):
        return f"{self.typeMouvement} — {self.idPiece.reference} ({self.quantite})"