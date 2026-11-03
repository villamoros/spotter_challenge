"""Tests for the external-service adapters.

English: Every HTTP call goes through a mocked session, so the tests check
request shapes, response parsing, unit conversion and error mapping.

Español: Cada llamada HTTP pasa por una sesión simulada, así las pruebas
revisan la forma de las peticiones, el análisis de las respuestas, la
conversión de unidades y la traducción de errores.
"""

from datetime import datetime, timezone
from unittest.mock import Mock

import requests
from django.test import SimpleTestCase

from risk.providers import (
    FORECAST_BATCH_SIZE,
    Forecast,
    Geocoder,
    ProviderError,
    RoutingProvider,
    WeatherProvider,
)


def response(payload=None, status_ok=True):
    """Build a mocked HTTP response.

    Español: Construye una respuesta HTTP simulada.
    """
    mock = Mock()
    mock.json.return_value = payload
    if status_ok:
        mock.raise_for_status.return_value = None
    else:
        mock.raise_for_status.side_effect = requests.HTTPError("500")
    return mock


class GeocoderTests(SimpleTestCase):
    """Tests for the Nominatim geocoder.

    Español: Pruebas del geocodificador de Nominatim.
    """

    def test_coordinates_are_parsed_without_a_network_call(self):
        """Coordinate strings are parsed without any request.

        Español: Las cadenas de coordenadas se leen sin ninguna petición.
        """
        session = Mock()
        geocoder = Geocoder(session=session)
        self.assertEqual(geocoder.geocode("40.7128, -74.0060"), (40.7128, -74.006))
        session.get.assert_not_called()

    def test_place_names_use_nominatim_with_a_user_agent(self):
        """Place names are looked up with the configured User-Agent.

        Español: Los nombres de lugar se buscan con el User-Agent configurado.
        """
        session = Mock()
        session.get.return_value = response([{"lat": "41.5", "lon": "-93.6"}])
        geocoder = Geocoder(session=session, user_agent="test-agent")

        self.assertEqual(geocoder.geocode("Des Moines"), (41.5, -93.6))
        _, kwargs = session.get.call_args
        self.assertEqual(kwargs["headers"]["User-Agent"], "test-agent")

    def test_unknown_place_is_a_provider_error(self):
        """An empty Nominatim result raises ProviderError.

        Español: Un resultado vacío de Nominatim lanza ProviderError.
        """
        session = Mock()
        session.get.return_value = response([])
        with self.assertRaises(ProviderError):
            Geocoder(session=session).geocode("Nowhere")

    def test_http_failure_is_a_provider_error(self):
        """An HTTP failure raises ProviderError.

        Español: Un fallo HTTP lanza ProviderError.
        """
        session = Mock()
        session.get.return_value = response(status_ok=False)
        with self.assertRaises(ProviderError):
            Geocoder(session=session).geocode("Des Moines")


def route_payload(points, meters=1000.0, seconds=60.0):
    """Build an OpenRouteService-style response with one route.

    Español: Construye una respuesta con una ruta en el estilo de OpenRouteService.
    """
    return {
        "features": [
            {
                "geometry": {"coordinates": [[lon, lat] for lat, lon in points]},
                "properties": {"summary": {"distance": meters, "duration": seconds}},
            }
        ]
    }


class RoutingProviderTests(SimpleTestCase):
    """Tests for the OpenRouteService adapter.

    Español: Pruebas del adaptador de OpenRouteService.
    """

    ORIGIN = (41.5, -93.6)
    DESTINATION = (42.0, -94.0)

    def test_direct_route_is_parsed_with_coordinates_in_lat_lon_order(self):
        """The direct route is parsed and coordinates are sent as lon,lat.

        Español: La ruta directa se analiza y las coordenadas se envían como lon,lat.
        """
        session = Mock()
        session.post.return_value = response(route_payload([self.ORIGIN, (41.75, -93.8), self.DESTINATION]))
        routes = RoutingProvider(api_key="k", session=session).alternatives(self.ORIGIN, self.DESTINATION, count=1)

        self.assertEqual(len(routes), 1)
        self.assertEqual(routes[0].line[0], self.ORIGIN)
        self.assertEqual(routes[0].meters, 1000.0)
        self.assertEqual(session.post.call_args.kwargs["headers"]["Authorization"], "k")
        self.assertEqual(session.post.call_args.kwargs["json"]["coordinates"][0], [-93.6, 41.5])
        self.assertEqual(session.post.call_args.kwargs["json"]["radiuses"], [-1, -1])

    def test_long_trips_add_two_detours_through_intermediate_points(self):
        """Long trips request the direct route and two detours.

        Español: Los viajes largos piden la ruta directa y dos desvíos.
        """
        session = Mock()
        session.post.side_effect = [
            response(route_payload([self.ORIGIN, self.DESTINATION], meters=900_000.0)),
            response(route_payload([self.ORIGIN, self.DESTINATION], meters=950_000.0)),
            response(route_payload([self.ORIGIN, self.DESTINATION], meters=980_000.0)),
        ]
        routes = RoutingProvider(api_key="k", session=session).alternatives(self.ORIGIN, self.DESTINATION)

        self.assertEqual(len(routes), 3)
        self.assertEqual(session.post.call_count, 3)
        first_body = session.post.call_args_list[0].kwargs["json"]["coordinates"]
        detour_body = session.post.call_args_list[1].kwargs["json"]["coordinates"]
        self.assertEqual(len(first_body), 2)
        self.assertEqual(len(detour_body), 3)

    def test_a_failed_detour_is_skipped_instead_of_failing_the_trip(self):
        """A failed detour is skipped and the other routes are kept.

        Español: Un desvío fallido se omite y se conservan las demás rutas.
        """
        session = Mock()
        failed = response(status_ok=False)
        session.post.side_effect = [
            response(route_payload([self.ORIGIN, self.DESTINATION], meters=900_000.0)),
            failed,
            response(route_payload([self.ORIGIN, self.DESTINATION], meters=980_000.0)),
        ]
        routes = RoutingProvider(api_key="k", session=session).alternatives(self.ORIGIN, self.DESTINATION)
        self.assertEqual(len(routes), 2)

    def test_a_failed_direct_route_is_a_provider_error(self):
        """A failed direct route raises ProviderError.

        Español: Una ruta directa fallida lanza ProviderError.
        """
        session = Mock()
        session.post.return_value = response(status_ok=False)
        with self.assertRaises(ProviderError):
            RoutingProvider(api_key="k", session=session).alternatives(self.ORIGIN, self.DESTINATION)

    def test_malformed_payload_is_a_provider_error(self):
        """A response without a route raises ProviderError.

        Español: Una respuesta sin ruta lanza ProviderError.
        """
        session = Mock()
        session.post.return_value = response({"unexpected": True})
        with self.assertRaises(ProviderError):
            RoutingProvider(api_key="k", session=session).alternatives((0, 0), (1, 1), count=1)


class WeatherProviderTests(SimpleTestCase):
    """Tests for the Open-Meteo adapter.

    Español: Pruebas del adaptador de Open-Meteo.
    """

    def test_units_are_converted_from_metric_to_inches(self):
        """Rain (mm) and snow (cm) are converted to inches.

        Español: La lluvia (mm) y la nieve (cm) se convierten a pulgadas.
        """
        item = {
            "hourly": {
                "time": ["2026-11-02T12:00"],
                "wind_speed_10m": [30.0],
                "rain": [2.54],
                "snowfall": [2.54],
            }
        }
        forecast = WeatherProvider._to_forecast(item)
        self.assertAlmostEqual(forecast.rain_in_h[0], 0.1, places=4)
        self.assertAlmostEqual(forecast.snow_in_h[0], 1.0, places=4)
        self.assertEqual(forecast.wind_mph, (30.0,))
        self.assertEqual(forecast.times[0].tzinfo, timezone.utc)

    def test_null_values_count_as_zero(self):
        """Null hourly values are read as zero.

        Español: Los valores horarios nulos se leen como cero.
        """
        item = {"hourly": {"time": ["2026-11-02T12:00"], "wind_speed_10m": [None], "rain": [None], "snowfall": [None]}}
        forecast = WeatherProvider._to_forecast(item)
        self.assertEqual(forecast.wind_mph, (0.0,))

    def test_large_requests_are_split_into_batches(self):
        """Many points are sent in batches of FORECAST_BATCH_SIZE.

        Español: Muchos puntos se envían en lotes de FORECAST_BATCH_SIZE.
        """
        points = [(40.0 + i / 1000, -90.0) for i in range(FORECAST_BATCH_SIZE * 2 + 5)]

        def fake_get(url, params, timeout):
            """Fake HTTP call that answers with one item per requested coordinate.

            Español: Llamada HTTP falsa que responde con un elemento por coordenada pedida.
            """
            count = len(params["latitude"].split(","))
            body = [self._item() for _ in range(count)]
            return response(body)

        session = Mock()
        session.get.side_effect = fake_get
        forecasts = WeatherProvider(session=session).forecasts(points)

        self.assertEqual(session.get.call_count, 3)
        self.assertEqual(len(forecasts), len(points))

    def test_single_point_response_is_an_object(self):
        """A single point gets an object response, not a list.

        Español: Un solo punto recibe una respuesta en forma de objeto, no de lista.
        """
        session = Mock()
        session.get.return_value = response(self._item())
        forecasts = WeatherProvider(session=session).forecasts([(40.0, -90.0)])
        self.assertEqual(len(forecasts), 1)

    def test_missing_points_in_the_response_is_a_provider_error(self):
        """A response with fewer points than requested raises ProviderError.

        Español: Una respuesta con menos puntos de los pedidos lanza ProviderError.
        """
        session = Mock()
        session.get.return_value = response([self._item()])
        with self.assertRaises(ProviderError):
            WeatherProvider(session=session).forecasts([(40.0, -90.0), (41.0, -91.0)])

    @staticmethod
    def _item():
        """Build a one-hour Open-Meteo item with calm weather.

        Español: Construye un elemento horario de Open-Meteo con clima calmo.
        """
        return {"hourly": {"time": ["2026-11-02T12:00"], "wind_speed_10m": [5.0], "rain": [0.0], "snowfall": [0.0]}}


class ForecastLookupTests(SimpleTestCase):
    """Tests for looking up a forecast by moment.

    Español: Pruebas de la búsqueda de un pronóstico por momento.
    """

    def setUp(self):
        """Build a three-hour forecast.

        Español: Construye un pronóstico de tres horas.
        """
        start = datetime(2026, 11, 2, 12, tzinfo=timezone.utc)
        self.forecast = Forecast(
            times=tuple(datetime(2026, 11, 2, 12 + h, tzinfo=timezone.utc) for h in range(3)),
            wind_mph=(10.0, 20.0, 30.0),
            rain_in_h=(0.0, 0.1, 0.2),
            snow_in_h=(0.0, 0.0, 0.0),
        )
        self.start = start

    def test_returns_the_values_of_the_hour_containing_the_moment(self):
        """A moment inside an hour returns that hour's values.

        Español: Un momento dentro de una hora devuelve los valores de esa hora.
        """
        self.assertEqual(self.forecast.at(datetime(2026, 11, 2, 13, 40, tzinfo=timezone.utc)), (20.0, 0.1, 0.0))

    def test_moments_outside_the_series_have_no_values(self):
        """Moments before or after the series return None.

        Español: Los momentos antes o después de la serie devuelven None.
        """
        self.assertIsNone(self.forecast.at(datetime(2026, 11, 2, 11, 59, tzinfo=timezone.utc)))
        self.assertIsNone(self.forecast.at(datetime(2026, 11, 2, 16, 0, tzinfo=timezone.utc)))
