/**
 * @file Tests for the truck's position along a route.
 *
 * English: Uses a 20-mile route with a 10-hour duration, so the expected
 * fractions are easy to check by hand.
 *
 * Español: Usa una ruta de 20 millas y 10 horas de duración, así los valores
 * esperados se comprueban a mano.
 */

import { describe, expect, it } from 'vitest';
import { journeyAt, pointAtFraction } from './journey.js';
import { tripResult } from '../test/fixtures.js';

// The departure is 6 forecast hours after the base, and the route takes 10 hours.
function scenario() {
  const result = tripResult({
    forecast_base: '2026-11-03T00:00:00+00:00',
    departure: '2026-11-03T06:00:00+00:00',
  });
  const route = { ...result.routes[0], duration_minutes: 600, distance_miles: 20 };
  route.checkpoints = [
    { mile: 0, lat: 30, lon: -100 },
    { mile: 10, lat: 31, lon: -100 },
    { mile: 20, lat: 32, lon: -100 },
  ];
  return { result, route };
}

describe('journeyAt', () => {
  it('waits at the origin until the departure hour', () => {
    const { result, route } = scenario();
    const state = journeyAt(result, route, 2);
    expect(state.status).toBe('waiting');
    expect(state.fraction).toBe(0);
    expect(state.hoursUntilDeparture).toBe(4);
  });

  it('is on the route between departure and arrival', () => {
    const { result, route } = scenario();
    const state = journeyAt(result, route, 11);
    expect(state.status).toBe('enroute');
    expect(state.fraction).toBeCloseTo(0.5);
  });

  it('is arrived once the duration has passed', () => {
    const { result, route } = scenario();
    expect(journeyAt(result, route, 20).status).toBe('arrived');
    expect(journeyAt(result, route, 20).fraction).toBe(1);
  });
});

describe('pointAtFraction', () => {
  it('returns the origin at 0 and the destination at 1', () => {
    const { route } = scenario();
    expect(pointAtFraction(route, 0)).toEqual([30, -100]);
    expect(pointAtFraction(route, 1)).toEqual([32, -100]);
  });

  it('interpolates between checkpoints', () => {
    const { route } = scenario();
    const [lat] = pointAtFraction(route, 0.25); // 5 miles of 20
    expect(lat).toBeCloseTo(30.5);
  });

  it('clamps fractions outside the route', () => {
    const { route } = scenario();
    expect(pointAtFraction(route, -1)).toEqual([30, -100]);
    expect(pointAtFraction(route, 2)).toEqual([32, -100]);
  });
});
