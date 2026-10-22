import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ------------------------------------------------------------------
   Mapa de zona (Leaflet + OpenStreetMap, sin API key).

   - Pinta un círculo con el radio de búsqueda y un punto en el centro.
   - `readOnly` (default): mapa de consulta para el invitado.
   - `readOnly={false}`: al hacer clic llama `onChange({ lat, lng })`
     (lo usará el editor en la fase B).
   - Los tiles llevan un filtro grayscale suave aplicado SOLO al pane de
     tiles, de modo que el círculo y el punto conservan su color.
   - Se destruye en unmount y se recalcula el tamaño con ResizeObserver
     (las hojas apiladas cambian de tamaño/transform durante el scroll).
----------------------------------------------------------------- */

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export default function ZoneMap({
  center,
  radiusKm = 1.5,
  label = "",
  readOnly = true,
  onChange,
  className = "",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const circleRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const readOnlyRef = useRef(readOnly);

  const lat = Number(center?.lat);
  const lng = Number(center?.lng);
  const radius = Number(radiusKm);
  const validCenter = Number.isFinite(lat) && Number.isFinite(lng);
  const safeRadius =
    Number.isFinite(radius) && radius > 0 ? Math.min(radius, 50) : 1.5;

  // Mantiene los callbacks/flags frescos sin recrear el mapa.
  useEffect(() => {
    onChangeRef.current = onChange;
    readOnlyRef.current = readOnly;
  }, [onChange, readOnly]);

  // Crea el mapa una sola vez.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !validCenter || mapRef.current) return undefined;

    const map = L.map(el, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: false, // no secuestra el scroll de la página
      attributionControl: true,
      zoomAnimation: true,
      fadeAnimation: true,
    });
    mapRef.current = map;

    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution: TILE_ATTRIBUTION,
    }).addTo(map);

    // Filtro editorial suave, solo en los tiles (círculo/punto intactos).
    const tilePane = map.getPane("tilePane");
    if (tilePane) {
      tilePane.style.filter = "grayscale(0.55) sepia(0.1) contrast(0.96) brightness(1.02)";
    }

    el.style.cursor = readOnlyRef.current ? "" : "crosshair";

    map.on("click", (event) => {
      if (readOnlyRef.current) return;
      const next = {
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      };
      onChangeRef.current?.(next);
    });

    // El tamaño real puede llegar después del primer layout (hojas con
    // scroll/transform). Recalcula sin mover el encuadre.
    const invalidate = () => map.invalidateSize({ pan: false });
    const raf = requestAnimationFrame(invalidate);
    const timer = setTimeout(invalidate, 250);

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(invalidate);
      ro.observe(el);
    }
    window.addEventListener("resize", invalidate);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener("resize", invalidate);
      ro?.disconnect();
      map.off();
      map.remove();
      mapRef.current = null;
      circleRef.current = null;
      markerRef.current = null;
    };
    // Solo se recrea si el centro pasa de inválido a válido. Los cambios de
    // centro/radio los aplica el efecto de capas (debajo) sin perder el zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validCenter]);

  // Actualiza círculo, punto y encuadre cuando cambia el centro/radio.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !validCenter) return;

    circleRef.current?.remove();
    markerRef.current?.remove();

    const circle = L.circle([lat, lng], {
      radius: safeRadius * 1000,
      color: "#1C1B19",
      weight: 1.4,
      opacity: 0.9,
      fillColor: "#6B6660",
      fillOpacity: 0.1,
      dashArray: "4 5",
      interactive: false,
    }).addTo(map);
    circleRef.current = circle;

    const marker = L.circleMarker([lat, lng], {
      radius: 6,
      color: "#1C1B19",
      weight: 1.5,
      fillColor: "#FAF7F2",
      fillOpacity: 1,
      interactive: false,
    }).addTo(map);
    markerRef.current = marker;

    map.fitBounds(circle.getBounds(), {
      padding: [24, 24],
      maxZoom: 16,
      animate: false,
    });
  }, [lat, lng, safeRadius, validCenter]);

  // Ajusta el cursor cuando cambia el modo de edición.
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.style.cursor = readOnly ? "" : "crosshair";
  }, [readOnly]);

  if (!validCenter) {
    return (
      <div
        className={`flex h-[260px] w-full items-center justify-center border border-[var(--inv-accent-border)] bg-[var(--inv-surface)] px-6 text-center text-sm text-[var(--inv-text-muted)] sm:h-[300px] ${className}`}
      >
        {label || "Zona por confirmar"}
      </div>
    );
  }

  return (
    <div
      className={`relative isolate overflow-hidden border border-[var(--inv-accent-border)] bg-[var(--inv-surface)] ${className}`}
    >
      <div
        ref={containerRef}
        role="region"
        aria-label={label ? `Mapa de la zona: ${label}` : "Mapa de la zona"}
        className="h-[260px] w-full sm:h-[300px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[300] shadow-[inset_0_0_28px_rgba(28,27,25,0.10)]"
      />
    </div>
  );
}
