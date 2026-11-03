/**
 * @file Forecast hour slider with play, corridor bar and time labels.
 *
 * English: Dragging or playing only changes the hour; the truck, the cloud
 * and the corridor are recalculated from data the API already sent.
 *
 * Español: Arrastrar o reproducir solo cambia la hora; el camión, la nube y el
 * corredor se recalculan con datos que la API ya envió.
 */

import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { Icon } from '../icons.jsx';
import { levelColor } from '../domain/risk.js';
import { forecastHourLabel, parseOffsetMinutes } from '../domain/time.js';
import { corridorAt, routeLabel } from '../domain/trip.js';

/**
 * Last hour of the forecast window (48).
 *
 * English: The API covers 48 hours; the slider cannot go past it.
 *
 * Español: La API cubre 48 horas; el slider no puede pasar de ahí.
 *
 * @type {number}
 */
export const MAX_HOUR = 48;
const PLAY_MS = 500;

/**
 * Hour slider with play and the corridor risk bar.
 *
 * English: Play advances one hour every PLAY_MS milliseconds and stops at MAX_HOUR.
 *
 * Español: Reproducir avanza una hora cada PLAY_MS milisegundos y se detiene en MAX_HOUR.
 *
 * @param {Object} props
 * @param {Object} props.result - Evaluated trip from the API.
 * @param {Object} props.route - Route the corridor describes.
 * @param {number} props.hour - Current forecast hour (0 to 48).
 * @param {Function} props.onHour - Receives a new hour or an updater function.
 */
export default function HourSlider({ result, route, hour, onHour }) {
  const { t, intlLocale, theme } = useI18n();
  const [playing, setPlaying] = useState(false);
  const offset = parseOffsetMinutes(result.departure);

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => onHour((h) => Math.min(h + 1, MAX_HOUR)), PLAY_MS);
    return () => clearInterval(id);
  }, [playing, onHour]);

  // Stop at the end of the window instead of leaving the truck parked.
  useEffect(() => {
    if (playing && hour >= MAX_HOUR) setPlaying(false);
  }, [hour, playing]);

  const cells = corridorAt(route, hour);
  const routeName = routeLabel(route.id, t);

  return (
    <div className="slider panel">
      <div className="slider__row">
        <button
          type="button"
          className={`btn btn--icon ${playing ? 'btn--on' : ''}`}
          aria-label={playing ? t('slider.pause') : t('slider.play')}
          aria-pressed={playing}
          onClick={() => {
            if (!playing && hour >= MAX_HOUR) onHour(0);
            setPlaying((p) => !p);
          }}
        >
          {playing ? <Icon.Pause size={16} /> : <Icon.Play size={16} />}
        </button>
        <output className="slider__clock" htmlFor="forecast-hour">
          {t('slider.clock', {
            hours: hour,
            when: forecastHourLabel(result.forecast_base, hour, offset, intlLocale),
          })}
        </output>
        <input
          id="forecast-hour"
          type="range"
          min="0"
          max={MAX_HOUR}
          step="1"
          value={hour}
          aria-label={t('slider.label')}
          aria-valuetext={t('slider.valueText', { hours: hour })}
          onChange={(event) => {
            setPlaying(false);
            onHour(Number(event.target.value));
          }}
        />
      </div>

      <div className="slider__corridor">
        <span className="slider__label">
          <Icon.Wind size={14} />
          {t('slider.corridor', { route: routeName })}
        </span>
        <div className="corridor" role="img" aria-label={t('slider.corridorAria', { route: routeName, hours: hour })}>
          {cells.map((level, index) => (
            <span key={index} title={t(`risk.${level}`)} style={{ background: levelColor(level, theme) }} />
          ))}
        </div>
        <div className="axis" aria-hidden="true">
          <span>0h</span><span>12h</span><span>24h</span><span>36h</span><span>48h</span>
        </div>
      </div>
    </div>
  );
}
