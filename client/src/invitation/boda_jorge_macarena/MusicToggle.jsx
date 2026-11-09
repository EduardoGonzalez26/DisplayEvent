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
        className={`mjv3-music ${reveal ? "" : "mjv3-music--hidden"}`}
      >
        <MusicIcon off={!playing} />
      </button>
    </>
  );
}
