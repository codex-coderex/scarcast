// Placeholder data for the dashboard only (Person 1). Replace with real data later.
// `id` values should match the ids used by the Data Directory so selection carries over.
export const scenes = [
  { id: 'g-006', name: 'NISAR_GCOV_A04', acquired: '2026-09-09', direction: 'Ascending',  pols: ['HH', 'HV'], status: 'Ready' },
  { id: 'g-003', name: 'NISAR_GCOV_A03', acquired: '2026-08-28', direction: 'Ascending',  pols: ['HH', 'HV'], status: 'Ready' },
  { id: 'g-005', name: 'NISAR_GCOV_D02', acquired: '2026-08-22', direction: 'Descending', pols: ['HH'],       status: 'Processing' },
  { id: 'g-002', name: 'NISAR_GCOV_A02', acquired: '2026-08-16', direction: 'Ascending',  pols: ['HH', 'HV'], status: 'Ready' },
  { id: 'g-004', name: 'NISAR_GCOV_D01', acquired: '2026-08-10', direction: 'Descending', pols: ['HH'],       status: 'Ready' },
]
export const stats = { indexed: 6, ready: 5, comparablePairs: 6 }
