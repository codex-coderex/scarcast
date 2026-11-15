import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import 'leaflet/dist/leaflet.css'
import '../assets/styles/dashboard/index.css'
import { gcovManifest } from '../services/processGCOVData'
import { createGCOVLayerCache } from '../services/gcovLayerCache'
import type { GCOVLayerCache } from '../services/gcovLayerCache'
import { createGUNWDataCache, getGUNWAcquisitions, gunwManifest } from '../services/processGUNWData'
import type { GUNWDataCache } from '../services/gunwTypes'
import { locationViewOptions, nameFor } from '../components/dashboard/dashboardUtils'
import { dashboardObservations, initialDashboardObservation } from '../components/dashboard/dashboardData'
import type { MapDataMode } from '../components/dashboard/dashboardData'
import type { RasterState } from '../components/dashboard/dashboardUtils'
import DashboardMap from '../components/dashboard/DashboardMap'
import DashboardMotion from '../components/dashboard/DashboardMotion'
import MapHeader from '../components/dashboard/MapHeader'
import LocationIndex from '../components/dashboard/LocationIndex'
import RasterStatus from '../components/dashboard/RasterStatus'
import ObservationTimeline from '../components/dashboard/ObservationTimeline'
import LocationPanel from '../components/dashboard/LocationPanel'
import { initialExplorerSelection } from '../components/dashboard/investigation/investigationModel'
import type { InvestigationView } from '../components/dashboard/investigation/investigationModel'
import { clearBackscatterChangeCache } from '../services/processBackscatterChange'
import { observationBlend } from '../components/dashboard/observationBlend'
import { selectedAssessmentCandidate } from '../services/assessmentData'
import type { LatLngBoundsLiteral } from 'leaflet'
import { opticalSceneAt, opticalTimeline } from '../services/corroborationData'
import type { EvidenceSelection } from '../services/corroborationData'
const DebrisTerrainView = lazy(() => import('../components/dashboard/DebrisTerrainView'))

const emptyBackscatter: NonNullable<typeof gcovManifest[string]> = []
const emptyPairs: ReturnType<typeof getGUNWAcquisitions> = []

export default function DashboardPage() {
  const [location, setLocation] = useState<string | null>(null)
  const [terrainOpen, setTerrainOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mode, setMode] = useState<MapDataMode>('coherence')
  const [view, setView] = useState<InvestigationView>('radar')
  const [evidenceSelection, setEvidenceSelection] = useState<EvidenceSelection>(initialExplorerSelection)
  const [resetVersion, setResetVersion] = useState(0)
  const [focusBounds,setFocusBounds]=useState<LatLngBoundsLiteral>()
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
    backscatterChange: dashboardObservations(acquisitions, pairs, 'backscatterChange'),
    phase: dashboardObservations(acquisitions, pairs, 'phase'),
    coherence: dashboardObservations(acquisitions, pairs, 'coherence'),
    coherenceChange: dashboardObservations(acquisitions, pairs, 'coherenceChange'),
  }), [acquisitions, pairs])
  const modes = useMemo(() => (Object.keys(views) as MapDataMode[]).filter(value => views[value].length > 0), [views])
  const observations = views[mode]
  const activeIndex = Math.min(selectedIndex, Math.max(0, observations.length - 1))
  const blend=observationBlend(activeIndex,observations.length)
  const observation = observations[blend.index]
  const nextObservation=blend.nextIndex!==blend.index?observations[blend.nextIndex]:undefined
  const observationTime = observation ? Date.parse(observation.endAt ?? observation.startAt) : NaN
  const opticalScene = opticalTimeline?.scenes.find(scene => scene.id === evidenceSelection.opticalSceneOverride) ?? opticalSceneAt(observationTime)
  const syncedEvidenceSelection = { ...evidenceSelection, opticalScene: opticalScene?.id }
  const acquisition = observation?.kind === 'backscatter' ? observation.acquisition : undefined
  const status = rasterState?.id === observation?.key ? rasterState : null
  const evidenceActive = location === 'balikabok_downstream' || location==='mount_balikabok'
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
    // Overlays request the selected observation on demand; no global raster preload.
    return () => {
      controller.abort()
      gunw.clear()
      clearBackscatterChangeCache()
      if (gunwCache.current === gunw) gunwCache.current = null
      if (cachedLayers.current === cache) cachedLayers.current = null
    }
  }, [])

  const selectLocation = useCallback((slug: string) => {
    setTerrainOpen(false)
    setEvidenceSelection(initialExplorerSelection)
    setFocusBounds(undefined)
    setView('radar')
    const nextBackscatter = gcovManifest[slug] ?? emptyBackscatter
    const nextPairs = getGUNWAcquisitions(slug)
    const initial=initialDashboardObservation(nextBackscatter,nextPairs)
    setSelectedIndex(initial.index)
    setMode(initial.mode)
    setVisible(true)
    setRasterState(null)
    setLocation(slug)
  }, [])

  const onModeChange = useCallback((value: MapDataMode) => {
    if (!modes.includes(value)) return
    const targetTime = observation ? Date.parse(observation.endAt ?? observation.startAt) : NaN
    const next = views[value]
    const nearest = next.reduce((best, item, index) => {
      const distance = Math.abs(Date.parse(item.endAt ?? item.startAt) - targetTime)
      const bestDistance = Math.abs(Date.parse(next[best].endAt ?? next[best].startAt) - targetTime)
      return distance < bestDistance ? index : best
    }, 0)
    setSelectedIndex(nearest)
    setMode(value)
    setVisible(true)
    setRasterState(null)
  }, [modes, observation, views])

  function focusCandidate(id:string){
    const selected=selectedAssessmentCandidate(id);if(!selected)return
    setEvidenceSelection(value=>({...value,candidateId:id,selectedPlace:undefined}))
    const [[south,west],[north,east]]=selected.candidate.bounds
    const latPadding=Math.max((north-south)*.75,.004),lonPadding=Math.max((east-west)*.75,.004)
    setFocusBounds([[south-latPadding,west-lonPadding],[north+latPadding,east+lonPadding]])
  }
  function focusOverview(){
    setFocusBounds(undefined)
    setEvidenceSelection(value=>({...value,selectedPlace:undefined}))
    setResetVersion(value=>value+1)
  }

  function onDateChange(index: number) {
    if (!Number.isFinite(index) || index < 0 || index > observations.length-1) return
    setSelectedIndex(index)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (terrainOpen) setTerrainOpen(false)
        else backToWorld()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [backToWorld, terrainOpen])

  return (
    <DashboardMotion>
      <main ref={dashboard} className={`atlas${location ? ' atlas--focused' : ''}`}>
        <section className="atlas-map-stage" aria-label={location ? `Map of ${nameFor(location)}` : 'World study map'}>
          <DashboardMap location={location} resetVersion={resetVersion} focusBounds={focusBounds} onSelectCandidate={focusCandidate} observation={observation} nextObservation={nextObservation} blendFraction={blend.fraction} cachedLayers={cachedLayers} gunwCache={gunwCache}
            evidenceSelection={evidenceActive ? syncedEvidenceSelection : undefined}
            opticalSelection={evidenceActive ? syncedEvidenceSelection : undefined}
            onSelectPlace={name => setEvidenceSelection(value => ({ ...value, selectedPlace: name }))}
            visible={visible} attempt={attempt} onMovingChange={onMovingChange}
            onSelectLocation={selectLocation} onRasterStatus={setRasterState} />
          <MapHeader location={location} onBack={backToWorld} />
          {location&&<p className="atlas-basemap-note">Cartographic basemap · dated evidence overlays only</p>}
          <AnimatePresence initial={false}>
            {!location && <LocationIndex key="locations" onSelectLocation={selectLocation} />}
            {observation && <ObservationTimeline key="timeline" items={observations}
              heading={mode === 'backscatter' ? 'Observation date' : mode === 'backscatterChange' ? 'Backscatter comparison' : mode === 'coherenceChange' ? 'Coherence comparison' : 'Observation pair'}
              dateIndex={activeIndex} onDateChange={onDateChange}>
              <RasterStatus visible={visible} mode={mode} status={status}
                onRetry={() => { setRasterState(null); setAttempt(value => value + 1) }} />
            </ObservationTimeline>}
          </AnimatePresence>
          {terrainOpen && (location === 'balikabok_downstream' || location === 'mount_balikabok') && <Suspense fallback={<div className="atlas-terrain-view">Loading terrain…</div>}><DebrisTerrainView onClose={() => setTerrainOpen(false)} /></Suspense>}
        </section>
        <AnimatePresence>
          {location && <LocationPanel key={location} location={location} acquisition={acquisition}
            pairs={pairs} observation={observation} nextObservation={nextObservation} blendFraction={blend.fraction} mode={mode} modes={modes} status={status} onModeChange={onModeChange}
            evidenceSelection={syncedEvidenceSelection} onEvidenceSelectionChange={setEvidenceSelection}
            view={view} onViewChange={setView} visible={visible} onToggle={() => setVisible(value => !value)}
            onReset={() => { selectLocation(location); setResetVersion(value => value + 1) }}
            onFocusCandidate={focusCandidate} onFocusOverview={focusOverview}
            onOpenTerrain={location === 'balikabok_downstream' ? () => setTerrainOpen(true) : undefined} />}
        </AnimatePresence>
      </main>
    </DashboardMotion>
  )
}
