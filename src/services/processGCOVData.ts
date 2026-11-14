import type { GridLayer, LatLngBoundsLiteral } from 'leaflet'
import type { GeoRasterLayerOptions } from 'georaster-layer-for-leaflet'

/** The part of the Python export's metadata needed for backscatter display. */
export interface GCOVMetadata {
  product: 'GCOV'
  source: string
  aoi: { type: 'Polygon'; coordinates: number[][][] }
  identification: {
    zeroDopplerStartTime: string
    zeroDopplerEndTime: string
    orbitPassDirection: string
    [key: string]: unknown
  }
  frequencies: Record<string, {
    source_crs: string
    shape: [number, number]
    transform: number[]
    bounds_file: string
    backscatter?: {
      file: string
      layer: string
      units: 'dB'
      visualization: string
      display_min_db: number
      display_max_db: number
    }
    [key: string]: unknown
  }>
}

export interface GCOVAcquisition {
  id: string
  location: string
  acquiredAt: string
  frequency: 'A'
  url: string
  bounds: LatLngBoundsLiteral
  displayMinDb: number
  displayMaxDb: number
  metadata: GCOVMetadata
}

// Vite discovers root data files and emits the TIFFs as assets in production.
// Only URLs and JSON are eager: pixel arrays are fetched when selected.
const rasterUrls = import.meta.glob<string>('../../data/*/gcov/*/db.tif', {
  eager: true,
  query: '?url',
  import: 'default',
})
const metadataFiles = import.meta.glob<GCOVMetadata>('../../data/*/gcov/*/metadata.json', {
  eager: true,
  import: 'default',
})
const boundsFiles = import.meta.glob<LatLngBoundsLiteral>('../../data/*/gcov/*/bounds.json', {
  eager: true,
  import: 'default',
})

/** Backscatter manifest, indexed by location with acquisitions oldest first. */
export const gcovManifest: Readonly<Record<string, readonly GCOVAcquisition[]>> =
  Object.entries(rasterUrls).reduce<Record<string, GCOVAcquisition[]>>((manifest, [path, url]) => {
    const directory = path.slice(0, -'db.tif'.length)
    const [, location, id] = path.match(/\/data\/([^/]+)\/gcov\/([^/]+)\/db\.tif$/)!
    const metadata = metadataFiles[`${directory}metadata.json`]
    const bounds = boundsFiles[`${directory}bounds.json`]
    const backscatter = metadata?.frequencies.A?.backscatter

    if (metadata?.product !== 'GCOV' || !backscatter || backscatter.file !== 'db.tif' || !bounds) {
      throw new Error(`Missing GCOV backscatter metadata or bounds: ${location}/${id}`)
    }
    const { display_min_db: displayMinDb, display_max_db: displayMaxDb } = backscatter
    if (!Number.isFinite(displayMinDb) || !Number.isFinite(displayMaxDb) || displayMinDb > displayMaxDb) {
      throw new Error(`Invalid GCOV display range: ${location}/${id}`)
    }

    const acquisition: GCOVAcquisition = {
      id,
      location,
      acquiredAt: metadata.identification.zeroDopplerStartTime,
      frequency: 'A',
      url,
      bounds,
      displayMinDb,
      displayMaxDb,
      metadata,
    }
    const acquisitions = manifest[location] ??= []
    acquisitions.push(acquisition)
    acquisitions.sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt))
    return manifest
  }, Object.create(null))

export function getGCOVAcquisitions(location: string): readonly GCOVAcquisition[] {
  return gcovManifest[location] ?? []
}

const grayscaleColors = Array.from({ length: 256 }, (_, gray) => `rgb(${gray}, ${gray}, ${gray})`)

/** Grayscale stretch for existing dB values; missing pixels stay transparent. */
export function backscatterColor(
  value: number,
  minDb: number,
  maxDb: number,
  noDataValue?: number | null,
): string | null {
  if (!Number.isFinite(value) || value === noDataValue) return null
  const fraction = maxDb === minDb ? 0.5 : (value - minDb) / (maxDb - minDb)
  const gray = Math.round(255 * Math.max(0, Math.min(1, fraction)))
  return grayscaleColors[gray]
}

/** Parse a single db.tif into a georaster and ready-to-use GeoRasterLayer options. */
export async function processGCOVData(acquisition: GCOVAcquisition, signal?: AbortSignal) {
  const response = await fetch(acquisition.url, { signal })
  if (!response.ok) {
    throw new Error(`Unable to load GCOV backscatter ${acquisition.id}: HTTP ${response.status}`)
  }
  const buffer = await response.arrayBuffer()
  const { default: parseGeoraster } = await import('georaster')
  signal?.throwIfAborted()
  const georaster = await parseGeoraster(buffer)
  signal?.throwIfAborted()
  const layerOptions: GeoRasterLayerOptions = {
    georaster,
    opacity: 0.8,
    resolution: 128,
    updateWhenIdle: true,
    updateWhenZooming: false,
    resampleMethod: 'nearest',
    pixelValuesToColorFn: ([value]) => backscatterColor(
      value,
      acquisition.displayMinDb,
      acquisition.displayMaxDb,
      georaster.noDataValue,
    ),
  }
  return { acquisition, georaster, layerOptions }
}

/** Call in the browser, then layer.addTo(map) and map.fitBounds(acquisition.bounds). */
export async function createGCOVBackscatterLayer(
  acquisition: GCOVAcquisition,
  signal?: AbortSignal,
): Promise<GridLayer> {
  const { layerOptions } = await processGCOVData(acquisition, signal)
  const { default: GeoRasterLayer } = await import('georaster-layer-for-leaflet')
  signal?.throwIfAborted()
  const layer: GridLayer & { cache: Record<string, HTMLCanvasElement> } = new GeoRasterLayer(layerOptions)
  // GeoRasterLayer 4.1.2 shares its prototype tile cache across instances.
  // Isolate rendered canvases so a new acquisition cannot reuse another date's tiles.
  layer.cache = {}
  return layer
}
