import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api.js";
import { Button } from "../../components/ui.jsx";

/* ------------------------------------------------------------------
   Pagos del evento (solo panel del anfitrión).
   Ruta: /events/:id/pagos · API: events.gifts.
   Los montos vienen en centavos (BIGINT como string); se muestran brutos,
   sin calcular comisiones de Stripe.
------------------------------------------------------------------- */

const MODES = {
  live: {
    label: "Live",
    empty: "No hay pagos live registrados.",
  },
  test: {
    label: "Test",
    empty: "No hay pagos de prueba registrados.",
  },
};

const STATUS_STYLES = {
  succeeded: {
    label: "Exitoso",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  pending: {
    label: "Pendiente",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  failed: {
    label: "Fallido",
    className: "border-red-500/30 bg-red-500/10 text-red-300",
  },
};

const DATE_FORMAT = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function statusOf(row) {
  const key = String(row?.status || "").toLowerCase();
  return (
    STATUS_STYLES[key] || {
      label: key || "Desconocido",
      className: "border-gray-600 bg-gray-800 text-gray-300",
    }
  );
}

function currencyCode(value) {
  return String(value || "").toUpperCase();
}

function amountText(amountMinor, currency) {
  const minor = Number(amountMinor);
  if (!Number.isFinite(minor)) return "—";
  const code = currencyCode(currency);
  const amount = minor / 100;
  const symbol = code === "MXN" ? "$" : code === "EUR" ? "€" : "";
  const formatted = amount.toLocaleString("es-MX", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}${code ? ` ${code}` : ""}`;
}

function dateLabel(value) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "—";
  return DATE_FORMAT.format(new Date(time));
}

function shortAccount(value) {
  if (!value) return "—";
  const account = String(value);
  if (account.length <= 15) return account;
  return `${account.slice(0, 10)}…${account.slice(-4)}`;
}

function stripePaymentUrl(row) {
  const paymentIntent = row?.stripe_payment_intent_id;
  if (!paymentIntent) return null;
  const prefix = row.livemode ? "" : "test/";
  return `https://dashboard.stripe.com/${prefix}payments/${encodeURIComponent(paymentIntent)}`;
}

function accountState(row, eventAccountId) {
  if (!row?.destination_account) {
    return {
      label: "Sin dato",
      className: "border-gray-600 bg-gray-800 text-gray-300",
    };
  }
  if (eventAccountId && row.destination_account === eventAccountId) {
    return {
      label: "Cuenta actual",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    };
  }
  return {
    label: "Otra cuenta",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  };
}

function totalsByCurrency(rows) {
  const totals = new Map();
  for (const row of rows) {
    const minor = Number(row.amount_minor);
    if (!Number.isFinite(minor)) continue;
    const code = currencyCode(row.currency) || "—";
    const entry = totals.get(code) || { currency: code, totalMinor: 0, count: 0 };
    entry.totalMinor += minor;
    entry.count += 1;
    totals.set(code, entry);
  }
  const preferredOrder = { MXN: 0, EUR: 1 };
  return [...totals.values()].sort(
    (a, b) =>
      (preferredOrder[a.currency] ?? 99) - (preferredOrder[b.currency] ?? 99) ||
      a.currency.localeCompare(b.currency)
  );
}

function plural(count, singular, pluralForm) {
  return count === 1 ? singular : pluralForm;
}

function statusBreakdown(summary) {
  const parts = [`${summary.succeeded} ${plural(summary.succeeded, "exitoso", "exitosos")}`];
  if (summary.pending > 0) {
    parts.push(`${summary.pending} ${plural(summary.pending, "pendiente", "pendientes")}`);
  }
  if (summary.failed > 0) {
    parts.push(`${summary.failed} ${plural(summary.failed, "fallido", "fallidos")}`);
  }
  return parts.join(" · ");
}

function ExternalIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </svg>
  );
}

export default function EventPayments() {
  const { id } = useParams();
  const [gifts, setGifts] = useState([]);
  const [eventAccountId, setEventAccountId] = useState("");
  const [mode, setMode] = useState("live");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setMode("live");

    api.events
      .gifts(id)
      .then((payload) => {
        if (cancelled) return;
        const rows = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
        setGifts(rows);
        setEventAccountId(payload?.event_account_id || "");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setGifts([]);
        setEventAccountId("");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const liveRows = useMemo(() => gifts.filter((row) => Boolean(row.livemode)), [gifts]);
  const testRows = useMemo(() => gifts.filter((row) => !row.livemode), [gifts]);
  const rows = mode === "live" ? liveRows : testRows;

  const summary = useMemo(() => {
    const succeeded = rows.filter((row) => String(row.status).toLowerCase() === "succeeded");
    const pending = rows.filter((row) => String(row.status).toLowerCase() === "pending");
    const failed = rows.filter((row) => String(row.status).toLowerCase() === "failed");
    return {
      total: rows.length,
      succeeded: succeeded.length,
      pending: pending.length,
      failed: failed.length,
      currencies: totalsByCurrency(succeeded),
    };
  }, [rows]);

  // Los pagos live que no apuntan a la cuenta configurada actualmente en el
  // evento requieren conciliación manual (pueden pertenecer a una cuenta
  // anterior, como los pagos históricos del evento).
  const mismatchedLive = useMemo(
    () =>
      liveRows.filter(
        (row) => row.destination_account && row.destination_account !== eventAccountId
      ),
    [liveRows, eventAccountId]
  );
  const mismatchCurrencies = useMemo(
    () => totalsByCurrency(mismatchedLive),
    [mismatchedLive]
  );
  const mismatchAccounts = useMemo(
    () => [
      ...new Set(mismatchedLive.map((row) => row.destination_account).filter(Boolean)),
    ],
    [mismatchedLive]
  );

  return (
    <div className="animate-page-in">
      <h1 className="text-2xl font-bold text-gray-50 mb-1">Pagos</h1>
      <p className="text-sm text-gray-400 mb-6">
        Regalos recibidos y conciliación de los pagos con la cuenta de Stripe.
      </p>

      {loading ? (
        <p className="text-gray-400" aria-busy="true">
          Cargando pagos…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/40 bg-red-500/5 p-5"
        >
          <p className="text-sm text-red-400">{error}</p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          {mismatchedLive.length > 0 && (
            <section
              role="alert"
              className="mb-5 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-orange-500/5 p-5"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid place-items-center w-9 h-9 shrink-0 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                  >
                    <path d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a1.8 1.8 0 0 0 1.6 2.7h16a1.8 1.8 0 0 0 1.6-2.7L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-amber-200">
                    Hay {mismatchedLive.length}{" "}
                    {plural(mismatchedLive.length, "pago live que cayó", "pagos live que cayeron")}{" "}
                    en otra cuenta
                  </h2>
                  <p className="mt-1 text-sm text-amber-100/80">
                    Monto total:{" "}
                    {mismatchCurrencies.length > 0
                      ? mismatchCurrencies
                          .map((item) => amountText(item.totalMinor, item.currency))
                          .join(" · ")
                      : "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-amber-100/70">
                    <span>
                      {plural(mismatchAccounts.length, "Cuenta destino", "Cuentas destino")}:
                    </span>
                    {mismatchAccounts.map((account) => (
                      <code
                        key={account}
                        className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[11px] text-amber-200"
                      >
                        {account}
                      </code>
                    ))}
                  </div>
                  {eventAccountId && (
                    <p className="mt-1 text-xs text-amber-100/60">
                      La cuenta actual del evento es{" "}
                      <span className="break-all font-mono">{eventAccountId}</span>.
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          <div
            role="group"
            aria-label="Modo de los pagos"
            className="mb-5 inline-flex rounded-xl border border-gray-800 bg-gray-900 p-1"
          >
            {[
              ["live", liveRows.length],
              ["test", testRows.length],
            ].map(([key, count]) => {
              const active = mode === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMode(key)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-md shadow-indigo-900/40"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  {MODES[key].label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      active ? "bg-white/20 text-white" : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.currencies.map((item) => (
              <div
                key={item.currency}
                className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 p-5"
              >
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-500/70 via-indigo-500/70 to-violet-500/70" />
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Recibido en {item.currency}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-50">
                  {amountText(item.totalMinor, item.currency)}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {item.count} {plural(item.count, "pago exitoso", "pagos exitosos")}
                </p>
              </div>
            ))}

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Pagos en {MODES[mode].label}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-50">{summary.total}</p>
              <p className="mt-1 text-xs text-gray-400">{statusBreakdown(summary)}</p>
            </div>

            <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-5">
              <p className="text-xs uppercase tracking-wide text-indigo-300">
                Cuenta del evento
              </p>
              <p className="mt-1 break-all font-mono text-sm text-gray-100">
                {eventAccountId || "Sin cuenta configurada"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Destino actual de los pagos live
              </p>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-700 p-8 text-center text-gray-400">
              <p>{MODES[mode].empty}</p>
              <p className="mt-1 text-sm text-gray-500">
                {gifts.length === 0
                  ? "Aparecerán aquí cuando los invitados regalen desde su invitación."
                  : `Hay ${gifts.length} ${plural(gifts.length, "pago", "pagos")} en el otro modo.`}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-2xl border border-gray-800 bg-gray-900 md:block">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <caption className="sr-only">
                    Pagos en modo {MODES[mode].label}
                  </caption>
                  <thead>
                    <tr className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
                      <th scope="col" className="px-4 py-3 font-medium">
                        Fecha
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Grupo
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Monto
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Estado
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Cuenta destino
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Stripe
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const status = statusOf(row);
                      const account = accountState(row, eventAccountId);
                      const stripeUrl = stripePaymentUrl(row);
                      return (
                        <tr
                          key={row.id ?? row.stripe_payment_intent_id ?? index}
                          className="border-b border-gray-800/70 transition-colors last:border-0 hover:bg-gray-800/30"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                            {dateLabel(row.created_at)}
                          </td>
                          <td className="px-4 py-3 text-gray-200">
                            {row.group_name || "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-50">
                            {amountText(row.amount_minor, row.currency)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              title={row.status || undefined}
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${account.className}`}
                              >
                                {account.label}
                              </span>
                              <span
                                title={row.destination_account || undefined}
                                className="font-mono text-[11px] text-gray-500"
                              >
                                {shortAccount(row.destination_account)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {stripeUrl ? (
                              <a
                                href={stripeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                              >
                                Ver en Stripe
                                <ExternalIcon />
                              </a>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {rows.map((row, index) => {
                  const status = statusOf(row);
                  const account = accountState(row, eventAccountId);
                  const stripeUrl = stripePaymentUrl(row);
                  return (
                    <article
                      key={row.id ?? row.stripe_payment_intent_id ?? index}
                      className="rounded-2xl border border-gray-800 bg-gray-900 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-50">
                            {row.group_name || "—"}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {dateLabel(row.created_at)}
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold text-gray-50">
                          {amountText(row.amount_minor, row.currency)}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          title={row.status || undefined}
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${account.className}`}
                        >
                          {account.label}
                        </span>
                        <span
                          title={row.destination_account || undefined}
                          className="font-mono text-[11px] text-gray-500"
                        >
                          {shortAccount(row.destination_account)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-end border-t border-gray-800 pt-3">
                        {stripeUrl ? (
                          <a
                            href={stripeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                          >
                            Ver en Stripe
                            <ExternalIcon />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-500">Sin PaymentIntent</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          <p className="mt-4 flex items-start gap-2 text-xs text-gray-500">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 w-4 h-4 shrink-0"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5m0-8h.01" />
            </svg>
            Los montos son brutos; las comisiones de Stripe las absorbe la
            plataforma.
          </p>
        </>
      )}
    </div>
  );
}
