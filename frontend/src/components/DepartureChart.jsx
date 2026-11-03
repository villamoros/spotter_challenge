/**
 * @file Time-by-distance chart of departures and the recommended departures list.
 *
 * English: Columns are departure hours, rows are checkpoints. A diagonal is a
 * truck that leaves later and reaches each point later.
 *
 * Español: Las columnas son horas de salida y las filas son checkpoints. Una
 * diagonal es un camión que sale más tarde y llega más tarde a cada punto.
 */

import { useI18n } from '../i18n/I18nProvider.jsx';
import { Icon } from '../icons.jsx';
import { levelFromCode, levelColor, formatLoad, formatMiles } from '../domain/risk.js';
import { cleanDepartures, mareyGrid, routeLabel } from '../domain/trip.js';
import { formatClock, formatWeekdayClock } from '../domain/time.js';
import { errorText } from '../i18n/errorText.js';

/**
 * Render the departures chart for the selected route.
 *
 * English: Shows a loading message until the departures arrive, and the
 * error text if they fail.
 *
 * Español: Muestra un mensaje de carga hasta que llegan las salidas, y el
 * texto de error si fallan.
 *
 * @param {Object} props
 * @param {Object} props.result - Evaluated trip from the API.
 * @param {Object|null} props.departures - Response of the departures endpoint.
 * @param {Error|null} props.error - Error from the departures request.
 * @param {string|null} props.selectedId - Route whose column is drawn.
 * @param {Function} props.onSelectRoute - Called with a route id.
 * @param {Function} props.onUseDeparture - Called with the chosen departure time.
 * @param {boolean} props.busy - True while a request is running.
 */
export default function DepartureChart({ result, departures, error, selectedId, onSelectRoute, onUseDeparture, busy }) {
  const { t, intlLocale, theme } = useI18n();

  if (error) {
    return (
      <Panel>
        <p className="note">{t('departures.error', { message: errorText(error, t) })}</p>
      </Panel>
    );
  }
  if (!departures) {
    return <Panel><p className="note">{t('departures.loading')}</p></Panel>;
  }

  const grid = mareyGrid(departures, selectedId);
  const clean = cleanDepartures(departures.columns);
  const route = result.routes.find((r) => r.id === selectedId);
  const columns = Math.max(grid.columns.length, 1);
  const template = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };

  // CSS Grid fills row by row, so iterate from the destination row down, and within each row by departure.
  const cells = [];
  for (let row = grid.rows - 1; row >= 0; row--) {
    grid.columns.forEach((column) => {
      cells.push({
        key: `${column.departure}-${row}`,
        level: levelFromCode(column.levels[row]),
        dim: !column.clean,
        title: t('departures.cell', {
          when: formatWeekdayClock(column.departure, intlLocale),
          index: row,
        }),
      });
    });
  }

  return (
    <Panel>
      <div className="section-head">
        <h2 id="departures-title" className="section-title">
          <Icon.Calendar size={22} />
          {t('departures.title')}
        </h2>
        <div className="tabs" role="group" aria-label={t('routes.count', { count: result.routes.length })}>
          {result.routes.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`btn btn--small ${r.id === selectedId ? 'btn--on' : ''}`}
              aria-pressed={r.id === selectedId}
              onClick={() => onSelectRoute(r.id)}
            >
              {routeLabel(r.id, t)}
            </button>
          ))}
        </div>
      </div>

      <div className="marey">
        <div className="marey__axis" aria-hidden="true">
          <span>{t('departures.axisDestination')}</span>
          <span>{route ? formatMiles(route.distance_miles, t) : ''}</span>
          <span>{t('departures.axisOrigin')}</span>
        </div>
        <div>
          <div className="marey__plot" style={{ ...template, gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))` }}>
            {cells.map((cell) => (
              <span
                key={cell.key}
                className={cell.dim ? 'marey__cell--dim' : ''}
                style={{ background: levelColor(cell.level, theme) }}
                title={cell.title}
              />
            ))}
          </div>
          <div className="marey__time" style={template} aria-hidden="true">
            {grid.columns.map((column, index) => (
              <span key={column.departure}>{index % 6 === 0 ? formatClock(column.departure) : ''}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="departures">
        <p className="kicker">
          <Icon.Clock size={14} />
          {t('departures.recommended')}
        </p>
        {clean.length === 0 && <p className="note">{t('departures.none')}</p>}
        <ul className="departure-list">
          {clean.slice(0, 4).map((c) => (
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
              <button type="button" className="btn btn--small" disabled={busy} onClick={() => onUseDeparture(c.departure)}>
                <Icon.ArrowRight size={14} />
                {t('departures.use')}
              </button>
            </li>
          ))}
        </ul>
        <p className="note">
          {t('departures.summary', {
            load: formatLoad(result.load_lb, intlLocale, t),
            window: departures.window_hours,
            step: departures.step_hours,
          })}
        </p>
      </div>
    </Panel>
  );
}

/**
 * Card wrapper for the departures section.
 *
 * English: Keeps the aria-labelledby link to the section title.
 *
 * Español: Mantiene el enlace aria-labelledby con el título de la sección.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Section content.
 */
function Panel({ children }) {
  return <section className="panel" aria-labelledby="departures-title">{children}</section>;
}
