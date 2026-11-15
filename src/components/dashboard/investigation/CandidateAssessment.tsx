import { useState } from 'react'
import { assessment, assessmentComparison, candidateBriefHTML, selectedAssessmentCandidate } from '../../../services/assessmentData'
import type { DashboardObservation } from '../dashboardData'
import type { EvidenceSelection } from '../../../services/corroborationData'

const ha=(value:number)=>`${value.toLocaleString('en-GB',{maximumFractionDigits:2})} ha`
export default function CandidateAssessment({observation,nextObservation,blendFraction=0,selection,onChange,onFocus,onOverview}:{
  observation?:DashboardObservation;nextObservation?:DashboardObservation;blendFraction?:number;selection:EvidenceSelection
  onChange:(value:EvidenceSelection)=>void;onFocus:(id:string)=>void;onOverview:()=>void
}){
  const [all,setAll]=useState(false)
  const comparison=assessmentComparison(observation?.startAt,observation?.endAt),next=assessmentComparison(nextObservation?.startAt,nextObservation?.endAt)
  const selected=selectedAssessmentCandidate(selection.candidateId)
  const candidates=(comparison?.candidates??[]).filter(item=>selection.zone==='study'||(selection.zone==='mountain'?item.mountain_area_ha>0:item.area_ha>item.mountain_area_ha))
  function exportBrief(){if(!selected)return;const blob=new Blob([candidateBriefHTML(selected.candidate,selected.comparison)],{type:'text/html'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`scarcast-${selected.candidate.id}.html`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  return <section className="atlas-candidate-assessment" aria-label="Candidate assessment">
    <div className="atlas-workspace-heading"><h2>Change areas</h2></div>
    <button className="atlas-focus-action" onClick={onOverview}>Show full AOI ↗</button>
    {blendFraction>0?<div className="atlas-blend-assessment" role="status"><strong>Visual blend · {Math.round(blendFraction*100)}%</strong><p>No blended area or candidate measurement is calculated. Select an acquisition stop to inspect its objects.</p><p>{comparison?.start} – {comparison?.end}: {comparison?.candidates.length??'No matching'} objects<br />{next?.start} – {next?.end}: {next?.candidates.length??'No matching'} objects</p></div>:<>
      {comparison?<>
        <p className="atlas-evidence-note">GCOV change screen · {comparison.start} → {comparison.end} UTC<br />{candidates.length} patches intersect the selected study area.</p>
        <div className="atlas-candidate-list">{(all?candidates:candidates.slice(0,6)).map(candidate=><button key={candidate.id} aria-pressed={selection.candidateId===candidate.id} onClick={()=>onFocus(candidate.id)}><span><strong>Patch {candidate.id.split('_').at(-1)}</strong><small>{ha(candidate.area_ha)} · zoom to location</small></span><span>{ha(candidate.optical_supported_ha)}<small>optically supported</small></span></button>)}</div>
        <p className="atlas-evidence-note">Areas refer to whole patches, including portions outside the selected boundary. These are change candidates, not confirmed landslide areas.</p>
        {!candidates.length&&<p className="atlas-evidence-note">No candidate intersects this area under the current screen. This does not establish absence of disturbance.</p>}
        {candidates.length>6&&<button className="atlas-focus-action" onClick={()=>setAll(value=>!value)}>{all?'Show fewer locations':`Show all ${candidates.length} locations`}</button>}
      </>:<p className="atlas-evidence-note">No GCOV candidate inventory matches this observation. Select a surface-change interval to inspect its objects; specialist layers remain available.</p>}
    </>}
    {selected&&<section className="atlas-candidate-inspector" aria-label="Selected candidate evidence"><div className="atlas-candidate-heading"><h3>Selected location</h3><button onClick={()=>onChange({...selection,candidateId:undefined})}>Clear selection</button></div><p className="atlas-evidence-note">{selected.comparison.start} → {selected.comparison.end} UTC · {selected.candidate.verification}<br />Reference footprint stays selected while other dates blend; this is not object tracking.</p><button className="atlas-focus-action" onClick={()=>onFocus(selected.candidate.id)}>Zoom to selected location ↗</button>
      <dl className="atlas-metadata"><div><dt>Native radar candidate area</dt><dd>{ha(selected.candidate.area_ha)}</dd></div><div><dt>Optical vegetation-loss support</dt><dd>{ha(selected.candidate.optical_supported_ha)}</dd></div><div><dt>Clear optical; no loss support</dt><dd>{ha(selected.candidate.optical_unsupported_ha)}</dd></div><div><dt>Optical unavailable / unknown</dt><dd>{ha(selected.candidate.optical_unknown_ha)}</dd></div><div><dt>Within 100 m of derived drainage</dt><dd>{ha(selected.candidate.near_drainage_ha)}</dd></div><div><dt>Peak averaged absolute change</dt><dd>{selected.candidate.peak_change_db.toFixed(2)} dB</dd></div><div><dt>Mean native signed change</dt><dd>{selected.candidate.mean_signed_change_db.toFixed(2)} dB</dd></div></dl>
      <p className="atlas-evidence-note">Optical support: 6 Apr–13 Sept 2026. It does not establish the cause or timing of the radar change. Drainage proximity is geographic context, not confirmed debris transport.</p>
      {selected.comparison.sources.map((source,index)=><a className="atlas-source-link" href={source} target="_blank" rel="noreferrer" key={source}>{index?'Later':'Earlier'} radar source ↗</a>)}
      <button className="atlas-focus-action" onClick={exportBrief}>Export printable evidence brief ↓</button>
      <details><summary>Candidate identifier and provenance</summary><p className="atlas-evidence-note">{selected.candidate.id}<br />Analysis generated: {assessment?.generated_at}<br />{assessment?.method}</p></details>
    </section>}
  </section>
}
