# MEMORIA — DisplayEvent

> **Propósito:** Memoria persistente del proyecto. Fuente única de contexto para que cualquier agente o persona pueda retomar el trabajo sin re-descubrir el estado, las decisiones y los pendientes.
>
> **Última actualización:** 2026-09-04
> **Repositorio:** `D:\Proyectos\DisplayEvent` (monorepo `client/` + `server/`, git)
>
> ⚠️ Este archivo **no contiene secretos**. Los valores reales viven en `server/.env` (git-ignored). Usa siempre nombres de variable, nunca valores.

---

## 1. Resumen del proyecto

**DisplayEvent** es un organizador de eventos web. Permite:

- Crear eventos y administrar invitados por **grupos** (con líder), con marcado de niños y registro de asistencia.
- Organizar **mesas** con drag & drop (dnd-kit), colores por grupo, acompañantes en bloque y validación de capacidad en servidor.
- Generar **invitaciones digitales multiformato**: cada grupo recibe un enlace público por token (`/invitacion/<token>`) que muestra una invitación sin requerir sesión.
- **Panel admin** (protegido con JWT en cookie httpOnly + verificación de correo) y **landing pública** por token.
- Editor de invitación dirigido por schema, con vista previa y plantillas reutilizables por usuario.
- **Mesa de Regalos reutilizable** por invitación: regalos monetarios por **depósito bancario** o **pago con tarjeta vía Stripe** (modo test por ahora).

---

## 2. Stack

| Capa | Tecnología |
| ---- | ---------- |
| Frontend | React 18 + Vite 5 + Tailwind CSS 4 (`@tailwindcss/vite`) + `motion/react` (antes `framer-motion`) |
| 3D (inactivo) | `@react-three/fiber`, `@react-three/drei`, `three` (dependencias presentes, escenas retiradas) |
| Backend | Node.js + Express 4 (`type: module`) |
| BD | PostgreSQL vía `pg` 8 |
| Validación | `zod` 4 |
| Despliegue | **Railway** (antes Render) |
| BD en la nube | **Supabase** (PostgreSQL) |
| Correo | **Brevo** (API HTTPS; alternativa SMTP local) |
| Imágenes | **Cloudinary** (opcional) o guardado local en `server/uploads/` |
| Pagos | **Stripe** (`stripe` 22.x en server, `@stripe/stripe-js` 5.x en client; modo test por ahora) |

---

## 3. Arquitectura del módulo de invitaciones (`client/src/invitation/`)

```
client/src/invitation/
├── themes/            # Temas = DATOS (no JSX de layout). Registro + lazy loading.
│   ├── index.js       # registry, getTheme(), getThemeLayout(), DEFAULT_THEME_ID
│   ├── xv.js / boda.js / cumpleanos.js / baby_shower.js
│   ├── alice_xv.js
│   └── boda_jorge_macarena.js
├── shared/            # Secciones compartidas (UNA sola copia, antes 4×)
│   ├── Message.jsx, Gallery.jsx, DressCode.jsx, Countdown.jsx,
│   │   Itinerary.jsx, Locations.jsx, RegistryNote.jsx, Padrinos.jsx,
│   │   Rsvp.jsx, Footer.jsx, Gifts.jsx,
│   │   util.jsx (helpers: safeCssUrl, Ornament, loaders…)
├── schema/            # Contrato de campos (espejo del backend)
│   ├── fields.js      # COMMON_FIELDS, EXTRA_FIELDS, getField/setField (dot-path)
│   └── normalize.js   # normalizeInvitation, toFormState, serializeForm
├── layouts/<formato>/ # Un Layout + Hero por formato
│   ├── xv/            # XvLayout.jsx, Hero.jsx, GlassCountdown.jsx
│   ├── boda/          # BodaLayout.jsx, Hero.jsx
│   ├── cumpleanos/    # CumpleanosLayout.jsx, Hero.jsx
│   ├── baby_shower/   # BabyShowerLayout.jsx, Hero.jsx
│   ├── alice_xv/      # AliceXvLayout.jsx, Hero.jsx, Countdown.jsx
│   └── boda_jorge_macarena/  # BodaJorgeMacarenaLayout.jsx, Hero.jsx
├── 3d/                # Escenas WebGL RETIRADAS (inertes; re-agregar a pedido)
│   └── XvPearlsHero3D/Scene, RingsHero3D/Scene (perlas XV, anillos boda)
├── envelope/          # EnvelopeLoader.jsx — sobre digital de apertura
├── InvitationView.jsx # Orquestación: elige tema + layout + envelope
├── InvitationPage.jsx # Landing pública (fetch por token + render InvitationView)
└── motion.jsx         # Re-exports de animación (motion/react)
```

**Modelo de tema (clave):** cada tema en `themes/<id>.js` define:

- `vars` — CSS variables `--inv-*` (paleta, fuentes, sombras, gradientes).
- `labels` — textos y funciones de texto (`heroInvite`, `parentsLine`, `defaultMessage`, …).
- `resolvers` — funciones que derivan valores (ej. `signature`).
- `opening` — experiencia del sobre (`envelope: true`, `cardText`, `sealText`).

`getThemeLayout()` hace `lazy(() => import(...))` para que el bundle del editor/admin **no** arrastre las secciones públicas.

### Mesa de Regalos (archivos nuevos)

- **Frontend** `client/src/invitation/shared/Gifts.jsx`: sección pública reutilizable (render condicional si `registry.enabled`). Detecta moneda (`navigator.language` + `timeZone` → `mxn`/`eur`) con selector manual MXN|EUR, chips de montos sugeridos + monto libre, depósito bancario con botones "copiar" y pago vía `@stripe/stripe-js` (`loadStripe(publishableKey)` + `redirectToCheckout`). Maneja `?payment=success|cancelled` al volver de Stripe.
- **Propagación de clave pública:** `InvitationPage` lee `public_config.stripe_publishable_key` del GET y la propaga (nunca hardcodeada) por `InvitationView` → layouts → `<Gifts>`.
- **Editor** `client/src/pages/event/EventInvitation.jsx`: sección "Mesa de Regalos" con `AmountListEditor` (mínimo/sugeridos/cuenta/stripe).
- **Backend** `server/src/utils/stripe.js`: cliente **lazy** `getStripe()` (null si no hay `STRIPE_SECRET_KEY`), `stripePublishableKey()` (defensa en profundidad: solo expone claves `pk_`, omite `sk_`/`rk_`), `stripeWebhookSecret()`, `verifyStripeWebhook()` (`Stripe.webhooks.constructEvent`), `apiVersion: "2024-06-20"`.
- **Backend** `server/src/routes/invitations.js`: `GET /:token` ahora expone `public_config.stripe_publishable_key`; nuevo `POST /:token/payment` (rate-limit 30/15min) que valida `registry.enabled`/`stripe_enabled`, moneda (`mxn`|`eur`), entero ≥0, mínimo (2000/100), sugeridos si `allow_custom===false` y tope `MAX_AMOUNT=999_999`; crea Checkout Session (`mode:"payment"`) y devuelve `{ session_id }`. Responde `503` si no hay clave Stripe.
- **Backend** `server/src/routes/webhooks.js`: `POST /api/webhooks/stripe` con `express.raw`, montado **antes** de CORS/JSON/CSRF; verifica firma con `STRIPE_WEBHOOK_SECRET` y en `checkout.session.completed` inserta en `gifts` con `ON CONFLICT DO NOTHING` (idempotente).
- `<Gifts>` añadido a los 6 layouts (`xv`, `boda`, `cumpleanos`, `baby_shower`, `alice_xv`, `boda_jorge_macarena`).

---

## 4. Contrato de datos de invitación (`server/src/schemas/invitation.js`)

- Validación con **zod**, `version: 2`.
- `TEMPLATES = ["xv", "boda", "cumpleanos", "baby_shower", "alice_xv", "boda_jorge_macarena"]`.
- API pública: `normalizeInvitation(raw)`, `parseInvitation(raw)` (lanza error para 400), `normalizeForRead(raw)` (GET, garantiza arrays, nunca lanza).
- Esquema: `z.discriminatedUnion("template", [...])` con campos **comunes** + **específicos** por template. Descarta claves desconocidas y normaliza formas legacy.

**Campos comunes:** `hero_image`, `kicker`, `tagline`, `message`, `celebrants`, `itinerary[{label,time}]`, `locations[{label,place,url}]`, `gallery[string]`, `dress_code[{label,icon?}]`, `dress_note`, `contacts[{name,phone}]`, `contact_note`, `registry{...}`.

**Campos específicos:**

| Template | Extra |
| -------- | ----- |
| `xv` | `celebrant_name`, `parents[]`, `padrinos[]`, `registry_note` |
| `boda` | `couple{nameA,nameB}`, `registry_note` |
| `cumpleanos` | `age`, `theme_name` |
| `baby_shower` | `parents[]`, `gender`, `registry_note` |
| `alice_xv` | `celebrant_name`, `parents[]`, `padrinos[]`, `registry_note` |
| `boda_jorge_macarena` | `couple{nameA,nameB}`, `registry_note` |

**Mesa de regalos (`registry`)** — campo común, presente en todos los templates:
- `enabled:false`, `allow_custom:true`, `stripe_enabled:false`.
- Mínimos: `min_mxn:2000`, `min_eur:100`.
- Sugeridos: `suggested_mxn:[2000,4000,5000,6000,7000,8000,9000,10000,12000,15000,20000,25000,30000]`, `suggested_eur:[100,200,250,300,350,400,450,500,600,750,1000,1250,1500]`.
- `bank:{enabled:false,bank_name:"",holder:"",account_number:"",concept:""}`.
- Helpers de normalización: `toBool`, `toNonNegInt`, `toIntArray`, `normalizeBank`, `normalizeRegistry`; schemas `bankSchema` / `registrySchema` (integrados en `commonFields`, `normalizeInvitation`, `parseInvitation`, `normalizeForRead`).

**Normalizaciones legacy** (idempotentes, nunca lanzan): `dress_code` string/array → `[{label}]`; itinerario con `place` → deriva `locations`; `parents`/`padrinos` objetos → `[string]`; `template` ausente/desconocido → `"xv"`.

> El frontend **espeja** este contrato en `client/src/invitation/schema/` (`fields.js` + `normalize.js`), que es su fuente única de verdad. El editor ya no serializa a mano.

---

## 5. Reestructuración completada (Fases 0–4) — ya commiteada

| Fase | Qué se hizo |
| ---- | ----------- |
| **0** | Contrato de datos formal (zod) + normalización + validación + backfill `backfill-invitation-v2`. |
| **1** | Deduplicación de secciones → `shared/` (antes copiadas 4×). |
| **2** | `theme.labels` consumidos + eliminación de código muerto (`fonts`, `ornaments`). |
| **3** | Editor de invitación dirigido por schema (`EventInvitation.jsx` + `schema/`). |
| **4** | Endurecimiento: XSS `hero_image` vía `safeCssUrl`, sobre operable por teclado, fallback de Locations, countdown sin NaN, RSVP sincronizado, `key={i}` en listas. |

Se **retiraron los ornamentos 3D** (perlas XV, anillos boda) — quedan inertes en `3d/`.

---

## 6. Formatos de invitación

**Genéricos:** `xv`, `boda`, `cumpleanos`, `baby_shower`.

**`alice_xv` — XV de "Alice Renata" (pedido especial):**
- Paleta **lavanda + dorado** (+ blanco perla).
- **Monograma "AR" en oro** con iniciales dinámicas derivadas de `celebrant_name`.
- Nombre serif (**Cormorant Garamond**) + script (**Dancing Script**).
- Texto "Te Invitamos a Mis XV Años" (`labels.heroInvite`).
- Fecha larga.
- **Contador premium "QUEDAN:"** con 4 cajas doradas (`alice_xv/Countdown.jsx`, reutiliza `useCountdown` de `shared/`).
- Hero con `hero_image` opcional (con overlay de legibilidad) + arte botánico dorado + textura de papel.

**`boda_jorge_macarena` — Boda de "Jorge & Macarena" (pedido especial):**
- Actualmente en su **BASE**: azul noche + dorado + marfil (fuentes Playfair Display + Great Vibes).
- ⏳ **Pendiente de indicaciones de diseño** del usuario.

---

## 7. Despliegue y BD (gotchas importantes)

### Conexión a Supabase en Railway
- Railway **no tiene salida IPv6**; la conexión DIRECTA (`db.<ref>.supabase.co`) resuelve a IPv6 y falla con `ENETUNREACH`.
- ✅ **Usar el POOLER de Supabase**:
  - **Session pooler** (puerto **5432**): recomendado para `pg`.
  - Transaction pooler (puerto **6543**): puede dar errores de *prepared statements*.
- `server/src/db/index.js` ya mitiga esto con `dns.setDefaultResultOrder("ipv4first")` + `ipv4ConnectionString()` (resuelve host a IPv4 literal). Aun así, el pooler es la solución robusta.

### Variables de entorno (Railway)
`DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL` (debe ser la URL pública de Railway), `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, (`CLOUDINARY_*` opcionales), (`ALLOWED_ORIGINS` opcional), **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` (opcionales; sin `STRIPE_SECRET_KEY` los pagos degradan a 503). `PORT` lo inyecta Railway (default 4000 local).

### BD / esquema
- `server/.env` está **git-ignored** (contiene secretos). Usa `.env.example` como plantilla.
- Crear tablas: `cd server && npm run init-db` (idempotente).
- Backfill v2: `npm run backfill-invitation-v2`.
- **Tabla `gifts`** (regalos confirmados vía Stripe): `event_id`, `group_id`, `amount_minor` (BIGINT), `currency`, `status`, `stripe_payment_intent_id`, `created_at`. Índice único `idx_gifts_payment_intent` para idempotencia del webhook. ⚠️ **Re-ejecutar `npm run init-db`** para aplicar el índice único (el agente de BD lo corrió antes de que SecDevOps añadiera el índice).

### CORS
`server/src/index.js` rechaza orígenes no permitidos → **403 "Origen no permitido por CORS"**, según `CLIENT_URL` / `ALLOWED_ORIGINS`. Configura `CLIENT_URL` con la URL pública real o el frontend quedará bloqueado.

---

## 8. Decisiones / pendientes

- [ ] **Re-agregar 3D** (perlas XV, anillos boda) cuando el usuario lo indique. Escenas inertes en `client/src/invitation/3d/`.
- [ ] **Stripe en modo test** (pendiente de pasar a producción): crear las claves de prueba (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`) y ponerlas en `server/.env`. Hoy, sin claves, el código degrada con gracia (pago responde 503). Paso test→prod documentado en `server/.env.example`.
- [ ] **Re-ejecutar `npm run init-db`** para aplicar el índice único `idx_gifts_payment_intent` (el agente de BD lo corrió antes de que SecDevOps añadiera el índice).
- [ ] **Definir el diseño de `boda_jorge_macarena`** (hoy solo base azul noche + dorado + marfil).
- [ ] *(Opcional)* Robustez `.env`: `server/src/db/index.js` usa `dotenv.config()` relativo al CWD (mientras `index.js` ya usa ruta absoluta). Convendría cargar `server/.env` con ruta absoluta también en `db/index.js`.
- [ ] *(Opcional)* Aplicar soporte de `hero_image` a los formatos genéricos `xv` y `boda` (hoy solo lo soportan `cumpleanos`, `baby_shower` y `alice_xv`).

---

## 9. Convención de delegación de agentes (para el orquestador)

| Tarea | Agente |
| ----- | ------ |
| Documentación / conocimiento / memoria | `memoria` |
| Base de datos | `bd` |
| Backend | `backend` |
| Frontend | `frontend` |
| Seguridad / DevOps | `secdevops` |
| Análisis | `analizador` |

---

## 10. Estado actual del working tree (SIN commitear)

Cambios pendientes (verificados con `git status`):

| Archivo | Cambio |
| ------- | ------ |
| `client/index.html` | Fuentes **Cormorant Garamond** + **Dancing Script** añadidas. |
| `client/src/index.css` | Clases `.monogram-gold`, `.paper-grain`. |
| `client/src/invitation/alice_xv/Hero.jsx` | Soporte de `hero_image` (vía `safeCssUrl`) + overlay de legibilidad. |
| `client/src/invitation/themes/alice_xv.js` | Paleta/fuentes + `heroInvite`. |
| `client/src/invitation/alice_xv/Countdown.jsx` | **Nuevo**: contador premium "QUEDAN:" (4 cajas doradas). |

---

## 11. Referencias y documentación del repo

- `README.md` — guía general (setup, scripts, API completa).
- `AUDITORIA.md` — auditoría de bugs del panel y su estado (resueltos/abiertos).
- `PLAN_INVITACIONES_MULTIFORMATO.md` — plan de la reestructuración multiformato.
- `FORMATO LISTA DE INVITADOS 2026.xlsx` — archivo de cliente (git-ignored por patrón `*.xlsx`).
- `render.yaml` — definición legacy de Render (despliegue anterior).

### Historial reciente relevante (git)
- `707d79f` Invitación: formatos especiales `alice_xv` y `boda_jorge_macarena`.
- `ce94101` Docs: README/PLAN/AUDITORIA (PostgreSQL/Supabase + post-reestructuración).
- `9387c15` Invitación: secciones unificadas en `shared/`, temas como datos, editor schema-driven, retiro de 3D.
- `b56f86d` Invitación: contrato formal (zod) + normalización + backfill v2.
