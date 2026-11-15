import type { LatLngBoundsLiteral } from 'leaflet'
import { asUTC } from './observationTime'
export { asUTC } from './observationTime'

export interface AssessmentCandidate {
  id: string; area_ha: number; mountain_area_ha: number
  optical_supported_ha: number; optical_unsupported_ha: number; optical_unknown_ha: number
  near_drainage_ha: number; peak_change_db: number; mean_signed_change_db: number
  bounds: LatLngBoundsLiteral; verification: string
}
export interface AssessmentComparison {
  start: string; end: string; start_at: string; end_at: string; sources: string[]
  candidates: AssessmentCandidate[]; geometry_file: string; support_file: string
}
interface Assessment {
  schema_version: number; generated_at: string; method: string
  event: {id:string; reported_date:string; timezone:string; onset_time:null; source:string}
  optical_interval: [string,string]; comparisons: AssessmentComparison[]
  optical_sources: {id:string;date:string;source_urls:string[]}[]
  terrain_source: {id:string;url:string;acquisition_period:string}
}
export const assessment = Object.values(import.meta.glob<Assessment>('../../data/balikabok_downstream/evidence/assessment.json', {eager:true,import:'default'}))[0] as Assessment | undefined
const urls = import.meta.glob<string>(['../../data/balikabok_downstream/evidence/candidates-*.geojson','../../data/balikabok_downstream/evidence/support-*.geojson'],{eager:true,query:'?url',import:'default'})
export const assessmentGeometryUrl = (file:string) => urls[`../../data/balikabok_downstream/evidence/${file}`]
export const assessmentComparison = (start?:string,end?:string) => assessment?.comparisons.find(item=>end ? item.start===start?.slice(0,10)&&item.end===end.slice(0,10) : item.end===start?.slice(0,10))
export function selectedAssessmentCandidate(id?:string) {
  for(const comparison of assessment?.comparisons??[]){const candidate=comparison.candidates.find(item=>item.id===id);if(candidate)return {candidate,comparison}}
}
export function candidateOverviewBounds(): LatLngBoundsLiteral | undefined {
  const event=assessment?.comparisons.find(item=>item.start<'2026-08-30'&&item.end>'2026-08-30')
  const candidates=event?.candidates.filter(item=>item.mountain_area_ha>0)??[]
  if(!candidates.length)return undefined
  return [[Math.min(...candidates.map(c=>c.bounds[0][0])),Math.min(...candidates.map(c=>c.bounds[0][1]))],[Math.max(...candidates.map(c=>c.bounds[1][0])),Math.max(...candidates.map(c=>c.bounds[1][1]))]]
}
export function eventRelationship(start:string,end?:string) {
  const eventStart=Date.parse('2026-08-30T00:00:00+08:00'),eventEnd=eventStart+86400000
  const a=Date.parse(asUTC(start)),b=Date.parse(asUTC(end??start))
  return b<eventStart?'Pre-event baseline':a>=eventEnd?'Post-event observation':a<eventStart&&b>=eventEnd?'Spans reported event':'Overlaps reported event date'
}
export function candidateBrief(candidate:AssessmentCandidate,comparison:AssessmentComparison){
  return {title:'Scarcast preliminary evidence brief',event:assessment?.event,generated_at:new Date().toISOString(),analysis_generated_at:assessment?.generated_at,candidate,radar:{start:comparison.start_at,end:comparison.end_at,timezone:'UTC',sources:comparison.sources},optical_interval:assessment?.optical_interval,optical_sources:assessment?.optical_sources,terrain_source:assessment?.terrain_source,method:assessment?.method,limits:'Candidate disturbance for review and field verification. Not confirmed landslide extent, damage, flood depth, risk ranking, safe access or a dispatch instruction. Optical support spans a longer interval; unavailable optical coverage is unknown. Drainage is derived from historical terrain.'}
}
export function candidateBriefHTML(candidate:AssessmentCandidate,comparison:AssessmentComparison){
  const brief=candidateBrief(candidate,comparison),escape=(value:unknown)=>String(value??'Unavailable').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
  const rows=[['Candidate identifier',candidate.id],['Verification',candidate.verification],['Radar interval (UTC)',`${comparison.start_at} → ${comparison.end_at}`],['Optical vegetation comparison','6 Apr – 13 Sept 2026'],['Focus bounds [latitude, longitude]',JSON.stringify(candidate.bounds)],['Radar candidate area',`${candidate.area_ha.toFixed(2)} ha`],['Optical vegetation-loss support',`${candidate.optical_supported_ha.toFixed(2)} ha`],['Clear optical, no loss support',`${candidate.optical_unsupported_ha.toFixed(2)} ha`],['Optical unavailable / unknown',`${candidate.optical_unknown_ha.toFixed(2)} ha`],['Within 100 m of historical derived drainage',`${candidate.near_drainage_ha.toFixed(2)} ha`],['Peak averaged absolute radar change',`${candidate.peak_change_db.toFixed(2)} dB`],['Mean native signed radar change',`${candidate.mean_signed_change_db.toFixed(2)} dB`],['Analysis generated',assessment?.generated_at],['Brief generated',brief.generated_at]]
  const opticalSources=(assessment?.optical_sources??[]).map(source=>`<li>${escape(source.id)} · ${escape(source.date)}<ul>${source.source_urls.map(url=>`<li><a href="${escape(url)}">${escape(url)}</a></li>`).join('')}</ul></li>`).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Scarcast location evidence brief</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:850px;margin:40px auto;padding:0 24px;color:#17221c}h1{line-height:1.2}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;padding:10px;border-bottom:1px solid #ccd4cc;overflow-wrap:anywhere}th{width:43%}a{color:#254d69;overflow-wrap:anywhere}@media print{body{margin:0;font-size:11pt}tr{break-inside:avoid}}</style></head><body><h1>Scarcast location evidence brief</h1><p>Balikabok reported landslide · 30 August 2026, Philippine time. Precise onset unavailable.</p><p><strong>Preliminary candidate for review and field verification.</strong></p><table>${rows.map(([label,value])=>`<tr><th>${escape(label)}</th><td>${escape(value)}</td></tr>`).join('')}</table><h2>Evidence limits</h2><p>${escape(brief.limits)}</p><h2>Method</h2><p>${escape(assessment?.method)}</p><h2>Radar source acquisitions</h2><ol>${comparison.sources.map(source=>`<li><a href="${escape(source)}">${escape(source)}</a></li>`).join('')}</ol><h2>Optical source acquisitions</h2><ul>${opticalSources}</ul><h2>Historical terrain source</h2><p>${escape(assessment?.terrain_source?.id)} · ${escape(assessment?.terrain_source?.acquisition_period)}<br /><a href="${escape(assessment?.terrain_source?.url)}">Original elevation source</a></p><p><a href="${escape(assessment?.event.source)}">PhilSA event report</a></p></body></html>`
}
