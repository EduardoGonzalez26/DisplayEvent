import { motion } from "motion/react";
import { SectionTitle } from "../shared/util.jsx";
import { EASE, Reveal } from "../motion.jsx";

export default function BodaRegistryNote({ cfg, theme }) {
  const text = (cfg.registry_note || "").trim();
  if (!text) return null;

  return (
    <section className="py-24 px-4 bg-inv-bg-alt2">
      <div className="max-w-2xl mx-auto">
        <SectionTitle
          eyebrow={theme?.labels?.registryEyebrow || "Regalos"}
          title={theme?.labels?.registryTitle || "Mesa de Regalos"}
        />
        <Reveal>
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="rounded-3xl border border-inv-primary/30 bg-inv-surface px-6 md:px-10 py-8 md:py-10 text-center shadow-[0_20px_50px_var(--inv-shadow-card)]"
          >
            <p className="font-inv-serif text-lg md:text-xl text-inv-text-soft italic leading-relaxed">
              {text}
            </p>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}