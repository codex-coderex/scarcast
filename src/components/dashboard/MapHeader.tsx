import { m } from 'framer-motion'
import { dashboardFade } from './dashboardTransitions'

export default function MapHeader({ location, onBack }: { location: string | null; onBack: () => void }) {
  return (
    <header className="atlas-map-header">
      {location ? <m.button key="back" {...dashboardFade} className="atlas-back" onClick={onBack}><span aria-hidden="true">←</span> All locations</m.button>
        : <m.a key="brand" {...dashboardFade} className="atlas-brand" href="/" aria-label="Scarcast home"><span aria-hidden="true">◢</span> SCARCAST<span>.</span></m.a>}
      <m.span {...dashboardFade} className="atlas-edition">FIELD ATLAS <span> / 01</span></m.span>
    </header>
  )
}

