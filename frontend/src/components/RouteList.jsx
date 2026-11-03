/**
 * @file Route cards with their mini risk ribbon, and the risk legend.
 *
 * English: The card shows the reasons a route is blocked, using translated
 * codes; old saved trips show their stored text.
 *
 * Español: La tarjeta muestra los motivos de bloqueo con códigos traducidos;
 * los viajes guardados antiguos muestran su texto original.
 */

import { useI18n } from '../i18n/I18nProvider.jsx';
import { Icon } from '../icons.jsx';
import { LEVEL_ORDER, levelColor, formatDuration, formatMiles } from '../domain/risk.js';
import { recommendedRoute, routeLabel } from '../domain/trip.js';

/**
 * List the routes of a trip.
 *
 * English: The card of the selected route is highlighted and the others
 * show their rank among the eligible routes.
 *
 * Español: La tarjeta de la ruta seleccionada se resalta y las demás muestran
 * su puesto entre las rutas elegibles.
 *
 * @param {Object} props
 * @param {Object} props.result - Evaluated trip from the API.
 * @param {string|null} props.selectedId - Route highlighted in the list.
 * @param {Function} props.onSelect - Called with a route id.
 */
export default function RouteList({ result, selectedId, onSelect }) {
  const { t, theme } = useI18n();
  const recommended = recommendedRoute(result);

  function badge(route, isRec) {
    if (!route.eligible) {
      // Trips saved before the code-based API show their stored text unchanged.
      const reasons = route.blocked_reasons
        .map((code) => (t(`reason.${code}`) === `reason.${code}` ? code : t(`reason.${code}`)))
        .join(', ');
      return t('routes.notViable') + (reasons ? `: ${reasons}` : '');
    }
    if (isRec) return t('routes.recommended');
    return t('routes.viable', { place: result.ranking.indexOf(route.id) + 1 });
  }

  return (
    <section className="routelist panel" aria-label={t('routes.count', { count: result.routes.length })}>
      <p className="kicker">{t('routes.count', { count: result.routes.length })}</p>
      <p className="note">{t('routes.note')}</p>
      <ul className="routelist__items">
        {result.routes.map((route) => {
          const isRec = recommended?.id === route.id;
          const isSel = selectedId === route.id;
          return (
            <li key={route.id}>
              <button
                type="button"
                className={`routecard ${isRec ? 'routecard--rec' : ''} ${isSel ? 'routecard--sel' : ''}`}
                aria-pressed={isSel}
                onClick={() => onSelect(route.id)}
              >
                <span className="routecard__head">
                  <span className="routecard__name">{routeLabel(route.id, t)}</span>
                  {route.eligible ? (
                    isRec ? <Icon.ShieldCheck size={16} /> : <Icon.Route size={16} />
                  ) : (
                    <Icon.Ban size={16} />
                  )}
                </span>
                <span className={`routecard__badge ${route.eligible ? '' : 'routecard__badge--out'}`}>
                  {badge(route, isRec)}
                </span>
                <span className="ribbon" aria-hidden="true">
                  {route.checkpoints.map((cp) => (
                    <span key={cp.index} style={{ background: levelColor(cp.level, theme) }} />
                  ))}
                </span>
                <span className="routecard__meta">
                  {t('routes.meta', {
                    duration: formatDuration(route.duration_minutes, t),
                    severe: formatMiles(route.severe_miles, t),
                    high: formatMiles(route.high_miles, t),
                  })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Legend />
    </section>
  );
}

/**
 * Colour key for the risk levels.
 *
 * English: Uses the palette of the current theme.
 *
 * Español: Usa la paleta del tema actual.
 */
export function Legend() {
  const { t, theme } = useI18n();
  return (
    <ul className="legend" aria-label={t('risk.scale')}>
      {LEVEL_ORDER.map((level) => (
        <li key={level}>
          <span className="legend__swatch" style={{ background: levelColor(level, theme) }} aria-hidden="true" />
          {t(`risk.${level}`)}
        </li>
      ))}
    </ul>
  );
}
