/**
 * @file Language and colour-theme provider.
 *
 * English: Stores both choices in localStorage (when it is available) and
 * applies them to the <html> element. The theme defaults to the system preference.
 *
 * Español: Guarda ambas opciones en localStorage (si está disponible) y las
 * aplica al elemento <html>. El tema por defecto sigue la preferencia del sistema.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, LOCALES, translate } from './messages.js';

/**
 * localStorage key for the language.
 *
 * @type {string}
 */
const LOCALE_KEY = 'spotter.locale';
/**
 * localStorage key for the theme.
 *
 * @type {string}
 */
const THEME_KEY = 'spotter.theme';
/**
 * Allowed theme names.
 *
 * @type {string[]}
 */
const THEMES = ['light', 'dark'];

/**
 * React context that carries the translator and the preferences.
 *
 * @type {React.Context}
 */
const I18nContext = createContext(null);

/**
 * Read a value from localStorage without failing.
 *
 * English: Private windows and blocked storage throw; then nothing is stored.
 *
 * Español: Las ventanas privadas y el almacenamiento bloqueado lanzan error; en ese caso no se guarda nada.
 *
 * @param {string} key
 * @returns {string|null}
 */
function readStored(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Write a value to localStorage without failing.
 *
 * @param {string} key
 * @param {string} value
 */
function writeStored(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignored on purpose: the preference still applies for this visit.
  }
}

/**
 * Choose the starting theme: stored value, then the system preference.
 *
 * @returns {'light'|'dark'}
 */
function initialTheme() {
  const stored = readStored(THEME_KEY);
  if (THEMES.includes(stored)) return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Choose the starting language: stored value, then English.
 *
 * @returns {string} A supported locale code.
 */
function initialLocale() {
  const stored = readStored(LOCALE_KEY);
  return LOCALES.includes(stored) ? stored : DEFAULT_LOCALE;
}

/**
 * Provide the translator, the language and the theme to the tree.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(initialLocale);
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    writeStored(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
    writeStored(LOCALE_KEY, locale);
  }, [locale]);

  const t = useCallback((key, vars) => translate(locale, key, vars), [locale]);

  const value = useMemo(
    () => ({
      t,
      locale,
      // Intl tag used for dates and numbers.
      intlLocale: locale === 'es' ? 'es-MX' : 'en-US',
      setLocale,
      theme,
      setTheme,
      toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [t, locale, theme],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Read the translator and the preferences.
 *
 * @returns {{t: Function, locale: string, intlLocale: string, setLocale: Function, theme: string, setTheme: Function, toggleTheme: Function}}
 * @throws {Error} When used outside I18nProvider.
 */
export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
