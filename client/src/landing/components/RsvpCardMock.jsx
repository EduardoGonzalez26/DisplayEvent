// Mock visual del RSVP de un grupo: pases, confirmaciones y restricciones.
export default function RsvpCardMock() {
  return (
    <div
      className="de-rsvp"
      role="img"
      aria-label="Vista previa del control de asistencia de un grupo: pases, líder, confirmaciones y restricciones alimenticias"
    >
      <div className="de-rsvp__card" aria-hidden="true">
        <div className="de-rsvp__head">
          <div>
            <span className="de-rsvp__eyebrow">Grupo</span>
            <span className="de-rsvp__group">Familia Herrera</span>
          </div>
          <span className="de-rsvp__passes">4 pases</span>
        </div>

        <div className="de-rsvp__leader">
          <span className="de-rsvp__avatar">A</span>
          <span>Líder: Ana</span>
          <span className="de-rsvp__chip">Enlace único</span>
        </div>

        <div className="de-rsvp__choices">
          <span className="de-rsvp__choice de-rsvp__choice--yes">Sí asistirá</span>
          <span className="de-rsvp__choice de-rsvp__choice--no">No asistirá</span>
        </div>

        <ul className="de-rsvp__list">
          <li>
            <span className="de-rsvp__dot de-rsvp__dot--yes" />
            Ana · Confirmado
          </li>
          <li>
            <span className="de-rsvp__dot de-rsvp__dot--yes" />
            Luis · Confirmado
          </li>
          <li>
            <span className="de-rsvp__dot" />
            Sofía · Pendiente
          </li>
        </ul>

        <div className="de-rsvp__tags">
          <span className="de-rsvp__tag">Sin gluten</span>
          <span className="de-rsvp__tag">2 periqueras</span>
        </div>
      </div>
    </div>
  );
}
