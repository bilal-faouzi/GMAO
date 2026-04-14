from rest_framework.routers import DefaultRouter
from .views import (
    ActifViewSet, HistoriqueStatutViewSet,
    IndisponibiliteViewSet, RemplacementViewSet
)

router = DefaultRouter()
router.register('actifs', ActifViewSet, basename='actif')
router.register('historiques', HistoriqueStatutViewSet, basename='historique')
router.register('indisponibilites', IndisponibiliteViewSet, basename='indisponibilite')
router.register('remplacements', RemplacementViewSet, basename='remplacement')

urlpatterns = router.urls