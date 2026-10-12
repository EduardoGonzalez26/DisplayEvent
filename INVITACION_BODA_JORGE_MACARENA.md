# Invitación "Boda de Jorge & Macarena" — Datos dinámicos

> **Para quién es este documento:** para alguien que va a **mejorar visualmente** la invitación sin tocar la lógica. Aquí se describe **exactamente qué datos llegan ya resueltos** a la vista, de dónde salen y en qué parte de la pantalla se muestran. Todo lo listado **ya funciona dinámicamente**: no hay que programar nada, solo diseñar sobre estos datos.
>
> **Plantilla:** `boda_jorge_macarena` · **Diseño actual (v2 "editorial sobre papel", 2026-10-11):** fondos crema (`--inv-bg #F6F2EB`), tinta cálida (`--inv-text #1C1B19`), fotos B&N con scrim claro y flora de Granada (dalia, bugambilia y granado) en SVG. Fuentes: **Cormorant Garamond** (display/títulos, también la itálica) y **Montserrat** (cuerpo).
>
> **Archivos clave:**
> - Vista pública: `client/src/invitation/InvitationPage.jsx` (obtiene datos por token).
> - Orquestación: `client/src/invitation/InvitationView.jsx` (tema + layout + sobre según `opening.envelopeVariant`).
> - Layout de este formato: `client/src/invitation/boda_jorge_macarena/BodaJorgeMacarenaLayout.jsx` (motor de hojas apilables).
> - Portada: `.../Hero.jsx`. Secciones locales: `.../Story.jsx`, `.../Locations.jsx`, `.../Itinerary.jsx`, `.../DressCode.jsx`, `.../Gifts.jsx`, `.../Lodging.jsx`, `.../Footer.jsx`.
> - Navegación y música: `.../BottomNav.jsx`, `.../MusicToggle.jsx`. Sobre: `.../EditorialEnvelope.jsx`.
> - Utilidades locales: `.../flora.jsx` (flores SVG), `.../Grain.jsx` (grano de papel), `.../SectionPhoto.jsx` (foto B&N por hoja), `.../helpers.js`.
> - Tema (textos, paleta, funciones): `client/src/invitation/themes/boda_jorge_macarena.js`.
> - Sección compartida: `client/src/invitation/shared/Rsvp.jsx` (+ utilidades `shared/util.jsx` y `shared/Countdown.jsx` → `useCountdown`).
> - Contrato de datos: `client/src/invitation/schema/fields.js`, `client/src/invitation/schema/normalize.js` y `server/src/schemas/invitation.js`.
> - Metadatos OG por token: `server/src/utils/invitationLookup.js`, `server/src/utils/ogMeta.js` y `server/src/index.js`.
> - Pagos con tarjeta (opcional): `server/src/routes/stripe.js` (cuentas Connect del organizador), `server/src/utils/stripeDestination.js` (destino por moneda) y `payment_methods` en `server/src/routes/invitations.js`.
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
| `payment_methods` | Disponibilidad de pago con tarjeta | `{ card: { mxn, eur } }` — la tarjeta se ofrece por moneda solo si el organizador tiene una **cuenta Stripe Connect** con cobros habilitados (ver §2.3 y §5) |

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

`cfg` es un objeto JSON con esta forma. Los campos **específicos de esta boda** siguen siendo tres; el resto son comunes a todos los formatos (y desde el 2026-10-11 hay **4 campos comunes nuevos** del rediseño v2, ver §2.4).

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
| `cfg.lodging` | `[{name, note, url?}]` | **Nuevo** — hoteles sugeridos |
| `cfg.travel` | `{title, airport_note, routes:[{label,note}], closing_note}` | **Nuevo** — bloque de viaje |
| `cfg.registry` | objeto | Mesa de regalos (ver §2.3) |

> **No consumidos por este diseño:** `cfg.kicker`, `cfg.tagline` y `cfg.celebrants` siguen en el contrato y en el editor, pero la portada v2 usa los textos del tema (`labels.heroEyebrow`, etc.).

### 2.3 Mesa de regalos (`cfg.registry`) — objeto

| Campo | Tipo | Qué es |
| ----- | ---- | ------ |
| `enabled` | boolean | Si se muestra la sección de regalos |
| `allow_custom` | boolean | Permite monto libre |
| `min_mxn` / `min_eur` | number | Monto mínimo en pesos / euros |
| `suggested_mxn` / `suggested_eur` | number[] | Montos sugeridos |
| `stripe_enabled` | boolean | Habilita pago con tarjeta (sujeto a `payment_methods` por moneda) |
| `payment_link_url` | string (URL) | Payment Link externo de Stripe; si tiene valor, el CTA de tarjeta abre ese enlace (el invitado elige el monto allí) |
| `bank` | `{ enabled, bank_name, holder, account_number, concept }` | Datos de depósito/transferencia |

### 2.4 Campos nuevos del rediseño v2 (detalle y tolerancias)

Los cuatro campos son **opcionales y tolerantes** (sin migración; el backend los valida en los 6 formatos, con defaults):

| Campo | Forma exacta | En la pantalla |
| ----- | ------------ | -------------- |
| `cfg.story` | string, tope **4000** (`STORY_MAX_LENGTH`); se recorta al normalizar | Relato de "Nuestra historia". Vacío → `cfg.message` → `defaultMessage` del tema |
| `cfg.music_url` | string: URL **directa** a un archivo de audio (MP3/M4A/OGG). El editor permite **subirlo** (máx. **15 MB**) o pegar la URL | Botón de música (arriba a la derecha). **Sin autoplay** (`preload="none"`), en loop; sin URL, el botón no se monta. ⚠️ YouTube / Spotify / Apple Music **no funcionan** (el reproductor es un `<audio>` nativo) |
| `cfg.lodging` | lista `{ name, note, url? }` (`url` opcional) | Filas editoriales de hoteles con enlace "Mapa" (si no hay `url`, se busca por nombre en Google Maps). Sin filas con contenido, no hay hoja |
| `cfg.travel` | `{ title, airport_note, routes:[{label,note}], closing_note }` | Tarjeta blanca de viaje (aeropuerto, rutas y nota de cierre). Cada bloque se pinta solo si tiene contenido; sin nada, no hay hoja |

**Editor:** se editan en dos bloques dedicados de `EventInvitation.jsx` — **"Nuestra historia y música"** y **"Hospedaje y viaje"** — visibles **hoy solo para el template `boda_jorge_macarena`** (los demás formatos los ignoran; Fase B los activará). La **música se puede subir desde el panel**: el bloque ofrece botones **"Subir audio" / "Reemplazar audio"** (componente `FileUploader`, `kind="audio"`) con validación cliente de tipo y tamaño espejo del servidor y la ayuda **"MP3, M4A u OGG · máx. 15 MB"**; al subir, la URL devuelta (`POST /api/uploads`, `201 { url }`; el endpoint acepta además imágenes de hasta 8 MB) queda en `form.music_url`. El input de **URL directa se conserva** para pegar enlaces. `schema/fields.js` los declara bajo `EXTRA_FIELDS.boda_jorge_macarena` y `schema/normalize.js` los espeja exactamente del backend.

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
7. **Regalo** (`Gifts.jsx`): se muestra si `registry.enabled` **o** si hay `registry_note`. Eyebrow "Regalo", "Con todo nuestro cariño", párrafo (`registry_note` o `giftIntro` del tema), selectores de moneda/monto (o CTA de Payment Link externo), pago con tarjeta (Checkout embebido) y "Transferencia bancaria" desplegable con los datos de `registry.bank` y botón Copiar. El encabezado del banco alterna "Desde México" / "Desde España" según la moneda elegida. La **tarjeta** se ofrece por moneda solo si `payment_methods.card[moneda]` no es `false` (cuenta Stripe Connect del organizador con cobros habilitados); si no, se muestra el aviso y la transferencia queda intacta.
8. **Confirmación (RSVP)**: sección **compartida** `shared/Rsvp.jsx` (misma lógica que en todas las plantillas: invitados, contactos, nota, límite de edición). El layout solo le neutraliza el fondo opaco para que se vea la hoja.
9. **Hospedaje y viaje** (`Lodging.jsx`): filas de `cfg.lodging` (con enlace "Mapa") + tarjeta de `cfg.travel`. Se omite si no hay contenido.
10. **Cierre** (`Footer.jsx`): foto B&N con la cita (`closingQuote`), monograma circular flanqueado por ramilletes, línea `event.place · Mes Año`, "DisplayEvent" (salvo `hideBrand`) y el badge **"Powered by Webi"** (fijo, solo esta plantilla).

**Además (chrome fijo, sin datos del usuario):**

- **Pill de navegación inferior** (`BottomNav.jsx`): botones "Ubicación" / "Regalo" / "Confirmar" (solo si la sección existe; "Confirmar" en tinta, como acción principal). Aparece al abrir el sobre; el salto usa la posición de flujo real de cada hoja.
- **Botón de música** (`MusicToggle.jsx`): arriba a la derecha; solo si `music_url` (debe ser URL directa a un archivo; ver §2.4).
- **Grano de papel** (`GrainOverlay`): capa fija decorativa sobre todo (también sobre el sobre).

**Fotos de las hojas:** `PHOTO_ORDER` fija qué foto de `gallery` toca a cada id (`historia`, `ceremonia`, `recepcion`, `itinerario`, `vestimenta`, `regalo`, `confirmar`, `hospedaje`, `cierre`): `gallery[(i + offset) % length]` (con `offset=1` si la portada consumió `gallery[0]`); las hojas de ubicación usan `gallery[(1 + i + offset) % length]`. Todas en B&N con scrim **claro** (`--inv-photo-scrim`, el papel del tema: 88% en bordes / 72% al centro) para que la tinta siga legible. La foto de portada carga `eager`; las de las hojas, `lazy` + `decoding="async"`.

---

## 6. Qué textos NO son datos del usuario (son del tema)

Los textos fijos viven en `themes/boda_jorge_macarena.js`, bloque `labels` (más `opening.editorial` para el sobre), y se pueden reescribir sin tocar datos:

- **Portada / sobre:** `heroEyebrow` ("Nos casamos"), `heroScroll` ("Desliza"); en `opening.editorial`: `kicker` ("Una invitación para"), `letterKicker` ("Nos casamos"), `hint` ("Toca para abrir"), `familyPrefix` ("la Familia") y las funciones `names`/`monogram`.
- **Navegación / música:** `navLocations` ("Ubicación"), `navGift` ("Regalo"), `navRsvp` ("Confirmar"), `musicOn` / `musicOff`.
- **Nuestra historia:** `storyEyebrow` ("Nuestra historia"), `storyTitle` (vacío → usa `event.place`).
- **Ceremonia / Recepción:** `locationEyebrows` (["Ceremonia religiosa", "Recepción y fiesta"]), `locationsEyebrow` ("Ceremonia y recepción"), `locations` ("Cómo llegar"), `locationTimeLabel` ("Hora").
- **Itinerario:** `itineraryEyebrow` ("Itinerario del día"), `itinerary` ("Itinerario").
- **Vestimenta:** `dressCodeEyebrow` ("Código de vestimenta"), `dressCode` ("Código de Vestimenta").
- **Regalo:** `registryEyebrow` ("Regalo"), `registryTitle` ("Mesa de Regalos"), `withLove` ("Con todo nuestro cariño"), `giftIntro`, `giftBankTitleMxn` / `giftBankTitleEur` ("Desde México" / "Desde España").
- **RSVP (compartido):** `rsvpEyebrow` ("Confirmación de asistencia"), `rsvp` ("Confirma tu asistencia"), `rsvpHelp` ("Marquen la asistencia de cada persona para continuar.").
- **Hospedaje:** `lodgingEyebrow` ("Hospedaje y viaje"), `lodgingTitle` ("Dónde quedarse"), `lodgingMapLink` ("Mapa"), `travelAirportLabel` ("Aeropuerto más cercano").
- **Cierre:** `closingQuote` ("Dos ciudades, un mismo camino.").
- **Compatibilidad:** `countdown` ("Faltan"), `message` ("Nuestra historia"); conservados por contrato: `familyGreeting`, `defaultMessage`.

Y la **paleta completa** está en `theme.vars` (variables CSS `--inv-*`): papel, tinta, acentos de flora, sombras, scrim de foto, vars del sobre editorial, etc. **Esto es lo primero que tocará quien mejore el diseño.** ⚠️ El tema re-declara además las utilidades Tailwind (`--color-inv-*`, `--font-inv-*`) como puente por el `@theme` de `index.css` (ver §8, regla 5).

---

## 7. Pendientes / oportunidades visuales

- [ ] **Fotos reales:** la boda aún usa imágenes de relleno (editables desde el editor). Subirlas a `gallery`/`hero_image` (y, si se suben archivos, activar Cloudinary en producción: el disco de Railway es efímero).
- [ ] **Reemplazar el enlace de YouTube de `music_url`** del evento (reportado: hoy no reproduce en el `<audio>` nativo) por un archivo subido desde el panel (MP3/M4A/OGG, máx. 15 MB; ver §2.4).
- [ ] El **scrim del `SectionPhoto`** es claro (88%/72% de `--inv-photo-scrim`); ajustar opacidades si se quiere más/menos protagonismo de la foto.
- [ ] **Fase B:** adoptar este diseño (tema + secciones) en los formatos genéricos; `alice_xv` queda intacta.
- [ ] Los ornamentos 3D (perlas/anillos) siguen retirados e inertes en `client/src/invitation/3d/`; se pueden re-activar a pedido.

---

## 8. Reglas a respetar al rediseñar

1. **No cambies los nombres de los campos** (`cfg.couple.nameA`, `cfg.itinerary`, `cfg.story`, `cfg.lodging`, etc.): son el contrato de datos con el backend y el editor.
2. **Respeta las variables CSS** `--inv-*` para colores/fuentes, o todo el sistema de temas se rompe.
3. **El editor es schema-driven**: si agregas un dato nuevo, debe reflejarse en `schema/fields.js` y `server/src/schemas/invitation.js` (y, si tiene UI propia, en `EventInvitation.jsx`).
4. El layout recibe `event`, `family`, `cfg`, `theme`, `rsvp`, `token`, `publishableKey`, `reveal` y `hideBrand`. Puedes reorganizar secciones, pero conserva esas props (y el contrato de `shared/Rsvp` si lo reutilizas).
5. **Puente de utilidades Tailwind:** por un bug conocido del `@theme` de `client/src/index.css` (`--color-inv-*` se resuelve una sola vez en `:root`), el tema re-declara `--color-inv-*`/`--font-inv-*` dentro de `theme.vars` para que `bg-inv-*`/`text-inv-*` tomen el valor del tema. Si creas otro tema que anide `--inv-*`, replica ese puente (deuda a resolver de raíz; ver MEMORIA §15).
