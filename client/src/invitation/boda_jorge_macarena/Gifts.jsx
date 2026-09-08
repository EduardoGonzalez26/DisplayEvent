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
   depósito con copiado y pago con tarjeta vía Stripe Checkout) pero
   con un diseño botánico propio: cabecera `WeddingSectionTitle` local,
   selectores de moneda y monto como dropdowns nativos estilizados (con
   etiqueta, borde fino y chevron botánico), input underline para el
   monto libre, banner de estado con floritura botánica y pago con
   tarjeta como CTA principal (botón naranja alargado con ícono) con el
   depósito bancario relegado a un modal compacto accesible.
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

  // Lee `?payment=success` / `?payment=cancelled` al volver de Stripe.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("payment");
    if (p === "success") setStatus("success");
    else if (p === "cancelled") setStatus("cancelled");
  }, []);

  if (!registry?.enabled) return null;

  const suggested = registry[`suggested_${currency}`] || [];
  const min = registry[`min_${currency}`] || 0;
  const allowCustom = !!registry.allow_custom;
  const bank = registry.bank || {};
  const stripeReady = !!registry.stripe_enabled && !!publishableKey && !!token;

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
    try {
      const { session_id } = await api.invitations.payment(token, {
        currency,
        amount: Math.round(activeAmount),
      });
      const stripe = await loadStripe(publishableKey);
      if (!stripe) throw new Error("No se pudo inicializar el pago.");
      const { error: redirectError } = await stripe.redirectToCheckout({
        sessionId: session_id,
      });
      if (redirectError) throw new Error(redirectError.message || "Error al abrir el pago");
    } catch (err) {
      setError(err.message || "No se pudo iniciar el pago.");
      setPaying(false);
    }
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

  return (
    <section className="relative overflow-hidden bg-inv-bg-alt2 px-4 py-24 md:py-32">
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

        {error && (
          <p className="mt-4 text-center text-sm font-medium text-[var(--inv-accent-pink)]">
            {error}
          </p>
        )}

        {/* CTA principal: pago con tarjeta + alternativa de depósito */}
        <div className="mt-10 flex flex-col items-center gap-4">
          {hasCard && (
            <Reveal>
              <div className="w-full max-w-md">
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
                {!stripeReady && (
                  <p className="mt-2 text-center text-xs text-[var(--inv-text-muted)]">
                    El pago con tarjeta no está disponible en este momento.
                  </p>
                )}
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
