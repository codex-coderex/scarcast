import { m, useIsPresent } from 'framer-motion'
import { dashboardFade } from './dashboardTransitions'
import { dataModeLabels } from './dashboardData'
import type { MapDataMode } from './dashboardData'

export default function MapLayerControls({ visible, mode, onToggle }: {
  visible: boolean
  mode: MapDataMode
  onToggle: () => void
}) {
  const isPresent = useIsPresent()
  return (
    <m.div {...dashboardFade} className="atlas-overlay-toggle" inert={!isPresent} aria-hidden={!isPresent}>
      <span className="atlas-eyebrow">Map layer</span>
      <span className="atlas-current-layer">{dataModeLabels[mode]}</span>
      <button role="switch" aria-label={`Show ${dataModeLabels[mode]}`} aria-checked={visible} onClick={onToggle}>
        <span className="atlas-switch-track"><span /></span> {visible ? 'Visible' : 'Hidden'}
      </button>
    </m.div>
  )
}
