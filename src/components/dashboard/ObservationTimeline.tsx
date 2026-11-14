import { m, useIsPresent } from 'framer-motion'
import type { GCOVAcquisition } from '../../services/processGCOVData'
import { dateFor, dateFormatter, shortDateFormatter } from './dashboardUtils'
import { dashboardFade } from './dashboardTransitions'

export default function ObservationTimeline({ acquisition, acquisitions, dateIndex, onDateChange }: {
  acquisition: GCOVAcquisition
  acquisitions: readonly GCOVAcquisition[]
  dateIndex: number
  onDateChange: (index: number) => void
}) {
  const isPresent = useIsPresent()
  return (
    <m.div {...dashboardFade} className="atlas-timeline" inert={!isPresent} aria-hidden={!isPresent}>
      <div className="atlas-timeline-heading"><span className="atlas-eyebrow">Observation date</span><span>{String(dateIndex + 1).padStart(2, '0')} / {String(acquisitions.length).padStart(2, '0')}</span></div>
      <div className="atlas-timeline-current">
        <button aria-label="Previous observation" disabled={dateIndex === 0} onClick={() => onDateChange(dateIndex - 1)}>←</button>
        <time dateTime={acquisition.acquiredAt}>{dateFormatter.format(dateFor(acquisition.acquiredAt))}</time>
        <button aria-label="Next observation" disabled={dateIndex === acquisitions.length - 1} onClick={() => onDateChange(dateIndex + 1)}>→</button>
      </div>
      <input type="range" aria-label="Observation date" aria-valuetext={dateFormatter.format(dateFor(acquisition.acquiredAt))}
        min={0} max={Math.max(0, acquisitions.length - 1)} step={1} value={dateIndex} disabled={acquisitions.length === 1}
        onChange={event => onDateChange(Number(event.target.value))} />
      <div className="atlas-timeline-dates">{acquisitions.map((item, index) => <button key={item.id}
        aria-label={`View ${dateFormatter.format(dateFor(item.acquiredAt))}`} aria-pressed={index === dateIndex}
        onClick={() => onDateChange(index)}>{shortDateFormatter.format(dateFor(item.acquiredAt))}</button>)}</div>
    </m.div>
  )
}
