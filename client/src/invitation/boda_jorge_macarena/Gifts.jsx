import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { loadStripe } from "@stripe/stripe-js";
import { api } from "../../api.js";
import { EASE, Reveal } from "../motion.jsx";
import { Flourish, WeddingSectionTitle } from "./decor.jsx";

/* ------------------------------------------------------------------
   Mesa de Regalos (registry) — versión LOCAL de la plantilla
   "Boda de Jorge & Macarena".

   Replica EXACTAMENTE la lógica de shared/Gifts.jsx (moneda, montos,
   depósito con copiado y pago con tarjeta vía Stripe Checkout) pero
   con un diseño botánico propio: cabecera `WeddingSectionTitle` local,
   toggle píldora naranja/verde, chips de montos con borde amarillo,
   input underline, tarjeta blanca de depósito con ícono de línea fina
   y banner de estado con floritura botánica.
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

        {/* Selector manual de moneda */}
        <Reveal>
          <div className="mb-8 flex justify-center">
            <div
              role="group"
              aria-label="Moneda"
              className="inline-flex rounded-full border border-[var(--inv-accent-yellow)]/50 bg-[var(--inv-surface)] p-1.5 shadow-[0_10px_30px_var(--inv-shadow-card)]"
            >
              {Object.entries(CURRENCIES).map(([code, c]) => {
                const active = currency === code;
                return (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectCurrency(code)}
                    className={`rounded-full px-6 py-2 text-sm font-semibold tracking-wide transition-all ${
                      active
                        ? "bg-[var(--inv-primary)] text-[var(--inv-on-accent)] shadow-md"
                        : "text-[var(--inv-text)] hover:text-[var(--inv-text-soft)]"
                    }`}
                  >
                    <span className="flex flex-col items-center gap-1">
                      {c.label}
                      <span
                        className={`h-px w-6 transition-all duration-300 ${
                          active ? "bg-transparent" : "bg-[var(--inv-accent-yellow)]"
                        }`}
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                );
              })}
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
                  whileHover={
                    reduced
                      ? undefined
                      : { y: -3, transition: { type: "spring", stiffness: 300, damping: 18 } }
                  }
                  whileTap={reduced ? undefined : { scale: 0.95 }}
                  className={`rounded-2xl border px-6 py-3 font-inv-heading text-lg transition-all duration-300 ${
                    chipAmount === v && custom === ""
                      ? "border-[var(--inv-primary)] bg-[var(--inv-primary)] text-[var(--inv-on-accent)] shadow-[0_14px_30px_var(--inv-shadow-ring)]"
                      : "border-[var(--inv-accent-yellow)] bg-[var(--inv-surface)] text-[var(--inv-text)] hover:border-[var(--inv-primary)]/50 hover:shadow-[0_12px_28px_var(--inv-shadow-soft)]"
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
            <div className="mt-8 flex justify-center">
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
          </Reveal>
        )}

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

        {/* Opciones: depósito bancario y/o tarjeta */}
        <div className="mt-10 space-y-4">
          {bank.enabled && bankFields.length > 0 && (
            <Reveal>
              <div className="rounded-[1.8rem] border border-[var(--inv-accent-yellow)]/40 bg-[var(--inv-surface)] px-6 py-6 shadow-[0_24px_60px_var(--inv-shadow-card)] md:px-8">
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
                    <div
                      key={f.key}
                      className="flex items-center justify-between gap-3 border-b border-[var(--inv-accent-border)] py-3 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--inv-text-muted)]">
                          {f.label}
                        </div>
                        <div className="truncate font-medium text-[var(--inv-text)]">
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
              <motion.button
                type="button"
                onClick={payWithCard}
                disabled={paying || !stripeReady}
                whileTap={reduced ? undefined : { scale: 0.98 }}
                className="w-full rounded-2xl bg-[var(--inv-primary)] px-6 py-4 font-inv-heading text-lg text-[var(--inv-on-accent)] shadow-[0_16px_40px_var(--inv-shadow-ring)] transition-all hover:bg-[var(--inv-accent)] hover:shadow-[0_18px_44px_var(--inv-shadow-mid)] active:scale-[.99] disabled:pointer-events-none disabled:opacity-50"
              >
                {paying ? "Abriendo pago…" : "Pagar con tarjeta"}
              </motion.button>
              {!stripeReady && (
                <p className="mt-2 text-center text-xs text-[var(--inv-text-muted)]">
                  El pago con tarjeta no está disponible en este momento.
                </p>
              )}
            </Reveal>
          )}
        </div>
      </div>
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
