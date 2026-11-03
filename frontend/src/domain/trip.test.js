/**
 * @file Tests for the presentation rules over the API result.
 *
 * Español: Pruebas de las reglas de presentación sobre el resultado de la API.
 */

import { describe, expect, it } from 'vitest';
import { activeRoute, cleanDepartures, corridorAt, criteriaTable, decidingCriterion, mareyGrid, recommendedRoute, routeLabel } from './trip.js';
import { departuresResult, tripResult } from '../test/fixtures.js';
import { tEn } from '../test/render.jsx';

describe('recommendedRoute', () => {
  it('returns the route that the API recommends', () => {
    expect(recommendedRoute(tripResult()).id).toBe('route-1');
  });

  it('returns null when no route is safe', () => {
    expect(recommendedRoute(tripResult({ recommended_route_id: null, ranking: [] }))).toBeNull();
  });
});

describe('routeLabel', () => {
  it('turns the API id into a translated label', () => {
    expect(routeLabel('route-2', tEn)).toBe('Route 2');
  });
});

describe('corridorAt', () => {
  it('maps the hourly code of each checkpoint to a risk level', () => {
    const route = recommendedRoute(tripResult());
    expect(corridorAt(route, 0)).toEqual(['low', 'high', 'low']);
    expect(corridorAt(tripResult().routes[1], 0)).toEqual(['low', 'severe', 'low']);
  });

  it('returns no cells when there is no route', () => {
    expect(corridorAt(null, 0)).toEqual([]);
  });
});

describe('decidingCriterion', () => {
  it('names the first criterion that separates the winner from the runner-up', () => {
    // Route 1 has 0 severe miles; route 2 has 30. That criterion decides.
    expect(decidingCriterion(tripResult())).toBe('severe');
  });

  it('is null when there is no runner-up', () => {
    const result = tripResult({ ranking: ['route-1'] });
    expect(decidingCriterion(result)).toBeNull();
  });
});

describe('criteriaTable', () => {
  it('marks the deciding row and the recommended column', () => {
    const table = criteriaTable(tripResult(), tEn);
    const deciding = table.find((row) => row.deciding);
    expect(deciding.key).toBe('severe');
    expect(deciding.label).toBe('Severe miles');
    expect(deciding.cells.find((c) => c.recommended).routeId).toBe('route-1');
  });
});

describe('cleanDepartures', () => {
  it('keeps only the departures that have a recommended route', () => {
    const clean = cleanDepartures(departuresResult().columns);
    expect(clean.map((c) => c.departure)).toEqual([
      '2026-11-03T08:00:00-06:00',
      '2026-11-03T10:00:00-06:00',
    ]);
  });
});

describe('mareyGrid', () => {
  it('lists one column per departure and one row per checkpoint', () => {
    const grid = mareyGrid(departuresResult(), 'route-1');
    expect(grid.rows).toBe(3);
    expect(grid.columns).toHaveLength(3);
    expect(grid.columns[1].clean).toBe(true);
    expect(grid.columns[0].clean).toBe(false);
  });

  it('is empty without departures', () => {
    expect(mareyGrid(null, 'route-1')).toEqual({ rows: 0, columns: [] });
  });
});

describe('activeRoute', () => {
  it('follows the route the user selected', () => {
    expect(activeRoute(tripResult(), 'route-2').id).toBe('route-2');
  });

  it('falls back to the recommended route when nothing is selected', () => {
    expect(activeRoute(tripResult(), null).id).toBe('route-1');
  });

  it('falls back to the first route when nothing is recommended', () => {
    expect(activeRoute(tripResult({ recommended_route_id: null, ranking: [] }), null).id).toBe('route-1');
  });

  it('is null without a result', () => {
    expect(activeRoute(null, 'route-1')).toBeNull();
  });
});
