/**
 * @file Top bar with the brand, the language switch and the light/dark toggle.
 *
 * Español: Barra superior con la marca, el selector de idioma y el interruptor claro/oscuro.
 */

import { useI18n } from '../i18n/I18nProvider.jsx';
import { LOCALES } from '../i18n/messages.js';
import { Icon } from '../icons.jsx';

/**
 * Short labels for each locale in the language switch.
 *
 * @type {Object<string, string>}
 */
const LOCALE_NAMES = { en: 'EN', es: 'ES' };

/**
 * Render the brand and the two controls.
 *
 * English: The theme button shows the mode it will switch to.
 *
 * Español: El botón de tema muestra el modo al que cambiará.
 *
 * @returns {JSX.Element}
 */
export default function TopBar() {
  const { t, locale, setLocale, theme, toggleTheme } = useI18n();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <div className="topbar">
      <div className="topbar__brand">
        <Icon.Truck size={20} />
        <span>{t('app.name')}</span>
      </div>

      <div className="topbar__controls">
        <div className="segmented" role="group" aria-label={t('lang.label')}>
          <Icon.Languages size={15} />
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              className="segmented__item"
              aria-pressed={locale === code}
              onClick={() => setLocale(code)}
            >
              {LOCALE_NAMES[code]}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn--icon"
          onClick={toggleTheme}
          aria-label={nextTheme === 'dark' ? t('theme.switchToDark') : t('theme.switchToLight')}
          title={nextTheme === 'dark' ? t('theme.switchToDark') : t('theme.switchToLight')}
        >
          {theme === 'dark' ? <Icon.Sun size={17} /> : <Icon.Moon size={17} />}
        </button>
      </div>
    </div>
  );
}
