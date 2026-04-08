from rest_framework.routers import DefaultRouter
from .views import SousTraitantViewSet

router = DefaultRouter()
router.register('', SousTraitantViewSet, basename='soustraitant')

urlpatterns = router.urls
