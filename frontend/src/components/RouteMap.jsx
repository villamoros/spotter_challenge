/**
 * @file Leaflet map of the trip: routes, checkpoints, heat cloud and the moving truck.
 *
 * English: The active route is solid and carries the checkpoints; the other
 * routes are dashed. The truck, the travelled stretch and the cloud follow
 * the active route.
 *
 * Español: La ruta activa es sólida y muestra los checkpoints; las demás son
 * discontinuas. El camión, el tramo recorrido y la nube siguen la ruta activa.
 */

import { useEffect, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { MapContainer, Polyline, CircleMarker, Circle, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { Icon } from '../icons.jsx';
import { levelColor, levelFromCode } from '../domain/risk.js';
import { journeyAt, pointAtFraction } from '../domain/journey.js';

/**
 * Radius of each heat-cloud circle, in metres.
 *
 * @type {number}
 */
const CLOUD_RADIUS_M = 16000;

/**
 * OpenStreetMap tile template; it needs no API key.
 *
 * English: Dark mode inverts these tiles with CSS.
 *
 * Español: El modo oscuro invierte estas teselas con CSS.
 *
 * @type {string}
 */
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
/**
 * Attribution text shown on the map.
 *
 * @type {string}
 */
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';

/**
 * Fit the map view to every route when the routes change.
 *
 * @param {Object} props
 * @param {Object[]} props.routes - Routes whose polylines are fitted.
 */
function FitRoutes({ routes }) {
  const map = useMap();
  useEffect(() => {
    const points = routes.flatMap((r) => r.polyline);
    if (points.length > 1) map.fitBounds(points, { padding: [28, 28] });
  }, [routes, map]);
  return null;
}

/**
 * Add Leaflet's zoom buttons with translated titles.
 *
 * English: Leaflet controls cannot read React context, so the labels come in as props.
 *
 * Español: Los controles de Leaflet no leen el contexto de React, así que las etiquetas llegan como props.
 *
 * @param {Object} props
 * @param {string} props.zoomIn - Title of the zoom-in button.
 * @param {string} props.zoomOut - Title of the zoom-out button.
 */
function ZoomControl({ zoomIn, zoomOut }) {
  const map = useMap();
  useEffect(() => {
    const control = L.control.zoom({ position: 'topright', zoomInTitle: zoomIn, zoomOutTitle: zoomOut });
    control.addTo(map);
    return () => control.remove();
  }, [map, zoomIn, zoomOut]);
  return null;
}

/**
 * Create the truck marker icon for a journey status and theme.
 *
 * English: Memoized so Leaflet does not recreate the marker on every render.
 *
 * Español: Se memoriza para que Leaflet no recree el marcador en cada render.
 *
 * @param {string} status - 'waiting', 'enroute' or 'arrived'.
 * @param {string} theme - 'light' or 'dark'.
 * @returns {L.DivIcon} The icon.
 */
function useTruckIcon(status, theme) {
  return useMemo(
    () =>
      L.divIcon({
        className: `truck-marker truck-marker--${status} truck-marker--${theme}`,
        html: renderToStaticMarkup(<Icon.Truck size={18} strokeWidth={1.5} />),
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
    [status, theme],
  );
}

/**
 * Map of the trip.
 *
 * English: Layers, bottom to top: the routes, the heat cloud for the
 * chosen hour, the checkpoints, the travelled stretch and the truck.
 *
 * Español: Capas, de abajo hacia arriba: las rutas, la nube de calor para la
 * hora elegida, los checkpoints, el tramo recorrido y el camión.
 *
 * @param {Object} props
 * @param {Object} props.result - Evaluated trip from the API.
 * @param {number} props.hour - Forecast hour on the slider.
 * @param {Object} props.activeRoute - Route the screen focuses on.
 * @param {{routeId: string, index: number}|null} props.selectedCheckpoint - Open checkpoint.
 * @param {Function} props.onSelectRoute - Called with a route id.
 * @param {Function} props.onSelectCheckpoint - Called with {routeId, index}.
 */
export default function RouteMap({ result, hour, activeRoute, selectedCheckpoint, onSelectRoute, onSelectCheckpoint }) {
  const { t, theme } = useI18n();
  const active = activeRoute;

  const journey = journeyAt(result, active, hour);
  const truckPosition = pointAtFraction(active, journey.fraction);
  const truckIcon = useTruckIcon(journey.status, theme);

  // The part of the route the truck has already covered, following the checkpoints.
  const travelled = active.checkpoints
    .filter((cp) => cp.mile <= journey.fraction * active.distance_miles)
    .map((cp) => [cp.lat, cp.lon]);
  if (journey.status !== 'waiting') travelled.push(truckPosition);

  const tooltip =
    journey.status === 'waiting'
      ? t('map.waiting', { hours: Math.ceil(journey.hoursUntilDeparture) })
      : journey.status === 'arrived'
        ? t('map.arrived')
        : t('map.enroute', { percent: Math.round(journey.fraction * 100) });

  return (
    <MapContainer className={`map map--${theme}`} center={[39, -100]} zoom={5} scrollWheelZoom preferCanvas zoomControl={false}>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <ZoomControl zoomIn={t('map.zoomIn')} zoomOut={t('map.zoomOut')} />
      <FitRoutes routes={result.routes} />

      {result.routes.map((route) => {
        const isSel = route.id === active.id;
        return (
          <Polyline
            key={route.id}
            positions={route.polyline}
            pathOptions={{
              color: isSel ? (theme === 'dark' ? '#ece8e1' : '#201f1d') : '#8d8a84',
              weight: isSel ? 5 : 3,
              dashArray: isSel ? undefined : '6 6',
              opacity: 0.9,
            }}
            eventHandlers={{ click: () => onSelectRoute(route.id) }}
          />
        );
      })}

      {active.checkpoints.map((cp) => (
        <Circle
          key={`cloud-${active.id}-${cp.index}`}
          center={[cp.lat, cp.lon]}
          radius={CLOUD_RADIUS_M}
          pathOptions={{ stroke: false, fillColor: levelColor(levelFromCode(cp.hourly[hour]), theme), fillOpacity: 0.3 }}
          interactive={false}
        />
      ))}

      {active.checkpoints.map((cp) => {
        const isOpen = selectedCheckpoint?.routeId === active.id && selectedCheckpoint?.index === cp.index;
        return (
          <CircleMarker
            key={`cp-${active.id}-${cp.index}`}
            center={[cp.lat, cp.lon]}
            radius={isOpen ? 9 : 5.5}
            pathOptions={{
              color: theme === 'dark' ? '#14130f' : '#201f1d',
              weight: isOpen ? 3 : 1.5,
              fillColor: levelColor(cp.level, theme),
              fillOpacity: 1,
            }}
            eventHandlers={{ click: () => onSelectCheckpoint({ routeId: active.id, index: cp.index }) }}
          />
        );
      })}

      {travelled.length > 1 && (
        <Polyline positions={travelled} pathOptions={{ color: theme === 'dark' ? '#d4a35c' : '#b68235', weight: 6, opacity: 0.95 }} interactive={false} />
      )}

      <Marker position={truckPosition} icon={truckIcon} zIndexOffset={1000} title={t('map.truckAria')} alt={t('map.truckAria')}>
        <Tooltip direction="top" offset={[0, -18]} permanent className="truck-tooltip">
          {tooltip}
        </Tooltip>
      </Marker>
    </MapContainer>
  );
}
