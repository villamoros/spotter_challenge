/**
 * @file Tests for the time helpers.
 *
 * English: The origin's wall clock must not change with the browser's zone,
 * and the weekday must follow the requested locale.
 *
 * Español: La hora de reloj del origen no debe cambiar con la zona del navegador,
 * y el día de la semana debe seguir el idioma pedido.
 */

import { describe, expect, it } from 'vitest';
import { formatClock, formatWeekdayClock, forecastHourLabel, parseOffsetMinutes, fromLocalInput } from './time.js';

describe('parseOffsetMinutes', () => {
  it('reads signed offsets and Z', () => {
    expect(parseOffsetMinutes('2026-11-03T06:00:00-06:00')).toBe(-360);
    expect(parseOffsetMinutes('2026-11-03T06:00:00+05:30')).toBe(330);
    expect(parseOffsetMinutes('2026-11-03T06:00:00Z')).toBe(0);
  });
});

describe('clock formatting keeps the origin wall-clock time', () => {
  // The origin's wall clock is shown no matter what time zone the browser uses.
  it('shows the wall clock written in the string', () => {
    expect(formatClock('2026-11-03T06:00:00-06:00')).toBe('06:00');
  });

  it('adds the weekday in the requested locale', () => {
    // November 3, 2026 was a Tuesday.
    expect(formatWeekdayClock('2026-11-03T06:00:00-06:00', 'en-US')).toBe('Tue 06:00');
  });
});

describe('forecastHourLabel', () => {
  it('moves the base forward by the slider hour', () => {
    // Base 18:00 UTC is 12:00 in Dallas (-06:00). Four hours later: 16:00 on Monday.
    expect(forecastHourLabel('2026-11-02T18:00:00+00:00', 4, -360, 'en-US')).toBe('Mon 16:00');
    expect(forecastHourLabel('2026-11-02T18:00:00+00:00', 12, -360, 'en-US')).toBe('Tue 00:00');
  });
});

describe('fromLocalInput', () => {
  it('builds an ISO string with the chosen offset', () => {
    expect(fromLocalInput('2026-11-03T06:00', '-07:00')).toBe('2026-11-03T06:00:00-07:00');
  });
});
