from rest_framework.routers import DefaultRouter
from .views import (
    DemandeInterventionViewSet, OrdreTravailViewSet,
    AffectationEquipeViewSet, SuiviTempsViewSet,
    CommentaireOTViewSet, HistoriqueStatutOTViewSet,
    ConfigurationSLAViewSet
)

router = DefaultRouter()
router.register('demandes',     DemandeInterventionViewSet, basename='demande')
router.register('ots',          OrdreTravailViewSet,        basename='ot')
router.register('affectations', AffectationEquipeViewSet,   basename='affectation')
router.register('suivitemps',   SuiviTempsViewSet,          basename='suivi')
router.register('commentaires', CommentaireOTViewSet,       basename='commentaire')
router.register('historiques',  HistoriqueStatutOTViewSet,  basename='historique')
router.register('sla',          ConfigurationSLAViewSet,    basename='sla')

urlpatterns = router.urls