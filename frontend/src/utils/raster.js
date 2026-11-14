import { fromArrayBuffer } from 'geotiff';
import proj4 from 'proj4';

proj4.defs('EPSG:32651', '+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs');

export async function decodeRaster(buffer) {
  const tiff = await fromArrayBuffer(buffer);
  const image = await tiff.getImage();
  const keys = image.getGeoKeys();
  const epsg = Number(keys.ProjectedCSTypeGeoKey ?? keys.GeographicTypeGeoKey);
  if (!proj4.defs(`EPSG:${epsg}`)) {
    throw new Error(`The raster projection EPSG:${epsg} is unsupported.`);
  }
  if (image.fileDirectory.ModelTransformation) {
    throw new Error('This map supports north-up raster grids.');
  }

  const origin = image.getOrigin();
  const resolution = image.getResolution();
  const noDataValue = image.getGDALNoData();
  const [values] = await image.readRasters({ samples: [0] });
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (Number.isFinite(value) && value !== noDataValue) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  if (!Number.isFinite(min)) {
    throw new Error('The raster contains no valid measurements.');
  }

  const [xmin, ymin, xmax, ymax] = image.getBoundingBox();
  return {
    width: image.getWidth(),
    height: image.getHeight(),
    values,
    origin,
    resolution,
    epsg,
    noDataValue,
    min,
    max,
    xmin,
    ymin,
    xmax,
    ymax,
  };
}

export function sampleRaster(raster, { lat, lng }) {
  const [x, y] = proj4('EPSG:4326', `EPSG:${raster.epsg}`, [lng, lat]);
  const column = Math.floor((x - raster.origin[0]) / raster.resolution[0]);
  const row = Math.floor((y - raster.origin[1]) / raster.resolution[1]);
  if (column < 0 || row < 0 || column >= raster.width || row >= raster.height) {
    return { value: null, status: 'outside' };
  }

  const value = Number(raster.values[row * raster.width + column]);
  if (!Number.isFinite(value) || value === raster.noDataValue) {
    return { value: null, status: 'nodata' };
  }
  return { value, status: 'valid' };
}

export function inspectRasters(datasets, rasters, latlng) {
  return {
    lat: latlng.lat,
    lng: latlng.lng,
    samples: datasets.map((dataset, index) => ({
      datasetId: dataset.id,
      units: dataset.units,
      ...sampleRaster(rasters[index], latlng),
    })),
  };
}
