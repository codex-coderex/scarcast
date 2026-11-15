function ObservationsList({ records }) {
  if (records.length === 0) {
    return <p className="scar-timeline-empty">No observations available</p>;
  }
  return (
    <ul className="scar-timeline-dates">
      {records.map((record) => (
        <li key={record.id} title={record.product}>
          <time dateTime={record.acquisitionDate}>{record.acquisitionDate}</time>
          <small>{record.product}</small>
        </li>
      ))}
    </ul>
  );
}

export default function DateTimeline({ anchorDate, area, observations }) {
  const dated = observations.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.acquisitionDate ?? ""));
  const before = dated.filter((item) => anchorDate && item.acquisitionDate < anchorDate);
  const on = dated.filter((item) => anchorDate && item.acquisitionDate === anchorDate);
  const after = dated.filter((item) => anchorDate && item.acquisitionDate > anchorDate);

  return (
    <section className="scar-date-timeline" aria-label="Observation timeline">
      <div className="scar-timeline-heading">
        <h2>Observation timeline</h2>
        <p>{anchorDate ? `Reference: ${anchorDate}` : "Set an anchor date"}</p>
      </div>

      {!area ? (
        <p className="scar-timeline-message">Choose an area to explore observation availability.</p>
      ) : !anchorDate ? (
        <p className="scar-timeline-message">Choose an anchor date to organize acquisitions.</p>
      ) : (
        <div className="scar-timeline-grid">
          <div>
            <h3>Before</h3>
            <ObservationsList records={before} />
          </div>
          <div className="scar-anchor-group">
            <h3>Anchor date</h3>
            <time dateTime={anchorDate}>{anchorDate}</time>
            {on.length > 0 && <ObservationsList records={on} />}
          </div>
          <div>
            <h3>After</h3>
            <ObservationsList records={after} />
          </div>
        </div>
      )}
    </section>
  );
}
