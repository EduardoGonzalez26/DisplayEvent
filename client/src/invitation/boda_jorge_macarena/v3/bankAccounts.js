/* ------------------------------------------------------------------
   Cuentas para transferencia (Regalo). Tres cuentas:
   - Macarena (MXN, cuenta 1): datos aquí abajo.
   - Jorge (MXN): viene del evento (`registry.bank`, editable en el panel).
   - María Concepción Collado González (EUR, Santander): datos aquí abajo;
     mandan sobre `registry.bank_eur` del evento.

   Una cuenta sin CLABE/IBAN muestra solo el titular y "Datos bancarios
   próximamente".
------------------------------------------------------------------- */

const MACARENA_MXN = {
  bank_name: "BBVA",
  holder: "Macarena García Collado",
  account_number: "1594053136",
  clabe: "012180015940531367",
  concept: "Regalo Jorge Macarena",
};

const CONCEPCION_EUR = {
  bank_name: "Santander",
  holder: "María Concepción Collado González",
  iban: "ES6400494947172393429549",
  swift: "BSCHESMMXXX",
  concept: "Regalo Jorge Macarena",
};

const MXN_FIELDS = [
  { key: "bank_name", label: "Banco" },
  { key: "holder", label: "Titular" },
  { key: "account_number", label: "Cuenta" },
  { key: "clabe", label: "CLABE" },
  { key: "concept", label: "Concepto" },
];

const EUR_FIELDS = [
  { key: "bank_name", label: "Banco" },
  { key: "holder", label: "Titular" },
  // Se copia sin espacios; se muestra en bloques de 4 para leerlo mejor.
  { key: "iban", label: "IBAN", format: (v) => String(v).replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim() },
  { key: "swift", label: "BIC / SWIFT" },
  { key: "concept", label: "Concepto" },
];

const filled = (value) => String(value ?? "").trim() !== "";

function withRows(account) {
  const fields = account.currency === "eur" ? EUR_FIELDS : MXN_FIELDS;
  const rows = fields.filter((field) => filled(account.data[field.key]));
  return { ...account, rows };
}

// Devuelve las tres cuentas en orden fijo (Macarena es la 1). Una cuenta
// sin CLABE/IBAN llega con `pending: true`: su pestaña muestra el nombre
// del titular y "Datos bancarios próximamente".
export function buildBankAccounts(registry = {}) {
  const dbBank = registry.bank || {};

  return [
    {
      id: "macarena",
      currency: "mxn",
      tab: "Macarena",
      subtitle: "Pesos mexicanos · MXN",
      unlockKey: "clabe",
      data: MACARENA_MXN,
    },
    {
      id: "jorge",
      currency: "mxn",
      tab: "Jorge",
      subtitle: "Pesos mexicanos · MXN",
      unlockKey: "clabe",
      data: dbBank.enabled ? dbBank : {},
    },
    {
      id: "concepcion",
      currency: "eur",
      tab: "Concepción",
      subtitle: "Euros · EUR",
      unlockKey: "iban",
      // Datos confirmados por Jorge: mandan sobre lo que haya en el evento.
      data: CONCEPCION_EUR,
    },
  ]
    .map(withRows)
    .map((account) => ({ ...account, pending: !filled(account.data[account.unlockKey]) }))
    // Jorge sin datos en el evento: no hay nada que mostrar, ni nombre.
    .filter((account) => !account.pending || filled(account.data.holder));
}
