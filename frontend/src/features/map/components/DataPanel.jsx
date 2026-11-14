import ObservationDirectory from "./ObservationDirectory.jsx";
import AnalysisControls from "./AnalysisControls.jsx";
import EvidenceInspector from "./EvidenceInspector.jsx";
import "./DataPanel.css";

export default function DataPanel({ dataset, observations, comparisonDataset, inspection,
  onComparisonChange, onObservationChange }) {
  return (
    <aside className="map-feature__data" aria-label="Observation data">
      <h2>Data</h2>
      <p className="map-feature__product">NISAR L2 GCOV · HHHH backscatter</p>
      <ObservationDirectory observations={observations} selectedId={dataset.id} onObservationChange={onObservationChange} />
      <AnalysisControls dataset={dataset} observations={observations} comparisonDataset={comparisonDataset}
        onComparisonChange={onComparisonChange} />
      <EvidenceInspector dataset={dataset} comparisonDataset={comparisonDataset} inspection={inspection} />
    </aside>
  );
}
