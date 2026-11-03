"""Route geometry: distances, checkpoint sampling and detour points.

English: Pure functions. Distances use the haversine formula on a sphere
of 6,371 km radius.

Español: Funciones puras. Las distancias usan la fórmula de haversine
sobre una esfera de 6,371 km de radio.
"""

import bisect
import math
from dataclasses import dataclass

METERS_PER_MILE = 1609.344
EARTH_RADIUS_M = 6_371_000.0


@dataclass(frozen=True)
class Checkpoint:
    """A point sampled along a route.

    English: `mile` is measured from the origin, and `meters` is the same
    distance in metres.

    Español: `mile` se mide desde el origen y `meters` es la misma distancia en metros.
    """
    mile: float
    lat: float
    lon: float
    meters: float  # distancia recorrida desde el origen, en metros


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance between two points, in metres.

    English: Inputs are latitudes and longitudes in decimal degrees.

    Español: Las entradas son latitudes y longitudes en grados decimales.
    """
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = phi2 - phi1
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlmb / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def cumulative_m(line: list[tuple[float, float]]) -> list[float]:
    """Return the distance travelled up to each vertex of a polyline.

    English: The first value is 0 and the last is the total length.

    Español: El primer valor es 0 y el último es la longitud total.

    Raises:
        ValueError: If the line is empty.
    """
    if not line:
        raise ValueError("La geometría de la ruta está vacía.")
    distances = [0.0]
    for (lat1, lon1), (lat2, lon2) in zip(line, line[1:]):
        distances.append(distances[-1] + haversine_m(lat1, lon1, lat2, lon2))
    return distances


def sample_checkpoints(line: list[tuple[float, float]], every_miles: float) -> list[Checkpoint]:
    """Sample checkpoints every `every_miles` along a route.

    English: The first checkpoint is at the origin. The destination itself
    is not a checkpoint: the last one covers the stretch up to the end.

    Español: El primer checkpoint está en el origen. El destino no es un
    checkpoint: el último cubre el tramo hasta el final.

    Raises:
        ValueError: If the interval is not positive.
    """
    if every_miles <= 0:
        raise ValueError("El intervalo de muestreo debe ser mayor que cero.")

    distances = cumulative_m(line)
    total = distances[-1]
    step = every_miles * METERS_PER_MILE

    checkpoints = []
    target = 0.0
    while target < total:
        index = min(bisect.bisect_right(distances, target) - 1, len(line) - 2)
        lat1, lon1 = line[index]
        lat2, lon2 = line[index + 1]
        seg = distances[index + 1] - distances[index]
        t = (target - distances[index]) / seg if seg > 0 else 0.0
        checkpoints.append(
            Checkpoint(
                mile=target / METERS_PER_MILE,
                lat=lat1 + (lat2 - lat1) * t,
                lon=lon1 + (lon2 - lon1) * t,
                meters=target,
            )
        )
        target += step
    return checkpoints


def detour_points(origin: tuple, destination: tuple, midpoint: tuple, offset_km: float) -> list[tuple]:
    """Return two points on either side of a midpoint, perpendicular to the trip.

    English: Uses a flat-earth approximation, which is accurate enough for
    trips of hundreds of kilometres. The result is the seed for detour
    routes when the provider only returns one route.

    Español: Usa una aproximación plana, suficiente para trayectos de cientos
    de kilómetros. Sirve de punto semilla para rutas de desvío cuando el
    proveedor devuelve una sola ruta.
    """
    lat0, lon0 = origin
    mid_lat, mid_lon = midpoint
    km_per_lon = 111.32 * math.cos(math.radians(mid_lat))
    km_per_lat = 110.57

    vx = (destination[1] - lon0) * km_per_lon
    vy = (destination[0] - lat0) * km_per_lat
    norm = math.hypot(vx, vy) or 1.0
    perp_x, perp_y = -vy / norm, vx / norm

    points = []
    for sign in (1, -1):
        dx = perp_x * offset_km * sign
        dy = perp_y * offset_km * sign
        points.append((mid_lat + dy / km_per_lat, mid_lon + dx / km_per_lon))
    return points
