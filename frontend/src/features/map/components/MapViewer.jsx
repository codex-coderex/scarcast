import { useEffect } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const INITIAL_CENTER = [12.5, 122.5];

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const updateSize = () => map.invalidateSize({ pan: false, debounceMoveend: true });
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    updateSize();
    return () => observer.disconnect();
  }, [map]);

  return null;
}

function MapInteractions({ mode, selectionActive, onMapClick, focusTarget }) {
  const map = useMapEvents({
    click(event) {
      if (mode === "explore" && selectionActive) {
        onMapClick([event.latlng.lat, event.latlng.lng]);
      }
    },
  });

  useEffect(() => {
    if (!focusTarget) return;
    map.flyTo(focusTarget.center, focusTarget.zoom ?? 11, { duration: 0.65 });
  }, [map, focusTarget]);

  return null;
}

export default function MapViewer({
  mode,
  selectionActive,
  studySites,
  selectedCaseId,
  onSelectCase,
  area,
  onSetCenter,
  focusTarget,
}) {
  return (
    <MapContainer
      center={INITIAL_CENTER}
      zoom={6}
      minZoom={3}
      maxZoom={18}
      scrollWheelZoom
      zoomControl
      className="scar-map-canvas"
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution='Tiles &copy; Esri — Sources: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
        maxNativeZoom={16}
        maxZoom={18}
      />
      <MapResizeHandler />
      <MapInteractions mode={mode} selectionActive={selectionActive} onMapClick={onSetCenter} focusTarget={focusTarget} />

      {area && (
        <>
          <Circle
            center={area.center}
            radius={area.radiusMeters}
            pathOptions={{ color: "#d08a58", weight: 2, fillColor: "#d08a58", fillOpacity: 0.12 }}
            interactive={false}
          />
          <CircleMarker
            center={area.center}
            radius={5}
            pathOptions={{ color: "#fff0e3", weight: 2, fillColor: "#d08a58", fillOpacity: 1 }}
            interactive={false}
          />
        </>
      )}

      {mode === "cases" &&
        studySites.map((site) => (
          <CircleMarker
            key={site.id}
            center={site.center}
            radius={selectedCaseId === site.id ? 10 : 8}
            pathOptions={{
              color: selectedCaseId === site.id ? "#fff0e3" : "#101112",
              weight: 2,
              fillColor: "#d08a58",
              fillOpacity: 0.95,
            }}
            eventHandlers={{ click: () => onSelectCase(site.id) }}
          >
            <Tooltip direction="top" offset={[0, -10]}>{site.name} · demo</Tooltip>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}
