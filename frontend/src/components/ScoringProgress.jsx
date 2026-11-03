/**
 * @file Waiting state shown while a trip is being calculated.
 *
 * English: The API answers in a single request, so no fake percentage is shown.
 *
 * Español: La API responde en una sola petición, así que no se muestra un porcentaje falso.
 */

import { useI18n } from '../i18n/I18nProvider.jsx';
import { Icon } from '../icons.jsx';

/**
 * Translation keys of the steps shown while waiting.
 *
 * @type {string[]}
 */
const STEPS = ['progress.geocode', 'progress.routes', 'progress.forecast', 'progress.rules', 'progress.rank'];

/**
 * Render the waiting panel with its steps and an indeterminate bar.
 *
 * @returns {JSX.Element}
 */
export default function ScoringProgress() {
  const { t } = useI18n();
  return (
    <section className="progress panel" aria-live="polite" aria-busy="true">
      <h2 className="progress__title">
        <Icon.Compass size={26} />
        {t('progress.title')}
      </h2>
      <ol className="progress__steps">
        {STEPS.map((key) => (
          <li key={key}>
            <Icon.ChevronRight size={14} />
            {t(key)}
          </li>
        ))}
      </ol>
      <div className="progress__bar" aria-hidden="true"><span /></div>
      <p className="note">{t('progress.note')}</p>
    </section>
  );
}
