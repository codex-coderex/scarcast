import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'
import type { GridLayer } from 'leaflet'
import { useMap } from 'react-leaflet'
import type { GUNWDataCache } from '../../services/gunwTypes'
import type { GUNWObservation } from './dashboardData'
import type { RasterState } from './dashboardUtils'

export default function GUNWOverlay({ observation, cache, attempt, onStatus }: {
  observation: GUNWObservation
  cache: RefObject<GUNWDataCache | null>
  attempt: number
  onStatus: (state: RasterState) => void
}) {
  const map = useMap()
  useLayoutEffect(() => {
    const controller = new AbortController()
    let layer: GridLayer | undefined
    const current = cache.current
    async function attach() {
      if (!current) throw new Error('GUNW cache is not initialized.')
      const { acquisition, baseline, options } = observation
      const signal = controller.signal
      const [data, rendered] = await Promise.all(baseline ? [
        current.coherenceChange(baseline, acquisition, options, signal),
        current.getChangeLayer(baseline, acquisition, options, signal),
      ] : [current.process(acquisition, options, signal), current.getLayer(acquisition, options, signal)])
      signal.throwIfAborted()
      layer = rendered
      layer.setZIndex(5)
      layer.addTo(map)
      onStatus({ id: observation.key, status: 'ready', data })
    }
    void attach().catch((error: unknown) => {
      if (!controller.signal.aborted) onStatus({ id: observation.key, status: 'error',
        message: error instanceof Error ? error.message : 'Unable to load this GUNW observation.' })
    })
    return () => { controller.abort(); layer?.remove() }
  }, [map, observation, cache, attempt, onStatus])
  return null
}
