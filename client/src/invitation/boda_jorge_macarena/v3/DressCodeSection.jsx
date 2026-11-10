import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Drawing, Eyebrow, OrnamentRule } from "./index.js";
import { V3 } from "./assets.js";
import { DEFAULT_DRESS } from "./index.js";

function dressLabels(raw) {
  const list = Array.isArray(raw)
    ? raw
        .map((item) =>
          typeof item === "object" && item ? item.label : item
        )
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : String(raw || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
  return list.length ? list : DEFAULT_DRESS.labels;
}

function IdeasColumn({ title, images, gender }) {
  return (
    <div className="mjv3-ideas-col">
      <div className="mjv3-ideas-col-title">{title}</div>
      {images.map((src, index) => (
        <img
          key={src}
          className="mjv3-ideas-img"
          src={src}
          alt={`Idea de vestimenta: ${gender}`}
          loading="lazy"
          decoding="async"
        />
      ))}
    </div>
  );
}

export default function DressCodeSection({ cfg }) {
  const labels = dressLabels(cfg?.dress_code);
  const note = String(cfg?.dress_note || "").trim() || DEFAULT_DRESS.note;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const focusTarget =
        previousFocus && previousFocus !== document.body
          ? previousFocus
          : triggerRef.current;
      if (focusTarget && typeof focusTarget.focus === "function") {
        focusTarget.focus();
      }
    };
  }, [open]);

  const close = () => setOpen(false);

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="mjv3 mjv3-ideas-backdrop"
            data-invitation-theme="boda_jorge_macarena"
            role="presentation"
            onClick={close}
          >
            <div
              className="mjv3-ideas-modal algodon"
              role="dialog"
              aria-modal="true"
              aria-label="Ideas de vestimenta"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                ref={closeRef}
                type="button"
                className="mjv3-ideas-close"
                aria-label="Cerrar"
                onClick={close}
              >
                ×
              </button>
              <div className="mjv3-ideas-head">
                <div className="mj-label mj-label--lg">
                  Código de vestimenta · {labels.join(" · ")}
                </div>
                <h2 className="mjv3-ideas-title">Ideas para inspiraros</h2>
              </div>
              <div className="mjv3-ideas-grid">
                <IdeasColumn
                  title="Ellos"
                  images={V3.ideas.ellos}
                  gender="ellos"
                />
                <IdeasColumn
                  title="Ellas"
                  images={V3.ideas.ellas}
                  gender="ellas"
                />
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="mjv3-split mjv3-split--reverse">
      <div className="mjv3-split-media">
        <Drawing
          src={V3.p7}
          alt="Macarena y Jorge vestidos de gala en Puebla"
          ratio="3 / 4"
          rotate={1.04}
        />
      </div>
      <div className="mjv3-split-copy">
        <Eyebrow>Código de vestimenta</Eyebrow>
        <OrnamentRule />
        <h2 className="mj-display mj-display--lg">{labels.join(" · ")}</h2>
        {note ? <p className="mj-copy">{note}</p> : null}
        <button
          ref={triggerRef}
          type="button"
          className="mjv3-btn mjv3-btn--outline mjv3-ideas-btn"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          Ver ideas
        </button>
      </div>
      {modal}
    </div>
  );
}
