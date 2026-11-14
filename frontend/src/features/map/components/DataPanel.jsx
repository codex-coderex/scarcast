function formatCoordinates(center) {
  return center ? `${center[0].toFixed(5)}, ${center[1].toFixed(5)}` : "Not selected";
}

export default function DataPanel({
  mode,
  historicalEnabled,
  onHistoricalEnabledChange,
  releases,
  historyLoading,
  historyError,
  manualRelease,
  onManualReleaseChange,
  selectedRelease,
  area,
  selectedCase,
  anchorDate,
  onAnchorDateChange,
  latitude,
  longitude,
  onLatitudeChange,
  onLongitudeChange,
  onGoToCoordinates,
  coordinateError,
  onRadiusChange,
  matchingObservations,
  onClearSelection,
  onPreviewAnalysis,
}) {
  return (
    <aside className="scar-data-panel" aria-label="Area explorer">
      <div className="scar-panel-topline">Area explorer</div>

      <div className="scar-panel-intro">
        <h2>{mode === "cases" && selectedCase ? selectedCase.name : "Explore an area"}</h2>
        <p>
          {mode === "cases" && selectedCase
            ? selectedCase.location
            : "Click anywhere on the map or enter coordinates to set an area of interest."}
        </p>
        {selectedCase && !selectedCase.verified && mode === "cases" && (
          <p className="scar-case-notice">Demonstration location — not a verified landslide event.</p>
        )}
      </div>

      <form className="scar-field" onSubmit={onGoToCoordinates}>
        <span className="scar-field-label">Go to coordinates</span>
        <div className="scar-coordinate-row">
          <label>
            <span>Latitude</span>
            <input
              aria-label="Latitude"
              inputMode="decimal"
              value={latitude}
              onChange={(event) => onLatitudeChange(event.target.value)}
              placeholder="e.g. 16.40"
            />
          </label>
          <label>
            <span>Longitude</span>
            <input
              aria-label="Longitude"
              inputMode="decimal"
              value={longitude}
              onChange={(event) => onLongitudeChange(event.target.value)}
              placeholder="e.g. 120.60"
            />
          </label>
        </div>
        {coordinateError && <p role="alert" className="scar-error">{coordinateError}</p>}
        <button className="scar-secondary-button" type="submit">Go to coordinates &amp; select area</button>
      </form>

      <div className="scar-field">
        <span className="scar-field-label">Selected center</span>
        <strong>{formatCoordinates(area?.center)}</strong>
        <label className="scar-radius-label" htmlFor="scar-radius">Area radius · {area ? (area.radiusMeters / 1000).toFixed(1) : "—"} km</label>
        <input
          id="scar-radius"
          type="range"
          min="1"
          max="20"
          step="0.5"
          disabled={!area}
          value={area ? area.radiusMeters / 1000 : 5}
          onChange={(event) => onRadiusChange(Number(event.target.value) * 1000)}
        />
        <small>The circle defines your area of interest; it is not a detected landslide footprint.</small>
        {area && <button type="button" className="scar-clear-inline" onClick={onClearSelection}>Clear selected area</button>}
      </div>

      <div className="scar-field">
        <label className="scar-field-label" htmlFor="scar-anchor-date">Anchor date</label>
        <input
          id="scar-anchor-date"
          type="date"
          value={anchorDate}
          onChange={(event) => onAnchorDateChange(event.target.value)}
        />
        <small>Exploratory reference date; not automatically a verified landslide date.</small>
      </div>

      <div className="scar-field scar-history-field">
        <div className="scar-history-heading">
          <span className="scar-field-label">Optical basemap</span>
          <label className="scar-history-toggle">
            <input
              type="checkbox"
              checked={historicalEnabled}
              onChange={(event) => onHistoricalEnabledChange(event.target.checked)}
            />
            Historical imagery
          </label>
        </div>
        {historicalEnabled && (
          <>
            <label htmlFor="scar-wayback-release" className="scar-field-label">Wayback release</label>
            <select
              id="scar-wayback-release"
              value={manualRelease}
              onChange={(event) => onManualReleaseChange(event.target.value)}
              disabled={historyLoading || Boolean(historyError)}
            >
              <option value="auto">Match anchor date (nearest earlier release)</option>
              {releases.map((item) => (
                <option key={item.releaseNum} value={String(item.releaseNum)}>
                  {item.releaseDateLabel}
                </option>
              ))}
            </select>
            {historyLoading && <small>Loading Esri Wayback releases…</small>}
            {historyError && <small role="alert">{historyError}</small>}
            {!historyLoading && !historyError && !selectedRelease && (
              <small>{!anchorDate && manualRelease === "auto" ? "Choose an anchor date or an individual release." : "No archived release is available for that date."} Current imagery remains visible.</small>
            )}
            {selectedRelease && (
              <small>Showing Wayback release: <strong>{selectedRelease.releaseDateLabel}</strong>. This is the basemap publication date, NOT its image capture date. Some releases will look identical here.</small>
            )}
          </>
        )}
        {!historicalEnabled && <small>Latest available Esri World Imagery basemap.</small>}
      </div>

      <div className="scar-field">
        <span className="scar-field-label">NISAR observations</span>
        <strong>{matchingObservations.length ? `${matchingObservations.length} matching records` : "No validated observations loaded"}</strong>
        <p>
          NISAR scenes are independent of the optical Wayback basemap.
          {mode === "cases" && selectedCase?.eventDate
            ? ` Documented event date: ${selectedCase.eventDate}.`
            : ""}
        </p>
      </div>

      <div className="scar-panel-bottom">
        <button
          type="button"
          className="scar-secondary-button"
          onClick={onPreviewAnalysis}
        >
          Preview analysis workspace
        </button>
        <button type="button" disabled className="scar-analyze-button">Analyze area</button>
        <p>Analysis unlocks when real coverage, compatible observations, and processed outputs are connected.</p>
      </div>
    </aside>
  );
}
