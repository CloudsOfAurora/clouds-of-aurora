# core/api/serializer.py
from rest_framework import serializers
from core.models import Settlement, Building, Settler, LoreEntry

class BuildingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Building
        fields = ['id', 'settlement', 'building_type', 'construction_progress', 'is_constructed']

class SettlerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settler
        fields = ['id', 'settlement', 'name', 'status', 'mood', 'hunger', 'assigned_building']

class SettlementSerializer(serializers.ModelSerializer):
    # Include nested buildings and settlers
    buildings = BuildingSerializer(many=True, read_only=True)  # assumes related_name="buildings" in Building model
    settlers = SettlerSerializer(many=True, read_only=True)      # assumes related_name="settlers" in Settler model

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
            'settlers'
        ]

class LoreEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LoreEntry
        fields = ['id', 'title', 'description', 'event_date']
