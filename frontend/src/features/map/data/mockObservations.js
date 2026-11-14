import { sampleScenes } from "../../../components/map/sampleScenes.js";

export const observationBounds = [[14.882619914103886, 120.34832230784168], [14.958821189873776, 120.44896916358047]];

const sampleLocations = [
  { id: "sample-a", label: "Sample location A", position: [14.939231143517288, 120.37349389618463] },
  { id: "sample-b", label: "Sample location B", position: [14.920730721400854, 120.39870836896272] },
  { id: "sample-c", label: "Sample location C", position: [14.902225749295823, 120.42382584507249] },
];

export const mockObservations = sampleScenes.map((scene) => ({
  ...scene,
  bounds: observationBounds,
  locations: sampleLocations,
}));
