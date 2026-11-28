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

### 9. Restore Helsinki station search, configuration controls, and timetable UI

**9.1 and 9.2 COMPLETED. 9.3 timetable data loading is COMPLETED; live
trip-update reconciliation remains Step 10.**

Enable the original Mini Tokyo 3D interaction surfaces only where they can be
backed by Helsinki data. Keep all Helsinki data and providers isolated from the
Tokyo profile, and do not expose a control until its required data and behavior
are available.

#### 9.1 Add localized Helsinki station and route search

- Extend the generated HSL stop dataset with the stable identifiers, localized
  names, coordinates, location types, parent-station relationships, route
  memberships, and accessibility fields needed by the map's station search and
  selection model.
- Normalize platform stops into their parent station where one exists, while
  retaining the individual stop points for map display and route membership.
  The search index must include only Helsinki-region records from the selected
  HSL feed; it must never fall back to Tokyo station data.
- Restore the search control in the Helsinki profile after autocomplete,
  diacritics, duplicate names, and keyboard/touch selection have been handled.
  Selecting a result should center or track the corresponding Helsinki station
  and open its local station details.
- Add Helsinki route search with a profile-specific route-planning API or a
  locally derived graph selected in a separate data-provider spike. Keep the
  Tokyo `searchUrl` disabled in Helsinki mode and do not enable journey results
  until origin, destination, time, mode filters, walking links, transfers, and
  localized errors have defined behavior.
- Update the current URL-selection/share format only when a Helsinki station or
  route result can be restored reliably on page load.

#### 9.2 Restore configuration controls

- Re-enable the configuration button group in the Helsinki profile only after
  each panel has Helsinki-specific content and fallback states.
- Add a layer panel that lists the actually loaded Helsinki layers: HSL route
  types, stop names, realtime vehicles, service alerts, 3D buildings, and
  Digitraffic ports. Toggles must affect the matching source, rendering layers,
  and hit targets together.
- Restore tracking-mode settings for HSL vehicle and station tracking. Persist
  supported settings using the existing map configuration mechanism, and hide
  options that depend on Tokyo railway data.
- Replace or localize the About panel with Mini Helsinki 3D attribution,
  HSL/Fintraffic/Digitraffic data-source notices, the static-data timestamp,
  and links to the Helsinki repository and relevant licenses.
- Preserve the existing standalone service-alert control; the configuration
  panel must complement rather than duplicate it.

#### 9.3 Add detailed station information and timetables

- Preprocess a bounded Helsinki schedule dataset from HSL `routes.txt`,
  `trips.txt`, `stop_times.txt`, `calendar.txt`, `calendar_dates.txt`, and
  `stops.txt`. Generate compact service-date, trip, stop-sequence, and
  departure records; do not ship the full extracted GTFS feed.
- Reuse the trip index introduced for realtime matching where possible, but
  keep browser payloads profile-configured and separate from the current
  realtime-position index. Document the expected size, update cadence, and
  static-feed validity range.
- Adapt the existing station panel for HSL stop/station records. Show localized
  station names, served route numbers and modes, facilities when supported by
  the source, service alerts, and departures in both directions.
- Expand departure rows into trip and stop-by-stop timetable details. Apply
  HSL calendars and exception dates in `Europe/Helsinki`, including services
  that depart after midnight and services that belong to the previous HSL
  operating day.
- Define the timetable UI's trip-update boundary while implementing the static
  schedule, but leave live departure adjustments, skipped stops, and
  cancellations to Step 10. The static panel must continue to work without
  trip updates.
- Keep timetable-based playback disabled until there is enough schedule and
  shape data to produce deterministic Helsinki vehicle motion; enabling the
  station panel or timetable display alone must not imply playback is ready.

**Acceptance criteria**

- Helsinki search returns only localized HSL stations and routes, with no
  Tokyo result or request to the Tokyo route-search service.
- Selecting a search result focuses the correct station and opens station
  details; duplicate platform/stop names resolve deterministically.
- Route search either returns valid Helsinki journeys through the selected
  provider or remains explicitly unavailable rather than producing partial or
  misleading results.
- Helsinki layer selection, tracking settings, and About controls are visible
  and operate on the data layers and metadata exposed by the profile.
- A selected station shows its routes, service alerts, and schedule-derived
  departures, including after-midnight services and calendar exceptions.
- Timetable details agree with the HSL static feed and retain stable identifiers
  that can be reconciled with matching GTFS-RT trip updates in Step 10.
- Helsinki mode sends stop, route, schedule, and journey requests only to
  approved Helsinki providers; the original Tokyo profile retains its existing
  controls and data sources.

Use Helsinki City sources as the primary geospatial references:

- https://www.hel.fi/fi/paatoksenteko-ja-hallinto/tietoa-helsingista/kartat-ja-paikkatieto/paikkatiedot-tehokayttoon/avoimet-paikkatiedot
- https://kartta.hel.fi/paikkatietohakemisto/pth/
- https://hsldevcom.github.io/gtfs_rt/

### 10. Add world-relative rain and snow particles, DEMO IMPLEMENTED

Implement precipitation as a viewport particle effect, not as a map overlay.
Keep the first version self-contained and deterministic so it can be validated
visually without depending on a weather service. Put the implementation in a
separate `plugins/mt3d-plugin-helsinki-precipitation` package and load it through the
existing `MT3D_PLUGIN_PRECIPITATION` integration point.

#### 10.1 Implement the plugin shell

- Export a factory returning an object implementing `PluginInterface`.
- Give the plugin a stable `id`, localized name, and layer-panel icon.
- Limit the default visibility to realtime clock mode and ground view mode.
- Add the particle renderer in `onEnabled()` and remove its resources in
  `onDisabled()` and `onRemove()`.
- Hide, resume, and dispose particles through `onVisibilityChanged()` and the
  normal plugin lifecycle.
- Use Three.js classes exposed by the host application's `mt3d.THREE` export
  so the plugin does not bundle or instantiate a second Three.js version.
- Keep `MT3D_PLUGIN_PRECIPITATION` unset by default. Helsinki deployments can
  explicitly enable the plugin after it has passed visual and performance
  checks.

#### 10.2 Add a deterministic demo provider

- Introduce a small provider interface that returns precipitation type,
  density, fall speed, and wind without requiring network access.
- Use fixed demo presets for light rain, heavy rain, and snow.
- Keep the demo provider independent from map sources and layer rendering.
- Make the provider replaceable so a later FMI-backed provider can return the
  same values without changing the particle renderer.
- Do not add weather endpoints, API keys, radar tiles, raster layers, or map
  overlays in the first version.

#### 10.3 Render particles in world-relative space

- Render rain as thin streaks with faster downward motion.
- Render snow as larger soft particles with slower downward motion and subtle
  horizontal drift.
- Store particle positions and velocities in the map's world coordinate
  system. Gravity must always act along the world's vertical axis, independent
  of camera bearing and pitch.
- Derive the visible simulation volume from the current camera for culling and
  recycling only. The volume may follow the camera, but particle coordinates
  and motion must not inherit the camera orientation.
- Preserve surviving particles at their existing world coordinates when the
  camera changes. Do not shift particles with the map center or transform the
  root object by the camera matrix.
- Bound the volume with the current frustum and a nearby depth range, using the
  host's scaled camera matrices. Immediately fill uncovered regions throughout
  the current view after pan, zoom, bearing, pitch, or viewport-size changes.
- Recycle particles after they leave the active world-space volume rather than
  reallocating geometry during animation. During steady animation, intersect
  the reverse world-space fall path with the volume and wrap particles to its
  upstream boundary. This boundary is not necessarily the screen's top edge.
- Orient rain streak endpoints along the world-space fall velocity. Use
  billboarded sprites for snow, with no camera-relative gravity component.
- In a straight-down view (Mapbox pitch 0), gravity remains world-z rather than
  becoming a sideways streak. Perspective may produce radial screen motion
  away from the view center; wind adds horizontal world-space drift.
- Add top-down and camera-rotation visual tests to verify this behavior.
- Use one batched geometry/draw call per effect where practical.
- Scale particle count for the device pixel ratio and viewport size, with
  conservative mobile and accessibility limits.
- Tune a stylized world-space fall rate so particles visibly move even at
  regional zoom, where one real-world meter occupies very few screen pixels.
- Suppress or dim the effect in underground mode and during map states where
  the plugin framework marks it hidden.
- React to the host map's `light` event so rain and snow remain visible in
  daylight, twilight, and night without creating a flat full-screen tint.

#### 10.4 Expose development controls

- Support URL or development-only configuration for precipitation type and
  preset, with sensible defaults for ordinary deployments.
- Allow light rain, heavy rain, and snow to be selected without rebuilding the
  plugin.
- Avoid exposing unfinished weather controls in the Helsinki production UI.
  The production control can remain the existing layer-panel toggle.

#### 10.5 Verify and prepare for live data

- Test enable, disable, visibility changes, plugin removal, repeated map
  initialization, and high-DPI resizing.
- Measure frame time and memory use during camera movement and zoom changes.
- Verify rain and snow velocity remains constant in world space while camera
  bearing and pitch change, especially at the top-down view limit.
- Verify particles continue moving visibly at regional zoom levels after
  accounting for perspective depth and Mercator scale, and that changing only
  pitch does not translate the particle field.
- Regression-test visible density and coverage in every viewport quadrant
  after pan, zoom, bearing, and pitch changes, as well as a minute of continuous
  snowfall. Measure projected movement rather than asserting speed constants.
- Use elapsed animation time even at low frame rates; cap only long pauses,
  rather than silently slowing the effect on every frame exceeding 50 ms.
- Verify that no precipitation tiles, map sources, or map layers are added.
- Confirm that the original Tokyo profile remains unchanged when the plugin
  variable is unset.
- Only after the static effect is stable, evaluate FMI open radar or forecast
  data as a sampled density/type provider. Radar values may influence particle
  parameters but must never be rendered as a precipitation overlay.

**Acceptance criteria**

- Rain or snow is visible as animated particles in the 3D viewport.
- The simulation is world-relative: gravity follows the world's vertical axis,
  while only particle-density/culling volume follows the camera.
- Looking straight down does not make snow or rain fall sideways. Wind may move
  particles horizontally, but gravity does not rotate with the camera.
- The plugin makes no network requests and uses no external weather source in
  demo mode.
- The map has no additional raster, vector, image, or precipitation overlay
  layer from this plugin.
- Enabling, disabling, hiding, removing, and recreating the plugin releases
  animation and GPU resources without errors or visible duplication.
- Particle rendering stays within the agreed frame-time and memory budget on
  desktop and mobile test devices.

**Camera-movement correction**

The old screen-top respawn strip depleted the viewport after camera movement.
Ground-center shifting also moved particles that should have stayed in world
space. Both mechanisms have been replaced by bounded-frustum replenishment and
world-velocity upstream recycling. Nine automated checks now cover camera
changes, steady snowfall, surviving world coordinates, elapsed-time updates,
resize/removal/recreation, and the existing demo/state behavior. Device-specific
performance and accessibility acceptance still require testing.


## HSL tariff-zone overlay feature plan

**Status: planned; initial release covers A-D.** Add E when authoritative HSL
geometry becomes available, using the same source and toggle.

### Scope and source data

- Add one Helsinki-only layer-panel entry, **HSL-maksuvyohykkeet** (display
  with Finnish diacritics in the UI), off by default. One toggle controls all
  zone boundaries and letters together; do not add separate A-E toggles.
- Use the supplied
  `data-raw/xn--HSL_n_maksuvyhykkeet-gbc.geojson`, rather than downloading data
  at runtime. Inspection found a 193,803-byte FeatureCollection containing
  `Zone` values A, B, C, and D: three Polygons and one MultiPolygon with two
  components. The CRS is CRS84, with WGS84 longitude/latitude coordinates.
- The supplied file contains no E geometry. The agreed first release renders
  A-D only; do not invent E, infer it from a bounding box, or display an
  unlocated E label. Keep processing compatible with an authoritative E
  feature in a future replacement dataset.
- Record the dataset URL and the verified license in the generated metadata
  and relevant source notices. The source page is
  [HSL tariff zones](https://public-transport-hslhrt.opendata.arcgis.com/datasets/hsln-maksuvy%C3%B6hykkeet/explore).
  Confirm the license and dataset currency before deployment. Map
  attribution is handled separately in
  [HSL data attribution in the map](#hsl-data-attribution-in-the-map).

### 1. Generate a small display asset

- Add `scripts/build-helsinki-zones.mjs` and a `build-helsinki-zones` npm
  command; include it in `build-helsinki-data`.
- Read the local file, validate Polygon/MultiPolygon geometry, closed rings,
  finite longitude/latitude coordinates, and unique uppercase zone IDs A-E.
  Reject malformed input explicitly and report the zones actually present.
  Report missing E as an expected limitation of this initial source.
- Preserve boundaries and holes without geometry simplification initially;
  remove unused ArcGIS attributes and the legacy CRS member from the output.
- One label per polygon part: every Polygon, and every component of a
  MultiPolygon, gets its own label. With the current data this gives five
  labels: A, B, C, and two D labels (one per D part). All labels of a zone
  show the same letter.
- Compute initial label anchors at build time, not in the browser. Use an
  interior visual-center algorithm such as Mapbox polylabel on each part,
  respecting holes. A simple centroid can fall outside a crescent-shaped
  zone or inside a hole. Prefer the established polylabel package over a
  custom algorithm; add the dependency only if existing helpers cannot
  provide interior placement. Retain WGS84 output coordinates.

### 1b. Editable label-position file

- Keep label positions in a version-controlled, hand-editable GeoJSON file,
  `data-raw/hsl-zone-labels.geojson`: a FeatureCollection of Point features
  with properties `id` (stable, e.g. `A-1`, `D-1`, `D-2`), `zone`, `part`
  (component index), and `source` (`computed` or `manual`). Users can open it
  in QGIS, geojson.io, or a text editor and move points.
- Assign part numbers deterministically: order a zone's components by area,
  largest first, so `D-1` is the main part and `D-2` the smaller part.
  Write the file with stable formatting (sorted by `id`, fixed coordinate
  precision, one feature per line or pretty-printed) for readable diffs.
- Script behavior:
  - If the file does not exist, create it from computed anchors with
    `source: computed`.
  - If it exists, never overwrite existing points. Keep every edited
    position as-is, add computed points only for new zone parts, and report
    stale entries whose zone/part no longer exists (fail rather than drop
    them silently).
  - Provide an explicit `--reset-labels` flag (optionally for one `id`) to
    regenerate computed positions; never reset implicitly.
  - Users moving a point may set `source: manual`; the script treats both
    values the same, but `manual` documents intentional edits.
- Validate the edited file: valid GeoJSON Points, finite WGS84 coordinates,
  unique IDs, known zones/parts. Warn (do not fail) when a point lies outside
  its own zone part, since manual placement is intentional but likely a
  mistake.
- Generate `build/data/hsl-zones.json` as one GeoJSON FeatureCollection
  containing the boundary features (one per zone) and the label points
  copied from the editable file, with `zone` and `featureType`
  (`zone-boundary` or `zone-label`). The browser never computes anchors.
- Document the edit workflow in the Helsinki build instructions: edit
  `data-raw/hsl-zone-labels.geojson`, rerun `npm run build-helsinki-zones`,
  and reload the map.

### 2. Integrate with the Helsinki source lifecycle

- In `scripts/gen-index.mjs`, add `zoneUrl: 'data/hsl-zones.json'` to the
  Helsinki HSL source. Preserve `zoneUrl` in `normalizeDataSource` in
  `src/map.js`; leave Tokyo configuration unchanged.
- Add zone-source loading and cleanup alongside the static route/port
  lifecycle, including initialization and data-source addition/removal.
  Register one Mapbox GeoJSON source with two rendering layers: boundaries
  and labels. No realtime polling, popup, picking, or filled polygon is needed.
- Initialize the `zones` visibility category explicitly to `none`; the current
  visibility getter defaults unknown categories to `visible`.
- Extend `getHelsinkiLayerVisibility`/`setHelsinkiLayerVisibility` integration
  and the Helsinki category list in `src/panels/layer-panel.js`. Apply the
  current toggle state when asynchronous loading completes, so an early
  toggle is not overwritten.
- Reuse existing JSON loading and explicit console/UI error reporting.
  Failed loads must not leave partial sources/layers or look successful.
  Removal and recreation must not duplicate layers or reset the user's
  in-session toggle choice. Do not introduce new cross-session persistence.

### 3. Render boundaries and zone letters

- Boundaries: an unfilled Mapbox `line` layer filtered to boundary features,
  dark grey `#4a4a4a`, approximately 1.5 pixels wide, with full opacity.
  Show all available zone outlines while enabled, including at zoom 14+.
- Labels: a `symbol` layer filtered to label features; `text-field` reads
  `zone`, using the existing bold font stack, a centered anchor, approximately
  32-pixel letters, dark grey text, and a 2-pixel white text halo.
- Keep letters upright and readable in pitched views using viewport-aligned
  text. Use overlap/placement settings that preserve every label point
  (including both D labels) without displacing its geographic anchor.
- Use a zoom-driven `text-opacity` expression: fully visible through zoom 13,
  linearly fading from 13 to 14, and zero at zoom 14 and higher. This interprets
  "closer to the ground" as closer zoom, not camera pitch or physical altitude.
  Do not fade boundaries or change the toggle state as labels fade.
- Extend `updateVisualizationLayerOrder` so zone lines are below transit
  overlays and zone letters are above boundaries/buildings but below
  realtime vehicles and stop labels. Preserve this order when other sources
  finish loading; do not rely only on initial insertion order.

### 4. Verification and documentation

- Add focused Node tests for preprocessing: the supplied data produces A-D
  boundaries and exactly five labels, computed anchors inside their
  corresponding parts, and two labels (`D-1`, `D-2`) for multipart D. Cover
  holes, malformed coordinates, duplicate/unsupported zone IDs, and accepting
  a future valid E feature.
- Test the editable label file: first run creates it; a rerun preserves a
  manually moved point byte-for-byte in the output; a new part is added
  without touching existing points; stale entries fail; `--reset-labels`
  restores computed positions; a point outside its part produces a warning.
- Test default-off visibility, toggling both render layers together, toggling
  before loading completes, source cleanup/recreation, and load failures.
- Evaluate the actual opacity expression at zoom 13, 13.5, 14, and above:
  expected values are 1, 0.5, 0, and 0. Confirm boundaries remain visible.
- Visually check A-D at regional zoom, the white rims against light/dark
  backgrounds, both D anchors, pitched views, and zoom 13-14 transitions.
  Move one label in the editable file, rebuild, and confirm the new position.
  Confirm existing route/stop/vehicle selection remains unaffected.
- Run the targeted zone tests, ESLint on changed implementation files, the
  Helsinki data build, and the application bundle build. Verify development
  and deployment both serve the generated asset. Smoke-test Tokyo mode for
  no new zone requests or UI entries.
- Update the directly related Helsinki build instructions, layer-control
  documentation, and About/source attribution during implementation.

**Acceptance criteria**

- One Helsinki tariff-zone toggle is initially off and controls every boundary
  and label together.
- Enabled A-D boundaries are dark grey and have no polygon fill; each zone
  part has one uppercase, white-rimmed letter (five with current data,
  including two D labels).
- Label positions come from `data-raw/hsl-zone-labels.geojson`; manual edits
  survive rebuilds and are only reset with an explicit flag.
- Labels fade smoothly to complete invisibility by zoom 14 and remain hidden
  at closer zooms; enabled boundaries do not disappear.
- Missing E is documented, not fabricated; adding valid authoritative E
  geometry requires no additional toggle or zone-specific rendering code.
- Loading errors are visible, lifecycle operations are clean, and existing
  Helsinki/Tokyo behavior is preserved.

## HSL data attribution in the map

**Status: implemented.** The Helsinki profile adds HSL data attribution to the Mapbox map attribution
field, i.e. the map's `customAttribution` option, which Mapbox renders in its
attribution control (the "ⓘ"/attribution text in the map corner). This is
independent of the tariff-zone feature.

- Use the HSL wording required by the verified license (HSL open data is
  generally CC BY 4.0, e.g. "© Helsingin seudun liikenne HSL, CC BY 4.0").
  Link to the license and HSL's open-data page.
- The HSL credit is independent of `appAttribution` and `configControl`.
  When replacing the static HSL feed, update the delivery date in `src/map.js`
  from the new GTFS `feed_info.txt` (`feed_version`).
- Keep the attribution Helsinki-only; Tokyo attribution stays unchanged.
- Verify the credit appears in the Mapbox attribution field on desktop and
  in the compact (mobile) attribution control, alongside the existing
  Mapbox/OpenStreetMap credits, and that links open in a new tab.

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
9. Restore Helsinki station/route search, configuration controls, detailed
   station information, and timetable panels.
10. Add trip updates and other realtime maritime sources only after the first
   two HSL feeds are verified.
11. Build the static demo particle plugin, verify lifecycle and rendering
    performance, and only then investigate an optional FMI-backed provider.
