from rest_framework.permissions import BasePermission
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone as dj_timezone
from .models import SessionActive

class IsSessionActive(BasePermission):
    def has_permission(self, request, view):
        token = request.auth

        if not token:
            raise AuthenticationFailed("Token manquant")

        session_id = token.get('session_id')
        if not session_id:
            raise AuthenticationFailed("Session invalide")

        try:
            session = SessionActive.objects.get(id=session_id)
        except SessionActive.DoesNotExist:
            raise AuthenticationFailed("Session inexistante")

        if not session.est_active:
            raise AuthenticationFailed("Session désactivée")

        if session.date_expiration < dj_timezone.now():
            raise AuthenticationFailed("Session expirée")

        return True
    
    