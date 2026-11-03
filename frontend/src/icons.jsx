/**
 * @file Thin line icons used across the interface.
 *
 * English: All icons come from lucide with a 1.25 stroke, so the set reads as one family.
 * They are decorative (aria-hidden) unless a label is given elsewhere.
 *
 * Español: Todos los íconos vienen de lucide con trazo de 1.25, para que el conjunto
 * se vea como una sola familia. Son decorativos (aria-hidden) salvo que otro
 * elemento les dé una etiqueta.
 */

// Thin line icons (lucide). Every icon uses a 1.25 stroke so the set reads as one family.
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  CloudRain,
  Compass,
  Gauge,
  Info,
  Languages,
  MapPin,
  Minus,
  Moon,
  Navigation,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Route,
  ShieldCheck,
  Snowflake,
  Sun,
  Thermometer,
  Truck,
  Weight,
  Wind,
  X,
} from 'lucide-react';

/**
 * Stroke width shared by every icon.
 *
 * @type {number}
 */
const STROKE = 1.25;

/**
 * Wrap a lucide component with the house stroke and a default size.
 *
 * @param {React.ComponentType} Component - lucide icon.
 * @returns {Function} A component that accepts size and any SVG prop.
 */
function thin(Component) {
  return function ThinIcon({ size = 18, ...props }) {
    return <Component size={size} strokeWidth={STROKE} aria-hidden="true" focusable="false" {...props} />;
  };
}

/**
 * Named icons used by the components.
 *
 * @type {Object<string, Function>}
 */
export const Icon = {
  Truck: thin(Truck),
  MapPin: thin(MapPin),
  Clock: thin(Clock),
  Weight: thin(Weight),
  Pencil: thin(Pencil),
  RefreshCw: thin(RefreshCw),
  Sun: thin(Sun),
  Moon: thin(Moon),
  Languages: thin(Languages),
  Play: thin(Play),
  Pause: thin(Pause),
  Plus: thin(Plus),
  Minus: thin(Minus),
  ShieldCheck: thin(ShieldCheck),
  Ban: thin(Ban),
  Navigation: thin(Navigation),
  Wind: thin(Wind),
  CloudRain: thin(CloudRain),
  Snowflake: thin(Snowflake),
  Calendar: thin(Calendar),
  ArrowRight: thin(ArrowRight),
  Check: thin(Check),
  X: thin(X),
  Info: thin(Info),
  Alert: thin(AlertTriangle),
  Route: thin(Route),
  Compass: thin(Compass),
  ChevronRight: thin(ChevronRight),
  Thermometer: thin(Thermometer),
  Gauge: thin(Gauge),
};
