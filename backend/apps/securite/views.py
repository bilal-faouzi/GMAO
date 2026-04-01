import hashlib
import uuid
from datetime import datetime, timezone

from django.utils import timezone as dj_timezone

from .permissions import IsSessionActive
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q


from .models import Utilisateur, SessionActive, JournalAudit, Role, Permission, UtilisateurRole, RolePermission
from .serializers import (
    JournalAuditSerializer, LoginSerializer, UtilisateurSerializer,
    CreateUtilisateurSerializer, UpdateUtilisateurSerializer,
    CreateRoleSerializer, CreatePermissionSerializer,
    AssignRoleSerializer, AssignPermissionSerializer,
    RoleSerializer, PermissionSerializer
)


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0]
    return request.META.get('REMOTE_ADDR')


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()



class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        nom_utilisateur = serializer.validated_data['nom_utilisateur']
        mot_de_passe = serializer.validated_data['mot_de_passe']

        try:
            utilisateur = Utilisateur.objects.get(
                nom_utilisateur=nom_utilisateur,
                est_actif=True
            )
        except Utilisateur.DoesNotExist:
            return Response(
                {'detail': 'Identifiants invalides.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if utilisateur.mot_de_passe_hash != hash_password(mot_de_passe):
            return Response(
                {'detail': 'Identifiants invalides.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        ip = get_client_ip(request)

        # Update last login
        utilisateur.derniere_connexion = dj_timezone.now()
        utilisateur.derniere_connexion_ip = ip
        utilisateur.save(update_fields=['derniere_connexion', 'derniere_connexion_ip'])

        # 1. Create session first
        refresh = RefreshToken()
        refresh['user_id'] = str(utilisateur.id)
        refresh['nom_utilisateur'] = utilisateur.nom_utilisateur

        session = SessionActive.objects.create(
            id_utilisateur=utilisateur,
            date_expiration=dj_timezone.now() + refresh.lifetime,
            adresse_ip=ip
        )

        # 2. Now set session_id on refresh BEFORE generating access token
        refresh['session_id'] = str(session.id)
        access = refresh.access_token  # ← access token inherits session_id from refresh

        # Audit log
        JournalAudit.objects.create(
            id_utilisateur=utilisateur,
            action='LOGIN',
            module='AUTH',
            type_entite='Utilisateur',
            id_entite=utilisateur.id,
            adresse_ip=ip
        )

        return Response({
            'access': str(access),
            'refresh': str(refresh),
            'utilisateur': UtilisateurSerializer(utilisateur).data
        })
class LogoutView(APIView):
    permission_classes = [IsAuthenticated, IsSessionActive]

    def post(self, request):
        token = request.data.get('refresh')
        if not token:
            return Response(
                {'detail': 'Token refresh requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Deactivate session
        session_id = request.auth.get('session_id')
        SessionActive.objects.filter(id=session_id).update(est_active=False)

        # Blacklist token
        try:
            refresh = RefreshToken(token)
            refresh.blacklist()
        except Exception:
            pass

        return Response({'detail': 'Déconnexion réussie.'})


class MeView(APIView):
    permission_classes = [IsAuthenticated, IsSessionActive]

    def get(self, request):
        # Get user_id from JWT payload
        user_id = request.auth.get('user_id')
        
        if not user_id:
            return Response(
                {'detail': 'Token invalide.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            import uuid
            utilisateur = Utilisateur.objects.get(
                id=uuid.UUID(str(user_id)),
                est_actif=True
            )
            return Response(UtilisateurSerializer(utilisateur).data)
        except (Utilisateur.DoesNotExist, ValueError):
            return Response(
                {'detail': 'Utilisateur non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )

class UtilisateurListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsSessionActive]

    def get(self, request):
        """List all users"""
        utilisateurs = Utilisateur.objects.all().order_by('date_creation')
        
        # Filter by active status if provided
        est_actif = request.query_params.get('est_actif')
        if est_actif is not None:
            utilisateurs = utilisateurs.filter(est_actif=est_actif.lower() == 'true')

        # Pagination manuelle
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        total = utilisateurs.count()
        start = (page - 1) * page_size
        end = start + page_size

        serializer = UtilisateurSerializer(utilisateurs[start:end], many=True)
        return Response({
            'count': utilisateurs.count(),
            'results': serializer.data,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
        })

    def post(self, request):
        """Create a new user"""
        serializer = CreateUtilisateurSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        utilisateur = Utilisateur.objects.create(
            nom_utilisateur=data['nom_utilisateur'],
            email=data['email'],
            mot_de_passe_hash=hashlib.sha256(data['mot_de_passe'].encode()).hexdigest(),
            prenom=data['prenom'],
            nom=data['nom'],
            est_actif=True
        )

        # Audit log
        JournalAudit.objects.create(
            id_utilisateur=request.user,
            action='CREATE',
            module='UTILISATEURS',
            type_entite='Utilisateur',
            id_entite=utilisateur.id,
            nouvelle_valeur={'nom_utilisateur': utilisateur.nom_utilisateur, 'email': utilisateur.email},
            adresse_ip=get_client_ip(request)
        )

        return Response(
            UtilisateurSerializer(utilisateur).data,
            status=status.HTTP_201_CREATED
        )


class UtilisateurDetailView(APIView):
    permission_classes = [IsAuthenticated, IsSessionActive]

    def get_object(self, user_id):
        try:
            return Utilisateur.objects.get(id=uuid.UUID(str(user_id)))
        except (Utilisateur.DoesNotExist, ValueError):
            return None

    def get(self, request, user_id):
        """Get a single user"""
        utilisateur = self.get_object(user_id)
        if not utilisateur:
            return Response(
                {'detail': 'Utilisateur non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(UtilisateurSerializer(utilisateur).data)

    def patch(self, request, user_id):
        """Update a user"""
        utilisateur = self.get_object(user_id)
        if not utilisateur:
            return Response(
                {'detail': 'Utilisateur non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = UpdateUtilisateurSerializer(
            data=request.data,
            context={'user_id': user_id}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        ancienne_valeur = UtilisateurSerializer(utilisateur).data

        if 'email' in data:
            utilisateur.email = data['email']
        if 'prenom' in data:
            utilisateur.prenom = data['prenom']
        if 'nom' in data:
            utilisateur.nom = data['nom']
        if 'mot_de_passe' in data:
            utilisateur.mot_de_passe_hash = hashlib.sha256(
                data['mot_de_passe'].encode()
            ).hexdigest()

        utilisateur.save()

        # Audit log
        JournalAudit.objects.create(
            id_utilisateur=request.user,
            action='UPDATE',
            module='UTILISATEURS',
            type_entite='Utilisateur',
            id_entite=utilisateur.id,
            ancienne_valeur=dict(ancienne_valeur),
            nouvelle_valeur=data,
            adresse_ip=get_client_ip(request)
        )

        return Response(UtilisateurSerializer(utilisateur).data)

    def delete(self, request, user_id):
        """Deactivate a user (soft delete)"""
        utilisateur = self.get_object(user_id)
        if not utilisateur:
            return Response(
                {'detail': 'Utilisateur non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Prevent self-deactivation
        if str(utilisateur.id) == str(request.user.id):
            return Response(
                {'detail': 'Vous ne pouvez pas désactiver votre propre compte.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if  utilisateur.est_actif:

            utilisateur.est_actif = False
            utilisateur.save(update_fields=['est_actif'])

            # Journal audit
            JournalAudit.objects.create(
            id_utilisateur=request.user,
            action='DEACTIVATE',
            module='UTILISATEURS',
            type_entite='Utilisateur',
            id_entite=utilisateur.id,
            adresse_ip=get_client_ip(request)
        )
        else:

            utilisateur.est_actif = True
            utilisateur.save(update_fields=['est_actif'])


            # Journal audit
            JournalAudit.objects.create(
            id_utilisateur=request.user,
            action='ACTIVATE',
            module='UTILISATEURS',
            type_entite='Utilisateur',
            id_entite=utilisateur.id,
            adresse_ip=get_client_ip(request)
        )

        

        return Response({'detail': 'Utilisateur désactivé avec succès.'})
    
    # ─────────────────────────────────────────
# ROLES
# ─────────────────────────────────────────

class RoleListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsSessionActive]

    def get(self, request):
        """List all roles"""
        roles = Role.objects.order_by('niveau')
        return Response(RoleSerializer(roles, many=True).data)

    def post(self, request):
        """Create a new role"""
        serializer = CreateRoleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        role = Role.objects.create(
            code=data['code'],
            libelle=data['libelle'],
            niveau=data['niveau'],
            est_actif=True
        )

        JournalAudit.objects.create(
            id_utilisateur=request.user,
            action='CREATE',
            module='ROLES',
            type_entite='Role',
            id_entite=role.id,
            nouvelle_valeur={'code': role.code, 'libelle': role.libelle},
            adresse_ip=get_client_ip(request)
        )

        return Response(RoleSerializer(role).data, status=status.HTTP_201_CREATED)


class RoleDetailView(APIView):
    permission_classes = [IsAuthenticated, IsSessionActive]

    def get_object(self, role_id):
        try:
            return Role.objects.get(id=uuid.UUID(str(role_id)))
        except (Role.DoesNotExist, ValueError):
            return None

    def get(self, request, role_id):
        """Get single role with its permissions"""
        role = self.get_object(role_id)
        if not role:
            return Response(
                {'detail': 'Rôle non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(RoleSerializer(role).data)

    def delete(self, request, role_id):
        """Deactivate a role"""
        role = self.get_object(role_id)
        if not role:
            return Response(
                {'detail': 'Rôle non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )
        role.est_actif = False
        role.save(update_fields=['est_actif'])

        JournalAudit.objects.create(
            id_utilisateur=request.user,
            action='DEACTIVATE',
            module='ROLES',
            type_entite='Role',
            id_entite=role.id,
            adresse_ip=get_client_ip(request)
        )

        return Response({'detail': 'Rôle désactivé avec succès.'})
    
    def put(self, request, role_id):
        """Met à jour un rôle (ex: activation/désactivation)"""
        role = self.get_object(role_id)
        if not role:
            return Response(
                {'detail': 'Rôle non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # On utilise le serializer avec partial=True pour ne mettre à jour que les champs envoyés
       

        role.est_actif = True 
        role.save(update_fields=['est_actif'])

            # Optionnel : Ajouter une trace dans ton Journal d'Audit
        action_type = 'UPDATE'
        if 'est_actif' in request.data:
            action_type = 'ACTIVATE' if request.data['est_actif'] else 'DEACTIVATE'

            JournalAudit.objects.create(
                id_utilisateur=request.user,
                action=action_type,
                module='ROLES',
                type_entite='Role',
                id_entite=role.id,
                adresse_ip=self.get_client_ip(request) # Assure-toi que cette fonction est accessible
            )

            
        
        return Response({'detail': 'Rôle désactivé avec succès.'})


# ─────────────────────────────────────────
# PERMISSIONS
# ─────────────────────────────────────────

class PermissionListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsSessionActive]

    def get(self, request):
        """List all permissions, optionally filter by module"""
        permissions = Permission.objects.filter(est_actif=True).order_by('module', 'action')
        module = request.query_params.get('module')
        if module:
            permissions = permissions.filter(module__iexact=module)
        return Response(PermissionSerializer(permissions, many=True).data)

    def post(self, request):
        """Create a new permission"""
        serializer = CreatePermissionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        permission = Permission.objects.create(
            code=data['code'],
            module=data['module'],
            action=data['action'],
            ressource=data['ressource'],
            est_actif=True
        )

        return Response(
            PermissionSerializer(permission).data,
            status=status.HTTP_201_CREATED
        )


# ─────────────────────────────────────────
# ASSIGN ROLE TO USER
# ─────────────────────────────────────────

class AssignRoleToUserView(APIView):
    permission_classes = [IsAuthenticated, IsSessionActive]

    def post(self, request, user_id):
        """Assign a role to a user"""
        try:
            utilisateur = Utilisateur.objects.get(id=uuid.UUID(str(user_id)))
        except (Utilisateur.DoesNotExist, ValueError):
            return Response(
                {'detail': 'Utilisateur non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AssignRoleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        role_id = serializer.validated_data['id_role']
        role = Role.objects.get(id=role_id)

        # Check if already assigned
        if UtilisateurRole.objects.filter(id_utilisateur=utilisateur, id_role=role).exists():
            return Response(
                {'detail': 'Ce rôle est déjà assigné à cet utilisateur.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        UtilisateurRole.objects.create(
            id_utilisateur=utilisateur,
            id_role=role
        )

        JournalAudit.objects.create(
            id_utilisateur=request.user,
            action='ASSIGN_ROLE',
            module='ROLES',
            type_entite='Utilisateur',
            id_entite=utilisateur.id,
            nouvelle_valeur={'role': role.code},
            adresse_ip=get_client_ip(request)
        )

        return Response(
            UtilisateurSerializer(utilisateur).data,
            status=status.HTTP_201_CREATED
        )

    def delete(self, request, user_id):
        """Remove a role from a user"""
        try:
            utilisateur = Utilisateur.objects.get(id=uuid.UUID(str(user_id)))
        except (Utilisateur.DoesNotExist, ValueError):
            return Response(
                {'detail': 'Utilisateur non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AssignRoleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        role_id = serializer.validated_data['id_role']

        deleted, _ = UtilisateurRole.objects.filter(
            id_utilisateur=utilisateur,
            id_role__id=role_id
        ).delete()

        if deleted == 0:
            return Response(
                {'detail': 'Ce rôle n\'est pas assigné à cet utilisateur.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({'detail': 'Rôle retiré avec succès.'})


# ─────────────────────────────────────────
# ASSIGN PERMISSION TO ROLE
# ─────────────────────────────────────────

class AssignPermissionToRoleView(APIView):
    permission_classes = [IsAuthenticated, IsSessionActive]

    def post(self, request, role_id):
        """Assign a permission to a role"""
        try:
            role = Role.objects.get(id=uuid.UUID(str(role_id)))
        except (Role.DoesNotExist, ValueError):
            return Response(
                {'detail': 'Rôle non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AssignPermissionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        perm_id = serializer.validated_data['id_permission']
        permission = Permission.objects.get(id=perm_id)

        if RolePermission.objects.filter(id_role=role, id_permission=permission).exists():
            return Response(
                {'detail': 'Cette permission est déjà assignée à ce rôle.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        RolePermission.objects.create(id_role=role, id_permission=permission)

        return Response(
            RoleSerializer(role).data,
            status=status.HTTP_201_CREATED
        )

    def delete(self, request, role_id):
        """Remove a permission from a role"""
        try:
            role = Role.objects.get(id=uuid.UUID(str(role_id)))
        except (Role.DoesNotExist, ValueError):
            return Response(
                {'detail': 'Rôle non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AssignPermissionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        perm_id = serializer.validated_data['id_permission']

        deleted, _ = RolePermission.objects.filter(
            id_role=role,
            id_permission__id=perm_id
        ).delete()

        if deleted == 0:
            return Response(
                {'detail': 'Cette permission n\'est pas assignée à ce rôle.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({'detail': 'Permission retirée avec succès.'})
    

    # ─────────────────────────────────────────
# SESSIONS ACTIVES
# ─────────────────────────────────────────

class SessionListView(APIView):
    permission_classes = [IsAuthenticated, IsSessionActive]

    def get(self, request):
        sessions = SessionActive.objects.filter(est_active=True).order_by('-date_creation')
        data = []
        for s in sessions:
            data.append({
                'id': str(s.id),
                'utilisateur': f"{s.id_utilisateur.prenom} {s.id_utilisateur.nom}",
                'nom_utilisateur': s.id_utilisateur.nom_utilisateur,
                'adresse_ip': s.adresse_ip,
                'date_creation': s.date_creation,
                'date_expiration': s.date_expiration,
                'est_active': s.est_active,
            })
        return Response({'count': len(data), 'results': data})


# ─────────────────────────────────────────
# JOURNAL AUDIT
# ─────────────────────────────────────────

class JournalAuditListView(APIView):
    permission_classes = [IsAuthenticated, IsSessionActive]

    def get(self, request):
        logs = JournalAudit.objects.all().order_by('-horodatage')

        # Filtres optionnels
        action = request.query_params.get('action')
        module = request.query_params.get('module')
        if action:
            logs = logs.filter(action__iexact=action)
        if module:
            logs = logs.filter(module__iexact=module)

        data = []
        for log in logs:
            data.append({
                'id': str(log.id),
                'utilisateur': f"{log.id_utilisateur.prenom} {log.id_utilisateur.nom}",
                'nom_utilisateur': log.id_utilisateur.nom_utilisateur,
                'action': log.action,
                'module': log.module,
                'type_entite': log.type_entite,
                'adresse_ip': log.adresse_ip,
                'horodatage': log.horodatage,
            })
        return Response({'count': len(data), 'results': data})


class SessionForceLogoutView(APIView):
    permission_classes = [IsAuthenticated,IsSessionActive]

    def delete(self, request, session_id):
        try:
            session = SessionActive.objects.get(id=uuid.UUID(str(session_id)))
        except (SessionActive.DoesNotExist, ValueError):
            return Response(
                {'detail': 'Session non trouvée.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Désactiver la session
        session.est_active = False
        session.save(update_fields=['est_active'])

        # Blacklister le token
        try:
            refresh = RefreshToken(session.token)
            refresh.blacklist()
        except Exception:
            pass

        # Journal audit
        JournalAudit.objects.create(
            id_utilisateur=request.user,
            action='FORCE_LOGOUT',
            module='AUTH',
            type_entite='Session',
            id_entite=session.id,
            adresse_ip=get_client_ip(request)
        )

        return Response({'detail': 'Session déconnectée avec succès.'}) 




class JournalAuditView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = JournalAudit.objects.order_by('-horodatage')

        # Filtres
        action = request.query_params.get('action')
        module = request.query_params.get('module')
        utilisateur = request.query_params.get('utilisateur')
        print("utilisateur:", utilisateur)
        date_debut = request.query_params.get('date_debut')
        date_fin = request.query_params.get('date_fin')
        search = request.query_params.get('search')

        if action:
            queryset = queryset.filter(action=action)
        if module:
            queryset = queryset.filter(module=module)
        if utilisateur:
            queryset = queryset.filter(
                id_utilisateur__nom_utilisateur__icontains=utilisateur
            )
        if date_debut:
            queryset = queryset.filter(horodatage__date__gte=date_debut)
        if date_fin:
            queryset = queryset.filter(horodatage__date__lte=date_fin)
        if search:
            queryset = queryset.filter(
                Q(action__icontains=search) |
                Q(module__icontains=search) |
                Q(type_entite__icontains=search) |
                Q(id_utilisateur__nom_utilisateur__icontains=search) |
                Q(adresse_ip__icontains=search)
            )

        # Pagination manuelle
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size

        serializer = JournalAuditSerializer(queryset[start:end], many=True)

        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'results': serializer.data
        })