import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { boda_jorge_macarena as THEME } from "../invitation/themes/boda_jorge_macarena.js";
import {
  displayNames,
  longDateLine,
  monthYearLine,
  parseEventDate,
  prettyTime,
} from "../invitation/boda_jorge_macarena/helpers.js";
import { extractInvitationToken } from "./invitationLink.js";
import { isCustomDomainActive } from "../lib/publicDomain.js";
import CoverSection from "../invitation/boda_jorge_macarena/v3/CoverSection.jsx";
import StorySection from "../invitation/boda_jorge_macarena/v3/StorySection.jsx";
import LocationSection from "../invitation/boda_jorge_macarena/v3/LocationSection.jsx";
import DressCodeSection from "../invitation/boda_jorge_macarena/v3/DressCodeSection.jsx";
import TravelSection from "../invitation/boda_jorge_macarena/v3/TravelSection.jsx";
import StaySection from "../invitation/boda_jorge_macarena/v3/StaySection.jsx";
import ClosingSection from "../invitation/boda_jorge_macarena/v3/ClosingSection.jsx";
import {
  Button,
  NazariFrame,
  useV3Reveal,
} from "../invitation/boda_jorge_macarena/v3/index.js";
import { V3 } from "../invitation/boda_jorge_macarena/v3/assets.js";
import "../invitation/boda_jorge_macarena/v3.css";

/* ------------------------------------------------------------------
   Portada pública de la boda de Macarena & Jorge en su dominio propio.

   Página INDEPENDIENTE de la invitación personal:
   - No monta InvitationView, BodaJorgeMacarenaLayout ni InvitationPage.
   - No lee invitados, grupos ni pases; no llama a endpoints de RSVP.
   - El acceso a la invitación personal es un navegador de enlaces: se
     pega el enlace/token recibido por WhatsApp y se abre
     `/invitacion/<token>` (el token se resuelve contra este origen).

   Lenguaje visual: el sistema v3 (papel de algodón, marco nazarí,
   granada en acuarela, letterpress, dibujos del paquete y Nikolai
   Condensed). Usa los dibujos del paquete, nunca `gallery`/`hero_image`.
------------------------------------------------------------------- */

const FALLBACK_NAMES = ["Macarena", "Jorge"];
const INVITATION_HELP =
  "Cada invitación es personal. Ábrela desde el enlace que recibiste por WhatsApp: ahí encontrarás los detalles de tu grupo y podrás confirmar tu asistencia.";

function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

function useSmoothCoverScroll() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("de-cover-scroll");
    return () => root.classList.remove("de-cover-scroll");
  }, []);
}

function parseEventNames(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  const clean = raw
    .replace(/\s*[·|].*$/, "")
    .replace(/^boda\s+(?:de\s+)?/i, "")
    .trim();
  const parts = clean
    .split(/\s*(?:&|\by\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length === 2 ? parts : [];
}

function monogramOf(names) {
  const initials = names
    .map((name) => String(name || "").trim().charAt(0).toUpperCase())
    .filter(Boolean);
  return initials.length ? initials.join("&") : "M&J";
}

function SectionPanel({ children, framed = false }) {
  return (
    <section className="mjv3-coverpage-section">
      <div className="mjv3-coverpage-panel algodon">
        {framed ? <NazariFrame /> : null}
        <div className="mjv3-coverpage-panel-inner">{children}</div>
      </div>
    </section>
  );
}

function InvitationAccess() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const token = extractInvitationToken(value);
    if (!token) {
      setError(
        "No reconocimos el enlace. Pega el enlace completo que recibiste por WhatsApp o el código de tu invitación."
      );
      inputRef.current?.focus();
      return;
    }
    setError("");
    navigate(`/invitacion/${encodeURIComponent(token)}`);
  };

  return (
    <section className="mjv3-coverpage-section" id="tu-invitacion">
      <div className="mjv3-coverpage-access">
        <div className="mjv3-coverpage-access-grid">
          <div>
            <p className="mjv3-coverpage-access-kicker">Acceso personal</p>
            <h2 className="mjv3-coverpage-access-title">Tu invitación</h2>
            <p className="mjv3-coverpage-access-copy">{INVITATION_HELP}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mjv3-coverpage-access-form"
          >
            <p className="mjv3-field-label" style={{ color: "#6B6660" }}>
              Abrir invitación
            </p>
            <label
              htmlFor="cover-invite"
              className="mjv3-coverpage-access-title"
              style={{
                display: "block",
                fontSize: 28,
                marginTop: 10,
                color: "#1C1B19",
              }}
            >
              Pega tu enlace o código
            </label>
            <p
              id="cover-invite-help"
              className="mjv3-form-note"
              style={{ marginTop: 8, marginBottom: 14 }}
            >
              Puedes pegar el enlace completo o solo la última parte que aparece
              después de <span style={{ whiteSpace: "nowrap" }}>/invitacion/</span>.
            </p>
            <input
              id="cover-invite"
              ref={inputRef}
              type="text"
              name="invitation"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                if (error) setError("");
              }}
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={error ? "true" : undefined}
              aria-describedby={
                error ? "cover-invite-help cover-invite-error" : "cover-invite-help"
              }
              placeholder="Enlace o código de invitación"
              className="mjv3-field"
            />
            {error ? (
              <p
                id="cover-invite-error"
                role="alert"
                className="mjv3-error"
                style={{ marginTop: 10 }}
              >
                {error}
              </p>
            ) : null}
            <Button type="submit" style={{ marginTop: 14 }}>
              Abrir mi invitación
            </Button>
            <p className="mjv3-form-note">
              Aquí no se confirma asistencia: la confirmación se realiza dentro
              de tu invitación personal. No compartas tu enlace.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

function CoverStatus({ children }) {
  return (
    <div
      className="mjv3"
      data-invitation-theme="boda_jorge_macarena"
      style={{ minHeight: "100svh", background: "#2C2E32" }}
    >
      <div className="mjv3-coverpage-status">
        <div className="mjv3-coverpage-status-card algodon">{children}</div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <CoverStatus>
      <div
        className="mjv3-monogram"
        style={{ margin: "0 auto 10px", width: 96, height: 96 }}
        aria-hidden="true"
      >
        <div className="mjv3-monogram-outer" />
        <div className="mjv3-monogram-inner" style={{ fontSize: 32 }}>
          M<span style={{ fontSize: 20 }}>&amp;</span>J
        </div>
      </div>
      <div className="mj-label mj-label--md">Preparando la portada…</div>
    </CoverStatus>
  );
}

function ErrorState({ onRetry }) {
  return (
    <CoverStatus>
      <h1 className="mjv3-coverpage-access-title" style={{ color: "#585C62" }}>
        No pudimos cargar la portada
      </h1>
      <p className="mj-copy" style={{ marginTop: 12 }}>
        Revisa tu conexión e inténtalo de nuevo. Si llegaste desde un enlace de
        invitación, ábrelo tal como lo recibiste.
      </p>
      <Button type="button" onClick={onRetry} style={{ marginTop: 22 }}>
        Volver a intentar
      </Button>
    </CoverStatus>
  );
}

export default function MacarenaJorgeCover() {
  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const rootRef = useRef(null);
  useV3Reveal(rootRef, status);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    api.public
      .event()
      .then((payload) => {
        if (!alive) return;
        if (!payload || !payload.event) {
          throw new Error("La respuesta pública no incluye el evento.");
        }
        setData(payload);
        setStatus("ready");
      })
      .catch(() => {
        if (!alive) return;
        setData(null);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const event = data?.event || null;
  const cfg =
    event?.invitation && typeof event.invitation === "object"
      ? event.invitation
      : {};

  const coupleNames = displayNames(cfg);
  const parsedNames = parseEventNames(event?.name);
  const names =
    coupleNames.length > 0
      ? coupleNames
      : parsedNames.length > 0
        ? parsedNames
        : FALLBACK_NAMES;
  const pageName = names.join(" & ");

  useDocumentTitle(`${pageName} · Nuestra boda`);
  useSmoothCoverScroll();

  if (status === "loading") return <LoadingState />;
  if (status === "error" || !event) {
    return <ErrorState onRetry={() => setAttempt((value) => value + 1)} />;
  }

  const dateParts = parseEventDate(event.date);
  const dateLine = longDateLine(dateParts);
  const monthYear = monthYearLine(dateParts);
  const time = prettyTime(event.time);
  const place = String(event.place || "").trim() || "Granada, España";

  const locations = (Array.isArray(cfg.locations) ? cfg.locations : []).filter(
    (item) =>
      item && (String(item.label || "").trim() || String(item.place || "").trim())
  );

  const showTrip = !!cfg.trip?.enabled;
  const showStay = !!cfg.stay?.enabled;
  const hideBrand = isCustomDomainActive(data?.public_config?.custom_domain);

  return (
    <div
      ref={rootRef}
      className="mjv3 mjv3-coverpage"
      data-invitation-theme="boda_jorge_macarena"
    >
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:bg-[#1C1B19] focus:px-4 focus:py-3 focus:text-sm focus:text-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#FAF7F2] focus:ring-offset-2 focus:ring-offset-[#1C1B19]"
      >
        Saltar al contenido
      </a>

      <div className="mjv3-coverpage-paper">
        <header className="mjv3-coverpage-header">
          <div className="mjv3-coverpage-brand">
            <span className="mjv3-coverpage-monogram" aria-hidden="true">
              {monogramOf(names)}
            </span>
            <div>
              <p className="mjv3-coverpage-brand-label">Nuestra boda</p>
              <p className="mjv3-coverpage-brand-name">{pageName}</p>
            </div>
          </div>
          <a href="#tu-invitacion" className="mjv3-coverpage-toplink">
            Mi invitación
          </a>
        </header>

        <main id="contenido">
          <section
            className="mjv3-coverpage-section mjv3-paper mjv3-paper--cover algodon"
            style={{ minHeight: "auto", marginTop: 24 }}
          >
            <NazariFrame cover />
            <CoverSection event={event} cfg={cfg} drawing={V3.portada} />
          </section>

          <SectionPanel framed>
            <StorySection cfg={cfg} />
          </SectionPanel>

          {locations.length > 0 && (
            <SectionPanel framed>
              <div className="mjv3-coverpage-heading" style={{ marginBottom: 32 }}>
                <span className="mjv3-coverpage-index">01</span>
                <span className="mjv3-coverpage-rule" />
                <span className="mj-label mj-label--lg">El gran día</span>
                <span className="mjv3-coverpage-rule" />
              </div>
              <div style={{ display: "grid", gap: 56 }}>
                {locations.map((item, index) => (
                  <LocationSection
                    key={`${item.label || "location"}-${index}`}
                    item={item}
                    index={index}
                    event={event}
                    themeLabels={THEME.labels}
                  />
                ))}
              </div>
            </SectionPanel>
          )}

          <SectionPanel framed>
            <DressCodeSection cfg={cfg} />
          </SectionPanel>

          {showTrip && (
            <SectionPanel framed>
              <TravelSection cfg={cfg} />
            </SectionPanel>
          )}

          {showStay && (
            <SectionPanel framed>
              <StaySection cfg={cfg} />
            </SectionPanel>
          )}

          <InvitationAccess />
        </main>
      </div>

      <section
        className="mjv3-paper mjv3-paper--cover mjv3-coverpage-closing algodon"
        style={{ minHeight: "auto" }}
      >
        <NazariFrame cover />
        <ClosingSection event={event} cfg={cfg} hideBrand={hideBrand} />
      </section>

      <div className="mjv3-grain" aria-hidden="true" />
      <span className="sr-only">
        {[dateLine, time ? `${time} h` : "", place, monthYear]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </div>
  );
}
