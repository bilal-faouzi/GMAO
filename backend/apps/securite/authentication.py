import uuid
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from .models import Utilisateur


class GMaoJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that uses Utilisateur instead of Django's User model.
    """
    def get_user(self, validated_token):
        try:
            user_id = validated_token.get('user_id')
            utilisateur = Utilisateur.objects.get(
                id=uuid.UUID(str(user_id)),
                est_actif=True
            )
            return utilisateur
        except (Utilisateur.DoesNotExist, ValueError, TypeError):
            raise InvalidToken('Utilisateur non trouvé ou inactif.')