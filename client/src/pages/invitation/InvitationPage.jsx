import { useEffect, useMemo, useRef, useState } from "react";
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
    <div className="min-h-screen bg-wine-950 text-wine-100 font-body">
      <Hero event={event} family={group.name} cfg={cfg} />
      <div className="relative z-10 -mt-14 px-4">
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
      <footer className="py-10 text-center text-gold-300/60 text-xs tracking-[0.3em] uppercase">
        DisplayEvent · {event.place}
      </footer>
    </div>
  );
}

function InvitationLoader() {
  return (
    <div className="min-h-screen bg-wine-950 grid place-items-center text-gold-300">
      <div className="text-center animate-fade-in">
        <div className="text-3xl mb-3">❖</div>
        <div className="text-sm tracking-[0.4em] uppercase opacity-70">
          Preparando la invitación…
        </div>
      </div>
    </div>
  );
}

function InvitationNotFound() {
  return (
    <div className="min-h-screen bg-wine-950 grid place-items-center text-center px-6">
      <div className="animate-fade-up">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full border border-gold-400/40 text-gold-300 grid place-items-center text-2xl">
          ×
        </div>
        <h1 className="font-display text-3xl text-gold-300 mb-2">
          Invitación no encontrada
        </h1>
        <p className="text-wine-200">El enlace no es válido o fue revocado.</p>
      </div>
    </div>
  );
}

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
    <header
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-cover bg-center"
      style={{
        backgroundImage: cfg.hero_image
          ? `url('${cfg.hero_image}')`
          : "linear-gradient(160deg, #1d0a10 0%, #3d1a22 60%, #b46c72 100%)",
      }}
    >
      <div className="absolute inset-0 bg-wine-950/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-wine-950" />

      <div className="relative z-10 text-center px-6 py-24 max-w-3xl">
        <p className="animate-fade-up text-gold-300 text-xs tracking-[0.5em] uppercase mb-6">
          {cfg.kicker || "Invitación especial"}
        </p>
        <h1 className="animate-fade-up delay-1 font-display text-5xl md:text-7xl text-gold-300 text-balance mb-6">
          {event.name}
        </h1>
        <p className="animate-fade-up delay-2 text-wine-100 text-lg md:text-xl font-light mb-8">
          {cfg.tagline ||
            (cfg.celebrants
              ? `Los invitamos a celebrar junto a ${cfg.celebrants} este día tan especial.`
              : "Los invitamos a celebrar este día tan especial.")}
        </p>
        <p className="animate-fade-up delay-2 -mt-5 mb-8 text-gold-200/90 text-xs uppercase tracking-[0.35em]">
          Invitación para la {family}
        </p>
        <div className="animate-fade-up delay-3 flex items-center justify-center gap-4 text-gold-200">
          <span className="font-display text-6xl font-semibold">{day}</span>
          <span className="text-left text-sm leading-snug">
            <span className="block uppercase tracking-widest text-gold-300 capitalize">
              {month}
            </span>
            <span className="block text-wine-100">{year}</span>
          </span>
        </div>
        <p className="animate-fade-up delay-4 mt-8 text-sm text-wine-200/90 capitalize">
          {pretty} · {event.time}
        </p>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-gold-300/70 text-2xl">
        ↓
      </div>
    </header>
  );
}

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
        <p className="text-center text-gold-300 tracking-[0.3em] uppercase text-sm">
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
      <div className="max-w-2xl mx-auto grid grid-cols-4 gap-3 md:gap-4">
        {units.map((u) => (
          <div
            key={u.label}
            className="rounded-2xl border border-gold-400/30 bg-wine-800/80 backdrop-blur px-2 py-5 text-center shadow-lg"
          >
            <div className="font-display text-3xl md:text-5xl text-gold-300 tabular-nums">
              {String(u.value).padStart(2, "0")}
            </div>
            <div className="mt-1 text-[10px] md:text-xs uppercase tracking-widest text-wine-200">
              {u.label}
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

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
      <p className="text-gold-300 text-xs uppercase tracking-[0.4em] mb-3">
        {eyebrow}
      </p>
      <h2 className="font-display text-4xl md:text-5xl text-gold-200">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-wine-100/90 font-light max-w-xl mx-auto text-lg">
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}

function MessageSection({ cfg, family }) {
  return (
    <section className="py-20 px-6 bg-wine-950">
      <Reveal className="max-w-2xl mx-auto text-center">
        <div className="text-gold-400 text-3xl mb-6">❝</div>
        <p className="font-display text-2xl md:text-3xl text-wine-100 leading-relaxed font-light italic">
          {cfg.message ||
            `Familia ${family}, la alegría de contar con ustedes es inmensa. Nos encantaría acompañarlos en este día tan especial.`}
        </p>
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
    <section className="py-24 px-4 bg-wine-900">
      <div className="max-w-3xl mx-auto">
        <SectionTitle
          eyebrow="Horarios"
          title="Nuestro Itinerario"
          subtitle="Los momentos que viviremos juntos durante la celebración."
        />
        <div className="relative">
          <div className="absolute left-5 top-1 bottom-1 w-px bg-gradient-to-b from-gold-500/60 via-gold-400/40 to-transparent" />
          <div className="space-y-8">
            {items.map((it, i) => (
              <Reveal key={i} delay={(i % 3) + 1}>
                <div className="flex items-start gap-5 md:gap-8">
                  <div className="relative z-10 grid place-items-center w-10 h-10 shrink-0 rounded-full border-2 border-gold-400 bg-wine-800 text-xs font-semibold text-gold-300">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="pt-1.5">
                    {it.time && (
                      <div className="text-sm text-gold-300 tracking-widest uppercase">
                        {it.time}
                      </div>
                    )}
                    <h3 className="mt-1 font-display text-2xl md:text-3xl text-gold-200">
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
    <section className="py-24 px-4 bg-wine-950">
      <div className="max-w-5xl mx-auto">
        <SectionTitle
          eyebrow="Ubicaciones"
          title="Cómo Llegar"
          subtitle="Encuentra cada recinto de la celebración y navega directo con tu app favorita."
        />
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <Reveal key={i} delay={(i % 3) + 1} className="h-full">
              <article className="h-full flex flex-col rounded-2xl border border-gold-400/25 bg-wine-800/70 p-6">
                <span className="font-display text-4xl text-gold-300/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-display text-2xl text-gold-200">
                  {it.label || `Ubicación ${i + 1}`}
                </h3>
                <p className="mt-1 text-wine-100/90 font-light">{it.place}</p>
                <div className="mt-auto pt-5 flex gap-2">
                  {googleUrl(it) && (
                    <>
                      <a
                        href={googleUrl(it)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 rounded-lg bg-gold-400 text-wine-950 text-center text-sm font-semibold px-3 py-2 hover:bg-gold-300 transition-colors"
                      >
                        Google Maps
                      </a>
                      {wazeUrl(it) && (
                        <a
                          href={wazeUrl(it)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 rounded-lg border border-gold-400/50 text-gold-300 text-center text-sm px-3 py-2 hover:bg-gold-500/10 transition-colors"
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
    <section className="py-24 px-4 bg-wine-950 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <SectionTitle eyebrow="Galería" title="Nuestros Mejores Recuerdos" />
        <GalleryCylinder images={images} />
        <p className="mt-10 text-center text-wine-200/70 text-xs uppercase tracking-[0.3em]">
          Pasa el cursor para pausar
        </p>
      </div>
    </section>
  );
}

function GalleryCylinder({ images }) {
  const wrapRef = useRef(null);
  const [radius, setRadius] = useState(300);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const measure = () => {
      if (!wrapRef.current) return;
      const w = wrapRef.current.clientWidth;
      setRadius(Math.max(180, Math.round(w / 2.4)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const n = images.length;
  const angleStep = 360 / n;

  return (
    <Reveal>
      <div
        ref={wrapRef}
        className="relative mx-auto overflow-hidden"
        style={{ maxWidth: 950, height: 380, perspective: 1200 }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`relative ${paused ? "cylinder-paused" : ""} cylinder-spin`}
            style={{ width: 250, height: 330, transformStyle: "preserve-3d" }}
          >
            {images.map((src, i) => (
              <div
                key={i}
                className="absolute inset-0"
                style={{ transform: `rotateY(${i * angleStep}deg) translateZ(${radius}px)` }}
              >
                <img
                  src={src}
                  alt=""
                  className="h-full w-full rounded-2xl border border-gold-400/25 object-cover shadow-2xl"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function DressCodeSection({ cfg }) {
  const items = cfg.dress_code || [];
  if (items.length === 0) return null;

  return (
    <section className="py-24 px-4 bg-wine-900">
      <div className="max-w-4xl mx-auto">
        <SectionTitle eyebrow="Dress Code" title="Código de Vestimenta" />
        <div className="flex flex-wrap justify-center gap-4">
          {items.map((item, i) => (
            <Reveal key={i} delay={(i % 3) + 1}>
              <div className="flex items-center gap-3 rounded-2xl border border-gold-400/25 bg-wine-800/70 px-6 py-4">
                <DressIcon name={item.icon} />
                <span className="font-display text-lg text-gold-200">
                  {item.label}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
        {cfg.dress_note && (
          <Reveal className="mt-8 text-center text-wine-200 font-light italic">
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
          <path
            d="M9 3h6l2 4-4 4 2 8-3 2-3-2 2-8-4-4z"
            strokeLinejoin="round"
          />
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
          <path
            d="M6 3h5l-1 5h3l6-2v4l-8 12-8-12V6l4 2z"
            strokeLinejoin="round"
          />
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

function RsvpSection({
  token,
  family,
  guests,
  attending,
  declining,
  note,
  onDone,
}) {
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
    <section id="rsvp" className="py-24 px-4 bg-wine-900">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-gold-300 text-xs uppercase tracking-[0.4em] mb-3">
            RSVP
          </p>
          <h2 className="font-display text-4xl text-gold-200">
            Confirma tu asistencia
          </h2>
          <p className="mt-3 text-wine-100/90 font-light">
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
            className="rounded-2xl border border-gold-400/25 bg-wine-800/70 p-6 md:p-8"
          >
            <p className="text-sm text-wine-100 mb-4">
              Marca en cada pase si asistirá o no a la celebración:
            </p>
            <ul className="space-y-2 mb-6">
              {guests.map((g) => (
                <li
                  key={g.id}
                  className={`rounded-xl border px-4 py-3 transition-colors ${
                    answers[g.id] === "yes"
                      ? "border-gold-400 bg-gold-400/10"
                      : answers[g.id] === "no"
                        ? "border-wine-400/60 bg-wine-800"
                        : "border-wine-700 bg-wine-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div
                        className={
                          g.is_leader ? "font-semibold" : "font-normal"
                        }
                      >
                        {g.name}
                        {g.is_leader && (
                          <span className="ml-2 text-[10px] uppercase text-gold-300">
                            Líder
                          </span>
                        )}
                        {g.is_child && (
                          <span className="ml-2 text-xs text-wine-100/70">
                            (niño)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAnswer(g.id, "yes")}
                        className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          answers[g.id] === "yes"
                            ? "bg-gold-400 text-wine-950 font-semibold"
                            : "border border-wine-300 text-wine-100 hover:border-gold-400/60"
                        }`}
                      >
                        Sí asistirá
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswer(g.id, "no")}
                        className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          answers[g.id] === "no"
                            ? "bg-wine-500 text-wine-950 font-semibold"
                            : "border border-wine-300 text-wine-100 hover:border-gold-400/60"
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
              <span className="block text-sm text-wine-100 mb-1.5">
                Detalles / restricciones alimenticias
              </span>
              <textarea
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
                rows={3}
                placeholder="Ej. Soy alérgico al marisco…"
                className="w-full rounded-lg bg-wine-950 border border-wine-700 px-3 py-2 text-sm text-wine-100 placeholder-gold-400/50 focus:outline-none focus:border-gold-400"
              />
            </label>

            {message && <p className="text-sm text-red-300 mb-4">{message}</p>}

            <button
              type="submit"
              disabled={saving || !allAnswered}
              className="w-full rounded-lg bg-gold-400 text-wine-950 font-semibold py-3 hover:bg-gold-300 transition-colors disabled:opacity-50"
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
              className="absolute inset-0 bg-wine-950/90"
              onClick={() => setShowModal(false)}
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-gold-400/40 bg-wine-900 p-6 md:p-8 text-center shadow-2xl">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border border-gold-400 text-gold-300 grid place-items-center text-xl">
                ⚠
              </div>
              <h3 className="font-display text-2xl text-gold-200 mb-3">
                ¿Confirmar tu asistencia?
              </h3>
              <p className="text-sm text-wine-100 mb-4 leading-relaxed">
                Una vez confirmada,{" "}
                <span className="text-gold-300 font-semibold">
                  la selección no podrá ser modificada
                </span>
                .
              </p>
              <p className="text-sm text-wine-200 mb-6 leading-relaxed">
                ¿Necesitas alguna aclaración? Escríbenos:
              </p>
              <div className="space-y-2 mb-6">
                <a
                  href="tel:+525515245588"
                  className="flex items-center justify-center gap-2 rounded-xl border border-gold-400/40 bg-wine-800 px-4 py-2.5 text-wine-100 hover:border-gold-400 transition-colors"
                >
                  <span className="text-gold-300">Papá</span>
                  <span className="font-semibold tracking-wide">
                    5515245588
                  </span>
                </a>
                <a
                  href="tel:+525518986867"
                  className="flex items-center justify-center gap-2 rounded-xl border border-gold-400/40 bg-wine-800 px-4 py-2.5 text-wine-100 hover:border-gold-400 transition-colors"
                >
                  <span className="text-gold-300">Mamá</span>
                  <span className="font-semibold tracking-wide">
                    5518986867
                  </span>
                </a>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-wine-300 text-wine-100 px-3 py-2 text-sm hover:bg-wine-800 transition-colors"
                >
                  Volver
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={confirmSubmit}
                  className="flex-1 rounded-lg bg-gold-400 text-wine-950 font-semibold px-3 py-2 text-sm hover:bg-gold-300 transition-colors disabled:opacity-50"
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
    <div className="rounded-2xl border border-gold-400/25 bg-wine-800/70 p-8 text-center">
      <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-gold-400 text-wine-950 grid place-items-center text-2xl">
        ✓
      </div>
      <h3 className="font-display text-3xl text-gold-300 mb-3">
        ¡Gracias, {family}!
      </h3>
      <p className="text-wine-100 font-light mb-4">
        <span className="text-gold-300 font-semibold">
          {count} {count === 1 ? "pase confirmado" : "pases confirmados"}
        </span>{" "}
        de {total}.
        {declining > 0 && (
          <span className="block mt-2 text-wine-200">
            {declining} {declining === 1 ? "pase" : "pases"} con ausencia
            confirmada.
          </span>
        )}
      </p>
      {note && (
        <p className="text-sm text-wine-200 italic mb-4">
          Detalles recibidos: “{note}”
        </p>
      )}
      <p className="text-sm text-wine-200 mb-2">
        La selección ya no puede modificarse. ¿Necesitas aclaraciones?
      </p>
      <p className="text-sm text-wine-200">
        Papá{" "}
        <a
          href="tel:+525515245588"
          className="text-gold-300 underline underline-offset-4 hover:text-gold-200"
        >
          5515245588
        </a>{" "}
        · Mamá{" "}
        <a
          href="tel:+525518986867"
          className="text-gold-300 underline underline-offset-4 hover:text-gold-200"
        >
          5518986867
        </a>
      </p>
    </div>
  );
}
