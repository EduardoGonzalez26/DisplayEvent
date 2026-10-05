/* ------------------------------------------------------------------
   URL pública del frontend (CLIENT_URL).

   Se interpreta SIEMPRE como una única URL: si la variable trae una lista
   separada por comas (configs que copian el patrón de ALLOWED_ORIGINS), se
   toma el primer valor. Así los enlaces generados nunca contienen dos
   dominios pegados. La lista de orígenes permitidos para CORS vive en
   ALLOWED_ORIGINS.
------------------------------------------------------------------ */

const DEFAULT_CLIENT_URL = "http://localhost:5173";

export function clientUrl() {
  const first = String(process.env.CLIENT_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)[0];
  if (!first) return DEFAULT_CLIENT_URL;
  return first.replace(/\/+$/, "");
}
