import { sceneDate } from "../../../components/map/sampleScenes.js";

export default function DataPanel({ dataset, observations, comparisonDataset, inspection, onComparisonChange }) {
  const selectedScenes = comparisonDataset ? [dataset, comparisonDataset] : [dataset];

  return (
    <aside className="map-feature__data" aria-label="Observation data">
      <h2>Data</h2>
      <p className="map-feature__product">NISAR L2 GCOV · HHHH backscatter</p>
      <dl className="map-feature__metadata">
        <div><dt>Selected observation</dt><dd>{sceneDate(dataset)} · UTC</dd></div>
        <div><dt>Units</dt><dd>dB</dd></div>
        <div><dt>Location</dt><dd>{inspection
          ? <>{inspection.lat.toFixed(6)}° N<br />{inspection.lng.toFixed(6)}° E</>
          : "Select a point on the map"}</dd></div>
      </dl>
      <label className="map-feature__compare" htmlFor="comparison-observation">Compare with
        <select id="comparison-observation" value={comparisonDataset?.id ?? ""}
          onChange={(event) => onComparisonChange(event.target.value)}>
          <option value="">Single observation</option>
          {observations.filter((scene) => scene.id !== dataset.id).map((scene) =>
            <option key={scene.id} value={scene.id}>{sceneDate(scene)} · UTC</option>)}
        </select>
      </label>
      <div className="map-feature__readings" aria-live="polite" aria-atomic="true">
        {selectedScenes.map((scene, index) => {
          const sample = inspection?.samples.find((entry) => entry.datasetId === scene.id);
          let reading = "—";
          if (sample?.status === "valid") reading = `${sample.value.toFixed(6)} dB`;
          if (sample?.status === "nodata") reading = "NoData";
          if (sample?.status === "outside") reading = "Outside coverage";
          return <section key={scene.id} className="map-feature__reading">
            <h3>{index === 0 ? "Selected observation" : "Comparison"}<span>{sceneDate(scene)} · UTC</span></h3>
            <p>{reading}</p>
          </section>;
        })}
      </div>
      <p className="map-feature__context">Backscatter differences can reflect moisture, vegetation, acquisition geometry, and other surface processes. These observations support disturbance screening and human review.</p>
      <details className="map-feature__sources">
        <summary>Source details</summary>
        <p>Dates use the product filename's UTC start time. Pixel readings retain the original stored values.</p>
        {selectedScenes.map((scene) => <div key={scene.id}>
          <h3>{sceneDate(scene)} · UTC</h3>
          <p>{scene.id}</p>
          <div><a href={scene.geotiffUrl}>GeoTIFF</a><a href={scene.metadataUrl} target="_blank" rel="noreferrer">Metadata</a></div>
        </div>)}
      </details>
    </aside>
  );
}
