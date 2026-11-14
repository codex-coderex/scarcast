import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let server
let service
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  service = await server.ssrLoadModule('/src/services/processGCOVData.ts')
})
after(async () => { await server?.close() })

test('discovers root GCOV backscatter with metadata, bounds and acquisition order', () => {
  const acquisitions = service.getGCOVAcquisitions('mount_balikabok')
  assert.equal(acquisitions.length, 3)
  assert.equal(service.gcovManifest.mount_balikabok, acquisitions)
  assert.deepEqual(acquisitions.map(item => item.acquiredAt.slice(0, 10)), [
    '2026-08-22', '2026-09-03', '2026-09-15',
  ])
  for (const item of acquisitions) {
    assert.match(item.url, /\/data\/mount_balikabok\/gcov\/.*\/db\.tif$/)
    assert.equal(item.metadata.product, 'GCOV')
    assert.equal(item.metadata.frequencies.A.backscatter.units, 'dB')
    assert.ok(item.displayMinDb < item.displayMaxDb)
    assert.ok(item.bounds[0][0] < item.bounds[1][0])
    assert.ok(item.bounds[0][1] < item.bounds[1][1])
  }
  assert.deepEqual(service.getGCOVAcquisitions('unknown'), [])
  assert.deepEqual(service.getGCOVAcquisitions('toString'), [])
})

test('stretches dB values without hiding valid zero or negative measurements', () => {
  const color = service.backscatterColor
  assert.equal(color(-20, -20, 0), 'rgb(0, 0, 0)')
  assert.equal(color(-10, -20, 0), 'rgb(128, 128, 128)')
  assert.equal(color(0, -20, 0), 'rgb(255, 255, 255)')
  assert.equal(color(-50, -20, 0), 'rgb(0, 0, 0)')
  assert.equal(color(10, -20, 0), 'rgb(255, 255, 255)')
  assert.equal(color(NaN, -20, 0), null)
  assert.equal(color(Infinity, -20, 0), null)
  assert.equal(color(-9999, -20, 0, -9999), null)
  assert.equal(color(-10, -10, -10), 'rgb(128, 128, 128)')
})

test('parses each real backscatter TIFF with its native projection and transparent nodata', async (context) => {
  const requestedUrls = []
  const decodedRasters = []
  context.mock.method(globalThis, 'fetch', async (url) => {
    requestedUrls.push(url)
    const bytes = await readFile(new URL(`..${url}`, import.meta.url))
    return new Response(bytes)
  })
  for (const acquisition of service.getGCOVAcquisitions('mount_balikabok')) {
    const { georaster, layerOptions } = await service.processGCOVData(acquisition)
    decodedRasters.push(georaster)
    assert.equal(georaster.projection, 32651)
    assert.equal(georaster.numberOfRasters, 1)
    assert.deepEqual([georaster.height, georaster.width], acquisition.metadata.frequencies.A.shape)
    assert.ok(Number.isNaN(georaster.noDataValue))
    assert.equal(layerOptions.georaster, georaster)
    assert.equal(layerOptions.pixelValuesToColorFn([NaN]), null)
    assert.match(layerOptions.pixelValuesToColorFn([-5]), /^rgb\(/)
    assert.ok(georaster.values[0].some(row => row.some(value => value < 0)))
  }
  assert.equal(new Set(requestedUrls).size, 3, 'Each date must request its own TIFF URL')
  for (let i = 1; i < decodedRasters.length; i++) {
    const previous = decodedRasters[i - 1].values[0]
    const current = decodedRasters[i].values[0]
    assert.ok(current.some((row, y) => row.some((value, x) =>
      Number.isFinite(value) && Number.isFinite(previous[y][x]) && Math.abs(value - previous[y][x]) > 0.000001,
    )), 'Consecutive acquisitions must contain different backscatter measurements')
  }
})

test('reports HTTP failures and honors cancellation', async (context) => {
  const acquisition = service.getGCOVAcquisitions('mount_balikabok')[0]
  context.mock.method(globalThis, 'fetch', async (_url, options) => {
    options.signal?.throwIfAborted()
    return new Response(null, { status: 404 })
  })
  await assert.rejects(service.processGCOVData(acquisition), /HTTP 404/)
  await assert.rejects(service.processGCOVData(acquisition, AbortSignal.abort()), { name: 'AbortError' })
})
