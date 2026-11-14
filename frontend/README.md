# Frontend

Run `npm install` then `npm run dev` from this directory. See the repository-root README for architecture and team responsibilities.

The Map & Analysis route at `/map` displays the supplied NISAR GeoTIFFs. A date slider above the map selects the displayed observation, and the adjacent Data panel shows the selected date, source information, and clicked pixel readings. The Fullscreen map button expands the map and date bar. Use Exit fullscreen or Escape to return to the split layout.

The integration uses the latest application sidebar and routes. Dashboard and Reports retain their upstream placeholders. Raster assets and sidecars are under `public/samples/nisar/`. The feature files are under `src/features/map/`, using the reusable raster components under `src/components/map/`.

Vite runs on `http://localhost:5174` with a strict port, matching the landing page's Open app link. Inline PostCSS isolation keeps project configuration within this frontend. The older misplaced root prototype files are preserved under `legacy-prototype/`.

Pixel readings use native TIFF georeferencing and retain stored dB values. Dates are derived from the product filenames and labeled UTC. Source notes and independent pixel anchors are in `public/samples/nisar/person2-samples.md`. OpenStreetMap supplies the basemap with visible attribution.
