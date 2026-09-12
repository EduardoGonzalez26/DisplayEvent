// Mock visual de la mesa de regalos. Los botones de copiar son decorativos:
// no se muestran datos bancarios reales.
export default function GiftCardMock() {
  return (
    <div
      className="de-gift"
      role="img"
      aria-label="Vista previa de la mesa de regalos: montos sugeridos y elección entre depósito bancario o pago con tarjeta"
    >
      <div className="de-gift__card" aria-hidden="true">
        <div className="de-gift__head">
          <span className="de-gift__title">Mesa de regalos</span>
          <span className="de-gift__currency">MXN</span>
        </div>

        <div className="de-gift__tabs">
          <span className="de-gift__tab de-gift__tab--active">Depósito</span>
          <span className="de-gift__tab">Tarjeta</span>
        </div>

        <div className="de-gift__amounts">
          <span className="de-gift__amount">$500</span>
          <span className="de-gift__amount de-gift__amount--active">$1,000</span>
          <span className="de-gift__amount">$2,000</span>
        </div>

        <span className="de-gift__copy">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect
              x="9"
              y="9"
              width="11"
              height="12"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
          Copiar datos bancarios
        </span>

        <p className="de-gift__note">Tú eliges montos y moneda: MXN o EUR.</p>
      </div>
      <span className="de-gift__ribbon" aria-hidden="true">
        DE
      </span>
    </div>
  );
}
