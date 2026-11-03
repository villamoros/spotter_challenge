/**
 * @file State hook for the trip: create, open, update and departures.
 *
 * English: A request token discards late responses from earlier requests.
 * Errors are kept as ApiError objects so the UI can translate their code.
 *
 * Español: Un token por petición descarta las respuestas tardías de peticiones
 * anteriores. Los errores se guardan como objetos ApiError para traducir su código.
 */

import { useCallback, useRef, useState } from 'react';
import { api as defaultApi } from '../api/client.js';

/**
 * Initial state of the trip hook.
 *
 * @type {Object}
 */
const IDLE = { status: 'idle', trip: null, error: null, fields: {}, departures: null, departuresError: null };

/**
 * Manage the trip state and the actions that change it.
 *
 * @param {Object} [api] - REST client; defaults to the shared client.
 * @returns {{status: string, trip: Object|null, error: Error|null, fields: Object, departures: Object|null, departuresError: Error|null, create: Function, open: Function, update: Function, dismissError: Function}}
 */
export function useTrip(api = defaultApi) {
  const [state, setState] = useState(IDLE);
  const latest = useRef(0);

  const loadDepartures = useCallback(
    async (tripId, token) => {
      try {
        const departures = await api.getDepartures(tripId);
        if (token === latest.current) setState((s) => ({ ...s, departures, departuresError: null }));
      } catch (error) {
        if (token === latest.current) setState((s) => ({ ...s, departuresError: error }));
      }
    },
    [api],
  );

  const run = useCallback(
    async (action) => {
      const token = ++latest.current;
      setState((s) => ({ ...s, status: 'loading', error: null, fields: {} }));
      try {
        const trip = await action();
        if (token !== latest.current) return null;
        setState({ ...IDLE, status: 'ready', trip });
        loadDepartures(trip.id, token);
        return trip;
      } catch (error) {
        if (token !== latest.current) return null;
        setState((s) => ({
          ...s,
          status: s.trip ? 'ready' : 'error',
          error,
          fields: error.fields ?? {},
        }));
        return null;
      }
    },
    [loadDepartures],
  );

  const create = useCallback((input) => run(() => api.createTrip(input)), [api, run]);

  const open = useCallback((tripId) => run(() => api.getTrip(tripId)), [api, run]);

  const update = useCallback(
    (patch) => {
      if (!state.trip) return Promise.resolve(null);
      return run(() => api.updateTrip(state.trip.id, patch));
    },
    [api, run, state.trip],
  );

  const dismissError = useCallback(() => setState((s) => ({ ...s, error: null, fields: {} })), []);

  return { ...state, create, open, update, dismissError };
}
