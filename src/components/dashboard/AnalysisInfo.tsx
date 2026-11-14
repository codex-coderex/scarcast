import type { GCOVAcquisition } from '../../services/processGCOVData'
import { dateFor, dateFormatter } from './dashboardUtils'

export default function AnalysisInfo({ acquisitions, dateIndex, onDateChange }: {
  acquisitions: readonly GCOVAcquisition[]
  dateIndex: number
  onDateChange: (index: number) => void
}) {
  return (
    <>
      <div className="atlas-section-heading"><span className="atlas-section-number">03</span><div><p className="atlas-eyebrow">The bigger picture</p><h2>Observations before conclusions.</h2></div></div>
      <p className="atlas-body-copy">This location has {acquisitions.length} backscatter observations. Use the date slider to explore each acquisition. Changes in brightness can have several causes and need further analysis.</p>
      <ol className="atlas-observation-list">{acquisitions.map((item, index) => <li key={item.id}><button onClick={() => onDateChange(index)} aria-pressed={dateIndex === index}><span>{String(index + 1).padStart(2, '0')}</span><time dateTime={item.acquiredAt}>{dateFormatter.format(dateFor(item.acquiredAt))}</time><span>{dateIndex === index ? 'Viewing' : 'View ↗'}</span></button></li>)}</ol>
      <p className="atlas-caveat">Temporal change metrics, terrain context and landslide analysis are not yet implemented. These acquisitions are available for visual exploration.</p>
    </>
  )
}
