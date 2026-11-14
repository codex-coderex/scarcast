import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'
import type { GridLayer } from 'leaflet'
import { useMap } from 'react-leaflet'
import type { GCOVAcquisition } from '../../services/processGCOVData'
import type { GCOVLayerCache } from '../../services/gcovLayerCache'
import type { RasterState } from './dashboardUtils'

export default function BackscatterOverlay({ acquisition, cachedLayers, onStatus, attempt }: {
  acquisition: GCOVAcquisition
  cachedLayers: RefObject<GCOVLayerCache | null>
  onStatus: (state: RasterState) => void
  attempt: number
}) {
  const map = useMap()
  // Detach before navigation resizes the map, avoiding new raster tiles for
  // the expanded viewport at the old close-up zoom level.
  useLayoutEffect(() => {
    const controller = new AbortController()
    let layer: GridLayer | undefined
    const pendingLayer = cachedLayers.current?.get(acquisition)
      ?? Promise.reject(new Error('Backscatter cache is not initialized.'))
    pendingLayer.then(result => {
      if (controller.signal.aborted) return
      layer = result
      layer.setZIndex(5)
      layer.addTo(map)
      onStatus({ id: acquisition.id, status: 'ready' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        onStatus({ id: acquisition.id, status: 'error', message: error instanceof Error ? error.message : 'Unable to load this observation.' })
      }
    })
    return () => {
      controller.abort()
      layer?.remove()
    }
  }, [map, acquisition, cachedLayers, onStatus, attempt])
  return null
}
