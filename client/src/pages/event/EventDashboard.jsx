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
    const load = async () => {
      try {
        const [s, g] = await Promise.all([
          api.events.stats(id),
          api.groups.list(id),
        ]);
        setStats(s);
        setGroupStats(g);
        setError("");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <p className="text-gray-400">Cargando…</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-1">Dashboard</h1>
      <p className="text-sm text-gray-400 mb-6">Estadísticas de invitados de este evento.</p>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          <StatCard label="Grupos" value={stats.total_groups} />
          <StatCard label="Invitados totales" value={stats.total_guests} />
          <StatCard label="Niños" value={stats.children_count} accent="text-sky-400" />
          <StatCard label="Adultos" value={stats.adults_count} />
          <StatCard label="Ya registrados" value={stats.registered_count} accent="text-emerald-400" />
          <StatCard
            label="Faltan por registrar"
            value={stats.unregistered_count}
            accent="text-amber-400"
          />
        </div>
      )}

      <h2 className="text-lg font-semibold text-white mb-3">Por grupo</h2>
      {groupStats.length === 0 ? (
        <p className="text-gray-500">Este evento no tiene grupos.</p>
      ) : (
        <div className="space-y-2">
          {groupStats.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 px-4 py-3"
            >
              <div>
                <div className="font-medium text-white">{g.name}</div>
                {g.leader_name && (
                  <div className="text-xs text-gray-400">Líder: {g.leader_name}</div>
                )}
              </div>
              <div className="flex gap-4 text-sm text-gray-300">
                <span>{g.guests_count ?? 0} invitados</span>
                <span className="text-sky-400">{g.children_count ?? 0} niños</span>
                <span className="text-emerald-400">{g.registered_count ?? 0} registrados</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}