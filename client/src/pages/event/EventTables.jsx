import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";
import { api } from "../../api.js";
import { Modal, Field, inputClass, Button } from "../../components/ui.jsx";

const PALETTE = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
];

const SHAPES = {
  circle: "Redonda",
  square: "Cuadrada",
  rect: "Rectangular",
};

function shapeClasses(shape) {
  if (shape === "circle") return "w-36 h-36 rounded-full";
  if (shape === "square") return "w-36 h-36 rounded-2xl";
  return "w-56 h-24 rounded-xl";
}

function DraggableGuest({ guest, color }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `g-${guest.id}`,
    disabled: !guest.registered || Boolean(guest.companion_id),
  });

  const canDrag = guest.registered && !guest.companion_id;

  if (!canDrag) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${
          guest.companion_id
            ? "border-gray-800 bg-gray-900/40 text-gray-500"
            : "border-gray-800 bg-gray-900/40 text-amber-500/70"
        }`}
        title={
          guest.companion_id
            ? "Se mueve con su invitado principal"
            : "No ha confirmado asistencia"
        }
      >
        <span className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`} />
        <span className="flex-1 truncate">{guest.name}</span>
        {guest.companion_id ? (
          <span className="text-[10px] uppercase text-gray-600">acompaña</span>
        ) : (
          <span className="text-[10px] uppercase text-amber-500/80">sin confirmar</span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-gray-800 border border-gray-700 cursor-grab select-none hover:border-indigo-500 transition-colors ${
        isDragging ? "opacity-40" : ""
      }`}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
          : undefined
      }
    >
      <span className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`} />
      <span className="flex-1 truncate">{guest.name}</span>
      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Confirmado" />
    </div>
  );
}

function TableCard({ table, guests, onEdit, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({ id: `table-${table.id}` });
  const count = guests.length;
  const pct = table.capacity > 0 ? Math.round((count / table.capacity) * 100) : 0;
  const full = count >= table.capacity;
  const barColor = pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500";

  const sorted = useMemo(
    () => guests.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [guests]
  );

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-4 transition-colors ${
        isOver ? "border-indigo-500 bg-indigo-600/10" : "border-gray-800 bg-gray-900"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-white">{table.name}</div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(table)} className="text-xs text-gray-400 hover:text-white">
            Editar
          </button>
          <button
            onClick={() => onDelete(table)}
            className="text-xs text-red-500 hover:text-red-400"
          >
            Eliminar
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 mb-2">
        <div
          className={`${shapeClasses(table.shape)} border-2 border-dashed grid place-items-center ${
            isOver ? "border-indigo-400" : full ? "border-red-800" : "border-gray-700"
          }`}
        >
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest text-gray-500">
              {SHAPES[table.shape]}
            </div>
            <div className={`text-xl font-bold ${full ? "text-red-400" : "text-white"}`}>
              {count}
              <span className="text-sm text-gray-400">/{table.capacity}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden mb-3">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      {count === 0 ? (
        <p className={`text-xs text-center py-2 ${isOver ? "text-indigo-300" : "text-gray-600"}`}>
          {isOver ? "Suelta aquí" : "Mesa vacía — arrastra invitados"}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5 max-h-28 overflow-auto">
          {sorted.map((g) => (
            <li
              key={g.id}
              className={`text-xs rounded-full px-2 py-1 ${
                g.is_leader ? "bg-amber-900/40 text-amber-300" : "bg-gray-800 text-gray-300"
              }`}
            >
              {g.is_leader && <span className="mr-1">★</span>}
              {g.name}
              {g.companion_id && <span className="ml-1 text-gray-500">+1</span>}
              {g.is_child && <span className="ml-1 text-sky-400">(niño)</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FreeZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "unassign" });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl p-3 text-center text-sm mb-4 border border-dashed transition-colors ${
        isOver ? "border-indigo-500 bg-indigo-600/10 text-indigo-200" : "border-gray-700 text-gray-500"
      }`}
    >
      Zona libre — arrastra aquí para quitar de la mesa
    </div>
  );
}

export default function EventTables() {
  const { id } = useParams();
  const [guests, setGuests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(true);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("error");
  const [modal, setModal] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    try {
      const [gs, gr, ts] = await Promise.all([
        api.guests.list(id),
        api.groups.list(id),
        api.tables.list(id),
      ]);
      setGuests(gs);
      setGroups(gr);
      setTables(ts);
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

  const notify = (message, type = "error") => {
    setToast(message);
    setToastType(type);
    setTimeout(() => setToast(""), 4000);
  };

  const colorBy = useMemo(() => {
    const map = {};
    groups.forEach((group, i) => (map[group.id] = PALETTE[i % PALETTE.length]));
    return map;
  }, [groups]);

  const colorFor = (guest) => colorBy[guest.group_id] || "bg-gray-500";

  const handleDragEnd = async (e) => {
    const { active, over } = e;
    if (!over) return;
    const guestId = Number(active.id.toString().slice(2));
    const guest = guests.find((g) => g.id === guestId);
    if (!guest) return;

    const target = over.id.toString();
    let tableId;
    if (target === "unassign") tableId = null;
    else if (target.startsWith("table-")) tableId = Number(target.slice(6));
    else if (target.startsWith("g-")) tableId = guest.table_id;
    else return;

    try {
      await api.guests.assign(id, guest.group_id, guest.id, { table_id: tableId });
      notify(
        tableId === null ? `${guest.name} fue liberado de la mesa.` : `${guest.name} ya está en la mesa.`,
        "success"
      );
      await load();
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const sidebarGuests = useMemo(() => {
    let list = guests.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (onlyUnassigned) list = list.filter((g) => g.table_id == null);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q));
    }
    return list;
  }, [guests, onlyUnassigned, query]);

  const guestsByTable = useMemo(() => {
    const map = {};
    tables.forEach((t) => (map[t.id] = []));
    guests
      .filter((g) => g.table_id != null)
      .forEach((g) => {
        if (map[g.table_id]) map[g.table_id].push(g);
      });
    return map;
  }, [guests, tables]);

  const guestById = useMemo(() => {
    const m = {};
    guests.forEach((g) => (m[g.id] = g));
    return m;
  }, [guests]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-white">Organizador de mesas</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setModal({ type: "companions" })}>
            Acompañantes
          </Button>
          <Button variant="secondary" onClick={() => setModal({ type: "export" })}>
            Imprimir / CSV
          </Button>
          <Button onClick={() => setModal({ type: "create" })}>+ Nueva mesa</Button>
        </div>
      </div>
      <p className="text-sm text-gray-400 mb-5">
        Arrastra un invitado confirmado a una mesa. Solo quienes confirmaron asistencia pueden
        sentarse.
      </p>

      {loading ? (
        <p className="text-gray-400">Cargando…</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-4 gap-6 items-start">
            <div className="col-span-1">
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-3 sticky top-24">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Invitados</div>
                <input
                  className={inputClass}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar…"
                />
                <label className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                  <input
                    type="checkbox"
                    checked={onlyUnassigned}
                    onChange={(e) => setOnlyUnassigned(e.target.checked)}
                    className="accent-indigo-500"
                  />
                  Solo sin asignar
                </label>

                <div className="mt-3 space-y-1.5 max-h-[55vh] overflow-auto">
                  {sidebarGuests.length === 0 ? (
                    <p className="text-xs text-gray-600">Sin invitados.</p>
                  ) : (
                    sidebarGuests.map((g) => (
                      <DraggableGuest key={g.id} guest={g} color={colorFor(g)} />
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-3">
              <div className="flex justify-end">
                <span className="text-xs text-gray-500 mb-2">
                  {guests.filter((g) => g.table_id != null).length} de{" "}
                  {guests.filter((g) => g.registered).length} confirmados sentados
                </span>
              </div>
              <FreeZone />

              {tables.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-700 p-10 text-center text-gray-400">
                  No hay mesas. Crea la primera para empezar a acomodar invitados.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {tables.map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      guests={guestsByTable[table.id] || []}
                      onEdit={(t) => setModal({ type: "edit", table: t })}
                      onDelete={(t) => setModal({ type: "delete", table: t })}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </DndContext>
      )}

      {modal?.type === "create" && (
        <TableFormModal
          onClose={() => setModal(null)}
          onSave={async (payload) => {
            await api.tables.create(id, payload);
            setModal(null);
            await load();
          }}
        />
      )}
      {modal?.type === "edit" && (
        <TableFormModal
          initial={modal.table}
          onClose={() => setModal(null)}
          onSave={async (payload) => {
            await api.tables.update(id, modal.table.id, payload);
            setModal(null);
            await load();
          }}
        />
      )}
      {modal?.type === "delete" && (
        <DeleteTableModal
          table={modal.table}
          onClose={() => setModal(null)}
          onConfirm={async () => {
            await api.tables.remove(id, modal.table.id);
            setModal(null);
            await load();
          }}
        />
      )}
      {modal?.type === "companions" && (
        <CompanionsModal
          guests={guests}
          guestById={guestById}
          eventId={id}
          onClose={() => setModal(null)}
          onChanged={() => load()}
          notify={notify}
        />
      )}
      {modal?.type === "export" && (
        <ExportModal tables={tables} guests={guests} guestById={guestById} onClose={() => setModal(null)} />
      )}

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-xl text-sm shadow-2xl border text-white ${
            toastType === "success"
              ? "bg-emerald-600 border-emerald-500"
              : "bg-red-600 border-red-500"
          }`}
          onClick={() => setToast("")}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function TableFormModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || { name: "", capacity: 8, shape: "circle" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={initial ? "Editar mesa" : "Nueva mesa"}>
      <form onSubmit={submit}>
        <Field label="Nombre">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Mesa 1"
            required
          />
        </Field>
        <Field label="Capacidad (personas)">
          <input
            className={inputClass}
            type="number"
            min="1"
            max="100"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
          />
        </Field>
        <Field label="Forma">
          <select
            className={inputClass}
            value={form.shape}
            onChange={(e) => setForm({ ...form, shape: e.target.value })}
          >
            <option value="circle">Redonda</option>
            <option value="square">Cuadrada</option>
            <option value="rect">Rectangular</option>
          </select>
        </Field>
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteTableModal({ table, onClose, onConfirm }) {
  return (
    <Modal open onClose={onClose} title="Eliminar mesa">
      <p className="text-sm text-gray-300 mb-4">
        ¿Eliminar <span className="text-white font-medium">{table.name}</span>? Los invitados
        asignados quedan libres para recolocar.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Eliminar
        </Button>
      </div>
    </Modal>
  );
}

function CompanionsModal({ guests, guestById, eventId, onClose, onChanged, notify }) {
  const [savingId, setSavingId] = useState(null);

  const setCompanion = async (guestId, companionId) => {
    const guest = guestById[guestId];
    setSavingId(guestId);
    try {
      await api.guests.companion(eventId, guest.group_id, guest.id, {
        companion_id: companionId === "" ? null : Number(companionId),
      });
      notify(companionId === "" ? "Vínculo eliminado" : "Acompañante vinculado", "success");
      await onChanged();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setSavingId(null);
    }
  };

  const confirmados = guests.filter((g) => g.registered);

  return (
    <Modal open onClose={onClose} title="Vincular acompañantes">
      <p className="text-sm text-gray-400 mb-4">
        Un acompañante se mueve junto a su invitado principal y ocupa su propio asiento.
      </p>
      <div className="max-h-[55vh] overflow-auto">
        {confirmados.length === 0 && <p className="text-sm text-gray-500">Sin invitados confirmados.</p>}
        <table className="w-full text-sm">
          <tbody>
            {confirmados.map((g) => (
              <tr key={g.id} className="border-b border-gray-800">
                <td className="py-2 pr-2 text-gray-200">{g.name}</td>
                <td className="py-2 text-right">
                  <select
                    className={`${inputClass} max-w-[180px]`}
                    value={g.companion_id ?? ""}
                    disabled={savingId === g.id}
                    onChange={(e) => setCompanion(g.id, e.target.value)}
                  >
                    <option value="">— Sin acompañante —</option>
                    {guests
                      .filter((o) => o.id !== g.id && !o.companion_id)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function ExportModal({ tables, guests, guestById, onClose }) {
  const guestByIdLocal = useMemo(() => {
    const m = {};
    guests.forEach((g) => (m[g.id] = g));
    return m;
  }, [guests]);

  // Filas agrupadas por mesa, orden alfabético dentro de cada mesa
  const rows = useMemo(() => {
    const out = [];
    for (const table of tables) {
      const seated = guests
        .filter((g) => g.table_id === table.id)
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const g of seated) {
        const main = g.companion_id ? guestByIdLocal[g.companion_id] : null;
        out.push({
          table: table.name,
          name: g.name,
          is_leader: g.is_leader,
          is_child: g.is_child,
          companion: main ? main.name : "",
        });
      }
    }
    return out;
  }, [guests, tables, guestByIdLocal]);

  const download = () => {
    const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
    const csv = [
      "Mesa,Nombre,Principal,Niño,UR(P)",
      ...rows.map((r) => [r.table, esc(r.name), r.companion ? esc(r.companion) : "", r.is_child ? "si" : "no", r.is_leader ? "si" : "no"].join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invitados-por-mesa.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const print = () => {
    const win = window.open("", "_blank");
    const html = `
      <html><head><title>Lista de mesas</title><style>
        body{font-family:system-ui,sans-serif;padding:2.5rem;color:#111}
        h1{font-size:1.4rem;margin-bottom:1rem}
        h2{font-size:1.1rem;margin:1.4rem 0 .5rem;border-bottom:1px solid #ccc;padding-bottom:.3rem}
        table{width:100%;border-collapse:collapse;font-size:.9rem}
        th,td{text-align:left;padding:.35rem .6rem;border-bottom:1px solid #eee}
        th{background:#f4f4f4}
        .meta{margin-bottom:1.2rem;color:#333}
      </style></head><body>
      <h1>Organización de mesas</h1>
      <div class="meta">${new Date().toLocaleDateString("es-MX")} · ${tables.length} mesas</div>
      ${tables
        .map((t) => {
          const list = rows.filter((r) => r.table === t.name);
          return `<h2>${t.name} (${list.length}/${t.capacity})</h2>
          <table><thead><tr><th>Nombre</th><th>Detalle</th></tr></thead><tbody>
          ${list
            .map(
              (r) =>
                `<tr><td>${r.name}${r.is_leader ? " ★" : ""}</td><td>${r.is_child ? "Niño " : ""}${r.companion ? "· acompañante de " + r.companion : ""}</td></tr>`
            )
            .join("")}
          </tbody></table>`;
        })
        .join("")}
      <script>window.print()</script></body></html>`;
    win.document.write(html);
    win.document.close();
  };

  return (
    <Modal open onClose={onClose} title="Exportar acomodo de mesas">
      <div className="flex gap-2 mb-4">
        <Button variant="secondary" onClick={print}>
          Imprimir lista
        </Button>
        <Button variant="secondary" onClick={download}>
          Descargar CSV
        </Button>
      </div>
      <div className="max-h-[50vh] overflow-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-800">
              <th className="px-3 py-2">Mesa</th>
              <th className="px-3 py-2">Invitado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-4 text-center text-gray-500">
                  Aún no hay invitados sentados.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="px-3 py-1.5 text-gray-400">{r.table}</td>
                  <td className="px-3 py-1.5">
                    {r.name}
                    {r.is_leader && <span className="text-amber-400"> ★</span>}
                    {r.is_child && <span className="text-sky-400"> (niño)</span>}
                    {r.companion && (
                      <span className="text-gray-500"> · con {r.companion}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}