/**
 * @file Presentation rules over the API result.
 *
 * English: These functions decide what to show and how to explain it. They
 * never recalculate risk.
 *
 * Español: Estas funciones deciden qué mostrar y cómo explicarlo. Nunca
 * recalculan el riesgo.
 */

// Presentation rules over the API result. They never recalculate risk:
// they only decide what to show and how to explain it.
import { levelFromCode, formatDuration, formatMiles } from './risk.js';

/**
 * Return the route the API recommends.
 *
 * @param {Object} result - Evaluated trip.
 * @returns {Object|null} The route, or null when no route is safe.
 */
export function recommendedRoute(result) {
  if (!result?.recommended_route_id) return null;
  return result.routes.find((r) => r.id === result.recommended_route_id) ?? null;
}

/**
 * Return the route the screen focuses on.
 *
 * English: The selected route, otherwise the recommended one, otherwise the first.
 *
 * Español: La ruta seleccionada, si no la recomendada, y si no la primera.
 *
 * @param {Object} result - Evaluated trip.
 * @param {string|null} selectedId - Route picked by the user.
 * @returns {Object|null}
 */
export function activeRoute(result, selectedId) {
  if (!result) return null;
  return (
    result.routes.find((r) => r.id === selectedId) ?? recommendedRoute(result) ?? result.routes[0] ?? null
  );
}

/**
 * Return the level of each checkpoint at one forecast hour.
 *
 * @param {Object} route - Route to read.
 * @param {number} hour - Forecast hour (0 to 48).
 * @returns {string[]} One level name per checkpoint.
 */
export function corridorAt(route, hour) {
  if (!route) return [];
  return route.checkpoints.map((cp) => levelFromCode(cp.hourly[hour]));
}

/**
 * Translate a route id into its label.
 *
 * @param {string} routeId - Identifier from the API, such as 'route-2'.
 * @param {Function} t - Translator.
 * @returns {string} For example 'Route 2'.
 */
export function routeLabel(routeId, t) {
  if (!routeId) return '';
  return t('route.label', { n: routeId.replace('route-', '') });
}

/**
 * Ranking criteria in the order of the brief.
 *
 * English: The first criterion that separates the winner from the runner-up decides.
 *
 * Español: El primer criterio que separa a la ganadora de la segunda decide.
 *
 * @type {{key: string, labelKey: string, nameKey: string, value: Function, format: Function}[]}
 */
export const CRITERIA = [
  {
    key: 'blocked',
    labelKey: 'crit.blocked',
    nameKey: 'crit.nameBlocked',
    value: (r) => (r.notravel_miles > 0 || r.unknown_miles > 0 ? 1 : 0),
    format: (v, t) => (v ? t('common.yes') : t('common.no')),
  },
  {
    key: 'severe',
    labelKey: 'crit.severe',
    nameKey: 'crit.nameSevere',
    value: (r) => r.severe_miles,
    format: (v, t) => formatMiles(v, t),
  },
  {
    key: 'high',
    labelKey: 'crit.high',
    nameKey: 'crit.nameHigh',
    value: (r) => r.high_miles,
    format: (v, t) => formatMiles(v, t),
  },
  {
    key: 'avg',
    labelKey: 'crit.avg',
    nameKey: 'crit.nameAvg',
    value: (r) => r.avg_risk ?? Infinity,
    format: (v) => (Number.isFinite(v) ? v.toFixed(2) : '—'),
  },
  {
    key: 'time',
    labelKey: 'crit.time',
    nameKey: 'crit.nameTime',
    value: (r) => r.duration_minutes,
    format: (v, t) => formatDuration(v, t),
  },
];

/**
 * Return the key of the criterion that separates the top two routes.
 *
 * @param {Object} result - Evaluated trip.
 * @returns {string|null} Criterion key, or null without a runner-up or when they tie.
 */
export function decidingCriterion(result) {
  const recommended = recommendedRoute(result);
  const runnerUp = result?.ranking?.[1];
  if (!recommended || !runnerUp) return null;
  const other = result.routes.find((r) => r.id === runnerUp);
  const decider = CRITERIA.find((c) => c.value(recommended) !== c.value(other));
  return decider?.key ?? null;
}

/**
 * Build the rows of the criteria table.
 *
 * @param {Object} result - Evaluated trip.
 * @param {Function} t - Translator.
 * @returns {{key: string, label: string, deciding: boolean, cells: Object[]}[]}
 */
export function criteriaTable(result, t) {
  const deciding = decidingCriterion(result);
  return CRITERIA.map((criterion) => ({
    key: criterion.key,
    label: t(criterion.labelKey),
    deciding: criterion.key === deciding,
    cells: result.routes.map((r) => ({
      routeId: r.id,
      text: criterion.format(criterion.value(r), t),
      recommended: r.id === result.recommended_route_id,
    })),
  }));
}

/**
 * Keep only the departures that have a safe recommended route.
 *
 * @param {Object[]} columns - Departure columns from the API.
 * @returns {Object[]}
 */
export function cleanDepartures(columns) {
  return columns.filter((c) => c.recommended_route_id !== null);
}

/**
 * Shape the departures response for the time-by-distance chart.
 *
 * @param {Object|null} departures - Departures response.
 * @param {string} routeId - Route to draw.
 * @returns {{rows: number, columns: {departure: string, clean: boolean, levels: string}[]}}
 */
export function mareyGrid(departures, routeId) {
  const columns = departures?.columns ?? [];
  const rows = columns[0]?.routes[routeId]?.levels.length ?? 0;
  return {
    rows,
    columns: columns.map((c) => ({
      departure: c.departure,
      clean: c.recommended_route_id !== null,
      levels: c.routes[routeId]?.levels ?? '',
    })),
  };
}
