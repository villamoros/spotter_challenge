/**
 * @file Tests for the REST client.
 *
 * English: Checks request shapes, error mapping (ApiError codes and field
 * errors), network failures, 204 responses and query strings. fetch is mocked.
 *
 * Español: Comprueba la forma de las peticiones, la traducción de errores
 * (códigos de ApiError y errores por campo), los fallos de red, las respuestas
 * 204 y las cadenas de consulta. fetch se simula.
 */

import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './client.js';

function jsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  };
}

describe('createApiClient', () => {
  it('sends JSON bodies with the right method and URL', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, { id: 7 }));
    const api = createApiClient('http://api.test/api', fetchImpl);

    const trip = await api.createTrip({ origin: 'Dallas, TX' });

    expect(trip).toEqual({ id: 7 });
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://api.test/api/trips/');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ origin: 'Dallas, TX' });
  });

  it('turns API error bodies into ApiError with a code and field codes', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(400, { error: 'Invalid data.', code: 'invalid_data', fields: { load_lb: 'number_range' } }),
    );
    const api = createApiClient('http://api.test/api', fetchImpl);

    const error = await api.createTrip({}).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.code).toBe('invalid_data');
    expect(error.fields.load_lb).toBe('number_range');
  });

  it('marks a network failure with its own code', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const api = createApiClient('http://api.test/api', fetchImpl);

    const error = await api.listTrips().catch((e) => e);

    expect(error.status).toBe(0);
    expect(error.code).toBe('network');
  });

  it('returns null for 204 responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 204, ok: true });
    const api = createApiClient('http://api.test/api', fetchImpl);
    expect(await api.deleteTrip(3)).toBeNull();
  });

  it('builds the departures query from the window and step', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { columns: [] }));
    const api = createApiClient('http://api.test/api', fetchImpl);

    await api.getDepartures(5, { windowHours: 24, stepHours: 3 });

    expect(fetchImpl.mock.calls[0][0]).toBe('http://api.test/api/trips/5/departures/?window_hours=24&step_hours=3');
  });
});
