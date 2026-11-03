"""Tests for the synthetic demo providers.

English: Checks the demo catalog, the three demo routes and the storm model.

Español: Comprueba el catálogo de demostración, las tres rutas de demo y el modelo de tormenta.
"""

from django.test import SimpleTestCase

from risk.demo import CITIES, DemoGeocoder, DemoRouting, DemoWeather
from risk.providers import ProviderError


class DemoProvidersTests(SimpleTestCase):
    """Tests for the demo geocoder, routing and weather.

    Español: Pruebas del geocodificador, las rutas y el clima de demostración.
    """

    def test_geocoder_knows_the_catalog_and_accepts_coordinates(self):
        """Catalog cities and raw coordinates resolve to points.

        Español: Las ciudades del catálogo y las coordenadas directas se resuelven a puntos.
        """
        geocoder = DemoGeocoder()
        self.assertEqual(geocoder.geocode("Dallas, TX"), CITIES["dallas, tx"])
        self.assertEqual(geocoder.geocode("35.0, -100.0"), (35.0, -100.0))

    def test_unknown_city_is_a_provider_error(self):
        """An unknown city raises ProviderError.

        Español: Una ciudad desconocida lanza ProviderError.
        """
        with self.assertRaises(ProviderError):
            DemoGeocoder().geocode("Atlantis")

    def test_routing_returns_three_distinct_routes_between_the_same_ends(self):
        """Demo routing returns three different routes between the same two points.

        Español: El enrutado de demo devuelve tres rutas distintas entre los mismos dos puntos.
        """
        options = DemoRouting().alternatives(CITIES["dallas, tx"], CITIES["denver, co"], count=3)
        self.assertEqual(len(options), 3)
        self.assertEqual(options[0].line[0], CITIES["dallas, tx"])
        self.assertNotEqual(options[0].line[len(options[0].line) // 2], options[1].line[len(options[1].line) // 2])
        self.assertTrue(all(o.meters > 0 and o.seconds > 0 for o in options))

    def test_weather_storm_is_strongest_on_its_path(self):
        """The storm is stronger on its path than away from it, with 72 hours of data.

        Español: La tormenta es más fuerte en su trayectoria que lejos de ella, con 72 horas de datos.
        """
        weather = DemoWeather()
        storm_point = (37.0, -104.0)
        calm_point = (30.0, -80.0)
        storm, calm = weather.forecasts([storm_point, calm_point])
        self.assertGreater(max(storm.wind_mph), max(calm.wind_mph))
        self.assertEqual(len(storm.times), 72)
