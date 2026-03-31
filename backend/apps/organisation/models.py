import uuid
from django.db import models
from django.conf import settings
from django.db.models import UniqueConstraint, Q
from apps.core.models import BaseModel
from apps.securite.models import Utilisateur


# ─── SOCIETE ──────────────────────────────────────────────────────────────────
class Societe(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    raisonSociale = models.CharField(max_length=200)
    estActif = models.BooleanField(default=True)

    class Meta:
        ordering = ['raisonSociale']
        verbose_name = "Société"
        verbose_name_plural = "Sociétés"

    def __str__(self):
        return f"{self.code} — {self.raisonSociale}"


# ─── SITE ─────────────────────────────────────────────────────────────────────
class Site(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='sites')
    code = models.CharField(max_length=20)
    libelle = models.CharField(max_length=200)
    adresse = models.TextField(blank=True)
    ville = models.CharField(max_length=100, blank=True)
    pays = models.CharField(max_length=100, default='Maroc')
    estActif = models.BooleanField(default=True)

    class Meta:
        unique_together = [('societe', 'code')]
        ordering = ['societe', 'libelle']
        verbose_name = "Site"

    def __str__(self):
        return f"{self.societe.code} / {self.code} — {self.libelle}"


# ─── SECTEUR ──────────────────────────────────────────────────────────────────
class Secteur(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name='secteurs')
    code = models.CharField(max_length=20)
    libelle = models.CharField(max_length=200)
    estActif = models.BooleanField(default=True)

    class Meta:
        unique_together = [('site', 'code')]
        ordering = ['site', 'libelle']
        verbose_name = "Secteur"

    def __str__(self):
        return f"{self.site.code} / {self.code} — {self.libelle}"


# ─── UNITE ────────────────────────────────────────────────────────────────────
class Unite(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    secteur = models.ForeignKey(Secteur, on_delete=models.CASCADE, related_name='unites')
    code = models.CharField(max_length=20)
    libelle = models.CharField(max_length=200)
    estProductive = models.BooleanField(default=True)
    estActif = models.BooleanField(default=True)

    class Meta:
        unique_together = [('secteur', 'code')]
        ordering = ['secteur', 'libelle']
        verbose_name = "Unité"

    def __str__(self):
        return f"{self.secteur.code} / {self.code} — {self.libelle}"


# ─── SPECIALITE ───────────────────────────────────────────────────────────────
class Specialite(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    libelle = models.CharField(max_length=200)
    estActif = models.BooleanField(default=True)

    class Meta:
        ordering = ['libelle']
        verbose_name = "Spécialité"

    def __str__(self):
        return f"{self.code} — {self.libelle}"


# ─── EQUIPE ───────────────────────────────────────────────────────────────────
class Equipe(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name='equipes')
    specialite = models.ForeignKey(
        Specialite, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='equipes'
    )
    chefEquipe = models.ForeignKey(
        Utilisateur, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='equipes_chef'
    )
    libelle = models.CharField(max_length=200)
    estActif = models.BooleanField(default=True)

    class Meta:
        unique_together = [('site', 'libelle')]
        ordering = ['site', 'libelle']
        verbose_name = "Équipe"

    def __str__(self):
        return f"{self.site.code} — {self.libelle}"


# ─── EQUIPE UTILISATEUR ───────────────────────────────────────────────────────
class EquipeUtilisateur(BaseModel):
    NIVEAU_CHOICES = [
        ('CHEF', 'Chef'),
        ('MEMBRE', 'Membre'),
        ('REMPLACANT', 'Remplaçant'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipe = models.ForeignKey(Equipe, on_delete=models.CASCADE, related_name='membres')
    utilisateur = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE,
        related_name='equipes_membre'
    )
    niveauRole = models.CharField(max_length=20, choices=NIVEAU_CHOICES, default='MEMBRE')
    dateAdhesion = models.DateField(auto_now_add=True)
    estActif = models.BooleanField(default=True)

    class Meta:
        unique_together = [('equipe', 'utilisateur')]
        ordering = ['equipe', 'niveauRole']
        verbose_name = "Membre d'équipe"

    def __str__(self):
        return f"{self.equipe} — {self.utilisateur} ({self.niveauRole})"


# ─── APPARTENANCE ORGANISATIONNELLE ───────────────────────────────────────────
class AppartenanceOrganisationnelle(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    utilisateur = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE,
        related_name='appartenances'
    )
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE)
    site = models.ForeignKey(Site, on_delete=models.CASCADE)
    secteur = models.ForeignKey(
        Secteur, on_delete=models.SET_NULL,
        null=True, blank=True
    )
    unite = models.ForeignKey(
        Unite, on_delete=models.SET_NULL,
        null=True, blank=True
    )
    estPrincipale = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Appartenance organisationnelle"
        constraints = [
            UniqueConstraint(
                fields=['utilisateur'],
                condition=Q(estPrincipale=True),
                name='unique_appartenance_principale'
            )
        ]

    def __str__(self):
        return f"{self.utilisateur} → {self.site} ({'principale' if self.estPrincipale else 'secondaire'})"