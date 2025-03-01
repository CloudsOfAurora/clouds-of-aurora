# core/admin.py
from django.contrib import admin
from .models import Settlement, Building, Settler, LoreEntry

@admin.register(Settlement)
class SettlementAdmin(admin.ModelAdmin):
    list_display = ('name', 'food', 'wood', 'stone', 'created_at')

@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    list_display = ('settlement', 'building_type', 'construction_progress', 'is_constructed')

@admin.register(Settler)
class SettlerAdmin(admin.ModelAdmin):
    list_display = ('name', 'settlement', 'status', 'mood', 'hunger', 'assigned_building')

@admin.register(LoreEntry)
class LoreEntryAdmin(admin.ModelAdmin):
    list_display = ('title', 'event_date')
