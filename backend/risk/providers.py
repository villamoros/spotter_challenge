"""Adapters for the external services: geocoding, routing and weather.

English: Each adapter accepts an injectable HTTP session so tests run
without network access. Units are converted here, once: the risk engine
only sees mph and inches per hour.

Español: Cada adaptador acepta una sesión HTTP inyectable para que las
pruebas no usen red. Las unidades se convierten aquí, una sola vez: el
motor de riesgo solo ve mph y pulgadas por hora.
"""

import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import requests

from .geo import detour_points

MM_PER_INCH = 25.4
DETOUR_MIN_KM = 20.0  # desvío mínimo para que la alternativa sea distinta de la directa
DETOUR_SHARE = 0.15  # el desvío se aleja 15% de la longitud de la ruta directa
CM_PER_INCH = 2.54
FORECAST_BATCH_SIZE = 50  # coordenadas por petición a Open-Meteo


class ProviderError(Exception):
    """An external service failed.

    English: The view turns it into a 502 response. `code` is stable and
    the frontend translates it; the message is English text for logs.

    Español: La vista lo convierte en una respuesta 502. `code` es estable y
    el frontend lo traduce; el mensaje es texto en inglés para los registros.
    """

    def __init__(self, message: str, code: str = "provider_error"):
        """Create the error with a message and a stable code.

        English: The default code is "provider_error".

        Español: El código por defecto es "provider_error".
        """
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class Forecast:
    """Hourly weather series for one point.

    English: Times are UTC datetimes in order; the three value series have
    the same length as the times.

    Español: Las horas son datetimes UTC en orden; las tres series de valores
    tienen la misma longitud que las horas.
    """

    times: tuple
    wind_mph: tuple
    rain_in_h: tuple
    snow_in_h: tuple

    def at(self, moment: datetime) -> tuple[float, float, float] | None:
        """Return the weather for the hour that contains a moment.

        English: The moment is converted to UTC and truncated to the hour.

        Español: El momento se convierte a UTC y se trunca a la hora.

        Returns:
            (wind mph, rain in/h, snow in/h), or None outside the series.
        """
        hour = moment.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)
        if not self.times or hour < self.times[0] or hour > self.times[-1]:
            return None
        index = self.times.index(hour)
        return self.wind_mph[index], self.rain_in_h[index], self.snow_in_h[index]


@dataclass(frozen=True)
class RouteOption:
    """One route returned by a routing provider.

    English: `line` holds (lat, lon) pairs; `meters` and `seconds` are the
    total distance and duration.

    Español: `line` guarda pares (lat, lon); `meters` y `seconds` son la
    distancia y la duración totales.
    """
    line: tuple  # pares (lat, lon)
    meters: float
    seconds: float


class Geocoder:
    """Turn place names into coordinates with Nominatim.

    English: Coordinate strings such as "32.7,-96.8" are parsed without a
    request, which also respects Nominatim's usage limit.

    Español: Las cadenas de coordenadas como "32.7,-96.8" se leen sin hacer
    una petición, lo que también respeta el límite de uso de Nominatim.
    """
    URL = "https://nominatim.openstreetmap.org/search"
    COORDS = re.compile(r"^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$")

    def __init__(self, session=None, user_agent="SpotterRiskLab/1.0", timeout=10):
        """Configure the HTTP session and the User-Agent.

        English: Nominatim requires an identifying User-Agent.

        Español: Nominatim exige un User-Agent que identifique la aplicación.
        """
        self.session = session or requests.Session()
        self.user_agent = user_agent
        self.timeout = timeout

    def geocode(self, query: str) -> tuple[float, float]:
        """Return the (lat, lon) of a place name or coordinate string.

        English: Raises ProviderError with code geocode_failed when the request
        fails, and place_not_found when nothing matches.

        Español: Lanza ProviderError con código geocode_failed si la petición
        falla, y place_not_found si nada coincide.
        """
        # "lat,lon" directo: evita una petición y el límite de 1 req/s de Nominatim.
        match = self.COORDS.match(query)
        if match:
            return float(match.group(1)), float(match.group(2))

        try:
            response = self.session.get(
                self.URL,
                params={"q": query, "format": "json", "limit": 1},
                headers={"User-Agent": self.user_agent},
                timeout=self.timeout,
            )
            response.raise_for_status()
            results = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise ProviderError(f"Could not geocode '{query}'.", code="geocode_failed") from exc

        if not results:
            raise ProviderError(f"Location '{query}' was not found.", code="place_not_found")
        return float(results[0]["lat"]), float(results[0]["lon"])


class RoutingProvider:
    """Route provider backed by OpenRouteService with the HGV (truck) profile.

    English: Returns the direct route plus up to two detours, because
    alternative routes only work up to 100 km.

    Español: Devuelve la ruta directa y hasta dos desvíos, porque las rutas
    alternativas solo funcionan hasta 100 km.
    """

    URL = "https://api.openrouteservice.org/v2/directions/driving-hgv/geojson"

    def __init__(self, api_key, session=None, timeout=15):
        """Store the API key and the HTTP session.

        English: The key is sent in the Authorization header.

        Español: La clave se envía en la cabecera Authorization.
        """
        self.api_key = api_key
        self.session = session or requests.Session()
        self.timeout = timeout

    def alternatives(self, origin: tuple, destination: tuple, count: int = 3) -> list[RouteOption]:
        """Return the direct route and detours between two points.

        English: A detour that fails is skipped instead of failing the whole
        trip. The direct route must succeed.

        Español: Un desvío que falla se omite en lugar de fallar todo el viaje.
        La ruta directa debe funcionar.

        Args:
            origin: (lat, lon) of the origin.
            destination: (lat, lon) of the destination.
            count: Maximum number of routes to return.

        Returns:
            A list of RouteOption, direct route first.
        """
        direct = self._directions([origin, destination])
        routes = [direct]
        if count <= 1:
            return routes

        midpoint = direct.line[len(direct.line) // 2]
        offset_km = max(DETOUR_MIN_KM, DETOUR_SHARE * direct.meters / 1000)
        for via in detour_points(origin, destination, midpoint, offset_km)[: count - 1]:
            try:
                routes.append(self._directions([origin, via, destination]))
            except ProviderError:
                continue
        return routes

    def _directions(self, points: list[tuple]) -> RouteOption:
        """Request one route through the given points.

        English: radiuses -1 lets the service snap each point to the nearest
        road; without it, a point in open country returns HTTP 404.

        Español: radiuses -1 permite ajustar cada punto a la carretera más
        cercana; sin eso, un punto en campo abierto devuelve HTTP 404.

        Raises:
            ProviderError: If the request fails or the response has no route.
        """
        # radiuses -1: ORS ajusta cada punto a la carretera más cercana. Sin esto, un punto de
        # desvío en campo abierto devuelve 404 (no hay vía a 350 m).
        body = {
            "coordinates": [[lon, lat] for lat, lon in points],
            "radiuses": [-1] * len(points),
            "units": "m",
        }
        try:
            response = self.session.post(
                self.URL,
                json=body,
                headers={"Authorization": self.api_key},
                timeout=self.timeout,
            )
            response.raise_for_status()
            feature = response.json()["features"][0]
            summary = feature["properties"]["summary"]
            line = tuple((lat, lon) for lon, lat in feature["geometry"]["coordinates"])
        except (requests.RequestException, KeyError, IndexError, ValueError) as exc:
            raise ProviderError("The routing service did not return a valid route.", code="routing_failed") from exc
        return RouteOption(line=line, meters=summary["distance"], seconds=summary["duration"])


class WeatherProvider:
    """Weather provider backed by Open-Meteo (no API key needed).

    English: Requests wind in mph; rain arrives in mm and snowfall in cm,
    and is converted to inches per hour.

    Español: Pide el viento en mph; la lluvia llega en mm y la nieve en cm,
    y se convierten a pulgadas por hora.
    """

    URL = "https://api.open-meteo.com/v1/forecast"
    FORECAST_DAYS = 3  # 72 h de cobertura; el motor solo usa las primeras 48

    def __init__(self, session=None, timeout=15):
        """Store the HTTP session and timeout.

        English: The session can be replaced in tests.

        Español: La sesión puede reemplazarse en las pruebas.
        """
        self.session = session or requests.Session()
        self.timeout = timeout

    def forecasts(self, points: list[tuple]) -> list[Forecast]:
        """Return one Forecast per point, in the same order.

        English: Points are sent in batches of FORECAST_BATCH_SIZE.

        Español: Los puntos se envían en lotes de FORECAST_BATCH_SIZE.
        """
        results: list[Forecast] = []
        for start in range(0, len(points), FORECAST_BATCH_SIZE):
            batch = points[start:start + FORECAST_BATCH_SIZE]
            results.extend(self._fetch(batch))
        return results

    def _fetch(self, batch: list[tuple]) -> list[Forecast]:
        """Request one batch of points from Open-Meteo.

        English: Open-Meteo returns a list for several points and an object for one.

        Español: Open-Meteo devuelve una lista para varios puntos y un objeto para uno.

        Raises:
            ProviderError: If the request fails or the point count does not match.
        """
        params = {
            "latitude": ",".join(f"{lat:.4f}" for lat, _ in batch),
            "longitude": ",".join(f"{lon:.4f}" for _, lon in batch),
            "hourly": "wind_speed_10m,rain,snowfall",
            "wind_speed_unit": "mph",
            "forecast_days": self.FORECAST_DAYS,
            "timezone": "UTC",
        }
        try:
            response = self.session.get(self.URL, params=params, timeout=self.timeout)
            response.raise_for_status()
            payload = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise ProviderError("The weather service did not respond.", code="weather_failed") from exc

        # Con varias coordenadas la respuesta es una lista; con una, un objeto.
        items = payload if isinstance(payload, list) else [payload]
        if len(items) != len(batch):
            raise ProviderError("The weather service returned fewer points than requested.", code="weather_failed")
        return [self._to_forecast(item) for item in items]

    @staticmethod
    def _to_forecast(item: dict) -> Forecast:
        """Convert one Open-Meteo item into a Forecast.

        English: Missing values count as zero. Rain is divided by 25.4 (mm to
        inches) and snowfall by 2.54 (cm to inches).

        Español: Los valores ausentes cuentan como cero. La lluvia se divide entre
        25.4 (mm a pulgadas) y la nieve entre 2.54 (cm a pulgadas).
        """
        hourly = item["hourly"]
        times = tuple(
            datetime.fromisoformat(value).replace(tzinfo=timezone.utc) for value in hourly["time"]
        )
        return Forecast(
            times=times,
            wind_mph=tuple(float(v or 0) for v in hourly["wind_speed_10m"]),
            rain_in_h=tuple(float(v or 0) / MM_PER_INCH for v in hourly["rain"]),
            snow_in_h=tuple(float(v or 0) / CM_PER_INCH for v in hourly["snowfall"]),
        )


def forecast_horizon(now: datetime, hours: int = 48) -> datetime:
    """Return the moment `hours` after `now`.

    English: Used to decide whether a checkpoint is inside the forecast window.

    Español: Sirve para decidir si un checkpoint está dentro de la ventana de pronóstico.
    """
    return now + timedelta(hours=hours)
