import { Corner, Ornament } from "./util.jsx";

export default function Hero({ event, family, cfg }) {
  const date = new Date(`${event.date}T00:00:00`);
  const pretty = date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const month = date.toLocaleDateString("es-MX", { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();

  return (
    <header className="relative min-h-screen flex items-center justify-center overflow-hidden bg-inv-bg">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center hero-zoom"
          style={{
            backgroundImage: cfg.hero_image
              ? `url('${cfg.hero_image}')`
              : "var(--inv-hero-fallback)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-inv-bg/80 via-inv-bg/50 to-inv-bg/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-a),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--inv-radial-b),transparent_68%)]" />
      </div>

      {/* Marco decorativo en esquinas */}
      <div className="absolute inset-4 md:inset-8 pointer-events-none text-inv-primary/60">
        <Corner className="top-0 left-0" />
        <Corner className="top-0 right-0 rotate-90" />
        <Corner className="bottom-0 left-0 -rotate-90" />
        <Corner className="bottom-0 right-0 rotate-180" />
      </div>

      <div className="relative z-10 text-center px-6 py-24 max-w-3xl w-full">
        <h1 className="animate-fade-up hero-title-glow font-inv-display text-5xl md:text-7xl leading-[1.2] tracking-[0.08em] uppercase text-gold-gradient text-balance">
          {event.name}
        </h1>

        <p className="animate-fade-up delay-1 hero-text-shadow mt-9 text-[0.65rem] uppercase tracking-[0.4em] text-inv-text-soft">
          Invitación para&nbsp;la <span className="text-inv-text-soft font-semibold capitalize">{family}</span>
        </p>

        <div className="animate-fade-up delay-2 mt-10 flex items-center justify-center gap-6">
          <span className="hidden sm:block h-px w-12 bg-gradient-to-r from-transparent to-inv-primary/50" />
          <div className="flex items-end justify-center gap-3">
            <span className="font-inv-heading hero-title-glow text-6xl md:text-7xl font-semibold text-inv-text-light tabular-nums">
              {day}
            </span>
            <span className="text-left text-sm leading-tight pb-2">
              <span className="block hero-text-shadow uppercase tracking-[0.28em] text-inv-text-muted">
                {month}
              </span>
              <span className="block hero-text-shadow text-inv-text text-lg">{year}</span>
            </span>
          </div>
          <span className="hidden sm:block h-px w-12 bg-gradient-to-l from-transparent to-inv-primary/50" />
        </div>

        <Ornament className="animate-fade-up delay-3 mt-10" />

        <p className="animate-fade-up delay-3 hero-text-shadow mt-5 text-[0.7rem] uppercase tracking-[0.28em] text-inv-text-soft">
          {pretty} · {event.time}
        </p>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-inv-text-muted/80 text-2xl animate-float-slow">
        ↓
      </div>
    </header>
  );
}