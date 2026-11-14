import { sceneDate } from './sampleScenes.js';

export default function MapControls({ dataset, comparisonDataset, activeIndex, setActiveIndex,
  visible, setVisible, opacity, setOpacity, ready, fitBounds, inspectCenter }) {
  return <div className="raster-map__controls">
    <div className="raster-map__switch" role="group" aria-label="Displayed observation">
      <button type="button" aria-pressed={activeIndex === 0} disabled={!dataset}
        onClick={() => setActiveIndex(0)}>
        Reference {dataset && <span>{sceneDate(dataset)}</span>}
      </button>
      {comparisonDataset && <button type="button" aria-pressed={activeIndex === 1}
        onClick={() => setActiveIndex(1)}>
        Comparison <span>{sceneDate(comparisonDataset)}</span>
      </button>}
    </div>
    <div className="raster-map__tools">
      <label className="raster-map__visibility">
        <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />
        Raster visible
      </label>
      <label className="raster-map__opacity">
        Opacity <output>{Math.round(opacity * 100)}%</output>
        <input aria-label="Raster opacity" type="range" min="0" max="100"
          value={Math.round(opacity * 100)} onChange={(event) => setOpacity(Number(event.target.value) / 100)} />
      </label>
      <button type="button" disabled={!ready} onClick={fitBounds}>Fit data</button>
      <button type="button" disabled={!ready} onClick={inspectCenter}>Inspect map center</button>
    </div>
  </div>;
}
