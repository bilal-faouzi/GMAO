from django.contrib import admin
from .models import (
    Utilisateur, Role, Permission,
    UtilisateurRole, RolePermission,
    SessionActive, JournalAudit
)

@admin.register(Utilisateur)
class UtilisateurAdmin(admin.ModelAdmin):
    list_display = ['nom_utilisateur', 'email', 'prenom', 'nom', 'est_actif', 'date_creation']
    list_filter = ['est_actif']
    search_fields = ['nom_utilisateur', 'email', 'prenom', 'nom']

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['code', 'libelle', 'niveau', 'est_actif']
    list_filter = ['est_actif']

@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['code', 'module', 'action', 'ressource', 'est_actif']
    list_filter = ['module', 'est_actif']

@admin.register(UtilisateurRole)
class UtilisateurRoleAdmin(admin.ModelAdmin):
    list_display = ['id_utilisateur', 'id_role', 'date_attribution']

@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ['id_role', 'id_permission']

@admin.register(SessionActive)
class SessionActiveAdmin(admin.ModelAdmin):
    list_display = ['id_utilisateur', 'adresse_ip', 'date_creation', 'date_expiration', 'est_active']
    list_filter = ['est_active']

@admin.register(JournalAudit)
class JournalAuditAdmin(admin.ModelAdmin):
    list_display = ['id_utilisateur', 'action', 'module', 'type_entite', 'horodatage', 'adresse_ip']
    list_filter = ['action', 'module']
    search_fields = ['action', 'module', 'type_entite']