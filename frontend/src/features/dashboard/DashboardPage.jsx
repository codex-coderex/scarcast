
import { Link } from "react-router";
import "./DashboardPage.css";

const analysisModes = [
  {
    title: "Pre-landslide analysis",
    description:
      "Investigate satellite observations before a landslide event to examine possible terrain movement and surface changes.",
    path: "/map?mode=pre",
  },
  {
    title: "Post-landslide analysis",
    description:
      "Compare satellite observations before and after a landslide to identify surface disturbances and assess landscape changes.",
    path: "/map?mode=post",
  },
];

export default function DashboardPage() {
  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
          <p>
            Explore Earth's changing landscapes through satellite
            observations and landslide analysis.
          </p>
        </header>

        <section
          className="dashboard-section"
          aria-labelledby="investigation-title"
        >
          <div className="dashboard-section-heading">
            <h2 id="investigation-title">Start an investigation</h2>
            <p>Choose an analysis method to begin.</p>
          </div>

          <div className="dashboard-analysis-grid">
            {analysisModes.map((mode) => (
              <Link
                key={mode.path}
                to={mode.path}
                className="dashboard-analysis-card"
              >
                <div className="dashboard-card-content">
                  <h3>{mode.title}</h3>
                  <p>{mode.description}</p>
                </div>

                <span
                  className="dashboard-card-arrow"
                  aria-hidden="true"
                >
                  ↗
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
