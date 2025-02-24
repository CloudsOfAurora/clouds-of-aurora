# core/api/serializers.py
from rest_framework import serializers
from core.models import Settlement, Building, Settler, LoreEntry, MapTile, GameState
from core.config import BUILDING_DESCRIPTIONS, TILE_DESCRIPTIONS, TILE_COLORS, TILE_SPRITES, SEASON_MODIFIERS
from core.population import calculate_popularity_index 

# core/api/serializers.py
from rest_framework import serializers
from core.models import Settlement, Building, Settler, LoreEntry, MapTile, GameState
from core.config import BUILDING_DESCRIPTIONS, TILE_DESCRIPTIONS, TILE_COLORS, TILE_SPRITES, SEASON_MODIFIERS

class BuildingSerializer(serializers.ModelSerializer):
    description = serializers.SerializerMethodField()

    def get_description(self, obj):
        # If this building is a house, list its occupants.
        if obj.building_type == "house":
            occupants = obj.housed_settlers.all()
            if occupants.exists():
                names = ", ".join([occ.name for occ in occupants])
                return f"Wooden House: {names} live(s) here."
            else:
                return "Wooden House: Unoccupied."
        # Otherwise, return the standard description.
        return BUILDING_DESCRIPTIONS.get(obj.building_type, "No additional info available.")

    class Meta:
        model = Building
        fields = [
            "id",
            "building_type",
            "construction_progress",
            "is_constructed",
            "settlement_id",
            "coordinate_x",
            "coordinate_y",
            "description",
        ]


class SettlerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settler
        fields = ['id', 'settlement', 'name', 'status', 'mood', 'hunger', 'assigned_building']

class SettlementSerializer(serializers.ModelSerializer):
    buildings = BuildingSerializer(many=True, read_only=True)
    settlers = SettlerSerializer(many=True, read_only=True)
    net_food_rate = serializers.SerializerMethodField()
    net_wood_rate = serializers.SerializerMethodField()
    net_stone_rate = serializers.SerializerMethodField()
    current_season = serializers.SerializerMethodField()
    popularity_index = serializers.SerializerMethodField()  # New field

    class Meta:
        model = Settlement
        fields = [
            'id',
            'name',
            'food',
            'wood',
            'stone',
            'created_at',
            'last_updated',
            'buildings',
            'settlers',
            'net_food_rate',
            'net_wood_rate',
            'net_stone_rate',
            'current_season',
            'popularity_index',  # Included in output
        ]

    def _get_modifiers(self):
        # Retrieve the current game state and corresponding modifiers.
        gs = GameState.objects.get(pk=1)
        current_season = gs.current_season
        prod_modifier = SEASON_MODIFIERS.get(current_season, {}).get("production", 1.0)
        cons_modifier = SEASON_MODIFIERS.get(current_season, {}).get("consumption", 1.0)
        return prod_modifier, cons_modifier, current_season

    def get_net_food_rate(self, obj):
        prod_modifier, cons_modifier, _ = self._get_modifiers()
        net_rates = obj.calculate_net_resource_rates(prod_modifier, cons_modifier)
        return round(net_rates.get("food", 0), 1)

    def get_net_wood_rate(self, obj):
        prod_modifier, cons_modifier, _ = self._get_modifiers()
        net_rates = obj.calculate_net_resource_rates(prod_modifier, cons_modifier)
        return round(net_rates.get("wood", 0), 1)

    def get_net_stone_rate(self, obj):
        prod_modifier, cons_modifier, _ = self._get_modifiers()
        net_rates = obj.calculate_net_resource_rates(prod_modifier, cons_modifier)
        return round(net_rates.get("stone", 0), 1)

    def get_current_season(self, obj):
        _, _, current_season = self._get_modifiers()
        return current_season
    
    def get_popularity_index(self, obj):
        # Compute the popularity index via our population module
        return round(calculate_popularity_index(obj), 2)
    
class MapTileSerializer(serializers.ModelSerializer):
    description = serializers.SerializerMethodField()
    color = serializers.SerializerMethodField()
    sprite = serializers.SerializerMethodField()

    def get_description(self, obj):
        return TILE_DESCRIPTIONS.get(obj.terrain_type, "Unknown terrain.")

    def get_color(self, obj):
        return TILE_COLORS.get(obj.terrain_type, "#808080")

    def get_sprite(self, obj):
        return TILE_SPRITES.get(obj.terrain_type, None)

    class Meta:
        model = MapTile
        fields = ['coordinate_x', 'coordinate_y', 'terrain_type', 'description', 'color', 'sprite']

class LoreEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LoreEntry
        fields = ['id', 'title', 'description', 'event_date']

from core.models import Settlement, Building, Settler, LoreEntry, MapTile, GameState, ResourceNode

class ResourceNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceNode
        fields = ['id', 'name', 'resource_type', 'quantity', 'max_quantity', 'lore']

class MapTileSerializer(serializers.ModelSerializer):
    description = serializers.SerializerMethodField()
    color = serializers.SerializerMethodField()
    sprite = serializers.SerializerMethodField()
    resource_nodes = ResourceNodeSerializer(many=True, read_only=True)

    def get_description(self, obj):
        return TILE_DESCRIPTIONS.get(obj.terrain_type, "Unknown terrain.")

    def get_color(self, obj):
        return TILE_COLORS.get(obj.terrain_type, "#808080")

    def get_sprite(self, obj):
        return TILE_SPRITES.get(obj.terrain_type, None)

    class Meta:
        model = MapTile
        fields = ['coordinate_x', 'coordinate_y', 'terrain_type', 'description', 'color', 'sprite', 'resource_nodes']
