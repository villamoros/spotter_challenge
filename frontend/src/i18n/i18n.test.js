/**
 * @file Tests for the translation tables and the error-text fallback.
 *
 * English: The most important check is that both languages have the same keys.
 *
 * Español: La comprobación más importante es que ambos idiomas tengan las mismas claves.
 */

import { describe, expect, it } from 'vitest';
import { messages, translate } from './messages.js';
import { errorText } from './errorText.js';

describe('translate', () => {
  it('uses English by default and Spanish when asked', () => {
    expect(translate('en', 'verdict.title', { route: 'Route 1' })).toBe('Take Route 1.');
    expect(translate('es', 'verdict.title', { route: 'Ruta 1' })).toBe('Toma la Ruta 1.');
  });

  it('keeps placeholders that were not provided visible', () => {
    expect(translate('en', 'slider.clock', { hours: 4 })).toBe('T+4h · {when}');
  });

  it('returns the key itself when it does not exist', () => {
    expect(translate('es', 'does.not.exist')).toBe('does.not.exist');
  });

  it('has the same keys in both languages', () => {
    expect(Object.keys(messages.es).sort()).toEqual(Object.keys(messages.en).sort());
  });
});

describe('errorText', () => {
  const t = (key) => translate('en', key);

  it('translates a known error code', () => {
    expect(errorText({ code: 'weather_failed', message: 'server text' }, t)).toBe('The weather service did not respond.');
  });

  it('falls back to the server message for an unknown code', () => {
    expect(errorText({ code: 'something_new', message: 'Server text.' }, t)).toBe('Server text.');
  });
});
