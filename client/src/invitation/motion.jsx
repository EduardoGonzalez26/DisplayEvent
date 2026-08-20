import { motion, AnimatePresence, useReducedMotion } from "motion/react";

export { motion, AnimatePresence, useReducedMotion };

// Curva de aceleración suave compartida por toda la invitación.
export const EASE = [0.22, 1, 0.36, 1];

// Spring por defecto para elementos interactivos (hover, apariciones).
export const SPRING = { type: "spring", stiffness: 260, damping: 24, mass: 0.9 };

export const SOFT_SPRING = { type: "spring", stiffness: 180, damping: 26 };

// Variants reutilizables. Las funciones reciben un index para escalonar.
export const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE, delay: i * 0.1 },
  }),
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: (i = 0) => ({
    opacity: 1,
    transition: { duration: 0.9, ease: EASE, delay: i * 0.1 },
  }),
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: EASE, delay: i * 0.08 },
  }),
};

// Contenedor que escala en cascada a sus hijos (stagger).
export const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

// Revela el contenido al entrar al viewport (una sola vez). Respeta
// prefers-reduced-motion: sin desplazamiento, solo opacidad.
export function Reveal({ children, className = "", delay = 0 }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 32 }}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}