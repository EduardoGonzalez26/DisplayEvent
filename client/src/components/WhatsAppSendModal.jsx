import { useEffect, useMemo, useState } from "react";
import { Modal, Button, Field, inputClass } from "./ui.jsx";
import { api } from "../api.js";

const STEPS = ["Resumen", "Mensaje", "Confirmación", "Envío"];

// Mismo criterio de enlace que el botón "Invitación" de EventGuests.
function inviteLink(event, token) {
  const base = `${window.location.origin}/invitacion`;
  return event?.slug ? `${base}/${event.slug}/${token}` : `${base}/${token}`;
}

// Mismo formato que renderiza el servidor: "sábado 12 de septiembre de 2026 · 17:00".
function formatEventDate(date, time) {
  let year;
  let month;
  let day;
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    year = date.getUTCFullYear();
    month = date.getUTCMonth() + 1;
    day = date.getUTCDate();
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date ?? ""));
    if (!match) return typeof time === "string" ? time.slice(0, 5) : "";
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  }
  const parts = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(new Date(Date.UTC(year, month - 1, day)));
  const pick = (type) => parts.find((part) => part.type === type)?.value || "";
  const dateText = `${pick("weekday")} ${pick("day")} de ${pick("month")} de ${pick("year")}`;
  const hhmm = typeof time === "string" ? time.slice(0, 5) : "";
  if (!hhmm) return dateText;
  return dateText ? `${dateText} · ${hhmm}` : hhmm;
}

// Reemplaza variables y, si el mensaje ya no trae {{enlace}}, lo agrega al final
// (igual que lo hará el servidor al enviar).
function renderMessage(template, group, event) {
  if (!group) return template || "";
  const source = String(template || "");
  const link = inviteLink(event, group.invitation_token);
  let text = source
    .replace(/\{\{lider\}\}/g, group.leader_name || "invitado")
    .replace(/\{\{evento\}\}/g, event?.name || "")
    .replace(/\{\{fecha\}\}/g, formatEventDate(event?.date, event?.time))
    .replace(/\{\{lugar\}\}/g, event?.place || "")
    .replace(/\{\{enlace\}\}/g, link);
  if (!source.includes("{{enlace}}")) text = `${text.trimEnd()}\n${link}`;
  return text;
}

function Spinner({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function WhatsAppIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Zm0 2a7 7 0 1 1-3.6 13l-.4-.2-2.2.6.6-2.1-.2-.4A7 7 0 0 1 12 5Zm-2.7 3.2c-.2 0-.5.1-.7.4-.2.3-.8 1-.8 2s.6 2 .8 2.2c.3.4 1.5 2.3 3.7 3.1 1.8.7 2.2.6 2.6.6.5 0 1.4-.5 1.6-1.1.2-.6.2-1 .2-1.1-.1-.2-.3-.2-.6-.3l-1.4-.7c-.2-.1-.4-.1-.5.1l-.6.8c-.1.1-.2.2-.4.1a5.7 5.7 0 0 1-1.7-1 6.4 6.4 0 0 1-1.2-1.5c-.1-.2 0-.3.1-.4l.5-.6c.1-.2.2-.3.1-.5l-.6-1.5c-.2-.4-.3-.4-.5-.4h-.5Z" />
    </svg>
  );
}

function PhoneIcon({ className = "w-3.5 h-3.5" }) {
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
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z" />
    </svg>
  );
}

function SummaryTile({ label, value, accent = "text-gray-50" }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/60 px-3 py-3 text-center">
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

function Stepper({ step }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={label} className="flex items-center">
              {i > 0 && (
                <span
                  className={`w-4 sm:w-6 h-px mx-1 ${done || active ? "bg-indigo-500/60" : "bg-gray-700"}`}
                />
              )}
              <span
                className={`grid place-items-center w-6 h-6 rounded-full text-[11px] font-semibold border transition-colors ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 border-transparent text-white"
                    : done
                      ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                      : "border-gray-700 text-gray-500"
                }`}
              >
                {n}
              </span>
              <span className={`ml-1.5 text-xs hidden sm:inline ${active ? "text-gray-100" : "text-gray-500"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <span className="text-xs text-gray-500 sm:hidden">Paso {step} de 4</span>
    </div>
  );
}

export default function WhatsAppSendModal({ eventId, event, groups = [], onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState("");
  const [mode, setMode] = useState("link");
  const [presets, setPresets] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [error, setError] = useState("");
  // idle | sending | done | error
  const [phase, setPhase] = useState("idle");
  const [result, setResult] = useState(null);
  const [openedIds, setOpenedIds] = useState(() => new Set());
  const [copiedId, setCopiedId] = useState(null);
  const [marking, setMarking] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.whatsapp
      .get(eventId)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.presets) ? data.presets : [];
        setMode(data?.mode === "cloud" ? "cloud" : "link");
        setPresets(list);
        const preset = list.find((p) => p.id === data?.default_preset) || list[0] || null;
        if (data?.message) {
          setMessage(data.message);
          setSelectedPreset(null);
        } else {
          setMessage(preset?.text || "");
          setSelectedPreset(preset?.id ?? null);
        }
        setLoadingConfig(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setConfigError(err.message);
        setLoadingConfig(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const sendableGroups = useMemo(
    () => groups.filter((g) => g.leader_phone && g.invitation_token),
    [groups]
  );
  const missingPhone = useMemo(() => groups.filter((g) => !g.leader_phone), [groups]);
  const missingToken = useMemo(
    () => groups.filter((g) => g.leader_phone && !g.invitation_token),
    [groups]
  );
  const coveredGuests = useMemo(
    () => sendableGroups.reduce((sum, g) => sum + (Number(g.guests_count) || 0), 0),
    [sendableGroups]
  );
  const previewGroup = sendableGroups[0] || null;
  const previewText = useMemo(
    () => renderMessage(message, previewGroup, event),
    [message, previewGroup, event]
  );

  const recipients = Array.isArray(result?.recipients) ? result.recipients : [];
  const failed = Array.isArray(result?.failed) ? result.failed : [];
  const skipped = Array.isArray(result?.skipped) ? result.skipped : [];

  const handleClose = () => {
    if (phase === "sending") return;
    onClose?.();
  };

  const selectPreset = (preset) => {
    setSelectedPreset(preset.id);
    setMessage(preset.text || "");
  };

  const handleConfirm = async () => {
    setError("");
    setPhase("sending");
    setStep(4);
    try {
      await api.whatsapp.saveMessage(eventId, message);
      const res = await api.whatsapp.send(eventId, {});
      if (res?.mode) setMode(res.mode);
      setResult(res);
      setOpenedIds(new Set());
      setPhase("done");
    } catch (err) {
      setError(err.message);
      setPhase("error");
    }
  };

  const handleOpen = (recipient) => {
    if (!recipient.waUrl) {
      setError("Este destinatario no tiene enlace de WhatsApp. Revisa el teléfono del líder.");
      return;
    }
    window.open(recipient.waUrl, "_blank", "noopener");
    setOpenedIds((prev) => {
      const next = new Set(prev);
      next.add(recipient.groupId);
      return next;
    });
  };

  const handleCopy = async (recipient) => {
    try {
      await navigator.clipboard.writeText(recipient.message || "");
      setCopiedId(recipient.groupId);
      window.setTimeout(() => {
        setCopiedId((current) => (current === recipient.groupId ? null : current));
      }, 2000);
    } catch {
      setError("No se pudo copiar el mensaje. Selecciónalo y cópialo manualmente.");
    }
  };

  const handleMark = async () => {
    const ids =
      openedIds.size > 0 ? Array.from(openedIds) : recipients.map((r) => r.groupId);
    if (ids.length === 0) return;
    setMarking(true);
    setError("");
    try {
      await api.whatsapp.mark(eventId, ids);
      onDone?.(
        ids.length === 1
          ? "Se marcó 1 invitación como enviada"
          : `Se marcaron ${ids.length} invitaciones como enviadas`,
        "success"
      );
    } catch (err) {
      setError(err.message);
      setMarking(false);
    }
  };

  const handleRetry = async () => {
    const failedIds = failed.map((f) => f.group_id);
    if (failedIds.length === 0) return;
    setRetrying(true);
    setError("");
    try {
      const res = await api.whatsapp.send(eventId, { groupIds: failedIds });
      if (res?.mode) setMode(res.mode);
      setResult((prev) => ({
        ...res,
        sent: (Number(prev?.sent) || 0) + (Number(res?.sent) || 0),
        failed: Array.isArray(res?.failed) ? res.failed : [],
        skipped: [
          ...(Array.isArray(prev?.skipped) ? prev.skipped : []),
          ...(Array.isArray(res?.skipped) ? res.skipped : []),
        ],
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setRetrying(false);
    }
  };

  let body = null;
  let footer = null;

  if (loadingConfig) {
    body = (
      <div className="py-10 flex items-center justify-center gap-2 text-sm text-gray-400">
        <Spinner />
        Cargando configuración…
      </div>
    );
    footer = (
      <Button variant="secondary" onClick={onClose}>
        Cancelar
      </Button>
    );
  } else if (configError) {
    body = <p className="text-sm text-red-400 py-4">{configError}</p>;
    footer = (
      <Button variant="secondary" onClick={onClose}>
        Cerrar
      </Button>
    );
  } else if (step === 1) {
    body = (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2.5">
          <SummaryTile label="Grupos" value={groups.length} />
          <SummaryTile
            label="Enviables"
            value={sendableGroups.length}
            accent={sendableGroups.length > 0 ? "text-indigo-300" : "text-gray-50"}
          />
          <SummaryTile label="Invitados cubiertos" value={coveredGuests} />
        </div>

        <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4 text-sm text-gray-300 leading-relaxed">
          {sendableGroups.length > 0 ? (
            <>
              Se enviará la invitación a <b className="text-gray-100">{sendableGroups.length} líderes</b> de
              grupo y cubrirá a <b className="text-gray-100">{coveredGuests} invitados</b>.
            </>
          ) : (
            <>Ningún grupo es enviable todavía: agrega el WhatsApp de los líderes para poder enviarles la invitación.</>
          )}
        </div>

        {missingPhone.length > 0 && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
            <p className="text-sm font-medium text-amber-300">
              {missingPhone.length === 1
                ? "1 grupo sin WhatsApp del líder"
                : `${missingPhone.length} grupos sin WhatsApp del líder`}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Agrega el WhatsApp del líder para poder enviarle.
            </p>
            <ul className="mt-2 space-y-0.5">
              {missingPhone.map((g) => (
                <li key={g.id} className="text-sm text-gray-300 truncate">
                  {g.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {missingToken.length > 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
            <p className="text-sm font-medium text-gray-300">
              {missingToken.length === 1
                ? "1 grupo aún no tiene enlace de invitación"
                : `${missingToken.length} grupos aún no tienen enlace de invitación`}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Ábrelo desde el botón “Invitación” del grupo para generarlo.
            </p>
          </div>
        )}
      </div>
    );
    footer = (
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => setStep(2)} disabled={sendableGroups.length === 0}>
          Continuar
        </Button>
      </>
    );
  } else if (step === 2) {
    body = (
      <div className="space-y-4">
        {presets.length > 0 && (
          <div className="grid sm:grid-cols-3 gap-2">
            {presets.map((preset) => {
              const active = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  aria-pressed={active}
                  className={`text-left rounded-xl border p-3 transition-all ${
                    active
                      ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-950/30"
                      : "border-gray-800 bg-gray-950/60 hover:border-gray-600"
                  }`}
                >
                  <span
                    className={`block text-sm font-medium ${active ? "text-indigo-300" : "text-gray-200"}`}
                  >
                    {preset.name}
                  </span>
                  <span className="block text-xs text-gray-500 mt-1 whitespace-pre-wrap line-clamp-3">
                    {preset.text}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <Field label="Mensaje para los líderes">
          <textarea
            className={`${inputClass} min-h-[140px] resize-y`}
            maxLength={800}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setSelectedPreset(null);
            }}
            placeholder="Escribe el mensaje de la invitación…"
          />
          <span className="flex items-center justify-between gap-3 mt-1">
            <span className="text-xs text-gray-500">
              Variables: {"{{lider}}"}, {"{{evento}}"}, {"{{fecha}}"}, {"{{lugar}}"} y {"{{enlace}}"}.
            </span>
            <span className={`text-xs shrink-0 ${message.length >= 800 ? "text-amber-400" : "text-gray-500"}`}>
              {message.length}/800
            </span>
          </span>
        </Field>

        <p className="flex items-start gap-2 text-xs text-gray-400 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="w-4 h-4 shrink-0 mt-px text-indigo-400"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
          </svg>
          Si quitas la variable {"{{enlace}}"}, la agregamos automáticamente al enviar.
        </p>

        {previewGroup && (
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1.5">
              Vista previa · {previewGroup.name}
            </p>
            <div className="rounded-xl border border-gray-800 bg-gray-950/80 p-3 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {previewText}
            </div>
          </div>
        )}
      </div>
    );
    footer = (
      <>
        <Button variant="secondary" onClick={() => setStep(1)}>
          Atrás
        </Button>
        <Button onClick={() => setStep(3)} disabled={!message.trim()}>
          Continuar
        </Button>
      </>
    );
  } else if (step === 3) {
    body = (
      <div className="space-y-3">
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5">
          <p className="text-base text-gray-100 leading-relaxed">
            Se enviarán <b className="text-white">{sendableGroups.length}</b>{" "}
            {sendableGroups.length === 1 ? "invitación" : "invitaciones"} por WhatsApp a los líderes
            {coveredGuests > 0 ? (
              <>
                {" "}
                y cubren <b className="text-white">{coveredGuests}</b>{" "}
                {coveredGuests === 1 ? "invitado" : "invitados"}.
              </>
            ) : (
              "."
            )}
          </p>
          <p className="text-sm text-gray-300 mt-3">
            {mode === "cloud"
              ? "Se enviarán automáticamente desde el servidor."
              : "Se abrirán las conversaciones con el mensaje listo; tú confirmas cada envío."}
          </p>
        </div>
        <p className="text-xs text-gray-500">
          Guardaremos este mensaje para futuros envíos del evento.
        </p>
      </div>
    );
    footer = (
      <>
        <Button variant="secondary" onClick={() => setStep(2)} disabled={phase === "sending"}>
          Atrás
        </Button>
        <Button onClick={handleConfirm} disabled={phase === "sending"}>
          {phase === "sending" ? "Enviando…" : "Confirmar y enviar"}
        </Button>
      </>
    );
  } else if (phase === "sending") {
    body = (
      <div className="py-12 flex flex-col items-center gap-3 text-gray-300">
        <Spinner className="w-6 h-6 text-indigo-400" />
        <p className="text-sm">Enviando invitaciones…</p>
        <p className="text-xs text-gray-500">Esto puede tardar unos segundos.</p>
      </div>
    );
  } else if (phase === "error") {
    body = (
      <div className="py-4">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
    footer = (
      <>
        <Button
          variant="secondary"
          onClick={() => {
            setError("");
            setPhase("idle");
            setStep(3);
          }}
        >
          Volver
        </Button>
        <Button onClick={handleConfirm}>Reintentar</Button>
      </>
    );
  } else if (mode === "link") {
    body = (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-300">
            <b className="text-white">{openedIds.size}</b> de {recipients.length} abiertos
          </p>
          {skipped.length > 0 && (
            <span className="text-xs text-amber-300">{skipped.length} omitidos</span>
          )}
        </div>

        {recipients.length === 0 ? (
          <p className="text-sm text-gray-400">
            No hubo destinatarios para enviar. Revisa los grupos y sus teléfonos.
          </p>
        ) : (
          <ul className="space-y-2">
            {recipients.map((recipient) => {
              const opened = openedIds.has(recipient.groupId);
              return (
                <li
                  key={recipient.groupId}
                  className={`rounded-xl border p-3 transition-colors ${
                    opened
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-gray-800 bg-gray-950/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-100 truncate">{recipient.groupName}</p>
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1.5">
                        <PhoneIcon />
                        {recipient.leaderName}
                        {recipient.phone ? ` · ${recipient.phone}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        className="!px-3 !py-1.5 !text-xs"
                        onClick={() => handleCopy(recipient)}
                      >
                        {copiedId === recipient.groupId ? "Copiado" : "Copiar mensaje"}
                      </Button>
                      <Button
                        className="!px-3 !py-1.5 !text-xs inline-flex items-center gap-1.5"
                        onClick={() => handleOpen(recipient)}
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                        {opened ? "Abrir de nuevo" : "Abrir WhatsApp"}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {skipped.length > 0 && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
            <p className="text-xs font-medium text-amber-300 mb-1">Grupos omitidos</p>
            <ul className="space-y-0.5">
              {skipped.map((item) => (
                <li key={item.group_id} className="text-xs text-gray-400">
                  <b className="text-gray-300">{item.group_name}</b> · {item.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onClick={onClose}>
          Cerrar sin marcar
        </Button>
        <Button onClick={handleMark} disabled={marking || recipients.length === 0}>
          {marking ? "Marcando…" : "Marcar como enviadas"}
        </Button>
      </>
    );
  } else {
    const sentTotal = Number(result?.sent) || 0;
    const cloudSummary = failed.length
      ? `Enviadas ${sentTotal}, fallaron ${failed.length}`
      : sentTotal === 1
        ? "Se envió 1 invitación"
        : `Se enviaron ${sentTotal} invitaciones`;
    body = (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5">
          <SummaryTile label="Enviadas" value={sentTotal} accent="text-emerald-300" />
          <SummaryTile
            label="Fallidas"
            value={failed.length}
            accent={failed.length > 0 ? "text-red-300" : "text-gray-50"}
          />
        </div>

        {failed.length > 0 ? (
          <div className="rounded-xl border border-red-900 bg-red-600/10 p-3">
            <p className="text-xs font-medium text-red-300 mb-1.5">Errores</p>
            <ul className="space-y-1">
              {failed.map((item) => (
                <li key={item.group_id} className="text-xs text-gray-300">
                  <b>{item.group_name}</b>: {item.error}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-emerald-300">
            Todas las invitaciones se enviaron correctamente.
          </p>
        )}

        {skipped.length > 0 && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
            <p className="text-xs font-medium text-amber-300 mb-1">Grupos omitidos</p>
            <ul className="space-y-0.5">
              {skipped.map((item) => (
                <li key={item.group_id} className="text-xs text-gray-400">
                  <b className="text-gray-300">{item.group_name}</b> · {item.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
    footer = (
      <>
        {failed.length > 0 && (
          <Button variant="secondary" onClick={handleRetry} disabled={retrying}>
            {retrying ? "Reintentando…" : "Reintentar fallidas"}
          </Button>
        )}
        <Button onClick={() => onDone?.(cloudSummary, failed.length > 0 ? "error" : "success")}>
          Listo
        </Button>
      </>
    );
  }

  return (
    <Modal open onClose={handleClose} title="Enviar invitaciones por WhatsApp" wide>
      <Stepper step={step} />
      <div className="max-h-[58vh] overflow-y-auto pr-1 -mr-1">{body}</div>
      {error && phase !== "error" && <p className="text-sm text-red-400 mt-3">{error}</p>}
      <div className="flex justify-end gap-2 mt-4">{footer}</div>
    </Modal>
  );
}
