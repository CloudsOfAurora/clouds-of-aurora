# core/config.py
from datetime import timedelta

# --- Map/Grid Settings ---
GRID_SIZE = 10
TILE_WIDTH = 16

# --- General Simulation Settings ---
TICK_INTERVAL_SECONDS = 5
SEASON_CHANGE_TICKS = 20

# --- Resource Node Definitions ---
# Each resource node type is finite and has properties for spawning and regeneration.
RESOURCE_NODES = {
    "skyberry_bush": {
        "name": "Skyberry",
        "resource_type": "food",
        "probability": 0.07,           
        "initial_quantity": 50,
        "max_quantity": 50,
        "regen_rate": 2,               
        "icon": "B",                 
        "lore": "A resilient bush bearing light, floating berries, cultivated naturally by the island’s gentle breezes.",
    },
    "skyfish_pool": {
        "name": "Skyfish Pool",
        "resource_type": "food",
        "probability": 0.01,
        "initial_quantity": 50,
        "max_quantity": 50,
        "regen_rate": 2,
        "icon": "F",
        "lore": "A stillwater oasis among the clouds, where shimmering skyfish gather in the dawn’s glow.",
    },
    "cloudroot_fungus": {
        "name": "Cloudroot Fungus",
        "resource_type": "food",
        "probability": 0.0,
        "initial_quantity": 45,
        "max_quantity": 45,
        "regen_rate": 2,
        "icon": "M",
        "lore": "A fast-growing, floating fungus that absorbs skyborne moisture, valued for its nourishing properties.",
    },
    "windroot_cluster": {
        "name": "Windroot",
        "resource_type": "wood",
        "probability": 0.07,
        "initial_quantity": 40,
        "max_quantity": 40,
        "regen_rate": 1,
        "icon": "W",
        "lore": "Deep-anchored roots cluster gripping the cliffs, their fibrous strands ideal for crafting and construction.",
    },
    "driftwood_tangle": {
        "name": "Driftwood",
        "resource_type": "wood",
        "probability": 0.0,
        "initial_quantity": 40,
        "max_quantity": 40,
        "regen_rate": 1,
        "icon": "L",
        "lore": "Stack of twisted branches carried by the sky currents, remnants of ancient trees from shattered lands.",
    },
    "stormvine_clump": {
        "name": "Stormvine",
        "resource_type": "wood",
        "probability": 0.01,
        "initial_quantity": 30,
        "max_quantity": 30,
        "regen_rate": 1,
        "icon": "V",
        "lore": "Hardy clump of vines growing along rocky edges, their durable strands useful for binding and weaving.",
    },
    "drifting_boulders": {
        "name": "Drifting Boulders",
        "resource_type": "stone",
        "probability": 0.05,
        "initial_quantity": 60,
        "max_quantity": 60,
        "regen_rate": 1,
        "icon": "R",
        "lore": "Suspended rock formations, held together by faint magical remnants, easily broken down for resources.",
    },
        "sunglazed_plateau": {
        "name": "Plateau",
        "resource_type": "stone",
        "probability": 0.01,
        "initial_quantity": 40,
        "max_quantity": 40,
        "regen_rate": 1,
        "icon": "P",
        "lore": "A sunbaked rocky surface, where minerals gleam under the golden light.",
    },
    "hollowed_cliffside": {
        "name": "Cliffside",
        "resource_type": "stone",
        "probability": 0.009,
        "initial_quantity": 55,
        "max_quantity": 55,
        "regen_rate": 1,
        "icon": "C",
        "lore": "Jagged rock faces rich in extractable stone, remnants of the land before the Cataclysm.",
    },
    "aetheric_geyser": {
        "name": "Aetheric Geyser",
        "resource_type": "magic",
        "probability": 0.0,
        "initial_quantity": 30,
        "max_quantity": 30,
        "regen_rate": 1,
        "icon": "G",
        "lore": "A rare vent where magical steam seeps from deep within the island, harnessed for arcane work.",
    },
    "ley_crystal_formation": {
        "name": "Ley Crystal Formation",
        "resource_type": "magic",
        "probability": 0.001,
        "initial_quantity": 30,
        "max_quantity": 30,
        "regen_rate": 1,
        "icon": "3",
        "lore": "Fragile crystals pulsating with residual aurora energy, shrouded in mystery and power.",
    },
    "aurora_bloom": {
        "name": "Aurora Bloom",
        "resource_type": "magic",
        "probability": 0.001,
        "initial_quantity": 25,
        "max_quantity": 25,
        "regen_rate": 1,
        "icon": "A",
        "lore": "A rare flower bathed in celestial light, its petals brimming with latent enchantment.",
    },
    "echoing_stones": {
        "name": "Echoing Stones",
        "resource_type": "magic",
        "probability": 0.0,
        "initial_quantity": 25,
        "max_quantity": 25,
        "regen_rate": 1,
        "icon": "S",
        "lore": "Whispering stones infused with faint, forgotten energy, cracking them releases lingering power.",
    },
    "ancient_beacon": {
        "name": "Ancient Beacon",
        "resource_type": "magic",
        "probability": 0.0001,
        "initial_quantity": 20,
        "max_quantity": 20,
        "regen_rate": 1,
        "icon": "L",
        "lore": "A relic from an age lost to time, still flickering with arcane energy, awaiting rediscovery.",
    },
}

GATHER_RATES = {
    "food": 5,
    "wood": 5,
    "stone": 5,
    "magic": 1,
}

# --- Map Generation Settings ---
TERRAIN_PROBABILITIES = {
    'grass': 0.7,
    'forest': 0.3,
    'mountain': 0.1,
    'lake': 0.1,
}

# --- Tile Appearance & Descriptions ---
TILE_DESCRIPTIONS = {
    'grass': "Fertile patch of grass.",
    'forest': "Dense forest rich in wood.",
    'mountain': "Rugged, rocky terrain.",
    'lake': "Fresh water source.",
}

# These colors are used for now; in future, sprites can replace them.
TILE_COLORS = {
    'grass': "#7cfc00",
    'forest': "#228B22",
    'mountain': "#8B4513",
    'lake': "#1E90FF",
}
# Placeholder for sprite references (to be used in future)
TILE_SPRITES = {
    'grass': None,
    'forest': None,
    'mountain': None,
    'lake': None,
}

# --- Starting Values for New Settlements ---
STARTING_RESOURCES = {
    "food": 50,
    "wood": 10,
    "stone": 10,
    "magic": 0,
}

# --- Resource Cap ---
# Base maximum resources that a settlement can store.
RESOURCE_CAP = 500

# --- Seasons and Seasonal Modifiers ---
SEASONS = ["Spring", "Summer", "Autumn", "Winter"]
SEASON_MODIFIERS = {
    "Spring": {"production": 1.5, "consumption": 1.0, "construction_speed_multiplier": 1.0},
    "Summer": {"production": 1.5, "consumption": 1.0, "construction_speed_multiplier": 1.0},
    "Autumn": {"production": 1.0, "consumption": 1.0, "construction_speed_multiplier": 0.5},
    "Winter": {"production": 0.5, "consumption": 1.5, "construction_speed_multiplier": 0.2},
}

# --- Production and Consumption ---
PRODUCTION_RATES = {
    "lumber_mill": {"wood": 2},
    "quarry": {"stone": 2},
    "farmhouse": {"food": 4},
}
VILLAGER_CONSUMPTION_RATE = 1
PRODUCTION_TICK = 1
FEEDING_TICK = 1

# --- Warehouse Bonus ---
WAREHOUSE_BONUS = 200

BUILDING_DESCRIPTIONS = {
    "lumber_mill": "Processes logs into usable wood.",
    "quarry": "Extracts stone from the ground.",
    "farmhouse": "Produces food by farming the land.",
    "house": "Provides shelter for your villagers.",
    "warehouse": "Increases resource storage cap by 200 for each warehouse built.",
}

# --- Villager Settings ---
STARTING_VILLAGERS = 2
VILLAGER_NAMES = [
    "Ava", "Ben", "Cleo", "Dax", "Elin", "Finn", "Gwen", "Hale",
    "Iris", "Jude", "Kai", "Lena", "Milo", "Nia", "Otis", "Pia",
    "Quinn", "Rex", "Sage", "Tess", "Uma", "Vito", "Wren", "Xavi",
    "Yara", "Zane", "Arlo", "Bree", "Cian", "Dara", "Ewan", "Faye",
    "Gio", "Hope", "Ines", "Joss", "Kian", "Lior", "Mira", "Nico",
    "Oren", "Pax", "Rina", "Seth", "Tova", "Uri", "Vera", "Wynn",
    "Yves", "Zora", "Alden", "Bran", "Caleb", "Dario", "Ember",
    "Flint", "Gideon", "Haven", "Isa", "Jonas", "Kade", "Liora",
    "Matteo", "Nola", "Orin", "Petra", "Rowan", "Silas", "Thane",
    "Ulric", "Vesper", "Wilma", "Xander", "Yelena", "Zephyr",
    "Aerin", "Blaise", "Cassia", "Dane", "Elara", "Felix", "Gael",
    "Hollis", "Ivanna", "Jace", "Kael", "Lucian", "Maia", "Nash",
    "Oona", "Perrin", "Ronan", "Selene", "Torin", "Uriah", "Vail",
    "Willa", "Xia", "Yoren", "Ziva", "Adric", "Bastian", "Calla",
    "Dorian", "Elias", "Freya", "Gareth", "Halcyon", "Ivo", "Jorin",
    "Kieran", "Leif", "Mirelle", "Noctis", "Oberon", "Pallas",
    "Rhea", "Seren", "Talon", "Ulysses", "Vanna", "Wrenna",
    "Xanthe", "Yannis", "Zelda", "Alric", "Brisa", "Corin",
    "Draven", "Eowyn", "Faelan", "Giselle", "Harlan", "Iliana",
    "Jareth", "Kaida", "Lorien", "Marek", "Niven", "Orla", "Paxton",
    "Ronan", "Sable", "Taryn", "Ursa", "Varian", "Wyatt", "Xerxes",
    "Ysolde", "Zorion"
]


VILLAGER_AGING_INTERVAL = 1
MAX_VILLAGER_AGE = 500
EXPERIENCE_GAIN_PER_TICK = 1
REPRODUCTION_RATE = 0.1
REPRODUCTION_FOOD_THRESHOLD = 300
HOUSE_CAPACITY = 4

# --- Building Costs & Descriptions ---
BUILDING_COSTS = {
    "house": {"wood": 100, "stone": 50},
    "farmhouse": {"wood": 30, "stone": 10},
    "lumber_mill": {"wood": 30, "stone": 10},
    "quarry": {"wood": 50, "stone": 0},
    "warehouse": {"wood": 300, "stone": 300},
}

# --- Unified Game Object Definitions ---
GAME_OBJECTS = {
    "buildings": {
        "house": {
            "name": "House",
            "cost": {"wood": 100, "stone": 50},
            "description": "Provides shelter for up to 4 villagers.",
            "icon": "H",
        },
        "farmhouse": {
            "name": "Farmhouse",
            "cost": {"wood": 30, "stone": 10},
            "description": "Produces food by farming the land.",
            "icon": "F",
        },
        "lumber_mill": {
            "name": "Lumber Mill",
            "cost": {"wood": 30, "stone": 10},
            "description": "Processes logs into usable wood.",
            "icon": "L",
        },
        "quarry": {
            "name": "Quarry",
            "cost": {"wood": 50, "stone": 0},
            "description": "Extracts stone from the ground.",
            "icon": "Q",
        },
        "warehouse": {
            "name": "Warehouse",
            "cost": {"wood": 200, "stone": 200},
            "description": "Increases resource storage cap by 200 per warehouse built.",
            "icon": "W",
        },
    },
    "resource_nodes": RESOURCE_NODES,
}
