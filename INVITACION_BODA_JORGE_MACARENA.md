# Invitación "Boda de Jorge & Macarena" — Datos dinámicos (v3 + delta v4)

> **Para quién es este documento:** para alguien que va a **mejorar visualmente** la invitación sin tocar la lógica. Aquí se describe **exactamente qué datos llegan ya resueltos** a la vista, de dónde salen y en qué parte de la pantalla se muestran.
>
> **Plantilla:** `boda_jorge_macarena` · **Diseño vigente (v3 + delta v4, 2026-11-10):** papel de algodón, marco nazarí, granada en acuarela, letterpress y dibujos `.webp` con `multiply`. Tipografías **Cormorant Upright** (display) y **Nikolai Condensed** (labels; fallback Noto Serif Display). El v2 editorial (2026-10-11) y el diseño nocturno anterior quedan como **histórico** en `MEMORIA.md` §15/§16.
>
> **Estado (2026-11-10; pagos/mensajes 2026-11-13):** la plantilla fue **reemplazada en sitio** por el v3; el **delta v4** añade “Ver ideas”, la 5.ª recomendación y **alergias + rango de edad** en el RSVP. **No hay plantilla nueva ni selector v2/v3/v4**. El código v4 está en el **working tree, sin commit ni push**. El esquema (`init-db`, incluidas las columnas de alergia, **`guests.age_range_id`/`age_range_label`** y **`events.age_ranges`**) y el seed v4 del evento 2 ya están aplicados; al momento de este ajuste hay **198 invitados con `age_range_id`/`age_range_label` NULL**. Pendientes: fuente Nikolai y deploy. En pagos, el evento 2 usa **webi/BBVA …3892**; la UI de cuenta (`ff2b988`), el blindaje (`a9610b6`), el panel `/events/:id/pagos` (`6fbc07c`) y el segundo correo de avisos (`01d395a`/`24cd461`) y el ancla `#confirmar` del RSVP compartido (`67ac08d`) están locales, sin deploy. Se borraron de `gifts` los 3 pagos live históricos: Live queda vacío, Test muestra 2 y los pagos siguen en Stripe.
>
> **Archivos clave:**
> - Vista pública: `client/src/invitation/InvitationPage.jsx` (obtiene datos por token).
> - Orquestación: `client/src/invitation/InvitationView.jsx` (tema + layout + sobre según `opening.envelopeVariant`).
> - Layout: `client/src/invitation/boda_jorge_macarena/BodaJorgeMacarenaLayout.jsx` (hojas sticky/tilt/shade; monta `v3/*`).
> - Sistema visual: `.../boda_jorge_macarena/v3.css` (scope `.mjv3` y `[data-invitation-theme="boda_jorge_macarena"]`).
> - Secciones v3: `.../boda_jorge_macarena/v3/` → `CoverSection`, `StorySection`, `IcebreakerSection`, `LocationSection`, `DressCodeSection`, `RecommendationsSection`, `TravelSection`, `StaySection`, `RsvpSection`, `GiftsSection`, `ClosingSection`, `ui.jsx`, `assets.js`.
> - Sobre y música: `.../boda_jorge_macarena/EditorialEnvelope.jsx`, `.../MusicToggle.jsx`, `.../helpers.js`.
> - Editor dedicado: `client/src/pages/event/BodaJorgeMacarenaV3Editor.jsx` (integrado en `EventInvitation.jsx`) + `StayTravelEditor.jsx`.
> - Bandeja de mensajes: `client/src/pages/event/EventMessages.jsx` (`/events/:id/mensajes`).
> - Portada del dominio propio: `client/src/wedding/MacarenaJorgeCover.jsx` (también actualizada a v3).
> - Tema/sobre: `client/src/invitation/themes/boda_jorge_macarena.js` (`labels.locationEyebrows` y `opening.editorial` se siguen usando; el resto del copy v3 vive en `v3/ui.jsx` y en cada sección).
> - Contrato de datos: `client/src/invitation/schema/normalize.js` y `server/src/schemas/invitation.js`; descriptores en `client/src/invitation/schema/fields.js`.
> - Seed del evento 2: `server/src/scripts/update-event-macarena-v3.js` (mismo nombre; dry-run por defecto, `--apply` escribe; ya actualizado al delta v4).
> - Metadatos OG por token: `server/src/utils/invitationLookup.js`, `server/src/utils/ogMeta.js` y `server/src/index.js`.
> - Mensajes de regalo: `server/src/routes/invitations.js`, `server/src/routes/events.js`, `server/src/utils/mailer.js`.
> - Assets v4: `client/public/invitations/macarena-jorge-v3/` (15 `.webp` + 6 `idea-*.jpg` + `og-v3.jpg` + `webi-logo.png`).
> - ⚠️ **Falta** `client/public/fonts/Nikolai-Condensed.woff2`; mientras no exista, Nikolai cae a `Noto Serif Display`/Georgia.
> - ⚠️ Los archivos v2 (`Hero.jsx`, `Story.jsx`, `Locations.jsx`, `Itinerary.jsx`, `DressCode.jsx`, `Gifts.jsx`, `Travel.jsx`, `Stay.jsx`, `ZoneMap.jsx`, `Footer.jsx`, `SectionPhoto.jsx`, `flora.jsx`, `Grain.jsx`) siguen en disco pero **no se montan**.

---

## 1. De dónde salen los datos (contexto)

La invitación se publica con un token único por grupo de invitados (`/invitacion/<token>`). Al cargar, el servidor devuelve **5 bloques de datos**:

| Bloque | Qué contiene | Qué es |
| ------ | ------------ | ------ |
| `event` | Los datos generales del evento | `{ name, date, time, place, invitation }` |
| `group` | El grupo invitado | `{ name, leader_name, rsvp_note }` |
| `guests` | Los invitados de ese grupo | lista de `{ id, name, is_leader, is_child, registered, declined, allergy, allergy_notes, age_range_id, age_range_label, age }` |
| `public_config` | Config pública | `{ stripe_publishable_key, custom_domain }` |
| `payment_methods` | Disponibilidad de pago con tarjeta | `{ card: { mxn, eur } }` — solo aplica con la mesa habilitada, `stripe_enabled` y Stripe configurado. Con una **cuenta Connect válida para el evento** (`events.stripe_account_id`) ambas monedas comparten la misma cuenta: `true/true` si está habilitada y `false/false` si no. Sin cuenta de evento se conserva la resolución **legacy** por moneda |

Internamente, la vista los recibe con estos nombres de prop:

- `event` → datos del evento.
- `family` → `group.name` (el **nombre de la familia / grupo** invitado; v3 lo muestra como “Familia {familia}”).
- `cfg` → `event.invitation` (el **JSON de configuración de la invitación**, descrito en la sección 2).
- `guests` → lista de invitados del grupo.
- `rsvpNote` → `group.rsvp_note`.
- `token` → el token público.
- `publishableKey` → `public_config.stripe_publishable_key`.
- `hideBrand` → `true` cuando la visita llega por el **dominio propio del evento** (`public_config.custom_domain`): oculta la línea "DisplayEvent" (nunca el badge "Powered by Webi").

**Datos privados del evento:** `events.gift_message_email` (correo de avisos de mensajes de regalo) **no** se expone en `GET /api/invitations/:token` ni en la portada pública. Solo lo usa el servidor para enviar el aviso.

**Metadatos Open Graph (previews de WhatsApp / redes):** el servidor sirve la SPA con la plantilla HTML cacheada y, para `/invitacion/<token>` (y la URL con slug), inyecta `title`, `og:*` y `twitter:*` **por invitación**. Solo actúa cuando el servidor sirve el build del cliente (`client/dist`); en el dev server de Vite no aplica. Reglas:

- **Título:** `«{nameA} & {nameB} · Nuestra boda»` (p. ej. Jorge & Macarena); si faltan los nombres, el nombre del evento; si tampoco, se conserva el genérico de DisplayEvent.
- **Descripción:** fija y genérica (`OG_DESCRIPTION`) — **sin el nombre de la familia** (privacidad de los previews).
- **Imagen:** `cfg.og_image` → `cfg.hero_image` → primera foto de `cfg.gallery` → `og-image.png` de DisplayEvent. En v3 el seed usa `invitations/macarena-jorge-v3/og-v3.jpg`.
- Token inválido/inexistente o error de BD: se sirve el HTML estático sin cambios.

---

## 2. Datos dinámicos específicos del formato `boda_jorge_macarena`

`cfg` es un objeto JSON. Los campos **específicos de esta boda** siguen siendo `couple` y `registry_note` (este último **legado**: v3 no lo renderiza). El resto son comunes a todos los formatos, con bloques **aditivos v3** que el backend normaliza/valida para los 6 templates pero que solo consume esta UI.

### 2.1 Campos específicos (los propios de esta plantilla)

| Campo | Tipo | Uso en pantalla |
| ----- | ---- | --------------- |
| `cfg.couple.nameA` | string | Nombre del novio (p. ej. "Jorge") |
| `cfg.couple.nameB` | string | Nombre de la novia (p. ej. "Macarena") |
| `cfg.registry_note` | string | **Legado**; v3 no lo muestra (usa copy fijo en `GiftsSection`) |

> **Orden de diseño:** v3 escribe **novia & novio** (`couple.nameB` y después `couple.nameA`): "Macarena & Jorge". El monograma sale de esas iniciales ("M&J").

### 2.2 Campos comunes y su uso en v3

| Campo | Tipo | Qué es / dónde se ve en v3 |
| ----- | ---- | -------------------------- |
| `cfg.story` | string (máx. 4000) | Relato de **“Granada, España”**; los párrafos se separan con una línea en blanco. Vacío → `DEFAULT_STORY` de `v3/ui.jsx` |
| `cfg.music_url` | string (URL directa) | Audio del botón flotante. **Sin autoplay**, en loop; si está vacío, el botón **no se monta**. Debe ser archivo directo (MP3/M4A/OGG); YouTube/Spotify no funcionan |
| `cfg.og_image` | string (URL) | Imagen para compartir (OG). Prioridad sobre `hero_image` y `gallery` |
| `cfg.locations` | `[{label, place, url, description, time_label, time_value, when_label, when_value, image, map_image}]` | **Ceremonia / Celebración**: una hoja por item. `label` → título; `place` → dirección; `description` → relato; `time_*`/`when_*` → cajas “Hora”/“Cuándo”; `image` → dibujo; `map_image` → mapa estático; `url` → “Abrir mapa” |
| `cfg.dress_code` | `[{label, icon?}]` | Vestimenta: etiquetas unidas con “ · ” (fallback “Formal”) + botón **“Ver ideas”** (modal v4 con 3 fotos de “Ellos” y 3 de “Ellas”) |
| `cfg.dress_note` | string | Nota/cita de Vestimenta (fallback “Queremos veros guapísimos.”) |
| `cfg.lodging` | `[{name, note, url?}]` | **Hoteles recomendados** de Hospedaje (máximo 2). `url` abre mapa/web; sin `url`, se busca por nombre |
| `cfg.stay` | objeto | Hospedaje (ver §2.5) |
| `cfg.trip` | objeto | Viaje (ver §2.5) |
| `cfg.icebreaker` | objeto | Tarjeta previa (ver §2.6) |
| `cfg.recommendations` | objeto | Recomendaciones (ver §2.5); items con `phone` opcional e icono `taxi` |
| `cfg.registry` | objeto | Mesa de regalos (ver §2.3) |
| `cfg.rsvp_editable` | boolean | Permite editar la confirmación |
| `cfg.rsvp_edit_deadline` | string ISO UTC | Límite de confirmación/edición; vacío = sin límite |

> **No consumidos por v3:** `kicker`, `tagline`, `celebrants`, `itinerary`, `gallery`, `hero_image`, `contacts`, `contact_note`, `registry_note`, `travel` (legado). Siguen en el contrato/editor por compatibilidad, pero no se renderizan en esta plantilla. La **portada** usa los dibujos fijos del paquete (`v3/assets.js`), no `hero_image`/`gallery`.

### 2.3 Mesa de regalos (`cfg.registry`) y mensajes

| Campo | Tipo | Qué es |
| ----- | ---- | ------ |
| `enabled` | boolean | Si se muestra la sección de regalos |
| `allow_custom` | boolean | Monto libre. El editor v3 **fuerza `true` al guardar** (el backend rechazaría importes fuera de `suggested_*` si fuera `false`) |
| `min_mxn` / `min_eur` | number | Monto mínimo en pesos / euros |
| `suggested_mxn` / `suggested_eur` | number[] | Sugeridos del contrato; la UI v3 **no muestra chips**, usa monto libre |
| `stripe_enabled` | boolean | Habilita pago con tarjeta (sujeto a `payment_methods`) |
| `payment_link_url` | string (URL) | Payment Link externo; si tiene valor, el CTA abre ese enlace y no la pasarela embebida |
| `bank` | `{ enabled, bank_name, holder, account_number, clabe, concept }` | Depósito **desde México** (MXN); `clabe` es el dato que desbloquea el mensaje |
| `bank_eur` | `{ enabled, bank_name, holder, iban, concept }` | Depósito **desde España** (EUR); `iban` desbloquea el mensaje. El seed la deja `enabled:false` hasta configurarla |

- **Moneda:** selector MXN/EUR; el bloque de banco cambia de título (“Desde México” / “Desde España”) y de filas.
- **Stripe:** si `payment_link_url` existe, el CTA es un `<a>` externo; si no, se usa **Checkout embebido** (`POST /api/invitations/:token/payment` → `client_secret`; `createEmbeddedCheckoutPage`/`initEmbeddedCheckout`). Maneja `?payment=success|cancelled`, errores y reintento. **Blindaje local (`a9610b6`, sin deploy):** rechaza montos ≤ 0, usa solo `payment_method_types: ["card"]`, añade `destination_account` a la metadata y el webhook maneja `completed`/`async_payment_succeeded`/`async_payment_failed` con upsert idempotente.
- **Cuenta del evento 2:** **webi.mx / BBVA …3892** (`acct_1UT7NAFnv8uJBZLH`); la anterior era **Displayevent / Akala …0134** (`acct_1UPr9eC0wYMF53iO`). El cambio ya está en la BD y el backend desplegado lo lee, así que los pagos nuevos deberían ir a webi/BBVA aunque el código nuevo no esté desplegado.
- **Panel de pagos (`6fbc07c`, local):** ruta **`/events/:id/pagos`** y `GET /api/events/:id/gifts`; muestra totales live/test, estados, cuenta destino y enlaces a Stripe. Se **borraron de `gifts` los 3 pagos live históricos** (ids 11/12/13, Akala), así que la pestaña **Live queda vacía** y **Test muestra 2**; los MX$20 se asumen como **pérdida operativa**. **Los pagos siguen en Stripe** (usar su dashboard para conciliar). La BD ya tiene `livemode`, `destination_account` y `stripe_checkout_session_id`; el webhook desplegado antiguo no guardará esos campos hasta el deploy. Build del cliente con el panel: **951 módulos**.
- **Mensaje a los novios:** el textarea **solo aparece después de copiar la CLABE/IBAN o tocar “Pagar con tarjeta”**. Se envía a `POST /api/invitations/:token/gift-message` con `message`, `currency`, `channel` (`transfer`/`card`) y `amount` opcional. Se guarda siempre en `gift_messages`; el correo es best-effort. El panel lo muestra en **Mensajes** (`/events/:id/mensajes`).
- **Correos del aviso:** `events.gift_message_email` (**Email principal**) y `events.gift_message_email_2` (**Email adicional (opcional)**), con validación independiente en el editor v3 (`24cd461`). El envío (`01d395a`) va por separado a ambos, deduplica case-insensitive y usa el email del dueño como fallback **solo si ambos están vacíos**; un fallo de un destinatario no afecta al otro ni al invitado. **Evento 2:** principal `jgegmz@gmail.com`, adicional `NULL`; existe **1 mensaje guardado** (actividad externa; no tocar).

### 2.4 Viaje y Hospedaje (`trip` / `stay`)

Campos **aditivos** al contrato común. `enabled` decide si la sección se renderiza.

#### `cfg.stay` (Hospedaje)

| Campo | Tipo / default | Uso |
| ----- | -------------- | --- |
| `enabled` | boolean, default `false` | Renderiza la sección |
| `intro` | string | Texto de entrada (fallback en `StaySection`) |
| `zone` | `{lat, lng, radius_km, label}` | Base de los links; el mapa v3 es estático (`mapaAlbaicin.webp`), no Leaflet |
| `checkin` / `checkout` | `YYYY-MM-DD`; si vacío, la UI usa **2027-06-08/12** | Fechas editables por el invitado |
| `cards[]` | máx. 12: `{id,platform,title,description,url,auto}` | Tarjetas de plataforma (Booking, Airbnb, Trivago, Google Hotels o manuales) |
| `quote` | string | Cita al pie (fallback “Dale limosna, mujer…” de Francisco de Icaza) |
| `quote_author` | string | Autor de la cita |

- **Hoteles:** `cfg.lodging` (máx. 2) se muestra como tarjetas “Hotel recomendado”; el seed usa Hotel Alhambra Palace y Parador de Granada.
- **Links:** Booking usa `lat`/`lng`/`radius_km`; Airbnb usa bbox; Trivago/Google Hotels usan la etiqueta; fechas prellenadas. Hospedaje fija **1 adulto** en los links.

#### `cfg.trip` (Viaje)

| Campo | Tipo / default | Uso |
| ----- | -------------- | --- |
| `enabled` | boolean, default `false` | Renderiza la sección |
| `intro` | string | Texto de entrada |
| `origins[]` | máx. 20: `{code,label}`; defaults MEX/NLU/GDL/MTY | Orígenes de vuelo; el `code` es interno y no se muestra |
| `arrivals[]` | máx. 4: default solo MAD | La UI v3 **fija Madrid** y no muestra selector |
| `date_from` / `date_to` | `YYYY-MM-DD`; fallback 2027-06-08/12 | Fechas editables |
| `adults` | entero ≥1, default 1 | Línea “1 adulto” / “N adultos” |
| `modes` | `{flight,train,bus}`, cada uno `{enabled,note,providers[]}` | v3 muestra **solo avión y autobús**; el tren se fuerza a `false` |

- **Decisión v3:** el **tren está apagado** (`trip.modes.train.enabled = false`; `StayTravelEditor.jsx` lo fuerza al abrir). La UI solo renderiza `flight` y `bus`.
- **Proveedores:** avión (`google_flights`, `skyscanner`, `kayak` + extras `iberia`, `aeromexico`), autobús (`alsa`, `omio`, `flixbus`).
- **Links:** Google Flights/Skyscanner/Kayak por código interno + fechas; Omio/FlixBus ciudad + fecha; ALSA sin fecha estable (“Selecciona la fecha en el proveedor.”). Los vuelos salen de los orígenes configurados; el autobús sale de Madrid hacia Granada. Sin precios ni disponibilidad en vivo.

### 2.5 Icebreaker y Recomendaciones (v3 + v4)

`cfg.icebreaker`:

| Campo | Tipo / default | Uso |
| ----- | -------------- | --- |
| `enabled` | boolean, default `false` | Muestra la hoja |
| `eyebrow` | string, default “Antes del gran día” | Rótulo |
| `title` | string, default “Icebreaker” | Título |
| `text` | string | Texto (fallback `DEFAULT_ICEBREAKER_TEXT`) |
| `date_label` | string | Fecha (“Martes 8 de junio” en el seed) |
| `time_place_label` | string | “Por confirmar” si vacío |
| `image` | string (URL) | Dibujo; fallback `c-icebreaker.webp` |

`cfg.recommendations`:

| Campo | Tipo / default | Uso |
| ----- | -------------- | --- |
| `enabled` | boolean, default `false` | Muestra la hoja |
| `eyebrow` | string, default “Para que todo salga perfecto” | Rótulo |
| `title` | string, default “Recomendaciones” | Título |
| `image` | string (URL) | Dibujo; fallback `c-p10.webp` (4/3, Real Alcázar) |
| `items[]` | `{icon,title,text,phone?}`; iconos `shoe`/`weather`/`transport`/`taxi`/`stay` | Lista de consejos (5 en el seed); vacío → `DEFAULT_RECOMMENDATIONS`. El texto admite `**negrita**` y `{phone}`; `phone` se renderiza como enlace `tel:` |

---

## 3. Datos del evento (`event`)

| Campo | Tipo | Uso en pantalla |
| ----- | ---- | --------------- |
| `event.name` | string | Nombre del evento (fallback del título si faltan los nombres de la pareja) |
| `event.date` | string `YYYY-MM-DD` | Fecha; la portada la formatea en español y el contador apunta a las 18:00 de España si no hay hora |
| `event.time` | string `HH:mm` | Hora de la ceremonia/contador |
| `event.place` | string | Lugar de la portada/cierre (“Granada, España” si vacío) |
| `events.gift_message_email` / `gift_message_email_2` | string (privado) | Correos que reciben los mensajes de la mesa de regalos (columnas del evento, no de `cfg`); el evento 2 tiene principal `jgegmz@gmail.com` y adicional `NULL`; 1 mensaje guardado |
| `events.custom_domain` | string | Dominio propio; activa el white-label (`hideBrand`) |
| `events.age_ranges` | JSONB/null | Rangos de edad del **dashboard** (`[{id,label,min,max}]`), por evento; ids default `baby/child/teen/adult`; `NULL` = defaults en UI hasta guardar. Se exponen en `GET /api/invitations/:token` para el selector del RSVP |

---

## 4. Datos del grupo / familia e invitados (RSVP v3 + v4)

| Dato | Qué es |
| ---- | ------ |
| `family` | Nombre del grupo invitado (p. ej. "Pérez"). v3 lo muestra como **“Familia Pérez”** en el RSVP y el sobre |
| `guests[]` | Cada invitado con `name`, `is_leader`, `is_child`, `registered`, `declined`, `allergy` (BOOLEAN/null), `allergy_notes` (≤500), `age_range_id` (VARCHAR 80)/`age_range_label` (VARCHAR 40) y `age` (SMALLINT, legado) |
| `rsvpNote` | Nota previa del grupo; se reenvía para preservarla |

- El RSVP v3 + v4 es **propio** (`v3/RsvpSection.jsx`), no `shared/Rsvp.jsx`. **No muestra “Líder”**, no usa modal y **no muestra contactos**.
- **Plazo:** `rsvp_editable` + `rsvp_edit_deadline`; la fecha visible se calcula en **hora de España** (`Europe/Madrid`) y hay contador días/horas/min.
- **Estados:** formulario → **enviado** (sobre animado + “¡Gracias, Familia X!” + “Modificar respuesta” si sigue editable) → **plazo cerrado** (“El plazo de confirmación ha terminado” o “El plazo para modificar la confirmación terminó.”).
- **Alergias y rango de edad (v4):** al marcar “Sí asistirá” aparece **Edad** como **selector single-select con checkbox visual** por rango (los rangos vienen de `GET /api/invitations/:token` → `age_ranges` en el nivel raíz) y “¿Alguna alergia alimentaria?” (Sí/No; si es Sí, un campo de texto ≤500). El submit se bloquea hasta completar **asistencia + alergia + rango** de cada asistente; si no hay rangos configurados muestra “Los rangos de edad se configuran en el panel” y **no bloquea**. **Solo `boda_jorge_macarena` pide edad**; el endpoint es compartido y `age_selections` es opcional.
- **Envío:** `PUT /api/invitations/:token/rsvp` con `attending_ids`, `declining_ids`, `note`, `allergies: [{ guest_id, has_allergy, notes }]` y `age_selections: [{ guest_id, range_id }]` (opcional). El backend valida el `range_id` contra `events.age_ranges`, guarda `age_range_id` + `age_range_label` (snapshot) en la **misma transacción** y **relee `guests`**. El botón se habilita cuando todos los pases tienen respuesta, alergia y rango. `preview` no envía. `guests.age` queda como legado.
- **Panel/PDF:** `EventGuests.jsx` y el PDF muestran `Edad: {age_range_label}` con **fallback numérico** al legado `guest.age`; si falta y el invitado confirmó, “Rango de edad sin registrar”. Conservan “Alergia: …”/“Alergia sin registrar”.

- **Rangos de edad (dashboard, v4):** son **por evento** (`events.age_ranges`, contrato `{id,label,min,max}`), no un campo de `cfg`. Solo esta plantilla captura el rango en el RSVP (`guest.age_range_id`/`age_range_label`); el Dashboard muestra el bloque “Rangos de edad” debajo de las StatCards con defaults **Bebé 0–3 (`baby`), Niño 3–12 (`child`), Adolescente 12–18 (`teen`), Adulto 18+ (`adult`)**, edición (agregar/quitar, label/desde/hasta con ids internos, restaurar ejemplo, guardar/cancelar), total/confirmados por rango con fallback legado a `guest.age` y “Sin rango de edad”/“Rango no configurado”. `max` es exclusivo y puede ser `null` solo en el último rango.

---

## 5. Composición de la pantalla (orden de arriba a abajo)

El layout `BodaJorgeMacarenaLayout` arma la página con **hojas apilables v3** (contenedor sticky, papel de algodón, marco nazarí, sombra y oscurecimiento de la hoja anterior). El sobre es una pantalla de apertura previa; en la vista previa del editor no se monta.

1. **Sobre editorial v3** (`EditorialEnvelope.jsx`): papel blanco/algodón, sello gris “M&J”, secuencia solapa → sello → carta → pantalla completa → fundido. Textos en `theme.opening.editorial`; bloquea el scroll mientras está montado.
2. **Portada** (`v3/CoverSection.jsx`): “Nos casamos”, nombres (novia & novio), dibujo con fecha superpuesta, lugar, cuenta regresiva y “Desliza”. Usa el dibujo `c-portada.webp`.
3. **Granada, España** (`v3/StorySection.jsx`): dibujo de la pareja + relato (`cfg.story`; párrafos separados por línea en blanco).
4. **Icebreaker** (`v3/IcebreakerSection.jsx`): tarjeta previa con fecha/horario y dibujo; se omite si `enabled` es false.
5. **Ceremonia** y **Celebración** (`v3/LocationSection.jsx`): una hoja por `cfg.locations` (la primera se rotula “Ceremonia religiosa”, la segunda “Recepción y fiesta”). Incluye descripción, dirección, caja Hora/Cuándo, dibujo, mapa estático y “Abrir mapa”.
6. **Vestimenta** (`v3/DressCodeSection.jsx`): etiquetas en Cormorant Upright + nota + dibujo + botón **“Ver ideas”**. El modal v4 se monta con portal a `body`, ofrece 3 fotos de “Ellos” y 3 de “Ellas” (`idea-ellos-*`/`idea-ellas-*`), bloquea el scroll, cierra con Escape/×/backdrop y restaura el foco al cerrar.
7. **Recomendaciones** (`v3/RecommendationsSection.jsx`): 5 consejos con iconos (incluye “Moverse por Granada”, icono `taxi`, PideTaxi, teléfono +34 958 28 00 00 y mención a App Store/Google Play), imagen `c-p10.webp` (4/3, Real Alcázar) y texto enriquecido (`**negrita**`, `{phone}` → `tel:`). Se omite si `enabled` es false.
8. **Viaje** (`v3/TravelSection.jsx`): llegada fija a Madrid, origen, fechas y tarjetas de avión/autobús (sin tren).
9. **Hospedaje** (`v3/StaySection.jsx`): hoteles (máx. 2), mapa estático del Albaicín, fechas, plataformas y cita.
10. **Confirmación** (`v3/RsvpSection.jsx`): RSVP v3 + v4, con **rango de edad y alergias** por asistente (ver §4).
11. **Regalo** (`v3/GiftsSection.jsx`): mesa de regalos + mensaje privado (ver §2.3).
12. **Cierre** (`v3/ClosingSection.jsx`): dibujo, frase, monograma, `event.place · fecha`, badge **“Powered by Webi”** y “DisplayEvent” salvo `hideBrand`.

**Deep link de recordatorio:** los enlaces de WhatsApp con hash **`#confirmar`** hacen que `InvitationView` **omita el sobre**. En las plantillas con **RSVP compartido** (`xv`, `boda`, `baby_shower`, `cumpleanos`, `alice_xv`), `shared/Rsvp.jsx` incluye el ancla `#confirmar` y `InvitationView` reintenta el scroll a **100/400/900 ms**. La v3 conserva su propio `id="confirmar"` y efecto; `#rsvp` se mantiene para enlaces existentes. Sin hash, el comportamiento es el anterior.

**Chrome fijo:** botón de música (`MusicToggle`, solo con `music_url`) y capa de grano (`.mjv3-grain`). **No hay** `BottomNav` ni `SectionNav`.

**Portada pública del dominio propio (`MacarenaJorgeCover.jsx`):** reutiliza los componentes v3 en orden Portada · Granada · El gran día (ubicaciones) · Vestimenta · Viaje (04) · Hospedaje (05) · “Tu invitación” · Cierre. No monta Icebreaker, Recomendaciones, RSVP, Regalo ni Mensajes, no muestra contactos y no renderiza `gallery`/`hero_image`.

---

## 6. Textos fijos y estilos

- **Copy v3 + v4:** la mayoría de los textos viven en `v3/ui.jsx` (`DEFAULT_STORY`, `DEFAULT_ICEBREAKER_TEXT`, `DEFAULT_RECOMMENDATIONS` —5, incluida la de taxi—, `DEFAULT_LOCATION_EYEBROWS`, `DEFAULT_LODGING`, `DEFAULT_DRESS`, `DEFAULT_STAY_QUOTE`, `DEFAULT_STAY_QUOTE_AUTHOR`) y en cada sección; el seed del evento 2 ya trae los textos reales. `theme.labels.locationEyebrows` sigue alimentando los rótulos de ceremonia/celebración; `theme.opening.editorial` alimenta el sobre.
- **Paleta y tipografía:** `v3.css` define las vars `--mj-*` (papel `#F5F4F1`, tinta `#585C62`, títulos `#74787E`, línea `#D8D6D1`, etc.), el papel `.algodon`, el marco `.nzx/.nzy/.nzc`, la granada `.granada` y el letterpress. **No** se usan las vars `--inv-*` del tema v2 para la composición v3.
- **Fidelidad de diseño:** se mantiene la paleta baja en contraste del prototipo; no se ajustaron colores para AA (decisión del usuario).
- **Assets:** `v3/assets.js` centraliza las rutas a `client/public/invitations/macarena-jorge-v3/` (incluye `V3.p10` y `V3.ideas.ellos/ellas`); `Drawing` aplica `multiply` para que el papel se transparente. `resolveInvitationImage` acepta http(s), `/uploads` y rutas `invitations/...`; cualquier valor inseguro cae al fallback.

---

## 7. Seed v3 + delta v4 (`server/src/scripts/update-event-macarena-v3.js`)

- **Uso:** `node src/scripts/update-event-macarena-v3.js` (dry-run, no escribe) · `node src/scripts/update-event-macarena-v3.js --apply` (escribe).
- **Alcance:** evento id 2 (o nombre que contenga Macarena y Jorge, con verificación). Hace **merge** del JSONB `invitation` y conserva las claves no listadas (incluida `music_url`). No toca `gift_message_email` ni `gift_message_email_2` (columnas del evento).
- **Actualiza:** `template/version/couple`, `story`, `icebreaker`, `recommendations` (**5 items**, `image: invitations/macarena-jorge-v3/c-p10.webp`, nueva recomendación `taxi` “Moverse por Granada” con `phone`), `locations` (2), `dress_code`/`dress_note`, `itinerary: []`, `gallery: []`, `hero_image: ""`, `contacts: []`, `og_image`, `lodging` (2 hoteles), `stay` (Albaicín, fechas y cita), `trip` (4 orígenes, Madrid, fechas, 1 adulto, avión/autobús on, **tren off**), `registry` (monto libre, mínimos, BBVA + CLABE, `bank_eur` deshabilitada; conserva `enabled`/`stripe_enabled`/`payment_link_url`/sugeridos), `rsvp_editable: true` y `rsvp_edit_deadline: 2027-02-21T14:00:00+01:00`.
- **Verificación posterior:** comprueba template, versión, pareja, historia, Icebreaker, **5 recomendaciones** (incluida la `taxi` con teléfono), `recommendations.image = c-p10`, 2 ubicaciones, vestimenta, 2 hoteles, `stay`, `trip`, CLABE, RSVP y `og_image`.
- **Cuenta Stripe (columna del evento, fuera del JSONB):** el evento 2 usa **webi/BBVA …3892** (`acct_1UT7NAFnv8uJBZLH`); antes usaba Akala …0134. Los pagos históricos a Akala se **borraron de `gifts`**; solo se concilian en el dashboard de Stripe. El panel (`6fbc07c`) y el blindaje (`a9610b6`) siguen locales.
- **Segundo correo:** `events.gift_message_email_2` ya está aplicada en BD; el editor (`24cd461`) y el envío (`01d395a`) siguen locales. Evento 2: principal `jgegmz@gmail.com`, adicional `NULL`.
- **Pagos históricos:** se borraron de `gifts` los ids 11/12/13 (live, Akala); Live vacío y Test 2. Los pagos siguen en Stripe.
- **Recordatorios WhatsApp:** no dependen del seed. `779f61b` (backend), `5f6ba27` (UI + `#confirmar`) y `67ac08d` (ancla en RSVP compartido + scroll genérico) siguen locales; el evento 2 tiene **1 grupo y 0 pendientes**, por lo que “Recordar confirmar” aparece deshabilitado. En la BD local no hay evento “Renata” (solo id 1 XV de Alice, id 2 Boda e id 5 Ggh con template `xv`).
- **Aplicado:** el seed v4 del evento 2 y las columnas de alergia/rango (`guests.age_range_id`/`age_range_label`) + `events.age_ranges` (`init-db`) ya están aplicados; al momento de este ajuste hay **198 invitados con `age_range_id`/`age_range_label` NULL** y los eventos existentes tienen `age_ranges = NULL` (defaults en la UI hasta guardar). El evento 2 tiene principal `jgegmz@gmail.com` y adicional `NULL`; existe **1 mensaje guardado** (actividad externa; no tocar).

---

## 8. Pendientes / oportunidades

- [ ] **Push y deploy de `ff2b988` (UI de cuenta), `a9610b6` (blindaje), `6fbc07c` (panel de pagos), `01d395a` (segundo correo backend), `24cd461` (segundo correo editor), `779f61b` (recordatorios backend), `5f6ba27` (recordatorios UI + `#confirmar`) y `67ac08d` (ancla en RSVP compartido)**; el panel, el segundo correo y los recordatorios no existen en producción hasta el deploy.
- [ ] **Probar con un grupo que tenga pendientes** (o dejar un invitado sin confirmar) para ver el modal “Recordar confirmación”.
- [ ] **Validar el enlace `#confirmar` en navegador/WhatsApp** en las plantillas con RSVP compartido y en v3.
- [ ] **Verificar el enlace en la invitación de Renata** cuando exista/esté disponible; no hay evento “Renata” en la BD local.
- [ ] **Cloud API:** validar que la plantilla aprobada acepte el fragmento `#confirmar`; los recordatorios cloud marcan `whatsapp_sent_at`.
- [ ] **Decidir si se separa “recordatorio enviado” de “invitación enviada”**; hoy cloud comparte `whatsapp_sent_at`.
- [ ] **Verificar un pago live nuevo** (idealmente pequeño) después del deploy: debe caer en webi/BBVA …3892 y el panel debe mostrarlo como **“Cuenta actual”**.
- [x] ~~**MX$20 pagados a Akala**~~ → asumidos como **pérdida operativa**; se borraron de `gifts` y no aparecen en el panel. Siguen en Stripe.
- [ ] **Configurar el segundo correo desde el editor si se desea**; el evento 2 tiene principal `jgegmz@gmail.com` y adicional `NULL`.
- [ ] **Decidir si se eliminan las otras 3 cuentas Stripe o solo se ocultan**; el evento usa webi/BBVA.
- [ ] **Si se requiere conciliar los pagos históricos borrados, usar el dashboard de Stripe**; ya no están en `gifts` ni en el panel.
- [ ] *(Preexistente)* Actualizar la **API de Stripe** usada por el SDK (`2024-06-20`).
- [ ] **Subir `client/public/fonts/Nikolai-Condensed.woff2`** (hoy falta; el directorio está vacío).
- [ ] **Commit/deploy del v4** y smoke en la invitación y en la portada del dominio (incluye “Ver ideas”, recomendaciones, **alergias/edad**, PDF, OG con crawler y bandeja `/events/:id/mensajes`).
- [ ] **Probar el guardado real del editor con sesión** (Icebreaker, Recomendaciones, ubicaciones, hoteles, cita, CLABE/IBAN, `gift_message_email`/`gift_message_email_2`).
- [ ] **Confirmar que los assets v4 entran al build** (`client/public/invitations/macarena-jorge-v3/`: 15 `.webp` + 6 `idea-*.jpg` + `og-v3.jpg` + `webi-logo.png`).
- [ ] **Música:** si `music_url` sigue apuntando a YouTube, el `<audio>` nativo no lo reproduce; subir MP3/M4A/OGG desde el editor.
- [ ] **Fase B:** adoptar el sistema v3 en `xv`, `cumpleanos` y `baby_shower`; `alice_xv` queda intacta.
- [ ] Histórico: los pendientes v2 de Viaje/Hospedaje (`8d70217`, `efb424b`) y el scrim de `SectionPhoto` ya **no aplican** a la boda v3; `ff2b988` sí sigue pendiente para el editor de cuenta.

---

## 9. Reglas a respetar al rediseñar

1. **No hay plantilla nueva ni selector v2/v3/v4:** el `template` sigue siendo `boda_jorge_macarena`; el layout monta `v3/*` con el delta v4.
2. **No cambies los nombres de los campos** (`cfg.couple.*`, `cfg.locations`, `cfg.story`, `cfg.icebreaker`, `cfg.recommendations` (incluido `items[].phone`), `cfg.stay`, `cfg.trip`, `cfg.registry.bank.clabe`, `cfg.registry.bank_eur`, `cfg.og_image`, etc.): son contrato con backend/editor.
3. **Usa las primitivas v3** (`v3/ui.jsx`: `NazariFrame`, `OrnamentRule`, `Eyebrow`, `InfoCard`, `PaperCard`, `Button`, `Drawing`) y las clases de `v3.css`; no reintroduzcas `--inv-*` ni `SectionPhoto` en esta plantilla.
4. **Assets:** usa `V3`/`v3Asset` de `v3/assets.js`; los dibujos deben ser `.webp` con transparencia para el `multiply` y las ideas de vestimenta viven en `V3.ideas`. No vuelvas a `gallery`/`hero_image` en v3.
5. **Editor schema-driven:** si agregas un campo, actualiza `server/src/schemas/invitation.js`, `client/src/invitation/schema/normalize.js`, `fields.js` y `BodaJorgeMacarenaV3Editor.jsx` (o el editor dedicado que corresponda).
6. **RSVP:** mantén el contrato de `v3/RsvpSection.jsx` con `rsvp` (`token`, `family`, `guests`, `attending`, `declining`, `note`, `cfg`, `preview`, `onDone`) y el envío a `PUT /api/invitations/:token/rsvp`; conserva `allergies` y `age_selections` para los asistentes y la respuesta con `guests[]` actualizados.
7. **Regalo:** el mensaje a los novios solo se desbloquea al copiar CLABE/IBAN o tocar pagar; no lo muestres antes. Mantén el guardado + correo best-effort + bandeja.
8. **Contactos ocultos, tren apagado y música opcional** son decisiones cerradas del v3. El v4 añade **“Ver ideas”**, **5 recomendaciones** (taxi/PideTaxi), **alergias** y **rango de edad**; no las elimines al rediseñar. Los **rangos de edad** son del dashboard/evento (`events.age_ranges`) y solo se consumen como opciones en el RSVP, no viven en `cfg`.
