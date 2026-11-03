/**
 * @file Time helpers that keep the origin's wall-clock time.
 *
 * English: Times arrive with an offset (for example -06:00). They are shown
 * as the origin's clock, whatever the browser's time zone is.
 *
 * Español: Las horas llegan con un desfase (por ejemplo -06:00). Se muestran
 * como la hora de reloj del origen, sin importar la zona del navegador.
 */

// Times arrive with an offset (for example 2026-11-03T06:00:00-06:00).
// They are shown as the wall-clock time at the origin, independent of the browser's zone.

/**
 * Read the UTC offset of an ISO string, in minutes.
 *
 * @param {string} iso - Time with an offset such as '-06:00', or 'Z'.
 * @returns {number} Minutes east of UTC; 0 when there is no offset.
 */
export function parseOffsetMinutes(iso) {
  if (/Z$/.test(iso)) return 0;
  const match = /([+-])(\d{2}):(\d{2})$/.exec(iso);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

/**
 * Read the wall-clock fields of a moment at a given offset.
 *
 * @param {Date} date - The moment.
 * @param {number} offsetMinutes - Offset to apply, in minutes.
 * @returns {{day: number, hour: number, minute: number, shifted: Date}}
 */
export function wallClock(date, offsetMinutes) {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  return {
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    shifted,
  };
}

/**
 * Left-pad a number to two digits.
 *
 * @param {number} n
 * @returns {string}
 */
const pad = (n) => String(n).padStart(2, '0');

/**
 * Short weekday name in the given locale.
 *
 * @param {Date} shifted - Date whose UTC fields are the wall clock.
 * @param {string} intlLocale - Locale tag.
 * @returns {string}
 */
function weekday(shifted, intlLocale) {
  return new Intl.DateTimeFormat(intlLocale, { weekday: 'short', timeZone: 'UTC' }).format(shifted);
}

/**
 * Format the origin's wall-clock time as HH:MM (24 hours).
 *
 * @param {string} iso - Time with an offset.
 * @returns {string}
 */
export function formatClock(iso) {
  const reading = wallClock(new Date(iso), parseOffsetMinutes(iso));
  return `${pad(reading.hour)}:${pad(reading.minute)}`;
}

/**
 * Format the origin's weekday and time, such as 'Tue 06:00'.
 *
 * @param {string} iso - Time with an offset.
 * @param {string} [intlLocale='en-US'] - Locale tag for the weekday name.
 * @returns {string}
 */
export function formatWeekdayClock(iso, intlLocale = 'en-US') {
  const reading = wallClock(new Date(iso), parseOffsetMinutes(iso));
  return `${weekday(reading.shifted, intlLocale)} ${pad(reading.hour)}:${pad(reading.minute)}`;
}

/**
 * Label a forecast hour in the origin's wall clock.
 *
 * @param {string} baseIso - Forecast base, in UTC.
 * @param {number} hour - Hours after the base.
 * @param {number} offsetMinutes - Origin offset in minutes.
 * @param {string} [intlLocale='en-US'] - Locale tag for the weekday name.
 * @returns {string} For example 'Mon 16:00'.
 */
export function forecastHourLabel(baseIso, hour, offsetMinutes, intlLocale = 'en-US') {
  const moment = new Date(new Date(baseIso).getTime() + hour * 3_600_000);
  const reading = wallClock(moment, offsetMinutes);
  return `${weekday(reading.shifted, intlLocale)} ${pad(reading.hour)}:00`;
}

/**
 * Convert an ISO time into the value of a datetime-local input.
 *
 * @param {string} iso
 * @returns {string} For example '2026-11-03T06:00'.
 */
export function toLocalInput(iso) {
  return iso.slice(0, 16);
}

/**
 * Build an ISO time from a datetime-local value and an offset.
 *
 * @param {string} value - Value of a datetime-local input.
 * @param {string} offsetIso - Offset such as '-06:00'.
 * @returns {string} For example '2026-11-03T06:00:00-06:00'.
 */
export function fromLocalInput(value, offsetIso) {
  return `${value}:00${offsetIso}`;
}
