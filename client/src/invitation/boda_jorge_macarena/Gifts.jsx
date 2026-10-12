import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { loadStripe } from "@stripe/stripe-js";
import { api } from "../../api.js";
import { Reveal } from "../motion.jsx";
import { Eyebrow, Flor, FlowerRule } from "./flora.jsx";

/* ------------------------------------------------------------------
   Regalo (v2) — versión LOCAL de la plantilla "Boda de Jorge &
   Macarena".

   Replica EXACTAMENTE la lógica de shared/Gifts.jsx (moneda, montos,
   depósito con copiado y pago con tarjeta vía Stripe Checkout EMBEBIDO)
   con la presentación del mock v2: eyebrow + flor, título editorial,
   párrafo de `cfg.registry_note` (o el texto por defecto del tema),
   selectores de moneda/monto en campos fileteados, CTA de tarjeta en
   tinta y "Transferencia bancaria" que despliega la tarjeta de datos
   bancarios (filas con botón Copiar). El marco del Checkout embebido se
   conserva como modal con el mismo lenguaje editorial.

   La sección se muestra si la mesa está activa o si hay
   `cfg.registry_note`; sin nada, el layout no crea la tarjeta.
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
   Stripe renombró el método a `createEmbeddedCheckoutPage` con la MISMA
   firma, así que se prefiere si el runtime ya lo expone. */
function resolveEmbeddedCheckoutInit(stripe) {
  const init = stripe.createEmbeddedCheckoutPage || stripe.initEmbeddedCheckout;
  if (typeof init !== "function") {
    throw new Error("No se pudo inicializar el pago.");
  }
  return init.bind(stripe);
}

/* Ícono de tarjeta de crédito en línea fina. */
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

/* Ícono chevron en línea fina. */
function ChevronDown({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function Gifts({ cfg, theme, token, publishableKey, paymentMethods = null }) {
  const registry = cfg?.registry || {};
  const reduced = useReducedMotion();
  const labels = theme?.labels || {};

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

  const enabled = !!registry.enabled;
  const publish = String(cfg?.registry_note || "").trim() || labels.giftIntro || "";
  const hasSection = enabled || !!String(cfg?.registry_note || "").trim();

  const suggested = registry[`suggested_${currency}`] || [];
  const min = registry[`min_${currency}`] || 0;
  const allowCustom = !!registry.allow_custom;
  const bank = registry.bank || {};
  const stripeReady = !!registry.stripe_enabled && !!publishableKey && !!token;
  // Payment Link externo: si está definido, el CTA de tarjeta abre ese link
  // (el invitado elige el monto en Stripe) y no se usan los selectores.
  const paymentLink = String(registry.payment_link_url || "").trim();
  const linkMode = !!registry.stripe_enabled && !!paymentLink;

  const bankFields = [
    { key: "bank_name", label: "Banco" },
    { key: "holder", label: "Titular" },
    { key: "account_number", label: "Cuenta / CLABE" },
    { key: "concept", label: "Concepto" },
  ].filter((f) => String(bank[f.key] ?? "").trim() !== "");

  // Disponibilidad de tarjeta POR MONEDA (`payment_methods.card.{mxn,eur}`).
  //   - `null`/ausente (respuesta vieja o vista previa) -> disponible.
  //   - `true` -> checkout embebido normal para esa moneda.
  //   - `false` -> sin cuenta Connect destino: se deshabilita/oculta la
  //     tarjeta en esa moneda y se conserva la transferencia bancaria.
  const cardConfigured = !!registry.stripe_enabled;
  const cardAvailableFor = (cur) => paymentMethods?.card?.[cur] !== false;
  const cardAvailable = cardAvailableFor(currency);
  const cardAvailableAny = cardAvailableFor("mxn") || cardAvailableFor("eur");
  const cardUsable = linkMode ? cardAvailableAny : cardAvailable;
  const cardUnavailableMessage =
    `El pago con tarjeta no está disponible para ${CURRENCIES[currency].label} por ahora.` +
    (bank.enabled && bankFields.length > 0 ? " Puedes usar la transferencia bancaria." : "");

  const hasCard = cardConfigured && cardAvailableAny;
  const hasBank = !!bank.enabled && bankFields.length > 0;

  // Sin tarjeta, los datos bancarios son el contenido principal: abiertos.
  useEffect(() => {
    if (hasBank && !hasCard) setBankOpen(true);
  }, [hasBank, hasCard]);

  if (!hasSection) return null;

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
    if (!cardUsable) {
      setError(
        `El pago con tarjeta no está disponible para ${CURRENCIES[currency].label} por ahora.`
      );
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

  const showAmount = stripeReady && Number.isFinite(activeAmount) && activeAmount > 0;
  const payAmountLabel = showAmount ? formatAmount(currency, activeAmount) : "";
  const bankTitle =
    currency === "eur"
      ? labels.giftBankTitleEur || "Desde España"
      : labels.giftBankTitleMxn || "Desde México";

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-5 px-6 pb-[120px] pt-24 text-center">
      <Reveal className="flex flex-col items-center gap-[22px]">
        <Eyebrow>{labels.registryEyebrow || "Regalo"}</Eyebrow>
        <FlowerRule kind="granado" />
        <h2 className="m-0 font-inv-display text-[clamp(36px,8vw,50px)] font-normal leading-[1.08] text-[var(--inv-text)]">
          {labels.withLove || "Con todo nuestro cariño"}
        </h2>
        {publish && (
          <p className="m-0 max-w-[440px] text-base leading-[1.8] text-[var(--inv-text-soft)] [text-wrap:pretty]">
            {publish}
          </p>
        )}
      </Reveal>

      {/* Aviso de resultado del pago (al volver de Stripe) */}
      <AnimatePresence>
        {enabled && status && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-[440px] border border-[var(--inv-accent-border)] bg-[var(--inv-surface)] px-6 py-6 text-center"
          >
            <p className="m-0 font-inv-display text-xl text-[var(--inv-text)]">
              {status === "success" ? "¡Gracias por su regalo!" : "Pago cancelado"}
            </p>
            <p className="m-0 mt-1.5 text-sm leading-relaxed text-[var(--inv-text-muted)]">
              {status === "success"
                ? "Su aportación fue recibida. Nos vemos en la celebración."
                : "No se realizó ningún cargo. Pueden intentarlo de nuevo cuando quieran."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selectores del pago integrado. Con Payment Link externo se ocultan:
          el invitado elige el monto en la pasarela segura de Stripe. Si
          ninguna moneda tiene tarjeta disponible, también se ocultan y la
          tarjeta degrada a banco/aviso neutro. */}
      {enabled && !linkMode && cardAvailableAny && (
        <Reveal className="w-full">
          <div className="mx-auto grid max-w-[400px] grid-cols-1 gap-4 text-left sm:grid-cols-2">
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
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label
                  htmlFor="gift-custom"
                  className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--inv-text-muted)]"
                >
                  Monto libre
                </label>
                <div className="flex items-center gap-2 border border-[var(--inv-accent-border-strong)] bg-[var(--inv-surface)] px-4 py-3 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#1C1B19] focus-within:ring-offset-2">
                  <span className="font-inv-display text-xl text-[var(--inv-text-muted)]">
                    {CURRENCIES[currency].symbol}
                  </span>
                  <input
                    id="gift-custom"
                    type="number"
                    min={min}
                    step={1}
                    inputMode="numeric"
                    value={custom}
                    onChange={(e) => onCustomChange(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent text-[15px] font-medium text-[var(--inv-text)] placeholder-[var(--inv-text-dim)] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {enabled && min > 0 && !linkMode && cardAvailableAny && (
        <p className="m-0 text-xs uppercase tracking-[0.22em] text-[var(--inv-text-muted)]">
          Monto mínimo {formatAmount(currency, min)}
        </p>
      )}

      {enabled && error && (
        <p className="m-0 text-sm font-medium text-[var(--inv-accent-orange)]">
          {error}
        </p>
      )}

      {/* CTA principal: pago con tarjeta + alternativa de depósito */}
      {enabled && (hasCard || hasBank || (cardConfigured && !cardAvailableAny)) && (
        <div className="flex w-full max-w-[400px] flex-col gap-3 pt-2">
          {hasCard &&
            (linkMode ? (
              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[56px] items-center justify-center gap-2.5 rounded-[2px] bg-[#1C1B19] px-6 text-[13px] font-medium uppercase tracking-[0.2em] text-[#FAF7F2] no-underline transition-colors hover:bg-[#3A3733] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2"
              >
                <CardIcon className="h-[18px] w-[18px]" />
                Pagar con tarjeta
              </a>
            ) : (
              <button
                type="button"
                onClick={payWithCard}
                disabled={paying || !stripeReady || !cardAvailable}
                className="flex min-h-[56px] flex-wrap items-center justify-center gap-2.5 rounded-[2px] bg-[#1C1B19] px-6 text-[13px] font-medium uppercase tracking-[0.2em] text-[#FAF7F2] transition-colors hover:bg-[#3A3733] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                <span className="flex items-center gap-2.5">
                  <CardIcon className="h-[18px] w-[18px]" />
                  <span className="whitespace-nowrap">
                    {paying ? "Abriendo pago…" : "Pagar con tarjeta"}
                  </span>
                </span>
                {showAmount && !paying && (
                  <span className="whitespace-nowrap text-xs tabular-nums text-[#CFC7BA]">
                    {payAmountLabel}
                  </span>
                )}
              </button>
            ))}

          {hasBank && (
            <button
              type="button"
              onClick={() => setBankOpen((v) => !v)}
              aria-expanded={bankOpen}
              aria-controls="gift-bank-panel"
              className="flex min-h-[56px] items-center justify-center gap-2.5 rounded-[2px] border border-[#1C1B19] bg-transparent px-4 text-[13px] font-medium uppercase tracking-[0.2em] text-[#1C1B19] transition-colors hover:bg-[#1C1B19]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2 sm:px-6"
            >
              Transferencia bancaria
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-300 ${
                  bankOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          )}

          {enabled && !linkMode && hasCard && !cardAvailable && (
            <p className="m-0 text-xs text-[var(--inv-text-muted)]">
              {cardUnavailableMessage}
            </p>
          )}

          {enabled && !linkMode && hasCard && cardAvailable && !stripeReady && (
            <p className="m-0 text-xs text-[var(--inv-text-muted)]">
              El pago con tarjeta no está disponible en este momento.
            </p>
          )}

          {enabled && cardConfigured && !cardAvailableAny && (
            <p className="m-0 text-xs text-[var(--inv-text-muted)]">
              El pago con tarjeta no está disponible en este momento
              {hasBank ? " · puedes usar la transferencia bancaria" : ""}.
            </p>
          )}
        </div>
      )}

      {/* Datos bancarios (desplegable) */}
      <div
        id="gift-bank-panel"
        className="grid w-full max-w-[440px] transition-[grid-template-rows] duration-500"
        style={{ gridTemplateRows: bankOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`pt-3 transition-opacity duration-500 ${
              bankOpen ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="border border-[var(--inv-accent-border)] bg-[var(--inv-surface)] text-left">
              <div className="flex items-center gap-2.5 border-b border-[var(--inv-accent-border)] bg-[var(--inv-card)] px-5 py-3.5">
                <span className="inline-flex h-[18px] w-[18px] flex-none">
                  <Flor kind="bugambilia" />
                </span>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--inv-text)]">
                  {bankTitle}
                </div>
              </div>
              {bankFields.map((f, i) => (
                <div
                  key={f.key}
                  className={`flex items-center gap-3 px-5 py-3 ${
                    i === bankFields.length - 1
                      ? ""
                      : "border-b border-[var(--inv-card)]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-[var(--inv-text-muted)]">
                      {f.label}
                    </div>
                    <div className="mt-0.5 break-all text-base font-medium text-[var(--inv-text)]">
                      {bank[f.key]}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => doCopy(f.key, bank[f.key])}
                    aria-label={`Copiar ${f.label}`}
                    className="min-h-[44px] min-w-[88px] flex-none rounded-[2px] border border-[var(--inv-accent-border-strong)] bg-transparent px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--inv-text)] transition-colors hover:bg-[var(--inv-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2"
                  >
                    {copiedKey === f.key ? "Copiado ✓" : "Copiar"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal del Checkout embebido: mantiene el marco editorial de la
          invitación; el formulario interno lo renderiza Stripe. */}
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
    </div>
  );
}

/* Selector nativo estilizado: etiqueta microtexto + campo fileteado con
   chevron en tinta. `<select>` nativo por robustez y accesibilidad. */
function FieldSelect({ id, label, value, onChange, children }) {
  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--inv-text-muted)]"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          className="w-full appearance-none rounded-[2px] border border-[var(--inv-accent-border-strong)] bg-[var(--inv-surface)] py-3.5 pl-4 pr-10 text-[15px] font-medium text-[var(--inv-text)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--inv-text-muted)]" />
      </div>
    </div>
  );
}

/* Modal del Checkout embebido de Stripe con el marco editorial de la
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
        className="absolute inset-0 bg-[var(--inv-overlay)]/70 backdrop-blur-sm"
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={paid ? "Pago completado" : "Pago con tarjeta"}
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2px] border border-[var(--inv-accent-border)] bg-[var(--inv-surface)] p-6 shadow-[0_30px_80px_rgba(50,35,20,0.35)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--inv-accent-border-strong)] text-[var(--inv-text)]">
              <CardIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="m-0 font-inv-display text-xl text-[var(--inv-text)]">
                {paid ? "Pago completado" : "Pago con tarjeta"}
              </h3>
              <p className="m-0 text-xs text-[var(--inv-text-muted)]">
                {paid
                  ? "Gracias por su regalo."
                  : "Completen sus datos en la pasarela segura de Stripe."}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--inv-accent-border)] text-[var(--inv-text-soft)] transition-colors hover:border-[var(--inv-accent-border-strong)] hover:text-[var(--inv-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2"
          >
            ✕
          </button>
        </div>

        {paid ? (
          <div className="py-2 text-center">
            <p className="m-0 font-inv-display text-xl text-[var(--inv-text)]">
              ¡Gracias! Su regalo se registró correctamente.
            </p>
            <p className="m-0 mt-2 text-sm text-[var(--inv-text-muted)]">
              Su aportación fue recibida. Nos vemos en la celebración.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 min-h-[52px] w-full rounded-[2px] bg-[#1C1B19] px-6 text-[13px] font-medium uppercase tracking-[0.2em] text-[#FAF7F2] transition-colors hover:bg-[#3A3733] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2"
            >
              Cerrar
            </button>
          </div>
        ) : initError ? (
          <div className="py-2 text-center">
            <p className="m-0 font-inv-display text-lg text-[var(--inv-text)]">
              No se pudo abrir el pago
            </p>
            <p className="m-0 mt-1 text-sm text-[var(--inv-text-muted)]">{initError}</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[48px] flex-1 rounded-[2px] border border-[var(--inv-accent-border-strong)] px-4 text-sm text-[var(--inv-text-soft)] transition-colors hover:bg-[var(--inv-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onRetry}
                className="min-h-[48px] flex-1 rounded-[2px] bg-[#1C1B19] px-4 text-sm font-medium text-[#FAF7F2] transition-colors hover:bg-[#3A3733] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B19] focus-visible:ring-offset-2"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <>
            {amountLabel && (
              <p className="m-0 mb-4 text-center text-sm text-[var(--inv-text-soft)]">
                Monto a pagar:{" "}
                <span className="font-semibold text-[var(--inv-text)]">{amountLabel}</span>
              </p>
            )}
            {!ready && (
              <div
                role="status"
                className="flex items-center justify-center gap-3 py-10 text-[var(--inv-text-muted)]"
              >
                <span
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--inv-accent-border-strong)] border-t-[#1C1B19]"
                />
                <span className="text-sm">Cargando pasarela segura…</span>
              </div>
            )}
            <div ref={mountRef} />
            <p className="m-0 mt-4 text-center text-[0.65rem] uppercase tracking-[0.22em] text-[var(--inv-text-muted)]">
              Pago seguro procesado por Stripe
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
