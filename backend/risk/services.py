"""Evaluation flow: plan the routes, read the weather, score and rank.

English: The three external dependencies (geocoder, routing and weather)
are passed in as parameters, so the whole flow can be tested with fakes.

Español: Las tres dependencias externas (geocodificador, rutas y clima) se
pasan como parámetros, así todo el flujo puede probarse con dobles.
"""

import hashlib
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from django.core.cache import cache

from .engine import LEVEL_CODE, UNKNOWN, Conditions, classify
from .geo import METERS_PER_MILE, Checkpoint, sample_checkpoints
from .providers import Forecast, ProviderError, forecast_horizon
from .ranking import DEFAULT_TOLERANCE_MILES, Sample, RouteRisk, rank, summarize

REQUIRED_ALTERNATIVES = 3
FORECAST_HOURS = 48
HOURLY_FRAMES = FORECAST_HOURS + 1  # horas 0 a 48, una por cada posición del slider
FORECAST_CACHE_SECONDS = 3600
ROUTE_CACHE_SECONDS = 3600
COORD_DECIMALS = 2  # ~1 km: puntos cercanos comparten pronóstico en caché


@dataclass(frozen=True)
class TripRequest:
    """Validated input of one evaluation.

    English: Departure must be timezone-aware.

    Español: La salida debe tener zona horaria.
    """
    origin: str
    destination: str
    departure: datetime
    load_lb: float
    tolerance_miles: float = DEFAULT_TOLERANCE_MILES
    sample_every_miles: float = 10.0


@dataclass(frozen=True)
class PlannedRoute:
    """One route with its sampled checkpoints.

    English: Carries the geometry, the total length and duration, and the
    checkpoints sampled along the route.

    Español: Lleva la geometría, la longitud y la duración totales, y los
    checkpoints muestreados a lo largo de la ruta.
    """
    route_id: str
    line: tuple  # pares (lat, lon)
    meters: float
    seconds: float
    checkpoints: tuple


@dataclass(frozen=True)
class TripPlan:
    """The routes and places for one trip, before any weather is read.

    English: Built once per trip and reused by both the evaluation and the
    departure options.

    Español: Se construye una vez por viaje y lo reutilizan la evaluación y
    las opciones de salida.
    """
    origin: tuple
    destination: tuple
    routes: tuple
    warnings: tuple

    @property
    def points(self) -> list[tuple]:
        """Every checkpoint coordinate of every route, as (lat, lon).

        English: Used to request the forecasts in one batch.

        Español: Se usa para pedir los pronósticos en un solo lote.
        """
        return [(cp.lat, cp.lon) for route in self.routes for cp in route.checkpoints]


@dataclass(frozen=True)
class CheckpointEval:
    """One checkpoint scored at its arrival time.

    English: `values` is None when the forecast does not cover the arrival.

    Español: `values` es None cuando el pronóstico no cubre la llegada.
    """
    checkpoint: Checkpoint
    forecast: Forecast | None
    eta: datetime
    level: str
    values: tuple | None  # (viento mph, lluvia in/h, nieve in/h, componente que decide)


def _point_key(lat: float, lon: float) -> tuple:
    """Round a coordinate pair so nearby points share a forecast.

    English: Two decimal places are about one kilometre.

    Español: Dos decimales equivalen a aproximadamente un kilómetro.
    """
    return round(lat, COORD_DECIMALS), round(lon, COORD_DECIMALS)


def _memoize(key: str, ttl: int, compute):
    """Return a cached value, computing and caching it on a miss.

    English: The key is hashed so free text from the user never reaches the cache key.

    Español: La clave se convierte en hash para que el texto libre del usuario no llegue a la clave de caché.
    """
    # Hash: las claves de caché no deben contener espacios ni texto libre del usuario.
    cache_key = "memo:" + hashlib.sha256(key.encode("utf-8")).hexdigest()
    value = cache.get(cache_key)
    if value is None:
        value = compute()
        cache.set(cache_key, value, ttl)
    return value


def plan_trip(request: TripRequest, *, geocoder, routing) -> TripPlan:
    """Geocode the ends and request the route alternatives.

    English: Geocoding and routing are cached for an hour because they do
    not depend on the departure time. The checkpoints are sampled here.

    Español: La geocodificación y las rutas se guardan una hora en caché porque
    no dependen de la hora de salida. Los checkpoints se muestrean aquí.

    Raises:
        ProviderError: If there are no routes.
    """
    origin = _memoize(f"geocode:{request.origin}", ROUTE_CACHE_SECONDS, lambda: geocoder.geocode(request.origin))
    destination = _memoize(
        f"geocode:{request.destination}", ROUTE_CACHE_SECONDS, lambda: geocoder.geocode(request.destination)
    )
    options = _memoize(
        f"routes:{origin}:{destination}",
        ROUTE_CACHE_SECONDS,
        lambda: routing.alternatives(origin, destination, count=REQUIRED_ALTERNATIVES),
    )
    if not options:
        raise ProviderError("No routes found between origin and destination.", code="no_routes")

    routes = tuple(
        PlannedRoute(
            route_id=f"route-{index + 1}",
            line=tuple(option.line),
            meters=option.meters,
            seconds=option.seconds,
            checkpoints=tuple(sample_checkpoints(list(option.line), request.sample_every_miles)),
        )
        for index, option in enumerate(options)
    )
    warnings = ()
    if len(options) < REQUIRED_ALTERNATIVES:
        warnings = ({"code": "fewer_alternatives", "found": len(options), "requested": REQUIRED_ALTERNATIVES},)
    return TripPlan(origin=origin, destination=destination, routes=routes, warnings=warnings)


def load_forecasts(points: list[tuple], weather) -> dict:
    """Return the forecast for every point, using the cache where possible.

    English: Points missing from the cache are requested in one batch.

    Español: Los puntos que no están en caché se piden en un solo lote.
    """
    keys = {_point_key(lat, lon) for lat, lon in points}
    cache_keys = {point: f"forecast:{point[0]}:{point[1]}" for point in keys}
    found = cache.get_many(cache_keys.values())

    result = {point: found[key] for point, key in cache_keys.items() if key in found}
    missing = [point for point in cache_keys if point not in result]
    if missing:
        fetched = weather.forecasts(missing)
        for point, forecast in zip(missing, fetched):
            result[point] = forecast
        cache.set_many({cache_keys[p]: result[p] for p in missing}, FORECAST_CACHE_SECONDS)
    return result


def _eta_level(forecast, eta, now, load_lb) -> tuple:
    """Classify one checkpoint at its arrival time.

    English: Arrivals beyond the 48-hour horizon are unknown.

    Español: Las llegadas más allá de las 48 horas son desconocidas.
    """
    if eta > forecast_horizon(now, FORECAST_HOURS):
        return UNKNOWN, None
    values = forecast.at(eta) if forecast else None
    if values is None:
        return UNKNOWN, None
    wind, rain, snow = values
    result = classify(Conditions(wind_mph=wind, rain_in_h=rain, snow_in_h=snow, load_lb=load_lb))
    return result.level, (wind, rain, snow, result.driver)


def score_route(route: PlannedRoute, forecasts: dict, departure: datetime, load_lb: float, now: datetime):
    """Score every checkpoint of a route for one departure time.

    English: The arrival time of each checkpoint is proportional to the
    distance travelled. This is an approximation that does not use per-step
    durations from the provider.

    Español: La hora de llegada de cada checkpoint es proporcional a la
    distancia recorrida. Es una aproximación que no usa las duraciones por
    tramo del proveedor.

    Returns:
        (RouteRisk, list of CheckpointEval).
    """
    evals = []
    for cp in route.checkpoints:
        eta = departure + timedelta(seconds=route.seconds * cp.meters / route.meters)
        forecast = forecasts.get(_point_key(cp.lat, cp.lon))
        level, values = _eta_level(forecast, eta, now, load_lb)
        evals.append(CheckpointEval(checkpoint=cp, forecast=forecast, eta=eta, level=level, values=values))

    samples = [Sample(mile=e.checkpoint.mile, level=e.level) for e in evals]
    risk = summarize(route.route_id, samples, route.meters / METERS_PER_MILE, route.seconds / 60)
    return risk, evals


def hourly_levels(forecast: Forecast | None, load_lb: float, base: datetime) -> str:
    """Return the level of a point for each hour of the slider.

    English: The result is 49 digit codes, one per hour from 0 to 48, so the
    frontend can move the slider without new requests.

    Español: El resultado son 49 códigos numéricos, uno por hora de 0 a 48,
    para que el frontend mueva el slider sin nuevas peticiones.
    """
    codes = []
    for hour in range(HOURLY_FRAMES):
        values = forecast.at(base + timedelta(hours=hour)) if forecast else None
        if values is None:
            codes.append(LEVEL_CODE[UNKNOWN])
            continue
        wind, rain, snow = values
        level = classify(Conditions(wind_mph=wind, rain_in_h=rain, snow_in_h=snow, load_lb=load_lb)).level
        codes.append(LEVEL_CODE[level])
    return "".join(codes)


def _require_aware(moment: datetime) -> None:
    """Raise ValueError if a datetime has no time zone.

    English: Naive departures would be ambiguous.

    Español: Una salida sin zona horaria sería ambigua.
    """
    if moment.tzinfo is None:
        raise ValueError("Departure time must include a time zone.")


def _current_hour(now: datetime) -> datetime:
    """Return `now` in UTC, truncated to the hour.

    English: This is the base of the forecast slider.

    Español: Es la base del slider de pronóstico.
    """
    return now.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)


def _route_json(index: int, route: PlannedRoute, risk: RouteRisk, evals: list, forecasts: dict, load_lb: float, base: datetime) -> dict:
    """Serialize one scored route for the API.

    English: Coordinates are rounded to keep the payload small.

    Español: Las coordenadas se redondean para mantener la respuesta pequeña.
    """
    checkpoints = []
    for position, item in enumerate(evals):
        cp = item.checkpoint
        out = {
            "index": position,
            "mile": round(cp.mile, 2),
            "lat": round(cp.lat, 5),
            "lon": round(cp.lon, 5),
            "eta": item.eta.isoformat(),
            "level": item.level,
            "hourly": hourly_levels(forecasts.get(_point_key(cp.lat, cp.lon)), load_lb, base),
        }
        if item.values:
            wind, rain, snow, driver = item.values
            out.update({
                "driver": driver,
                "wind_mph": round(wind, 1),
                "rain_in_h": round(rain, 2),
                "snow_in_h": round(snow, 2),
            })
        checkpoints.append(out)

    return {
        "id": risk.route_id,
        "label": f"Ruta {index + 1}",
        "distance_miles": round(route.meters / METERS_PER_MILE, 1),
        "duration_minutes": round(route.seconds / 60),
        "eligible": risk.eligible,
        "blocked_reasons": list(risk.blocked_reasons),
        "severe_miles": round(risk.severe_miles, 1),
        "high_miles": round(risk.high_miles, 1),
        "notravel_miles": round(risk.notravel_miles, 1),
        "unknown_miles": round(risk.unknown_miles, 1),
        "avg_risk": None if risk.avg_risk == float("inf") else round(risk.avg_risk, 2),
        "polyline": [[round(lat, 5), round(lon, 5)] for lat, lon in route.line],
        "checkpoints": checkpoints,
    }


def evaluate_trip(request: TripRequest, *, geocoder, routing, weather, now: datetime | None = None) -> dict:
    """Evaluate every route for one trip.

    English: Returns the routes with their checkpoints and hourly levels,
    the ranking, the recommended route id and any warnings.

    Español: Devuelve las rutas con sus checkpoints y niveles por hora, el
    ranking, el identificador de la ruta recomendada y los avisos.

    Raises:
        ValueError: If the departure has no time zone.
        ProviderError: If a provider fails.
    """
    _require_aware(request.departure)
    now = now or datetime.now(timezone.utc)
    base = _current_hour(now)

    plan = plan_trip(request, geocoder=geocoder, routing=routing)
    forecasts = load_forecasts(plan.points, weather)

    scored = [
        (index, route, *score_route(route, forecasts, request.departure, request.load_lb, now))
        for index, route in enumerate(plan.routes)
    ]
    ranked = rank([risk for _, _, risk, _ in scored], request.tolerance_miles)
    ranking = [r.route_id for r in ranked]

    routes_out = [
        _route_json(index, route, risk, evals, forecasts, request.load_lb, base)
        for index, route, risk, evals in scored
    ]

    warnings = list(plan.warnings)
    if not ranked:
        warnings.append({"code": "no_safe_route"})

    return {
        "origin": {"query": request.origin, "lat": plan.origin[0], "lon": plan.origin[1]},
        "destination": {"query": request.destination, "lat": plan.destination[0], "lon": plan.destination[1]},
        "departure": request.departure.isoformat(),
        "load_lb": request.load_lb,
        "tolerance_miles": request.tolerance_miles,
        "sample_every_miles": request.sample_every_miles,
        "forecast_base": base.isoformat(),
        "hours": HOURLY_FRAMES,
        "recommended_route_id": ranking[0] if ranking else None,
        "ranking": ranking,
        "routes": routes_out,
        "warnings": warnings,
    }


def departure_options(
    request: TripRequest,
    *,
    geocoder,
    routing,
    weather,
    now: datetime | None = None,
    window_hours: int = FORECAST_HOURS,
    step_hours: int = 2,
) -> dict:
    """Recommend a route for each departure hour in a window.

    English: Routes and forecasts are requested once; each departure only
    recalculates the arrival times.

    Español: Las rutas y los pronósticos se piden una sola vez; cada salida solo
    recalcula las horas de llegada.

    Args:
        request: The trip whose departure is the first column.
        window_hours: Length of the window, in hours.
        step_hours: Gap between departure columns, in hours.

    Returns:
        A dictionary with one column per departure and the earliest clean departure.
    """
    _require_aware(request.departure)
    now = now or datetime.now(timezone.utc)
    plan = plan_trip(request, geocoder=geocoder, routing=routing)
    forecasts = load_forecasts(plan.points, weather)

    columns = []
    for offset in range(0, window_hours + 1, step_hours):
        departure = request.departure + timedelta(hours=offset)
        risks = []
        routes = {}
        for route in plan.routes:
            risk, evals = score_route(route, forecasts, departure, request.load_lb, now)
            risks.append(risk)
            routes[risk.route_id] = {
                "eligible": risk.eligible,
                "severe_miles": round(risk.severe_miles, 1),
                "high_miles": round(risk.high_miles, 1),
                "minutes": round(route.seconds / 60),
                "levels": "".join(LEVEL_CODE[e.level] for e in evals),
            }
        ranked = rank(risks, request.tolerance_miles)
        columns.append({
            "departure": departure.isoformat(),
            "recommended_route_id": ranked[0].route_id if ranked else None,
            "routes": routes,
        })

    earliest = next((c["departure"] for c in columns if c["recommended_route_id"]), None)
    return {
        "window_hours": window_hours,
        "step_hours": step_hours,
        "level_codes": LEVEL_CODE,
        "columns": columns,
        "earliest_clean_departure": earliest,
    }
