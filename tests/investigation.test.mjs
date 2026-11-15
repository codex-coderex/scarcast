import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

let server, evidence, model, Workspace, OpticalViewer, Satellite, observations, gcov, gunw
before(async () => {
  server = await createServer({ cacheDir: 'node_modules/.cache/investigation-tests', optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  evidence = await server.ssrLoadModule('/src/services/corroborationData.ts')
  model = await server.ssrLoadModule('/src/components/dashboard/investigation/investigationModel.ts')
  ;({ default: Workspace } = await server.ssrLoadModule('/src/components/dashboard/investigation/EvidenceWorkspace.tsx'))
  ;({ default: Satellite } = await server.ssrLoadModule('/src/components/dashboard/investigation/SatelliteSummary.tsx'))
  ;({ dashboardObservations: observations } = await server.ssrLoadModule('/src/components/dashboard/dashboardData.ts'))
  gcov = await server.ssrLoadModule('/src/services/processGCOVData.ts')
  gunw = await server.ssrLoadModule('/src/services/processGUNWData.ts')
  ;({ default: OpticalViewer } = await server.ssrLoadModule('/src/components/dashboard/investigation/OpticalViewer.tsx'))
})
after(async () => { await server?.close() })

test('satellite summary retains a renderer-matched legend, dates and layer choices for every radar mode', () => {
  const acquisitions = gcov.getGCOVAcquisitions('balikabok_downstream')
  const pairs = gunw.getGUNWAcquisitions('balikabok_downstream')
  for (const mode of ['backscatterChange', 'backscatter', 'phase', 'coherence', 'coherenceChange']) {
    const observation = observations(acquisitions, pairs, mode)[0]
    const html = renderToStaticMarkup(createElement(Satellite, { observation, mode, modes: ['backscatterChange', 'backscatter', 'phase', 'coherence', 'coherenceChange'], status: null, visible: true, onToggle() {}, onModeChange() {} }))
    assert.ok(html.includes(observation.label))
    assert.ok(html.includes('legend'))
    assert.ok(html.includes('Surface change'))
    assert.ok(html.includes('More radar layers'))
    if (mode === 'phase') assert.ok(html.includes(' rad'))
    if (mode === 'backscatterChange') assert.ok(html.includes('9+ dB'))
    if (mode === 'backscatter') assert.ok(html.includes(observation.acquisition.displayMinDb.toFixed(2)))
    if (mode === 'coherenceChange') assert.ok(html.includes(observation.baselineLabel))
  }
})

test('optical viewer exposes real dated images, cloud coverage and a manual-date explanation', () => {
  const scene = evidence.opticalTimeline.scenes.at(-1)
  const selection = { ...evidence.initialEvidenceSelection, optical: true, opticalScene: scene.id, opticalSceneOverride: scene.id }
  const html = renderToStaticMarkup(createElement(OpticalViewer, { selection, onChange() {} }))
  for (const item of evidence.opticalTimeline.scenes) assert.ok(html.includes(item.id))
  assert.ok(html.includes('Manually selected acquisition'))
  assert.ok(html.includes(scene.overlay.file))
  assert.ok(html.includes('No usable August 30 image'))
  assert.ok(html.includes('Optical overlay opacity'))
})

test('workspace uses only matching statistics and separates the displayed RGB date from agreement analysis', () => {
  const props = { location: 'balikabok_downstream', view: 'optical', selection: model.initialExplorerSelection, onChange() {} }
  const missing = renderToStaticMarkup(createElement(Workspace, { ...props, observation: { startAt: '2026-10-01', endAt: '2026-10-13', label: 'October' } }))
  assert.ok(missing.includes('No matching evidence summary'))
  assert.ok(!missing.includes('Could be checked in clear optical pixels'))
  const matching = renderToStaticMarkup(createElement(Workspace, { ...props, observation: { startAt: '2026-08-22', endAt: '2026-09-03', label: 'Event interval' } }))
  assert.ok(matching.includes('Could be checked in clear optical pixels'))
  assert.ok(matching.includes('fixed 6 Apr–13 Sept vegetation comparison'))
  assert.ok(matching.includes('Study area'))
  assert.ok(matching.includes('Your map view stays in place'))
  assert.ok(!matching.includes('Summarize an area'))
  assert.ok(matching.includes('class="atlas-methods-list"'))
  const otherStudy = renderToStaticMarkup(createElement(Workspace, { ...props, location: 'unavailable_study' }))
  assert.ok(otherStudy.includes('Return to the world map'))
  assert.ok(!otherStudy.includes('id="optical-date"'))
})

test('active overlay state and selection sources remain visible outside their owning view', () => {
  const observation = observations(gcov.getGCOVAcquisitions('balikabok_downstream'), [], 'backscatterChange')[1]
  const scene = evidence.opticalTimeline.scenes.at(-1)
  const selection = { ...model.initialExplorerSelection, drainage: true, optical: true, opticalScene: scene.id, selectedPlace: 'Pita' }
  const summary = renderToStaticMarkup(createElement(Satellite, { observation, mode: 'backscatterChange', modes: ['backscatterChange'], status: null, visible: false, selection, onToggle() {}, onModeChange() {} }))
  assert.ok(summary.includes('Radar hidden'))
  assert.ok(summary.includes('Optical on'))
  assert.ok(summary.includes('25 Sept 2026'))
  assert.ok(summary.includes('Waterways on'))
  const context = renderToStaticMarkup(createElement(Workspace, { location: 'balikabok_downstream', view: 'context', observation, selection, onChange() {} }))
  assert.ok(context.includes('Clear selection'))
  assert.ok(context.includes('Location source'))
  assert.ok(context.includes(evidence.reportedPlaces.find(place => place.properties.brgy_name === 'Pita').properties.location_source))
})
