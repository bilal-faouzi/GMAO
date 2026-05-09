# securite/serializers.py
from rest_framework import serializers
from .models import JournalAudit, Utilisateur, Role, Permission, UtilisateurRole, RolePermission, InterfaceApp, RoleInterface

class InterfaceAppSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterfaceApp
        fields = ['id', 'code', 'libelle', 'route', 'icon', 'module', 'ordre', 'est_actif']


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'code', 'module', 'action', 'ressource']


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    interfaces = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'code', 'libelle', 'niveau', 'permissions', 'interfaces', 'est_actif']

    def get_permissions(self, obj):
        perms = obj.permissions.filter(
            id_permission__est_actif=True
        ).select_related('id_permission')
        return PermissionSerializer(
            [rp.id_permission for rp in perms], many=True
        ).data

    def get_interfaces(self, obj):
        ints = obj.interfaces.filter(
            id_interface__est_actif=True
        ).select_related('id_interface')
        return InterfaceAppSerializer(
            [ri.id_interface for ri in ints], many=True
        ).data


class UtilisateurSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    interfaces = serializers.SerializerMethodField()
    unite_principale = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'nom_utilisateur', 'email',
            'prenom', 'nom', 'est_actif',
            'date_creation', 'derniere_connexion', 'roles', 'interfaces', 'unite_principale'
        ]

    def get_roles(self, obj):
        roles = obj.roles.filter(
            id_role__est_actif=True
        ).select_related('id_role')
        return RoleSerializer(
            [ur.id_role for ur in roles], many=True
        ).data

    def get_interfaces(self, obj):
        # Union of all interfaces from all active roles
        from .models import InterfaceApp
        interface_ids = InterfaceApp.objects.filter(
            roles__id_role__utilisateurs__id_utilisateur=obj,
            roles__id_role__est_actif=True,
            est_actif=True
        ).values_list('id', flat=True).distinct()
        return InterfaceAppSerializer(
            InterfaceApp.objects.filter(id__in=interface_ids).order_by('ordre', 'libelle'),
            many=True
        ).data

    def get_unite_principale(self, obj):
        try:
            app = obj.appartenances.select_related('unite').get(estPrincipale=True)
            if app.unite:
                return {
                    'id': str(app.unite.id),
                    'code': app.unite.code,
                    'libelle': app.unite.libelle,
                }
        except Exception:
            pass
        return None


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
            raise serializers.ValidationError(
                "Ce nom d'utilisateur est déjà pris. Choisissez un autre identifiant."
            )
        return value

    def validate_email(self, value):
        if Utilisateur.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "Un compte existe déjà avec cette adresse email."
            )
        return value

    def validate_mot_de_passe(self, value):
        # ← NOUVEAU : règles de complexité minimales
        if value.isdigit():
            raise serializers.ValidationError(
                "Le mot de passe ne peut pas être composé uniquement de chiffres."
            )
        return value


class UpdateUtilisateurSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    prenom = serializers.CharField(max_length=100, required=False)
    nom = serializers.CharField(max_length=100, required=False)
    mot_de_passe = serializers.CharField(write_only=True, min_length=6, required=False)

    def validate_email(self, value):
        user_id = self.context.get('user_id')
        if Utilisateur.objects.filter(email=value).exclude(id=user_id).exists():
            raise serializers.ValidationError(
                "Cette adresse email est déjà utilisée par un autre compte."
            )
        return value


class CreateRoleSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)
    libelle = serializers.CharField(max_length=150)
    niveau = serializers.IntegerField(min_value=1, max_value=10)

    def validate_code(self, value):
        value = value.upper()
        if Role.objects.filter(code=value).exists():
            raise serializers.ValidationError(
                f"Le code rôle '{value}' existe déjà. "
                "Utilisez un code unique (ex: RESP_TECH_RABAT)."
            )
        return value

    def validate_niveau(self, value):
        # ← NOUVEAU : avertir si le niveau est déjà utilisé
        # (pas un blocage dur, juste une info utile)
        if Role.objects.filter(niveau=value, est_actif=True).exists():
            pass  # On laisse passer, mais la vue peut logger un warning
        return value


class CreatePermissionSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=100)
    module = serializers.CharField(max_length=100)
    action = serializers.CharField(max_length=100)
    ressource = serializers.CharField(max_length=100)

    def validate_code(self, value):
        value = value.upper()
        if Permission.objects.filter(code=value).exists():
            raise serializers.ValidationError(
                f"La permission '{value}' existe déjà dans le système."
            )
        return value

    def validate_action(self, value):
        # ← NOUVEAU : actions autorisées uniquement
        actions_valides = {'CREER', 'LIRE', 'MODIFIER', 'SUPPRIMER', 'VALIDER', 'CLOTURER'}
        if value.upper() not in actions_valides:
            raise serializers.ValidationError(
                f"Action '{value}' non reconnue. "
                f"Valeurs autorisées : {', '.join(sorted(actions_valides))}."
            )
        return value.upper()


class AssignRoleSerializer(serializers.Serializer):
    id_role = serializers.UUIDField()

    def validate_id_role(self, value):
        try:
            role = Role.objects.get(id=value)
        except Role.DoesNotExist:
            raise serializers.ValidationError(
                "Ce rôle n'existe pas dans le système."
            )
        if not role.est_actif:
            raise serializers.ValidationError(
                f"Le rôle '{role.libelle}' est désactivé et ne peut pas être attribué."
            )
        return value

    def validate(self, data):
        # ← NOUVEAU : vérifier que l'utilisateur n'a pas déjà ce rôle
        utilisateur_id = self.context.get('utilisateur_id')
        id_role = data.get('id_role')

        if utilisateur_id and id_role:
            deja_attribue = UtilisateurRole.objects.filter(
                id_utilisateur=utilisateur_id,
                id_role=id_role
            ).exists()
            if deja_attribue:
                role = Role.objects.get(id=id_role)
                raise serializers.ValidationError(
                    f"L'utilisateur possède déjà le rôle '{role.libelle}'. "
                    "Chaque rôle ne peut être attribué qu'une seule fois."
                )
        return data


class AssignPermissionSerializer(serializers.Serializer):
    id_permission = serializers.UUIDField()

    def validate_id_permission(self, value):
        try:
            permission = Permission.objects.get(id=value)
        except Permission.DoesNotExist:
            raise serializers.ValidationError(
                "Cette permission n'existe pas dans le système."
            )
        if not permission.est_actif:
            raise serializers.ValidationError(
                f"La permission '{permission.code}' est désactivée "
                "et ne peut pas être attribuée."
            )
        return value

    def validate(self, data):
        # ← NOUVEAU : vérifier que le rôle n'a pas déjà cette permission
        role_id = self.context.get('role_id')
        id_permission = data.get('id_permission')

        if role_id and id_permission:
            deja_attribuee = RolePermission.objects.filter(
                id_role=role_id,
                id_permission=id_permission
            ).exists()
            if deja_attribuee:
                perm = Permission.objects.get(id=id_permission)
                raise serializers.ValidationError(
                    f"Le rôle possède déjà la permission '{perm.code}'. "
                    "Chaque permission ne peut être attribuée qu'une seule fois par rôle."
                )
        return data


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




class UtilisateurRoleSerializer(serializers.ModelSerializer):
    # Clé composite : id_utilisateur + id_role → toujours unique
    id = serializers.SerializerMethodField()

    def get_id(self, obj):
        return f"{obj.id_utilisateur_id}__{obj.id_role_id}"

    class Meta:
        model = UtilisateurRole
        fields = ['id', 'id_utilisateur', 'id_role', 'date_attribution']


class RolePermissionSerializer(serializers.ModelSerializer):
    # Clé composite : id_role + id_permission → toujours unique
    id = serializers.SerializerMethodField()

    def get_id(self, obj):
        return f"{obj.id_role_id}__{obj.id_permission_id}"

    class Meta:
        model = RolePermission
        fields = ['id', 'id_role', 'id_permission']