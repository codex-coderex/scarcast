# Scarcast

An interactive NISAR investigation of Mount Balikabok and its downstream landscape, built for NASA Space Apps.

## Run the active app

From this directory, install dependencies with `npm install`, then run `npm run dev`. Open `/` for the existing landing page or `/dashboard` for the world map. Select a study location to open its investigation.

The dashboard offers independent **Radar / Optical / Context** views. Switching views preserves your layers, dates, and map position. The satellite summary keeps radar choices, dates, and the active legend visible. Optical images have real acquisition dates; they are not same-day replacements for missing observations.

Both Balikabok locations open on the reported event's mountain evidence. Select a patch in the list or on the map to inspect its native area, separate optical-supported/unsupported/unknown areas, and source acquisitions, or export a printable preliminary evidence brief. The continuous timeline cross-fades real rasters; intermediate positions are labeled visual blends and never calculate interpolated assessment statistics. Selected candidate footprints remain reference footprints while other dates blend. Radar dates are explicitly UTC, with Philippine acquisition times available alongside them. The focused background is a neutral cartographic map.

## Folder guide

| Folder | Purpose |
| --- | --- |
| `src/pages/` | Landing page and dashboard orchestration |
| `src/components/landing/` | Existing landing experience; outside dashboard cleanup |
| `src/components/dashboard/` | Map, radar overlays, timeline, and location panel |
| `src/components/dashboard/investigation/` | Satellite summary, independent evidence views, dated optical viewer |
| `src/services/` | Raster discovery/loading, quality-aware caches, evidence selection |
| `src/assets/styles/dashboard/` | Dashboard styles; exploratory panel rules are isolated in `explorer.css` |
| `process/` | Offline extraction and derived evidence builders; see its README |
| `data/` | Exported observations, masks, metadata, and derived evidence; required by the app and processors |
| `tests/` | Node application/data checks and Python numerical checks |
| `docs/` | Dashboard specification and future processing design |
| `prototypes/legacy-explorer/` | Preserved independent JavaScript prototype, separated from the active app |

Keep generated `dist/`, dependencies, and ignored `.tmp-*` inspection artifacts out of source changes. Existing processing paths remain stable; no scientific inputs are deleted by dashboard cleanup. Retain the design/specification documents until the user explicitly requests their removal.

## Optical imagery currently available

The combined downstream study includes HLS Sentinel-2 frames acquired **6 April, 13 September, 18 September, and 25 September 2026**. Optical offers automatic matching to the radar date or manual selection, a full-image link, an on-map overlay, and opacity adjustment. Cloud/invalid pixels are gray. No usable August 30 frame is included; September 13 is the first usable post-event frame in this export.

The vegetation-agreement outlines always use the fixed April 6–September 13 comparison. Choosing another RGB frame does not recompute that analysis.

## Validate

- `npm run build`
- `npm test` — all Node suites
- `npm run test:processing` — Python algorithm tests with the processing requirements installed

Processing is offline and is not required to launch the app with the existing exports. Do not put Earthdata credentials in the frontend or source tree.
