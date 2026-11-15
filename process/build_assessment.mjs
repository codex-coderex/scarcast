/** Build reviewable candidate objects from local rasters and cached HLS inputs. No network requests. */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fromFile } from 'geotiff'
import proj4 from 'proj4'

const root = path.resolve(import.meta.dirname, '..')
const study = path.join(root, 'data/balikabok_downstream')
const out = path.join(study, 'evidence')
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const utm = '+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs'
const project = p => proj4('EPSG:4326', utm, p)
const geographic = p => proj4(utm, 'EPSG:4326', p).map(v => +v.toFixed(7))
const cache = process.env.SCARCAST_INPUT_CACHE ?? path.join(os.tmpdir(), 'scarcast-corroboration-inputs')
const summary = read(path.join(out, 'summary.json'))
const mountainDir = path.join(root, 'data/mount_balikabok/gcov')
const mountain = read(path.join(mountainDir, fs.readdirSync(mountainDir).sort()[0], 'metadata.json')).aoi.coordinates[0].map(project)
function inside([x,y], ring) {
  let result = false
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) if ((ring[i][1]>y)!==(ring[j][1]>y) && x<(ring[j][0]-ring[i][0])*(y-ring[i][1])/(ring[j][1]-ring[i][1])+ring[i][0]) result=!result
  return result
}
// Match corroboration.py's snapped 30 m intermediate grid, before the 10 m join.
const edgePoints = []
const [west,south,east,north] = summary.bbox
for(let i=0;i<=21;i++){ const t=i/21; edgePoints.push(project([west+(east-west)*t,south]),project([west+(east-west)*t,north]),project([west,south+(north-south)*t]),project([east,south+(north-south)*t])) }
const opticalLeft=Math.floor(Math.min(...edgePoints.map(p=>p[0]))/30)*30
const opticalTop=Math.ceil(Math.max(...edgePoints.map(p=>p[1]))/30)*30
const catalog = read(path.join(out, 'catalog.json'))
async function raster(file, bounds) {
  const tif=await fromFile(file)
  try {
    const image=await tif.getImage(), origin=image.getOrigin(), resolution=image.getResolution()
    if(image.getGeoKeys().ProjectedCSTypeGeoKey !== 32651) throw new Error('Expected EPSG:32651: '+file)
    let window=[0,0,image.getWidth(),image.getHeight()]
    if(bounds) window=[Math.max(0,Math.floor((bounds[0]-origin[0])/resolution[0])-3),Math.max(0,Math.floor((bounds[3]-origin[1])/resolution[1])-3),Math.min(image.getWidth(),Math.ceil((bounds[2]-origin[0])/resolution[0])+3),Math.min(image.getHeight(),Math.ceil((bounds[1]-origin[1])/resolution[1])+3)]
    const values=await image.readRasters({window,samples:[0],interleave:true})
    const width=window[2]-window[0], height=window[3]-window[1]
    return {values,width,height,origin,resolution,window,at(x,y){const c=Math.floor((x-origin[0])/resolution[0])-window[0],r=Math.floor((y-origin[1])/resolution[1])-window[1];return c>=0&&r>=0&&c<width&&r<height?values[r*width+c]:NaN}}
  } finally { await tif.close() }
}
const optical=[]
for(const date of ['2026-04-06','2026-09-13']) {
  const record=catalog.HLSS30.find(item=>item.id.includes('T51PTS')&&item.date.startsWith(date))
  const bands=[]
  for(const band of ['B04','B8A','Fmask']){
    const url=record.links.find(url=>url.endsWith('.'+band+'.tif'))
    if(!url)throw new Error('Missing optical band '+band)
    bands.push(await raster(path.join(cache,path.basename(url)),[Math.min(...edgePoints.map(p=>p[0]))-100,Math.min(...edgePoints.map(p=>p[1]))-100,Math.max(...edgePoints.map(p=>p[0]))+100,Math.max(...edgePoints.map(p=>p[1]))+100]))
  }
  optical.push({record,bands})
}
function ndvi(bands,x,y){
  const [red,nir,qa]=bands.map(b=>b.at(x,y))
  if(![red,nir,qa].every(Number.isFinite)||qa===255||(qa&31)!==0||(qa>>6)===3||red===-9999||nir===-9999||red+nir<=0)return NaN
  const value=Math.fround((nir-red)/(nir+red));return Math.abs(value)<=1?value:NaN
}
function opticalClass(x,y){
  const gx=opticalLeft+(Math.floor((x-opticalLeft)/30)+.5)*30,gy=opticalTop-(Math.floor((opticalTop-y)/30)+.5)*30
  const a=ndvi(optical[0].bands,gx,gy),b=ndvi(optical[1].bands,gx,gy)
  return Number.isFinite(a)&&Number.isFinite(b)?Math.fround(a-b)>=.2?2:1:3
}
// Bucket projected drainage segments for exact point-to-segment proximity queries.
const segments=new Map()
for(const feature of read(path.join(out,'drainage.geojson')).features){
  const lines=feature.geometry.type==='MultiLineString'?feature.geometry.coordinates:[feature.geometry.coordinates]
  for(const line of lines)for(let i=1;i<line.length;i++){
    const a=project(line[i-1]),b=project(line[i])
    for(let x=Math.floor((Math.min(a[0],b[0])-100)/200);x<=Math.floor((Math.max(a[0],b[0])+100)/200);x++)for(let y=Math.floor((Math.min(a[1],b[1])-100)/200);y<=Math.floor((Math.max(a[1],b[1])+100)/200);y++){const key=x+','+y; if(!segments.has(key))segments.set(key,[]);segments.get(key).push([a,b])}
  }
}
function nearDrainage(x,y){return (segments.get(Math.floor(x/200)+','+Math.floor(y/200))??[]).some(([a,b])=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return (x-a[0]-t*dx)**2+(y-a[1]-t*dy)**2<=10000})}

/** Trace native cell boundaries, resolving diagonal contacts into separate outer rings. */
function geometry(cells,labels,id,width,height,toXY){
  const edges=new Map(), stride=width+1
  const add=(a,b)=>{if(!edges.has(a))edges.set(a,[]);edges.get(a).push(b)}
  for(const cell of cells){const r=Math.floor(cell/width),c=cell%width,tl=r*stride+c,tr=tl+1,bl=tl+stride,br=bl+1
    if(r===0||labels[cell-width]!==id)add(tl,tr)
    if(c===width-1||labels[cell+1]!==id)add(tr,br)
    if(r===height-1||labels[cell+width]!==id)add(br,bl)
    if(c===0||labels[cell-1]!==id)add(bl,tl)
  }
  const point=node=>[node%stride,Math.floor(node/stride)], rings=[]
  let remaining=[...edges.values()].reduce((n,v)=>n+v.length,0)
  while(remaining){const start=edges.keys().next().value;let current=start,previous=null;const ring=[]
    do {ring.push(point(current));const choices=edges.get(current);if(!choices?.length)throw new Error('Broken raster boundary')
      let index=0
      if(choices.length>1&&previous!==null){const p=point(previous),q=point(current),dx=q[0]-p[0],dy=q[1]-p[1];let best=-Infinity;choices.forEach((next,i)=>{const v=point(next),cross=dx*(v[1]-q[1])-dy*(v[0]-q[0]);if(cross>best){best=cross;index=i}})}
      const next=choices.splice(index,1)[0];remaining--;if(!choices.length)edges.delete(current);previous=current;current=next
      if(ring.length>cells.length*4+4)throw new Error('Boundary cycle failed')
    }while(current!==start)
    const simple=ring.filter((p,i)=>{const a=ring[(i+ring.length-1)%ring.length],b=ring[(i+1)%ring.length];return (p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0])})
    simple.push(simple[0]);const signed=simple.slice(1).reduce((sum,p,i)=>sum+simple[i][0]*p[1]-p[0]*simple[i][1],0)
    rings.push({ring:simple,outer:signed>0})
  }
  const polygons=rings.filter(r=>r.outer).map(r=>[r.ring])
  for(const hole of rings.filter(r=>!r.outer)){const parent=polygons.find(p=>inside(hole.ring[0],p[0]));if(!parent)throw new Error('Unassigned polygon hole');parent.push(hole.ring)}
  const coordinates=polygons.map(poly=>poly.map(ring=>ring.map(p=>geographic(toXY(p))).reverse()))
  return coordinates.length===1?{type:'Polygon',coordinates:coordinates[0]}:{type:'MultiPolygon',coordinates}
}

const manifest={schema_version:1,generated_at:new Date().toISOString(),event:{id:'balikabok-2026-08-30',reported_date:'2026-08-30',timezone:'Asia/Manila',onset_time:null,source:'https://philsa.gov.ph/news/satellite-data-shows-august-30-landslide-in-subic-zambales-following-prolonged-rains/'},optical_interval:['2026-04-06','2026-09-13'],comparisons:[],method:'8-connected objects from existing native 10 m radar hotspot mask before optical splitting. Areas from raster cell counts. Optical support reproduces the existing snapped 30 m NDVI join. Drainage proximity is <=100 m Euclidean distance to historical derived lines. Not a validated landslide, damage or hazard classifier.'}
const pending=[]
manifest.optical_sources=optical.map(({record})=>({id:record.id,date:record.date,source_urls:record.links.filter(url=>['B04','B8A','Fmask'].some(band=>url.endsWith('.'+band+'.tif')))}))
manifest.terrain_source={id:summary.terrain.source_id,url:summary.terrain.source_url,acquisition_period:summary.terrain.acquisition_period}
for(const folder of fs.readdirSync(path.join(study,'gcov_change')).sort()){
  const dir=path.join(study,'gcov_change',folder),meta=read(path.join(dir,'metadata.json'))
  const hot=await raster(path.join(dir,'hotspots.tif')),signed=await raster(path.join(dir,'change.tif'))
  const {width,height}=hot,n=width*height
  if(width!==signed.width||height!==signed.height||hot.resolution[0]!==10||hot.resolution[1]!==-10||JSON.stringify(hot.origin)!==JSON.stringify(signed.origin))throw new Error('Incompatible native grid')
  const labels=new Int32Array(n),classes=new Int32Array(n),queue=new Int32Array(n),objects=[],features=[],support=[]
  const toXY=([c,r])=>[hot.origin[0]+c*10,hot.origin[1]-r*10]
  for(let seed=0;seed<n;seed++){
    if(labels[seed]||!Number.isFinite(hot.values[seed]))continue
    const id=objects.length+1;let head=0,tail=1;queue[0]=seed;labels[seed]=id
    while(head<tail){const cell=queue[head++],r=Math.floor(cell/width),c=cell%width
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const rr=r+dy,cc=c+dx,j=rr*width+cc;if(rr>=0&&rr<height&&cc>=0&&cc<width&&!labels[j]&&Number.isFinite(hot.values[j])){labels[j]=id;queue[tail++]=j}}
    }
    const cells=queue.slice(0,tail),byClass=[[],[],[],[]];let mountainCount=0,nearCount=0,peak=0,sum=0,minC=width,minR=height,maxC=0,maxR=0
    for(const cell of cells){const r=Math.floor(cell/width),c=cell%width,[x,y]=toXY([c+.5,r+.5]),category=opticalClass(x,y);classes[cell]=id*4+category;byClass[category].push(cell);if(inside([x,y],mountain))mountainCount++;if(nearDrainage(x,y))nearCount++;peak=Math.max(peak,hot.values[cell]);sum+=signed.values[cell];minC=Math.min(minC,c);minR=Math.min(minR,r);maxC=Math.max(maxC,c);maxR=Math.max(maxR,r)}
    const candidateId=`${meta.start_at.slice(0,10)}_${meta.end_at.slice(0,10)}_${seed}`
    const geom=geometry(cells,labels,id,width,height,toXY),corners=[[minC,minR],[maxC+1,minR],[minC,maxR+1],[maxC+1,maxR+1]].map(p=>geographic(toXY(p))),sw=[Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1]))],ne=[Math.max(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[1]))]
    const object={id:candidateId,area_ha:tail*.01,mountain_area_ha:mountainCount*.01,optical_supported_ha:byClass[2].length*.01,optical_unsupported_ha:byClass[1].length*.01,optical_unknown_ha:byClass[3].length*.01,near_drainage_ha:nearCount*.01,peak_change_db:+peak.toFixed(3),mean_signed_change_db:+(sum/tail).toFixed(3),bounds:[[sw[1],sw[0]],[ne[1],ne[0]]],verification:'Not field verified'}
    objects.push(object);features.push({type:'Feature',properties:object,geometry:geom})
    for(const category of [1,2,3])if(byClass[category].length)support.push({type:'Feature',properties:{candidate_id:candidateId,category,meaning:category===2?'Radar candidate with optical vegetation loss':category===1?'Radar candidate; clear optical pixels without vegetation-loss support':'Radar candidate; optical evidence unavailable'},geometry:geometry(byClass[category],classes,id*4+category,width,height,toXY)})
  }
  const key=meta.start_at.slice(0,10)+'_'+meta.end_at.slice(0,10)
  manifest.comparisons.push({start:meta.start_at.slice(0,10),end:meta.end_at.slice(0,10),start_at:meta.start_at.slice(0,19)+'Z',end_at:meta.end_at.slice(0,19)+'Z',sources:meta.sources,candidates:objects.sort((a,b)=>b.mountain_area_ha-a.mountain_area_ha||b.area_ha-a.area_ha),geometry_file:`candidates-${key}.geojson`,support_file:`support-${key}.geojson`})
  pending.push([`candidates-${key}.geojson`,{type:'FeatureCollection',features}],[`support-${key}.geojson`,{type:'FeatureCollection',features:support}])
  console.log(key+': '+objects.length+' native radar objects')
}
// Verify native candidate totals before publishing a complete artifact set.
const existing=read(path.join(out,'investigation.json'))
for(const item of manifest.comparisons){const old=existing.comparisons.find(row=>row.start===item.start&&row.end===item.end);const area=item.candidates.reduce((s,c)=>s+c.area_ha,0),mountainArea=item.candidates.reduce((s,c)=>s+c.mountain_area_ha,0),supported=item.candidates.reduce((s,c)=>s+c.optical_supported_ha,0),evaluable=item.candidates.reduce((s,c)=>s+c.optical_supported_ha+c.optical_unsupported_ha,0);if(Math.abs(area-old.zones.study.radar_candidate_ha)>.02||Math.abs(mountainArea-old.zones.mountain.radar_candidate_ha)>.02||Math.abs(supported-old.zones.study.optical_supported_ha)>.02||Math.abs(evaluable-old.zones.study.optical_evaluable_candidate_ha)>.02)throw new Error('Candidate or optical-support area does not reconcile with existing exports')}
for(const [name,data] of pending){const target=path.join(out,name);fs.writeFileSync(target+'.part',JSON.stringify(data));fs.renameSync(target+'.part',target)}
fs.writeFileSync(path.join(out,'assessment.json.part'),JSON.stringify(manifest,null,2));fs.renameSync(path.join(out,'assessment.json.part'),path.join(out,'assessment.json'))
console.log('Published assessment.json and candidate/support geometry. Original evidence unchanged.')
