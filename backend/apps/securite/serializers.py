from rest_framework import serializers
from .models import JournalAudit, Utilisateur, Role, Permission, UtilisateurRole, RolePermission


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'code', 'module', 'action', 'ressource']


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'code', 'libelle', 'niveau', 'permissions', 'est_actif']

    def get_permissions(self, obj):
        perms = obj.permissions.filter(
            id_permission__est_actif=True
        ).select_related('id_permission')
        return PermissionSerializer(
            [rp.id_permission for rp in perms], many=True
        ).data


class UtilisateurSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'nom_utilisateur', 'email',
            'prenom', 'nom', 'est_actif',
            'date_creation', 'derniere_connexion', 'roles'
        ]

    def get_roles(self, obj):
        roles = obj.roles.filter(
            id_role__est_actif=True
        ).select_related('id_role')
        return RoleSerializer(
            [ur.id_role for ur in roles], many=True
        ).data


class LoginSerializer(serializers.Serializer):
    nom_utilisateur = serializers.CharField()
    mot_de_passe = serializers.CharField(write_only=True)
    
class CreateUtilisateurSerializer(serializers.Serializer):
    nom_utilisateur = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    mot_de_passe = serializers.CharField(write_only=True, min_length=6)
    prenom = serializers.CharField(max_length=100)
    nom = serializers.CharField(max_length=100)

    def validate_nom_utilisateur(self, value):
        if Utilisateur.objects.filter(nom_utilisateur=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur existe déjà.")
        return value

    def validate_email(self, value):
        if Utilisateur.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email existe déjà.")
        return value


class UpdateUtilisateurSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    prenom = serializers.CharField(max_length=100, required=False)
    nom = serializers.CharField(max_length=100, required=False)
    mot_de_passe = serializers.CharField(write_only=True, min_length=6, required=False)

    def validate_email(self, value):
        user_id = self.context.get('user_id')
        if Utilisateur.objects.filter(email=value).exclude(id=user_id).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value
    
class CreateRoleSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)
    libelle = serializers.CharField(max_length=150)
    niveau = serializers.IntegerField(min_value=1, max_value=10)

    def validate_code(self, value):
        if Role.objects.filter(code=value).exists():
            raise serializers.ValidationError("Ce code de rôle existe déjà.")
        return value.upper()


class CreatePermissionSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=100)
    module = serializers.CharField(max_length=100)
    action = serializers.CharField(max_length=100)
    ressource = serializers.CharField(max_length=100)

    def validate_code(self, value):
        if Permission.objects.filter(code=value).exists():
            raise serializers.ValidationError("Ce code de permission existe déjà.")
        return value.upper()


class AssignRoleSerializer(serializers.Serializer):
    id_role = serializers.UUIDField()

    def validate_id_role(self, value):
        if not Role.objects.filter(id=value, est_actif=True).exists():
            raise serializers.ValidationError("Rôle non trouvé ou inactif.")
        return value


class AssignPermissionSerializer(serializers.Serializer):
    id_permission = serializers.UUIDField()

    def validate_id_permission(self, value):
        if not Permission.objects.filter(id=value, est_actif=True).exists():
            raise serializers.ValidationError("Permission non trouvée ou inactive.")
        return value
    
class JournalAuditSerializer(serializers.ModelSerializer):
    utilisateur = serializers.SerializerMethodField()

    class Meta:
        model = JournalAudit
        fields = [
            'id', 'utilisateur', 'horodatage', 'action',
            'module', 'type_entite', 'id_entite',
            'ancienne_valeur', 'nouvelle_valeur', 'adresse_ip'
        ]

    def get_utilisateur(self, obj):
        return {
            'id': str(obj.id_utilisateur.id),
            'nom_utilisateur': obj.id_utilisateur.nom_utilisateur,
        }