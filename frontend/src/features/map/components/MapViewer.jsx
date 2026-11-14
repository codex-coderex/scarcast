import { latLngBounds } from "leaflet";
import { ScaleControl } from "react-leaflet";
import RasterMap from "../../../components/map/RasterMap.jsx";
import { observationBounds } from "../data/mockObservations.js";
import LocationMarkers from "./LocationMarkers.jsx";
import "./MapViewer.css";

const mapOptions = {
  maxBounds: latLngBounds(observationBounds).pad(0.5),
  maxBoundsViscosity: 1,
  minZoom: 12,
  maxZoom: 18,
};
const satelliteBasemap = {
  label: "Satellite basemap",
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution: 'Source: <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9">Esri</a>, Vantor, Earthstar Geographics, and the GIS User Community',
};

export default function MapViewer({ dataset, comparisonDataset, onPixelInspect }) {
  return (
    <div className="map-feature__viewer">
      <RasterMap dataset={dataset} comparisonDataset={comparisonDataset} onPixelInspect={onPixelInspect}
        basemap={satelliteBasemap} mapOptions={mapOptions} initialRasterVisible={false}>
        <LocationMarkers locations={dataset?.locations} />
        <ScaleControl position="bottomright" imperial={false} />
      </RasterMap>
    </div>
  );
}
