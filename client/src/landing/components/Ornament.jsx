// Filigrana decorativa reutilizable (divisor editorial).
export default function Ornament({ className = "" }) {
  return (
    <svg
      viewBox="0 0 160 16"
      className={`de-ornament ${className}`.trim()}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 8h58" stroke="currentColor" strokeWidth="1" />
      <path d="M102 8h58" stroke="currentColor" strokeWidth="1" />
      <path
        d="M80 2.2c3.4 0 6 2.6 6 5.8s-2.6 5.8-6 5.8-6-2.6-6-5.8 2.6-5.8 6-5.8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path
        d="M80 13.8v2M76.2 13.2 74 16M83.8 13.2 86 16"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
