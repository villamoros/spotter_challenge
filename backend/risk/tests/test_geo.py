"""Tests for distances, checkpoint sampling and detour points.

English: Uses a straight meridian of one degree, whose length is known.

Español: Usa un meridiano recto de un grado, cuya longitud se conoce.
"""

from django.test import SimpleTestCase

from risk.geo import detour_points, haversine_m, sample_checkpoints


class GeoTests(SimpleTestCase):
    """Tests for distance and sampling.

    Español: Pruebas de distancia y muestreo.
    """

    def test_haversine_one_degree_of_latitude_is_about_111_km(self):
        """One degree of latitude is about 111 km.

        Español: Un grado de latitud equivale a unos 111 km.
        """
        self.assertAlmostEqual(haversine_m(0, 0, 1, 0) / 1000, 111.2, delta=0.2)

    def test_samples_every_ten_miles_along_a_straight_line(self):
        """Checkpoints are placed every ten miles along a straight line.

        Español: Los checkpoints se colocan cada diez millas a lo largo de una línea recta.
        """
        # Meridiano de 1 grado: unas 69 millas.
        line = [(0.0, 0.0), (1.0, 0.0)]
        checkpoints = sample_checkpoints(line, every_miles=10)
        self.assertEqual([round(cp.mile) for cp in checkpoints], [0, 10, 20, 30, 40, 50, 60])
        self.assertAlmostEqual(checkpoints[1].lat, 10 * 1609.344 / 111_195, places=2)

    def test_checkpoints_never_reach_the_destination(self):
        """No checkpoint is placed at or beyond the destination.

        Español: Ningún checkpoint se coloca en el destino ni más allá.
        """
        line = [(0.0, 0.0), (0.0, 0.5)]
        checkpoints = sample_checkpoints(line, every_miles=25)
        total_miles = haversine_m(0, 0, 0, 0.5) / 1609.344
        self.assertTrue(all(cp.mile < total_miles for cp in checkpoints))

    def test_rejects_non_positive_interval(self):
        """A zero or negative interval raises ValueError.

        Español: Un intervalo cero o negativo lanza ValueError.
        """
        with self.assertRaises(ValueError):
            sample_checkpoints([(0, 0), (1, 0)], every_miles=0)


class DetourTests(SimpleTestCase):
    """Tests for the detour points.

    Español: Pruebas de los puntos de desvío.
    """

    def test_detours_sit_on_opposite_sides_of_the_midpoint(self):
        """The two detours lie on opposite sides of the midpoint.

        Español: Los dos desvíos quedan en lados opuestos del punto medio.
        """
        left, right = detour_points((40.0, -100.0), (40.0, -90.0), (40.0, -95.0), offset_km=100)
        # Trayecto este-oeste: los desvíos quedan al norte y al sur del punto medio.
        self.assertGreater(left[0], 40.0)
        self.assertLess(right[0], 40.0)
        self.assertAlmostEqual(left[1], -95.0, delta=0.5)

    def test_detour_distance_matches_the_requested_offset(self):
        """Each detour is the requested distance from the midpoint.

        Español: Cada desvío está a la distancia pedida del punto medio.
        """
        mid = (40.0, -95.0)
        for point in detour_points((40.0, -100.0), (40.0, -90.0), mid, offset_km=100):
            self.assertAlmostEqual(haversine_m(*mid, *point) / 1000, 100, delta=2)
