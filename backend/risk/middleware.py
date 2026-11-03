"""CORS middleware for the frontend.

English: Lets the React app on another origin call the API. Only origins
listed in CORS_ALLOWED_ORIGINS receive the CORS headers.

Español: Permite que la aplicación React, en otro origen, llame a la API.
Solo los orígenes listados en CORS_ALLOWED_ORIGINS reciben las cabeceras CORS.
"""

from django.conf import settings
from django.http import HttpResponse

ALLOWED_METHODS = "GET, POST, PATCH, DELETE, OPTIONS"


class CorsMiddleware:
    """Add CORS headers to /api/ responses for allowed origins.

    English: Answers OPTIONS preflight requests with 204 for allowed
    origins; other requests pass through unchanged.

    Español: Responde las peticiones OPTIONS de preflight con 204 para los
    orígenes permitidos; las demás pasan sin cambios.
    """

    def __init__(self, get_response):
        """Store the next middleware in the chain.

        English: Django calls the middleware once at start-up with get_response.

        Español: Django crea el middleware una vez al arrancar, con get_response.
        """
        self.get_response = get_response

    def __call__(self, request):
        """Handle one request.

        English: Returns the preflight response directly, or forwards the
        request and adds the CORS headers to the result.

        Español: Devuelve directamente la respuesta de preflight, o reenvía la
        petición y añade las cabeceras CORS al resultado.
        """
        origin = request.headers.get("Origin")
        allowed = origin is not None and origin in settings.CORS_ALLOWED_ORIGINS

        if request.method == "OPTIONS" and allowed and request.path.startswith("/api/"):
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        if allowed:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Methods"] = ALLOWED_METHODS
            response["Access-Control-Allow-Headers"] = "Content-Type"
            response["Vary"] = "Origin"
        return response
