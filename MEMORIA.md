# MEMORIA — DisplayEvent

> **Propósito:** Memoria persistente del proyecto. Fuente única de contexto para que cualquier agente o persona pueda retomar el trabajo sin re-descubrir el estado, las decisiones y los pendientes.
>
> **Última actualización:** 2026-09-11
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

La carpeta es **plana por formato**: cada plantilla vive en su propio directorio (`xv/`, `boda/`, `alice_xv/`, …), **no** dentro de un `layouts/<formato>/`.

```
client/src/invitation/
├── themes/            # Temas = DATOS (no JSX de layout). Registro + lazy loading.
│   ├── index.js       # registry, getTheme(), getThemeLayout(), DEFAULT_THEME_ID
│   ├── xv.js / boda.js / cumpleanos.js / baby_shower.js
│   ├── alice_xv.js
│   └── boda_jorge_macarena.js
├── shared/            # Secciones/utilidades de los formatos GENÉRICOS
│   ├── Message.jsx, Gallery.jsx, DressCode.jsx, Countdown.jsx (exporta
│   │   `useCountdown`), Itinerary.jsx, Locations.jsx, RegistryNote.jsx,
│   │   Padrinos.jsx, Footer.jsx, Gifts.jsx,
│   │   Rsvp.jsx      # única sección compartida por las plantillas ESPECIALES
│   └── util.jsx       # helpers: safeCssUrl, Ornament, escapeRegExp, loaders…
├── schema/            # Contrato de campos (espejo del backend)
│   ├── fields.js      # COMMON_FIELDS, EXTRA_FIELDS, getField/setField (dot-path)
│   └── normalize.js   # normalizeInvitation, toFormState, serializeForm
├── xv/                # XvLayout.jsx, Hero.jsx, GlassCountdown.jsx
├── boda/              # BodaLayout.jsx, Hero.jsx
├── cumpleanos/        # CumpleanosLayout.jsx, Hero.jsx
├── baby_shower/       # BabyShowerLayout.jsx, Hero.jsx
├── alice_xv/          # Plantilla ESPECIAL: componentes LOCALES propios
│   ├── AliceXvLayout.jsx, decor.jsx (kit de ornamentos), SectionNav.jsx
│   ├── Hero.jsx, Countdown.jsx, Message.jsx, Itinerary.jsx, Locations.jsx,
│   │   Gallery.jsx, DressCode.jsx, RegistryNote.jsx, Gifts.jsx,
│   │   Padrinos.jsx, Footer.jsx
│   └── (solo usa shared/Rsvp.jsx como sección compartida)
├── boda_jorge_macarena/  # Plantilla ESPECIAL: componentes LOCALES propios
│   ├── BodaJorgeMacarenaLayout.jsx, decor.jsx (kit de ornamentos), SectionNav.jsx
│   ├── Hero.jsx, Countdown.jsx, Message.jsx, Itinerary.jsx, Locations.jsx,
│   │   Gallery.jsx, DressCode.jsx, RegistryNote.jsx, Gifts.jsx, Footer.jsx
│   ├── SectionPhoto.jsx  # fondo de UNA foto B&N por sección (solo boda)
│   └── (solo usa shared/Rsvp.jsx como sección compartida)
├── 3d/                # Escenas WebGL RETIRADAS (inertes; re-agregar a pedido)
│   └── RingsHero3D.jsx, RingsScene.jsx, XvPearlsHero3D.jsx, XvPearlsScene.jsx
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

### 3.1 Plantillas "especiales" con componentes propios

Las dos plantillas de encargo (`alice_xv`, `boda_jorge_macarena`) **dejaron de usar `shared/*` como secciones**: cada una tiene copias locales de `decor.jsx` (kit de ornamentos), `Hero.jsx`, `Countdown.jsx`, `Message.jsx`, `Itinerary.jsx`, `Locations.jsx`, `Gallery.jsx`, `DressCode.jsx`, `RegistryNote.jsx`, `Gifts.jsx`, `Footer.jsx` y `SectionNav.jsx`. `alice_xv` incluye además `Padrinos.jsx`, y `boda_jorge_macarena` incluye además `SectionPhoto.jsx` (fondos de foto B&N por sección). **`alice_xv` NO tiene `SectionPhoto.jsx` ni fondos de foto** (decisión del usuario).

- `decor.jsx` (ambas) exporta el kit de ornamentos: `BotanicalCorner`, `BotanicalDivider`, `Flourish`, `WeddingSectionTitle`, `GoldFrame`.
- La **única** sección compartida que consumen es `shared/Rsvp.jsx` (más utilidades sueltas: `shared/util.jsx` → `safeCssUrl`/`escapeRegExp`; `shared/Countdown.jsx` → `useCountdown`).
- Los formatos genéricos (`xv`, `boda`, `cumpleanos`, `baby_shower`) siguen usando las secciones de `shared/`.

### 3.2 Efectos y comportamiento del layout

Implementados en `boda_jorge_macarena/` y **replicados en `alice_xv/`** (commit `46f7628`):

- **Tarjetas apiladas** (`StackCard` en cada `*Layout.jsx`): cada sección se envuelve en una tarjeta con **fondo opaco** (`bg-inv-bg`/`-alt`/`-alt2`), **z-index creciente**, esquinas superiores redondeadas (`rounded-t-[1.6rem]`), sombra ascendente y `CardEdge` (hairline + rombo). El fondo y (si aplica) la foto viven en **capas `absolute` propias dentro del wrapper**, de modo que el `StackCard` **no** gana `backdrop-filter` y no se convierte en contenedor de posicionamiento para descendientes `fixed` (el modal de datos bancarios de Gifts sigue anclado al viewport). Los `z`: Hero (z-0), Carta/Contador (z-10), Itinerario (z-20), Ubicaciones (z-30), Galería (z-40), Dress Code (z-50), Nota de regalos (z-60), Mesa de Regalos (z-70), Padrinos en `alice_xv` (z-75), RSVP (z-80), Footer (z-90).
- **Solo Hero y Footer quedan `sticky`; el resto pasa a `flow`** (boda: commit `a6447c7`; la paridad de `alice_xv` está **sin commitear**, ver §10): la portada (Hero z-0) sigue `sticky top-0` con `min-h-[100dvh]` —efecto "carta desplegable": el contenido la tapa— y el cierre/Footer (z-90, con `SectionPhoto` en boda) también es sticky. Las secciones con contenido de altura variable pasan a **`flow`** (no sticky) porque `sticky top-0` + `min-h-[100dvh]` recortaba su parte inferior en móvil (sobre todo **Ubicaciones** al añadir los mapas): **Carta/Contador, Itinerario, Ubicaciones, Galería, Dress Code, Nota de regalos, Mesa de regalos y RSVP**; en `alice_xv` también **Padrinos**. Fluyen normal manteniendo el acabado de tarjeta y, al cubrir a la anterior, conservan el efecto de apilado sin quedar clavadas. Resultado: el efecto "carta desplegable" queda **solo para la portada**; ninguna sección se recorta.
- **Mapa embebido en Ubicaciones** (`Locations.jsx` de ambas especiales; boda: commit `d615457`, `alice_xv`: **sin commitear**, ver §10): cada ubicación embebe un **mapa de Google por `<iframe>` sin API key** (`mapSrc(it)` → `https://maps.google.com/maps?q=<encodeURIComponent(place||label)>&z=15&output=embed`, con `loading="lazy"`, `title`, `allowFullScreen` y `referrerPolicy`). **Layout adaptativo al número de ubicaciones**: 1 → tarjeta centrada a ancho completo (`max-w-3xl`); 2 → 2 columnas (`md:grid-cols-2`); 3+ → grid responsive 1/2/3 (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Se conservan los botones Google Maps/Waze (URLs seguras) y el `null` si no hay ubicaciones. El endpoint es un embed público no oficial de Google; con URLs custom el embed se centra por `place`/`label`.
- **Navegación lateral** (`SectionNav.jsx`): dots a la izquierda con scrollspy + tooltip; botón de confirmaciones (sobre) a la derecha que se convierte en "volver arriba" cuando la sección activa es el RSVP. Para saltar una tarjeta sticky **clavada** usa `flowTop()` (suma de alturas de hermanos en flujo) porque `offsetTop` de un sticky clavado devuelve la posición visual, no la de flujo (**bug corregido**). `flowTop()` **ignora hermanos fuera de flujo** (`position: fixed`/`absolute`) al sumar alturas. Escucha `scroll` en fase de captura y respeta `prefers-reduced-motion`.
- **Portada sticky + parallax** (`Hero.jsx`): `h-dvh`, `useScroll({ target, offset: ["start start", "end start"] })`; al ser tapada, el fondo hace parallax y el contenido hace fade/scale (`contentOpacity`, `contentScale`).
- **Parallax** en Galería, Mensaje y Footer (`useScroll()` global, porque `useScroll({ target })` no refleja bien el pinning de las tarjetas sticky).
- **Swipe en la Galería**: arrastre horizontal (`drag="x"` con umbral) y **wrap-around** entre fotos.
- **Mesa de regalos local** (`boda_jorge_macarena/Gifts.jsx`, replicada en `alice_xv/Gifts.jsx`): replica la lógica de `shared/Gifts.jsx` pero con **dropdowns nativos** de moneda/monto (opción "Monto libre"), **pago con tarjeta como CTA principal** y **depósito en modal** accesible (`BankModal`).
- **Fondos de foto por sección — SOLO en `boda_jorge_macarena`** (`SectionPhoto.jsx`, commit `8878c88`): **UNA** foto de `cfg.gallery` **full-bleed** como fondo de la tarjeta, en **blanco y negro** (`grayscale`) + un **scrim** de degradado del `--inv-bg` (~94% en bordes / ~80% al centro) para legibilidad. `null` si no hay foto → cae a fondo sólido. `StackCard` acepta la prop `photo` (URL); `PHOTO_SECTIONS = ["itinerario","ubicaciones","dresscode","cierre"]` y el helper `photoFor(id)` reparte `gallery[i % gallery.length]`. Sustituye al antiguo `PhotoBackdrop.jsx` (fotos dispersas), **eliminado** en el mismo commit. ⚠️ **`alice_xv` NO tiene fondos de foto** (decisión del usuario): no existe `SectionPhoto.jsx` ni la prop `photo` allí.

### 3.3 Mesa de Regalos (archivos)

- **Frontend genérico** `client/src/invitation/shared/Gifts.jsx`: sección pública reutilizable (render condicional si `registry.enabled`). Detecta moneda (`navigator.language` + `timeZone` → `mxn`/`eur`) con selector manual MXN|EUR, chips de montos sugeridos + monto libre, depósito bancario con botones "copiar" y pago vía `@stripe/stripe-js` (`loadStripe(publishableKey)` + `redirectToCheckout`). Maneja `?payment=success|cancelled` al volver de Stripe.
- **Frontend especial** `client/src/invitation/boda_jorge_macarena/Gifts.jsx` y `client/src/invitation/alice_xv/Gifts.jsx`: versiones locales con dropdowns/CTA/modal (ver 3.2).
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

**Campos comunes:** `hero_image`, `kicker`, `tagline`, `message`, `celebrants`, `itinerary[{label,time}]`, `locations[{label,place,url}]`, `gallery[string]`, `dress_code[{label,icon?}]`, `dress_note`, `contacts[{name,phone}]`, `contact_note`, `registry{...}`, `rsvp_editable`.

**Campos específicos:**

| Template | Extra |
| -------- | ----- |
| `xv` | `celebrant_name`, `parents[]`, `padrinos[]`, `registry_note` |
| `boda` | `couple{nameA,nameB}`, `registry_note` |
| `cumpleanos` | `age`, `theme_name` |
| `baby_shower` | `parents[]`, `gender`, `registry_note` |
| `alice_xv` | `celebrant_name`, `parents[]`, `padrinos[]`, `registry_note` |
| `boda_jorge_macarena` | `couple{nameA,nameB}`, `registry_note` |

**RSVP editable (`rsvp_editable`)** — campo común, **nuevo** (booleano, default `false`):
- Se normaliza con `toBool(..., false)` en `commonFields` + `normalizeInvitation` del backend y su espejo en `client/src/invitation/schema/normalize.js` (`normalizeInvitation` + `toFormState`).
- Semántica: `false` = **bloqueado** tras confirmar (default); `true` = **editable siempre**.
- Editor: checkbox "Permitir que los invitados editen su confirmación" en la sección **"Confirmación de asistencia"** (`EventInvitation.jsx`).
- RSVP público (`shared/Rsvp.jsx`): si `cfg.rsvp_editable`, el formulario queda **editable/reutilizable y precargado** (con textos condicionales en el modal y en la confirmación); si no, mantiene el bloqueo actual.

**Mesa de regalos (`registry`)** — campo común, presente en todos los templates:
- `enabled:false`, `allow_custom:true`, `stripe_enabled:false`.
- Mínimos: `min_mxn:2000`, `min_eur:100`.
- Sugeridos: `suggested_mxn:[2000,4000,5000,6000,7000,8000,9000,10000,12000,15000,20000,25000,30000]`, `suggested_eur:[100,200,250,300,350,400,450,500,600,750,1000,1250,1500]`.
- `bank:{enabled:false,bank_name:"",holder:"",account_number:"",concept:""}`.
- Helpers de normalización: `toBool`, `toNonNegInt`, `toIntArray`, `normalizeBank`, `normalizeRegistry`; schemas `bankSchema` / `registrySchema` (integrados en `commonFields`, `normalizeInvitation`, `parseInvitation`, `normalizeForRead`).

**Normalizaciones legacy** (idempotentes, nunca lanzan): `dress_code` string/array → `[{label}]`; itinerario con `place` → deriva `locations`; `parents`/`padrinos` objetos → `[string]`; `template` ausente/desconocido → `"xv"`.

> El frontend **espeja** este contrato en `client/src/invitation/schema/` (`fields.js` + `normalize.js`), que es su fuente única de verdad. El editor ya no serializa a mano.

### 4.1 Dashboard y grupos (declined)

- `server/src/routes/events.js` `GET /:id/stats`: añade `declined_count` y redefine `unregistered_count` = **pendientes** (ni confirmados ni declinados). Partición: confirmados + no asistirán + sin responder = total.
- `server/src/routes/groups.js` `GET /`: cada grupo añade `declined_count`.
- `client/src/pages/event/EventDashboard.jsx`: tarjeta **"No asistirán"** (rosa) + chip por grupo; "Sin confirmar" pasó a **"Sin responder"**.

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
- Paleta **rosa pastel + blanco + dorado**: fondo `#FDF1F5`, dorado `#C9A24B`, rosa `#D98AA4`, texto rosa-marrón `#6B4A57`.
- Fuentes **Cormorant Garamond** + **Poppins** + **Dancing Script** + **Lato**.
- **Replicó toda la arquitectura de `boda_jorge_macarena`**: componentes locales propios (`decor.jsx`, `Hero.jsx`, `Countdown.jsx`, `Message.jsx`, `Itinerary.jsx`, `Locations.jsx`, `Gallery.jsx`, `DressCode.jsx`, `RegistryNote.jsx`, `Gifts.jsx`, `Padrinos.jsx`, `Footer.jsx`, `SectionNav.jsx`), portada sticky + parallax, parallax, swipe, etc. Solo comparte `shared/Rsvp.jsx`.
- **Tiene mapa embebido en Ubicaciones** (`Locations.jsx`) y **secciones en `flow`** (solo Hero y Footer sticky), igual que boda. ⚠️ Ese trabajo está **SIN COMMITEAR** (ver §10).
- ⚠️ **NO tiene fondos de foto por sección** (no existe `SectionPhoto.jsx`): decisión explícita del usuario.
- Monograma con inicial dinámica de `celebrant_name`, fecha larga y contador propio.
- ⚠️ **Pendiente:** el `description` de `themes/alice_xv.js` sigue diciendo **"Lavanda y dorado"** (desactualizado tras el cambio a rosa pastel + blanco + dorado).

**`boda_jorge_macarena` — Boda de "Jorge & Macarena" (pedido especial):**
- Paleta **botánica vibrante** inspirada en flora CDMX: marfil `#FDFBF7`, verde `#2C4C3B`, rosa bugambilia `#C2436A`, naranja granada `#E76F51`, amarillo cempasúchil `#E5B15D`.
- Fuentes **Playfair Display** + **Great Vibes** + **Lato**.
- Ornamentos SVG de línea fina (granada, bugambilia, cempasúchil) en `decor.jsx`; sobre de apertura con paleta botánica.
- **Mapa embebido en Ubicaciones** (`Locations.jsx`) y **secciones en `flow`** (solo Hero y Footer sticky).
- **Fondos de foto por sección** (`SectionPhoto.jsx`, solo boda): una foto B&N full-bleed + scrim en Itinerario, Ubicaciones, Dress Code y Cierre. Sustituyó al antiguo `PhotoBackdrop`.
- ✅ Diseño botánico **completado** (ya no es la "base azul noche").
- ⚠️ **Pendiente:** el doc `INVITACION_BODA_JORGE_MACARENA.md` describe el diseño **anterior** (azul noche/dorado).

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

### Estilos públicos de la invitación
- **Scrollbar botánica:** `client/src/invitation/InvitationPage.jsx` añade/elimina la clase `de-invitation` en `<html>`; `client/src/index.css` tiene reglas scoped `html.de-invitation` (thumb verde `#2C4C3B`, hover naranja `#E76F51`). El scrollbar global del admin usa `--tone-*`. (Nota: es verde de la paleta de boda; `alice_xv` la hereda.)
- `client/src/index.css` define además la utility `.envelope-focus:focus-visible` (outline con `--inv-envelope-focus`) y `.drop-cap`.
- **Sobre de apertura** (`envelope/EnvelopeLoader.jsx`): rediseñado; el overlay centra SOLO el sobre (el texto de ayuda es `absolute`), estilo 100% `var(--inv-envelope-*)` con fallbacks, y prop nueva `family` (desde `InvitationView.jsx`) que permite mostrar "Invitación para {familia}" en la carta interior.

---

## 8. Decisiones / pendientes

- [x] ~~Reproducir `PhotoBackdrop` en `alice_xv`~~ → **descartado**: `alice_xv` **no** usa fondos de foto por sección (decisión del usuario). `PhotoBackdrop.jsx` fue **eliminado** (sustituido por `SectionPhoto.jsx`, solo boda).
- [ ] **Actualizar `description` de `themes/alice_xv.js`** ("Lavanda y dorado" → rosa pastel + blanco + dorado).
- [ ] **Actualizar el doc `INVITACION_BODA_JORGE_MACARENA.md`** (describe el diseño anterior azul noche/dorado).
- [x] ~~*(Rendimiento)* Evaluar el coste de `backdrop-blur`~~ → **ya no aplica**: las tarjetas no usan `backdrop-blur` (fondo opaco + foto en capas `absolute`).
- [ ] *(Ajuste estético)* El **scrim del `SectionPhoto` es fuerte** (~94%/80%), así que la foto B&N se ve **sutil**; subir/disminuir opacidades si se quiere más/menos protagonismo (por legibilidad de la tinta verde).
- [ ] **Re-agregar 3D** (perlas XV, anillos boda) cuando el usuario lo indique. Escenas inertes en `client/src/invitation/3d/`.
- [ ] **Stripe en modo test** (pendiente de pasar a producción): crear las claves de prueba (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`) y ponerlas en `server/.env`. Hoy, sin claves, el código degrada con gracia (pago responde 503). Paso test→prod documentado en `server/.env.example`.
- [ ] **Re-ejecutar `npm run init-db`** para aplicar el índice único `idx_gifts_payment_intent` (el agente de BD lo corrió antes de que SecDevOps añadiera el índice).
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

Cambios pendientes (verificados con `git status`, 2026-09-11). Todo pertenece a la **paridad de `alice_xv`** con boda (**mapa en Ubicaciones** + **secciones en `flow`**):

| Archivo | Cambio |
| ------- | ------ |
| `client/src/invitation/alice_xv/Locations.jsx` | Añade `mapSrc(it)` + `<iframe>` (mapa de Google sin API key) y `gridClass` de layout adaptativo al número de ubicaciones. |
| `client/src/invitation/alice_xv/AliceXvLayout.jsx` | Pasa a `flow` Carta/Contador, Itinerario, Ubicaciones, Dress Code, Nota de regalos, Mesa de regalos y Padrinos (Hero y Footer siguen `sticky`). |
| `client/src/invitation/alice_xv/SectionNav.jsx` | `flowTop()` ignora hermanos fuera de flujo (`position: fixed`/`absolute`). |

> `boda_jorge_macarena` **no** tiene cambios sin commitear: `SectionPhoto`, el mapa y el paso a `flow` ya están commiteados (`8878c88`, `d615457`, `a6447c7`).

---

## 11. Referencias y documentación del repo

- `README.md` — guía general (setup, scripts, API completa).
- `AUDITORIA.md` — auditoría de bugs del panel y su estado (resueltos/abiertos).
- `PLAN_INVITACIONES_MULTIFORMATO.md` — plan de la reestructuración multiformato.
- `INVITACION_BODA_JORGE_MACARENA.md` — doc de datos dinámicos de la plantilla (⚠️ describe el diseño anterior azul noche/dorado).
- `FORMATO LISTA DE INVITADOS 2026.xlsx` — archivo de cliente (git-ignored por patrón `*.xlsx`).
- `render.yaml` — definición legacy de Render (despliegue anterior).

### Historial reciente relevante (git)

| Commit | Descripción |
| ------ | ----------- |
| `a6447c7` | Invitación: secciones con contenido variable en `flow` (evita recorte en móvil). |
| `d615457` | Invitación: mapa embebido en Ubicaciones con layout adaptativo. |
| `e6db010` | Editor: corregir eliminación de fotos de la galería (faltaba el índice en el `.map`). |
| `8878c88` | Invitación: fondo de foto B&N por sección (`SectionPhoto`; elimina `PhotoBackdrop`). |
| `6e60836` | RSVP: opción para permitir editar la confirmación. |
| `46f7628` | Invitación: replicar arquitectura de boda en `alice_xv`. |
| `1411acb` | Invitación: navegación lateral, scrollbar botánica y margen del contador. |
| `4a42ab1` | Invitación: efecto parallax en galería, mensaje y footer. |
| `35ed6fd` | Invitación: swipe en la galería para navegar entre fotos. |
| `f2d8405` | Invitación: efecto 'carta desplegable' en todas las secciones. |
| `912130b` | Invitación: portada sticky + contenido que la tapa al scrollear. |
| `1013002` | Invitación: mesa de regalos con dropdowns (moneda y montos). |
| `89ce5b1` | Dashboard: mostrar invitados que no asistirán (declined). |
| `307e1c9` | Invitación: arreglar contador y mensaje de `boda_jorge_macarena`. |
| `b220c97` | Invitación: mesa de regalos propia para `boda_jorge_macarena`. |
| `d872a54` | Invitación: rediseño botánico de `boda_jorge_macarena` + doc de datos. |
| `4b4e53f` | Invitación: rediseñar sobre de apertura (centrado + look por tema). |
| `283f5eb` | Invitación: corregir chips de montos al cambiar moneda (MXN/EUR). |
| `d36671c` | Invitación: mesa de regalos (Stripe + depósito) y formato especial `alice_xv`. |
| `707d79f` | Invitación: añadir formatos especiales `alice_xv` y `boda_jorge_macarena`. |
| `ce94101` | Docs: README/PLAN/AUDITORIA (PostgreSQL/Supabase + post-reestructuración). |
| `9387c15` | Invitación: secciones unificadas en `shared/`, temas como datos, editor schema-driven, retiro de 3D. |
| `b56f86d` | Invitación: contrato formal (zod) + normalización + backfill v2. |
