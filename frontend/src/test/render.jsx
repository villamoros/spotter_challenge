/**
 * @file Helpers to render components with the language and theme provider.
 *
 * English: Pass 'es' to start a test in Spanish. Translators are provided for
 * pure-function tests that need a fixed language.
 *
 * Español: Pasa 'es' para iniciar una prueba en español. Hay traductores para
 * las pruebas de funciones puras que necesitan un idioma fijo.
 */

import { render } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider.jsx';
import { translate } from '../i18n/messages.js';

/**
 * Render a tree inside I18nProvider with a chosen language.
 *
 * English: The language is written to localStorage first, so the provider
 * reads it on mount.
 *
 * Español: El idioma se escribe primero en localStorage, así el proveedor lo
 * lee al montarse.
 *
 * @param {React.ReactElement} ui - Element to render.
 * @param {Object} [options]
 * @param {string} [options.locale='en'] - Starting language.
 * @returns {Object} The result of Testing Library's render.
 */
export function renderWithProviders(ui, { locale = 'en' } = {}) {
  window.localStorage.setItem('spotter.locale', locale);
  return render(<I18nProvider>{ui}</I18nProvider>);
}

/**
 * Translate a key in English, for pure-function tests.
 *
 * @param {string} key
 * @param {Object} [vars]
 * @returns {string}
 */
export const tEn = (key, vars) => translate('en', key, vars);
/**
 * Translate a key in Spanish, for pure-function tests.
 *
 * @param {string} key
 * @param {Object} [vars]
 * @returns {string}
 */
export const tEs = (key, vars) => translate('es', key, vars);
