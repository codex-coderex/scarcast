import type { GCOVAcquisition } from '../../services/processGCOVData'
import { dateFor, dateFormatter } from './dashboardUtils'

export default function BackscatterInfo({ acquisition, showLegend = true }: { acquisition: GCOVAcquisition; showLegend?: boolean }) {
  const frequency = acquisition.metadata.frequencies.A
  return (
    <>
      <div className="atlas-section-heading"><h2>Backscatter</h2></div>
      <p className="atlas-body-copy">Backscatter records how much radar energy returns from the ground. Brighter areas reflect a stronger return; darker areas a weaker one. Surface texture, vegetation and moisture can all influence this signal.</p>
      {showLegend && <div className="atlas-signal-legend"><div><span>Weaker return</span><span>Stronger return</span></div><div className="atlas-grayscale" /><div><strong>{acquisition.displayMinDb.toFixed(2)} dB</strong><strong>{acquisition.displayMaxDb.toFixed(2)} dB</strong></div><p>{acquisition.sharedStretch?'Shared stretch across available scenes':'Display stretch · 2nd–98th percentile'} · HHHH polarization</p></div>}
      <div className="atlas-observation-caption"><span className="atlas-eyebrow">Selected observation</span><time dateTime={acquisition.acquiredAt}>{dateFormatter.format(dateFor(acquisition.acquiredAt))}</time></div>
      <dl className="atlas-metadata">
        <div><dt>Mission / product</dt><dd>NISAR / GCOV</dd></div>
        <div><dt>Orbit direction</dt><dd>{acquisition.metadata.identification.orbitPassDirection}</dd></div>
        <div><dt>Radar band</dt><dd>{String(acquisition.metadata.identification.radarBand ?? '—')}-band · Frequency A</dd></div>
        <div><dt>Pixel spacing</dt><dd>{Math.abs(frequency.transform[0])} × {Math.abs(frequency.transform[4])} m</dd></div>
        <div><dt>Raster dimensions</dt><dd>{frequency.shape[1].toLocaleString()} × {frequency.shape[0].toLocaleString()} px</dd></div>
        <div><dt>Observation time</dt><dd>{acquisition.acquiredAt.slice(11, 19)} UTC</dd></div>
      </dl>
      <p className="atlas-caveat"><span aria-hidden="true">↳</span> A single observation shows radar response, not ground movement or a landslide classification.</p>
      <a className="atlas-source-link" href={acquisition.metadata.source} target="_blank" rel="noreferrer">View source acquisition <span aria-hidden="true">↗</span></a>
    </>
  )
}
