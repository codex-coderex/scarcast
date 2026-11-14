import MapViewer from "./components/MapViewer.jsx";
import DateSlider from "./components/DateSlider.jsx";
import DataPanel from "./components/DataPanel.jsx";

export default function MapPage() {
  return (
    <section>
      <h1>Map & Analysis Page</h1>
      <MapViewer />
      <DateSlider />
      <DataPanel />
    </section>
  );
}
