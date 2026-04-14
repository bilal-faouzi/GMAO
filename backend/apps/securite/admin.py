from django.contrib import admin
from django import forms
import hashlib
from .models import Utilisateur, Role, Permission, JournalAudit, SessionActive


class UtilisateurAdminForm(forms.ModelForm):
    mot_de_passe = forms.CharField(
        label='Mot de passe',
        widget=forms.PasswordInput,
        required=False,
        help_text='Laisser vide pour ne pas changer. Sera hashé automatiquement.'
    )

    class Meta:
        model = Utilisateur
        fields = '__all__'
        exclude = ['mot_de_passe_hash']

    def save(self, commit=True):
        instance = super().save(commit=False)
        pwd = self.cleaned_data.get('mot_de_passe')
        if pwd:
            instance.mot_de_passe_hash = hashlib.sha256(pwd.encode()).hexdigest()
        if commit:
            instance.save()
        return instance


@admin.register(Utilisateur)
class UtilisateurAdmin(admin.ModelAdmin):
    form = UtilisateurAdminForm
    list_display  = ['nom_utilisateur', 'prenom', 'nom', 'email', 'est_actif', 'derniere_connexion']
    list_filter   = ['est_actif']
    search_fields = ['nom_utilisateur', 'email', 'nom', 'prenom']


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display  = ['code', 'libelle', 'niveau', 'est_actif']
    list_filter   = ['est_actif']
    search_fields = ['code', 'libelle']


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display  = ['code', 'module', 'action', 'ressource', 'est_actif']
    list_filter   = ['module', 'est_actif']
    search_fields = ['code', 'module']


@admin.register(JournalAudit)
class JournalAuditAdmin(admin.ModelAdmin):
    list_display  = ['id_utilisateur', 'action', 'module', 'horodatage', 'adresse_ip']
    list_filter   = ['action', 'module']
    readonly_fields = ['horodatage']


@admin.register(SessionActive)
class SessionActiveAdmin(admin.ModelAdmin):
    list_display  = ['id_utilisateur', 'adresse_ip', 'date_creation', 'est_active']
    list_filter   = ['est_active']