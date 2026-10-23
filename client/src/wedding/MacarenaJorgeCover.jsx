import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { boda_jorge_macarena as THEME } from "../invitation/themes/boda_jorge_macarena.js";
import { Flor, FlowerRule } from "../invitation/boda_jorge_macarena/flora.jsx";
import { GrainOverlay } from "../invitation/boda_jorge_macarena/Grain.jsx";
import { Reveal, motion, useReducedMotion } from "../invitation/motion.jsx";
import {
  displayNames,
  longDateLine,
  mapsSearchUrl,
  monthYearLine,
  parseEventDate,
  prettyTime,
  safeHttpUrl,
} from "../invitation/boda_jorge_macarena/helpers.js";
import { extractInvitationToken } from "./invitationLink.js";
import Travel from "../invitation/boda_jorge_macarena/Travel.jsx";
import Stay from "../invitation/boda_jorge_macarena/Stay.jsx";

/* ------------------------------------------------------------------
   Portada pública de la boda de Macarena & Jorge en su dominio propio.

   Es una página INDEPENDIENTE de la invitación personal:
   - No monta InvitationView, BodaJorgeMacarenaLayout ni InvitationPage.
   - No lee invitados, grupos ni pases; no llama a endpoints de RSVP.
   - No renderiza la mesa de regalos (`registry`) ni datos bancarios.
   - El acceso a la invitación personal es un navegador de enlaces: se
     pega el enlace/token recibido por WhatsApp y se abre
     `/invitacion/<token>` (el token se resuelve contra este origen).

   Lenguaje visual: papel crema, tinta cálida, Cormorant Garamond +
   Montserrat, flora de Granada y fotos B&N del tema v2, pero con una
   composición editorial propia (capítulos numerados, retícula de
   revista y un cierre oscuro para el acceso personal).
------------------------------------------------------------------ */

const FALLBACK_NAMES = ["Macarena", "Jorge"];
const FIXED_WELCOME_QUOTE = "Hay días que se esperan toda la vida.";
const FIXED_WELCOME_BODY =
  "Con la bendición de nuestras familias y el cariño de quienes nos han acompañado siempre, queremos compartir con ustedes el comienzo de una nueva etapa. Será un honor celebrarlo juntos.";
const INVITATION_HELP =
  "Cada invitación es personal. Ábrela desde el enlace que recibiste por WhatsApp: ahí encontrarás los detalles de tu grupo y podrás confirmar tu asistencia.";
const CONTACT_MESSAGE =
  "Hola, necesito ayuda con mi invitación a la boda de Macarena y Jorge.";

const CEREMONY_RE = /(misa|ceremonia|iglesia|templo|catedral|capilla)/i;
const RECEPTION_RE =
  /(recepcion|recepción|celebraci|celebración|cena|fiesta|banquete|c[óo]ctel|jard[íi]n)/i;
const PROGRAM_FLOWERS = ["granado", "bugambilia", "dalia", "granado"];

/* ------------------------------------------------------------------
   Utilidades locales
------------------------------------------------------------------ */

function safeImageSrc(value) {
  if (typeof value !== "string") return "";
  const src = value.trim();
  if (!src) return "";
  if (/^(javascript|data|vbscript):/i.test(src)) return "";
  if (/^https?:\/\//i.test(src) || src.startsWith("/")) return src;
  return "";
}

/* Nombres de respaldo a partir de "Boda de Macarena & Jorge" / "Macarena y
   Jorge". La fuente principal es `invitation.couple` (nameB & nameA). */
function parseEventNames(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  const clean = raw
    .replace(/\s*[·|].*$/, "")
    .replace(/^boda\s+(?:de\s+)?/i, "")
    .trim();
  const parts = clean
    .split(/\s*(?:&|\by\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length === 2 ? parts : [];
}

function monogramOf(names, spaced = true) {
  const initials = names
    .map((name) => String(name || "").trim().charAt(0).toUpperCase())
    .filter(Boolean);
  if (initials.length === 0) return "M&J";
  return initials.join(spaced ? " & " : "&");
}

function locationKicker(label, index, labels) {
  const text = String(label || "");
  const eyebrows = Array.isArray(labels.locationEyebrows) ? labels.locationEyebrows : [];
  if (CEREMONY_RE.test(text)) return eyebrows[0] || "Ceremonia";
  if (RECEPTION_RE.test(text)) return eyebrows[1] || "Recepción";
  return eyebrows[index] || labels.locationsEyebrow || (index === 0 ? "Ceremonia" : "Recepción");
}

function dressCodeLabels(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((item) =>
        typeof item === "object" && item ? String(item.label || "") : String(item || "")
      )
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return String(raw || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstEmail(value) {
  const match = String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : "";
}

function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function telHref(value) {
  const phone = String(value || "").replace(/[^\d+]/g, "");
  return phone ? `tel:${phone}` : "";
}

function whatsappHref(value) {
  const digits = phoneDigits(value);
  if (digits.length < 8) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(CONTACT_MESSAGE)}`;
}

function calcCountdown(target) {
  if (target == null) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: false };
  }
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: diff === 0,
  };
}

function useCountdown(target) {
  const [left, setLeft] = useState(() => calcCountdown(target));

  useEffect(() => {
    setLeft(calcCountdown(target));
    if (target == null || target - Date.now() <= 0) return undefined;
    const id = setInterval(() => setLeft(calcCountdown(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return left;
}

function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

/* Activa el desplazamiento suave SOLO mientras la portada está montada.
   La clase vive en <html> (no en el contenedor) para que los anchors
   internos usen el scroll del documento; se retira en el cleanup al
   navegar a `/invitacion/<token>`. `prefers-reduced-motion: reduce` la
   anula desde index.css con `scroll-behavior: auto !important`. */
function useSmoothCoverScroll() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("de-cover-scroll");
    return () => {
      root.classList.remove("de-cover-scroll");
    };
  }, []);
}

function firstContactAction(contacts) {
  const list = Array.isArray(contacts) ? contacts : [];

  for (const contact of list) {
    if (!contact) continue;
    const name = String(contact.name || "").trim();
    const phone = String(contact.phone || "").trim();
    const email = firstEmail(contact.email);
    const whatsapp = whatsappHref(phone);

    if (whatsapp) {
      return {
        href: whatsapp,
        name,
        kind: "whatsapp",
        label: "Escríbenos por WhatsApp",
        external: true,
      };
    }

    const call = telHref(phone);
    if (call) {
      return { href: call, name, kind: "phone", label: "Llámanos", external: false };
    }

    if (email) {
      return {
        href: `mailto:${email}`,
        name,
        kind: "email",
        label: "Escríbenos por correo",
        external: false,
      };
    }
  }

  return null;
}

/* ------------------------------------------------------------------
   Piezas de composición
------------------------------------------------------------------ */

function SectionHeading({ index, kicker, title, titleId }) {
  return (
    <header>
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="font-inv-display text-sm tracking-[0.18em] text-[var(--inv-text-dim)]"
        >
          {index}
        </span>
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-[var(--inv-accent-border-strong)]"
        />
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--inv-text-muted)]">
          {kicker}
        </p>
      </div>
      <h2
        id={titleId}
        className="mt-5 font-inv-display text-[clamp(38px,5.2vw,60px)] font-normal leading-[1.04] text-[var(--inv-text)] [text-wrap:balance]"
      >
        {title}
      </h2>
    </header>
  );
}

function Monogram({ names, className = "", compact = true }) {
  return (
    <span
      aria-hidden="true"
      className={`grid place-items-center rounded-full border border-[var(--inv-accent-border-strong)] bg-[var(--inv-surface)] font-inv-display text-[var(--inv-text)] ${className}`}
    >
      {monogramOf(names, !compact)}
    </span>
  );
}

function Countdown({ target }) {
  const { days, hours, minutes, seconds, done } = useCountdown(target);

  if (target == null) return null;

  if (done) {
    return (
      <p className="mt-8 border-y border-[var(--inv-accent-border)] py-5 font-inv-display text-2xl italic text-[var(--inv-text-soft)]">
        El gran día está aquí.
      </p>
    );
  }

  const units = [
    { label: "Días", value: days },
    { label: "Horas", value: String(hours).padStart(2, "0") },
    { label: "Min", value: String(minutes).padStart(2, "0") },
    { label: "Seg", value: String(seconds).padStart(2, "0") },
  ];

  return (
    <div className="mt-8 border-y border-[var(--inv-accent-border)] py-5">
      <p className="sr-only">
        Faltan {days} días, {hours} horas, {minutes} minutos y {seconds} segundos para la boda.
      </p>
      <div aria-hidden="true">
        <div className="mb-3 flex items-center gap-3">
          <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--inv-text-muted)]">
            Faltan
          </span>
          <span className="h-px flex-1 bg-[var(--inv-accent-border)]" />
        </div>
        <div className="grid grid-cols-4">
          {units.map((unit, i) => (
            <div
              key={unit.label}
              className={`flex flex-col items-center gap-1.5 ${
                i === 0 ? "" : "border-l border-[var(--inv-accent-border)]"
              }`}
            >
              <span className="font-inv-display text-[34px] font-light leading-none tabular-nums text-[var(--inv-text)] md:text-[38px]">
                {unit.value}
              </span>
              <span className="text-[9px] font-medium uppercase tracking-[0.24em] text-[var(--inv-text-muted)]">
                {unit.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Hero({ names, dateLine, time, place, heroImage, dateParts, countdownTarget }) {
  const reduced = useReducedMotion();
  const namesAlt = names.join(" y ");
  const dateMeta = [dateLine, time ? `${time} h` : ""].filter(Boolean).join(" · ");

  return (
    <section className="relative px-5 pb-16 pt-6 md:px-8 md:pb-24 md:pt-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 6% 0%, var(--inv-radial-a), transparent 42%), radial-gradient(ellipse at 98% 18%, var(--inv-radial-b), transparent 36%)",
        }}
      />

      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--inv-accent-border)] pb-4">
          <div className="flex items-center gap-3">
            <Monogram names={names} className="h-10 w-10 text-[11px]" />
            <div>
              <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-[var(--inv-text-muted)]">
                Nuestra boda
              </p>
              <p className="font-inv-display text-lg leading-tight text-[var(--inv-text)]">
                {names.join(" & ")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {dateLine && (
              <span className="hidden text-[9px] font-medium uppercase tracking-[0.28em] text-[var(--inv-text-muted)] sm:inline">
                {dateLine}
              </span>
            )}
            <a
              href="#tu-invitacion"
              className="inline-flex min-h-[40px] items-center border-b border-[var(--inv-text)] text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--inv-text)] transition-[color,background-color,transform] duration-200 hover:text-[var(--inv-text-muted)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-4 focus-visible:ring-offset-[#F6F2EB]"
            >
              Mi invitación
            </a>
          </div>
        </div>

        <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:gap-16">
          <Reveal>
            <p className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.36em] text-[var(--inv-text-muted)]">
              <span aria-hidden="true" className="h-px w-8 bg-[var(--inv-accent-border-strong)]" />
              {THEME.labels.heroEyebrow || "Nos casamos"}
            </p>

            <h1 className="mt-5 font-inv-display text-[clamp(44px,7.4vw,96px)] font-light leading-[0.98] tracking-[-0.025em] text-[var(--inv-text)] [text-wrap:balance]">
              {names.length === 2 ? (
                <>
                  {names[0]}{" "}
                  <span className="font-light italic text-[var(--inv-flor-gra-line)]">&amp;</span>{" "}
                  {names[1]}
                </>
              ) : (
                names.join(" & ")
              )}
            </h1>

            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--inv-text-soft)]">
              {dateMeta && <span>{dateMeta}</span>}
              {dateMeta && place && (
                <span aria-hidden="true" className="h-1 w-1 rotate-45 bg-[var(--inv-flor-gra-line)]" />
              )}
              {place && <span>{place}</span>}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#tu-invitacion"
                className="inline-flex min-h-[52px] items-center justify-center border border-[#1C1B19] bg-[#1C1B19] px-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#FAF7F2] transition-[color,background-color,transform] duration-200 hover:bg-[#3A3733] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F2EB]"
              >
                Abrir mi invitación
              </a>
              <a
                href="#nos-casamos"
                className="inline-flex min-h-[52px] items-center justify-center border border-[#1C1B19] bg-transparent px-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#1C1B19] transition-[color,background-color,transform] duration-200 hover:bg-[#1C1B19] hover:text-[#FAF7F2] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F2EB]"
              >
                Descubrir la boda
              </a>
            </div>

            <Countdown target={countdownTarget} />
          </Reveal>

          <Reveal delay={0.12} className="relative mx-auto w-full max-w-[470px] lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute -inset-2 border border-[var(--inv-accent-border-strong)] md:-inset-3"
            />
            <div className="relative aspect-[4/5] overflow-hidden bg-[var(--inv-card)]">
              {heroImage ? (
                <motion.img
                  src={heroImage}
                  alt={namesAlt}
                  loading="eager"
                  decoding="async"
                  draggable={false}
                  initial={reduced ? undefined : { scale: 1.035 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: reduced ? 0 : 1.8, ease: [0.2, 0.7, 0.2, 1] }}
                  className="h-full w-full object-cover [filter:grayscale(1)_contrast(1.03)]"
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <span className="font-inv-display text-[clamp(72px,16vw,140px)] font-light italic text-[var(--inv-text-dim)]">
                    {monogramOf(names, false)}
                  </span>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-[rgba(251,248,243,0.94)] px-4 py-3">
                <span className="text-[9px] font-medium uppercase tracking-[0.28em] text-[#3A3733]">
                  {place || "Nuestra boda"}
                </span>
                <span className="font-inv-display text-sm italic text-[#3A3733]">
                  {dateParts ? `${dateParts.day} · ${dateParts.month}` : ""}
                </span>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-5 -top-5 h-16 w-16 md:h-20 md:w-20"
            >
              <Flor kind="dalia" />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 -right-4 h-20 w-20 rotate-12 md:h-24 md:w-24"
            >
              <Flor kind="granado" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Welcome({ names }) {
  return (
    <section
      id="nos-casamos"
      aria-labelledby="nos-casamos-title"
      className="scroll-mt-8 border-t border-[var(--inv-accent-border)] px-5 py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading
          index="01"
          kicker="Bienvenidos"
          title="Nos casamos"
          titleId="nos-casamos-title"
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <Reveal>
            <p className="font-inv-display text-[clamp(30px,4.6vw,52px)] font-light italic leading-[1.16] text-[var(--inv-text)] [text-wrap:balance]">
              “{FIXED_WELCOME_QUOTE}”
            </p>
          </Reveal>

          <Reveal
            delay={0.08}
            className="border-t border-[var(--inv-accent-border-strong)] pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"
          >
            <p className="max-w-[52ch] text-[15px] leading-[1.9] text-[var(--inv-text-soft)] [text-wrap:pretty]">
              {FIXED_WELCOME_BODY}
            </p>
            <div className="mt-7 flex items-center gap-4">
              <span aria-hidden="true" className="h-px w-12 bg-[var(--inv-accent-border-strong)]" />
              <span className="inline-flex h-6 w-6">
                <Flor kind="bugambilia" />
              </span>
              <span className="font-inv-display text-2xl text-[var(--inv-text)]">
                {names.join(" & ")}
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function DateCard({ dateParts, time, place }) {
  return (
    <div className="relative h-full border border-[var(--inv-accent-border-strong)] bg-[var(--inv-surface)] px-7 py-9 text-center shadow-[0_18px_40px_-30px_rgba(50,35,20,0.4)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 border border-[var(--inv-accent-border)]"
      />
      <div className="relative">
        <p className="text-[9px] font-semibold uppercase tracking-[0.32em] text-[var(--inv-text-muted)]">
          {dateParts?.weekday || "Fecha"}
        </p>

        {dateParts ? (
          <>
            <p className="mt-3 font-inv-display text-[104px] font-light leading-[0.78] text-[var(--inv-text)] md:text-[116px]">
              {dateParts.day}
            </p>
            <p className="mt-4 font-inv-display text-3xl uppercase tracking-[0.16em] text-[var(--inv-text)]">
              {dateParts.month}
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.34em] text-[var(--inv-text-muted)]">
              {dateParts.year}
            </p>
          </>
        ) : (
          <p className="mt-6 font-inv-display text-3xl text-[var(--inv-text)]">
            Próximamente
          </p>
        )}

        <div className="my-6 flex justify-center">
          <FlowerRule kind="dalia" />
        </div>

        {time && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--inv-text-muted)]">
              Hora
            </span>
            <span className="font-inv-display text-3xl leading-none tabular-nums text-[var(--inv-text)]">
              {time}
            </span>
          </div>
        )}

        {place && (
          <p className="mt-4 text-sm leading-[1.65] text-[var(--inv-text-soft)]">{place}</p>
        )}
      </div>
    </div>
  );
}

function LocationCard({ item, index, labels }) {
  const label = String(item.label || "").trim();
  const place = String(item.place || "").trim();
  const kicker = locationKicker(label, index, labels);
  const heading = label || kicker || "Ubicación";
  const showKicker = Boolean(label);
  const linkUrl = safeHttpUrl(item.url) || (place ? mapsSearchUrl(place) : "");

  return (
    <Reveal
      delay={index * 0.06}
      className="relative border border-[var(--inv-accent-border)] bg-[var(--inv-surface)] p-6 text-left"
    >
      {showKicker && (
        <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--inv-text-muted)]">
          {kicker}
        </p>
      )}
      <h3 className="mt-2 font-inv-display text-[clamp(26px,3vw,34px)] font-normal leading-tight text-[var(--inv-text)]">
        {heading}
      </h3>
      {place && (
        <p className="mt-2 text-sm leading-[1.7] text-[var(--inv-text-soft)]">{place}</p>
      )}
      {linkUrl && (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 border-b border-[var(--inv-text)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--inv-text)] transition-colors hover:text-[var(--inv-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9]"
        >
          Cómo llegar
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </a>
      )}
    </Reveal>
  );
}

function DressPanel({ labels, note, themeLabels }) {
  return (
    <Reveal className="border border-[var(--inv-accent-border)] bg-[var(--inv-bg-alt)] p-6 text-left md:p-7">
      <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--inv-text-muted)]">
        {themeLabels.dressCodeEyebrow || "Código de vestimenta"}
      </p>
      {labels.length > 0 && (
        <p className="mt-2 font-inv-display text-[clamp(26px,3vw,38px)] font-normal leading-[1.12] text-[var(--inv-text)] [text-wrap:balance]">
          {labels.join(" · ")}
        </p>
      )}
      {note && (
        <p className="mt-4 border-t border-[var(--inv-accent-border)] pt-4 font-inv-display text-lg italic leading-[1.55] text-[var(--inv-text-muted)]">
          {note}
        </p>
      )}
    </Reveal>
  );
}

function DayProgram({ items, themeLabels }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-14">
      <div className="flex flex-wrap items-center gap-4">
        <h3 className="font-inv-display text-2xl font-normal text-[var(--inv-text)]">
          El programa
        </h3>
        <span
          aria-hidden="true"
          className="h-px min-w-10 flex-1 bg-[var(--inv-accent-border-strong)]"
        />
        <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--inv-text-muted)]">
          {themeLabels.itineraryEyebrow || "Itinerario del día"}
        </span>
      </div>

      <ol className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <li
            key={`${item.label || item.time || index}-${index}`}
            className="border-t border-[var(--inv-accent-border-strong)] pt-4"
          >
            <div className="flex items-center justify-between gap-3">
              {item.time ? (
                <span className="font-inv-display text-3xl leading-none tabular-nums text-[var(--inv-text)]">
                  {item.time}
                </span>
              ) : (
                <span aria-hidden="true" className="h-7" />
              )}
              <span aria-hidden="true" className="inline-flex h-6 w-6 flex-none">
                <Flor kind={PROGRAM_FLOWERS[index % PROGRAM_FLOWERS.length]} />
              </span>
            </div>
            {item.label && (
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--inv-text)]">
                {item.label}
              </p>
            )}
            {item.place && (
              <p className="mt-1 text-sm leading-snug text-[var(--inv-text-muted)]">
                {item.place}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function BigDay({
  dateParts,
  time,
  place,
  locations,
  dressLabels,
  dressNote,
  itinerary,
}) {
  const hasDateCard = Boolean(dateParts || time || place);
  const hasAny =
    hasDateCard ||
    locations.length > 0 ||
    dressLabels.length > 0 ||
    dressNote ||
    itinerary.length > 0;

  if (!hasAny) return null;

  const labels = THEME.labels;

  return (
    <section
      id="el-gran-dia"
      aria-labelledby="el-gran-dia-title"
      className="scroll-mt-8 bg-[var(--inv-bg-alt2)] px-5 py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading
          index="02"
          kicker="Cuándo y dónde"
          title="El gran día"
          titleId="el-gran-dia-title"
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12">
          {hasDateCard && (
            <Reveal>
              <DateCard dateParts={dateParts} time={time} place={place} />
            </Reveal>
          )}

          <div className={`flex flex-col gap-5 ${hasDateCard ? "" : "lg:col-span-2"}`}>
            {locations.length > 0 && (
              <div className={`grid gap-5 ${locations.length > 1 ? "sm:grid-cols-2" : ""}`}>
                {locations.map((item, index) => (
                  <LocationCard
                    key={`${item.label || item.place || "ubicacion"}-${index}`}
                    item={item}
                    index={index}
                    labels={labels}
                  />
                ))}
              </div>
            )}

            {(dressLabels.length > 0 || dressNote) && (
              <DressPanel
                labels={dressLabels}
                note={dressNote}
                themeLabels={labels}
              />
            )}
          </div>
        </div>

        <DayProgram items={itinerary} themeLabels={labels} />
      </div>
    </section>
  );
}

function Story({ names, text, photo }) {
  return (
    <section
      id="nuestra-historia"
      aria-labelledby="nuestra-historia-title"
      className="scroll-mt-8 px-5 py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading
          index="03"
          kicker={THEME.labels.closingQuote || "Dos ciudades, un mismo camino"}
          title={THEME.labels.storyEyebrow || "Nuestra historia"}
          titleId="nuestra-historia-title"
        />

        <div
          className={`mt-12 grid gap-10 ${
            photo ? "lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-16" : ""
          }`}
        >
          {photo && (
            <Reveal className="relative mx-auto w-full max-w-[430px]">
              <div
                aria-hidden="true"
                className="absolute -inset-2 border border-[var(--inv-accent-border-strong)]"
              />
              <div className="relative rotate-[-1.2deg] bg-[#FFFDF9] p-2.5 shadow-[0_16px_32px_-22px_rgba(40,30,20,0.45)]">
                <img
                  src={photo}
                  alt={`${names.join(" y ")} · Nuestra historia`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="aspect-[4/5] w-full object-cover [filter:grayscale(1)_contrast(1.03)]"
                />
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-5 -top-6 h-16 w-16"
              >
                <Flor kind="bugambilia" />
              </div>
            </Reveal>
          )}

          <Reveal delay={0.08}>
            <p className="drop-cap max-w-[64ch] whitespace-pre-line text-[17px] leading-[1.95] text-[var(--inv-text-soft)] [text-wrap:pretty]">
              {text}
            </p>
            <div className="mt-8 flex items-center gap-4">
              <span aria-hidden="true" className="h-px w-12 bg-[var(--inv-accent-border-strong)]" />
              <span className="inline-flex h-6 w-6">
                <Flor kind="granado" />
              </span>
              <span className="font-inv-display text-2xl text-[var(--inv-text)]">
                {names.join(" & ")}
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ArrowUpRight({ className = "" }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      className={className}
      focusable="false"
    >
      <path
        d="M4 12 12 4M5.5 4H12v6.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StayPhoto({ photo, monthYear, place }) {
  const reduced = useReducedMotion();
  const hasPhoto = Boolean(photo);

  return (
    <motion.figure
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.012 }}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
      className="relative h-[380px] overflow-hidden bg-[var(--inv-bg-alt)] sm:h-[460px] lg:h-full lg:min-h-[720px]"
    >
      {hasPhoto ? (
        <>
          <motion.img
            src={photo}
            alt={`Atmósfera de ${place || "Granada"}`}
            loading="lazy"
            decoding="async"
            draggable={false}
            initial={reduced ? false : { scale: 1.05 }}
            whileInView={reduced ? undefined : { scale: 1 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={
              reduced ? undefined : { duration: 1.5, ease: [0.22, 1, 0.36, 1] }
            }
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: "grayscale(1) contrast(1.06) sepia(0.12)" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(28,27,25,0.18) 0%, rgba(28,27,25,0.02) 40%, rgba(28,27,25,0.62) 100%)",
            }}
          />
        </>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 30% 20%, rgba(211,154,46,0.12), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(200,90,130,0.08), transparent 50%)",
            }}
          />
          <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
            <div className="h-40 w-40 opacity-90 sm:h-52 sm:w-52 lg:h-64 lg:w-64">
              <Flor kind="dalia" />
            </div>
          </div>
        </>
      )}

      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-4 border ${
          hasPhoto
            ? "border-[rgba(250,247,242,0.32)]"
            : "border-[var(--inv-accent-border)]"
        }`}
      />

      <figcaption
        className={`absolute inset-x-4 bottom-4 z-10 flex items-end justify-between gap-4 border-t px-1 pt-3 sm:inset-x-6 sm:bottom-6 lg:inset-x-8 lg:bottom-8 ${
          hasPhoto
            ? "border-[rgba(250,247,242,0.45)] text-[#FAF7F2]"
            : "border-[var(--inv-accent-border-strong)] text-[var(--inv-text)]"
        }`}
      >
        <span className="text-[9px] font-medium uppercase tracking-[0.28em]">
          Granada · Andalucía
        </span>
        {monthYear && (
          <span className="font-inv-display text-base italic leading-none sm:text-lg">
            {monthYear}
          </span>
        )}
      </figcaption>
    </motion.figure>
  );
}

function tripPlaceLabels(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => (item && typeof item === "object" ? item.label : ""))
    .map((label) => String(label || "").trim())
    .filter(Boolean);
}

function hasTripContent(trip) {
  if (!trip || typeof trip !== "object" || !trip.enabled) return false;
  const modes = trip.modes && typeof trip.modes === "object" ? trip.modes : {};
  return Boolean(
    String(trip.intro || "").trim() ||
      (Array.isArray(trip.origins) && trip.origins.length > 0) ||
      (Array.isArray(trip.arrivals) && trip.arrivals.length > 0) ||
      Object.values(modes).some(
        (mode) =>
          mode &&
          mode.enabled &&
          (String(mode.note || "").trim() ||
            (Array.isArray(mode.providers) && mode.providers.length > 0))
      )
  );
}

function TravelEditorial({ trip, monthYear, place }) {
  const origins = tripPlaceLabels(trip?.origins);
  const arrivals = tripPlaceLabels(trip?.arrivals);
  const hasIntro = Boolean(String(trip?.intro || "").trim());
  const originLine = origins.join(" · ");
  const arrivalLine = arrivals.join(" · ");
  const modeCount = ["flight", "train", "bus"].filter(
    (key) => trip?.modes?.[key]?.enabled
  ).length;
  const waysTitle =
    modeCount === 1
      ? "Una forma de llegar"
      : modeCount === 2
        ? "Dos formas de llegar"
        : modeCount === 3
          ? "Tres formas de llegar"
          : "Cómo llegar";

  return (
    <Reveal className="relative border border-[var(--inv-accent-border-strong)] bg-[var(--inv-surface)] p-6 md:p-8">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 border border-[var(--inv-accent-border)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -top-5 h-14 w-14 opacity-90"
      >
        <Flor kind="granado" />
      </span>

      <div className="relative">
        <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--inv-text-muted)]">
          El trayecto
        </p>
        <p className="mt-4 font-inv-display text-[clamp(30px,3.6vw,48px)] font-light leading-[1.08] text-[var(--inv-text)] [text-wrap:balance]">
          {waysTitle}
        </p>
        {!hasIntro && (
          <p className="mt-4 max-w-[40ch] text-[14px] leading-[1.8] text-[var(--inv-text-soft)]">
            Vuelo, tren o autobús. Elige tu ciudad de salida y ajusta las fechas:
            los enlaces se abren con los datos listos para consultar.
          </p>
        )}

        <dl className="mt-7 divide-y divide-[var(--inv-accent-border)] border-t border-[var(--inv-accent-border-strong)]">
          {originLine && (
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <dt className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--inv-text-muted)]">
                Origen
              </dt>
              <dd className="m-0 text-[13px] leading-[1.6] text-[var(--inv-text)] sm:text-right">
                {originLine}
              </dd>
            </div>
          )}
          {arrivalLine && (
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <dt className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--inv-text-muted)]">
                Destino
              </dt>
              <dd className="m-0 text-[13px] leading-[1.6] text-[var(--inv-text)] sm:text-right">
                {arrivalLine}
              </dd>
            </div>
          )}
          {monthYear && (
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <dt className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--inv-text-muted)]">
                Fechas
              </dt>
              <dd className="m-0 text-[13px] leading-[1.6] text-[var(--inv-text)] sm:text-right">
                {monthYear}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-7 flex items-center gap-3 border-t border-[var(--inv-accent-border)] pt-4">
          <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--inv-text-muted)]">
            {place || "Granada"}
          </span>
          <span aria-hidden="true" className="h-px flex-1 bg-[var(--inv-accent-border)]" />
          <span aria-hidden="true" className="inline-flex h-5 w-5 flex-none">
            <Flor kind="bugambilia" />
          </span>
        </div>
      </div>
    </Reveal>
  );
}

function TravelSection({ cfg, monthYear, place }) {
  const trip = cfg?.trip && typeof cfg.trip === "object" ? cfg.trip : {};

  if (!trip.enabled) return null;

  return (
    <section
      id="viaje"
      aria-labelledby="viaje-title"
      className="scroll-mt-8 bg-[var(--inv-bg-alt)] px-5 py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading
          index="04"
          kicker="Para quienes vienen de lejos"
          title="Viaje"
          titleId="viaje-title"
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-14">
          <TravelEditorial trip={trip} monthYear={monthYear} place={place} />
          <Travel cfg={cfg} theme={THEME} variant="cover" />
        </div>
      </div>
    </section>
  );
}

function StaySection({ cfg, photo, monthYear, place, contacts }) {
  const stay = cfg?.stay && typeof cfg.stay === "object" ? cfg.stay : {};

  if (!stay.enabled) return null;

  const contactAction = firstContactAction(contacts);
  const stayIntro = String(stay.intro || "").trim();

  return (
    <section
      id="hospedaje"
      aria-labelledby="hospedaje-title"
      className="scroll-mt-8 overflow-hidden bg-[var(--inv-bg-alt2)]"
    >
      <div className="grid lg:grid-cols-2">
        <StayPhoto photo={photo} monthYear={monthYear} place={place} />

        <div className="border-[var(--inv-accent-border-strong)] px-5 py-16 md:px-8 md:py-20 lg:flex lg:items-center lg:border-l lg:px-10 lg:py-16 xl:px-16">
          <div className="mx-auto w-full max-w-[620px]">
            <Reveal>
              <SectionHeading
                index="05"
                kicker="La estancia"
                title="Hospedaje"
                titleId="hospedaje-title"
              />
              {!stayIntro && (
                <p className="mt-5 max-w-[48ch] text-[15px] leading-[1.9] text-[var(--inv-text-soft)] [text-wrap:pretty]">
                  Granada se disfruta sin prisa. Hemos preparado una selección de
                  plataformas para que la estancia sea parte de estos días.
                </p>
              )}
            </Reveal>

            <div className="mt-8">
              <Stay cfg={cfg} theme={THEME} variant="cover" />
            </div>

            {contactAction && (
              <div className="mt-8 border-t border-[var(--inv-accent-border-strong)] pt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[14px] leading-[1.7] text-[var(--inv-text-soft)]">
                    ¿Necesitas ayuda con tu reserva?
                  </p>
                  <a
                    href={contactAction.href}
                    target={contactAction.external ? "_blank" : undefined}
                    rel={contactAction.external ? "noopener noreferrer" : undefined}
                    aria-label={`${contactAction.label}${
                      contactAction.name ? ` a ${contactAction.name}` : ""
                    }${contactAction.external ? " (se abre en una nueva pestaña)" : ""}`}
                    className="inline-flex min-h-[44px] items-center gap-2 border-b border-[var(--inv-accent-border-strong)] text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--inv-text)] transition-colors hover:border-[var(--inv-text)] hover:text-[var(--inv-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--inv-bg-alt2)]"
                  >
                    {contactAction.kind === "phone" ? "Llámanos" : "Escríbenos"}
                    <ArrowUpRight className="h-3.5 w-3.5 flex-none" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactRow({ contact }) {
  const name = String(contact.name || "").trim();
  const phone = String(contact.phone || "").trim();
  const email = String(contact.email || "").trim();
  const call = telHref(phone);
  const whatsapp = whatsappHref(phone);
  const mail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : "";

  const actionClass =
    "inline-flex min-h-[40px] items-center border border-[rgba(250,247,242,0.35)] px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#FAF7F2] transition-colors hover:bg-[rgba(250,247,242,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAF7F2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1B19]";

  if (!name && !phone && !email) return null;

  return (
    <li className="mt-4 border-t border-[rgba(250,247,242,0.16)] pt-4 first:mt-3 first:border-t-0 first:pt-0">
      {name && (
        <p className="font-inv-display text-xl leading-tight text-[#FAF7F2]">{name}</p>
      )}
      {phone && <p className="mt-0.5 text-xs tracking-[0.04em] text-[#CFC7BA]">{phone}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {call && <a href={call} className={actionClass} aria-label={`Llamar a ${name || "contacto"}`}>Llamar</a>}
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={actionClass}
            aria-label={`Escribir por WhatsApp a ${name || "contacto"}`}
          >
            WhatsApp
          </a>
        )}
        {mail && <a href={mail} className={actionClass} aria-label={`Escribir por correo a ${name || "contacto"}`}>Correo</a>}
      </div>
    </li>
  );
}

function InvitationAccess({ contacts }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const contactNote = String(contacts.note || "").trim();
  const items = contacts.items;
  const noteEmail = firstEmail(contactNote);

  const handleSubmit = (event) => {
    event.preventDefault();
    const token = extractInvitationToken(value);
    if (!token) {
      setError(
        "No reconocimos el enlace. Pega el enlace completo que recibiste por WhatsApp o el código de tu invitación."
      );
      inputRef.current?.focus();
      return;
    }
    setError("");
    navigate(`/invitacion/${encodeURIComponent(token)}`);
  };

  return (
    <section
      id="tu-invitacion"
      aria-labelledby="tu-invitacion-title"
      className="scroll-mt-8 px-5 py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="relative overflow-hidden bg-[#1C1B19] px-6 py-12 text-[#FAF7F2] md:px-12 md:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 opacity-75"
          >
            <Flor kind="dalia" />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-12 -left-10 h-40 w-40 opacity-60"
          >
            <Flor kind="granado" />
          </div>

          <div className="relative grid gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#CFC7BA]">
                Acceso personal
              </p>
              <h2
                id="tu-invitacion-title"
                className="mt-4 font-inv-display text-[clamp(38px,5.2vw,60px)] font-normal leading-[1.04] text-[#FAF7F2]"
              >
                Tu invitación
              </h2>
              <p className="mt-5 max-w-[50ch] text-[15px] leading-[1.85] text-[#E6DFD3]">
                {INVITATION_HELP}
              </p>

              <div className="mt-8 border-t border-[rgba(250,247,242,0.2)] pt-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#CFC7BA]">
                  ¿Necesitas ayuda?
                </p>
                {contactNote && (
                  <p className="mt-2 max-w-[46ch] whitespace-pre-line text-sm leading-[1.7] text-[#E6DFD3]">
                    {contactNote}
                  </p>
                )}

                {items.length > 0 ? (
                  <ul className="mt-3">
                    {items.map((contact, index) => (
                      <ContactRow
                        key={`${contact.name || contact.phone || "contacto"}-${index}`}
                        contact={contact}
                      />
                    ))}
                  </ul>
                ) : noteEmail ? (
                  <a
                    href={`mailto:${noteEmail}`}
                    className="mt-4 inline-flex min-h-[44px] items-center border-b border-[#FAF7F2] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FAF7F2] transition-colors hover:text-[#CFC7BA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAF7F2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1B19]"
                  >
                    Escribir por correo
                  </a>
                ) : null}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="relative bg-[#FAF7F2] px-6 py-8 text-[#1C1B19] shadow-[0_18px_42px_-24px_rgba(0,0,0,0.55)] md:px-8"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-2 border border-[#DCD2C2]"
              />
              <div className="relative">
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#6B6660]">
                  Abrir invitación
                </p>
                <label
                  htmlFor="cover-invite"
                  className="mt-4 block font-inv-display text-2xl font-normal leading-tight text-[#1C1B19]"
                >
                  Pega tu enlace o código
                </label>
                <p id="cover-invite-help" className="mt-2 text-sm leading-[1.65] text-[#6B6660]">
                  Puedes pegar el enlace completo o solo la última parte que aparece después de
                  <span className="whitespace-nowrap"> /invitacion/</span>.
                </p>

                <input
                  id="cover-invite"
                  ref={inputRef}
                  type="text"
                  name="invitation"
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value);
                    if (error) setError("");
                  }}
                  inputMode="url"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={error ? "true" : undefined}
                  aria-describedby={
                    error ? "cover-invite-help cover-invite-error" : "cover-invite-help"
                  }
                  placeholder="Enlace o código de invitación"
                  className="mt-5 min-h-[52px] w-full border border-[#CFC7BA] bg-[#FFFDF9] px-4 py-3 text-[15px] text-[#1C1B19] outline-none transition-colors placeholder:text-[#8C857B] focus-visible:border-[#1C1B19] focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F2] aria-invalid:border-[#8F2D1F]"
                />

                {error && (
                  <p
                    id="cover-invite-error"
                    role="alert"
                    className="mt-2 text-sm font-medium leading-[1.5] text-[#8F2D1F]"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center border border-[#1C1B19] bg-[#1C1B19] px-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#FAF7F2] transition-colors hover:bg-[#3A3733] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F2]"
                >
                  Abrir mi invitación
                </button>

                <p className="mt-4 text-xs leading-[1.65] text-[#6B6660]">
                  Aquí no se confirma asistencia: la confirmación se realiza dentro de tu
                  invitación personal. No compartas tu enlace.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function CoverFooter({ names, dateLine, place }) {
  return (
    <footer className="border-t border-[var(--inv-accent-border)] bg-[var(--inv-bg-alt)] px-5 py-14 md:px-8">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-5 text-center">
        <div className="relative h-[108px] w-[108px]">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-[var(--inv-accent-border-strong)]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-2 grid place-items-center rounded-full border border-[var(--inv-accent-border)] font-inv-display text-[28px] font-light text-[var(--inv-text)]"
          >
            {monogramOf(names)}
          </span>
          <span
            aria-hidden="true"
            className="absolute -bottom-6 -left-8 h-14 w-14"
          >
            <Flor kind="bugambilia" />
          </span>
          <span
            aria-hidden="true"
            className="absolute -right-8 -top-5 h-14 w-14"
          >
            <Flor kind="dalia" />
          </span>
        </div>

        <p className="font-inv-display text-3xl font-light text-[var(--inv-text)]">
          {names.join(" & ")}
        </p>
        {dateLine && (
          <p className="text-[9px] font-medium uppercase tracking-[0.32em] text-[var(--inv-text-muted)]">
            {dateLine}
            {place ? ` · ${place}` : ""}
          </p>
        )}
        <span aria-hidden="true" className="h-px w-16 bg-[var(--inv-accent-border-strong)]" />
      </div>
    </footer>
  );
}

function CoverStatus({ children }) {
  return (
    <div
      style={THEME.vars}
      className="relative isolate grid min-h-[100svh] place-items-center overflow-hidden bg-[var(--inv-bg)] px-6 font-inv-body text-[var(--inv-text)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, var(--inv-radial-a), transparent 45%), radial-gradient(ellipse at 85% 85%, var(--inv-radial-b), transparent 40%)",
        }}
      />
      <div className="relative w-full max-w-md border border-[var(--inv-accent-border-strong)] bg-[var(--inv-surface)] px-8 py-12 text-center shadow-[0_20px_50px_-30px_rgba(50,35,20,0.45)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-3 border border-[var(--inv-accent-border)]"
        />
        <div className="relative">{children}</div>
      </div>
      <GrainOverlay />
    </div>
  );
}

function LoadingState() {
  const reduced = useReducedMotion();
  return (
    <CoverStatus>
      <motion.div
        className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-[var(--inv-accent-border-strong)] font-inv-display text-3xl font-light text-[var(--inv-text)]"
        animate={reduced ? undefined : { opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {monogramOf(FALLBACK_NAMES)}
      </motion.div>
      <div className="mt-7 flex justify-center">
        <FlowerRule kind="bugambilia" />
      </div>
      <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.34em] text-[var(--inv-text-muted)]">
        Preparando la portada…
      </p>
    </CoverStatus>
  );
}

function ErrorState({ onRetry }) {
  return (
    <CoverStatus>
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[var(--inv-accent-border-strong)] font-inv-display text-2xl text-[var(--inv-text)]">
        !
      </div>
      <h1 className="mt-5 font-inv-display text-3xl font-normal text-[var(--inv-text)]">
        No pudimos cargar la portada
      </h1>
      <p className="mt-3 text-sm leading-[1.7] text-[var(--inv-text-soft)]">
        Revisa tu conexión e inténtalo de nuevo. Si llegaste desde un enlace de invitación,
        ábrelo tal como lo recibiste.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex min-h-[48px] items-center justify-center border border-[#1C1B19] bg-[#1C1B19] px-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#FAF7F2] transition-colors hover:bg-[#3A3733] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9]"
      >
        Volver a intentar
      </button>
    </CoverStatus>
  );
}

/* ------------------------------------------------------------------
   Página
------------------------------------------------------------------ */

export default function MacarenaJorgeCover() {
  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus("loading");

    api.public
      .event()
      .then((payload) => {
        if (!alive) return;
        if (!payload || !payload.event) {
          throw new Error("La respuesta pública no incluye el evento.");
        }
        setData(payload);
        setStatus("ready");
      })
      .catch(() => {
        if (!alive) return;
        setData(null);
        setStatus("error");
      });

    return () => {
      alive = false;
    };
  }, [attempt]);

  const event = data?.event || null;
  const cfg = event?.invitation && typeof event.invitation === "object" ? event.invitation : {};

  const coupleNames = displayNames(cfg);
  const parsedNames = parseEventNames(event?.name);
  const names =
    coupleNames.length > 0 ? coupleNames : parsedNames.length > 0 ? parsedNames : FALLBACK_NAMES;
  const pageName = names.join(" & ");

  useDocumentTitle(`${pageName} · Nuestra boda`);
  useSmoothCoverScroll();

  if (status === "loading") return <LoadingState />;
  if (status === "error" || !event) {
    return <ErrorState onRetry={() => setAttempt((value) => value + 1)} />;
  }

  const dateParts = parseEventDate(event.date);
  const dateLine = longDateLine(dateParts);
  const monthYear = monthYearLine(dateParts);
  const time = prettyTime(event.time);
  const place = String(event.place || "").trim();

  const gallery = (Array.isArray(cfg.gallery) ? cfg.gallery : [])
    .map(safeImageSrc)
    .filter(Boolean);
  const heroImage = safeImageSrc(cfg.hero_image) || gallery[0] || "";
  const storyImage = gallery.find((src) => src !== heroImage) || gallery[0] || "";
  const stayImage =
    gallery.find((src) => src !== heroImage && src !== storyImage) ||
    gallery[1] ||
    gallery[0] ||
    heroImage ||
    "";

  const locations = (Array.isArray(cfg.locations) ? cfg.locations : []).filter(
    (item) => item && (String(item.label || "").trim() || String(item.place || "").trim())
  );

  const dressLabels = dressCodeLabels(cfg.dress_code);
  const dressNote = String(cfg.dress_note || "").trim();

  const itinerary = (Array.isArray(cfg.itinerary) ? cfg.itinerary : [])
    .filter(
      (item) =>
        item &&
        (String(item.label || "").trim() || String(item.time || "").trim())
    )
    .map((item) => {
      const label = String(item.label || "").trim();
      const match = locations.find(
        (location) =>
          String(location.label || "").trim().toLowerCase() === label.toLowerCase()
      );
      return {
        label,
        time: prettyTime(item.time),
        place: match ? String(match.place || "").trim() : "",
      };
    });

  const storyText =
    String(cfg.story || "").trim() || String(cfg.message || "").trim();

  // Viaje y Hospedaje son secciones independientes (contrato `trip`/`stay`).
  // Los campos antiguos de hospedaje y viaje ya no se renderizan.
  const showTrip = hasTripContent(cfg.trip);
  const showStay = Boolean(
    cfg.stay && typeof cfg.stay === "object" && cfg.stay.enabled
  );

  const contacts = (Array.isArray(cfg.contacts) ? cfg.contacts : []).filter(
    (contact) =>
      contact &&
      (String(contact.name || "").trim() ||
        String(contact.phone || "").trim() ||
        String(contact.email || "").trim())
  );

  const countdownTarget = (() => {
    if (!event.date) return null;
    const raw = String(event.date).trim();
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? `${raw}T${String(event.time || "00:00:00").trim() || "00:00:00"}`
      : raw;
    const timestamp = new Date(iso).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  })();

  return (
    <div
      style={THEME.vars}
      className="relative isolate min-h-screen overflow-x-clip bg-[var(--inv-bg)] font-inv-body text-[var(--inv-text)]"
    >
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:bg-[#1C1B19] focus:px-4 focus:py-3 focus:text-sm focus:text-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#FAF7F2] focus:ring-offset-2 focus:ring-offset-[#1C1B19]"
      >
        Saltar al contenido
      </a>

      <main id="contenido">
        <Hero
          names={names}
          dateLine={dateLine}
          time={time}
          place={place}
          heroImage={heroImage}
          dateParts={dateParts}
          countdownTarget={countdownTarget}
        />

        <Welcome names={names} />

        <BigDay
          dateParts={dateParts}
          time={time}
          place={place}
          locations={locations}
          dressLabels={dressLabels}
          dressNote={dressNote}
          itinerary={itinerary}
        />

        {storyText && <Story names={names} text={storyText} photo={storyImage} />}

        {showTrip && (
          <TravelSection cfg={cfg} monthYear={monthYear} place={place} />
        )}

        {showStay && (
          <StaySection
            cfg={cfg}
            photo={stayImage}
            monthYear={monthYear}
            place={place}
            contacts={contacts}
          />
        )}

        <InvitationAccess contacts={{ items: contacts, note: cfg.contact_note }} />
      </main>

      <CoverFooter names={names} dateLine={dateLine} place={place} />

      <GrainOverlay />
    </div>
  );
}
