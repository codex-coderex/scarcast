# SCARCAST Person 2 task list

The implementation approach, supplied-source inventory, and component contract are in [plan.md](plan.md). The six steps below retain the original planning checklist. Date-based asset references mean the exact original filenames in the source inventory.

## Current delivery status

- [x] Created the separate frontend app on strict port 5174, aligned with Person 1's existing landing launcher.
- [x] Staged all three original TIFFs and six sidecars, with matching source hashes.
- [x] Implemented the reusable map, local scene demo, controls, shared-viewport comparison, and race-safe pixel callback.
- [x] Passed production build, JavaScript syntax checks, and seven focused tests covering the real source pixels and UTC labels.
- [ ] Complete independent browser checks of the landing launcher, rendering, controls, error recovery, and mobile layout.
- [ ] Future Person 3 integration will consume the exported RasterMap and its callback from the data/analysis modules.

## Step 1 — Establish the integration handoff

### Task 1 — Align props, paths, and ownership

Give Persons 1 and 3 the proposed descriptors, props, inspection result, source paths, dependency list, and file ownership. Align the contract before the pages consume it.

Acceptance criteria

- [ ] The three developers have a common dataset/pair and inspection callback shape, including empty selection, stale-result clearing, dB values, and the common display range.
- [ ] Person 1 has the map dependency list and scaffold requirements, with ownership of the shared manifest and lockfile established.
- [ ] Person 2's original source paths are agreed with Person 3, who owns mock dataset descriptors, metadata display, and pair selection.

Verification

- [ ] Review the contract against Person 1's application state and Person 3's mock dataset/evidence shapes.
- [ ] Review Person 1's intended development/build commands and check package compatibility once its scaffold is available.
- [ ] Check that existing untracked work has been preserved through the setup repair.

Dependencies — None for coordination or Person 2's owned-file preparation. Person 1's scaffold is required for later execution checks.

Files likely touched — `tasks/plan.md` and `tasks/todo.md` for agreed handoff details. Person 1 owns the separate setup changes.

Estimated scope — Small, two planning files.

## Step 2 — Display one supplied local GeoTIFF

### Task 2a — Stage the August 22 scene

Copy the supplied August 22 GeoTIFF and matching metadata/bounds JSON sidecars into the agreed local asset directory during implementation. Preserve the original basenames and document the three-scene inventory in source notes.

Acceptance criteria

- [ ] The August 22 TIFF, metadata, and bounds JSON are available at their agreed same-origin URLs with original basenames.
- [ ] Source notes record provenance, filename-derived UTC times, HHHH/dB values, native EPSG 32651, NaN NoData, the shared 1,074 by 831 grid, encoding, sidecar bounds, display limits, and verified sample anchors.
- [ ] Copied asset hashes match the supplied originals, and the originals under Downloads remain available.

Verification

- [ ] Compare file hashes and source sizes, including the 2,291,844-byte August 22 TIFF.
- [ ] Read the staged TIFF header and sidecars to confirm the notes match the copied files.
- [ ] Once the frontend server runs, verify its three source URLs return the expected file types.

Dependencies — Task 1's path agreement. Staging can proceed while Person 1 prepares the scaffold.

Files likely touched

- August 22 `_db.tif` under `frontend/public/samples/nisar/`
- Matching August 22 `_metadata.json` under that directory
- Matching August 22 `_bounds.json` under that directory
- `frontend/public/samples/nisar/person2-samples.md`

Estimated scope — Medium, four files.

### Task 2b — Render the August 22 raster

First establish that the original striped Deflate/predictor-3 TIFF decodes correctly in the browser. Render it with GeoRasterLayer through reusable RasterMap and MapView components, including loading, empty-selection, and file-error states.

Acceptance criteria

- [ ] The original TIFF decodes with its Float32 Deflate/predictor-3 encoding, renders in the correct location, and fits its coverage.
- [ ] Rendering uses the documented dB display range and a local GeoTIFF URL.
- [ ] RasterMap receives a dataset through props and MapView forwards the contract into it.

Verification

- [ ] Confirm a complete-file fetch from the frontend server succeeds with the backend stopped and compare browser-decoded values with verified source anchors.
- [ ] Derive coverage from the native TIFF transform and compare the approximate sidecars, allowing the verified 1–2 m display-envelope difference. Test empty selection and a missing file URL.
- [ ] Run `npm run build` from `frontend/`.

Dependencies — Task 2a and Task 1's prop agreement. Person 1's runnable scaffold is required to execute the verification checks.

Files likely touched

- `frontend/src/components/map/RasterMap.jsx`
- `frontend/src/pages/MapView.jsx`
- `frontend/src/utils/raster.js`

Estimated scope — Medium, three files.

## Checkpoint — Local raster works

- [ ] The scaffold and map build successfully.
- [ ] The original August 22 TIFF decodes and renders through GeoRaster using the frontend server, including the verified NaN mask and dB pixel values.
- [ ] The prop contract still matches both collaborators' integration needs.

## Step 3 — Control raster display reliably

### Task 3 — Add map and layer controls

Add zoom/fit, visibility, and opacity controls. Ensure the map resizes in the application shell and disposes source-specific work correctly.

Acceptance criteria

- [ ] Labeled controls work with keyboard and touch, and the map resizes inside desktop/mobile layouts.
- [ ] Visibility/opacity changes and evidence-panel rerenders reuse the loaded raster, with loading keyed by source URL and independent of descriptor/callback identity.
- [ ] Source changes, unmount/remount, and delayed requests leave only the current layer and listeners active.

Verification

- [ ] Exercise controls and recreate descriptor/callback props during rerenders, using the network panel to confirm raster requests and parsing stay tied to source URL changes.
- [ ] Switch datasets while loading, navigate away/back, and exercise React StrictMode while checking for duplicate layers or console errors.
- [ ] Check container resizing and run build plus lint when a lint script exists.

Dependencies — Task 2b.

Files likely touched

- `frontend/src/components/map/RasterMap.jsx`
- `frontend/src/components/map/MapControls.jsx`
- `frontend/src/components/map/map.module.css`
- `frontend/src/utils/raster.js`

Estimated scope — Medium, four files.

## Step 4 — Inspect pixels through the shared callback

### Task 4 — Sample the active raster correctly

Sample the first raster band using actual GeoTIFF georeferencing and return a result that Person 3 can show in the evidence panel.

Acceptance criteria

- [ ] Verified pixel-center anchors return stored dB values within `1e-5` dB using explicit EPSG 32651 proj4 registration and the shared 10-metre affine grid.
- [ ] Outside coverage and NoData produce the agreed statuses, while unsupported transforms/read errors appear visibly in the map.
- [ ] Each new click/source change clears evidence, the latest inspection request wins even on unchanged sources, and a failed read leaves evidence clear.

Verification

- [ ] Check the three finite anchor rows and the inside-grid NaN corner in plan.md, longitude/latitude-to-UTM conversion, and outside-grid bounds. Test valid zero handling, backed by one exact zero in the August 22 source.
- [ ] Trigger source changes and rapid clicks with reversed completion order. Verify early `onPixelInspect(null)`, only the latest result, and clear evidence after a failed read following a valid result.
- [ ] Run build and available lint/test scripts, recording unavailable checks. TIFF inspection during planning does not establish browser sampling correctness.

Dependencies — Tasks 2b and 3.

Files likely touched

- `frontend/src/utils/raster.js`
- `frontend/src/components/map/RasterMap.jsx`
- `frontend/src/utils/raster.test.js` if the scaffold has an established test runner
- `frontend/public/samples/nisar/person2-samples.md`

Estimated scope — Medium, up to four files.

## Checkpoint — Controls and inspection work

- [ ] Build and available lint/focused checks pass.
- [ ] A verified source pixel produces the expected evidence result, including after navigation and dataset changes.
- [ ] Map lifecycle, rerenders, and rapid click interactions produce current evidence and a single active layer/listener set.

## Step 5 — Compare dated observations

### Task 5a — Stage the September 3 scene

Copy the supplied September 3 TIFF and matching metadata/bounds sidecars to the agreed local source paths during implementation.

Acceptance criteria

- [ ] The three September 3 source assets retain their full original basenames at the agreed frontend paths.
- [ ] Hashes match the supplied originals, including the 2,306,359-byte TIFF.
- [ ] Person 3 receives the source paths and metadata facts for its owned dataset directory.

Verification

- [ ] Compare hashes, TIFF header, and source notes, including its own finite/NaN mask counts.
- [ ] Verify the staged same-origin URLs through the frontend server when available.

Dependencies — Task 1's path agreement. Asset staging can proceed alongside Tasks 2–4.

Files likely touched — September 3 `_db.tif`, matching `_metadata.json`, and matching `_bounds.json` under `frontend/public/samples/nisar/`.

Estimated scope — Medium, three files.

### Task 5b — Stage the September 15 scene

Copy the supplied September 15 TIFF and matching metadata/bounds sidecars to the agreed local source paths during implementation.

Acceptance criteria

- [ ] The three September 15 source assets retain their full original basenames at the agreed frontend paths.
- [ ] Hashes match the supplied originals, including the 2,292,856-byte TIFF.
- [ ] Person 3 receives the source paths and metadata facts for its owned dataset directory.

Verification

- [ ] Compare hashes, TIFF header, and source notes.
- [ ] Verify the staged same-origin URLs through the frontend server when available.

Dependencies — Task 1's path agreement. Asset staging can proceed alongside Tasks 2–4.

Files likely touched — September 15 `_db.tif`, matching `_metadata.json`, and matching `_bounds.json` under `frontend/public/samples/nisar/`.

Estimated scope — Medium, three files.

### Task 5c — Compare the supplied observation sequence

Add a Reference/Comparison toggle that retains the viewport and shared display range. Inspect both sources at the same clicked location.

Acceptance criteria

- [ ] A pair selected by Person 3 can be toggled with observation dates visible and the map position/color scale preserved.
- [ ] One click emits a correctly identified dB sample for each source, including its independent NoData/outside status.
- [ ] Every click/pair change clears evidence and only the latest complete pair result is emitted. Read failures leave evidence clear, with measurement/date context and Person 3's evidence status retained.

Verification

- [ ] Toggle after pan/zoom and verify the same location remains in view.
- [ ] Check both dated pairs using the pixel-center anchors within `1e-5` dB, including each file's own finite mask and unclipped readings. Exercise rapid clicks, slow/failed reads, and pair changes to verify clearing and ordering.
- [ ] Run build and available lint/focused checks and review date/measurement labels with Person 3. Verify explicit UTC dates stay consistent with filenames and filters in an Asia/Manila browser timezone.

Dependencies — Tasks 3, 4, 5a, and 5b plus Person 3's compatible-pair selection.

Files likely touched

- `frontend/src/components/map/RasterMap.jsx`
- `frontend/src/components/map/MapControls.jsx`
- `frontend/src/utils/raster.js`
- `frontend/src/utils/raster.test.js` if an established runner exists and pair sampling needs regression coverage

Estimated scope — Medium, up to four files.

## Step 6 — Verify teammate integration

### Task 6 — Exercise the full selection-to-evidence flow

Give Persons 1 and 3 the completed module and handoff details, then verify the map through the actual navigation, dataset directory, and Analysis page.

Acceptance criteria

- [ ] Person 1's navigation opens MapView and Person 3's selection supplies the correct dataset/pair through the agreed parent state.
- [ ] Person 3's Analysis page can embed RasterMap and display current inspection values, dates, and source context in its evidence panel.
- [ ] Desktop/mobile behavior, loading/empty/error recovery, and backend-independent raster loading pass the integrated checks.

Verification

- [ ] Run `npm run build`, available lint, and focused checks from `frontend/`.
- [ ] Complete the directory selection to map to pixel evidence flow in the browser, including navigation away/back and quick selection changes.
- [ ] Inspect the console/network panel with the backend stopped and record dependencies, imports, source URLs, verification results, and unresolved failures in the handoff.

Dependencies — Task 5c, Person 1's page integration, and Person 3's selection/evidence wiring.

Files likely touched — Person 2's `RasterMap.jsx`, `MapView.jsx`, and scoped map styles for integration corrections, plus these planning files for completion evidence. Person 1 and Person 3 apply changes to their owned modules.

Estimated scope — Medium, up to five Person 2 files.

## Checkpoint — Person 2 deliverable complete

- [ ] Supplied GeoTIFF rendering, controls, opacity/visibility, pixel inspection, and dated observation comparison work through the integrated app.
- [ ] Applicable build, lint, and focused checks pass. Unavailable checks and remaining failures are reported accurately.
- [ ] The handoff includes the final prop contract, preserved source paths, source notes, and verification evidence.
