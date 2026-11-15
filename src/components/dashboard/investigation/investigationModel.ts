import { initialEvidenceSelection } from '../../../services/corroborationData'
import type { EvidenceSelection } from '../../../services/corroborationData'

export type InvestigationView = 'radar' | 'optical' | 'context'
export const investigationViews = [
  { id: 'radar', label: 'Radar' },
  { id: 'optical', label: 'Optical' },
  { id: 'context', label: 'Context' },
] as const

export const initialExplorerSelection: EvidenceSelection = {
  ...initialEvidenceSelection, optical: false, screen: false, drainage: false, reportedPlaces: false,
}
