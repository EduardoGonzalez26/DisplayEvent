import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------
   Actualización automática de la invitación cuando se publica una versión
   nueva (para quien ya tenía el enlace abierto).

   - Cada build deja su id en <meta name="app-build"> y en /version.json
     (archivo estático: consultarlo no toca la base de datos).
   - Se consulta al volver a la pestaña/app y cada 4 min mientras se ve.
   - Si hay versión nueva y el invitado no está a media acción, se recarga
     al volver a la invitación, sin sobre y en el mismo punto del scroll.
   - Si está ocupado (confirmando asistencia, escribiendo, en el pago), no
     se recarga: se muestra un aviso discreto para actualizar cuando quiera.
------------------------------------------------------------------- */

const RESUME_KEY = "mj:resume";
const RESUME_MAX_AGE = 10 * 60 * 1000;
const POLL_MS = 4 * 60 * 1000;

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

// ¿El invitado está a media acción? (no recargar por sorpresa)
function isBusy() {
  const root = document.querySelector(".mjv3");
  if (!root) return false;
  if (document.querySelector(".mjv3-checkout-backdrop")) return true;
  const active = document.activeElement;
  if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return true;
  const rsvpStarted = root.querySelector('.mjv3-guest-row .mjv3-answer[aria-pressed="true"]');
  const rsvpSent = root.querySelector(".mjv3-sent-title");
  if (rsvpStarted && !rsvpSent) return true;
  const draft = [...root.querySelectorAll("textarea")].some((t) => t.value.trim());
  return draft;
}

export function readResume() {
  try {
    const raw = window.sessionStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.path !== window.location.pathname) return null;
    if (Date.now() - Number(data.t || 0) > RESUME_MAX_AGE) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearResume() {
  try {
    window.sessionStorage.removeItem(RESUME_KEY);
  } catch {
    /* noop */
  }
}

const RELOADED_KEY = "mj:reloaded-at";

// Seguro anti-bucle: si ya se recargó por actualización hace < 60 s, no se
// vuelve a recargar sola (se muestra el aviso).
function reloadedRecently() {
  try {
    return Date.now() - Number(window.sessionStorage.getItem(RELOADED_KEY) || 0) < 60000;
  } catch {
    return false;
  }
}

function reloadKeepingPlace() {
  try {
    window.sessionStorage.setItem(RELOADED_KEY, String(Date.now()));
    window.sessionStorage.setItem(
      RESUME_KEY,
      JSON.stringify({ path: window.location.pathname, y: window.scrollY, t: Date.now() })
    );
  } catch {
    /* sin sessionStorage: recarga normal (con sobre) */
  }
  window.location.reload();
}

export function useBuildUpdates() {
  const [updateReady, setUpdateReady] = useState(false);
  const readyRef = useRef(false);
  const build = currentBuild();

  const check = useCallback(async () => {
    if (!build || readyRef.current) return readyRef.current;
    const latest = await latestBuild();
    if (latest && latest !== build) {
      readyRef.current = true;
      setUpdateReady(true);
    }
    return readyRef.current;
  }, [build]);

  useEffect(() => {
    if (!build) return undefined; // desarrollo / sin id de build
    let timer = 0;

    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      const ready = await check();
      if (ready && !isBusy() && !reloadedRecently()) reloadKeepingPlace();
    };

    timer = window.setInterval(() => {
      if (document.visibilityState === "visible") check();
    }, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [build, check]);

  return { updateReady, reload: reloadKeepingPlace };
}

// Tras una recarga por actualización: volver al mismo punto del scroll.
export function useResumeScroll() {
  useEffect(() => {
    const resume = readResume();
    if (!resume) return undefined;
    const y = Number(resume.y) || 0;
    // Se repite mientras cargan imágenes (cambian alturas). La marca se borra
    // después, para que el sobre (que carga aparte) también la lea.
    const timers = [60, 400, 1200].map((ms) =>
      window.setTimeout(() => window.scrollTo({ top: y, behavior: "auto" }), ms)
    );
    timers.push(window.setTimeout(clearResume, 3000));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);
}
