# core/models.py
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
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="settlements")
    created_at = models.DateTimeField(auto_now_add=True)  # New field for creation time

    def __str__(self):
        return f"{self.name} (Owner: {self.owner.username})"

# Other models remain unchanged
class Building(models.Model):
    BUILDING_TYPES = (
        ('lumber_mill', 'Lumber Mill'),
        ('quarry', 'Quarry'),
        ('farmhouse', 'Farmhouse'),
        ('house', 'House'),
    )
    settlement = models.ForeignKey(Settlement, on_delete=models.CASCADE, related_name='buildings')
    building_type = models.CharField(max_length=20, choices=BUILDING_TYPES)
    construction_progress = models.IntegerField(default=0)
    is_constructed = models.BooleanField(default=False)
    villagers_generated = models.IntegerField(default=0)
    
    # New fields to store grid coordinates
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
    STATUS_CHOICES = (('idle', 'Idle'), ('working', 'Working'), ('dead', 'Dead'))
    MOOD_CHOICES = (('content', 'Content'), ('hungry', 'Hungry'), ('sick', 'Sick'))
    settlement = models.ForeignKey("Settlement", on_delete=models.CASCADE, related_name='settlers')
    name = models.CharField(max_length=100)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='idle')
    mood = models.CharField(max_length=10, choices=MOOD_CHOICES, default='content')
    hunger = models.IntegerField(default=0)
    assigned_building = models.ForeignKey(
        "Building", on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_settlers'
    )
    birth_tick = models.IntegerField(null=True, blank=True)  # tick when villager was born
    experience = models.IntegerField(default=0)  # accumulative experience

    def __str__(self):
        return self.name
