import { useEffect, useState } from "react";
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
    <li className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800/50">
      {guest.is_leader ? (
        <span className="shrink-0 w-5 h-5 rounded border border-amber-500/50 grid place-items-center text-amber-400 text-[10px]">
          ★
        </span>
      ) : (
        <button
          onClick={onToggleChild}
          className={`shrink-0 w-5 h-5 rounded border transition-colors ${
            guest.is_child ? "bg-sky-500 border-sky-500" : "border-gray-600"
          }`}
          title={guest.is_child ? "Quitar marca de niño" : "Marcar como niño"}
        />
      )}
      <span className={`flex-1 truncate ${guest.is_child ? "text-sky-300" : ""}`}>{guest.name}</span>
      {guest.is_leader ? (
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-amber-400 bg-amber-900/40 rounded-full px-2 py-0.5">
          Líder
        </span>
      ) : null}
      {guest.is_child && !guest.is_leader ? (
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-sky-400 bg-sky-900/40 rounded-full px-2 py-0.5">
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
      <button onClick={onDelete} className="shrink-0 text-xs text-red-500 hover:text-red-400">
        Eliminar
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
}) {
  const [guestName, setGuestName] = useState("");
  const [isChild, setIsChild] = useState(false);

  const addGuest = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    await onAddGuest(group, { name: guestName.trim(), is_child: isChild });
    setGuestName("");
    setIsChild(false);
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
      <div className="p-4 flex items-center justify-between gap-3 cursor-pointer" onClick={onToggle}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>
            <h3 className="font-semibold text-white truncate">{group.name}</h3>
          </div>
          {group.leader_name && (
            <p className="text-sm text-gray-400 mt-0.5 ml-6">Líder: {group.leader_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400">
            {group.guests_count ?? 0} invitados
            {group.children_count ? ` · ${group.children_count} niños` : ""}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyInvite(group);
            }}
            title="Copiar enlace de invitación"
            className="text-xs text-gold-400 hover:text-gold-300"
          >
            Invitación
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(group);
            }}
            className="text-xs text-gray-400 hover:text-white"
          >
            Editar
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(group);
            }}
            className="text-xs text-red-500 hover:text-red-400"
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
            <Button type="submit" disabled={!guestName.trim()}>
              Agregar
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
        </div>
      )}
    </div>
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

  const load = async () => {
    try {
      const g = await api.groups.list(id);
      setGroups(g);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const refreshGroups = async () => {
    const g = await api.groups.list(id);
    setGroups(g);
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
        alert(err.message);
      } finally {
        setLoadingGroups((s) => ({ ...s, [group.id]: false }));
      }
    }
  };

  const reloadGuests = async (group) => {
    const guests = await api.guests.listByGroup(id, group.id);
    setGuestsByGroup((s) => ({ ...s, [group.id]: guests }));
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

  const handleDeleteGroup = async (group) => {
    if (!confirm(`¿Eliminar el grupo "${group.name}" y todos sus invitados?`)) return;
    try {
      await api.groups.remove(id, group.id);
      setGuestsByGroup((s) => {
        const { [group.id]: _removed, ...rest } = s;
        return rest;
      });
      await refreshGroups();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCopyInvite = async (group) => {
    if (group.invitation_token == null) {
      alert("Este grupo aún no tiene enlace de invitación.");
      return;
    }
    const url = `${window.location.origin}/invitacion/${group.invitation_token}`;
    try {
      await navigator.clipboard.writeText(url);
      alert(`Enlace de invitación copiado:\n${url}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddGuest = async (group, payload) => {
    await api.guests.create(id, group.id, payload);
    await reloadGuests(group);
  };

  const handleToggleChild = async (group, guest) => {
    await api.guests.update(id, group.id, guest.id, { is_child: !guest.is_child });
    await reloadGuests(group);
  };

  const handleToggleRegistered = async (group, guest) => {
    await api.guests.update(id, group.id, guest.id, { registered: !guest.registered });
    await reloadGuests(group);
  };

  const handleDeleteGuest = async (group, guest) => {
    if (!confirm(`¿Eliminar a ${guest.name}?`)) return;
    try {
      await api.guests.remove(id, group.id, guest.id);
      await reloadGuests(group);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">
          Invitados
          <span className="text-sm font-normal text-gray-400 ml-2">({groups.length} grupos)</span>
        </h1>
        <Button onClick={() => setModal({ mode: "create-group" })}>+ Nuevo grupo</Button>
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Organiza a los invitados por grupos. El líder de cada grupo se registra automáticamente como
        invitado.
      </p>

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
    </div>
  );
}