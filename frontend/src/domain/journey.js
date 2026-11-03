/**
 * @file Position of the truck along a route at a given forecast hour.
 *
 * English: Pure functions. The truck waits until its departure, moves while
 * the forecast clock advances, and stops at the destination.
 *
 * Español: Funciones puras. El camión espera hasta su salida, avanza mientras
 * avanza el reloj del pronóstico y se detiene en el destino.
 */

// Where the truck is along the route at a given forecast hour.
// The departure may be later than the slider hour (status "waiting"), or the trip may be over ("arrived").

/**
 * Milliseconds in one hour.
 *
 * @type {number}
 */
const MS_PER_HOUR = 3_600_000;

/**
 * Return where the truck is at a forecast hour.
 *
 * English: Status is 'waiting' before the departure, 'enroute' in between,
 * and 'arrived' after the route duration.
 *
 * Español: El estado es 'waiting' antes de la salida, 'enroute' entre medio y
 * 'arrived' cuando pasa la duración de la ruta.
 *
 * @param {Object} result - Evaluated trip; provides the departure and the forecast base.
 * @param {Object} route - Route the truck follows.
 * @param {number} hour - Forecast hour on the slider (0 to 48).
 * @returns {{status: string, fraction: number, hoursUntilDeparture: number}}
 */
export function journeyAt(result, route, hour) {
  const startHours = (Date.parse(result.departure) - Date.parse(result.forecast_base)) / MS_PER_HOUR;
  const durationHours = route.duration_minutes / 60;
  const elapsed = hour - startHours;

  if (elapsed < 0) {
    return { status: 'waiting', fraction: 0, hoursUntilDeparture: -elapsed };
  }
  if (elapsed >= durationHours) {
    return { status: 'arrived', fraction: 1, hoursUntilDeparture: 0 };
  }
  return { status: 'enroute', fraction: elapsed / durationHours, hoursUntilDeparture: 0 };
}

/**
 * Return the coordinates at a fraction of the route's length.
 *
 * English: Interpolates linearly between the checkpoints, which are sorted by mile.
 *
 * Español: Interpola linealmente entre los checkpoints, ordenados por milla.
 *
 * @param {Object} route - Route with its checkpoints and distance in miles.
 * @param {number} fraction - 0 for the origin, 1 for the destination.
 * @returns {number[]} [lat, lon].
 */
export function pointAtFraction(route, fraction) {
  const checkpoints = route.checkpoints;
  const target = Math.min(Math.max(fraction, 0), 1) * route.distance_miles;
  if (target <= checkpoints[0].mile) return [checkpoints[0].lat, checkpoints[0].lon];

  for (let i = 0; i < checkpoints.length - 1; i++) {
    const a = checkpoints[i];
    const b = checkpoints[i + 1];
    if (target <= b.mile) {
      const t = b.mile === a.mile ? 0 : (target - a.mile) / (b.mile - a.mile);
      return [a.lat + (b.lat - a.lat) * t, a.lon + (b.lon - a.lon) * t];
    }
  }
  const last = checkpoints[checkpoints.length - 1];
  return [last.lat, last.lon];
}
