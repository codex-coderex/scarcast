import { useState } from "react";
import { sampleScenes } from "../../../components/map/sampleScenes.js";

export function useMapAnalysis() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [comparisonId, setComparisonId] = useState("");
  const [inspection, setInspection] = useState(null);
  const dataset = sampleScenes[selectedIndex];
  const comparisonDataset = sampleScenes.find((scene) => scene.id === comparisonId) ?? null;

  function selectObservation(index) {
    setSelectedIndex(index);
    setInspection(null);
    if (sampleScenes[index].id === comparisonId) setComparisonId("");
  }

  function selectComparison(id) {
    setComparisonId(id);
    setInspection(null);
  }

  return {
    observations: sampleScenes,
    selectedIndex,
    dataset,
    comparisonDataset,
    inspection,
    selectObservation,
    selectComparison,
    onPixelInspect: setInspection,
  };
}
