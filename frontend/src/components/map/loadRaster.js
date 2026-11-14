import parseGeoraster from 'georaster';
import { decodeRaster } from '../../utils/raster.js';

const rasters = new Map();
const MAX_CACHED_RASTERS = 3;

async function fetchRaster(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Raster request failed (${response.status}).`);
  }
  const raster = await decodeRaster(await response.arrayBuffer());
  const rows = Array.from({ length: raster.height }, (_, row) =>
    raster.values.subarray(row * raster.width, (row + 1) * raster.width),
  );
  const georaster = await parseGeoraster([rows], {
    projection: raster.epsg,
    noDataValue: raster.noDataValue,
    width: raster.width,
    height: raster.height,
    xmin: raster.xmin,
    ymin: raster.ymin,
    xmax: raster.xmax,
    ymax: raster.ymax,
    pixelWidth: Math.abs(raster.resolution[0]),
    pixelHeight: Math.abs(raster.resolution[1]),
    mins: [raster.min],
    maxs: [raster.max],
    ranges: [raster.max - raster.min],
  });
  return { ...raster, georaster };
}

export function loadRaster(url) {
  if (rasters.has(url)) return rasters.get(url);
  if (rasters.size >= MAX_CACHED_RASTERS) {
    rasters.delete(rasters.keys().next().value);
  }
  const pending = fetchRaster(url).catch((error) => {
    if (rasters.get(url) === pending) rasters.delete(url);
    throw error;
  });
  rasters.set(url, pending);
  return pending;
}
