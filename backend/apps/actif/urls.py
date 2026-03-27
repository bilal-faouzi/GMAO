from rest_framework.routers import DefaultRouter
from .views import ActifViewSet, HistoriqueStatutActifViewSet

router = DefaultRouter()
router.register('actifs',              ActifViewSet,                basename='actif')
router.register('historique-statuts',  HistoriqueStatutActifViewSet, basename='historique-statut-actif')

urlpatterns = router.urls