# Invitación "Boda de Jorge & Macarena" — Datos dinámicos

> **Para quién es este documento:** para alguien que va a **mejorar visualmente** la invitación sin tocar la lógica. Aquí se describe **exactamente qué datos llegan ya resueltos** a la vista, de dónde salen y en qué parte de la pantalla se muestran. Todo lo listado **ya funciona dinámicamente**: no hay que programar nada, solo diseñar sobre estos datos.
>
> **Plantilla:** `boda_jorge_macarena` · **Diseño actual (v2 "editorial sobre papel", 2026-10-11):** fondos crema (`--inv-bg #F6F2EB`), tinta cálida (`--inv-text #1C1B19`), fotos B&N con scrim claro y flora de Granada (dalia, bugambilia y granado) en SVG. Fuentes: **Cormorant Garamond** (display/títulos, también la itálica) y **Montserrat** (cuerpo).
>
> **Nota de estado (2026-10-23):** la **base de Viaje/Hospedaje** (`4773112`) ya está desplegada. Los commits locales **`8d70217`** (llegada fija a Madrid), **`efb424b`** (quitar IATA de la UI) y **`ff2b988`** (Stripe: mostrar solo la cuenta activa del evento) están **pendientes de push/deploy**. La BD del evento 2 ya tiene `trip.arrivals` solo Madrid, `flight.note`/`intro` actualizados y `stripe_account_id = acct_1UPr9eC0wYMF53iO`; el API de producción devuelve `stay`/`trip`. Build del cliente OK (**557 módulos**). Ver §2.3, §2.5, §5 y §7.
>
> **Archivos clave:**
> - Vista pública: `client/src/invitation/InvitationPage.jsx` (obtiene datos por token).
> - Orquestación: `client/src/invitation/InvitationView.jsx` (tema + layout + sobre según `opening.envelopeVariant`).
> - Layout de este formato: `client/src/invitation/boda_jorge_macarena/BodaJorgeMacarenaLayout.jsx` (motor de hojas apilables).
> - Portada: `.../Hero.jsx`. Secciones locales: `.../Story.jsx`, `.../Locations.jsx`, `.../Itinerary.jsx`, `.../DressCode.jsx`, `.../Gifts.jsx`, `.../Travel.jsx` (Viaje), `.../Stay.jsx` (Hospedaje), `.../Footer.jsx`.
> - Mapa y links de Viaje/Hospedaje: `.../ZoneMap.jsx` (Leaflet/OSM) y `client/src/wedding/stayTravelLinks.js` (generador puro).
> - Editor dedicado: `client/src/pages/event/StayTravelEditor.jsx` (integrado en `EventInvitation.jsx`).
> - Navegación y música: `.../MusicToggle.jsx`. (`BottomNav.jsx` fue eliminado en el working tree por un cambio ajeno a Viaje/Hospedaje; el código desplegado aún lo incluye.) Sobre: `.../EditorialEnvelope.jsx`.
> - Utilidades locales: `.../flora.jsx` (flores SVG), `.../Grain.jsx` (grano de papel), `.../SectionPhoto.jsx` (foto B&N por hoja), `.../helpers.js`.
> - Portada pública del dominio propio: `client/src/wedding/MacarenaJorgeCover.jsx` (Viaje 04 / Hospedaje 05; base `4773112` desplegada, ajustes `8d70217`/`efb424b` locales).
> - Tema (textos, paleta, funciones): `client/src/invitation/themes/boda_jorge_macarena.js`.
> - Sección compartida: `client/src/invitation/shared/Rsvp.jsx` (+ utilidades `shared/util.jsx` y `shared/Countdown.jsx` → `useCountdown`).
> - Contrato de datos: `client/src/invitation/schema/normalize.js` y `server/src/schemas/invitation.js` (incluyen `stay`/`trip`; `fields.js` documenta los descriptores legacy y los campos v2).
> - Metadatos OG por token: `server/src/utils/invitationLookup.js`, `server/src/utils/ogMeta.js` y `server/src/index.js`.
> - Pagos con tarjeta (opcional): `server/src/routes/stripe.js` (cuentas Connect del organizador), `server/src/utils/stripeDestination.js` (cuenta explícita del evento con prioridad; si es NULL, resolución legacy por moneda) y `payment_methods` en `server/src/routes/invitations.js`.
> - ⚠️ `Lodging.jsx` y `client/src/wedding/lodgingLinks.js` fueron **eliminados en `4773112`**; `lodging`/`travel` quedan como **legado** en el JSONB (ver §2.4 y §2.5).
> - Assets fijos del cierre (badge "Powered by Webi"): `client/public/webi/` (`logo-dark.svg`; `logo-light.svg` reservado para fondos oscuros).
> - Mock de referencia del diseño: `Invitación Macarena & Jorge/Invitacion Macarena y Jorge v2.dc.html` (+ `Flor.dc.html`, `Ramillete.dc.html`, `support.js`).

---

## 1. De dónde salen los datos (contexto)

La invitación se publica con un token único por grupo de invitados (`/invitacion/<token>`). Al cargar, el servidor devuelve **5 bloques de datos**:

| Bloque | Qué contiene | Qué es |
| ------ | ------------ | ------ |
| `event` | Los datos generales del evento | `{ name, date, time, place, invitation }` |
| `group` | El grupo invitado | `{ name, leader_name, rsvp_note }` |
| `guests` | Los invitados de ese grupo | lista de `{ id, name, is_leader, is_child, registered, declined }` |
| `public_config` | Config pública | `{ stripe_publishable_key, custom_domain }` |
| `payment_methods` | Disponibilidad de pago con tarjeta | `{ card: { mxn, eur } }` — solo aplica con la mesa habilitada, `stripe_enabled` y Stripe configurado. Con una **cuenta Connect válida para el evento** (`events.stripe_account_id`) ambas monedas comparten la misma cuenta: `true/true` si está habilitada y `false/false` si no. Sin cuenta de evento se conserva la resolución **legacy**: cuenta habilitada del dueño/override por moneda, con **conversión automática** si la moneda no coincide (p. ej. cuenta MX cobrando EUR; ver §2.3 y §5) |

Internamente, la vista los recibe con estos nombres de prop:

- `event` → datos del evento.
- `family` → `group.name` (el **nombre de la familia / grupo** invitado).
- `cfg` → `event.invitation` (el **JSON de configuración de la invitación**, descrito en la sección 2).
- `guests` → lista de invitados del grupo.
- `rsvpNote` → `group.rsvp_note`.
- `token` → el token público.
- `publishableKey` → `public_config.stripe_publishable_key`.
- `hideBrand` → `true` cuando la visita llega por el **dominio propio del evento** (`public_config.custom_domain`): oculta la línea "DisplayEvent" (nunca el badge "Powered by Webi").

**Metadatos Open Graph (previews de WhatsApp / redes):** el servidor sirve la SPA con la plantilla HTML cacheada y, para `/invitacion/<token>` (y la URL con slug), inyecta `title`, `og:*` y `twitter:*` **por invitación**. Solo actúa cuando el servidor sirve el build del cliente (`client/dist`); en el dev server de Vite no aplica. Reglas:

- **Título:** `«{nameA} & {nameB} · Nuestra boda»` (p. ej. Jorge & Macarena); si faltan los nombres, el nombre del evento; si tampoco, se conserva el genérico de DisplayEvent.
- **Descripción:** fija y genérica (`OG_DESCRIPTION`) — **sin el nombre de la familia** (privacidad de los previews).
- **Imagen:** `hero_image` → primera foto de `gallery` → `og-image.png` de DisplayEvent.
- Token inválido/inexistente o error de BD: se sirve el HTML estático sin cambios.

---

## 2. Datos dinámicos específicos del formato `boda_jorge_macarena`

`cfg` es un objeto JSON con esta forma. Los campos **específicos de esta boda** siguen siendo tres; el resto son comunes a todos los formatos (los **4 campos del rediseño v2** de 2026-10-11, ver §2.4, y los **2 campos nuevos de Viaje/Hospedaje** de 2026-10-22, ver §2.5).

### 2.1 Campos específicos (los propios de esta plantilla)

| Campo | Tipo | Uso en pantalla |
| ----- | ---- | --------------- |
| `cfg.couple.nameA` | string | Nombre del novio (p. ej. "Jorge") |
| `cfg.couple.nameB` | string | Nombre de la novia (p. ej. "Macarena") |
| `cfg.registry_note` | string | Nota opcional de la mesa de regalos (texto libre) |

> ⚠️ **Orden de diseño:** el diseño v2 escribe **novia & novio** (`couple.nameB` y después `couple.nameA`): "Macarena & Jorge". El monograma sale de esas iniciales ("M & J"). El resolver `resolvers.signature` se conserva en el tema por contrato, pero este formato **ya no lo consume** (la sección "Message" se eliminó en el rediseño).

### 2.2 Campos comunes (compartidos con todos los formatos)

| Campo | Tipo | Qué es / dónde se ve |
| ----- | ---- | -------------------- |
| `cfg.hero_image` | string (URL) | Foto de portada (B&N con velo oscuro). Si falta, la portada usa `gallery[0]` |
| `cfg.message` | string | Mensaje de bienvenida; ahora es el **fallback del relato** de "Nuestra historia" (si `story` está vacío) |
| `cfg.itinerary` | `[{label, time}]` | Itinerario: cada momento con su hora |
| `cfg.locations` | `[{label, place, url}]` | Ubicaciones: **una hoja por item** (Ceremonia/Recepción); `url` = enlace "Cómo llegar" |
| `cfg.gallery` | `string[]` | Fotos (B&N por hoja, ver §5) |
| `cfg.dress_code` | `[{label, icon?}]` | Código de vestimenta: cada etiqueta en Cormorant de gran tamaño |
| `cfg.dress_note` | string | Nota extra del dress code (cita itálica) |
| `cfg.contacts` | `[{name, phone}]` | Contactos de RSVP (teléfonos) |
| `cfg.contact_note` | string | Mensaje de aclaración junto a los contactos |
| `cfg.story` | string (máx 4000) | **Nuevo** — relato de "Nuestra historia" (respeta saltos de línea) |
| `cfg.music_url` | string (URL directa) | **Nuevo** — audio del botón de música; se puede subir el archivo desde el editor (ver §2.4) |
| `cfg.lodging` | `[{name, note, url?}]` | **Legado** — hoteles sugeridos; la UI nueva de esta plantilla **no lo renderiza** (el evento 2 conserva 2 hoteles) |
| `cfg.travel` | `{title, airport_note, routes:[{label,note}], closing_note}` | **Legado** — bloque de viaje anterior; la UI nueva usa `cfg.trip` |
| `cfg.stay` | objeto | **Hospedaje** — contrato nuevo (ver §2.5) |
| `cfg.trip` | objeto | **Viaje** — contrato nuevo (ver §2.5) |
| `cfg.registry` | objeto | Mesa de regalos (ver §2.3) |

> **No consumidos por este diseño:** `cfg.kicker`, `cfg.tagline` y `cfg.celebrants` siguen en el contrato y en el editor, pero la portada v2 usa los textos del tema (`labels.heroEyebrow`, etc.).

### 2.3 Mesa de regalos (`cfg.registry`) — objeto

| Campo | Tipo | Qué es |
| ----- | ---- | ------ |
| `enabled` | boolean | Si se muestra la sección de regalos |
| `allow_custom` | boolean | Permite monto libre |
| `min_mxn` / `min_eur` | number | Monto mínimo en pesos / euros |
| `suggested_mxn` / `suggested_eur` | number[] | Montos sugeridos |
| `stripe_enabled` | boolean | Habilita pago con tarjeta (requiere una cuenta Connect habilitada; sujeto a `payment_methods`; ver §5) |
| `payment_link_url` | string (URL) | Payment Link externo de Stripe; si tiene valor, el CTA de tarjeta abre ese enlace (el invitado elige el monto allí) |
| `bank` | `{ enabled, bank_name, holder, account_number, concept }` | Datos de depósito/transferencia |

> **Cuenta Connect del evento (`events.stripe_account_id`; es una columna del evento, no se expone en la respuesta pública ni vive en `cfg.registry`):** si el evento tiene una cuenta seleccionada en el editor (**"Cuenta de Stripe para este evento"**, dentro de "Pagos / Conectar Stripe"), esa es la **única** cuenta que recibe los pagos de la mesa de regalos, tanto en MXN como en EUR (Stripe convierte si la moneda no coincide). Solo se pueden elegir cuentas propias con cobros habilitados; una cuenta ajena, inexistente o deshabilitada deja `payment_methods.card` en `false/false` **sin fallback**. Si `stripe_account_id` es NULL, se usa la resolución **legacy**: override `stripe_account_mxn/eur` → cuenta habilitada del dueño → fallback con conversión, con desempate por menor `id`. El backend valida esta cuenta en `PUT /api/events/:id` (ausente = conservar; `""`/`null` = limpiar). El evento 2 ya tiene **`stripe_account_id = acct_1UPr9eC0wYMF53iO`** en la BD. En el editor, con una cuenta válida asignada se muestra **solo esa cuenta** en el selector y en la lista, se oculta **Automática** y aparece **"Cambiar cuenta"** para revelar temporalmente el resto; si la cuenta guardada es inválida/deshabilitada, se revelan todas. Las otras **3 cuentas** del usuario quedan ocultas, **no borradas**. Sin cuenta asignada se mantiene el comportamiento anterior (Automática + cuentas; las sin cobros deshabilitadas). La cuenta elegida muestra **"Activa para este evento"**; si dejó de estar habilitada, se omite la clave al guardar para no bloquear el resto de cambios.
>
> **Monto libre sin sugeridos:** con `allow_custom:true` y `suggested_mxn`/`suggested_eur` vacío para la moneda activa, la vista muestra directamente el **selector de moneda + campo "Monto"** (sin la opción "Monto libre" de un dropdown). Si no hay sugeridos y `allow_custom:false`, se muestra **"La mesa de regalos aún no tiene montos configurados."** y se omite el CTA de tarjeta; el banco se conserva si está habilitado. El **Payment Link externo** no cambia.

### 2.4 Campos del rediseño v2 (`story`/`music_url`) y legado (`lodging`/`travel`)

`story` y `music_url` son los campos vivos del rediseño v2. `lodging` y `travel` siguen en el contrato común y en el JSONB, pero desde el **commit `4773112`** (2026-10-22) **no se renderizan** en `boda_jorge_macarena`; la UI nueva usa `stay`/`trip` (§2.5).

| Campo | Forma exacta | En la pantalla |
| ----- | ------------ | -------------- |
| `cfg.story` | string, tope **4000** (`STORY_MAX_LENGTH`); se recorta al normalizar | Relato de "Nuestra historia". Vacío → `cfg.message` → `defaultMessage` del tema |
| `cfg.music_url` | string: URL **directa** a un archivo de audio (MP3/M4A/OGG). El editor permite **subirlo** (máx. **15 MB**) o pegar la URL | Botón de música (arriba a la derecha). **Sin autoplay** (`preload="none"`), en loop; sin URL, el botón no se monta. ⚠️ YouTube / Spotify / Apple Music **no funcionan** (el reproductor es un `<audio>` nativo) |
| `cfg.lodging` | lista `{ name, note, url? }` (`url` opcional) | **Legado** — ya no hay hoja de hoteles; el evento 2 conserva 2 hoteles en el JSONB |
| `cfg.travel` | `{ title, airport_note, routes:[{label,note}], closing_note }` | **Legado** — ya no hay bloque de viaje; el contrato nuevo es `cfg.trip` (§2.5) |

**Editor:** "Nuestra historia y música" (`story`, `music_url`) y **`StayTravelEditor.jsx`** (Viaje/Hospedaje), visibles **hoy solo para `boda_jorge_macarena`** (los demás formatos los ignoran; Fase B los activará). La **música se puede subir desde el panel**: botones **"Subir audio" / "Reemplazar audio"** (`FileUploader`, `kind="audio"`) con validación cliente de tipo y tamaño espejo del servidor y la ayuda **"MP3, M4A u OGG · máx. 15 MB"**; al subir, la URL devuelta (`POST /api/uploads`, `201 { url }`; el endpoint acepta además imágenes de hasta 8 MB) queda en `form.music_url`. El input de **URL directa se conserva** para pegar enlaces. `schema/fields.js` conserva los descriptores legacy `lodging`/`travel`; `stay`/`trip` se editan con `setField` desde el editor dedicado y se normalizan en `schema/normalize.js` + `server/src/schemas/invitation.js`.

### 2.5 Viaje y Hospedaje (`trip` / `stay`) — contrato nuevo (base `4773112` desplegada; ajustes `8d70217`/`efb424b` locales, no desplegados)

Campos **aditivos** al contrato común. El backend los valida y normaliza en los **6 templates**, pero **solo la UI de `boda_jorge_macarena` los consume**. `enabled` decide si la sección se renderiza.

#### `cfg.stay` (Hospedaje)

| Campo | Tipo / default | Uso |
| ----- | -------------- | --- |
| `enabled` | boolean, default `false` | Renderiza la sección |
| `intro` | string | Texto de entrada |
| `zone` | `{lat:37.1761, lng:-3.5881, radius_km:1.5, label:"Alhambra, Granada"}` | Centro/radio del mapa y base de los links; lat/lng acotadas y radio backend 0.1–50 km |
| `checkin` / `checkout` | `YYYY-MM-DD`; defaults de UI/links **2027-06-08/12** | Fechas editables por el invitado; el backend acepta `""` y el cliente/links aplican el fallback |
| `cards[]` | máx. 12: `{id,platform,title,description,url,auto}` | Tarjetas de plataforma; `auto:true` genera el link, `auto:false` usa `url` manual validada http(s) |

- **Tarjetas por defecto (4):** Booking, Airbnb, Trivago y Google Hotels (`auto:true`).
- **Plataformas auto:** `booking`, `airbnb`, `trivago`, `google_hotels`.
- **UI:** mapa Leaflet/OSM (centro + círculo + punto), etiqueta y enlace a Google Maps, fechas editables y carrusel de tarjetas. Sin fotos ni precios; sin tarjetas muestra un aviso.
- **Links:** Booking usa `lat`/`lng`/`radius_km` de la zona; Airbnb usa un **bbox** (`search_by_map`); Trivago y Google Hotels usan la etiqueta. Fechas prellenadas. Hospedaje fija **1 adulto** en los links (no lee `trip.adults`).

#### `cfg.trip` (Viaje)

| Campo | Tipo / default | Uso |
| ----- | -------------- | --- |
| `enabled` | boolean, default `false` | Renderiza la sección |
| `intro` | string | Texto de entrada |
| `origins[]` | máx. 20: `{code,label}`; defaults **MEX** (CDMX – Benito Juárez), **NLU** (CDMX – AIFA), **GDL** (Guadalajara) y **MTY** (Monterrey). El editor usa `mexicanAirports.js` (20 aeropuertos) | Orígenes de vuelo; el `code` es identificador interno y **no se muestra** en la UI |
| `arrivals[]` | máx. 4: `{code,label}`; default **solo MAD** (Madrid). El tope de 4 se conserva para datos legados; la UI muestra selector solo si llegan varias | Ciudad de llegada a España |
| `date_from` / `date_to` | `YYYY-MM-DD`; defaults de UI/links **2027-06-08/12** | Fechas editables; fallback si vienen vacías |
| `adults` | entero ≥1, default **1** | La UI muestra `{adults} adulto(s)`; por defecto 1 y no hay selector (tampoco en el editor) |
| `modes` | `{flight,train,bus}`, cada uno `{enabled:true,note,providers[]}` | Bloques de transporte con carrusel |
| Proveedores default | avión: `google_flights`,`skyscanner`,`kayak`; tren: `renfe`,`omio`,`trainline`; bus: `alsa`,`omio`,`flixbus` | Máx. 10 por modo |

- **UI:** con una sola llegada (caso actual) muestra una fila estática **“Llegada: Madrid”**, sin código; solo si un JSONB legado trae varias llegadas conserva el selector. El origen se elige por **nombre** entre los aeropuertos configurados; ya no hay **“Otro aeropuerto”** ni input de IATA. Fechas editables; línea de adultos (por defecto 1); bloques avión/tren/autobús con carrusel horizontal de proveedores. En tren/autobús el origen es **Madrid** y el destino Granada. La portada muestra origen/destino por **label**, no por code. Sin precios, fotos ni logos oficiales; si faltan orígenes, modos o proveedores, muestra avisos en lugar de links.
- **Nota por defecto del vuelo:** “Vuelo internacional a Madrid; desde ahí continúa a Granada.”
- **Estado del deploy:** el backend desplegado aún conserva el default anterior para eventos nuevos y el bundle desplegado mantiene la UI con IATA de la base `4773112`; el evento 2 ya está corregido en BD. Tras el redeploy de `8d70217`/`efb424b`, el default será solo Madrid y la UI no mostrará IATA.
- **Vuelos:** Google Flights, Skyscanner y Kayak reciben origen/destino por **código interno** y fechas; la UI muestra los nombres.
- **Tren:** Omio recibe ciudad + fecha; **Renfe y Trainline no aceptan fecha estable** y muestran **"Selecciona la fecha en el proveedor."**
- **Bus:** Omio y FlixBus reciben ciudad + fecha; **ALSA no acepta fecha estable** y muestra el mismo aviso.
- **Prefill de fechas:** Booking, Airbnb, Trivago, Google Hotels, vuelos, Omio (tren/bus) y FlixBus llevan las fechas en la URL; **Renfe, Trainline y ALSA no**, y la UI muestra **"Selecciona la fecha en el proveedor."**
- **Fallback:** una fecha vacía/inválida cae a **2027-06-08/12** para no generar links rotos. No hay disponibilidad ni precios en vivo.
- **Backend:** `normalizeStay`/`normalizeTrip` + schemas zod en `server/src/schemas/invitation.js`; agregados a `commonFields`, `normalizeInvitation` y `normalizeForRead` (listas siempre arrays). **Espejo cliente** en `client/src/invitation/schema/normalize.js` (mismos defaults/rangos; `_uid` solo en el formulario).
- **Listas vacías:** `cards: []`, `origins: []`, `arrivals: []` y `providers: []` se respetan como decisión explícita; solo `undefined`/`null` cae a los defaults. El editor corrige `arrivals` a Madrid al abrir.
- **Editor:** los orígenes son checkboxes con **nombres** desde `mexicanAirports.js` (20 aeropuertos); MEX/NLU/GDL/MTY quedan preseleccionados y no se editan códigos. La llegada es una fila estática **“Ciudad de llegada: Madrid”**, sin código, con la nota **“La llegada está fijada a Madrid.”** Un `useEffect` fuerza `trip.arrivals` a solo Madrid al abrir, para corregir datos viejos con Barcelona aunque no se toque la sección.
- **Labels de tema eliminadas:** `travelOriginCodeLabel`, `travelOriginPlaceholder`, `travelOriginHint`, `travelOriginInvalid` y `travelOtherOrigin`.
- **Compatibilidad legada:** `CITY_SLUGS` conserva `BCN` solo para leer datos viejos; la UI ya no ofrece Barcelona.
- **Legado:** `lodging` y `travel` no se renderizan; el evento 2 conserva sus 2 hoteles en `lodging`.

---

## 3. Datos del evento (`event`)

Estos NO viven en `cfg`, sino en el registro del evento:

| Campo | Tipo | Uso en pantalla |
| ----- | ---- | --------------- |
| `event.name` | string | Nombre del evento (fallback del título de portada si faltan los nombres de la pareja) |
| `event.date` | string `YYYY-MM-DD` | Fecha (la portada la formatea en español: "19 de junio de 2027") |
| `event.time` | string `HH:mm` | Hora. Se muestra en la caja "Hora" de Ceremonia/Recepción y en el itinerario; el placeholder `00:00` se oculta |
| `event.place` | string | Lugar: aparece en la portada, como título de "Nuestra historia" (si `labels.storyTitle` está vacío) y en el cierre (`place · Mes Año`) |

---

## 4. Datos del grupo / familia e invitados

| Dato | Qué es |
| ---- | ------ |
| `family` | Nombre del grupo invitado (p. ej. "Pérez"). Se usa en el sobre ("Una invitación para la Familia …"), en el relato por defecto, en el RSVP y en el agradecimiento. |
| `guests[]` | Cada invitado con `name`, `is_leader` (líder del grupo), `is_child` (niño), `registered` (ya confirmó), `declined` (declinó). |
| `rsvpNote` | Nota previa del grupo en el RSVP. |

> La sección de **Confirmación** es la compartida `shared/Rsvp.jsx` (idéntica para todas las plantillas); el diseño v2 solo la viste con las variables del tema.

---

## 5. Composición de la pantalla (orden de arriba a abajo)

El layout `BodaJorgeMacarenaLayout` arma la página en este orden, y **cada sección consume datos dinámicos ya resueltos**. El sobre (paso 1) es una pantalla de apertura previa; **después, todas las secciones de la página (portada incluida) son "hojas apilables"**: una tarjeta sticky de altura mínima completa con sombra ascendente, marco interior y efecto de apilado (la hoja entrante se inclina y se endereza; la anterior se hunde, gira levemente y se oscurece). El alto sticky se ajusta a `vh − alto de la hoja` para que el contenido largo sea alcanzable; con `prefers-reduced-motion` no se aplica ningún transform.

1. **Sobre editorial** (`EditorialEnvelope.jsx`, exclusivo de esta plantilla; `opening.envelopeVariant: "editorial"`): papel crema, solapa, sello lacre con monograma y flores. Encabezado "Una invitación para la Familia {family}". Secuencia: abrir solapa → sello → hoja → pantalla completa → fundido. Bloquea el scroll mientras está montado. Los textos salen de `theme.opening.editorial`. En la vista previa del editor el sobre no se monta.
2. **Portada** (`Hero.jsx`): foto B&N a sangre (`hero_image` → `gallery[0]`) con velo oscuro, eyebrow (`labels.heroEyebrow`), nombres apilados (novia & novio), línea de fecha larga, lugar, **countdown inline** (Días / Horas / Min / Seg) y cue "Desliza" (`heroScroll`). Ramillete de flores con entrada animada al abrir el sobre.
3. **Nuestra historia** (`Story.jsx`): foto enmarcada en blanco e inclinada (−1.5°) + eyebrow (`storyEyebrow`), divisor con bugambilia, título (`labels.storyTitle`; si está vacío, `event.place`) y relato (`cfg.story` → `cfg.message` → `defaultMessage`).
4. **Ceremonia / Recepción** (`Locations.jsx`): **una hoja por item de `cfg.locations`** (label → título; place → dirección; `url` → botón "Cómo llegar"; si no hay `url`, se busca por `place`). El eyebrow se elige por palabra clave (`locationEyebrows`: "Ceremonia religiosa" / "Recepción y fiesta") y la flor alterna. Caja "Hora" con `event.time` (oculta si falta o es `00:00`).
5. **Itinerario** (`Itinerary.jsx`): riel vertical con la hora en Cormorant, nodo de flor y momento en microtexto; si un `label` coincide con una ubicación, debajo aparece su `place`. Las horas `00:00` se ocultan. Se omite la hoja si no hay items.
6. **Vestimenta** (`DressCode.jsx`): eyebrow + divisor + cada etiqueta de `dress_code` en Cormorant gigante; `dress_note` como cita itálica. Se omite si no hay etiquetas.
7. **Regalo** (`Gifts.jsx`): se muestra si `registry.enabled` **o** si hay `registry_note`. Eyebrow "Regalo", "Con todo nuestro cariño", párrafo (`registry_note` o `giftIntro` del tema), selectores de moneda/monto (o CTA de Payment Link externo), pago con tarjeta (Checkout embebido) y "Transferencia bancaria" desplegable con los datos de `registry.bank` y botón Copiar. El encabezado del banco alterna "Desde México" / "Desde España" según la moneda elegida. **Monto:** con sugeridos se muestran los chips/dropdown y "Monto libre" como alternativa; sin sugeridos y con `allow_custom`, se muestra directamente moneda + campo **"Monto"**; sin sugeridos ni monto libre, se muestra el aviso **"La mesa de regalos aún no tiene montos configurados."** y **no se ofrece el CTA de tarjeta** (el banco se conserva). **Tarjeta:** se ofrece solo si `payment_methods.card[moneda]` no es `false`. Con una **cuenta de evento** seleccionada, MXN y EUR comparten la misma cuenta (`true/true` si está habilitada; `false/false` sin fallback si no). Sin cuenta de evento, se mantiene la resolución legacy: con **una sola cuenta MX habilitada**, tanto MXN como EUR muestran tarjeta (en EUR **Stripe convierte automáticamente** al liquidar); sin ninguna cuenta habilitada se muestra el aviso y la transferencia queda intacta.
8. **Confirmación (RSVP)**: sección **compartida** `shared/Rsvp.jsx` (misma lógica que en todas las plantillas: invitados, contactos, nota, límite de edición). El layout solo le neutraliza el fondo opaco para que se vea la hoja.
9. **Viaje** (`Travel.jsx`): se muestra si `cfg.trip.enabled` y hay contenido. La llegada es fija a **Madrid**: con una sola llegada muestra una fila estática “Llegada: Madrid”, sin código; solo si un JSONB legado trae varias conserva el selector. El origen se elige por **nombre** entre los aeropuertos configurados, sin “Otro aeropuerto” ni IATA; fechas editables; línea de adultos (por defecto 1); bloques avión/tren/autobús con carrusel de proveedores. En tren/autobús el origen es **Madrid** y el destino Granada. Sin precios ni disponibilidad.
10. **Hospedaje** (`Stay.jsx`): se muestra si `cfg.stay.enabled`. Mapa **Leaflet/OSM** de la zona (centro + radio), etiqueta + enlace a Google Maps, fechas editables y carrusel de tarjetas de plataforma (Booking, Airbnb, Trivago, Google Hotels o personalizadas). Sin fotos ni precios; sin tarjetas muestra un aviso.
11. **Cierre** (`Footer.jsx`): foto B&N con la cita (`closingQuote`), monograma circular flanqueado por ramilletes, línea `event.place · Mes Año`, "DisplayEvent" (salvo `hideBrand`) y el badge **"Powered by Webi"** (fijo, solo esta plantilla).

> **Portada pública (`MacarenaJorgeCover.jsx`):** después de `Story` y antes de `InvitationAccess` se renderizan `TravelSection` (**04 Viaje**, con tarjeta editorial `TravelEditorial` + `Travel` en `variant="cover"`) y `StaySection` (**05 Hospedaje**, con `StayPhoto` + `Stay` en `variant="cover"`). Con la BD actual, la portada y la invitación ya no muestran Barcelona: la llegada es Madrid y los orígenes/destinos se muestran por nombre, sin códigos IATA. El CTA de contacto se conserva en Hospedaje; se eliminaron `FeaturedHotel`, `SecondaryHotel`, `StayAction` y `hotelLinks`.

**Además (chrome fijo, sin datos del usuario):**

- **Pill de navegación inferior** (`BottomNav.jsx`): botones "Ubicación" / "Regalo" / "Confirmar". **En el working tree actual está eliminada** (cambio ajeno a Viaje/Hospedaje); el código desplegado aún la incluye.
- **Botón de música** (`MusicToggle.jsx`): arriba a la derecha; solo si `music_url` (debe ser URL directa a un archivo; ver §2.4).
- **Grano de papel** (`GrainOverlay`): capa fija decorativa sobre todo (también sobre el sobre).

**Fotos de las hojas:** `PHOTO_ORDER` fija qué foto de `gallery` toca a cada id (`historia`, `ceremonia`, `recepcion`, `itinerario`, `vestimenta`, `regalo`, `confirmar`, `viaje`, `hospedaje`, `cierre`): `gallery[(i + offset) % length]` (con `offset=1` si la portada consumió `gallery[0]`); las hojas de ubicación usan `gallery[(1 + i + offset) % length]`. Todas en B&N con scrim **claro** (`--inv-photo-scrim`, el papel del tema: 88% en bordes / 72% al centro) para que la tinta siga legible. La foto de portada carga `eager`; las de las hojas, `lazy` + `decoding="async"`.

---

## 6. Qué textos NO son datos del usuario (son del tema)

Los textos fijos viven en `themes/boda_jorge_macarena.js`, bloque `labels` (más `opening.editorial` para el sobre), y se pueden reescribir sin tocar datos:

- **Portada / sobre:** `heroEyebrow` ("Nos casamos"), `heroScroll` ("Desliza"); en `opening.editorial`: `kicker` ("Una invitación para"), `letterKicker` ("Nos casamos"), `hint` ("Toca para abrir"), `familyPrefix` ("la Familia") y las funciones `names`/`monogram`.
- **Música:** `musicOn` / `musicOff`. (`navLocations`/`navGift`/`navRsvp` se eliminaron junto con `BottomNav.jsx` en el working tree; cambio ajeno a Viaje/Hospedaje.)
- **Nuestra historia:** `storyEyebrow` ("Nuestra historia"), `storyTitle` (vacío → usa `event.place`).
- **Ceremonia / Recepción:** `locationEyebrows` (["Ceremonia religiosa", "Recepción y fiesta"]), `locationsEyebrow` ("Ceremonia y recepción"), `locations` ("Cómo llegar"), `locationTimeLabel` ("Hora").
- **Itinerario:** `itineraryEyebrow` ("Itinerario del día"), `itinerary` ("Itinerario").
- **Vestimenta:** `dressCodeEyebrow` ("Código de vestimenta"), `dressCode` ("Código de Vestimenta").
- **Regalo:** `registryEyebrow` ("Regalo"), `registryTitle` ("Mesa de Regalos"), `withLove` ("Con todo nuestro cariño"), `giftIntro`, `giftBankTitleMxn` / `giftBankTitleEur` ("Desde México" / "Desde España").
- **RSVP (compartido):** `rsvpEyebrow` ("Confirmación de asistencia"), `rsvp` ("Confirma tu asistencia"), `rsvpHelp` ("Marquen la asistencia de cada persona para continuar.").
- **Viaje:** `travelEyebrow` ("Para quienes vienen de lejos"), `travelTitle` ("Viaje"), `travelArrivalLabel` ("Ciudad de llegada"), `travelOriginLabel` ("Ciudad de salida"), `travelDateFromLabel` ("Llegada a España"), `travelDateToLabel` ("Regreso"), `travelAdultsOne` ("1 adulto"), `travelAdultsMany` ("adultos"), `travelCta` ("Buscar"), `travelFlightTitle` ("Avión"), `travelTrainTitle` ("Tren"), `travelBusTitle` ("Autobús"), `travelNoArrivals`, `travelNoOrigins`, `travelNoModes`, `travelNoProviders`. La fila estática muestra `arrivals[0]` (**Madrid**, sin código); `travelArrivalLabel` sigue siendo el label del campo. Se eliminaron `travelOriginCodeLabel`, `travelOriginPlaceholder`, `travelOriginHint`, `travelOriginInvalid` y `travelOtherOrigin`; no hay label de Barcelona.
- **Hospedaje:** `stayEyebrow` ("La estancia"), `stayTitle` ("Hospedaje"), `stayDateInLabel` ("Llegada"), `stayDateOutLabel` ("Salida"), `stayZoneLabel` ("Zona sugerida"), `stayMapLink` ("Abrir en Google Maps"), `stayCta` ("Buscar hospedaje"), `stayCardsLabel` ("Opciones de hospedaje"), `stayPlatformFallback` ("Hospedaje"), `stayEmptyNotice`.
- **Legado:** `lodgingEyebrow`, `lodgingTitle`, `lodgingMapLink` y `travelAirportLabel` siguen en el tema pero **ya no se consumen**.
- **Cierre:** `closingQuote` ("Dos ciudades, un mismo camino.").
- **Compatibilidad:** `countdown` ("Faltan"), `message` ("Nuestra historia"); conservados por contrato: `familyGreeting`, `defaultMessage`.

Y la **paleta completa** está en `theme.vars` (variables CSS `--inv-*`): papel, tinta, acentos de flora, sombras, scrim de foto, vars del sobre editorial, etc. **Esto es lo primero que tocará quien mejore el diseño.** ⚠️ El tema re-declara además las utilidades Tailwind (`--color-inv-*`, `--font-inv-*`) como puente por el `@theme` de `index.css` (ver §8, regla 5).

---

## 7. Pendientes / oportunidades visuales

> **Seed del evento 2:** ya actualizado en Supabase con `trip.arrivals` solo Madrid, `trip.modes.flight.note` y `trip.intro`; `origins`, `stay`, `lodging` y `travel` quedaron intactos. La cuenta Stripe del evento 2 ya está asignada: `acct_1UPr9eC0wYMF53iO`.

- [ ] **Push y deploy de `8d70217`, `efb424b` y `ff2b988`** para que la llegada fija a Madrid, la UI sin IATA y la cuenta Stripe restringida estén en el bundle desplegado. La base `4773112` ya está desplegada y el API ya devuelve `stay`/`trip`.
- [ ] **Hard refresh del panel** para descartar caché: si aparece “Hospedaje y viaje” o “Agregar hotel”, es caché; el bundle `EventInvitation-B0EhP2gA.js` ya contiene el editor de Viaje/Hospedaje de la base `4773112` (“Activar sección Viaje/Hospedaje”, “Tarjetas de hospedaje”). No hay service worker.
- [ ] **Verificar en `macarenayjorge.com` el mapa, los carruseles y los links con fechas** tras el redeploy (portada 04/05 e invitación personalizada).
- [ ] **Confirmar la ubicación real de la Misa** (hoy placeholder "Sagrada Familia" en `cfg.locations`; no está confirmada).
- [ ] **Decidir si se elimina el legado `lodging`/`travel`**; el evento 2 conserva 2 hoteles en `lodging` y la UI nueva no los muestra.
- [ ] *(Opcional)* **Fecha separada de traslado a Granada** en `trip` (hoy solo `date_from`/`date_to`).
- [ ] *(Menor)* Declarar `stay`/`trip` en `schema/fields.js` (hoy solo están en `normalize.js` y en el schema del servidor) para que el contrato quede documentado junto a los campos legacy.
- [ ] **Verificar el selector restringido** tras desplegar `ff2b988`: con la cuenta válida del evento 2 solo debe mostrarse esa cuenta y “Cambiar cuenta” debe revelar el resto.
- [ ] **Decidir si se eliminan las otras 3 cuentas Stripe o solo se ocultan**; hoy siguen en `stripe_accounts`/Stripe y la UI nueva las oculta.
- [ ] **Revisar los 2 cargos live pequeños (MX$10 y €1)** registrados en `gifts` (la tabla no distingue `livemode`).
- [ ] **Definir los montos reales de la mesa de regalos del evento 2:** hoy `allow_custom:false`, `min_mxn:0`, `min_eur:0`, `suggested_mxn:[10]`, `suggested_eur:[10,1]` y banco habilitado.
- [ ] **Fotos reales:** la boda aún usa imágenes de relleno (editables desde el editor). Subirlas a `gallery`/`hero_image` (y, si se suben archivos, activar Cloudinary en producción: el disco de Railway es efímero).
- [ ] **Reemplazar el enlace de YouTube de `music_url`** del evento (reportado: hoy no reproduce en el `<audio>` nativo) por un archivo subido desde el panel (MP3/M4A/OGG, máx. 15 MB; ver §2.4).
- [ ] El **scrim del `SectionPhoto`** es claro (88%/72% de `--inv-photo-scrim`); ajustar opacidades si se quiere más/menos protagonismo de la foto.
- [ ] **Fase B:** adoptar este diseño (tema + secciones) en los formatos genéricos; `alice_xv` queda intacta.
- [ ] Los ornamentos 3D (perlas/anillos) siguen retirados e inertes en `client/src/invitation/3d/`; se pueden re-activar a pedido.

---

## 8. Reglas a respetar al rediseñar

1. **No cambies los nombres de los campos** (`cfg.couple.nameA`, `cfg.itinerary`, `cfg.story`, `cfg.stay`, `cfg.trip`, etc.): son el contrato de datos con el backend y el editor. `cfg.lodging`/`cfg.travel` se conservan solo como legado.
2. **Respeta las variables CSS** `--inv-*` para colores/fuentes, o todo el sistema de temas se rompe.
3. **El editor es schema-driven**: si agregas un dato nuevo, debe reflejarse en `server/src/schemas/invitation.js` y en `client/src/invitation/schema/normalize.js` (y, si tiene UI propia, en `EventInvitation.jsx` o en un editor dedicado como `StayTravelEditor.jsx`). `stay`/`trip` no están en la grilla genérica: viven en `StayTravelEditor.jsx`.
4. El layout recibe `event`, `family`, `cfg`, `theme`, `rsvp`, `token`, `publishableKey`, `reveal` y `hideBrand`. Puedes reorganizar secciones, pero conserva esas props (y el contrato de `shared/Rsvp` si lo reutilizas).
5. **Puente de utilidades Tailwind:** por un bug conocido del `@theme` de `client/src/index.css` (`--color-inv-*` se resuelve una sola vez en `:root`), el tema re-declara `--color-inv-*`/`--font-inv-*` dentro de `theme.vars` para que `bg-inv-*`/`text-inv-*` tomen el valor del tema. Si creas otro tema que anide `--inv-*`, replica ese puente (deuda a resolver de raíz; ver MEMORIA §15).
