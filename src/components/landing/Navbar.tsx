export default function Navbar() {
  return (
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="Scarcast home">
        <span className="brand-mark" aria-hidden="true">◢</span> SCARCAST<span className="wordmark-period">.</span>
      </a>
      <nav className="site-nav" aria-label="Main navigation">
        <a href="#mission">Mission</a>
        <a href="#approach">Approach</a>
        <a className="nav-launch" href={import.meta.env.VITE_APP_URL || "http://localhost:5174"}>
          Open app <span aria-hidden="true">↗</span>
        </a>
      </nav>
    </header>
  );
}
