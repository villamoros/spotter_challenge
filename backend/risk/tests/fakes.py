"""Test doubles for the external services.

English: Fake geocoder, routing and weather providers that return fixed
data, so the evaluation flow runs without network access.

Español: Dobles de los proveedores de geocodificación, rutas y clima que
devuelven datos fijos, así el flujo de evaluación se ejecuta sin red.
"""

from datetime import datetime, timedelta, timezone

from risk.geo import haversine_m
from risk.providers import Forecast, RouteOption

NOW = datetime(2026, 11, 2, 12, 0, tzinfo=timezone.utc)


def hourly_forecast(wind_mph, start=NOW, rain_in_h: float = 0.0, snow_in_h: float = 0.0, hours: int = 72) -> Forecast:
    """Build a 72-hour forecast from a fixed wind value or a function of the hour.

    English: `wind_mph` can be a number or a callable receiving the hour index.

    Español: `wind_mph` puede ser un número o una función que recibe el índice de hora.
    """
    start = start.replace(minute=0, second=0, microsecond=0)
    times = tuple(start + timedelta(hours=h) for h in range(hours))
    winds = tuple(wind_mph(h) if callable(wind_mph) else wind_mph for h in range(hours))
    return Forecast(
        times=times,
        wind_mph=winds,
        rain_in_h=(rain_in_h,) * hours,
        snow_in_h=(snow_in_h,) * hours,
    )


class FakeGeocoder:
    """Geocoder double that looks names up in a fixed dictionary.

    Español: Doble del geocodificador que busca los nombres en un diccionario fijo.
    """

    def __init__(self, points):
        """Store the name-to-coordinates mapping.

        Español: Guarda el mapa de nombre a coordenadas.
        """
        self.points = points

    def geocode(self, query):
        """Return the fixed coordinates of a name.

        Español: Devuelve las coordenadas fijas de un nombre.
        """
        return self.points[query]


class FakeRouting:
    """Routing double that returns one straight route per longitude.

    English: Each route runs one degree of latitude (about 69 miles) at the given longitude.

    Español: Cada ruta recorre un grado de latitud (unas 69 millas) a la longitud indicada.
    """

    def __init__(self, lons, seconds=3600.0):
        """Store the longitudes and the duration of every route.

        Español: Guarda las longitudes y la duración de cada ruta.
        """
        self.lons = lons
        self.seconds = seconds

    def alternatives(self, origin, destination, count=3):
        """Return up to `count` straight routes, one per configured longitude.

        Español: Devuelve hasta `count` rutas rectas, una por longitud configurada.
        """
        options = []
        for lon in self.lons[:count]:
            line = ((0.0, lon), (1.0, lon))
            options.append(RouteOption(line=line, meters=haversine_m(0, lon, 1, lon), seconds=self.seconds))
        return options


class FakeWeather:
    """Weather double that counts its calls and returns wind by position.

    English: `wind_by_lon` receives (lon, lat, default) and returns a wind value or a callable.

    Español: `wind_by_lon` recibe (lon, lat, default) y devuelve un valor de viento o una función.
    """

    def __init__(self, wind_by_lon, default_wind=10.0, start=NOW):
        """Store the wind rule, the default wind and the forecast start.

        Español: Guarda la regla de viento, el viento por defecto y el inicio del pronóstico.
        """
        self.wind_by_lon = wind_by_lon
        self.default_wind = default_wind
        self.start = start
        self.calls = 0
        self.points_requested = 0

    def forecasts(self, points):
        """Return one fake forecast per point and count the request.

        Español: Devuelve un pronóstico falso por punto y cuenta la petición.
        """
        self.calls += 1
        self.points_requested += len(points)
        return [
            hourly_forecast(self.wind_by_lon(lon, lat, self.default_wind), start=self.start)
            for lat, lon in points
        ]
