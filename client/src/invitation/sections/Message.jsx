import { Ornament, Reveal, highlightMessage } from "./util.jsx";

export default function MessageSection({ cfg, family }) {
  const message =
    cfg.message ||
    `Familia ${family}, la alegría de contar con ustedes es inmensa. Nos encantaría acompañarlos en este día tan especial.`;

  return (
    <section className="relative py-24 md:py-32 px-6 bg-inv-bg overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--inv-radial-c),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-y-0 -left-24 w-64 rounded-full bg-inv-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-y-0 -right-24 w-64 rounded-full bg-inv-primary/10 blur-3xl" />

      <Reveal className="relative max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-inv-primary/60" />
          <span className="text-inv-text-muted text-[0.6rem] tracking-[0.5em] uppercase">
            Un mensaje para ustedes
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-inv-primary/60" />
        </div>

        <div className="relative rounded-[2rem] border border-inv-primary/30 bg-gradient-to-b from-inv-surface to-inv-bg backdrop-blur-sm px-6 md:px-12 py-12 md:py-16 shadow-[0_30px_80px_var(--inv-shadow-mid)]">
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-inv-primary/70 to-transparent" />

          <p className="mt-2 font-inv-serif text-2xl md:text-[2rem] leading-[1.7] text-inv-text-muted italic text-balance">
            {highlightMessage(message, family)}
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <Ornament />
        </div>

        {cfg.celebrants && (
          <Reveal className="mt-8 text-center" delay={1}>
            <p className="text-[0.62rem] uppercase tracking-[0.45em] text-inv-text-soft mb-2">
              Con cariño
            </p>
            <p className="font-inv-script text-4xl md:text-6xl text-gold-gradient leading-[1.4]">
              {cfg.celebrants}
            </p>
          </Reveal>
        )}
      </Reveal>
    </section>
  );
}