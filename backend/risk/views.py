"""REST endpoints for trips.

English: Routes: GET and POST /api/trips/, GET, PATCH and DELETE
/api/trips/<id>/, GET /api/trips/<id>/departures/, and GET /api/health/.
Every error has a stable `code` that the frontend translates.

Español: Rutas: GET y POST /api/trips/, GET, PATCH y DELETE
/api/trips/<id>/, GET /api/trips/<id>/departures/ y GET /api/health/.
Cada error tiene un `code` estable que el frontend traduce.
"""

import json
from datetime import datetime

from django.conf import settings
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_http_methods

from .demo import DemoGeocoder, DemoRouting, DemoWeather
from .models import Trip
from .providers import Geocoder, ProviderError, RoutingProvider, WeatherProvider
from .ranking import DEFAULT_TOLERANCE_MILES
from .services import TripRequest, departure_options, evaluate_trip

ALLOWED_SAMPLE_MILES = (10.0, 25.0, 50.0)
MAX_LOAD_LB = 200_000
MAX_TOLERANCE_MILES = 10.0
MAX_DEPARTURE_WINDOW_HOURS = 48
LIST_LIMIT = 50


class ValidationFailed(Exception):
    """Raised when request fields fail validation.

    English: `errors` maps each field name to an error code.

    Español: `errors` asocia el nombre de cada campo con un código de error.
    """
    def __init__(self, errors: dict):
        """Store the field errors.

        English: The message is generic; the details are in `errors`.

        Español: El mensaje es genérico; el detalle está en `errors`.
        """
        super().__init__("Invalid data.")
        self.errors = errors


def build_providers():
    """Return the geocoder, routing and weather providers to use.

    English: Demo providers when SPOTTER_DEMO is on, otherwise the real
    ones. Tests replace this function to inject fakes.

    Español: Proveedores de demostración si SPOTTER_DEMO está activo; si no,
    los reales. Las pruebas reemplazan esta función para inyectar dobles.

    Raises:
        ProviderError: If ORS_API_KEY is missing.
    """
    if getattr(settings, "SPOTTER_DEMO", False):
        return DemoGeocoder(), DemoRouting(), DemoWeather()
    api_key = getattr(settings, "ORS_API_KEY", "")
    if not api_key:
        raise ProviderError("ORS_API_KEY is not set on the server.", code="missing_api_key")
    return (
        Geocoder(user_agent=settings.NOMINATIM_USER_AGENT),
        RoutingProvider(api_key=api_key),
        WeatherProvider(),
    )


def validate_trip(data: dict) -> TripRequest:
    """Validate a trip payload and return a TripRequest.

    English: Collects every error before raising, so the client can fix all
    fields at once. Empty text, long text, out-of-range numbers, a bad
    sample interval or a departure without a time zone are reported.

    Español: Reúne todos los errores antes de lanzar la excepción, para que el
    cliente corrija todos los campos a la vez.

    Raises:
        ValidationFailed: With one code per invalid field.
    """
    errors = {}

    def text(field: str) -> str:
        """Read a required text field.

        English: Empty values give "required"; values over 200 characters give "too_long".

        Español: Un valor vacío da "required"; más de 200 caracteres da "too_long".
        """
        value = data.get(field)
        if not isinstance(value, str) or not value.strip():
            errors[field] = "required"
            return ""
        if len(value) > 200:
            errors[field] = "too_long"
            return ""
        return value.strip()

    def number(field: str, low: float, high: float, default: float | None = None) -> float | None:
        """Read a numeric field inside a range.

        English: Booleans are rejected even though Python treats them as ints.

        Español: Los booleanos se rechazan, aunque Python los trate como enteros.
        """
        value = data.get(field, default)
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not low <= value <= high:
            errors[field] = "number_range"
            return None
        return float(value)

    origin = text("origin")
    destination = text("destination")
    load_lb = number("load_lb", 1, MAX_LOAD_LB)
    tolerance = number("tolerance_miles", 0, MAX_TOLERANCE_MILES, DEFAULT_TOLERANCE_MILES)
    sample_every = number("sample_every_miles", 10, 50, 10.0)
    if sample_every is not None and sample_every not in ALLOWED_SAMPLE_MILES:
        errors["sample_every_miles"] = "sample_interval"

    departure = None
    raw_departure = data.get("departure")
    if isinstance(raw_departure, str):
        try:
            departure = datetime.fromisoformat(raw_departure)
        except ValueError:
            departure = None
    if departure is None or departure.tzinfo is None:
        errors["departure"] = "departure_format"

    if errors:
        raise ValidationFailed(errors)
    return TripRequest(
        origin=origin,
        destination=destination,
        departure=departure,
        load_lb=load_lb,
        tolerance_miles=tolerance,
        sample_every_miles=sample_every,
    )


def trip_inputs(trip: Trip) -> dict:
    """Return a trip's input fields in the format the API accepts.

    English: Used when a PATCH merges new values into the saved trip.

    Español: Se usa cuando un PATCH combina nuevos valores con el viaje guardado.
    """
    return {
        "origin": trip.origin,
        "destination": trip.destination,
        "departure": trip.departure_local().isoformat(),
        "load_lb": trip.load_lb,
        "tolerance_miles": trip.tolerance_miles,
        "sample_every_miles": trip.sample_every_miles,
    }


def trip_request_from(trip: Trip) -> TripRequest:
    """Build a TripRequest from a saved trip.

    English: Used by the departures endpoint.

    Español: Lo usa el endpoint de salidas.
    """
    return validate_trip(trip_inputs(trip))


def trip_summary(trip: Trip) -> dict:
    """Serialize a trip without its evaluation.

    English: Used by the list endpoint to keep responses small.

    Español: Lo usa el endpoint de lista para mantener las respuestas pequeñas.
    """
    return {
        "id": trip.pk,
        "origin": trip.origin,
        "destination": trip.destination,
        "departure": trip.departure_local().isoformat(),
        "load_lb": trip.load_lb,
        "tolerance_miles": trip.tolerance_miles,
        "sample_every_miles": trip.sample_every_miles,
        "recommended_route_id": trip.recommended_route_id,
        "created_at": trip.created_at.isoformat(),
        "updated_at": trip.updated_at.isoformat(),
    }


def trip_detail(trip: Trip) -> dict:
    """Serialize a trip with its latest evaluation.

    English: Adds the `result` field to the summary.

    Español: Añade el campo `result` al resumen.
    """
    return {**trip_summary(trip), "result": trip.result}


def _error(message: str, status: int, code: str, **extra) -> JsonResponse:
    """Build a JSON error response.

    English: Every error has an English `error` message and a `code`.

    Español: Cada error tiene un mensaje `error` en inglés y un `code`.
    """
    return JsonResponse({"error": message, "code": code, **extra}, status=status)


def _read_json_object(request: HttpRequest):
    """Parse the request body as a JSON object.

    English: Returns (payload, None), or (None, error response) on failure.

    Español: Devuelve (payload, None), o (None, respuesta de error) si falla.
    """
    try:
        payload = json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        return None, _error("Request body must be valid JSON.", 400, "invalid_json")
    if not isinstance(payload, dict):
        return None, _error("Request body must be a JSON object.", 400, "invalid_json")
    return payload, None


def _evaluate_into(trip: Trip, request: TripRequest) -> None:
    """Evaluate a trip and store the result on the model.

    English: Fields are assigned only after the evaluation succeeds, so a
    failed provider call leaves the saved trip unchanged.

    Español: Los campos solo se asignan después de que la evaluación tiene
    éxito, así una llamada fallida no cambia el viaje guardado.
    """
    geocoder, routing, weather = build_providers()
    result = evaluate_trip(request, geocoder=geocoder, routing=routing, weather=weather)
    trip.origin = request.origin
    trip.destination = request.destination
    trip.departure = request.departure
    trip.departure_offset_minutes = int(request.departure.utcoffset().total_seconds() // 60)
    trip.load_lb = request.load_lb
    trip.tolerance_miles = request.tolerance_miles
    trip.sample_every_miles = request.sample_every_miles
    trip.recommended_route_id = result["recommended_route_id"]
    trip.result = result
    trip.save()


def _invalid(exc: ValidationFailed) -> JsonResponse:
    """Build the 400 response for a validation failure.

    English: The response lists each invalid field under `fields`.

    Español: La respuesta lista cada campo inválido en `fields`.
    """
    return _error("Invalid data.", 400, "invalid_data", fields=exc.errors)


@require_http_methods(["GET", "POST"])
def trips(request: HttpRequest) -> JsonResponse:
    """List trips or create one.

    English: GET returns the latest 50 trips. POST validates the body,
    evaluates the trip and responds 201 with a Location header.

    Español: GET devuelve los últimos 50 viajes. POST valida el cuerpo,
    evalúa el viaje y responde 201 con la cabecera Location.
    """
    if request.method == "GET":
        items = Trip.objects.all()[:LIST_LIMIT]
        return JsonResponse({"results": [trip_summary(t) for t in items]})

    payload, error = _read_json_object(request)
    if error:
        return error
    try:
        trip_request = validate_trip(payload)
    except ValidationFailed as exc:
        return _invalid(exc)

    trip = Trip()
    try:
        _evaluate_into(trip, trip_request)
    except ProviderError as exc:
        return _error(str(exc), 502, exc.code)
    except ValueError as exc:
        return _error(str(exc), 400, "departure_timezone")

    response = JsonResponse(trip_detail(trip), status=201)
    response["Location"] = f"/api/trips/{trip.pk}/"
    return response


@require_http_methods(["GET", "PATCH", "DELETE"])
def trip_resource(request: HttpRequest, pk: int) -> JsonResponse:
    """Read, update or delete one trip.

    English: PATCH merges the body into the saved trip and evaluates it
    again. DELETE responds 204.

    Español: PATCH combina el cuerpo con el viaje guardado y lo vuelve a
    evaluar. DELETE responde 204.
    """
    trip = Trip.objects.filter(pk=pk).first()
    if trip is None:
        return _error("Trip not found.", 404, "trip_not_found")

    if request.method == "GET":
        return JsonResponse(trip_detail(trip))

    if request.method == "DELETE":
        trip.delete()
        return JsonResponse({}, status=204)

    payload, error = _read_json_object(request)
    if error:
        return error
    try:
        trip_request = validate_trip({**trip_inputs(trip), **payload})
    except ValidationFailed as exc:
        return _invalid(exc)

    try:
        _evaluate_into(trip, trip_request)
    except ProviderError as exc:
        return _error(str(exc), 502, exc.code)
    return JsonResponse(trip_detail(trip))


@require_http_methods(["GET"])
def trip_departures(request: HttpRequest, pk: int) -> JsonResponse:
    """Recommend a route for each departure hour of a saved trip.

    English: Query parameters window_hours (0 to 48) and step_hours (1 to 24).

    Español: Parámetros de consulta window_hours (0 a 48) y step_hours (1 a 24).
    """
    trip = Trip.objects.filter(pk=pk).first()
    if trip is None:
        return _error("Trip not found.", 404, "trip_not_found")

    try:
        window = int(request.GET.get("window_hours", MAX_DEPARTURE_WINDOW_HOURS))
        step = int(request.GET.get("step_hours", 2))
    except ValueError:
        return _error("window_hours and step_hours must be integers.", 400, "invalid_window")
    if not 0 <= window <= MAX_DEPARTURE_WINDOW_HOURS or not 1 <= step <= 24:
        return _error("window_hours must be 0 to 48 and step_hours 1 to 24.", 400, "invalid_window")

    geocoder, routing, weather = build_providers()
    try:
        result = departure_options(
            trip_request_from(trip),
            geocoder=geocoder,
            routing=routing,
            weather=weather,
            window_hours=window,
            step_hours=step,
        )
    except ProviderError as exc:
        return _error(str(exc), 502, exc.code)
    return JsonResponse({"trip_id": trip.pk, **result})


def health(request: HttpRequest) -> JsonResponse:
    """Report that the service is running.

    English: Used by monitoring and by the quick-start checks.

    Español: Lo usan la monitorización y las comprobaciones de inicio rápido.
    """
    return JsonResponse({"status": "ok"})
