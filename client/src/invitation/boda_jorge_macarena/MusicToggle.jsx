import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------
   Botón circular de música (v2): arriba a la derecha, aparece con la
   invitación abierta (`reveal`). Sin autoplay: el audio SOLO se
   descarga al primer toque (`preload="none"` + `play()`), en loop.
   Accesible: `aria-label`/`title` con el estado y `aria-pressed`.

   Sin `cfg.music_url` el botón no se renderiza (el layout no lo monta).
------------------------------------------------------------------ */

function MusicIcon({ off }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

export default function MusicToggle({ url, reveal = true, labels = {} }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  // Si cambia (o desaparece) la URL, la reproducción se detiene.
  useEffect(() => {
    if (!url) {
      setPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    }
  }, [url]);

  // Al desmontar, silencia el audio.
  useEffect(
    () => () => {
      if (audioRef.current) audioRef.current.pause();
    },
    []
  );

  if (!url) return null;

  const label = playing
    ? labels.musicOff || "Apagar música"
    : labels.musicOn || "Encender música";

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    const promise = audio.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => setPlaying(false));
    }
    setPlaying(true);
  };

  return (
    <>
      <audio ref={audioRef} src={url} loop preload="none" />
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        aria-pressed={playing}
        className={`fixed right-3.5 top-[max(14px,env(safe-area-inset-top))] z-[60] flex h-[46px] w-[46px] items-center justify-center rounded-full border border-[rgba(250,247,242,0.5)] bg-[rgba(28,27,25,0.42)] text-[#FAF7F2] backdrop-blur-[8px] transition-opacity duration-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAF7F2] focus-visible:ring-offset-2 ${
          reveal ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <MusicIcon off={!playing} />
      </button>
    </>
  );
}
