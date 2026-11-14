import { sceneDate } from "../../../components/map/sampleScenes.js";

export default function DateSlider({ observations, selectedIndex, onChange }) {
  return (
    <div className="map-feature__date-slider">
      <label htmlFor="observation-date">
        Observation date <strong>{sceneDate(observations[selectedIndex])} · UTC</strong>
      </label>
      <input id="observation-date" type="range" min="0" max={observations.length - 1}
        step="1" value={selectedIndex} aria-valuetext={`${sceneDate(observations[selectedIndex])} UTC`}
        onChange={(event) => onChange(Number(event.target.value))} />
      <div className="map-feature__date-ticks" aria-hidden="true">
        {observations.map((scene) => <span key={scene.id}>{sceneDate(scene)}</span>)}
      </div>
    </div>
  );
}
