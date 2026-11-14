# SCARCAST map workspace

Run the map app in a second terminal alongside the landing page.

```powershell
cd frontend
npm ci
npm run dev
```

The workspace uses `http://localhost:5174`. The existing landing page runs on port 5173 and its Open app link points to port 5174. Both Vite projects specify their own PostCSS settings because the older root-level files contain misplaced content.

For another deployment address, set `VITE_LANDING_URL` when starting or building the workspace to direct its project links. Person 1's landing app uses `VITE_APP_URL` for its Open app destination. Their defaults connect the two local ports above.

The basemap uses OpenStreetMap's standard HTTPS tiles with visible copyright attribution. Raster observations are served from the local sample assets. [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/)

```powershell
npm test
npm run build
```

The seven Node tests decode the original GeoTIFFs, check the independent geographic anchors and native grid, distinguish NaN/outside/zero, preserve raw values and source identity, and verify UTC labels.

## Component handoff

The runnable entry is `src/main.jsx` → `App.jsx` → `pages/MapView.jsx`. MapView provides the local scene selection demo. Person 1 can mount MapView in the future application shell, and Person 3 can embed the reusable map directly.

```jsx
import RasterMap from './components/map/RasterMap.jsx';

<RasterMap
  dataset={referenceDataset}
  comparisonDataset={comparisonDataset}
  onPixelInspect={setInspection}
/>
```

The primary descriptor can be `null`. A descriptor contains `id`, `label`, `acquiredAt`, `geotiffUrl`, `units`, and `displayRange`. The comparison descriptor and callback are optional. Map-owned demo descriptors are in `components/map/sampleScenes.js`.

The callback receives `{ lat, lng, samples }`, with one `{ datasetId, value, units, status }` per selected source. Status is `valid`, `nodata`, or `outside`. The callback receives `null` when a source changes or a new click begins. The latest inspection wins, and a failed read leaves the evidence clear.

Raster loading is cached by URL for up to three scenes, including in-flight requests. Control updates and callback/descriptor rerenders reuse the decoded pixels. GeoTIFF.js decodes the supplied first band once and GeoRaster receives the resulting rows plus native metadata for Leaflet rendering. Pixel reads use those same decoded values and the TIFF transform.

## Source data

The three original TIFFs and their metadata/bounds sidecars are under `public/samples/nisar/`, retaining their complete source filenames. See `public/samples/nisar/person2-samples.md` for provenance and sample anchors. Dates in the demo are explicitly UTC and derived from the product filenames.

The map presents single-acquisition HHHH backscatter in dB with a shared visualization stretch. Inspection returns unclipped stored values. Event alignment, independent scar validation, and interpretation remain with the research/analysis workflow.
