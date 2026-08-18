import { Reveal, SectionTitle } from "./util.jsx";

export default function ItinerarySection({ cfg }) {
  const items = (cfg.itinerary || []).map((it) => ({
    label: it.label,
    time: it.time,
  }));
  if (items.length === 0) return null;

  return (
    <section className="py-24 px-4 bg-inv-bg-alt">
      <div className="max-w-3xl mx-auto">
        <SectionTitle
          eyebrow="Horarios"
          title="Nuestro Itinerario"
          subtitle="Los momentos que viviremos juntos durante la celebración."
        />
        <div className="relative">
          <div className="absolute left-6 md:left-7 top-3 bottom-3 w-px bg-gradient-to-b from-inv-primary/70 via-inv-primary/30 to-transparent pointer-events-none" />
          <div className="space-y-10">
            {items.map((it, i) => (
              <Reveal key={i} delay={(i % 3) + 1}>
                <div className="flex items-start gap-5 md:gap-8 group">
                  <div className="relative z-10 grid place-items-center w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-full border border-inv-primary/60 bg-inv-surface ring-4 ring-inv-ring font-inv-heading text-base md:text-lg text-gold-gradient transition-transform duration-300 group-hover:scale-110">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="pt-1.5">
                    {it.time && (
                      <div className="text-inv-text-soft text-[0.7rem] tracking-[0.3em] uppercase">
                        {it.time}
                      </div>
                    )}
                    <h3 className="mt-1.5 font-inv-heading text-2xl md:text-3xl text-inv-text-soft">
                      {it.label || `Momento ${i + 1}`}
                    </h3>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}