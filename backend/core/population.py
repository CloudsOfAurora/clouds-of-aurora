# core/population.py
import random
from django.conf import settings
from core.models import Settler

# --- Configurable Constants ---
MAX_HUNGER_FOR_MOOD = getattr(settings, 'MAX_HUNGER_FOR_MOOD', 100)
POP_WEIGHT_MOOD = getattr(settings, 'POP_WEIGHT_MOOD', 0.6)
POP_WEIGHT_FOOD = getattr(settings, 'POP_WEIGHT_FOOD', 0.2)
POP_WEIGHT_HOUSING = getattr(settings, 'POP_WEIGHT_HOUSING', 0.2)
FOOD_BASELINE = getattr(settings, 'FOOD_BASELINE', 50)
HOUSE_CAPACITY = getattr(settings, 'HOUSE_CAPACITY', 4)
FOOD_NET_FACTOR = getattr(settings, 'FOOD_NET_FACTOR', 10)
RECRUITMENT_THRESHOLD = getattr(settings, 'RECRUITMENT_THRESHOLD', 0.7)
HAPPY_DURATION_FACTOR = getattr(settings, 'HAPPY_DURATION_FACTOR', 0.01)
HAPPINESS_BUILDING_TYPES = getattr(settings, 'HAPPINESS_BUILDING_TYPES', ['decoration', 'park', 'statue'])
DEFAULT_HAPPINESS_BUILDING_BONUS = getattr(settings, 'DEFAULT_HAPPINESS_BUILDING_BONUS', 0.05)


# --- Mood & Related Calculations ---

def update_settler_mood(settler):
    """
    Computes a settlers mood based on hunger.
    Formula: mood = max(0, 1 - (hunger / MAX_HUNGER_FOR_MOOD)).
    Further reduces mood if the settler is sick.
    """
    base_mood = max(0, 1.0 - (settler.hunger / MAX_HUNGER_FOR_MOOD))
    if settler.mood == "sick":
        base_mood *= 0.8
    return base_mood

def compute_average_mood(settlement):
    """
    Computes the average mood of all settlers in the settlement.
    Returns 1.0 if no settlers are present.
    """
    settlers = settlement.settlers.all()
    count = settlers.count()
    if count == 0:
        return 1.0
    total_mood = sum(update_settler_mood(s) for s in settlers)
    return total_mood / count

def get_net_food_rate(settlement):
    """
    Returns the settlements net food production rate.
    Falls back to 0 on error.
    """
    try:
        net_rates = settlement.calculate_net_resource_rates(1.0, 1.0)
        return net_rates.get("food", 0)
    except Exception:
        return 0

def compute_food_surplus(settlement):
    """
    Computes the food surplus based on current stored food and net production.
    """
    net_food = get_net_food_rate(settlement)
    effective_food = settlement.food + (net_food * FOOD_NET_FACTOR)
    surplus = max(effective_food - FOOD_BASELINE, 0) / FOOD_BASELINE
    return surplus

def compute_housing_factor(settlement):
    """
    Computes the housing factor as the ratio of housed settlers to available capacity.
    Penalizes if housing is overcrowded.
    """
    houses = settlement.buildings.filter(building_type='house', is_constructed=True)
    capacity = houses.count() * HOUSE_CAPACITY
    housed = settlement.settlers.filter(housing_assigned__isnull=False).count()
    if capacity == 0:
        return 0  # No housing available.
    ratio = housed / capacity
    return 1.0 if ratio <= 1 else 1.0 / ratio

def compute_building_bonus(settlement):
    """
    Computes bonus from constructed buildings that boost happiness.
    """
    bonus_buildings = settlement.buildings.filter(
        building_type__in=HAPPINESS_BUILDING_TYPES, is_constructed=True
    )
    return bonus_buildings.count() * DEFAULT_HAPPINESS_BUILDING_BONUS

def compute_duration_bonus(settlement):
    """
    Computes bonus based on sustained high happiness.
    """
    happy_duration = getattr(settlement, 'happy_duration', 0)
    return happy_duration * HAPPY_DURATION_FACTOR

def calculate_popularity_index(settlement):
    """
    Combines factors—average mood, food surplus, housing factor,
    building bonus, and duration bonus—to produce a popularity index (0 to 1).
    """
    avg_mood = compute_average_mood(settlement)
    food_surplus = compute_food_surplus(settlement)
    housing_factor = compute_housing_factor(settlement)
    bonus = compute_building_bonus(settlement)
    duration_bonus = compute_duration_bonus(settlement)
    
    popularity = (
        (avg_mood * POP_WEIGHT_MOOD) +
        (food_surplus * POP_WEIGHT_FOOD) +
        (housing_factor * POP_WEIGHT_HOUSING) +
        bonus + duration_bonus
    )
    return max(0, min(popularity, 1))

def apply_happiness_effects(settlement):
    """
    Applies happiness effects to a settlement based on its popularity index.
      - Increases settlement.happy_duration if popularity is high (>= 0.7),
        resets otherwise.
      - Sets a temporary production boost factor.
    Returns the updated popularity index.
    """
    popularity = calculate_popularity_index(settlement)
    if popularity >= 0.7:
        settlement.happy_duration = getattr(settlement, 'happy_duration', 0) + 1
    else:
        settlement.happy_duration = 0

    if popularity >= 0.8:
        settlement.happiness_boost = 1.1
    elif popularity < 0.4:
        settlement.happiness_boost = 0.9
    else:
        settlement.happiness_boost = 1.0

    return popularity


# --- Recruitment & Housing ---

def process_villager_recruitment(settlement):
    """
    Attempts to recruit a new settler if conditions are met:
      - Popularity above threshold.
      - Sufficient available housing.
      - Effective food > 100.
    Recruitment probability scales with (popularity - threshold) plus a duration bonus.
    Returns the new settler if recruited; otherwise, None.
    """
    popularity = calculate_popularity_index(settlement)
    if popularity < RECRUITMENT_THRESHOLD:
        return None

    houses = settlement.buildings.filter(building_type='house', is_constructed=True)
    capacity = houses.count() * HOUSE_CAPACITY
    housed = settlement.settlers.filter(housing_assigned__isnull=False).count()
    if housed >= capacity:
        return None

    net_food = get_net_food_rate(settlement)
    effective_food = settlement.food + (net_food * FOOD_NET_FACTOR)
    if effective_food <= 100:
        return None

    base_prob = popularity - RECRUITMENT_THRESHOLD
    happy_duration = getattr(settlement, 'happy_duration', 0)
    duration_bonus = happy_duration * HAPPY_DURATION_FACTOR
    recruitment_prob = max(0, min(base_prob + duration_bonus, 1))

    if random.random() < recruitment_prob:
        from core.models import Settler
        from core.config import VILLAGER_NAMES
        new_name = random.choice(VILLAGER_NAMES)
        candidate_house = None
        candidate_count = None
        for house in houses:
            count = house.housed_settlers.count()
            if count < HOUSE_CAPACITY:
                if candidate_house is None or count < candidate_count:
                    candidate_house = house
                    candidate_count = count
        new_settler = Settler.objects.create(
            settlement=settlement,
            name=new_name,
            status="idle",
            mood="content",
            hunger=0,
            birth_tick=None,
            experience=0,
            housing_assigned=candidate_house
        )
        return new_settler
    return None

def reassign_homeless_settlers(settlement):
    """
    Finds settlers without housing and assigns them to houses using the fewest-occupants rule.
    Logs an event when a settler is reassigned.
    """
    houses = list(settlement.buildings.filter(building_type='house', is_constructed=True))
    if not houses:
        return
    homeless = settlement.settlers.filter(housing_assigned__isnull=True)
    for settler in homeless:
        candidate = None
        candidate_count = None
        for house in houses:
            count = house.housed_settlers.count()
            if count < HOUSE_CAPACITY:
                if candidate is None or count < candidate_count:
                    candidate = house
                    candidate_count = count
        if candidate:
            settler.housing_assigned = candidate
            settler.save()
            from core.event_logger import log_event
            log_event(settlement, "villager_assigned", f"{settler.name} moved into House")
