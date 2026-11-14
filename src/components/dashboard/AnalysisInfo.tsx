import type { MapDataMode, TimelineItem } from './dashboardData'

export default function AnalysisInfo({ observations, mode, dateIndex, onDateChange }: {
  observations: readonly TimelineItem[]
  mode: MapDataMode
  dateIndex: number
  onDateChange: (index: number) => void
}) {
  return (
    <>
      <div className="atlas-section-heading"><span className="atlas-section-number">03</span><div><p className="atlas-eyebrow">The bigger picture</p><h2>Observations before conclusions.</h2></div></div>
      <p className="atlas-body-copy">Explore {observations.length} {mode === 'backscatter' ? 'backscatter observations' : mode === 'backscatterChange' ? 'backscatter comparisons' : mode === 'coherenceChange' ? 'coherence comparisons' : 'GUNW date pairs'} using the date slider or the list below. A radar signal alone does not confirm a landslide.</p>
      <ol className="atlas-observation-list">{observations.map((item, index) => <li key={item.key}><button onClick={() => onDateChange(index)} aria-pressed={dateIndex === index}><span>{String(index + 1).padStart(2, '0')}</span><span>{item.label}{item.baselineLabel && <small>Baseline: {item.baselineLabel}</small>}</span><span>{dateIndex === index ? 'Viewing' : 'View ↗'}</span></button></li>)}</ol>
      <p className="atlas-caveat">Coherence change shows differences between pairs; phase is uncorrected and unreferenced. Corrected displacement, terrain context and landslide classification are not yet available.</p>
    </>
  )
}
