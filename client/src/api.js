const BASE = "/api";

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    headers: isFormData ? undefined : { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (res.status === 204) return null;
  const data = res.status !== 204 ? await res.json().catch(() => null) : null;
  if (res.status === 401 && !path.startsWith("/auth/")) {
    window.dispatchEvent(new CustomEvent("de:unauthorized"));
  }
  if (!res.ok) {
    const base = data?.error || "Error en la solicitud";
    const err = new Error(data?.detail ? `${base}: ${data.detail}` : base);
    err.code = data?.code;
    err.email = data?.email;
    throw err;
  }
  return data;
}

export const api = {
  auth: {
    me: () => request("/auth/me"),
    login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
    register: (payload) =>
      request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
    logout: () => request("/auth/logout", { method: "POST" }),
    verify: (token) => request("/auth/verify", { method: "POST", body: JSON.stringify({ token }) }),
    resendVerification: (email) =>
      request("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) }),
  },
  events: {
    list: (params) => {
      const q = params ? `?${new URLSearchParams(params)}` : "";
      return request(`/events${q}`);
    },
    get: (id) => request(`/events/${id}`),
    stats: (id) => request(`/events/${id}/stats`),
    invitation: (id) => request(`/events/${id}/invitation`),
    setInvitation: (id, payload) => request(`/events/${id}/invitation`, { method: "PUT", body: JSON.stringify(payload) }),
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
  templates: {
    list: () => request("/templates"),
    get: (id) => request(`/templates/${id}`),
    create: (payload) => request("/templates", { method: "POST", body: JSON.stringify(payload) }),
    update: (id, payload) => request(`/templates/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    remove: (id) => request(`/templates/${id}`, { method: "DELETE" }),
  },
  invitations: {
    get: (token) => request(`/invitations/${token}`),
    rsvp: (token, payload) => request(`/invitations/${token}/rsvp`, { method: "PUT", body: JSON.stringify(payload) }),
  },
  upload: (file) => {
    const body = new FormData();
    body.append("file", file);
    return request("/uploads", { method: "POST", body });
  },
};