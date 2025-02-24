# core/api/urls.py
from django.urls import path
from core.views import (
    game_state_view,
    settlements_view,
    buildings_view,
    settlers_view,
    lore_entries_view,
    register,
    current_user_view,
    create_settlement,
    settlement_map_view,
    settlement_detail_view,
    place_building,
    assign_villager,
    gather_resource,
    toggle_assignment,  
)

urlpatterns = [
    path('game-state/', game_state_view, name='game_state'),
    path('settlements/', settlements_view, name='settlements'),
    path('settlements/<int:id>/', settlement_detail_view, name='settlement_detail'),
    path('settlement/<int:id>/map/', settlement_map_view, name='settlement_map'),
    path('building/place/', place_building, name='place_building'),
    path('villager/assign/', assign_villager, name='assign_villager'),
    path('gather_resource/', gather_resource, name='gather_resource'),
    path('toggle_assignment/', toggle_assignment, name='toggle_assignment'), 
    path('lore/', lore_entries_view, name='lore_entries'),
    path('register/', register, name='register'),
    path('current_user/', current_user_view, name='current_user'),
]
