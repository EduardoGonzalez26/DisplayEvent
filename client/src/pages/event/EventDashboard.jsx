import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api.js";
import { StatCard, Button } from "../../components/ui.jsx";
import GroupFiltersBar from "../../components/GroupFiltersBar.jsx";
import {
  DEFAULT_GROUP_FILTERS,
  applyGroupFilters,
  formatGuestMatches,
  indexGuestsByGroup,
} from "../../lib/groupFilters.js";

export default function EventDashboard() {
  const { id } = useParams();
  const [stats, setStats] = useState(null);
  const [groupStats, setGroupStats] = useState([]);
  // Índice completo de invitados (api.guests.list) para buscar por nombre.
  const [allGuests, setAllGuests] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_GROUP_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setStats(null);
    setGroupStats([]);
    setAllGuests([]);
    setFilters(DEFAULT_GROUP_FILTERS);
    setLoading(true);
    setError("");
    let cancelled = false;
    const load = async () => {
      try {
        const [s, g, guests] = await Promise.all([
          api.events.stats(id),
          api.groups.list(id),
          api.guests.list(id),
        ]);
        if (cancelled) return;
        setStats(s);
        setGroupStats(g);
        setAllGuests(guests);
        setError("");
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Índice de invitados por grupo para buscar por nombre (aunque el grupo no
  // se muestre expandido en esta vista).
  const guestsByGroupId = useMemo(() => indexGuestsByGroup(allGuests), [allGuests]);
  // Lista visible de "Por grupo"; las StatCards siguen siendo globales.
  const filteredGroups = useMemo(
    () => applyGroupFilters(groupStats, filters, guestsByGroupId),
    [groupStats, filters, guestsByGroupId]
  );

  if (loading) return <p className="text-gray-400 animate-page-in">Cargando…</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div className="animate-page-in">
      <h1 className="text-2xl font-bold text-gray-50 mb-1">Dashboard</h1>
      <p className="text-sm text-gray-400 mb-6">Estadísticas de invitados de este evento.</p>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          <StatCard label="Grupos" value={stats.total_groups} />
          <StatCard label="Invitados totales" value={stats.total_guests} />
          <StatCard label="Niños" value={stats.children_count} accent="text-sky-400" />
          <StatCard label="Adultos" value={stats.adults_count} />
          <StatCard label="Confirmados" value={stats.registered_count} accent="text-emerald-400" />
          <StatCard
            label="No asistirán"
            value={stats.declined_count ?? 0}
            accent="text-rose-400"
          />
          <StatCard
            label="Sin responder"
            value={stats.unregistered_count}
            accent="text-amber-400"
          />
        </div>
      )}

      {groupStats.length > 0 && (
        <GroupFiltersBar
          filters={filters}
          onChange={setFilters}
          shown={filteredGroups.length}
          total={groupStats.length}
          className="mb-6"
        />
      )}

      <h2 className="text-lg font-semibold text-gray-50 mb-3">Por grupo</h2>
      {groupStats.length === 0 ? (
        <p className="text-gray-500">Este evento no tiene grupos.</p>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 p-8 text-center text-gray-400">
          <p>No hay grupos que coincidan con la búsqueda o filtros.</p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => setFilters({ ...DEFAULT_GROUP_FILTERS })}
          >
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map(({ group: g, matchedGuests, guestOnly }) => {
            const total = g.guests_count ?? 0;
            const reg = g.registered_count ?? 0;
            const pct = total > 0 ? Math.round((reg / total) * 100) : 0;
            return (
              <div
                key={g.id}
                className="rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3 transition-colors hover:border-indigo-500/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-50 truncate">{g.name}</div>
                    {g.leader_name && (
                      <div className="text-xs text-gray-400">Líder: {g.leader_name}</div>
                    )}
                    {guestOnly && matchedGuests.length > 0 && (
                      <div className="text-xs text-indigo-300/80">
                        Coinciden: {formatGuestMatches(matchedGuests)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-gray-800 px-2.5 py-1 text-gray-300">
                      {total} invitados
                    </span>
                    <span className="rounded-full bg-sky-900/40 text-sky-300 px-2.5 py-1">
                      {g.children_count ?? 0} niños
                    </span>
                    <span className="rounded-full bg-emerald-900/40 text-emerald-300 px-2.5 py-1">
                      {reg} confirmados
                    </span>
                    <span className="rounded-full bg-rose-900/40 text-rose-300 px-2.5 py-1">
                      {g.declined_count ?? 0} no asistirán
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 w-10 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}