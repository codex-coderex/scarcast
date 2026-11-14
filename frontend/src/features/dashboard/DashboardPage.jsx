import { useMemo, useState } from "react";
import "./DashboardPage.css";

const observations = [
  { id: "SC-0248", place: "Northern watershed", date: "14 Nov 2026", status: "Ready", tone: "ready", type: "Sentinel-1 · VV/VH" },
  { id: "SC-0247", place: "Eastern ridge", date: "12 Nov 2026", status: "Processing", tone: "processing", type: "Sentinel-1 · VV/VH" },
  { id: "SC-0246", place: "Coastal foothills", date: "09 Nov 2026", status: "Ready", tone: "ready", type: "Sentinel-1 · VV" },
];

function Pin({ x, y, label, active = false }) {
  return (
    <g className={`map-pin ${active ? "is-active" : ""}`} transform={`translate(${x} ${y})`}>
      <circle r="18" className="pin-halo" />
      <circle r="7" className="pin-core" />
      <circle r="2.2" className="pin-center" />
      <text x="13" y="-12" className="pin-label">{label}</text>
    </g>
  );
}

function MapArtwork() {
  return (
    <svg className="map-artwork" viewBox="0 0 1440 780" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustrative terrain map with satellite observation locations">
      <defs>
        <linearGradient id="terrain" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#294a56" />
          <stop offset="48%" stopColor="#203a49" />
          <stop offset="100%" stopColor="#172d38" />
        </linearGradient>
        <pattern id="map-grid" width="58" height="58" patternUnits="userSpaceOnUse">
          <path d="M58 0H0V58" fill="none" stroke="#d7ded7" strokeOpacity=".10" strokeWidth="1" />
        </pattern>
        <filter id="soft-glow"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <rect width="1440" height="780" fill="url(#terrain)" />
      <path d="M0 130 110 70 230 110 330 42 465 90 570 40 690 125 820 64 940 130 1070 62 1190 105 1320 44 1440 95V780H0Z" fill="#31534f" opacity=".72"/>
      <path d="M0 440 130 370 260 410 390 320 520 375 650 290 780 360 910 280 1040 340 1170 265 1300 325 1440 260V780H0Z" fill="#263f42" opacity=".68"/>
      <path d="M0 0H1440V780H0Z" fill="url(#map-grid)" />
      <g fill="none" stroke="#b9c9b5" strokeOpacity=".22" strokeWidth="2">
        <path d="M-30 215C150 110 240 250 390 185S630 100 770 195 1010 260 1160 170 1350 100 1480 165"/>
        <path d="M-30 255C150 150 240 290 390 225S630 140 770 235 1010 300 1160 210 1350 140 1480 205"/>
        <path d="M-30 300C150 195 240 335 390 270S630 185 770 280 1010 345 1160 255 1350 185 1480 250"/>
        <path d="M-30 510C150 405 240 545 390 480S630 395 770 490 1010 555 1160 465 1350 395 1480 460"/>
        <path d="M-30 550C150 445 240 585 390 520S630 435 770 530 1010 595 1160 505 1350 435 1480 500"/>
        <path d="M-30 595C150 490 240 630 390 565S630 480 770 575 1010 640 1160 550 1350 480 1480 545"/>
      </g>
      <g fill="none" stroke="#d08a58" strokeOpacity=".55" strokeWidth="3" strokeDasharray="8 11">
        <path d="M140 650C290 570 350 470 520 465S760 520 850 395 1090 260 1300 180"/>
      </g>
      <g fill="none" stroke="#91b5b1" strokeOpacity=".28" strokeWidth="7">
        <path d="M-20 700C180 620 280 690 450 600S730 625 890 530 1160 520 1470 400"/>
      </g>
      <Pin x="420" y="330" label="North sector" />
      <Pin x="770" y="430" label="Ridge observation" active />
      <Pin x="1060" y="260" label="East sector" />
      <Pin x="1130" y="585" label="Coastal sector" />
    </svg>
  );
}

export default function DashboardPage() {
  const [dateIndex, setDateIndex] = useState(2);
  const [activeLayer, setActiveLayer] = useState("Observations");
  const [selectedObservation, setSelectedObservation] = useState(observations[0].id);
  const dates = useMemo(() => ["18 Oct", "27 Oct", "05 Nov", "14 Nov 2026"], []);

  return (
    <main className="sc-dashboard">
      <header className="sc-topbar">
        <div className="sc-brand-lockup">
          <div className="sc-brand-mark">S</div>
          <div>
            <p className="sc-eyebrow">SCARCAST / MONITORING WORKSPACE</p>
            <h1>Dashboard</h1>
          </div>
        </div>
        <div className="sc-topbar-right">
          <span className="sc-live"><i /> Workspace overview</span>
          <div className="sc-avatar" aria-label="User profile">SC</div>
        </div>
      </header>

      <section className="sc-map-stage" aria-label="Full-screen observation map">
        <MapArtwork />
        <div className="sc-map-vignette" />
        <div className="sc-map-heading">
          <span className="sc-kicker">SPATIAL OVERVIEW</span>
          <h2>Observation map</h2>
          <p>Explore the geographic context of indexed satellite scenes.</p>
        </div>
        <div className="sc-map-tools">
          <span className="sc-tool-label">MAP LAYER</span>
          {["Observations", "Terrain", "Change areas"].map((layer) => (
            <button key={layer} className={`sc-layer-button ${activeLayer === layer ? "selected" : ""}`} onClick={() => setActiveLayer(layer)}>{layer}</button>
          ))}
        </div>
        <div className="sc-map-scale"><span /> 5 km <b>·</b> Illustrative preview</div>
        <div className="sc-map-coordinates">06°55' N&nbsp;&nbsp; 122°04' E</div>
      </section>

      <section className="sc-workspace">
        <div className="sc-visualize-panel">
          <div className="sc-panel-heading">
            <div>
              <span className="sc-kicker">TIME SERIES</span>
              <h2>Map visualization</h2>
            </div>
            <span className="sc-panel-index">01 / VISUALIZE</span>
          </div>
          <div className="sc-date-row">
            <span className="sc-date-caption">ACQUISITION DATE</span>
            <strong>{dates[dateIndex]}</strong>
          </div>
          <input className="sc-date-slider" type="range" min="0" max="3" value={dateIndex} onChange={(e) => setDateIndex(Number(e.target.value))} aria-label="Acquisition date" />
          <div className="sc-slider-labels"><span>18 Oct</span><span>27 Oct</span><span>05 Nov</span><span>14 Nov</span></div>
          <div className="sc-visualize-actions">
            <button className="sc-primary-button" onClick={() => setActiveLayer("Observations")}>Visualize selected date <span>↗</span></button>
            <span className="sc-muted-note">Date control preview</span>
          </div>
        </div>

        <div className="sc-data-panel">
          <div className="sc-panel-heading">
            <div>
              <span className="sc-kicker">SCENE CATALOG</span>
              <h2>Data</h2>
            </div>
            <span className="sc-count">03 SCENES</span>
          </div>
          <div className="sc-data-summary">
            <div><strong>03</strong><span>Indexed scenes</span></div>
            <div><strong>02</strong><span>Ready to review</span></div>
            <div><strong>01</strong><span>Processing</span></div>
          </div>
          <div className="sc-observation-list">
            {observations.map((item) => (
              <button key={item.id} className={`sc-observation ${selectedObservation === item.id ? "active" : ""}`} onClick={() => setSelectedObservation(item.id)}>
                <span className="sc-observation-dot" />
                <span className="sc-observation-copy"><strong>{item.place}</strong><small>{item.id} · {item.date} · {item.type}</small></span>
                <span className={`sc-status ${item.tone}`}>{item.status}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer className="sc-footer">
        <span><i /> DATA PREVIEW</span>
        <p>Radar backscatter changes are screening indicators, not definitive evidence of landslides.</p>
        <span>SCARCAST · 2026</span>
      </footer>
    </main>
  );
}
