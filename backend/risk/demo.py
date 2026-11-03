"""Synthetic providers for offline development (SPOTTER_DEMO=1).

English: Generates three curved routes and a moving storm front without
any API key. The data is fictitious and must never decide a real trip.

Español: Genera tres rutas curvas y un frente de tormenta sin ninguna
clave de API. Los datos son ficticios y nunca deben decidir un viaje real.
"""

import math
import re
from datetime import datetime, timedelta, timezone

from .geo import haversine_m
from .providers import Forecast, ProviderError, RouteOption

CITIES = {
    "dallas, tx": (32.7767, -96.7970),
    "denver, co": (39.7392, -104.9903),
    "des moines, ia": (41.5868, -93.6250),
    "chicago, il": (41.8781, -87.6298),
    "amarillo, tx": (35.2220, -101.8313),
    "omaha, ne": (41.2565, -95.9345),
}
COORDS = re.compile(r"^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$")
FORECAST_HOURS = 72
ROUTE_SAMPLES = 80
MPH_TO_MS = 0.44704


class DemoGeocoder:
    """Resolve place names from a fixed catalog of demo cities.

    English: Accepts the names in CITIES (case-insensitive) or "lat,lon"
    pairs. Unknown names raise ProviderError with code place_not_found.

    Español: Acepta los nombres de CITIES (sin distinguir mayúsculas) o
    pares "lat,lon". Los nombres desconocidos lanzan ProviderError con el
    código place_not_found.
    """
    def geocode(self, query: str) -> tuple[float, float]:
        """Return the (lat, lon) of a demo city or coordinate string.

        English: Coordinates are parsed directly; city names are looked up in CITIES.

        Español: Las coordenadas se leen directamente; los nombres de ciudad se buscan en CITIES.
        """
        match = COORDS.match(query)
        if match:
            return float(match.group(1)), float(match.group(2))
        point = CITIES.get(query.strip().lower())
        if point is None:
            raise ProviderError(f"Demo mode does not know '{query}'. Try a city from the catalog.", code="place_not_found")
        return point


class DemoRouting:
    """Build three synthetic routes between two points.

    English: The first route is almost straight; the other two bulge to
    opposite sides and are slightly slower.

    Español: La primera ruta es casi recta; las otras dos se desvían a
    lados opuestos y son un poco más lentas.
    """

    OFFSETS = ((0.0, 1.0), (0.9, 1.08), (-0.9, 1.16))

    def alternatives(self, origin, destination, count=3):
        """Return up to `count` synthetic routes between two points.

        English: Each route is sampled at fixed points; its length comes from
        the haversine distance and its duration from a 55 mph average.

        Español: Cada ruta se muestrea en puntos fijos; su longitud sale de la
        distancia de haversine y su duración de una velocidad media de 55 mph.
        """
        options = []
        (lat1, lon1), (lat2, lon2) = origin, destination
        for offset, slowdown in self.OFFSETS[:count]:
            line = []
            for i in range(ROUTE_SAMPLES + 1):
                t = i / ROUTE_SAMPLES
                bulge = offset * math.sin(math.pi * t)
                line.append((lat1 + (lat2 - lat1) * t + bulge, lon1 + (lon2 - lon1) * t))
            meters = sum(haversine_m(*a, *b) for a, b in zip(line, line[1:]))
            seconds = meters / (55 * MPH_TO_MS) * slowdown
            options.append(RouteOption(line=tuple(line), meters=meters, seconds=seconds))
        return options


class DemoWeather:
    """Synthetic weather: a storm that crosses the corridor from west to east.

    English: The storm centre moves east over 48 hours; wind and rain are
    strongest near the centre.

    Español: El centro de la tormenta avanza hacia el este durante 48 horas;
    el viento y la lluvia son más fuertes cerca del centro.
    """

    def forecasts(self, points):
        """Return one synthetic Forecast per point, starting at the current hour.

        English: Forecasts cover 72 hours so the 48-hour window is always full.

        Español: Los pronósticos cubren 72 horas para que la ventana de 48 horas siempre esté completa.
        """
        now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        return [self._forecast(lat, lon, now) for lat, lon in points]

    @staticmethod
    def _forecast(lat: float, lon: float, start: datetime) -> Forecast:
        """Build the hourly series of one point for the storm model.

        English: Intensity falls off with a Gaussian of the distance to the storm centre.

        Español: La intensidad decae con una gaussiana de la distancia al centro de la tormenta.
        """
        times, winds, rains, snows = [], [], [], []
        for hour in range(FORECAST_HOURS):
            center = -104.0 + 0.09 * hour
            storm = math.exp(-((lon - center) / 1.4) ** 2 - ((lat - 37.0) / 3.5) ** 2)
            times.append(start + timedelta(hours=hour))
            winds.append(round(12 + 36 * storm, 1))
            rains.append(round(0.85 * storm ** 2, 3))
            snows.append(round(0.6 * storm if lat > 40 else 0.0, 3))
        return Forecast(times=tuple(times), wind_mph=tuple(winds), rain_in_h=tuple(rains), snow_in_h=tuple(snows))
