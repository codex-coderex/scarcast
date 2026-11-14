import { sceneDate } from "../../../components/map/sampleScenes.js";

export default function ObservationDirectory({ observations, selectedId, onObservationChange }) {
  return (
    <section className="map-feature__directory" aria-label="Observation directory">
      <h3>Observations</h3>
      {observations.map((scene, index) => (
        <button key={scene.id} type="button" aria-pressed={scene.id === selectedId}
          onClick={() => onObservationChange(index)}>
          {sceneDate(scene)} · UTC
        </button>
      ))}
    </section>
  );
}
