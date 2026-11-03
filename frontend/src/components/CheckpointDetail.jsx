/**
 * @file Detail panel for one checkpoint.
 *
 * English: Shows the arrival time, the level, the wind, rain and snow, and
 * the load rule that changed the decision.
 *
 * Español: Muestra la hora de llegada, el nivel, el viento, la lluvia y la
 * nieve, y la regla de carga que cambió la decisión.
 */

import { useI18n } from '../i18n/I18nProvider.jsx';
import { Icon } from '../icons.jsx';
import { levelColor, formatLoad } from '../domain/risk.js';
import { formatClock, formatWeekdayClock } from '../domain/time.js';
import { routeLabel } from '../domain/trip.js';

/**
 * Return the translation key of the load rule that applies, if any.
 *
 * English: Only wind decisions can be caused by the load. Wind of 45 to 54
 * mph above 30,000 lb is No Travel; wind of 35 to 44 mph above 40,000 lb is Severe.
 *
 * Español: Solo las decisiones por viento dependen de la carga. Viento de
 * 45 a 54 mph con más de 30,000 lb es No viajar; viento de 35 a 44 mph con
 * más de 40,000 lb es Severo.
 *
 * @param {{driver: string, wind_mph: number}} checkpoint - Checkpoint from the API.
 * @param {number} loadLb - Cargo weight in pounds.
 * @returns {string|null} A translation key, or null when no rule applies.
 */
export function loadRuleKey(checkpoint, loadLb) {
  if (checkpoint.driver !== 'wind' || checkpoint.wind_mph == null) return null;
  const wind = checkpoint.wind_mph;
  if (wind >= 45 && wind < 55 && loadLb > 30000) return 'checkpoint.ruleNoTravel';
  if (wind >= 35 && wind < 45 && loadLb > 40000) return 'checkpoint.ruleSevere';
  return null;
}

/**
 * Detail panel of one checkpoint, drawn over the map.
 *
 * English: Shows nothing for hours beyond the forecast; the note explains
 * why they do not count.
 *
 * Español: Para las horas fuera del pronóstico no muestra valores; la nota
 * explica por qué no cuentan.
 *
 * @param {Object} props
 * @param {Object} props.route - The route that owns the checkpoint.
 * @param {number} props.index - Position of the checkpoint in the route.
 * @param {number} props.loadLb - Cargo weight in pounds.
 * @param {Function} props.onClose - Called when the user closes the panel.
 */
export default function CheckpointDetail({ route, index, loadLb, onClose }) {
  const { t, intlLocale, theme } = useI18n();
  const cp = route.checkpoints[index];
  const ruleKey = loadRuleKey(cp, loadLb);
  const unknown = cp.level === 'unknown';
  const driverText = cp.driver ? t(`driver.${cp.driver}`) : null;

  return (
    <aside className="detail panel" aria-labelledby="detail-title">
      <div className="detail__head">
        <h2 id="detail-title" className="section-title">
          {t('checkpoint.title', { mile: Math.round(cp.mile), route: routeLabel(route.id, t) })}
        </h2>
        <button type="button" className="btn btn--icon btn--flat" aria-label={t('checkpoint.close')} onClick={onClose}>
          <Icon.X size={16} />
        </button>
      </div>
      <p className="note">
        {t('checkpoint.arrival', {
          when: formatWeekdayClock(cp.eta, intlLocale),
          clock: formatClock(cp.eta),
        })}
      </p>

      <p className="detail__level" style={{ background: levelColor(cp.level, theme), color: theme === 'dark' ? '#14130f' : '#201f1d' }}>
        {t(`risk.${cp.level}`)}
        {driverText && <span> · {t('checkpoint.decides', { driver: driverText })}</span>}
      </p>

      {!unknown && (
        <dl className="detail__values">
          <div><dt><Icon.Wind size={15} />{t('checkpoint.wind')}</dt><dd>{cp.wind_mph} {t('unit.mph')}</dd></div>
          <div><dt><Icon.CloudRain size={15} />{t('checkpoint.rain')}</dt><dd>{cp.rain_in_h} {t('unit.inHour')}</dd></div>
          <div><dt><Icon.Snowflake size={15} />{t('checkpoint.snow')}</dt><dd>{cp.snow_in_h} {t('unit.inHour')}</dd></div>
        </dl>
      )}
      {unknown && <p className="note">{t('checkpoint.unknown')}</p>}

      {ruleKey && (
        <p className="detail__rule">
          <Icon.Gauge size={15} />
          {t(ruleKey)}
        </p>
      )}
      <p className="note">{t('checkpoint.loadNote', { load: formatLoad(loadLb, intlLocale, t) })}</p>
    </aside>
  );
}
