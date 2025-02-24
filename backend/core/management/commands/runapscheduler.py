#core/management/commands/runapscheduler.py
import logging
from django.core.management.base import BaseCommand
from apscheduler.schedulers.blocking import BlockingScheduler
from django.db import transaction
from django.utils import timezone

from core.models import Building, Settlement, Settler, GameState, ResourceNode
from core.config import SEASONS, SEASON_CHANGE_TICKS, SEASON_MODIFIERS, PRODUCTION_TICK

# Import our new population module functions
from core.population import apply_happiness_effects, process_villager_recruitment

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Runs the tick simulation scheduler and updates the GameState model.'

    def handle(self, *args, **options):
        gs, created = GameState.objects.get_or_create(
            pk=1, defaults={'tick_count': 0, 'current_season': SEASONS[0]}
        )
        self.stdout.write("Starting tick simulation...")
        scheduler = BlockingScheduler()
        scheduler.add_job(lambda: self.tick(gs), 'interval', seconds=5)
        try:
            scheduler.start()
        except KeyboardInterrupt:
            self.stdout.write("Tick simulation stopped.")

    def tick(self, gs):
        with transaction.atomic():
            gs.tick_count += 1
            if gs.tick_count % SEASON_CHANGE_TICKS == 0:
                try:
                    current_index = SEASONS.index(gs.current_season)
                except ValueError:
                    current_index = 0
                new_index = (current_index + 1) % len(SEASONS)
                gs.current_season = SEASONS[new_index]
                self.stdout.write(f"Season changed to {gs.current_season}")
                logger.info(f"Season changed to {gs.current_season}")
            gs.save()

        self.stdout.write(f"Tick {gs.tick_count} - Season: {gs.current_season} - {timezone.now()}")
        logger.info(f"Tick {gs.tick_count} - Season: {gs.current_season}")

        # Process construction for buildings
        with transaction.atomic():
            buildings = Building.objects.filter(is_constructed=False)
            for building in buildings:
                multiplier = SEASON_MODIFIERS.get(gs.current_season, {}).get('construction_speed_multiplier', 1.0)
                increment = int(10 * multiplier)
                building.construction_progress += increment
                if building.construction_progress >= 100:
                    building.construction_progress = 100
                    building.is_constructed = True
                    self.stdout.write(f"{building} construction completed.")
                    logger.info(f"{building} construction completed.")
                building.save()

        # Process production, feeding, and villager lifecycle in order.
        if gs.tick_count % PRODUCTION_TICK == 0:
            self.process_production(gs)
            self.process_settler_feeding(gs)
            self.process_villager_lifecycle(gs)
            self.process_resource_gathering(gs)

    def process_production(self, gs):  
        from core.config import PRODUCTION_RATES, PRODUCTION_TICK, RESOURCE_CAP, WAREHOUSE_BONUS
        from django.db.models import F, Value
        from django.db.models.functions import Least
        with transaction.atomic():
            buildings = Building.objects.filter(is_constructed=True)
            current_season = gs.current_season
            prod_modifier = SEASON_MODIFIERS.get(current_season, {}).get('production', 1.0)
            for building in buildings:
                if building.building_type not in PRODUCTION_RATES:
                    continue
                worker_count = building.assigned_settlers.count()
                if worker_count == 0:
                    logger.debug(f"{building}: Skipped production (no workers assigned)")
                    continue
                if building.building_type == "lumber_mill":
                    rate = PRODUCTION_RATES["lumber_mill"].get("wood", 0)
                elif building.building_type == "quarry":
                    rate = PRODUCTION_RATES["quarry"].get("stone", 0)
                elif building.building_type == "farmhouse":
                    rate = PRODUCTION_RATES["farmhouse"].get("food", 0)
                else:
                    continue  # Skip non-production buildings
                production = int((rate * prod_modifier * worker_count) / PRODUCTION_TICK)
                settlement = building.settlement
                # Compute effective cap: base cap plus bonus per constructed warehouse.
                warehouse_count = settlement.buildings.filter(is_constructed=True, building_type="warehouse").count()
                effective_cap = RESOURCE_CAP + (warehouse_count * WAREHOUSE_BONUS)
                if building.building_type == "lumber_mill":
                    settlement.wood = Least(F('wood') + production, Value(effective_cap))
                elif building.building_type == "quarry":
                    settlement.stone = Least(F('stone') + production, Value(effective_cap))
                elif building.building_type == "farmhouse":
                    settlement.food = Least(F('food') + production, Value(effective_cap))
                settlement.save()
                logger.debug(
                    f"{building}: Produced {production} (workers: {worker_count}, modifier: {prod_modifier}, rate: {rate}), Effective Cap: {effective_cap}"
                )

    def process_resource_gathering(self, gs):
        from core.config import GATHER_RATES
        from core.models import ResourceNode
        from django.db import transaction
        with transaction.atomic():
            nodes = ResourceNode.objects.filter(gatherer__isnull=False)
            for node in nodes:
                gather_rate = GATHER_RATES.get(node.resource_type, 1)
                node.quantity = max(node.quantity - gather_rate, 0)
                node.save()
                # Gather resource: add to settlement (works for magic as well)
                settlement = node.map_tile.settlement
                current_amount = getattr(settlement, node.resource_type, 0)
                # Use RESOURCE_CAP from config (assume it’s imported elsewhere as RESOURCE_CAP)
                from core.config import RESOURCE_CAP
                new_amount = min(current_amount + gather_rate, RESOURCE_CAP)
                setattr(settlement, node.resource_type, new_amount)
                settlement.save(update_fields=[node.resource_type])
                if node.quantity == 0:
                    from core.event_logger import log_event
                    log_event(settlement, "resource_depleted", f"{node.name} has been depleted.")
                    villager = node.gatherer
                    if villager:
                        villager.gathering_resource_node = None
                        villager.status = "idle"
                        villager.save(update_fields=["gathering_resource_node", "status"])
                    node.delete()




    def process_settler_feeding(self, gs):
        from core.config import VILLAGER_CONSUMPTION_RATE, FEEDING_TICK
        from django.db.models import F
        with transaction.atomic():
            current_season = gs.current_season
            cons_modifier = SEASON_MODIFIERS.get(current_season, {}).get('consumption', 1.0)
            total_food_consumption = 0
            settlers = Settler.objects.all()
            for settler in settlers:
                consumption = int(VILLAGER_CONSUMPTION_RATE * cons_modifier / FEEDING_TICK)
                settlement = settler.settlement
                if settlement.food >= consumption:
                    settlement.food = F('food') - consumption
                    settler.hunger = 0
                    settler.mood = "content"
                else:
                    settler.hunger += consumption
                    settler.mood = "hungry"
                settlement.save()
                settler.save()
                total_food_consumption += consumption
            logger.info(f"Settlers consumed a total of {total_food_consumption} food units (modifier: {cons_modifier})")

    def process_villager_lifecycle(self, gs):
        from core.config import VILLAGER_AGING_INTERVAL, MAX_VILLAGER_AGE, EXPERIENCE_GAIN_PER_TICK, VILLAGER_NAMES
        import random
        from core.event_logger import log_event
        with transaction.atomic():
            # Process individual settler aging and experience.
            settlers = Settler.objects.exclude(status="dead")
            for settler in settlers:
                if settler.assigned_building:
                    settler.experience += EXPERIENCE_GAIN_PER_TICK  
                if settler.birth_tick is None:
                    settler.birth_tick = gs.tick_count
                age = gs.tick_count - settler.birth_tick
                if age >= MAX_VILLAGER_AGE:
                    settler.status = "dead"
                    settler.mood = "sick"
                    log_event(settler.settlement, "villager_dead", f"Villager {settler.name} died of old age (age {age}).")
                settler.save()

            # Now process settlement-level population mechanics.
            # Iterate over all settlements.
            settlements = Settlement.objects.all()
            for settlement in settlements:
                # Apply happiness effects (updates happy_duration and sets production boost)
                popularity = apply_happiness_effects(settlement)
                settlement.save()
                logger.info(f"Settlement '{settlement.name}' popularity updated: {popularity}")

                # Process recruitment; if a new settler is recruited, log the event.
                new_settler = process_villager_recruitment(settlement)
                if new_settler:
                    log_event(settlement, "villager_recruited", f"New settler {new_settler.name} recruited (popularity: {popularity}).")
                    logger.info(f"Settlement '{settlement.name}' recruited new settler: {new_settler.name}")

    def process_resource_nodes():
        nodes = ResourceNode.objects.filter(gatherer__isnull=False)
        for node in nodes:
            node.process_gathering_tick()