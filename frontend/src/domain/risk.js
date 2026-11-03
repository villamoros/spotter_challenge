/**
 * @file Risk levels, colour palettes and number formatters.
 *
 * English: The level codes match LEVEL_CODE in the backend. Formatters take a
 * translator so units follow the selected language.
 *
 * Español: Los códigos de nivel coinciden con LEVEL_CODE del backend. Los formateadores
 * reciben un traductor para que las unidades sigan el idioma elegido.
 */

/**
 * Maps each digit code sent by the API to a level name.
 *
 * @type {Object<string, string>}
 */
export const LEVEL_BY_CODE = {
  0: 'low',
  1: 'moderate',
  2: 'high',
  3: 'severe',
  4: 'notravel',
  5: 'unknown',
};

/**
 * Levels in increasing severity, used by the legend.
 *
 * @type {string[]}
 */
export const LEVEL_ORDER = ['low', 'moderate', 'high', 'severe', 'notravel'];

/**
 * Colours for each level in the light and dark themes.
 *
 * @type {{light: Object<string, string>, dark: Object<string, string>}}
 */
export const RISK_PALETTE = {
  light: {
    low: '#b7d1a3',
    moderate: '#ecd58c',
    high: '#e4a56b',
    severe: '#c4574a',
    notravel: '#3f2f50',
    unknown: '#d6d1c7',
  },
  dark: {
    low: '#7fae6c',
    moderate: '#dcbc55',
    high: '#e8925c',
    severe: '#e0695c',
    notravel: '#9d88c9',
    unknown: '#4d4a44',
  },
};

/**
 * Convert an API digit code into a level name.
 *
 * @param {string} code - One digit from the hourly series.
 * @returns {string} The level name, or 'unknown' for unexpected codes.
 */
export function levelFromCode(code) {
  return LEVEL_BY_CODE[code] ?? 'unknown';
}

/**
 * Return the colour of a level in a theme.
 *
 * @param {string} level - Level name.
 * @param {string} [theme='light'] - 'light' or 'dark'.
 * @returns {string} A CSS colour.
 */
export function levelColor(level, theme = 'light') {
  const palette = RISK_PALETTE[theme] ?? RISK_PALETTE.light;
  return palette[level] ?? palette.unknown;
}

/**
 * Return the translated name of a level.
 *
 * @param {string} level - Level name.
 * @param {Function} t - Translator.
 * @returns {string}
 */
export function levelLabel(level, t) {
  return t(`risk.${level in RISK_PALETTE.light ? level : 'unknown'}`);
}

/**
 * Format a distance in miles.
 *
 * @param {number|null} value - Miles.
 * @param {Function} t - Translator, for the unit.
 * @returns {string} For example '30 mi', or a dash when missing.
 */
export function formatMiles(value, t) {
  return value == null ? '—' : `${Math.round(value)} ${t('unit.mi')}`;
}

/**
 * Format an average risk to two decimals.
 *
 * @param {number|null} value - Average risk between 0 and 3.
 * @returns {string}
 */
export function formatRisk(value) {
  return value == null ? '—' : value.toFixed(2);
}

/**
 * Format a duration in minutes as hours and minutes.
 *
 * @param {number} minutes - Duration in minutes.
 * @param {Function} t - Translator.
 * @returns {string} For example '7h 40m'.
 */
export function formatDuration(minutes, t) {
  const hours = Math.floor(minutes / 60);
  const rest = String(Math.round(minutes % 60)).padStart(2, '0');
  return t('duration.hm', { hours, minutes: rest });
}

/**
 * Format a load with locale separators and its unit.
 *
 * @param {number} pounds - Load in pounds.
 * @param {string} intlLocale - Locale tag, such as 'en-US'.
 * @param {Function} t - Translator, for the unit.
 * @returns {string} For example '41,000 lb'.
 */
export function formatLoad(pounds, intlLocale, t) {
  return `${new Intl.NumberFormat(intlLocale).format(Math.round(pounds))} ${t('unit.lb')}`;
}

/**
 * Format a load in thousands for the shortcut buttons.
 *
 * @param {number} pounds - Load in pounds.
 * @returns {string} For example '41k'.
 */
export function formatLoadShort(pounds) {
  return `${Math.round(pounds / 1000)}k`;
}
