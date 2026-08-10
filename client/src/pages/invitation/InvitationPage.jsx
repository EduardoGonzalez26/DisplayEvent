import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api.js";

export default function InvitationPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.invitations
      .get(token)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <InvitationLoader />;
  if (error || !data) return <InvitationNotFound />;

  const { event, group, guests } = data;
  const cfg = event.invitation || {};
  const attending = guests.filter((g) => g.registered).length;
  const declining = guests.filter((g) => g.declined).length;

  return (
    <div className="min-h-screen bg-wine-100 text-gold-700 font-body overflow-x-clip">
      <Hero event={event} family={group.name} cfg={cfg} />
      <div className="relative z-10 -mt-12 px-4">
        <Countdown date={event.date} time={event.time} />
      </div>
      <MessageSection cfg={cfg} family={group.name} />
      <ItinerarySection cfg={cfg} />
      <LocationsSection cfg={cfg} />
      <GallerySection cfg={cfg} />
      <DressCodeSection cfg={cfg} />
      <RsvpSection
        token={token}
        family={group.name}
        guests={guests}
        attending={attending}
        declining={declining}
        note={group.rsvp_note}
        onDone={(updated) =>
          setData((prev) => ({
            ...prev,
            guests: updated.guests,
            group: { ...prev.group, rsvp_note: updated.note },
          }))
        }
      />
      <Footer event={event} />
    </div>
  );
}

/* ------------------------------------------------------------------
   Elementos decorativos
------------------------------------------------------------------ */

function Ornament({ className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-gold-400 ${className}`}>
      <span className="h-px w-14 bg-gradient-to-r from-transparent to-gold-400/60" />
      <span className="w-1 h-1 rotate-45 bg-gold-400/70 inline-block" />
      <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
        <path d="M6 0 8 6 6 12 4 6 6 0Z" />
      </svg>
      <span className="w-1 h-1 rotate-45 bg-gold-400/70 inline-block" />
      <span className="h-px w-14 bg-gradient-to-l from-transparent to-gold-400/60" />
    </div>
  );
}

function Corner({ className }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      className={`absolute w-10 h-10 md:w-14 md:h-14 ${className}`}
    >
      <path d="M2 39 V10 Q2 2 10 2 H39" />
      <path d="M8 39 V14 Q8 8 14 8 H39" opacity=".45" />
    </svg>
  );
}

/* ------------------------------------------------------------------
   Estados de carga y error
------------------------------------------------------------------ */

function InvitationLoader() {
  return (
    <div className="min-h-screen bg-wine-100 grid place-items-center text-gold-600 px-6">
      <div className="text-center animate-fade-in">
        <div className="font-script text-8xl text-gold-gradient leading-[1.4]">&</div>
        <Ornament className="mt-5" />
        <div className="mt-6 text-[0.65rem] tracking-[0.45em] uppercase opacity-80">
          Preparando la invitación…
        </div>
      </div>
    </div>
  );
}

function InvitationNotFound() {
  return (
    <div className="min-h-screen bg-wine-100 grid place-items-center text-center px-6">
      <div className="animate-fade-up">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full border border-gold-400/40 bg-wine-50 grid place-items-center font-display text-3xl text-gold-gradient">
          ×
        </div>
        <h1 className="font-script text-5xl text-gold-gradient mb-3 leading-[1.5]">
          Invitación no encontrada
        </h1>
        <p className="text-gold-600 font-light">El enlace no es válido o fue revocado.</p>
        <Ornament className="mt-7" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Hero
------------------------------------------------------------------ */

function Hero({ event, family, cfg }) {
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
    <header className="relative min-h-screen flex items-center justify-center overflow-hidden bg-wine-100">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center hero-zoom"
          style={{
            backgroundImage: cfg.hero_image
              ? `url('${cfg.hero_image}')`
              : "linear-gradient(165deg, #ffe6e3 0%, #ffd9d6 45%, #f4bdba 78%, #e8a3a1 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-wine-100/80 via-wine-100/50 to-wine-100/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(228,163,161,0.35),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,241,240,0.55),transparent_68%)]" />
      </div>

      {/* Marco decorativo en esquinas */}
      <div className="absolute inset-4 md:inset-8 pointer-events-none text-gold-400/60">
        <Corner className="top-0 left-0" />
        <Corner className="top-0 right-0 rotate-90" />
        <Corner className="bottom-0 left-0 -rotate-90" />
        <Corner className="bottom-0 right-0 rotate-180" />
      </div>

      <div className="relative z-10 text-center px-6 py-24 max-w-3xl w-full">
        <p className="animate-fade-up hero-text-shadow text-gold-600 text-[0.65rem] md:text-xs font-semibold tracking-[0.55em] uppercase mb-7">
          {cfg.kicker || "Invitación especial"}
        </p>

        <h1 className="animate-fade-up delay-1 hero-title-glow font-cinzel text-5xl md:text-7xl leading-[1.2] tracking-[0.08em] uppercase text-gold-gradient text-balance">
          {event.name}
        </h1>

        <p className="animate-fade-up delay-2 hero-text-shadow mt-7 text-gold-700 text-lg md:text-xl font-medium max-w-2xl mx-auto">
          {cfg.tagline ||
            (cfg.celebrants
              ? `Los invitamos a celebrar junto a ${cfg.celebrants} este día tan especial.`
              : "Los invitamos a celebrar este día tan especial.")}
        </p>

        <p className="animate-fade-up delay-2 hero-text-shadow mt-9 text-[0.65rem] uppercase tracking-[0.4em] text-gold-600">
          Invitación para&nbsp;la <span className="text-gold-600 font-semibold capitalize">{family}</span>
        </p>

        <div className="animate-fade-up delay-3 mt-10 flex items-center justify-center gap-6">
          <span className="hidden sm:block h-px w-12 bg-gradient-to-r from-transparent to-gold-400/50" />
          <div className="flex items-end justify-center gap-3">
            <span className="font-display hero-title-glow text-6xl md:text-7xl font-semibold text-gold-300 tabular-nums">
              {day}
            </span>
            <span className="text-left text-sm leading-tight pb-2">
              <span className="block hero-text-shadow uppercase tracking-[0.28em] text-gold-500">
                {month}
              </span>
              <span className="block hero-text-shadow text-gold-700 text-lg">{year}</span>
            </span>
          </div>
          <span className="hidden sm:block h-px w-12 bg-gradient-to-l from-transparent to-gold-400/50" />
        </div>

        <Ornament className="animate-fade-up delay-4 mt-10" />

        <p className="animate-fade-up delay-4 hero-text-shadow mt-5 text-[0.7rem] uppercase tracking-[0.28em] text-gold-600">
          {pretty} · {event.time}
        </p>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gold-500/80 text-2xl animate-float-slow">
        ↓
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------
   Countdown
------------------------------------------------------------------ */

function useCountdown(target) {
  const calc = () => {
    const diff = Math.max(0, target - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      done: diff === 0,
    };
  };
  const [left, setLeft] = useState(calc);

  useEffect(() => {
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [target]);

  return left;
}

function Countdown({ date, time }) {
  const target = useMemo(
    () => new Date(`${date}T${time || "00:00:00"}`).getTime(),
    [date, time],
  );
  const { days, hours, minutes, seconds, done } = useCountdown(target);

  if (done) {
    return (
      <Reveal className="mt-6">
        <p className="text-center text-gold-600 tracking-[0.3em] uppercase text-sm">
          ¡Es hoy!
        </p>
      </Reveal>
    );
  }

  const units = [
    { label: "Días", value: days },
    { label: "Horas", value: hours },
    { label: "Minutos", value: minutes },
    { label: "Segundos", value: seconds },
  ];

  return (
    <Reveal className="mt-6">
      <div className="relative max-w-2xl mx-auto">
        <div className="absolute -inset-3 rounded-3xl border border-gold-400/15 pointer-events-none" />
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          {units.map((u) => (
            <div
              key={u.label}
              className="relative rounded-2xl border border-gold-400/40 bg-wine-50/90 backdrop-blur px-2 py-4 md:py-6 text-center shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-gold-400/60 hover:shadow-[0_18px_40px_rgba(163,81,79,0.18)]"
            >
              <div className="font-display text-3xl md:text-5xl text-gold-gradient tabular-nums">
                {String(u.value).padStart(2, "0")}
              </div>
              <div className="mt-2 text-[10px] md:text-xs uppercase tracking-[0.3em] text-gold-600">
                {u.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------
   Utilidades de animación
------------------------------------------------------------------ */

function Reveal({ children, className = "", as: Tag = "div", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${delay ? `delay-${delay}` : ""} ${className || ""}`}
    >
      {children}
    </Tag>
  );
}

function SectionTitle({ eyebrow, title, subtitle }) {
  return (
    <Reveal className="text-center mb-12">
      <div className="flex items-center justify-center gap-3 mb-5">
        <span className="h-px w-9 bg-gradient-to-r from-transparent to-gold-400/60" />
        <span className="text-gold-400 text-[0.65rem] uppercase tracking-[0.45em]">
          {eyebrow}
        </span>
        <span className="h-px w-9 bg-gradient-to-l from-transparent to-gold-400/60" />
      </div>
      <h2 className="font-display text-4xl md:text-5xl text-gold-gradient text-balance">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-5 text-gold-700 font-light max-w-xl mx-auto text-lg">
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}

/* ------------------------------------------------------------------
   Secciones
------------------------------------------------------------------ */

/* ------------------------------------------------------------------
   Mensaje de bienvenida
------------------------------------------------------------------ */

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMessage(message, family) {
  if (!family) return message;
  const re = new RegExp(`(${escapeRegExp(family)})`, "gi");
  const parts = message.split(re);
  return parts.map((part, i) =>
    part && part.toLowerCase() === family.toLowerCase() ? (
      <span key={i} className="text-gold-gradient whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    )
  );
}

function MessageSection({ cfg, family }) {
  const message =
    cfg.message ||
    `Familia ${family}, la alegría de contar con ustedes es inmensa. Nos encantaría acompañarlos en este día tan especial.`;

  return (
    <section className="relative py-24 md:py-32 px-6 bg-wine-100 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(228,163,161,0.22),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-y-0 -left-24 w-64 rounded-full bg-gold-400/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-y-0 -right-24 w-64 rounded-full bg-gold-400/10 blur-3xl" />

      <Reveal className="relative max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold-400/60" />
          <span className="text-gold-500 text-[0.6rem] tracking-[0.5em] uppercase">
            Un mensaje para ustedes
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold-400/60" />
        </div>

        <div className="relative rounded-[2rem] border border-gold-400/30 bg-gradient-to-b from-wine-50 to-wine-100 backdrop-blur-sm px-6 md:px-12 py-12 md:py-16 shadow-[0_30px_80px_rgba(163,81,79,0.12)]">
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" />

          <p className="mt-2 font-playfair text-2xl md:text-[2rem] leading-[1.7] text-gold-500 italic text-balance">
            {highlightMessage(message, family)}
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <Ornament />
        </div>

        {cfg.celebrants && (
          <Reveal className="mt-8 text-center" delay={1}>
            <p className="text-[0.62rem] uppercase tracking-[0.45em] text-gold-600 mb-2">
              Con cariño
            </p>
            <p className="font-script text-4xl md:text-6xl text-gold-gradient leading-[1.4]">
              {cfg.celebrants}
            </p>
          </Reveal>
        )}
      </Reveal>
    </section>
  );
}

function ItinerarySection({ cfg }) {
  const items = (cfg.itinerary || []).map((it) => ({
    label: it.label,
    time: it.time,
  }));
  if (items.length === 0) return null;

  return (
    <section className="py-24 px-4 bg-wine-300">
      <div className="max-w-3xl mx-auto">
        <SectionTitle
          eyebrow="Horarios"
          title="Nuestro Itinerario"
          subtitle="Los momentos que viviremos juntos durante la celebración."
        />
        <div className="relative">
          <div className="absolute left-6 md:left-7 top-3 bottom-3 w-px bg-gradient-to-b from-gold-400/70 via-gold-400/30 to-transparent pointer-events-none" />
          <div className="space-y-10">
            {items.map((it, i) => (
              <Reveal key={i} delay={(i % 3) + 1}>
                <div className="flex items-start gap-5 md:gap-8 group">
                  <div className="relative z-10 grid place-items-center w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-full border border-gold-400/60 bg-wine-50 ring-4 ring-wine-200 font-display text-base md:text-lg text-gold-gradient transition-transform duration-300 group-hover:scale-110">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="pt-1.5">
                    {it.time && (
                      <div className="text-gold-600 text-[0.7rem] tracking-[0.3em] uppercase">
                        {it.time}
                      </div>
                    )}
                    <h3 className="mt-1.5 font-display text-2xl md:text-3xl text-gold-600">
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

function LocationsSection({ cfg }) {
  const legacies = cfg.itinerary || [];
  const raw = cfg.locations || legacies.map((it) => it);
  const items = raw.map((it) => ({
    label: it.label,
    place: it.place,
    url: it.url || "",
    lat: it.lat,
    lng: it.lng,
  }));
  if (items.length === 0) return null;

  const googleMapsUrl = (it) => {
    if (it.url) return it.url;
    if (it.lat && it.lng)
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${it.lat},${it.lng}`)}`;
    if (it.place)
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.place)}`;
    return null;
  };
  const wazeUrl = (it) => {
    if (it.lat && it.lng)
      return `https://waze.com/ul?ll=${encodeURIComponent(`${it.lat},${it.lng}`)}&navigate=yes`;
    if (it.place)
      return `https://waze.com/ul?q=${encodeURIComponent(it.place)}&navigate=yes`;
    return null;
  };
  const googleUrl = (it) => googleMapsUrl(it);

  return (
<section className="py-24 px-4 bg-wine-50">
      <div className="max-w-5xl mx-auto">
        <SectionTitle
          eyebrow="Ubicaciones"
          title="Cómo Llegar"
          subtitle="Encuentra cada recinto de la celebración y navega directo con tu app favorita."
        />
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <Reveal key={i} delay={(i % 3) + 1} className="h-full">
              <article className="group h-full flex flex-col rounded-2xl border border-gold-400/30 bg-wine-100/80 backdrop-blur p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-gold-400/50 hover:shadow-[0_20px_50px_rgba(163,81,79,0.14)]">
                <span className="mb-4 font-script text-4xl text-gold-400/90">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-2xl text-gold-600">
                  {it.label || `Ubicación ${i + 1}`}
                </h3>
                <p className="mt-1 text-gold-600 font-light">{it.place}</p>
                <div className="mt-auto pt-6 flex gap-2">
                  {googleUrl(it) && (
                    <>
                      <a
                        href={googleUrl(it)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 rounded-lg bg-gradient-to-br from-gold-300 to-gold-500 text-wine-950 text-center text-sm font-semibold px-3 py-2.5 shadow-md hover:brightness-110 active:scale-[.98] transition-all"
                      >
                        Google Maps
                      </a>
                      {wazeUrl(it) && (
                        <a
                          href={wazeUrl(it)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 rounded-lg border border-gold-400/60 text-gold-600 text-center text-sm px-3 py-2.5 hover:bg-gold-400/15 active:scale-[.98] transition-all"
                        >
                          Waze
                        </a>
                      )}
                    </>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function GallerySection({ cfg }) {
  const images = cfg.gallery || [];
  if (images.length === 0) return null;

  return (
    <section className="py-24 px-4 bg-wine-300">
      <div className="max-w-4xl mx-auto">
        <SectionTitle eyebrow="Galería" title="Nuestros Mejores Recuerdos" />
        <GalleryShow images={images} />
      </div>
    </section>
  );
}

function GalleryShow({ images }) {
  const [index, setIndex] = useState(0);
  const [ratios, setRatios] = useState({});
  const [lastRatio, setLastRatio] = useState(16 / 10);
  const intervalRef = useRef(null);
  const ratiosRef = useRef({});
  const imgRefs = useRef([]);

  const schedule = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 5000);
  }, [images.length]);

  useEffect(() => {
    schedule();
    return () => clearInterval(intervalRef.current);
  }, [schedule]);

  const go = (i) => {
    setIndex(i);
    schedule();
  };

  const syncRatios = useCallback(() => {
    let changed = false;
    imgRefs.current.forEach((el, i) => {
      const src = images[i];
      if (!el || !src || !el.naturalWidth || !el.naturalHeight) return;
      const r = Math.min(4, Math.max(0.4, el.naturalWidth / el.naturalHeight));
      if (ratiosRef.current[src] !== r) {
        ratiosRef.current[src] = r;
        changed = true;
      }
    });
    if (changed) setRatios({ ...ratiosRef.current });
  }, [images]);

  useEffect(() => {
    syncRatios();
  }, [syncRatios, index]);

  useEffect(() => {
    if (ratios[images[index]]) setLastRatio(ratios[images[index]]);
  }, [index, ratios, images]);

  const activeRatio = ratios[images[index]] || lastRatio;

  return (
    <Reveal>
      <div
        className="select-none"
        onMouseEnter={() => clearInterval(intervalRef.current)}
        onMouseLeave={schedule}
      >
        <div className="p-1.5 md:p-2 rounded-[2rem] bg-gradient-to-br from-gold-400/40 via-transparent to-gold-400/20">
          <div
            className="relative overflow-hidden rounded-[1.6rem] border border-gold-400/30 shadow-2xl transition-[aspect-ratio] duration-500"
            style={{ aspectRatio: activeRatio }}
          >
            {images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                ref={(el) => {
                  imgRefs.current[i] = el;
                }}
                onLoad={() => syncRatios()}
                className={`kenburns absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                  i === index ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-wine-950/80 to-transparent" />

            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => go(i)}
                    aria-label={`Foto ${i + 1}`}
                    className={`h-1.5 transition-all duration-300 ${
                      i === index ? "w-7 bg-gold-300" : "w-1.5 bg-white/50 hover:bg-white/80"
                    }`}
                    style={{ borderRadius: 99 }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {images.length > 1 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`h-14 w-14 overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                  i === index
                    ? "border-gold-300 shadow-[0_0_18px_rgba(214,196,155,0.55)]"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}

function DressCodeSection({ cfg }) {
  const items = cfg.dress_code || [];
  if (items.length === 0) return null;

  return (
    <section className="py-24 px-4 bg-wine-100">
      <div className="max-w-4xl mx-auto">
        <SectionTitle eyebrow="Dress Code" title="Código de Vestimenta" />
        <div className="flex flex-wrap justify-center gap-4">
          {items.map((item, i) => (
            <Reveal key={i} delay={(i % 3) + 1}>
              <div className="flex items-center gap-3 rounded-2xl border border-gold-400/30 bg-wine-50 px-6 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400/50">
                <DressIcon name={item.icon} />
                <span className="font-display text-lg text-gold-600">{item.label}</span>
              </div>
            </Reveal>
          ))}
        </div>
        {cfg.dress_note && (
          <Reveal className="mt-8 text-center text-gold-600 font-light italic">
            {cfg.dress_note}
          </Reveal>
        )}
      </div>
    </section>
  );
}

function DressIcon({ name }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    className: "w-8 h-8 text-gold-400",
  };
  switch (name) {
    case "tie":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M9 3h6l2 4-4 4 2 8-3 2-3-2 2-8-4-4z" strokeLinejoin="round" />
        </svg>
      );
    case "gown":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path
            d="M12 3c2 0 3 1 3 3 0 1-1 2-3 4s-3-3-3-4c0-2 1-3 3-3z"
            strokeLinejoin="round"
          />
          <path d="M9 6l-4 6 5 9h4l5-9-4-6" strokeLinejoin="round" />
        </svg>
      );
    case "formal":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M6 3h5l-1 5h3l6-2v4l-8 12-8-12V6l4 2z" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...common} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" strokeLinejoin="round" />
        </svg>
      );
  }
}

function Footer({ event }) {
  return (
    <footer className="py-12 px-6 text-center bg-wine-100">
      <Ornament />
      <p className="mt-7 text-gold-600/80 text-xs tracking-[0.35em] uppercase">
        DisplayEvent · {event.place}
      </p>
      <p className="mt-2 text-gold-500/60 text-[0.6rem] tracking-[0.3em] uppercase">
        Hecho con ✦ para celebrar juntos
      </p>
    </footer>
  );
}

/* ------------------------------------------------------------------
   RSVP
------------------------------------------------------------------ */

function RsvpSection({ token, family, guests, attending, declining, note, onDone }) {
  const [answers, setAnswers] = useState(() => {
    const map = {};
    for (const g of guests) {
      if (g.registered) map[g.id] = "yes";
      else if (g.declined) map[g.id] = "no";
    }
    return map;
  });
  const [diet, setDiet] = useState(note || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(attending > 0 || declining > 0);
  const [showModal, setShowModal] = useState(false);

  const setAnswer = (id, value) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const confirmSubmit = async () => {
    setShowModal(false);
    setSaving(true);
    setMessage("");
    try {
      const updated = await api.invitations.rsvp(token, {
        attending_ids: guests
          .filter((g) => answers[g.id] === "yes")
          .map((g) => g.id),
        declining_ids: guests
          .filter((g) => answers[g.id] === "no")
          .map((g) => g.id),
        note: diet,
      });
      setSubmitted(true);
      onDone(updated);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const answeredCount = guests.filter((g) => answers[g.id]).length;
  const allAnswered = answeredCount === guests.length;

  return (
    <section id="rsvp" className="py-24 px-4 bg-wine-300">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="h-px w-9 bg-gradient-to-r from-transparent to-gold-400/60" />
            <span className="text-gold-400 text-[0.65rem] uppercase tracking-[0.45em]">
              RSVP
            </span>
            <span className="h-px w-9 bg-gradient-to-l from-transparent to-gold-400/60" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-gold-gradient text-balance">
            Confirma tu asistencia
          </h2>
          <p className="mt-5 text-gold-700 font-light">
            Familia {family}, cuéntanos quiénes podrán acompañarnos.
          </p>
        </div>

        {submitted && (
          <SubmitConfirmation
            count={attending}
            declining={declining}
            total={guests.length}
            note={note}
            family={family}
          />
        )}

        {!submitted && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (allAnswered) setShowModal(true);
            }}
            className="rounded-2xl border border-gold-400/30 bg-wine-50 backdrop-blur p-6 md:p-8 shadow-2xl"
          >
            <p className="text-sm text-gold-600 mb-5">
              Marca en cada pase si asistirá o no a la celebración:
            </p>
            <ul className="space-y-2.5 mb-6">
              {guests.map((g) => (
                <li
                  key={g.id}
                  className={`rounded-xl border px-4 py-3 transition-all duration-300 ${
                    answers[g.id] === "yes"
                      ? "border-gold-400/70 bg-gradient-to-r from-gold-400/15 to-transparent"
                      : answers[g.id] === "no"
                        ? "border-wine-400/70 bg-wine-100"
                        : "border-wine-300 bg-wine-100/50 hover:border-wine-500"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[8rem]">
                      <div className={g.is_leader ? "font-semibold" : "font-normal"}>
                        {g.name}
                        {g.is_leader && (
                          <span className="ml-2 text-[10px] uppercase text-gold-600">
                            Líder
                          </span>
                        )}
                        {g.is_child && (
                          <span className="ml-2 text-xs text-gold-600/80">(niño)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAnswer(g.id, "yes")}
                        className={`rounded-lg px-3.5 py-1.5 text-sm transition-all active:scale-[.97] ${
                          answers[g.id] === "yes"
                            ? "bg-gradient-to-r from-gold-300 to-gold-500 text-wine-950 font-semibold shadow-md"
                            : "border border-wine-300 text-gold-700 hover:border-gold-400/70 hover:text-gold-600"
                        }`}
                      >
                        Sí asistirá
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswer(g.id, "no")}
                        className={`rounded-lg px-3.5 py-1.5 text-sm transition-all active:scale-[.97] ${
                          answers[g.id] === "no"
                            ? "bg-wine-500 text-wine-950 font-semibold shadow-md"
                            : "border border-wine-300 text-gold-700 hover:border-gold-400/70 hover:text-gold-600"
                        }`}
                      >
                        No asistirá
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <label className="block mb-5">
              <span className="block text-sm text-gold-600 mb-1.5">
                Detalles / restricciones alimenticias
              </span>
              <textarea
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
                rows={3}
                placeholder="Ej. Soy alérgico al marisco…"
                className="w-full rounded-xl bg-wine-100 border border-wine-300 px-4 py-3 text-sm text-gold-700 placeholder-gold-500/50 focus:outline-none focus:border-gold-400/70 focus:ring-1 focus:ring-gold-400/40 transition-all"
              />
            </label>

            {message && <p className="text-sm text-red-400 mb-4">{message}</p>}

            <button
              type="submit"
              disabled={saving || !allAnswered}
              className="w-full rounded-xl bg-gradient-to-br from-gold-300 via-gold-400 to-gold-600 text-wine-950 font-semibold py-3.5 shadow-xl hover:brightness-110 active:scale-[.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {saving
                ? "Enviando…"
                : allAnswered
                  ? "Confirmar asistencia"
                  : `Faltan ${guests.length - answeredCount} por responder`}
            </button>
          </form>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 grid place-items-center px-4">
            <div
              className="absolute inset-0 bg-wine-950/50 backdrop-blur-sm animate-fade"
              onClick={() => setShowModal(false)}
            />
            <div className="relative z-10 w-full max-w-md rounded-3xl border border-gold-400/40 bg-gradient-to-b from-wine-50 to-wine-100 p-7 md:p-8 text-center shadow-2xl animate-modal-in">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 text-wine-950 grid place-items-center text-2xl shadow-lg">
                ⚠
              </div>
              <Ornament className="mb-4" />
              <h3 className="font-script text-4xl text-gold-gradient mb-4 leading-[1.5]">
                ¿Confirmar tu asistencia?
              </h3>
              <p className="text-sm text-gold-600 mb-4 leading-relaxed">
                Una vez confirmada,{" "}
                <span className="text-gold-600 font-semibold">
                  la selección no podrá ser modificada
                </span>
                .
              </p>
              <p className="text-sm text-gold-600 mb-6 leading-relaxed">
                ¿Necesitas alguna aclaración? Escríbenos:
              </p>
              <div className="space-y-2 mb-6">
                <a
                  href="tel:+525515245588"
                  className="flex items-center justify-center gap-3 rounded-xl border border-gold-400/40 bg-wine-100 px-4 py-3 text-gold-700 hover:border-gold-400/80 hover:bg-wine-100 transition-all"
                >
                  <span className="text-gold-600 uppercase tracking-widest text-[0.65rem]">
                    Papá
                  </span>
                  <span className="font-semibold tracking-wider">5515245588</span>
                </a>
                <a
                  href="tel:+525518986867"
                  className="flex items-center justify-center gap-3 rounded-xl border border-gold-400/40 bg-wine-100 px-4 py-3 text-gold-700 hover:border-gold-400/80 hover:bg-wine-100 transition-all"
                >
                  <span className="text-gold-600 uppercase tracking-widest text-[0.65rem]">
                    Mamá
                  </span>
                  <span className="font-semibold tracking-wider">5518986867</span>
                </a>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-wine-300 text-gold-700 px-3 py-2.5 text-sm hover:bg-wine-100 active:scale-[.98] transition-all"
                >
                  Volver
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={confirmSubmit}
                  className="flex-1 rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 text-wine-950 font-semibold px-3 py-2.5 text-sm shadow-lg hover:brightness-110 active:scale-[.98] transition-all disabled:opacity-50"
                >
                  {saving ? "Enviando…" : "Sí, confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SubmitConfirmation({ count, declining, total, note, family }) {
  return (
    <div className="rounded-3xl border border-gold-400/30 bg-gradient-to-b from-wine-50 to-wine-100 p-8 md:p-10 text-center backdrop-blur shadow-2xl">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 text-wine-950 grid place-items-center text-3xl shadow-lg">
        ✓
      </div>
      <Ornament className="mb-7" />
      <h3 className="font-script text-5xl md:text-6xl text-gold-gradient mb-5 leading-[1.6]">
        ¡Gracias, {family}!
      </h3>
      <p className="text-gold-700 font-light mb-5">
        <span className="text-gold-600 font-semibold">
          {count} {count === 1 ? "pase confirmado" : "pases confirmados"}
        </span>{" "}
        de {total}.
        {declining > 0 && (
          <span className="block mt-2 text-gold-600">
            {declining} {declining === 1 ? "pase" : "pases"} con ausencia confirmada.
          </span>
        )}
      </p>
      {note && (
        <p className="text-sm text-gold-600 italic mb-5">
          Detalles recibidos: “{note}”
        </p>
      )}
      <p className="text-sm text-gold-600 mb-2">
        La selección ya no puede modificarse. ¿Necesitas aclaraciones?
      </p>
      <p className="text-sm text-gold-600">
        Papá{" "}
        <a
          href="tel:+525515245588"
          className="text-gold-600 underline underline-offset-4 hover:text-gold-500"
        >
          5515245588
        </a>{" "}
        · Mamá{" "}
        <a
          href="tel:+525518986867"
          className="text-gold-600 underline underline-offset-4 hover:text-gold-500"
        >
          5518986867
        </a>
      </p>
    </div>
  );
}