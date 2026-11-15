import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, test } from 'node:test'
import proj4 from 'proj4'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const directory=new URL('../data/balikabok_downstream/evidence/',import.meta.url)
const read=file=>JSON.parse(readFileSync(new URL(file,directory),'utf8'))
const data=read('assessment.json'),existing=read('investigation.json')
const project=p=>proj4('EPSG:4326','+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs',p)
const signedArea=ring=>{const p=ring.map(project);return p.slice(1).reduce((s,v,i)=>s+p[i][0]*v[1]-v[0]*p[i][1],0)/2}

test('native objects and three optical-support states reconcile with the original evidence',()=>{
  const ids=new Set()
  for(const comparison of data.comparisons){
    const old=existing.comparisons.find(item=>item.start===comparison.start&&item.end===comparison.end)
    const features=read(comparison.geometry_file).features,support=read(comparison.support_file).features
    assert.equal(features.length,comparison.candidates.length)
    const sum=key=>comparison.candidates.reduce((s,c)=>s+c[key],0)
    assert.ok(Math.abs(sum('area_ha')-old.zones.study.radar_candidate_ha)<.00001)
    assert.ok(Math.abs(sum('mountain_area_ha')-old.zones.mountain.radar_candidate_ha)<.00001)
    assert.ok(Math.abs(sum('optical_supported_ha')-old.zones.study.optical_supported_ha)<.00001)
    assert.ok(Math.abs(sum('optical_supported_ha')+sum('optical_unsupported_ha')-old.zones.study.optical_evaluable_candidate_ha)<.00001)
    for(const c of comparison.candidates){
      assert.ok(!ids.has(c.id));ids.add(c.id)
      assert.ok(Math.abs(c.optical_supported_ha+c.optical_unsupported_ha+c.optical_unknown_ha-c.area_ha)<.00001)
      assert.ok(c.mountain_area_ha<=c.area_ha&&c.near_drainage_ha<=c.area_ha)
      const feature=features.find(f=>f.properties.id===c.id)
      const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates
      let area=0
      for(const polygon of polygons)for(const [i,ring] of polygon.entries()){
        assert.deepEqual(ring[0],ring.at(-1));assert.ok(ring.length>=4)
        const value=signedArea(ring);assert.ok(i===0?value>0:value<0);area+=value
        for(const [lon,lat] of ring){assert.ok(lat>=c.bounds[0][0]-.000001&&lat<=c.bounds[1][0]+.000001);assert.ok(lon>=c.bounds[0][1]-.000001&&lon<=c.bounds[1][1]+.000001)}
      }
      assert.ok(Math.abs(area/10000-c.area_ha)<.02,`native polygon area ${c.id}`)
      const pieces=support.filter(f=>f.properties.candidate_id===c.id)
      for(const piece of pieces)assert.ok([1,2,3].includes(piece.properties.category))
    }
    assert.ok(comparison.start_at.endsWith('Z')&&comparison.end_at.endsWith('Z'))
  }
})

let server,service,Workspace,time
before(async()=>{
  server=await createServer({cacheDir:'node_modules/.cache/assessment-tests',optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'})
  service=await server.ssrLoadModule('/src/services/assessmentData.ts')
  time=await server.ssrLoadModule('/src/services/observationTime.ts')
  ;({default:Workspace}=await server.ssrLoadModule('/src/components/dashboard/investigation/CandidateAssessment.tsx'))
})
after(async()=>{await server?.close()})
test('event relationships and local acquisition dates are timezone explicit',()=>{
  assert.equal(time.asUTC('2026-09-03T21:30:32.000000000'),'2026-09-03T21:30:32.000000000Z')
  assert.ok(time.philippineAcquisition('2026-09-03T21:30:32').includes('04 Sept 2026'))
  assert.equal(service.eventRelationship('2026-08-22T21:30:32','2026-09-03T21:30:32'),'Spans reported event')
  assert.equal(service.eventRelationship('2026-09-03T21:30:32','2026-09-15T21:30:31'),'Post-event observation')
})
test('selected reference candidate survives blending without fabricated area measurements',()=>{
  const comparison=service.assessment.comparisons[1],candidate=comparison.candidates.find(c=>c.mountain_area_ha>0)
  const html=renderToStaticMarkup(createElement(Workspace,{observation:{startAt:comparison.start_at,endAt:comparison.end_at},nextObservation:{startAt:data.comparisons[2].start_at,endAt:data.comparisons[2].end_at},blendFraction:.5,selection:{zone:'mountain',candidateId:candidate.id},onChange(){},onFocus(){},onOverview(){}}))
  assert.ok(html.includes('50%'))
  assert.ok(html.includes('No blended area'))
  assert.ok(html.includes('Selected location'))
  assert.ok(html.includes('Optical unavailable / unknown'))
  assert.ok(html.includes('not object tracking'))
  const brief=service.candidateBriefHTML(candidate,comparison)
  assert.ok(brief.includes(candidate.id)&&brief.includes(comparison.sources[0]))
  assert.ok(brief.includes(service.assessment.optical_sources[0].id))
  assert.ok(brief.includes(service.assessment.terrain_source.acquisition_period))
  assert.ok(brief.includes('not confirmed')||brief.includes('Not confirmed'))
  assert.ok(service.candidateOverviewBounds()[0][0]<candidate.bounds[1][0])
})
