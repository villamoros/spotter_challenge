/**
 * @file REST client for the Spotter API.
 *
 * English: The only place where HTTP errors become ApiError objects.
 *
 * Español: El único lugar donde los errores HTTP se convierten en objetos ApiError.
 */

// REST client for the Spotter API. The only place where HTTP errors are translated into ApiError.

/**
 * Base URL of the API.
 *
 * English: Taken from VITE_API_URL; defaults to the local Django server.
 *
 * Español: Se toma de VITE_API_URL; por defecto apunta al servidor Django local.
 *
 * @type {string}
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

/**
 * Error raised for any failed API call.
 *
 * English: `code` is stable and translated by the UI; `message` is the
 * English text from the server.
 *
 * Español: `code` es estable y la interfaz lo traduce; `message` es el texto
 * en inglés que envía el servidor.
 *
 * @extends Error
 */
export class ApiError extends Error {
  // `code` is stable and translated by the UI; `message` is the English fallback from the server.
  constructor(message, status, code = 'unknown', fields = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/**
 * Build the REST client.
 *
 * English: `fetchImpl` is injected in tests so no real request is made.
 *
 * Español: `fetchImpl` se inyecta en las pruebas para no hacer peticiones reales.
 *
 * @param {string} [base=API_BASE] - Base URL of the API.
 * @param {Function} [fetchImpl=fetch] - Function used to send requests.
 * @returns {{listTrips: Function, createTrip: Function, getTrip: Function, updateTrip: Function, deleteTrip: Function, getDepartures: Function}}
 */
export function createApiClient(base = API_BASE, fetchImpl = (...args) => fetch(...args)) {
  async function request(path, { method = 'GET', body } = {}) {
    let response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError('Cannot reach the server.', 0, 'network');
    }

    if (response.status === 204) return null;

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message = data?.error ?? `The API responded with status ${response.status}.`;
      throw new ApiError(message, response.status, data?.code ?? 'unknown', data?.fields ?? {});
    }
    return data;
  }

  return {
    listTrips: () => request('/trips/'),
    createTrip: (input) => request('/trips/', { method: 'POST', body: input }),
    getTrip: (id) => request(`/trips/${id}/`),
    updateTrip: (id, patch) => request(`/trips/${id}/`, { method: 'PATCH', body: patch }),
    deleteTrip: (id) => request(`/trips/${id}/`, { method: 'DELETE' }),
    getDepartures: (id, { windowHours = 48, stepHours = 2 } = {}) =>
      request(`/trips/${id}/departures/?window_hours=${windowHours}&step_hours=${stepHours}`),
  };
}

/**
 * Shared client used by the application.
 *
 * English: Created with the default base URL and the browser's fetch.
 *
 * Español: Se crea con la URL base por defecto y el fetch del navegador.
 */
export const api = createApiClient();
