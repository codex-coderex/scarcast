import { useEffect, useRef } from 'react'
import { m, useIsPresent } from 'framer-motion'
import type { GCOVAcquisition } from '../../services/processGCOVData'
import type { GUNWAcquisition } from '../../services/gunwTypes'
import type { DashboardObservation, MapDataMode } from './dashboardData'
import { centerFor, locations, nameFor } from './dashboardUtils'
import type { RasterState } from './dashboardUtils'
import BackscatterInfo from './BackscatterInfo'
import DeformationInfo from './DeformationInfo'
import EvidenceWorkspace from './investigation/EvidenceWorkspace'
import SatelliteSummary from './investigation/SatelliteSummary'
import { investigationViews } from './investigation/investigationModel'
import type { InvestigationView } from './investigation/investigationModel'
import { dashboardFade } from './dashboardTransitions'
import type { EvidenceSelection } from '../../services/corroborationData'
import { assessment } from '../../services/assessmentData'

export default function LocationPanel({ location, acquisition, pairs, observation, nextObservation, blendFraction=0, mode, modes, status, view, onViewChange, onOpenTerrain, onModeChange, evidenceSelection, onEvidenceSelectionChange, visible, onToggle, onReset, onFocusCandidate, onFocusOverview }: {
  nextObservation?: DashboardObservation
  blendFraction?: number
  evidenceSelection: EvidenceSelection
  onEvidenceSelectionChange: (selection: EvidenceSelection) => void
  location: string | null
  acquisition?: GCOVAcquisition
  pairs: readonly GUNWAcquisition[]
  observation?: DashboardObservation
  mode: MapDataMode
  modes: readonly MapDataMode[]
  status: RasterState | null
  onModeChange: (mode: MapDataMode) => void
  view: InvestigationView
  onViewChange: (view: InvestigationView) => void
  onOpenTerrain?: () => void
  visible: boolean
  onToggle: () => void
  onReset: () => void
  onFocusCandidate: (id:string)=>void
  onFocusOverview: ()=>void
}) {
  const panelHeading = useRef<HTMLHeadingElement>(null)
  const isPresent = useIsPresent()
  const bounds = observation?.acquisition.bounds ?? acquisition?.bounds ?? pairs[0]?.bounds
  const center = bounds ? centerFor(bounds) : null

  useEffect(() => {
    if (location && isPresent) panelHeading.current?.focus({ preventScroll: true })
  }, [location, isPresent])

  return (
    <m.aside {...dashboardFade} className="atlas-detail-panel" aria-label="Study location information" inert={!isPresent} aria-hidden={!isPresent}>
      {center && <div className="atlas-detail-inner">
        <div className="atlas-panel-topline"><span className="atlas-eyebrow">Study {String(locations.findIndex(([slug]) => slug === location) + 1).padStart(2, '0')}</span><button className="atlas-reset-view" onClick={onReset}>Reset view ↺</button></div>
        <p className="atlas-place-kicker">{location === 'mount_balikabok' || location === 'balikabok_downstream' ? 'Luzon, Philippines' : 'Earth observation study'}</p>
        <h1 ref={panelHeading} tabIndex={-1}>{nameFor(location!)}</h1>
        {(location==='balikabok_downstream'||location==='mount_balikabok')&&<section className="atlas-event-record" aria-label="Reported event"><strong>Landslide reported · 30 August 2026 (PHT)</strong><a href={assessment?.event.source} target="_blank" rel="noreferrer">Source ↗</a></section>}
        <div className="atlas-panel-anchor">
          <SatelliteSummary observation={observation} nextObservation={nextObservation} blendFraction={blendFraction} mode={mode} modes={modes} status={status} visible={visible} onToggle={onToggle} onModeChange={onModeChange} selection={evidenceSelection} />
          <nav className="atlas-data-tabs atlas-explorer-tabs" role="tablist" aria-label="Evidence views" onKeyDown={event => {
            const index = investigationViews.findIndex(item => item.id === view)
            const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : undefined
            if (next === undefined) return
            event.preventDefault()
            onViewChange(investigationViews[next].id)
            event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next].focus()
          }}>
            {investigationViews.map(item => <button key={item.id} id={`evidence-tab-${item.id}`} role="tab" tabIndex={view === item.id ? 0 : -1} aria-selected={view === item.id} aria-controls="evidence-view-content" onClick={() => onViewChange(item.id)}>{item.label}</button>)}
          </nav>
        </div>
        <div className="atlas-tab-content" id="evidence-view-content" role="tabpanel" aria-labelledby={`evidence-tab-${view}`}>
          <EvidenceWorkspace location={location!} view={view} observation={observation} nextObservation={nextObservation} blendFraction={blendFraction} selection={evidenceSelection} onChange={onEvidenceSelectionChange} onOpenTerrain={onOpenTerrain} onFocusCandidate={onFocusCandidate} onFocusOverview={onFocusOverview} />
        {view === 'radar' && <details className="atlas-acquisition-details">
          <summary>Acquisition details &amp; source data</summary>
          <p className="atlas-coordinates">{Math.abs(center[0]).toFixed(4)}° {center[0] >= 0 ? 'N' : 'S'} <span>/</span> {Math.abs(center[1]).toFixed(4)}° {center[1] >= 0 ? 'E' : 'W'}</p>
          {mode === 'backscatter' && acquisition ? <BackscatterInfo acquisition={acquisition} showLegend={false} /> : <DeformationInfo observation={observation?.kind !== 'backscatter' ? observation : undefined} mode={mode} modes={[]} status={status} onModeChange={onModeChange} showLegend={false} />}
        </details>}
        </div>
        <footer className="atlas-dossier-footer"><span>SCARCAST / FIELD NOTES</span><span>NASA SPACE APPS</span></footer>
      </div>}
    </m.aside>
  )
}
