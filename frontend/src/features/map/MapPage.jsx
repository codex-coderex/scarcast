import { useEffect, useRef, useState } from "react";
import MapViewer from "./components/MapViewer.jsx";
import DateSlider from "./components/DateSlider.jsx";
import DataPanel from "./components/DataPanel.jsx";
import { useMapAnalysis } from "./hooks/useMapAnalysis.js";
import "./map-feature.css";

export default function MapPage() {
  const analysis = useMapAnalysis();
  const mapArea = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");

  useEffect(() => {
    function trackFullscreen() {
      setFullscreen(document.fullscreenElement === mapArea.current);
    }
    document.addEventListener("fullscreenchange", trackFullscreen);
    return () => document.removeEventListener("fullscreenchange", trackFullscreen);
  }, []);

  async function toggleFullscreen() {
    setFullscreenError("");
    try {
      if (document.fullscreenElement === mapArea.current) {
        await document.exitFullscreen();
      } else {
        await mapArea.current.requestFullscreen();
      }
    } catch {
      setFullscreenError("Fullscreen is unavailable in this browser. The map remains available below.");
    }
  }

  return (
    <section className="map-feature">
      <header className="map-feature__header">
        <h1>Map &amp; Analysis</h1>
        <p>Subic area · NISAR observations</p>
      </header>
      <div className="map-feature__split">
        <div className="map-feature__map" ref={mapArea}>
          <div className="map-feature__map-heading">
            <h2>Map</h2>
            <button type="button" onClick={toggleFullscreen} aria-pressed={fullscreen}>
              {fullscreen ? "Exit fullscreen" : "Fullscreen map"}
            </button>
          </div>
          {fullscreenError && <p className="map-feature__error" role="alert">{fullscreenError}</p>}
          <DateSlider observations={analysis.observations} selectedIndex={analysis.selectedIndex}
            onChange={analysis.selectObservation} />
          <MapViewer dataset={analysis.dataset} comparisonDataset={analysis.comparisonDataset}
            onPixelInspect={analysis.onPixelInspect} />
        </div>
        <DataPanel dataset={analysis.dataset} observations={analysis.observations}
          comparisonDataset={analysis.comparisonDataset} inspection={analysis.inspection}
          onComparisonChange={analysis.selectComparison} />
      </div>
    </section>
  );
}
