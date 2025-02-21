# core/decorators.py
import logging
from functools import wraps
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.http import JsonResponse

logger = logging.getLogger(__name__)

def jwt_required(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # Log the headers received for debugging
        auth_meta = request.META.get("HTTP_AUTHORIZATION")
        auth_header = request.headers.get("Authorization")
        logger.debug("Before processing, HTTP_AUTHORIZATION in META: %s", auth_meta)
        logger.debug("Before processing, Authorization in request.headers: %s", auth_header)

        # If not in META, try to set it from request.headers
        if not auth_meta and auth_header:
            request.META["HTTP_AUTHORIZATION"] = auth_header
            logger.debug("Set HTTP_AUTHORIZATION in META from request.headers: %s", auth_header)

        # Instantiate the JWT authenticator
        authenticator = JWTAuthentication()
        try:
            auth_result = authenticator.authenticate(request)
            if auth_result is None:
                logger.debug("JWTAuthentication.authenticate returned None")
                return JsonResponse({"error": "Authentication required."}, status=401)
            # If authentication succeeds, set request.user and log it
            request.user = auth_result[0]
            logger.debug("JWT authentication succeeded, user: %s", request.user)
        except Exception as e:
            logger.exception("JWT authentication exception: %s", str(e))
            return JsonResponse({"error": "Authentication failed", "details": str(e)}, status=401)
        return view_func(request, *args, **kwargs)
    return _wrapped_view
