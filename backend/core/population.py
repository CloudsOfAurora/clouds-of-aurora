# core/population.py

import random
from django.conf import settings
from core.models import Settler
from core.config import HOUSE_CAPACITY

# --- Configurable Constants (can later be moved or overridden in core/config.py) ---
MAX_HUNGER_FOR_MOOD = getattr(settings, 'MAX_HUNGER_FOR_MOOD', 100)  # Hunger value at which mood becomes 0.
POP_WEIGHT_MOOD = getattr(settings, 'POP_WEIGHT_MOOD', 0.6)            # Weight for average mood.
POP_WEIGHT_FOOD = getattr(settings, 'POP_WEIGHT_FOOD', 0.2)            # Weight for food surplus.
POP_WEIGHT_HOUSING = getattr(settings, 'POP_WEIGHT_HOUSING', 0.2)      # Weight for housing factor.
FOOD_BASELINE = getattr(settings, 'FOOD_BASELINE', 50)                 # Baseline food level for surplus.
HOUSE_CAPACITY = getattr(settings, 'HOUSE_CAPACITY', 4)                # Default capacity per house.
FOOD_NET_FACTOR = getattr(settings, 'FOOD_NET_FACTOR', 10)             # Factor to scale net food rate when calculating effective food.
RECRUITMENT_THRESHOLD = getattr(settings, 'RECRUITMENT_THRESHOLD', 0.7)  # Minimum popularity to allow recruitment.
HAPPY_DURATION_FACTOR = getattr(settings, 'HAPPY_DURATION_FACTOR', 0.01) # Bonus per tick of sustained happiness.

# For building bonuses, we use categories rather than individual mappings.
# Any building whose type is in this list gives a default bonus.
HAPPINESS_BUILDING_TYPES = getattr(settings, 'HAPPINESS_BUILDING_TYPES', ['decoration', 'park', 'statue'])
DEFAULT_HAPPINESS_BUILDING_BONUS = getattr(settings, 'DEFAULT_HAPPINESS_BUILDING_BONUS', 0.05)


# --- Helper Functions ---

def update_settler_mood(settler):
    """
    Compute a mood score using the actual hunger value.
    Formula: mood = max(0, 1 - (hunger / MAX_HUNGER_FOR_MOOD)).
    If the settler is sick, apply an additional penalty.
    """
    base_mood = max(0, 1.0 - (settler.hunger / MAX_HUNGER_FOR_MOOD))
    if settler.mood == "sick":
        base_mood *= 0.8  # Further reduce mood if sick.
    return base_mood

def get_net_food_rate(settlement):
    """
    Returns the net food production rate for the settlement.
    Assumes that Settlement has a method calculate_net_resource_rates.
    If unavailable, defaults to 0.
    """
    try:
        net_rates = settlement.calculate_net_resource_rates(1.0, 1.0)
        return net_rates.get("food", 0)
    except Exception:
        return 0

def calculate_popularity_index(settlement):
    """
    Aggregates multiple factors into a popularity index (0 to 1):
      1. Average mood of settlers (using actual hunger values).
      2. Food surplus: based on effective food = stored food + (net food rate * FOOD_NET_FACTOR).
         Surplus is computed relative to FOOD_BASELINE.
      3. Housing factor: computed from the ratio of housed settlers (settler.housing_assigned is True)
         to total housing capacity (houses * HOUSE_CAPACITY). Overcrowding penalizes the score.
      4. Building bonus: all constructed buildings that are in HAPPINESS_BUILDING_TYPES add a fixed bonus.
      5. Duration bonus: sustained high popularity (tracked as happy_duration on settlement).
      6. (Placeholder for temporary event buffs/debuffs.)
      
    The weights for mood, food, and housing are configurable.
    """
    settlers = settlement.settlers.all()
    num_settlers = settlers.count()
    
    # 1. Average Mood
    if num_settlers == 0:
        avg_mood = 1.0
    else:
        total_mood = sum(update_settler_mood(s) for s in settlers)
        avg_mood = total_mood / num_settlers

    # 2. Food Surplus: effective food = current food + (net food rate * factor)
    net_food_rate = get_net_food_rate(settlement)
    effective_food = settlement.food + (net_food_rate * FOOD_NET_FACTOR)
    food_surplus = max(effective_food - FOOD_BASELINE, 0) / FOOD_BASELINE

    # 3. Housing Factor: count only settlers that are marked as housed.
    houses = settlement.buildings.filter(building_type='house', is_constructed=True)
    housing_capacity = houses.count() * HOUSE_CAPACITY
    # Assuming settlers have a boolean field 'housing_assigned'
    housed_settlers = settlement.settlers.filter(housing_assigned=True).count()
    if housing_capacity == 0:
        housing_factor = 0  # No houses means heavy penalty.
    else:
        housing_ratio = housed_settlers / housing_capacity
        # Reward if housing_ratio is less than 1 (i.e. surplus housing), penalize if over 1.
        housing_factor = 1.0 if housing_ratio <= 1 else 1.0 / housing_ratio

    # 4. Building Bonus: all buildings in the happiness category add a bonus.
    bonus = 0
    happiness_buildings = settlement.buildings.filter(
        building_type__in=HAPPINESS_BUILDING_TYPES, is_constructed=True
    )
    bonus += happiness_buildings.count() * DEFAULT_HAPPINESS_BUILDING_BONUS

    # 5. Duration Bonus: sustained happiness increases bonus.
    happy_duration = getattr(settlement, 'happy_duration', 0)
    duration_bonus = happy_duration * HAPPY_DURATION_FACTOR

    # 6. Temporary Event Buff/Debuff (placeholder).
    event_buff = 0

    # Combine factors with configurable weights.
    popularity = (
        (avg_mood * POP_WEIGHT_MOOD) +
        (food_surplus * POP_WEIGHT_FOOD) +
        (housing_factor * POP_WEIGHT_HOUSING) +
        bonus + duration_bonus + event_buff
    )
    # Clamp to 0-1.
    return max(0, min(popularity, 1))

def apply_happiness_effects(settlement):
    """
    Applies effects based on the settlement's popularity index.
    - Updates settlement.happy_duration (accumulates ticks if popularity is high).
    - Sets a temporary production boost multiplier:
         * High popularity (>= 0.8) yields a boost (e.g., 1.1)
         * Low popularity (< 0.4) yields a penalty (e.g., 0.9)
         * Otherwise, neutral (1.0)
    Returns the popularity index.
    """
    popularity = calculate_popularity_index(settlement)
    
    # Update happy_duration: increase if popularity is high, reset otherwise.
    if popularity >= 0.7:
        if hasattr(settlement, 'happy_duration'):
            settlement.happy_duration += 1
        else:
            settlement.happy_duration = 1
    else:
        settlement.happy_duration = 0
    
    # Set production boost factor.
    if popularity >= 0.8:
        settlement.happiness_boost = 1.1
    elif popularity < 0.4:
        settlement.happiness_boost = 0.9
    else:
        settlement.happiness_boost = 1.0

    return popularity

def process_villager_recruitment(settlement):
    """
    Checks recruitment conditions and, if met, spawns a new settler.
    Conditions:
      - Popularity index is above RECRUITMENT_THRESHOLD.
      - There is available housing (number of housed settlers is less than housing capacity).
      - Food surplus is sufficient (effective food > 100).
    Recruitment probability increases with (popularity - threshold) and sustained happiness.
    """
    popularity = calculate_popularity_index(settlement)
    if popularity < RECRUITMENT_THRESHOLD:
        return None
    
    # Housing check: use housed settlers count.
    houses = settlement.buildings.filter(building_type='house', is_constructed=True)
    housing_capacity = houses.count() * HOUSE_CAPACITY
    housed_settlers = settlement.settlers.filter(housing_assigned__isnull=False).count()
    if housed_settlers >= housing_capacity:
        return None
    
    # Food check: use effective food.
    net_food_rate = get_net_food_rate(settlement)
    effective_food = settlement.food + (net_food_rate * FOOD_NET_FACTOR)
    if effective_food <= 100:
        return None

    # Calculate recruitment probability.
    base_prob = (popularity - RECRUITMENT_THRESHOLD)
    happy_duration = getattr(settlement, 'happy_duration', 0)
    duration_bonus = happy_duration * HAPPY_DURATION_FACTOR
    recruitment_prob = base_prob + duration_bonus
    recruitment_prob = max(0, min(recruitment_prob, 1))
    
    if random.random() < recruitment_prob:
        # Create a new settler.
        from core.models import Settler
        from core.config import VILLAGER_NAMES  # Assuming a list of names is defined here.
        new_name = random.choice(VILLAGER_NAMES)
        
        # Find the candidate house with the fewest occupants and available capacity.
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
            housing_assigned=candidate_house  # Assigned candidate house or None.
        )
        return new_settler
    return None


from django.conf import settings

HOUSE_CAPACITY = getattr(settings, 'HOUSE_CAPACITY', 4)

def reassign_homeless_settlers(settlement):
    """
    Reassigns homeless settlers (those with housing_assigned == None) to houses
    in the settlement using the fewest occupants approach.
    For each homeless settler, find the constructed house (of type 'house') with fewer than HOUSE_CAPACITY occupants.
    """
    houses = list(settlement.buildings.filter(building_type='house', is_constructed=True))
    if not houses:
        return

    # For each homeless settler, assign them to the house with the fewest occupants (that isn't full)
    homeless_settlers = settlement.settlers.filter(housing_assigned__isnull=True)
    for settler in homeless_settlers:
        # Find the house with the smallest number of occupants and available capacity
        candidate_house = None
        candidate_count = None
        for house in houses:
            count = house.housed_settlers.count()
            if count < HOUSE_CAPACITY:
                if candidate_house is None or count < candidate_count:
                    candidate_house = house
                    candidate_count = count
        if candidate_house:
            settler.housing_assigned = candidate_house
            settler.save()