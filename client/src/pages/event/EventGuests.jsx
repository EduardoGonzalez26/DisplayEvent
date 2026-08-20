import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api.js";
import { Modal, Field, inputClass, Button } from "../../components/ui.jsx";

function GroupForm({ initial, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [leaderName, setLeaderName] = useState(initial?.leader_name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit({ name, leader_name: leaderName });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Nombre del grupo">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Familia García"
          required
        />
      </Field>
      <Field label="Líder del grupo">
        <input
          className={inputClass}
          value={leaderName}
          onChange={(e) => setLeaderName(e.target.value)}
          placeholder="Nombre del líder (cuenta como invitado)"
        />
      </Field>
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

function GuestRow({ guest, onToggleChild, onToggleRegistered, onDelete }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors">
      {guest.is_leader ? (
        <span className="shrink-0 w-6 h-6 rounded-lg border border-amber-500/50 bg-amber-900/30 grid place-items-center text-amber-400 text-xs">
          ★
        </span>
      ) : (
        <button
          onClick={onToggleChild}
          aria-label={guest.is_child ? "Quitar marca de niño" : "Marcar como niño"}
          className={`shrink-0 w-6 h-6 rounded-lg border grid place-items-center transition-all ${
            guest.is_child
              ? "bg-sky-500 border-sky-500 text-white shadow-sm shadow-sky-900/40"
              : "border-gray-600 hover:border-sky-500/60"
          }`}
          title={guest.is_child ? "Quitar marca de niño" : "Marcar como niño"}
        >
          {guest.is_child && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5">
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}
      <span className={`flex-1 truncate ${guest.is_child ? "text-sky-400 font-medium" : ""}`}>{guest.name}</span>
      {guest.is_leader ? (
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-amber-300 bg-amber-900/40 rounded-full px-2 py-0.5">
          Líder
        </span>
      ) : null}
      {guest.is_child && !guest.is_leader ? (
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-sky-300 bg-sky-900/40 rounded-full px-2 py-0.5">
          Niño
        </span>
      ) : null}
      <button
        onClick={onToggleRegistered}
        className={`shrink-0 text-xs rounded-full px-2.5 py-1 transition-colors ${
          guest.registered
            ? "bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30"
            : guest.declined
              ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
        }`}
      >
        {guest.registered ? "Confirmado" : guest.declined ? "No asistirá" : "Sin confirmar"}
      </button>
      <button
        onClick={onDelete}
        className="shrink-0 w-7 h-7 rounded-lg grid place-items-center text-xs text-red-500 hover:text-red-400 hover:bg-red-600/10 transition-colors"
        title="Eliminar invitado"
      >
        ✕
      </button>
    </li>
  );
}

function GroupCard({
  group,
  expanded,
  onToggle,
  guests,
  loadingGuests,
  onAddGuest,
  onToggleChild,
  onToggleRegistered,
  onDeleteGuest,
  onEdit,
  onDelete,
  onCopyInvite,
  onUpdatePeriqueras,
}) {
  const [guestName, setGuestName] = useState("");
  const [isChild, setIsChild] = useState(false);
  const [periquerasCount, setPeriquerasCount] = useState(group.high_chairs_count || 1);
  const [saving, setSaving] = useState(false);

  const addGuest = async (e) => {
    e.preventDefault();
    if (!guestName.trim() || saving) return;
    setSaving(true);
    try {
      await onAddGuest(group, { name: guestName.trim(), is_child: isChild });
      setGuestName("");
      setIsChild(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden transition-colors hover:border-indigo-500/40">
      <div
        className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-gray-800/40 transition-colors"
        onClick={onToggle}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`grid place-items-center w-5 h-5 rounded-md text-gray-400 transition-transform duration-200 ${
                expanded ? "rotate-90" : ""
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h3 className="font-semibold text-gray-50 truncate">{group.name}</h3>
          </div>
          {group.leader_name && (
            <p className="text-sm text-gray-400 mt-0.5 ml-7">Líder: {group.leader_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400">
            {group.guests_count ?? 0} invitados
            {group.children_count ? ` · ${group.children_count} niños` : ""}
            {group.high_chairs ? ` · ${group.high_chairs_count} periqueras` : ""}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyInvite(group);
            }}
            title="Copiar enlace de invitación"
            className="text-xs rounded-md px-2 py-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
          >
            Invitación
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(group);
            }}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Editar
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(group);
            }}
            className="text-xs text-red-500 hover:text-red-400 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 p-4">
          <form onSubmit={addGuest} className="flex items-center gap-2 mb-3">
            <input
              className={inputClass}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Nombre del invitado"
            />
            <label className="flex items-center gap-1.5 text-sm text-gray-300 shrink-0">
              <input
                type="checkbox"
                checked={isChild}
                onChange={(e) => setIsChild(e.target.checked)}
                className="w-4 h-4 accent-sky-500"
              />
              Niño
            </label>
            <Button type="submit" disabled={!guestName.trim() || saving}>
              {saving ? "Agregando…" : "Agregar"}
            </Button>
          </form>

          {loadingGuests ? (
            <p className="text-sm text-gray-400">Cargando…</p>
          ) : guests.length === 0 ? (
            <p className="text-sm text-gray-500">Sin invitados en este grupo.</p>
          ) : (
            <ul className="divide-y divide-gray-800">
              {guests.map((guest) => (
                <GuestRow
                  key={guest.id}
                  guest={guest}
                  onToggleChild={() => onToggleChild(group, guest)}
                  onToggleRegistered={() => onToggleRegistered(group, guest)}
                  onDelete={() => onDeleteGuest(group, guest)}
                />
              ))}
            </ul>
          )}

          <div className="mt-4 pt-4 border-t border-gray-800">
            <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={group.high_chairs ? true : false}
                onChange={(e) =>
                  onUpdatePeriqueras(group, {
                    high_chairs: e.target.checked,
                    high_chairs_count: e.target.checked ? periquerasCount : 0,
                  })
                }
                className="w-4 h-4 accent-fuchsia-500"
              />
              <span>El grupo ocupa periqueras</span>
              <span className="text-xs text-gray-500">
                asiento de bebé (~1 año), no consume platillo
              </span>
            </label>
            {group.high_chairs ? (
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs uppercase tracking-wide text-gray-400">
                  ¿Cuántas?
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className={`${inputClass} !w-24 py-1.5`}
                  value={periquerasCount}
                  onChange={(e) => setPeriquerasCount(Number(e.target.value))}
                  onBlur={() =>
                    onUpdatePeriqueras(group, {
                      high_chairs: true,
                      high_chairs_count: periquerasCount >= 1 ? periquerasCount : 1,
                    })
                  }
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel = "Eliminar", onClose, onConfirm }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setSaving(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={title}>
      <p className="text-sm text-gray-300 mb-4">{message}</p>
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={run} disabled={saving}>
          {saving ? "Eliminando…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export default function EventGuests() {
  const { id } = useParams();
  const [groups, setGroups] = useState([]);
  const [guestsByGroup, setGuestsByGroup] = useState({});
  const [loadingGroups, setLoadingGroups] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("error");
  const [confirm, setConfirm] = useState(null);
  const cancelledRef = useRef(false);
  const toastTimer = useRef(null);

  const notify = (message, type = "error") => {
    setToast(message);
    setToastType(type);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  };

  const load = async () => {
    try {
      const g = await api.groups.list(id);
      if (cancelledRef.current) return;
      setGroups(g);
      setError("");
    } catch (err) {
      if (!cancelledRef.current) setError(err.message);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    cancelledRef.current = false;
    setGroups([]);
    setGuestsByGroup({});
    setLoadingGroups({});
    setExpanded({});
    setLoading(true);
    setError("");
    setModal(null);
    setToast("");
    setConfirm(null);
    load();
    return () => {
      cancelledRef.current = true;
    };
  }, [id]);

  const refreshGroups = async () => {
    try {
      const g = await api.groups.list(id);
      setGroups(g);
    } catch (err) {
      notify(err.message);
    }
  };

  const toggleGroup = async (group) => {
    const next = !expanded[group.id];
    setExpanded((s) => ({ ...s, [group.id]: next }));
    if (next && guestsByGroup[group.id] === undefined) {
      setLoadingGroups((s) => ({ ...s, [group.id]: true }));
      try {
        const guests = await api.guests.listByGroup(id, group.id);
        setGuestsByGroup((s) => ({ ...s, [group.id]: guests }));
      } catch (err) {
        notify(err.message);
      } finally {
        setLoadingGroups((s) => ({ ...s, [group.id]: false }));
      }
    }
  };

  const reloadGuests = async (group) => {
    try {
      const guests = await api.guests.listByGroup(id, group.id);
      setGuestsByGroup((s) => ({ ...s, [group.id]: guests }));
    } catch (err) {
      notify(err.message);
    }
    await refreshGroups();
  };

  const handleCreateGroup = async (form) => {
    await api.groups.create(id, form);
    setModal(null);
    await refreshGroups();
  };

  const handleEditGroup = async (form) => {
    await api.groups.update(id, modal.group.id, form);
    setModal(null);
    await refreshGroups();
  };

  const handleDeleteGroup = (group) => {
    setConfirm({
      title: "Eliminar grupo",
      message: `¿Eliminar el grupo "${group.name}" y todos sus invitados?`,
      confirmLabel: "Eliminar",
      action: async () => {
        try {
          await api.groups.remove(id, group.id);
          setGuestsByGroup((s) => {
            const { [group.id]: _removed, ...rest } = s;
            return rest;
          });
          await refreshGroups();
        } catch (err) {
          notify(err.message);
        }
      },
    });
  };

  const handleCopyInvite = async (group) => {
    if (group.invitation_token == null) {
      notify("Este grupo aún no tiene enlace de invitación.");
      return;
    }
    const url = `${window.location.origin}/invitacion/${group.invitation_token}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Enlace de invitación copiado", "success");
    } catch (err) {
      notify(err.message);
    }
  };

  const handleAddGuest = async (group, payload) => {
    try {
      await api.guests.create(id, group.id, payload);
      await reloadGuests(group);
    } catch (err) {
      notify(err.message);
    }
  };

  const handleToggleChild = async (group, guest) => {
    try {
      await api.guests.update(id, group.id, guest.id, { is_child: !guest.is_child });
      await reloadGuests(group);
    } catch (err) {
      notify(err.message);
    }
  };

  const handleToggleRegistered = async (group, guest) => {
    try {
      await api.guests.update(id, group.id, guest.id, { registered: !guest.registered });
      await reloadGuests(group);
    } catch (err) {
      notify(err.message);
    }
  };

  const handleDeleteGuest = (group, guest) => {
    setConfirm({
      title: "Eliminar invitado",
      message: `¿Eliminar a ${guest.name}?`,
      confirmLabel: "Eliminar",
      action: async () => {
        try {
          await api.guests.remove(id, group.id, guest.id);
          await reloadGuests(group);
        } catch (err) {
          notify(err.message);
        }
      },
    });
  };

  const handleUpdatePeriqueras = async (group, payload) => {
    try {
      await api.groups.update(id, group.id, {
        name: group.name,
        leader_name: group.leader_name,
        ...payload,
      });
      await refreshGroups();
    } catch (err) {
      notify(err.message);
    }
  };

  return (
    <div className="animate-page-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-50">
          Invitados
          <span className="text-sm font-normal text-gray-400 ml-2">({groups.length} grupos)</span>
        </h1>
        <Button onClick={() => setModal({ mode: "create-group" })}>+ Nuevo grupo</Button>
      </div>

      <div className="flex items-start gap-2.5 text-sm text-gray-400 mb-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400">
          <path d="M12 2 4 5v6c0 5.25 3.4 10.74 8 12 4.6-1.26 8-6.75 8-12V5l-8-3Zm0 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM7.2 17.4A5 5 0 0 1 12 15a5 5 0 0 1 4.8 2.4A8.6 8.6 0 0 1 12 19.5a8.6 8.6 0 0 1-4.8-2.1Z" />
        </svg>
        Organiza a los invitados por grupos. El líder de cada grupo se registra automáticamente
        como invitado.
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando…</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 p-8 text-center text-gray-400">
          Aún no hay grupos. Crea uno para empezar a organizar invitados.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              expanded={!!expanded[group.id]}
              onToggle={() => toggleGroup(group)}
              guests={guestsByGroup[group.id] ?? []}
              loadingGuests={!!loadingGroups[group.id]}
              onAddGuest={handleAddGuest}
              onToggleChild={handleToggleChild}
              onToggleRegistered={handleToggleRegistered}
              onDeleteGuest={handleDeleteGuest}
              onEdit={(g) => setModal({ mode: "edit-group", group: g })}
              onDelete={handleDeleteGroup}
              onCopyInvite={handleCopyInvite}
              onUpdatePeriqueras={handleUpdatePeriqueras}
            />
          ))}
        </div>
      )}

      {modal?.mode === "create-group" && (
        <Modal open onClose={() => setModal(null)} title="Nuevo grupo">
          <GroupForm onSubmit={handleCreateGroup} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.mode === "edit-group" && (
        <Modal open onClose={() => setModal(null)} title="Editar grupo">
          <GroupForm
            initial={modal.group}
            onSubmit={handleEditGroup}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onClose={() => setConfirm(null)}
          onConfirm={confirm.action}
        />
      )}

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-xl text-sm shadow-2xl border text-white animate-toast-in flex items-start gap-2.5 ${
            toastType === "success"
              ? "bg-emerald-600 border-emerald-500"
              : "bg-red-600 border-red-500"
          }`}
          onClick={() => setToast("")}
          role="alert"
        >
          <span className="shrink-0 grid place-items-center w-5 h-5 rounded-full bg-white/20 text-xs mt-px">
            {toastType === "success" ? "✓" : "!"}
          </span>
          <span className="flex-1">{toast}</span>
        </div>
      )}
    </div>
  );
}