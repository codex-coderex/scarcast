import { motion, useReducedMotion } from "framer-motion";
import EarthGlobe from "./EarthGlobe";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export default function Hero() {
  const reduceMotion = useReducedMotion();
  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <div className="hero-grid">
        <motion.div
          className="hero-copy"
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          transition={{ staggerChildren: reduceMotion ? 0 : 0.12 }}
        >
          <motion.h1 variants={fadeUp} id="hero-title" className="hero-title">
            The ground<br />
            <em>beneath</em><br />
            the surface.
          </motion.h1>
          <motion.p variants={fadeUp} className="hero-description">
            Landscapes are always changing. Scarcast explores how terrain and
            Earth-observation data can help us understand landslide risk.
          </motion.p>
          <motion.div variants={fadeUp} className="hero-actions">
            <a className="action-primary" href="#mission">
              Explore the project <span aria-hidden="true">↗</span>
            </a>
            <a className="action-text" href="#approach">
              Our approach <span aria-hidden="true">↗</span>
            </a>
          </motion.div>
        </motion.div>
        <div className="hero-visual">
          <EarthGlobe />
        </div>
      </div>
    </section>
  );
}
