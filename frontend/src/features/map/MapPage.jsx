import { useEffect, useMemo, useState } from "react";
import { getWaybackItems } from "@esri/wayback-core";
import { useSearchParams } from "react-router";
import MapViewer from "./components/MapViewer";
import DataPanel from "./components/DataPanel";
import DateTimeline from "./components/DateTimeline";
import { observations, studySites } from "./data/studySites";
import "./MapPage.css";

const DEFAULT_RADIUS = 5000;
const SESSION_KEY = "scarcast.map.exploration.v2";

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null") ?? {};
  } catch {
    return {};
  }
}

function validStoredArea(value) {
  return value && Array.isArray(value.center) && value.center.length === 2 &&
    Number.isFinite(value.center[0]) && Number.isFinite(value.center[1]) &&
    Number.isFinite(value.radiusMeters) ? value : null;
}

function parseCoordinate(value, min, max) {
  if (value === null || value.trim() === "") return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= min && result <= max ? result : null;
}

function sceneIntersectsArea(scene, area, caseId) {
  if (!area) return false;
  if (scene.siteId && caseId && scene.siteId === caseId) return true;
  if (!Array.isArray(scene.bounds) || scene.bounds.length !== 2) return false;
  // Bounding-box overlap approximation; replace with precise footprint checks when available.
  const [[south, west], [north, east]] = scene.bounds;
  if (![south, west, north, east].every(Number.isFinite)) return false;
  const [lat, lng] = area.center;
  const latDelta = area.radiusMeters / 111320;
  const lngDelta = area.radiusMeters / (111320 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));
  return lat + latDelta >= south && lat - latDelta <= north && lng + lngDelta >= west && lng - lngDelta <= east;
}

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [saved] = useState(readSession);
  const initialLat = parseCoordinate(searchParams.get("lat"), -90, 90);
  const initialLng = parseCoordinate(searchParams.get("lng"), -180, 180);
  const initialArea = initialLat !== null && initialLng !== null
    ? { center: [initialLat, initialLng], radiusMeters: DEFAULT_RADIUS }
    : validStoredArea(saved.area);

  const [viewMode, setViewMode] = useState(saved.viewMode === "cases" ? "cases" : "explore");
  const [selectionActive, setSelectionActive] = useState(false);
  const [area, setArea] = useState(initialArea);
  const [focusTarget, setFocusTarget] = useState(
    initialLat !== null && initialLng !== null
      ? { center: [initialLat, initialLng], zoom: 11 }
      : null
  );
  const [selectedCaseId, setSelectedCaseId] = useState(saved.selectedCaseId ?? null);
  const [anchorDate, setAnchorDate] = useState(searchParams.get("anchor") || saved.anchorDate || "");
  const [latitude, setLatitude] = useState(initialArea ? String(initialArea.center[0]) : "");
  const [longitude, setLongitude] = useState(initialArea ? String(initialArea.center[1]) : "");
  const [coordinateError, setCoordinateError] = useState("");

  // Archived Esri basemap releases. Release dates are NOT optical capture dates.
  const [releases, setReleases] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [historicalEnabled, setHistoricalEnabled] = useState(Boolean(saved.historicalEnabled));
  const [manualRelease, setManualRelease] = useState(saved.manualRelease || "auto");

  useEffect(() => {
    let cancelled = false;
    getWaybackItems()
      .then((items) => {
        if (cancelled) return;
        const usable = items.filter((item) => item?.itemURL && /^\d{4}-\d{2}-\d{2}$/.test(item.releaseDateLabel || ""));
        setReleases(usable.sort((a, b) => b.releaseDateLabel.localeCompare(a.releaseDateLabel)));
      })
      .catch(() => { if (!cancelled) setHistoryError("Historical imagery catalogue could not be loaded."); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        viewMode, area, selectedCaseId, anchorDate, historicalEnabled, manualRelease,
      }));
    } catch { /* Storage can be unavailable in some browser modes. */ }
  }, [viewMode, area, selectedCaseId, anchorDate, historicalEnabled, manualRelease]);

  const selectedRelease = useMemo(() => {
    if (!historicalEnabled) return null;
    if (manualRelease !== "auto") {
      return releases.find((item) => String(item.releaseNum) === manualRelease) || null;
    }
    if (!anchorDate) return null;
    return releases.find((item) => item.releaseDateLabel <= anchorDate) || null;
  }, [historicalEnabled, manualRelease, anchorDate, releases]);

  const selectedCase = studySites.find((site) => site.id === selectedCaseId) ?? null;
  const matchingObservations = useMemo(
    () => observations.filter((scene) => sceneIntersectsArea(scene, area, selectedCaseId)),
    [area, selectedCaseId]
  );

  function updateQuery(updates) {
    const next = new URLSearchParams(searchParams);
    // Old dashboard links may still contain mode=pre/post; it is no longer needed.
    next.delete("mode");
    Object.entries(updates).forEach(([name, value]) => {
      if (value === null || value === "") next.delete(name);
      else next.set(name, String(value));
    });
    setSearchParams(next, { replace: true });
  }

  function setAreaCenter(center, radiusMeters = area?.radiusMeters ?? DEFAULT_RADIUS, shouldFocus = false) {
    setArea({ center, radiusMeters });
    setLatitude(center[0].toFixed(5));
    setLongitude(center[1].toFixed(5));
    setCoordinateError("");
    updateQuery({ lat: center[0].toFixed(5), lng: center[1].toFixed(5) });
    if (shouldFocus) setFocusTarget({ center, zoom: 11 });
  }

  function handleCoordinateSubmit(event) {
    event.preventDefault();
    const lat = parseCoordinate(latitude, -90, 90);
    const lng = parseCoordinate(longitude, -180, 180);
    if (lat === null || lng === null) {
      setCoordinateError("Enter a latitude from −90 to 90 and longitude from −180 to 180.");
      return;
    }
    setSelectedCaseId(null);
    setViewMode("explore");
    setSelectionActive(false);
    setAreaCenter([lat, lng], area?.radiusMeters ?? DEFAULT_RADIUS, true);
  }

  function handleMapClick(center) {
    setSelectedCaseId(null);
    setAreaCenter(center);
    setSelectionActive(false);
  }

  function clearSelection() {
    setArea(null);
    setSelectedCaseId(null);
    setLatitude("");
    setLongitude("");
    setCoordinateError("");
    setSelectionActive(false);
    updateQuery({ lat: null, lng: null });
  }

  function handleCaseSelect(id) {
    const site = studySites.find((entry) => entry.id === id);
    if (!site) return;
    setSelectedCaseId(site.id);
    setSelectionActive(false);
    setAreaCenter(site.center, site.radiusMeters ?? DEFAULT_RADIUS, true);
    // Only a VERIFIED event date may prefill the anchor; demo cases leave it unchanged.
    if (site.verified && site.eventDate) handleAnchorDateChange(site.eventDate);
  }

  function handleAnchorDateChange(value) {
    setAnchorDate(value);
    updateQuery({ anchor: value });
  }

  function handleModeChange(nextMode) {
    setViewMode(nextMode);
    setSelectionActive(false);
    setSelectedCaseId(null);
    // Area and anchor intentionally persist across modes.
  }

  return (
    <main className="scar-map-page">
      <header className="scar-map-header">
        <div>
          <h1>Map &amp; Analysis</h1>
          <p>Choose an area and reference date to explore available Earth observations.</p>
        </div>
      </header>

      <div className="scar-map-toolbar" role="group" aria-label="Map selection mode">
        <button
          type="button"
          className={viewMode === "explore" ? "is-active" : ""}
          aria-pressed={viewMode === "explore"}
          onClick={() => handleModeChange("explore")}
        >Explore anywhere</button>
        <button
          type="button"
          className={viewMode === "cases" ? "is-active" : ""}
          aria-pressed={viewMode === "cases"}
          onClick={() => handleModeChange("cases")}
        >Case studies</button>
        {viewMode === "cases" && (
          <label className="scar-case-select">
            <span>Study site</span>
            <select value={selectedCaseId || ""} onChange={(event) => handleCaseSelect(event.target.value)}>
              <option value="" disabled>Choose a demo site</option>
              {studySites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}
            </select>
          </label>
        )}
      </div>

      {viewMode === "explore" && (
        <div className="scar-selection-tools" aria-label="Area selection tools">
          <button
            type="button"
            className={selectionActive ? "is-active" : ""}
            aria-pressed={selectionActive}
            onClick={() => setSelectionActive((current) => !current)}
          >
            {selectionActive ? "Cancel selection" : "Select area"}
          </button>
          <button type="button" disabled={!area} onClick={clearSelection}>
            Clear selection
          </button>
          <span>{selectionActive ? "Click a point on the map to place the selection circle." : "Pan and zoom freely. Select area to place a new circle."}</span>
        </div>
      )}

      <div className="scar-map-workspace">
        <section className="scar-map-area" aria-label="Interactive satellite map">
          <MapViewer
            historicalRelease={selectedRelease}
            mode={viewMode}
            selectionActive={selectionActive}
            studySites={studySites}
            selectedCaseId={selectedCaseId}
            onSelectCase={handleCaseSelect}
            area={area}
            onSetCenter={handleMapClick}
            focusTarget={focusTarget}
          />
          {viewMode === "explore" && selectionActive && (
            <div className="scar-map-hint">Click the map to select an area</div>
          )}
          {viewMode === "cases" && (
            <div className="scar-map-hint">Case-study markers are demonstration locations</div>
          )}
        </section>

        <DataPanel
          historicalEnabled={historicalEnabled}
          onHistoricalEnabledChange={setHistoricalEnabled}
          releases={releases}
          historyLoading={historyLoading}
          historyError={historyError}
          manualRelease={manualRelease}
          onManualReleaseChange={setManualRelease}
          selectedRelease={selectedRelease}
          mode={viewMode}
          area={area}
          selectedCase={selectedCase}
          anchorDate={anchorDate}
          onAnchorDateChange={handleAnchorDateChange}
          latitude={latitude}
          longitude={longitude}
          onLatitudeChange={setLatitude}
          onLongitudeChange={setLongitude}
          onGoToCoordinates={handleCoordinateSubmit}
          coordinateError={coordinateError}
          onRadiusChange={(radiusMeters) => setArea((current) => current ? { ...current, radiusMeters } : null)}
          matchingObservations={matchingObservations}
          onClearSelection={clearSelection}
        />
      </div>

      <DateTimeline area={area} anchorDate={anchorDate} observations={matchingObservations} />
      <p className="scar-map-disclaimer">
        Esri Wayback shows archived <strong>basemap publications</strong>, not guaranteed imagery captured on the listed release date.
        Different releases may show identical imagery at your selected location. NISAR acquisition dates remain separate.
      </p>
    </main>
  );
}
