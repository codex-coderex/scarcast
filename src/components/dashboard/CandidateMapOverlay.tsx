import { useEffect, useState } from 'react'
import { GeoJSON, Pane } from 'react-leaflet'
import type { FeatureCollection, Geometry } from 'geojson'
import { assessmentComparison, assessmentGeometryUrl, selectedAssessmentCandidate } from '../../services/assessmentData'
import type { AssessmentCandidate } from '../../services/assessmentData'
import type { EvidenceSelection } from '../../services/corroborationData'
import type { DashboardObservation } from './dashboardData'

type Candidates = FeatureCollection<Geometry,AssessmentCandidate>
export default function CandidateMapOverlay({observation,selection,blending,onSelect}:{observation?:DashboardObservation;selection:EvidenceSelection;blending:boolean;onSelect:(id:string)=>void}){
  const comparison=assessmentComparison(observation?.startAt,observation?.endAt),selected=selectedAssessmentCandidate(selection.candidateId)
  const file=comparison?.geometry_file,selectedFile=selected?.comparison.geometry_file
  const [loaded,setLoaded]=useState<Record<string,Candidates>>({}),[error,setError]=useState(false)
  useEffect(()=>{
    const controller=new AbortController();setError(false)
    const files=[...new Set([file,selectedFile].filter((value):value is string=>Boolean(value)))]
    void Promise.all(files.map(async file=>{const url=assessmentGeometryUrl(file);if(!url)throw new Error('Missing candidate geometry');const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error('Candidate load failed');const data=await response.json() as Candidates;if(!controller.signal.aborted)setLoaded(value=>({...value,[file]:data}))})).catch(()=>{if(!controller.signal.aborted)setError(true)})
    return ()=>controller.abort()
  },[file,selectedFile])
  const current=file?loaded[file]:undefined
  const display:Candidates|undefined=current?{...current,features:current.features.filter(feature=>selection.zone==='study'||(selection.zone==='mountain'?feature.properties.mountain_area_ha>0:feature.properties.area_ha>feature.properties.mountain_area_ha))}:undefined
  const selectedData=selectedFile?loaded[selectedFile]:undefined
  const highlight:Candidates|undefined=selectedData?{...selectedData,features:selectedData.features.filter(feature=>feature.properties.id===selection.candidateId)}:undefined
  return <>
    <Pane name="assessment-candidates" style={{zIndex:480}}>{!blending&&display&&<GeoJSON key={`${file}/${selection.zone}`} data={display} style={{color:'#f0bd83',weight:1.5,fillOpacity:.04}} onEachFeature={(feature,layer)=>{layer.bindTooltip(`Candidate surface change · ${Number(feature.properties.area_ha).toFixed(2)} ha · select to inspect`);layer.on('click',()=>onSelect(feature.properties.id))}} />}</Pane>
    <Pane name="assessment-selected" style={{zIndex:490}}>{highlight?.features.length?<GeoJSON key={selection.candidateId} data={highlight} style={{color:'#fff3b5',weight:3,fillOpacity:.12}} onEachFeature={(_feature,layer)=>layer.bindTooltip('Selected reference footprint · not tracked through time')} />:null}</Pane>
    {error&&<div className="atlas-evidence-map-error" role="status">Candidate outlines could not load. Reselect an interval to retry.</div>}
  </>
}
