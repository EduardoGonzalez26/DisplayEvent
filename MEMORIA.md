# MEMORIA — DisplayEvent

> **Propósito:** Memoria persistente del proyecto. Fuente única de contexto para que cualquier agente o persona pueda retomar el trabajo sin re-descubrir el estado, las decisiones y los pendientes.
>
> **Última actualización:** 2026-09-16
> **Repositorio:** `D:\Proyectos\DisplayEvent` (monorepo `client/` + `server/`, git)
>
> ⚠️ Este archivo **no contiene secretos**. Los valores reales viven en `server/.env` (git-ignored). Usa siempre nombres de variable, nunca valores.

---

## 1. Resumen del proyecto

**DisplayEvent** es un organizador de eventos web. Permite:

- Crear eventos y administrar invitados por **grupos** (con líder), con marcado de niños y registro de asistencia.
- Organizar **mesas** con drag & drop (dnd-kit), colores por grupo, acompañantes en bloque y validación de capacidad en servidor.
- Generar **invitaciones digitales multiformato**: cada grupo recibe un enlace público por token (`/invitacion/<slug>/<token>`, con la ruta legacy `/invitacion/<token>` aún soportada) que muestra una invitación sin requerir sesión.
- **Landing pública de marketing** en `/` (`client/src/landing/**`, visible con o sin sesión) y **panel admin** en `/eventos` (protegido con JWT en cookie httpOnly + verificación de correo).
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

- **Tarjetas apiladas** (`StackCard` en cada `*Layout.jsx`): cada sección se envuelve en una tarjeta con **fondo opaco** (`bg-inv-bg`/`-alt`/`-alt2`), **z-index creciente**, esquinas superiores redondeadas (`rounded-t-[1.6rem]`), sombra ascendente y `CardEdge` (hairline + rombo). El fondo y (si aplica) la foto viven en **capas `absolute` propias dentro del wrapper**, de modo que el `StackCard` **no** gana `backdrop-filter` y no se convierte en contenedor de posicionamiento para descendientes `fixed` (el modal de datos bancarios de `boda_jorge_macarena/Gifts.jsx` sigue anclado al viewport). Los `z`: Hero (z-0), Carta/Contador (z-10), Padres y Padrinos en `alice_xv` (z-15, justo después de la Carta), Itinerario (z-20), Ubicaciones (z-30), Galería (z-40), Dress Code (z-50), Nota de regalos (z-60), Mesa de Regalos (z-70), RSVP (z-80), Footer (z-90).
- **Solo Hero y Footer quedan `sticky`; el resto pasa a `flow`** (boda: commit `a6447c7`; `alice_xv`: commit `ea36bdc`): la portada (Hero z-0) sigue `sticky top-0` con `min-h-[100dvh]` —efecto "carta desplegable": el contenido la tapa— y el cierre/Footer (z-90, con `SectionPhoto` en boda) también es sticky. Las secciones con contenido de altura variable pasan a **`flow`** (no sticky) porque `sticky top-0` + `min-h-[100dvh]` recortaba su parte inferior en móvil (sobre todo **Ubicaciones** al añadir los mapas): **Carta/Contador, Itinerario, Ubicaciones, Galería, Dress Code, Nota de regalos, Mesa de regalos y RSVP**; en `alice_xv` también **Padres y Padrinos** (**z-15**, justo después de la Carta, antes del Itinerario). Fluyen normal manteniendo el acabado de tarjeta y, al cubrir a la anterior, conservan el efecto de apilado sin quedar clavadas. Resultado: el efecto "carta desplegable" queda **solo para la portada**; ninguna sección se recorta.
- **Mapa embebido en Ubicaciones** (`Locations.jsx` de ambas especiales; boda: commit `d615457`; `alice_xv`: commit `ea36bdc`): cada ubicación embebe un **mapa de Google por `<iframe>` sin API key** (`mapSrc(it)` → `https://maps.google.com/maps?q=<encodeURIComponent(place||label)>&z=15&output=embed`, con `loading="lazy"`, `title`, `allowFullScreen` y `referrerPolicy`). **Layout adaptativo al número de ubicaciones**: 1 → tarjeta centrada a ancho completo (`max-w-3xl`); 2 → 2 columnas (`md:grid-cols-2`); 3+ → grid responsive 1/2/3 (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Se conservan los botones Google Maps/Waze (URLs seguras) y el `null` si no hay ubicaciones. El endpoint es un embed público no oficial de Google; con URLs custom el embed se centra por `place`/`label`.
- **Navegación lateral** (`SectionNav.jsx`): dots a la izquierda con scrollspy + tooltip; botón de confirmaciones (sobre) a la derecha que se convierte en "volver arriba" cuando la sección activa es el RSVP. Para saltar una tarjeta sticky **clavada** usa `flowTop()` (suma de alturas de hermanos en flujo) porque `offsetTop` de un sticky clavado devuelve la posición visual, no la de flujo (**bug corregido**). `flowTop()` **ignora hermanos fuera de flujo** (`position: fixed`/`absolute`) al sumar alturas. Escucha `scroll` en fase de captura y respeta `prefers-reduced-motion`.
- **Portada sticky + parallax** (`Hero.jsx`): `h-dvh`, `useScroll({ target, offset: ["start start", "end start"] })`; al ser tapada, el fondo hace parallax y el contenido hace fade/scale (`contentOpacity`, `contentScale`).
- **Parallax** en Galería, Mensaje y Footer (`useScroll()` global, porque `useScroll({ target })` no refleja bien el pinning de las tarjetas sticky).
- **Swipe en la Galería**: arrastre horizontal (`drag="x"` con umbral) y **wrap-around** entre fotos.
- **Mesa de regalos local** (`boda_jorge_macarena/Gifts.jsx`): replica la lógica de `shared/Gifts.jsx` pero con **dropdowns nativos** de moneda/monto (opción "Monto libre"), **pago con tarjeta como CTA principal** y **depósito en modal** accesible (`BankModal`). ⚠️ **Ya NO se replica en `alice_xv`**: allí la sección es una versión local **informativa y sin Stripe** (2 opciones con medallón en arco + bloque de transferencia; ver §3.3 y §6).
- **Fondos de foto por sección — SOLO en `boda_jorge_macarena`** (`SectionPhoto.jsx`, commit `8878c88`): **UNA** foto de `cfg.gallery` **full-bleed** como fondo de la tarjeta, en **blanco y negro** (`grayscale`) + un **scrim** de degradado del `--inv-bg` (~94% en bordes / ~80% al centro) para legibilidad. `null` si no hay foto → cae a fondo sólido. `StackCard` acepta la prop `photo` (URL); `PHOTO_SECTIONS = ["itinerario","ubicaciones","dresscode","cierre"]` y el helper `photoFor(id)` reparte `gallery[i % gallery.length]`. Sustituye al antiguo `PhotoBackdrop.jsx` (fotos dispersas), **eliminado** en el mismo commit. ⚠️ **`alice_xv` NO tiene fondos de foto** (decisión del usuario): no existe `SectionPhoto.jsx` ni la prop `photo` allí.

### 3.3 Mesa de Regalos (archivos)

- **Frontend genérico** `client/src/invitation/shared/Gifts.jsx`: sección pública reutilizable (render condicional si `registry.enabled`). Detecta moneda (`navigator.language` + `timeZone` → `mxn`/`eur`) con selector manual MXN|EUR, chips de montos sugeridos + monto libre, depósito bancario con botones "copiar" y pago vía `@stripe/stripe-js` (`loadStripe(publishableKey)` + `redirectToCheckout`). Maneja `?payment=success|cancelled` al volver de Stripe.
- **Frontend especial** `client/src/invitation/boda_jorge_macarena/Gifts.jsx`: versión local con dropdowns/CTA Stripe/modal de depósito (ver §3.2). `client/src/invitation/alice_xv/Gifts.jsx`: versión local **informativa y sin Stripe** (2 tarjetas de opciones + bloque de transferencia; ver §6).
- **Propagación de clave pública:** `InvitationPage` lee `public_config.stripe_publishable_key` del GET y la propaga (nunca hardcodeada) por `InvitationView` → layouts → `<Gifts>`.
- **Editor** `client/src/pages/event/EventInvitation.jsx`: sección "Mesa de Regalos" con `AmountListEditor` (mínimo/sugeridos/cuenta/stripe).
- **Backend** `server/src/utils/stripe.js`: cliente **lazy** `getStripe()` (null si no hay `STRIPE_SECRET_KEY`), `stripePublishableKey()` (defensa en profundidad: solo expone claves `pk_`, omite `sk_`/`rk_`), `stripeWebhookSecret()`, `verifyStripeWebhook()` (`Stripe.webhooks.constructEvent`), `apiVersion: "2024-06-20"`.
- **Backend** `server/src/routes/invitations.js`: `GET /:token` ahora expone `public_config.stripe_publishable_key`; nuevo `POST /:token/payment` (rate-limit 30/15min) que valida `registry.enabled`/`stripe_enabled`, moneda (`mxn`|`eur`), entero ≥0, mínimo (2000/100), sugeridos si `allow_custom===false` y tope `MAX_AMOUNT=999_999`; crea Checkout Session (`mode:"payment"`) y devuelve `{ session_id }`. Responde `503` si no hay clave Stripe.
- **Backend** `server/src/routes/webhooks.js`: `POST /api/webhooks/stripe` con `express.raw`, montado **antes** de CORS/JSON/CSRF; verifica firma con `STRIPE_WEBHOOK_SECRET` y en `checkout.session.completed` inserta en `gifts` con `ON CONFLICT DO NOTHING` (idempotente).
- `<Gifts>` añadido a los 6 layouts (`xv`, `boda`, `cumpleanos`, `baby_shower`, `alice_xv`, `boda_jorge_macarena`); en `alice_xv` es la versión local informativa (sin pago en línea ni modal).

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
- **Padres y Padrinos** (`Padrinos.jsx` local; tarjeta `z-15`, justo después de la Carta): UNA tarjeta con **dos grupos** — "Mis Padres" (`cfg.parents`) y "Mis Padrinos" (`cfg.padrinos`) — con sub-encabezados tipo eyebrow con filetes y tarjetas premium (borde dorado, filete interior, diamante). Solo se renderiza (y añade el punto "Familia" en la navegación, entre Carta e Itinerario) si alguna lista tiene nombres: `nameList(value)` se exporta y `AliceXvLayout` replica el mismo saneo para omitir tarjeta/punto. Labels en `themes/alice_xv.js`: `padrinosEyebrow` ("Con amor"), `padrinosTitle` ("Mis Padres y Padrinos"), `padrinosSubtitle`, `parentsGroupTitle` ("Mis Padres") y `padrinosGroupTitle` ("Mis Padrinos").
- **Tiene mapa embebido en Ubicaciones** (`Locations.jsx`) y **secciones en `flow`** (solo Hero y Footer sticky), igual que boda (commit `ea36bdc`).
- **Mesa de Regalos informativa, sin Stripe** (`Gifts.jsx` local): cabecera "Mesa de Regalos" en dorado profundo (var `--inv-gold-gradient-deep` + clase aditiva `.text-gold-gradient-deep`, contraste AA); 2 tarjetas de opciones ("Regalo sorpresa", "Lluvia de sobres") con medallón en arco; y bloque **independiente** "Transferencia" (`GoldFrame`) con datos bancarios visibles solo si `bank.enabled` y hay campos (Banco → `bank_name` · TARJETA → `account_number` · Beneficiaria → `holder`; `concept` no se muestra). Sin selectores de moneda/monto, sin modal y sin copiar. Imágenes SVG por defecto en `client/public/mesa-regalos/` (`regalo-sorpresa.svg`, `lluvia-de-sobres.svg`, `transferencia.svg` + `README.txt`); el componente prueba `png → webp → jpg → jpeg → svg` (el raster que suba el cliente tiene prioridad sobre el SVG), construye las URLs con `import.meta.env.BASE_URL` y muestra un medallón de respaldo si no existe ninguna. La sección y su `StackCard` (`mesa-regalos`, z-70) usan `bg-inv-bg`.
- ⚠️ **NO tiene fondos de foto por sección** (no existe `SectionPhoto.jsx`): decisión explícita del usuario.
- Monograma con inicial dinámica de `celebrant_name`, fecha larga y contador propio.
- ⚠️ **Pendiente:** el `description` de `themes/alice_xv.js` sigue diciendo **"Lavanda y dorado"** (desactualizado tras el cambio a rosa pastel + blanco + dorado).

> ⚠️ **Sin commitear (2026-09-16):** el rediseño de Padres/Padrinos y la Mesa de Regalos informativa, más el bloqueo de scroll del sobre (§7), viven en el working tree pendientes de commit (ver `git status`).

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
- **Slug de eventos (`events.slug`)**: en BD existentes, `npm run init-db` es **requisito manual** para crear la columna y el índice único parcial (`schema.sql`/`init.js` son idempotentes). Ya aplicado en la BD local del usuario; **verificar al desplegar**.

### CORS
`server/src/index.js` rechaza orígenes no permitidos → **403 "Origen no permitido por CORS"**, según `CLIENT_URL` / `ALLOWED_ORIGINS`. Configura `CLIENT_URL` con la URL pública real o el frontend quedará bloqueado.

### Estilos públicos de la invitación
- **Scrollbar botánica:** `client/src/invitation/InvitationPage.jsx` añade/elimina la clase `de-invitation` en `<html>`; `client/src/index.css` tiene reglas scoped `html.de-invitation` (thumb verde `#2C4C3B`, hover naranja `#E76F51`). El scrollbar global del admin usa `--tone-*`. (Nota: es verde de la paleta de boda; `alice_xv` la hereda.)
- `client/src/index.css` define además la utility `.envelope-focus:focus-visible` (outline con `--inv-envelope-focus`), `.drop-cap` y la clase aditiva `.text-gold-gradient-deep` (variante **profunda** del dorado, legible AA sobre blanco; la usa el título de la Mesa de Regalos de `alice_xv` con la var `--inv-gold-gradient-deep` de `themes/alice_xv.js`).
- **Sobre de apertura** (`envelope/EnvelopeLoader.jsx`): rediseñado; el overlay centra SOLO el sobre (el texto de ayuda es `absolute`), estilo 100% `var(--inv-envelope-*)` con fallbacks, y prop nueva `family` (desde `InvitationView.jsx`) que permite mostrar "Invitación para {familia}" en la carta interior. Mientras está montado (sobre visible o animándose) **bloquea el scroll de la página** y lo libera al desmontarse tras `onOpen`: añade la clase `de-envelope-lock` a `<html>` (reglas aditivas en `index.css`: `overflow: hidden`, `overscroll-behavior: none`, `touch-action: none`), compensa el ancho de la scrollbar con `padding-right` (sin salto de layout), hace `window.scrollTo(0, 0)` y cancela la rueda del ratón con un listener `wheel` no pasivo (cleanup exacto, StrictMode-safe). Aplica a todas las plantillas con sobre; el **preview del editor no monta el sobre** (`showEnvelope = !preview && !!opening?.envelope && !envelopeOpen`).

---

## 8. Decisiones / pendientes

- [x] ~~Landing pública de marketing en `/` (panel en `/eventos`) + SEO~~ → hecho (`19a9a4d`; marca/dominio `displayevent.com` commiteados en `c657c81`/`c7a3146`; rediseño posterior sin commitear, ver §10 y §11.2).
- [x] ~~URLs bonitas `/invitacion/<slug>/<token>`~~ → hecho (`1b69831`); la ruta legacy `/invitacion/<token>` se mantiene.
- [x] ~~Reproducir `PhotoBackdrop` en `alice_xv`~~ → **descartado**: `alice_xv` **no** usa fondos de foto por sección (decisión del usuario). `PhotoBackdrop.jsx` fue **eliminado** (sustituido por `SectionPhoto.jsx`, solo boda).
- [ ] **Actualizar `description` de `themes/alice_xv.js`** ("Lavanda y dorado" → rosa pastel + blanco + dorado).
- [ ] **Actualizar el doc `INVITACION_BODA_JORGE_MACARENA.md`** (describe el diseño anterior azul noche/dorado).
- [x] ~~*(Rendimiento)* Evaluar el coste de `backdrop-blur`~~ → **ya no aplica**: las tarjetas no usan `backdrop-blur` (fondo opaco + foto en capas `absolute`).
- [ ] *(Ajuste estético)* El **scrim del `SectionPhoto` es fuerte** (~94%/80%), así que la foto B&N se ve **sutil**; subir/disminuir opacidades si se quiere más/menos protagonismo (por legibilidad de la tinta verde).
- [ ] **Re-agregar 3D** (perlas XV, anillos boda) cuando el usuario lo indique. Escenas inertes en `client/src/invitation/3d/`.
- [ ] **Stripe en modo test** (pendiente de pasar a producción): crear las claves de prueba (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`) y ponerlas en `server/.env`. Hoy, sin claves, el código degrada con gracia (pago responde 503). Paso test→prod documentado en `server/.env.example`.
- [ ] **Re-ejecutar `npm run init-db`** para aplicar el índice único `idx_gifts_payment_intent` (el agente de BD lo corrió antes de que SecDevOps añadiera el índice) y **verificar la columna/índice de `events.slug`** en BD existentes (ver §7 y §11.5). Incluye las columnas de WhatsApp (`leader_phone`, `whatsapp_sent_at`, `whatsapp_message`, ver §12).
- [ ] *(Opcional)* Robustez `.env`: `server/src/db/index.js:6` y `server/src/middleware/auth.js:4` leen `process.env` **antes** de que `server/src/index.js:23` cargue `server/.env` con ruta absoluta (afecta al arranque local con `npm start`; en Render no, porque las env vars vienen de la plataforma). Fix sugerido: config compartida de dotenv (ver AUDITORIA.md §4.5).
- [ ] *(Menor)* `robots.txt` sin línea `Sitemap:`: añadir `Sitemap: https://displayevent.com/sitemap.xml` (ver AUDITORIA.md §4.5).
- [ ] *(Opcional)* Aplicar soporte de `hero_image` a los formatos genéricos `xv` y `boda` (hoy solo lo soportan `cumpleanos`, `baby_shower` y `alice_xv`).
- [ ] **Envío por WhatsApp (sin commitear, ver §10 y §12):** revisión profunda de SecDevOps **cancelada** (smoke básico OK: `/api/health` 200, `GET .../whatsapp` sin sesión 401, `POST` con `Origin` ajeno 403); falta probar el flujo manual completo en el panel; activar el modo `cloud` cuando existan credenciales y plantilla Utility aprobada de Meta.
- [x] ~~**Corregir el error de sintaxis de `server/src/db/init.js:1`**~~ → corregido 2026-09-14 por el agente de BD; `node --check` OK, `init-db` re-ejecutado con éxito y las 3 columnas re-verificadas en `information_schema.columns`.
- [ ] **Commitear** el rediseño de la landing y el envío por WhatsApp: **nada** de estos dos bloques está commiteado (ver §10).

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

Cambios pendientes (verificados con `git status`, 2026-09-14): **29 archivos** — 6 nuevos, 21 modificados y 2 eliminados. **Nada de esto está commiteado.** El bloque de marca/SEO de la sesión anterior (logo real, `favicon.svg`, `og-image.png`, dominio `displayevent.com`) ya quedó en `c657c81`/`c7a3146`. Lo pendiente son dos bloques: el **rediseño de la landing** ("imprenta de atelier", §11.2) y el **envío de invitaciones por WhatsApp** (§12).

**Nuevos (6):**

| Archivo | Cambio |
| ------- | ------ |
| `client/src/components/WhatsAppSendModal.jsx` | Modal de envío en 4 pasos (resumen → mensaje → confirmación → resultados; `wa.me` manual o Cloud API con reintento de fallidas). |
| `client/src/landing/components/FeaturePlate.jsx` | Lámina editorial de función (N.º + rótulo, copia + `figure` con pie `Fig. NN`); sustituye al eliminado `Ornament.jsx`. |
| `client/src/landing/sections/Index.jsx` | Índice tipográfico de funciones sobre banda de tinta; sustituye a la eliminada `FormatsMarquee.jsx`. |
| `server/src/routes/whatsapp.js` | Endpoints de estado/mensaje/envío/marcado (montados con `requireAuth` + `eventAccess`). |
| `server/src/utils/phone.js` | Normalización de teléfonos a E.164 (México `+52` por defecto). |
| `server/src/utils/whatsapp.js` | Presets de mensaje, render de placeholders, URL `wa.me` y `sendViaCloudApi`. |

**Modificados — envío por WhatsApp (7):**

| Archivo | Cambio |
| ------- | ------ |
| `client/src/pages/event/EventGuests.jsx` | Campo "WhatsApp del líder", badges "Invitación enviada"/"Sin WhatsApp" y botón "Enviar invitaciones". |
| `client/src/api.js` | Cliente `api.whatsapp` (`get`, `saveMessage`, `send`, `mark`). |
| `server/src/routes/groups.js` | POST/PUT aceptan `leader_phone` (en PUT se conserva si la clave no viene; vacío = `NULL`). |
| `server/src/index.js` | Monta `whatsappRouter` en `/api/events/:eventId/whatsapp`. |
| `server/src/db/schema.sql` | Columnas `"groups".leader_phone`, `"groups".whatsapp_sent_at` y `events.whatsapp_message`. |
| `server/src/db/init.js` | Migraciones idempotentes de esas columnas. |
| `server/.env.example` | Bloque opcional `WHATSAPP_*` (Cloud API de Meta + plantilla Utility aprobada). |

**Modificados — rediseño de la landing (14):**

| Archivo | Cambio |
| ------- | ------ |
| `client/src/landing/LandingPage.jsx` | `Index` sustituye a `FormatsMarquee`; las `Feature*` pasan a nivel de `main`. |
| `client/src/landing/landing.css` | Rediseño "imprenta de atelier" (~1543 líneas cambiadas). |
| `client/src/landing/useLandingMeta.js` | Título/descripción nuevos e inyección de Source Serif 4 + JetBrains Mono mientras la landing está montada. |
| `client/src/landing/sections/Hero.jsx` | Dateline, placa `Fig. 01` (sobre), lista de facts y CTA "Ver los formatos". |
| `client/src/landing/sections/Nav.jsx` | Logo 34×28 y "Crear cuenta". |
| `client/src/landing/sections/Faq.jsx` | Título "Lo que nos preguntan seguido", numeración y copy; regalo con tarjeta matizado. |
| `client/src/landing/sections/FeatureInvitations.jsx` | `FeaturePlate` (Fig. 02). |
| `client/src/landing/sections/FeatureRsvp.jsx` | `FeaturePlate` (Fig. 03). |
| `client/src/landing/sections/FeatureTables.jsx` | `FeaturePlate` (Fig. 04). |
| `client/src/landing/sections/FeatureGifts.jsx` | `FeaturePlate` (Fig. 05) y "Pago con tarjeta cuando lo activas". |
| `client/src/landing/sections/HowItWorks.jsx` | "Cómo funciona" como ledger de 3 pasos. |
| `client/src/landing/sections/FormatShowcase.jsx` | Formatos como especímenes numerados (`N.º NN`). |
| `client/src/landing/sections/FinalCta.jsx` | CTA final en tinta con el logo invertido (`filter: invert(1)`). |
| `client/src/landing/sections/Footer.jsx` | Footer tipo colofón con anclas del índice. |

**Eliminados (2):**

| Archivo | Cambio |
| ------- | ------ |
| `client/src/landing/sections/FormatsMarquee.jsx` | Sustituido por `Index.jsx`. |
| `client/src/landing/components/Ornament.jsx` | Sustituido por `FeaturePlate.jsx`. |

> `MEMORIA.md`, `README.md` y `AUDITORIA.md` se actualizan en esta misma sesión documental.

---

## 11. Landing pública, rutas y SEO (2026-09-11)

### 11.1 Rutas (`client/src/App.jsx`)

- `/` → **landing pública de marketing** (`client/src/landing/**`). Se renderiza con una **rama temprana** (`isLanding`, antes de auth/panel) y está **siempre visible** (con o sin sesión). Fuerza `data-theme="light"` (el script inline de `index.html` también lo hace en `/`).
- `/eventos` → **panel admin** (antes `/`), protegido con `RequireAuth`. Las rutas internas del panel siguen igual (`/events/:id/...`).
- `/invitacion/:slug/:token` → invitación pública con **URL bonita** (commit `1b69831`); `/invitacion/:token` → ruta **legacy** que se mantiene. `InvitationPage` resuelve por el token en ambos casos y fuerza `data-theme="dark"`.
- `/login`, `/registro` y `/verificar-correo` no cambian.

### 11.2 Landing (`client/src/landing/**`)

- **20 archivos**: `LandingPage.jsx`, `landing.css`, `useLandingMeta.js`, 12 secciones (`sections/`) y 5 componentes (`components/`: `FeaturePlate` + 4 mocks). Se **eliminaron** `sections/FormatsMarquee.jsx` (sustituida por `sections/Index.jsx`) y `components/Ornament.jsx` (sustituido por `components/FeaturePlate.jsx`).
- Secciones: `Nav`, `Hero`, `Index`, `FeatureInvitations`, `FeatureRsvp`, `FeatureTables`, `FeatureGifts`, `HowItWorks`, `FormatShowcase`, `Faq`, `FinalCta`, `Footer`.
- **Dirección "imprenta de atelier"** (rediseño 2026-09-14, sin commitear): tinta `#17130e` sobre papel cálido `#f6f3ec`, hairlines, láminas con pie de figura (`Fig. 01`–`Fig. 05`), marcas de corte y una sola tinta de acento (vino `#7d3836`; quedan usos residuales de los tokens `--de-gold`/`--de-sage`). CSS scopeado bajo `.de-landing` (tokens `--de-*`).
- **Tipografías**: Playfair Display (display; ya viene del `<link>` global de `client/index.html`), Source Serif 4 (texto) y JetBrains Mono (rótulos). Las dos últimas se inyectan **solo con la landing montada** desde `useLandingMeta.js` (con `preconnect` a `fonts.gstatic.com`) y se retiran al desmontar.
- **Estructura**: portada con **dateline** y placa `Fig. 01`; `Index.jsx` (índice tipográfico sobre banda de tinta) sustituye a la marquesina; funciones como **láminas numeradas** (`FeaturePlate`, con anclas `#invitaciones`, `#rsvp`, `#mesas`, `#regalos`); "cómo funciona" como **ledger** de 3 pasos; formatos como **especímenes** numerados; FAQ "Lo que nos preguntan seguido" con numeración; CTA final en tinta con el logo invertido; footer tipo **colofón**.
- Copy humanizado en toda la landing; el matiz de la mesa de regalos queda alineado con AUDITORIA §4.5 ("Pago con tarjeta cuando lo activas", ya no promete Stripe incondicionalmente).
- Mocks SVG/CSS propios (`InvitationCardMock`, `GiftCardMock`, `RsvpCardMock`, `TableMock`), sin imágenes externas.
- Animaciones con `motion/react`, reutilizando el helper `Reveal` de `invitation/motion.jsx`; la FAQ usa `AnimatePresence` y respeta `prefers-reduced-motion`.
- **CTA adaptativo con `useAuth()`**: con sesión muestra "Ir a mis eventos" → `/eventos`; sin sesión, "Iniciar sesión" / "Crear mi evento" ("Crear cuenta" en el nav).
- `useLandingMeta()` fija `title`/`description` de marketing mientras la landing está montada y los restaura al desmontar.

### 11.3 Marca / logo

- El **logo real** `client/public/logo.svg` se usa en Nav y Footer (`<img src="/logo.svg">` + wordmark "DisplayEvent").
- `favicon.svg` **reconstruido** con los paths reales del logo; `og-image.png` **regenerado** con el logo.
- `logo.svg` **normalizado**: `viewBox` recortado a `76 70 175 143` (dibujo idéntico).
- Bloque de marca/SEO **commiteado** (`c657c81` logo real en nav/footer/favicon/OG; `c7a3146` dominio `displayevent.com`).

### 11.4 SEO

- `client/index.html`: `title`, `description`, `theme-color`, `canonical`, OG y Twitter (card `summary_large_image`).
- Dominio en canonical/OG/sitemap: **`https://displayevent.com/`** (edición local del usuario; ya coherente en todos los meta).
- `client/public/robots.txt`: `Allow: /` y `Disallow: /api/`, `/uploads/`; `client/public/sitemap.xml` con la home.
- Pendiente: `robots.txt` sin línea `Sitemap:` (ver AUDITORIA.md §4.5).

### 11.5 Slugs de evento

- Backend: `events.slug VARCHAR(80)`, **único** con índice parcial `idx_events_slug ... WHERE slug IS NOT NULL`, **autogenerado** desde el nombre (normaliza acentos) y con sufijos `-2`, `-3`… si está tomado; formato `^[a-z0-9]+(?:-[a-z0-9]+)*$`, longitud 3–60.
- `GET /api/events/slug-available` (declarado antes de `GET /:id`): comprueba unicidad global y devuelve `{ available, reason? }`.
- Editor `EventInvitation.jsx`: sección **"Enlace público"** (slug manual, sugerencia desde el nombre, vista previa y copiar; usa el token del primer grupo).
- ⚠️ En BD existentes, `npm run init-db` es **requisito manual** para crear la columna/índice; `schema.sql`/`init.js` son idempotentes. Ya aplicado en la BD local del usuario; **verificar al desplegar**.

### 11.6 QA (2026-09-11)

- Matriz de rutas OK: landing / panel / auth / invitación / deep links.
- `npm run build` (raíz) **exit 0**, tras detener dev servers que bloqueaban `lightningcss` en Windows.
- Smoke test Express: **200** de SPA y assets; sin secretos en `client/dist`.
- Único endpoint que consume la landing: `GET /api/auth/me`; sin overflow en 360/768/1280 en la landing; FAQ accesible y `prefers-reduced-motion` respetado.
- **No ejecutado**: login real end-to-end (sin credenciales; se cubrió con sesión forjada y redirects) ni pruebas de Stripe contra la API real.
- ⚠️ El rediseño de la landing (2026-09-14, §11.2) **no** repitió esta matriz de QA (solo `npm run build` del client exit 0, reportado por el agente; ver §12).

---

## 12. Envío de invitaciones por WhatsApp (2026-09-14)

Feature **sin commitear** (ver §10): el panel puede enviar la invitación a los líderes de grupo por WhatsApp, en dos modos.

**Flujo en el panel (Invitados):**

- El formulario de grupo incluye **"WhatsApp del líder"** (el servidor lo normaliza a E.164).
- La tarjeta del grupo muestra el teléfono, el badge **"Invitación enviada"** (si `whatsapp_sent_at`) y **"Sin WhatsApp"** si falta.
- Botón **"Enviar invitaciones"** junto a "+ Nuevo grupo" → `WhatsAppSendModal` en 4 pasos: Resumen (grupos enviables/sin teléfono e invitados cubiertos) → Mensaje (3 presets + textarea ≤800 con vista previa) → Confirmación → Envío/Resultados.

**Modos (decisión híbrida):**

| Modo | Activación | Comportamiento | Costo |
| ---- | ---------- | -------------- | ----- |
| `link` (default) | sin configurar nada | Genera un enlace `wa.me` por grupo; el organizador abre cada chat y confirma, y luego marca las enviadas (`/mark`). | $0 |
| `cloud` | `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_TEMPLATE_NAME` | El servidor envía secuencialmente con la **Cloud API de Meta** (pausa 350 ms entre envíos, timeout 10 s) y marca `whatsapp_sent_at`; un fallo aislado no aborta el resto y el modal permite reintentar fallidas. | Por mensaje (Meta) |

`WHATSAPP_TEMPLATE_LANG` (default `es_MX`) y `WHATSAPP_API_VERSION` (default `v21.0`) completan el bloque `.env.example`.

**BD (migración manual en BD existentes):**

- `"groups".leader_phone VARCHAR(20)` (E.164), `"groups".whatsapp_sent_at TIMESTAMPTZ`, `events.whatsapp_message TEXT`.
- Migraciones idempotentes (`ADD COLUMN IF NOT EXISTS`) en `server/src/db/init.js` y `server/src/db/schema.sql`. `npm run init-db` es **requisito manual** en BD existentes; ya re-ejecutado con éxito (2026-09-14) tras corregir `init.js`, y las 3 columnas re-verificadas en `information_schema.columns` (ver §8).

**Backend (sin dependencias nuevas):**

- `server/src/utils/phone.js`: normalización E.164 (México `+52` por defecto; acepta `+52…`, `521…` legado, `1`+10 legado, `00…` e internacionales de 8–15 dígitos); `toWaDigits()` para `wa.me`/Cloud API.
- `server/src/utils/whatsapp.js`: 3 presets ("Cercano"/"Formal"/"Breve"), placeholders `{{lider}}`/`{{evento}}`/`{{fecha}}`/`{{lugar}}`/`{{enlace}}` (si falta `{{enlace}}` se agrega al final), fecha larga es-MX calculada en UTC, URL `wa.me` y `sendViaCloudApi` (plantilla Utility con 4 parámetros de body: líder, evento, fecha·lugar, enlace).
- `server/src/routes/whatsapp.js` (montado con `requireAuth` + `eventAccess` en `server/src/index.js`); `routes/groups.js` acepta `leader_phone` en POST/PUT (en PUT se conserva si la clave no viene; vacío lo borra); cliente `api.whatsapp` en `client/src/api.js`.

**Endpoints:**

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/events/:id/whatsapp` | Modo activo, presets, preset por defecto y mensaje guardado. |
| PUT | `/api/events/:id/whatsapp/message` | Guarda el mensaje del evento (≤800 caracteres; garantiza `{{enlace}}`). |
| POST | `/api/events/:id/whatsapp/send` | Prepara (`link`) o envía (`cloud`) a los líderes con teléfono válido; rate limit **10/10 min por usuario**; filtros opcionales `groupIds` (≤500) y `onlyPending`. |
| POST | `/api/events/:id/whatsapp/mark` | Marca como enviadas (1–500 ids) las confirmadas manualmente en modo `link`. |

**Límites y limitaciones:**

- El teléfono debe ser válido (10 dígitos MX o formato internacional); sin teléfono o sin token el grupo se omite (`sin_telefono`/`sin_enlace`).
- La Cloud API requiere **plantilla Utility aprobada** con los 4 parámetros en orden, y tiene **costo por mensaje** y límite de destinatarios según el tier de Meta.
- En modo `link` cada apertura la hace el organizador desde su equipo; el rate limit del endpoint protege ante reintentos/automatizaciones accidentales.

**Estado de verificación (2026-09-14, reportado por el agente):** `npm run build` del client exit 0 y smoke en puerto alterno OK (`/api/health` 200, `GET .../whatsapp` sin sesión 401, `POST` con `Origin` ajeno 403). `node --check` OK en los JS de servidor (`routes/whatsapp.js`, `utils/whatsapp.js`, `utils/phone.js`, `routes/groups.js` e `index.js`; `db/init.js` corregido y verificado 2026-09-14). Revisión profunda de SecDevOps **cancelada**. Nada commiteado.

---

## 13. Referencias y documentación del repo

- `README.md` — guía general (setup, scripts, API completa).
- `AUDITORIA.md` — auditoría de bugs del panel y de la landing/SEO, y su estado (resueltos/abiertos; §4.5 = hallazgos del 2026-09-11).
- `PLAN_INVITACIONES_MULTIFORMATO.md` — plan de la reestructuración multiformato.
- `INVITACION_BODA_JORGE_MACARENA.md` — doc de datos dinámicos de la plantilla (⚠️ describe el diseño anterior azul noche/dorado).
- `FORMATO LISTA DE INVITADOS 2026.xlsx` — archivo de cliente (git-ignored por patrón `*.xlsx`).
- `render.yaml` — definición legacy de Render (despliegue anterior).

### Historial reciente relevante (git)

| Commit | Descripción |
| ------ | ----------- |
| `55e405d` | Docs: documentar landing en `/`, slugs y hallazgos de QA. |
| `c7a3146` | SEO: dominio `displayevent.com` en canonical, OG y sitemap. |
| `c657c81` | Landing: integrar logo real en nav, footer, favicon y OG. |
| `1b69831` | Invitación: slug por evento y URLs bonitas (`/invitacion/<slug>/<token>`). |
| `19a9a4d` | Landing: página pública y SEO (dominio inicial `displayevent.online`, luego unificado a `displayevent.com` en `c7a3146`). |
| `6f16a19` | Docs: actualizar MEMORIA (mapas, fondos de foto, secciones en flow, fix galería). |
| `ea36bdc` | Invitación: mapa en Ubicaciones y secciones en `flow` en `alice_xv`. |
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
