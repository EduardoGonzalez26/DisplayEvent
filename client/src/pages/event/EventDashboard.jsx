import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api.js";
import { StatCard } from "../../components/ui.jsx";

export default function EventDashboard() {
  const { id } = useParams();
  const [stats, setStats] = useState(null);
  const [groupStats, setGroupStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setStats(null);
    setGroupStats([]);
    setLoading(true);
    setError("");
    let cancelled = false;
    const load = async () => {
      try {
        const [s, g] = await Promise.all([
          api.events.stats(id),
          api.groups.list(id),
        ]);
        if (cancelled) return;
        setStats(s);
        setGroupStats(g);
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
            label="Sin confirmar"
            value={stats.unregistered_count}
            accent="text-amber-400"
          />
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-50 mb-3">Por grupo</h2>
      {groupStats.length === 0 ? (
        <p className="text-gray-500">Este evento no tiene grupos.</p>
      ) : (
        <div className="space-y-3">
          {groupStats.map((g) => {
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