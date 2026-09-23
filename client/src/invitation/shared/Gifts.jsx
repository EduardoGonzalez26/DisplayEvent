import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { loadStripe } from "@stripe/stripe-js";
import { api } from "../../api.js";
import { SectionTitle } from "./util.jsx";
import { EASE, Reveal } from "../motion.jsx";

/* ------------------------------------------------------------------
   Mesa de Regalos (registry) — sección pública.
   Renderiza SOLO si `cfg.registry.enabled`. Permite elegir moneda,
   montos sugeridos + monto libre, depósito bancario con copiado y
   pago con tarjeta vía Stripe Checkout EMBEBIDO (modal propio, sin
   salir de la invitación).
   ------------------------------------------------------------------ */

const CURRENCIES = {
  mxn: { symbol: "$", label: "MXN" },
  eur: { symbol: "€", label: "EUR" },
};

// Detecta moneda por locale + zona horaria. Devuelve "mxn" | "eur".
function detectCurrency() {
  const lang = (navigator.language || "").toLowerCase();
  if (lang.startsWith("es-mx") || lang.startsWith("es-419")) return "mxn";
  if (lang.startsWith("es-es") || lang.startsWith("ca")) return "eur";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz === "America/Mexico_City") return "mxn";
    if (tz === "Europe/Madrid") return "eur";
  } catch {
    /* noop */
  }
  return "mxn";
}

// `$2,000` para MXN, `€100` para EUR (enteros, separador de miles).
function formatAmount(currency, amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  return `${CURRENCIES[currency].symbol}${Math.round(n).toLocaleString("en-US")}`;
}

// Fallback de copiado para navegadores sin `navigator.clipboard`.
function legacyCopy(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* cae al fallback */
  }
  return legacyCopy(text);
}

/* Devuelve el inicializador del Checkout embebido de Stripe.js.
   Firma verificada en @stripe/stripe-js v5.10:
     stripe.initEmbeddedCheckout({ fetchClientSecret, onComplete })
   `fetchClientSecret: () => Promise<string>` recibe el client_secret de la
   Checkout Session (ui_mode: "embedded"). `appearance` NO forma parte de
   esta API: el esquema del runtime solo acepta `clientSecret`,
   `fetchClientSecret`, `onComplete`, `onLineItemsChange`,
   `onShippingDetailsChange` y `onAnalyticsEvent` (el tema del iframe se
   define en el Dashboard de Stripe); el diseño propio vive en el marco del
   modal. Stripe renombró el método a `createEmbeddedCheckoutPage` con la
   MISMA firma, así que se prefiere si el runtime ya lo expone. */
function resolveEmbeddedCheckoutInit(stripe) {
  const init = stripe.createEmbeddedCheckoutPage || stripe.initEmbeddedCheckout;
  if (typeof init !== "function") {
    throw new Error("No se pudo inicializar el pago.");
  }
  return init.bind(stripe);
}

export default function Gifts({ cfg, theme, token, publishableKey }) {
  const registry = cfg?.registry;
  const reduced = useReducedMotion();

  const [currency, setCurrency] = useState(() => detectCurrency());
  const [chipAmount, setChipAmount] = useState(null);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [status, setStatus] = useState(null); // "success" | "cancelled"
  const [copiedKey, setCopiedKey] = useState(null);
  // Checkout embebido: modal propio montado sobre el iframe de Stripe.
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [checkoutReady, setCheckoutReady] = useState(false); // iframe montado
  const [checkoutError, setCheckoutError] = useState("");
  const [paid, setPaid] = useState(false); // éxito embebido (sin recargar)
  const checkoutRef = useRef(null);
  const mountRef = useRef(null);

  // Lee `?payment=success` / `?payment=cancelled` al volver de Stripe.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("payment");
    if (p === "success") setStatus("success");
    else if (p === "cancelled") setStatus("cancelled");
  }, []);

  // Inicializa y monta el Checkout embebido cuando ya hay client_secret.
  // El cleanup destruye la instancia (no es re-montable) al cerrar el modal
  // o desmontar la sección.
  useEffect(() => {
    if (!checkoutOpen || !clientSecret) return undefined;
    let disposed = false;

    const destroyInstance = () => {
      if (!checkoutRef.current) return;
      try {
        checkoutRef.current.destroy();
      } catch {
        /* noop */
      }
      checkoutRef.current = null;
    };

    (async () => {
      try {
        const stripe = await loadStripe(publishableKey);
        if (!stripe) throw new Error("No se pudo inicializar el pago.");
        const checkout = await resolveEmbeddedCheckoutInit(stripe)({
          fetchClientSecret: async () => clientSecret,
          onComplete: () => {
            // Tarjeta completada sin redirección: cerramos la pasarela y
            // mostramos el estado de éxito propio dentro de la invitación.
            destroyInstance();
            setCheckoutReady(false);
            setPaying(false);
            setPaid(true);
          },
        });
        if (disposed) {
          checkout.destroy();
          return;
        }
        checkoutRef.current = checkout;
        checkout.mount(mountRef.current);
        setCheckoutReady(true);
        setPaying(false);
      } catch (err) {
        if (disposed) return;
        destroyInstance();
        setCheckoutError(err?.message || "No se pudo iniciar el pago.");
        setPaying(false); // el botón vuelve a habilitarse (reintento posible)
      }
    })();

    return () => {
      disposed = true;
      destroyInstance();
    };
  }, [checkoutOpen, clientSecret, publishableKey]);

  if (!registry?.enabled) return null;

  const suggested = registry[`suggested_${currency}`] || [];
  const min = registry[`min_${currency}`] || 0;
  const allowCustom = !!registry.allow_custom;
  const bank = registry.bank || {};
  const stripeReady = !!registry.stripe_enabled && !!publishableKey && !!token;
  // Payment Link externo: si está definido, el CTA de tarjeta abre ese link
  // (el invitado elige el monto en Stripe) y no se usan los selectores.
  const paymentLink = String(registry.payment_link_url || "").trim();
  const linkMode = !!registry.stripe_enabled && !!paymentLink;

  const activeAmount = custom !== "" ? Number(custom) : chipAmount;

  const selectCurrency = (c) => {
    setCurrency(c);
    setChipAmount(null);
    setCustom("");
    setError("");
  };

  const selectChip = (v) => {
    setChipAmount(v);
    setCustom("");
    setError("");
  };

  const onCustomChange = (v) => {
    setCustom(v);
    setChipAmount(null);
    setError("");
  };

  const doCopy = async (key, value) => {
    const ok = await copyToClipboard(String(value ?? ""));
    if (!ok) return;
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 2000);
  };

  const payWithCard = async () => {
    setError("");
    if (!Number.isFinite(activeAmount) || activeAmount <= 0) {
      setError("Selecciona un monto para continuar.");
      return;
    }
    if (activeAmount < min) {
      setError(`El monto mínimo es ${formatAmount(currency, min)}.`);
      return;
    }
    if (!stripeReady) {
      setError("El pago con tarjeta no está disponible en este momento.");
      return;
    }
    setPaying(true);
    setCheckoutError("");
    setPaid(false);
    try {
      // El backend crea la Checkout Session embebida y devuelve su client_secret.
      const { client_secret } = await api.invitations.payment(token, {
        currency,
        amount: Math.round(activeAmount),
      });
      if (!client_secret) throw new Error("No se pudo iniciar el pago.");
      setClientSecret(client_secret);
      setCheckoutOpen(true);
    } catch (err) {
      setError(err.message || "No se pudo iniciar el pago.");
      setPaying(false);
    }
  };

  // Cierra el modal: desmonta/destruye el Checkout y deja el botón listo.
  const closeCheckout = () => {
    setCheckoutOpen(false);
    setClientSecret(null);
    setCheckoutError("");
    setCheckoutReady(false);
    setPaying(false);
    if (paid) setStatus("success"); // el banner persistente confirma el pago
    setPaid(false);
  };

  // Reintento tras fallo de init/mount: descarta la sesión y arranca de cero.
  const retryCheckout = () => {
    setCheckoutError("");
    setCheckoutOpen(false);
    setClientSecret(null);
    payWithCard();
  };

  const bankFields = [
    { key: "bank_name", label: "Banco" },
    { key: "holder", label: "Titular" },
    { key: "account_number", label: "Cuenta / CLABE" },
    { key: "concept", label: "Concepto" },
  ].filter((f) => String(bank[f.key] ?? "").trim() !== "");

  const payAmountLabel =
    Number.isFinite(activeAmount) && activeAmount > 0
      ? formatAmount(currency, activeAmount)
      : "";

  return (
    <section className="py-24 px-4 bg-inv-bg-alt2">
      <div className="max-w-3xl mx-auto">
        <SectionTitle
          eyebrow={theme?.labels?.registryEyebrow || "Regalos"}
          title={theme?.labels?.registryTitle || "Mesa de Regalos"}
          subtitle="Si deseas honrarnos con un detalle, aquí tienes las opciones. ¡Gracias por tu cariño!"
        />

        {/* Aviso de resultado del pago (al volver de Stripe) */}
        <AnimatePresence>
          {status && (
            <motion.div
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className={`mb-8 rounded-2xl border px-6 py-5 text-center backdrop-blur ${
                status === "success"
                  ? "border-inv-accent-solid/60 bg-inv-surface"
                  : "border-inv-accent-border bg-inv-surface"
              }`}
            >
              <motion.div
                className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full text-xl ${
                  status === "success"
                    ? "bg-gradient-to-br from-inv-primary-light to-inv-primary-dark text-inv-on-accent"
                    : "bg-inv-bg text-inv-text-soft"
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.08 }}
              >
                {status === "success" ? "✓" : "✕"}
              </motion.div>
              <p className="font-inv-heading text-lg text-inv-text">
                {status === "success"
                  ? "¡Gracias por tu regalo!"
                  : "Pago cancelado"}
              </p>
              <p className="mt-1 text-sm text-inv-text-soft font-light">
                {status === "success"
                  ? "Tu aportación fue recibida. Nos vemos en la celebración."
                  : "No se realizó ningún cargo. Puedes intentarlo de nuevo cuando quieras."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selectores del pago integrado. Con Payment Link externo se ocultan:
            el invitado elige el monto en la pasarela segura de Stripe. */}
        {!linkMode && (
          <>
            {/* Selector manual de moneda */}
            <Reveal>
              <div className="flex justify-center mb-8">
                <div
                  role="group"
                  aria-label="Moneda"
                  className="inline-flex rounded-full border border-inv-primary/30 bg-inv-surface p-1"
                >
                  {Object.entries(CURRENCIES).map(([code, c]) => (
                    <button
                      key={code}
                      type="button"
                      aria-pressed={currency === code}
                      onClick={() => selectCurrency(code)}
                      className={`rounded-full px-6 py-2 text-sm font-semibold tracking-wide transition-all ${
                        currency === code
                          ? "bg-gradient-to-br from-inv-primary-light to-inv-primary-dark text-inv-on-accent shadow-md"
                          : "text-inv-text-soft hover:text-inv-text"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Montos sugeridos */}
            {suggested.length > 0 && (
              <Reveal>
                <motion.div
                  className="flex flex-wrap justify-center gap-3"
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                >
                  {suggested.map((v) => (
                    <motion.button
                      key={v}
                      type="button"
                      onClick={() => selectChip(v)}
                      variants={{
                        hidden: { opacity: 0, scale: 0.85 },
                        show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE } },
                      }}
                      whileHover={reduced ? undefined : { y: -3, transition: { type: "spring", stiffness: 300, damping: 18 } }}
                      whileTap={reduced ? undefined : { scale: 0.95 }}
                      className={`rounded-2xl border px-6 py-3 font-inv-heading text-lg transition-colors duration-300 ${
                        chipAmount === v && custom === ""
                          ? "border-inv-primary bg-gradient-to-br from-inv-primary-light to-inv-primary-dark text-inv-on-accent shadow-lg"
                          : "border-inv-primary/30 bg-inv-surface text-inv-text-soft hover:border-inv-primary/60"
                      }`}
                    >
                      {formatAmount(currency, v)}
                    </motion.button>
                  ))}
                </motion.div>
              </Reveal>
            )}

            {/* Monto libre */}
            {allowCustom && (
              <Reveal delay={0.1}>
                <div className="mt-6 flex justify-center">
                  <label className="flex flex-col items-center gap-2">
                    <span className="text-xs uppercase tracking-[0.3em] text-inv-primary">
                      Monto libre
                    </span>
                    <div className="flex items-center gap-2 rounded-2xl border border-inv-primary/30 bg-inv-surface px-4 py-3">
                      <span className="font-inv-heading text-xl text-inv-text-soft">
                        {CURRENCIES[currency].symbol}
                      </span>
                      <input
                        type="number"
                        min={min}
                        step={1}
                        inputMode="numeric"
                        value={custom}
                        onChange={(e) => onCustomChange(e.target.value)}
                        placeholder="0"
                        className="w-32 bg-transparent text-center font-inv-heading text-xl text-inv-text placeholder-inv-text-muted/50 focus:outline-none"
                      />
                    </div>
                  </label>
                </div>
              </Reveal>
            )}

            {min > 0 && (
              <p className="mt-4 text-center text-xs uppercase tracking-[0.25em] text-inv-text-muted">
                Monto mínimo {formatAmount(currency, min)}
              </p>
            )}
          </>
        )}

        {error && (
          <p className="mt-4 text-center text-sm text-red-500 font-medium">{error}</p>
        )}

        {/* Opciones: depósito bancario y/o tarjeta */}
        <div className="mt-10 space-y-4">
          {bank.enabled && bankFields.length > 0 && (
            <Reveal>
              <div className="rounded-3xl border border-inv-primary/30 bg-inv-surface px-6 md:px-8 py-6 shadow-[0_20px_50px_var(--inv-shadow-card)]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-inv-primary-light to-inv-primary-dark text-inv-on-accent text-sm">
                    ☰
                  </span>
                  <span className="font-inv-heading text-lg text-inv-text">
                    Depósito / transferencia
                  </span>
                </div>
                <div className="grid gap-2">
                  {bankFields.map((f) => (
                    <div
                      key={f.key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-inv-accent-border bg-inv-bg/60 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="text-[0.65rem] uppercase tracking-[0.2em] text-inv-text-muted">
                          {f.label}
                        </div>
                        <div className="truncate text-inv-text font-medium">
                          {bank[f.key]}
                        </div>
                      </div>
                      <CopyButton
                        label={f.label}
                        copied={copiedKey === f.key}
                        onCopy={() => doCopy(f.key, bank[f.key])}
                        reduced={reduced}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          {registry.stripe_enabled && (
            <Reveal>
              {linkMode ? (
                <motion.a
                  href={paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileTap={reduced ? undefined : { scale: 0.98 }}
                  className="block w-full rounded-2xl bg-gradient-to-br from-inv-primary-light via-inv-primary to-inv-primary-deep px-6 py-4 text-center font-inv-heading text-lg text-inv-on-accent shadow-xl hover:brightness-110 active:scale-[.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
                >
                  Pagar con tarjeta
                </motion.a>
              ) : (
                <motion.button
                  type="button"
                  onClick={payWithCard}
                  disabled={paying || !stripeReady}
                  whileTap={reduced ? undefined : { scale: 0.98 }}
                  className="w-full rounded-2xl bg-gradient-to-br from-inv-primary-light via-inv-primary to-inv-primary-deep px-6 py-4 font-inv-heading text-lg text-inv-on-accent shadow-xl hover:brightness-110 active:scale-[.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {paying ? "Abriendo pago…" : "Pagar con tarjeta"}
                </motion.button>
              )}
              {linkMode ? (
                <p className="mt-2 text-center text-xs text-inv-text-muted">
                  Elegirás el monto en la pasarela segura de Stripe.
                </p>
              ) : !stripeReady ? (
                <p className="mt-2 text-center text-xs text-inv-text-muted">
                  El pago con tarjeta no está disponible en este momento.
                </p>
              ) : null}
            </Reveal>
          )}
        </div>
      </div>

      {/* Modal del Checkout embebido: el marco mantiene el diseño de la
          invitación y el formulario interno lo renderiza Stripe. */}
      <AnimatePresence>
        {checkoutOpen && (
          <CheckoutModal
            paid={paid}
            initError={checkoutError}
            ready={checkoutReady}
            amountLabel={payAmountLabel}
            onClose={closeCheckout}
            onRetry={retryCheckout}
            mountRef={mountRef}
            reduced={reduced}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function CopyButton({ label, copied, onCopy, reduced }) {
  return (
    <motion.button
      type="button"
      onClick={onCopy}
      aria-label={`Copiar ${label}`}
      whileTap={reduced ? undefined : { scale: 0.9 }}
      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
        copied
          ? "bg-inv-accent-solid text-inv-on-accent"
          : "border border-inv-primary/40 text-inv-text-soft hover:border-inv-primary/80 hover:text-inv-text"
      }`}
    >
      {copied ? "✓ Copiado" : "Copiar"}
    </motion.button>
  );
}

/* Ícono de tarjeta de crédito en línea fina, coloreado con currentColor. */
function CardIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19" />
      <path d="M6 15h4" />
    </svg>
  );
}

/* Modal del Checkout embebido de Stripe, con el diseño de la invitación.
   Ciclo de vida: abrir (init + mount) → pagar → onComplete (estado de
   éxito propio) o error de init/mount con reintento. Cierra con ✕, clic
   en el backdrop o Escape; atrapa el foco y lo devuelve al disparador. */
function CheckoutModal({
  paid,
  initError,
  ready,
  amountLabel,
  onClose,
  onRetry,
  mountRef,
  reduced,
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    const prevFocus = document.activeElement;
    closeRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const focusables = Array.from(
        dialog.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.disabled && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeInside = dialog.contains(document.activeElement);
      if (e.shiftKey) {
        if (!activeInside || document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!activeInside || document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (prevFocus && typeof prevFocus.focus === "function") prevFocus.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        aria-hidden="true"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-inv-overlay/70 backdrop-blur-sm"
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={paid ? "Pago completado" : "Pago con tarjeta"}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-inv-primary/40 bg-gradient-to-b from-inv-surface to-inv-bg p-6 shadow-2xl md:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-inv-primary-light to-inv-primary-dark text-inv-on-accent shadow-md">
              <CardIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-inv-heading text-lg text-inv-text">
                {paid ? "Pago completado" : "Pago con tarjeta"}
              </h3>
              <p className="text-xs font-light text-inv-text-soft">
                {paid
                  ? "Gracias por tu regalo."
                  : "Completa tus datos en la pasarela segura de Stripe."}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-inv-accent-border text-inv-text-soft transition-colors hover:border-inv-primary hover:text-inv-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
          >
            ✕
          </button>
        </div>

        {paid ? (
          <div className="py-2 text-center">
            <motion.div
              className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-inv-primary-light to-inv-primary-dark text-2xl text-inv-on-accent shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.08 }}
            >
              ✓
            </motion.div>
            <p className="font-inv-heading text-xl text-inv-text">
              ¡Gracias! Tu regalo se registró correctamente.
            </p>
            <p className="mt-2 text-sm font-light text-inv-text-soft">
              Tu aportación fue recibida. Nos vemos en la celebración.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-2xl bg-gradient-to-br from-inv-primary-light via-inv-primary to-inv-primary-deep px-6 py-3.5 font-inv-heading text-lg text-inv-on-accent shadow-xl transition-all hover:brightness-110 active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
            >
              Cerrar
            </button>
          </div>
        ) : initError ? (
          <div className="py-2 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-inv-bg text-xl text-inv-text-soft">
              ✕
            </div>
            <p className="font-inv-heading text-lg text-inv-text">
              No se pudo abrir el pago
            </p>
            <p className="mt-1 text-sm font-light text-inv-text-soft">{initError}</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-inv-accent-border px-4 py-3 text-sm text-inv-text transition-colors hover:bg-inv-bg active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onRetry}
                className="flex-1 rounded-xl bg-gradient-to-br from-inv-primary-light via-inv-primary to-inv-primary-deep px-4 py-3 text-sm font-semibold text-inv-on-accent transition-all hover:brightness-110 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-primary focus-visible:ring-offset-2"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <>
            {amountLabel && (
              <p className="mb-4 text-center text-sm text-inv-text-soft">
                Monto a pagar:{" "}
                <span className="font-semibold text-inv-text">{amountLabel}</span>
              </p>
            )}
            {!ready && (
              <div
                role="status"
                className="flex items-center justify-center gap-3 py-10 text-inv-text-soft"
              >
                <motion.span
                  aria-hidden="true"
                  className="h-5 w-5 rounded-full border-2 border-inv-primary/30 border-t-inv-primary"
                  animate={reduced ? undefined : { rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                />
                <span className="text-sm font-light">Cargando pasarela segura…</span>
              </div>
            )}
            <div ref={mountRef} />
            <p className="mt-4 text-center text-[0.65rem] uppercase tracking-[0.25em] text-inv-text-muted">
              Pago seguro procesado por Stripe
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
