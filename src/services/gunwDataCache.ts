import type { GridLayer } from 'leaflet'
import type { GUNWAcquisition, GUNWDataCache, GUNWLayer, GUNWProcessOptions, GUNWRaster, ProcessedGUNWData } from './gunwTypes'
import { combineGUNWRasters, prepareGUNWDisplay, readGUNWRaster } from './gunwRaster'

/** Cancel one consumer without aborting shared decoding requested by another. */
function forConsumer<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise
  return new Promise((resolve, reject) => {
    const aborted = () => { signal?.removeEventListener('abort', aborted); reject(signal?.reason) }
    signal.addEventListener('abort', aborted, { once: true })
    if (signal.aborted) aborted()
    promise.then(value => {
      signal.removeEventListener('abort', aborted)
      if (!signal.aborted) resolve(value)
    }, error => { signal.removeEventListener('abort', aborted); reject(error) })
  })
}

function selectedLayer(acquisition: GUNWAcquisition, key = acquisition.defaultLayer): GUNWLayer {
  const layer = acquisition.layers[key]
  if (!layer) throw new Error(`Unavailable GUNW scalar layer: ${key}`)
  return layer
}

function optionKey(options: GUNWProcessOptions) {
  for (const value of [options.displayMin, options.displayMax, options.opacity, options.resolution]) {
    if (value !== undefined && !Number.isFinite(value)) throw new Error('GUNW display options must be finite numbers.')
  }
  return JSON.stringify([options.maskPhase !== false, options.displayMin ?? null, options.displayMax ?? null, options.opacity ?? 0.8, options.resolution ?? 128])
}

function acquisitionKey(acquisition: GUNWAcquisition, layer: GUNWLayer) {
  // Vite can emit one URL for byte-identical TIFFs from different dates.
  // Decoded pixels may be shared; acquisition metadata and layer instances must not be.
  return [acquisition.location, acquisition.id, acquisition.frequency, acquisition.referenceAt, acquisition.secondaryAt, layer.key, layer.url]
}

/** Explicit cache lifecycle: keep decoded data and tiles until clear(), without fetching on import. */
export function createGUNWDataCache(): GUNWDataCache {
  let controller = new AbortController()
  const rasters = new Map<string, Promise<GUNWRaster>>()
  const processed = new Map<string, Promise<ProcessedGUNWData>>()
  const layers = new Map<string, Promise<GridLayer>>()
  const instances = new Set<GridLayer>()

  function memo<T>(cache: Map<string, Promise<T>>, key: string, load: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const existing = cache.get(key)
    if (existing) return existing
    const signal = controller.signal
    const promise = Promise.resolve().then(() => { signal.throwIfAborted(); return load(signal) }).catch(error => {
      if (cache.get(key) === promise) cache.delete(key)
      throw error
    })
    cache.set(key, promise)
    return promise
  }

  function raster(layer: GUNWLayer, signal: AbortSignal) {
    signal.throwIfAborted()
    return memo(rasters, layer.url, current => readGUNWRaster(layer, current))
  }

  async function process(acquisition: GUNWAcquisition, options: GUNWProcessOptions = {}, signal?: AbortSignal) {
    signal?.throwIfAborted()
    const layer = selectedLayer(acquisition, options.layer)
    const mask = layer.name === 'unwrappedPhase' && options.maskPhase !== false
      ? selectedLayer(acquisition, `${layer.grid}/${layer.polarization}/phase_valid_mask`) : undefined
    const key = JSON.stringify([acquisitionKey(acquisition, layer), mask?.url, optionKey(options)])
    return forConsumer(memo(processed, key, async current => {
      const source = await raster(layer, current)
      const georaster = mask ? combineGUNWRasters(source, await raster(mask, current), 'phaseMask') : source
      current.throwIfAborted()
      return prepareGUNWDisplay({
        acquisition, layer, georaster, quantity: layer.name,
        units: layer.name.includes('Phase') || layer.name === 'wrappedPhase' ? 'radians' : layer.metadata.attributes?.units ?? '1',
        phaseMasked: !!mask, limitations: acquisition.metadata.limitations,
      }, options)
    }), signal)
  }

  async function coherenceChange(before: GUNWAcquisition, after: GUNWAcquisition, options: GUNWProcessOptions = {}, signal?: AbortSignal) {
    signal?.throwIfAborted()
    const key = options.layer ?? Object.keys(before.layers).find(name => name.startsWith('wrappedInterferogram/') && before.layers[name].name === 'coherenceMagnitude')
    if (!key) throw new Error('Select an available coherenceMagnitude layer for comparison.')
    const first = selectedLayer(before, key), second = selectedLayer(after, key)
    const duration = (pair: GUNWAcquisition) => Date.parse(pair.secondaryAt) - Date.parse(pair.referenceAt)
    const sameGeometry = ['trackNumber', 'frameNumber', 'orbitPassDirection', 'lookDirection'].every(name =>
      before.metadata.identification[name] === after.metadata.identification[name])
    if (first.name !== 'coherenceMagnitude' || second.name !== 'coherenceMagnitude'
      || before.location !== after.location || before.frequency !== after.frequency || !sameGeometry
      || Date.parse(before.secondaryAt) > Date.parse(after.referenceAt) || Math.abs(duration(before) - duration(after)) > 60000) {
      throw new Error('Compare non-overlapping, chronological coherence pairs at the same location/frequency, acquisition geometry and equivalent time intervals.')
    }
    return forConsumer(memo(processed, JSON.stringify(['change', acquisitionKey(before, first), acquisitionKey(after, second), optionKey(options)]), async current => {
      const a = await raster(first, current), b = await raster(second, current)
      current.throwIfAborted()
      return prepareGUNWDisplay({
        acquisition: before, comparison: after, layer: first, quantity: 'coherenceChange', units: '1',
        phaseMasked: false, georaster: combineGUNWRasters(a, b, 'difference'),
        limitations: ['Coherence change is not a landslide classification; vegetation, moisture and other surface changes also affect coherence.'],
      }, options)
    }), signal)
  }

  async function getLayer(acquisition: GUNWAcquisition, options: GUNWProcessOptions = {}, signal?: AbortSignal) {
    signal?.throwIfAborted()
    const descriptor = selectedLayer(acquisition, options.layer)
    const key = JSON.stringify([acquisitionKey(acquisition, descriptor), optionKey(options)])
    return forConsumer(memo(layers, key, async current => {
      const { layerOptions } = await process(acquisition, options, current)
      const { default: GeoRasterLayer } = await import('georaster-layer-for-leaflet')
      current.throwIfAborted()
      const layer: GridLayer & { cache: Record<string, HTMLCanvasElement> } = new GeoRasterLayer(layerOptions)
      // Version 4.1.2 otherwise shares a prototype cache between dates and quantities.
      layer.cache = {}
      instances.add(layer)
      return layer
    }), signal)
  }

  async function preload(acquisitions: readonly GUNWAcquisition[], selected?: readonly string[], signal?: AbortSignal) {
    const loaded: string[] = [], failed: { key: string; error: unknown }[] = []
    const lifecycle = controller.signal
    for (const acquisition of acquisitions) {
      for (const layer of selected ?? [acquisition.defaultLayer]) {
        lifecycle.throwIfAborted()
        signal?.throwIfAborted()
        const key = `${acquisition.location}/${acquisition.id}/${acquisition.frequency}/${layer}`
        try { await process(acquisition, { layer }, signal); loaded.push(key) }
        catch (error) {
          signal?.throwIfAborted()
          lifecycle.throwIfAborted()
          failed.push({ key, error })
        }
        await new Promise<void>(resolve => setTimeout(resolve, 0))
      }
    }
    lifecycle.throwIfAborted()
    signal?.throwIfAborted()
    return { loaded, failed }
  }

  function clear() {
    controller.abort()
    for (const layer of instances) layer.remove()
    instances.clear()
    rasters.clear()
    processed.clear()
    layers.clear()
    controller = new AbortController()
  }

  return { process, coherenceChange, getLayer, preload, clear }
}
