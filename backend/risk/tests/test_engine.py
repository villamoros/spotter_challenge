"""Tests for the wind, rain, snow and load rules.

English: Each case checks one boundary of the brief's risk table.

Español: Cada caso comprueba un límite de la tabla de riesgo de la prueba.
"""

from django.test import SimpleTestCase

from risk.engine import (
    HIGH,
    LOW,
    MODERATE,
    NO_TRAVEL,
    SEVERE,
    Conditions,
    classify,
    classify_rain,
    classify_snow,
    classify_wind,
    wind_with_load,
)


class ComponentThresholdTests(SimpleTestCase):
    """Boundary tests for each weather component.

    Español: Pruebas de los límites de cada componente del clima.
    """

    def test_rain_boundaries_go_to_the_more_severe_level(self):
        """Rain at a boundary takes the more severe level.

        Español: La lluvia en un límite toma el nivel más severo.
        """
        self.assertEqual(classify_rain(0.09), LOW)
        self.assertEqual(classify_rain(0.10), MODERATE)
        self.assertEqual(classify_rain(0.25), HIGH)
        self.assertEqual(classify_rain(0.50), SEVERE)
        self.assertEqual(classify_rain(1.00), SEVERE)
        self.assertEqual(classify_rain(1.01), NO_TRAVEL)

    def test_snow_boundaries(self):
        """Snow thresholds classify as the table says.

        Español: Los umbrales de nieve clasifican como indica la tabla.
        """
        self.assertEqual(classify_snow(0.49), LOW)
        self.assertEqual(classify_snow(0.5), MODERATE)
        self.assertEqual(classify_snow(1.0), HIGH)
        self.assertEqual(classify_snow(2.0), SEVERE)
        self.assertEqual(classify_snow(3.0), SEVERE)
        self.assertEqual(classify_snow(3.01), NO_TRAVEL)

    def test_wind_boundaries_without_load(self):
        """Wind thresholds classify as the table says, without load.

        Español: Los umbrales de viento clasifican como indica la tabla, sin carga.
        """
        self.assertEqual(classify_wind(24.9), LOW)
        self.assertEqual(classify_wind(25), MODERATE)
        self.assertEqual(classify_wind(35), HIGH)
        self.assertEqual(classify_wind(45), SEVERE)
        self.assertEqual(classify_wind(54.9), SEVERE)
        self.assertEqual(classify_wind(55), NO_TRAVEL)


class LoadRuleTests(SimpleTestCase):
    """Tests for the load rules, which change only the wind.

    Español: Pruebas de las reglas de carga, que solo modifican el viento.
    """

    def test_high_wind_upgrades_to_severe_only_above_40000_lb(self):
        """High wind becomes Severe only above 40,000 lb.

        Español: El viento alto pasa a Severo solo por encima de 40,000 lb.
        """
        self.assertEqual(wind_with_load(44, 40_000), HIGH)
        self.assertEqual(wind_with_load(44, 40_001), SEVERE)

    def test_severe_wind_blocks_only_above_30000_lb(self):
        """Severe wind becomes No Travel only above 30,000 lb.

        Español: El viento severo pasa a No viajar solo por encima de 30,000 lb.
        """
        self.assertEqual(wind_with_load(46, 30_000), SEVERE)
        self.assertEqual(wind_with_load(46, 30_001), NO_TRAVEL)

    def test_load_does_not_change_moderate_wind(self):
        """Moderate wind is unaffected by any load.

        Español: El viento moderado no se ve afectado por ninguna carga.
        """
        self.assertEqual(wind_with_load(30, 60_000), MODERATE)

    def test_load_rules_do_not_touch_rain_or_snow(self):
        """Load rules do not change the rain or snow levels.

        Español: Las reglas de carga no cambian los niveles de lluvia ni de nieve.
        """
        result = classify(Conditions(wind_mph=10, rain_in_h=0.6, snow_in_h=0, load_lb=60_000))
        self.assertEqual(result.level, SEVERE)
        self.assertEqual(result.driver, "rain")


class ClassifyTests(SimpleTestCase):
    """Tests for the combined classification of a checkpoint.

    Español: Pruebas de la clasificación combinada de un checkpoint.
    """

    def test_worst_component_wins(self):
        """The worst component sets the level and is reported as the driver.

        Español: El peor componente fija el nivel y se informa como el que decide.
        """
        result = classify(Conditions(wind_mph=10, rain_in_h=0.6, snow_in_h=0, load_lb=20_000))
        self.assertEqual(result.level, SEVERE)
        self.assertEqual(result.driver, "rain")

    def test_ties_are_attributed_to_wind(self):
        """On a tie the wind is reported as the driver.

        Español: En caso de empate, el viento figura como el componente que decide.
        """
        result = classify(Conditions(wind_mph=30, rain_in_h=0.12, snow_in_h=0, load_lb=20_000))
        self.assertEqual(result.level, MODERATE)
        self.assertEqual(result.driver, "wind")

    def test_wind_above_55_is_no_travel_for_any_load(self):
        """Wind of 55 mph or more is No Travel whatever the load.

        Español: El viento de 55 mph o más es No viajar, sea cual sea la carga.
        """
        self.assertEqual(classify(Conditions(60, 0, 0, 10_000)).level, NO_TRAVEL)
