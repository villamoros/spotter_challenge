/**
 * @file Dialog to plan or edit a trip.
 *
 * English: Validation returns translation keys, so the messages follow the
 * selected language. Server error codes are translated the same way.
 *
 * Español: La validación devuelve claves de traducción, así los mensajes siguen
 * el idioma elegido. Los códigos de error del servidor se traducen igual.
 */

import { useState } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { Icon } from '../icons.jsx';
import { formatLoadShort } from '../domain/risk.js';
import { fromLocalInput, parseOffsetMinutes, toLocalInput } from '../domain/time.js';

/**
 * Time zones offered for the origin, with their translation keys.
 *
 * @type {{value: string, labelKey: string}[]}
 */
export const TIME_ZONES = [
  { value: '-05:00', labelKey: 'zone.eastern' },
  { value: '-06:00', labelKey: 'zone.central' },
  { value: '-07:00', labelKey: 'zone.mountain' },
  { value: '-08:00', labelKey: 'zone.pacific' },
];

/**
 * Common loads offered as shortcut buttons, in pounds.
 *
 * @type {number[]}
 */
const LOAD_PRESETS = [1000, 20000, 30000, 41000, 80000];

/**
 * Check the form values and return a translation key per invalid field.
 *
 * @param {{origin: string, destination: string, departure: string, load_lb: string}} values
 * @returns {Object<string, string>} Field name to translation key; empty when valid.
 */
export function validateForm(values) {
  const errors = {};
  if (!values.origin.trim()) errors.origin = 'field.origin.required';
  if (!values.destination.trim()) errors.destination = 'field.destination.required';
  if (!values.departure) errors.departure = 'field.departure.required';
  const load = Number(values.load_lb);
  if (!Number.isFinite(load) || load < 1 || load > 200000) errors.load_lb = 'field.load.range';
  return errors;
}

/**
 * Options for the time-zone select, including the trip's own offset.
 *
 * English: An offset that is not in the list is shown as it is, never
 * replaced silently.
 *
 * Español: Un desfase que no está en la lista se muestra tal cual, nunca se
 * reemplaza en silencio.
 *
 * @param {string} current - Offset of the trip, such as '-06:00'.
 * @param {Function} t - Translator.
 * @returns {{value: string, label: string}[]}
 */
function zoneOptions(current, t) {
  const known = TIME_ZONES.map((z) => ({ value: z.value, label: t(z.labelKey) }));
  if (TIME_ZONES.some((z) => z.value === current)) return known;
  return [{ value: current, label: t('zone.custom', { offset: current }) }, ...known];
}

/**
 * Default departure: tomorrow at 06:00 in the browser's date.
 *
 * @returns {string} A value for datetime-local, such as '2026-11-03T06:00'.
 */
function tomorrowAtSix() {
  const day = new Date();
  day.setDate(day.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T06:00`;
}

/**
 * Dialog for creating or editing a trip.
 *
 * @param {Object} props
 * @param {Object} [props.trip] - Trip being edited; omitted for a new trip.
 * @param {Object<string, string>} [props.serverFields] - Field error codes from the server.
 * @param {boolean} props.busy - True while a request is running.
 * @param {Function} props.onSubmit - Receives the validated values.
 * @param {Function} props.onCancel - Closes the dialog.
 */
export default function TripForm({ trip, serverFields = {}, busy, onSubmit, onCancel }) {
  const { t } = useI18n();
  const [values, setValues] = useState({
    origin: trip?.origin ?? '',
    destination: trip?.destination ?? '',
    departure: trip ? toLocalInput(trip.departure) : tomorrowAtSix(),
    offset: trip ? offsetOf(trip.departure) : '-06:00',
    load_lb: trip ? String(Math.round(trip.load_lb)) : '41000',
  });
  const [errors, setErrors] = useState({});

  const change = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));

  function submit(event) {
    event.preventDefault();
    const problems = validateForm(values);
    setErrors(problems);
    if (Object.keys(problems).length) return;
    onSubmit({
      origin: values.origin.trim(),
      destination: values.destination.trim(),
      departure: fromLocalInput(values.departure, values.offset),
      load_lb: Number(values.load_lb),
    });
  }

  // Client message first; otherwise the server code for that field.
  const message = (field) => {
    if (errors[field]) return t(errors[field]);
    if (serverFields[field]) return t(`err.${serverFields[field]}`);
    return null;
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="form-title" onSubmit={submit} noValidate>
        <div className="dialog__head">
          <h2 id="form-title" className="dialog__title">{trip ? t('trip.editTitle') : t('trip.newTitle')}</h2>
          <button type="button" className="btn btn--icon" aria-label={t('form.cancel')} onClick={onCancel}>
            <Icon.X size={17} />
          </button>
        </div>

        <Field id="origin" label={t('form.origin')} icon={<Icon.MapPin size={15} />} error={message('origin')}>
          <input id="origin" className="input" value={values.origin} onChange={change('origin')} placeholder={t('form.originPlaceholder')} />
        </Field>
        <Field id="destination" label={t('form.destination')} icon={<Icon.Navigation size={15} />} error={message('destination')}>
          <input id="destination" className="input" value={values.destination} onChange={change('destination')} placeholder={t('form.destinationPlaceholder')} />
        </Field>

        <div className="grid-2">
          <Field id="departure" label={t('form.departure')} icon={<Icon.Calendar size={15} />} error={message('departure')}>
            <input id="departure" type="datetime-local" className="input" value={values.departure} onChange={change('departure')} />
          </Field>
          <Field id="offset" label={t('form.zone')} icon={<Icon.Clock size={15} />}>
            <select id="offset" className="input" value={values.offset} onChange={change('offset')}>
              {zoneOptions(values.offset, t).map((z) => (
                <option key={z.value} value={z.value}>{z.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field id="load_lb" label={t('form.load')} icon={<Icon.Weight size={15} />} error={message('load_lb')}>
          <input id="load_lb" type="number" min="1" max="200000" className="input" value={values.load_lb} onChange={change('load_lb')} />
        </Field>
        <div className="presets" role="group" aria-label={t('form.presets')}>
          {LOAD_PRESETS.map((pounds) => (
            <button
              key={pounds}
              type="button"
              className={`btn btn--small ${Number(values.load_lb) === pounds ? 'btn--on' : ''}`}
              onClick={() => setValues((v) => ({ ...v, load_lb: String(pounds) }))}
            >
              {pounds === 1000 ? t('form.empty') : formatLoadShort(pounds)}
            </button>
          ))}
        </div>
        <p className="note">{t('form.loadNote')}</p>

        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>{t('form.cancel')}</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? t('form.submitBusy') : t('form.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Label, control and error message of one form field.
 *
 * @param {Object} props
 * @param {string} props.id - Id shared by the label and the control.
 * @param {string} props.label - Visible label text.
 * @param {JSX.Element} [props.icon] - Decorative icon shown before the label.
 * @param {string|null} [props.error] - Message shown below the control.
 * @param {React.ReactNode} props.children - The input element.
 */
function Field({ id, label, icon, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        {icon}
        {label}
      </label>
      {children}
      {error && <span className="field-error" id={`${id}-error`}>{error}</span>}
    </div>
  );
}

/**
 * Format a time-zone offset from an ISO string.
 *
 * @param {string} iso - Time with an offset, such as '2026-11-03T06:00:00-06:00'.
 * @returns {string} The offset, such as '-06:00'.
 */
function offsetOf(iso) {
  const minutes = parseOffsetMinutes(iso);
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}
