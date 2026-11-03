"""Root URL configuration.

English: Mounts the risk application's API under /api/.

Español: Monta la API de la aplicación de riesgo bajo /api/.
"""

from django.urls import include, path

urlpatterns = [
    path("api/", include("risk.urls")),
]
