import { useEffect } from "react";

/* ------------------------------------------------------------------
   Recarga silenciosa tras publicar una versión nueva, para quien dejó la
   invitación abierta (p. ej. en Safari) y vuelve a ella. Quien abre el
   enlace de nuevo ya recibe la versión actual; esto solo cubre la pestaña
   que se quedó abierta.

   - Cada build deja su id en <meta name="app-build"> y en /version.json
     (archivo estático: consultarlo no toca la base de datos).
   - Se consulta al volver a la pestaña/app y cada 4 min mientras se ve.
   - Si hay versión nueva, se recarga al volver (normal: con sobre). Sin
     avisos. No recarga si el invitado está escribiendo o en el pago; lo
     hará la siguiente vez que vuelva. La confirmación de asistencia no se
     pierde: se guarda como borrador al seleccionar.
------------------------------------------------------------------- */

const POLL_MS = 4 * 60 * 1000;
const RELOADED_KEY = "mj:reloaded-at";

function currentBuild() {
  if (typeof document === "undefined") return "";
  return document.querySelector('meta[name="app-build"]')?.content || "";
}

async function latestBuild() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return "";
    const data = await res.json();
    return typeof data?.build === "string" ? data.build : "";
  } catch {
    return "";
  }
}

function isBusy() {
  if (document.querySelector(".mjv3-checkout-backdrop")) return true;
  const active = document.activeElement;
  return !!active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
}

// Seguro anti-bucle: no recargar dos veces en menos de 60 s.
function reloadedRecently() {
  try {
    return Date.now() - Number(window.sessionStorage.getItem(RELOADED_KEY) || 0) < 60000;
  } catch {
    return false;
  }
}

function reload() {
  try {
    window.sessionStorage.setItem(RELOADED_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
  window.location.reload();
}

export function useBuildUpdates() {
  useEffect(() => {
    const build = currentBuild();
    if (!build) return undefined; // desarrollo / sin id de build
    let pending = false;

    const check = async () => {
      if (pending) return true;
      const latest = await latestBuild();
      pending = !!latest && latest !== build;
      return pending;
    };

    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      if ((await check()) && !isBusy() && !reloadedRecently()) reload();
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") check();
    }, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, []);
}
