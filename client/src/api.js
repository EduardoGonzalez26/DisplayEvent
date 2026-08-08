const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return null;
  const data = res.status !== 204 ? await res.json().catch(() => null) : null;
  if (!res.ok) throw new Error(data?.error || "Error en la solicitud");
  return data;
}

export const api = {
  events: {
    list: () => request("/events"),
    get: (id) => request(`/events/${id}`),
    stats: (id) => request(`/events/${id}/stats`),
    create: (payload) => request("/events", { method: "POST", body: JSON.stringify(payload) }),
    update: (id, payload) => request(`/events/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    remove: (id) => request(`/events/${id}`, { method: "DELETE" }),
  },
  groups: {
    list: (eventId) => request(`/events/${eventId}/groups`),
    create: (eventId, payload) => request(`/events/${eventId}/groups`, { method: "POST", body: JSON.stringify(payload) }),
    update: (eventId, groupId, payload) => request(`/events/${eventId}/groups/${groupId}`, { method: "PUT", body: JSON.stringify(payload) }),
    remove: (eventId, groupId) => request(`/events/${eventId}/groups/${groupId}`, { method: "DELETE" }),
  },
  guests: {
    list: (eventId) => request(`/events/${eventId}/guests`),
    listByGroup: (eventId, groupId) => request(`/events/${eventId}/guests/${groupId}`),
    create: (eventId, groupId, payload) => request(`/events/${eventId}/guests/${groupId}`, { method: "POST", body: JSON.stringify(payload) }),
    update: (eventId, groupId, guestId, payload) => request(`/events/${eventId}/guests/${groupId}/${guestId}`, { method: "PUT", body: JSON.stringify(payload) }),
    remove: (eventId, groupId, guestId) => request(`/events/${eventId}/guests/${groupId}/${guestId}`, { method: "DELETE" }),
    assign: (eventId, groupId, guestId, payload) => request(`/events/${eventId}/guests/${groupId}/${guestId}/assign`, { method: "PUT", body: JSON.stringify(payload) }),
    companion: (eventId, groupId, guestId, payload) => request(`/events/${eventId}/guests/${groupId}/${guestId}/companion`, { method: "PUT", body: JSON.stringify(payload) }),
  },
  tables: {
    list: (eventId) => request(`/events/${eventId}/tables`),
    create: (eventId, payload) => request(`/events/${eventId}/tables`, { method: "POST", body: JSON.stringify(payload) }),
    update: (eventId, tableId, payload) => request(`/events/${eventId}/tables/${tableId}`, { method: "PUT", body: JSON.stringify(payload) }),
    remove: (eventId, tableId) => request(`/events/${eventId}/tables/${tableId}`, { method: "DELETE" }),
  },
};