import { useEffect, useRef, useState } from "react";
import { api } from "../../../api.js";
import { Drawing, Eyebrow, OrnamentRule } from "./index.js";
import { V3 } from "./assets.js";

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

function buildAges(guests) {
  const map = {};
  for (const guest of guests) {
    map[guest.id] = guest.age == null ? "" : String(guest.age);
  }
  return map;
}

// Devuelve la edad como entero válido 0..120, o null si está vacía/inválida.
// El 0 es una edad válida.
function validAge(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const age = Number(raw);
  if (!Number.isInteger(age) || age < 0 || age > 120) return null;
  return age;
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

function familyLabelOf(family) {
  const value = String(family || "").trim();
  if (!value) return "Familia";
  return /^familia\b/i.test(value) ? value : `Familia ${value}`;
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
    onDone,
  } = rsvp || {};

  const familyLabel = familyLabelOf(family);
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

  const [answers, setAnswers] = useState(() => buildAnswers(guests));
  const [allergies, setAllergies] = useState(() => buildAllergies(guests));
  const [allergyText, setAllergyText] = useState(() => buildAllergyText(guests));
  const [ages, setAges] = useState(() => buildAges(guests));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(attending > 0 || declining > 0);
  const [editing, setEditing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [tStage, setTStage] = useState(attending > 0 || declining > 0 ? 4 : 0);
  const timers = useRef([]);
  const justSubmittedRef = useRef(false);

  useEffect(() => {
    setAnswers(buildAnswers(guests));
    setAllergies(buildAllergies(guests));
    setAllergyText(buildAllergyText(guests));
    setAges(buildAges(guests));
  }, [guests]);

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
      return validAge(ages[guest.id]) === null;
    }
    return false;
  }).length;
  const allAnswered = isFamilyGroup(guests) && pending === 0;
  const yesCount = guests.filter((guest) => answers[guest.id] === "yes").length;

  const setAnswer = (id, value) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));
  const setAllergy = (id, value) =>
    setAllergies((prev) => ({ ...prev, [id]: value }));
  const setAllergyTextFor = (id, value) =>
    setAllergyText((prev) => ({ ...prev, [id]: value }));
  const setAge = (id, value) =>
    setAges((prev) => ({ ...prev, [id]: value }));

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
        ages: guests.map((guest) => {
          const attending = answers[guest.id] === "yes";
          return {
            guest_id: guest.id,
            age: attending ? validAge(ages[guest.id]) : null,
          };
        }),
        note,
      });
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
  const deadlineText = !editable
    ? "Una vez confirmada, la selección no podrá modificarse."
    : hasDeadline
      ? `Podéis confirmar o modificar vuestra respuesta hasta el ${deadlineLabel(
          deadlineMs
        )}.`
      : "Podéis confirmar o modificar vuestra respuesta en cualquier momento.";

  const showSent = submitted && !preview && (!editing || expired);
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
            <h2 className="mjv3-sent-title">¡Gracias, {familyLabel}!</h2>
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
                  setAges(buildAges(guests));
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
            {familyLabel}, contadnos quiénes podrán acompañarnos.
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
                        Sí asistirá
                      </button>
                      <button
                        type="button"
                        className="mjv3-answer mjv3-answer--no"
                        aria-pressed={answers[guest.id] === "no"}
                        onClick={() => setAnswer(guest.id, "no")}
                      >
                        No asistirá
                      </button>
                    </div>
                    {answers[guest.id] === "yes" ? (
                      <div className="mjv3-guest-extra">
                        <label className="mjv3-age">
                          <span className="mjv3-age-label">Edad</span>
                          <input
                            type="number"
                            min={0}
                            max={120}
                            step={1}
                            inputMode="numeric"
                            className="mjv3-field mjv3-age-input"
                            aria-label="Edad"
                            placeholder="Edad"
                            required
                            value={ages[guest.id] ?? ""}
                            onChange={(event) =>
                              setAge(guest.id, event.target.value)
                            }
                          />
                        </label>
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
                  </div>
                ))}
              </>
            )}

            {error ? <p className="mjv3-error">{error}</p> : null}

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
          </div>
        </>
      )}
    </div>
  );
}
