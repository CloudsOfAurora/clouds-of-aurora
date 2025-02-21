# core/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.api.api_views import (
    SettlementViewSet,
    BuildingViewSet,
    SettlerViewSet,
    LoreEntryViewSet,
    GameStateView
)

router = DefaultRouter()
router.register(r'settlements', SettlementViewSet, basename='settlement')
router.register(r'buildings', BuildingViewSet)
router.register(r'settlers', SettlerViewSet)
router.register(r'lore', LoreEntryViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('game-state/', GameStateView.as_view(), name='game-state-api'),
]
