import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadStripe } from "@stripe/stripe-js";
import { api } from "../../../api.js";
import {
  Button,
  Eyebrow,
  OrnamentRule,
  copyToClipboard,
} from "./index.js";

const CURRENCIES = {
  mxn: { symbol: "$", label: "MXN" },
  eur: { symbol: "€", label: "EUR" },
};

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

function formatAmount(currency, amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  return `${CURRENCIES[currency].symbol}${Math.round(n).toLocaleString("en-US")}`;
}

function resolveEmbeddedCheckoutInit(stripe) {
  const init = stripe.createEmbeddedCheckoutPage || stripe.initEmbeddedCheckout;
  if (typeof init !== "function") {
    throw new Error("No se pudo inicializar el pago.");
  }
  return init.bind(stripe);
}

function CardIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      style={{ strokeWidth: 1.5 }}
    >
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M3 10h18M7 15h4" />
    </svg>
  );
}

function Chevron({ open }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      style={{
        strokeWidth: 1.6,
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.4s ease",
      }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function GiftsSection({
  cfg,
  token,
  publishableKey,
  paymentMethods = null,
  preview = false,
}) {
  const registry = cfg?.registry || {};
  const [currency, setCurrency] = useState(() => detectCurrency());
  const [amount, setAmount] = useState("");
  const [bankOpen, setBankOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [giftMessage, setGiftMessage] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [channel, setChannel] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const [messageSending, setMessageSending] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [paid, setPaid] = useState(false);
  const [status, setStatus] = useState(null);
  const checkoutRef = useRef(null);
  const mountRef = useRef(null);
  const closeCheckoutRef = useRef(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("payment");
    if (p === "success") setStatus("success");
    else if (p === "cancelled") setStatus("cancelled");
  }, []);

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
        setPaying(false);
      }
    })();

    return () => {
      disposed = true;
      destroyInstance();
    };
  }, [checkoutOpen, clientSecret, publishableKey]);

  useEffect(() => {
    if (!checkoutOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeCheckoutRef.current?.();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [checkoutOpen]);

  if (!registry.enabled) return null;

  const isMxn = currency === "mxn";
  const bank = isMxn ? registry.bank || {} : registry.bank_eur || {};
  const bankRows = (
    isMxn
      ? [
          { key: "bank_name", label: "Banco" },
          { key: "holder", label: "Titular" },
          { key: "account_number", label: "Cuenta" },
          { key: "clabe", label: "CLABE" },
          { key: "concept", label: "Concepto" },
        ]
      : [
          { key: "bank_name", label: "Banco" },
          { key: "holder", label: "Titular" },
          { key: "iban", label: "IBAN / Cuenta" },
          { key: "concept", label: "Concepto" },
        ]
  ).filter((row) => String(bank[row.key] ?? "").trim() !== "");
  const bankEnabled = !!bank.enabled && bankRows.length > 0;
  const bankTitle = isMxn ? "Desde México" : "Desde España";
  const unlockKey = isMxn ? "clabe" : "iban";

  const min = Number(registry[`min_${currency}`]) || 0;
  const activeAmount = amount === "" ? NaN : Number(amount);
  const cardConfigured = !!registry.stripe_enabled;
  const paymentLink = String(registry.payment_link_url || "").trim();
  const linkMode = cardConfigured && !!paymentLink;
  const cardAvailableFor = (cur) => paymentMethods?.card?.[cur] !== false;
  const cardAvailable = cardAvailableFor(currency);
  const cardUsable = linkMode
    ? cardAvailableFor("mxn") || cardAvailableFor("eur")
    : cardAvailable;
  const stripeReady =
    cardConfigured && (linkMode || (!!publishableKey && !!token));

  const unlockGift = (nextChannel) => {
    setUnlocked(true);
    setChannel(nextChannel);
  };

  const doCopy = async (key, value) => {
    const ok = await copyToClipboard(String(value ?? ""));
    if (!ok) return;
    setCopiedKey(key);
    if (key === unlockKey) unlockGift("transfer");
    window.setTimeout(
      () => setCopiedKey((current) => (current === key ? null : current)),
      1800
    );
  };

  const payWithCard = async () => {
    setError("");
    unlockGift("card");
    if (linkMode) return;
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
    if (preview) {
      setError("La vista previa no abre la pasarela de pago.");
      return;
    }
    setPaying(true);
    setCheckoutError("");
    setPaid(false);
    try {
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

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setClientSecret(null);
    setCheckoutError("");
    setCheckoutReady(false);
    setPaying(false);
    if (paid) setStatus("success");
    setPaid(false);
  };
  // Ref estable para el listener de Escape (el efecto solo depende de
  // `checkoutOpen` y no se re-suscribe en cada render).
  closeCheckoutRef.current = closeCheckout;

  const retryCheckout = () => {
    setCheckoutError("");
    setCheckoutOpen(false);
    setClientSecret(null);
    payWithCard();
  };

  const sendGiftMessage = async () => {
    const message = giftMessage.trim();
    if (!message || messageSending) return;
    setMessageError("");
    if (preview || !token) {
      setMessageError("La vista previa no envía mensajes.");
      return;
    }
    setMessageSending(true);
    try {
      const payload = {
        message,
        currency,
        channel: channel || "transfer",
      };
      // Sin monto no se envía `amount` (el backend debe reflejar "No indicó
      // monto", no un importe de 0).
      if (Number.isFinite(activeAmount) && activeAmount > 0) {
        payload.amount = Math.round(activeAmount);
      }
      await api.invitations.giftMessage(token, payload);
      setMessageSent(true);
    } catch (err) {
      setMessageError(err.message || "No se pudo enviar el mensaje.");
    } finally {
      setMessageSending(false);
    }
  };

  const payAmountLabel =
    Number.isFinite(activeAmount) && activeAmount > 0
      ? formatAmount(currency, activeAmount)
      : "";

  const cardUnavailableMessage =
    `El pago con tarjeta no está disponible para ${CURRENCIES[currency].label} por ahora.` +
    (bankEnabled ? " Puedes usar la transferencia bancaria." : "");

  return (
    <div className="mjv3-stack mjv3-stack--gift">
      <Eyebrow>Regalo</Eyebrow>
      <OrnamentRule />
      <h2 className="mj-display mj-display--sm">Con todo nuestro cariño</h2>
      <p className="mj-copy mjv3-gift-copy">
        Que vengáis es, de verdad, nuestro mejor regalo. Si además queréis tener
        un detalle con nosotros, una aportación nos ayudará a empezar esta nueva
        vida juntos.
      </p>

      <div className="mjv3-gift-fields">
        <label>
          <span className="mjv3-field-label">Moneda</span>
          <select
            className="mjv3-field"
            value={currency}
            onChange={(event) => {
              setCurrency(event.target.value);
              setCopiedKey(null);
              setError("");
            }}
          >
            <option value="mxn">MXN</option>
            <option value="eur">EUR</option>
          </select>
        </label>
        <label>
          <span className="mjv3-field-label">Monto</span>
          <span className="mjv3-amount-box">
            <span className="mjv3-amount-symbol" aria-hidden="true">
              {CURRENCIES[currency].symbol}
            </span>
            <input
              className="mjv3-amount-input"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError("");
              }}
            />
          </span>
        </label>
      </div>

      <div className="mjv3-gift-actions">
        {cardConfigured ? (
          linkMode && cardUsable ? (
            <a
              className="mjv3-btn"
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                if (preview) {
                  event.preventDefault();
                  setError(
                    "Vista previa: el enlace de pago de Stripe se abrirá en la invitación publicada."
                  );
                  return;
                }
                unlockGift("card");
              }}
            >
              <CardIcon />
              Pagar con tarjeta
            </a>
          ) : (
            <Button
              type="button"
              onClick={payWithCard}
              disabled={paying || !stripeReady || !cardUsable || !cardAvailable}
            >
              <CardIcon />
              {paying ? "Abriendo pago…" : "Pagar con tarjeta"}
            </Button>
          )
        ) : null}

        {cardConfigured && !cardAvailable ? (
          <p className="mjv3-muted-note" style={{ textAlign: "center" }}>
            {cardUnavailableMessage}
          </p>
        ) : null}

        {bankEnabled ? (
          <button
            type="button"
            className="mjv3-btn mjv3-btn--outline"
            aria-expanded={bankOpen}
            onClick={() => setBankOpen((open) => !open)}
          >
            Transferencia bancaria
            <Chevron open={bankOpen} />
          </button>
        ) : null}
      </div>

      {bankEnabled ? (
        <div className="mjv3-gift-accordion" data-open={bankOpen ? "true" : "false"}>
          <div className="mjv3-gift-accordion-inner">
            <div>
              <div className="mjv3-bank-card">
                <div className="mjv3-bank-head">{bankTitle}</div>
                {bankRows.map((row) => (
                  <div className="mjv3-bank-row" key={row.key}>
                    <div>
                      <div className="mjv3-bank-label">{row.label}</div>
                      <div className="mjv3-bank-value">{bank[row.key]}</div>
                    </div>
                    <button
                      type="button"
                      className="mjv3-copy-btn"
                      data-copied={copiedKey === row.key ? "true" : "false"}
                      aria-label={`Copiar ${row.label}`}
                      onClick={() => doCopy(row.key, bank[row.key])}
                    >
                      {copiedKey === row.key ? "Copiado ✓" : "Copiar"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mjv3-gift-message">
        {messageSent ? (
          <p className="mjv3-gift-sent">
            ¡Gracias! Vuestro mensaje ya está en camino a los novios.
          </p>
        ) : (
          <>
            <p className="mjv3-gift-message-lead">
              Acompaña tu regalo con un mensaje para los novios.
            </p>
            {unlocked ? (
              <div className="mjv3-gift-message-fields">
                <textarea
                  className="mjv3-field"
                  rows={3}
                  maxLength={1000}
                  aria-label="Mensaje para los novios"
                  placeholder="Unas palabras para Macarena y Jorge…"
                  value={giftMessage}
                  onChange={(event) => setGiftMessage(event.target.value)}
                />
                <button
                  type="button"
                  className="mjv3-btn mjv3-btn--sm"
                  disabled={messageSending || !giftMessage.trim()}
                  onClick={sendGiftMessage}
                >
                  {messageSending ? "Enviando…" : "Enviar mensaje"}
                </button>
              </div>
            ) : null}
            {messageError ? <p className="mjv3-error">{messageError}</p> : null}
          </>
        )}
      </div>

      {error ? <p className="mjv3-error">{error}</p> : null}
      {status === "success" ? (
        <p className="mjv3-gift-status">¡Gracias por tu regalo!</p>
      ) : status === "cancelled" ? (
        <p className="mjv3-gift-status">Pago cancelado. No se realizó ningún cargo.</p>
      ) : null}

      {checkoutOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="mjv3 mjv3-checkout-backdrop"
              data-invitation-theme="boda_jorge_macarena"
              role="presentation"
              onClick={closeCheckout}
            >
          <div
            className="mjv3-checkout"
            role="dialog"
            aria-modal="true"
            aria-label={paid ? "Pago completado" : "Pago con tarjeta"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mjv3-checkout-head">
              <div>
                <h3 className="mjv3-checkout-title">
                  {paid ? "Pago completado" : "Pago con tarjeta"}
                </h3>
                <p className="mjv3-checkout-sub">
                  {paid
                    ? "Gracias por tu regalo."
                    : "Completa tus datos en la pasarela segura de Stripe."}
                </p>
              </div>
              <button
                type="button"
                className="mjv3-checkout-close"
                aria-label="Cerrar"
                onClick={closeCheckout}
              >
                ✕
              </button>
            </div>

            {paid ? (
              <div className="mjv3-checkout-success">
                <p className="mjv3-checkout-success-title">
                  ¡Gracias! Tu regalo se registró correctamente.
                </p>
                <p className="mjv3-muted-note">
                  Tu aportación fue recibida. Nos vemos en la celebración.
                </p>
                <button
                  type="button"
                  className="mjv3-btn"
                  style={{ marginTop: 20 }}
                  onClick={closeCheckout}
                >
                  Cerrar
                </button>
              </div>
            ) : checkoutError ? (
              <div className="mjv3-checkout-success">
                <p className="mjv3-checkout-success-title">
                  No se pudo abrir el pago
                </p>
                <p className="mjv3-muted-note">{checkoutError}</p>
                <div className="mjv3-answer-group" style={{ marginTop: 20 }}>
                  <button
                    type="button"
                    className="mjv3-btn mjv3-btn--outline"
                    onClick={closeCheckout}
                  >
                    Cancelar
                  </button>
                  <button type="button" className="mjv3-btn" onClick={retryCheckout}>
                    Reintentar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {payAmountLabel ? (
                  <p className="mjv3-checkout-sub" style={{ textAlign: "center" }}>
                    Monto a pagar: <strong>{payAmountLabel}</strong>
                  </p>
                ) : null}
                {!checkoutReady ? (
                  <div className="mjv3-checkout-loading" role="status">
                    Cargando pasarela segura…
                  </div>
                ) : null}
                <div ref={mountRef} />
                <p className="mjv3-checkout-note">
                  Pago seguro procesado por Stripe
                </p>
              </>
            )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
