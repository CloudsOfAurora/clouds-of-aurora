# core/config.py
from datetime import timedelta

# --- Map/Grid Settings ---
GRID_SIZE = 10
TILE_WIDTH = 16

# --- General Simulation Settings ---
TICK_INTERVAL_SECONDS = 5
SEASON_CHANGE_TICKS = 120

# --- Resource Node Definitions ---
# Each resource node type is finite and has properties for spawning and regeneration.
RESOURCE_NODES = {
    "skyberry_bush": {
        "name": "Skyberry Bush",
        "resource_type": "food",
        "probability": 0.15,           # Chance to appear on a given tile
        "initial_quantity": 50,
        "max_quantity": 50,
        "regen_rate": 2,               # Amount restored per tick
        "icon": "B",                 # Placeholder icon/symbol
        "lore": "A resilient bush bearing light, floating berries, cultivated naturally by the island’s gentle breezes.",
    },
    "windroot_cluster": {
        "name": "Windroot Cluster",
        "resource_type": "wood",
        "probability": 0.10,
        "initial_quantity": 40,
        "max_quantity": 40,
        "regen_rate": 1,
        "icon": "W",
        "lore": "Deep-anchored roots gripping the cliffs, their fibrous strands ideal for crafting and construction.",
    },
    "driftwood_tangle": {
        "name": "Driftwood Tangle",
        "resource_type": "wood",
        "probability": 0.10,
        "initial_quantity": 40,
        "max_quantity": 40,
        "regen_rate": 1,
        "icon": "L",
        "lore": "Twisted branches carried by the sky currents, remnants of ancient trees from shattered lands.",
    },
    "stormvine_clump": {
        "name": "Stormvine Clump",
        "resource_type": "wood",
        "probability": 0.05,
        "initial_quantity": 30,
        "max_quantity": 30,
        "regen_rate": 1,
        "icon": "V",
        "lore": "Hardy vines growing along rocky edges, their durable strands useful for binding and weaving.",
    },
    "drifting_boulders": {
        "name": "Drifting Boulders",
        "resource_type": "stone",
        "probability": 0.10,
        "initial_quantity": 60,
        "max_quantity": 60,
        "regen_rate": 1,
        "icon": "R",
        "lore": "Suspended rock formations, held together by faint magical remnants, easily broken down for resources.",
    },
    "hollowed_cliffside": {
        "name": "Hollowed Cliffside",
        "resource_type": "stone",
        "probability": 0.05,
        "initial_quantity": 55,
        "max_quantity": 55,
        "regen_rate": 1,
        "icon": "C",
        "lore": "Jagged rock faces rich in extractable stone, remnants of the land before the Cataclysm.",
    },
    "aetheric_geyser": {
        "name": "Aetheric Geyser",
        "resource_type": "magic",
        "probability": 0.03,
        "initial_quantity": 30,
        "max_quantity": 30,
        "regen_rate": 1,
        "icon": "G",
        "lore": "A rare vent where magical steam seeps from deep within the island, harnessed for arcane work.",
    },
    "ley_crystal_formation": {
        "name": "Ley Crystal Formation",
        "resource_type": "magic",
        "probability": 0.03,
        "initial_quantity": 30,
        "max_quantity": 30,
        "regen_rate": 1,
        "icon": "3",
        "lore": "Fragile crystals pulsating with residual aurora energy, shrouded in mystery and power.",
    },
    "aurora_bloom": {
        "name": "Aurora Bloom",
        "resource_type": "magic",
        "probability": 0.02,
        "initial_quantity": 25,
        "max_quantity": 25,
        "regen_rate": 1,
        "icon": "A",
        "lore": "A rare flower bathed in celestial light, its petals brimming with latent enchantment.",
    },
    "skyfish_pool": {
        "name": "Skyfish Pool",
        "resource_type": "food",
        "probability": 0.10,
        "initial_quantity": 50,
        "max_quantity": 50,
        "regen_rate": 2,
        "icon": "F",
        "lore": "A stillwater oasis among the clouds, where shimmering skyfish gather in the dawn’s glow.",
    },
    "cloudroot_fungus": {
        "name": "Cloudroot Fungus",
        "resource_type": "food",
        "probability": 0.10,
        "initial_quantity": 45,
        "max_quantity": 45,
        "regen_rate": 2,
        "icon": "M",
        "lore": "A fast-growing, floating fungus that absorbs skyborne moisture, valued for its nourishing properties.",
    },
    "sunglazed_plateau": {
        "name": "Sunglazed Plateau",
        "resource_type": "stone",
        "probability": 0.03,
        "initial_quantity": 40,
        "max_quantity": 40,
        "regen_rate": 1,
        "icon": "P",
        "lore": "A sunbaked rocky surface, where minerals gleam under the golden light.",
    },
    "echoing_stones": {
        "name": "Echoing Stones",
        "resource_type": "magic",
        "probability": 0.02,
        "initial_quantity": 25,
        "max_quantity": 25,
        "regen_rate": 1,
        "icon": "S",
        "lore": "Whispering stones infused with faint, forgotten energy, cracking them releases lingering power.",
    },
    "ancient_beacon": {
        "name": "Ancient Beacon",
        "resource_type": "magic",
        "probability": 0.01,
        "initial_quantity": 20,
        "max_quantity": 20,
        "regen_rate": 1,
        "icon": "L",
        "lore": "A relic from an age lost to time, still flickering with arcane energy, awaiting rediscovery.",
    },
}

GATHER_RATES = {
    "food": 2,
    "wood": 2,
    "stone": 2,
    "magic": 1,
}


# --- Map Generation Settings ---
TERRAIN_PROBABILITIES = {
    'grass': 0.5,
    'forest': 0.2,
    'mountain': 0.05,
    'river': 0.03,
}

# --- Tile Appearance & Descriptions ---
TILE_DESCRIPTIONS = {
    'grass': "A fertile patch of grass, ideal for farming or building.",
    'forest': "A dense forest rich in wood.",
    'mountain': "Rugged, rocky terrain.",
    'river': "A flowing river – you cannot build on this tile.",
}

# These colors are used for now; in future, sprites can replace them.
TILE_COLORS = {
    'grass': "#7cfc00",
    'forest': "#228B22",
    'mountain': "#8B4513",
    'river': "#1E90FF",
}
# Placeholder for sprite references (to be used in future)
TILE_SPRITES = {
    'grass': None,
    'forest': None,
    'mountain': None,
    'river': None,
}

# --- Starting Values for New Settlements ---
STARTING_RESOURCES = {
    "food": 50,
    "wood": 50,
    "stone": 50,
}

# --- Resource Cap ---
# Base maximum resources that a settlement can store.
RESOURCE_CAP = 500

# --- Seasons and Seasonal Modifiers ---
SEASONS = ["Spring", "Summer", "Autumn", "Winter"]
SEASON_MODIFIERS = {
    "Spring": {"production": 1.0, "consumption": 1.0, "construction_speed_multiplier": 1.0},
    "Summer": {"production": 1.0, "consumption": 1.0, "construction_speed_multiplier": 1.0},
    "Autumn": {"production": 1.0, "consumption": 1.0, "construction_speed_multiplier": 1.0},
    "Winter": {"production": 1.0, "consumption": 1.0, "construction_speed_multiplier": 1.0},
}

# --- Production and Consumption ---
PRODUCTION_RATES = {
    "lumber_mill": {"wood": 10},
    "quarry": {"stone": 10},
    "farmhouse": {"food": 10},
}
VILLAGER_CONSUMPTION_RATE = 1
PRODUCTION_TICK = 1
FEEDING_TICK = 1

# --- Building Costs & Descriptions ---
BUILDING_COSTS = {
    "house": {"wood": 10, "stone": 10},
    "farmhouse": {"wood": 10, "stone": 10},
    "lumber_mill": {"wood": 10, "stone": 0},
    "quarry": {"wood": 0, "stone": 10},
    "warehouse": {"wood": 100, "stone": 100},
}

# --- Warehouse Bonus ---
WAREHOUSE_BONUS = 200

BUILDING_DESCRIPTIONS = {
    "lumber_mill": "Processes logs into usable wood. +10 wood per production tick.",
    "quarry": "Extracts stone from the ground. +10 stone per production tick.",
    "farmhouse": "Produces food by farming the land. +10 food per production tick.",
    "house": "Provides shelter for up to 4 villagers.",
    "warehouse": "Increases resource storage cap by 200 for each warehouse built.",

}

# --- Villager Settings ---
STARTING_VILLAGERS = 2
VILLAGER_NAMES = ["Alice", "Bob", "Charlie", "Diana", "Edward", "Fiona", "George", "Hannah"]
VILLAGER_AGING_INTERVAL = 1
MAX_VILLAGER_AGE = 99999999999
EXPERIENCE_GAIN_PER_TICK = 1
REPRODUCTION_RATE = 0.1
REPRODUCTION_FOOD_THRESHOLD = 100
HOUSE_CAPACITY = 4