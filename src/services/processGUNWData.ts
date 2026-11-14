import type { LatLngBoundsLiteral } from 'leaflet'
import type { GUNWAcquisition, GUNWLayer, GUNWMetadata, GUNWProcessOptions } from './gunwTypes'
import { createGUNWDataCache } from './gunwDataCache'

export type * from './gunwTypes'
export { createGUNWDataCache } from './gunwDataCache'

const rasterUrls = import.meta.glob<string>([
  '../../data/*/gunw/*/*.tif',
  '!../../data/*/gunw/*/*_wrappedInterferogram.tif',
], {
  eager: true, query: '?url', import: 'default',
})
const metadataFiles = import.meta.glob<GUNWMetadata>('../../data/*/gunw/*/metadata.json', {
  eager: true, import: 'default',
})
const boundsFiles = import.meta.glob<Record<string, LatLngBoundsLiteral>>('../../data/*/gunw/*/bounds.json', {
  eager: true, import: 'default',
})

function validBounds(bounds: LatLngBoundsLiteral | undefined): bounds is LatLngBoundsLiteral {
  return !!bounds && bounds.length === 2 && bounds.every(point => point.length === 2 && point.every(Number.isFinite))
    && bounds[0][0] < bounds[1][0] && bounds[0][1] < bounds[1][1]
}

function utcTimestamp(value: string | undefined) {
  // NISAR identification timestamps are UTC even when their text omits "Z".
  return value && (/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`)
}

/** Acquisition pairs indexed by location, then ordered by reference date. No TIFFs are fetched here. */
export const gunwManifest: Readonly<Record<string, readonly GUNWAcquisition[]>> = (() => {
  const manifest: Record<string, GUNWAcquisition[]> = Object.create(null)
  for (const [path, metadata] of Object.entries(metadataFiles)) {
    const directory = path.slice(0, -'metadata.json'.length)
    const match = path.match(/\/data\/([^/]+)\/gunw\/([^/]+)\/metadata\.json$/)
    if (!match) continue
    const [, location, id] = match
    const bounds = boundsFiles[`${directory}bounds.json`]
    const referenceAt = utcTimestamp(metadata.identification?.referenceZeroDopplerStartTime)
    const secondaryAt = utcTimestamp(metadata.identification?.secondaryZeroDopplerStartTime)
    if (metadata.product !== 'GUNW' || !bounds || !referenceAt || !secondaryAt
      || !Number.isFinite(Date.parse(referenceAt)) || !Number.isFinite(Date.parse(secondaryAt))
      || Date.parse(referenceAt) >= Date.parse(secondaryAt)) {
      throw new Error(`Invalid GUNW metadata or date pair: ${location}/${id}`)
    }
    for (const [frequency, frequencyMetadata] of Object.entries(metadata.frequencies)) {
      const layers: Record<string, GUNWLayer> = Object.create(null)
      const unsupportedLayers: string[] = []
      for (const [grid, gridMetadata] of Object.entries(frequencyMetadata.grids)) {
        const gridBounds = bounds[gridMetadata.bounds_key]
        if (!validBounds(gridBounds)) throw new Error(`Missing GUNW bounds: ${id}/${grid}`)
        for (const [name, layerMetadata] of Object.entries(gridMetadata.layers)) {
          const key = `${grid}/${name}`
          // The export includes a scalar wrappedPhase alternative for this complex raster.
          if (layerMetadata.dtype?.startsWith('complex')) { unsupportedLayers.push(key); continue }
          if (!layerMetadata.file || /[/\\]/.test(layerMetadata.file)) throw new Error(`Invalid GUNW layer filename: ${id}/${key}`)
          const url = rasterUrls[`${directory}${layerMetadata.file}`]
          if (!url) throw new Error(`Missing GUNW raster: ${id}/${key}`)
          layers[key] = {
            key, name: name.split('/').at(-1)!, grid,
            polarization: name.includes('/') ? name.split('/')[0] : undefined,
            url, bounds: gridBounds, gridMetadata, metadata: layerMetadata,
          }
        }
      }
      const defaultLayer = Object.keys(layers).find(key => layers[key].name === 'unwrappedPhase')
        ?? Object.keys(layers).find(key => layers[key].name === 'coherenceMagnitude')
      if (!defaultLayer) throw new Error(`No displayable GUNW phase/coherence: ${id}/${frequency}`)
      ;(manifest[location] ??= []).push({
        id, location, frequency, referenceAt, secondaryAt, bounds: layers[defaultLayer].bounds,
        defaultLayer, layers, unsupportedLayers, metadata,
      })
    }
  }
  for (const pairs of Object.values(manifest)) {
    pairs.sort((a, b) => a.referenceAt.localeCompare(b.referenceAt)
      || a.secondaryAt.localeCompare(b.secondaryAt) || a.frequency.localeCompare(b.frequency))
  }
  return manifest
})()

export function getGUNWAcquisitions(location: string): readonly GUNWAcquisition[] {
  return gunwManifest[location] ?? []
}

const sharedCache = createGUNWDataCache()

/** Decodes a scalar GUNW layer with valid zeros preserved and invalid pixels transparent. */
export function processGUNWData(acquisition: GUNWAcquisition, options?: GUNWProcessOptions, signal?: AbortSignal) {
  return sharedCache.process(acquisition, options, signal)
}

/** Returns later minus earlier coherence on matching grids; negative means coherence loss. */
export function processGUNWCoherenceChange(before: GUNWAcquisition, after: GUNWAcquisition, options?: GUNWProcessOptions, signal?: AbortSignal) {
  return sharedCache.coherenceChange(before, after, options, signal)
}

/** Browser-only factory; caches layer instances and isolates their rendered tile caches. */
export function createGUNWLayer(acquisition: GUNWAcquisition, options?: GUNWProcessOptions, signal?: AbortSignal) {
  return sharedCache.getLayer(acquisition, options, signal)
}

export const preloadGUNWData = sharedCache.preload
export const clearGUNWCache = sharedCache.clear
