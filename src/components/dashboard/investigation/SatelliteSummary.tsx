import { dataModeLabels } from '../dashboardData'
import type { DashboardObservation, MapDataMode } from '../dashboardData'
import type { RasterState } from '../dashboardUtils'
import { opticalDateLabel, opticalTimeline } from '../../../services/corroborationData'
import type { EvidenceSelection } from '../../../services/corroborationData'
import { eventRelationship } from '../../../services/assessmentData'
import { philippineAcquisition } from '../../../services/observationTime'

export default function SatelliteSummary({ observation, nextObservation, blendFraction=0, mode, modes, status, visible, onToggle, onModeChange, selection }: {
  nextObservation?:DashboardObservation;blendFraction?:number
  observation?: DashboardObservation; mode: MapDataMode; modes: readonly MapDataMode[]
  status: RasterState | null; visible: boolean; onToggle: () => void
  onModeChange: (mode: MapDataMode) => void; selection?: EvidenceSelection
}) {
  if (!observation) return <p className="atlas-body-copy">No radar observation is available.</p>
  const gunw = observation.kind === 'gunw' ? observation : undefined
  const change = observation.kind === 'backscatterChange' ? observation.acquisition.metadata : undefined
  const backscatter = observation.kind === 'backscatter' ? observation.acquisition : undefined
  const layer = gunw?.acquisition.layers[gunw.options.layer!]
  const data = status?.status === 'ready' ? status.data : undefined
  const min = change?.hotspots.threshold_db ?? backscatter?.displayMinDb ?? data?.displayMin ?? gunw?.options.displayMin ?? (mode === 'coherenceChange' ? -1 : 0)
  const max = change?.hotspots.maximum_db ?? backscatter?.displayMaxDb ?? data?.displayMax ?? gunw?.options.displayMax ?? 1
  const unit = mode === 'phase' ? ' rad' : backscatter || change ? ' dB' : ''
  const optical = selection?.optical ? opticalTimeline?.scenes.find(scene => scene.id === selection.opticalScene) : undefined
  const primaryModes: readonly MapDataMode[] = (['coherence','backscatter','backscatterChange'] as const).filter(value=>modes.includes(value))
  const moreModes = modes.filter(value => !primaryModes.includes(value))
  return <section className="atlas-satellite-summary" aria-label="Active satellite layer">
    <div className="atlas-satellite-topline"><p className="atlas-eyebrow">NISAR / {gunw ? 'GUNW' : change ? 'GCOV difference' : 'GCOV'} / {layer?.polarization ?? 'HH'}</p><button className="atlas-visibility" role="switch" aria-label="Show radar layer" aria-checked={visible} onClick={onToggle}><span className="atlas-switch-track"><span /></span>{visible ? 'Visible' : 'Hidden'}</button></div>
    <p className="atlas-satellite-date" aria-live="polite">{observation.label} UTC{blendFraction>0&&nextObservation&&<><br />→ {nextObservation.label} UTC · {Math.round(blendFraction*100)}% visual blend</>}</p>
    <p className="atlas-observation-relation">{eventRelationship(observation.startAt,observation.endAt)}{blendFraction>0?' · source observation; blend is display only':''}</p>
    <details className="atlas-local-times"><summary>Acquisition times in the Philippines</summary><p>{philippineAcquisition(observation.startAt)}{observation.endAt&&<> → {philippineAcquisition(observation.endAt)}</>}</p>{blendFraction>0&&nextObservation&&<p>Blend target: {philippineAcquisition(nextObservation.startAt)}{nextObservation.endAt&&<> → {philippineAcquisition(nextObservation.endAt)}</>}</p>}</details>
    <div className="atlas-radar-choices" role="group" aria-label="Radar layers">
      {primaryModes.map(value => <button key={value} aria-pressed={mode === value} onClick={() => onModeChange(value)}>{value === 'backscatterChange' ? 'Surface change' : value==='coherence'?'Coherence':'Backscatter'}</button>)}
      {moreModes.length > 0 && <label className="atlas-more-radar"><span className="sr-only">More radar layers</span><select aria-label="More radar layers" value={moreModes.includes(mode) ? mode : ''} onChange={event => onModeChange(event.target.value as MapDataMode)}><option value="" disabled>More radar…</option>{moreModes.map(value => <option key={value} value={value}>{dataModeLabels[value]}</option>)}</select></label>}
    </div>
    <div className="atlas-signal-legend" aria-label={`${dataModeLabels[mode]} legend`}>
      <div><span>{backscatter ? 'Weaker return' : change ? 'Lower change strength' : mode === 'phase' ? 'Negative phase' : mode === 'coherenceChange' ? 'Coherence loss' : 'Low coherence'}</span><span>{backscatter ? 'Stronger return' : change ? 'Higher change strength' : mode === 'phase' ? 'Positive phase' : mode === 'coherenceChange' ? 'Coherence increase' : 'High coherence'}</span></div>
      <div className={backscatter ? 'atlas-grayscale' : `atlas-gunw-scale atlas-gunw-scale--${change ? 'hotspots' : mode}`} aria-hidden="true" />
      <div><strong>{min.toFixed(backscatter || gunw ? 2 : 0)}{unit}</strong>{gunw && mode !== 'coherence' && <strong>0{unit}</strong>}<strong>{max.toFixed(backscatter || gunw ? 2 : 0)}{change ? '+' : ''}{unit}</strong></div>
      <p>{backscatter ? backscatter.sharedStretch?'Shared display stretch across available radar scenes.':'2nd–98th percentile stretch for this scene.' : change ? 'Spatially averaged absolute HH change. Below-threshold and invalid pixels are transparent.' : mode === 'phase' ? 'Quality-masked phase, not ground displacement. Transparent pixels are invalid.' : mode==='coherenceChange'?'Later pair minus baseline coherence. Not displacement or a landslide probability.':'Normalized radar coherence; transparent pixels are invalid.'}</p>
    </div>
    {!visible && <p className="atlas-layer-state">Radar hidden · legend retained for reference</p>}
    {observation.baselineLabel && <p className="atlas-layer-state">Coherence baseline: {observation.baselineLabel}</p>}
    {selection && <div className="atlas-active-overlays" aria-label="Active overlays">
      {selection.optical && <span>Optical on · {optical ? opticalDateLabel(optical) : 'No matching scene'}</span>}
      {selection.screen && <span>Vegetation agreement on</span>}
      {selection.drainage && <span>Waterways on</span>}
      {selection.reportedPlaces && <span>Communities on</span>}
    </div>}
  </section>
}
