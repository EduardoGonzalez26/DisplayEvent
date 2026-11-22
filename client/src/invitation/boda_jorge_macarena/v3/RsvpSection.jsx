import { useEffect, useRef, useState } from "react";
import { api } from "../../../api.js";
import { formatRange } from "../../../lib/ageRanges.js";
import { Drawing, Eyebrow, OrnamentRule } from "./index.js";
import { V3 } from "./assets.js";

const EMPTY_AGE_RANGES = Object.freeze([]);

function buildAnswers(guests) {
  const map = {};
  for (const guest of guests) {
    if (guest.registered) map[guest.id] = "yes";
    else if (guest.declined) map[guest.id] = "no";
  }
  return map;
}

function buildAllergies(guests) {
  const map = {};
  for (const guest of guests) {
    map[guest.id] =
      guest.allergy === true ? true : guest.allergy === false ? false : null;
  }
  return map;
}

function buildAllergyText(guests) {
  const map = {};
  for (const guest of guests) {
    map[guest.id] = String(guest.allergy_notes || "");
  }
  return map;
}

function rangeMatchesAge(age, range) {
  const min = Number(range?.min);
  if (!Number.isFinite(min)) return false;
  if (range?.max === null || range?.max === undefined) return age >= min;
  const max = Number(range.max);
  return Number.isFinite(max) && age >= min && age < max;
}

function buildAgeSelections(guests, ranges) {
  const map = {};
  const list = Array.isArray(ranges) ? ranges : [];
  for (const guest of guests) {
    const stored =
      guest.age_range_id == null ? "" : String(guest.age_range_id).trim();
    if (stored) {
      const match = list.find((range) => String(range.id) === stored);
      map[guest.id] = match ? stored : "";
      continue;
    }
    if (guest.age != null) {
      const age = Number(guest.age);
      if (Number.isFinite(age)) {
        const match = list.find((range) => rangeMatchesAge(age, range));
        map[guest.id] = match ? String(match.id) : "";
        continue;
      }
    }
    map[guest.id] = "";
  }
  return map;
}

/* Borrador de la confirmación en el dispositivo: cada selección se guarda
   al momento y se recupera al volver a abrir la invitación (aunque solo se
   haya contestado por 1 de varios pases). Al confirmar se borra. */
const DRAFT_PREFIX = "mj:rsvp-draft:";

function readDraft(token) {
  if (!token) return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + token);
    const data = raw ? JSON.parse(raw) : null;
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

function writeDraft(token, data) {
  if (!token) return;
  try {
    window.localStorage.setItem(DRAFT_PREFIX + token, JSON.stringify(data));
  } catch {
    /* sin almacenamiento: no se guarda el borrador */
  }
}

function clearDraft(token) {
  if (!token) return;
  try {
    window.localStorage.removeItem(DRAFT_PREFIX + token);
  } catch {
    /* noop */
  }
}

// Aplica los valores del borrador sobre los del servidor, solo para los
// pases que siguen en el grupo.
function withDraft(base, draftMap, guests) {
  if (!draftMap || typeof draftMap !== "object") return base;
  const out = { ...base };
  for (const guest of guests) {
    if (Object.prototype.hasOwnProperty.call(draftMap, guest.id)) {
      out[guest.id] = draftMap[guest.id];
    }
  }
  return out;
}

function pad2(value) {
  return String(Math.max(0, Number(value) || 0)).padStart(2, "0");
}

function splitRemaining(ms) {
  const left = Math.max(0, Number(ms) || 0);
  const days = Math.floor(left / 86400000);
  const hours = Math.floor((left / 3600000) % 24);
  const minutes = Math.floor((left / 60000) % 60);
  return { days, hours, minutes };
}

// Fecha del límite en hora de España (el cierre es un instante, no una
// fecha local de cada invitado).
function deadlineLabel(ms) {
  try {
    return new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

// Nombre del grupo tal cual se capturó: no todos los invitados son una
// familia, así que nunca se antepone "Familia".
function familyLabelOf(family) {
  return String(family || "").trim();
}

function isFamilyGroup(guests) {
  return Array.isArray(guests) && guests.length > 0;
}

export default function RsvpSection({ rsvp }) {
  const {
    token,
    family,
    guests = [],
    attending = 0,
    declining = 0,
    note = "",
    cfg = {},
    preview = false,
    ageRanges = EMPTY_AGE_RANGES,
    onDone,
  } = rsvp || {};

  const familyLabel = familyLabelOf(family);
  const ageRangesList = Array.isArray(ageRanges) ? ageRanges : EMPTY_AGE_RANGES;
  const ageRangesKey = ageRangesList
    .map((range) => `${range.id}:${range.min}:${range.max}:${range.label}`)
    .join("|");
  const editable = !!cfg.rsvp_editable;
  const deadlineRaw = String(cfg.rsvp_edit_deadline || "").trim();
  const parsedDeadline = editable && deadlineRaw ? Date.parse(deadlineRaw) : NaN;
  const hasDeadline = Number.isFinite(parsedDeadline);
  const deadlineMs = hasDeadline ? parsedDeadline : NaN;
  const reduced = (() => {
    try {
      return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  })();

  // Ya confirmado en el servidor: manda lo del servidor. Si no, se recupera
  // el borrador guardado en este dispositivo.
  const serverAnswered = attending > 0 || declining > 0;
  // Guardado automático (RSVP editable y dentro de plazo): el borrador del
  // dispositivo siempre se aplica, porque puede tener selecciones a medias.
  const autoSaveMode = !preview && !!token && editable;
  const draft = !preview && (autoSaveMode || !serverAnswered) ? readDraft(token) : null;
  const [answers, setAnswers] = useState(() =>
    withDraft(buildAnswers(guests), draft?.answers, guests)
  );
  const [allergies, setAllergies] = useState(() =>
    withDraft(buildAllergies(guests), draft?.allergies, guests)
  );
  const [allergyText, setAllergyText] = useState(() =>
    withDraft(buildAllergyText(guests), draft?.allergyText, guests)
  );
  const [ageSelections, setAgeSelections] = useState(() =>
    withDraft(buildAgeSelections(guests, ageRangesList), draft?.ageSelections, guests)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(attending > 0 || declining > 0);
  const [editing, setEditing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [tStage, setTStage] = useState(attending > 0 || declining > 0 ? 4 : 0);
  const timers = useRef([]);
  const justSubmittedRef = useRef(false);

  useEffect(() => {
    const saved =
      !preview && (autoSaveMode || !(attending > 0 || declining > 0)) ? readDraft(token) : null;
    setAnswers(withDraft(buildAnswers(guests), saved?.answers, guests));
    setAllergies(withDraft(buildAllergies(guests), saved?.allergies, guests));
    setAllergyText(withDraft(buildAllergyText(guests), saved?.allergyText, guests));
    setAgeSelections(
      withDraft(buildAgeSelections(guests, ageRangesList), saved?.ageSelections, guests)
    );
  }, [guests, ageRangesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cada selección se guarda al momento (mientras no esté confirmado o se
  // esté editando una confirmación).
  useEffect(() => {
    if (preview || !token) return;
    if (!autoSaveMode && submitted && !editing) return;
    const touched =
      Object.keys(answers).length > 0 ||
      Object.values(allergies).some((v) => typeof v === "boolean") ||
      Object.values(ageSelections).some(Boolean);
    if (!touched) return;
    writeDraft(token, { answers, allergies, allergyText, ageSelections, t: Date.now() });
  }, [answers, allergies, allergyText, ageSelections, preview, token, submitted, editing]);

  useEffect(() => {
    const hasAnswer = attending > 0 || declining > 0;
    setSubmitted(hasAnswer);
    // Si la confirmación llega desde fuera (no por el envío de este
    // formulario), muestra el estado final sin animación.
    if (hasAnswer && !justSubmittedRef.current) setTStage(4);
  }, [attending, declining]);

  useEffect(() => {
    if (!hasDeadline) return undefined;
    const remaining = deadlineMs - Date.now();
    if (remaining <= 0) {
      setNow(Date.now());
      return undefined;
    }
    const timer = window.setTimeout(() => setNow(Date.now()), remaining + 300);
    return () => window.clearTimeout(timer);
  }, [deadlineMs, hasDeadline]);

  useEffect(() => {
    if (!hasDeadline) return undefined;
    const sync = () => setNow(Date.now());
    window.addEventListener("focus", sync);
    const id = window.setInterval(() => {
      sync();
      if (Date.now() > deadlineMs) window.clearInterval(id);
    }, 1000);
    return () => {
      window.removeEventListener("focus", sync);
      window.clearInterval(id);
    };
  }, [deadlineMs, hasDeadline]);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    []
  );

  const later = (fn, ms) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const expired = hasDeadline && now > deadlineMs;
  const canEdit = editable && !expired;

  const pending = guests.filter((guest) => {
    const answer = answers[guest.id];
    if (answer !== "yes" && answer !== "no") return true;
    if (answer === "yes") {
      if (typeof allergies[guest.id] !== "boolean") return true;
      if (ageRangesList.length === 0) return false;
      const selected = String(ageSelections[guest.id] || "");
      return !ageRangesList.some(
        (range) => String(range.id) === selected
      );
    }
    return false;
  }).length;
  const allAnswered = isFamilyGroup(guests) && pending === 0;
  const yesCount = guests.filter((guest) => answers[guest.id] === "yes").length;

  // ---------------- Guardado automático por pase ----------------
  // Un pase está completo con "No asistirá", o con "Sí" + alergia (+ rango
  // de edad si el evento los usa). Solo los completos se envían.
  const isComplete = (id) => {
    const answer = answers[id];
    if (answer === "no") return true;
    if (answer !== "yes") return false;
    if (typeof allergies[id] !== "boolean") return false;
    if (ageRangesList.length === 0) return true;
    const selected = String(ageSelections[id] || "");
    return ageRangesList.some((range) => String(range.id) === selected);
  };
  const guestSnapshot = (id) =>
    JSON.stringify([
      answers[id] || "",
      answers[id] === "yes" ? allergies[id] : null,
      answers[id] === "yes" && allergies[id] === true ? String(allergyText[id] || "").trim() : "",
      answers[id] === "yes" ? String(ageSelections[id] || "") : "",
    ]);
  // Lo que ya está en el servidor al abrir cuenta como guardado.
  const [savedSnap, setSavedSnap] = useState(() => {
    const map = {};
    for (const guest of guests) {
      if (guest.registered || guest.declined) map[guest.id] = "__server__";
    }
    return map;
  });
  const [autoState, setAutoState] = useState("idle"); // idle | saving | error
  const lastSentRef = useRef("");

  const buildPayload = () => {
    const complete = guests.filter((guest) => isComplete(guest.id));
    return {
      attending_ids: complete.filter((g) => answers[g.id] === "yes").map((g) => g.id),
      declining_ids: complete.filter((g) => answers[g.id] === "no").map((g) => g.id),
      allergies: complete.map((guest) => {
        const attendingGuest = answers[guest.id] === "yes";
        const hasAllergy = allergies[guest.id];
        return {
          guest_id: guest.id,
          has_allergy: attendingGuest && typeof hasAllergy === "boolean" ? hasAllergy : null,
          notes:
            attendingGuest && hasAllergy === true ? String(allergyText[guest.id] || "").trim() : "",
        };
      }),
      age_selections: complete.map((guest) => ({
        guest_id: guest.id,
        range_id: answers[guest.id] === "yes" ? ageSelections[guest.id] || null : null,
      })),
      note,
    };
  };

  useEffect(() => {
    if (!autoSaveMode || expired) return undefined;
    const payload = buildPayload();
    const key = JSON.stringify(payload);
    if (key === lastSentRef.current) return undefined;
    // Al abrir: si lo completo coincide con lo del servidor no se reenvía.
    const completeIds = guests.filter((g) => isComplete(g.id)).map((g) => g.id);
    if (
      !lastSentRef.current &&
      completeIds.length > 0 &&
      completeIds.every((id) => savedSnap[id] === "__server__")
    ) {
      lastSentRef.current = key;
      return undefined;
    }
    if (!lastSentRef.current && completeIds.length === 0 && !serverAnswered) {
      lastSentRef.current = key;
      return undefined;
    }
    const snaps = Object.fromEntries(completeIds.map((id) => [id, guestSnapshot(id)]));
    const timer = window.setTimeout(async () => {
      setAutoState("saving");
      try {
        await api.invitations.rsvp(token, payload);
        lastSentRef.current = key;
        setSavedSnap(snaps);
        setAutoState("idle");
        setError("");
      } catch (err) {
        setAutoState("error");
        setError(err.message || "No se pudo guardar la respuesta.");
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [answers, allergies, allergyText, ageSelections, autoSaveMode, expired]); // eslint-disable-line react-hooks/exhaustive-deps

  const guestStatus = (id) => {
    if (!autoSaveMode) return null;
    if (answers[id] === "yes" && !isComplete(id)) return "incomplete";
    if (!isComplete(id)) return null;
    const snap = savedSnap[id];
    if (snap === "__server__" || snap === guestSnapshot(id)) return "saved";
    return autoState === "error" ? null : "saving";
  };

  // Edades de mayor a menor (Adulto primero) y Adulto por defecto.
  const orderedRanges = [...ageRangesList].sort(
    (a, b) => (Number(b?.min) || 0) - (Number(a?.min) || 0)
  );
  const defaultRangeId = orderedRanges[0] ? String(orderedRanges[0].id) : "";

  // "Sí asistiré" despliega los detalles ya contestados (Adulto, sin
  // alergias), así queda completo y se guarda al momento; si cambian algo,
  // se vuelve a guardar.
  const setAnswer = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    if (value !== "yes") return;
    setAllergies((prev) =>
      typeof prev[id] === "boolean" ? prev : { ...prev, [id]: false }
    );
    if (defaultRangeId) {
      setAgeSelections((prev) => {
        const current = String(prev[id] || "");
        const valid = ageRangesList.some((range) => String(range.id) === current);
        return valid ? prev : { ...prev, [id]: defaultRangeId };
      });
    }
  };
  const setAllergy = (id, value) =>
    setAllergies((prev) => ({ ...prev, [id]: value }));
  const setAllergyTextFor = (id, value) =>
    setAllergyText((prev) => ({ ...prev, [id]: value }));
  const selectAgeRange = (id, rangeId) =>
    setAgeSelections((prev) => ({ ...prev, [id]: rangeId }));

  const runEnvelope = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    justSubmittedRef.current = true;
    if (reduced) {
      setTStage(4);
      later(() => {
        justSubmittedRef.current = false;
      }, 0);
      return;
    }
    setTStage(0);
    later(() => setTStage(1), 450);
    later(() => setTStage(2), 1300);
    later(() => setTStage(3), 2100);
    later(() => setTStage(4), 2600);
    later(() => {
      justSubmittedRef.current = false;
    }, 3000);
  };

  const submit = async () => {
    if (preview || !token || !allAnswered || saving) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api.invitations.rsvp(token, {
        attending_ids: guests
          .filter((guest) => answers[guest.id] === "yes")
          .map((guest) => guest.id),
        declining_ids: guests
          .filter((guest) => answers[guest.id] === "no")
          .map((guest) => guest.id),
        // La pregunta de alergia solo aplica a quienes asisten; para el
        // resto se envía null y notas vacías.
        allergies: guests.map((guest) => {
          const attending = answers[guest.id] === "yes";
          const hasAllergy = allergies[guest.id];
          return {
            guest_id: guest.id,
            has_allergy:
              attending && typeof hasAllergy === "boolean" ? hasAllergy : null,
            notes:
              attending && hasAllergy === true
                ? String(allergyText[guest.id] || "").trim()
                : "",
          };
        }),
        age_selections: guests.map((guest) => ({
          guest_id: guest.id,
          range_id:
            answers[guest.id] === "yes"
              ? ageSelections[guest.id] || null
              : null,
        })),
        note,
      });
      clearDraft(token);
      setSubmitted(true);
      setEditing(false);
      runEnvelope();
      onDone?.(updated);
    } catch (err) {
      setError(err.message || "No se pudo enviar la confirmación.");
    } finally {
      setSaving(false);
    }
  };

  const thanksLine =
    yesCount === 0
      ? "Lamentamos que no puedan acompañarnos. Gracias por avisarnos; los llevaremos en el corazón."
      : `Hemos recibido su confirmación: ${yesCount} de ${guests.length} ${
          yesCount === 1 ? "persona asistirá" : "personas asistirán"
        }. ¡Nos vemos en Granada!`;

  const remaining = splitRemaining(deadlineMs - now);
  const deadlineText = !editable ? (
    "Una vez confirmada, la selección no podrá modificarse."
  ) : (
    <>
      Pueden <span className="mjv3-underline">confirmar o modificar</span> su respuesta{" "}
      {hasDeadline ? `hasta el ${deadlineLabel(deadlineMs)}.` : "en cualquier momento."}
    </>
  );

  const showSent = autoSaveMode
    ? submitted && expired
    : submitted && !preview && (!editing || expired);
  const showClosed = !preview && !submitted && expired;

  return (
    <div className="mjv3-stack mjv3-stack--narrow">
      <div className="mjv3-drawing mjv3-drawing--small">
        <Drawing
          src={V3.p1}
          alt="Macarena y Jorge en la Alhambra"
          ratio="3 / 4"
          rotate={1.43}
        />
      </div>

      {showSent ? (
        <div className="mjv3-sent">
          <div className="mjv3-sent-envelope" aria-hidden="true">
            <div className="mjv3-sent-body" />
            <div
              className="mjv3-sent-letter"
              style={{
                transform: tStage >= 1 ? "translateY(4%)" : "translateY(-48%)",
              }}
            >
              ¡Ahí estaremos!
            </div>
            <div className="mjv3-sent-pocket" />
            <div
              className="mjv3-sent-flap"
              style={{
                zIndex: tStage >= 2 ? 3 : 0,
                transform: tStage >= 2 ? "rotateX(0deg)" : "rotateX(180deg)",
              }}
            >
              <div />
            </div>
            <div
              className="mjv3-sent-seal"
              style={{
                opacity: tStage >= 3 ? 1 : 0,
                transform:
                  tStage >= 3
                    ? "translate(-50%,-50%) scale(1)"
                    : "translate(-50%,-50%) scale(2.2)",
              }}
            >
              <div className="mjv3-sent-seal-disc">
                M<span>&amp;</span>J
              </div>
            </div>
          </div>
          <div
            className="mjv3-sent-copy"
            style={{
              opacity: tStage >= 4 ? 1 : 0,
              transform: tStage >= 4 ? "translateY(0)" : "translateY(10px)",
            }}
          >
            <h2 className="mjv3-sent-title">
              {familyLabel ? `¡Gracias, ${familyLabel}!` : "¡Gracias!"}
            </h2>
            <p className="mj-copy mjv3-rsvp-help" style={{ fontStyle: "normal" }}>
              {thanksLine}
            </p>
            {canEdit ? (
              <button
                type="button"
                className="mjv3-btn mjv3-btn--link"
                onClick={() => {
                  setEditing(true);
                  setTStage(4);
                  setAnswers(buildAnswers(guests));
                  setAllergies(buildAllergies(guests));
                  setAllergyText(buildAllergyText(guests));
                  setAgeSelections(buildAgeSelections(guests, ageRangesList));
                }}
              >
                Modificar respuesta
              </button>
            ) : (
              <p className="mjv3-muted-note">
                {expired
                  ? "El plazo para modificar la confirmación terminó."
                  : "La selección ya no puede modificarse."}
              </p>
            )}
          </div>
        </div>
      ) : showClosed ? (
        <div className="mjv3-closed">
          <Eyebrow>Confirmación de asistencia</Eyebrow>
          <OrnamentRule />
          <h2 className="mj-display mj-display--sm">
            El plazo de confirmación ha terminado
          </h2>
          <p className="mj-copy">
            Ya no es posible confirmar ni modificar la asistencia en línea.
          </p>
        </div>
      ) : (
        <>
          <Eyebrow>Confirmación de asistencia</Eyebrow>
          <OrnamentRule />
          <h2 className="mj-display mj-display--sm">Confirma tu asistencia</h2>
          <p className="mjv3-rsvp-family">
            {familyLabel
              ? `${familyLabel}, cuéntennos quiénes podrán acompañarnos.`
              : "Cuéntennos quiénes podrán acompañarnos."}
          </p>
          <p className="mjv3-rsvp-help">{deadlineText}</p>

          {hasDeadline && !expired && !preview ? (
            <div className="mjv3-deadline-count">
              <div className="mj-label mj-label--sm">Tiempo para confirmar</div>
              <div className="mjv3-deadline-grid">
                <div className="mjv3-countdown-cell">
                  <div className="mjv3-countdown-value">{remaining.days}</div>
                  <div className="mjv3-countdown-label">Días</div>
                </div>
                <div className="mjv3-countdown-cell">
                  <div className="mjv3-countdown-value">{pad2(remaining.hours)}</div>
                  <div className="mjv3-countdown-label">Horas</div>
                </div>
                <div className="mjv3-countdown-cell">
                  <div className="mjv3-countdown-value">{pad2(remaining.minutes)}</div>
                  <div className="mjv3-countdown-label">Min</div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mjv3-rsvp-form">
            {preview ? (
              <p className="mjv3-muted-note" style={{ textAlign: "center" }}>
                Vista previa: el formulario de confirmación aparecerá aquí
                cuando la invitación esté publicada.
              </p>
            ) : !isFamilyGroup(guests) ? (
              <p className="mjv3-muted-note" style={{ textAlign: "center" }}>
                Esta invitación no tiene pases asignados todavía.
              </p>
            ) : (
              <>
                <p className="mjv3-rsvp-intro">
                  Marca en cada pase si asistirá o no a la celebración:
                </p>
                {guests.map((guest) => (
                  <div className="mjv3-guest-row" key={guest.id}>
                    <div className="mjv3-guest-name">{guest.name}</div>
                    <div className="mjv3-answer-group">
                      <button
                        type="button"
                        className="mjv3-answer"
                        aria-pressed={answers[guest.id] === "yes"}
                        onClick={() => setAnswer(guest.id, "yes")}
                      >
                        Sí asistiré
                      </button>
                      <button
                        type="button"
                        className="mjv3-answer mjv3-answer--no"
                        aria-pressed={answers[guest.id] === "no"}
                        onClick={() => setAnswer(guest.id, "no")}
                      >
                        No asistiré
                      </button>
                    </div>
                    {answers[guest.id] === "yes" ? (
                      <div className="mjv3-guest-extra">
                        {ageRangesList.length > 0 ? (
                          <div className="mjv3-age">
                            <div className="mjv3-age-label">Edad</div>
                            <div
                              className="mjv3-age-options"
                              role="radiogroup"
                              aria-label={`Rango de edad de ${guest.name}`}
                            >
                              {orderedRanges.map((range) => {
                                const selected =
                                  String(ageSelections[guest.id] || "") ===
                                  String(range.id);
                                return (
                                  <button
                                    key={range.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    className="mjv3-age-option"
                                    onClick={() =>
                                      selectAgeRange(
                                        guest.id,
                                        String(range.id)
                                      )
                                    }
                                  >
                                    <span
                                      className="mjv3-age-checkbox"
                                      aria-hidden="true"
                                    >
                                      {selected ? "✓" : ""}
                                    </span>
                                    <span className="mjv3-age-option-label">
                                      {range.label || formatRange(range)}
                                    </span>
                                    <span className="mjv3-age-option-range">
                                      {formatRange(range)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="mjv3-muted-note">
                            Los rangos de edad se configuran en el panel.
                          </p>
                        )}
                        <div className="mjv3-allergy">
                          <div className="mjv3-allergy-question">
                          <span>¿Alguna alergia alimentaria?</span>
                          <span className="mjv3-allergy-actions">
                            <button
                              type="button"
                              className="mjv3-answer mjv3-answer--sm"
                              aria-pressed={allergies[guest.id] === true}
                              onClick={() => setAllergy(guest.id, true)}
                            >
                              Sí
                            </button>
                            <button
                              type="button"
                              className="mjv3-answer mjv3-answer--no mjv3-answer--sm"
                              aria-pressed={allergies[guest.id] === false}
                              onClick={() => setAllergy(guest.id, false)}
                            >
                              No
                            </button>
                          </span>
                        </div>
                        {allergies[guest.id] === true ? (
                          <input
                            type="text"
                            className="mjv3-field mjv3-allergy-input"
                            aria-label="¿Cuál alergia?"
                            placeholder="¿Cuál?"
                            maxLength={500}
                            value={allergyText[guest.id] || ""}
                            onChange={(event) =>
                              setAllergyTextFor(guest.id, event.target.value)
                            }
                          />
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {guestStatus(guest.id) === "incomplete" ? (
                      <p className="mjv3-guest-status mjv3-guest-status--hint">
                        Selecciona todas las casillas
                      </p>
                    ) : guestStatus(guest.id) === "saved" ? (
                      <p className="mjv3-guest-status mjv3-guest-status--saved" role="status">
                        ✓ Respuesta guardada
                      </p>
                    ) : guestStatus(guest.id) === "saving" ? (
                      <p className="mjv3-guest-status">Guardando…</p>
                    ) : null}
                  </div>
                ))}
              </>
            )}

            {error ? <p className="mjv3-error">{error}</p> : null}

            {autoSaveMode ? null : (
            <button
              type="button"
              className="mjv3-btn mjv3-rsvp-submit"
              disabled={preview || saving || !allAnswered}
              onClick={submit}
            >
              {saving
                ? "Enviando…"
                : pending > 0 && isFamilyGroup(guests)
                  ? `Faltan ${pending} por responder`
                  : "Confirmar asistencia"}
            </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
