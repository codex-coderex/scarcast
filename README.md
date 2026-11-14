# SCARCAST

**Satellite Change Assessment for Rapid Landslide Screening and Tracking**

SCARCAST is a proposed web-based geospatial platform for exploring **NISAR Level-2** radar observations and screening for possible landslide-related surface disturbances. The project emphasizes interpretable change maps, transparent radar evidence, and uncertainty-aware assessment rather than automatic confirmation or prediction of landslides.

> **Project status:** Early development. Features and data workflows described below are planned unless implemented and verified in the repository.

## Project goals

- Visualize georeferenced NISAR Level-2 raster products on an interactive map.
- Compare compatible radar acquisitions to explore possible surface changes.
- Inspect raster measurements at selected locations.
- Organize available scenes and their metadata in a data directory.
- Present evidence and data-quality limitations clearly across desktop and mobile screens.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React, JavaScript |
| Styling | Tailwind CSS |
| Motion | Framer Motion |
| Mapping | Leaflet, React Leaflet |
| Raster visualization | georaster, georaster-layer-for-leaflet |
| Raster inspection | GeoTIFF / geotiff.js |
| Backend pipeline | HDF5 extraction and GeoTIFF conversion (managed separately) |

## Planned repository structure

```text
main/
├── frontend/       # React interface, map, raster visualization
├── backend/        # HDF5 processing and data-serving pipeline
└── project_site/   # Project-specific data and supporting resources
```

The current repository may not yet contain all three directories. Frontend work is the present development focus; backend and project-site contents are maintained separately.

## Data flow

```text
NISAR Level-2 HDF5
        |
        v
Backend: extract geospatial raster data
        |
        v
GeoTIFF output + metadata
        |
        v
Frontend: fetch GeoTIFF
        |
        v
georaster -> GeoRasterLayer -> Leaflet map
        |
        v
User selects a location -> inspect raster values
```

**GeoTIFF is the map overlay source.** PNG imagery is not used as the primary Leaflet raster overlay.

## Planned interface

- **Dashboard:** overview of available observations and analyses.
- **Data Directory:** browse scenes, acquisition dates, product types, and metadata.
- **Map / Analysis:** display GeoTIFF layers and inspect pixel values.
- **Comparison:** examine compatible observations and radar change layers.
- **Evidence panel:** show measured changes, coverage, and interpretation limitations.
- **Responsive layout:** consistent desktop and mobile experiences with a muted charcoal-and-violet theme.

## Local frontend development

Once the frontend source is added:

```bash
cd frontend
npm install
npm run dev
```

The frontend requires an appropriate data endpoint or locally served GeoTIFF files. Endpoint paths and environment variables should be documented when the backend contract is finalized.

## Scientific caution

Radar backscatter changes are **not unique indicators of landslides**. Vegetation changes, moisture, surface roughness, and acquisition geometry can also affect observations. SCARCAST is intended for preliminary screening and human review, not real-time landslide prediction, emergency alerts, or official hazard certification.

## Data and references

- [NISAR mission](https://nisar.jpl.nasa.gov/)
- [ASF Vertex data search](https://search.asf.alaska.edu/)
- [NISAR GCOV documentation](https://nisar-docs.asf.alaska.edu/gcov/)
- [NISAR product overview](https://nisar-docs.asf.alaska.edu/products-overview/)

## Development

Repository: [Michael-Andre-Novela/scarcast](https://github.com/Michael-Andre-Novela/scarcast)

This README will be updated as implementation, data access, and evaluation are verified.
