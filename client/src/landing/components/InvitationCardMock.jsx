// Mock visual (sin datos reales) de una invitación con la paleta del tema XV.
export default function InvitationCardMock() {
  return (
    <div
      className="de-invite"
      role="img"
      aria-label="Vista previa de una invitación digital con diseño de XV años: monograma, fecha y botón para confirmar asistencia"
    >
      <span className="de-invite__halo" aria-hidden="true" />
      <div className="de-invite__card" aria-hidden="true">
        <span className="de-invite__kicker">Mis XV años</span>
        <span className="de-invite__monogram">XV</span>
        <span className="de-invite__name">Celebración</span>
        <span className="de-invite__rule">
          <svg viewBox="0 0 92 10" aria-hidden="true" focusable="false">
            <path d="M0 5h32M60 5h32" stroke="currentColor" strokeWidth="1" />
            <path d="m46 1.6 2.1 3.4-2.1 3.4-2.1-3.4L46 1.6Z" fill="currentColor" />
          </svg>
        </span>
        <span className="de-invite__date">12 · Septiembre · 2026</span>
        <span className="de-invite__place">Ceremonia y recepción</span>
        <span className="de-invite__cta">Confirma tu asistencia</span>
      </div>
      <span className="de-invite__tab" aria-hidden="true">
        Cuenta regresiva · Itinerario
      </span>
    </div>
  );
}
