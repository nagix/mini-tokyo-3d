# Mini Helsinki 3D localization plan

This document describes how to adapt the Mini Tokyo 3D application into a
Mini Helsinki 3D application.

## Current repository assessment

- The repository is still an essentially unmodified Mini Tokyo 3D fork.
- Package metadata, page metadata, styles, default camera, timezone, static
  data, and realtime endpoints are Tokyo-specific.
- Tokyo railway data remains under `data/`.
- The untracked `helsinki/hsl/` directory contains a complete HSL GTFS feed.

The baseline `npm run build` succeeds, and the development watcher and server
start successfully. A `MAPBOX_ACCESS_TOKEN` is still required for the base
map. Repository-wide linting currently fails because the Windows checkout uses
CRLF line endings while ESLint expects LF; this is a baseline line-ending issue.

## Current implementation status

- **Completed:** The Tokyo baseline builds and serves successfully.
- **Completed:** `MT3D_PROFILE=helsinki` selects a Helsinki camera, timezone,
  metadata, and route-only data sources.
- **Completed:** `npm run build-helsinki-data` derives compact GeoJSON from the
  HSL `routes.txt`, `trips.txt`, `shapes.txt`, and `stops.txt`.
- **Completed:** The static route source loads 1,234 route/shape features
  covering all 457 HSL routes in the live Helsinki map.
- **Completed:** Helsinki mode uses Finnish UI text, Helsinki branding, HSL
  route colors, and interactive route hover/selection.
- **Completed:** The generated asset adds all 8,406 HSL stop points, rendered
  at close zoom without loading `stop_times.txt`.
- **Completed:** Digitraffic Port Call v2 supplies six Helsinki port-area
  locations, displayed with ship symbols, berth-count halos, and active berth
  lists covering 62 berths.
- **Completed:** HSL GTFS-RT service alerts and vehicle positions use a shared
  feed lifecycle and a compact 434 KB trip-matching index. Trip updates and
  realtime maritime visits remain later phases.
- **Completed:** Metro geometry renders 20 meters underground, port symbols 50
  meters above ground, transit layers have deterministic drawing order, and
  route-type zoom policy applies to static lines and realtime vehicles.

## Project constraints

1. Preserve the original Mini Tokyo 3D code and behavior. Do not remove
   upstream implementation while localization is in progress. Temporary
   comments may be used, but configuration-based profiles or adapters are
   preferred because they are easier to maintain and test.
2. Prefer open Helsinki City or HSL data and modern open geospatial formats.
3. Keep the Helsinki implementation independently selectable so the original
   Tokyo application remains buildable.

## Goals in priority order

### 1. Establish and document the working Tokyo baseline, DONE

- Record the required Node.js and npm workflow.
- Copy `.env.example` to a git-ignored environment file.
- Supply `MAPBOX_ACCESS_TOKEN` for visual runtime testing.
- Confirm `npm run build` and `npm run dev`.
- Verify that the generated page and application bundle return successfully.
- Preserve this baseline with screenshots or a short smoke-test checklist.

**Acceptance criteria**

- `npm run build` completes successfully.
- `npm run dev` builds and serves the application.
- The existing Tokyo map can be rendered with a valid Mapbox token.

### 2. Add a selectable Helsinki configuration, DONE

Introduce a Helsinki profile without replacing the Tokyo defaults globally.

- Center the map near Helsinki city center, initially
  `[24.9384, 60.1699]`.
- Set the timezone to `Europe/Helsinki`.
- Clear or replace Tokyo static-data and realtime endpoints.
- Disable Tokyo-only route search, panels, railway data, and animation features
  when they do not apply.
- Add Helsinki page title, description, attribution, and sharing metadata.
- Keep the original profile available for regression testing.

The relevant existing defaults are centralized in `src/configs.js`, with
runtime options assembled in `public/index.html` and `scripts/gen-index.mjs`.

**Acceptance criteria**

- Helsinki mode opens over Helsinki.
- The application uses `Europe/Helsinki`.
- Helsinki mode makes no requests to Tokyo static-data or realtime services.
- Tokyo mode still builds and runs.

### 3. Preprocess HSL routes for the first Helsinki map, DONE

Use the following minimum GTFS relationship:

1. `routes.txt` supplies route IDs and names.
2. `trips.txt` connects `route_id` to `shape_id`.
3. `shapes.txt` supplies WGS84 route coordinates.

Add a build-time preprocessing script under `scripts/` that:

- Reads the HSL GTFS archive.
- Selects only `routes.txt`, `trips.txt`, and `shapes.txt`.
- Deduplicates repeated route/shape combinations.
- Validates that every referenced shape exists and contains valid coordinates.
- Converts WGS84 coordinates to GeoJSON LineString features.
- Adds route IDs, route names, route types, and display colors.
- Writes a compact generated asset for local or deployed use.

HSL does not provide `route_color` in the supplied `routes.txt`, so colors must
initially be assigned by `route_type`. Keep a configurable mapping for trams,
metro, commuter rail, buses, ferries, and extended route types.

The supplied feed currently contains:

- 457 routes
- 459,493 trips
- 1,234 distinct route/shape associations
- timezone `Europe/Helsinki`
- feed dates from 2026-11-24 through 2027-01-22

Do not load the original extracted feed in the browser. It is about 1.4 GB,
including a roughly 1.19 GB `stop_times.txt`. Generate and commit or deploy only
the compact derived route asset needed by the application.

**Acceptance criteria**

- All 457 route records are accounted for or explicitly rejected with a reason.
- All 1,234 route/shape relationships resolve.
- Every generated feature has valid GeoJSON coordinates.
- The generated payload is substantially smaller than the original GTFS feed.
- The preprocessing command reports duplicate, missing, and invalid records.

### 4. Add a static GTFS route-only rendering mode, DONE

Reuse the existing geometry and Mapbox rendering pipeline where possible, but
do not force static routes through the full bus-animation parser.

The existing implementation already parses GTFS and renders route shapes in
`src/worker.js` and `src/map.js`. Extend this path with an explicit static
route mode that:

- Loads the preprocessed route asset.
- Creates one feature per route/shape combination.
- Requires no calendar, `stop_times.txt`, stops, translations, or vehicle
  positions.
- Does not create animated buses or schedule workers.
- Keeps the existing full GTFS behavior available for other feeds.
- Handles all route types instead of assuming every GTFS route is a bus.

**Acceptance criteria**

- Helsinki route geometry renders from the compact generated asset.
- No schedules or `stop_times.txt` are fetched.
- No default Tokyo datasets are loaded in Helsinki mode.
- Route geometry can render without animation or schedule data.

### 5. Apply Helsinki presentation and Finnish localization, DONE

- Add a Finnish UI dictionary and select Finnish as a supported Helsinki
  language.
- Replace Tokyo-specific page and control text where exposed in Helsinki mode.
- Style routes by transport type.
- Use Helsinki-appropriate zoom levels and initial pitch.
- Hide or replace Tokyo station, railway, flight, and route-search UI until
  Helsinki data exists.
- Update README and development instructions with the Helsinki profile and
  route-preprocessing workflow.

**Acceptance criteria**

- Helsinki mode is clearly identified as Mini Helsinki 3D.
- Finnish is available without breaking existing languages.
- No visible Tokyo-specific controls or branding are required for route-only
  Helsinki mode.
- Hovering or clicking an HSL route shows its route number and name and updates
  the route highlight state.

### 6. Add stops and schedules incrementally, STOPS COMPLETED

Only after route rendering is stable:

1. Add selected data from `stops.txt`. **Done:** all 8,406 stop points are
   generated and displayed at close zoom with labels.
2. Preprocess the compact trip index required by vehicle-position matching
   instead of sending the full `stop_times.txt` to browsers. Include only the
   fields needed to resolve HSL realtime trip descriptors and their shape:
   route ID, service/service-date applicability, start time, direction ID,
   and shape ID. Keep the generated output bounded to the current static-feed
   service range.
3. Add route stop patterns and Helsinki transit panels.
4. Add Helsinki journey search only after an appropriate open API or derived
   graph is selected.

This keeps the first working milestone focused on the existing request to draw
routes rather than reproducing the complete Tokyo feature set.

### 7. Add HSL realtime service alerts and vehicle positions, COMPLETED

Use HSL's GTFS-RT v2 feeds documented at
https://hsldevcom.github.io/gtfs_rt/. The feeds are GET-only and require no
filter parameters. Keep their configuration in the Helsinki profile so Tokyo
data and behavior remain unchanged.

| Feed | Helsinki endpoint | HSL update interval |
| --- | --- | --- |
| Service alerts | `https://realtime.hsl.fi/realtime/service-alerts/v2/hsl` | 5 minutes and when an alert is published |
| Vehicle positions | `https://realtime.hsl.fi/realtime/vehicle-positions/v2/hsl` | 1 second |
| Trip updates, later | `https://realtime.hsl.fi/realtime/trip-updates/v2/hsl` | 15 seconds |

The existing `gtfs-realtime-bindings` dependency and
`loadDynamicBusData` protobuf decoder can be reused, but give the decoder and
polling paths feed-neutral names instead of preserving bus-specific
assumptions. Decode each response in a worker or otherwise keep protobuf
processing off the main render path if payload size makes UI updates
noticeable.

#### 7.1 Add a shared realtime lifecycle

- Add `serviceAlertUrl` and `vehiclePositionUrl` to the HSL data source in
  `scripts/gen-index.mjs`; do not add HSL requests to the Tokyo profile.
- Check HTTP status, decode only successful response bodies, and validate the
  feed header before applying an update. Log and expose failures rather than
  replacing valid data with an empty result.
- Store the feed timestamp and connection state for each feed. If a refresh
  fails or the header is stale, retain the last valid state and mark it stale
  in the UI.
- Poll only while the page is active and clocked in realtime mode. Pause
  polling in playback mode and after the map is removed; reschedule promptly
  after reconnection or tab visibility returns.
- Keep provider-specific normalization separate from rendering so service
  alerts and vehicle entities can be tested with recorded protobuf fixtures.

#### 7.2 Implement service alerts first

- Poll the service-alert feed on a 5-minute interval, with a shorter retry
  delay after a network error. The endpoint itself may receive newly
  published alerts between regular updates.
- Normalize active periods, cause/effect, URL, header, and description into the
  current UI language, preferring Finnish in the Helsinki profile and falling
  back to another available translation.
- Use the enclosing GTFS-RT entity's `id` as the stable identity. Replace the
  prior alert set
  atomically after a successful refresh so deleted alerts disappear, active
  periods are reevaluated, and duplicate entities are not added.
- Apply each `informed_entity` independently. HSL supplies one selector per
  entity: `agency_id` means all HSL traffic, `route_id` targets a route, and
  `stop_id` targets a stop. Do not require trip IDs in this phase.
- Add a compact alerts UI with active-alert count and details, plus route and
  stop markers where the matching static features exist. Route and stop alerts
  must work without vehicle or schedule data.
- Ignore future, expired, unknown-route, and unknown-stop alerts for
  visualization while retaining enough normalized metadata for an explicit
  alert list or diagnostics.

**Service-alert acceptance criteria**

- Helsinki mode requests only the HSL service-alert endpoint for realtime
  alerts, and Tokyo mode requests none of the HSL endpoints.
- New, changed, and removed alerts are reflected without reloading the page.
- Global, route-specific, and stop-specific selectors render correctly.
- Finnish text is preferred; every active alert has a deterministic fallback
  when a Finnish translation is absent.
- A failed or stale feed leaves the last valid alerts visible and marks them
  stale.

#### 7.3 Implement vehicle positions next

Service alerts do not require full schedules, but HSL vehicle positions do
require a schedule-derived trip-matching index.

- Extend `build-helsinki-routes.mjs` or add a dedicated build step to derive a
  compact lookup from `routes.txt`, `trips.txt`, `stop_times.txt`,
  `calendar.txt`, and `calendar_dates.txt`. Generate a key from `route_id`,
  service date, first departure `start_time`, and `direction_id`, with the
  matching `shape_id` and a minimal stop sequence.
- Resolve the HSL composite trip key
  `(route_id, start_date, start_time, direction_id)` in
  `Europe/Helsinki`. Do not expect or require `trip_id`: HSL intentionally
  omits it because static GTFS trip IDs change whenever the feed is rebuilt.
  Preserve GTFS service-day semantics for times after midnight.
- Add `serviceAlert`-style normalize/match tests and fixtures before wiring
  positions to the renderer. Cover scheduled, added, duplicate, unknown,
  overnight, changed-schedule, and missing-position entities.
- Poll vehicle positions at a configurable short interval (start at 5 seconds;
  do not default to polling the 1-second endpoint for 1-second map updates
  until network and render performance are measured). Coalesce refreshes and
  reject a response older than the currently applied feed timestamp.
- Render HSL bus, tram, metro, ferry, and commuter-rail position entities as
  the corresponding transport vehicle type. Reuse the existing traffic-layer
  path only where its API is generalized beyond bus-only objects and trip IDs.
- Use `latitude`, `longitude`, and `bearing` directly when available. Keep the
  matched shape available for transitions and route highlighting. Do not
  silently snap an unknown composite key to an arbitrary trip or shape.
- Support HSL `SCHEDULED` and `ADDED` relationships. Distinguish vehicles by
  the entity ID and HSL vehicle descriptor (`<operator_id>/<vehicle_id>`),
  including extra `ADDED` buses that share a scheduled trip.
- Preserve optional `occupancy_status`, `current_status`, stop sequence, and
  speed for details and selection. Treat `NOT_ACCEPTING_PASSENGERS` as
  unsupported rather than inventing a UI state.
- Remove or mark stale vehicles missing from subsequent successful feeds;
  retain none indefinitely after the source reports an unrecoverable data
  mismatch. A network failure, by contrast, follows the shared stale-state
  behavior.
- Validate that the number and geographic bounds of matched positions are
  plausible and report unmatched keys by category without failing the whole
  feed.

**Vehicle-position acceptance criteria**

- Every valid HSL entity resolves through the composite key or is explicitly
  reported as unmatched; no code path depends on `trip.trip_id`.
- Added buses and other supported route types appear without replacing the
  scheduled vehicle.
- Vehicle positions, bearings, route selection, and stale removal are visually
  correct in Helsinki mode.
- Overnight trips resolve to the previous GTFS service date.
- The generated trip-matching payload remains substantially smaller than the
  extracted feed and contains no unnecessary schedule strings.
- A malformed, failed, or out-of-order feed cannot corrupt the last valid
  vehicle state.

#### 7.4 Later realtime work

1. Add trip updates only after vehicle matching is stable. Use the same
   composite trip key and apply delays or cancellations to timetable-backed
   panels; uncertainty zero must mean that a stop has been passed.
2. Enrich Digitraffic ports with realtime vessel visits when selected.
3. Optimize route geometry, layer switching, polling, and 3D object loading
   against measured Helsinki traffic volume.
4. Update attribution and licensing for each added dataset.

### 8. Add generic visualization improvements, COMPLETED

Improve depth and layer composition consistently for static transit data,
realtime positions, labels, and port symbols. Drive these changes with shared
presentation rules rather than separate one-off layer settings, and keep the
Tokyo profile unchanged unless a shared improvement is explicitly enabled.

#### 8.1 Add transit elevation

- Draw HSL metro line geometry at **20 meters below ground level**. Preserve
  the source's WGS84 planimetric coordinates and add elevation in the
  rendering pipeline; do not simulate underground depth only by changing line
  color or horizontal position.
- Render the underground metro depth consistently in perspective and selection
  views, with an intentional opacity treatment for buildings and the ground
  surface.
- Set HSL port symbols and their clickable hit targets to **50 meters above
  ground level**, while leaving the underlying Digitraffic port-area
  coordinates unchanged.
- Ensure hover, click, and popup anchors use the displayed elevated symbol
  position rather than its ground-level coordinate.

#### 8.2 Fix layer drawing order

- Draw stop-name symbols after 3D building/model layers so stop labels remain
  readable when buildings are visible.
- Give labels an appropriate light or dark halo, and keep them above transit
  lines and other geographic overlays without covering controls or panels.
- Draw realtime vehicle circles, symbols, and route labels above every static
  transit-line layer and service-alert highlight.
- Keep hover, selection, and tracking states at the top of the vehicle layer
  stack so the active vehicle never disappears beneath another line or marker.
- Verify layer ordering after style changes, zoom transitions, and source
  refreshes. Do not rely on insertion order that can change as sources are
  added or removed.

#### 8.3 Add transit-type zoom thresholds

Define one profile-level zoom policy for static network geometry and realtime
vehicles. The numeric thresholds should be configurable and visually tuned,
while preserving this relative order:

| Transit type | Static geometry visibility | Realtime vehicle visibility |
| --- | --- | --- |
| Commuter rail and metro | Visible from regional zoom levels | Uses the same regional thresholds |
| Ferry | Visible before street-level modes | Uses the ferry threshold |
| Tram | Appears at city/district zoom | Uses the tram threshold |
| Bus | Appears at a closer district/street zoom | Uses the bus threshold |

- Use GTFS `route_type` as the source of truth. Match realtime vehicles to the
  static route before choosing their threshold; do not infer the mode from
  color, operator, or vehicle descriptor.
- Fade or switch layers across thresholds to avoid sudden popping during
  scrolling, and ensure hidden route types are not clickable.
- Align stop-point visibility with the modes served where practical. A stop
  served by multiple modes becomes visible at the earliest applicable
  threshold.
- Tune the selected values over central Helsinki, the regional rail network,
  and dense tram/bus corridors. Reuse the configured values for lines,
  vehicles, labels, highlighting, and picking.

**Acceptance criteria**

- Metro route geometry is rendered 20 meters underground in ground, 3D, and
  selection views.
- Port symbols are rendered 50 meters above ground, and their popups and
  interactions remain aligned.
- Stop names remain visible above 3D buildings at close and oblique camera
  angles.
- Realtime vehicle symbols remain above static transit lines and alert
  overlays at every supported zoom level.
- Rail and metro appear before tram and bus while zooming in; realtime vehicles
  obey the same route-type thresholds.
- Hidden layers cannot be picked, highlighted, or shown in popups.
- Tokyo rendering remains unchanged unless a shared improvement is
  explicitly enabled for that profile.

The six static maritime port areas are implemented in the Helsinki profile.
They come from Digitraffic's `/api/port-call/v2/ports/FIHEL` response:
Eteläsatama, Länsisatama, Laajasalo, Pohjoissatama, Vuosaari shipyard, and
Vuosaaren satama. The build processor excludes port areas without coordinates
and inactive berth names. Because Digitraffic does not provide berth
geometries, the berth area is a visual summary anchored to each port-area
point, not an official footprint. Port symbols and summaries fade in by
berth-count tier at zoom levels 10.5, 11.5, 12.5, and 13.5.

Use Helsinki City sources as the primary geospatial references:

- https://www.hel.fi/fi/paatoksenteko-ja-hallinto/tietoa-helsingista/kartat-ja-paikkatieto/paikkatiedot-tehokayttoon/avoimet-paikkatiedot
- https://kartta.hel.fi/paikkatietohakemisto/pth/
- https://hsldevcom.github.io/gtfs_rt/


## Verification strategy

For each phase, run the smallest relevant checks and retain the results:

- Build and lint the affected files.
- Run data validation on generated route assets.
- Check for requests to Tokyo endpoints in Helsinki mode.
- Verify route counts, shape counts, and geographic bounds.
- Verify alert selector coverage and realtime position trip matching against
  recorded HSL GTFS-RT fixtures.
- Check realtime polling intervals, stale-state behavior, and removal of
  vehicles missing from a successful update.
- Visually inspect the Helsinki center, routes, colors, zoom transitions, and
  selection behavior.
- Rebuild the original Tokyo profile after shared-code changes.

## Initial implementation order

1. Add the Helsinki configuration profile and an environment-selectable page.
2. Create the GTFS route-preprocessing script.
3. Generate and validate a compact route asset.
4. Add static route loading and rendering.
5. Add route styling and basic selection.
6. Add Finnish branding and documentation.
7. After stops, add the compact trip index and implement service alerts first.
8. Implement HSL vehicle positions with composite trip-key matching after alert
   lifecycle and UI behavior are stable.
9. Improve transit elevation, layer ordering, and route-type zoom visibility.
10. Add trip updates and other realtime maritime sources only after the first
   two HSL feeds are verified.
