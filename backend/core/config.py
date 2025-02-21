# core/config.py
from datetime import timedelta

# --- General Simulation Settings ---
# Real-time tick interval in seconds (used by the scheduler)
TICK_INTERVAL_SECONDS = 5

# Total number of ticks before a season change
SEASON_CHANGE_TICKS = 120

# --- Starting Values for New Settlements ---
STARTING_RESOURCES = {
    "food": 50,
    "wood": 50,
    "stone": 50,
}

# Starting number of villagers created with a new settlement
STARTING_VILLAGERS = 2

# --- Seasons and Seasonal Modifiers ---
SEASONS = ["Spring", "Summer", "Autumn", "Winter"]

SEASON_MODIFIERS = {
    "Spring": {"production": 1.0, "consumption": 1.0, "construction_speed_multiplier": 1.0},
    "Summer": {"production": 1.0, "consumption": 1.0, "construction_speed_multiplier": 1.0},
    "Autumn": {"production": 1.0, "consumption": 1.0, "construction_speed_multiplier": 1.0},
    "Winter": {"production": 1.0, "consumption": 1.0, "construction_speed_multiplier": 1.0},
}

# --- Production and Consumption ---
# Production rates per production tick for resource-producing buildings.
PRODUCTION_RATES = {
    "lumber_mill": {"wood": 10},      # e.g., 10 wood per production tick
    "quarry": {"stone": 10},
    "farmhouse": {"food": 10},
}

# Villager consumption: units of food consumed per feeding tick.
VILLAGER_CONSUMPTION_RATE = 1

# Tick interval for production calculations (in ticks)
PRODUCTION_TICK = 1

# Tick interval for feeding (in ticks)
FEEDING_TICK = 1

# --- Building Costs ---
BUILDING_COSTS = {
    "house": {"wood": 10, "stone": 10},
    "farmhouse": {"wood": 10, "stone": 10},
    "lumber_mill": {"wood": 10, "stone": 0},  # Ensure lumber_mill cost is correct here
    "quarry": {"wood": 0, "stone": 10},
}

# --- Villager and Advanced Settler Settings ---
# List of potential names for new villagers
VILLAGER_NAMES = ["Alice", "Bob", "Charlie", "Diana", "Edward", "Fiona", "George", "Hannah"]

# Aging: how many tick units constitute one unit of age increase
VILLAGER_AGING_INTERVAL = 1  # Each tick increases age by 1 unit

# Maximum age before a villager dies naturally
MAX_VILLAGER_AGE = 200

# Experience gain per tick when a villager is assigned to work
EXPERIENCE_GAIN_PER_TICK = 1

# Reproduction: probability per production tick that a new villager is born if conditions are met
REPRODUCTION_RATE = 0.01

# Food surplus threshold required to trigger reproduction
REPRODUCTION_FOOD_THRESHOLD = 100

# Housing: maximum number of villagers a house can accommodate
HOUSE_CAPACITY = 4

# --- Map/Grid Settings (if needed) ---
GRID_SIZE = 10  # Number of tiles per row/column for the settlement map
TILE_WIDTH = 16  # Example tile width (could be used in canvas rendering)
