/**
 * @file All user-facing text, in English and Spanish.
 *
 * English: English is the default. A missing Spanish key falls back to English.
 * Placeholders use {name}.
 *
 * Español: El inglés es el idioma por defecto. Si falta una clave en español se
 * usa el inglés. Los marcadores usan {nombre}.
 */

// All user-facing text. English is the default; Spanish is the second language.
// Placeholders use {name}. A missing Spanish key falls back to English.

/**
 * Language used when none is stored.
 *
 * @type {string}
 */
export const DEFAULT_LOCALE = 'en';
/**
 * Languages offered by the language switch.
 *
 * @type {string[]}
 */
export const LOCALES = ['en', 'es'];

/**
 * Translation tables keyed by locale and then by message key.
 *
 * @type {Object<string, Object<string, string>>}
 */
export const messages = {
  en: {
    'app.name': 'Spotter',
    'app.plan': 'Plan a trip',
    'app.emptyTitle': 'Pick the safest route, not just the shortest.',
    'app.emptyLede': 'Spotter compares three routes using the forecast at each checkpoint, for the hour your truck reaches it, and your load weight.',
    'app.emptyCta': 'Plan a trip',

    'progress.title': 'Reading the sky…',
    'progress.geocode': 'Geocoding origin and destination',
    'progress.routes': 'Finding route alternatives',
    'progress.forecast': 'Checking the forecast at each checkpoint',
    'progress.rules': 'Applying risk and load rules',
    'progress.rank': 'Ranking the routes',
    'progress.note': 'The first lookup takes a few seconds. Repeated lookups come from cache.',

    'theme.label': 'Color theme',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.switchToLight': 'Switch to light mode',
    'theme.switchToDark': 'Switch to dark mode',
    'lang.label': 'Language',

    'trip.edit': 'Edit',
    'trip.recalculate': 'Recalculate',
    'trip.editTitle': 'Edit trip',
    'trip.newTitle': 'Plan a trip',
    'trip.dismiss': 'Dismiss message',

    'form.origin': 'Origin',
    'form.destination': 'Destination',
    'form.departure': 'Departure',
    'form.zone': 'Origin time zone',
    'form.load': 'Load (lb)',
    'form.presets': 'Common loads',
    'form.empty': 'Empty',
    'form.originPlaceholder': 'Dallas, TX',
    'form.destinationPlaceholder': 'Denver, CO',
    'form.loadNote': 'Load rules change at 30k and 40k lb: 45 mph wind or more with over 30k, or 35 mph with over 40k.',
    'form.submit': 'Calculate 3 routes →',
    'form.submitBusy': 'Calculating…',
    'form.cancel': 'Cancel',
    'zone.eastern': 'Eastern (UTC−5)',
    'zone.central': 'Central (UTC−6)',
    'zone.mountain': 'Mountain (UTC−7)',
    'zone.pacific': 'Pacific (UTC−8)',
    'zone.custom': 'Origin (UTC{offset})',

    'field.origin.required': 'Enter the origin.',
    'field.destination.required': 'Enter the destination.',
    'field.departure.required': 'Choose the departure date and time.',
    'field.load.range': 'Load must be between 1 and 200,000 lb.',

    'verdict.kicker': 'Recommendation · {when} · {load}',
    'verdict.title': 'Take {route}.',
    'verdict.lede': '{severe} severe, {high} high, and {duration} of driving.',
    'verdict.onlyRoute': 'It is the only route that can be driven with this load.',
    'verdict.tie': 'It ties with the runner-up on every criterion.',
    'verdict.decision': 'Wins on {criterion}: {mine} versus {theirs}.',
    'verdict.tableTitle': 'How it was decided · the first criterion that separates them wins',
    'verdict.criterion': 'Criterion',
    'verdict.deciding': 'decides',
    'verdict.note': 'A severe stretch is counted at its arrival hour, using the forecast for that hour.',
    'verdict.noSafeKicker': 'No safe route · {when}',
    'verdict.noSafeTitle': 'Do not leave at this time.',
    'verdict.noSafeLede': 'None of the {count} routes can be driven with this load at this departure. The app never recommends a route silently.',
    'verdict.earliest': 'Nearest departures that work',
    'verdict.searching': 'Searching departures in the next 48 hours…',
    'verdict.noneClean': 'No departure in the next 48 hours can be driven with this load.',
    'verdict.useDeparture': 'Use this departure',
    'verdict.departureSummary': '{route} · {severe} severe mi',
    'verdict.departuresError': 'Could not load alternative departures.',
    'crit.blocked': 'Any No Travel stretch?',
    'crit.severe': 'Severe miles',
    'crit.high': 'High miles',
    'crit.avg': 'Average risk',
    'crit.time': 'Travel time',
    'crit.nameBlocked': 'No Travel stretches',
    'crit.nameSevere': 'severe miles',
    'crit.nameHigh': 'high miles',
    'crit.nameAvg': 'average risk',
    'crit.nameTime': 'travel time',
    'common.yes': 'Yes',
    'common.no': 'No',

    'routes.count': '{count} routes',
    'routes.note': 'Each route is scored at the hour the truck reaches each checkpoint.',
    'routes.recommended': 'Recommended',
    'routes.notViable': 'Not viable',
    'routes.viable': 'Viable, #{place}',
    'routes.meta': '{duration} · {severe} severe · {high} high',
    'route.label': 'Route {n}',
    'reason.no_travel': 'No Travel stretch',
    'reason.no_forecast': 'no forecast',

    'risk.low': 'Low',
    'risk.moderate': 'Moderate',
    'risk.high': 'High',
    'risk.severe': 'Severe',
    'risk.notravel': 'No Travel',
    'risk.unknown': 'No forecast',
    'risk.scale': 'Risk scale',

    'map.truckAria': 'Truck position',
    'map.waiting': 'Departs in {hours} h',
    'map.enroute': '{percent}% of the route',
    'map.arrived': 'Arrived',
    'map.zoomIn': 'Zoom in',
    'map.zoomOut': 'Zoom out',

    'slider.play': 'Play forecast',
    'slider.pause': 'Pause forecast',
    'slider.label': 'Forecast hour',
    'slider.valueText': '{hours} hours from now',
    'slider.clock': 'T+{hours}h · {when}',
    'slider.corridor': 'Corridor forecast · {route}',
    'slider.corridorAria': 'Risk along {route} at {hours} hours',

    'ribbons.title': 'Risk ribbons',
    'ribbons.note': 'Each cell is a checkpoint, read from origin (left) to destination (right).',
    'ribbons.counts': '{severe} severe · {high} high',
    'ribbons.simulate': 'Simulate load',
    'ribbons.simulateNote': 'Recalculates the trip on the server and saves the load you pick.',

    'departures.title': 'When to leave?',
    'departures.loading': 'Calculating departures for the next 48 hours…',
    'departures.error': 'Could not load departures: {message}',
    'departures.axisDestination': 'Destination',
    'departures.axisOrigin': 'Origin',
    'departures.recommended': 'Recommended departures',
    'departures.none': 'No departure in the next 48 hours can be driven with this load.',
    'departures.use': 'Use this departure',
    'departures.summary': 'Load {load}. Departures up to {window} h, every {step} h.',
    'departures.cell': '{when} · checkpoint {index}',

    'checkpoint.title': 'Mile {mile} · {route}',
    'checkpoint.arrival': 'Arrives {when} ({clock}) · forecast for that hour',
    'checkpoint.decides': 'Decided by {driver}',
    'driver.wind': 'wind',
    'driver.rain': 'rain',
    'driver.snow': 'snow',
    'checkpoint.wind': 'Wind',
    'checkpoint.rain': 'Rain',
    'checkpoint.snow': 'Snow',
    'checkpoint.close': 'Close details',
    'checkpoint.unknown': 'This hour is beyond the 48-hour forecast and does not count toward the recommendation.',
    'checkpoint.ruleNoTravel': 'Load rule: wind of 45–54 mph with more than 30,000 lb → No Travel.',
    'checkpoint.ruleSevere': 'Load rule: wind of 35–44 mph with more than 40,000 lb → Severe.',
    'checkpoint.loadNote': 'Load {load}. The most severe component wins.',

    'notice.dismiss': 'Dismiss',
    'warn.fewer_alternatives': 'The routing service returned {found} of {requested} requested routes.',
    'warn.no_safe_route': 'No route can be driven with this load. Consider leaving later.',

    'err.network': 'Cannot reach the server. Check that the API is running.',
    'err.unknown': 'Something went wrong. Try again.',
    'err.invalid_data': 'Please fix the highlighted fields.',
    'err.invalid_json': 'The request was not valid JSON.',
    'err.invalid_window': 'Departure window or step is out of range.',
    'err.trip_not_found': 'That trip no longer exists.',
    'err.departure_timezone': 'Departure time must include a time zone.',
    'err.geocode_failed': 'Could not look up one of the places. Try again in a moment.',
    'err.place_not_found': 'Location not found. Try City, State, Country, or coordinates as lat,lon.',
    'err.routing_failed': 'The routing service did not return a valid route.',
    'err.weather_failed': 'The weather service did not respond.',
    'err.no_routes': 'No routes were found between those points.',
    'err.missing_api_key': 'The server has no OpenRouteService key configured.',
    'err.provider_error': 'An external service failed. Try again.',
    'err.required': 'This field is required.',
    'err.too_long': 'Keep it under 200 characters.',
    'err.number_range': 'Enter a valid number within the allowed range.',
    'err.sample_interval': 'Use 10, 25, or 50 miles.',
    'err.departure_format': 'Use a date and time with a time zone.',

    'unit.mi': 'mi',
    'unit.lb': 'lb',
    'unit.mph': 'mph',
    'unit.inHour': 'in/h',
    'duration.hm': '{hours}h {minutes}m',
  },

  es: {
    'app.name': 'Spotter',
    'app.plan': 'Planear un viaje',
    'app.emptyTitle': 'Elige la ruta más segura, no solo la más corta.',
    'app.emptyLede': 'Spotter compara tres rutas con el pronóstico de cada checkpoint, para la hora en que el camión llega allí, y el peso de la carga.',
    'app.emptyCta': 'Planear un viaje',

    'progress.title': 'Leyendo el cielo…',
    'progress.geocode': 'Geocodificando origen y destino',
    'progress.routes': 'Buscando alternativas de ruta',
    'progress.forecast': 'Consultando el pronóstico en cada checkpoint',
    'progress.rules': 'Aplicando reglas de riesgo y carga',
    'progress.rank': 'Ordenando las rutas',
    'progress.note': 'La primera consulta tarda unos segundos. Las repetidas salen de caché.',

    'theme.label': 'Tema de color',
    'theme.light': 'Claro',
    'theme.dark': 'Oscuro',
    'theme.switchToLight': 'Cambiar a modo claro',
    'theme.switchToDark': 'Cambiar a modo oscuro',
    'lang.label': 'Idioma',

    'trip.edit': 'Editar',
    'trip.recalculate': 'Volver a calcular',
    'trip.editTitle': 'Editar viaje',
    'trip.newTitle': 'Planear un viaje',
    'trip.dismiss': 'Cerrar aviso',

    'form.origin': 'Origen',
    'form.destination': 'Destino',
    'form.departure': 'Salida',
    'form.zone': 'Zona horaria del origen',
    'form.load': 'Carga (lb)',
    'form.presets': 'Cargas comunes',
    'form.empty': 'Vacío',
    'form.originPlaceholder': 'Dallas, TX',
    'form.destinationPlaceholder': 'Denver, CO',
    'form.loadNote': 'Las reglas de carga cambian en 30k y 40k lb: viento de 45 mph o más con más de 30k, o de 35 mph con más de 40k.',
    'form.submit': 'Calcular 3 rutas →',
    'form.submitBusy': 'Calculando…',
    'form.cancel': 'Cancelar',
    'zone.eastern': 'Este (UTC−5)',
    'zone.central': 'Centro (UTC−6)',
    'zone.mountain': 'Montaña (UTC−7)',
    'zone.pacific': 'Pacífico (UTC−8)',
    'zone.custom': 'Origen (UTC{offset})',

    'field.origin.required': 'Escribe el origen.',
    'field.destination.required': 'Escribe el destino.',
    'field.departure.required': 'Elige día y hora de salida.',
    'field.load.range': 'La carga va de 1 a 200,000 lb.',

    'verdict.kicker': 'Recomendación · {when} · {load}',
    'verdict.title': 'Toma la {route}.',
    'verdict.lede': '{severe} severas, {high} altas y {duration} de viaje.',
    'verdict.onlyRoute': 'Es la única ruta transitable con esta carga.',
    'verdict.tie': 'Empata con la segunda en todos los criterios.',
    'verdict.decision': 'Gana por {criterion}: {mine} frente a {theirs}.',
    'verdict.tableTitle': 'Cómo se decidió · gana el primer criterio que separa',
    'verdict.criterion': 'Criterio',
    'verdict.deciding': 'decide',
    'verdict.note': 'Un tramo severo se cuenta en su hora de llegada, con el pronóstico de esa hora.',
    'verdict.noSafeKicker': 'Sin ruta segura · {when}',
    'verdict.noSafeTitle': 'No salgas a esta hora.',
    'verdict.noSafeLede': 'Ninguna de las {count} rutas es transitable con esta carga en esta salida. La app nunca recomienda una ruta en silencio.',
    'verdict.earliest': 'Salidas más cercanas que sí se pueden hacer',
    'verdict.searching': 'Buscando salidas en las próximas 48 horas…',
    'verdict.noneClean': 'Ninguna salida de las próximas 48 horas es transitable con esta carga.',
    'verdict.useDeparture': 'Usar esta salida',
    'verdict.departureSummary': '{route} · {severe} mi severas',
    'verdict.departuresError': 'No se pudieron cargar las salidas alternativas.',
    'crit.blocked': '¿Hay tramos de No viajar?',
    'crit.severe': 'Millas severas',
    'crit.high': 'Millas altas',
    'crit.avg': 'Riesgo medio',
    'crit.time': 'Tiempo de viaje',
    'crit.nameBlocked': 'tramos de No viajar',
    'crit.nameSevere': 'millas severas',
    'crit.nameHigh': 'millas altas',
    'crit.nameAvg': 'riesgo medio',
    'crit.nameTime': 'tiempo de viaje',
    'common.yes': 'Sí',
    'common.no': 'No',

    'routes.count': '{count} rutas',
    'routes.note': 'Cada ruta se evalúa en la hora en que el camión pasa por cada checkpoint.',
    'routes.recommended': 'Recomendada',
    'routes.notViable': 'No viable',
    'routes.viable': 'Viable, puesto {place}',
    'routes.meta': '{duration} · {severe} severas · {high} altas',
    'route.label': 'Ruta {n}',
    'reason.no_travel': 'tramos de No viajar',
    'reason.no_forecast': 'sin pronóstico',

    'risk.low': 'Bajo',
    'risk.moderate': 'Moderado',
    'risk.high': 'Alto',
    'risk.severe': 'Severo',
    'risk.notravel': 'No viajar',
    'risk.unknown': 'Sin pronóstico',
    'risk.scale': 'Escala de riesgo',

    'map.truckAria': 'Posición del camión',
    'map.waiting': 'Sale en {hours} h',
    'map.enroute': '{percent}% de la ruta',
    'map.arrived': 'Llegó',
    'map.zoomIn': 'Acercar',
    'map.zoomOut': 'Alejar',

    'slider.play': 'Reproducir pronóstico',
    'slider.pause': 'Pausar pronóstico',
    'slider.label': 'Hora del pronóstico',
    'slider.valueText': '{hours} horas desde ahora',
    'slider.clock': 'T+{hours}h · {when}',
    'slider.corridor': 'Pronóstico del corredor · {route}',
    'slider.corridorAria': 'Riesgo a lo largo de {route} a las {hours} horas',

    'ribbons.title': 'Tiras de riesgo',
    'ribbons.note': 'Cada celda es un checkpoint. Lee de origen (izquierda) a destino (derecha).',
    'ribbons.counts': '{severe} severas · {high} altas',
    'ribbons.simulate': 'Simular carga',
    'ribbons.simulateNote': 'Recalcula el viaje con el servidor y guarda la carga elegida.',

    'departures.title': '¿Cuándo salir?',
    'departures.loading': 'Calculando salidas para las próximas 48 horas…',
    'departures.error': 'No se pudieron cargar las salidas: {message}',
    'departures.axisDestination': 'Destino',
    'departures.axisOrigin': 'Origen',
    'departures.recommended': 'Salidas recomendadas',
    'departures.none': 'Ninguna salida de las próximas 48 horas es transitable con esta carga.',
    'departures.use': 'Usar esta salida',
    'departures.summary': 'Carga {load}. Salidas hasta {window} h, cada {step} h.',
    'departures.cell': '{when} · checkpoint {index}',

    'checkpoint.title': 'Milla {mile} · {route}',
    'checkpoint.arrival': 'Llega {when} ({clock}) · pronóstico de esa hora',
    'checkpoint.decides': 'Decide {driver}',
    'driver.wind': 'el viento',
    'driver.rain': 'la lluvia',
    'driver.snow': 'la nieve',
    'checkpoint.wind': 'Viento',
    'checkpoint.rain': 'Lluvia',
    'checkpoint.snow': 'Nieve',
    'checkpoint.close': 'Cerrar detalle',
    'checkpoint.unknown': 'Esta hora está fuera del pronóstico de 48 h y no cuenta para la recomendación.',
    'checkpoint.ruleNoTravel': 'Regla de carga: viento de 45–54 mph con más de 30,000 lb → No viajar.',
    'checkpoint.ruleSevere': 'Regla de carga: viento de 35–44 mph con más de 40,000 lb → Severo.',
    'checkpoint.loadNote': 'Carga {load}. Gana el componente más severo.',

    'notice.dismiss': 'Cerrar aviso',
    'warn.fewer_alternatives': 'El servicio de rutas devolvió {found} de las {requested} rutas pedidas.',
    'warn.no_safe_route': 'Ninguna ruta es transitable con esta carga. Conviene retrasar la salida.',

    'err.network': 'No se pudo conectar con el servidor. Revisa que la API esté encendida.',
    'err.unknown': 'Algo salió mal. Inténtalo de nuevo.',
    'err.invalid_data': 'Corrige los campos marcados.',
    'err.invalid_json': 'La petición no era JSON válido.',
    'err.invalid_window': 'La ventana o el paso de salidas están fuera de rango.',
    'err.trip_not_found': 'Ese viaje ya no existe.',
    'err.departure_timezone': 'La hora de salida debe incluir zona horaria.',
    'err.geocode_failed': 'No se pudo buscar uno de los lugares. Inténtalo de nuevo en un momento.',
    'err.place_not_found': 'No se encontró la ubicación. Prueba con Ciudad, Estado, País, o coordenadas lat,lon.',
    'err.routing_failed': 'El servicio de rutas no devolvió una ruta válida.',
    'err.weather_failed': 'El servicio de clima no respondió.',
    'err.no_routes': 'No se encontraron rutas entre esos puntos.',
    'err.missing_api_key': 'El servidor no tiene configurada la clave de OpenRouteService.',
    'err.provider_error': 'Falló un servicio externo. Inténtalo de nuevo.',
    'err.required': 'Este campo es obligatorio.',
    'err.too_long': 'Usa menos de 200 caracteres.',
    'err.number_range': 'Escribe un número válido dentro del rango permitido.',
    'err.sample_interval': 'Usa 10, 25 o 50 millas.',
    'err.departure_format': 'Usa fecha y hora con zona horaria.',

    'unit.mi': 'mi',
    'unit.lb': 'lb',
    'unit.mph': 'mph',
    'unit.inHour': 'in/h',
    'duration.hm': '{hours}h {minutes}m',
  },
};

/**
 * Return the text for a key in a locale, with placeholders filled.
 *
 * English: Falls back to English, then to the key itself.
 *
 * Español: Recurre al inglés y, después, a la propia clave.
 *
 * @param {string} locale - Locale code, such as 'es'.
 * @param {string} key - Message key, such as 'verdict.title'.
 * @param {Object<string, string|number>} [vars={}] - Values for {placeholders}.
 * @returns {string}
 */
export function translate(locale, key, vars = {}) {
  const table = messages[locale] ?? messages[DEFAULT_LOCALE];
  const template = table[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? `{${name}}`));
}
