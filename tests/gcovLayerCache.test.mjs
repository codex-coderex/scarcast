import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { createServer } from 'vite'

let server
let createCache
let decoded
let rendered
let containers
const originalWindow = globalThis.window
const originalDocument = globalThis.document
const view = { width: 600, height: 800, fitOptions: { maxZoom: 14 } }
const acquisition = { id: 'first', url: '/first.tif', bounds: [[0, 0], [1, 1]] }

before(async () => {
  globalThis.__gcovCacheTest = {
    createMap: () => ({ fitBounds() {}, remove() {} }),
    createLayer: async item => {
      decoded.push(item.url)
      const events = new Map()
      return {
        once(event, listener) { events.set(event, listener) },
        off(event) { events.delete(event) },
        addTo() { rendered.push(item.url); queueMicrotask(() => events.get('load')?.()) },
        remove() {},
      }
    },
  }
  globalThis.window = {
    setTimeout, clearTimeout,
    requestIdleCallback: callback => setTimeout(callback, 0),
    cancelIdleCallback: clearTimeout,
  }
  globalThis.document = {
    createElement: () => ({ style: {}, setAttribute() {}, remove() { containers-- } }),
    body: { append() { containers++ } },
  }
  server = await createServer({
    configFile: false,
    cacheDir: 'node_modules/.cache/gcov-cache-tests',
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
    appType: 'custom',
    ssr: { noExternal: ['leaflet'] },
    plugins: [{
      name: 'cache-test-adapters',
      enforce: 'pre',
      resolveId(source, importer) {
        if (!importer?.replaceAll('\\', '/').endsWith('/src/services/gcovLayerCache.ts')) return
        if (source === 'leaflet') return '\0cache-test-map'
        if (source === './processGCOVData') return '\0cache-test-layer'
      },
      load(id) {
        if (id === '\0cache-test-map') return 'export const map = globalThis.__gcovCacheTest.createMap'
        if (id === '\0cache-test-layer') return 'export const createGCOVBackscatterLayer = globalThis.__gcovCacheTest.createLayer'
      },
    }],
  })
  ;({ createGCOVLayerCache: createCache } = await server.ssrLoadModule('/src/services/gcovLayerCache.ts'))
})

beforeEach(() => { decoded = []; rendered = []; containers = 0 })
after(async () => {
  await server?.close()
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
  if (originalDocument === undefined) delete globalThis.document
  else globalThis.document = originalDocument
  delete globalThis.__gcovCacheTest
})

test('waits for navigation before decoding and shares concurrent date requests', async () => {
  const controller = new AbortController()
  const cache = createCache(controller.signal, view)
  cache.setMoving(true)
  const first = cache.get(acquisition)
  const duplicate = cache.get(acquisition)
  await setImmediate()
  assert.deepEqual(decoded, [])
  cache.setMoving(false)
  assert.equal(await first, await duplicate)
  assert.deepEqual(decoded, ['/first.tif'])
  assert.deepEqual(rendered, ['/first.tif'])
  assert.equal(containers, 0)
  const cached = await cache.get(acquisition)
  assert.equal(cached, await first)
  assert.equal(rendered.length, 1)
  cache.setMoving(true)
  let delivered = false
  const reuse = cache.get(acquisition).then(() => { delivered = true })
  await setImmediate()
  assert.equal(delivered, false, 'Even a cached layer waits until the zoom ends')
  cache.setMoving(false)
  await reuse
  assert.equal(delivered, true)
  assert.equal(rendered.length, 1)
  controller.abort()
})

test('keeps page-load preload queued during navigation and warms every date afterward', async () => {
  const controller = new AbortController()
  const cache = createCache(controller.signal, view)
  cache.setMoving(true)
  const preload = cache.preload([acquisition, { ...acquisition, id: 'second', url: '/second.tif' }])
  await setImmediate()
  assert.deepEqual(rendered, [])
  cache.setMoving(false)
  await preload
  assert.deepEqual(rendered, ['/first.tif', '/second.tif'])
  assert.equal(containers, 0)
  controller.abort()
})

test('cancels queued work when leaving the dashboard without rendering', async () => {
  const controller = new AbortController()
  const cache = createCache(controller.signal, view)
  cache.setMoving(true)
  const pending = cache.get(acquisition)
  const rejected = assert.rejects(pending, { name: 'AbortError' })
  const preload = cache.preload([acquisition])
  controller.abort()
  await rejected
  await preload
  assert.deepEqual(decoded, [])
  assert.deepEqual(rendered, [])
})
