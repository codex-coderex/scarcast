import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { getWaybackItems } from "@esri/wayback-core";
import TemporalMap from "./components/TemporalMap";
import { loadAnalysisLayers, layerIntersectsArea, validDate } from "./data/analysisLayers";
import "./AnalysisPage.css";

const MAP_SESSION = "scarcast.map.exploration.v2";
const ANALYSIS_SESSION = "scarcast.analysis.temporal.v1";
const DEFAULT_CENTER = [12.5, 122.5];

function readSession(key) {
  try { return JSON.parse(sessionStorage.getItem(key) || "null") || {}; }
  catch { return {}; }
}

function coordinate(value, min, max) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function useAnalysisContext() {
  const { siteId = "explore" } = useParams();
  const [params] = useSearchParams();
  const [mapSaved] = useState(() => readSession(MAP_SESSION));
  const [saved] = useState(() => readSession(ANALYSIS_SESSION));
  const lat = coordinate(params.get("lat"), -90, 90) ?? coordinate(mapSaved.area?.center?.[0], -90, 90);
  const lng = coordinate(params.get("lng"), -180, 180) ?? coordinate(mapSaved.area?.center?.[1], -180, 180);
  const radius = coordinate(params.get("radius"), 0.1, 200000) ?? coordinate(mapSaved.area?.radiusMeters, 0.1, 200000) ?? 5000;
  const anchor = validDate(params.get("anchor")) ? params.get("anchor") : validDate(mapSaved.anchorDate) ? mapSaved.anchorDate : "";
  const center = lat !== null && lng !== null ? [lat, lng] : null;
  const backParams = new URLSearchParams();
  if (center) {
    backParams.set("lat", String(center[0]));
    backParams.set("lng", String(center[1]));
  }
  if (anchor) backParams.set("anchor", anchor);
  const backUrl = `/map${backParams.size ? `?${backParams.toString()}` : ""}`;
  return { center, radius, anchor, siteId, backUrl, saved };
}

function closestReleaseIndex(releases, anchor) {
  if (!releases.length) return 0;
  if (!anchor) return releases.length - 1;
  const index = releases.findLastIndex((item) => item.releaseDateLabel <= anchor);
  return Math.max(0, index);
}

function formatDate(date) {
  if (!validDate(date)) return "Date unavailable";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function AnalysisPage() {
  const { center, radius, anchor, siteId, backUrl, saved } = useAnalysisContext();
  const [releases, setReleases] = useState([]);
  const [catalogState, setCatalogState] = useState("loading");
  const [catalogError, setCatalogError] = useState("");
  const [releaseIndex, setReleaseIndex] = useState(0);
  const [releaseTouched, setReleaseTouched] = useState(false);
  const [compare, setCompare] = useState(false);
  const [compareOpacity, setCompareOpacity] = useState(55);
  const [layers, setLayers] = useState([]);
  const [layerState, setLayerState] = useState("loading");
  const [layerError, setLayerError] = useState("");
  const [product, setProduct] = useState(saved.product === "GUNW" ? "GUNW" : "GCOV");
  const [selectedLayerId, setSelectedLayerId] = useState(saved.selectedLayerId || "");
  const [layerVisible, setLayerVisible] = useState(true);
  const [layerOpacity, setLayerOpacity] = useState(saved.layerOpacity ?? 65);

  useEffect(() => {
    let alive = true;
    getWaybackItems()
      .then((items) => {
        if (!alive) return;
        const entries = (Array.isArray(items) ? items : [])
          .filter((item) => item?.itemURL && validDate(item.releaseDateLabel))
          .sort((a, b) => a.releaseDateLabel.localeCompare(b.releaseDateLabel));
        setReleases(entries);
        setCatalogState(entries.length ? "ready" : "empty");
      })
      .catch(() => { if (alive) { setCatalogState("error"); setCatalogError("Historical imagery catalogue is unavailable."); } });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!releases.length || releaseTouched) return;
    setReleaseIndex(closestReleaseIndex(releases, anchor));
  }, [releases, anchor, releaseTouched]);

  useEffect(() => {
    let alive = true;
    loadAnalysisLayers()
      .then((result) => { if (alive) { setLayers(result); setLayerState("ready"); } })
      .catch((error) => { if (alive) { setLayers([]); setLayerState("error"); setLayerError(error.message); } });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem(ANALYSIS_SESSION, JSON.stringify({ product, selectedLayerId, layerOpacity })); }
    catch { /* Browser storage may be disabled. */ }
  }, [product, selectedLayerId, layerOpacity]);

  const release = releases[releaseIndex] || null;
  const olderRelease = releases[Math.max(0, releaseIndex - 1)] || null;
  const filteredLayers = useMemo(
    () => layers.filter((layer) => layer.product === product && layerIntersectsArea(layer, center, radius, siteId)),
    [layers, product, center, radius, siteId]
  );
  const selectedLayer = filteredLayers.find((layer) => layer.id === selectedLayerId) || null;
  const selectedLayerDate = selectedLayer?.acquisitionDate || selectedLayer?.secondaryDate || "";

  function chooseRelease(index) {
    setReleaseTouched(true);
    setReleaseIndex(Math.min(Math.max(0, index), releases.length - 1));
  }

  const canCompare = Boolean(release && olderRelease && releaseIndex > 0);

  return (
    <main className="temporal-page">
      <header className="temporal-header">
        <div className="temporal-header-copy">
          <nav className="temporal-crumb" aria-label="Breadcrumb">
            <Link to={backUrl}>Map &amp; Analysis</Link>
            <span aria-hidden="true">/</span>
            <span>Temporal analysis</span>
          </nav>
          <h1>Temporal analysis</h1>
          <p>Explore archived imagery and examine available NASA radar layers around a reference date.</p>
        </div>
        <Link className="temporal-back" to={backUrl}>Edit area</Link>
      </header>

      <div className="temporal-context" aria-label="Selected investigation">
        <span><strong>Area</strong> {center ? `${center[0].toFixed(5)}°, ${center[1].toFixed(5)}°` : "No area selected"}</span>
        <span><strong>Radius</strong> {center ? `${(radius / 1000).toFixed(1)} km` : "—"}</span>
        <span><strong>Anchor date</strong> {anchor ? formatDate(anchor) : "Not selected"}</span>
        <span className="temporal-context-note">Exploratory reference · not a verified event date</span>
      </div>

      <div className="temporal-workspace">
        <section className="temporal-map-panel" aria-label="Temporal imagery map">
          <div className="temporal-map-top">
            <span>{compare && canCompare ? "Basemap comparison" : "Historical optical basemap"}</span>
            <span className="temporal-map-date">{release ? `Wayback release ${formatDate(release.releaseDateLabel)}` : "Current basemap"}</span>
          </div>
          <div className="temporal-map-canvas-wrap">
            <TemporalMap
              center={center || DEFAULT_CENTER}
              radius={center ? radius : null}
              release={release}
              compareRelease={compare && canCompare ? olderRelease : null}
              compareOpacity={compareOpacity / 100}
              overlay={selectedLayer && layerVisible ? selectedLayer : null}
              overlayOpacity={layerOpacity / 100}
            />
          </div>
          <div className="temporal-map-bottom">
            <span>Wayback dates describe basemap releases, not necessarily image capture.</span>
            {selectedLayer && <span>Radar: {selectedLayer.product} · {selectedLayerDate || "Pair dates in details"}</span>}
          </div>
        </section>

        <aside className="temporal-inspector" aria-label="Imagery and radar controls">
          <section className="temporal-control-section">
            <h2>Imagery comparison</h2>
            <label className="temporal-check">
              <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} disabled={!canCompare} />
              Compare with previous Wayback release
            </label>
            {compare && canCompare && (
              <>
                <p className="temporal-helper">Previous: {formatDate(olderRelease.releaseDateLabel)} · Selected: {formatDate(release.releaseDateLabel)}</p>
                <label className="temporal-control-label" htmlFor="temporal-compare-opacity">Selected release visibility · {compareOpacity}%</label>
                <input id="temporal-compare-opacity" type="range" min="0" max="100" step="5" value={compareOpacity} onChange={(e) => setCompareOpacity(Number(e.target.value))} />
              </>
            )}
            {!canCompare && <p className="temporal-helper">Two archived releases are needed for comparison.</p>}
          </section>

          <section className="temporal-control-section">
            <h2>NISAR overlays</h2>
            <div className="temporal-product-switch" role="group" aria-label="Radar product">
              {(["GCOV", "GUNW"]).map((name) => (
                <button type="button" key={name} className={product === name ? "is-active" : ""} aria-pressed={product === name} onClick={() => { setProduct(name); setSelectedLayerId(""); }}>
                  {name}
                </button>
              ))}
            </div>
            <p className="temporal-helper">{product === "GCOV" ? "Calibrated radar backscatter. Two compatible acquisitions are needed to measure change." : "Interferometric product. Interpretation needs paired dates, quality screening, corrections, and a reference."}</p>
            <label className="temporal-control-label" htmlFor="temporal-layer-select">Processed observation</label>
            <select id="temporal-layer-select" value={selectedLayer?.id || ""} onChange={(e) => setSelectedLayerId(e.target.value)} disabled={!filteredLayers.length}>
              <option value="">{filteredLayers.length ? "Select observation" : "No mapped observations available"}</option>
              {filteredLayers.map((layer) => <option key={layer.id} value={layer.id}>{layer.label} · {layer.acquisitionDate || [layer.referenceDate, layer.secondaryDate].filter(Boolean).join(" / ")}</option>)}
            </select>
            {layerState === "error" && <p className="temporal-error" role="alert">{layerError}</p>}
            {layerState === "loading" && <p className="temporal-helper">Loading observation manifest…</p>}
            {selectedLayer && (
              <>
                <label className="temporal-check"><input type="checkbox" checked={layerVisible} onChange={(e) => setLayerVisible(e.target.checked)}/> Show radar layer</label>
                <label className="temporal-control-label" htmlFor="temporal-layer-opacity">Overlay opacity · {layerOpacity}%</label>
                <input id="temporal-layer-opacity" type="range" min="0" max="100" step="5" value={layerOpacity} onChange={(e) => setLayerOpacity(Number(e.target.value))} disabled={!layerVisible}/>
                <dl className="temporal-layer-detail">
                  <div><dt>Product</dt><dd>{selectedLayer.product}</dd></div>
                  <div><dt>Acquisition(s)</dt><dd>{selectedLayer.acquisitionDate || [selectedLayer.referenceDate, selectedLayer.secondaryDate].filter(Boolean).join(" → ")}</dd></div>
                  <div><dt>Units</dt><dd>{selectedLayer.units || "Not supplied"}</dd></div>
                  <div><dt>Quality</dt><dd>{selectedLayer.quality || "Not assessed"}</dd></div>
                  {selectedLayer.sourceUrl && <div><dt>Source</dt><dd><a href={selectedLayer.sourceUrl} target="_blank" rel="noreferrer">View dataset ↗</a></dd></div>}
                </dl>
                {selectedLayer.notes && <p className="temporal-helper">{selectedLayer.notes}</p>}
              </>
            )}
            {!filteredLayers.length && <p className="temporal-empty">Your teammate's processed GCOV or GUNW georeferenced raster will appear here when added to the observation manifest.</p>}
          </section>

          <section className="temporal-control-section temporal-methodology">
            <h2>Interpretation</h2>
            <p>Optical release dates and radar acquisition dates are independent. Switching imagery does not change the radar measurement date. Blank areas are not proof of safety.</p>
          </section>
        </aside>
      </div>

      <section className="temporal-timeline" aria-label="Historical imagery release timeline">
        <div className="temporal-timeline-heading">
          <div><h2>Imagery timeline</h2><p>Move between available archived basemap releases.</p></div>
          <div className="temporal-timeline-actions">
            <button type="button" onClick={() => chooseRelease(closestReleaseIndex(releases, anchor))} disabled={!releases.length}>Jump to anchor</button>
            <button type="button" onClick={() => chooseRelease(releaseIndex - 1)} disabled={releaseIndex <= 0} aria-label="Previous historical release">←</button>
            <button type="button" onClick={() => chooseRelease(releaseIndex + 1)} disabled={!releases.length || releaseIndex >= releases.length - 1} aria-label="Next historical release">→</button>
          </div>
        </div>
        <div className="temporal-timeline-track">
          <span>{releases.length ? formatDate(releases[0].releaseDateLabel) : "Earlier"}</span>
          <input type="range" min={0} max={Math.max(0, releases.length - 1)} step={1} value={Math.min(releaseIndex, Math.max(0, releases.length - 1))} disabled={!releases.length} onChange={(event) => chooseRelease(Number(event.target.value))} aria-label="Historical basemap release" />
          <span>{releases.length ? formatDate(releases[releases.length - 1].releaseDateLabel) : "Later"}</span>
        </div>
        <div className="temporal-timeline-foot">
          <span>{catalogState === "loading" ? "Loading Esri Wayback releases…" : catalogState === "error" ? catalogError : catalogState === "empty" ? "No archived releases found." : `Selected release: ${formatDate(release.releaseDateLabel)}`}</span>
          <span>Anchor: {anchor ? formatDate(anchor) : "Not set"}</span>
        </div>
        <p className="temporal-timeline-note">Wayback release dates do not establish optical capture dates. The radar product selector uses separate acquisition metadata.</p>
      </section>
    </main>
  );
}
