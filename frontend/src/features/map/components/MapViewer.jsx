import RasterMap from "../../../components/map/RasterMap.jsx";

export default function MapViewer({ dataset, comparisonDataset, onPixelInspect }) {
  return (
    <div className="map-feature__viewer">
      <RasterMap dataset={dataset} comparisonDataset={comparisonDataset} onPixelInspect={onPixelInspect} />
    </div>
  );
}
