"""Tests for the REST API.

English: Uses Django's test client with patched providers. Covers the
trip endpoints, validation, error codes, departures and CORS.

Español: Usa el cliente de pruebas de Django con proveedores simulados.
Cubre los endpoints de viajes, la validación, los códigos de error, las
salidas y CORS.
"""

import json
from datetime import datetime, timezone
from unittest.mock import patch

from django.core.cache import cache
from django.test import SimpleTestCase, TestCase, override_settings
from django.urls import reverse

from risk.models import Trip
from risk.providers import ProviderError

from .fakes import NOW, FakeGeocoder, FakeRouting, FakeWeather

VALID = {
    "origin": "Origen",
    "destination": "Destino",
    "departure": "2026-11-02T12:00:00+00:00",
    "load_lb": 20000,
}


def fake_providers(start=NOW):
    """Return fake geocoder, routing and weather providers for the views.

    Español: Devuelve los proveedores falsos de geocodificación, rutas y clima para las vistas.
    """
    return (
        FakeGeocoder({"Origen": (0.0, 0.0), "Destino": (1.0, 0.0)}),
        FakeRouting([0.0, 0.5]),
        FakeWeather(lambda lon, lat, default: 10.0, start=start),
    )


def live_departure():
    """Return the current UTC time, rounded to the second.

    English: Forecast fakes start at this moment, so the 48-hour window covers the trip.

    Español: Los pronósticos falsos empiezan en este momento, así la ventana de 48 horas cubre el viaje.
    """
    return datetime.now(timezone.utc).replace(microsecond=0)


@override_settings(ORS_API_KEY="test-key")
class TripsApiTests(TestCase):
    """Tests for the trip endpoints.

    Español: Pruebas de los endpoints de viajes.
    """

    def setUp(self):
        """Clear the cache so tests do not share forecasts.

        Español: Vacía la caché para que las pruebas no compartan pronósticos.
        """
        cache.clear()

    def post_json(self, path, payload, method="post"):
        """Send a JSON body with the given HTTP method.

        Español: Envía un cuerpo JSON con el método HTTP indicado.
        """
        body = payload if isinstance(payload, str) else json.dumps(payload)
        return getattr(self.client, method)(path, data=body, content_type="application/json")

    def create_trip(self, **overrides):
        """Create a trip through the API and return its JSON.

        Español: Crea un viaje mediante la API y devuelve su JSON.
        """
        now = live_departure()
        with patch("risk.views.build_providers", return_value=fake_providers(start=now)):
            response = self.post_json("/api/trips/", {**VALID, "departure": now.isoformat(), **overrides})
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    # --- colección ---

    def test_health_endpoint(self):
        """The health endpoint reports ok.

        Español: El endpoint de salud informa ok.
        """
        self.assertEqual(self.client.get("/api/health/").json(), {"status": "ok"})

    def test_create_returns_201_with_location_and_evaluation(self):
        """Creating a trip returns 201, a Location header and the evaluation.

        Español: Crear un viaje devuelve 201, una cabecera Location y la evaluación.
        """
        now = live_departure()
        with patch("risk.views.build_providers", return_value=fake_providers(start=now)):
            response = self.post_json("/api/trips/", {**VALID, "departure": now.isoformat()})

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertTrue(response["Location"].endswith(f"/api/trips/{body['id']}/"))
        self.assertEqual(body["recommended_route_id"], "route-1")
        self.assertEqual(len(body["result"]["routes"]), 2)

    def test_list_returns_saved_trips_newest_first(self):
        """The list shows the newest trips first, without full results.

        Español: La lista muestra primero los viajes más nuevos, sin resultados completos.
        """
        first = self.create_trip()
        second = self.create_trip(load_lb=30000)

        results = self.client.get("/api/trips/").json()["results"]
        self.assertEqual([t["id"] for t in results], [second["id"], first["id"]])
        self.assertNotIn("result", results[0])

    def test_validation_errors_list_each_field(self):
        """Invalid input reports an error code for every bad field.

        Español: Una entrada inválida informa un código de error por cada campo incorrecto.
        """
        response = self.post_json("/api/trips/", {"origin": "", "load_lb": "veinte"})
        body = response.json()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(body["error"], "Invalid data.")
        for field in ("origin", "destination", "load_lb", "departure"):
            self.assertIn(field, body["fields"])

    def test_departure_keeps_the_origin_wall_clock_offset(self):
        """The departure keeps the origin's offset when it is returned.

        Español: La salida conserva el desfase del origen al devolverla.
        """
        trip = self.create_trip(departure="2026-11-03T06:00:00-06:00")
        self.assertTrue(trip["departure"].endswith("-06:00"))
        self.assertTrue(trip["departure"].startswith("2026-11-03T06:00:00"))
        self.assertEqual(self.client.get(f"/api/trips/{trip['id']}/").json()["departure"], trip["departure"])

    def test_departure_without_timezone_is_a_400(self):
        """A departure without a time zone is a 400 error.

        Español: Una salida sin zona horaria es un error 400.
        """
        response = self.post_json("/api/trips/", {**VALID, "departure": "2026-11-02T12:00:00"})
        self.assertIn("departure", response.json()["fields"])

    def test_sample_interval_must_be_10_25_or_50(self):
        """Only 10, 25 or 50 miles are accepted as sample interval.

        Español: Solo se aceptan 10, 25 o 50 millas como intervalo de muestreo.
        """
        response = self.post_json("/api/trips/", {**VALID, "sample_every_miles": 15})
        self.assertIn("sample_every_miles", response.json()["fields"])

    def test_booleans_are_not_numbers(self):
        """A boolean is rejected where a number is expected.

        Español: Un booleano se rechaza donde se espera un número.
        """
        response = self.post_json("/api/trips/", {**VALID, "load_lb": True})
        self.assertIn("load_lb", response.json()["fields"])

    def test_invalid_json_is_a_400(self):
        """A malformed body is a 400 error.

        Español: Un cuerpo malformado es un error 400.
        """
        response = self.post_json("/api/trips/", "{no es json")
        self.assertEqual(response.status_code, 400)

    def test_provider_failure_is_a_502_and_saves_nothing(self):
        """A provider failure is a 502 and nothing is saved.

        Español: Un fallo del proveedor es un 502 y no se guarda nada.
        """
        with patch("risk.views.build_providers", side_effect=ProviderError("clima caído")):
            response = self.post_json("/api/trips/", VALID)
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["error"], "clima caído")
        self.assertEqual(Trip.objects.count(), 0)

    def test_missing_api_key_is_a_502(self):
        """A missing ORS key is reported as a 502 mentioning the setting.

        Español: Una clave de ORS ausente se informa como 502 y menciona la configuración.
        """
        with override_settings(ORS_API_KEY=""):
            response = self.post_json("/api/trips/", VALID)
        self.assertEqual(response.status_code, 502)
        self.assertIn("ORS_API_KEY", response.json()["error"])

    # --- recurso ---

    def test_detail_returns_the_stored_result(self):
        """The detail endpoint returns the stored evaluation.

        Español: El endpoint de detalle devuelve la evaluación guardada.
        """
        trip = self.create_trip()
        body = self.client.get(f"/api/trips/{trip['id']}/").json()
        self.assertEqual(body["result"]["recommended_route_id"], trip["result"]["recommended_route_id"])
        self.assertEqual(body["load_lb"], 20000)

    def test_unknown_trip_is_a_404_json(self):
        """An unknown trip is a 404 with a JSON error.

        Español: Un viaje desconocido es un 404 con un error en JSON.
        """
        response = self.client.get("/api/trips/9999/")
        self.assertEqual(response.status_code, 404)
        self.assertIn("error", response.json())

    def test_patch_reevaluates_with_the_new_load(self):
        """PATCH with a new load re-evaluates and saves the load.

        Español: PATCH con una carga nueva vuelve a evaluar y guarda la carga.
        """
        trip = self.create_trip(load_lb=20000)
        now = live_departure()
        with patch("risk.views.build_providers", return_value=fake_providers(start=now)):
            response = self.post_json(f"/api/trips/{trip['id']}/", {"load_lb": 41000}, method="patch")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["load_lb"], 41000)
        self.assertEqual(Trip.objects.get(pk=trip["id"]).load_lb, 41000)

    def test_patch_with_provider_failure_keeps_the_old_result(self):
        """A failed PATCH keeps the previous trip unchanged.

        Español: Un PATCH fallido deja el viaje anterior sin cambios.
        """
        trip = self.create_trip()
        with patch("risk.views.build_providers", side_effect=ProviderError("caído")):
            response = self.post_json(f"/api/trips/{trip['id']}/", {"load_lb": 1000}, method="patch")

        self.assertEqual(response.status_code, 502)
        self.assertEqual(Trip.objects.get(pk=trip["id"]).load_lb, 20000)

    def test_patch_validates_the_merged_payload(self):
        """PATCH validates the merged trip, not only the sent fields.

        Español: PATCH valida el viaje combinado, no solo los campos enviados.
        """
        trip = self.create_trip()
        response = self.post_json(f"/api/trips/{trip['id']}/", {"destination": ""}, method="patch")
        self.assertIn("destination", response.json()["fields"])

    def test_delete_removes_the_trip(self):
        """DELETE removes the trip and later reads return 404.

        Español: DELETE elimina el viaje y las lecturas posteriores devuelven 404.
        """
        trip = self.create_trip()
        self.assertEqual(self.client.delete(f"/api/trips/{trip['id']}/").status_code, 204)
        self.assertEqual(self.client.get(f"/api/trips/{trip['id']}/").status_code, 404)

    def test_methods_not_in_the_contract_are_405(self):
        """Methods outside the contract return 405.

        Español: Los métodos fuera del contrato devuelven 405.
        """
        trip = self.create_trip()
        self.assertEqual(self.client.put(f"/api/trips/{trip['id']}/").status_code, 405)
        self.assertEqual(self.client.post(f"/api/trips/{trip['id']}/").status_code, 405)

    # --- salidas ---

    def test_departures_returns_one_column_per_step(self):
        """The departures endpoint returns one column per step.

        Español: El endpoint de salidas devuelve una columna por paso.
        """
        trip = self.create_trip()
        now = live_departure()
        with patch("risk.views.build_providers", return_value=fake_providers(start=now)):
            response = self.client.get(f"/api/trips/{trip['id']}/departures/?window_hours=48&step_hours=2")

        body = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(body["columns"]), 25)
        self.assertEqual(body["level_codes"]["unknown"], "5")
        self.assertIn("route-1", body["columns"][0]["routes"])

    def test_departures_rejects_out_of_range_parameters(self):
        """Out-of-range window or step parameters are rejected.

        Español: Los parámetros de ventana o paso fuera de rango se rechazan.
        """
        trip = self.create_trip()
        response = self.client.get(f"/api/trips/{trip['id']}/departures/?window_hours=200")
        self.assertEqual(response.status_code, 400)
        response = self.client.get(f"/api/trips/{trip['id']}/departures/?step_hours=abc")
        self.assertEqual(response.status_code, 400)

    def test_departures_for_unknown_trip_is_a_404(self):
        """Departures for an unknown trip return 404.

        Español: Las salidas de un viaje desconocido devuelven 404.
        """
        self.assertEqual(self.client.get("/api/trips/9999/departures/").status_code, 404)


class CorsTests(SimpleTestCase):
    """Tests for the CORS middleware.

    Español: Pruebas del middleware de CORS.
    """

    @override_settings(CORS_ALLOWED_ORIGINS=["http://localhost:5173"])
    def test_allowed_origin_gets_cors_headers(self):
        """An allowed origin receives the CORS header.

        Español: Un origen permitido recibe la cabecera CORS.
        """
        response = self.client.get("/api/health/", HTTP_ORIGIN="http://localhost:5173")
        self.assertEqual(response["Access-Control-Allow-Origin"], "http://localhost:5173")

    @override_settings(CORS_ALLOWED_ORIGINS=["http://localhost:5173"])
    def test_other_origins_get_no_cors_headers(self):
        """Other origins receive no CORS header.

        Español: Otros orígenes no reciben cabecera CORS.
        """
        response = self.client.get("/api/health/", HTTP_ORIGIN="https://malicioso.example")
        self.assertNotIn("Access-Control-Allow-Origin", response)

    @override_settings(CORS_ALLOWED_ORIGINS=["http://localhost:5173"])
    def test_preflight_is_answered_with_204(self):
        """A preflight request is answered with 204 and the allowed methods.

        Español: Una petición preflight se responde con 204 y los métodos permitidos.
        """
        response = self.client.options(
            "/api/trips/", HTTP_ORIGIN="http://localhost:5173", HTTP_ACCESS_CONTROL_REQUEST_METHOD="PATCH"
        )
        self.assertEqual(response.status_code, 204)
        self.assertIn("PATCH", response["Access-Control-Allow-Methods"])
