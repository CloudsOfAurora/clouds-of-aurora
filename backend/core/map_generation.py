# core/map_generation.py

import random
from core.models import MapTile, ResourceNode
from core.config import TERRAIN_PROBABILITIES, RESOURCE_NODES, GRID_SIZE

def generate_map_for_settlement(settlement):
    for x in range(GRID_SIZE):
        for y in range(GRID_SIZE):
            terrain_type = random.choices(
                population=list(TERRAIN_PROBABILITIES.keys()),
                weights=list(TERRAIN_PROBABILITIES.values()),
                k=1
            )[0]
            tile = MapTile.objects.create(
                settlement=settlement,
                coordinate_x=x,
                coordinate_y=y,
                terrain_type=terrain_type
            )
            if terrain_type == "grass":
                for key, node in RESOURCE_NODES.items():
                    if random.random() < node["probability"]:
                        ResourceNode.objects.create(
                            name=node["name"],
                            resource_type=node["resource_type"],
                            quantity=node["initial_quantity"],
                            max_quantity=node["max_quantity"],
                            regen_rate=node["regen_rate"],
                            lore=node["lore"],
                            map_tile=tile
                        )
                        break
