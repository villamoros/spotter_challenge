/**
 * @file Translated text for an API error.
 *
 * Español: Texto traducido para un error de la API.
 */

/**
 * Return the translated text of an error, using its code.
 *
 * English: Unknown codes fall back to the server's English message.
 *
 * Español: Los códigos desconocidos usan el mensaje en inglés del servidor.
 *
 * @param {Error|null} error - ApiError or any error with a code.
 * @param {Function} t - Translator.
 * @returns {string}
 */
export function errorText(error, t) {
  if (!error) return '';
  const key = `err.${error.code}`;
  const text = t(key);
  if (text !== key) return text;
  return error.message || t('err.unknown');
}
