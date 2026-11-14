import { m, useIsPresent } from 'framer-motion'
import type { RasterState } from './dashboardUtils'
import { dashboardFade } from './dashboardTransitions'

export default function MapLayerControls({ showBackscatter, status, onToggle, onRetry }: {
  showBackscatter: boolean
  status: RasterState | null
  onToggle: () => void
  onRetry: () => void
}) {
  const isPresent = useIsPresent()
  return (
    <>
      <m.div {...dashboardFade} className="atlas-overlay-toggle" inert={!isPresent} aria-hidden={!isPresent}>
        <span className="atlas-eyebrow">Map layer</span>
        <button role="switch" aria-checked={showBackscatter} onClick={onToggle}>
          <span className="atlas-switch-track"><span /></span> Backscatter
        </button>
      </m.div>
      <m.div {...dashboardFade} className="atlas-raster-status" role="status" aria-live="polite" inert={!isPresent} aria-hidden={!isPresent}>
        {!showBackscatter ? 'Base map · observation hidden' : status?.status === 'error' ? <>
          <span>Observation could not load.</span><button onClick={onRetry} title={status.message}>Try again ↻</button>
        </> : status?.status === 'ready' ? <><span className="atlas-live-dot" /> Backscatter · HHHH · dB</> : <><span className="atlas-loading-dot" /> Loading observation…</>}
      </m.div>
    </>
  )
}
