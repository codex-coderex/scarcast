# SCARCAST Person 2 implementation plan

This document records the Interactive Map and GeoRaster plan, source QA, and implementation status. The Person 2 frontend now displays the supplied local GeoTIFFs, provides map/raster controls, inspects pixels, and compares dated observations. The original task checklist is retained in [todo.md](todo.md).

## Implementation status

The user subsequently authorized implementation against the latest Person 1 landing app. A separate React/JavaScript app now exists under `frontend/` on strict port 5174, matching the landing page's existing Open app link. MapView contains the local scene selection demo and exports its reusable RasterMap through `components/map/RasterMap.jsx`. Sample descriptors are map-owned, leaving Person 3's dataset/analysis modules available for future integration.

Person 2 owns the new frontend scaffold for this delivery. The only shared landing change is inline PostCSS isolation in `landing/vite.config.ts`, which fixes config discovery reaching the malformed root files. The landing plugins and port remain configured by Person 1's app.

The frontend production build, JavaScript syntax checks, seven real-TIFF sampling tests, and all nine source-asset hash comparisons pass. Browser and launcher verification is in progress. The build reports upstream mapping-package directive warnings and a large main chunk, while the current GeoRaster dependency chain has legacy audit findings under review.

## Original starting point

The checkout contains a README and six untracked frontend/configuration files at the repository root. Their contents are misplaced. The React application is inside `index.html`, the React entry code is inside `package.json`, CSS is inside `main.jsx`, PostCSS configuration is inside `index.css`, HTML is inside `tailwind.config.js`, and explanatory text is inside `postcss.config.js`.

There is currently no `frontend/` scaffold, valid dependency manifest, or sample GeoTIFF in the checkout. The supplied data is available separately under `C:/Users/Calvyn/Downloads/output`. The existing monolithic application requests backend endpoints. The README describes a future backend workflow and its endpoint requirement is stale for the Day 1 assignment, which uses local GeoTIFFs and mock dataset descriptors.

Historical pasted assistant text reports an updated GeoRaster frontend, backscatter/change views, and a frontend ZIP. That report is unverified context. An accessible ZIP is absent from the supplied paste, and the current root files require the scaffold repair described here.

The original plan assigned Person 1 the shared scaffold. The subsequent implementation authorization supplies a dedicated frontend scaffold within Person 2's delivery, alongside the existing Person 1 landing app. The original root files remain outside that app.

## Research brief context

The supplied five-page brief describes Candidate 6 landslide mapping, with Balikabok's reported August 30 failure as the lead case. It suggests a late-August reference, an initial compatible September observation, and a later same-track observation for persistence review. Calanogas is proposed as an independent transfer case and Tipo as a developed-site comparison. The brief frames its comparison cases as documented 2026 evidence and attributes optical scar evidence to PhilSA/DENR-MGB, using April 6 and September 13 imagery and describing approximately 110 hectares and a 14-day post-event interval. These are claims in the supplied brief. Source references, event-to-scene timing/geographic alignment, and validation status still require confirmation before those claims become confirmed interface labels. The supplied pages have reference numbers without a bibliography.

The August 22, September 3, and September 15, 2026 files form a candidate observation sequence for that proposed review once event/scene alignment is confirmed. The Day 1 map will present acquisition dates and source measurements. A persistence finding would require reviewing the observations and independent evidence.

The brief's mapping proposal uses MapLibre and a Python geospatial processing stack. The explicit Day 1 assignment uses Leaflet/GeoRaster and local frontend data. Its proposed signed channel-change processing, independent scar/optical/date validation, terrain/geometry assessment, and exposure/runout analysis belong to later data and analysis handoffs. Date-slider navigation, scar/coverage overlays, road/stream filters, area-overlap metrics, and export are future interface dependencies described by that brief.

Raster coverage describes the stored grid. The supplied AOI describes a selection polygon. An independently mapped scar requires its own geometry and provenance. NoData records invalid or masked raster values. Shadow/layover attribution requires terrain and acquisition-geometry evidence. Terrain, scar, road/stream/asset layers and change GeoTIFFs have yet to be supplied for this handoff.

## File ownership

| Owner | Files and responsibility | Handoff |
| --- | --- | --- |
| Person 1 | `frontend/package.json`, lockfile, Vite/Tailwind configuration, `src/App.jsx`, `src/main.jsx`, `src/index.css`, layout, navigation, dashboard, shared UI | Runnable app, installed map dependencies, selected dataset state, page integration |
| Person 2 | `frontend/src/components/map/`, `frontend/src/pages/MapView.jsx`, `frontend/src/utils/raster.js`, supplied raster assets and notes under `frontend/public/samples/nisar/` | Reusable map component, page wrapper, prop contract, staged source files, verification results |
| Person 3 | `src/components/data/`, `src/components/analysis/`, `src/pages/DataDirectory.jsx`, `src/pages/Analysis.jsx`, `src/mocks/datasets.js` | Dataset descriptors, selected reference/comparison pair, evidence panel consuming pixel results |

Use a dedicated map feature branch and small commits restricted to Person 2's files. Person 1 applies shared dependency and configuration changes in one place. Person 3 adds the agreed source URLs and metadata to the dataset directory. Coordinate the contract and asset paths first so all three developers can work concurrently. Person 2 can prepare asset staging and write the owned map modules while Person 1 completes the scaffold. Runtime verification then uses that scaffold.

## Proposed component contract

The following is a proposed handoff contract. It has not been implemented or agreed with the other developers yet.

`RasterMap` is the reusable map component under `components/map/`. `MapView` is the page wrapper under `pages/` and forwards the same three props.

```jsx
<RasterMap
  dataset={selectedDataset}
  comparisonDataset={comparisonDataset}
  onPixelInspect={handlePixelInspect}
/>
```

| Prop | Meaning |
| --- | --- |
| `dataset` | Primary dataset descriptor, or `null` for an empty map state |
| `comparisonDataset` | Optional second descriptor, defaulting to `null`. When supplied, `dataset` is the reference observation and this descriptor is the comparison observation |
| `onPixelInspect` | Optional callback receiving the inspection result below, or `null` when the source/pair changes or a new inspection starts |

A map dataset descriptor uses these plain JavaScript fields. The source ID below is the actual August 22 product basename.

```js
const firstSceneId =
  'NISAR_L2_PR_GCOV_028_140_A_009_4005_DHDH_A_20260822T213032_20260822T213106_P05023_N_F_J_001';

const dataset = {
  id: firstSceneId,
  label: 'NISAR GCOV HHHH · Aug 22, 2026',
  acquiredAt: '2026-08-22T21:30:32Z',
  geotiffUrl: `/samples/nisar/${firstSceneId}_db.tif`,
  units: 'dB',
  displayRange: [-13.080083084106445, 1.167296767234798]
};
```

`acquiredAt` currently holds the product start time parsed from the filename, normalized to ISO UTC. Person 3 records its provenance as filename-derived and preserves the original product name. The TIFF ImageDescription is empty and DateTime/GDAL_METADATA tags are absent, so the inspected files establish the filename timing used here. The source sidecars carry dB units and the chosen common `displayRange` is a visualization setting for the supplied sequence. Person 3 retains source/sidecar URLs, bounds, AOI, product details, and time provenance, then supplies this subset to the map. Local asset URLs follow Person 1's application base path.

Use explicitly labeled UTC acquisition dates in map controls and coordinate this formatting with Persons 1 and 3. The filename start time of 21:30 UTC falls on the next calendar day in Asia/Manila, so date filters, labels, and selected IDs need a consistent timezone.

The supplied rasters use their first band and already store dB values. Pixel inspection preserves those values. GeoRaster uses `displayRange` only for color mapping. Bounds are derived from each TIFF and checked against its sidecar, so the map contract needs no separate bounds or metadata URL props.

The callback emits one entry per selected dataset at the same geographic location.

```js
{
  lat: 14.9,
  lng: 120.4,
  samples: [
    {
      datasetId: firstSceneId,
      value: storedValue,
      units: 'dB',
      status: 'valid'
    }
  ]
}
```

Each sample has status `valid`, `nodata`, or `outside`. Its value is `null` for `nodata` and `outside`. Numeric zero remains valid unless the file explicitly declares zero as NoData. The component shows loading/read errors locally. Call `onPixelInspect(null)` when the source/pair changes and when each new click begins, so a pending or failed read leaves the evidence clear. Only the latest inspection request for the current sources may emit a completed result. This also applies to successive clicks on the same sources, where an earlier slow read must be discarded after a later click.

Person 1 holds selected dataset/pair state above the pages. Person 3 sends selection changes to that parent and consumes inspection results in the evidence panel. Person 3 can embed `RasterMap` directly in Analysis. The map receives descriptors through props and contains its own view, opacity, visibility, and comparison-toggle state.

## Map behavior

- Load same-origin GeoTIFF URLs served by the frontend, parse the raster, and render with GeoRasterLayer. Fit to the primary raster on source selection and provide zoom and fit-to-data controls.
- Import Leaflet's required CSS from the map module. Keep custom styles inside the map directory with scoped classes or a CSS module. Give the map a definite height and resize it when its container changes size or becomes visible.
- Adjust layer visibility, opacity, and display styling without fetching or parsing the GeoTIFF again. Key loading effects by the source URL and use the current callback when emitting results. Recreated descriptor objects or callback functions during Person 3's evidence-panel rerenders reuse the loaded raster. Clean up layers, listeners, and pending work when source URLs change or the map unmounts.
- Keep loading, empty, unsupported-file, and retry states within the map area. Label controls for keyboard and touch use and follow Person 1's existing UI conventions and charcoal/violet theme when available.
- Read georeferencing and NoData metadata from each raster. Keep Leaflet's default Web Mercator map and use GeoRaster's georeferenced overlay placement for the native EPSG 32651 files. Transform clicked longitude/latitude into WGS84 / UTM zone 51N before reading a pixel. Use the TIFF affine transform and surface unsupported projections/transforms as readable errors.
- Prevent delayed loads or pixel reads from displaying an earlier selection or click. Clear evidence at the start of every inspection, invalidate earlier requests, and leave evidence clear on read failure. Verify React StrictMode mounting and cleanup to avoid duplicate layers and listeners.

Register the known EPSG 32651 definition explicitly for proj4 sampling, using WGS84 / UTM zone 51N as verified in the TIFF geokeys. The existing source uses `+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs` for this CRS. Keep Day 1 projection handling scoped to the supplied files and report unsupported CRS inputs visibly.

## Comparison choice

For Day 1, use a Reference/Comparison toggle with the observation dates on the same map. Preserve the current viewport while toggling. Use a shared display range across a compatible pair so the color scale stays comparable. A click returns both source values at the selected geographic location.

The supplied files contain single-acquisition backscatter in dB. The brief supplies reported event context. Event-to-scene geographic/timing alignment and independent validation remain to be confirmed. The dated observation sequence supports visual comparison and measurement inspection. Event-relative labels require that alignment and evidence, and a change-map workflow requires an appropriate change raster or a separately scoped computation.

Person 3 selects observations representing the same measurement, polarization, and units in the intended order. Source notes describe the supported observation sequence. Each raster uses its own georeferencing for sampling. Compatibility checks belong to Person 3's selection interface because it holds the richer metadata. That interface explains unknown/incompatible pairings and passes `comparisonDataset` only for a compatible pair. Matching layer names and dB units are the initial evidence for this supplied sequence, with acquisition geometry and product details retained in the metadata for review.

## Supplied rasters and dependencies

Person 2 stages the three supplied `_db.tif` files and their matching `_metadata.json` and `_bounds.json` sidecars under `frontend/public/samples/nisar/` during implementation. Preserve each full original basename and the source files under Downloads. Stage one scene per small asset commit and document filenames, provenance, header facts, sidecar bounds, and known sample values in `person2-samples.md`. Person 3 owns the dataset list and normalizes these source facts into map descriptors.

The original product basenames are the dataset IDs. Append `_db.tif`, `_metadata.json`, or `_bounds.json` to obtain each staged filename.

```text
NISAR_L2_PR_GCOV_028_140_A_009_4005_DHDH_A_20260822T213032_20260822T213106_P05023_N_F_J_001
NISAR_L2_PR_GCOV_029_140_A_009_4005_DHDH_A_20260903T213032_20260903T213106_P05023_N_F_J_001
NISAR_L2_PR_GCOV_030_140_A_009_4005_DHDH_A_20260915T213031_20260915T213106_P05023_N_F_J_001
```

The three filename-derived product start times are August 22 at 21:30:32 UTC, September 3 at 21:30:32 UTC, and September 15 at 21:30:31 UTC, all in 2026. The compressed TIFF sizes are 2,291,844, 2,306,359, and 2,292,856 bytes respectively, about 6.9 MB combined. Their sidecars identify NASA/ASF provisional NISAR L2 GCOV HDF5 sources, `/science/LSAR/GCOV/grids/frequencyA/HHHH`, dB units, source CRS EPSG 32651, and display CRS EPSG 3857. The actual TIFF headers declare stored EPSG 32651. Map placement and pixel reads use that native georeferencing.

| Verified TIFF property | All three supplied files |
| --- | --- |
| Image/bands | One image with one Float32 band |
| Dimensions | 1,074 columns by 831 rows |
| CRS | EPSG 32651, WGS84 / UTM zone 51N |
| Grid spacing | 10 by 10 metres, with PixelIsArea semantics |
| Upper-left origin | Easting 214,780 m, northing 1,655,350 m |
| Pixel scale | `[10, 10, 0]`, matching geokeys/tiepoint across all three files |
| NoData | GDAL NoData is NaN |
| Storage | Striped Adobe Deflate, compression code 8, floating-point predictor 3 |
| Decoded band size | 3,569,976 bytes per scene, calculated as 831 × 1,074 × 4 |

Grid spacing describes the sampling grid. A claim about physical resolving power needs additional product evidence. The striped encoding requires a browser decoder check against the original TIFFs early in implementation. Establish that GeoTIFF/GeoRaster correctly decodes Deflate with floating-point predictor 3, then verify georeferencing and known pixel values before adding controls. COG structure and efficient HTTP byte-range access have yet to be established for these files, so the initial loading plan fetches each selected local TIFF as a complete file and reuses the parsed result during control changes.

All supplied bounds sidecars give Leaflet latitude/longitude bounds `[[14.882619914103886, 120.34832230784168], [14.958821189873776, 120.44896916358047]]`. The AOI GeoJSON uses longitude/latitude coordinate order. Preserve that distinction while checking source coverage.

The native TIFF extent is `[214780, 1647040, 225520, 1655350]` in `[xmin, ymin, xmax, ymax]` UTM metres. Transforming its edges with pyproj using 21-point densification gives the longitude/latitude envelope `[120.34832230784168, 14.882631191420256, 120.44898512598887, 14.95882118987378]` in `[west, south, east, north]` order. Its south/east limits differ from the sidecars by roughly 1–2 metres. Overlay placement follows the TIFF's native transform, while the sidecars supply approximate display bounds for QA. The preview PNGs are 1,081 by 847 pixels, whereas the native TIFFs are 1,074 by 831. GeoRaster uses the native raster grid for placement and inspection.

Python decoding with tifffile and imagecodecs succeeded for all three files and confirmed the shared grid. Valid-data masks differ slightly by date.

| Source date | Finite pixels | NaN pixels | Valid exact-zero pixels |
| --- | --- | --- | --- |
| 2026-08-22 | 649,733 | 242,761 | 1 |
| 2026-09-03 | 649,734 | 242,760 | 0 |
| 2026-09-15 | 649,736 | 242,758 | 0 |

The three-way common finite mask contains 649,723 pixels. This is source QA for the supplied three-scene set. A selected pair's valid overlap depends on that pair's masks. Terrain visibility requires terrain/geometry evidence. Keep the source QA meaning attached to any counts Person 3 presents.

## Verified pixel anchors

Rows and columns below are zero-based. Geographic coordinates identify pixel centers in latitude/longitude order. Values are stored dB readings in the order August 22, September 3, September 15. Verify browser sampling to an absolute tolerance of at most `1e-5` dB using the rounded values below.

| Row, column | Latitude, longitude | Aug 22 dB | Sep 3 dB | Sep 15 dB |
| --- | --- | --- | --- | --- |
| 207, 268 | 14.939231143517288, 120.37349389618463 | -5.850677 | -4.244648 | -5.615273 |
| 415, 537 | 14.920730721400854, 120.39870836896272 | -7.960824 | -7.702043 | -6.000237 |
| 623, 805 | 14.902225749295823, 120.42382584507249 | -9.290138 | -8.922976 | -7.293465 |
| 0, 0 | 14.95763881440507, 120.34836931226607 | NaN | NaN | NaN |

The first-pixel anchor lies inside the native grid and should emit `nodata`. An outside-grid coordinate should emit `outside`. Source changes and rapid successive clicks must preserve these statuses while clearing obsolete evidence.

## Display range

| Product date from filename | Sidecar display minimum | Sidecar display maximum |
| --- | --- | --- |
| 2026-08-22 | -12.812190055847168 | 0.34552037715911865 |
| 2026-09-03 | -12.666807537078858 | 1.167296767234798 |
| 2026-09-15 | -13.080083084106445 | 0.46658700704571343 |

Use `[-13.080083084106445, 1.167296767234798]` as the proposed common display range across this sequence. It is the union of the supplied display limits and clips more extreme measured values during color mapping. Record it as a chosen visualization default. Pixel inspection returns the unclipped stored values with their precision and dB units. Source PNGs can supply preview context and have their own display stretch. GeoRaster renders the original GeoTIFF overlay.

Person 1 installs compatible versions of `leaflet`, `react-leaflet`, `georaster`, `georaster-layer-for-leaflet`, `geotiff`, and `proj4` against the project's React/Vite versions. Person 2 sends this dependency list and any verified compatibility needs to Person 1. The map consumes the resulting installation.

## Evidence provenance

- The Day 1 ownership and frontend stack come from the supplied task distribution's opening section. [Task distribution](<C:/Users/Calvyn/.codex/attachments/09e9f71f-570a-4fba-959a-8501b18178d1/Pasted text.txt>)
- The research context comes from pages 1–4 of the supplied brief. Page 5 is blank. Its external reference claims remain subject to source verification. [NASA Candidate Problems (2).pdf](<C:/Users/Calvyn/Downloads/NASA Candidate Problems (2).pdf>)
- The historical frontend update is supplied context from the first 45 lines of the pasted excerpt. It records source-review context and leaves browser/runtime verification pending. [Historical excerpt](<C:/Users/Calvyn/.codex/attachments/27ecc813-f02b-4b84-aa76-2d896db2a677/Pasted text.txt>)
- Raster headers, decoded pixels, and QA counts were inspected from the three original TIFFs under `C:/Users/Calvyn/Downloads/output`. Sidecar examples establish the layer, units, source URL, AOI, display stretch, and approximate display bounds. [August 22 metadata](<C:/Users/Calvyn/Downloads/output/NISAR_L2_PR_GCOV_028_140_A_009_4005_DHDH_A_20260822T213032_20260822T213106_P05023_N_F_J_001_metadata.json>), [August 22 bounds](<C:/Users/Calvyn/Downloads/output/NISAR_L2_PR_GCOV_028_140_A_009_4005_DHDH_A_20260822T213032_20260822T213106_P05023_N_F_J_001_bounds.json>)

## Implementation order

The first delivery checkpoint is one supplied local GeoTIFF rendered through GeoRaster with working controls. Pixel inspection and dated reference/comparison remain part of Person 2's assigned scope and follow that working map.

1. Establish the prop contract and runnable scaffold handoff.
2. Stage the first source, verify its original encoding in the browser, and display it through the reusable map and page wrapper.
3. Add view, visibility, and opacity controls with correct loading and cleanup behavior.
4. Inspect pixels correctly and emit results for the evidence panel.
5. Add comparison using the same viewport and both source values.
6. Verify integration through the real navigation, dataset selection, and Analysis page.

Detailed acceptance criteria, files, dependencies, and checkpoints are in [todo.md](todo.md).

## Verification and handoff

After the scaffold is ready, run `npm run build` from `frontend/`. Run `npm run lint` if Person 1 provides that script. Use the established test runner for focused sampling checks that protect CRS conversion, pixel boundaries, NoData/zero handling, and source/click changes during pending reads. Include successive clicks completed out of order and a failed read after a valid result. If the scaffold has no runner, record equivalent checks against known source values and report that automated coverage is unavailable.

Use the browser to verify desktop/mobile layout, navigation away and back, hidden-panel resizing, dataset switching during loading, visibility and opacity, both comparison values, empty selection, failed file loading and recovery, console errors, and network requests. Local raster loading should succeed with the backend stopped.

Handoff includes the import path and prop contract, original source URLs and notes, required dependencies, completed checks, and any remaining failures. Person 1 integrates MapView into navigation. Person 3 connects its selection and evidence panel through the agreed props. Those integration changes stay with their file owners.

## Decisions to resolve during implementation

| Decision or dependency | Owner | Planned resolution |
| --- | --- | --- |
| Runnable scaffold and React/Leaflet package compatibility | Person 1 | Establish project scripts and dependency versions before map execution checks |
| Dataset field names and callback contract | Persons 1, 2, and 3 | Use the proposal above as the starting point and adjust before dependent page wiring |
| Supplied local rasters and provenance | Person 2 | Stage the supplied originals and document source facts, then send paths and metadata to Person 3 |
| Comparable dataset pairing and evidence presentation | Person 3 | Pass a compatible pair and render the callback result in the evidence panel |
| Day 1 comparison interaction | Person 2 | Use a shared-viewport toggle with dates as the working assumption |
| Browser decoding of supplied encoding | Person 2, with package compatibility owned by Person 1 | Verify Deflate/predictor-3 decoding against the original raster before control work |
| Event and independent evidence alignment | Person 3 and research/data owners | Confirm the brief's event/year context against geography, source references, scar/optical evidence, and acquisition suitability before event-relative interpretation |

Source QA includes TIFF header inspection, Python decoding, counts/anchors, sidecar comparison, and text/visual review of PDF pages 1–4, with page 5 blank. The implemented frontend now passes its production build and seven focused JavaScript tests against those original TIFFs. This JavaScript app has no TypeScript or ESLint toolchain. Browser and launcher checks are reported separately when completed.
