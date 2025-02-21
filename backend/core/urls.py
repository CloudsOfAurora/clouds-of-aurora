# core/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.views import (
    game_state_view,
    settlements_view,
    buildings_view,
    settlers_view,
    lore_entries_view,
    register,
    create_settlement,
    current_user_view,
    settlement_detail_view,
    settlement_events_view,
    place_building,
    assign_villager,
)

urlpatterns = [
    path('game-state/', game_state_view, name='game-state'),
    path('settlements/', settlements_view, name='settlements'),
    path('buildings/', buildings_view, name='buildings'),
    path('settlers/', settlers_view, name='settlers'),
    path('lore/', lore_entries_view, name='lore'),
    path('register/', register, name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('settlement/create/', create_settlement, name='create_settlement'),
    path('current_user/', current_user_view, name='current_user'),
    path('settlement/view/<int:id>/', settlement_detail_view, name='settlement_detail'),
    path('building/place/', place_building, name='place_building'),
    path('villager/assign/', assign_villager, name='assign_villager'),
    path('settlement/<int:id>/events/', settlement_events_view, name='settlement_events'),
]
