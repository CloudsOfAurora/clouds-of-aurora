# core/views.py
import json
import logging
import time

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.contrib.auth import authenticate  # no longer using login()

from core.config import BUILDING_COSTS 
from .models import GameState, Settlement, Building, Settler, LoreEntry
from .decorators import jwt_required
from core.event_logger import log_event

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Global dictionary to store resource snapshots
previous_resources = {}


# ----------------------
# General Endpoints (unchanged)
# ----------------------

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
    qs = Settlement.objects.all().values("id", "name", "food", "wood", "stone", "owner_id", "created_at")
    data = list(qs)
    logger.debug(f"Returning settlements: {data}")
    return JsonResponse(data, safe=False)

def buildings_view(request):
    logger.debug("Received request for buildings")
    qs = Building.objects.all().values("id", "building_type", "construction_progress", "is_constructed", "settlement_id")
    data = list(qs)
    logger.debug(f"Returning buildings: {data}")
    return JsonResponse(data, safe=False)

def settlers_view(request):
    logger.debug("Received request for settlers")
    try:
        gs = GameState.objects.get(pk=1)  # Get current tick count

        qs = Settler.objects.all().values(
            "id",
            "name",
            "status",
            "mood",
            "hunger",
            "assigned_building_id",
            "settlement_id",
            "birth_tick",
            "experience"
        )

        # Convert QuerySet to a list and calculate age
        settlers_data = []
        for settler in qs:
            age = gs.tick_count - settler["birth_tick"] if settler["birth_tick"] is not None else "N/A"
            settlers_data.append({
                **settler,
                "age": age
            })

        logger.debug(f"Returning settlers: {settlers_data}")
        return JsonResponse(settlers_data, safe=False)

    except GameState.DoesNotExist:
        return JsonResponse({"error": "GameState not found."}, status=500)



def lore_entries_view(request):
    logger.debug("Received request for lore entries")
    qs = LoreEntry.objects.all().values("id", "title", "description", "event_date")
    data = list(qs)
    logger.debug(f"Returning lore entries: {data}")
    return JsonResponse(data, safe=False)

# ----------------------
# User Account Endpoints
# ----------------------

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
            logger.error("Username or password missing in registration data")
            return JsonResponse({"error": "Username and password are required."}, status=400)
        if User.objects.filter(username=username).exists():
            logger.error(f"Username '{username}' already exists")
            return JsonResponse({"error": "Username already exists."}, status=400)
        user = User.objects.create_user(username=username, password=password, email=email)
        logger.info(f"User '{username}' registered successfully with id {user.id}")
        return JsonResponse({"message": "User registered successfully."}, status=201)
    except Exception as e:
        logger.exception("Error during registration")
        return JsonResponse({"error": str(e)}, status=500)

# The login endpoint is now handled by Simple JWT's TokenObtainPairView (see URLs)

@jwt_required
def current_user_view(request):
    logger.debug("Received current_user request")
    data = {
        "id": request.user.id,
        "username": request.user.username,
        "email": request.user.email,
    }
    logger.debug(f"Returning authenticated user data: {data}")
    return JsonResponse(data)

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
            stone=STARTING_RESOURCES["stone"]
        )
        # Create starting villagers using config value
        import random
        for _ in range(STARTING_VILLAGERS):
            name = random.choice(VILLAGER_NAMES)
            Settler.objects.create(
                settlement=settlement,
                name=name,
                status="idle",
                mood="content",
                hunger=0,
                birth_tick=None,  # will be set during tick simulation
                experience=0
            )
        logger.info(f"Settlement '{name}' created successfully for user '{request.user.username}' with {STARTING_VILLAGERS} villagers")
        return JsonResponse({"message": "Settlement created successfully.", "settlement_id": settlement.id}, status=201)
    except Exception as e:
        logger.exception("Error during settlement creation")
        return JsonResponse({"error": str(e)}, status=500)



@jwt_required
def settlement_detail_view(request, id):
    logger.debug("Received settlement_detail_view request for id: %s", id)
    try:
        settlement = Settlement.objects.get(id=id)
        if settlement.owner_id != request.user.id:
            logger.warning("User %s attempted to access settlement %s not owned by them", request.user.id, id)
            return JsonResponse({"error": "Not authorized."}, status=403)
        
        # Retrieve buildings and enrich with assigned settler name (if any)
        buildings_qs = settlement.buildings.all().values(
            "id", "building_type", "construction_progress", "is_constructed", "coordinate_x", "coordinate_y"
        )
        buildings = list(buildings_qs)
        for b in buildings:
            building_obj = settlement.buildings.get(id=b["id"])
            assigned_settlers = building_obj.assigned_settlers.all()
            b["assigned"] = assigned_settlers.first().name if assigned_settlers.exists() else "Unoccupied"
        
        # Get current season from GameState
        from core.models import GameState
        gs = GameState.objects.get(pk=1)
        current_season = gs.current_season

        from core.config import PRODUCTION_RATES, VILLAGER_CONSUMPTION_RATE, SEASON_MODIFIERS, PRODUCTION_TICK, FEEDING_TICK
        prod_modifier = SEASON_MODIFIERS.get(current_season, {}).get("production", 1.0)
        cons_modifier = SEASON_MODIFIERS.get(current_season, {}).get("consumption", 1.0)
        
        farmhouse_count = settlement.buildings.filter(is_constructed=True, building_type="farmhouse").count()
        lumber_mill_count = settlement.buildings.filter(is_constructed=True, building_type="lumber_mill").count()
        quarry_count = settlement.buildings.filter(is_constructed=True, building_type="quarry").count()
        villager_count = settlement.settlers.filter(status__in=["idle", "working"]).count()  # exclude dead
        
        #Calculate average production per tick:
        const_farm_rate = PRODUCTION_RATES.get("farmhouse", {}).get("food", 0) / PRODUCTION_TICK;
        const_lumber_rate = PRODUCTION_RATES.get("lumber_mill", {}).get("wood", 0) / PRODUCTION_TICK;
        const_quarry_rate = PRODUCTION_RATES.get("quarry", {}).get("stone", 0) / PRODUCTION_TICK;
        #Calculate average consumption per tick:
        const_consumption = VILLAGER_CONSUMPTION_RATE / FEEDING_TICK;

        net_food_rate = (farmhouse_count * const_farm_rate * prod_modifier) - (villager_count * const_consumption * cons_modifier);
        net_wood_rate = lumber_mill_count * const_lumber_rate * prod_modifier;
        net_stone_rate = quarry_count * const_quarry_rate * prod_modifier;

        data = {
            "id": settlement.id,
            "name": settlement.name,
            "food": settlement.food,
            "wood": settlement.wood,
            "stone": settlement.stone,
            "created_at": settlement.created_at,
            "buildings": buildings,
            "net_food_rate": round(net_food_rate, 1),
            "net_wood_rate": round(net_wood_rate, 1),
            "net_stone_rate": round(net_stone_rate, 1),
            "current_season": current_season,
        }
        logger.debug("Returning settlement detail: %s", data)
        return JsonResponse(data)
    except Settlement.DoesNotExist:
        logger.error("Settlement with id %s does not exist", id)
        return JsonResponse({"error": "Settlement not found."}, status=404)
    except Exception as e:
        logger.exception("Error retrieving settlement detail: %s", str(e))
        return JsonResponse({"error": str(e)}, status=500)




@csrf_exempt
@jwt_required
def place_building(request):
    logger.debug("Received place_building request")
    if request.method != "POST":
        logger.error("Invalid HTTP method for place_building")
        return JsonResponse({"error": "Only POST method is allowed."}, status=405)
    try:
        data = json.loads(request.body)
        settlement_id = data.get("settlement_id")
        building_type = data.get("building_type")
        tile_x = data.get("tile_x")
        tile_y = data.get("tile_y")
        logger.debug("Data received for building placement: settlement_id=%s, building_type=%s, tile_x=%s, tile_y=%s",
                     settlement_id, building_type, tile_x, tile_y)
        
        if not settlement_id or not building_type or tile_x is None or tile_y is None:
            logger.error("Missing settlement_id, building_type, or tile coordinates")
            return JsonResponse({"error": "Settlement ID, building type, and tile coordinates are required."}, status=400)
        
        # Ensure the requested building type is valid
        if building_type not in BUILDING_COSTS:
            logger.error("Invalid building type: %s", building_type)
            return JsonResponse({"error": "Invalid building type."}, status=400)
        
        cost = BUILDING_COSTS[building_type]  # Get cost dynamically from config

        try:
            settlement = Settlement.objects.get(id=settlement_id, owner=request.user)
        except Settlement.DoesNotExist:
            logger.error("Settlement %s not found for user %s", settlement_id, request.user.id)
            return JsonResponse({"error": "Settlement not found or not owned by user."}, status=404)
        
        if not (0 <= tile_x < 10 and 0 <= tile_y < 10):
            logger.error("Tile coordinates out of bounds: (%s, %s)", tile_x, tile_y)
            return JsonResponse({"error": "Tile coordinates must be between 0 and 9."}, status=400)
        
        if settlement.buildings.filter(coordinate_x=tile_x, coordinate_y=tile_y).exists():
            logger.error("Tile (%s, %s) is already occupied in settlement %s", tile_x, tile_y, settlement_id)
            return JsonResponse({"error": "Tile is already occupied."}, status=400)
        
        # Check if settlement has enough resources
        if settlement.wood < cost["wood"] or settlement.stone < cost["stone"]:
            logger.error("Insufficient resources in settlement %s: required wood=%s, stone=%s; available wood=%s, stone=%s",
                         settlement_id, cost["wood"], cost["stone"], settlement.wood, settlement.stone)
            return JsonResponse({"error": "Insufficient resources."}, status=400)
        
        # Deduct resources and save changes
        settlement.wood -= cost["wood"]
        settlement.stone -= cost["stone"]
        settlement.save()
        
        # Create the new building
        building = Building.objects.create(
            settlement=settlement,
            building_type=building_type,
            construction_progress=0,
            is_constructed=False,
            villagers_generated=0,
            coordinate_x=tile_x,
            coordinate_y=tile_y,
        )
        log_event(settlement, "building_placed", f"{building.building_type} placed at ({tile_x}, {tile_y}).")
        logger.info("Building '%s' created in settlement %s at (%s, %s) (building id: %s)",
                    building_type, settlement_id, tile_x, tile_y, building.id)
        return JsonResponse({"message": "Building placed successfully.", "building_id": building.id}, status=201)
    except Exception as e:
        logger.exception("Error during building placement: %s", str(e))
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@jwt_required
def assign_villager(request):
    logger.debug("Received assign_villager request")
    if request.method != "POST":
        logger.error("Invalid HTTP method for assign_villager")
        return JsonResponse({"error": "Only POST method is allowed."}, status=405)
    try:
        data = json.loads(request.body)
        settlement_id = data.get("settlement_id")
        building_id = data.get("building_id")
        settler_id = data.get("settler_id", None)
        logger.debug("Assign villager data: settlement_id=%s, building_id=%s, settler_id=%s",
                     settlement_id, building_id, settler_id)
        
        if not settlement_id or not building_id:
            logger.error("Missing settlement_id or building_id in request")
            return JsonResponse({"error": "Settlement ID and building ID are required."}, status=400)
        
        try:
            settlement = Settlement.objects.get(id=settlement_id, owner=request.user)
        except Settlement.DoesNotExist:
            logger.error("Settlement %s not found for user %s", settlement_id, request.user.id)
            return JsonResponse({"error": "Settlement not found or not owned by user."}, status=404)
        
        try:
            building = settlement.buildings.get(id=building_id)
        except Building.DoesNotExist:
            logger.error("Building %s not found in settlement %s", building_id, settlement_id)
            return JsonResponse({"error": "Building not found in the settlement."}, status=404)
        
        if settler_id:
            try:
                settler = settlement.settlers.get(id=settler_id)
            except Settler.DoesNotExist:
                logger.error("Settler %s not found in settlement %s", settler_id, settlement_id)
                return JsonResponse({"error": "Villager not found in the settlement."}, status=404)
        else:
            idle_settlers = settlement.settlers.filter(status="idle")
            if not idle_settlers.exists():
                logger.error("No idle villagers available in settlement %s", settlement_id)
                return JsonResponse({"error": "No idle villagers available."}, status=400)
            settler = idle_settlers.first()
        
        # Allow reassignment regardless of current status
        settler.assigned_building = building
        settler.status = "working"
        settler.save()
        
        logger.info("Settler %s assigned to building %s in settlement %s", settler.id, building_id, settlement_id)
        log_event(settlement, "villager_assigned", f"Villager {settler.name} assigned to building {building.building_type}.")
        return JsonResponse({"message": "Villager assigned successfully.", "settler_id": settler.id}, status=200)
    except Exception as e:
        logger.exception("Error during villager assignment: %s", str(e))
        return JsonResponse({"error": str(e)}, status=500)

@jwt_required
def settlement_events_view(request, id):
    logger.debug("Received settlement_events_view request for settlement id: %s", id)
    try:
        settlement = Settlement.objects.get(id=id)
        if settlement.owner_id != request.user.id:
            logger.warning("User %s attempted to access events for settlement %s not owned by them", request.user.id, id)
            return JsonResponse({"error": "Not authorized."}, status=403)
        events = settlement.events.order_by("-timestamp").all()[:10]
        events_data = list(events.values("id", "event_type", "description", "timestamp"))
        logger.debug("Returning events: %s", events_data)
        return JsonResponse(events_data, safe=False)
    except Settlement.DoesNotExist:
        logger.error("Settlement with id %s does not exist", id)
        return JsonResponse({"error": "Settlement not found."}, status=404)
    except Exception as e:
        logger.exception("Error retrieving settlement events: %s", str(e))
        return JsonResponse({"error": str(e)}, status=500)
