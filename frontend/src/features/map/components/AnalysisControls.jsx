import { sceneDate } from "../../../components/map/sampleScenes.js";

export default function AnalysisControls({ dataset, observations, comparisonDataset, onComparisonChange }) {
  return (
      <label className="map-feature__compare" htmlFor="comparison-observation">Compare with
        <select id="comparison-observation" value={comparisonDataset?.id ?? ""}
          onChange={(event) => onComparisonChange(event.target.value)}>
          <option value="">Single observation</option>
          {observations.filter((scene) => scene.id !== dataset.id).map((scene) =>
            <option key={scene.id} value={scene.id}>{sceneDate(scene)} · UTC</option>)}
        </select>
      </label>
  );
}
