// Manifest contract for map-ready, georeferenced image overlays supplied by the science team.
// Do not put raw NISAR HDF5 here. Export a georeferenced PNG plus its bounds.
// Each record must identify a real source and true acquisition date(s).
export function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

function goodBounds(bounds) {
  return Array.isArray(bounds) && bounds.length === 2 &&
    bounds.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)) &&
    bounds[0][0] < bounds[1][0] && bounds[0][1] < bounds[1][1];
}

function validLayer(layer) {
  if (!layer || typeof layer !== "object") return false;
  if (!["GCOV", "GUNW"].includes(layer.product) || !layer.id || !layer.layerUrl || !goodBounds(layer.bounds)) return false;
  if (layer.product === "GCOV") return validDate(layer.acquisitionDate);
  return validDate(layer.referenceDate) && validDate(layer.secondaryDate);
}

export async function loadAnalysisLayers() {
  const response = await fetch("/data/analysis/manifest.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Observation manifest failed to load (${response.status}).`);
  const manifest = await response.json();
  if (!Array.isArray(manifest.layers)) throw new Error("Observation manifest is missing its layers array.");
  return manifest.layers.filter(validLayer);
}

export function layerIntersectsArea(layer, center, radius, siteId) {
  if (siteId !== "explore" && layer.siteId === siteId) return true;
  if (!center) return false;
  const [[south, west], [north, east]] = layer.bounds;
  const latHalf = radius / 111320;
  const lngHalf = radius / (111320 * Math.max(0.1, Math.cos(center[0] * Math.PI / 180)));
  return center[0] + latHalf >= south && center[0] - latHalf <= north &&
    center[1] + lngHalf >= west && center[1] - lngHalf <= east;
}
