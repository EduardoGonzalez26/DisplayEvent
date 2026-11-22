/* ------------------------------------------------------------------
   Cuentas para transferencia (Regalo). Tres cuentas:
   - Macarena (MXN, cuenta 1): datos aquí abajo.
   - Jorge (MXN): viene del evento (`registry.bank`, editable en el panel).
   - Concepción Collado González (EUR): `registry.bank_eur` del evento si
     está activa y con IBAN; si no, los datos de aquí abajo.

   PENDIENTE: completar los datos de Concepción. Mientras
   una cuenta no tenga CLABE/IBAN no se muestra en la invitación.
------------------------------------------------------------------- */

const MACARENA_MXN = {
  bank_name: "BBVA",
  holder: "Macarena García Collado",
  account_number: "1594053136",
  clabe: "012180015940531367",
  concept: "Regalo Jorge Macarena",
};

const CONCEPCION_EUR = {
  bank_name: "", // TODO: banco
  holder: "Concepción Collado González",
  iban: "", // TODO: IBAN (ES…)
  swift: "", // TODO: BIC/SWIFT (opcional, útil desde México)
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
  { key: "iban", label: "IBAN" },
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
  const dbEur = registry.bank_eur || {};
  const eurFromEvent = !!dbEur.enabled && filled(dbEur.iban);

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
      data: eurFromEvent ? { ...CONCEPCION_EUR, ...dbEur } : CONCEPCION_EUR,
    },
  ]
    .map(withRows)
    .map((account) => ({ ...account, pending: !filled(account.data[account.unlockKey]) }))
    // Jorge sin datos en el evento: no hay nada que mostrar, ni nombre.
    .filter((account) => !account.pending || filled(account.data.holder));
}
