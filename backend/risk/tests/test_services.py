"""Tests for the evaluation flow with fake providers.

English: Covers recommendation, blocking, warnings, caching, departures
and the hourly series, without any network access.

Español: Cubre la recomendación, los bloqueos, los avisos, la caché, las
salidas y la serie horaria, sin ningún acceso a la red.
"""

from datetime import datetime, timedelta

from django.core.cache import cache
from django.test import SimpleTestCase

from risk.providers import ProviderError
from risk.geo import sample_checkpoints
from risk.services import TripRequest, departure_options, evaluate_trip

from .fakes import NOW, FakeGeocoder, FakeRouting, FakeWeather

GEOCODER = FakeGeocoder({"Origen": (0.0, 0.0), "Destino": (1.0, 0.0)})


def trip(load_lb=20_000, departure=NOW, **overrides):
    """Build a TripRequest for the fixed test origin and destination.

    Español: Construye un TripRequest para el origen y destino de prueba fijos.
    """
    values = dict(origin="Origen", destination="Destino", departure=departure, load_lb=load_lb)
    values.update(overrides)
    return TripRequest(**values)


class EvaluateTripTests(SimpleTestCase):
    """Tests for evaluate_trip().

    Español: Pruebas de evaluate_trip().
    """

    def setUp(self):
        """Clear the cache so tests do not share forecasts.

        Español: Vacía la caché para que las pruebas no compartan pronósticos.
        """
        cache.clear()

    def run_trip(self, routing, weather, request=None, now=NOW):
        """Run evaluate_trip() with the fake geocoder and the given providers.

        Español: Ejecuta evaluate_trip() con el geocodificador falso y los proveedores dados.
        """
        return evaluate_trip(request or trip(), geocoder=GEOCODER, routing=routing, weather=weather, now=now)

    def test_recommends_the_route_with_fewer_severe_miles(self):
        """The route with fewer severe miles is recommended.

        Español: Se recomienda la ruta con menos millas severas.
        """
        # Ruta 1 en lon 0.0 con viento de 50 mph (severo); ruta 2 en lon 0.5 con 10 mph.
        weather = FakeWeather(lambda lon, lat, default: 50.0 if lon < 0.25 else default)
        result = self.run_trip(FakeRouting([0.0, 0.5]), weather)

        self.assertEqual(result["recommended_route_id"], "route-2")
        self.assertEqual(result["ranking"], ["route-2", "route-1"])
        route_1 = result["routes"][0]
        self.assertGreater(route_1["severe_miles"], 0)
        self.assertEqual(result["routes"][1]["severe_miles"], 0)

    def test_no_travel_route_is_excluded_from_the_ranking(self):
        """A route with No Travel is excluded from the ranking.

        Español: Una ruta con No viajar queda fuera del ranking.
        """
        # Con 35,000 lb, viento de 46 mph bloquea la ruta 1.
        weather = FakeWeather(lambda lon, lat, default: 46.0 if lon < 0.25 else default)
        result = self.run_trip(FakeRouting([0.0, 0.5]), weather, request=trip(load_lb=35_000))

        route_1 = result["routes"][0]
        self.assertFalse(route_1["eligible"])
        self.assertIn("no_travel", route_1["blocked_reasons"])
        self.assertEqual(result["ranking"], ["route-2"])

    def test_no_eligible_route_gives_no_recommendation_and_a_warning(self):
        """With no eligible route nothing is recommended and a warning is given.

        Español: Sin rutas elegibles no se recomienda nada y se emite un aviso.
        """
        weather = FakeWeather(lambda lon, lat, default: 60.0)
        result = self.run_trip(FakeRouting([0.0]), weather)

        self.assertIsNone(result["recommended_route_id"])
        self.assertEqual(result["ranking"], [])
        self.assertIn({"code": "no_safe_route"}, result["warnings"])

    def test_etas_beyond_48_hours_are_unknown_and_block_the_route(self):
        """Arrivals beyond 48 hours are unknown and block the route.

        Español: Las llegadas más allá de 48 horas son desconocidas y bloquean la ruta.
        """
        # Trayecto de 72 h: los checkpoints finales caen fuera del pronóstico.
        weather = FakeWeather(lambda lon, lat, default: 10.0)
        result = self.run_trip(FakeRouting([0.0], seconds=72 * 3600), weather)

        route = result["routes"][0]
        self.assertFalse(route["eligible"])
        self.assertIn("no_forecast", route["blocked_reasons"])
        levels = {cp["level"] for cp in route["checkpoints"]}
        self.assertIn("unknown", levels)

    def test_warns_when_the_provider_returns_fewer_alternatives(self):
        """Fewer than three alternatives produce a warning.

        Español: Menos de tres alternativas producen un aviso.
        """
        weather = FakeWeather(lambda lon, lat, default: 10.0)
        result = self.run_trip(FakeRouting([0.0]), weather)

        self.assertIn("fewer_alternatives", [w["code"] for w in result["warnings"]])

    def test_departure_without_timezone_is_rejected(self):
        """A departure without a time zone raises ValueError.

        Español: Una salida sin zona horaria lanza ValueError.
        """
        naive = NOW.replace(tzinfo=None)
        with self.assertRaises(ValueError):
            self.run_trip(FakeRouting([0.0]), FakeWeather(lambda *a: 10.0), request=trip(departure=naive))

    def test_forecasts_are_cached_between_calls(self):
        """A second evaluation reuses the cached forecasts.

        Español: Una segunda evaluación reutiliza los pronósticos en caché.
        """
        weather = FakeWeather(lambda lon, lat, default: 10.0)
        self.run_trip(FakeRouting([0.0, 0.5]), weather)
        first_call_count = weather.calls

        self.run_trip(FakeRouting([0.0, 0.5]), weather)
        self.assertGreater(first_call_count, 0)
        self.assertEqual(weather.calls, first_call_count)

    def test_routes_come_back_with_checkpoints_every_ten_miles(self):
        """Routes come back with checkpoints every ten miles.

        Español: Las rutas llegan con checkpoints cada diez millas.
        """
        weather = FakeWeather(lambda lon, lat, default: 10.0)
        result = self.run_trip(FakeRouting([0.0]), weather)

        checkpoints = result["routes"][0]["checkpoints"]
        self.assertEqual([round(cp["mile"]) for cp in checkpoints][:3], [0, 10, 20])
        self.assertEqual(checkpoints[0]["driver"], "wind")

    def test_no_routes_is_a_provider_error(self):
        """No routes at all raises ProviderError.

        Español: Ninguna ruta lanza ProviderError.
        """
        with self.assertRaises(ProviderError):
            self.run_trip(FakeRouting([]), FakeWeather(lambda *a: 10.0))

    def test_eta_is_proportional_to_distance(self):
        """Arrival times grow in proportion to the distance travelled.

        Español: Las horas de llegada crecen en proporción a la distancia recorrida.
        """
        weather = FakeWeather(lambda lon, lat, default: 10.0)
        result = self.run_trip(FakeRouting([0.0], seconds=3600), weather)
        route = result["routes"][0]
        checkpoint = route["checkpoints"][3]

        expected = NOW + timedelta(seconds=3600 * checkpoint["mile"] / route["distance_miles"])
        actual = datetime.fromisoformat(checkpoint["eta"])
        self.assertLess(abs((actual - expected).total_seconds()), 60)


class HourlyAndDeparturesTests(SimpleTestCase):
    """Tests for the hourly series and the departure options.

    Español: Pruebas de la serie horaria y de las opciones de salida.
    """

    def setUp(self):
        """Clear the cache so tests do not share forecasts.

        Español: Vacía la caché para que las pruebas no compartan pronósticos.
        """
        cache.clear()

    def test_hourly_series_has_one_code_per_hour_of_the_slider(self):
        """The hourly series has 49 codes, one per hour.

        Español: La serie horaria tiene 49 códigos, uno por hora.
        """
        weather = FakeWeather(lambda lon, lat, default: 10.0)
        result = evaluate_trip(trip(), geocoder=GEOCODER, routing=FakeRouting([0.0]), weather=weather, now=NOW)

        checkpoint = result["routes"][0]["checkpoints"][0]
        self.assertEqual(len(checkpoint["hourly"]), 49)
        self.assertEqual(set(checkpoint["hourly"]), {"0"})  # viento de 10 mph en todo el pronóstico
        self.assertEqual(result["hours"], 49)

    def test_hourly_series_reflects_the_forecast_hour_by_hour(self):
        """Each hourly code reflects the forecast of its own hour.

        Español: Cada código horario refleja el pronóstico de su propia hora.
        """
        # Viento de 50 mph (severo) las primeras 10 horas y calmo después.
        weather = FakeWeather(lambda lon, lat, default: (lambda h: 50.0 if h < 10 else 10.0))
        result = evaluate_trip(trip(), geocoder=GEOCODER, routing=FakeRouting([0.0]), weather=weather, now=NOW)
        codes = result["routes"][0]["checkpoints"][0]["hourly"]
        self.assertEqual(codes[0], "3")
        self.assertEqual(codes[9], "3")
        self.assertEqual(codes[10], "0")

    def test_departures_return_one_column_per_step(self):
        """The departure options have one column per step.

        Español: Las opciones de salida tienen una columna por paso.
        """
        weather = FakeWeather(lambda lon, lat, default: 10.0)
        result = departure_options(
            trip(), geocoder=GEOCODER, routing=FakeRouting([0.0]), weather=weather, now=NOW,
            window_hours=48, step_hours=2,
        )
        self.assertEqual(len(result["columns"]), 25)
        self.assertEqual(result["columns"][0]["departure"], NOW.isoformat())
        self.assertEqual(result["earliest_clean_departure"], NOW.isoformat())

    def test_earliest_clean_departure_waits_until_the_storm_passes(self):
        """The earliest clean departure is after the storm.

        Español: La primera salida segura es posterior a la tormenta.
        """
        # Viento de 60 mph (No viajar) durante 12 horas y calmo después.
        weather = FakeWeather(lambda lon, lat, default: (lambda h: 60.0 if h < 12 else 10.0))
        result = departure_options(
            trip(load_lb=20000), geocoder=GEOCODER, routing=FakeRouting([0.0]), weather=weather, now=NOW,
            window_hours=24, step_hours=2,
        )
        clean = [c["departure"] for c in result["columns"] if c["recommended_route_id"]]
        self.assertEqual(clean[0], (NOW + timedelta(hours=12)).isoformat())
        self.assertEqual(result["earliest_clean_departure"], (NOW + timedelta(hours=12)).isoformat())

    def test_route_levels_string_matches_the_checkpoint_count(self):
        """The levels string has one digit per checkpoint.

        Español: La cadena de niveles tiene un dígito por checkpoint.
        """
        weather = FakeWeather(lambda lon, lat, default: 10.0)
        result = departure_options(
            trip(), geocoder=GEOCODER, routing=FakeRouting([0.0]), weather=weather, now=NOW,
            window_hours=0, step_hours=1,
        )
        levels = result["columns"][0]["routes"]["route-1"]["levels"]
        self.assertEqual(len(levels), len(sample_checkpoints([(0.0, 0.0), (1.0, 0.0)], 10)))

    def test_routing_is_requested_once_across_departures(self):
        """Routes are requested once, not once per departure.

        Español: Las rutas se piden una vez, no una vez por salida.
        """
        routing = FakeRouting([0.0])
        calls = {"n": 0}
        original = routing.alternatives

        def counting(*args, **kwargs):
            """Wrapper that counts calls to the routing double.

            Español: Envoltorio que cuenta las llamadas al doble de rutas.
            """
            calls["n"] += 1
            return original(*args, **kwargs)

        routing.alternatives = counting
        departure_options(
            trip(), geocoder=GEOCODER, routing=routing, weather=FakeWeather(lambda *a: 10.0), now=NOW,
            window_hours=8, step_hours=2,
        )
        self.assertEqual(calls["n"], 1)
