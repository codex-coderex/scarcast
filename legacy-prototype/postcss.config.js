# SCARCAST frontend only

This package contains **only frontend files**. Do not copy files to `backend/` or `project_site/`.

## Stack
React (JavaScript), Vite, Tailwind CSS, Framer Motion, Leaflet / React Leaflet, geotiff.js and proj4.

## Run
```bash
cd frontend
npm install
cp .env.example .env  # on Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

The UI consumes the existing backend without changing it. Default `VITE_API_URL=http://localhost:8000`.
Expected read-only endpoints: `GET /api/timeline`, `GET /api/scenes`; each returns paths to backend-served PNG and GeoTIFF assets. The frontend overlays PNG on Leaflet and samples GeoTIFF values on click.

No HDF5 extraction or GeoTIFF creation is done here. The dashboard is for radar disturbance screening, not confirmed landslide detection.


## GeoTIFF overlays (GeoRaster)
The map now renders the original GeoTIFFs directly using `georaster` and `georaster-layer-for-leaflet`. It does **not** use PNG image overlays. Change rasters come from `/api/timeline` (`change_geotiff`), while backscatter rasters come from matching `/api/scenes` (`geotiff`). The backend API and project_site files remain unchanged. Pixel sampling uses `geotiff.js` for a precise one-pixel read. The browser must be able to fetch the TIFF URLs (including CORS for cross-origin hosting).

Run `npm install` after upgrading, then `npm run dev`.
