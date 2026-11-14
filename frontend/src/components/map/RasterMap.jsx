import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';
import { loadRaster } from './loadRaster.js';
import { inspectRasters } from '../../utils/raster.js';
import { DISPLAY_RANGE } from './sampleScenes.js';
import MapControls from './MapControls.jsx';
import MapLayers from './MapLayers.jsx';
import 'leaflet/dist/leaflet.css';
import './map.css';

const EMPTY_RASTERS = [];

export default function RasterMap({ dataset = null, comparisonDataset = null, onPixelInspect }) {
  const map = useRef(null);
  const latestProps = useRef({ dataset, comparisonDataset, onPixelInspect });
  const inspectionRequest = useRef(0);
  const [sources, setSources] = useState({ status: 'empty' });
  const [retry, setRetry] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [opacity, setOpacity] = useState(0.85);
  const [bounds, setBounds] = useState(null);
  const [point, setPoint] = useState(null);
  const [sampleError, setSampleError] = useState('');
  const [sampling, setSampling] = useState(false);
  const referenceUrl = dataset?.geotiffUrl ?? '';
  const comparisonUrl = dataset ? comparisonDataset?.geotiffUrl ?? '' : '';
  const sourceKey = JSON.stringify([dataset?.id, referenceUrl, comparisonDataset?.id, comparisonUrl]);
  const loadKey = JSON.stringify([referenceUrl, comparisonUrl, retry]);
  const ready = sources.key === loadKey && sources.status === 'ready';
  const rasters = ready ? sources.rasters : EMPTY_RASTERS;
  const proposedMin = Math.min(dataset?.displayRange?.[0] ?? DISPLAY_RANGE[0], comparisonDataset?.displayRange?.[0] ?? Infinity);
  const proposedMax = Math.max(dataset?.displayRange?.[1] ?? DISPLAY_RANGE[1], comparisonDataset?.displayRange?.[1] ?? -Infinity);
  const validRange = Number.isFinite(proposedMin) && Number.isFinite(proposedMax) && proposedMin < proposedMax;
  const [min, max] = validRange ? [proposedMin, proposedMax] : DISPLAY_RANGE;

  useLayoutEffect(() => {
    latestProps.current = { dataset, comparisonDataset, onPixelInspect };
  });

  useLayoutEffect(() => {
    inspectionRequest.current += 1;
    setPoint(null);
    setSampleError('');
    setSampling(false);
    setActiveIndex(0);
    latestProps.current.onPixelInspect?.(null);
    return () => { inspectionRequest.current += 1; };
  }, [sourceKey]);

  useEffect(() => {
    let disposed = false;
    if (!referenceUrl) {
      setSources({ key: loadKey, status: 'empty' });
      return;
    }
    setSources({ key: loadKey, status: 'loading' });
    const urls = comparisonUrl ? [referenceUrl, comparisonUrl] : [referenceUrl];
    Promise.all(urls.map(loadRaster)).then((loaded) => {
      if (!disposed) setSources({ key: loadKey, status: 'ready', rasters: loaded });
    }).catch((error) => {
      if (!disposed) setSources({ key: loadKey, status: 'error', error: error.message });
    });
    return () => { disposed = true; };
  }, [referenceUrl, comparisonUrl, loadKey]);

  const inspect = useCallback(async (latlng) => {
    const request = ++inspectionRequest.current;
    const current = latestProps.current;
    current.onPixelInspect?.(null);
    setPoint(null);
    setSampleError('');
    if (!current.dataset) return;
    setSampling(true);
    const datasets = current.comparisonDataset ? [current.dataset, current.comparisonDataset] : [current.dataset];
    try {
      const loaded = await Promise.all(datasets.map((scene) => loadRaster(scene.geotiffUrl)));
      const result = inspectRasters(datasets, loaded, latlng);
      if (request !== inspectionRequest.current) return;
      setPoint(latlng);
      latestProps.current.onPixelInspect?.(result);
    } catch (error) {
      if (request === inspectionRequest.current) setSampleError(`Could not inspect this location. ${error.message}`);
    } finally {
      if (request === inspectionRequest.current) setSampling(false);
    }
  }, []);

  return <section className="raster-map" aria-label="Interactive radar map">
    <MapControls dataset={dataset} comparisonDataset={comparisonDataset} activeIndex={activeIndex}
      setActiveIndex={setActiveIndex} visible={visible} setVisible={setVisible} opacity={opacity}
      setOpacity={setOpacity} ready={ready}
      fitBounds={() => bounds && map.current?.fitBounds(bounds, { padding: [24, 24] })}
      inspectCenter={() => map.current && inspect(map.current.getCenter())} />
    <div className="raster-map__canvas">
      <MapContainer ref={map} center={[14.9207, 120.3987]} zoom={12} className="raster-map__leaflet">
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
        <MapLayers rasters={rasters} activeIndex={activeIndex} visible={visible} opacity={opacity}
          min={min} max={max} onBounds={setBounds} onInspect={inspect} />
        {point && <CircleMarker center={point} radius={5} pathOptions={{ color: '#fff4df', fillColor: '#a9633f', fillOpacity: 1, weight: 2 }} />}
      </MapContainer>
      {!referenceUrl && <div className="raster-map__state" role="status">Select a reference observation to view its raster.</div>}
      {referenceUrl && !ready && sources.status !== 'error' && <div className="raster-map__state" role="status">Loading observation pixels…</div>}
      {sources.key === loadKey && sources.status === 'error' && <div className="raster-map__state" role="alert">
        <span>Could not load the observation. {sources.error}</span>
        <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry raster loading</button>
      </div>}
      {ready && <div className="raster-map__map-label">{activeIndex === 1 ? 'Comparison' : 'Reference'} · {visible ? 'Backscatter · dB' : 'Raster hidden'}</div>}
    </div>
    <div className="raster-map__footer">
      <p role="status">{sampleError || (sampling ? 'Inspecting pixels…' : 'Click the map or inspect its center to read the selected observations.')}</p>
      <div className="raster-map__legend" aria-label={`Shared display range ${min.toFixed(2)} to ${max.toFixed(2)} dB`}>
        <span>{min.toFixed(2)} dB</span><i aria-hidden="true" /><span>{max.toFixed(2)} dB</span>
      </div>
      <p className="raster-map__legend-note">Shared display stretch. Pixel readings retain their stored values.</p>
    </div>
  </section>;
}
