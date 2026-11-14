import { m, useIsPresent } from 'framer-motion'
import { dashboardFade } from './dashboardTransitions'
import { dataModeLabels } from './dashboardData'
import type { MapDataMode } from './dashboardData'

export default function MapLayerControls({ visible, mode, modes, onModeChange, onToggle }: {
  visible: boolean
  mode: MapDataMode
  modes: readonly MapDataMode[]
  onModeChange: (mode: MapDataMode) => void
  onToggle: () => void
}) {
  const isPresent = useIsPresent()
  return (
    <m.div {...dashboardFade} className="atlas-overlay-toggle" inert={!isPresent} aria-hidden={!isPresent}>
      <span className="atlas-eyebrow">Map layer</span>
      <select aria-label="Map data layer" value={mode} onChange={event => onModeChange(event.target.value as MapDataMode)}>
        {modes.map(value => <option key={value} value={value}>{dataModeLabels[value]}</option>)}
      </select>
      <button role="switch" aria-label={`Show ${dataModeLabels[mode]}`} aria-checked={visible} onClick={onToggle}>
        <span className="atlas-switch-track"><span /></span> {visible ? 'Visible' : 'Hidden'}
      </button>
    </m.div>
  )
}
