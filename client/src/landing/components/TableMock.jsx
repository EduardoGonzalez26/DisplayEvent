const SEATS = 8;
const OCCUPIED = 7;

// Mock visual de una mesa redonda con capacidad validada (7 de 8 lugares).
export default function TableMock() {
  return (
    <div
      className="de-table"
      role="img"
      aria-label="Vista previa del acomodo de mesas: mesa redonda con siete de ocho asientos ocupados"
    >
      <div className="de-table__stage" aria-hidden="true">
        <svg viewBox="0 0 260 260" className="de-table__svg">
          <circle cx="130" cy="130" r="74" className="de-table__cloth" />
          <circle cx="130" cy="130" r="60" className="de-table__top" />
          <circle cx="130" cy="130" r="44" className="de-table__center" />
          {Array.from({ length: SEATS }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / SEATS - Math.PI / 2;
            const x = 130 + Math.cos(angle) * 104;
            const y = 130 + Math.sin(angle) * 104;
            const filled = i < OCCUPIED;
            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r="17"
                  className={filled ? "de-table__seat de-table__seat--filled" : "de-table__seat"}
                />
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  className={filled ? "de-table__head de-table__head--filled" : "de-table__head"}
                />
              </g>
            );
          })}
          <text x="130" y="126" textAnchor="middle" className="de-table__number">
            3
          </text>
          <text x="130" y="146" textAnchor="middle" className="de-table__caption">
            Mesa
          </text>
        </svg>
        <span className="de-table__badge">
          <strong>7/8</strong> lugares
        </span>
        <span className="de-table__chip">Capacidad validada</span>
      </div>
    </div>
  );
}
