import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api.js";
import { Button } from "../../components/ui.jsx";

/* ------------------------------------------------------------------
   Bandeja de mensajes de regalo (solo panel del anfitrión).
   Ruta: /events/:id/mensajes · API: events.giftMessages / markGiftMessageRead.
------------------------------------------------------------------- */

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.messages)) return payload.messages;
  return [];
}

function familyOf(message) {
  if (typeof message?.group === "string") return message.group;
  return (
    message?.sender_name ||
    message?.group_name ||
    message?.family_name ||
    message?.group?.name ||
    message?.name ||
    "—"
  );
}

function amountLabel(message) {
  const minor = Number(message?.amount_minor);
  const amount = Number.isFinite(minor)
    ? minor / 100
    : Number(message?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  const currency = String(message?.currency || "").toUpperCase();
  const symbol = currency === "EUR" ? "€" : currency === "MXN" ? "$" : "";
  const formatted = amount.toLocaleString("es-MX", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}${currency ? ` ${currency}` : ""}`;
}

function dateLabel(message) {
  const raw = message?.created_at || message?.date || message?.createdAt;
  const time = Date.parse(raw);
  if (!Number.isFinite(time)) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(time));
  } catch {
    return new Date(time).toLocaleString("es-MX");
  }
}

function channelLabel(message) {
  const channel = String(message?.channel || "").toLowerCase();
  if (channel === "card") return "Tarjeta";
  if (channel === "transfer") return "Transferencia";
  return channel || "—";
}

export default function EventMessages() {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.events
      .giftMessages(id)
      .then((payload) => {
        if (!cancelled) setMessages(asList(payload));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const markRead = async (message) => {
    const messageId = message.id ?? message.message_id;
    if (!messageId || marking) return;
    setMarking(messageId);
    setError("");
    try {
      await api.events.markGiftMessageRead(id, messageId);
      setMessages((current) =>
        current.map((item) =>
          (item.id ?? item.message_id) === messageId
            ? { ...item, read: true, read_at: new Date().toISOString() }
            : item
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setMarking(null);
    }
  };

  if (loading) {
    return <p className="text-gray-400 animate-page-in">Cargando mensajes…</p>;
  }

  return (
    <div className="animate-page-in">
      <h1 className="text-2xl font-bold text-gray-50 mb-1">Mensajes</h1>
      <p className="text-sm text-gray-400 mb-6">
        Mensajes que los invitados dejaron junto a su regalo.
      </p>

      {error && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 p-8 text-center text-gray-400">
          <p>Aún no hay mensajes.</p>
          <p className="mt-1 text-sm text-gray-500">
            Aparecerán aquí cuando alguien escriba desde la tarjeta de Regalo
            de su invitación.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message, index) => {
            const messageId = message.id ?? message.message_id ?? index;
            const read = !!message.read_at || !!message.read;
            return (
              <article
                key={messageId}
                className={`rounded-2xl border p-5 ${
                  read
                    ? "border-gray-800 bg-gray-900"
                    : "border-indigo-500/35 bg-gradient-to-br from-indigo-500/10 to-violet-500/5"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-gray-50">
                        {familyOf(message)}
                      </h2>
                      {!read && (
                        <span className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-300">
                          Nuevo
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{dateLabel(message)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span className="rounded-full border border-gray-700 px-2.5 py-1">
                      {amountLabel(message)}
                    </span>
                    <span className="rounded-full border border-gray-700 px-2.5 py-1">
                      {channelLabel(message)}
                    </span>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-200">
                  {message.message || message.text || "—"}
                </p>

                <div className="mt-4 flex justify-end">
                  {read ? (
                    <span className="text-xs text-gray-500">Leído</span>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={marking === messageId}
                      onClick={() => markRead(message)}
                    >
                      {marking === messageId ? "Marcando…" : "Marcar leído"}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
