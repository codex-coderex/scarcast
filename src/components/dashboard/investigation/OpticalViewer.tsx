import { evidenceImage, opticalDateLabel, opticalEventOffset, opticalTimeline } from '../../../services/corroborationData'
import type { EvidenceSelection } from '../../../services/corroborationData'
import OpticalAcquisitionNote from '../OpticalAcquisitionNote'

export default function OpticalViewer({ selection, onChange }: {
  selection: EvidenceSelection
  onChange: (selection: EvidenceSelection) => void
}) {
  const scenes = opticalTimeline?.scenes ?? []
  const scene = scenes.find(item => item.id === selection.opticalScene)
  if (!scenes.length) return <p className="atlas-body-copy">No dated optical imagery has been exported for this study.</p>
  return <section className="atlas-optical-viewer" aria-label="Dated optical imagery">
    <label className="atlas-evidence-label" htmlFor="optical-date">Optical acquisition</label>
    <select id="optical-date" value={selection.opticalSceneOverride ?? 'auto'} onChange={event => onChange({ ...selection, opticalSceneOverride: event.target.value === 'auto' ? undefined : event.target.value })}>
      <option value="auto">Nearest image to radar date</option>
      {scenes.map(item => <option key={item.id} value={item.id}>{opticalDateLabel(item)} · {item.date.slice(0, 10) < opticalTimeline!.event_date ? 'Before event' : 'After event'}</option>)}
    </select>
    {scene && <figure>
      <a href={evidenceImage(scene.overlay.file)} target="_blank" rel="noreferrer" aria-label={`Open optical image from ${opticalDateLabel(scene)}`}><img src={evidenceImage(scene.overlay.file)} alt={`${scene.sensor} true-color image of the Balikabok study area, acquired ${opticalDateLabel(scene)}. Masked pixels are gray.`} /></a>
      <figcaption>{scene.sensor} · {opticalDateLabel(scene)} · {opticalTimeline?.resolution_m} m<br />{opticalEventOffset(scene)}. {Math.round(scene.clear_fraction[selection.zone] * 100)}% clear in selected area.</figcaption>
    </figure>}
    <label className="atlas-evidence-toggle"><input type="checkbox" checked={selection.optical} onChange={event => onChange({ ...selection, optical: event.target.checked })} />Show optical image on map</label>
    {selection.optical && <>
      <OpticalAcquisitionNote selection={selection} />
      <label className="atlas-evidence-label">Optical opacity · {Math.round(selection.opticalOpacity * 100)}%<input aria-label="Optical overlay opacity" type="range" min={0} max={1} step={.05} value={selection.opticalOpacity} onChange={event => onChange({ ...selection, opticalOpacity: Number(event.target.value) })} /></label>
    </>}
    <p className="atlas-evidence-note">No usable August 30 image is available in this export. The first usable post-event frame is September 13, 14 days later. The April baseline is much earlier; gray pixels remain unknown.</p>
    {scene && <a className="atlas-evidence-source" href={scene.source_urls[0]} target="_blank" rel="noreferrer">Original optical acquisition ↗</a>}
  </section>
}
