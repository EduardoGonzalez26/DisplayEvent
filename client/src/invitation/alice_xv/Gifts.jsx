import { useState } from "react";
import { motion, useReducedMotion, EASE, Reveal } from "../motion.jsx";
import { GoldFrame, WeddingSectionTitle } from "./decor.jsx";

/* ------------------------------------------------------------------
   Mesa de Regalos (registry) — versión LOCAL de la plantilla
   "XV de Alice".

   Sección informativa: sin pago en línea, sin modal y sin interacción.
   Dos bloques dentro de la misma sección:

     1. OPCIONES DE REGALO — 2 tarjetas premium ("Regalo sorpresa" y
        "Lluvia de sobres") con el mismo lenguaje de tarjeta de
        Padrinos.jsx: borde dorado, filete interior, hairline superior
        con diamante y hover con elevación (respeta reduced-motion).
        La ilustración va centrada en un MEDALLÓN EN ARCO (motivo
        clásico de invitación) con doble filete fino y fondo radial
        rosa; debajo, un divisor fino y el título.
     2. TRANSFERENCIA / DEPÓSITO — card INDEPENDIENTE debajo (pedido
        explícito del cliente: "la tarjeta del depósito, déjala
        aparte"): marco GoldFrame accent con el mismo medallón en arco
        (versión menor), la nota serif y los datos bancarios con
        jerarquía etiqueta/valor en dorado profundo (legible AA).

   Ilustraciones: YA vienen incluidas como SVG por defecto en
   `client/public/mesa-regalos/` (regalo-sorpresa.svg,
   lluvia-de-sobres.svg, transferencia.svg). Si el cliente quiere
   reemplazarlas, basta copiar un archivo con el mismo nombre base y
   extensión raster (.png/.webp/.jpg/.jpeg): el raster SIEMPRE tiene
   prioridad sobre nuestro SVG (ver README.txt de esa carpeta).

   `GiftImage` prueba las extensiones en orden por `onError` y, en el
   caso extremo de que no exista ni SVG ni raster, muestra un
   ornamento dorado dentro del medallón (nunca una imagen rota).

   Contrato de datos (cfg.registry, ya existente):
     { enabled, bank: { enabled, bank_name, holder, account_number,
       concept } }
   Mapeo del diseño: Banco → bank_name · TARJETA → account_number ·
   Beneficiaria → holder. `concept` no se muestra.
   ------------------------------------------------------------------ */

/* Textos de respaldo si el theme no los aporta (p. ej. una copia
   incompleta del theme de alice_xv). */
const FALLBACK = {
  eyebrow: "Regalos",
  title: "Mesa de Regalos",
  intro:
    "Para la Señorita su mayor deleite es su presencia en tan importante evento. Pero si gusta darle un detalle, puede obsequiarle:",
  surprise: "Regalo sorpresa",
  envelopes: "Lluvia de sobres",
  transfer: "Transferencia",
  transferNote: "También dejamos aquí los datos para una transferencia",
  bank: "Banco",
  card: "TARJETA",
  holder: "Beneficiaria",
};

/* ------------------------------------------------------------------
   Imágenes de la Mesa de Regalos: `client/public/mesa-regalos/`.
   Orden de extensiones: PRIMERO el raster del cliente
   (.png/.webp/.jpg/.jpeg) y AL FINAL nuestros SVG por defecto. Las
   URLs se construyen siempre desde `import.meta.env.BASE_URL` ("/" en
   dev y el `base` del build en producción); `GiftImage` resuelve la
   extensión real con `onError`.
------------------------------------------------------------------ */
const IMAGE_EXTENSIONS = ["png", "webp", "jpg", "jpeg", "svg"];

function imageCandidates(name) {
  return IMAGE_EXTENSIONS.map(
    (ext) => `${import.meta.env.BASE_URL}mesa-regalos/${name}.${ext}`
  );
}

const IMAGES = {
  surprise: imageCandidates("regalo-sorpresa"),
  envelopes: imageCandidates("lluvia-de-sobres"),
  transfer: imageCandidates("transferencia"),
};

/* Clase de la imagen dentro del medallón: ocupa todo el arco con un
   padding interno de ~14% (p-5) para que la ilustración respire. */
const IMG_CLASS = "relative h-full w-full object-contain p-5";

/* ------------------------------------------------------------------
   Medallón en arco: contenedor clásico de invitación (arco de medio
   punto con base recta redondeada), borde dorado, filete interior a
   ~6px y fondo radial rosa suave. Dimensiones fijas (`size` controla
   el ancho): el layout nunca salta.
------------------------------------------------------------------ */
function ArchMedallion({ urls, size = "", imgClassName = IMG_CLASS }) {
  return (
    <div className={`relative mx-auto ${size}`}>
      <div className="relative aspect-[4/5] rounded-t-full rounded-b-[1rem] border border-[var(--inv-primary)]/45 bg-[radial-gradient(circle_at_50%_35%,#FFFFFF_0%,var(--inv-ring)_60%,var(--inv-accent-border)_100%)]">
        {/* Filete interior fino, mismo radio */}
        <div
          className="pointer-events-none absolute inset-[6px] rounded-t-full rounded-b-[1rem] border border-[var(--inv-accent-yellow)]/40"
          aria-hidden="true"
        />
        <GiftImage urls={urls} className={imgClassName} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Respaldo elegante (caso extremo: no existe ni SVG ni raster): se
   dibuja DENTRO del arco, sin marco propio (el medallón ya lo aporta),
   con un ornamento dorado de diamante, destellos y florituras.
   Decorativo (aria-hidden).
------------------------------------------------------------------ */
function ImageFallback({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex items-center justify-center ${className}`}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[46%] w-[46%] text-[var(--inv-primary)]"
      >
        <rect
          x="26.5"
          y="26.5"
          width="11"
          height="11"
          transform="rotate(45 32 32)"
          opacity="0.9"
        />
        <path d="M32 12 C 33 19, 33.4 22, 32 26.5" opacity="0.7" />
        <path d="M32 52 C 33 45, 33.4 42, 32 37.5" opacity="0.7" />
        <path d="M7 32 C 12 29.5, 17 29.5, 23 30.6" opacity="0.55" />
        <path d="M57 32 C 52 29.5, 47 29.5, 41 30.6" opacity="0.55" />
        <circle
          cx="21"
          cy="31.4"
          r="1.3"
          fill="currentColor"
          stroke="none"
          opacity="0.7"
        />
        <circle
          cx="43"
          cy="31.4"
          r="1.3"
          fill="currentColor"
          stroke="none"
          opacity="0.7"
        />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------
   Imagen con auto-fallback: recorre `urls` (una extensión por
   intento) en cada `onError`; si todas fallan, deja el ornamento. Las
   imágenes son decorativas: `alt=""` + `aria-hidden` (el título
   comunica).
------------------------------------------------------------------ */
function GiftImage({ urls, className = "" }) {
  const [index, setIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  if (exhausted || index >= urls.length) {
    return <ImageFallback className={className} />;
  }

  return (
    <img
      src={urls[index]}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      onError={() => {
        if (index < urls.length - 1) setIndex(index + 1);
        else setExhausted(true);
      }}
      className={className}
    />
  );
}

/* ------------------------------------------------------------------
   Tarjeta de opción de regalo: mismo acabado premium que `NameCard`
   de Padrinos.jsx (borde dorado, filete interior, hairline + diamante
   superior y hover con elevación). La ilustración va en medallón en
   arco; debajo, divisor fino (hairline + diamante pequeño) y título.
------------------------------------------------------------------ */
function GiftOptionCard({ title, urls, reduced }) {
  const variants = reduced
    ? {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.6, ease: EASE } },
      }
    : {
        hidden: { opacity: 0, y: 28 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, ease: EASE },
        },
      };

  return (
    <motion.li
      variants={variants}
      whileHover={
        reduced
          ? undefined
          : {
              y: -6,
              transition: { type: "spring", stiffness: 300, damping: 18 },
            }
      }
      className="group relative flex h-full flex-col items-center rounded-[1.6rem] border border-[var(--inv-primary)]/35 bg-[var(--inv-surface)] px-6 py-8 text-center shadow-[0_16px_40px_var(--inv-shadow-card)] transition-shadow duration-300 hover:shadow-[0_24px_60px_var(--inv-shadow-mid)] md:px-8 md:py-10"
    >
      {/* Filete interior fino dorado */}
      <div
        className="pointer-events-none absolute inset-[6px] rounded-[1.1rem] border border-[var(--inv-accent-yellow)]/45"
        aria-hidden="true"
      />
      {/* Hairline superior centrado + diamante */}
      <span
        className="absolute left-1/2 top-0 h-px w-14 -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--inv-primary)]/70 to-transparent"
        aria-hidden="true"
      />
      <svg
        viewBox="0 0 12 12"
        fill="currentColor"
        className="h-3 w-3 text-[var(--inv-primary)]/80"
        aria-hidden="true"
      >
        <path d="M6 0 8 6 6 12 4 6 6 0Z" />
      </svg>

      {/* Medallón en arco con la ilustración */}
      <ArchMedallion urls={urls} size="mt-5 w-36 md:w-40" />

      {/* Divisor fino: hairline + diamante pequeño */}
      <div
        className="mt-5 flex items-center justify-center gap-2.5"
        aria-hidden="true"
      >
        <span className="h-px w-10 bg-gradient-to-r from-transparent to-[var(--inv-accent-yellow)]/70" />
        <span className="h-1.5 w-1.5 rotate-45 bg-[var(--inv-accent-yellow)]/80" />
        <span className="h-px w-10 bg-gradient-to-l from-transparent to-[var(--inv-accent-yellow)]/70" />
      </div>

      <h3 className="mt-4 font-inv-heading text-lg leading-snug text-[var(--inv-text)] md:text-xl">
        {title}
      </h3>
    </motion.li>
  );
}

export default function Gifts({ cfg, theme }) {
  const registry = cfg?.registry;
  const reduced = useReducedMotion();

  // Mismo gating que la versión anterior: sin registry habilitado no
  // hay tarjeta en el Layout.
  if (!registry?.enabled) return null;

  const labels = theme?.labels || {};
  const bank = registry.bank || {};
  const bankLabels = labels.registryBankLabels || {};

  // Datos bancarios del diseño: Banco / TARJETA / Beneficiaria.
  // `concept` se ignora a propósito. Solo se muestran los campos llenos.
  const bankRows = [
    {
      key: "bank_name",
      label: bankLabels.bank || FALLBACK.bank,
      value: bank.bank_name,
    },
    {
      key: "account_number",
      label: bankLabels.card || FALLBACK.card,
      value: bank.account_number,
    },
    {
      key: "holder",
      label: bankLabels.holder || FALLBACK.holder,
      value: bank.holder,
    },
  ]
    .map((row) => ({ ...row, value: String(row.value ?? "").trim() }))
    .filter((row) => row.value !== "");

  const showBank = !!bank.enabled && bankRows.length > 0;

  return (
    <section className="relative overflow-hidden bg-inv-bg px-4 py-6 md:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-c),transparent_60%)]" />

      <div className="relative mx-auto max-w-3xl">
        <WeddingSectionTitle
          eyebrow={labels.registryEyebrow || FALLBACK.eyebrow}
          title={labels.registryTitle || FALLBACK.title}
          titleClassName="text-gold-gradient-deep"
          subtitle={labels.registryIntro || FALLBACK.intro}
        />

        {/* Bloque 1 — opciones de regalo (2 tarjetas premium) */}
        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: reduced ? 0 : 0.12 } },
          }}
          className="mx-auto mt-10 grid max-w-2xl gap-6 sm:grid-cols-2 md:mt-12 md:gap-8"
        >
          <GiftOptionCard
            title={labels.registryOptionSurprise || FALLBACK.surprise}
            urls={IMAGES.surprise}
            reduced={reduced}
          />
          <GiftOptionCard
            title={labels.registryOptionEnvelopes || FALLBACK.envelopes}
            urls={IMAGES.envelopes}
            reduced={reduced}
          />
        </motion.ul>

        {/* Bloque 2 — Transferencia / Depósito: card INDEPENDIENTE,
            separada de las opciones de regalo y con datos bancarios
            visibles solo si bank.enabled y hay campos. */}
        <Reveal delay={0.15}>
          <GoldFrame
            accent
            className="mx-auto mt-12 max-w-md rounded-[1.6rem] bg-[var(--inv-surface)] shadow-[0_18px_45px_var(--inv-shadow-card)] md:mt-16"
          >
            <div className="px-7 py-9 text-center md:px-9 md:py-11">
              {/* Mismo medallón en arco, versión menor */}
              <ArchMedallion urls={IMAGES.transfer} size="w-32 md:w-36" />

              <h3 className="mt-5 font-inv-heading text-lg leading-snug text-[var(--inv-text)] md:text-xl">
                {labels.registryOptionTransfer || FALLBACK.transfer}
              </h3>

              {showBank && (
                <>
                  <p className="mx-auto mt-3 max-w-xs font-inv-serif text-sm italic leading-relaxed text-[var(--inv-text-soft)] md:text-base">
                    {labels.registryTransferNote || FALLBACK.transferNote}
                  </p>

                  {/* Divisor ornamental fino (hairline + diamante) */}
                  <div
                    className="mx-auto my-5 flex items-center justify-center gap-2.5"
                    aria-hidden="true"
                  >
                    <span className="h-px w-14 bg-gradient-to-r from-transparent to-[var(--inv-accent-yellow)]/70 md:w-16" />
                    <span className="h-1.5 w-1.5 rotate-45 bg-[var(--inv-accent-yellow)]/80" />
                    <span className="h-px w-14 bg-gradient-to-l from-transparent to-[var(--inv-accent-yellow)]/70 md:w-16" />
                  </div>

                  {/* Datos bancarios: etiqueta + valor en dorado
                      profundo (contraste AA sobre blanco). Filas
                      separadas por hairlines; valores con
                      `break-words` para cadenas largas. */}
                  <dl className="mx-auto max-w-xs text-center">
                    {bankRows.map((row, i) => (
                      <div
                        key={row.key}
                        className={
                          i > 0
                            ? "border-t border-[var(--inv-accent-yellow)]/30 py-2.5"
                            : "py-2.5"
                        }
                      >
                        <dt className="font-inv-heading text-[0.62rem] uppercase tracking-[0.3em] text-[var(--inv-primary-deep)]">
                          {row.label}
                        </dt>
                        <dd className="mt-1 break-words font-inv-heading text-base font-medium text-[var(--inv-primary-deep)]">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </div>
          </GoldFrame>
        </Reveal>
      </div>
    </section>
  );
}
