import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let server, service, rasterTools
let pairs
const requests = []
const validCount = raster => raster.validMask.reduce((sum, value) => sum + value, 0)
async function localFetch(url, { signal } = {}) {
  signal?.throwIfAborted()
  requests.push(url)
  return new Response(await readFile(new URL(`..${url}`, import.meta.url)))
}

before(async () => {
  globalThis.__gunwLayerClass = class {
    static constructed = 0
    constructor(options) { this.options = options; this.cache = globalThis.__gunwPrototypeCache; this.removed = false; this.constructor.constructed++ }
    remove() { this.removed = true }
  }
  globalThis.__gunwPrototypeCache = {}
  server = await createServer({
    cacheDir: 'node_modules/.cache/gunw-tests',
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true }, appType: 'custom',
    ssr: { noExternal: ['georaster-layer-for-leaflet'] },
    plugins: [{
      name: 'gunw-browser-layer-adapter', enforce: 'pre',
      resolveId(id, importer) {
        if (id === 'georaster-layer-for-leaflet' && importer?.replaceAll('\\', '/').endsWith('/gunwDataCache.ts')) return '\0gunw-test-layer'
      },
      load(id) { if (id === '\0gunw-test-layer') return 'export default globalThis.__gunwLayerClass' },
    }],
  })
  service = await server.ssrLoadModule('/src/services/processGUNWData.ts')
  rasterTools = await server.ssrLoadModule('/src/services/gunwRaster.ts')
  pairs = service.getGUNWAcquisitions('mount_balikabok')
})
after(async () => {
  service?.clearGUNWCache()
  await server?.close()
  delete globalThis.__gunwLayerClass
  delete globalThis.__gunwPrototypeCache
})

test('discovers three chronological date pairs and distinct 20 m/80 m layer grids', () => {
  assert.equal(pairs.length, 3)
  assert.deepEqual(pairs.map(pair => [pair.referenceAt.slice(0, 10), pair.secondaryAt.slice(0, 10)]), [
    ['2026-08-22', '2026-09-03'], ['2026-09-03', '2026-09-15'], ['2026-09-15', '2026-09-27'],
  ])
  for (const pair of pairs) {
    assert.ok(pair.referenceAt.endsWith('Z') && pair.secondaryAt.endsWith('Z'))
    assert.equal(pair.defaultLayer, 'unwrappedInterferogram/HH/unwrappedPhase')
    const fine = pair.layers['wrappedInterferogram/HH/coherenceMagnitude']
    const coarse = pair.layers['unwrappedInterferogram/HH/coherenceMagnitude']
    assert.deepEqual(fine.gridMetadata.shape, [419, 540])
    assert.deepEqual(coarse.gridMetadata.shape, [109, 140])
    assert.notDeepEqual(fine.bounds, coarse.bounds)
    assert.notEqual(fine.url, coarse.url)
    assert.ok(pair.unsupportedLayers.includes('wrappedInterferogram/HH/wrappedInterferogram'))
    assert.equal(pair.layers['wrappedInterferogram/HH/wrappedPhase'].name, 'wrappedPhase')
  }
  assert.deepEqual(service.getGUNWAcquisitions('toString'), [])
  assert.deepEqual(service.getGUNWAcquisitions('missing'), [])
})

test('decodes every real scalar layer, preserving internal masks, native grids and date-specific pixels', async context => {
  context.mock.method(globalThis, 'fetch', localFetch)
  const cache = service.createGUNWDataCache()
  const firstPixels = []
  for (const pair of pairs) {
    for (const descriptor of Object.values(pair.layers)) {
      const result = await cache.process(pair, { layer: descriptor.key, maskPhase: false })
      assert.deepEqual([result.georaster.height, result.georaster.width], descriptor.gridMetadata.shape)
      assert.equal(result.georaster.projection, 32651)
      const count = descriptor.name === 'phase_valid_mask'
        ? result.georaster.values[0].reduce((sum, row) => sum + row.filter(value => value === 1).length, 0)
        : validCount(result.georaster)
      if (descriptor.metadata.valid_pixel_count !== undefined) assert.equal(count, descriptor.metadata.valid_pixel_count)
      assert.equal(result.layerOptions.pixelValuesToColorFn([NaN]), null)
      assert.ok(result.georaster.values[0].some(row => row.some(Number.isNaN)))
    }
    firstPixels.push((await cache.process(pair, { maskPhase: false })).georaster.values[0])
  }
  for (let i = 1; i < firstPixels.length; i++) {
    assert.ok(firstPixels[i].some((row, y) => row.some((value, x) =>
      Number.isFinite(value) && Number.isFinite(firstPixels[i - 1][y][x]) && value !== firstPixels[i - 1][y][x],
    )))
  }
  cache.clear()
})

test('keeps valid zero pixels and low coherence, while masking unreliable phase by default', async context => {
  context.mock.method(globalThis, 'fetch', localFetch)
  const cache = service.createGUNWDataCache()
  for (const pair of pairs) {
    const raw = await cache.process(pair, { maskPhase: false })
    const masked = await cache.process(pair)
    const mask = await cache.process(pair, { layer: 'unwrappedInterferogram/HH/phase_valid_mask' })
    const coherence = await cache.process(pair, { layer: 'wrappedInterferogram/HH/coherenceMagnitude' })
    assert.equal(masked.quantity, 'unwrappedPhase')
    assert.equal(masked.units, 'radians')
    assert.equal(masked.phaseMasked, true)
    assert.equal(validCount(masked.georaster), pair.layers[mask.layer.key].metadata.valid_pixel_count)
    assert.ok(validCount(raw.georaster) >= validCount(masked.georaster))
    assert.ok(mask.georaster.values[0].some(row => row.includes(0)), 'Valid zeros inside the AOI must remain finite')
    assert.ok(coherence.georaster.values[0].some(row => row.some(value => value > 0 && value < 0.3)))
    assert.equal(coherence.phaseMasked, false)
    assert.match(coherence.layerOptions.pixelValuesToColorFn([0]), /^rgb/)
    assert.ok(masked.limitations.some(text => text.includes('not been atmospherically corrected')))
  }
  cache.clear()
})

test('computes later-minus-earlier coherence on matching grids with intersection validity', async context => {
  context.mock.method(globalThis, 'fetch', localFetch)
  const cache = service.createGUNWDataCache()
  const delta = await cache.coherenceChange(pairs[0], pairs[1])
  const a = await cache.process(pairs[0], { layer: delta.layer.key })
  const b = await cache.process(pairs[1], { layer: delta.layer.key })
  assert.equal(delta.quantity, 'coherenceChange')
  assert.equal(delta.displayMin, -1)
  assert.equal(delta.displayMax, 1)
  assert.equal(delta.comparison, pairs[1])
  assert.deepEqual([delta.georaster.height, delta.georaster.width], [419, 540])
  let checked = 0
  for (let y = 0; y < a.georaster.height; y++) for (let x = 0; x < a.georaster.width; x++) {
    const index = y * a.georaster.width + x
    if (a.georaster.validMask[index] && b.georaster.validMask[index]) {
      assert.equal(delta.georaster.values[0][y][x], b.georaster.values[0][y][x] - a.georaster.values[0][y][x])
      checked++
    } else assert.ok(Number.isNaN(delta.georaster.values[0][y][x]))
  }
  assert.ok(checked > 0)
  await assert.rejects(cache.coherenceChange(pairs[1], pairs[0]), /chronological/)
  await assert.rejects(cache.coherenceChange(pairs[0], pairs[1], { layer: pairs[0].defaultLayer }), /coherence pairs/)
  const otherOrbit = { ...pairs[1], metadata: { ...pairs[1].metadata, identification: { ...pairs[1].metadata.identification, orbitPassDirection: 'Descending' } } }
  await assert.rejects(cache.coherenceChange(pairs[0], otherOrbit), /acquisition geometry/)
  assert.throws(() => rasterTools.assertSameGUNWGrid(a.georaster, { ...b.georaster, xmin: b.georaster.xmin + 20 }), /identical grids/)
  cache.clear()
})

test('deduplicates requests, caches display variants and retries HTTP failures', async context => {
  context.mock.method(globalThis, 'fetch', localFetch)
  const cache = service.createGUNWDataCache()
  requests.length = 0
  const [a, b] = await Promise.all([cache.process(pairs[0]), cache.process(pairs[0])])
  assert.equal(a, b)
  assert.equal(requests.length, 2, 'Phase and its quality mask each load once')
  const variant = await cache.process(pairs[0], { displayMin: -20, displayMax: 20 })
  assert.notEqual(variant, a)
  assert.equal(requests.length, 2, 'Display variants reuse decoded TIFFs')
  const samePixels = { ...pairs[0], id: 'different-pair-with-identical-tiff-content' }
  const otherPair = await cache.process(samePixels)
  assert.equal(otherPair.acquisition, samePixels, 'Content-addressed URLs must not merge pair metadata')
  assert.notEqual(otherPair, a)
  assert.equal(requests.length, 2)
  await assert.rejects(cache.process(pairs[0], { displayMin: NaN }), /finite/)
  cache.clear()
  let fail = true
  context.mock.method(globalThis, 'fetch', async (...args) => fail ? new Response(null, { status: 503 }) : localFetch(...args))
  await assert.rejects(cache.process(pairs[0]), /HTTP 503/)
  fail = false
  await cache.process(pairs[0])
  cache.clear()
})

test('consumer cancellation preserves shared work; clear cancels and permits fresh loading', async context => {
  let release
  context.mock.method(globalThis, 'fetch', async (...args) => { await new Promise(resolve => { release = resolve }); return localFetch(...args) })
  const cache = service.createGUNWDataCache()
  const controller = new AbortController()
  const one = cache.process(pairs[0], { maskPhase: false }, controller.signal)
  const two = cache.process(pairs[0], { maskPhase: false })
  const cancelled = assert.rejects(one, { name: 'AbortError' })
  await new Promise(resolve => setImmediate(resolve))
  controller.abort()
  release()
  await cancelled
  assert.equal((await two).quantity, 'unwrappedPhase')
  cache.clear()
  const pending = cache.process(pairs[0], { maskPhase: false })
  const cleared = assert.rejects(pending, { name: 'AbortError' })
  await new Promise(resolve => setImmediate(resolve))
  cache.clear()
  release()
  await cleared
  context.mock.method(globalThis, 'fetch', localFetch)
  await cache.process(pairs[0])
  cache.clear()
})

test('preloads without mounting maps and reuses isolated tile caches per layer/date', async context => {
  context.mock.method(globalThis, 'fetch', localFetch)
  const cache = service.createGUNWDataCache()
  const report = await cache.preload(pairs)
  assert.equal(report.loaded.length, 3)
  assert.equal(report.failed.length, 0)
  requests.length = 0
  const a = await cache.getLayer(pairs[0])
  const same = await cache.getLayer(pairs[0])
  const b = await cache.getLayer(pairs[1])
  assert.equal(a, same)
  assert.notEqual(a, b)
  assert.notEqual(a.cache, b.cache)
  assert.notEqual(a.cache, globalThis.__gunwPrototypeCache)
  assert.equal(a.options.caching, true)
  assert.equal(requests.length, 0)
  cache.clear()
  assert.equal(a.removed, true)
  assert.equal(b.removed, true)
})

test('caches comparison layers independently and holds new raster work during map flights', async context => {
  context.mock.method(globalThis, 'fetch', localFetch)
  const cache = service.createGUNWDataCache()
  cache.setMoving(true)
  requests.length = 0
  const pending = cache.getChangeLayer(pairs[0], pairs[1])
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(requests.length, 0)
  cache.setMoving(false)
  const first = await pending
  assert.equal(first, await cache.getChangeLayer(pairs[0], pairs[1]))
  const next = await cache.getChangeLayer(pairs[1], pairs[2])
  assert.notEqual(first.cache, next.cache)
  cache.setMoving(true)
  let returned = false
  const cached = cache.getChangeLayer(pairs[0], pairs[1]).then(() => { returned = true })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(returned, false)
  cache.setMoving(false)
  await cached
  cache.setMoving(true)
  const aborted = assert.rejects(cache.process(pairs[2]), { name: 'AbortError' })
  cache.clear()
  await aborted
  assert.equal(first.removed, true)
})
