# Spotter · Weather-aware truck routing

Spotter helps a truck driver choose the safest of three routes. For each route it samples the weather at checkpoints every 10, 25 or 50 miles, at the hour the truck is expected to reach each one, applies the wind, rain, snow and load rules, and recommends the route with the fewest severe miles.

- **Backend**: REST API in Django (`backend/`). It is the single source of truth for risk.
- **Frontend**: React, Vite and Leaflet (`frontend/`). It consumes the API and only displays what it receives.
- **Languages**: English (default) and Spanish, switchable in the top bar.
- **Themes**: light and dark, switchable in the top bar and remembered between visits.

## Quick start

Use two terminals.

Backend:

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

### Real data or demo data

- **Real mode** (default): set `ORS_API_KEY` in `backend/.env` to an [OpenRouteService](https://openrouteservice.org/dev/#/signup) key. Routes come from OpenRouteService and weather from Open-Meteo, which needs no key.
- **Demo mode**: set `SPOTTER_DEMO=1` before starting the backend. It uses synthetic routes and a moving storm, with no keys and no API quota. Use it to explore the interface, not to decide a trip.

`backend/.env.example` lists every variable.

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `ORS_API_KEY` | backend | OpenRouteService key (truck profile) |
| `SPOTTER_DEMO` | backend | `1` uses synthetic data |
| `NOMINATIM_USER_AGENT` | backend | Identifies the app to Nominatim (geocoding) |
| `CORS_ALLOWED_ORIGINS` | backend | Frontend origins allowed to call the API (default `http://localhost:5173`) |
| `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS` | backend | Deployment settings |
| `VITE_API_URL` | frontend | API base URL (default `http://localhost:8000/api`) |

## Using the app

1. **Plan a trip.** Enter origin, destination, departure time and time zone, and the load in pounds. The app calculates three routes.
2. **Read the verdict.** The recommendation appears with a table that shows which criterion decided it.
3. **Explore the map.** Click a route to select it. Click a checkpoint to see wind, rain and snow on arrival and the rule that decides.
4. **Play the forecast.** The hour slider runs from 0 to 48 hours. Press play to move the truck along the recommended route as time advances; the heat cloud and corridor bar update with the forecast for each hour.
5. **Compare departures.** "When to leave?" shows the risk for every departure hour in the next 48 hours. Use a departure to update the trip.
6. **Simulate loads.** The ribbons section recalculates the trip at 25k, 30k, 41k or 50k lb to show how the decision changes.
7. **No safe route.** If every route is blocked, the app says so and lists the nearest departures that work. It never recommends a route silently.

## API

Base path: `/api/`. Every response is JSON. Errors carry a stable `code` that the frontend translates, and an English `error` message.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health/` | Service status |
| `GET` | `/trips/` | Latest 50 trips, without the full result |
| `POST` | `/trips/` | Create and evaluate a trip. Responds `201` with `Location` |
| `GET` | `/trips/{id}/` | Trip with its latest evaluation |
| `PATCH` | `/trips/{id}/` | Change fields and re-evaluate. If a provider fails, the trip is unchanged |
| `DELETE` | `/trips/{id}/` | Delete a trip. Responds `204` |
| `GET` | `/trips/{id}/departures/?window_hours=48&step_hours=2` | Recommendation for each departure hour in the window |

Trip fields: `origin`, `destination`, `departure` (ISO 8601 with a time zone), `load_lb`, `tolerance_miles` (default 1), `sample_every_miles` (10, 25 or 50).

Errors:

- `400`: invalid data. `fields` maps each field to an error code.
- `404`: unknown trip.
- `405`: method not in the contract.
- `502`: an external provider failed, or the server has no ORS key.

Example:

```bash
curl -X POST http://localhost:8000/api/trips/ \
  -H "Content-Type: application/json" \
  -d '{"origin":"Dallas, TX","destination":"Denver, CO","departure":"2026-11-03T06:00:00-06:00","load_lb":41000}'
```

### Evaluation shape

- `routes[]`: `eligible`, `blocked_reasons` (codes such as `no_travel`, `no_forecast`), `severe_miles`, `high_miles`, `avg_risk`, `duration_minutes`, `polyline`, `checkpoints`.
- `checkpoints[]`: `mile`, `lat`, `lon`, `eta` (arrival time), `level`, `driver` (the component that decides), `hourly`.
- `hourly`: 49 characters, one per forecast hour from 0 to 48. The slider reads it without extra requests.
- Level codes: `0` Low, `1` Moderate, `2` High, `3` Severe, `4` No Travel, `5` No forecast.
- `warnings[]`: objects with a `code` (`fewer_alternatives`, `no_safe_route`).

## Rules and decisions

- **Boundaries:** each lower limit belongs to the more severe level. Rain of 0.25 in/h is High; 1.00 in/h is Severe.
- **Load:** affects wind only. Wind of 45 mph or more with more than 30,000 lb is No Travel. Wind of 35 to 44 mph with more than 40,000 lb is Severe.
- **Blocked routes:** one No Travel or no-forecast stretch makes a route ineligible. If no route is eligible, nothing is recommended.
- **Ranking:** fewest severe miles, then fewest high miles, then lowest average risk, then shortest time. Miles are grouped in blocks of `tolerance_miles`.
- **Forecast horizon:** 48 hours. A checkpoint reached later is treated as having no forecast.
- **Arrival time:** each checkpoint's arrival is proportional to distance travelled. This is an approximation that does not use per-step times from the provider.
- **Alternatives:** OpenRouteService alternative routes only work up to 100 km. Longer trips use the direct route plus two detours through points on either side of it.

## Project layout

```
backend/
  config/          Django settings and URLs
  risk/
    engine.py      Risk rules (pure functions)
    ranking.py     Route summaries and ordering (pure)
    geo.py         Distances, checkpoint sampling, detour points (pure)
    providers.py   Nominatim, OpenRouteService, Open-Meteo adapters
    services.py    Evaluation flow and departure options
    views.py       REST endpoints
    demo.py        Synthetic providers for SPOTTER_DEMO=1
    tests/         Backend tests
frontend/
  src/
    i18n/          Messages (en, es), language and theme provider
    domain/        Risk, time, trip and journey rules (pure)
    components/    Screens and widgets
    api/           REST client
    styles/        Design tokens (light and dark) and styles
    test/          Fixtures and test helpers
```

## Tests

Backend (86 tests):

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py test risk
```

Frontend (59 tests):

```powershell
cd frontend
npm test
```

## Known limitations

- Detour points are approximate. A detour can be skipped when no road is close enough; the response warns when fewer than three routes are returned.
- Arrival times are proportional to distance rather than taken from per-step durations.
- Backend docstrings and some internal comments are still in Spanish. User-facing text is fully translated.
