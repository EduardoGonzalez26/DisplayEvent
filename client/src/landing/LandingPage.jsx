import useLandingMeta from "./useLandingMeta.js";
import Nav from "./sections/Nav.jsx";
import Hero from "./sections/Hero.jsx";
import FormatsMarquee from "./sections/FormatsMarquee.jsx";
import FeatureInvitations from "./sections/FeatureInvitations.jsx";
import FeatureRsvp from "./sections/FeatureRsvp.jsx";
import FeatureTables from "./sections/FeatureTables.jsx";
import FeatureGifts from "./sections/FeatureGifts.jsx";
import HowItWorks from "./sections/HowItWorks.jsx";
import FormatShowcase from "./sections/FormatShowcase.jsx";
import Faq from "./sections/Faq.jsx";
import FinalCta from "./sections/FinalCta.jsx";
import Footer from "./sections/Footer.jsx";
import "./landing.css";

export default function LandingPage() {
  useLandingMeta();

  return (
    <div className="de-landing">
      <a className="de-skip" href="#contenido">
        Saltar al contenido
      </a>
      <Nav />
      <main id="contenido" className="de-main">
        <Hero />
        <FormatsMarquee />
        <section id="funciones" className="de-features" aria-label="Funciones de DisplayEvent">
          <FeatureInvitations />
          <FeatureRsvp />
          <FeatureTables />
          <FeatureGifts />
        </section>
        <HowItWorks />
        <FormatShowcase />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
