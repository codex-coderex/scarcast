import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import 'leaflet/dist/leaflet.css'
import '../assets/styles/dashboard/index.css'
import { gcovManifest } from '../services/processGCOVData'
import { createGCOVLayerCache } from '../services/gcovLayerCache'
import type { GCOVLayerCache } from '../services/gcovLayerCache'
import { locations, locationViewOptions, nameFor } from '../components/dashboard/dashboardUtils'
import type { DataTab, RasterState } from '../components/dashboard/dashboardUtils'
import DashboardMap from '../components/dashboard/DashboardMap'
import DashboardMotion from '../components/dashboard/DashboardMotion'
import MapHeader from '../components/dashboard/MapHeader'
import LocationIndex from '../components/dashboard/LocationIndex'
import MapLayerControls from '../components/dashboard/MapLayerControls'
import ObservationTimeline from '../components/dashboard/ObservationTimeline'
import LocationPanel from '../components/dashboard/LocationPanel'

export default function DashboardPage() {
  const [location, setLocation] = useState<string | null>(null)
  const [dateIndex, setDateIndex] = useState(0)
  const [tab, setTab] = useState<DataTab>('backscatter')
  const [showBackscatter, setShowBackscatter] = useState(true)
  const [rasterState, setRasterState] = useState<RasterState | null>(null)
  const [attempt, setAttempt] = useState(0)
  const cachedLayers = useRef<GCOVLayerCache | null>(null)
  const dashboard = useRef<HTMLElement>(null)
  const acquisitions = location ? gcovManifest[location] : []
  const acquisition = acquisitions[dateIndex]
  const status = rasterState?.id === acquisition?.id ? rasterState : null
  const backToWorld = useCallback(() => setLocation(null), [])

  useEffect(() => {
    const controller = new AbortController()
    const mobile = window.matchMedia('(max-width: 700px)').matches
    const width = dashboard.current?.clientWidth ?? window.innerWidth
    const height = mobile ? Math.max(420, window.innerHeight * 0.58)
      : dashboard.current?.clientHeight ?? window.innerHeight
    const cache = createGCOVLayerCache(controller.signal, {
      width: mobile ? width : width / 2,
      height,
      fitOptions: locationViewOptions(height),
    })
    cachedLayers.current = cache
    void cache.preload(locations.flatMap(([, observations]) => [...observations]))
    return () => {
      controller.abort()
      if (cachedLayers.current === cache) cachedLayers.current = null
    }
  }, [])

  const selectLocation = useCallback((slug: string) => {
    setDateIndex(0)
    setTab('backscatter')
    setShowBackscatter(true)
    setRasterState(null)
    setLocation(slug)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') backToWorld()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [backToWorld])

  return (
    <DashboardMotion>
      <main ref={dashboard} className={`atlas${location ? ' atlas--focused' : ''}`}>
        <section className="atlas-map-stage" aria-label={location ? `Map of ${nameFor(location)}` : 'World study map'}>
          <DashboardMap location={location} acquisition={acquisition} cachedLayers={cachedLayers}
            showBackscatter={showBackscatter} attempt={attempt}
            onSelectLocation={selectLocation} onRasterStatus={setRasterState} />
          <MapHeader location={location} onBack={backToWorld} />
          <AnimatePresence initial={false}>
            {!location && <LocationIndex key="locations" onSelectLocation={selectLocation} />}
            {acquisition && <MapLayerControls key="layer-controls" showBackscatter={showBackscatter} status={status}
              onToggle={() => setShowBackscatter(value => !value)}
              onRetry={() => { setRasterState(null); setAttempt(value => value + 1) }} />}
            {acquisition && <ObservationTimeline key="timeline" acquisition={acquisition} acquisitions={acquisitions}
              dateIndex={dateIndex} onDateChange={setDateIndex} />}
          </AnimatePresence>
        </section>
        <AnimatePresence>
          {location && <LocationPanel key={location} location={location} acquisition={acquisition} acquisitions={acquisitions}
            tab={tab} dateIndex={dateIndex} onTabChange={setTab} onDateChange={setDateIndex} />}
        </AnimatePresence>
      </main>
    </DashboardMotion>
  )
}
