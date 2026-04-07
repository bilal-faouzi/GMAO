from rest_framework.routers import DefaultRouter
from .views import PieceViewSet, MouvementStockViewSet

router = DefaultRouter()
router.register('pieces',      PieceViewSet,         basename='piece')
router.register('mouvements',  MouvementStockViewSet, basename='mouvement')

urlpatterns = router.urls