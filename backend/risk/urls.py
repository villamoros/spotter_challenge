"""URL routes for the risk API.

English: Maps /health/, /trips/, /trips/<id>/ and /trips/<id>/departures/
to the views in risk.views.

Español: Asocia /health/, /trips/, /trips/<id>/ y /trips/<id>/departures/
con las vistas de risk.views.
"""

from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("trips/", views.trips, name="trips"),
    path("trips/<int:pk>/", views.trip_resource, name="trip-detail"),
    path("trips/<int:pk>/departures/", views.trip_departures, name="trip-departures"),
]
