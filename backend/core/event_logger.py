# core/event_logger.py
import logging
from core.models import EventLog

logger = logging.getLogger(__name__)

def log_event(settlement, event_type, description):
    try:
        EventLog.objects.create(
            settlement=settlement,
            event_type=event_type,
            description=description
        )
        logger.info("Logged event: %s - %s", event_type, description)
    except Exception as e:
        logger.exception("Error logging event: %s", str(e))
