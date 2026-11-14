import { m, useIsPresent } from 'framer-motion'
import type { ReactNode } from 'react'
import type { TimelineItem } from './dashboardData'
import { dateFor, dateFormatter } from './dashboardUtils'
import { dashboardFade } from './dashboardTransitions'

export default function ObservationTimeline({ items, heading, dateIndex, onDateChange, children }: {
  items: readonly TimelineItem[]
  heading: string
  dateIndex: number
  onDateChange: (index: number) => void
  children?: ReactNode
}) {
  const isPresent = useIsPresent()
  const item = items[dateIndex]
  if (!item) return null
  return (
    <m.div {...dashboardFade} className={`atlas-timeline${item.endAt ? ' atlas-timeline--interval' : ''}`} inert={!isPresent} aria-hidden={!isPresent}>
      {children}
      <div className="atlas-timeline-heading"><span className="atlas-eyebrow">{heading}</span><span>{String(dateIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span></div>
      <div className="atlas-timeline-current">
        <button aria-label="Previous observation" disabled={dateIndex === 0} onClick={() => onDateChange(dateIndex - 1)}>←</button>
        <span className="atlas-timeline-label"><time dateTime={item.startAt}>{dateFormatter.format(dateFor(item.startAt))}</time>{item.endAt && <> – <time dateTime={item.endAt}>{dateFormatter.format(dateFor(item.endAt))}</time></>}</span>
        <button aria-label="Next observation" disabled={dateIndex === items.length - 1} onClick={() => onDateChange(dateIndex + 1)}>→</button>
      </div>
      <input type="range" aria-label={heading} aria-valuetext={item.label + (item.baselineLabel ? `; baseline ${item.baselineLabel}` : '')}
        min={0} max={Math.max(0, items.length - 1)} step={1} value={dateIndex} disabled={items.length === 1}
        onChange={event => onDateChange(Number(event.target.value))} />
      <div className="atlas-timeline-dates">{items.map((entry, index) => <button key={entry.key}
        aria-label={`View ${entry.label}`} aria-pressed={index === dateIndex}
        onClick={() => onDateChange(index)}>{entry.shortLabel}</button>)}</div>
      {item.baselineLabel && <p className="atlas-timeline-baseline">Baseline: {item.baselineLabel}</p>}
    </m.div>
  )
}
