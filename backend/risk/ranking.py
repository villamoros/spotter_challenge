"""Route summaries and recommendation order.

English: Pure functions. The recommendation order is the one in the
brief: fewest severe miles, fewest high miles, lowest average risk, then
shortest time. Severe and high miles are grouped in tolerance blocks.

Español: Funciones puras. El orden de recomendación es el de la prueba:
menos millas severas, menos millas altas, menor riesgo medio y, por último,
menor tiempo. Las millas severas y altas se agrupan en bloques de tolerancia.
"""

import math
from dataclasses import dataclass, field

from .engine import HIGH, NO_TRAVEL, RISK_POINTS, SEVERE, UNKNOWN

DEFAULT_TOLERANCE_MILES = 1.0


@dataclass(frozen=True)
class Sample:
    """Weather level at one checkpoint.

    English: The stretch from `mile` to the next sample belongs to this level.

    Español: El tramo desde `mile` hasta la siguiente muestra pertenece a este nivel.
    """

    mile: float
    level: str


@dataclass(frozen=True)
class RouteRisk:
    """Risk summary of one route.

    English: Miles per level, the average risk, the time, and the reasons
    the route is blocked.

    Español: Millas por nivel, riesgo medio, tiempo y los motivos por los que
    la ruta está bloqueada.
    """
    route_id: str
    total_miles: float
    minutes: float
    severe_miles: float
    high_miles: float
    notravel_miles: float
    unknown_miles: float
    avg_risk: float
    blocked_reasons: tuple = field(default_factory=tuple)

    @property
    def eligible(self) -> bool:
        """True when the route has no blocking reasons.

        English: A route is eligible only if it has no No Travel and no unknown-forecast stretch.

        Español: Una ruta es elegible solo si no tiene tramos de No viajar ni sin pronóstico.
        """
        return not self.blocked_reasons


def summarize(route_id: str, samples: list[Sample], total_miles: float, minutes: float) -> RouteRisk:
    """Summarize one route from its checkpoint samples.

    English: Each sample covers the distance up to the next one. Stretches
    with No Travel or no forecast make the route ineligible, and the average
    risk ignores them.

    Español: Cada muestra cubre la distancia hasta la siguiente. Los tramos
    con No viajar o sin pronóstico hacen la ruta inelegible, y el riesgo medio
    los ignora.

    Raises:
        ValueError: If the first sample is not at mile 0.
    """
    if not samples or samples[0].mile != 0:
        raise ValueError("La primera muestra debe empezar en la milla 0.")

    severe = high = notravel = unknown = weighted = 0.0
    for index, sample in enumerate(samples):
        end = samples[index + 1].mile if index + 1 < len(samples) else total_miles
        span = max(end - sample.mile, 0.0)

        if sample.level == SEVERE:
            severe += span
        elif sample.level == HIGH:
            high += span
        elif sample.level == NO_TRAVEL:
            notravel += span
        elif sample.level == UNKNOWN:
            unknown += span

        if sample.level in RISK_POINTS:
            weighted += span * RISK_POINTS[sample.level]

    drivable = total_miles - notravel - unknown
    avg = weighted / drivable if drivable > 0 else math.inf

    reasons = []
    if notravel > 0:
        reasons.append("no_travel")
    if unknown > 0:
        reasons.append("no_forecast")

    return RouteRisk(
        route_id=route_id,
        total_miles=total_miles,
        minutes=minutes,
        severe_miles=severe,
        high_miles=high,
        notravel_miles=notravel,
        unknown_miles=unknown,
        avg_risk=avg,
        blocked_reasons=tuple(reasons),
    )


def _bucket(miles: float, tolerance: float) -> float:
    """Group a mile value into tolerance blocks.

    English: With a tolerance of 0 the value is returned unchanged.

    Español: Con tolerancia 0 el valor se devuelve sin cambios.
    """
    return math.floor(miles / tolerance) if tolerance > 0 else miles


def rank(routes: list[RouteRisk], tolerance_miles: float = DEFAULT_TOLERANCE_MILES) -> list[RouteRisk]:
    """Return the eligible routes from best to worst.

    English: Blocked routes are left out. Equal severe and high blocks
    compare the average risk, then the time.

    Español: Las rutas bloqueadas se excluyen. Si los bloques de millas
    severas y altas empatan, se compara el riesgo medio y después el tiempo.

    Args:
        routes: Summaries of all the routes.
        tolerance_miles: Size of the blocks used for severe and high miles.

    Returns:
        Eligible RouteRisk objects, best first.
    """
    eligible = [route for route in routes if route.eligible]
    return sorted(
        eligible,
        key=lambda r: (
            _bucket(r.severe_miles, tolerance_miles),
            _bucket(r.high_miles, tolerance_miles),
            r.avg_risk,
            r.minutes,
        ),
    )
