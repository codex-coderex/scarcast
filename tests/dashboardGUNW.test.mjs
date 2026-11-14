import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

let server, model, gunw, gcov, Timeline, Info, Analysis
before(async () => {
  server = await createServer({ cacheDir: 'node_modules/.cache/dashboard-tests', optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  model = await server.ssrLoadModule('/src/components/dashboard/dashboardData.ts')
  gunw = await server.ssrLoadModule('/src/services/processGUNWData.ts')
  gcov = await server.ssrLoadModule('/src/services/processGCOVData.ts')
  ;({ default: Timeline } = await server.ssrLoadModule('/src/components/dashboard/ObservationTimeline.tsx'))
  ;({ default: Info } = await server.ssrLoadModule('/src/components/dashboard/DeformationInfo.tsx'))
  ;({ default: Analysis } = await server.ssrLoadModule('/src/components/dashboard/AnalysisInfo.tsx'))
})
after(async () => { await server?.close() })

test('keeps three GCOV dates, three GUNW pairs and two valid baseline comparisons separate', () => {
  const pairs = gunw.getGUNWAcquisitions('mount_balikabok')
  const backscatter = gcov.getGCOVAcquisitions('mount_balikabok')
  const views = Object.fromEntries(['backscatter', 'phase', 'coherence', 'coherenceChange'].map(mode => [mode, model.dashboardObservations(backscatter, pairs, mode)]))
  assert.deepEqual(Object.values(views).map(items => items.length), [3, 3, 3, 2])
  assert.equal(views.coherenceChange[0].baseline, pairs[0])
  assert.equal(views.coherenceChange[0].acquisition, pairs[1])
  assert.equal(views.coherenceChange[1].acquisition, pairs[2])
  assert.ok(views.coherence.every(item => item.options.layer.startsWith('wrappedInterferogram/')))
  assert.equal(views.backscatter[0].endAt, undefined)
  assert.equal(views.phase[2].endAt.slice(0, 10), '2026-09-27')
  assert.equal(new Set(Object.values(views).flat().map(item => item.key)).size, 11)
  assert.equal(new Set(views.phase.map(item => item.options.displayMin)).size, 1)
  assert.equal(new Set(views.phase.map(item => item.options.displayMax)).size, 1)
})

test('omits unavailable layers, invalid comparisons and empty locations', () => {
  const pairs = gunw.getGUNWAcquisitions('mount_balikabok')
  assert.deepEqual(model.dashboardObservations([], [], 'phase'), [])
  assert.deepEqual(model.dashboardObservations([], pairs.slice(0, 1), 'coherenceChange'), [])
  const incompatible = { ...pairs[1], frequency: 'B' }
  assert.deepEqual(model.dashboardObservations([], [pairs[0], incompatible], 'coherenceChange'), [])
  const noPhase = { ...pairs[0], layers: Object.fromEntries(Object.entries(pairs[0].layers).filter(([, layer]) => layer.name !== 'phase_valid_mask')) }
  assert.deepEqual(model.dashboardObservations([], [noPhase], 'phase'), [])
  assert.equal(model.dashboardObservations([], [noPhase], 'coherence').length, 1)
})

test('renders date-pair slider endpoints and the comparison baseline without single-date ambiguity', () => {
  const items = model.dashboardObservations([], gunw.getGUNWAcquisitions('mount_balikabok'), 'coherenceChange')
  const html = renderToStaticMarkup(createElement(Timeline, { items, heading: 'Coherence comparison', dateIndex: 0, onDateChange() {} }))
  assert.ok(html.includes('Coherence comparison'))
  assert.ok(html.includes('Baseline: ' + items[0].baselineLabel))
  assert.ok(html.toLowerCase().includes('datetime="' + items[0].startAt.toLowerCase() + '"'))
  assert.ok(html.toLowerCase().includes('datetime="' + items[0].endAt.toLowerCase() + '"'))
  assert.ok(html.includes('max="1"'))
})

test('renders scientific units and caveats for each GUNW view, with matching analysis links', () => {
  const pairs = gunw.getGUNWAcquisitions('mount_balikabok')
  for (const mode of ['phase', 'coherence', 'coherenceChange']) {
    const observations = model.dashboardObservations([], pairs, mode)
    const html = renderToStaticMarkup(createElement(Info, { observation: observations[0], mode, modes: ['phase', 'coherence', 'coherenceChange'], status: null, onModeChange() {} }))
    assert.ok(!html.includes('Coming next'))
    assert.ok(html.includes('NISAR / GUNW'))
    assert.ok(html.includes('View source pair'))
    if (mode === 'phase') { assert.ok(html.includes(' rad')); assert.ok(html.includes('Atmospheric corrections')) }
    if (mode === 'coherenceChange') { assert.ok(html.includes('Baseline pair')); assert.ok(html.includes('later minus baseline')) }
    const analysis = renderToStaticMarkup(createElement(Analysis, { observations, mode, dateIndex: 0, onDateChange() {} }))
    assert.ok(analysis.includes(observations[0].label))
  }
})
