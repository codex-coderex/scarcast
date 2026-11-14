import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import proj4 from 'proj4';
import { decodeRaster, inspectRasters, sampleRaster } from './raster.js';
import { sampleScenes, sceneDate } from '../components/map/sampleScenes.js';

const decoded = [];
const anchors = [
  { lat: 14.939231143517288, lng: 120.37349389618463, values: [-5.850677013397217, -4.244648456573486, -5.615272521972656] },
  { lat: 14.920730721400854, lng: 120.39870836896272, values: [-7.960824012756348, -7.702043056488037, -6.000236988067627] },
  { lat: 14.902225749295823, lng: 120.42382584507249, values: [-9.290138244628906, -8.92297649383545, -7.2934651374816895] },
];

before(async () => {
  for (const scene of sampleScenes) {
    const path = new URL(`../../public${scene.geotiffUrl}`, import.meta.url);
    const bytes = await readFile(path);
    decoded.push(await decodeRaster(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)));
  }
});

test('original Float32 Deflate/predictor-3 TIFFs decode with their native grid and masks', () => {
  const finiteCounts = [649733, 649734, 649736];
  decoded.forEach((raster, index) => {
    assert.equal(raster.width, 1074);
    assert.equal(raster.height, 831);
    assert.equal(raster.epsg, 32651);
    assert.deepEqual(raster.origin.slice(0, 2), [214780, 1655350]);
    assert.deepEqual(raster.resolution.slice(0, 2), [10, -10]);
    assert.ok(Number.isNaN(raster.noDataValue));
    assert.equal(raster.values.filter(Number.isFinite).length, finiteCounts[index]);
  });
});

test('all nine pixel-center readings match the independent decoded anchors', () => {
  for (const anchor of anchors) {
    decoded.forEach((raster, index) => {
      const sample = sampleRaster(raster, anchor);
      assert.equal(sample.status, 'valid');
      assert.ok(Math.abs(sample.value - anchor.values[index]) <= 1e-5);
    });
  }
});

test('an inside-grid NaN produces nodata and points beyond native grid edges produce outside', () => {
  for (const raster of decoded) {
    assert.deepEqual(sampleRaster(raster, { lat: 14.95763881440507, lng: 120.34836931226607 }), { value: null, status: 'nodata' });
    for (const [x, y] of [[raster.xmin - 0.1, raster.ymax - 5], [raster.xmax + 0.1, raster.ymax - 5], [raster.xmin + 5, raster.ymin - 0.1], [raster.xmin + 5, raster.ymax + 0.1]]) {
      const [lng, lat] = proj4('EPSG:32651', 'EPSG:4326', [x, y]);
      assert.deepEqual(sampleRaster(raster, { lat, lng }), { value: null, status: 'outside' });
    }
  }
});

test('the real August 22 exact zero is a valid reading', () => {
  const raster = decoded[0];
  const index = raster.values.findIndex((value) => value === 0);
  assert.ok(index >= 0);
  const row = Math.floor(index / raster.width);
  const column = index % raster.width;
  const [lng, lat] = proj4('EPSG:32651', 'EPSG:4326', [
    raster.origin[0] + (column + 0.5) * raster.resolution[0],
    raster.origin[1] + (row + 0.5) * raster.resolution[1],
  ]);
  assert.deepEqual(sampleRaster(raster, { lat, lng }), { value: 0, status: 'valid' });
});

test('pair inspection retains source identity, independent status, and raw dB values', () => {
  const result = inspectRasters([sampleScenes[0], sampleScenes[2]], [decoded[0], decoded[2]], anchors[1]);
  assert.equal(result.samples.length, 2);
  assert.equal(result.samples[0].datasetId, sampleScenes[0].id);
  assert.equal(result.samples[1].datasetId, sampleScenes[2].id);
  assert.equal(result.samples[0].units, 'dB');
  assert.equal(result.samples[1].value, anchors[1].values[2]);
  const finiteSentinel = { ...decoded[0], noDataValue: anchors[1].values[0] };
  const mixed = inspectRasters([sampleScenes[0], sampleScenes[2]], [finiteSentinel, decoded[2]], anchors[1]);
  assert.deepEqual(mixed.samples.map((sample) => sample.status), ['nodata', 'valid']);
});

test('measurement sampling preserves values above the chosen display stretch', () => {
  const raster = decoded[0];
  const index = raster.values.findIndex((value) => value === raster.max);
  const [lng, lat] = proj4('EPSG:32651', 'EPSG:4326', [
    raster.origin[0] + (index % raster.width + 0.5) * raster.resolution[0],
    raster.origin[1] + (Math.floor(index / raster.width) + 0.5) * raster.resolution[1],
  ]);
  assert.equal(sampleRaster(raster, { lat, lng }).value, raster.max);
  assert.ok(raster.max > sampleScenes[0].displayRange[1]);
});

test('observation labels preserve UTC dates in Asia/Manila and other host timezones', () => {
  assert.equal(sceneDate(sampleScenes[0]), 'Aug 22, 2026');
  assert.equal(sceneDate(sampleScenes[2]), 'Sep 15, 2026');
});
