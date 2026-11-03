/**
 * @file Sample API responses for the tests.
 *
 * English: Shapes copied from the real API, reduced to the fields the tests
 * use. Tests build on them instead of inventing data.
 *
 * Español: Formas tomadas de la API real, reducidas a los campos que usan las
 * pruebas. Las pruebas parten de ellas en lugar de inventar datos.
 */

/**
 * Build a 49-character hourly series that repeats one digit code.
 *
 * English: Each character is one forecast hour, 0 to 48.
 *
 * Español: Cada carácter es una hora del pronóstico, de 0 a 48.
 *
 * @param {string} code - One digit code, such as '0' for low.
 * @returns {string} 49 repetitions of the code.
 */
const hourly = (code) => code.repeat(49);

/**
 * Build one checkpoint in the API shape.
 *
 * @param {number} index - Position of the checkpoint in the route.
 * @param {string} level - Level name at arrival.
 * @param {string} code - Digit used for every hour of the hourly series.
 * @returns {Object} A checkpoint object; driver and weather are omitted for unknown hours.
 */
function checkpoint(index, level, code) {
  return {
    index,
    mile: index * 10,
    lat: 35 + index * 0.1,
    lon: -100,
    eta: '2026-11-03T06:00:00-06:00',
    level,
    hourly: hourly(code),
    ...(level === 'unknown' ? {} : { driver: 'wind', wind_mph: 20, rain_in_h: 0, snow_in_h: 0 }),
  };
}

/**
 * Build one route in the API shape.
 *
 * @param {string} id - Route identifier, such as 'route-1'.
 * @param {string} label - Display label.
 * @param {Object} options - Severe and high miles, duration, eligibility, blocking reasons and checkpoints.
 * @returns {Object} A route object.
 */
function route(id, label, { severe, high, minutes, eligible = true, blocked = [], checkpoints }) {
  return {
    id,
    label,
    distance_miles: 412,
    duration_minutes: minutes,
    eligible,
    blocked_reasons: blocked,
    severe_miles: severe,
    high_miles: high,
    notravel_miles: 0,
    unknown_miles: 0,
    avg_risk: 0.6,
    polyline: [[35, -100], [36, -100]],
    checkpoints,
  };
}

/**
 * Build an evaluated trip with three routes.
 *
 * English: Route 1 is recommended. Route 3 is blocked by No Travel.
 *
 * Español: La ruta 1 es la recomendada. La ruta 3 está bloqueada por No viajar.
 *
 * @param {Object} [overrides] - Fields replacing the defaults.
 * @returns {Object} The evaluated trip.
 */
export function tripResult(overrides = {}) {
  return {
    origin: { query: 'Dallas, TX', lat: 32.7, lon: -96.8 },
    destination: { query: 'Denver, CO', lat: 39.7, lon: -104.9 },
    departure: '2026-11-03T06:00:00-06:00',
    load_lb: 41000,
    tolerance_miles: 1,
    sample_every_miles: 10,
    forecast_base: '2026-11-02T18:00:00+00:00',
    hours: 49,
    recommended_route_id: 'route-1',
    ranking: ['route-1', 'route-2'],
    routes: [
      route('route-1', 'Ruta 1', {
        severe: 0, high: 20, minutes: 460,
        checkpoints: [checkpoint(0, 'low', '0'), checkpoint(1, 'high', '2'), checkpoint(2, 'low', '0')],
      }),
      route('route-2', 'Ruta 2', {
        severe: 30, high: 40, minutes: 420,
        checkpoints: [checkpoint(0, 'low', '0'), checkpoint(1, 'severe', '3'), checkpoint(2, 'low', '0')],
      }),
      route('route-3', 'Ruta 3', {
        severe: 90, high: 0, minutes: 480, eligible: false, blocked: ['tiene tramos de No viajar'],
        checkpoints: [checkpoint(0, 'low', '0'), checkpoint(1, 'notravel', '4'), checkpoint(2, 'low', '0')],
      }),
    ],
    warnings: [],
    ...overrides,
  };
}

/**
 * Build a departures response with three columns.
 *
 * English: The first column has no safe route; the other two do.
 *
 * Español: La primera columna no tiene ruta segura; las otras dos sí.
 *
 * @returns {Object} The departures response.
 */
export function departuresResult() {
  return {
    trip_id: 1,
    window_hours: 4,
    step_hours: 2,
    level_codes: { low: '0', moderate: '1', high: '2', severe: '3', notravel: '4', unknown: '5' },
    columns: [
      {
        departure: '2026-11-03T06:00:00-06:00',
        recommended_route_id: null,
        routes: {
          'route-1': { eligible: false, severe_miles: 0, high_miles: 0, minutes: 460, levels: '040' },
          'route-2': { eligible: false, severe_miles: 30, high_miles: 0, minutes: 420, levels: '343' },
        },
      },
      {
        departure: '2026-11-03T08:00:00-06:00',
        recommended_route_id: 'route-1',
        routes: {
          'route-1': { eligible: true, severe_miles: 0, high_miles: 20, minutes: 460, levels: '020' },
          'route-2': { eligible: true, severe_miles: 30, high_miles: 40, minutes: 420, levels: '000' },
        },
      },
      {
        departure: '2026-11-03T10:00:00-06:00',
        recommended_route_id: 'route-1',
        routes: {
          'route-1': { eligible: true, severe_miles: 0, high_miles: 0, minutes: 460, levels: '000' },
          'route-2': { eligible: true, severe_miles: 0, high_miles: 40, minutes: 420, levels: '010' },
        },
      },
    ],
    earliest_clean_departure: '2026-11-03T08:00:00-06:00',
  };
}
