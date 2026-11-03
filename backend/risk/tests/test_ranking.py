"""Tests for route summaries and ordering.

English: Covers the summary of each route and the order defined in the brief.

Español: Cubre el resumen de cada ruta y el orden definido en la prueba.
"""

from django.test import SimpleTestCase

from risk.engine import HIGH, LOW, NO_TRAVEL, SEVERE, UNKNOWN
from risk.ranking import RouteRisk, Sample, rank, summarize


def make_route(route_id, severe=0.0, high=0.0, avg=1.0, minutes=100, blocked=False):
    """Build a RouteRisk with the given severe, high, average and time values.

    Español: Construye un RouteRisk con los valores de millas severas, altas, riesgo medio y tiempo dados.
    """
    return RouteRisk(
        route_id=route_id,
        total_miles=10,
        minutes=minutes,
        severe_miles=severe,
        high_miles=high,
        notravel_miles=0,
        unknown_miles=0,
        avg_risk=avg,
        blocked_reasons=("bloqueada",) if blocked else (),
    )


class SummarizeTests(SimpleTestCase):
    """Tests for summarize().

    Español: Pruebas de summarize().
    """

    def test_each_sample_covers_until_the_next_one(self):
        """Each sample covers the distance up to the next sample.

        Español: Cada muestra cubre la distancia hasta la siguiente.
        """
        samples = [Sample(0, LOW), Sample(10, SEVERE), Sample(30, HIGH)]
        risk = summarize("r", samples, total_miles=50, minutes=60)
        self.assertEqual(risk.severe_miles, 20)
        self.assertEqual(risk.high_miles, 20)
        self.assertAlmostEqual(risk.avg_risk, (20 * 3 + 20 * 2) / 50)
        self.assertTrue(risk.eligible)

    def test_no_travel_makes_the_route_ineligible(self):
        """A No Travel stretch makes the route ineligible.

        Español: Un tramo de No viajar hace inelegible la ruta.
        """
        samples = [Sample(0, LOW), Sample(5, NO_TRAVEL)]
        risk = summarize("r", samples, total_miles=10, minutes=10)
        self.assertFalse(risk.eligible)
        self.assertEqual(risk.notravel_miles, 5)
        self.assertIn("no_travel", risk.blocked_reasons)

    def test_unknown_forecast_blocks_the_route(self):
        """A stretch without forecast blocks the route.

        Español: Un tramo sin pronóstico bloquea la ruta.
        """
        samples = [Sample(0, LOW), Sample(5, UNKNOWN)]
        risk = summarize("r", samples, total_miles=10, minutes=10)
        self.assertFalse(risk.eligible)
        self.assertEqual(risk.unknown_miles, 5)

    def test_first_sample_must_start_at_zero(self):
        """The first sample must start at mile zero.

        Español: La primera muestra debe empezar en la milla cero.
        """
        with self.assertRaises(ValueError):
            summarize("r", [Sample(1, LOW)], total_miles=10, minutes=10)


class RankTests(SimpleTestCase):
    """Tests for rank().

    Español: Pruebas de rank().
    """

    def test_fewest_severe_miles_comes_first(self):
        """The route with fewer severe miles ranks first.

        Español: La ruta con menos millas severas queda primera.
        """
        ranked = rank([make_route("a", severe=5), make_route("b", severe=2, minutes=900)], tolerance_miles=0)
        self.assertEqual([r.route_id for r in ranked], ["b", "a"])

    def test_high_miles_break_a_severe_tie(self):
        """High miles decide when the severe miles tie.

        Español: Las millas altas deciden cuando empatan las millas severas.
        """
        ranked = rank([make_route("a", high=20), make_route("b", high=5)], tolerance_miles=0)
        self.assertEqual([r.route_id for r in ranked], ["b", "a"])

    def test_average_risk_then_time_break_ties(self):
        """Average risk and then time break the remaining ties.

        Español: El riesgo medio y después el tiempo rompen los empates restantes.
        """
        ranked = rank([make_route("a", avg=1.5, minutes=50), make_route("b", avg=1.0, minutes=200)], tolerance_miles=0)
        self.assertEqual([r.route_id for r in ranked], ["b", "a"])
        ranked = rank([make_route("a", avg=1.0, minutes=300), make_route("b", avg=1.0, minutes=200)], tolerance_miles=0)
        self.assertEqual([r.route_id for r in ranked], ["b", "a"])

    def test_tolerance_groups_small_severe_differences(self):
        """Differences inside the tolerance block do not change the order.

        Español: Las diferencias dentro del bloque de tolerancia no cambian el orden.
        """
        # 0.3 mi severas menos no justifican una ruta más lenta: gana el tiempo.
        ranked = rank(
            [make_route("a", severe=0.3, minutes=400), make_route("b", severe=0.9, minutes=200)],
            tolerance_miles=1.0,
        )
        self.assertEqual([r.route_id for r in ranked], ["b", "a"])

    def test_blocked_routes_are_excluded(self):
        """Blocked routes never appear in the ranking.

        Español: Las rutas bloqueadas nunca aparecen en el ranking.
        """
        ranked = rank([make_route("a", blocked=True), make_route("b")], tolerance_miles=0)
        self.assertEqual([r.route_id for r in ranked], ["b"])

    def test_no_eligible_route_returns_empty(self):
        """With no eligible route the ranking is empty.

        Español: Sin rutas elegibles, el ranking queda vacío.
        """
        self.assertEqual(rank([make_route("a", blocked=True)]), [])
