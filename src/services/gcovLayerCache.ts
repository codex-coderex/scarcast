import { map as createMap } from 'leaflet'
import type { FitBoundsOptions, GridLayer } from 'leaflet'
import { createGCOVBackscatterLayer } from './processGCOVData'
import type { GCOVAcquisition } from './processGCOVData'

interface PreloadView {
  width: number
  height: number
  fitOptions: FitBoundsOptions
}

export interface GCOVLayerCache {
  get: (acquisition: GCOVAcquisition) => Promise<GridLayer>
  preload: (acquisitions: readonly GCOVAcquisition[]) => Promise<void>
  setMoving: (moving: boolean) => void
}

/** Give initial paint and input a chance to run between background acquisitions. */
function waitForIdle(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const idleSupported = typeof window.requestIdleCallback === 'function'
    function cancel() {
      if (idleSupported) window.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
    }
    function ready() {
      signal.removeEventListener('abort', aborted)
      resolve()
    }
    function aborted() {
      cancel()
      signal.removeEventListener('abort', aborted)
      reject(signal.reason)
    }
    const handle = idleSupported
      ? window.requestIdleCallback(ready, { timeout: 1000 })
      : window.setTimeout(ready, 32)
    signal.addEventListener('abort', aborted, { once: true })
    if (signal.aborted) aborted()
  })
}

/** Render the focused view without attaching an inactive date to the visible map. */
async function warmTiles(
  layer: GridLayer,
  acquisition: GCOVAcquisition,
  view: PreloadView,
  signal: AbortSignal,
) {
  signal.throwIfAborted()
  const container = document.createElement('div')
  container.setAttribute('aria-hidden', 'true')
  container.setAttribute('inert', '')
  Object.assign(container.style, {
    position: 'fixed', left: '-100000px', top: '0', visibility: 'hidden',
    width: `${Math.ceil(view.width)}px`, height: `${Math.ceil(view.height)}px`,
    pointerEvents: 'none',
  })
  document.body.append(container)
  const warmMap = createMap(container, {
    zoomControl: false, attributionControl: false,
    zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false,
    dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
    touchZoom: false, boxZoom: false, keyboard: false, tapHold: false,
    minZoom: 1, maxZoom: 19, zoomSnap: 0.25,
  })
  try {
    warmMap.fitBounds(acquisition.bounds, { ...view.fitOptions, animate: false })
    await new Promise<void>((resolve, reject) => {
      function cleanup() {
        window.clearTimeout(timeout)
        layer.off('load', loaded)
        layer.off('tileerror', failed)
        signal.removeEventListener('abort', aborted)
      }
      function loaded() { cleanup(); resolve() }
      function failed() { cleanup(); reject(new Error(`Unable to render ${acquisition.id}`)) }
      function aborted() { cleanup(); reject(signal.reason) }
      const timeout = window.setTimeout(failed, 30000)
      layer.once('load', loaded)
      layer.once('tileerror', failed)
      signal.addEventListener('abort', aborted, { once: true })
      if (signal.aborted) aborted()
      else {
        try { layer.addTo(warmMap) }
        catch (error) { cleanup(); reject(error) }
      }
    })
  } finally {
    layer.remove()
    warmMap.remove()
    container.remove()
  }
}

/** Share pending work and keep each date's decoded raster and rendered tiles. */
export function createGCOVLayerCache(signal: AbortSignal, view: PreloadView): GCOVLayerCache {
  const layers = new Map<string, GridLayer>()
  const pending = new Map<string, Promise<GridLayer>>()
  let moving = false
  const waiting = new Set<() => void>()
  function setMoving(value: boolean) {
    moving = value
    if (!value) {
      for (const resume of waiting) resume()
      waiting.clear()
    }
  }
  async function waitForMap() {
    while (moving && !signal.aborted) {
      await new Promise<void>(resolve => waiting.add(resolve))
    }
    signal.throwIfAborted()
  }
  signal.addEventListener('abort', () => {
    setMoving(false)
    for (const layer of layers.values()) layer.remove()
    layers.clear()
    pending.clear()
  }, { once: true })

  function get(acquisition: GCOVAcquisition): Promise<GridLayer> {
    if (signal.aborted) return Promise.reject(signal.reason)
    // The URL also distinguishes the same NISAR acquisition clipped to different locations.
    const key = acquisition.url
    const cached = layers.get(key)
    if (cached) return waitForMap().then(() => cached)
    const loading = pending.get(key)
    if (loading) return loading
    const request = waitForMap().then(() => createGCOVBackscatterLayer(acquisition, signal)).then(async layer => {
      await waitForMap()
      await warmTiles(layer, acquisition, view, signal)
      await waitForMap()
      layers.set(key, layer)
      return layer
    }).finally(() => {
      if (pending.get(key) === request) pending.delete(key)
    })
    pending.set(key, request)
    return request
  }

  async function preload(acquisitions: readonly GCOVAcquisition[]) {
    // Decode and render one date at a time to limit the startup CPU/memory burst.
    for (const acquisition of acquisitions) {
      if (signal.aborted) return
      try {
        await waitForMap()
        await waitForIdle(signal)
        await get(acquisition)
      }
      catch { /* A failed preload is retried when that date is selected. */ }
    }
  }

  return { get, preload, setMoving }
}
