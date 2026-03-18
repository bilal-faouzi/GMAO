from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView, LogoutView, MeView,
    UtilisateurListCreateView, UtilisateurDetailView,
    RoleListCreateView, RoleDetailView,
    PermissionListCreateView,
    AssignRoleToUserView, AssignPermissionToRoleView,
    SessionListView, JournalAuditListView,
)

urlpatterns = [
    # Auth
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),

    # Users
    path('utilisateurs/', UtilisateurListCreateView.as_view(), name='utilisateurs'),
    path('utilisateurs/<uuid:user_id>/', UtilisateurDetailView.as_view(), name='utilisateur-detail'),
    path('utilisateurs/<uuid:user_id>/roles/', AssignRoleToUserView.as_view(), name='utilisateur-roles'),

    # Roles
    path('roles/', RoleListCreateView.as_view(), name='roles'),
    path('roles/<uuid:role_id>/', RoleDetailView.as_view(), name='role-detail'),
    path('roles/<uuid:role_id>/permissions/', AssignPermissionToRoleView.as_view(), name='role-permissions'),

    # Permissions
    path('permissions/', PermissionListCreateView.as_view(), name='permissions'),
    path('sessions/',      SessionListView.as_view(),     name='sessions'),
    path('journal-audits/', JournalAuditListView.as_view(), name='journal-audits'),
]