/* ------------------------------------------------------------------
   Búsqueda y filtros de grupos (Invitados y Dashboard).
   Mantiene aquí TODA la semántica para que ambas vistas filtren igual:
   - Búsqueda multi-palabra (AND) sobre nombre del grupo, líder, teléfono
     del líder y nombres de sus invitados (índice de api.guests.list).
   - Chips de WhatsApp y RSVP por grupo.
   - Hint "Coinciden: …" cuando un grupo aparece SOLO por sus invitados.
------------------------------------------------------------------ */

// Estado inicial de la barra compartida.
export const DEFAULT_GROUP_FILTERS = { query: "", wa: "all", rsvp: "all" };

// Opciones de la UI (los valores deben coincidir con la semántica de abajo).
export const WHATSAPP_FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "sent", label: "Enviada" },
  { value: "pending_send", label: "Sin enviar" },
  { value: "missing", label: "Sin WhatsApp" },
];

export const RSVP_FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "unanswered", label: "Sin responder" },
  { value: "partial", label: "Pendientes" },
  { value: "complete", label: "Completos" },
];

// Máximo de nombres que muestra el hint antes del contador "+N".
const MATCH_HINT_MAX_NAMES = 3;

// Minúsculas, sin acentos y sin espacios extremos (mismo patrón del repo).
export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Índice { [groupId]: invitado[] } a partir de api.guests.list (lista plana).
export function indexGuestsByGroup(guests) {
  const map = {};
  for (const guest of guests ?? []) {
    if (!map[guest.group_id]) map[guest.group_id] = [];
    map[guest.group_id].push(guest);
  }
  return map;
}

// Palabras normalizadas de la búsqueda (multi-palabra = AND).
function searchTokens(query) {
  const normalized = normalizeSearchText(query);
  return normalized ? normalized.split(/\s+/).filter(Boolean) : [];
}

// WhatsApp: sent (enviada) · pending_send (sin enviar) · missing (sin WhatsApp).
function matchesWhatsapp(group, wa) {
  if (wa === "all" || !wa) return true;
  const sent = !!group.whatsapp_sent_at;
  if (wa === "sent") return sent;
  if (wa === "pending_send") return !!group.leader_phone && !sent;
  if (wa === "missing") return !group.leader_phone;
  return true;
}

// RSVP: unanswered (sin responder) · partial (pendientes) · complete (completos).
// Los grupos sin invitados (guests_count = 0) solo aparecen con "all".
function matchesRsvp(group, rsvp) {
  if (rsvp === "all" || !rsvp) return true;
  const total = group.guests_count ?? 0;
  const reg = group.registered_count ?? 0;
  const dec = group.declined_count ?? 0;
  const pending = Math.max(0, total - reg - dec);
  if (rsvp === "unanswered") return total > 0 && reg === 0 && dec === 0;
  if (rsvp === "partial") return reg + dec > 0 && pending > 0;
  if (rsvp === "complete") return total > 0 && pending === 0;
  return true;
}

// true si hay búsqueda o algún chip distinto de "Todos".
export function hasActiveGroupFilters(filters) {
  const safe = { ...DEFAULT_GROUP_FILTERS, ...(filters ?? {}) };
  return normalizeSearchText(safe.query) !== "" || safe.wa !== "all" || safe.rsvp !== "all";
}

// Texto del hint de coincidencias: "Juan, María +2" (máx. 3 + contador).
export function formatGuestMatches(names) {
  const list = names ?? [];
  const visible = list.slice(0, MATCH_HINT_MAX_NAMES);
  const rest = list.length - visible.length;
  return `${visible.join(", ")}${rest > 0 ? ` +${rest}` : ""}`;
}

// Filtra grupos y devuelve [{ group, matchedGuests, guestOnly }].
// - matchedGuests: nombres únicos de invitados del grupo que coinciden con
//   alguna palabra buscada (alimenta el hint "Coinciden: …").
// - guestOnly: el grupo aparece SOLO por sus invitados (ni nombre ni líder),
//   por lo que conviene mostrar el hint bajo el nombre.
export function applyGroupFilters(groups, filters, guestsByGroupId = {}) {
  const safe = { ...DEFAULT_GROUP_FILTERS, ...(filters ?? {}) };
  const tokens = searchTokens(safe.query);
  const result = [];

  for (const group of groups ?? []) {
    if (!matchesWhatsapp(group, safe.wa) || !matchesRsvp(group, safe.rsvp)) continue;

    let matchedGuests = [];
    let guestOnly = false;

    if (tokens.length > 0) {
      const guests = guestsByGroupId[group.id] ?? [];
      const nameHaystack = normalizeSearchText(group.name);
      const leaderHaystack = normalizeSearchText(
        `${group.leader_name ?? ""} ${group.leader_phone ?? ""}`
      );
      const guestHaystacks = guests.map((guest) => normalizeSearchText(guest.name));
      const guestHaystack = guestHaystacks.join(" ");
      const haystackMatches = tokens.every(
        (token) =>
          nameHaystack.includes(token) ||
          leaderHaystack.includes(token) ||
          guestHaystack.includes(token)
      );
      if (!haystackMatches) continue;

      const identityMatches = tokens.some(
        (token) => nameHaystack.includes(token) || leaderHaystack.includes(token)
      );
      if (identityMatches) {
        result.push({ group, matchedGuests, guestOnly });
        continue;
      }

      // Coincidencia solo por invitados: recolecta los nombres implicados.
      const seen = new Set();
      for (let i = 0; i < guests.length; i++) {
        if (tokens.some((token) => guestHaystacks[i].includes(token))) {
          const key = guestHaystacks[i];
          if (!seen.has(key)) {
            seen.add(key);
            matchedGuests.push(guests[i].name);
          }
        }
      }
      guestOnly = matchedGuests.length > 0;
    }

    result.push({ group, matchedGuests, guestOnly });
  }

  return result;
}
