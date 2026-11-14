export const DISPLAY_RANGE = [-13.080083084106445, 1.167296767234798];

const products = [
  ['028', '20260822T213032', '20260822T213106', '2026-08-22T21:30:32Z'],
  ['029', '20260903T213032', '20260903T213106', '2026-09-03T21:30:32Z'],
  ['030', '20260915T213031', '20260915T213106', '2026-09-15T21:30:31Z'],
];

export const sampleScenes = products.map(([cycle, start, end, acquiredAt]) => {
  const id = `NISAR_L2_PR_GCOV_${cycle}_140_A_009_4005_DHDH_A_${start}_${end}_P05023_N_F_J_001`;
  const base = `${import.meta.env?.BASE_URL ?? '/'}samples/nisar/${id}`;
  return {
    id,
    label: 'NISAR GCOV HHHH',
    acquiredAt,
    timeSource: 'Product filename (UTC)',
    geotiffUrl: `${base}_db.tif`,
    metadataUrl: `${base}_metadata.json`,
    boundsUrl: `${base}_bounds.json`,
    units: 'dB',
    displayRange: DISPLAY_RANGE,
  };
});

export function sceneDate(dataset) {
  return new Date(dataset.acquiredAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
