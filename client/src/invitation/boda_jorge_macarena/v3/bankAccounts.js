/* ------------------------------------------------------------------
   Cuentas para transferencia (Regalo). Tres cuentas:
   - Jorge (MXN): viene del evento (`registry.bank`, editable en el panel).
   - Macarena (MXN): datos aquí abajo.
   - Concepción Collado González (EUR): `registry.bank_eur` del evento si
     está activa y con IBAN; si no, los datos de aquí abajo.

   PENDIENTE: completar los datos de Macarena y de Concepción. Mientras
   una cuenta no tenga CLABE/IBAN no se muestra en la invitación.
------------------------------------------------------------------- */

const MACARENA_MXN = {
  bank_name: "", // TODO: banco
  holder: "", // TODO: titular (nombre completo)
  account_number: "", // TODO: número de cuenta (opcional)
  clabe: "", // TODO: CLABE (18 dígitos)
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

// Devuelve las cuentas listas para pintar (solo las que tienen CLABE/IBAN),
// con las de la moneda seleccionada primero.
export function buildBankAccounts(registry = {}, currency = "mxn") {
  const dbBank = registry.bank || {};
  const dbEur = registry.bank_eur || {};
  const eurFromEvent = !!dbEur.enabled && filled(dbEur.iban);

  const accounts = [
    {
      id: "jorge",
      currency: "mxn",
      title: "Jorge · pesos mexicanos",
      unlockKey: "clabe",
      data: dbBank.enabled ? dbBank : {},
    },
    {
      id: "macarena",
      currency: "mxn",
      title: "Macarena · pesos mexicanos",
      unlockKey: "clabe",
      data: MACARENA_MXN,
    },
    {
      id: "concepcion",
      currency: "eur",
      title: "Desde España · euros",
      unlockKey: "iban",
      data: eurFromEvent ? { ...CONCEPCION_EUR, ...dbEur } : CONCEPCION_EUR,
    },
  ]
    .map(withRows)
    .filter((account) => filled(account.data[account.unlockKey]));

  return accounts.sort(
    (a, b) => (a.currency === currency ? 0 : 1) - (b.currency === currency ? 0 : 1)
  );
}
