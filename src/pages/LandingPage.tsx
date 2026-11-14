import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import MapPreview from "../components/landing/MapPreview";

const methods = [
  {
    title: "Observe",
    description: "Bring terrain and Earth-observation information together to understand the landscape.",
  },
  {
    title: "Connect",
    description: "Explore how slopes, land cover, rainfall, and other conditions relate to landslide susceptibility.",
  },
  {
    title: "Understand",
    description: "Make complex environmental patterns easier to explore and communicate.",
  },
];

export default function LandingPage() {
  return (
    <main id="top" className="landing-page">
      <Navbar />
      <Hero />
      <section id="mission" className="editorial-section mission-section" aria-labelledby="mission-title">
        <div className="section-body">
          <h2 id="mission-title">Every landscape <em>tells a story.</em></h2>
          <p>
            Landslides are shaped by a complex combination of terrain, water,
            land use, and geology. Scarcast investigates how openly available
            Earth data can support clearer exploration of these conditions.
          </p>
          <MapPreview />
        </div>
      </section>
      <section id="approach" className="editorial-section approach-section" aria-labelledby="approach-title">
        <div className="section-body">
          <h2 id="approach-title">See the patterns. <em>Understand the place.</em></h2>
          <div className="approach-steps">
            {methods.map((method) => (
              <article key={method.title}>
                <h3>{method.title}</h3>
                <p>{method.description}</p>
              </article>
            ))}
          </div>
          <p className="research-note">
            Scarcast is an exploratory landslide-analysis project, not an official hazard-warning service.
          </p>
        </div>
      </section>
      <footer className="site-footer">
        <a className="wordmark" href="#top">SCARCAST<span className="wordmark-period">.</span></a>
        <span>NASA Space Apps Challenge</span>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
