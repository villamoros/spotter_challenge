/**
 * @file Summary bar of the current trip with edit and recalculate actions.
 *
 * Español: Barra con el resumen del viaje actual y las acciones de editar y recalcular.
 */

import { useI18n } from '../i18n/I18nProvider.jsx';
import { Icon } from '../icons.jsx';
import { formatLoad } from '../domain/risk.js';
import { formatWeekdayClock } from '../domain/time.js';

/**
 * Show origin, destination, departure and load, with two actions.
 *
 * @param {Object} props
 * @param {Object} props.trip - Saved trip from the API.
 * @param {boolean} props.busy - True while a request is running.
 * @param {Function} props.onEdit - Opens the trip form.
 * @param {Function} props.onRescore - Recalculates the trip with the same inputs.
 */
export default function TripBar({ trip, busy, onEdit, onRescore }) {
  const { t, intlLocale } = useI18n();
  return (
    <div className="tripbar">
      <div className="tripbar__route">
        <span className="tripbar__place">
          <Icon.MapPin size={16} />
          {trip.origin}
        </span>
        <Icon.ArrowRight size={16} className="tripbar__arrow" />
        <span className="tripbar__place">
          <Icon.MapPin size={16} />
          {trip.destination}
        </span>
      </div>

      <div className="tripbar__facts">
        <span>
          <Icon.Clock size={16} />
          {formatWeekdayClock(trip.departure, intlLocale)}
        </span>
        <span>
          <Icon.Weight size={16} />
          {formatLoad(trip.load_lb, intlLocale, t)}
        </span>
      </div>

      <div className="tripbar__actions">
        <button type="button" className="btn btn--ghost" onClick={onEdit}>
          <Icon.Pencil size={15} />
          {t('trip.edit')}
        </button>
        <button type="button" className="btn" onClick={onRescore} disabled={busy}>
          <Icon.RefreshCw size={15} />
          {t('trip.recalculate')}
        </button>
      </div>
    </div>
  );
}
