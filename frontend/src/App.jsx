/**
 * @file Root component: wires the trip state, the screens and the providers together.
 *
 * English: Reopens the most recent trip on load, decides which route the
 * screens focus on, and shows the empty, loading, error and result states.
 *
 * Español: Reabre el viaje más reciente al cargar, decide en qué ruta se
 * enfocan las pantallas y muestra los estados vacío, cargando, error y resultado.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from './api/client.js';
import { useTrip } from './hooks/useTrip.js';
import { useI18n } from './i18n/I18nProvider.jsx';
import { errorText } from './i18n/errorText.js';
import { activeRoute } from './domain/trip.js';
import { Icon } from './icons.jsx';
import TopBar from './components/TopBar.jsx';
import TripBar from './components/TripBar.jsx';
import TripForm from './components/TripForm.jsx';
import ScoringProgress from './components/ScoringProgress.jsx';
import Verdict from './components/Verdict.jsx';
import RouteList from './components/RouteList.jsx';
import RouteMap from './components/RouteMap.jsx';
import HourSlider from './components/HourSlider.jsx';
import Ribbons from './components/Ribbons.jsx';
import DepartureChart from './components/DepartureChart.jsx';
import CheckpointDetail from './components/CheckpointDetail.jsx';
import Notice from './components/Notice.jsx';

/**
 * Render the whole application.
 *
 * English: The selected route is kept per trip; when the trip changes the
 * selection is ignored and the recommended route is used again.
 *
 * Español: La ruta seleccionada se guarda por viaje; si cambia el viaje, la
 * selección se ignora y vuelve a usarse la ruta recomendada.
 *
 * @returns {JSX.Element} The application tree.
 */
export default function App() {
  const { t } = useI18n();
  const store = useTrip(api);
  const { status, error, fields, departures, departuresError, dismissError } = store;
  const [formOpen, setFormOpen] = useState(false);
  const [hour, setHour] = useState(0);
  const [selection, setSelection] = useState({ tripId: null, routeId: null });
  const [checkpoint, setCheckpoint] = useState(null);

  // On page load, reopen the most recent trip so nothing has to be re-entered.
  useEffect(() => {
    api
      .listTrips()
      .then((data) => {
        if (data.results.length) store.open(data.results[0].id);
      })
      .catch(() => {});
    // Only on mount: later changes come from the actions below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const result = store.trip?.result ?? null;
  const selectedId = selection.tripId === store.trip?.id ? selection.routeId : null;
  // The route the map, truck, cloud, corridor and slider follow: the one the user picked.
  const focus = activeRoute(result, selectedId);
  const loading = status === 'loading';

  const save = useCallback(
    async (values) => {
      const saved = store.trip ? await store.update(values) : await store.create(values);
      if (saved) setFormOpen(false);
    },
    [store],
  );

  const rescore = useCallback(() => store.update({}), [store]);
  const setLoad = useCallback((pounds) => store.update({ load_lb: pounds }), [store]);
  const useDeparture = useCallback((departure) => store.update({ departure }), [store]);
  const pickRoute = useCallback(
    (routeId) => {
      setSelection({ tripId: store.trip?.id ?? null, routeId });
      setCheckpoint(null);
    },
    [store.trip],
  );

  const detailRoute = checkpoint && result ? result.routes.find((r) => r.id === checkpoint.routeId) : null;

  return (
    <div className="app">
      <header className="masthead">
        <TopBar />
        {store.trip && (
          <TripBar trip={store.trip} busy={loading} onEdit={() => setFormOpen(true)} onRescore={rescore} />
        )}
      </header>

      <main className="wrap" aria-busy={loading}>
        {error && (
          <Notice tone="error" onClose={dismissError}>
            {errorText(error, t)}
          </Notice>
        )}
        {result?.warnings?.filter((warning) => warning?.code).map((warning) => (
          <Notice key={warning.code} tone="info">
            {t(`warn.${warning.code}`, warning)}
          </Notice>
        ))}

        {loading && !store.trip && <ScoringProgress />}

        {!store.trip && !loading && (
          <section className="empty panel">
            <Icon.Truck size={34} />
            <h1 className="empty__title">{t('app.emptyTitle')}</h1>
            <p className="empty__lede">{t('app.emptyLede')}</p>
            <button type="button" className="btn btn--primary" onClick={() => setFormOpen(true)}>
              <Icon.Route size={16} />
              {t('app.emptyCta')}
            </button>
          </section>
        )}

        {result && (
          <div className={loading ? 'is-busy' : ''}>
            <Verdict
              result={result}
              departures={departures}
              departuresError={departuresError}
              onUseDeparture={useDeparture}
            />

            <div className="stage">
              <RouteList result={result} selectedId={focus?.id ?? null} onSelect={pickRoute} />
              <div className="stage__map">
                <div className="map-frame">
                  <RouteMap
                    result={result}
                    hour={hour}
                    activeRoute={focus}
                    selectedCheckpoint={checkpoint}
                    onSelectRoute={pickRoute}
                    onSelectCheckpoint={setCheckpoint}
                  />
                  {detailRoute && checkpoint && (
                    <CheckpointDetail
                      route={detailRoute}
                      index={checkpoint.index}
                      loadLb={result.load_lb}
                      onClose={() => setCheckpoint(null)}
                    />
                  )}
                </div>
                <HourSlider result={result} route={focus} hour={hour} onHour={setHour} />
              </div>
            </div>

            <Ribbons
              result={result}
              selectedId={focus?.id ?? null}
              onSelect={pickRoute}
              onLoadChange={setLoad}
              busy={loading}
            />

            <DepartureChart
              result={result}
              departures={departures}
              error={departuresError}
              selectedId={focus?.id ?? null}
              onSelectRoute={pickRoute}
              onUseDeparture={useDeparture}
              busy={loading}
            />
          </div>
        )}
      </main>

      {formOpen && (
        <TripForm
          trip={store.trip}
          serverFields={fields}
          busy={loading}
          onSubmit={save}
          onCancel={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}
