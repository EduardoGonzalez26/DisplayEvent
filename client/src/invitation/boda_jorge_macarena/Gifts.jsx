import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { loadStripe } from "@stripe/stripe-js";
import { api } from "../../api.js";
import { Reveal } from "../motion.jsx";
import { Flourish, WeddingSectionTitle } from "./decor.jsx";

/* ------------------------------------------------------------------
   Mesa de Regalos (registry) — versión LOCAL de la plantilla
   "Boda de Jorge & Macarena".

   Replica EXACTAMENTE la lógica de shared/Gifts.jsx (moneda, montos,
   depósito con copiado y pago con tarjeta vía Stripe Checkout EMBEBIDO)
   pero con un diseño botánico propio: cabecera `WeddingSectionTitle` local,
   selectores de moneda y monto como dropdowns nativos estilizados (con
   etiqueta, borde fino y chevron botánico), input underline para el
   monto libre, banner de estado con floritura botánica y pago con
   tarjeta como CTA principal (botón naranja alargado con ícono) que abre
   un modal propio con el formulario embebido de Stripe; el depósito
   bancario queda relegado a un modal compacto accesible.
   ------------------------------------------------------------------ */

const CURRENCIES = {
  mxn: { symbol: "$", label: "MXN" },
  eur: { symbol: "€", label: "EUR" },
};

// Valor sentinela del dropdown de montos para el modo "Monto libre".
const CUSTOM_AMOUNT = "__custom__";

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
  const [customMode, setCustomMode] = useState(false); // dropdown = "Monto libre"
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [status, setStatus] = useState(null); // "success" | "cancelled"
  const [copiedKey, setCopiedKey] = useState(null);
  const [bankOpen, setBankOpen] = useState(false);
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

  // Valor controlado del dropdown de montos: refleja chip, modo libre o vacío.
  const amountValue = customMode
    ? CUSTOM_AMOUNT
    : chipAmount != null
      ? String(chipAmount)
      : "";

  const onAmountChange = (value) => {
    if (value === CUSTOM_AMOUNT) {
      setChipAmount(null);
      setCustomMode(true);
      setError("");
      return;
    }
    if (value === "") {
      setChipAmount(null);
      setCustom("");
      setCustomMode(false);
      setError("");
      return;
    }
    const v = Number(value);
    if (!Number.isFinite(v)) return;
    selectChip(v);
    setCustomMode(false);
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

  const hasCard = !!registry.stripe_enabled;
  const hasBank = !!bank.enabled && bankFields.length > 0;
  const showAmount = stripeReady && Number.isFinite(activeAmount) && activeAmount > 0;
  const payAmountLabel = showAmount ? formatAmount(currency, activeAmount) : "";

  return (
    <section className="relative overflow-hidden px-4 py-6 md:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--inv-radial-c),transparent_60%)]" />

      <div className="relative mx-auto max-w-3xl">
        <WeddingSectionTitle
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
              className={`mb-8 overflow-hidden rounded-[1.6rem] border px-6 py-6 text-center shadow-[0_20px_50px_var(--inv-shadow-card)] ${
                status === "success"
                  ? "border-[var(--inv-botanical)]/40 bg-[var(--inv-surface)]"
                  : "border-[var(--inv-accent-pink)]/30 bg-[var(--inv-surface)]"
              }`}
            >
              <Flourish
                className={`mx-auto h-6 w-44 opacity-80 ${
                  status === "success"
                    ? "text-[var(--inv-botanical)]"
                    : "text-[var(--inv-accent-pink)]"
                }`}
              />
              <motion.div
                className={`mx-auto mt-6 mb-3 grid h-12 w-12 place-items-center rounded-full text-xl text-[var(--inv-on-accent)] ${
                  status === "success"
                    ? "bg-[var(--inv-botanical)] shadow-[0_10px_24px_var(--inv-shadow-mid)]"
                    : "bg-[var(--inv-accent-pink)] shadow-[0_10px_24px_var(--inv-shadow-ring)]"
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.08 }}
              >
                {status === "success" ? "✓" : "✕"}
              </motion.div>
              <p
                className={`font-inv-heading text-lg ${
                  status === "success"
                    ? "text-[var(--inv-text)]"
                    : "text-[var(--inv-accent-pink)]"
                }`}
              >
                {status === "success" ? "¡Gracias por tu regalo!" : "Pago cancelado"}
              </p>
              <p className="mt-1 text-sm font-light text-inv-text-soft">
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
            {/* Selectores despejados: moneda y monto como dropdowns */}
            <Reveal>
              <div className="mx-auto grid max-w-lg grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
                <FieldSelect
                  id="gift-currency"
                  label="Moneda"
                  value={currency}
                  onChange={(e) => {
                    selectCurrency(e.target.value);
                    setCustomMode(false);
                  }}
                >
                  {Object.entries(CURRENCIES).map(([code, c]) => (
                    <option key={code} value={code}>
                      {c.label}
                    </option>
                  ))}
                </FieldSelect>

                {(suggested.length > 0 || allowCustom) && (
                  <FieldSelect
                    id="gift-amount"
                    label="Monto"
                    value={amountValue}
                    onChange={(e) => onAmountChange(e.target.value)}
                  >
                    <option value="">Selecciona un monto</option>
                    {suggested.map((v) => (
                      <option key={v} value={String(v)}>
                        {formatAmount(currency, v)}
                      </option>
                    ))}
                    {allowCustom && <option value={CUSTOM_AMOUNT}>Monto libre</option>}
                  </FieldSelect>
                )}

                {/* Monto libre (solo al elegirlo en el dropdown) */}
                {customMode && allowCustom && (
                  <div className="flex justify-center sm:col-span-2">
                    <label className="flex flex-col items-center gap-3">
                      <span className="text-xs uppercase tracking-[0.3em] text-[var(--inv-accent-pink)]">
                        Monto libre
                      </span>
                      <div className="flex items-end gap-2 border-b-2 border-[var(--inv-accent-yellow)] pb-1 transition-colors duration-300 focus-within:border-[var(--inv-primary)]">
                        <span className="font-inv-heading text-2xl text-[var(--inv-text-soft)]">
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
                          className="w-32 bg-transparent text-center font-inv-heading text-2xl text-[var(--inv-text)] placeholder-[var(--inv-text-dim)]/50 focus:outline-none"
                        />
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </Reveal>

            {min > 0 && (
              <p className="mt-5 text-center text-xs uppercase tracking-[0.25em] text-[var(--inv-text-muted)]">
                Monto mínimo {formatAmount(currency, min)}
              </p>
            )}
          </>
        )}

        {error && (
          <p className="mt-4 text-center text-sm font-medium text-[var(--inv-accent-pink)]">
            {error}
          </p>
        )}

        {/* CTA principal: pago con tarjeta + alternativa de depósito */}
        <div className="mt-7 flex flex-col items-center gap-4">
          {hasCard && (
            <Reveal>
              <div className="w-full max-w-md">
                {linkMode ? (
                  <motion.a
                    href={paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileTap={reduced ? undefined : { scale: 0.98 }}
                    whileHover={reduced ? undefined : { scale: 1.01 }}
                    className="block w-full rounded-2xl bg-[var(--inv-primary)] px-6 py-5 font-inv-heading text-lg text-[var(--inv-on-accent)] shadow-[0_16px_40px_var(--inv-shadow-ring)] transition-colors duration-300 hover:bg-[var(--inv-accent)] hover:shadow-[0_18px_44px_var(--inv-shadow-mid)] active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inv-accent)] focus-visible:ring-offset-2"
                  >
                    <span className="flex items-center justify-center gap-3">
                      <CardIcon className="h-5 w-5" />
                      <span>Pagar con tarjeta</span>
                    </span>
                  </motion.a>
                ) : (
                  <motion.button
                    type="button"
                    onClick={payWithCard}
                    disabled={paying || !stripeReady}
                    whileTap={reduced ? undefined : { scale: 0.98 }}
                    whileHover={reduced ? undefined : { scale: 1.01 }}
                    className="w-full rounded-2xl bg-[var(--inv-primary)] px-6 py-5 font-inv-heading text-lg text-[var(--inv-on-accent)] shadow-[0_16px_40px_var(--inv-shadow-ring)] transition-colors duration-300 hover:bg-[var(--inv-accent)] hover:shadow-[0_18px_44px_var(--inv-shadow-mid)] active:scale-[.99] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inv-accent)] focus-visible:ring-offset-2"
                  >
                    <span className="flex items-center justify-center gap-3">
                      <CardIcon className="h-5 w-5" />
                      <span>{paying ? "Abriendo pago…" : "Pagar con tarjeta"}</span>
                      {showAmount && !paying && (
                        <span className="rounded-full bg-[var(--inv-on-accent)]/15 px-3 py-0.5 text-sm tabular-nums">
                          {formatAmount(currency, activeAmount)}
                        </span>
                      )}
                    </span>
                  </motion.button>
                )}
                {linkMode ? (
                  <p className="mt-2 text-center text-xs text-[var(--inv-text-muted)]">
                    Elegirás el monto en la pasarela segura de Stripe.
                  </p>
                ) : !stripeReady ? (
                  <p className="mt-2 text-center text-xs text-[var(--inv-text-muted)]">
                    El pago con tarjeta no está disponible en este momento.
                  </p>
                ) : null}
              </div>
            </Reveal>
          )}

          {hasCard && hasBank && (
            <Reveal delay={0.05}>
              <button
                type="button"
                onClick={() => setBankOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--inv-accent-border-strong)] bg-[var(--inv-surface)] px-5 py-2.5 text-xs font-medium text-[var(--inv-text-soft)] transition-colors hover:border-[var(--inv-primary)] hover:text-[var(--inv-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inv-primary)] focus-visible:ring-offset-2"
              >
                <BankIcon className="h-4 w-4 text-[var(--inv-botanical)]" />
                <span>
                  ¿Prefieres depositar o transferir?{" "}
                  <span className="font-semibold">Ver datos bancarios</span>
                </span>
              </button>
            </Reveal>
          )}

          {!hasCard && hasBank && (
            <Reveal>
              <div className="w-full rounded-[1.8rem] border border-[var(--inv-accent-yellow)]/40 bg-[var(--inv-surface)] px-6 py-6 shadow-[0_24px_60px_var(--inv-shadow-card)] md:px-8">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-[var(--inv-botanical)]/60 text-[var(--inv-botanical)]">
                    <BankIcon className="h-5 w-5" />
                  </span>
                  <span className="font-inv-heading text-lg text-[var(--inv-text)]">
                    Depósito / transferencia
                  </span>
                </div>
                <div>
                  {bankFields.map((f) => (
                    <BankField
                      key={f.key}
                      field={f}
                      value={bank[f.key]}
                      copied={copiedKey === f.key}
                      onCopy={() => doCopy(f.key, bank[f.key])}
                      reduced={reduced}
                      className="border-b border-[var(--inv-accent-border)] py-3 last:border-b-0"
                    />
                  ))}
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </div>

      {/* Modal compacto de depósito bancario */}
      <AnimatePresence>
        {bankOpen && (
          <BankModal
            bank={bank}
            bankFields={bankFields}
            copiedKey={copiedKey}
            doCopy={doCopy}
            reduced={reduced}
            onClose={() => setBankOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Modal del Checkout embebido: el marco botánico mantiene el diseño
          de la invitación y el formulario interno lo renderiza Stripe. */}
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
      className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
        copied
          ? "bg-[var(--inv-botanical)] text-[var(--inv-on-accent)]"
          : "border border-[var(--inv-primary)]/60 text-[var(--inv-text-soft)] hover:border-[var(--inv-primary)] hover:bg-[var(--inv-primary)] hover:text-[var(--inv-on-accent)]"
      }`}
    >
      {copied ? "✓ Copiado" : "Copiar"}
    </motion.button>
  );
}

/* Ícono de banco/edificio en línea fina, coloreado con currentColor. */
function BankIcon({ className = "" }) {
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
      <path d="M3 9l9-5 9 5" />
      <path d="M5 9v8M9.5 9v8M14.5 9v8M19 9v8" />
      <path d="M3 20h18" />
    </svg>
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

/* Ícono chevron en línea fina para los dropdowns. */
function ChevronDown({ className = "" }) {
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
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/* Dropdown nativo estilizado: etiqueta + contenedor con borde fino y
   chevron botánico. Se usa `<select>` nativo por robustez y accesibilidad
   (navegación por teclado, lectura por lectores de pantalla y picker
   nativo en móvil). */
function FieldSelect({ id, label, value, onChange, children, className = "" }) {
  const empty = value === "" || value == null;
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 block text-center text-[0.65rem] uppercase tracking-[0.3em] text-[var(--inv-accent-pink)]"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          className={`w-full appearance-none rounded-2xl border border-[var(--inv-accent-yellow)]/60 bg-[var(--inv-surface)] py-3.5 pl-5 pr-12 font-inv-heading text-base shadow-[0_10px_30px_var(--inv-shadow-card)] transition-colors duration-300 hover:border-[var(--inv-primary)]/50 focus:border-[var(--inv-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inv-accent-yellow)]/70 focus-visible:ring-offset-2 ${
            empty ? "text-[var(--inv-text-dim)]" : "text-[var(--inv-text)]"
          }`}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--inv-botanical)]" />
      </div>
    </div>
  );
}

/* Fila de dato bancario (etiqueta + valor + botón copiar). Se reutiliza
   en el bloque inline (caso sin tarjeta) y en el modal compacto. */
function BankField({ field, value, copied, onCopy, reduced, className = "" }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <div className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--inv-text-muted)]">
          {field.label}
        </div>
        <div className="truncate font-medium text-[var(--inv-text)]">{value}</div>
      </div>
      <CopyButton
        label={field.label}
        copied={copied}
        onCopy={onCopy}
        reduced={reduced}
      />
    </div>
  );
}

/* Modal compacto y accesible con los datos bancarios. Cierra con ✕,
   clic en el backdrop o tecla Escape; atrapa el foco y lo devuelve al
   disparador al cerrar. Respeta prefers-reduced-motion. */
function BankModal({ bank, bankFields, copiedKey, doCopy, reduced, onClose }) {
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
        initial={reduced ? { opacity: 0.7 } : { opacity: 0 }}
        animate={{ opacity: 0.7 }}
        exit={reduced ? { opacity: 0.7 } : { opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-[var(--inv-overlay)] backdrop-blur-sm"
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Datos de depósito"
        initial={reduced ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative z-10 max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-[1.8rem] border border-[var(--inv-accent-yellow)]/40 bg-[var(--inv-surface)] p-6 shadow-[0_30px_80px_var(--inv-shadow-card)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--inv-botanical)]/60 text-[var(--inv-botanical)]">
              <BankIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-inv-heading text-lg text-[var(--inv-text)]">
                Depósito / transferencia
              </h3>
              <p className="text-xs font-light text-[var(--inv-text-muted)]">
                Copia los datos y realiza tu transferencia.
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--inv-accent-border)] text-[var(--inv-text-soft)] transition-colors hover:border-[var(--inv-primary)] hover:text-[var(--inv-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inv-primary)] focus-visible:ring-offset-2"
          >
            ✕
          </button>
        </div>

        <div>
          {bankFields.map((f) => (
            <BankField
              key={f.key}
              field={f}
              value={bank[f.key]}
              copied={copiedKey === f.key}
              onCopy={() => doCopy(f.key, bank[f.key])}
              reduced={reduced}
              className="border-b border-[var(--inv-accent-border)] py-3 last:border-b-0"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* Modal del Checkout embebido de Stripe, con el diseño botánico de la
   invitación. Ciclo de vida: abrir (init + mount) → pagar → onComplete
   (estado de éxito propio) o error de init/mount con reintento. Cierra
   con ✕, clic en el backdrop o Escape; atrapa el foco y lo devuelve al
   disparador al cerrar. Respeta prefers-reduced-motion. */
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
        className="absolute inset-0 bg-[var(--inv-overlay)] backdrop-blur-sm"
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={paid ? "Pago completado" : "Pago con tarjeta"}
        initial={reduced ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.8rem] border border-[var(--inv-accent-yellow)]/40 bg-[var(--inv-surface)] p-6 shadow-[0_30px_80px_var(--inv-shadow-card)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--inv-botanical)]/60 text-[var(--inv-botanical)]">
              <CardIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-inv-heading text-lg text-[var(--inv-text)]">
                {paid ? "Pago completado" : "Pago con tarjeta"}
              </h3>
              <p className="text-xs font-light text-[var(--inv-text-muted)]">
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
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--inv-accent-border)] text-[var(--inv-text-soft)] transition-colors hover:border-[var(--inv-primary)] hover:text-[var(--inv-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inv-primary)] focus-visible:ring-offset-2"
          >
            ✕
          </button>
        </div>

        {paid ? (
          <div className="py-2 text-center">
            <Flourish className="mx-auto h-6 w-44 text-[var(--inv-botanical)] opacity-80" />
            <motion.div
              className="mx-auto mt-6 mb-3 grid h-14 w-14 place-items-center rounded-full bg-[var(--inv-botanical)] text-2xl text-[var(--inv-on-accent)] shadow-[0_10px_24px_var(--inv-shadow-mid)]"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.08 }}
            >
              ✓
            </motion.div>
            <p className="font-inv-heading text-xl text-[var(--inv-text)]">
              ¡Gracias! Tu regalo se registró correctamente.
            </p>
            <p className="mt-2 text-sm font-light text-inv-text-soft">
              Tu aportación fue recibida. Nos vemos en la celebración.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-2xl bg-[var(--inv-primary)] px-6 py-4 font-inv-heading text-lg text-[var(--inv-on-accent)] shadow-[0_16px_40px_var(--inv-shadow-ring)] transition-colors duration-300 hover:bg-[var(--inv-accent)] active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inv-accent)] focus-visible:ring-offset-2"
            >
              Cerrar
            </button>
          </div>
        ) : initError ? (
          <div className="py-2 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[var(--inv-accent-pink)]/15 text-xl text-[var(--inv-accent-pink)]">
              ✕
            </div>
            <p className="font-inv-heading text-lg text-[var(--inv-text)]">
              No se pudo abrir el pago
            </p>
            <p className="mt-1 text-sm font-light text-[var(--inv-text-soft)]">{initError}</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-[var(--inv-accent-border-strong)] px-4 py-3 text-sm text-[var(--inv-text-soft)] transition-colors hover:border-[var(--inv-primary)] hover:text-[var(--inv-primary)] active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inv-primary)] focus-visible:ring-offset-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onRetry}
                className="flex-1 rounded-xl bg-[var(--inv-primary)] px-4 py-3 text-sm font-semibold text-[var(--inv-on-accent)] transition-colors hover:bg-[var(--inv-accent)] active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--inv-accent)] focus-visible:ring-offset-2"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <>
            {amountLabel && (
              <p className="mb-4 text-center text-sm text-[var(--inv-text-soft)]">
                Monto a pagar:{" "}
                <span className="font-semibold text-[var(--inv-text)]">{amountLabel}</span>
              </p>
            )}
            {!ready && (
              <div
                role="status"
                className="flex items-center justify-center gap-3 py-10 text-[var(--inv-text-soft)]"
              >
                <motion.span
                  aria-hidden="true"
                  className="h-5 w-5 rounded-full border-2 border-[var(--inv-accent-yellow)]/60 border-t-[var(--inv-primary)]"
                  animate={reduced ? undefined : { rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                />
                <span className="text-sm font-light">Cargando pasarela segura…</span>
              </div>
            )}
            <div ref={mountRef} />
            <p className="mt-4 text-center text-[0.65rem] uppercase tracking-[0.25em] text-[var(--inv-text-muted)]">
              Pago seguro procesado por Stripe
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
