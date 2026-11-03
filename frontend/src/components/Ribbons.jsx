/**
 * @file Risk ribbons: each route unrolled into one strip of checkpoint cells.
 *
 * English: The load buttons ask the server to recalculate the trip with
 * another load, so the decision changes for real.
 *
 * Español: Los botones de carga piden al servidor que recalcule el viaje con
 * otra carga, así la decisión cambia de verdad.
 */

import { useI18n } from '../i18n/I18nProvider.jsx';
import { Icon } from '../icons.jsx';
import { levelColor, formatMiles, formatLoadShort } from '../domain/risk.js';
import { routeLabel } from '../domain/trip.js';

/**
 * Loads offered by the simulation buttons, in pounds.
 *
 * @type {number[]}
 */
const LOAD_STEPS = [25000, 30000, 41000, 50000];

/**
 * Render one ribbon per route and the load simulation buttons.
 *
 * English: The buttons are disabled while a request is running.
 *
 * Español: Los botones se desactivan mientras hay una petición en curso.
 *
 * @param {Object} props
 * @param {Object} props.result - Evaluated trip from the API.
 * @param {string|null} props.selectedId - Route highlighted in the list.
 * @param {Function} props.onSelect - Called with a route id.
 * @param {Function} props.onLoadChange - Called with a load in pounds.
 * @param {boolean} props.busy - True while a request is running.
 */
export default function Ribbons({ result, selectedId, onSelect, onLoadChange, busy }) {
  const { t, theme } = useI18n();
  return (
    <section className="ribbons panel" aria-labelledby="ribbons-title">
      <div className="section-head">
        <h2 id="ribbons-title" className="section-title">{t('ribbons.title')}</h2>
        <p className="note">{t('ribbons.note')}</p>
      </div>

      <ul className="ribbons__rows">
        {result.routes.map((route) => (
          <li key={route.id}>
            <button
              type="button"
              className={`ribbons__row ${route.id === selectedId ? 'ribbons__row--sel' : ''}`}
              onClick={() => onSelect(route.id)}
              aria-pressed={route.id === selectedId}
            >
              <span className="ribbons__name">{routeLabel(route.id, t)}</span>
              <span className="ribbons__strip">
                {route.checkpoints.map((cp) => (
                  <span key={cp.index} style={{ background: levelColor(cp.level, theme) }} title={`${t('unit.mi')} ${cp.mile}`} />
                ))}
              </span>
              <span className="ribbons__count">
                {t('ribbons.counts', { severe: formatMiles(route.severe_miles, t), high: formatMiles(route.high_miles, t) })}
                {!route.eligible && (
                  <strong className="ribbons__warn"> · <Icon.Ban size={13} /> {t('routes.notViable')}</strong>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="whatif">
        <span className="kicker">
          <Icon.Weight size={14} />
          {t('ribbons.simulate')}
        </span>
        <div className="presets" role="group" aria-label={t('ribbons.simulate')}>
          {LOAD_STEPS.map((pounds) => (
            <button
              key={pounds}
              type="button"
              className={`btn btn--small ${Math.round(result.load_lb) === pounds ? 'btn--on' : ''}`}
              disabled={busy}
              onClick={() => onLoadChange(pounds)}
            >
              {formatLoadShort(pounds)}
            </button>
          ))}
        </div>
        <p className="note">{t('ribbons.simulateNote')}</p>
      </div>
    </section>
  );
}
