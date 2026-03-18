from rest_framework.routers import DefaultRouter
from .views import (
    SocieteViewSet, SiteViewSet, SecteurViewSet, UniteViewSet,
    SpecialiteViewSet, EquipeViewSet, EquipeUtilisateurViewSet,
    AppartenanceOrganisationnelleViewSet
)

router = DefaultRouter()
router.register('societes', SocieteViewSet)
router.register('sites', SiteViewSet)
router.register('secteurs', SecteurViewSet)
router.register('unites', UniteViewSet)
router.register('specialites', SpecialiteViewSet)
router.register('equipes', EquipeViewSet)
router.register('equipe-utilisateurs', EquipeUtilisateurViewSet)
router.register('appartenances', AppartenanceOrganisationnelleViewSet)

urlpatterns = router.urls