import type { DashboardObservation } from '../dashboardData'
import { corroboration, evidenceSources, evidenceZoneLabels, reportedEvents, reportedPlaces, selectedInvestigation } from '../../../services/corroborationData'
import type { EvidenceSelection, EvidenceZone } from '../../../services/corroborationData'
import type { InvestigationView } from './investigationModel'
import OpticalViewer from './OpticalViewer'
import CandidateAssessment from './CandidateAssessment'

const hectares = (value: number) => `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(value)} ha`

export default function EvidenceWorkspace({ location, view, observation, nextObservation, blendFraction=0, selection, onChange, onOpenTerrain, onFocusCandidate=()=>{}, onFocusOverview=()=>{} }: {
  nextObservation?: DashboardObservation
  blendFraction?: number
  location: string
  view: InvestigationView
  observation?: DashboardObservation
  selection: EvidenceSelection
  onChange: (selection: EvidenceSelection) => void
  onOpenTerrain?: () => void
  onFocusCandidate?: (id:string)=>void
  onFocusOverview?: ()=>void
}) {
  const available = (location === 'balikabok_downstream'||location==='mount_balikabok') && Boolean(corroboration)
  const comparison = available && blendFraction===0 ? selectedInvestigation(observation?.startAt, observation?.endAt) : undefined
  const stats = comparison?.zones[selection.zone]
  const update = (patch: Partial<EvidenceSelection>) => onChange({ ...selection, ...patch })
  const place = reportedPlaces.find(item => item.properties.brgy_name === selection.selectedPlace)
  return <div className="atlas-evidence-workspace">
    {view!=='radar'&&<div className="atlas-workspace-heading"><h2>{view === 'optical' ? 'Optical imagery' : 'Downstream'}</h2></div>}
    {available && <div className="atlas-study-area"><label className="atlas-evidence-label" htmlFor="study-area">Study area<select id="study-area" aria-describedby="study-area-help" value={selection.zone} onChange={event => update({ zone: event.target.value as EvidenceZone })}>{Object.entries(evidenceZoneLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><p id="study-area-help" className="atlas-evidence-note">Filters the review list, candidate outlines and area totals. Your map view stays in place.</p></div>}
    {view==='radar'&&available&&<CandidateAssessment observation={observation} nextObservation={nextObservation} blendFraction={blendFraction} selection={selection} onChange={onChange} onFocus={onFocusCandidate} onOverview={onFocusOverview} />}
    {view==='radar'&&!available&&<p className="atlas-body-copy">Open the combined mountain and downstream study for location-level candidate assessment. This location's radar acquisitions remain available below.</p>}
    {!available && view !== 'radar' && <p className="atlas-body-copy">Combined optical and downstream evidence is available in “Mount Balikabok and downstream area.” Return to the world map to open that study. Radar observations for this location remain available.</p>}
    {available && !stats && view!=='radar' && <p className="atlas-evidence-note" role="status">{blendFraction>0?'Visual blend: no interpolated evidence statistics. Select an observation stop for its measurements.':'No matching evidence summary for this observation. Choose a surface-change interval; statistics from another interval are not substituted.'}</p>}
    {available && view === 'optical' && <>
      <OpticalViewer selection={selection} onChange={onChange} />
      <label className="atlas-evidence-toggle"><input type="checkbox" checked={selection.screen} onChange={event => update({ screen: event.target.checked })} />Show radar / vegetation agreement outlines</label>
      <div className="atlas-screen-legend"><span><i className="atlas-screen-supported" />Radar change + optical vegetation loss</span><span><i className="atlas-screen-only" />Clear optical pixels without loss support</span><span><i className="atlas-screen-unknown" />Optical unavailable / unknown</span></div>
      {stats && <dl className="atlas-metadata"><div><dt>Radar candidate area</dt><dd>{hectares(stats.radar_candidate_ha)}</dd></div><div><dt>Could be checked in clear optical pixels</dt><dd>{hectares(stats.optical_evaluable_candidate_ha)}</dd></div><div><dt>Also shows optical vegetation loss</dt><dd>{hectares(stats.optical_supported_ha)}</dd></div></dl>}
      <p className="atlas-evidence-note">Agreement outlines use the fixed 6 Apr–13 Sept vegetation comparison, regardless of the RGB image selected above. Spatial agreement is not confirmation of a landslide or its timing.</p>
    </>}
    {available && view === 'context' && <>
      <p className="atlas-body-copy">PhilSA reports that sediment from the 30 August landslide entered streams, travelled at least 10 km and contributed to flooding in Pita, Dalao and Pagalanggang. This is reported impact evidence, separate from the radar change areas. <a href={evidenceSources.philsa} target="_blank" rel="noreferrer">PhilSA report ↗</a></p>
      <h3>Waterways and terrain</h3>
      <div className="atlas-analysis-overlays">
        <label className="atlas-evidence-toggle"><input type="checkbox" checked={selection.drainage} onChange={event => update({ drainage: event.target.checked })} /><span className="atlas-context-swatch atlas-context-swatch--waterways" />Terrain-derived waterways</label>
        <label className="atlas-evidence-toggle"><input type="checkbox" checked={selection.reportedPlaces} onChange={event => update({ reportedPlaces: event.target.checked })} /><span className="atlas-context-swatch atlas-context-swatch--places" />Reported communities</label>
        <label className="atlas-evidence-toggle"><input type="checkbox" checked={selection.screen} onChange={event => update({ screen: event.target.checked })} />Radar / vegetation agreement</label>
      </div>
      {selection.screen && <div className="atlas-screen-legend"><span><i className="atlas-screen-supported" />Radar change + vegetation loss</span><span><i className="atlas-screen-only" />Clear optical, no loss support</span><span><i className="atlas-screen-unknown" />Optical unavailable / unknown</span></div>}
      {stats && <dl className="atlas-metadata"><div><dt>Candidates within 100 m of derived waterways</dt><dd>{hectares(stats.candidate_near_drainage_ha)}</dd></div></dl>}
      <p className="atlas-evidence-note">The waterways come from historical terrain. They show drainage context, not a mapped debris path or a flood prediction.</p>
      {onOpenTerrain && <button className="atlas-focus-action" onClick={onOpenTerrain}>3D terrain ↗</button>}
      <section className="atlas-evidence-section" aria-labelledby="downstream-communities"><h3 id="downstream-communities">Reported communities</h3>
      <div className="atlas-reported-places">{reportedPlaces.map(place => <button key={place.properties.brgy_name} aria-pressed={selection.selectedPlace === place.properties.brgy_name} onClick={() => update({ selectedPlace: place.properties.brgy_name, reportedPlaces: true })}><strong>{place.properties.brgy_name}</strong><span>Reported flooding · approximate reference point</span></button>)}</div>
      {place && <section className="atlas-place-inspector" aria-label="Selected community"><div><strong>{place.properties.brgy_name}</strong><button onClick={() => update({ selectedPlace: undefined })}>Clear selection</button></div><p>Approximate barangay reference point; no observed flood extent or affected-area measurement.</p><a href={place.properties.report_source} target="_blank" rel="noreferrer">Impact report ↗</a><a href={place.properties.location_source} target="_blank" rel="noreferrer">Location source ↗</a></section>}
      <p className="atlas-evidence-note">Community pins are approximate reference locations, not flood boundaries or measured damage.</p>
      <a className="atlas-evidence-source" href={evidenceSources.philsa} target="_blank" rel="noreferrer">Read the downstream impact report ↗</a>
      <p className="atlas-body-copy">The provincial assessment reports debris remaining on slopes and in drainage channels that could move again with further rain. <a href={evidenceSources.continuingRisk} target="_blank" rel="noreferrer">Provincial assessment ↗</a></p></section>
      <section className="atlas-evidence-section" aria-labelledby="downstream-rainfall"><h3 id="downstream-rainfall">Rainfall before the slide</h3>
        <table className="atlas-context-rainfall"><caption>Abucay gauge · August 2026 · UP NOAH</caption><thead><tr><th scope="col">Period</th><th scope="col">Rainfall</th></tr></thead><tbody><tr><td>8–9 August</td><td>292.3 mm</td></tr><tr><td>17–19 August</td><td>347.1 mm</td></tr><tr><td>28–29 August</td><td>368.6 mm</td></tr><tr><td>Full August</td><td>2,210.4 mm</td></tr></tbody></table>
        <p className="atlas-evidence-note">Published gauge totals from Abucay, not measurements at the mountain. These cover different lengths of time and are not warning thresholds.</p><a href={evidenceSources.noah} target="_blank" rel="noreferrer">UP NOAH report ↗</a>
      </section>
      <section className="atlas-evidence-section" aria-labelledby="downstream-events"><h3 id="downstream-events">Event timeline</h3><ol className="atlas-evidence-events">{reportedEvents.map(event => <li key={event.date}><time dateTime={event.date}>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${event.date}T12:00:00Z`))}</time><div><strong>{event.label}</strong><p>{event.detail}</p>{event.source && <a href={event.source} target="_blank" rel="noreferrer">Source ↗</a>}</div></li>)}</ol></section>
    </>}
    {available && <details className="atlas-evidence-section"><summary>Evidence methods &amp; limits</summary><dl className="atlas-methods-list"><div><dt>Radar change screen</dt><dd>At least 3 dB change after 90 m spatial averaging, in connected patches of at least 1 ha. A candidate screen, not a landslide classifier.</dd></div><div><dt>Optical support</dt><dd>NDVI decrease of at least 0.20 between 6 April and 13 September 2026 on shared-clear pixels. Spatial agreement does not prove event timing or cause.</dd></div><div><dt>Drainage context</dt><dd>Within 100 m of historical terrain-derived waterways. This is not an observed debris route or flood forecast.</dd></div><div><dt>Study boundaries</dt><dd>The mountain clip is an extraction area, not the landslide scar. The area outside it is not a delineated watershed.</dd></div><div><dt>Reported impacts</dt><dd>Approximate community reference points come from PhilAtlas; impact reports come from PhilSA. They supply no measured flood extent, damaged-building counts or affected population.</dd></div></dl></details>}
  </div>
}
