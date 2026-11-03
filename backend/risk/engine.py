"""Weather risk rules for trucks.

English: Pure functions with no network or database access. Each weather
component (wind, rain, snow) is classified on its own, and the worst
component decides the checkpoint level. Load rules change only the wind.

Español: Funciones puras, sin red ni base de datos. Cada componente del
clima (viento, lluvia, nieve) se clasifica por separado y el peor decide
el nivel del checkpoint. Las reglas de carga solo modifican el viento.
"""

from dataclasses import dataclass

LOW = "low"
MODERATE = "moderate"
HIGH = "high"
SEVERE = "severe"
NO_TRAVEL = "notravel"
# Sin pronóstico (ETA fuera de la ventana de 48 h). Bloquea la ruta, nunca se recomienda en silencio.
UNKNOWN = "unknown"

# Puntuación para el riesgo medio. NO_TRAVEL y UNKNOWN no entran.
RISK_POINTS = {LOW: 0, MODERATE: 1, HIGH: 2, SEVERE: 3}
SEVERITY_ORDER = {LOW: 0, MODERATE: 1, HIGH: 2, SEVERE: 3, NO_TRAVEL: 4}

# Código de un dígito para series horarias compactas (la API las envía como cadena "0123...").
LEVEL_CODE = {LOW: "0", MODERATE: "1", HIGH: "2", SEVERE: "3", NO_TRAVEL: "4", UNKNOWN: "5"}

LOAD_NO_TRAVEL_LB = 30_000
LOAD_SEVERE_LB = 40_000


def classify_wind(mph: float) -> str:
    """Classify a sustained wind speed in mph.

    English: Lower limits belong to the more severe level; 55 mph or more is No Travel.

    Español: Los límites inferiores pertenecen al nivel más severo; 55 mph o más es No viajar.

    Args:
        mph: Sustained wind speed in miles per hour.

    Returns:
        One of the level constants (LOW, MODERATE, HIGH, SEVERE, NO_TRAVEL).
    """
    if mph >= 55:
        return NO_TRAVEL
    if mph >= 45:
        return SEVERE
    if mph >= 35:
        return HIGH
    if mph >= 25:
        return MODERATE
    return LOW


def classify_rain(inches_per_hour: float) -> str:
    """Classify rainfall in inches per hour.

    English: Above 1.00 in/h is No Travel; exactly 1.00 is Severe.

    Español: Por encima de 1.00 in/h es No viajar; exactamente 1.00 es Severo.

    Args:
        inches_per_hour: Rainfall rate in inches per hour.

    Returns:
        One of the level constants.
    """
    if inches_per_hour > 1.00:
        return NO_TRAVEL
    if inches_per_hour >= 0.50:
        return SEVERE
    if inches_per_hour >= 0.25:
        return HIGH
    if inches_per_hour >= 0.10:
        return MODERATE
    return LOW


def classify_snow(inches_per_hour: float) -> str:
    """Classify snowfall in inches per hour.

    English: Above 3.0 in/h is No Travel; exactly 3.0 is Severe.

    Español: Por encima de 3.0 in/h es No viajar; exactamente 3.0 es Severo.

    Args:
        inches_per_hour: Snowfall rate in inches per hour.

    Returns:
        One of the level constants.
    """
    if inches_per_hour > 3.0:
        return NO_TRAVEL
    if inches_per_hour >= 2.0:
        return SEVERE
    if inches_per_hour >= 1.0:
        return HIGH
    if inches_per_hour >= 0.5:
        return MODERATE
    return LOW


def wind_with_load(mph: float, load_lb: float) -> str:
    """Classify wind after applying the load rules.

    English: Wind of 45 to 54 mph above 30,000 lb becomes No Travel, and
    wind of 35 to 44 mph above 40,000 lb becomes Severe. Other cases keep
    the plain wind level.

    Español: Viento de 45 a 54 mph con más de 30,000 lb pasa a No viajar, y
    viento de 35 a 44 mph con más de 40,000 lb pasa a Severo. En los demás
    casos se mantiene el nivel del viento sin carga.

    Args:
        mph: Sustained wind speed in miles per hour.
        load_lb: Cargo weight in pounds.

    Returns:
        The wind level, adjusted for the load.
    """
    level = classify_wind(mph)
    if level == NO_TRAVEL:
        return level
    if mph >= 45 and load_lb > LOAD_NO_TRAVEL_LB:
        return NO_TRAVEL
    if level == HIGH and load_lb > LOAD_SEVERE_LB:
        return SEVERE
    return level


@dataclass(frozen=True)
class Conditions:
    """Weather and load at one checkpoint.

    English: Immutable input of classify().

    Español: Entrada inmutable de classify().
    """
    wind_mph: float
    rain_in_h: float
    snow_in_h: float
    load_lb: float


@dataclass(frozen=True)
class Classification:
    """Result of classifying one checkpoint.

    English: Holds the final level, each component's level, and the name
    of the component that decides ("wind", "rain" or "snow").

    Español: Guarda el nivel final, el nivel de cada componente y el nombre
    del componente que decide ("wind", "rain" o "snow").
    """
    level: str
    wind: str
    rain: str
    snow: str
    driver: str  # componente que determina el nivel final


def classify(conditions: Conditions) -> Classification:
    """Classify one checkpoint from its wind, rain, snow and load.

    English: The worst component wins. On a tie, wind is reported as the driver.

    Español: Gana el peor componente. En caso de empate, el viento es el componente que decide.

    Args:
        conditions: Weather values and the cargo weight.

    Returns:
        A Classification with the final level and the deciding component.
    """
    parts = {
        "wind": wind_with_load(conditions.wind_mph, conditions.load_lb),
        "rain": classify_rain(conditions.rain_in_h),
        "snow": classify_snow(conditions.snow_in_h),
    }
    # Con empate gana el viento, que es el primero en el orden de inserción.
    driver = max(parts, key=lambda name: SEVERITY_ORDER[parts[name]])
    return Classification(
        level=parts[driver],
        wind=parts["wind"],
        rain=parts["rain"],
        snow=parts["snow"],
        driver=driver,
    )
