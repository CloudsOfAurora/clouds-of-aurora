# core/api/api_views.py
import logging
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from core.models import Settlement, Building, Settler, LoreEntry
from core.api.serializers import (
    SettlementSerializer,
    BuildingSerializer,
    SettlerSerializer,
    LoreEntrySerializer
)

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

class SettlementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Provides a read-only list and detail view of settlements for the authenticated user.
    """
    serializer_class = SettlementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Settlement.objects.filter(owner_id=user.id)
        logger.debug(f"User {user.id} settlements: {list(qs.values_list('id', flat=True))}")
        return qs

class BuildingViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Building.objects.all()
    serializer_class = BuildingSerializer

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        import logging
        logger = logging.getLogger(__name__)
        logger.info("Building API Response: %s", response.data)  
        return response


class SettlerViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SettlerSerializer

    def get_queryset(self):
        # Use select_related to include assigned_building and gathering_resource_node.
        return Settler.objects.select_related('assigned_building', 'gathering_resource_node').all()

class LoreEntryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LoreEntry.objects.all()
    serializer_class = LoreEntrySerializer

class GameStateView(APIView):
    def get(self, request):
        from core.management.commands.runapscheduler import tick_count, current_season
        return Response({
            'tick_count': tick_count,
            'current_season': current_season
        })
