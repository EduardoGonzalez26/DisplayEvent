import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { api } from "../../api.js";
import { Ornament } from "./util.jsx";
import { EASE } from "../motion.jsx";

export default function RsvpSection({
  token,
  family,
  guests,
  attending,
  declining,
  note,
  onDone,
  theme,
  cfg,
  preview,
}) {
  const contacts = (cfg?.contacts || []).filter((c) => c.name || c.phone);
  const contactNote = (cfg?.contact_note || "").trim();
  const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, "")}`;
  const reduced = useReducedMotion();
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
        <motion.div
          className="text-center mb-12"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 14 },
              show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
            }}
            className="flex items-center justify-center gap-3 mb-5"
          >
            <span className="h-px w-9 bg-gradient-to-r from-transparent to-inv-primary/60" />
            <span className="text-inv-primary text-[0.65rem] uppercase tracking-[0.45em]">
              RSVP
            </span>
            <span className="h-px w-9 bg-gradient-to-l from-transparent to-inv-primary/60" />
          </motion.div>
          <motion.h2
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
            }}
            className="font-inv-heading text-4xl md:text-5xl text-gold-gradient text-balance"
          >
            {theme?.labels?.rsvp || "Confirma tu asistencia"}
          </motion.h2>
          <motion.p
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
            }}
            className="mt-5 text-inv-text font-light"
          >
            {theme?.labels?.familyGreeting?.(family) ||
              `Familia ${family}, cuéntanos quiénes podrán acompañarnos.`}
          </motion.p>
        </motion.div>

        {preview && (
          <div className="rounded-2xl border border-inv-primary/30 bg-inv-surface p-8 text-center shadow-2xl">
            <p className="font-inv-serif text-lg text-inv-text-soft italic">
              Vista previa: el formulario de confirmación aparece aquí cuando la
              invitación esté publicada.
            </p>
          </div>
        )}

        {!preview && submitted && (
          <SubmitConfirmation
            count={attending}
            declining={declining}
            total={guests.length}
            note={note}
            family={family}
            contacts={contacts}
            contactNote={contactNote}
          />
        )}

        {!preview && !submitted && (
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
            <motion.ul
              className="space-y-2.5 mb-6"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            >
              {guests.map((g) => (
                <motion.li
                  key={g.id}
                  variants={{
                    hidden: { opacity: 0, x: -16 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } },
                  }}
                  className={`rounded-xl border px-4 py-3 transition-colors duration-300 ${
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
                      <AnswerButton
                        active={answers[g.id] === "yes"}
                        label="Sí asistirá"
                        selectedClass="bg-gradient-to-r from-inv-primary-light to-inv-primary-dark text-inv-on-accent font-semibold shadow-md"
                        onClick={() => setAnswer(g.id, "yes")}
                        reduced={reduced}
                      />
                      <AnswerButton
                        active={answers[g.id] === "no"}
                        label="No asistirá"
                        selectedClass="bg-inv-accent-solid text-inv-on-accent font-semibold shadow-md"
                        onClick={() => setAnswer(g.id, "no")}
                        reduced={reduced}
                      />
                    </div>
                  </div>
                </motion.li>
              ))}
            </motion.ul>

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

            <motion.button
              type="submit"
              disabled={saving || !allAnswered}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              className="w-full rounded-xl bg-gradient-to-br from-inv-primary-light via-inv-primary to-inv-primary-deep text-inv-on-accent font-semibold py-3.5 shadow-xl hover:brightness-110 active:scale-[.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {saving
                ? "Enviando…"
                : allAnswered
                  ? "Confirmar asistencia"
                  : `Faltan ${guests.length - answeredCount} por responder`}
            </motion.button>
          </form>
        )}

        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 grid place-items-center px-4">
              <motion.div
                className="absolute inset-0 bg-inv-overlay/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Confirmar asistencia"
                className="relative z-10 w-full max-w-md rounded-3xl border border-inv-primary/40 bg-gradient-to-b from-inv-surface to-inv-bg p-7 md:p-8 text-center shadow-2xl"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
              >
                <motion.div
                  className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-inv-primary-light to-inv-primary-dark text-inv-on-accent grid place-items-center text-2xl shadow-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.08 }}
                >
                  ⚠
                </motion.div>
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
                {contacts.length > 0 && (
                  <>
                    <p className="text-sm text-inv-text-soft mb-6 leading-relaxed">
                      {contactNote || "¿Necesitas alguna aclaración? Escríbenos:"}
                    </p>
                    <div className="space-y-2 mb-6">
                      {contacts.map((c, i) => (
                        <a
                          key={i}
                          href={telHref(c.phone)}
                          className="flex items-center justify-center gap-3 rounded-xl border border-inv-primary/40 bg-inv-bg px-4 py-3 text-inv-text hover:border-inv-primary/80 hover:bg-inv-bg transition-all"
                        >
                          <span className="text-inv-text-soft uppercase tracking-widest text-[0.65rem]">
                            {c.name || `Contacto ${i + 1}`}
                          </span>
                          <span className="font-semibold tracking-wider">
                            {c.phone}
                          </span>
                        </a>
                      ))}
                    </div>
                  </>
                )}
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
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function AnswerButton({ active, label, selectedClass, onClick, reduced }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={reduced ? undefined : { scale: 0.92 }}
      className={`rounded-lg px-3.5 py-1.5 text-sm transition-all active:scale-[.97] ${
        active
          ? selectedClass
          : "border border-inv-accent-border text-inv-text hover:border-inv-primary/70 hover:text-inv-text-soft"
      }`}
    >
      {label}
    </motion.button>
  );
}

function SubmitConfirmation({ count, declining, total, note, family, contacts, contactNote }) {
  const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, "")}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      className="rounded-3xl border border-inv-primary/30 bg-gradient-to-b from-inv-surface to-inv-bg p-8 md:p-10 text-center backdrop-blur shadow-2xl"
    >
      <motion.div
        initial={{ scale: 0, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
        className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-inv-primary-light to-inv-primary-dark text-inv-on-accent grid place-items-center text-3xl shadow-lg"
      >
        ✓
      </motion.div>
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
        La selección ya no puede modificarse.
      </p>
      {contacts.length > 0 && (
        <p className="text-sm text-inv-text-soft">
          {contactNote ? `${contactNote} ` : "¿Necesitas aclaraciones? "}
          {contacts.map((c, i) => (
            <span key={i}>
              {i > 0 && " · "}
              {c.name && <span>{c.name} </span>}
              <a
                href={telHref(c.phone)}
                className="text-inv-text-soft underline underline-offset-4 hover:text-inv-primary"
              >
                {c.phone}
              </a>
            </span>
          ))}
        </p>
      )}
    </motion.div>
  );
}