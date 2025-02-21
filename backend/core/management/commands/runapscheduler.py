import logging
from django.core.management.base import BaseCommand
from apscheduler.schedulers.blocking import BlockingScheduler
from django.db import transaction
from django.utils import timezone

from core.models import Building, Settlement, Settler, GameState
from core.config import SEASONS, SEASON_CHANGE_TICKS, SEASON_MODIFIERS, PRODUCTION_TICK

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

        if gs.tick_count % PRODUCTION_TICK == 0:
            self.process_production(gs)  # ✅ Now accessible
            self.process_settler_feeding(gs)
            self.process_villager_lifecycle(gs)

    def process_production(self, gs):  # ✅ Indented inside class
        from core.config import PRODUCTION_RATES, PRODUCTION_TICK
        with transaction.atomic():
            buildings = Building.objects.filter(is_constructed=True)
            current_season = gs.current_season
            prod_modifier = SEASON_MODIFIERS.get(current_season, {}).get('production', 1.0)
            for building in buildings:
                if building.building_type in PRODUCTION_RATES:
                    if building.building_type == "lumber_mill":
                        rate = PRODUCTION_RATES["lumber_mill"].get("wood", 0)
                    elif building.building_type == "quarry":
                        rate = PRODUCTION_RATES["quarry"].get("stone", 0)
                    elif building.building_type == "farmhouse":
                        rate = PRODUCTION_RATES["farmhouse"].get("food", 0)
                    else:
                        rate = 0
                    production = rate * prod_modifier / PRODUCTION_TICK  
                    settlement = building.settlement
                    if building.building_type == "lumber_mill":
                        settlement.wood += production
                    elif building.building_type == "quarry":
                        settlement.stone += production
                    elif building.building_type == "farmhouse":
                        settlement.food += production
                    settlement.save()
                    logger.debug(f"{building}: Produced {production} (modifier: {prod_modifier}, rate: {rate})")

    def process_settler_feeding(self, gs):
        from core.config import VILLAGER_CONSUMPTION_RATE, FEEDING_TICK
        with transaction.atomic():
            current_season = gs.current_season
            cons_modifier = SEASON_MODIFIERS.get(current_season, {}).get('consumption', 1.0)
            total_food_consumption = 0
            settlers = Settler.objects.all()
            for settler in settlers:
                consumption = VILLAGER_CONSUMPTION_RATE * cons_modifier / FEEDING_TICK
                settlement = settler.settlement
                if settlement.food >= consumption:
                    settlement.food -= consumption
                    settler.hunger = 0
                    settler.mood = "content"
                else:
                    settler.hunger += consumption
                    settler.mood = "hungry"
                settlement.save()
                settler.save()
                total_food_consumption += consumption
            self.stdout.write(f"Settlers consumed a total of {total_food_consumption} food units (modifier: {cons_modifier})")
            logger.info(f"Settlers consumed a total of {total_food_consumption} food units.")

    def process_villager_lifecycle(self, gs):
        from core.config import VILLAGER_AGING_INTERVAL, MAX_VILLAGER_AGE, EXPERIENCE_GAIN_PER_TICK, VILLAGER_NAMES
        import random
        from core.event_logger import log_event
        with transaction.atomic():
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
