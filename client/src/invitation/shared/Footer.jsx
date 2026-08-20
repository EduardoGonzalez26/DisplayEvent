import { motion } from "motion/react";
import { Ornament } from "./util.jsx";
import { EASE } from "../motion.jsx";

export default function Footer({ event }) {
  return (
    <footer className="py-12 px-6 text-center bg-inv-bg">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <Ornament />
        <p className="mt-7 text-inv-text-soft/80 text-xs tracking-[0.35em] uppercase">
          DisplayEvent · {event.place}
        </p>
        <p className="mt-2 text-inv-text-muted/60 text-[0.6rem] tracking-[0.3em] uppercase">
          Hecho con ✦ para celebrar juntos
        </p>
      </motion.div>
    </footer>
  );
}