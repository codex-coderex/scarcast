import type { GeoRaster, GeoRasterLayerOptions } from 'georaster-layer-for-leaflet'
import type { GridLayer, LatLngBoundsLiteral } from 'leaflet'

export interface GUNWLayerMetadata {
  file: string
  dtype?: string
  source_path?: string
  attributes?: { units?: string; [key: string]: unknown }
  visualization?: { min?: number; max?: number; rendering?: string; colormap?: string }
  [key: string]: unknown
}

export interface GUNWGridMetadata {
  source_crs: string
  shape: [number, number]
  transform: number[]
  bounds_key: string
  layers: Record<string, GUNWLayerMetadata>
}

export interface GUNWMetadata {
  product: 'GUNW'
  source: string
  aoi: { type: 'Polygon'; coordinates: number[][][] }
  identification: {
    referenceZeroDopplerStartTime: string
    secondaryZeroDopplerStartTime: string
    orbitPassDirection: string
    [key: string]: unknown
  }
  limitations: string[]
  frequencies: Record<string, {
    coherence_threshold: number
    grids: Record<string, GUNWGridMetadata>
    [key: string]: unknown
  }>
}

export interface GUNWLayer {
  /** Fully qualified: unwrappedInterferogram/HH/unwrappedPhase, for example. */
  key: string
  name: string
  grid: string
  polarization?: string
  url: string
  bounds: LatLngBoundsLiteral
  gridMetadata: GUNWGridMetadata
  metadata: GUNWLayerMetadata
}

export interface GUNWAcquisition {
  id: string
  location: string
  frequency: string
  referenceAt: string
  secondaryAt: string
  bounds: LatLngBoundsLiteral
  defaultLayer: string
  layers: Readonly<Record<string, GUNWLayer>>
  unsupportedLayers: readonly string[]
  metadata: GUNWMetadata
}

export type GUNWRaster = GeoRaster & { values: number[][][]; validMask: Uint8Array }

export interface GUNWProcessOptions {
  layer?: string
  /** Applies the export's phase-validity mask only to unwrapped phase. */
  maskPhase?: boolean
  displayMin?: number
  displayMax?: number
  opacity?: number
  resolution?: number
}

export interface ProcessedGUNWData {
  acquisition: GUNWAcquisition
  comparison?: GUNWAcquisition
  layer: GUNWLayer
  quantity: string
  units: string
  displayMin: number
  displayMax: number
  phaseMasked: boolean
  georaster: GUNWRaster
  layerOptions: GeoRasterLayerOptions
  limitations: readonly string[]
}

export interface GUNWDataCache {
  process: (acquisition: GUNWAcquisition, options?: GUNWProcessOptions, signal?: AbortSignal) => Promise<ProcessedGUNWData>
  coherenceChange: (before: GUNWAcquisition, after: GUNWAcquisition, options?: GUNWProcessOptions, signal?: AbortSignal) => Promise<ProcessedGUNWData>
  getLayer: (acquisition: GUNWAcquisition, options?: GUNWProcessOptions, signal?: AbortSignal) => Promise<GridLayer>
  getChangeLayer: (before: GUNWAcquisition, after: GUNWAcquisition, options?: GUNWProcessOptions, signal?: AbortSignal) => Promise<GridLayer>
  setMoving: (moving: boolean) => void
  preload: (acquisitions: readonly GUNWAcquisition[], layers?: readonly string[], signal?: AbortSignal) => Promise<{ loaded: string[]; failed: { key: string; error: unknown }[] }>
  /** Aborts shared pending work, removes cached Leaflet layers, and frees data. */
  clear: () => void
}
