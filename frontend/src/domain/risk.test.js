/**
 * @file Tests for risk levels, colours and number formatters.
 *
 * Español: Pruebas de los niveles de riesgo, los colores y los formateadores de números.
 */

import { describe, expect, it } from 'vitest';
import { formatDuration, formatLoad, formatLoadShort, formatMiles, formatRisk, levelColor, levelFromCode, levelInk } from './risk.js';
import { tEn } from '../test/render.jsx';

describe('levelFromCode', () => {
  it('maps the API codes 0 to 5 to level names', () => {
    expect([0, 1, 2, 3, 4, 5].map((c) => levelFromCode(String(c)))).toEqual([
      'low', 'moderate', 'high', 'severe', 'notravel', 'unknown',
    ]);
  });

  it('treats unexpected codes as unknown', () => {
    expect(levelFromCode('9')).toBe('unknown');
  });
});

describe('levelColor', () => {
  it('uses a different palette for dark mode', () => {
    expect(levelColor('severe', 'light')).not.toBe(levelColor('severe', 'dark'));
  });

  it('falls back to the light palette for an unknown theme', () => {
    expect(levelColor('low', 'sepia')).toBe(levelColor('low', 'light'));
  });
});

describe('levelInk', () => {
  it('uses dark ink on the light fills that are pale enough to need it', () => {
    expect(levelInk('high', 'light')).toBe('#14130f');
    expect(levelInk('unknown', 'light')).toBe('#14130f');
  });

  it('uses white ink on the darker light-theme fills', () => {
    expect(levelInk('low', 'light')).toBe('#ffffff');
    expect(levelInk('severe', 'light')).toBe('#ffffff');
  });

  it('uses dark ink on every dark-theme fill', () => {
    expect(levelInk('severe', 'dark')).toBe('#14130f');
  });
});

describe('formatters', () => {
  it('formats durations as hours and minutes', () => {
    expect(formatDuration(460, tEn)).toBe('7h 40m');
    expect(formatDuration(65, tEn)).toBe('1h 05m');
  });

  it('shows a dash when a value is missing', () => {
    expect(formatMiles(null, tEn)).toBe('—');
    expect(formatRisk(null)).toBe('—');
    expect(formatMiles(29.6, tEn)).toBe('30 mi');
  });

  it('formats loads with the locale separators', () => {
    expect(formatLoad(41000, 'en-US', tEn)).toBe('41,000 lb');
    expect(formatLoadShort(41000)).toBe('41k');
  });
});
