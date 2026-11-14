import type { GUNWLayer, GUNWProcessOptions, GUNWRaster, ProcessedGUNWData } from './gunwTypes'

/** Decode the full-resolution scalar image AND its internal GDAL validity mask. */
export async function readGUNWRaster(layer: GUNWLayer, signal: AbortSignal): Promise<GUNWRaster> {
  signal.throwIfAborted()
  const response = await fetch(layer.url, { signal })
  if (!response.ok) throw new Error(`Unable to load GUNW ${layer.key}: HTTP ${response.status}`)
  const buffer = await response.arrayBuffer()
  const { fromArrayBuffer } = await import('geotiff')
  const tiff = await fromArrayBuffer(buffer, signal)
  const image = await tiff.getImage()
  const width = image.getWidth(), height = image.getHeight()
  if (image.getSamplesPerPixel() !== 1) throw new Error(`GUNW layer must be scalar: ${layer.key}`)
  const keys = image.getGeoKeys()
  const projection = Number(keys?.ProjectedCSTypeGeoKey ?? keys?.GeographicTypeGeoKey)
  const [pixelWidth, pixelY] = image.getResolution()
  const [xmin, ymax] = image.getOrigin()
  const expected = layer.gridMetadata
  const actualTransform = [pixelWidth, 0, xmin, 0, pixelY, ymax]
  if (width !== expected.shape[1] || height !== expected.shape[0] || !(pixelWidth > 0 && pixelY < 0)
    || expected.transform.length !== 6 || actualTransform.some((value, i) => Math.abs(value - expected.transform[i]) > 1e-6)
    || !Number.isFinite(projection) || `EPSG:${projection}` !== expected.source_crs) {
    throw new Error(`GUNW raster geometry differs from metadata: ${layer.key}`)
  }
  const samples = await image.readRasters({ samples: [0], interleave: true, signal })
  let mask: ArrayLike<number> | undefined
  const count = await tiff.getImageCount()
  for (let i = 1; i < count; i++) {
    const candidate = await tiff.getImage(i)
    if ((Number(candidate.getFileDirectory().NewSubfileType) & 4)
      && candidate.getWidth() === width && candidate.getHeight() === height) {
      mask = await candidate.readRasters({ samples: [0], interleave: true, signal }) as ArrayLike<number>
      break
    }
  }
  const noDataValue = image.getGDALNoData()
  // Zero is a legitimate measurement. Never infer validity from zero-valued storage.
  if (!mask && noDataValue === null) throw new Error(`GUNW raster has no validity mask or nodata: ${layer.key}`)
  const validMask = new Uint8Array(width * height)
  const rows = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const index = y * width + x, value = Number(samples[index])
    const valid = (!mask || mask[index] !== 0) && Number.isFinite(value) && value !== noDataValue
    validMask[index] = valid ? 1 : 0
    return valid ? value : NaN
  }))
  signal.throwIfAborted()
  const { default: parseGeoraster } = await import('georaster')
  const georaster = await parseGeoraster([rows], {
    width, height, projection, pixelWidth, pixelHeight: -pixelY, xmin, ymax, noDataValue: NaN,
  })
  signal.throwIfAborted()
  return Object.assign(georaster, { values: [rows], validMask })
}

export function assertSameGUNWGrid(a: GUNWRaster, b: GUNWRaster) {
  const keys = ['width', 'height', 'projection', 'pixelWidth', 'pixelHeight', 'xmin', 'ymax'] as const
  if (keys.some(key => a[key] !== b[key])) throw new Error('GUNW rasters must have identical grids; resample explicitly before comparing.')
}

/** New arrays ensure that masking and differences never modify a cached source. */
export function combineGUNWRasters(a: GUNWRaster, b: GUNWRaster, operation: 'phaseMask' | 'difference'): GUNWRaster {
  assertSameGUNWGrid(a, b)
  const validMask = new Uint8Array(a.width * a.height)
  const values = [a.values[0].map((row, y) => row.map((value, x) => {
    const index = y * a.width + x
    const other = b.values[0][y][x]
    const valid = a.validMask[index] && b.validMask[index]
      && (operation === 'phaseMask' ? other === 1 : value >= 0 && value <= 1 && other >= 0 && other <= 1)
    validMask[index] = valid ? 1 : 0
    return valid ? operation === 'phaseMask' ? value : other - value : NaN
  }))]
  return { ...a, values, validMask, noDataValue: NaN }
}

const diverging = [[33, 102, 172], [247, 247, 247], [178, 24, 43]]
const sequential = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]]
const cyclic = [[80, 25, 100], [40, 120, 180], [220, 210, 100], [200, 70, 70], [80, 25, 100]]
function colorTable(stops: number[][]) {
  return Array.from({ length: 256 }, (_, index) => {
    const position = index / 255 * (stops.length - 1)
    const low = Math.min(Math.floor(position), stops.length - 2), fraction = position - low
    return `rgb(${stops[low].map((value, channel) => Math.round(value + fraction * (stops[low + 1][channel] - value))).join(', ')})`
  })
}
const phaseColors = colorTable(diverging)
const coherenceColors = colorTable(sequential)
const wrappedColors = colorTable(cyclic)
const categories = colorTable([[230, 159, 0], [86, 180, 233], [0, 158, 115], [204, 121, 167], [240, 228, 66]])

export function gunwColor(value: number, quantity: string, min: number, max: number): string | null {
  if (!Number.isFinite(value)) return null
  if (quantity === 'phase_valid_mask') return value === 1 ? 'rgb(0, 158, 115)' : null
  if (quantity === 'connectedComponents' && (value === 0 || value === 65535)) return null
  if (['connectedComponents', 'mask', 'validDataMask'].includes(quantity)) return categories[(Math.abs(value) * 37) % 256 | 0]
  if (quantity === 'coherenceMagnitude' && (value < 0 || value > 1)) return null
  const fraction = max === min ? 0.5 : Math.max(0, Math.min(1, (value - min) / (max - min)))
  const colors = quantity === 'wrappedPhase' ? wrappedColors
    : ['coherenceMagnitude', 'correlationSurfacePeak', 'ionospherePhaseScreenUncertainty'].includes(quantity) ? coherenceColors : phaseColors
  // Red indicates coherence loss; change is later minus earlier.
  return colors[Math.round((quantity === 'coherenceChange' ? 1 - fraction : fraction) * 255)]
}

export function prepareGUNWDisplay(result: Omit<ProcessedGUNWData, 'layerOptions' | 'displayMin' | 'displayMax'>, options: GUNWProcessOptions): ProcessedGUNWData {
  const visualization = result.layer.metadata.visualization
  const isChange = result.quantity === 'coherenceChange'
  const isCoherence = result.quantity === 'coherenceMagnitude'
  const displayMin = options.displayMin ?? (isChange ? -1 : isCoherence ? 0 : visualization?.min ?? 0)
  const displayMax = options.displayMax ?? (isChange || isCoherence ? 1 : visualization?.max ?? 1)
  const opacity = options.opacity ?? 0.8, resolution = options.resolution ?? 128
  if (!Number.isFinite(displayMin) || !Number.isFinite(displayMax) || displayMin > displayMax
    || !Number.isFinite(opacity) || opacity < 0 || opacity > 1 || !Number.isInteger(resolution) || resolution < 1) {
    throw new Error('Invalid GUNW display range, opacity, or resolution.')
  }
  return {
    ...result, displayMin, displayMax,
    layerOptions: {
      georaster: result.georaster, opacity, resolution, resampleMethod: 'nearest',
      updateWhenIdle: true, updateWhenZooming: false, caching: true,
      pixelValuesToColorFn: ([value]) => gunwColor(value, result.quantity, displayMin, displayMax),
    },
  }
}
