# Frontend

Run `npm install` then `npm run dev` from this directory. See the repository-root README for architecture and team responsibilities.

The map feature currently contains UI placeholders. The supplied NISAR GeoTIFFs and metadata are available under `public/samples/nisar/`, with the existing raster components under `src/components/map/`. The integration uses the sidebar and routes from the latest application scaffold.

Vite runs on `http://localhost:5174` with a strict port, matching the landing page's Open app link. Inline PostCSS isolation keeps project configuration within this frontend.
