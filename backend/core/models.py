from django.db import models
from django.contrib.auth.models import User  # Import the built-in User model

# Model for game state (tick count and current season)
class GameState(models.Model):
    tick_count = models.IntegerField(default=0)
    current_season = models.CharField(max_length=20, default="Spring")

    def __str__(self):
        return f"Tick: {self.tick_count}, Season: {self.current_season}"


# Updated Settlement model to include an owner (User) and created_at field
class Settlement(models.Model):
    name = models.CharField(max_length=100)
    food = models.IntegerField(default=50)
    wood = models.IntegerField(default=50)
    stone = models.IntegerField(default=50)
    magic = models.IntegerField(default=0)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="settlements")
    created_at = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} (Owner: {self.owner.username})"
        
    def calculate_net_resource_rates(self, prod_modifier=1.0, cons_modifier=1.0):
        """
        Calculates net production rates for each resource based on production buildings and villager consumption.
        New production building types can be added to PRODUCTION_RATES without needing to change this logic.
        """
        from core.config import PRODUCTION_RATES, PRODUCTION_TICK, VILLAGER_CONSUMPTION_RATE, FEEDING_TICK
        
        production_totals = {}
        production_buildings = self.buildings.filter(is_constructed=True, assigned_settlers__isnull=False).distinct()
        for building in production_buildings:
            if building.building_type in PRODUCTION_RATES:
                worker_count = building.assigned_settlers.count()
                for resource, rate in PRODUCTION_RATES[building.building_type].items():
                    production_totals[resource] = production_totals.get(resource, 0) + (rate * prod_modifier * worker_count / PRODUCTION_TICK)
        villager_count = self.settlers.filter(status__in=["idle", "working"]).count()
        food_consumption = villager_count * (VILLAGER_CONSUMPTION_RATE / FEEDING_TICK * cons_modifier)
        production_totals["food"] = production_totals.get("food", 0) - food_consumption
        return production_totals


# Single definition of MapTile model
class MapTile(models.Model):
    TERRAIN_CHOICES = (
        ('grass', 'Grass'),
        ('forest', 'Forest'),
        ('bush', 'Bush'),
        ('stone_deposit', 'Stone Deposit'),
        ('mountain', 'Mountain'),
        ('river', 'River'),
        ('ley_line', 'Magical Ley Line'),
    )
    settlement = models.ForeignKey(Settlement, on_delete=models.CASCADE, related_name='map_tiles')
    coordinate_x = models.IntegerField()
    coordinate_y = models.IntegerField()
    terrain_type = models.CharField(max_length=20, choices=TERRAIN_CHOICES)

    def __str__(self):
        return f"Tile ({self.coordinate_x}, {self.coordinate_y}) - {self.terrain_type}"


class Building(models.Model):
    BUILDING_TYPES = (
        ('lumber_mill', 'Lumber Mill'),
        ('quarry', 'Quarry'),
        ('farmhouse', 'Farmhouse'),
        ('house', 'House'),
        ('warehouse', 'Warehouse'),
    )
    settlement = models.ForeignKey(Settlement, on_delete=models.CASCADE, related_name='buildings')
    building_type = models.CharField(max_length=20, choices=BUILDING_TYPES)
    construction_progress = models.IntegerField(default=0)
    is_constructed = models.BooleanField(default=False)
    villagers_generated = models.IntegerField(default=0)
    coordinate_x = models.IntegerField(null=True, blank=True)
    coordinate_y = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.get_building_type_display()} in {self.settlement.name} at ({self.coordinate_x}, {self.coordinate_y})"


class EventLog(models.Model):
    EVENT_TYPES = (
        ("building_placed", "Building Placed"),
        ("villager_assigned", "Villager Assigned"),
        ("villager_hungry", "Villager Hungry"),
        ("villager_dead", "Villager Dead"),
        ("season_changed", "Season Changed"),
    )
    settlement = models.ForeignKey("Settlement", on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_event_type_display()} at {self.timestamp}"


class LoreEntry(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    event_date = models.DateField()

    def __str__(self):
        return self.title
    

class Settler(models.Model):
    STATUS_CHOICES = (('idle', 'Idle'), ('working', 'Working'), ('gathering', 'Gathering'), ('dead', 'Dead'))
    MOOD_CHOICES = (('content', 'Content'), ('hungry', 'Hungry'), ('sick', 'Sick'))
    settlement = models.ForeignKey("Settlement", on_delete=models.CASCADE, related_name='settlers')
    name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='idle')
    mood = models.CharField(max_length=10, choices=MOOD_CHOICES, default='content')
    hunger = models.IntegerField(default=0)
    assigned_building = models.ForeignKey(
        "Building", on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_settlers'
    )
    housing_assigned = models.ForeignKey(
        "Building", on_delete=models.SET_NULL, null=True, blank=True, related_name='housed_settlers'
    )
    gathering_resource_node = models.ForeignKey(
        'ResourceNode',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_gatherer'
    )
    birth_tick = models.IntegerField(null=True, blank=True)
    experience = models.IntegerField(default=0)

    def __str__(self):
        return self.name


class ResourceNode(models.Model):
    RESOURCE_TYPE_CHOICES = (
        ('food', 'Food'),
        ('wood', 'Wood'),
        ('stone', 'Stone'),
        ('magic', 'Magic'),
    )
    name = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=10, choices=RESOURCE_TYPE_CHOICES)
    quantity = models.IntegerField(default=100)
    max_quantity = models.IntegerField(default=100)
    regen_rate = models.IntegerField(default=5)  # Amount regenerated per tick
    lore = models.TextField(blank=True)
    map_tile = models.ForeignKey('MapTile', on_delete=models.CASCADE, related_name='resource_nodes')
    # Track the single villager gathering from this node.
    gatherer = models.OneToOneField(
        'Settler',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='gathering_resource'
    )

    def __str__(self):
        return f"{self.name} ({self.resource_type}) at Tile ({self.map_tile.coordinate_x}, {self.map_tile.coordinate_y})"

    def process_gathering_tick(self):
        if not self.gatherer:
            return
        from core.config import GATHER_RATES, RESOURCE_CAP
        rate = GATHER_RATES.get(self.resource_type, 1)
        self.quantity -= rate
        self.save(update_fields=["quantity"])
        settlement = self.map_tile.settlement
        current_amount = getattr(settlement, self.resource_type, 0)
        new_amount = min(current_amount + rate, RESOURCE_CAP)
        setattr(settlement, self.resource_type, new_amount)
        settlement.save(update_fields=[self.resource_type])
        if self.quantity <= 0:
            from core.event_logger import log_event
            log_event(settlement, "resource_depleted", f"{self.name} has been depleted.")
            if self.gatherer:
                self.gatherer.gathering_resource_node = None
                self.gatherer.status = "idle"
                self.gatherer.save(update_fields=["gathering_resource_node", "status"])
            self.delete()
