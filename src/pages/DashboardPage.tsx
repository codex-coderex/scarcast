import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import 'leaflet/dist/leaflet.css'
import '../assets/styles/dashboard/index.css'
import { gcovManifest } from '../services/processGCOVData'
import { createGCOVLayerCache } from '../services/gcovLayerCache'
import type { GCOVLayerCache } from '../services/gcovLayerCache'
import { createGUNWDataCache, getGUNWAcquisitions, gunwManifest } from '../services/processGUNWData'
import type { GUNWDataCache } from '../services/gunwTypes'
import { locationViewOptions, nameFor } from '../components/dashboard/dashboardUtils'
import { dashboardObservations } from '../components/dashboard/dashboardData'
import type { MapDataMode } from '../components/dashboard/dashboardData'
import type { DataTab, RasterState } from '../components/dashboard/dashboardUtils'
import DashboardMap from '../components/dashboard/DashboardMap'
import DashboardMotion from '../components/dashboard/DashboardMotion'
import MapHeader from '../components/dashboard/MapHeader'
import LocationIndex from '../components/dashboard/LocationIndex'
import MapLayerControls from '../components/dashboard/MapLayerControls'
import RasterStatus from '../components/dashboard/RasterStatus'
import ObservationTimeline from '../components/dashboard/ObservationTimeline'
import LocationPanel from '../components/dashboard/LocationPanel'
import { observationBlend } from '../components/dashboard/observationBlend'

const emptyBackscatter: NonNullable<typeof gcovManifest[string]> = []
const emptyPairs: ReturnType<typeof getGUNWAcquisitions> = []

export default function DashboardPage() {
  const [location, setLocation] = useState<string | null>(null)
  const [dateIndex, setDateIndex] = useState(0)
  const [pairIndex, setPairIndex] = useState(0)
  const [comparisonIndex, setComparisonIndex] = useState(0)
  const [mode, setMode] = useState<MapDataMode>('backscatter')
  const [tab, setTab] = useState<DataTab>('backscatter')
  const [visible, setVisible] = useState(true)
  const [rasterState, setRasterState] = useState<RasterState | null>(null)
  const [attempt, setAttempt] = useState(0)
  const cachedLayers = useRef<GCOVLayerCache | null>(null)
  const gunwCache = useRef<GUNWDataCache | null>(null)
  const dashboard = useRef<HTMLElement>(null)
  const acquisitions = (location && gcovManifest[location]) || emptyBackscatter
  const pairs = (location && gunwManifest[location]) || emptyPairs
  const views = useMemo(() => ({
    backscatter: dashboardObservations(acquisitions, pairs, 'backscatter'),
    phase: dashboardObservations(acquisitions, pairs, 'phase'),
    coherence: dashboardObservations(acquisitions, pairs, 'coherence'),
    coherenceChange: dashboardObservations(acquisitions, pairs, 'coherenceChange'),
  }), [acquisitions, pairs])
  const modes = useMemo(() => (Object.keys(views) as MapDataMode[]).filter(value => views[value].length > 0), [views])
  const observations = views[mode]
  const activeIndex = Math.min(mode === 'backscatter' ? dateIndex : mode === 'coherenceChange' ? comparisonIndex : pairIndex, Math.max(0, observations.length - 1))
  const blend = observationBlend(activeIndex, observations.length)
  const observation = observations[blend.index]
  const nextObservation = blend.nextIndex !== blend.index ? observations[blend.nextIndex] : undefined
  const gunwObservation = observation?.kind === 'gunw' ? observation : undefined
  const acquisition = acquisitions[Math.floor(dateIndex)]
  const status = rasterState?.id === observation?.key ? rasterState : null
  const backToWorld = useCallback(() => setLocation(null), [])
  const onMovingChange = useCallback((moving: boolean) => {
    cachedLayers.current?.setMoving(moving)
    gunwCache.current?.setMoving(moving)
  }, [])

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
    const gunw = createGUNWDataCache()
    gunwCache.current = gunw
    // Keep the existing backscatter startup work first; warm GUNW data sequentially.
    void cache.preload(Object.values(gcovManifest).flat()).then(async () => {
      for (const observations of Object.values(gunwManifest)) {
        for (const pair of observations) {
          if (controller.signal.aborted) return
          const keys = [...new Set(['phase', 'coherence'].flatMap(value =>
            dashboardObservations([], [pair], value as MapDataMode).flatMap(item => item.kind === 'gunw' && item.options.layer ? [item.options.layer] : [])))]
          await gunw.preload([pair], keys, controller.signal)
        }
      }
    }).catch(() => { /* Selected layers retry preload failures through the cache. */ })
    return () => {
      controller.abort()
      gunw.clear()
      if (gunwCache.current === gunw) gunwCache.current = null
      if (cachedLayers.current === cache) cachedLayers.current = null
    }
  }, [])

  const selectLocation = useCallback((slug: string) => {
    setDateIndex(0)
    setPairIndex(0)
    setComparisonIndex(0)
    const nextBackscatter = gcovManifest[slug] ?? emptyBackscatter
    const nextPairs = getGUNWAcquisitions(slug)
    const firstMode = (['backscatter', 'phase', 'coherence'] as const).find(value => dashboardObservations(nextBackscatter, nextPairs, value).length) ?? 'backscatter'
    setMode(firstMode)
    setTab(firstMode === 'backscatter' ? 'backscatter' : 'deformation')
    setVisible(true)
    setRasterState(null)
    setLocation(slug)
  }, [])

  const onModeChange = useCallback((value: MapDataMode) => {
    if (!modes.includes(value)) return
    setMode(value)
    setTab(value === 'backscatter' ? 'backscatter' : 'deformation')
    setVisible(true)
    setRasterState(null)
  }, [modes])

  function onTabChange(value: DataTab) {
    if (value === 'backscatter') onModeChange('backscatter')
    else if (value === 'deformation' && mode === 'backscatter') {
      const next = modes.find(candidate => candidate !== 'backscatter')
      if (next) onModeChange(next)
      else setTab(value)
    } else setTab(value)
  }

  function onDateChange(index: number) {
    if (index < 0 || index >= observations.length) return
    if (mode === 'backscatter') setDateIndex(index)
    else if (mode === 'coherenceChange') setComparisonIndex(index)
    else setPairIndex(index)
  }

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
          <DashboardMap location={location} observation={observation} cachedLayers={cachedLayers} gunwCache={gunwCache}
            nextObservation={nextObservation} blendFraction={blend.fraction}
            visible={visible} attempt={attempt} onMovingChange={onMovingChange}
            onSelectLocation={selectLocation} onRasterStatus={setRasterState} />
          <MapHeader location={location} onBack={backToWorld} />
          <AnimatePresence initial={false}>
            {!location && <LocationIndex key="locations" onSelectLocation={selectLocation} />}
            {observation && <MapLayerControls key="layer-controls" visible={visible} mode={mode} modes={modes} onModeChange={onModeChange}
              onToggle={() => setVisible(value => !value)} />}
            {observation && <ObservationTimeline key="timeline" items={observations}
              heading={mode === 'backscatter' ? 'Observation date' : mode === 'coherenceChange' ? 'Coherence comparison' : 'Observation pair'}
              dateIndex={activeIndex} onDateChange={onDateChange}>
              <RasterStatus visible={visible} mode={mode} status={status}
                onRetry={() => { setRasterState(null); setAttempt(value => value + 1) }} />
            </ObservationTimeline>}
          </AnimatePresence>
        </section>
        <AnimatePresence>
          {location && <LocationPanel key={location} location={location} acquisition={acquisition} acquisitions={acquisitions}
            pairs={pairs} observation={gunwObservation} observations={observations} mode={mode} modes={modes} status={status} onModeChange={onModeChange}
            tab={tab} dateIndex={blend.index} onTabChange={onTabChange} onDateChange={onDateChange} />}
        </AnimatePresence>
      </main>
    </DashboardMotion>
  )
}
