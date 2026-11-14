import { divIcon } from "leaflet";
import { Marker, Tooltip } from "react-leaflet";

const sampleIcon = divIcon({ className: "map-viewer__sample-marker", html: "", iconSize: [14, 14], iconAnchor: [7, 7] });

export default function LocationMarkers({ locations = [] }) {
  return locations.map((location) => (
    <Marker key={location.id} position={location.position} icon={sampleIcon}
      title={location.label} alt={location.label} bubblingMouseEvents>
      <Tooltip>{location.label}</Tooltip>
    </Marker>
  ));
}
