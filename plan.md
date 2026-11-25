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
- **Next:** Decide whether to add a compact schedule subset and, later, route
  stop-pattern panels and realtime vehicle data.

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
2. Define whether service schedules are a goal; if yes, preprocess a compact
   current-service timetable instead of sending the full `stop_times.txt` to
   browsers.
3. Add route stop patterns and Helsinki transit panels.
4. Add Helsinki journey search only after an appropriate open API or derived
   graph is selected.

This keeps the first working milestone focused on the existing request to draw
routes rather than reproducing the complete Tokyo feature set.

### 7. Add realtime data

Later optional phases:

1. Integrate HSL GTFS-Realtime vehicle positions for supported route types.
2. Add service alerts and trip-level matching.
3. Enrich Digitraffic ports with realtime vessel visits when selected.
4. Optimize route geometry, layer switching, and 3D object loading.
5. Update attribution and licensing for each added dataset.

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


## Verification strategy

For each phase, run the smallest relevant checks and retain the results:

- Build and lint the affected files.
- Run data validation on generated route assets.
- Check for requests to Tokyo endpoints in Helsinki mode.
- Verify route counts, shape counts, and geographic bounds.
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
7. Only then proceed to stops, schedules, and realtime vehicles.
