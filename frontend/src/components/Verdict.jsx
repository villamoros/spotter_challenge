/**
 * @file Recommendation summary: the verdict, the criteria table and the no-safe-route state.
 *
 * English: The explanation names the criterion that decided the ranking, so
 * the user can check the logic on screen.
 *
 * Español: La explicación nombra el criterio que decidió el ranking, para que el
 * usuario pueda comprobar la lógica en pantalla.
 */

import { useI18n } from '../i18n/I18nProvider.jsx';
import { Icon } from '../icons.jsx';
import { CRITERIA, criteriaTable, decidingCriterion, cleanDepartures, recommendedRoute, routeLabel } from '../domain/trip.js';
import { formatDuration, formatLoad, formatMiles } from '../domain/risk.js';
import { formatWeekdayClock } from '../domain/time.js';

/**
 * Explain which criterion decided the recommendation.
 *
 * English: Compares the winner with the runner-up and names the first
 * criterion where they differ.
 *
 * Español: Compara la ganadora con la segunda y nombra el primer criterio en
 * el que difieren.
 *
 * @param {Object} result - Evaluated trip from the API.
 * @param {Function} t - Translator.
 * @returns {string} The sentence to show.
 */
function decisionSentence(result, t) {
  const recommended = recommendedRoute(result);
  const runnerUp = result.routes.find((r) => r.id === result.ranking[1]);
  if (!recommended) return '';
  if (!runnerUp) return t('verdict.onlyRoute');

  const key = decidingCriterion(result);
  const criterion = CRITERIA.find((c) => c.key === key);
  if (!criterion) return t('verdict.tie');

  return t('verdict.decision', {
    criterion: t(criterion.nameKey),
    mine: criterion.format(criterion.value(recommended), t),
    theirs: criterion.format(criterion.value(runnerUp), t),
  });
}

/**
 * Render the recommendation, or the no-safe-route state when there is none.
 *
 * @param {Object} props
 * @param {Object} props.result - Evaluated trip from the API.
 * @param {Object|null} props.departures - Departures response, if loaded.
 * @param {Error|null} props.departuresError - Error from the departures request.
 * @param {Function} props.onUseDeparture - Called with a departure time.
 */
export default function Verdict({ result, departures, onUseDeparture, departuresError }) {
  const { t, intlLocale } = useI18n();
  const recommended = recommendedRoute(result);

  if (!recommended) {
    return (
      <NoSafeRoute
        result={result}
        departures={departures}
        departuresError={departuresError}
        onUseDeparture={onUseDeparture}
      />
    );
  }

  const table = criteriaTable(result, t);
  const recommendedName = routeLabel(recommended.id, t);
  return (
    <section className="verdict panel" aria-labelledby="verdict-title">
      <div className="verdict__head">
        <p className="kicker">
          <Icon.ShieldCheck size={14} />
          {t('verdict.kicker', {
            when: formatWeekdayClock(result.departure, intlLocale),
            load: formatLoad(result.load_lb, intlLocale, t),
          })}
        </p>
        <h2 id="verdict-title" className="verdict__title">
          {t('verdict.title', { route: recommendedName })}
        </h2>
        <p className="verdict__lede">
          {t('verdict.lede', {
            severe: formatMiles(recommended.severe_miles, t),
            high: formatMiles(recommended.high_miles, t),
            duration: formatDuration(recommended.duration_minutes, t),
          })}{' '}
          {decisionSentence(result, t)}
        </p>
      </div>

      <div className="tbl-wrap">
        <table className="criteria">
          <caption className="kicker">{t('verdict.tableTitle')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('verdict.criterion')}</th>
              {result.routes.map((r) => (
                <th scope="col" key={r.id} className={r.id === recommended.id ? 'is-rec' : ''}>
                  {routeLabel(r.id, t)}
                  {r.id === recommended.id && <Icon.Check size={14} className="inline-icon" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.key} className={row.deciding ? 'is-deciding' : ''}>
                <th scope="row">
                  {row.label}
                  {row.deciding && <span className="tag">{t('verdict.deciding')}</span>}
                </th>
                {row.cells.map((cell) => (
                  <td key={cell.routeId} className={cell.recommended ? 'is-rec' : ''}>{cell.text}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {departuresError && <p className="note">{t('verdict.departuresError')}</p>}
      <p className="note">{t('verdict.note')}</p>
    </section>
  );
}

/**
 * Show that no route is safe and offer the nearest departures that are.
 *
 * @param {Object} props
 * @param {Object} props.result - Evaluated trip from the API.
 * @param {Object|null} props.departures - Departures response, if loaded.
 * @param {Error|null} props.departuresError - Error from the departures request.
 * @param {Function} props.onUseDeparture - Called with a departure time.
 */
function NoSafeRoute({ result, departures, departuresError, onUseDeparture }) {
  const { t, intlLocale } = useI18n();
  const clean = departures ? cleanDepartures(departures.columns).slice(0, 3) : [];
  return (
    <section className="verdict verdict--alert panel" aria-labelledby="verdict-title">
      <div className="verdict__head">
        <p className="kicker">
          <Icon.Ban size={14} />
          {t('verdict.noSafeKicker', { when: formatWeekdayClock(result.departure, intlLocale) })}
        </p>
        <h2 id="verdict-title" className="verdict__title">{t('verdict.noSafeTitle')}</h2>
        <p className="verdict__lede">{t('verdict.noSafeLede', { count: result.routes.length })}</p>
      </div>

      <h3 className="kicker">{t('verdict.earliest')}</h3>
      {departuresError && <p className="note">{t('verdict.departuresError')}</p>}
      {!departures && !departuresError && <p className="note">{t('verdict.searching')}</p>}
      {departures && clean.length === 0 && <p className="note">{t('verdict.noneClean')}</p>}
      <ul className="departure-list">
        {clean.map((c) => (
          <li key={c.departure}>
            <div>
              <strong>{formatWeekdayClock(c.departure, intlLocale)}</strong>
              <span className="note">
                {' · '}
                {t('verdict.departureSummary', {
                  route: routeLabel(c.recommended_route_id, t),
                  severe: c.routes[c.recommended_route_id].severe_miles,
                })}
              </span>
            </div>
            <button type="button" className="btn btn--small" onClick={() => onUseDeparture(c.departure)}>
              <Icon.ArrowRight size={14} />
              {t('verdict.useDeparture')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
