import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import RasterMap from '../components/map/RasterMap.jsx';
import { sampleScenes, sceneDate } from '../components/map/sampleScenes.js';

const landingUrl = import.meta.env.VITE_LANDING_URL || 'http://localhost:5173';

export default function MapView() {
  const [referenceId, setReferenceId] = useState(sampleScenes[0].id);
  const [comparisonId, setComparisonId] = useState(sampleScenes[1].id);
  const [inspection, setInspection] = useState(null);
  const reduceMotion = useReducedMotion();
  const dataset = sampleScenes.find((scene) => scene.id === referenceId) ?? null;
  const comparisonDataset = sampleScenes.find((scene) => scene.id === comparisonId) ?? null;
  const selectedScenes = [dataset, comparisonDataset].filter(Boolean);

  function selectReference(id) {
    setReferenceId(id);
    if (!id || id === comparisonId) setComparisonId('');
  }

  return <div className="workspace min-h-screen">
    <header className="workspace-header">
      <a className="workspace-brand" href={landingUrl} aria-label="SCARCAST landing page">SCARCAST<span>.</span></a>
      <span>Radar workspace</span>
      <a href={landingUrl}>Project overview <span aria-hidden="true">↗</span></a>
    </header>
    <motion.main className="workspace-main" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="workspace-title">
        <div><p className="eyebrow">NISAR L2 · GCOV HHHH</p><h1>Observation comparison</h1></div>
        <p>Subic area, Philippines<br /><span>Local backscatter observations · UTC dates</span></p>
      </div>
      <div className="workspace-grid">
        <div className="workspace-map-column">
          <div className="scene-selectors">
            <label htmlFor="reference-scene">Reference observation
              <select id="reference-scene" value={referenceId} onChange={(event) => selectReference(event.target.value)}>
                <option value="">Select an observation</option>
                {sampleScenes.map((scene) => <option key={scene.id} value={scene.id}>{sceneDate(scene)} · UTC</option>)}
              </select>
            </label>
            <label htmlFor="comparison-scene">Comparison observation
              <select id="comparison-scene" value={comparisonId} disabled={!dataset} onChange={(event) => setComparisonId(event.target.value)}>
                <option value="">Single observation</option>
                {sampleScenes.filter((scene) => scene.id !== referenceId).map((scene) =>
                  <option key={scene.id} value={scene.id}>{sceneDate(scene)} · UTC</option>)}
              </select>
            </label>
          </div>
          <RasterMap dataset={dataset} comparisonDataset={comparisonDataset} onPixelInspect={setInspection} />
        </div>
        <aside className="workspace-inspection" aria-label="Pixel inspection">
          <p className="eyebrow">Selected location</p>
          <h2>Pixel readings</h2>
          {inspection ? <p className="inspection-coordinates">{inspection.lat.toFixed(6)}° N<br />{inspection.lng.toFixed(6)}° E</p>
            : <p className="inspection-empty">Select a location on the map to inspect the same point in each observation.</p>}
          <div className="inspection-values" aria-live="polite" aria-atomic="true">
            {selectedScenes.map((scene, index) => {
              const sample = inspection?.samples.find((item) => item.datasetId === scene.id);
              let reading = '—';
              if (sample?.status === 'valid') reading = `${sample.value.toFixed(6)} dB`;
              if (sample?.status === 'nodata') reading = 'NoData';
              if (sample?.status === 'outside') reading = 'Outside coverage';
              return <section className="inspection-value" key={scene.id}>
                <h3>{index === 0 ? 'Reference' : 'Comparison'} <span>{sceneDate(scene)} · UTC</span></h3>
                <p>{reading}</p>
              </section>;
            })}
          </div>
          <p className="inspection-context">Backscatter changes can reflect moisture, vegetation, acquisition geometry, and other surface processes. These observations support disturbance screening and human review.</p>
          <details className="source-details">
            <summary>Source details</summary>
            <p>NISAR provisional L2 GCOV · frequency A · HHHH · dB. Observation times come from the product filenames.</p>
            {selectedScenes.map((scene) => <div key={scene.id}>
              <h3>{sceneDate(scene)} · UTC</h3>
              <p className="source-id">{scene.id}</p>
              <div className="source-links"><a href={scene.geotiffUrl}>GeoTIFF</a><a href={scene.metadataUrl} target="_blank" rel="noreferrer">Metadata</a></div>
            </div>)}
          </details>
        </aside>
      </div>
    </motion.main>
  </div>;
}
