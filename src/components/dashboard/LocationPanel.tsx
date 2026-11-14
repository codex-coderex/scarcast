import { useEffect, useRef } from 'react'
import { m, useIsPresent } from 'framer-motion'
import type { GCOVAcquisition } from '../../services/processGCOVData'
import { centerFor, locations, nameFor } from './dashboardUtils'
import type { DataTab } from './dashboardUtils'
import BackscatterInfo from './BackscatterInfo'
import DeformationInfo from './DeformationInfo'
import AnalysisInfo from './AnalysisInfo'
import { dashboardFade } from './dashboardTransitions'

export default function LocationPanel({ location, acquisition, acquisitions, tab, dateIndex, onTabChange, onDateChange }: {
  location: string | null
  acquisition?: GCOVAcquisition
  acquisitions: readonly GCOVAcquisition[]
  tab: DataTab
  dateIndex: number
  onTabChange: (tab: DataTab) => void
  onDateChange: (index: number) => void
}) {
  const panelHeading = useRef<HTMLHeadingElement>(null)
  const isPresent = useIsPresent()
  const center = acquisition ? centerFor(acquisition.bounds) : null
  const frequency = acquisition?.metadata.frequencies.A

  useEffect(() => {
    if (location && isPresent) panelHeading.current?.focus({ preventScroll: true })
  }, [location, isPresent])

  return (
    <m.aside {...dashboardFade} className="atlas-detail-panel" aria-label="Study location information" inert={!isPresent} aria-hidden={!isPresent}>
      {acquisition && frequency && center && <div className="atlas-detail-inner">
        <div className="atlas-panel-topline"><span className="atlas-eyebrow">Location</span><span>{String(locations.findIndex(([slug]) => slug === location) + 1).padStart(2, '0')} / {String(locations.length).padStart(2, '0')}</span></div>
        <p className="atlas-place-kicker">{location === 'mount_balikabok' ? 'Luzon, Philippines' : 'Earth observation study'}</p>
        <h1 ref={panelHeading} tabIndex={-1}>{nameFor(location!)}</h1>
        <p className="atlas-coordinates">{Math.abs(center[0]).toFixed(4)}° {center[0] >= 0 ? 'N' : 'S'} <span>/</span> {Math.abs(center[1]).toFixed(4)}° {center[1] >= 0 ? 'E' : 'W'}</p>
        <p className="atlas-location-intro">A place observed over time. Explore radar observations of this landscape, one acquisition at a time.</p>

        <nav className="atlas-data-tabs" aria-label="Location data">
          <button aria-current={tab === 'backscatter' ? 'page' : undefined} onClick={() => onTabChange('backscatter')}>Backscatter</button>
          <button aria-current={tab === 'deformation' ? 'page' : undefined} onClick={() => onTabChange('deformation')}>Deformation <span className="atlas-tab-dot" /></button>
          <button aria-current={tab === 'analysis' ? 'page' : undefined} onClick={() => onTabChange('analysis')}>Analysis</button>
        </nav>

        <m.div {...dashboardFade} className="atlas-tab-content" key={tab}>
          {tab === 'backscatter' && <BackscatterInfo acquisition={acquisition} />}
          {tab === 'deformation' && <DeformationInfo />}
          {tab === 'analysis' && <AnalysisInfo acquisitions={acquisitions} dateIndex={dateIndex} onDateChange={onDateChange} />}
        </m.div>
        <footer className="atlas-dossier-footer"><span>SCARCAST / FIELD NOTES</span><span>NASA SPACE APPS</span></footer>
      </div>}
    </m.aside>
  )
}
