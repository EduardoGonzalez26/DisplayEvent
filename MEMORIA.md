# MEMORIA — DisplayEvent

> **Propósito:** Memoria persistente del proyecto. Fuente única de contexto para que cualquier agente o persona pueda retomar el trabajo sin re-descubrir el estado, las decisiones y los pendientes.
>
> **Última actualización:** 2026-11-13
> **Repositorio:** `D:\Proyectos\DisplayEvent` (monorepo `client/` + `server/`, git)
>
> **Estado vigente (2026-11-10):** `boda_jorge_macarena` usa el diseño **v3 + delta v4**. El v4 añade “Ver ideas” en Vestimenta, la 5.ª recomendación “Moverse por Granada”, alergias alimentarias y **selección de rango de edad** en el RSVP, **rangos de edad del dashboard** y nuevos assets; el esquema/seed v4 (incluidas `guests.age_range_*` y `events.age_ranges`) ya se aplicaron con `init-db`/script. No hay plantilla nueva ni selector v2/v3/v4. El detalle vive en **§18** (incluye **§18.1 Delta v4**); **§15** y el bloque histórico de **§16** describen el v2 como **histórico**. El código v4 está en el **working tree, sin commit ni push**. Pendientes: **fuente Nikolai** y **deploy**.
>
> ⚠️ Este archivo **no contiene secretos**. Los valores reales viven en `server/.env` (git-ignored). Usa siempre nombres de variable, nunca valores.

---

## 1. Resumen del proyecto

**DisplayEvent** es un organizador de eventos web. Permite:

- Crear eventos y administrar invitados por **grupos** (con líder), con marcado de niños y registro de asistencia.
- **Exportar el resumen de invitados a PDF** desde el panel de Invitados: resumen general, tabla por grupo con totales y detalle por invitado, con logo y paginación; se genera en el navegador con jsPDF + AutoTable y carga diferida (ver §14.1).
- Organizar **mesas** con drag & drop (dnd-kit), colores por grupo, acompañantes en bloque y validación de capacidad en servidor.
- Generar **invitaciones digitales multiformato**: cada grupo recibe un enlace público por token (`/invitacion/<slug>/<token>`, con la ruta legacy `/invitacion/<token>` aún soportada) que muestra una invitación sin requerir sesión. La plantilla especial `boda_jorge_macarena` usa el **diseño v3** vigente (ver §18).
- **Landing pública de marketing** en `/` (`client/src/landing/**`, visible con o sin sesión) y **panel admin** en `/eventos` (protegido con JWT en cookie httpOnly + verificación de correo). En un **dominio propio de evento**, la raíz muestra una **portada pública del evento** en lugar de la landing (ver §16).
- Editor de invitación dirigido por schema, con vista previa y plantillas reutilizables por usuario. La boda tiene editor dedicado v3 (`BodaJorgeMacarenaV3Editor.jsx`; ver §18).
- **Mesa de Regalos reutilizable** por invitación: regalos monetarios por **depósito bancario** o **pago con tarjeta vía Stripe Connect**. El entorno verificado el **2026-10-22** ya usa claves **live**; la **cuenta Connect única por evento** se commiteó en `138fe3f` (base desplegada). El evento 2 usa **webi/BBVA …3892** (`acct_1UT7NAFnv8uJBZLH`). La restricción visual (`ff2b988`), el blindaje (`a9610b6`) y el panel `/events/:id/pagos` (`6fbc07c`) siguen locales, pendientes de deploy (ver §15.1/§15.1.1).

---

## 2. Stack

| Capa | Tecnología |
| ---- | ---------- |
| Frontend | React 18 + Vite 5 + Tailwind CSS 4 (`@tailwindcss/vite`) + `motion/react` (antes `framer-motion`) |
| 3D (inactivo) | `@react-three/fiber`, `@react-three/drei`, `three` (dependencias presentes, escenas retiradas) |
| Backend | Node.js + Express 4 (`type: module`) |
| BD | PostgreSQL vía `pg` 8 |
| Validación | `zod` 4 |
| Despliegue | **Railway** — confirmado por el usuario el 2026-10-11 (Railpack detecta `build`/`start` del `package.json` raíz; `render.yaml` es legacy de Render) |
| BD en la nube | **Supabase** (PostgreSQL) |
| Correo | **Brevo** (API HTTPS; alternativa SMTP local) |
| Imágenes y audio | **Cloudinary** (opcional; el audio sube como recurso `video`) o guardado local en `server/uploads/` |
| Pagos | **Stripe** (`stripe` 22.x en server, `@stripe/stripe-js` 5.x en client): **Checkout embebido** con **Stripe Connect** (destination charges, 100% al anfitrión; ver §15) + **Payment Link externo por evento** (`registry.payment_link_url`; ver §13). Entorno verificado el 2026-10-22 con claves **live** y webhook live; la cuenta Connect única por evento se commiteó en `138fe3f` (base desplegada). El evento 2 usa webi/BBVA (`acct_1UT7NAFnv8uJBZLH`); la restricción visual (`ff2b988`), el blindaje (`a9610b6`) y el panel de pagos (`6fbc07c`) siguen locales, pendientes de deploy (ver §15.1/§15.1.1). |

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
│   │   Rsvp.jsx      # RSVP compartido de los genéricos y alice_xv (la boda v3 tiene el suyo)
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
├── boda_jorge_macarena/  # Plantilla ESPECIAL — v3 + delta v4 (2026-11-10; ver §18/§18.1)
│   ├── BodaJorgeMacarenaLayout.jsx  # monta las secciones v3 (hojas sticky/tilt/shade)
│   ├── v3.css                       # sistema visual v3 (algodón, marco nazarí, letterpress)
│   ├── v3/                          # componentes v3 (los monta el layout)
│   │   ├── index.js, ui.jsx, assets.js
│   │   ├── CoverSection.jsx, StorySection.jsx, IcebreakerSection.jsx,
│   │   │   LocationSection.jsx, DressCodeSection.jsx, RecommendationsSection.jsx,
│   │   │   TravelSection.jsx, StaySection.jsx, RsvpSection.jsx,
│   │   │   GiftsSection.jsx, ClosingSection.jsx
│   ├── MusicToggle.jsx, EditorialEnvelope.jsx, helpers.js
│   └── Hero.jsx, Story.jsx, Locations.jsx, Itinerary.jsx, DressCode.jsx,
│       Gifts.jsx, Travel.jsx, Stay.jsx, ZoneMap.jsx, Footer.jsx,
│       SectionPhoto.jsx, flora.jsx, Grain.jsx  # v2 conservados, YA NO montados
├── 3d/                # Escenas WebGL RETIRADAS (inertes; re-agregar a pedido)
│   └── RingsHero3D.jsx, RingsScene.jsx, XvPearlsHero3D.jsx, XvPearlsScene.jsx
├── envelope/          # EnvelopeLoader.jsx — sobre digital de apertura
├── InvitationView.jsx # Orquestación: elige tema + layout + envelope
├── InvitationPage.jsx # Landing pública (fetch por token + render InvitationView)
└── motion.jsx         # Re-exports de animación (motion/react)
```

> Nota de alcance: `BottomNav.jsx` fue eliminado en el rediseño v3; no forma parte de la feature de Viaje/Hospedaje (§15.2).

**Modelo de tema (clave):** cada tema en `themes/<id>.js` define:

- `vars` — CSS variables `--inv-*` (paleta, fuentes, sombras, gradientes).
- `labels` — textos y funciones de texto (`heroInvite`, `parentsLine`, `defaultMessage`, …).
- `resolvers` — funciones que derivan valores (ej. `signature`).
- `opening` — experiencia del sobre (`envelope: true`, `cardText`, `sealText`).

`getThemeLayout()` hace `lazy(() => import(...))` para que el bundle del editor/admin **no** arrastre las secciones públicas.

### 3.1 Plantillas "especiales" con componentes propios

Las dos plantillas de encargo (`alice_xv`, `boda_jorge_macarena`) **no usan `shared/*` como secciones**: cada una mantiene componentes locales propios. `alice_xv` solo comparte `shared/Rsvp.jsx` (más utilidades sueltas); la **boda v3 + v4** usa un **RSVP propio** (`v3/RsvpSection.jsx`) y solo reutiliza `shared/Countdown.jsx` → `useCountdown` (además de `shared/util.jsx` en piezas heredadas).

- ⚠️ **(2026-11-09) `boda_jorge_macarena` fue reemplazada en sitio por el diseño v3**, con **delta v4** (2026-11-10; ver §18/§18.1). `BodaJorgeMacarenaLayout.jsx` ahora monta `v3/CoverSection`, `v3/StorySection`, `v3/IcebreakerSection`, `v3/LocationSection`, `v3/DressCodeSection`, `v3/RecommendationsSection`, `v3/TravelSection`, `v3/StaySection`, `v3/RsvpSection`, `v3/GiftsSection` y `v3/ClosingSection`, con el sistema visual de `v3.css`. **No hay plantilla nueva ni selector v2/v3/v4.** Los archivos v2 (`Hero.jsx`, `Story.jsx`, `Locations.jsx`, `Itinerary.jsx`, `DressCode.jsx`, `Gifts.jsx`, `Travel.jsx`, `Stay.jsx`, `ZoneMap.jsx`, `Footer.jsx`, `SectionPhoto.jsx`, `flora.jsx`, `Grain.jsx`) siguen en disco pero **ya no se importan**; `EditorialEnvelope.jsx` y `MusicToggle.jsx` sí se conservan, adaptados a v3. Se eliminaron en su momento `decor.jsx`, `SectionNav.jsx`, `Countdown.jsx`, `Message.jsx`, `RegistryNote.jsx`, `Gallery.jsx` y `BottomNav.jsx`.
- `alice_xv` **permanece intacta** (decisión del usuario) y conserva su set histórico: `decor.jsx` (exporta el kit de ornamentos `BotanicalCorner`, `BotanicalDivider`, `Flourish`, `WeddingSectionTitle`, `GoldFrame`), `Hero.jsx`, `Countdown.jsx`, `Message.jsx`, `Itinerary.jsx`, `Locations.jsx`, `Gallery.jsx`, `DressCode.jsx`, `RegistryNote.jsx`, `Gifts.jsx`, `Padrinos.jsx`, `Footer.jsx` y `SectionNav.jsx`. ⚠️ **NO tiene `SectionPhoto.jsx` ni fondos de foto**.
- Los formatos genéricos (`xv`, `boda`, `cumpleanos`, `baby_shower`) siguen usando las secciones de `shared/`.

### 3.2 Efectos y comportamiento del layout

> ⚠️ **(2026-11-09)** La **boda usa el layout v3** (ver §18): no replica estos mecanismos. Los bullets siguientes describen el sistema vigente de **`alice_xv`**; donde digan «ambas especiales» debe leerse «`alice_xv`». Los detalles v2 de la boda que aparezcan abajo se conservan como **histórico**. Mecanismos heredados, **replicados en `alice_xv/`** desde `boda_jorge_macarena` (commit `46f7628`):

- **Tarjetas apiladas** (`StackCard` en cada `*Layout.jsx`): cada sección se envuelve en una tarjeta con **fondo opaco** (`bg-inv-bg`/`-alt`/`-alt2`), **z-index creciente**, esquinas superiores redondeadas (`rounded-t-[1.6rem]`), sombra ascendente y `CardEdge` (hairline + rombo). El fondo y (si aplica) la foto viven en **capas `absolute` propias dentro del wrapper**, de modo que el `StackCard` **no** gana `backdrop-filter` y no se convierte en contenedor de posicionamiento para descendientes `fixed` (en la boda v2 el modal de banco quedaba anclado al viewport; la boda v3 ya no usa este `StackCard`). Los `z`: Hero (z-0), Carta/Contador (z-10), Padres y Padrinos en `alice_xv` (z-15, justo después de la Carta), Itinerario (z-20), Ubicaciones (z-30), Galería (z-40, solo `alice_xv`), Dress Code (z-50), Nota de regalos (z-60), Mesa de Regalos (z-70), RSVP (z-80), Footer (z-90).
- **Solo Hero y Footer quedan `sticky`; el resto pasa a `flow`** (boda: commit `a6447c7`; `alice_xv`: commit `ea36bdc`): la portada (Hero z-0) sigue `sticky top-0` con `min-h-[100dvh]` —efecto "carta desplegable": el contenido la tapa— y el cierre/Footer (z-90, con `SectionPhoto` en boda) también es sticky. Las secciones con contenido de altura variable pasan a **`flow`** (no sticky) porque `sticky top-0` + `min-h-[100dvh]` recortaba su parte inferior en móvil (sobre todo **Ubicaciones** al añadir los mapas): **Carta/Contador, Itinerario, Ubicaciones, Dress Code, Nota de regalos, Mesa de regalos y RSVP** (y la **Galería**, solo en `alice_xv`); en `alice_xv` también **Padres y Padrinos** (**z-15**, justo después de la Carta, antes del Itinerario). Fluyen normal manteniendo el acabado de tarjeta y, al cubrir a la anterior, conservan el efecto de apilado sin quedar clavadas. Resultado: el efecto "carta desplegable" queda **solo para la portada**; ninguna sección se recorta.
- **Mapa embebido en Ubicaciones** (`Locations.jsx` de ambas especiales; boda: commit `d615457`; `alice_xv`: commit `ea36bdc`): cada ubicación embebe un **mapa de Google por `<iframe>` sin API key** (`mapSrc(it)` → `https://maps.google.com/maps?q=<encodeURIComponent(place||label)>&z=15&output=embed`, con `loading="lazy"`, `title`, `allowFullScreen` y `referrerPolicy`). **Layout adaptativo al número de ubicaciones**: 1 → tarjeta centrada a ancho completo (`max-w-3xl`); 2 → 2 columnas (`md:grid-cols-2`); 3+ → grid responsive 1/2/3 (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Se conservan los botones Google Maps/Waze (URLs seguras) y el `null` si no hay ubicaciones. El endpoint es un embed público no oficial de Google; con URLs custom el embed se centra por `place`/`label`.
- **Navegación lateral** (`SectionNav.jsx`): dots a la izquierda con scrollspy + tooltip; botón de confirmaciones (sobre) a la derecha que se convierte en "volver arriba" cuando la sección activa es el RSVP. En **ambas especiales** ese botón queda **abajo a la derecha en móvil** (`bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-4`, sin `translate`) y desde `md` conserva el centrado vertical derecho (`md:bottom-auto md:right-5 md:top-1/2 md:-translate-y-1/2`) —en `boda_jorge_macarena` desde el commit `ef3a63a`, en paridad con `alice_xv` (`3366f44`)—; **la columna de dots no cambió**. Para saltar una tarjeta sticky **clavada** usa `flowTop()` (suma de alturas de hermanos en flujo) porque `offsetTop` de un sticky clavado devuelve la posición visual, no la de flujo (**bug corregido**). `flowTop()` **ignora hermanos fuera de flujo** (`position: fixed`/`absolute`) al sumar alturas. Escucha `scroll` en fase de captura y respeta `prefers-reduced-motion`.
- **Portada sticky + parallax** (`Hero.jsx`): `h-dvh`, `useScroll({ target, offset: ["start start", "end start"] })`; al ser tapada, el fondo hace parallax y el contenido hace fade/scale (`contentOpacity`, `contentScale`).
- **Parallax** en Mensaje y Footer (y en la Galería **solo de `alice_xv`**; boda la eliminó en `719f2b4`) (`useScroll()` global, porque `useScroll({ target })` no refleja bien el pinning de las tarjetas sticky).
- **Swipe en la Galería** (solo `alice_xv`; boda la eliminó en `719f2b4`): arrastre horizontal (`drag="x"` con umbral) y **wrap-around** entre fotos.
- **Mesa de regalos local v2 (histórico, ya no montada)** (`boda_jorge_macarena/Gifts.jsx`): dropdowns nativos, CTA de tarjeta y modal de banco. En v3 la sección es `v3/GiftsSection.jsx` (Stripe embebido/payment link, CLABE/IBAN y mensaje a los novios; ver §18). ⚠️ **`alice_xv` no replica esta mesa**: allí es una versión local **informativa y sin Stripe** (2 opciones con medallón en arco; ver §3.3 y §6).
- **Fondos de foto por tarjeta (v2 histórico; v3 ya no usa `gallery`)** (`SectionPhoto.jsx`, commits `8878c88` y `719f2b4`): **UNA** foto de `cfg.gallery` **full-bleed** como fondo de cada tarjeta, en **blanco y negro** + **scrim** del `--inv-bg-alt2`. `StackCard` aceptaba la prop `photo`; `PHOTO_ORDER` fijaba la correspondencia id→foto. ⚠️ **La boda v3 no usa este sistema**: los dibujos son assets fijos `.webp` del paquete (`v3/assets.js`) y el papel es de algodón. **`alice_xv` NO tiene fondos de foto** (decisión del usuario).

### 3.3 Mesa de Regalos (archivos)

- **Frontend genérico** `client/src/invitation/shared/Gifts.jsx`: sección pública reutilizable (render condicional si `registry.enabled`). Detecta moneda (`navigator.language` + `timeZone` → `mxn`/`eur`) con selector manual MXN|EUR, chips de montos sugeridos + monto libre, depósito bancario con botones "copiar" y pago vía `@stripe/stripe-js` (`loadStripe(publishableKey)` + `redirectToCheckout`). Maneja `?payment=success|cancelled` al volver de Stripe. Desde el commit `138fe3f`: sin sugeridos y con `allow_custom`, el campo **"Monto"** se muestra directamente; sin sugeridos ni monto libre, muestra "La mesa de regalos aún no tiene montos configurados." y no ofrece CTA de tarjeta (el banco se conserva).
- **Frontend especial v3** `client/src/invitation/boda_jorge_macarena/v3/GiftsSection.jsx`: mesa de regalos de la boda v3 (Stripe embebido o Payment Link, CLABE/IBAN, mensaje a los novios; ver §18). El antiguo `boda_jorge_macarena/Gifts.jsx` (v2) sigue en disco pero **no se monta**. `client/src/invitation/alice_xv/Gifts.jsx`: versión local **informativa y sin Stripe** (2 tarjetas de opciones con medallón en arco; ver §6).
- **Payment Link externo (por evento):** en `shared/Gifts.jsx` y `boda_jorge_macarena/v3/GiftsSection.jsx`, con `stripe_enabled` + `registry.payment_link_url` el CTA de tarjeta es un `<a>` externo (pestaña nueva) y se ocultan los selectores de moneda/monto; el depósito bancario no cambia (ver §13.3 y §18).
- **Propagación de clave pública:** `InvitationPage` lee `public_config.stripe_publishable_key` del GET y la propaga (nunca hardcodeada) por `InvitationView` → layouts → `<Gifts>` (genéricos/`alice_xv`) o `v3/GiftsSection` (boda).
- **Editor** `client/src/pages/event/EventInvitation.jsx`: sección "Mesa de Regalos" con `AmountListEditor` (mínimo/sugeridos/cuenta/stripe). Bloque **"Pagos / Conectar Stripe"** con el selector **"Cuenta de Stripe para este evento"**: con una cuenta válida asignada muestra **solo esa cuenta** y **"Cambiar cuenta"** revela temporalmente el resto; **Automática** se oculta en modo restringido. Si la cuenta guardada es inválida/deshabilitada, se revelan todas. Cambio local `ff2b988`; ver §15.1. Aviso no bloqueante si el pago con tarjeta está activo pero falta alguna lista de sugeridos y `allow_custom` es false.
- **Backend** `server/src/utils/stripe.js`: cliente **lazy** `getStripe()` (null si no hay `STRIPE_SECRET_KEY`), `stripePublishableKey()` (defensa en profundidad: solo expone claves `pk_`, omite `sk_`/`rk_`), `stripeWebhookSecret()`, `verifyStripeWebhook()` (`Stripe.webhooks.constructEvent`), `apiVersion: "2024-06-20"`.
- **Backend** `server/src/routes/invitations.js`: `GET /:token` expone `public_config.stripe_publishable_key` y `payment_methods.card.{mxn,eur}`; con `events.stripe_account_id` seleccionado, ambas monedas comparten la misma disponibilidad (cuenta válida → `true/true`; inválida → `false/false`, sin fallback). `POST /:token/payment` (rate-limit 30/15min) valida `registry.enabled`/`stripe_enabled`, moneda (`mxn`|`eur`), entero ≥0, mínimo (2000/100), sugeridos si `allow_custom===false` y tope `MAX_AMOUNT=999_999`; resuelve el destino Connect (cuenta del evento o legacy por moneda) y crea Checkout Session **embebida** (`ui_mode:"embedded"`, `mode:"payment"`), devolviendo `{ client_secret }`. Responde `503` si no hay clave Stripe.
- **Backend** `server/src/routes/events.js`: `PUT /:id` acepta `stripe_account_id` (ausente = conservar; `""`/`null` = limpiar; `acct_...` = validar cuenta propia con `charges_enabled`; inválida → `400`). Ver §15.1.
- **Backend** `server/src/routes/webhooks.js`: `POST /api/webhooks/stripe` con `express.raw`, montado **antes** de CORS/JSON/CSRF; verifica firma con `STRIPE_WEBHOOK_SECRET`. En el commit local `a9610b6` maneja `checkout.session.completed`, `async_payment_succeeded` y `async_payment_failed` con **upsert idempotente** por `stripe_payment_intent_id` (sin degradar `succeeded`); guarda `livemode`, `destination_account` y `stripe_checkout_session_id` (ver §15.1.1).
- `<Gifts>` se añadió a los layouts de los formatos genéricos y `alice_xv`; en `alice_xv` es la versión local informativa (sin pago en línea ni modal). La boda **no** usa `shared/Gifts.jsx`: monta `v3/GiftsSection.jsx`.

---

## 4. Contrato de datos de invitación (`server/src/schemas/invitation.js`)

- Validación con **zod**, `version: 2`.
- `TEMPLATES = ["xv", "boda", "cumpleanos", "baby_shower", "alice_xv", "boda_jorge_macarena"]`.
- API pública: `normalizeInvitation(raw)`, `parseInvitation(raw)` (lanza error para 400), `normalizeForRead(raw)` (GET, garantiza arrays, nunca lanza).
- Esquema: `z.discriminatedUnion("template", [...])` con campos **comunes** + **específicos** por template. Descarta claves desconocidas y normaliza formas legacy.

**Campos comunes:** `hero_image`, `og_image`, `kicker`, `tagline`, `message`, `celebrants`, `itinerary[{label,time}]`, `locations[{label,place,url,description,time_label,time_value,when_label,when_value,image,map_image}]` (**extendido en v3**), `gallery[string]`, `dress_code[{label,icon?}]`, `dress_note`, `contacts[{name,phone}]`, `contact_note`, `story` (≤4000), `music_url`, `lodging[{name,note,url?}]` (**en v3: hoteles recomendados, máx. 2**), `travel{title,airport_note,routes[{label,note}],closing_note}` (**legado**), `stay{...}` y `trip{...}` (contrato de Viaje/Hospedaje; ver §15.2 y §18), `icebreaker{...}`, `recommendations{...}` (items `{icon,title,text,phone?}`; iconos shoe/weather/transport/taxi/stay), `registry{...}` (con `bank.clabe` y `bank_eur`), `rsvp_editable`, `rsvp_edit_deadline`.

**Alergias y rango de edad en `guests` (v4):** `allergy BOOLEAN` (NULL = sin responder), `allergy_notes VARCHAR(500)`, **`age_range_id VARCHAR(80)`** y **`age_range_label VARCHAR(40)`** (snapshot del rango elegido); `age SMALLINT` queda como **legado**. El RSVP acepta `allergies: [{guest_id, has_allergy, notes}]` y `age_selections: [{guest_id, range_id}]` (opcional; `range_id` se valida contra `events.age_ranges`). Se persisten en la misma transacción que la asistencia; solo aplican a asistentes y la respuesta relee `guests` con `allergy`/`allergy_notes`/`age_range_id`/`age_range_label`. El panel y el PDF muestran `Edad: {age_range_label}` con fallback numérico al legado `guests.age`. Solo `boda_jorge_macarena` pide edad en la UI; el endpoint es compartido y el array es opcional.

> **(2026-11-09) Contrato v3 + v4:** los campos nuevos son **aditivos** y el backend los normaliza/valida para los 6 templates, pero solo la UI de `boda_jorge_macarena` los consume. `normalizeInvitation`/`normalizeForRead` garantizan `icebreaker` y `recommendations` siempre presentes y `locations` con todos los strings. `og_image` se usa en el OG por token (prioridad sobre `hero_image`/`gallery[0]`; ver §18). `lodging` vuelve a renderizarse en la hoja de Hospedaje v3 (máximo 2); `travel` sigue como legado y `itinerary`/`gallery`/`hero_image`/`contacts`/`registry_note` **no se renderizan** en v3. El delta v4 añade `phone` a las recomendaciones, las alergias por invitado y la **edad** (`guests.age`/`ages`; ver §18.1).

**Campos específicos:**

| Template | Extra |
| -------- | ----- |
| `xv` | `celebrant_name`, `parents[]`, `padrinos[]`, `registry_note` |
| `boda` | `couple{nameA,nameB}`, `registry_note` |
| `cumpleanos` | `age`, `theme_name` |
| `baby_shower` | `parents[]`, `gender`, `registry_note` |
| `alice_xv` | `celebrant_name`, `parents[]`, `padrinos[]`, `registry_note` |
| `boda_jorge_macarena` | `couple{nameA,nameB}`, `registry_note` (legado; v3 no lo renderiza) |

**RSVP editable (`rsvp_editable`)** — campo común, **nuevo** (booleano, default `false`):
- Se normaliza con `toBool(..., false)` en `commonFields` + `normalizeInvitation` del backend y su espejo en `client/src/invitation/schema/normalize.js` (`normalizeInvitation` + `toFormState`).
- Semántica: `false` = **bloqueado** tras confirmar (default); `true` = **editable siempre**.
- Editor: checkbox "Permitir que los invitados editen su confirmación" en la sección **"Confirmación de asistencia"** (`EventInvitation.jsx`).
- RSVP público (`shared/Rsvp.jsx`): si `cfg.rsvp_editable`, el formulario queda **editable/reutilizable y precargado** (con textos condicionales en el modal y en la confirmación); si no, mantiene el bloqueo actual.

**Límite de edición (`rsvp_edit_deadline`)** — campo común, **nuevo** (string, default `""`; vive en el JSONB `events.invitation` de los 6 templates):
- **Semántica:** `""` = **sin límite**; con valor, **ISO 8601 UTC con milisegundos** (`new Date(v).toISOString()`, ej. `"2026-11-01T05:59:00.000Z"`). **Solo aplica si `rsvp_editable === true`**; vencido = `Date.now() > Date.parse(...)`.
- **Puente local↔ISO** en `client/src/invitation/schema/normalize.js`: `toIsoDate` (tolerante: no parseable → `""`; idempotente) e `isoToLocalInput` (exportado); `toFormState` precarga el input en **hora local** y `serializeForm`/`normalizeInvitation` persisten ISO UTC. `server/src/schemas/invitation.js` espeja `toIsoDate` + `z.string().default("")` en `commonFields`.
- **Editor** (`EventInvitation.jsx`, "Confirmación de asistencia"): input `datetime-local` **visible solo con el toggle `rsvp_editable` activo**, label "Límite para confirmar o editar (opcional)" y botón **"Quitar límite"**; captura hora local y guarda ISO UTC.
- **RSVP público** (`shared/Rsvp.jsx`, compartido por los genéricos y `alice_xv`; la boda v3 usa `v3/RsvpSection.jsx`, ver §18): con deadline vigente muestra la nota "Podrás confirmar o modificar tu respuesta antes del {fecha}" (flags `expired`/`editingOpen`); **vencido y sin respuesta** → tarjeta "El plazo de confirmación ha terminado" (con contactos, sin formulario); **vencido con respuesta** → resumen con "El plazo para modificar la confirmación terminó."; el modal y `SubmitConfirmation` usan texto condicional; `preview` intacto.
- **Copy de motivación (commit `9d4bf71`):** nueva línea bajo el saludo con override `theme?.labels?.rsvpHelp` y fallback "Ayúdanos a confirmar tu asistencia para la organización en el salón." (visible también en `preview`, antes de la nota del límite); la preposición del límite pasa de "hasta el {fecha}" a **"antes del {fecha}"** en las 4 ubicaciones (nota de cabecera, nota del formulario, modal de confirmación y `SubmitConfirmation`). Sin cambios en estados cerrados ni en la lógica `expired`/`editingOpen`.
- **Servidor** (`server/src/routes/invitations.js`, `PUT /:token/rsvp`): **guarda 1** → `403` "El plazo para confirmar o modificar la asistencia ha terminado." si editable + deadline vencido; **guarda 2** → `403` "La confirmación ya no puede modificarse." si el grupo ya respondió y `rsvp_editable === false`; el resto del flujo intacto. La lectura de `guests` pasó a hacerse **antes de la transacción** (la respuesta del grupo se reconstruye desde esa lectura).

> **Estado (2026-10-04):** límite implementado, verificado y **commiteado** (`86be029`); el copy se ajustó después en `9d4bf71`.

**Nota del RSVP (`rsvp_note`, columna de `groups`)** — el formulario público (`shared/Rsvp.jsx`, compartido por los genéricos y `alice_xv`; la boda v3 tiene su propio `RsvpSection`) **ya no captura "Detalles / restricciones alimenticias"**: se retiraron el `textarea`, el estado `diet`/`setDiet` y su efecto de sincronización, y `SubmitConfirmation` ya no recibe `note` ni muestra la línea "Detalles recibidos: …". El payload del `PUT /:token/rsvp` **sigue enviando `note`** (prop que llega desde `group.rsvp_note` vía `InvitationPage` → `InvitationView` → `RsvpSection`) para **preservar las notas ya guardadas**; el backend guarda `NULL` si `note` no llega (`server/src/routes/invitations.js`). Enfoque intermedio descartado: `theme.rsvp.showDiet` (se revirtió sin commitear; el tema `alice_xv` volvió a su estado base).

**Mesa de regalos (`registry`)** — campo común, presente en todos los templates:
- `enabled:false`, `allow_custom:true`, `stripe_enabled:false`, `payment_link_url:""` (URL del Payment Link externo; tope `PAYMENT_LINK_MAX_LENGTH = 500`; vacío = pago integrado; ver §13.2).
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
- **Buscador y filtros de grupos (2026-10-04, `f2a179a`):** compartidos entre Invitados y Dashboard con semántica única (`client/src/lib/groupFilters.js`); detalle en §14.

### 4.2 Rangos de edad del dashboard (v4)

- **BD:** `events.age_ranges JSONB` nullable (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, aplicado con `init-db`). Contrato: array de `{ id, label, min, max }`; ids default **`baby`/`child`/`teen`/`adult`**; `max` es **exclusivo** (0–3 cubre 0,1,2; 3–12 cubre 3..11) y `max:null` = abierto. Los eventos existentes quedan con `age_ranges = NULL` y la UI usa los defaults hasta guardar.
- **API:** `PUT /api/events/:id/age-ranges` con `{ ranges }` (auth + ownership). Valida máximo **20** rangos, `id` único de 1..80 (autogenerado si falta), `label` 1..40, `min` 0..120, `max > min` y ≤120 o `null`; sin solapamientos; rango abierto solo al final; permite huecos; ordena por `min`. Devuelve `{ ok:true, age_ranges }`. `GET /api/events/:id` ya devuelve `age_ranges` (SELECT *).
- **UI:** `client/src/pages/event/AgeRangesSection.jsx` + `client/src/lib/ageRanges.js`, montado en **Dashboard** debajo de las StatCards. Defaults: **Bebé 0–3 (`baby`), Niño 3–12 (`child`), Adolescente 12–18 (`teen`), Adulto 18+ (`adult`)**. Permite editar (agregar/quitar, label/desde/hasta; los `id` son internos), **Restaurar ejemplo**, Guardar/Cancelar y valida en cliente con las mismas reglas. Tarjetas con **total** y **confirmados** por rango, más **“Sin rango de edad”** y **“Rango no configurado”**.
- **Alcance:** solo `boda_jorge_macarena` captura la edad en el RSVP (selector de rango; `guest.age_range_id`/`age_range_label`). Los rangos son **por evento** y el conteo usa `guest.age_range_id` con **fallback legado** a `guest.age` + `registered` (total = invitados en el rango; confirmados = además `registered`). `client/src/api.js` expone `events.updateAgeRanges`.

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
- Fuentes **Cormorant Garamond** + **Poppins** + **Dancing Script** + **Lato**. El **monograma de la portada** usa además **Great Vibes** vía la clase global `.font-script` de `index.css` (cargada en `client/index.html`), independiente del `--inv-font-script` del tema (Dancing Script), que es la única tipografía del **nombre completo de la portada** (`text-6xl md:text-8xl` con gradiente dorado `text-gold-gradient`).
- **Replicó toda la arquitectura de `boda_jorge_macarena`**: componentes locales propios (`decor.jsx`, `Hero.jsx`, `Countdown.jsx`, `Message.jsx`, `Itinerary.jsx`, `Locations.jsx`, `Gallery.jsx`, `DressCode.jsx`, `RegistryNote.jsx`, `Gifts.jsx`, `Padrinos.jsx`, `Footer.jsx`, `SectionNav.jsx`), portada sticky + parallax, parallax, swipe, etc. Solo comparte `shared/Rsvp.jsx`.
- **Padres y Padrinos** (`Padrinos.jsx` local; tarjeta `z-15`, justo después de la Carta): UNA tarjeta con **dos grupos** — "Mis Padres" (`cfg.parents`) y "Mis Padrinos" (`cfg.padrinos`) — con sub-encabezados tipo eyebrow con filetes y tarjetas premium (borde dorado, filete interior, diamante). Solo se renderiza (y añade el punto "Familia" en la navegación, entre Carta e Itinerario) si alguna lista tiene nombres: `nameList(value)` se exporta y `AliceXvLayout` replica el mismo saneo para omitir tarjeta/punto. Labels en `themes/alice_xv.js`: `padrinosTitle` ("Mis Padres y Padrinos"), `padrinosSubtitle`, `parentsGroupTitle` ("Mis Padres") y `padrinosGroupTitle` ("Mis Padrinos"). **Sin eyebrow "Con amor"** desde `1241bfd`: `Padrinos.jsx` ya no recibe la prop `eyebrow` y la label `padrinosEyebrow` se eliminó del tema (ver iteración del 2026-10-04, más abajo).
- **Tiene mapa embebido en Ubicaciones** (`Locations.jsx`) y **secciones en `flow`** (solo Hero y Footer sticky), igual que boda (commit `ea36bdc`).
- **Mesa de Regalos informativa, sin Stripe** (`Gifts.jsx` local): cabecera **sin título grande**: el eyebrow "Regalos" (`registryEyebrow`) es todo el encabezado, vía la prop `largeEyebrow` de `WeddingSectionTitle`, que al no recibir `title` lo renderiza como `<h2>` semántico, más grande (`text-sm tracking-[0.4em] md:text-base`, filetes `w-12`) y con el `BotanicalDivider` más cerca (`mt-3`); se retiraron el título "Mesa de Regalos", la label `registryTitle` del tema y el uso de `.text-gold-gradient-deep`; **2 tarjetas** de opciones ("Regalo", "Lluvia de sobres") con medallón en arco; **sin bloque de transferencia ni datos bancarios** (se eliminó el `GoldFrame` "Transferencia" y la lógica de `bank`/`bankLabels`/`bankRows`/`showBank`; ya no lee `cfg.registry.bank`). Sin selectores de moneda/monto, sin modal y sin copiar. La intro es **dinámica**: `registryIntro` es una función del tema que recibe el nombre de la quinceañera (`cfg.celebrant_name`, fallback "la quinceañera") y devuelve dos párrafos separados por una línea en blanco, que `WeddingSectionTitle` renderiza gracias a `whitespace-pre-line`. Imágenes SVG por defecto en `client/public/mesa-regalos/` (`regalo-sorpresa.svg`, `lluvia-de-sobres.svg` + `README.txt`; `transferencia.svg` eliminado); el componente prueba `png → webp → jpg → jpeg → svg` (el raster que suba el cliente tiene prioridad sobre el SVG), construye las URLs con `import.meta.env.BASE_URL` y muestra un medallón de respaldo si no existe ninguna. La sección y su `StackCard` (`mesa-regalos`, z-70) usan `bg-inv-bg`.
- **Textos fijos propios:** el label `gallery` ahora es **"Mis Mejores Recuerdos"** (los temas genéricos mantienen su propio texto); `familyGreeting`/`defaultMessage` del tema y el fallback interno de `alice_xv/Message.jsx` ya **no** anteponen "Familia ": va **solo el nombre del grupo** (p. ej. `"{grupo}, cuéntanos quiénes podrán acompañarnos."`), mientras el resto de plantillas conserva "Familia …" en `shared/*` y sus temas. En la **portada** (`alice_xv/Hero.jsx`) también se retiró el prefijo **"Invitación para la"** del texto inferior: ahora muestra **solo el nombre del grupo** (`{family}`), conservando el span rosa con `capitalize` y su animación `entrance(4)`. El **sobre digital no se tocó**: su carta interior sigue mostrando "Invitación para {familia}". La **Carta** (`alice_xv/Message.jsx`) queda **sin firma al pie**: se eliminaron el bloque "Con cariño" + nombre en script y la variable `signature`; el resolver `theme.resolvers.signature` sigue definido en `themes/alice_xv.js` pero **ya no se consume** en `alice_xv` (lo consumen `shared/Message.jsx` y `boda_jorge_macarena/Message.jsx`).
- ⚠️ **NO tiene fondos de foto por sección** (no existe `SectionPhoto.jsx`): decisión explícita del usuario.
- Monograma con inicial dinámica de `celebrant_name` en **Great Vibes** (clase global `.font-script`, acabado `monogram-gold` para el gradiente dorado, `clamp(4.5rem, 20vw, 10rem)` y animación `entrance(0)`), fecha larga y contador propio.
- ⚠️ **Pendiente:** el `description` de `themes/alice_xv.js` sigue diciendo **"Lavanda y dorado"** (desactualizado tras el cambio a rosa pastel + blanco + dorado).

> **Iteración del 2026-09-16 (commiteada en `3b68ef8`; memoria en `5f51647`):** cabecera de la Mesa de Regalos simplificada —el eyebrow "Regalos" pasa a encabezado con `largeEyebrow` (`title` ahora opcional en `WeddingSectionTitle`); se retiran el título grande, el uso de `.text-gold-gradient-deep` y la label `registryTitle`— y **monograma de la portada en Great Vibes** (clase global `.font-script`). **Cierre del mismo día:** el **nombre completo de la portada** (`alice_xv/Hero.jsx`) pasa a **una sola tipografía** —la script del tema (`font-inv-script`, Dancing Script) con **gradiente dorado** (`text-gold-gradient`), `text-6xl md:text-8xl`, dentro del mismo `motion.h1` con `entrance(1, 0.25)`—; se elimina el split previo (primera palabra en `font-inv-serif`, resto en script) y las constantes `nameParts`/`firstName`/`lastName`. El botón flotante de `alice_xv/SectionNav.jsx` queda **abajo a la derecha en móvil** (`bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-4`, sin `translate`) y desde `md` conserva el centrado vertical derecho (`md:bottom-auto md:right-5 md:top-1/2 md:-translate-y-1/2`); tamaño, colores, aria-labels y la columna de dots no cambian. La primera tarjeta de la Mesa de Regalos pasa a **"Regalo"** (antes "Regalo sorpresa": `registryOptionSurprise` en `themes/alice_xv.js`, FALLBACK de `Gifts.jsx` y descripción del `README.txt`; el archivo de imagen sigue siendo `regalo-sorpresa.svg`). Iteraciones previas del mismo día, ya commiteadas: retiro del bloque de transferencia, intro dinámica y textos fijos (`a38d940`; memoria en `bdb245f`), después de Padres/Padrinos + Mesa de Regalos informativa + bloqueo de scroll del sobre (`a241198`, §7; memoria en `61520ef`). **Nueva iteración del mismo día:** el **RSVP pierde los "Detalles / restricciones alimenticias"** en todas las plantillas (`shared/Rsvp.jsx`: se retiran el `textarea`, el estado `diet`/`setDiet` y la línea "Detalles recibidos" de la confirmación, mientras el payload **sigue enviando `note`** para preservar notas existentes, ver §4); la **Carta de `alice_xv` queda sin firma al pie** (bloque "Con cariño" + variable `signature` retirados); y la **landing se alinea**: `FeatureRsvp.jsx` elimina el bullet "Restricciones alimenticias y periqueras" y reescribe el lead, y `RsvpCardMock.jsx` elimina el bloque de tags ("Sin gluten", "2 periqueras") y sus menciones en comentario/`aria-label` —las clases `de-rsvp__tags`/`de-rsvp__tag` de `landing.css` quedan definidas sin uso—.

> **Iteración del 2026-10-04 (commiteada en `6ca17df`):** la Mesa de Regalos de `alice_xv` gana un **popover informativo** en la tarjeta "Lluvia de sobres" (`alice_xv/Gifts.jsx`): `GiftOptionCard` acepta la prop `info` y **solo** esa tarjeta muestra un botón circular **"?"** abajo a la derecha, que abre el texto con **clic/hover de ratón/foco** y lo cierra con **Escape** o clic fuera (accesible: `aria-expanded`/`aria-controls`, `prefers-reduced-motion`); la tarjeta "Regalo" **no cambia**. El texto vive en la label `registryOptionEnvelopesInfo` de `themes/alice_xv.js` ("Consiste en una aportación económica voluntaria; tendremos sobres y un buzón a tu llegada."), con fallback en `FALLBACK.envelopesInfo` de `Gifts.jsx`.

> **Iteración del 2026-10-04 (commiteada en `1241bfd`):** el sobre de apertura (`envelope/EnvelopeLoader.jsx`) cambia su hint de "Toca o desliza hacia arriba para abrir" a **"Toca para abrir"** en todas las plantillas con sobre (`xv`, `boda`, `alice_xv`, `boda_jorge_macarena`); los gestos quedan intactos (tap, arrastre, teclado, `prefers-reduced-motion`). En `alice_xv`, **Padres y Padrinos pierde el eyebrow "Con amor"**: `Padrinos.jsx` ya no recibe la prop `eyebrow` y la label `padrinosEyebrow` se elimina de `themes/alice_xv.js`; en `alice_xv/decor.jsx`, `WeddingSectionTitle` **omite la fila ornamental (filetes + span) cuando no hay eyebrow** y mantiene el comportamiento con eyebrow, incluido el caso de `title` ausente donde el eyebrow es el `<h2>` (p. ej. la Mesa de Regalos).

**`boda_jorge_macarena` — Boda de "Jorge & Macarena" (pedido especial, diseño v3 vigente):**

> ⚠️ **(2026-11-10) La plantilla usa el diseño v3 + delta v4** (ver **§18/§18.1**). No hay plantilla nueva ni selector v2/v3/v4. El v2 editorial (2026-10-11) y el diseño nocturno anterior (`719f2b4`) quedan como **histórico** en §15/§16. El código v4 está en el **working tree, sin commit ni push**.

- **Diseño v3 + v4:** papel de algodón (`.algodon`), **marco nazarí** (`NazariFrame`), **granada en acuarela** y dibujos `.webp` con `multiply`, **letterpress** y tipografías **Cormorant Upright + Nikolai Condensed** (fallback Noto Serif Display). El v4 añade **“Ver ideas”** en Vestimenta, la recomendación **“Moverse por Granada”** y **alergias** en el RSVP (ver §18.1).
- **Orden de tarjetas:** Portada · Granada, España · Icebreaker · Ceremonia · Celebración · Vestimenta · Recomendaciones · Viaje · Hospedaje · Confirmación · Regalo · Cierre. No se montan Itinerario, Galería ni Contactos.
- **Componentes:** `BodaJorgeMacarenaLayout.jsx` monta `v3/*` y usa `v3.css`; `alice_xv` permanece intacta. Los archivos v2 siguen en disco pero **no se importan**.
- **Editor:** `BodaJorgeMacarenaV3Editor.jsx` (historia/música, `og_image`, Icebreaker, Recomendaciones —incluido `phone`—, ubicaciones extendidas, hoteles máx. 2, cita de Hospedaje, correo de mensajes) y `StayTravelEditor.jsx`; `EventInvitation.jsx` oculta las secciones genéricas cuando el template es la boda.
- **RSVP v3 + v4:** `v3/RsvpSection.jsx` (familias reales, sin “Líder”, sin modal/contactos, contador en hora de España, estados enviado/plazo cerrado y **alergias + edad por asistente**), con `rsvp_editable`/`rsvp_edit_deadline`.
- **Regalo v3:** `v3/GiftsSection.jsx` (Stripe embebido o Payment Link, CLABE/IBAN, cuenta EUR y mensaje privado a los novios) + bandeja `/events/:id/mensajes`; el correo del evento 2 ya está configurado y hay 1 mensaje guardado.
- **Datos:** `server/src/scripts/update-event-macarena-v3.js` actualiza el evento 2 por merge (dry-run/`--apply`) con **5 recomendaciones** y `c-p10`; el seed v4 y las columnas de alergia/**edad** ya están aplicados (198 `age` NULL al momento).
- ✅ El doc `INVITACION_BODA_JORGE_MACARENA.md` quedó **actualizado al v4** el 2026-11-10; describe este rediseño.

---

## 7. Despliegue y BD (gotchas importantes)

### Conexión a Supabase en Railway
- Railway **no tiene salida IPv6**; la conexión DIRECTA (`db.<ref>.supabase.co`) resuelve a IPv6 y falla con `ENETUNREACH`.
- ✅ **Usar el POOLER de Supabase**:
  - **Session pooler** (puerto **5432**): recomendado para `pg`.
  - Transaction pooler (puerto **6543**): puede dar errores de *prepared statements*.
- `server/src/db/index.js` ya mitiga esto con `dns.setDefaultResultOrder("ipv4first")` + `ipv4ConnectionString()` (resuelve host a IPv4 literal). Aun así, el pooler es la solución robusta.

### Variables de entorno (Railway)
`DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL` (debe ser la URL pública de Railway; **una sola URL**, ver nota abajo), `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, (`CLOUDINARY_*` opcionales), (`ALLOWED_ORIGINS` opcional), **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` (opcionales; sin `STRIPE_SECRET_KEY` los pagos degradan a 503). `PORT` lo inyecta Railway (default 4000 local).

> **`CLIENT_URL` tolerante a listas (`be5e9c6`) — blindaje tras el doble enlace en WhatsApp:** en producción `CLIENT_URL` estaba configurada como lista separada por comas (patrón de `ALLOWED_ORIGINS`) y `buildInvitationUrl` concatenaba el valor completo → `https://displayevent.com,https://displayevent.online/invitacion/...`; WhatsApp auto-enlazaba ambos tramos (landing + invitación). Fix: helper `server/src/utils/clientUrl.js` (toma el **primer** valor separado por comas, hace `trim`, quita barras finales y cae a `http://localhost:5173` si queda vacío), usado en `utils/whatsapp.js` (enlaces de invitación), `routes/invitations.js` (Stripe), `routes/auth.js` (verificación por correo) e `index.js` (host canónico); `server/.env.example` aclara que `CLIENT_URL` es **UNA sola URL** y que las listas van en `ALLOWED_ORIGINS`. ⚠️ **Pendiente operativo (ver §8):** corregir `CLIENT_URL` en **Railway** a una sola URL (`https://displayevent.com`; el host canónico definitivo está en decisión — ver §15); los **mensajes ya guardados** y la **plantilla de Meta** podrían contener el texto viejo del enlace (no se tocaron).

### Deploy en Railway (2026-10-11)
- **Plataforma confirmada por el usuario: Railway.** `render.yaml` queda como **legacy** de Render (Railway lo ignora; se conserva o se borra por decisión humana).
- **Railpack** detecta automáticamente los scripts del `package.json` **raíz**: `build` (`npm ci` de server+client + `vite build`) y `start` (`node server/src/index.js`); `PORT` lo inyecta Railway y `NODE_ENV=production` lo fija Railpack. **No hacen falta** `Procfile`, `railway.json` ni `nixpacks.toml` (no existen en el repo).
- **Healthcheck:** `GET /api/health` (configurar en Settings → Deploy). **Node:** hoy "lts" automático (local v22); opcional fijar versión con `RAILPACK_NODE_VERSION` o `engines.node`.
- **Deploy desde GitHub** (`EduardoGonzalez26/DisplayEvent`, rama `main`): un push dispara el deploy de Railway. Hay commits locales de pagos pendientes (`ff2b988`, `a9610b6`, `6fbc07c`); el estado de v3/v4 se documenta en §18.
- **Disco efímero:** igual que en Render → configurar **Cloudinary** para persistir fotos/audio (y para que el OG tenga imagen) o montar un **volumen en `/app/server/uploads`**. **Serverless/sleep** (opt-in) debe quedar **DESACTIVADO** para la boda.

### Dominio personalizado en Railway (runbook 2026-10-11)
- Settings → Networking → **+ Custom Domain**; el dashboard muestra un **CNAME target tipo `xxxxx.up.railway.app`** y un **TXT de verificación de propiedad**: **ambos obligatorios** (sin el TXT el dominio responde **404**).
- SSL **Let's Encrypt automático** (≤1 h). Límite de plan: **Trial = 1** dominio personalizado (apex **o** www), **Hobby = 2**.
- Registradores sin flattening/ALIAS (GoDaddy, Route 53, Hostinger, NameSilo, Azure DNS, SquareSpace…): recomendar mover **nameservers a Cloudflare**; con Cloudflare: **CNAME `@` → target con proxy ON** y SSL **"Full"** (no Strict).
- `www` → apex no existe en Railway (Cloudflare Bulk Redirect o 301 del backend; ver §13.4).

### BD / esquema
- `server/.env` está **git-ignored** (contiene secretos). Usa `.env.example` como plantilla.
- Crear tablas: `cd server && npm run init-db` (idempotente).
- Backfill v2: `npm run backfill-invitation-v2`.
- ⚠️ **Stripe Connect (actualizado 2026-10-22):** `npm run init-db` crea la tabla `stripe_accounts`, las columnas legacy `events.stripe_account_mxn/eur` y la nueva **`events.stripe_account_id TEXT`** (nullable, **sin FK, sin índice y sin backfill**; SQL en `schema.sql`). La migración de `stripe_account_id` **se aplicó** el **2026-10-22** con `npm run init-db` en la **BD configurada en `server/.env` (Supabase remoto)**; el código que la usa se commiteó en `138fe3f` (base desplegada); la restricción visual (`ff2b988`), el blindaje (`a9610b6`) y el panel (`6fbc07c`) siguen locales, pendientes de deploy. En **cualquier otra BD/entorno** hay que ejecutar `npm run init-db` **ANTES** de desplegar ese código: sin las columnas del bloque Connect, `GET /api/invitations/:token` responde **500** (verificado en local; ver §15.1).
- **Tabla `gifts`** (regalos confirmados vía Stripe): `event_id`, `group_id`, `amount_minor` (BIGINT), `currency`, `status`, `stripe_payment_intent_id`, **`livemode`**, **`destination_account`**, **`stripe_checkout_session_id`**, `created_at`. Índice único `idx_gifts_payment_intent` para idempotencia del webhook + índice **`idx_gifts_event_mode_date`** para el panel. La BD ya tiene las columnas y el backfill: **ids 9/10 test (`livemode=false`, destination NULL)** y **ids 11/12/13 live** con destination `acct_1UPr9eC0wYMF53iO`. La migración se aplicó con `npm run init-db`; en otras BD sigue siendo requisito antes del deploy (ver §15.1.1).
- **Tabla `gift_messages` (v3, 2026-11-09):** mensajes privados de la mesa de regalos (`event_id`, `group_id`, `sender_name`, `message`, `amount_minor`, `currency`, `channel` transfer/card, `created_at`, `read_at`; índice `idx_gift_messages_event`). Se crea con `npm run init-db` (`server/src/db/schema.sql`); en la BD del evento 2 ya está aplicada (el correo está configurado y hay 1 mensaje guardado).
- **`events.gift_message_email` (v3):** correo opcional del anfitrión para avisos de mensajes; `ALTER TABLE` idempotente en `schema.sql`. Se edita en el panel y se guarda con `PUT /api/events/:id` (semántica ausente = conservar; vacío = borrar). Ya está aplicado en la BD del evento 2 (correo configurado; 1 mensaje guardado).
- **`events.age_ranges` (v4):** JSONB nullable con `[{ id, label, min, max }]`; los eventos existentes quedan en `NULL` y el dashboard aplica los defaults hasta guardar. Migración aplicada con `init-db` (ver §4.2 y §18.1).
- **`guests.age_range_id` / `guests.age_range_label` (v4):** rango elegido en el RSVP (`VARCHAR(80)`/`VARCHAR(40)`) + snapshot del label; índice `idx_guest_age_range`. `guests.age SMALLINT` queda como legado.
- **Slug de eventos (`events.slug`)**: en BD existentes, `npm run init-db` es **requisito manual** para crear la columna y el índice único parcial (`schema.sql`/`init.js` son idempotentes). Ya aplicado en la BD local del usuario; **verificar al desplegar**.

### CORS
`server/src/index.js` rechaza orígenes no permitidos → **403 "Origen no permitido por CORS"**, según `CLIENT_URL` / `ALLOWED_ORIGINS`. Configura `CLIENT_URL` con la URL pública real (**una sola URL**) o el frontend quedará bloqueado; `ALLOWED_ORIGINS` es la variable para **listas separadas por comas**.

### Estilos públicos de la invitación
- **Scrollbar botánica:** `client/src/invitation/InvitationPage.jsx` añade/elimina la clase `de-invitation` en `<html>`; `client/src/index.css` tiene reglas scoped `html.de-invitation` (thumb verde `#2C4C3B`, hover naranja `#E76F51`). El scrollbar global del admin usa `--tone-*`. (Nota: es verde de la paleta de boda; `alice_xv` la hereda.)
- `client/src/index.css` define además la utility `.envelope-focus:focus-visible` (outline con `--inv-envelope-focus`), `.drop-cap` y la clase aditiva `.text-gold-gradient-deep` (variante **profunda** del dorado, legible AA sobre blanco; sigue definida junto a la var `--inv-gold-gradient-deep` de `themes/alice_xv.js`, aunque la cabecera de la Mesa de Regalos de `alice_xv` **ya no la usa** tras simplificarse a eyebrow elevado).
- **Sobre de apertura** (`envelope/EnvelopeLoader.jsx`): rediseñado; el overlay centra SOLO el sobre (el texto de ayuda es `absolute`), estilo 100% `var(--inv-envelope-*)` con fallbacks, y prop nueva `family` (desde `InvitationView.jsx`) que permite mostrar "Invitación para {familia}" en la carta interior. Mientras está montado (sobre visible o animándose) **bloquea el scroll de la página** y lo libera al desmontarse tras `onOpen`: añade la clase `de-envelope-lock` a `<html>` (reglas aditivas en `index.css`: `overflow: hidden`, `overscroll-behavior: none`, `touch-action: none`), compensa el ancho de la scrollbar con `padding-right` (sin salto de layout), hace `window.scrollTo(0, 0)` y cancela la rueda del ratón con un listener `wheel` no pasivo (cleanup exacto, StrictMode-safe). Aplica a todas las plantillas con sobre; el **preview del editor no monta el sobre** (`showEnvelope = !preview && !!opening?.envelope && !envelopeOpen`).

---

## 8. Decisiones / pendientes

> ⚠️ **(2026-11-10) La plantilla vigente es v3 + delta v4 (§18/§18.1).** Los pendientes de esta sección que hablan de v2, `SectionPhoto`, IATA, `ff2b988`, `8d70217`/`efb424b` o del deploy de Viaje/Hospedaje se conservan como **histórico**. Los pendientes **reales v4** son:
>
> - [ ] **Falta `client/public/fonts/Nikolai-Condensed.woff2`.** `v3.css` lo declara con `@font-face`; mientras no exista, la familia cae a `Noto Serif Display`/Georgia. El directorio `client/public/fonts/` está vacío.
> - [ ] **Commit/deploy + smoke:** no hay commit v4; falta `npm run build`, smoke de Vestimenta/Recomendaciones/RSVP (asistencia + alergia + edad), PDF y verificación de la bandeja de mensajes en el dominio.
> - [ ] **Assets v4:** confirmar que `c-p10.webp`, los 6 `idea-*.jpg` y el `c-p1.webp` actualizado entran al build/deploy.
>
> **Estado aplicado v4:** `npm run init-db` aplicó las columnas de alergia (`guests.allergy`, `guests.allergy_notes`), **`guests.age_range_id`/`age_range_label`**, **`events.age_ranges`** y el esquema de mensajes; el seed del evento 2 ya tiene 5 recomendaciones con `recommendations.image = invitations/macarena-jorge-v3/c-p10.webp`. **Al momento de este ajuste hay 198 invitados con `age_range_id`/`age_range_label` NULL; los eventos existentes tienen `age_ranges = NULL` (defaults en la UI hasta guardar).** El **correo de mensajes del evento 2 ya está configurado** en el panel y existe **1 mensaje guardado** (actividad externa: no tocar). Las decisiones v3 siguen vigentes (contactos ocultos, música opcional, tren apagado, fidelidad de diseño, portada del dominio v3). Detalle del delta en §18.1.

- [x] ~~Landing pública de marketing en `/` (panel en `/eventos`) + SEO~~ → hecho (`19a9a4d`; marca/dominio `displayevent.com` commiteados en `c657c81`/`c7a3146`; rediseño posterior en `32cb71e`, ver §10 y §11.2).
- [x] ~~URLs bonitas `/invitacion/<slug>/<token>`~~ → hecho (`1b69831`); la ruta legacy `/invitacion/<token>` se mantiene.
- [x] ~~Reproducir `PhotoBackdrop` en `alice_xv`~~ → **descartado**: `alice_xv` **no** usa fondos de foto por sección (decisión del usuario). `PhotoBackdrop.jsx` fue **eliminado** (sustituido por `SectionPhoto.jsx`, solo boda).
- [ ] **Actualizar `description` de `themes/alice_xv.js`** ("Lavanda y dorado" → rosa pastel + blanco + dorado).
- [x] ~~**Actualizar el doc `INVITACION_BODA_JORGE_MACARENA.md`** (describía el diseño anterior azul noche/dorado)~~ → actualizado al **v4** el 2026-11-10 (ver §18/§18.1).
- [x] ~~*(Rendimiento)* Evaluar el coste de `backdrop-blur`~~ → **ya no aplica**: las tarjetas no usan `backdrop-blur` (fondo opaco + foto en capas `absolute`).
- [ ] *(Histórico v2)* ~~**Ajuste estético del scrim de `SectionPhoto`**~~ → la boda v3 ya no usa `gallery`/`SectionPhoto`; el papel y los dibujos son fijos (ver §18).
- [ ] *(Histórico v2)* **Deuda Tailwind `@theme`** de la boda v2 (ver §15): la v3 usa mayormente CSS propio (`v3.css`), pero el puente `--color-inv-*`/`--font-inv-*` sigue en el tema v2 y afecta a piezas compartidas. Resolver de raíz en Fase B.
- [ ] **Fase B (planificada; ver §18):** adoptar el diseño **v3** (tema + secciones + campos) en `xv`, `cumpleanos` y `baby_shower`; **`alice_xv` intacta** (decisión del usuario). Incluye quitar el gating por template del editor v3 y de **Viaje/Hospedaje** (`StayTravelEditor`).
- [ ] **Smoke test del guardado real del editor v3 con sesión** (los bloques nuevos no se han guardado E2E).
- [ ] **Verificar `music_url`** del evento: la música se mantiene, pero el botón solo se monta si hay URL; si sigue apuntando a YouTube, el `<audio>` nativo no lo reproduce (subir MP3/M4A/OGG desde el panel).
- [x] ~~**Confirmar plataforma de despliegue real** (Railway vs Render)~~ → **Railway confirmado por el usuario (2026-10-11)**; `render.yaml` queda como legacy (ver §7 y §15).
- [x] ~~**Commit + push pendientes de aprobación**~~ → hecho: la fase quedó commiteada (`a60d442`, `1ea314f`, `2718f6f`, `2abf462`) y **pusheada a `origin/main`**; el working tree de código quedó limpio **en ese momento**. La portada se commiteó en `fae3ca5`, los hoteles/scroll en `389403d`, **§15.2** (Viaje/Hospedaje) en **`4773112`** y sus ajustes en **`8d70217`** (Madrid) y **`efb424b`** (sin IATA); el working tree de código está limpio al 2026-11-13.
- [ ] **Cloudinary en producción:** activar `CLOUDINARY_*` (el disco de Railway es efímero) para persistir fotos/audio y para la imagen del OG; alternativa: volumen en `/app/server/uploads`; **sleep/serverless desactivado**.
- [ ] **Verificar el OG con crawler tras el deploy** (User-Agent de WhatsApp/Facebook) en el dominio real: portada de la raíz (título, imagen y canonical del evento) e invitación personalizada (`/invitacion/<token>`).
- [ ] **Stripe Connect — pendientes (ver §15 y §15.1):** activación live **verificada** (claves `sk_live_`/`pk_live_` + `STRIPE_WEBHOOK_SECRET` en `server/.env`) y **webhook live** enabled en `https://macarenayjorge.com/api/webhooks/stripe` (`account.updated` y `checkout.session.completed` en el código desplegado; `a9610b6` agrega `async_payment_succeeded`/`async_payment_failed`; endpoint API `2026-09-30`, SDK `2024-06-20`). La cuenta del evento 2 es **webi/BBVA** (`acct_1UT7NAFnv8uJBZLH`). Falta **push/deploy de `ff2b988`, `a9610b6` y `6fbc07c`**, verificar las variables live en **Railway**, probar un pago live nuevo y el panel, **decidir los MX$20 pagados a Akala** y **decidir si se eliminan las otras 3 cuentas Stripe o solo se ocultan**. La **API de Stripe del SDK (`2024-06-20`) está desactualizada** (preexistente). Documentar que los descriptores/merchant-of-record en cargos ES cambian con `on_behalf_of`. **Plan B de moneda decidido** (cuenta MX única + conversión automática; commiteado en `2abf462`); Plan A (cuenta ES) como opción futura.
- [ ] ⚠️ **Orden de despliegue (Stripe Connect, actualizado 2026-10-22):** la columna `events.stripe_account_id` **ya está aplicada** en la BD configurada en `server/.env` (Supabase remoto); en **cualquier otra BD/entorno** hay que correr `npm run init-db` **antes** de desplegar. Sin las columnas `stripe_accounts`/`events.stripe_account_*`, `GET /api/invitations/:token` responde **500** (ver §15.1).
- [ ] **Producción de la boda (runbook Railway §7/§15, sin ejecutar):** dominio `macarenayjorge.com` (Settings → Networking; **CNAME target + TXT de verificación**, ambos obligatorios), `custom_domain` del evento en el panel, `npm run init-db` en cualquier BD distinta de la ya migrada y las 3 vars Stripe exactas (**live** ya presentes en `server/.env`; **verificar en Railway**). **Decisiones abiertas:** host canónico (`CLIENT_URL`); Stripe: **Plan B decidido** (una cuenta MX + conversión automática de EUR; ver §15).
- [ ] **Re-agregar 3D** (perlas XV, anillos boda) cuando el usuario lo indique. Escenas inertes en `client/src/invitation/3d/`.
- [ ] **Stripe (live):** el entorno verificado el **2026-10-22** ya usa claves **live** (`sk_live_`/`pk_live_`) y `STRIPE_WEBHOOK_SECRET`; el webhook live está configurado. Falta **verificar las variables en Railway**, **pushear/desplegar `ff2b988`, `a9610b6` y `6fbc07c`** y probar el flujo completo. El modelo sigue siendo **Stripe Connect** (destination charges, **100% al anfitrión**, sin `application_fee`; **Plan B de moneda**: cuenta MX única + conversión automática; ver §15). La cuenta del evento 2 es webi/BBVA (`acct_1UT7NAFnv8uJBZLH`; ver §15.1). Sin claves, el código degrada con gracia (pago responde 503); paso test→prod documentado en `server/.env.example`.
- [x] ~~**Seleccionar explícitamente la cuenta Connect del evento 2**~~ → asignada en BD: `acct_1UT7NAFnv8uJBZLH`. Falta desplegar la UI restringida de `ff2b988`.
- [ ] **Revisar los 3 pagos live históricos** (MX$10, €1 y MX$20) y conciliar el MX$20 pagado a Akala (ver §15.1.1).
- [ ] **Definir los montos reales de la mesa de regalos del evento 2** (hoy `allow_custom:false`, mínimos `0`, `suggested_mxn:[10]`, `suggested_eur:[10,1]` y banco habilitado; ver §15.1).
- [ ] **Decidir qué hacer con los MX$20 pagados a Akala** (reversión con Stripe/banco, compensación manual o asumirlo como pérdida); no se movió nada.
- [ ] **Push + deploy de `ff2b988`, `a9610b6` y `6fbc07c`**; después, smoke del selector, del checkout y del panel en el dominio.
- [ ] **En BD distintas de la configurada, ejecutar `npm run init-db` antes del deploy** para aplicar las columnas de `gifts` (`livemode`, `destination_account`, `stripe_checkout_session_id`), los índices `idx_gifts_payment_intent`/`idx_gifts_event_mode_date` y las columnas de WhatsApp/slug/custom_domain (ver §7, §12 y §13). La BD configurada ya tiene el backfill de pagos y la cuenta del evento 2.
- [ ] *(Opcional)* Robustez `.env`: `server/src/db/index.js:6` y `server/src/middleware/auth.js:4` leen `process.env` **antes** de que `server/src/index.js:23` cargue `server/.env` con ruta absoluta (afecta al arranque local con `npm start`; en Railway no, porque las env vars vienen de la plataforma). Fix sugerido: config compartida de dotenv (ver AUDITORIA.md §4.5).
- [ ] *(Menor)* `robots.txt` sin línea `Sitemap:`: añadir `Sitemap: https://displayevent.com/sitemap.xml` (ver AUDITORIA.md §4.5).
- [ ] *(Opcional)* Aplicar soporte de `hero_image` a los formatos genéricos `xv` y `boda` (hoy solo lo soportan `cumpleanos`, `baby_shower` y `alice_xv`).
- [ ] **Envío por WhatsApp (`8fd76c1`, docs en `91b407d`; ver §10 y §12):** revisión profunda de SecDevOps **cancelada** (smoke básico OK: `/api/health` 200, `GET .../whatsapp` sin sesión 401, `POST` con `Origin` ajeno 403); falta probar el flujo manual completo en el panel; activar el modo `cloud` cuando existan credenciales y plantilla Utility aprobada de Meta.
- [ ] **Dominio personalizado + Payment Link externo (2026-09-21; ver §13):** confirmar compra/DNS del dominio `macarenayjorge.com` y ejecutar los runbooks de Railway y de la cuenta Stripe de la pareja; después, **commit + deploy + smoke final**. El smoke debe cubrir `npm run build`, `init-db` en la BD desplegada, enlaces con dominio, footer sin marca en el host propio, Payment Link y CORS. ⚠️ (2026-10-19) El runbook vigente es de **Railway** (§7/§15); el pago con tarjeta pasó a **Stripe Connect** (§15) y el Payment Link externo sigue disponible; la raíz del dominio ya no muestra la landing sino la portada pública de §16 (commiteada en `fae3ca5`; la base ya está desplegada y queda el redeploy de `8d70217`/`efb424b`).
- [ ] **Portada pública del dominio propio (2026-10-19; ver §16):** implementada, verificada y **commiteada en `fae3ca5`**; la base ya está desplegada y queda el redeploy de **`8d70217`/`efb424b`**. La iteración de **"La estancia" + hoteles + scroll suave** quedó **commiteada en `389403d`**; **§15.2** (Viaje/Hospedaje) se commiteó en **`4773112`** y sus ajustes en **`8d70217`** (Madrid) y **`efb424b`** (sin IATA). El working tree de código está limpio al 2026-11-13; solo quedan cambios documentales.
- [ ] **Push de `8d70217`, `efb424b` y `ff2b988`; redeploy** para que la llegada fija a Madrid, la UI sin IATA y la cuenta Stripe restringida estén en el bundle desplegado (la base `4773112` ya está desplegada y el API ya devuelve `stay`/`trip`; ver §15.2 y §15.1).
- [ ] **Hard refresh del panel** para descartar caché y confirmar que se ve el editor de Viaje/Hospedaje (el bloque viejo “Hospedaje y viaje” es caché; el bundle `EventInvitation-B0EhP2gA.js` ya contiene el editor de la base `4773112`; no hay service worker).
- [ ] **Decidir si se eliminan las otras 3 cuentas Stripe o solo se ocultan** (hoy siguen en `stripe_accounts`/Stripe; ver §15.1).
- [ ] **Verificar en `macarenayjorge.com` el mapa, los carruseles y los links con fechas** tras el redeploy, tanto en la portada (04/05) como en la invitación personalizada.
- [ ] **Decidir si se elimina el legado `lodging`/`travel`** del JSONB y del contrato; hoy se conserva (el evento 2 mantiene 2 hoteles en `lodging`) y la UI nueva no lo renderiza.
- [ ] **Confirmar la ubicación real de la Misa** (hoy placeholder "Sagrada Familia" en `cfg.locations`; no está confirmada).
- [ ] *(Opcional)* **Fecha separada de traslado a Granada** en `trip` (hoy solo `date_from`/`date_to`).
- [x] ~~**Hoteles/Booking en lugar de la mesa de regalos en la portada**~~ → **hecho (2026-10-19):** "La estancia" con **Parador de Granada** (destacado) y **Hotel América Granada** (secundario) cargados en `invitation.lodging` del evento id 2, con enlaces de mapa/reserva. Sin migración ni cambio de esquema (ver §16.1). **Sustituido por §15.2** (Viaje/Hospedaje, commit `4773112`); los hoteles quedan como legado.
- [ ] **Validación visual final de Viaje/Hospedaje en el dominio tras el deploy:** mapa, tarjetas, carruseles, links y estados vacíos (sustituye la validación de "La estancia" de §16.1).
- [x] ~~**Commit/push de la iteración de hoteles + scroll suave**~~ → hecho en `389403d` (2026-10-19); la sección de hoteles fue reemplazada por §15.2 en el commit `4773112`.
- [ ] **Integración futura de disponibilidad/precios reales de Booking:** requiere API o programa de afiliados; hoy los enlaces son directos o búsquedas, sin disponibilidad en vivo.
- [x] ~~**Commitear las features implementadas el 2026-10-04**: límite de edición del RSVP (`86be029`), copy del RSVP (`9d4bf71`) y popover informativo en la Mesa de Regalos de `alice_xv` (`6ca17df`)~~ → hecho; el mismo día se commitearon también el sobre "Toca para abrir" + Padres y Padrinos sin eyebrow (`1241bfd`) y el `CLIENT_URL` tolerante (`be5e9c6`).
- [ ] **Buscador y filtros de grupos (`f2a179a`; ver §14):** verificado con `npm run build` (544 módulos) y aserciones del helper `groupFilters`; falta solo la **pasada visual en navegador**.
- [ ] **Exportación del resumen de invitados a PDF (2026-10-24; ver §14.1):** implementación local correcta y verificada con datos sintéticos/API simulada; falta **commit/deploy** y la **prueba contra el backend real**. El working tree de código está limpio al 2026-11-13.
- [ ] **Corregir `CLIENT_URL` en Railway a una sola URL:** causa raíz del doble enlace de WhatsApp; el fix de código ya está en `be5e9c6` (ver §7). El host canónico definitivo está en decisión (`displayevent.com` vs `macarenayjorge.com`; ver §15). Los **mensajes ya guardados** y la **plantilla de Meta** podrían contener el texto viejo del enlace (no se tocaron). La portada de §16 **no cambió** esta decisión ni el valor de `CLIENT_URL`.
- [ ] **Badge "Powered by Webi"** (solo invitación personalizada de `boda_jorge_macarena`): hoy se muestra también en dominio propio (`hideBrand` solo oculta la línea "DisplayEvent"); decidir si se oculta junto con la marca (ver §13.3). La portada de §16 no muestra marcas.
- [ ] **Decidir `www` → apex** para el dominio personalizado: Railway no provee la redirección (Cloudflare Bulk Redirect o 301 del backend; ver §13.4). La portada de §16 resuelve `www` (normaliza el host) y canonicaliza al dominio guardado, pero la redirección operativa sigue pendiente.
- [x] ~~*(Menor)* **`X-Robots-Tag` en `/` raíz** del dominio propio: hoy solo lo añade el fallback SPA; `/` lo sirve `express.static` sin header (ver §13.2).~~ → **resuelto por §16:** `express.static(..., { index: false })` hace que `/` pase por el catch-all; la raíz custom se sirve con `robots: index, follow` y sin `X-Robots-Tag`, mientras las demás rutas del host conservan `noindex`.
- [ ] *(Menor)* **Documentar `ALLOWED_ORIGINS` en `server/.env.example`**: hoy la variable solo se lee del entorno y no aparece en el template (ver §13.4).
- [x] ~~**Corregir el error de sintaxis de `server/src/db/init.js:1`**~~ → corregido 2026-09-14 por el agente de BD; `node --check` OK, `init-db` re-ejecutado con éxito y las 3 columnas re-verificadas en `information_schema.columns`.
- [x] ~~**Commitear** el rediseño de la landing y el envío por WhatsApp~~ → hecho: landing `32cb71e` y WhatsApp `8fd76c1` (docs en `91b407d`; ver §10 y §12).

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

## 10. Landing + WhatsApp: cambios ya commiteados (`32cb71e`, `8fd76c1`)

Inventario verificado con `git status` el 2026-09-14: **29 archivos** — 6 nuevos, 21 modificados y 2 eliminados. Los dos bloques de abajo **ya están commiteados** (`32cb71e` rediseño de la landing, §11.2; `8fd76c1` envío por WhatsApp, §12; memoria en `91b407d`). El bloque de marca/SEO de la sesión anterior (logo real, `favicon.svg`, `og-image.png`, dominio `displayevent.com`) quedó en `c657c81`/`c7a3146`. Este inventario se conserva como registro.

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

- `/` → **landing pública de marketing** (`client/src/landing/**`) en el host de la plataforma. Se renderiza con una **rama temprana** (`isLanding`, antes de auth/panel) y está **siempre visible** (con o sin sesión). Fuerza `data-theme="light"` (el script inline de `index.html` también lo hace en `/`). En un **dominio propio de evento**, el servidor inyecta `de-custom-domain` y la SPA monta la **portada pública del evento** antes de la landing (ver §16).
- `/eventos` → **panel admin** (antes `/`), protegido con `RequireAuth`. Las rutas internas del panel siguen igual (`/events/:id/...`).
- `/invitacion/:slug/:token` → invitación pública con **URL bonita** (commit `1b69831`); `/invitacion/:token` → ruta **legacy** que se mantiene. `InvitationPage` resuelve por el token en ambos casos y fuerza `data-theme="dark"`.
- `/login`, `/registro` y `/verificar-correo` no cambian.

### 11.2 Landing (`client/src/landing/**`)

- **20 archivos**: `LandingPage.jsx`, `landing.css`, `useLandingMeta.js`, 12 secciones (`sections/`) y 5 componentes (`components/`: `FeaturePlate` + 4 mocks). Se **eliminaron** `sections/FormatsMarquee.jsx` (sustituida por `sections/Index.jsx`) y `components/Ornament.jsx` (sustituido por `components/FeaturePlate.jsx`).
- Secciones: `Nav`, `Hero`, `Index`, `FeatureInvitations`, `FeatureRsvp`, `FeatureTables`, `FeatureGifts`, `HowItWorks`, `FormatShowcase`, `Faq`, `FinalCta`, `Footer`.
- **Dirección "imprenta de atelier"** (rediseño 2026-09-14, commit `32cb71e`): tinta `#17130e` sobre papel cálido `#f6f3ec`, hairlines, láminas con pie de figura (`Fig. 01`–`Fig. 05`), marcas de corte y una sola tinta de acento (vino `#7d3836`; quedan usos residuales de los tokens `--de-gold`/`--de-sage`). CSS scopeado bajo `.de-landing` (tokens `--de-*`).
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
- En la raíz de un dominio propio, el catch-all sustituye canonical/OG por los del evento (`https://<custom_domain>/`) y añade `robots: index, follow`; ver §16.
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

Feature **commiteada** (`8fd76c1`, docs en `91b407d`; ver §10): el panel puede enviar la invitación a los líderes de grupo por WhatsApp, en dos modos.

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

**Estado de verificación (2026-09-14, reportado por el agente):** `npm run build` del client exit 0 y smoke en puerto alterno OK (`/api/health` 200, `GET .../whatsapp` sin sesión 401, `POST` con `Origin` ajeno 403). `node --check` OK en los JS de servidor (`routes/whatsapp.js`, `utils/whatsapp.js`, `utils/phone.js`, `routes/groups.js` e `index.js`; `db/init.js` corregido y verificado 2026-09-14). Revisión profunda de SecDevOps **cancelada**. Commiteada en `8fd76c1` (docs en `91b407d`).

---

## 13. Dominio personalizado por evento + pago con Stripe vía Payment Link externo (2026-09-21)

**Estado:** implementado en el working tree **sin commitear** al cierre de la sesión (25 archivos modificados + `client/src/lib/` sin seguimiento). La feature permite dos cosas independientes: (a) que un evento tenga **dominio propio** en su invitación y (b) que la mesa de regalos cobre con un **Payment Link externo de Stripe** (cuenta del organizador), sin tocar el pago integrado de la plataforma.

> ⚠️ **Actualización (2026-10-11):** el pago con tarjeta del flujo integrado migró a **Stripe Connect** (destination charges, 100% al anfitrión; ver §15) y el webhook ahora también maneja `account.updated`. Esta sección se conserva como histórico del 2026-09-21; el **Payment Link externo** sigue disponible en el editor.

**Decisiones del usuario:**

| # | Decisión | Detalle |
| - | -------- | ------- |
| **1A** | El dinero de la boda va a la **cuenta Stripe propia de la pareja** vía **Payment Link externo** | **Sin Stripe Connect** y **sin webhooks nuevos**: el webhook de plataforma (`server/src/routes/webhooks.js`) **no cambia**. El pago integrado sigue disponible para el resto de eventos. |
| **2A** | ~~La **raíz** del dominio personalizado **no** tendrá portada especial~~ → **sustituida (2026-10-19)** | Se aceptaba la landing de DisplayEvent en `https://<dominio>/`. **Ya no aplica:** la raíz muestra una portada pública del evento (sin token, sin marca y sin mesa de regalos); ver §16. La landing de DisplayEvent queda solo para el host de la plataforma. |

> ⚠️ **Decisión 2A sustituida (2026-10-19):** la raíz del dominio propio ya no muestra la landing de DisplayEvent, sino la portada pública del evento. El resto de §13 (dominio, normalización y Payment Link externo) sigue vigente; ver §16.

### 13.1 Base de datos

| Objeto | Definición |
| ------ | ---------- |
| `events.custom_domain` | `VARCHAR(255)` NULL (NULL = dominio por defecto de la plataforma). |
| `idx_events_custom_domain` | Índice **único parcial** (`... ON events(custom_domain) WHERE custom_domain IS NOT NULL`). |

- `npm run init-db` **ya aplicado y verificado** (columna + índice + prueba de unicidad con `ROLLBACK`).
- ⚠️ El índice es **case-sensitive**; la app normaliza a minúsculas antes de persistir.
- Archivos: `server/src/db/schema.sql` (columna en el `CREATE` + `ALTER` idempotente + índice) y `server/src/db/init.js` (migraciones idempotentes).

### 13.2 Backend (`server/src/`)

| Archivo | Cambio |
| ------- | ------ |
| `schemas/invitation.js` | `registry.payment_link_url`: string con `trim()` y tope `PAYMENT_LINK_MAX_LENGTH = 500`; presente en `normalizeRegistry`, `registrySchema` y saneado en `normalizeForRead` (siempre string). |
| `routes/events.js` | `custom_domain` en POST/PUT con semántica **`undefined` = conservar** / **`""`/`null` = borrar** / **string = normalizar** (minúsculas, sin protocolo, sin `www.` inicial ni barra final), vía `normalizeCustomDomain` / `parseCustomDomainInput` (`DOMAIN_RE`, `DOMAIN_MAX_LENGTH = 255`). `409 "El dominio ya está en uso"` cuando Postgres devuelve `23505` en `idx_events_custom_domain`. `400` para reservados (`displayevent.com` y subdominios, `localhost`, IPs literales, `railway.app` y `*.railway.app`) y para formato inválido. |
| `utils/whatsapp.js` → `buildInvitationUrl` | Con dominio: `https://<custom_domain>/invitacion/<token>` (**sin slug**). Sin dominio: comportamiento actual (`CLIENT_URL` + `[slug/]token`). |
| `routes/whatsapp.js` | El `SELECT` del evento en `POST /send` incluye `custom_domain`. |
| `routes/invitations.js` | `GET /:token` expone `public_config.custom_domain` (aditivo). `POST /:token/payment` usa `https://<custom_domain>` en `success_url`/`cancel_url` (fallback `CLIENT_URL`). |
| `index.js` | CORS: wrapper previo al middleware `cors` que acepta **mismo host** (`new URL(Origin).host === req.get("host")`), además de `ALLOWED_ORIGINS`. `X-Robots-Tag: noindex, nofollow` en el fallback SPA cuando el host ≠ host de `CLIENT_URL`. |

**Evidencia (reportada por el agente):** `node --check` OK; E2E CRUD **25/25** (normalización, conservar/borrar, 409, reservados) y **8/8** de invitación pública + WhatsApp (enlaces con dominio, `public_config`); `Origin: evil.example` sigue respondiendo 403; datos de prueba limpiados.

⚠️ **Nota histórica (resuelta el 2026-10-19):** entonces la raíz `/` del dominio propio la servía `express.static` (no el fallback SPA), así que **no** llevaba `X-Robots-Tag` (pendiente menor). Con la portada pública de §16, `express.static` usa `index: false` y `/` pasa por el catch-all: la raíz custom es `index, follow` sin `X-Robots-Tag`, y las demás rutas del host conservan su tratamiento previo (`noindex` cuando el host no es el canónico).

### 13.3 Frontend (`client/src/`)

| Archivo | Cambio |
| ------- | ------ |
| `lib/publicDomain.js` (**nuevo**) | `normalizeDomain` (misma semántica que el backend), `buildInviteUrl` (con dominio `https://<dominio>/invitacion/<token>`; sin dominio, origen + slug opcional + token) e `isCustomDomainActive` (tolera `www.` en ambos lados). |
| `pages/event/EventInvitation.jsx` | Campo **"Dominio personalizado"** (misma `DOMAIN_RE`/`DOMAIN_MAX = 255` que el backend, normaliza en `onBlur`) que se guarda en el mismo `api.events.update` del slug (`custom_domain: domainValue`; `""` borra). Input **"Link de pago de Stripe"** (`setReg("payment_link_url", …)`), visible solo con `stripe_enabled`. |
| `invitation/schema/normalize.js` | `payment_link_url` en `normalizeRegistry` (round-trip garantizado). |
| `invitation/shared/Gifts.jsx` y `invitation/boda_jorge_macarena/Gifts.jsx` (v2; hoy la boda usa `v3/GiftsSection.jsx`) | Modo link (`stripe_enabled && payment_link_url`): el CTA "Pagar con tarjeta" es un `<a>` al Payment Link externo (`target="_blank"`, `rel="noopener noreferrer"`), se **ocultan** los selectores de moneda/monto (bloque `!linkMode`) y se muestra "Elegirás el monto en la pasarela segura de Stripe."; el depósito bancario **no cambia**. `alice_xv/Gifts.jsx` **sin tocar** (sigue siendo informativo, sin Stripe). |
| `pages/event/EventGuests.jsx` | `handleCopyInvite` usa `buildInviteUrl` (enlace con dominio sin slug). |
| `components/WhatsAppSendModal.jsx` | `inviteLink(event, token)` usa `buildInviteUrl`. |
| `invitation/InvitationPage.jsx` | White-label: `hideBrand = isCustomDomainActive(public_config.custom_domain)` + `<meta name="robots" content="noindex">`; `hideBrand` viaja por `InvitationView` → **6 layouts** → **3 footers** (`shared`, `alice_xv`, `boda_jorge_macarena`), donde se oculta solo la línea "DisplayEvent". El **badge "Powered by Webi"** (solo boda) **no** se oculta hoy (decisión pendiente, ver §8). |

**Evidencia (reportada por el agente):** `npm run build` exit 0; 20 asserts unitarios; E2E con backend real (footer con marca en host normal / sin marca + `noindex` con `custom_domain='localhost'` temporal y revertido; Payment Link ocultando selectores y abriendo anchor externo; `alice_xv` intacta).

### 13.4 Operaciones / SecDevOps (bloqueado por la compra del dominio)

| Tema | Estado / runbook |
| ---- | ---------------- |
| `macarenayjorge.com` | **No registrado** al 2026-09-21 (NXDOMAIN; RDAP Verisign 404) → **disponible**. **Bloqueo #1: comprarlo ya** (riesgo de squatting). ⚠️ (2026-10-19) El evento ya tiene `custom_domain = "macarenayjorge.com"`; confirmar compra/DNS y el deploy de la portada (ver §16). |
| `displayevent.com` | Registrado en **Namecheap** y apuntando a **Railway** (A `69.46.46.0`); `www.displayevent.com` NXDOMAIN. |
| Railway | Sin CLI/token en el entorno → runbook **manual**: añadir custom domain (recomendación: **solo apex**, por límites de plan — Trial 1 / Hobby 2 / Pro 20, y `displayevent.com` ya ocupa 1 slot), registros **CNAME + TXT**, TLS automático. `www` → apex **no existe** en Railway (Cloudflare Bulk Redirect o 301 del backend). ⚠️ Actualizado 2026-10-11: el dashboard exige **CNAME target tipo `xxxxx.up.railway.app` + TXT de verificación**, ambos obligatorios (sin TXT → 404); ver §7. |
| Variable `ALLOWED_ORIGINS` | Valor exacto: `https://displayevent.com,https://macarenayjorge.com,https://www.macarenayjorge.com`. Reemplaza a `CLIENT_URL` en CORS y los POST same-origin también envían `Origin` (de ahí el wrapper de mismo host). ⚠️ Hoy **no está en `server/.env.example`** (solo se lee del entorno). |
| Stripe de la pareja | Cuenta propia MX (RFC/entidad), sitio web `https://macarenayjorge.com`, Payment Link **"el cliente elige el importe"** (MXN, tarjeta); la URL `https://buy.stripe.com/...` se pega en el campo del editor. **Sin webhooks ni claves en la plataforma.** ⚠️ (2026-10-11) El flujo integrado evolucionó a **Stripe Connect** (destination charges, 100% al anfitrión; ver §15); el Payment Link externo sigue disponible en el editor. |

**Riesgos y pendientes asociados** (detalle operativo en §8): compra del dominio + commit/deploy/smoke (el trabajo está sin commitear); badge **"Powered by Webi"** visible en dominio propio (hoy `hideBrand` solo oculta "DisplayEvent"); decisión `www` → apex; `X-Robots-Tag` en `/` raíz; OG/título genéricos en white-label (el HTML compartido mantiene los meta de DisplayEvent).

---

## 14. Buscador y filtros en el panel de grupos (2026-10-04)

**Estado:** feature **commiteada en `main`** (`f2a179a`, "Invitados y Dashboard: buscador y filtros por WhatsApp y RSVP"; 4 archivos, +421/−30). Aplica a **Invitados** (`/events/:id/invitados`) y **Dashboard** (`/events/:id/dashboard`) con semántica de filtrado única.

**Archivos:**

| Archivo | Cambio |
| ------- | ------ |
| `client/src/lib/groupFilters.js` (**nuevo**) | Semántica única: `DEFAULT_GROUP_FILTERS`, opciones de WhatsApp/RSVP, `normalizeSearchText` (NFD), `indexGuestsByGroup`, `hasActiveGroupFilters`, `formatGuestMatches` y `applyGroupFilters`. |
| `client/src/components/GroupFiltersBar.jsx` (**nuevo**) | Barra reutilizable **controlada** (el estado vive en la página): input `type="search"`, chips `aria-pressed`, contador y "Limpiar filtros". |
| `client/src/pages/event/EventGuests.jsx` | Integra la barra + índice de invitados + refresco (`reloadGuests`). |
| `client/src/pages/event/EventDashboard.jsx` | Integra la barra sobre sus grupos. |

**Buscador:** por nombre de grupo, **líder**, **teléfono** y **nombre de invitado** (también los de grupos colapsados); `normalizeSearchText` normaliza con el patrón **NFD** del repo (sin acentos y minúsculas) y exige **todos** los tokens (multi-palabra = AND). Cuando un grupo coincide **solo por invitados**, la tarjeta muestra el hint **"Coinciden: …"** con hasta **3 nombres** (`formatGuestMatches`; `+N` si hay más). El índice `{ groupId: invitado[] }` se construye desde `api.guests.list(id)` (**una carga**); en Invitados se refresca **reutilizando las recargas existentes** (`reloadGuests` sincroniza con la misma respuesta, **sin fetch extra**).

**Filtros (chips con `aria-pressed`):**

| Filtro | Opciones |
| ------ | -------- |
| WhatsApp | **Todos** / **Enviada** (`whatsapp_sent_at`) / **Sin enviar** (`leader_phone && !whatsapp_sent_at`) / **Sin WhatsApp** (`!leader_phone`). |
| RSVP | **Todos** / **Sin responder** (`total>0 && reg===0 && dec===0`) / **Pendientes** (`reg+dec>0 && pending>0`) / **Completos** (`total>0 && pending===0`), con `pending = max(0, total - reg - dec)`; los grupos con `total===0` solo aparecen con RSVP **"Todos"**. |

**UI:** contador **"Mostrando X de Y grupos"**, botón **"Limpiar filtros"** (solo con filtros activos), estados vacíos diferenciados, `role="search"` + `aria-label` + `aria-live`; la barra se **oculta si no hay grupos**. Filtrado local sin debounce (instantáneo).

**Invariantes:** el modal de WhatsApp sigue recibiendo **TODOS** los grupos (no los filtrados) y las StatCards del Dashboard siguen siendo **globales**.

**Verificación (reportada por el agente):** `npm run build` OK (**544 módulos**); **36+ aserciones** del helper `groupFilters` y render SSR de la barra con ARIA correcto. **Pendiente:** solo la pasada visual en navegador (ver §8).

### 14.1 Exportación de invitados a PDF (2026-10-24)

**Estado:** implementada **localmente, sin commit**. Pendiente el **commit/deploy** y la **prueba contra el backend real**. No hubo cambios de backend, BD ni API: el PDF se genera íntegramente en el navegador.

**Archivos y dependencias:**

| Archivo | Cambio |
| ------- | ------ |
| `client/src/pages/event/EventGuests.jsx` | Botón **"Exportar PDF"** en la cabecera (junto a "Enviar invitaciones" y "+ Nuevo grupo"), estado `exporting`, bloqueo de doble clic con ref (`exportingRef`), import dinámico de `guestsPdf.js`, toast de éxito/error y cabecera responsive (`flex-wrap`). |
| `client/src/lib/guestsPdf.js` (**nuevo**) | `exportGuestsPdf({ event, groups, guests, eventId })`: construye el documento, dibuja el contenido y descarga el archivo. |
| `client/package.json`, `client/package-lock.json` | Dependencias `jspdf@^4.2.1` y `jspdf-autotable@^5.0.9`. |

**Comportamiento:**

- El botón se deshabilita con `loading`, `exporting`, **sin grupos** o con error; muestra **"Generando PDF…"** mientras trabaja y un toast al terminar.
- `guestsPdf.js` se importa con `await import(...)`: **jsPDF + AutoTable** quedan en un chunk aparte (**~431 kB**) y no afectan la carga inicial del panel.
- Exporta **todos** los grupos e invitados del evento, **sin aplicar los filtros ni la búsqueda** activos (usa `groups` y `allGuests`).
- PDF **A4 vertical**, claro e imprimible.

**Contenido del PDF:**

| Bloque | Detalle |
| ------ | ------- |
| Primera página | Título **"Resumen de invitados"**, nombre del evento, fecha/hora/lugar, logo + wordmark **DisplayEvent** y nota de generación. |
| Resumen general | 8 tarjetas: **Grupos, Invitados, Adultos, Niños, Confirmados, No asistirán, Sin responder, Periqueras**. |
| Nota de WhatsApp | **"Invitaciones enviadas: X de Y grupos por WhatsApp."** (grupos con `whatsapp_sent_at`). |
| Resumen por grupo | Tabla de 7 columnas (**Grupo, Líder, Invitados, Confirmados, No asistirán, Sin responder, Niños / Periq.**) con fila de **totales** y nota "Periq. = periqueras." |
| Detalle de invitados | Tabla **Grupo, Invitado, Estado, Detalle**; estados en color (Confirmado / No asistirá / Sin responder) y detalle **Líder / Niño / Acompañante de**. |
| Cabeceras y pies | Se dibujan **al final** recorriendo las páginas, con **"Página X de Y"**; el logo aparece arriba a la derecha en **todas** las páginas. |

- El logo (`client/public/logo.svg`) se **rasteriza a PNG con canvas** en el navegador porque jsPDF no inserta SVG; si falla, hay fallback textual **"DisplayEvent"**.
- **Sin datos sensibles:** no incluye teléfonos, tokens, enlaces de invitación ni datos de pago.
- Metadatos del PDF con `author`/`creator` **"DisplayEvent"**; nombre de archivo `resumen-invitados-<slug>.pdf` (`event.slug` → nombre normalizado → id).

**Decisiones técnicas:**

- **PDF descargable real** (no `window.print`) con **jsPDF + AutoTable**; `jspdf-autotable` se usa con la función `autoTable(doc, opciones)`.
- **Carga diferida** del generador para que jsPDF/AutoTable no entren en el bundle inicial.
- Se evitan glifos no soportados por las fuentes estándar de jsPDF (`★`, `✓`, `✗`, emojis); los estados se transmiten con texto y color.
- **Sin backend:** no se añadieron endpoints ni consultas; los datos salen de los grupos e invitados ya cargados en la página.
- `html2canvas` aparece como dependencia opcional transitiva de jsPDF y Vite genera un chunk separado; **la feature no lo usa**.

**Verificación:**

- `npm install` en `client`: correcto.
- `npm run build` en `client`: correcto (**941 módulos**); chunk `guestsPdf` **~431 kB** con carga diferida.
- Prueba E2E con datos sintéticos y API simulada: descarga, logo en todas las páginas, cabeceras/pies, tarjetas, tabla por grupo con totales, detalle con estados/colores, acentos, nombres/evento/lugar largos, paginación, fallback de logo, botón deshabilitado sin grupos, error de importación y vista móvil sin overflow.

**Limitaciones:** no se probó contra el **backend real**; los nombres de grupo extremadamente largos aumentan la altura de fila. La feature sigue **sin commit**; los cambios locales ajenos (`client/src/invitation/boda_jorge_macarena/BottomNav.jsx` eliminado, `client/src/lib/publicDomain.js` y `package-lock.json` raíz modificados) **no se tocaron**.

---

## 15. Boda Jorge & Macarena — rediseño v2 (HISTÓRICO; superado por v3) (2026-10-11)

> ⚠️ **Superado (2026-11-09):** esta sección describe el **rediseño v2** y se conserva como historia. La plantilla vigente es el **diseño v3** (ver **§18**). El contrato `stay`/`trip` (§15.2) y la infraestructura Stripe (§15.1) siguen vigentes; las referencias visuales v2 (`hero_image`, `gallery`, `SectionPhoto`, Cormorant Garamond + Montserrat, hojas con foto B&N) **ya no aplican** a la boda v3.

**Estado:** el rediseño v2, el OG dinámico y la subida de audio quedaron **commiteados** en `a60d442` ("Boda Macarena & Jorge: rediseñar la invitación (v2), OG dinámico por token y audio"; incluye también `MEMORIA.md`, `README.md` y `INVITACION_BODA_JORGE_MACARENA.md`). Después se commitearon **Stripe Connect** + el fix del guardado (`1ea314f`), el fix **`on_behalf_of`** cross-región (`2718f6f`) y el **fallback cross-currency "Plan B"** (`2abf462`, que incluye además la actualización de estos docs). **Working tree de código limpio y pusheado** (`origin/main`) al cierre de esa fase; esta corrección documental de `MEMORIA.md` queda para el próximo commit. ⚠️ (2026-10-19) La portada pública del dominio propio quedó **commiteada en `fae3ca5`** (ver §16). **Fase 1** = esta plantilla; **Fase B** = adopción en los formatos genéricos.

**Qué se hizo:**

- **Tema reescrito** (`themes/boda_jorge_macarena.js`): papel crema/tinta cálida, **Cormorant Garamond** (display/títulos e itálica) + **Montserrat** (cuerpo), set completo de vars `--inv-*` (incluye `--inv-photo-scrim` claro y las vars `--inv-envelope-*` del sobre editorial) + **puente Tailwind** (ver deuda abajo). El diseño ordena **novia & novio** (`couple.nameB` y luego `couple.nameA`).
- **Layout reescrito** (`BodaJorgeMacarenaLayout.jsx`) con el **motor de hojas apilables** del mock: cada sección es sticky con `top` adaptativo (`vh − alto`), la hoja entrante entra inclinada y se endereza, la anterior se hunde/gira/escala y se oscurece (`[data-shade]`); en reposo se retira el transform (para no romper descendientes `fixed` como los modales) y con `prefers-reduced-motion` nunca se aplica. Escucha `scroll` en fase de captura (funciona también en la vista previa del editor).
- **Secciones locales nuevas** (v2, en orden): `Hero.jsx` (portada con countdown inline), `Story.jsx` (Nuestra historia), `Locations.jsx` (una hoja por ubicación: Ceremonia/Recepción), `Itinerary.jsx` (riel con flores), `DressCode.jsx` (Vestimenta), `Gifts.jsx` (Regalo: nota + mesa), `Footer.jsx` (Cierre). En el **commit `4773112`** (2026-10-22; ver §15.2), `Lodging.jsx` (Hospedaje y viaje) fue sustituido por `Travel.jsx` (Viaje) + `Stay.jsx` (Hospedaje), ambos después del RSVP y antes del cierre.
- **Chrome nuevo:** `BottomNav.jsx` (pill inferior Ubicación/Regalo/Confirmar; salto por posición de **flujo** para no fallar con tarjetas sticky) y `MusicToggle.jsx` (audio opcional sin autoplay, `preload="none"`, loop, `aria-pressed`).
- **Sobre editorial** (`EditorialEnvelope.jsx`): variante dedicada seleccionable por tema (`opening.envelopeVariant: "editorial"`), cargada **lazy** desde `InvitationView.jsx`; el `EnvelopeLoader` compartido no cambia. Secuencia sobre → solapa → sello → hoja → pantalla completa → fundido; bloquea el scroll con la clase `de-envelope-lock`.
- **Decoración/utilidades locales:** `flora.jsx` (Flor/Ramillete/Eyebrow/FlowerRule), `Grain.jsx` (`GrainOverlay`), `SectionPhoto.jsx` (foto B&N por hoja con scrim claro) y `helpers.js` (fechas/nombres/URLs; oculta el placeholder de hora `00:00`).
- **Eliminados** (sin uso tras el rediseño): `Countdown.jsx`, `Message.jsx`, `RegistryNote.jsx`, `SectionNav.jsx` y `decor.jsx` (solo de esta plantilla; `alice_xv` intacta).
- **Fuentes** (`client/index.html`): Montserrat 300–600 y Cormorant Garamond 300 + itálica 300 añadidas.
- **Mock de referencia** en `Invitación Macarena & Jorge/` (carpeta con nombre en Unicode NFD, sin seguimiento en git): `Invitacion Macarena y Jorge v2.dc.html` + `Flor.dc.html` / `Ramillete.dc.html` / `support.js`.

**Contrato nuevo (campos comunes, sin migración):**

| Campo | Tipo / tope | Uso |
| ----- | ----------- | --- |
| `story` | string ≤ 4000 (`STORY_MAX_LENGTH`) | relato de "Nuestra historia"; vacío → `message` → `defaultMessage` |
| `music_url` | string (URL directa; subible desde el editor) | audio del botón de música; vacío → sin botón |
| `lodging` | `[{name,note,url?}]` | **Legado**: hoteles; la UI nueva no lo renderiza (el evento 2 conserva 2 hoteles) |
| `travel` | `{title,airport_note,routes:[{label,note}],closing_note}` | **Legado**: bloque de viaje anterior; la UI nueva no lo renderiza |
| `stay` | objeto `{enabled,intro,zone,checkin,checkout,cards[]}` | **Hospedaje** (contrato nuevo; ver §15.2) |
| `trip` | objeto `{enabled,intro,origins,arrivals,date_from,date_to,adults,modes}` | **Viaje** (contrato nuevo; ver §15.2) |

- **Servidor** (`server/src/schemas/invitation.js`): agregados a `commonFields` con defaults + helpers `normalizeLodging`/`normalizeTravel`; los **6 templates** los validan y normalizan (tolerantes: formas inválidas se descartan, `url` opcional).
- **Cliente** (`client/src/invitation/schema/normalize.js`): espejo exacto (`STORY_MAX_LENGTH`, `normalizeLodging`, `normalizeTravel`; `toFormState` añade filas `_uid` y `serializeForm` las limpia). `fields.js` los declara bajo `EXTRA_FIELDS.boda_jorge_macarena` (documentación del contrato).
- **Editor** (`EventInvitation.jsx`): bloque **"Nuestra historia y música"** y editor dedicado **`StayTravelEditor.jsx`** (Viaje + Hospedaje), visibles **solo con `template === "boda_jorge_macarena"`**. `CUSTOM_EXTRA_KEYS` excluye de la grilla genérica "Datos del formato" las claves `story`, `music_url`, `lodging`, `travel`, `stay` y `trip`. Fase B quitará el gating.

**Subida de audio desde el editor (misma fecha, 2026-10-11):**

- **Backend** (`server/src/routes/uploads.js`): `POST /api/uploads` ahora acepta **imágenes** (JPG/PNG/WEBP/GIF, **8 MB**) y **audio** (`audio/mpeg` mp3, `audio/mp4`/`audio/x-m4a` m4a, `audio/ogg`, **15 MB**). Multer usa el límite global mayor (15 MB) y la cuota por tipo se valida en el handler con mensaje específico; **Cloudinary** sube el audio con resource type **`video`** (`/video/upload`, mismo preset/firma; el preset unsigned ya permite audio — probado con un MP3 real) y el **fallback local** conserva la extensión correcta (`EXT_BY_MIME`). La respuesta no cambia: `201 { url, public_id }` (`public_id: null` en local). Rate limit (50/h por usuario) y `requireAuth` intactos. En `server/src/index.js`, el mensaje de `LIMIT_FILE_SIZE` quedó "8 MB para imágenes, 15 MB para audio".
- **Frontend** (`EventInvitation.jsx`): `ImageUploader` se generalizó a **`FileUploader`** con registro `UPLOAD_KINDS` (image/audio; los usos de imagen — p. ej. la foto de portada — quedan idénticos; la galería conserva su subida múltiple propia). En "Nuestra historia y música" hay ahora estado/miniatura de audio, botones **"Subir audio" / "Reemplazar audio" / "Subiendo…"**, "Quitar" y la ayuda **"MP3, M4A u OGG · máx. 15 MB"**; la validación cliente espeja la del server (mime/tamaño; si el navegador no reporta `file.type`, se infiere por extensión y se re-envuelve el `File` con el mime correcto). Al subir, la URL queda en `form.music_url`; el input de **URL directa se conserva** para pegar enlaces.
- **Nota de uso:** `music_url` debe apuntar a un **archivo de audio directo**; YouTube/Spotify/Apple Music **no funcionan** (el reproductor es un `<audio>` nativo).
- **Fix de guardado (commiteado en `1ea314f`):** `FileUploader` gana `onUploadingChange` y el editor deshabilita **"Guardar cambios"** mientras hay una subida en curso (`fileUploading`), para no persistir la URL anterior del archivo (audio/portada).

**OG dinámico por token (previews de WhatsApp/redes):**

- Nuevo `server/src/utils/invitationLookup.js`: **SQL único** de `findInvitationByToken` (incluye `slug` y `custom_domain`; excluye tokens revocados), reutilizado por `routes/invitations.js` (se eliminó su copia local) y por el catch-all de la SPA.
- Nuevo `server/src/utils/ogMeta.js`: `invitationTokenFromPath`, `buildInvitationMeta` (título `{nameA} & {nameB} · Nuestra boda` → nombre del evento → genérico; **descripción fija y genérica, sin nombre de familia** por privacidad; imagen `hero_image` → `gallery[0]` → `og-image.png`; URL canónica vía `buildInvitationUrl`), `escapeHtml` e `injectInvitationMeta` (reemplazos quirúrgicos por etiqueta).
- `server/src/index.js`: plantilla del build **cacheada** una vez (`readFileSync`) y catch-all `async` que inyecta los meta cuando el token resuelve; token inválido/inexistente o error de BD → HTML estático (comportamiento anterior). Solo aplica cuando el servidor sirve `client/dist`.
- Verificado por el orquestador con **User-Agent de crawler**.

**Stripe Connect — cuentas del anfitrión (2026-10-11, misma fecha; aplica a los 6 templates, no solo la boda):**

> **Estado 2026-10-22:** el modelo Connect sigue vigente. Las verificaciones de esta subsección son de **test-mode (histórico)**; la configuración **live**, la migración aplicada y el nuevo flujo de **cuenta única por evento** se documentan en **§15.1**.

- **Decisiones del usuario:** el **100% del regalo va al anfitrión** (destination charges **sin** `application_fee`); cuentas **por usuario** con **override por evento** (`events.stripe_account_mxn`/`_eur`; desde `138fe3f` también **`events.stripe_account_id`**, que tiene prioridad y deja los overrides por moneda como legacy; ver §15.1); **plan de moneda = Plan B**: para esta boda basta **una sola cuenta Connect (MX/MXN)** y los cobros en **EUR** se **convierten automáticamente** al liquidar (verificado en test-mode: €20 → MX$407.66). El **Plan A** (conectar además una cuenta ES para cobrar EUR sin conversión) queda documentado como posible a futuro: la resolución legacy **prioriza la moneda exacta** si algún día existe esa cuenta.
- **BD** (`server/src/db/schema.sql`): tabla `stripe_accounts` (id, `user_id` FK users, `stripe_account_id` UNIQUE, `country`, `default_currency`, `charges_enabled`, `payouts_enabled`, `details_submitted`, timestamps; índice por user; **RLS**) + columnas **legacy** `events.stripe_account_mxn` / `events.stripe_account_eur` (TEXT, override por evento) + **`events.stripe_account_id TEXT`** (nullable, sin FK/índice/backfill; cuenta explícita por evento). `npm run init-db` aplica `schema.sql`. **La migración de `stripe_account_id` ya está aplicada (2026-10-22)** en la BD configurada en `server/.env` (Supabase remoto); en cualquier otra BD hay que aplicarla **antes** del deploy (ver §7 y §15.1).
- **Backend:** nuevo `server/src/routes/stripe.js` (montado con `requireAuth` en `/api/stripe`): `POST /api/stripe/create-account` (body opcional `{country}` MX|ES, default MX → `201 {account_id, url}` con link de onboarding Express; puede responder `502 {error, detail}` hasta que se active "Accounts v1" en el dashboard de Stripe) y `GET /api/stripe/accounts` (lista con flags, sync en vivo best-effort contra Stripe + persistencia). Return/refresh del onboarding → `${clientUrl()}/eventos?stripe=return|refresh`.
- **Webhook** (`server/src/routes/webhooks.js`): agregado `account.updated` (UPDATE idempotente de flags por `stripe_account_id`); el manejo de Checkout se amplió después en `a9610b6` con los eventos async y upsert idempotente (ver §15.1.1).
- **Pago** (`server/src/routes/invitations.js` + `server/src/utils/stripeDestination.js` + `invitationLookup` ampliado con `owner_user_id`, `stripe_account_id` y los overrides legacy): si `events.stripe_account_id` tiene valor, **esa es la única cuenta admitida para MXN y EUR** (sin fallback; ver §15.1). Si es NULL, resuelve `destination` con **orden determinista**: (1) override del evento con moneda **exacta** habilitada; (2) cuenta del dueño con moneda **exacta** habilitada; (3) **fallback (Plan B)**: override habilitado aunque su moneda no coincida; (4) **fallback**: cuenta del dueño habilitada aunque su moneda no coincida — el fallback deja la **conversión** a Stripe. Se usa `payment_intent_data` con `transfer_data.destination` (**sin `application_fee`**) + **`on_behalf_of`** cuando el destino cruza región (ver bullet siguiente); **sin destino válido → `400` claro**. El `GET /api/invitations/:token` expone top-level **`payment_methods: { card: { mxn, eur } }`** calculado con **la misma resolución** que el pago (solo cuando la mesa tiene `enabled` + `stripe_enabled` y Stripe está configurado): con una sola cuenta MX habilitada (sin cuenta de evento) devuelve **`{mxn:true, eur:true}`** (EUR con conversión); con cuenta de evento válida devuelve **`{mxn:true, eur:true}`** y con cuenta de evento inválida **`{mxn:false, eur:false}`**; `false/false` sin ninguna cuenta habilitada o si la mesa/Stripe no aplica; nunca lanza. Las demás validaciones, `return_url`, metadata y `gifts` quedan intactos.
- **`on_behalf_of` cross-región (commiteado en `2718f6f`: "Pagos: liquidar con on_behalf_of los cargos a cuentas Connect fuera de la región"):** Stripe exige liquidar en la región del destino cuando la cuenta conectada está fuera de la región de la plataforma (p. ej. plataforma MX → cuenta ES). `getPlatformCountry()` obtiene el país de la plataforma **una vez** (`stripe.accounts.retrieve()`) y lo **cachea en memoria** (lazy; si falla, **reintenta** en la siguiente llamada); `destinationNeedsOnBehalfOf()` decide (mismo país → **no se envía**; país distinto o desconocido → se envía) y `buildPaymentIntentData()` arma el `payment_intent_data`. Verificado en test-mode: **EUR→ES ✅** con el parámetro; **controles MX intactos**.
- **Desempate determinista (corregido en `2abf462`):** el fallback elige la fila de **menor `id`** entre las habilitadas del mismo nivel y `CANDIDATE_COLUMNS` **ya incluye `id`** en el `SELECT` (imprescindible para que la ordenación tenga datos; antes del fix no operaba en las consultas).
- **Frontend:** `client/src/api.js` gana `api.stripe.accounts()` / `createAccount({country})` + `err.status`; `EventInvitation.jsx` añade el bloque **"Pagos / Conectar Stripe"** (estados legibles Sin completar / En revisión / Activa / Con observaciones; selector México (MXN)/España (EUR); conectar → onboarding; "Actualizar estado"; 502 con hint de la política "Accounts v1"). `EventsPage.jsx` captura `?stripe=return|refresh` (aviso, sincroniza cuentas y limpia el query param). `payment_methods` se propaga `InvitationPage → InvitationView → layouts xv/boda/cumpleanos/baby_shower/boda_jorge_macarena → shared/Gifts` y `Gifts` local: la tarjeta se muestra por moneda solo si `card[currency] !== false`; si no, se deshabilita/oculta con mensaje y la transferencia queda intacta; `null`/ausente (respuesta vieja o vista previa) → comportamiento actual. (`alice_xv` no toca su `Gifts` informativo sin Stripe.)
- **Matriz test-mode verificada (histórico, antes de la activación live):** MXN→cuenta MX ✅ íntegro; EUR→cuenta MX ✅ con **conversión automática** (€20 → MX$407.66); **EUR→cuenta ES ✅ con `on_behalf_of`** (controles MX intactos); **fallback cross-currency ✅** (13/13 pruebas puras + E2E real con fila temporal MX: `payment_methods {mxn:true, eur:true}`, checkout EUR 200 con destino MX **sin** `on_behalf_of`, conversión verificada y limpieza total). La prueba del flujo completo en live, el deploy de `ff2b988`/`a9610b6`/`6fbc07c` y los montos reales quedan para el humano (ver §15.1).
- ⚠️ **ORDEN DE DESPLIEGUE CRÍTICO (actualizado 2026-10-22):** la BD configurada en `server/.env` ya tiene la migración; en **cualquier otra BD/entorno**, correr `npm run init-db` **antes** de desplegar este código. Sin las columnas nuevas, `GET /api/invitations/:token` responde **500** (verificado en local; ver §7 y §15.1).
- **Pendientes humanos (actualizado 2026-11-13):** **push/deploy de `ff2b988`, `a9610b6` y `6fbc07c`**; **verificar un pago live nuevo** en webi/BBVA y el panel; **decidir qué hacer con los MX$20 pagados a Akala**; **decidir si se eliminan las otras 3 cuentas Stripe o solo se ocultan**; **definir los montos reales** de la mesa de regalos; revisar los 3 pagos live históricos; verificar las variables live en **Railway**. La **activación live** (claves + webhook live) ya está configurada y verificada (ver §15.1); la cuenta del evento 2 es webi/BBVA (`acct_1UT7NAFnv8uJBZLH`). La API del SDK (`2024-06-20`) está desactualizada (preexistente). Documentar que los descriptores/merchant-of-record en cargos ES cambian con `on_behalf_of`. (El **fallback Plan B** quedó commiteado en `2abf462`.)
- **Pendientes de producto:** **Plan A opcional a futuro** (conectar una cuenta ES para cobrar EUR sin conversión; la resolución ya prioriza la moneda exacta y `on_behalf_of` cubre esa ruta).

**Desviaciones conscientes:**

- El RSVP sigue siendo `shared/Rsvp.jsx` (mandato); se ve v2 por vars y el layout le neutraliza el fondo (`[&>section]:bg-transparent`).
- Banco en Regalo: el contrato admite **un solo** `registry.bank`; el encabezado alterna `giftBankTitleMxn`/`giftBankTitleEur` ("Desde México"/"Desde España") según la moneda elegida.
- La hora `00:00` (placeholder de eventos sin hora) **se oculta** (caja "Hora" e itinerario).
- Título de "Nuestra historia": `labels.storyTitle` o, si vacío, `event.place`.
- Cierre: `event.place · Mes Año` + badge "Powered by Webi" (`logo-dark.svg`) intacto; `hideBrand` solo oculta "DisplayEvent".
- Campos comunes que este diseño **no consume**: `kicker`, `tagline` y `celebrants` (el eyebrow de portada es `labels.heroEyebrow`); el editor aún los ofrece.
- *(Menor, por confirmar)* El título OG conserva el orden `{nameA} & {nameB}` (p. ej. "Jorge & Macarena") mientras la página muestra `{nameB} & {nameA}` ("Macarena & Jorge"); unificar si se desea.

**Deuda Tailwind (`@theme`) — hallazgo para Fase B:**

- `client/src/index.css` declara `--color-inv-*: var(--inv-*)` dentro de `@theme`, que Tailwind resuelve **una sola vez en `:root`**: las utilidades `bg-inv-*`/`text-inv-*`/`font-inv-*` ignoran el override de `--inv-*` anidado en el tema (**bug preexistente, reproducido también en `alice_xv`**).
- El tema v2 lo **puentea re-declarando** `--color-inv-*`/`--font-inv-*` dentro de `theme.vars` (que `InvitationView` aplica como style en la raíz del tema), de modo que las utilidades resuelven con los valores del tema, incluidas las secciones compartidas.
- Pendiente: resolver de raíz (patrón de temas y/o utilidades) al adoptar el diseño en Fase B; también documentado en `INVITACION_BODA_JORGE_MACARENA.md` §8.

**Fase B (planificada):** adoptar este set (tema + secciones + campos) en `xv`, `cumpleanos` y `baby_shower`; **`alice_xv` permanece intacta** (decisión del usuario).

**Producción en Railway (runbook revisado 2026-10-11; estado 2026-10-22):**

- **Plataforma confirmada: Railway** (el usuario lo confirmó; `render.yaml` queda como legacy). Deploy vía **Railpack** desde GitHub (`EduardoGonzalez26/DisplayEvent`, rama `main`): detecta `build`/`start` del `package.json` raíz, `NODE_ENV=production`, `PORT` inyectado y healthcheck en `GET /api/health` (Settings → Deploy). El último commit es **`6fbc07c`**; la base `4773112` de §15.2 ya está desplegada, pero `8d70217`, `efb424b`, `ff2b988`, `a9610b6` y `6fbc07c` siguen locales, pendientes de push/deploy.
- **Dominio `macarenayjorge.com`:** Settings → Networking → + Custom Domain; el dashboard exige **CNAME target `xxxxx.up.railway.app` + TXT de verificación (ambos obligatorios; sin TXT → 404)**; SSL Let's Encrypt automático (≤1 h); límite de plan (Trial 1 dominio / Hobby 2). Registradores sin ALIAS/flattening → nameservers a Cloudflare (CNAME `@` con proxy ON, SSL "Full"). Detalle en §7. **El webhook live ya está configurado en `https://macarenayjorge.com/api/webhooks/stripe` (2026-10-22).**
- `custom_domain` del evento en el panel; `npm run init-db` solo en BD distintas de la ya migrada (la configurada en `server/.env` ya tiene `events.stripe_account_id`).
- **Cloudinary en producción** (disco efímero): para persistir fotos/audio y para la imagen del OG; alternativa: volumen Railway en `/app/server/uploads`. **Serverless/sleep desactivado** para la boda.
- Vars Stripe exactas (confirmadas en `server/src/utils/stripe.js`): `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`. El entorno verificado el **2026-10-22** ya usa claves **live** (`sk_live_`/`pk_live_`) y tiene `STRIPE_WEBHOOK_SECRET`; falta **verificar/cargar** esas variables en **Railway Variables** y desplegar `ff2b988`, `a9610b6` y `6fbc07c`.
- **Decisiones abiertas:** (1) **host canónico** — `CLIENT_URL` = `macarenayjorge.com` (recomendado) vs `displayevent.com`; (2) **Stripe** — modelo **decidido**: Connect (destination charges, **100% al anfitrión, sin `application_fee`**) y **Plan B de moneda** (una sola cuenta **MX/MXN**; los cobros en EUR se **convierten automáticamente** al liquidar). El "Plan A" (conectar una cuenta ES para EUR sin conversión) queda como opción futura (ver subsección Connect).
- **Riesgos:** `npm audit` reportado **7 prod (server) / 2 (client)**; `X-Robots-Tag: noindex` ya se aplica a `/` en hosts no canónicos desde el catch-all de §16 (la raíz de un dominio propio es la excepción indexable); disco efímero si no se configura Cloudinary; **verificar el OG con crawler tras el deploy**; ⚠️ **orden de despliegue:** `init-db` **antes** del deploy de Connect en cualquier BD distinta de la ya migrada (si no, `GET /api/invitations/:token` → 500).

**Pendientes de producto:** fotos reales (hoy placeholders editables desde el editor), **reemplazar el enlace de YouTube de `music_url` del evento por un archivo subido** (reportado: hoy no reproduce; la subida ya está habilitada), **Stripe:** push/deploy de `ff2b988`/`a9610b6`/`6fbc07c`, verificar un pago live nuevo en webi/BBVA, conciliar los MX$20 y decidir las otras 3 cuentas (ver §15.1), smoke test del guardado real del editor con sesión y Fase B.

### 15.1 Cuenta Connect única por evento, monto libre, UI restringida y pagos (2026-10-22/23; blindaje/panel 2026-11-13)

**Estado:** la cuenta única por evento y el monto libre se commitearon en **`138fe3f`** y forman parte de la base desplegada **`4773112`**. La restricción visual para mostrar solo la cuenta activa del evento es **`ff2b988`**, **commiteada en local y pendiente de push/deploy**. El blindaje de checkout es **`a9610b6`** y el panel de pagos **`6fbc07c`**, también **locales, sin push/deploy**. El evento 2 ya tiene `stripe_account_id = acct_1UT7NAFnv8uJBZLH` (**webi.mx / BBVA …3892**) en la BD; la cuenta anterior era `acct_1UPr9eC0wYMF53iO` (**Displayevent / Akala …0134**). El ruteo del backend desplegado lee `events.stripe_account_id`, por lo que los pagos nuevos ya deberían ir a webi/BBVA aunque el código nuevo no esté desplegado.

**1) Una sola cuenta Stripe Connect activa por evento**

- **BD:** `events.stripe_account_id TEXT` nullable, **sin FK, sin índice y sin backfill**. La migración se aplicó el **2026-10-22** con `npm run init-db` en la **BD configurada en `server/.env` (Supabase remoto)**. En cualquier otra BD/entorno sigue siendo requisito ejecutar `init-db` antes de desplegar este código. Si la columna es NULL, se conserva la lógica legacy.
- **API (`PUT /api/events/:id`):** acepta `stripe_account_id` con esta semántica: **ausente = conservar**; **`""`/`null` = limpiar**; **string `acct_...` = validar** que la cuenta exista, pertenezca al usuario autenticado y tenga `charges_enabled = true`. Una cuenta ajena, inexistente o deshabilitada responde **400** (la cuenta ajena no se distingue de la inexistente para no filtrar información).
- **Resolución del destino (`server/src/utils/stripeDestination.js`):**
  - con `events.stripe_account_id`, esa es la **única cuenta admitida para cualquier moneda** (MXN o EUR); si su `default_currency` no coincide, Stripe **convierte**;
  - si la cuenta del evento es ajena, inexistente o está deshabilitada → **no hay fallback**: el destino es `null` y la tarjeta queda sin disponibilidad;
  - si es NULL → lógica **legacy por moneda**: override exacto `stripe_account_mxn/eur` → cuenta del dueño con moneda exacta → fallback con conversión; entre cuentas habilitadas del mismo nivel gana la de **menor `id`**.
- **Contrato público:** `GET /api/invitations/:token` sigue exponiendo `payment_methods.card.{mxn,eur}` con la misma resolución (solo cuando `registry.enabled && stripe_enabled` y Stripe está configurado; en otro caso devuelve `false/false`). Con cuenta de evento válida devuelve **`true/true`**; con cuenta de evento inválida, **`false/false`** (sin fallback). `POST /api/invitations/:token/payment` responde **400** con mensaje estable si la cuenta seleccionada no se puede usar.
- **Editor (`EventInvitation.jsx`, dentro de "Pagos / Conectar Stripe"):** selector **"Cuenta de Stripe para este evento"**. Con una cuenta válida asignada, la UI se limita a **esa cuenta** en el selector y en la lista, oculta **Automática** y muestra el enlace **"Cambiar cuenta"** para revelar temporalmente todas. Si la cuenta guardada es inválida/deshabilitada, se revelan todas para elegir otra. Las otras **3 cuentas** del usuario quedan ocultas, **no borradas**: siguen en `stripe_accounts` y en Stripe. Sin cuenta asignada se conserva el comportamiento anterior (Automática + cuentas; las sin cobros deshabilitadas) y la advertencia si hay ≥2 habilitadas y ninguna seleccionada. La cuenta elegida muestra el badge **"Activa para este evento"**; si la cuenta guardada desapareció o dejó de estar habilitada, avisa y **omite la clave al guardar** para no bloquear el resto de cambios; `""` sí se envía para limpiar la elección. `alice_xv` no cambia.

**2) Monto libre sin montos sugeridos**

- **`client/src/invitation/boda_jorge_macarena/Gifts.jsx` (v2) y `client/src/invitation/shared/Gifts.jsx`:** si `allow_custom` está activo y `suggested_<moneda>` está vacío, **no** se ofrece "Monto libre" como opción de un dropdown: se muestra directamente el **selector de moneda + input numérico "Monto"** (en la boda, `AmountField`; en shared, el input libre con esa etiqueta). La **boda v3** (`v3/GiftsSection.jsx`) usa siempre monto libre y el editor fuerza `allow_custom:true`.
- Si no hay sugeridos y `allow_custom` es **false**, se muestra **"La mesa de regalos aún no tiene montos configurados."** y **no se ofrece un CTA de tarjeta inutilizable**; el banco (si está configurado) se conserva. El **Payment Link externo** no cambia: sigue mostrando su CTA y ocultando los selectores.
- **Editor:** advertencia **no bloqueante** cuando `stripe_enabled` está activo, falta alguna lista de sugeridos (`suggested_mxn`/`suggested_eur`) y `allow_custom` es false: "Sin montos sugeridos y sin monto libre, los invitados no podrán pagar con tarjeta en esa moneda." Solo avisa; el guardado no se bloquea.

**Estado operativo verificado (2026-11-13; sin secretos):**

- `server/.env` usa claves **live** (`sk_live_`/`pk_live_`) y define `STRIPE_WEBHOOK_SECRET`.
- **Webhook live** configurado en `https://macarenayjorge.com/api/webhooks/stripe`, **enabled**. El código desplegado antiguo procesa `account.updated` y `checkout.session.completed`; el commit local `a9610b6` agrega `async_payment_succeeded`/`async_payment_failed` y upsert idempotente. El endpoint declara API **`2026-09-30`**; el SDK usa **`2024-06-20`** (API del SDK desactualizada, preexistente).
- **Evento id 2:** `stripe_account_id = acct_1UT7NAFnv8uJBZLH` ya asignado en la BD. La UI restringida de `ff2b988` aún no está desplegada; el editor desplegado (base `4773112`) todavía muestra todas las cuentas. Las otras **3 cuentas** del usuario siguen existiendo en `stripe_accounts`/Stripe y la UI nueva las oculta.
- **Mesa de regalos del evento 2:** aún con valores de prueba — `allow_custom:false`, `min_mxn:0`, `min_eur:0`, `suggested_mxn:[10]`, `suggested_eur:[10,1]`, `payment_link_url:""` y banco habilitado.
- **`gifts`:** 13 filas; backfill aplicado: **ids 9/10 test** (`livemode=false`, destination NULL) y **ids 11/12/13 live** con destination `acct_1UPr9eC0wYMF53iO`. La tabla ya tiene `livemode`, `destination_account` y `stripe_checkout_session_id`.
- **Migración:** `events.stripe_account_id` **ya aplicada** en esa BD (corrige la nota previa de "migración pendiente"; ver §7).
- **Build:** `npm run build` del cliente **OK (550 módulos)** antes de §15.2; el cliente de `efb424b` (Viaje sin IATA) compila **557 módulos** y el build actual con el panel de pagos es **951 módulos** (ver §15.1.1 y §15.2).

**3) Blindaje de checkout y panel de pagos (2026-11-13, commits locales)**

- **`a9610b6` — “Pagos: blindar checkout y registrar cuenta destino”**:
  - `POST /api/invitations/:token/payment` rechaza `amount <= 0` con **400** (“El monto debe ser mayor que 0”).
  - Checkout Session usa **`payment_method_types: ["card"]`** (evita métodos asíncronos/diferidos).
  - Metadata incluye **`destination_account`**.
  - Webhook maneja `checkout.session.completed`, `async_payment_succeeded` y `async_payment_failed` con **upsert idempotente** por `stripe_payment_intent_id`; **`succeeded` no se degrada** y `failed` puede corregirse a `succeeded`.
  - `gifts` gana **`livemode`**, **`destination_account`** y **`stripe_checkout_session_id`**; índice **`idx_gifts_event_mode_date`**. Backfill: ids **9/10** test (`livemode=false`, destination NULL); ids **11/12/13** live con destination `acct_1UPr9eC0wYMF53iO`.
- **`6fbc07c` — “Panel: agregar conciliación de pagos y regalos”**:
  - `client/src/pages/event/EventPayments.jsx`: ruta **`/events/:id/pagos`** y endpoint **`GET /api/events/:id/gifts`**.
  - Muestra totales por moneda live/test, conteo, estados, cuenta destino, enlaces a Stripe y aviso de pagos live en otra cuenta.
  - Con los datos actuales, los **3 pagos live** aparecen como **“Otra cuenta”**, incluido el de MX$20.
  - Build del cliente con el panel: **951 módulos**.
  - Archivos: `a9610b6` toca `schema.sql`, `events.js`, `invitations.js` y `webhooks.js`; `6fbc07c` agrega `EventPayments.jsx` y lo integra en `App.jsx`, `EventPage.jsx` y `api.js`.

**Hallazgo de los MX$20 (live):**

- `gifts.id=13`, PaymentIntent **`pi_3UaLmNCF2yuPP7LC06qUaY0l`**, live, **MX$20**, `succeeded`.
- Transferencia **`tr_3UaLmNCF2yuPP7LC0jWa30JU`** por MX$20 a `acct_1UPr9eC0wYMF53iO` (Akala).
- Payout **`po_1Ub8ZgC0wYMF53iOSxdecCYn`** por MX$20, estado **`paid`**, creado **2026-11-13 00:42 UTC**, arrival 2026-11-13, banco **Akala …0134**.
- La cuenta **webi/BBVA …3892** no recibió ese pago y tiene **balance 0**.
- Stripe cobró **MX$4.32** de comisión; la cuenta conectada recibió **MX$20 completos** y la plataforma pagó la comisión.
- El pago ya está pagado a Akala; **no se movió dinero ni se crearon transferencias/refunds**. El panel lo marca como **“Otra cuenta”**.

**Estado de despliegue:** la BD ya está actualizada (cuenta del evento, columnas y backfill). El cambio de cuenta ya afecta el ruteo del backend desplegado (lee `events.stripe_account_id`), por lo que los pagos nuevos deberían ir a webi/BBVA incluso antes del deploy. Los commits `a9610b6` y `6fbc07c` están **en local, sin push/deploy**; el blindaje y el panel **no están desplegados**. El webhook desplegado antiguo **no guardará `livemode`/`destination_account`** de pagos nuevos hasta el deploy, y el panel no existe en producción hasta el deploy.

**Pendientes de esta feature:**

- [ ] **Push y deploy de `ff2b988`, `a9610b6` y `6fbc07c`**; después, smoke del selector, del checkout y del panel en el dominio.
- [ ] **Verificar un pago live nuevo (idealmente pequeño) después del deploy** para confirmar que cae en webi/BBVA …3892 y que el panel lo muestra como **“Cuenta actual”**.
- [ ] **Decidir qué hacer con los MX$20 pagados a Akala**: reversión con Stripe/banco, compensación manual o asumirlo como pérdida. **No se movió nada**.
- [ ] **Decidir si se eliminan las otras 3 cuentas Stripe o solo se ocultan**; hoy siguen en `stripe_accounts`/Stripe y la UI nueva las oculta.
- [ ] **Revisar los 3 pagos live históricos** (MX$10, €1 y MX$20) y su conciliación.
- [ ] **Definir los montos reales de la mesa de regalos del evento 2** (hoy valores de prueba) y decidir el valor de `allow_custom`.
- [ ] Verificar las variables live en el entorno desplegado (**Railway**) y aplicar `init-db` en cualquier BD distinta de la ya migrada.
- [ ] *(Preexistente)* Actualizar la **API de Stripe** usada por el SDK (`2024-06-20`).

### 15.2 Viaje y Hospedaje independientes en `boda_jorge_macarena` (HISTÓRICO de UI v2; contrato `stay`/`trip` vigente) (base `4773112` desplegada; ajustes de Viaje `8d70217`/`efb424b` locales, no desplegados)

> ⚠️ **(2026-11-09)** El **contrato** `stay`/`trip`, los defaults, el editor `StayTravelEditor` y los links siguen vigentes, pero la **UI v3** cambió: Viaje muestra **solo avión y autobús** (tren apagado y forzado a `false` desde el editor), la llegada está fijada a **Madrid** y Hospedaje usa **máximo 2 hoteles** de `lodging` + cuota (`stay.quote`/`quote_author`). Ver **§18**.

**Estado:** la base de Viaje/Hospedaje quedó **commiteada en `4773112` y ya está desplegada** (el API de producción devuelve `stay`/`trip` y el bundle sirve el editor de Viaje/Hospedaje). Los ajustes **`8d70217`** (llegada fija a Madrid) y **`efb424b`** (quitar códigos IATA de la UI) están **commiteados en local y pendientes de push/deploy**; `ff2b988` (Stripe) y los commits de pagos `a9610b6`/`6fbc07c` son locales, ver §15.1. La BD del evento 2 (**Supabase**) **ya está actualizada**: `trip.arrivals` solo Madrid, `trip.modes.flight.note` y `trip.intro` actualizados; `origins`, `stay`, `lodging` y `travel` intactos; la cuenta Stripe del evento 2 ya está asignada (ver §15.1). Mientras no se desplieguen, el backend desplegado conserva el default anterior para eventos nuevos y el bundle sigue mostrando el editor de la base `4773112` (con IATA); el evento 2 no se ve afectado porque su JSONB ya está corregido. Build del cliente OK (**557 módulos**) para `efb424b`.

**Qué cambió:**

- La antigua hoja combinada **"Hospedaje y viaje"** (`Lodging.jsx`) se separó en **Viaje** y **Hospedaje**.
- **Invitación personalizada:** orden **RSVP → Viaje → Hospedaje → Cierre**. El layout usa `Travel.jsx` y `Stay.jsx`, y `PHOTO_ORDER` añade `viaje` entre `confirmar` y `hospedaje`.
- **Portada pública** (`MacarenaJorgeCover.jsx`): después de `Story` y antes de `InvitationAccess`, **04 Viaje** (tarjeta editorial `TravelEditorial` + `Travel` en `variant="cover"`) y **05 Hospedaje** (`StayPhoto` + `Stay` en `variant="cover"`). Se eliminaron la sección combinada y `FeaturedHotel`/`SecondaryHotel`/`StayAction`/`hotelLinks`; se conserva el CTA de contacto en Hospedaje.
- **Archivos nuevos:** `client/src/invitation/boda_jorge_macarena/Travel.jsx`, `Stay.jsx`, `ZoneMap.jsx`, `client/src/wedding/stayTravelLinks.js`, `client/src/wedding/mexicanAirports.js` y `client/src/pages/event/StayTravelEditor.jsx`. Se eliminaron `client/src/invitation/boda_jorge_macarena/Lodging.jsx` y `client/src/wedding/lodgingLinks.js`.
- **Dependencia:** `leaflet` (`^1.9.4`) agregada a `client/package.json`/`client/package-lock.json` en `4773112`; el `package-lock.json` raíz sigue siendo un cambio ajeno.

**Contrato (`events.invitation`; la UI nueva solo se usa en `boda_jorge_macarena`):**

`stay` (Hospedaje):

| Campo | Forma / default | Uso |
| ----- | --------------- | --- |
| `enabled` | boolean, default `false` | Renderiza la sección |
| `intro` | string | Texto de entrada |
| `zone` | `{lat:37.1761, lng:-3.5881, radius_km:1.5, label:"Alhambra, Granada"}` | Centro/radio del mapa y base de los links; lat/lng acotadas y radio backend 0.1–50 km |
| `checkin` / `checkout` | `YYYY-MM-DD`; defaults de UI/links **2027-06-08/12** | Fechas editables por el invitado; el backend acepta `""` y el cliente/links aplican el fallback |
| `cards[]` | máx. 12: `{id,platform,title,description,url,auto}` | Tarjetas de plataforma; `auto:true` genera el link, `auto:false` usa `url` manual validada http(s) |

- **Tarjetas por defecto (4):** Booking, Airbnb, Trivago y Google Hotels (`auto:true`).
- **Plataformas auto:** `booking`, `airbnb`, `trivago`, `google_hotels`.

`trip` (Viaje):

| Campo | Forma / default | Uso |
| ----- | --------------- | --- |
| `enabled` | boolean, default `false` | Renderiza la sección |
| `intro` | string | Texto de entrada |
| `origins[]` | máx. 20: `{code,label}`; defaults **MEX** (CDMX – Benito Juárez), **NLU** (CDMX – AIFA), **GDL** (Guadalajara) y **MTY** (Monterrey). El editor usa `mexicanAirports.js` (20 aeropuertos) | Orígenes de vuelo; el `code` es identificador interno y **no se muestra** en la UI |
| `arrivals[]` | máx. 4: `{code,label}`; default **solo MAD** (Madrid). El tope de 4 se conserva para datos legados; la UI muestra selector solo si llegan varias | Ciudad de llegada a España |
| `date_from` / `date_to` | `YYYY-MM-DD`; defaults de UI/links **2027-06-08/12** | Fechas editables; fallback si vienen vacías |
| `adults` | entero ≥1, default **1** | La UI muestra `{adults} adulto(s)`; por defecto 1 y no hay selector (tampoco en el editor) |
| `modes` | `{flight,train,bus}`, cada uno `{enabled:true,note,providers[]}` | Bloques de transporte con carrusel |
| Proveedores default | avión: `google_flights`,`skyscanner`,`kayak`; tren: `renfe`,`omio`,`trainline`; bus: `alsa`,`omio`,`flixbus` | Máx. 10 por modo |

- **Backend** (`server/src/schemas/invitation.js`): `normalizeStay`/`normalizeTrip` + schemas zod; agregados a `commonFields`, `normalizeInvitation` y `normalizeForRead` (listas siempre arrays). Los **6 templates** los validan, pero solo la UI de la boda los consume.
- **Listas vacías:** `cards: []`, `origins: []`, `arrivals: []` y `providers: []` se respetan como decisión explícita; solo `undefined`/`null` cae a los defaults (backend y cliente espejan la regla). El editor corrige `arrivals` a Madrid al abrir.
- **Espejo cliente** (`client/src/invitation/schema/normalize.js`): mismos defaults, rangos y tolerancias; `toFormState` clona arrays/objetos anidados y asigna `_uid` a las tarjetas; `serializeForm` los limpia. `schema/fields.js` conserva los descriptores legacy `lodging`/`travel`; `stay`/`trip` se editan con `setField` desde el editor dedicado.
- **Legado:** `lodging` y `travel` siguen en el JSONB y en el contrato común, pero la UI nueva **no los renderiza**. El evento 2 conserva sus 2 hoteles en `lodging`.

**UI de invitación:**

- `Travel.jsx`: con una sola llegada (caso actual) muestra una fila estática **"Llegada: Madrid"**, sin código; solo si un JSONB legado trae varias llegadas conserva el selector. El origen se elige por **nombre** entre los aeropuertos configurados; ya **no hay "Otro aeropuerto" ni input de código IATA**. Fechas editables; línea de adultos (por defecto 1); bloques avión/tren/autobús con carrusel horizontal de proveedores. En tren/autobús el origen es **Madrid** y el destino Granada. La portada muestra origen/destino por **label**, no por code. Sin precios, fotos ni logos oficiales; si faltan orígenes, modos o proveedores, muestra avisos en lugar de links.
- **Nota por defecto del vuelo:** “Vuelo internacional a Madrid; desde ahí continúa a Granada.” (en `DEFAULT_TRIP_MODES.flight.note`).
- `Stay.jsx`: mapa **Leaflet + OpenStreetMap** (sin API key) con centro, círculo y punto; etiqueta + enlace a Google Maps; fechas editables; carrusel de tarjetas de plataforma. Sin fotos ni precios; sin tarjetas muestra un aviso.
- `ZoneMap.jsx`: mapa lazy (Leaflet toca `window`); `readOnly` por defecto para el invitado; con `readOnly={false}` un clic llama `onChange({lat,lng})` (lo usa el editor). Recalcula tamaño con `ResizeObserver` e invalida al montar.

**Links (`client/src/wedding/stayTravelLinks.js`, módulo puro):**

| Sección | Proveedor / plataforma | Prefill |
| ------- | ---------------------- | ------- |
| Hospedaje | Booking | Zona (`lat`/`lng`/`radius_km`) + fechas + 1 adulto |
| Hospedaje | Airbnb | Etiqueta + fechas + bbox de la zona (`search_by_map`) |
| Hospedaje | Trivago / Google Hotels | Etiqueta + fechas |
| Vuelos | Google Flights / Skyscanner / Kayak | Origen/destino por **código interno** + fechas; la UI muestra labels |
| Tren | Omio | Madrid + fecha |
| Tren | Renfe / Trainline | Sin fecha en la URL: la UI muestra **"Selecciona la fecha en el proveedor."** |
| Bus | Omio / FlixBus | Madrid + fecha |
| Bus | ALSA | Sin fecha en la URL: mismo aviso |

- Solo devuelve URLs `http(s)`; fechas vacías/inválidas caen a **2027-06-08/12**. No hay disponibilidad ni precios en vivo.
- **Compatibilidad legada:** `CITY_SLUGS` conserva `BCN` solo para leer datos viejos; la UI ya no ofrece Barcelona.
- **Limitación:** Hospedaje fija `adults:1` en los links (no lee `trip.adults`); Viaje sí muestra `trip.adults`.

**Editor (`client/src/pages/event/StayTravelEditor.jsx`):**

- Integrado en `EventInvitation.jsx` dentro del bloque `template === "boda_jorge_macarena"`.
- Permite activar/desactivar Viaje y Hospedaje, editar intro, orígenes, fechas, modos/proveedores, zona (mapa con clic + slider **0.5–20 km** + etiqueta) y tarjetas (plataforma auto/manual, URL manual y **"Probar link"**).
- Orígenes: checkboxes con **nombres** desde `client/src/wedding/mexicanAirports.js` (20 aeropuertos); los códigos son identificadores internos y no se muestran. **MEX/NLU/GDL/MTY quedan preseleccionados** si ya estaban en el JSONB. No hay alta manual ni edición de códigos.
- La llegada es una fila estática **“Ciudad de llegada: Madrid”**, sin código, con la nota **“La llegada está fijada a Madrid.”** Un `useEffect` fuerza `trip.arrivals` a solo Madrid al abrir el editor, para que cualquier dato viejo con Barcelona se guarde corregido aunque no se toque la sección.
- Advertencias **no bloqueantes**: sin orígenes válidos, modo activo sin proveedores, sin tarjetas, zona inválida, radio fuera del rango del slider o fechas invertidas/faltantes. No impiden guardar.
- `stay`/`trip` están en `CUSTOM_EXTRA_KEYS`, así que no aparecen en la grilla genérica "Datos del formato".
- **Labels de tema eliminadas:** `travelOriginCodeLabel`, `travelOriginPlaceholder`, `travelOriginHint`, `travelOriginInvalid` y `travelOtherOrigin`.

**Seed y estado verificado (2026-10-23):**

- **Evento id 2 (BD ya actualizada):** `stay.enabled=true` y `trip.enabled=true`; `trip.arrivals=[{code:"MAD",label:"Madrid"}]`; `trip.modes.flight.note` y `trip.intro` actualizados; `origins`, `stay`, `lodging` y `travel` intactos. `lodging` conserva los 2 hoteles antiguos y `travel` legado sigue en el JSONB pero no se renderiza. La cuenta Stripe del evento 2 está asignada (`acct_1UT7NAFnv8uJBZLH`; ver §15.1).
- **API de producción** `https://macarenayjorge.com/api/public/event`: ya devuelve `stay`/`trip`; `arrivals` solo Madrid (verificado 2026-10-23). La portada y la invitación ya no muestran Barcelona.
- **Build del cliente:** OK (**557 módulos**) para `efb424b`.
- **Commits:** base **`4773112` desplegada**; **`8d70217`** (4 archivos: `Travel.jsx`, `normalize.js`, `StayTravelEditor.jsx` y `server/src/schemas/invitation.js`), **`efb424b`** (5 archivos: `Travel.jsx`, tema, `StayTravelEditor.jsx`, `MacarenaJorgeCover.jsx` y `mexicanAirports.js`) y **`ff2b988`** (Stripe; `EventInvitation.jsx`) están **commiteados en local y no desplegados**. El bundle desplegado `EventInvitation-B0EhP2gA.js` ya contiene el editor de Viaje/Hospedaje de la base `4773112` (verificado: “Activar sección Viaje/Hospedaje”, “Tarjetas de hospedaje”, sin “Agregar hotel”).
- **Working tree:** código limpio; solo quedan cambios documentales.

**Troubleshooting: bloque viejo “Hospedaje y viaje” en el panel**

- Si el panel muestra el bloque viejo **“Hospedaje y viaje”** o el botón **“Agregar hotel”**, es **caché del navegador**, no el código desplegado.
- El bundle desplegado **`EventInvitation-B0EhP2gA.js`** ya contiene el editor de Viaje/Hospedaje de la base `4773112` (“Activar sección Viaje/Hospedaje”, “Tarjetas de hospedaje”, sin “Agregar hotel”). Hacer **hard refresh** o abrir en **incógnito** para descartar caché.
- **No hay service worker**; no hace falta limpiar uno. El editor estático de Madrid y sin IATA (`8d70217` + `efb424b`) se verá tras el redeploy; en ese momento cambiará el hash del chunk.

**Pendientes de esta feature:**

- [ ] **Push de `8d70217`, `efb424b` y `ff2b988`; redeploy** para que la llegada fija a Madrid, la UI sin IATA y la cuenta Stripe restringida estén en el bundle desplegado.
- [ ] **Hard refresh del panel** para descartar caché y confirmar que se ve el editor nuevo.
- [ ] **Decidir si se eliminan las otras 3 cuentas Stripe o solo se ocultan** (hoy siguen en `stripe_accounts`/Stripe; ver §15.1).
- [ ] Verificar en `macarenayjorge.com` el mapa, los carruseles y los links con fechas (portada 04/05 e invitación personalizada) tras el redeploy.
- [ ] Decidir si se elimina el legado `lodging`/`travel` (hoy se conserva; el evento 2 mantiene 2 hoteles en `lodging`).
- [ ] Confirmar la ubicación real de la Misa (hoy placeholder "Sagrada Familia" en `cfg.locations`; no está confirmada).
- [ ] *(Opcional)* Añadir una fecha separada de traslado a Granada en `trip` (hoy solo `date_from`/`date_to`).
- [ ] *(Menor)* Declarar `stay`/`trip` en `schema/fields.js` (hoy solo están en `normalize.js` y en el schema del servidor) para que el contrato quede documentado junto a los campos legacy.

---

## 16. Portada pública del dominio propio, separada de la invitación (2026-10-19)

**Estado (2026-11-09):** la portada del dominio propio fue **actualizada al diseño v3** en el working tree (sin commit): monta `CoverSection`, `StorySection`, `LocationSection`, `DressCodeSection`, `TravelSection`, `StaySection` y `ClosingSection` de `v3/*` con `v3.css`, y ya no usa `hero_image`/`gallery`/flora v2. La base histórica se commiteó en `fae3ca5`/`389403d`; el contrato `GET /api/public/event`, la resolución por host y el SEO no cambian. **No hay migración de BD por la portada**. Ver **§18**.

> ⚠️ **Histórico:** la descripción v2 de esta sección (papel/tinta, fotos B&N, Cormorant Garamond + Montserrat, "La estancia") quedó **superada** por el rediseño v3. La estructura de Viaje (04)/Hospedaje (05) se mantiene, ahora con los componentes v3 y tren apagado.

**Objetivo y decisiones del usuario:**

- `https://macarenayjorge.com/` muestra una **portada pública del evento**, sin token, visible para cualquier invitado. Es una página **independiente** de `InvitationView`/`InvitationPage`: **no** reutiliza la invitación en modo general.
- La **invitación personalizada** de cada grupo sigue en `https://<dominio>/invitacion/<token>` (y su variante con slug), con su RSVP y su mesa de regalos.
- Portada **fija** por ahora: **no se edita desde el panel**.
- **Lenguaje visual v3** de la boda (papel de algodón, marco nazarí, granada en acuarela, letterpress, Cormorant Upright + Nikolai Condensed; ver §18).
- Incluye el contenido relevante del evento **menos la mesa de regalos**: Portada, Granada, El gran día (ubicaciones), Vestimenta, Viaje (04) y Hospedaje (05), acceso a la invitación y Cierre. La portada **no** renderiza Icebreaker, Recomendaciones, RSVP, Regalo ni Mensajes.
- Acceso a la invitación personal: instrucciones + input opcional para pegar el **enlace o token**. **Sin RSVP genérico** y **sin contactos** (decisión v3: contactos ocultos).
- El contrato público **excluye `registry`** para no exponer datos bancarios; la invitación personalizada conserva el suyo.

**Arquitectura y archivos:**

| Capa | Archivo | Rol |
| ---- | ------- | --- |
| Backend | `server/src/utils/customDomain.js` (**nuevo**) | Fuente única de normalización/validación: `normalizeCustomDomain`, `normalizeHost`, `isReservedCustomDomain`, `DOMAIN_RE`, `DOMAIN_MAX_LENGTH`. Reutilizado por administración y resolución pública. |
| Backend | `server/src/utils/eventLookup.js` (**nuevo**) | `findEventByCustomDomain(host)`: SQL único de la portada; normaliza el host y rechaza dominios reservados; selecciona solo campos públicos. |
| Backend | `server/src/routes/public.js` (**nuevo**) | `GET /api/public/event` (ver contrato). |
| Backend | `server/src/index.js` | `express.static(..., { index: false })`; catch-all que resuelve el host, inyecta marker/OG/robots y canonical; `/index.html` → 301; fallback estático si falla la BD. |
| Backend | `server/src/routes/events.js` | Usa el util compartido de dominio; **sin cambio de comportamiento** en el CRUD. |
| Backend | `server/src/utils/ogMeta.js` | `buildEventMeta`, `injectEventMeta` e `injectCustomDomainMarker`; reutiliza la inyección OG existente. |
| Frontend | `client/src/wedding/MacarenaJorgeCover.jsx` (**actualizado a v3**) | Portada independiente: `CoverSection`, `StorySection`, `LocationSection`, `DressCodeSection`, `TravelSection`, `StaySection` y `ClosingSection` de `v3/*`; Viaje (04)/Hospedaje (05); acceso “Tu invitación”; sin mesa de regalos ni contactos; footer sin marcas. Usa `v3.css` y `v3/assets.js`. |
| Frontend | `client/src/wedding/invitationLink.js` (**nuevo**) | Parser endurecido de enlace/token (URL completa, sin protocolo, token suelto y puntuación); navega siempre contra el origen actual. |
| Frontend | `client/src/lib/customDomainHome.js` (**nuevo**) | Lee el marker `de-custom-domain` del documento; la SPA no deduce el host. |
| Frontend | `client/src/App.jsx` | Rama `customHome` **antes** de la landing; carga `MacarenaJorgeCover` con `lazy` (chunk propio). |
| Frontend | `client/src/api.js` | `api.public.event()`. |
| Frontend | `client/index.html` | Limpio: sin meta temporal de la portada. |

> **v3 (2026-11-09):** la portada reutiliza las **secciones v3** (`v3/*`), `v3.css` y `v3/assets.js`; ya **no** usa `flora.jsx`, `Grain.jsx` ni `hero_image`/`gallery`. La nota histórica v2 era: reutilizaba el tema y piezas visuales de `boda_jorge_macarena` (`themes/boda_jorge_macarena.js`, `flora.jsx`, `Grain.jsx`, `helpers.js`), pero **no** montaba su layout ni `InvitationView`.

**Contrato `GET /api/public/event`:**

- **Público** (sin sesión), rate limit **120/15 min por IP** y `Cache-Control: no-store`.
- Resuelve el evento **solo por `req.hostname`**; no acepta dominio por query ni body. `normalizeHost` quita puerto, punto final y `www.` inicial; los dominios reservados (`displayevent.com` y subdominios, `localhost`, IPs y `*.railway.app`) nunca resuelven a un evento.
- `200`:

```json
{
  "event": { "name": "…", "date": "…", "time": "…", "place": "…", "invitation": { "…": "…" } },
  "public_config": { "custom_domain": "macarenayjorge.com" }
}
```

- `invitation` es `normalizeForRead(event.invitation)` **sin `registry`** (se omite por destructuring, sin mutar el objeto). Incluye los campos públicos de la portada (hero, historia, ubicaciones, itinerario, vestimenta, contactos, `stay`/`trip` y el legado `lodging`/`travel`, etc.). **No** devuelve dueño, cuentas Stripe, grupos, invitados ni tokens.
- `404 { "error": "Evento no encontrado" }` si el host no corresponde a ningún evento.

**Rutas y SEO:**

| Ruta / caso | Comportamiento |
| ----------- | -------------- |
| `/` en dominio propio | Catch-all (ya no `express.static`): marker `de-custom-domain`, OG del evento, canonical `https://<custom_domain>/`, `robots: index, follow` y **sin** `X-Robots-Tag: noindex`. `Cache-Control: public, max-age=0`. |
| `/invitacion/<token>` (y `/<slug>/<token>`) | Conserva el OG por token y el `noindex`; si el host es propio añade el marker para el white-label. La invitación y su RSVP no cambian. |
| `/index.html` | 301 a `/` para no servir el HTML crudo sin marker. |
| Otras rutas HTML del dominio propio | Reciben el marker (white-label de la SPA). |
| Host de plataforma (`displayevent.com`, `localhost`, etc.) | La landing y el comportamiento previo quedan intactos; un host no canónico conserva `X-Robots-Tag: noindex, nofollow`. |
| Fallo de BD al resolver el host | Se sirve el HTML estático (sin marker): el sitio no se cae por esta feature. |

**Verificación (2026-10-19, histórica; v3 pendiente de smoke):**

- **Backend:** 27 aserciones con `Host` — raíz custom con marker/OG/robots y sin `noindex`; API `200`/`404`; `www`; `/invitacion/<token>` con `noindex`; landing intacta; sin campos privados.
- **Frontend:** `npm run build` en `client` OK (**549 módulos**; chunk `MacarenaJorgeCover-*.js`); el chunk **no contiene `registry`**; parser **22/22** casos.
- **Integración:** servidor con `PORT=4137 node --env-file=server/.env …`; raíz custom `200` con contenido correcto y sin `noindex`; API `200`; invitación `noindex`; `displayevent`/`localhost` mantienen la landing sin marker; `/index.html` `301`; asset del cover `200`.
- **Privacidad:** se detectó que `registry` (con datos bancarios) salía en `/api/public/event`; se corrigió excluyéndolo. La invitación personalizada (`/api/invitations/:token`) sigue exponiendo su `registry` según su contrato.
- **Invitación personalizada:** no se tocaron `InvitationView`, `shared/Rsvp`, `Gifts` ni `InvitationPage`; el modo `general` que se había planteado quedó **cancelado**.
- **BD:** sin migración; el evento ya tenía `custom_domain`; no hace falta `init-db` para esta feature.

**Pendientes:**

- **Deploy v3:** la portada v3 está en el working tree, **sin commit ni push**; falta build, smoke en `macarenayjorge.com` y verificación del OG. La base histórica `fae3ca5`/`4773112` sí está desplegada.
- **Viaje/Hospedaje:** contrato desplegado (`4773112`); la UI v3 (Madrid fijo, tren apagado, hoteles máx. 2) está en el working tree. La antigua "La estancia/hoteles" (§16.1) queda como legado. Quedan la validación visual en el dominio y la integración futura con Booking (API/afiliado).
- **Verificar el OG con crawler** tras el deploy (raíz + invitación personalizada).
- **`www`/apex:** la resolución tolera `www` y canonicaliza al dominio guardado, pero la redirección operativa sigue pendiente (ver §13.4 y §8).
- **`CLIENT_URL`:** decisión abierta y sin cambios por esta feature (ver §8/§15).
- La portada es **fija**: cualquier cambio de contenido/estructura requiere código, no panel.

### 16.1 Rediseño de La estancia, hoteles reales y scroll suave (2026-10-19)

**Estado:** cambios **commiteados en `389403d`** (2026-10-19); **deploy pendiente**. **Sin migración de BD:** solo se actualizó el JSONB `events.invitation` del evento id 2 (`custom_domain = "macarenayjorge.com"`); `npm run init-db` no aplica.

> ⚠️ **Histórico/superado (2026-11-09):** esta sección describe la **antigua** "La estancia" combinada (hoteles + cómo llegar). Fue reemplazada por **Viaje** y **Hospedaje** independientes (base `4773112` desplegada; la UI v3 está en el working tree; ver **§18**). `Lodging.jsx` y `lodgingLinks.js` fueron eliminados en `4773112`; `FeaturedHotel`/`SecondaryHotel`/`StayAction`/`hotelLinks` ya no existen. Los hoteles de abajo se conservan en `invitation.lodging` (el evento 2 mantiene 2) y **v3 sí los renderiza** como “Hotel recomendado” (máx. 2).

**Diseño histórico de la sección ("La estancia", antes "Hospedaje y viaje"):**

- Bloque editorial a **dos columnas** en `MacarenaJorgeCover.jsx`: foto a sangre + panel de papel.
- La foto sale de `cfg.gallery`: prioriza una imagen no usada por Hero (`hero_image`/`gallery[0]`) ni Story (la siguiente distinta); si no hay, cae a `gallery[1]`/`gallery[0]`. B&N cálido (`grayscale` + `sepia`), caption **"Granada · Andalucía"** y mes-año del evento.
- El panel lleva index **04**, título **"La estancia"**, kicker "Para quienes vienen de lejos" e intro editorial.
- **Tarjeta destacada del primer hotel** (número 01): nombre, nota, "Recomendación de los novios" y CTA **"Ver mapa"** / **"Ver disponibilidad"**.
- **Hoteles secundarios** en lista numerada, con los mismos enlaces por hotel.
- **"Cómo llegar"**: si `cfg.travel` tiene contenido (`title`, `airport_note`, `routes`, `closing_note`) se muestra ese bloque; si no, una línea con "Granada · España" y **"Ver mapa de la ciudad"** (Google Maps generado).
- CTA **"¿Necesitas ayuda con tu reserva?"** con el primer contacto válido del evento (WhatsApp > teléfono > email).
- **Sin mesa de regalos, datos bancarios ni marcas.** Si no hay `lodging` ni `travel`, la sección no se renderiza.

**Hoteles cargados (legado en `invitation.lodging` del evento id 2; la UI nueva no los muestra):**

1. **Parador de Granada** — destacado. Nota: "Dentro del recinto de la Alhambra, en un antiguo convento del siglo XV. Jardines, historia y vistas al Generalife." `url`: `https://www.booking.com/hotel/es/parador-de-granada.es.html`
2. **Hotel América Granada** — secundario. Nota: "También dentro del recinto de la Alhambra, a pocos metros de los Palacios Nazaríes. Una opción tradicional y bien situada para explorar Granada." `url`: `https://www.booking.com/hotel/es/america-granada.es.html`

Sustituyen al placeholder **"Hotel ESPAÑA"** (Google Maps, sin nota). Los enlaces de Booking quedaron limpios, sin parámetros de campaña; el resto de claves de `invitation` no cambió.

**Convención de enlaces de hotel (legado; `lodgingLinks.js` eliminado en `4773112`):**

- `url` de mapas (Google/Apple/Waze) → **"Ver mapa"** la usa tal cual; **"Ver disponibilidad"** busca en Booking las noches alrededor de la boda.
- `url` que no es de mapas (Booking o web del hotel) → **"Ver disponibilidad"** la usa tal cual; el mapa se genera con **nombre + lugar**.
- Sin `url` → se generan ambos enlaces (mapa por nombre/lugar y búsqueda en Booking).
- Lógica pura en `lodgingLinks.js` (`hotelLinks`) + `isMapsUrl` en `helpers.js`; la invitación (`Lodging.jsx`) muestra **"Mapa"** y **"Reservar"** por separado.

**Archivos de esta iteración:**

| Archivo | Cambio |
| ------- | ------ |
| `client/src/wedding/MacarenaJorgeCover.jsx` | Rediseño histórico de la sección (`Stay`, `FeaturedHotel`, `SecondaryHotel`, `StayAction`) y `useSmoothCoverScroll`; en `4773112` fue reemplazado por `TravelSection`/`StaySection` (ver §15.2). |
| `client/src/wedding/lodgingLinks.js` (**nuevo entonces; eliminado en `4773112`**) | `hotelLinks(hotel, place, eventDate)`: enlaces de mapa/reserva y búsqueda en Booking con las noches alrededor de la boda. Sustituido por `stayTravelLinks.js` (§15.2). |
| `client/src/invitation/boda_jorge_macarena/helpers.js` | Nuevo `isMapsUrl` (Google Maps/`goo.gl`/`maps.app.goo.gl`, Apple Maps y Waze). |
| `client/src/invitation/boda_jorge_macarena/Lodging.jsx` (**eliminado en `4773112`**) | La hoja de invitación separaba **"Mapa"** y **"Reservar"** según `url`; sustituida por `Travel.jsx` + `Stay.jsx` (§15.2). |
| `client/src/pages/event/EventInvitation.jsx` | Ayuda y placeholder del hotel: "Enlace del mapa o de reserva". |
| `client/src/index.css` | `html.de-cover-scroll { scroll-behavior: smooth; }` (la regla global de `prefers-reduced-motion` lo desactiva). |

**Scroll suave y reduced motion:**

- `useSmoothCoverScroll` añade/retira `de-cover-scroll` a `<html>` solo mientras la portada está montada (se limpia al navegar a `/invitacion/<token>`).
- `index.css` define `html.de-cover-scroll { scroll-behavior: smooth; }`; el bloque `@media (prefers-reduced-motion: reduce)` fuerza `scroll-behavior: auto !important`.
- Los CTAs del Hero y `StayAction` tienen feedback táctil sutil (`active:translate-y-px`).

**Verificación (2026-10-19, reportada) y pendientes:**

- `npm run build` OK (**550 módulos**); el chunk de la portada **no contiene `registry`**.
- Casos mock de URL de mapas vs Booking validados (`isMapsUrl`/`hotelLinks`).
- Scroll suave y `prefers-reduced-motion` validados en Chrome headless.
- **Pendientes:** validación visual final con los datos reales y en el dominio tras el deploy; integración futura de disponibilidad/precios reales de Booking (requiere API/afiliado; hoy los enlaces son directos o búsquedas). El commit ya está hecho (`389403d`).

---

## 17. Referencias y documentación del repo

- `README.md` — guía general (setup, scripts, API completa). Menciona **Railway** para el dominio personalizado (correcto; plataforma confirmada el 2026-10-11; ver §7).
- `AUDITORIA.md` — auditoría de bugs del panel y de la landing/SEO, y su estado (resueltos/abiertos; §4.5 = hallazgos del 2026-09-11).
- `PLAN_INVITACIONES_MULTIFORMATO.md` — plan de la reestructuración multiformato.
- `INVITACION_BODA_JORGE_MACARENA.md` — doc de datos dinámicos de la plantilla, **actualizado al diseño v4** (2026-11-10): reemplazo en sitio, contrato extendido (`og_image`, `icebreaker`, `recommendations` con `phone`/`taxi`, `locations`, `bank.clabe`, `bank_eur`, `stay.quote`), RSVP/Regalo v3, **alergias v4**, endpoints de mensajes, **cuenta webi/BBVA, blindaje de pagos y panel de conciliación**, y pendientes.
- `Invitación Macarena & Jorge/` — mock de referencia del rediseño v2 (`.dc.html` + `Flor`/`Ramillete` + `support.js`; **sin seguimiento en git** al 2026-10-11). El paquete v3 vive en `invitacion-macarena-jorge-v3/` (+ `.zip`), también sin seguimiento.
- `FORMATO LISTA DE INVITADOS 2026.xlsx` — archivo de cliente (git-ignored por patrón `*.xlsx`).
- `render.yaml` — definición **legacy de Render** (Railway no la usa; se conserva o se borra por decisión humana).

### Historial reciente relevante (git)

> El trabajo de **§18** (rediseño v3 + delta v4) está en el **working tree, sin commit ni push** al 2026-11-10: no hay hash todavía. El trabajo de **§15.2** (Viaje/Hospedaje) quedó commiteado en **`4773112`**, con ajustes locales en **`8d70217`** y **`efb424b`**; la restricción de cuenta Stripe es **`ff2b988`**. El blindaje de pagos y el panel de conciliación son **`a9610b6`** y **`6fbc07c`**, locales y sin deploy (ver §15.1.1).

| Commit | Descripción |
| ------ | ----------- |
| `6fbc07c` | Panel: agregar conciliación de pagos y regalos (`/events/:id/pagos`, `GET /api/events/:id/gifts`); local, no desplegado; ver §15.1.1. |
| `a9610b6` | Pagos: blindar checkout y registrar cuenta destino (`amount > 0`, solo tarjeta, `destination_account`, webhook async idempotente, columnas/backfill en `gifts`); local, no desplegado; ver §15.1.1. |
| `ff2b988` | Pagos: mostrar solo la cuenta Stripe activa del evento (restricción de UI; cuentas ocultas, no borradas); local, no desplegado; ver §15.1. |
| `efb424b` | Viaje: quitar códigos IATA de la UI (catálogo de 20 aeropuertos por nombre, sin “Otro aeropuerto”); local, no desplegado; ver §15.2. |
| `8d70217` | Viaje: fijar la llegada a Madrid (defaults y editor solo Madrid, fila estática en la invitación; evento 2 actualizado en BD); local, no desplegado; ver §15.2. |
| `4773112` | Boda Macarena & Jorge: separar Viaje y Hospedaje con mapa y links (contrato `stay`/`trip`, `Travel`/`Stay`/`ZoneMap`, editor; el seed del evento 2 se aplicó en la BD); desplegado; ver §15.2. |
| `389403d` | Boda Macarena & Jorge: rediseño de "La estancia" (hoteles reales) y scroll suave de la portada; ver §16.1. |
| `fae3ca5` | Boda Macarena & Jorge: portada pública del dominio propio separada de la invitación; ver §16. |
| `2abf462` | Pagos: permitir cobros convertidos cuando la cuenta Connect no coincide en moneda (Plan B); incluye la actualización de docs de la fase; ver §15. |
| `2718f6f` | Pagos: liquidar con `on_behalf_of` los cargos a cuentas Connect fuera de la región (fix cross-región; ver §15). |
| `1ea314f` | Pagos: conectar Stripe Connect (Express, ruteo por moneda) y corregir el guardado durante subidas; ver §15. |
| `a60d442` | Boda Macarena & Jorge: rediseñar la invitación (v2), OG dinámico por token y audio; ver §15. |
| `f2a179a` | Invitados y Dashboard: buscador y filtros por WhatsApp y RSVP; ver §14. |
| `9d4bf71` | RSVP: copy de motivación y "antes del" en el límite de edición; ver §4. |
| `be5e9c6` | Servidor: `CLIENT_URL` tolerante a listas separadas por comas (enlaces de invitación); ver §7. |
| `1241bfd` | XV de Alice: sobre con "Toca para abrir" y Padres y Padrinos sin eyebrow; ver §6. |
| `86be029` | RSVP: límite configurable de edición de la confirmación (`rsvp_edit_deadline`); ver §4. |
| `6ca17df` | Invitación: popover informativo en la Mesa de Regalos de `alice_xv`; ver §6. |
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

---

## 18. Boda Jorge & Macarena — rediseño v3 + delta v4 (2026-11-10, working tree)

**Estado y alcance**

- La plantilla **`boda_jorge_macarena` fue reemplazada en sitio** por el diseño **v3**; el **delta v4** lo extiende sin cambiar de plantilla. **No hay plantilla nueva ni selector v2/v3/v4**: el mismo `template` y el mismo `BodaJorgeMacarenaLayout.jsx` montan las secciones actuales.
- El código v4 está en el **working tree, sin commit ni push** al 2026-11-10. El v2 (§15) y el diseño nocturno anterior (§6/§16 histórico) quedan como referencia. El delta v4 se detalla en **§18.1**.
- **No se tocó `alice_xv`**. Los archivos v2 de la boda siguen en disco (`Hero.jsx`, `Story.jsx`, `Locations.jsx`, `Itinerary.jsx`, `DressCode.jsx`, `Gifts.jsx`, `Travel.jsx`, `Stay.jsx`, `ZoneMap.jsx`, `Footer.jsx`, `SectionPhoto.jsx`, `flora.jsx`, `Grain.jsx`), pero el layout **ya no los importa**.
- La **portada del dominio propio** (`MacarenaJorgeCover.jsx`) también se actualizó a v3 (ver §16).

**Diseño**

- **Papel de algodón** (`.algodon`): fondo `#F5F4F1` con texturas SVG de ruido/fibra y sombra interior; hoja con marco y acabado **letterpress** (`text-shadow` claro/oscuro).
- **Marco nazarí** (`NazariFrame` + reglas `.nzx`/`.nzy`/`.nzc`): greca superior/inferior, laterales y esquinas geométricas.
- **Granada en acuarela** (`.granada`, SVG con turbulencia/desplazamiento y `mix-blend-mode: multiply`) y **dibujos `.webp` con multiply** (`.mj-drawing`), de modo que el papel se transparenta.
- **Tipografías:** **Cormorant Upright** (display; fallback Cormorant Garamond/Georgia) y **Nikolai Condensed** (labels; fallback Nikolai/Noto Serif Display/Georgia). `v3.css` importa Cormorant Upright y Noto Serif Display desde Google Fonts; Nikolai se declara con `@font-face` local en `/fonts/Nikolai-Condensed.woff2`.
- **Orden de tarjetas:** Portada · Granada, España · Icebreaker · Ceremonia · Celebración · Vestimenta · Recomendaciones · Viaje · Hospedaje · Confirmación · Regalo · Cierre.
- **No se montan:** Itinerario, Galería, Contactos, portada genérica (`hero_image`/`kicker`/`tagline`) ni fondos de foto por sección. `gallery`, `hero_image` y `contacts` quedan vacíos en el seed.
- **Sobre editorial v3** (`EditorialEnvelope.jsx`): papel blanco/algodón, sello gris “M&J”, secuencia solapa → sello → carta → pantalla completa → fundido; conserva el bloqueo de scroll y `prefers-reduced-motion`.
- **Música** (`MusicToggle.jsx`): se mantiene; el botón solo se monta si `cfg.music_url` tiene valor. Sin autoplay y en loop.
- **Revelado** (`useV3Reveal`): `[data-rv]`/`[data-foto]` con `IntersectionObserver`, umbral 0.12 y respeto a `prefers-reduced-motion`.

**Componentes nuevos (`client/src/invitation/boda_jorge_macarena/v3/`)**

| Archivo | Rol |
| ------- | --- |
| `index.js` | Re-exporta `ui.jsx`. |
| `ui.jsx` | Primitivas y defaults: `DEFAULT_STORY`, `DEFAULT_ICEBREAKER_TEXT`, `DEFAULT_RECOMMENDATIONS`, `DEFAULT_LOCATION_EYEBROWS`, `DEFAULT_LODGING`, `DEFAULT_DRESS`, `DEFAULT_STAY_QUOTE`, `WEDDING_TARGET`, `RSVP_DEADLINE_DEFAULT`; `NazariFrame`, `OrnamentRule`, `Eyebrow`, `InfoCard`, `PaperCard`, `Button`, `Drawing`, `useV3Reveal`, copiado. |
| `assets.js` | `V3_DIR`, `v3Asset`, `resolveInvitationImage` (http(s), `/uploads`, `invitations/…`; rechaza valores inseguros) y mapa `V3` de los `.webp` + `og` + `webiLogo`. |
| `CoverSection.jsx` | Portada: nombres, fecha sobre el dibujo, cuenta regresiva (`useCountdown`) y “Desliza”. |
| `StorySection.jsx` | “Granada, España”: dibujo y relato (`story`; párrafos separados por línea en blanco). |
| `IcebreakerSection.jsx` | Tarjeta previa con fecha/horario y dibujo configurable. |
| `LocationSection.jsx` | Una hoja por ubicación: eyebrow (Ceremonia/Celebración), descripción, hora/cuándo, dibujo y mapa estático; enlace a Google Maps. |
| `DressCodeSection.jsx` | Vestimenta: etiquetas + nota + dibujo + botón **“Ver ideas”** (modal v4 con 3 fotos de “Ellos” y 3 de “Ellas”). |
| `RecommendationsSection.jsx` | Lista de recomendaciones con iconos `shoe`/`weather`/`transport`/`taxi`/`stay`; renderiza `**negrita**` y `{phone}` (enlace `tel:`). Desde v4 usa `c-p10.webp` (4/3) por defecto. |
| `TravelSection.jsx` | Viaje: llegada fija Madrid, origen por `trip.origins`, fechas, avión/autobús y proveedores (incluye Iberia/Aeroméxico); **sin tren**. |
| `StaySection.jsx` | Hospedaje: máximo 2 hoteles de `lodging`, mapa estático del Albaicín, fechas, tarjetas de plataforma y cita (`stay.quote`/`quote_author`). |
| `RsvpSection.jsx` | RSVP propio v3 (ver abajo). |
| `GiftsSection.jsx` | Regalo v3 (ver abajo). |
| `ClosingSection.jsx` | Cierre: dibujo, frase, monograma, lugar/fecha, badge Webi y “DisplayEvent” salvo `hideBrand`. |

El sistema visual está en **`client/src/invitation/boda_jorge_macarena/v3.css`** (scope `.mjv3` y `[data-invitation-theme="boda_jorge_macarena"]`), importado por el layout, el sobre y la portada del dominio.

**Editor**

- **`client/src/pages/event/BodaJorgeMacarenaV3Editor.jsx`** (visible solo con `template === "boda_jorge_macarena"`), integrado en `EventInvitation.jsx`. Agrupa:
  - “Granada, España · relato y música”: `story`, `music_url` (URL + subida de audio) y `og_image` (subida o URL).
  - **Icebreaker:** `icebreaker.enabled/eyebrow/title/text/date_label/time_place_label/image`.
  - **Recomendaciones:** `recommendations.enabled/eyebrow/title/image/items[]` (`icon`, `title`, `text`, `phone`; iconos shoe/weather/transport/taxi/stay). El texto admite `**negrita**` y `{phone}`.
  - **Ceremonia y celebración:** `locations[]` extendidas (`label`, `place`, `url`, `description`, `time_label`, `time_value`, `when_label`, `when_value`, `image`, `map_image`); la primera se rotula ceremonia y la segunda celebración.
  - **Hoteles recomendados:** `lodging[]` (máximo 2) con `name`, `note`, `url`.
  - **Hospedaje · cita:** `stay.quote`, `stay.quote_author`.
  - **Correo para mensajes de los novios:** `gift_message_email` (nivel evento; se guarda con `PUT /api/events/:id`, no en el JSONB de invitación).
  - **Viaje/Hospedaje:** reutiliza `StayTravelEditor.jsx`.
- **Ocultamiento en `EventInvitation.jsx` cuando `isV3`:** Portada genérica (Hero), Itinerario, Ubicaciones genéricas, Galería y Contactos. También se retiró `registry_note` de los campos del formato. `CUSTOM_EXTRA_KEYS` excluye de la grilla genérica `story`, `music_url`, `og_image`, `lodging`, `travel`, `stay`, `trip`, `icebreaker.*`, `recommendations.*`, `stay.quote*`, `registry.bank.clabe` y `registry.bank_eur.*`.
- Al guardar la boda v3 se fuerza `registry.allow_custom = true` (el diseño usa monto libre; evita que una configuración vieja bloquee la pasarela).
- `StayTravelEditor.jsx` fuerza `trip.modes.train.enabled = false` al abrir la boda v3 y no ofrece el modo tren en la UI.

**RSVP v3 (`v3/RsvpSection.jsx`)**

- Usa **familias reales** (`family` → “Familia X”) y la lista de `guests` del grupo; **no muestra “Líder”** ni el modal/contactos de `shared/Rsvp.jsx` (la boda ya no usa el RSVP compartido).
- **Plazo:** `rsvp_editable` + `rsvp_edit_deadline`; la fecha se muestra en **hora de España** (`Europe/Madrid`) y hay contador días/horas/min. Estados:
  - **Enviado:** sobre animado + “¡Gracias, Familia X!”; botón **“Modificar respuesta”** si sigue editable.
  - **Plazo cerrado:** “El plazo de confirmación ha terminado” si no hay respuesta; si ya respondió, resumen y “El plazo para modificar la confirmación terminó.”
  - **Edición:** permitida mientras `rsvp_editable` y no vencido; el formulario precarga las respuestas.
- **Alergias y rango de edad (v4):** por cada invitado que asiste se pregunta **“¿Alguna alergia alimentaria?”** (Sí/No, con notas ≤500) y se elige **Edad** con un **selector single-select** (checkbox visual) alimentado por `data.age_ranges`. El submit exige alergia y rango para los asistentes (`pending` incluye `typeof allergies[id] !== "boolean"` y un `range_id` válido); si no hay rangos configurados, muestra “Los rangos de edad se configuran en el panel” y **no bloquea**. Solo `boda_jorge_macarena` muestra estos campos.
- Envío a `PUT /api/invitations/:token/rsvp` con `attending_ids`, `declining_ids`, `note`, **`allergies: [{ guest_id, has_allergy, notes }]`** y **`age_selections: [{ guest_id, range_id }]`**. El backend valida contra los `age_ranges` del evento, guarda `age_range_id` + `age_range_label` (snapshot) y persiste en la **misma transacción**; para no asistentes o `range_id:null` deja `NULL`. `ages` (numérico) queda como legado/compatibilidad. Después **relee `guests`** para devolver los valores actualizados. `preview` no envía.
- El **panel de Invitados** y el **PDF de detalle** muestran `Edad: {age_range_label}` con **fallback numérico** al legado `guest.age`; si el invitado ya confirmó y no hay dato, muestran “Rango de edad sin registrar”. También conservan “Alergia: …”/“Alergia sin registrar”.

**Regalo v3 (`v3/GiftsSection.jsx`)**

- Moneda **MXN/EUR** y monto libre (sin chips de sugeridos). El banco cambia de bloque según moneda: **México** (banco, titular, cuenta, **CLABE**, concepto) y **España** (banco, titular, **IBAN**, concepto); títulos “Desde México”/“Desde España”.
- **Stripe:** si `registry.payment_link_url` existe, el CTA abre el **Payment Link** externo; si no, crea una **Checkout Session embebida** (`POST /api/invitations/:token/payment` → `client_secret`; `createEmbeddedCheckoutPage`/`initEmbeddedCheckout`). Maneja `?payment=success|cancelled`, errores y reintento. `payment_methods.card[moneda]` sigue gobernando la disponibilidad.
- **Mensaje a los novios:** el textarea **solo aparece tras copiar la CLABE (MXN) o el IBAN (EUR) o tocar “Pagar con tarjeta”**; se envía a `POST /api/invitations/:token/gift-message` con `message`, `currency`, `channel` (`transfer`/`card`) y `amount` opcional. Se guarda siempre; el correo es best-effort. La confirmación es “¡Gracias! Vuestro mensaje ya está en camino a los novios.”
- La cuenta EUR queda **deshabilitada** por defecto (`registry.bank_eur.enabled:false`) hasta configurarla en el panel.

**Backend y datos**

- **BD** (`server/src/db/schema.sql`): tabla **`gift_messages`** (`id`, `event_id` FK, `group_id` FK nullable, `sender_name`, `message`, `amount_minor` BIGINT, `currency`, `channel`, `created_at`, `read_at`) + índice `idx_gift_messages_event` + RLS. Columnas **`events.gift_message_email`** (`VARCHAR(255)`), **`guests.allergy`** (`BOOLEAN`, NULL = sin responder), **`guests.allergy_notes`** (`VARCHAR(500)`), **`guests.age_range_id`** (`VARCHAR(80)`), **`guests.age_range_label`** (`VARCHAR(40)`) y **`guests.age`** (`SMALLINT`, legado). El esquema se aplica con `npm run init-db`; en la BD del evento 2 ya está aplicado (el correo de mensajes está configurado y hay 1 mensaje guardado).
- **Endpoints:**
  - `POST /api/invitations/:token/gift-message` (público, rate limit 10/15 min): mensaje ≤1000; `amount` entero ≥0 y ≤`MAX_AMOUNT`; `currency` mxn/eur; `channel` transfer/card. Guarda en `gift_messages`; responde `{ ok:true }` aunque falle el correo.
  - `GET /api/events/:id/gift-messages` (dueño): lista del más reciente al más antiguo.
  - `PATCH /api/events/:id/gift-messages/:messageId` (dueño): `{ read: boolean }`; set/clear `read_at`.
  - `PUT /api/events/:id`: acepta `gift_message_email` (ausente = conservar; `""`/`null` = borrar; valida formato y longitud).
- **Correo** (`server/src/utils/mailer.js`): `sendGiftMessageEmail` usa Brevo o SMTP; destinatario `gift_message_email` con **fallback al email del dueño**; asunto “Nuevo mensaje para {evento}”; incluye familia/grupo, líder si existe, monto (“No indicó monto” si vacío), canal, fecha en **hora de España** y enlace al panel `/events/:id/mensajes`. Los fallos se loguean y no rompen la respuesta pública.
- **OG** (`server/src/utils/ogMeta.js`): prioridad de imagen `og_image` → `hero_image` → `gallery[0]` → `og-image.png`. `findInvitationByToken` incluye `gift_message_email` solo para el envío privado; **no se expone** en respuestas públicas.
- **Panel:** `EventMessages.jsx` + ruta `/events/:id/mensajes` + entrada “Mensajes” en el sidebar; `api.events.giftMessages` / `markGiftMessageRead` y `api.invitations.giftMessage`.

**Datos (`server/src/scripts/update-event-macarena-v3.js`)**

- Script **idempotente y no destructivo** (merge del JSONB `invitation`) para el evento id 2 (o nombre Macarena+Jorge, con verificación). Por defecto **dry-run**; escribe solo con **`--apply`**. No toca `gift_message_email` (columna del evento).
- Actualiza: `template/version/couple`; `story`; `icebreaker` (enabled, textos, fecha “Martes 8 de junio”, “Por confirmar”); `recommendations` (**5 items**, `image: invitations/macarena-jorge-v3/c-p10.webp` y la nueva “Moverse por Granada” con icono `taxi`, teléfono +34 958 28 00 00 y texto con `**negrita**`/`{phone}`); `locations` (San Pedro y San Pablo / Carmen de los Chapiteles, con descripción, horas, imágenes y mapas); `dress_code` Formal + nota; `itinerary: []`; `gallery: []`; `hero_image: ""`; `contacts: []`; `og_image: invitations/macarena-jorge-v3/og-v3.jpg`; `lodging` (Hotel Alhambra Palace y Parador de Granada, máx. 2); `stay` (Albaicín, 2027-06-08/12, tarjetas Booking/Airbnb/Trivago/Google Hotels, cita de Icaza); `trip` (4 orígenes, llegada Madrid, fechas, 1 adulto, avión y autobús on, **tren off**); `registry` (allow_custom, mínimos, BBVA + CLABE, `bank_eur` deshabilitada, conserva `enabled/stripe_enabled/payment_link_url/sugeridos`); `rsvp_editable: true`; `rsvp_edit_deadline: 2027-02-21T14:00:00+01:00`. Conserva `music_url`.
- **Aplicado:** el seed v4 del evento 2 está aplicado (5 recomendaciones + `c-p10`). El esquema (`init-db`) también está aplicado, incluidas las columnas de alergia y **`guests.age_range_id`/`age_range_label`** (198 invitados con rango NULL al momento).

**Decisiones v3**

- **Contactos ocultos:** ni la portada ni el RSVP ni el cierre muestran `contacts`/`contact_note`; el seed los vacía.
- **Música:** se conserva `music_url`; el botón solo aparece si hay URL.
- **Tren apagado:** `trip.modes.train.enabled = false`; Viaje solo muestra avión y autobús.
- **Fidelidad de diseño sobre contraste:** se mantiene la paleta baja en contraste del prototipo (tinta `#585C62`, títulos `#74787E`, papel `#F5F4F1`) y el letterpress; no se ajustaron colores para AA.
- **Portada del dominio también v3:** `MacarenaJorgeCover.jsx` reutiliza los componentes v3 y los dibujos del paquete, no `gallery`/`hero_image`.
- **Sin plantilla nueva ni selector v2/v3/v4:** el reemplazo es en sitio; el v4 es un delta de la misma plantilla.

**Pendientes reales**

- [ ] **Falta `client/public/fonts/Nikolai-Condensed.woff2`** (el directorio existe vacío); mientras no se suba, Nikolai cae al fallback.
- [ ] **Commit/deploy + smoke:** no hay commit v4; falta `npm run build`, smoke de la invitación/portada, “Ver ideas”, recomendaciones, **alergias/edad**, PDF, OG con crawler y bandeja de mensajes.
- [ ] **Assets v4:** `client/public/invitations/macarena-jorge-v3/` contiene ahora 15 `.webp` (incluye `c-p10` y `c-p1` actualizado), 6 `idea-*.jpg`, `og-v3.jpg` y `webi-logo.png`; confirmar que entran al build/deploy.
- [ ] **Verificar el guardado real del editor con sesión** (bloques nuevos, `phone` de recomendaciones y subida de audio/OG).

### 18.1 Delta v4 + rango de edad por invitado (2026-11-10)

**Estado:** implementado sobre la base v3 en el **working tree** (sin commit ni push). El esquema y el seed v4 ya están aplicados; solo quedan **fuente Nikolai** y **deploy**.

**1) Vestimenta — “Ver ideas”**

- `v3/DressCodeSection.jsx` añade el botón **“Ver ideas”** (`aria-haspopup="dialog"`/`aria-expanded`) que abre un modal con **3 fotos de “Ellos”** y **3 de “Ellas”** (`idea-ellos-1..3.jpg`, `idea-ellas-1..3.jpg`, mapeadas en `v3/assets.js`).
- El modal se monta con **`createPortal` a `document.body`** (scope `.mjv3` + `algodon`), `role="dialog"`/`aria-modal`, bloquea el scroll del body, cierra con **Escape**, con la **×** o clic en el backdrop, enfoca el botón de cierre al abrir y **restaura el foco** al cerrar. Respeta `prefers-reduced-motion`.

**2) Recomendaciones**

- Imagen por defecto: **`c-p10.webp`** (4/3, “Macarena y Jorge en el Real Alcázar”) en lugar de `c-p2`.
- Nueva recomendación **“Moverse por Granada”** (icono **`taxi`**): menciona **PideTaxi**, teléfono **+34 958 28 00 00** (campo `phone`, enlace `tel:`), y App Store/Google Play en el texto.
- El texto enriquecido admite **`**negrita**`** y **`{phone}`** (el segundo se sustituye por el teléfono con `href="tel:..."`); el editor permite editar `phone`.
- El contrato/normalización acepta `recommendations.items[].phone` y el icono `taxi` en cliente y servidor. `DEFAULT_RECOMMENDATIONS` pasa a **5** elementos.

**3) RSVP — alergias alimentarias y rango de edad por invitado**

- **BD:** `guests.allergy BOOLEAN` (NULL = sin responder), `guests.allergy_notes VARCHAR(500)`, **`guests.age_range_id VARCHAR(80)`** y **`guests.age_range_label VARCHAR(40)`**, aplicadas con `init-db` (`schema.sql`); `guests.age SMALLINT` queda como **legado**. Al momento de este ajuste hay **198 invitados con `age_range_id`/`age_range_label` NULL**.
- **UI (solo `boda_jorge_macarena`):** al marcar “Sí asistirá” aparece **Edad** como **selector single-select con checkbox visual** por rango (los rangos vienen de `GET /api/invitations/:token` → `age_ranges`) y “¿Alguna alergia alimentaria?” (Sí/No; si es Sí, input libre ≤500). El submit se bloquea hasta completar asistencia + alergia + rango; si no hay rangos configurados muestra “Los rangos de edad se configuran en el panel” y **no bloquea**. El endpoint es compartido y `age_selections` es opcional.
- **Payload:** `allergies: [{ guest_id, has_allergy, notes }]` y **`age_selections: [{ guest_id, range_id }]`** (opcional) junto a `attending_ids`/`declining_ids`/`note`; `ages` numérico queda como legado.
- **Backend:** valida estructura, boolean/null, notas ≤500 y `range_id` contra los `age_ranges` del evento; verifica pertenencia al grupo; persiste **en la misma transacción** del RSVP (asistencia + alergias + rango), guardando `age_range_id` + `age_range_label` (snapshot del label); no asistente o `range_id:null` → `NULL`. Después **relee `guests`** y responde con `guests[]` actualizados (incluye `allergy`/`allergy_notes`/`age_range_id`/`age_range_label`).
- **Panel/PDF:** `EventGuests.jsx` y el PDF muestran `Edad: {age_range_label}` con **fallback numérico** al legado `guest.age`; si falta y el invitado confirmó, “Rango de edad sin registrar”. Conservan “Alergia: …”/“Alergia sin registrar”.

**4) Assets**

- Nuevos en `client/public/invitations/macarena-jorge-v3/`: **`c-p10.webp`** y **6 `idea-*.jpg`**; **`c-p1.webp` actualizado** a v4. Total actual: 15 `.webp` + 6 `.jpg` + `og-v3.jpg` + `webi-logo.png`.

**5) Seed y datos**

- `server/src/scripts/update-event-macarena-v3.js` (mismo nombre) se actualizó al delta v4: **5 recomendaciones**, `recommendations.image = invitations/macarena-jorge-v3/c-p10.webp`, nueva recomendación taxi y verificación posterior acorde.
- El evento 2 ya tiene el seed v4 aplicado; las columnas de alergia y **rango de edad** se aplicaron con `init-db` (198 invitados con `age_range_id`/`age_range_label` NULL al momento).
- **Correo de mensajes del evento 2:** ya está configurado en el panel y existe **1 mensaje guardado** (actividad externa; **no tocar**).

**6) Rangos de edad del dashboard**

- **BD/API:** `events.age_ranges JSONB` nullable con `{ id, label, min, max }` (ids default `baby`/`child`/`teen`/`adult`); `PUT /api/events/:id/age-ranges` con `{ ranges }` (auth/ownership, máximo 20, `id` único 1..80, label 1..40, `min` 0..120, `max` exclusivo > min y ≤120 o `null`, sin solapamientos, abierto solo al final, permite huecos y ordena por `min`); responde `{ ok:true, age_ranges }`. `GET /api/events/:id` ya los devuelve y `GET /api/invitations/:token` los expone en el **nivel raíz**.
- **UI:** `AgeRangesSection.jsx` en Dashboard, debajo de StatCards. Defaults **Bebé 0–3 (`baby`), Niño 3–12 (`child`), Adolescente 12–18 (`teen`), Adulto 18+ (`adult`)**; edición con agregar/quitar, label/desde/hasta (ids internos), **Restaurar ejemplo**, Guardar/Cancelar y validación cliente. Tarjetas con total/confirmados por rango + **“Sin rango de edad”** y **“Rango no configurado”**.
- **Alcance:** los rangos son por evento; solo `boda_jorge_macarena` captura el rango en el RSVP. El conteo usa `guest.age_range_id` + `registered`, con **fallback legado** a `guest.age`. Los eventos existentes tienen `age_ranges = NULL` y la UI muestra los defaults hasta guardar.

**7) Pendientes**

- [ ] Fuente **`client/public/fonts/Nikolai-Condensed.woff2`**.
- [ ] **Commit/deploy** y smoke final.
