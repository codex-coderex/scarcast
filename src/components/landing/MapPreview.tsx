import mapPreview from "../../assets/images/map-preview.png";

export default function MapPreview() {
  return (
    <figure className="map-preview">
      <div className="map-preview-frame">
        <img
          src={mapPreview}
          alt="False-color satellite view of landslide and avalanche debris near Hubbard Glacier, Alaska, labeled with peaks and slide locations"
          loading="lazy"
        />
      </div>
      <figcaption className="map-caption">
        <span>Hubbard Glacier, Alaska — landslide and avalanche debris</span>
        <a
          href="https://science.nasa.gov/earth/earth-observatory/landslide-and-avalanche-debris-litter-hubbard-glacier/"
          target="_blank"
          rel="noopener noreferrer"
        >
          NASA Earth Observatory ↗
        </a>
      </figcaption>
    </figure>
  );
}
