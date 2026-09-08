import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { loadStripe } from "@stripe/stripe-js";
import { api } from "../../api.js";
import { SectionTitle } from "./util.jsx";
import { EASE, Reveal } from "../motion.jsx";

/* ------------------------------------------------------------------
   Mesa de Regalos (registry) — sección pública.
   Renderiza SOLO si `cfg.registry.enabled`. Permite elegir moneda,
   montos sugeridos + monto libre, depósito bancario con copiado y
   pago con tarjeta vía Stripe Checkout.
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
              <motion.button
                type="button"
                onClick={payWithCard}
                disabled={paying || !stripeReady}
                whileTap={reduced ? undefined : { scale: 0.98 }}
                className="w-full rounded-2xl bg-gradient-to-br from-inv-primary-light via-inv-primary to-inv-primary-deep px-6 py-4 font-inv-heading text-lg text-inv-on-accent shadow-xl hover:brightness-110 active:scale-[.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {paying ? "Abriendo pago…" : "Pagar con tarjeta"}
              </motion.button>
              {!stripeReady && (
                <p className="mt-2 text-center text-xs text-inv-text-muted">
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
