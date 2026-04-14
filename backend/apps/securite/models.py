import uuid
from django.db import models


class Utilisateur(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom_utilisateur = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    mot_de_passe_hash = models.CharField(max_length=255)
    prenom = models.CharField(max_length=100)
    nom = models.CharField(max_length=100)
    est_actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    derniere_connexion = models.DateTimeField(null=True, blank=True)
    derniere_connexion_ip = models.GenericIPAddressField(null=True, blank=True)

    # Required by DRF permissions
    @property
    def is_authenticated(self):
        return self.est_actif

    @property
    def is_anonymous(self):
        return False

    class Meta:
        db_table = 'utilisateur'

    def __str__(self):
        return f"{self.prenom} {self.nom} ({self.nom_utilisateur})"


class Role(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)
    libelle = models.CharField(max_length=150)
    niveau = models.IntegerField()
    est_actif = models.BooleanField(default=True)

    class Meta:
        db_table = 'role'

    def __str__(self):
        return self.libelle


class Permission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=100, unique=True)
    module = models.CharField(max_length=100)
    action = models.CharField(max_length=100)
    ressource = models.CharField(max_length=100)
    est_actif = models.BooleanField(default=True)

    class Meta:
        db_table = 'permission'

    def __str__(self):
        return f"{self.module}.{self.action}.{self.ressource}"


class UtilisateurRole(models.Model):
    id_utilisateur = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE,
        db_column='id_utilisateur', related_name='roles'
    )
    id_role = models.ForeignKey(
        Role, on_delete=models.CASCADE,
        db_column='id_role', related_name='utilisateurs'
    )
    date_attribution = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'utilisateur_role'
        unique_together = ('id_utilisateur', 'id_role')
        constraints = [
            models.UniqueConstraint(fields=['id_utilisateur', 'id_role'], name='unique_user_role')
        ]


class RolePermission(models.Model):
    id_role = models.ForeignKey(
        Role, on_delete=models.CASCADE,
        db_column='id_role', related_name='permissions'
    )
    id_permission = models.ForeignKey(
        Permission, on_delete=models.CASCADE,
        db_column='id_permission', related_name='roles'
    )

    class Meta:
        db_table = 'role_permission'
        unique_together = ('id_role', 'id_permission')
        constraints = [
            models.UniqueConstraint(fields=['id_role', 'id_permission'], name='unique_role_permission')
        ]



class SessionActive(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id_utilisateur = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE,
        db_column='id_utilisateur', related_name='sessions'
    )
    # token = models.TextField(unique=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_expiration = models.DateTimeField()
    adresse_ip = models.GenericIPAddressField()
    est_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'session_active'


class JournalAudit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id_utilisateur = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE,
        db_column='id_utilisateur', related_name='journal'
    )
    horodatage = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=100)
    module = models.CharField(max_length=100)
    type_entite = models.CharField(max_length=100)
    id_entite = models.UUIDField(null=True, blank=True)
    ancienne_valeur = models.JSONField(null=True, blank=True)
    nouvelle_valeur = models.JSONField(null=True, blank=True)
    adresse_ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = 'journal_audit'