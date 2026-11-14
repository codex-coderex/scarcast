import { useState } from "react";
import { mockObservations } from "../data/mockObservations.js";

export function useMapAnalysis() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [comparisonId, setComparisonId] = useState("");
  const [inspection, setInspection] = useState(null);
  const dataset = mockObservations[selectedIndex];
  const comparisonDataset = mockObservations.find((scene) => scene.id === comparisonId) ?? null;

  function selectObservation(index) {
    setSelectedIndex(index);
    setInspection(null);
    if (mockObservations[index].id === comparisonId) setComparisonId("");
  }

  function selectComparison(id) {
    setComparisonId(id);
    setInspection(null);
  }

  return {
    observations: mockObservations,
    selectedIndex,
    dataset,
    comparisonDataset,
    inspection,
    selectObservation,
    selectComparison,
    onPixelInspect: setInspection,
  };
}
