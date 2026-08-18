import { useState } from "react";
import { api } from "../../api.js";
import { Ornament } from "./util.jsx";

export default function RsvpSection({
  token,
  family,
  guests,
  attending,
  declining,
  note,
  onDone,
  theme,
}) {
  const [answers, setAnswers] = useState(() => {
    const map = {};
    for (const g of guests) {
      if (g.registered) map[g.id] = "yes";
      else if (g.declined) map[g.id] = "no";
    }
    return map;
  });
  const [diet, setDiet] = useState(note || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(attending > 0 || declining > 0);
  const [showModal, setShowModal] = useState(false);

  const setAnswer = (id, value) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const confirmSubmit = async () => {
    setShowModal(false);
    setSaving(true);
    setMessage("");
    try {
      const updated = await api.invitations.rsvp(token, {
        attending_ids: guests
          .filter((g) => answers[g.id] === "yes")
          .map((g) => g.id),
        declining_ids: guests
          .filter((g) => answers[g.id] === "no")
          .map((g) => g.id),
        note: diet,
      });
      setSubmitted(true);
      onDone(updated);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const answeredCount = guests.filter((g) => answers[g.id]).length;
  const allAnswered = answeredCount === guests.length;

  return (
    <section id="rsvp" className="py-24 px-4 bg-inv-bg-alt">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="h-px w-9 bg-gradient-to-r from-transparent to-inv-primary/60" />
            <span className="text-inv-primary text-[0.65rem] uppercase tracking-[0.45em]">
              RSVP
            </span>
            <span className="h-px w-9 bg-gradient-to-l from-transparent to-inv-primary/60" />
          </div>
          <h2 className="font-inv-heading text-4xl md:text-5xl text-gold-gradient text-balance">
            {theme?.labels?.rsvp || "Confirma tu asistencia"}
          </h2>
          <p className="mt-5 text-inv-text font-light">
            Familia {family}, cuéntanos quiénes podrán acompañarnos.
          </p>
        </div>

        {submitted && (
          <SubmitConfirmation
            count={attending}
            declining={declining}
            total={guests.length}
            note={note}
            family={family}
          />
        )}

        {!submitted && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (allAnswered) setShowModal(true);
            }}
            className="rounded-2xl border border-inv-primary/30 bg-inv-surface backdrop-blur p-6 md:p-8 shadow-2xl"
          >
            <p className="text-sm text-inv-text-soft mb-5">
              Marca en cada pase si asistirá o no a la celebración:
            </p>
            <ul className="space-y-2.5 mb-6">
              {guests.map((g) => (
                <li
                  key={g.id}
                  className={`rounded-xl border px-4 py-3 transition-all duration-300 ${
                    answers[g.id] === "yes"
                      ? "border-inv-primary/70 bg-gradient-to-r from-inv-primary/15 to-transparent"
                      : answers[g.id] === "no"
                        ? "border-inv-accent-border-strong/70 bg-inv-bg"
                        : "border-inv-accent-border bg-inv-bg/50 hover:border-inv-accent-solid"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[8rem]">
                      <div className={g.is_leader ? "font-semibold" : "font-normal"}>
                        {g.name}
                        {g.is_leader && (
                          <span className="ml-2 text-[10px] uppercase text-inv-text-soft">
                            Líder
                          </span>
                        )}
                        {g.is_child && (
                          <span className="ml-2 text-xs text-inv-text-soft/80">(niño)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAnswer(g.id, "yes")}
                        className={`rounded-lg px-3.5 py-1.5 text-sm transition-all active:scale-[.97] ${
                          answers[g.id] === "yes"
                            ? "bg-gradient-to-r from-inv-primary-light to-inv-primary-dark text-inv-on-accent font-semibold shadow-md"
                            : "border border-inv-accent-border text-inv-text hover:border-inv-primary/70 hover:text-inv-text-soft"
                        }`}
                      >
                        Sí asistirá
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswer(g.id, "no")}
                        className={`rounded-lg px-3.5 py-1.5 text-sm transition-all active:scale-[.97] ${
                          answers[g.id] === "no"
                            ? "bg-inv-accent-solid text-inv-on-accent font-semibold shadow-md"
                            : "border border-inv-accent-border text-inv-text hover:border-inv-primary/70 hover:text-inv-text-soft"
                        }`}
                      >
                        No asistirá
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <label className="block mb-5">
              <span className="block text-sm text-inv-text-soft mb-1.5">
                Detalles / restricciones alimenticias
              </span>
              <textarea
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
                rows={3}
                placeholder="Ej. Soy alérgico al marisco…"
                className="w-full rounded-xl bg-inv-bg border border-inv-accent-border px-4 py-3 text-sm text-inv-text placeholder-inv-text-muted/50 focus:outline-none focus:border-inv-primary/70 focus:ring-1 focus:ring-inv-primary/40 transition-all"
              />
            </label>

            {message && <p className="text-sm text-red-400 mb-4">{message}</p>}

            <button
              type="submit"
              disabled={saving || !allAnswered}
              className="w-full rounded-xl bg-gradient-to-br from-inv-primary-light via-inv-primary to-inv-primary-deep text-inv-on-accent font-semibold py-3.5 shadow-xl hover:brightness-110 active:scale-[.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {saving
                ? "Enviando…"
                : allAnswered
                  ? "Confirmar asistencia"
                  : `Faltan ${guests.length - answeredCount} por responder`}
            </button>
          </form>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 grid place-items-center px-4">
            <div
              className="absolute inset-0 bg-inv-overlay/50 backdrop-blur-sm animate-fade"
              onClick={() => setShowModal(false)}
            />
            <div className="relative z-10 w-full max-w-md rounded-3xl border border-inv-primary/40 bg-gradient-to-b from-inv-surface to-inv-bg p-7 md:p-8 text-center shadow-2xl animate-modal-in">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-inv-primary-light to-inv-primary-dark text-inv-on-accent grid place-items-center text-2xl shadow-lg">
                ⚠
              </div>
              <Ornament className="mb-4" />
              <h3 className="font-inv-script text-4xl text-gold-gradient mb-4 leading-[1.5]">
                ¿Confirmar tu asistencia?
              </h3>
              <p className="text-sm text-inv-text-soft mb-4 leading-relaxed">
                Una vez confirmada,{" "}
                <span className="text-inv-text-soft font-semibold">
                  la selección no podrá ser modificada
                </span>
                .
              </p>
              <p className="text-sm text-inv-text-soft mb-6 leading-relaxed">
                ¿Necesitas alguna aclaración? Escríbenos:
              </p>
              <div className="space-y-2 mb-6">
                <a
                  href="tel:+525515245588"
                  className="flex items-center justify-center gap-3 rounded-xl border border-inv-primary/40 bg-inv-bg px-4 py-3 text-inv-text hover:border-inv-primary/80 hover:bg-inv-bg transition-all"
                >
                  <span className="text-inv-text-soft uppercase tracking-widest text-[0.65rem]">
                    Papá
                  </span>
                  <span className="font-semibold tracking-wider">5515245588</span>
                </a>
                <a
                  href="tel:+525518986867"
                  className="flex items-center justify-center gap-3 rounded-xl border border-inv-primary/40 bg-inv-bg px-4 py-3 text-inv-text hover:border-inv-primary/80 hover:bg-inv-bg transition-all"
                >
                  <span className="text-inv-text-soft uppercase tracking-widest text-[0.65rem]">
                    Mamá
                  </span>
                  <span className="font-semibold tracking-wider">5518986867</span>
                </a>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-inv-accent-border text-inv-text px-3 py-2.5 text-sm hover:bg-inv-bg active:scale-[.98] transition-all"
                >
                  Volver
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={confirmSubmit}
                  className="flex-1 rounded-xl bg-gradient-to-br from-inv-primary-light to-inv-primary-dark text-inv-on-accent font-semibold px-3 py-2.5 text-sm shadow-lg hover:brightness-110 active:scale-[.98] transition-all disabled:opacity-50"
                >
                  {saving ? "Enviando…" : "Sí, confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SubmitConfirmation({ count, declining, total, note, family }) {
  return (
    <div className="rounded-3xl border border-inv-primary/30 bg-gradient-to-b from-inv-surface to-inv-bg p-8 md:p-10 text-center backdrop-blur shadow-2xl">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-inv-primary-light to-inv-primary-dark text-inv-on-accent grid place-items-center text-3xl shadow-lg">
        ✓
      </div>
      <Ornament className="mb-7" />
      <h3 className="font-inv-script text-5xl md:text-6xl text-gold-gradient mb-5 leading-[1.6]">
        ¡Gracias, {family}!
      </h3>
      <p className="text-inv-text font-light mb-5">
        <span className="text-inv-text-soft font-semibold">
          {count} {count === 1 ? "pase confirmado" : "pases confirmados"}
        </span>{" "}
        de {total}.
        {declining > 0 && (
          <span className="block mt-2 text-inv-text-soft">
            {declining} {declining === 1 ? "pase" : "pases"} con ausencia confirmada.
          </span>
        )}
      </p>
      {note && (
        <p className="text-sm text-inv-text-soft italic mb-5">
          Detalles recibidos: “{note}”
        </p>
      )}
      <p className="text-sm text-inv-text-soft mb-2">
        La selección ya no puede modificarse. ¿Necesitas aclaraciones?
      </p>
      <p className="text-sm text-inv-text-soft">
        Papá{" "}
        <a
          href="tel:+525515245588"
          className="text-inv-text-soft underline underline-offset-4 hover:text-inv-primary"
        >
          5515245588
        </a>{" "}
        · Mamá{" "}
        <a
          href="tel:+525518986867"
          className="text-inv-text-soft underline underline-offset-4 hover:text-inv-primary"
        >
          5518986867
        </a>
      </p>
    </div>
  );
}