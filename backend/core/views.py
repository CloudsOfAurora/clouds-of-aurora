# core/views.py
import json
import logging
import time

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.core.serializers.json import DjangoJSONEncoder

from core.config import (
    BUILDING_COSTS,
    GRID_SIZE,
    PRODUCTION_RATES,
    VILLAGER_CONSUMPTION_RATE,
    SEASON_MODIFIERS,
    PRODUCTION_TICK,
    FEEDING_TICK,
)
from core.models import GameState, Settlement, Building, Settler, LoreEntry, MapTile
from core.decorators import jwt_required
from core.event_logger import log_event
from core.population import calculate_popularity_index

from core.api.serializers import MapTileSerializer, BuildingSerializer, SettlerSerializer, LoreEntrySerializer, BUILDING_DESCRIPTIONS

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


# --- Helper Functions ---

def get_settlement_or_error(request, settlement_id):
    """
    Helper that fetches a settlement and verifies that the authenticated user owns it.
    Returns a tuple: (settlement, error_response) where error_response is None on success.
    """
    try:
        settlement = Settlement.objects.get(id=settlement_id)
        if settlement.owner_id != request.user.id:
            return None, JsonResponse({"error": "Not authorized."}, status=403)
        return settlement, None
    except Settlement.DoesNotExist:
        return None, JsonResponse({"error": "Settlement not found."}, status=404)


# --- Game State & Global Endpoints ---

def game_state_view(request):
    logger.debug("Received request for game state")
    try:
        gs = GameState.objects.get(pk=1)
    except GameState.DoesNotExist:
        logger.debug("GameState not found. Creating new GameState.")
        gs = GameState.objects.create(tick_count=0, current_season="Spring")
    data = {"tick_count": gs.tick_count, "current_season": gs.current_season}
    logger.debug(f"Returning game state: {data}")
    return JsonResponse(data)

def settlements_view(request):
    logger.debug("Received request for settlements")
    qs = Settlement.objects.all().values(
        "id", "name", "food", "wood", "stone", "owner_id", "created_at"
    )
    data = list(qs)
    logger.debug(f"Returning settlements: {data}")
    return JsonResponse(data, safe=False)

def buildings_view(request):
    buildings = Building.objects.all()
    serialized = BuildingSerializer(buildings, many=True).data
    return JsonResponse(serialized, safe=False, json_dumps_params={"indent": 2}, encoder=DjangoJSONEncoder)

def settlers_view(request):
    logger.debug("Received request for settlers")
    try:
        qs = Settler.objects.select_related("assigned_building", "gathering_resource_node").all()
        serialized = SettlerSerializer(qs, many=True).data
        gs = GameState.objects.get(pk=1)
        for settler in serialized:
            settler["age"] = gs.tick_count - settler["birth_tick"] if settler["birth_tick"] is not None else "N/A"
        logger.debug(f"Returning serialized settlers: {serialized}")
        return JsonResponse(serialized, safe=False)
    except GameState.DoesNotExist:
        return JsonResponse({"error": "GameState not found."}, status=500)
    except Exception as e:
        logger.exception("Error in settlers_view: %s", e)
        return JsonResponse({"error": str(e)}, status=500)

def lore_entries_view(request):
    logger.debug("Received request for lore entries")
    qs = LoreEntry.objects.all().values("id", "title", "description", "event_date")
    data = list(qs)
    logger.debug(f"Returning lore entries: {data}")
    return JsonResponse(data, safe=False)


# --- Authentication & User Endpoints ---

@csrf_exempt
def register(request):
    logger.debug("Received registration request")
    if request.method != "POST":
        logger.error("Invalid HTTP method for register")
        return JsonResponse({"error": "Only POST method is allowed."}, status=405)
    try:
        data = json.loads(request.body)
        username = data.get("username")
        password = data.get("password")
        email = data.get("email", "")
        logger.debug(f"Registration data received: username={username}, email={email}")
        if not username or not password:
            logger.error("Username or password missing")
            return JsonResponse({"error": "Username and password are required."}, status=400)
        if User.objects.filter(username=username).exists():
            logger.error(f"Username '{username}' already exists")
            return JsonResponse({"error": "Username already exists."}, status=400)
        User.objects.create_user(username=username, password=password, email=email)
        logger.info(f"User '{username}' registered successfully.")
        return JsonResponse({"message": "User registered successfully."}, status=201)
    except Exception as e:
        logger.exception("Error during registration")
        return JsonResponse({"error": str(e)}, status=500)

@jwt_required
def current_user_view(request):
    logger.debug("Received current_user request")
    data = {"id": request.user.id, "username": request.user.username, "email": request.user.email}
    logger.debug(f"Returning authenticated user data: {data}")
    return JsonResponse(data)


# --- Settlement & Building Management Endpoints ---

@csrf_exempt
@jwt_required
def create_settlement(request):
    logger.debug("Received create_settlement request")
    if request.method != "POST":
        logger.error("Invalid HTTP method for create_settlement")
        return JsonResponse({"error": "Only POST method is allowed."}, status=405)
    try:
        data = json.loads(request.body)
        name = data.get("name")
        logger.debug(f"Settlement creation data: name={name}")
        if not name:
            logger.error("Settlement name is missing")
            return JsonResponse({"error": "Settlement name is required."}, status=400)
        from core.config import STARTING_RESOURCES, STARTING_VILLAGERS, VILLAGER_NAMES
        settlement = Settlement.objects.create(
            name=name,
            owner=request.user,
            food=STARTING_RESOURCES["food"],
            wood=STARTING_RESOURCES["wood"],
            stone=STARTING_RESOURCES["stone"],
            magic=STARTING_RESOURCES.get("magic", 0),
        )
        import random
        for _ in range(STARTING_VILLAGERS):
            villager_name = random.choice(VILLAGER_NAMES)
            Settler.objects.create(
                settlement=settlement,
                name=villager_name,
                status="idle",
                mood="content",
                hunger=0,
                birth_tick=None,
                experience=0,
            )
        from core.map_generation import generate_map_for_settlement
        generate_map_for_settlement(settlement)
        logger.info(f"Settlement '{name}' created successfully for user '{request.user.username}'")
        return JsonResponse({"message": "Settlement created successfully.", "settlement_id": settlement.id}, status=201)
    except Exception as e:
        logger.exception("Error during settlement creation")
        return JsonResponse({"error": str(e)}, status=500)

@jwt_required
def settlement_map_view(request, id):
    logger.debug("Received settlement_map_view request for settlement id: %s", id)
    settlement, error_response = get_settlement_or_error(request, id)
    if error_response:
        return error_response
    tiles = settlement.map_tiles.all()
    serialized_tiles = MapTileSerializer(tiles, many=True).data
    logger.debug("Returning map tiles: %s", serialized_tiles)
    return JsonResponse(serialized_tiles, safe=False)

@jwt_required
def settlement_detail_view(request, id):
    logger.debug("Received settlement_detail_view request for id: %s", id)
    settlement, error_response = get_settlement_or_error(request, id)
    if error_response:
        return error_response

    settlement_data = Settlement.objects.filter(id=id).values(
        "id", "name", "food", "wood", "stone", "magic", "created_at", "last_updated"
    ).first()
    if not settlement_data:
        return JsonResponse({"error": "Settlement not found."}, status=404)

    buildings_qs = settlement.buildings.all().values(
        "id", "building_type", "construction_progress", "is_constructed", "coordinate_x", "coordinate_y"
    )
    buildings = list(buildings_qs)
    for b in buildings:
        building_obj = settlement.buildings.get(id=b["id"])
        if building_obj.building_type == "house":
            occupants = building_obj.housed_settlers.all()
            if occupants.exists():
                b["assigned"] = (f"{occupants.first().name} lives here" 
                                 if occupants.count() == 1 
                                 else f"{', '.join(occ.name for occ in occupants)} live here")
            else:
                b["assigned"] = "Empty"
        else:
            workers = building_obj.assigned_settlers.all()
            b["assigned"] = workers.first().name if workers.exists() else ""
    gs = GameState.objects.get(pk=1)
    prod_modifier = SEASON_MODIFIERS.get(gs.current_season, {}).get("production", 1.0)
    cons_modifier = SEASON_MODIFIERS.get(gs.current_season, {}).get("consumption", 1.0)
    net_rates = settlement.calculate_net_resource_rates(prod_modifier, cons_modifier)
    data = {
        "id": settlement_data["id"],
        "name": settlement_data["name"],
        "food": settlement_data["food"],
        "wood": settlement_data["wood"],
        "stone": settlement_data["stone"],
        "magic": settlement_data.get("magic", 0),
        "created_at": settlement_data["created_at"],
        "buildings": buildings,
        "net_food_rate": round(net_rates.get("food", 0), 1),
        "net_wood_rate": round(net_rates.get("wood", 0), 1),
        "net_stone_rate": round(net_rates.get("stone", 0), 1),
        "net_magic_rate": 0,
        "current_season": gs.current_season,
        "popularity_index": round(calculate_popularity_index(settlement), 2),
    }
    return JsonResponse(data)

@csrf_exempt
@jwt_required
def place_building(request):
    logger.debug("Received place_building request")
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method is allowed."}, status=405)
    try:
        data = json.loads(request.body)
        settlement_id = data.get("settlement_id")
        building_type = data.get("building_type")
        tile_x = data.get("tile_x")
        tile_y = data.get("tile_y")
        if not settlement_id or not building_type or tile_x is None or tile_y is None:
            return JsonResponse({"error": "Settlement ID, building type, and tile coordinates are required."}, status=400)
        if building_type not in BUILDING_COSTS:
            return JsonResponse({"error": "Invalid building type."}, status=400)
        settlement, error_response = get_settlement_or_error(request, settlement_id)
        if error_response:
            return error_response
        if not (0 <= tile_x < GRID_SIZE and 0 <= tile_y < GRID_SIZE):
            return JsonResponse({"error": "Tile coordinates must be between 0 and 9."}, status=400)
        if settlement.buildings.filter(coordinate_x=tile_x, coordinate_y=tile_y).exists():
            return JsonResponse({"error": "Tile is already occupied."}, status=400)
        tile = settlement.map_tiles.filter(coordinate_x=tile_x, coordinate_y=tile_y).first()
        if not tile:
            return JsonResponse({"error": "Map tile not found."}, status=404)
        if tile.terrain_type == "lake":
            return JsonResponse({"error": "Cannot build on lake tile."}, status=400)
        
        # Enforce terrain restrictions:
        if building_type == "quarry" and tile.terrain_type != "mountain":
            return JsonResponse({"error": "Quarries can only be built on mountain tiles."}, status=400)
        if building_type == "lumber_mill" and tile.terrain_type != "forest":
            return JsonResponse({"error": "Lumber Mills can only be built on forest tiles."}, status=400)
        
        cost = BUILDING_COSTS[building_type]
        if settlement.wood < cost["wood"] or settlement.stone < cost["stone"]:
            return JsonResponse({"error": "Insufficient resources."}, status=400)
        settlement.wood -= cost["wood"]
        settlement.stone -= cost["stone"]
        settlement.save()
        building = Building.objects.create(
            settlement=settlement,
            building_type=building_type,
            construction_progress=0,
            villagers_generated=0,
            coordinate_x=tile_x,
            coordinate_y=tile_y,
        )
        log_event(settlement, "building_placed", f"{building.building_type} construction started at ({tile_x}, {tile_y}).")
        return JsonResponse({"message": "Building placed successfully.", "building_id": building.id}, status=201)
    except Exception as e:
        logger.exception("Error during building placement: %s", str(e))
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@jwt_required
def delete_settlement(request, id):
    logger.debug("Received delete_settlement request for id: %s", id)
    if request.method != "DELETE":
        return JsonResponse({"error": "Only DELETE method is allowed."}, status=405)
    try:
        settlement, error_response = get_settlement_or_error(request, id)
        if error_response:
            return error_response
        settlement.delete()
        return JsonResponse({"message": "Settlement deleted successfully."})
    except Exception as e:
        logger.exception("Error deleting settlement: %s", str(e))
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@jwt_required
def assign_villager(request):
    logger.debug("Received assign_villager request")
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method is allowed."}, status=405)
    try:
        data = json.loads(request.body)
        settlement_id = data.get("settlement_id")
        building_id = data.get("building_id")
        settler_id = data.get("settler_id", None)
        if not settlement_id or not building_id:
            return JsonResponse({"error": "Settlement ID and building ID are required."}, status=400)
        settlement, error_response = get_settlement_or_error(request, settlement_id)
        if error_response:
            return error_response
        try:
            building = settlement.buildings.get(id=building_id)
        except Building.DoesNotExist:
            return JsonResponse({"error": "Building not found in the settlement."}, status=404)
        if building.building_type not in ["lumber_mill", "quarry", "farmhouse"]:
            return JsonResponse({"error": "Villagers can only be assigned to production buildings."}, status=400)
        if settler_id:
            try:
                settler = settlement.settlers.get(id=settler_id)
            except Settler.DoesNotExist:
                return JsonResponse({"error": "Villager not found in the settlement."}, status=404)
        else:
            idle_settlers = settlement.settlers.filter(status="idle")
            if not idle_settlers.exists():
                return JsonResponse({"error": "No idle villagers available."}, status=400)
            settler = idle_settlers.first()
        settler.assigned_building = building
        settler.status = "working"
        settler.save()
        log_event(settlement, "villager_assigned", f"Villager {settler.name} assigned to {building.building_type}.")
        return JsonResponse({"message": "Villager assigned successfully.", "settler_id": settler.id}, status=200)
    except Exception as e:
        logger.exception("Error during villager assignment: %s", str(e))
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@jwt_required
def gather_resource(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method is allowed."}, status=405)
    try:
        data = json.loads(request.body)
        settlement_id = data.get("settlement_id")
        resource_node_id = data.get("resource_node_id")
        if not settlement_id or not resource_node_id:
            return JsonResponse({"error": "Settlement ID and resource node ID are required."}, status=400)
        settlement, error_response = get_settlement_or_error(request, settlement_id)
        if error_response:
            return error_response
        from core.models import ResourceNode
        try:
            node = ResourceNode.objects.get(id=resource_node_id, map_tile__settlement=settlement)
        except ResourceNode.DoesNotExist:
            return JsonResponse({"error": "Resource node not found in settlement."}, status=404)
        if node.gatherer:
            return JsonResponse({"error": "Resource node is already being gathered."}, status=400)
        idle_settlers = settlement.settlers.filter(status="idle")
        if not idle_settlers.exists():
            return JsonResponse({"error": "No idle villagers available."}, status=400)
        villager = idle_settlers.order_by('?').first()
        node.gatherer = villager
        node.save()
        villager.gathering_resource_node = node
        villager.status = "gathering"
        villager.save()
        log_event(settlement, "villager_assigned", f"{villager.name} started gathering from {node.name}.")
        return JsonResponse({
            "message": f"{villager.name} started gathering from {node.name}.",
            "villager_id": villager.id,
            "resource_node_id": node.id,
        }, status=200)
    except Exception as e:
        logger.exception("Error during resource gathering: %s", str(e))
        return JsonResponse({"error": str(e)}, status=500)

@jwt_required
def settlement_events_view(request, id):
    logger.debug("Received settlement_events_view for settlement id: %s", id)
    try:
        settlement, error_response = get_settlement_or_error(request, id)
        if error_response:
            return error_response
        events = settlement.events.order_by("-timestamp").all()[:10]
        events_data = list(events.values("id", "event_type", "description", "timestamp"))
        return JsonResponse(events_data, safe=False)
    except Exception as e:
        logger.exception("Error retrieving settlement events: %s", str(e))
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@jwt_required
def toggle_assignment(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method is allowed."}, status=405)
    try:
        data = json.loads(request.body)
        settlement_id = data.get("settlement_id")
        object_type = data.get("object_type")
        object_id = data.get("object_id")
        if not settlement_id or not object_type or not object_id:
            return JsonResponse({"error": "Missing required parameters."}, status=400)
        settlement, error_response = get_settlement_or_error(request, settlement_id)
        if error_response:
            return error_response
        idle_villagers = settlement.settlers.filter(status="idle", gathering_resource_node__isnull=True)
        if object_type == "building":
            try:
                building = settlement.buildings.get(id=object_id)
            except Building.DoesNotExist:
                return JsonResponse({"error": "Building not found in settlement."}, status=404)
            if building.building_type not in ["lumber_mill", "quarry", "farmhouse"]:
                return JsonResponse({"error": "Villagers can only be assigned to production buildings."}, status=400)
            assigned = building.assigned_settlers.all()
            if assigned.exists():
                for villager in assigned:
                    villager.assigned_building = None
                    villager.status = "idle"
                    villager.save()
                log_event(settlement, "villager_assigned", f"Cleared assignments from {building.get_building_type_display()} for all villagers.")
                return JsonResponse({"message": "Assignment cleared."}, status=200)
            else:
                if not idle_villagers.exists():
                    return JsonResponse({"error": "No idle villagers available."}, status=400)
                villager = idle_villagers.order_by('?').first()
                building.assigned_settlers.add(villager)
                villager.assigned_building = building
                villager.status = "working"
                villager.save()
                log_event(settlement, "villager_assigned", f"{villager.name} assigned to {building.get_building_type_display()}.")
                return JsonResponse({"message": f"{villager.name} assigned to {building.get_building_type_display()}."}, status=200)
        elif object_type == "resource_node":
            from core.models import ResourceNode
            try:
                node = ResourceNode.objects.get(id=object_id, map_tile__settlement=settlement)
            except ResourceNode.DoesNotExist:
                return JsonResponse({"error": "Resource node not found in settlement."}, status=404)
            if node.gatherer:
                villager = node.gatherer
                node.gatherer = None
                node.save()
                if villager:
                    villager.gathering_resource_node = None
                    villager.status = "idle"
                    villager.save()
                log_event(settlement, "villager_assigned", f"Cleared gathering assignment from {node.name}.")
                return JsonResponse({"message": "Gathering assignment cleared."}, status=200)
            else:
                if not idle_villagers.exists():
                    return JsonResponse({"error": "No idle villagers available."}, status=400)
                villager = idle_villagers.order_by('?').first()
                node.gatherer = villager
                node.save()
                villager.gathering_resource_node = node
                villager.status = "gathering"
                villager.save()
                log_event(settlement, "villager_assigned", f"{villager.name} started gathering from {node.name}.")
                return JsonResponse({"message": f"{villager.name} started gathering from {node.name}."}, status=200)
        else:
            return JsonResponse({"error": "Invalid object type."}, status=400)
    except Exception as e:
        logger.exception("Error in toggle_assignment: %s", str(e))
        return JsonResponse({"error": str(e)}, status=500)
