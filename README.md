# DisplayEvent

Organizador de eventos web: crea eventos, administra invitados por grupos y lleva el conteo de asistentes registrados.

**Stack:** React + Vite + Tailwind CSS · Node.js + Express · PostgreSQL (Supabase)

## Estructura

```
DisplayEvent/
├── client/   # Frontend React (Vite + Tailwind)
│   └── src/invitation/   # Invitación pública multiformato
│       ├── themes/       # Temas (xv, boda, cumpleanos, baby_shower, alice_xv, boda_jorge_macarena)
│       ├── shared/       # Secciones compartidas (RSVP genérico, galería, cuenta regresiva…)
│       ├── schema/       # Contrato de campos y normalización
│       ├── <formato>/    # Layout + secciones propias (las especiales mantienen componentes locales)
│       └── boda_jorge_macarena/v3/   # Diseño v3 vigente (v3.css + secciones propias)
└── server/   # Backend Express + PostgreSQL
```

## Requisitos

- Node.js 18+
- PostgreSQL (Supabase o local)

## Configuración

1. Configura tu conexión PostgreSQL en `server/.env` (copia `server/.env.example` si no existe).

   La opción recomendada es definir la connection string completa en `DATABASE_URL`
   (es lo que usa Supabase/Railway y tiene prioridad en el código):

   ```
   DATABASE_URL=postgresql://usuario:password@host:5432/basedatos
   ```

   Alternativamente, puedes usar variables individuales (`DB_HOST`, `DB_PORT`,
   `DB_USER`, `DB_PASSWORD`, `DB_NAME`):

   ```
   PORT=4000
   JWT_SECRET=pon_un_secreto_largo
   CLIENT_URL=http://localhost:5173
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=tu_usuario
   DB_PASSWORD=tu_password
   DB_NAME=displayevent
   ```

   También configura el envío del correo de verificación. La opción recomendada para
   la nube es **Brevo** (`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`), que funciona por HTTPS;
   como alternativa local puede usarse SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
   `SMTP_PASS`; ver `.env.example`). Pruébalo con `npm run test:smtp`.

   El envío de invitaciones por WhatsApp funciona sin configuración con enlaces
   `wa.me`; para el envío automático, completa el bloque opcional `WHATSAPP_*` de
   `.env.example` (Cloud API de Meta: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
   `WHATSAPP_TEMPLATE_NAME` y una plantilla Utility aprobada).

   Para servir invitaciones en **dominios personalizados**, añade el dominio como
   *custom domain* en Railway (Settings → Networking) y agrégalo a `ALLOWED_ORIGINS`
   (lista separada por comas; cuando se define, sustituye a `CLIENT_URL` como lista de
   CORS). Railway muestra un CNAME target y un TXT de verificación de propiedad:
   **ambos son obligatorios** (sin el TXT el dominio responde 404). La columna
   `events.custom_domain` se crea al ejecutar `init-db`.

2. Crea el esquema (tablas, índices y backfills; es idempotente) y normaliza las
   invitaciones existentes al contrato v2. El `init-db` actual también crea
   `gift_messages`, `events.gift_message_email`, `events.age_ranges` y las columnas de alergia/edad
   `guests.allergy`/`guests.allergy_notes`/`guests.age` (`SMALLINT`, NULL = sin registrar; mensajes de regalo, RSVP v4 y rangos de edad):

   ```bash
   cd server
   npm install
   npm run init-db
   npm run backfill-invitation-v2
   ```

## Ejecutar

Terminal 1 — backend (puerto 4000):

```bash
cd server
npm run dev
```

Terminal 2 — frontend (puerto 5173):

```bash
cd client
npm install
npm run dev
```

Abre http://localhost:5173

## Funcionalidades

- **Autenticación**: registro con verificación de correo (Brevo o SMTP). Antes de entrar se exige confirmar el enlace enviado por email. JWT en cookie httpOnly. El panel completo está protegido; solo las invitaciones públicas (`/invitacion/<hash>`) no requieren sesión.
- **Eventos**: crear, editar y eliminar eventos (nombre, día, hora, lugar).
- **Pantalla de evento** con sidebar de secciones:
  - **Inicio**: resumen del evento y conteos rápidos.
  - **Invitados**: organización por grupos con líder; cada invitado se marca como niño y como "registrado". El líder del grupo cuenta automáticamente como invitado.
  - **Exportar PDF del resumen de invitados**: botón en la cabecera de **Invitados** que descarga un PDF A4 con resumen general, tabla por grupo con totales y detalle de invitados (logo, cabeceras y paginación; el detalle incluye **Edad** y **Alergia** cuando existen). Exporta todos los grupos sin aplicar los filtros activos; jsPDF/AutoTable se cargan de forma diferida.
  - **Mesas**: organizador visual con **drag & drop** (dnd-kit), búsqueda y filtro de sin asignar, mesas redondas/cuadradas/rectangulares con porcentaje de ocupación, colores por grupo, acompañantes que se mueven en bloque y validación de capacidad en el servidor. Solo invitados confirmados pueden sentarse. Exportación a lista imprimible y CSV.
  - **Dashboard**: estadísticas detalladas del evento (invitados, niños, adultos, registrados) con desglose por grupo y bloque **“Rangos de edad”** debajo de las StatCards (defaults Bebé 0–3, Niño 3–12, Adolescente 12–18, Adulto 18+; editable, con total/confirmados por rango y “Sin edad registrada”/“Sin rango”).
- **Invitación pública multiformato**: cada grupo recibe un enlace con token (`/invitacion/<token>`) que muestra la invitación sin requerir sesión. Cuenta con 4 temas genéricos — `xv`, `boda`, `cumpleanos`, `baby_shower` — y 2 plantillas especiales (`alice_xv`, `boda_jorge_macarena`), compuestas por un `Layout` + secciones propias; los genéricos reutilizan las secciones de `shared/`. La boda usa el **diseño v3 + delta v4** vigente (ver abajo).
- **Dominio personalizado por evento**: cada evento puede definir su propio hostname (p. ej. `macarenayjorge.com`). La raíz `https://<dominio>/` muestra una **portada pública del evento** (general, sin token y sin mesa de regalos; portada fija por ahora), mientras que la invitación personalizada de cada grupo sigue en `https://<dominio>/invitacion/<token>` (sin slug). La marca "DisplayEvent" se oculta en ese host; la invitación personalizada se marca `noindex` y la portada de la raíz es indexable. La portada incluye **Viaje (04)** y **Hospedaje (05)**; la llegada está fijada a Madrid. La base `4773112` está desplegada; el rediseño **v3** de la portada y de la invitación está en el **working tree, sin commit ni push** (ver abajo).
- **Editor de invitación**: selector de formato, campos específicos por formato, vista previa (preview) y plantillas de usuario reutilizables. La plantilla `boda_jorge_macarena` usa un editor dedicado v3 (`BodaJorgeMacarenaV3Editor.jsx`) con historia/música, `og_image`, Icebreaker, Recomendaciones, ubicaciones extendidas, hoteles, cita de Hospedaje, correo de mensajes y Viaje/Hospedaje (`StayTravelEditor.jsx`); las secciones genéricas de Portada/Itinerario/Ubicaciones/Galería/Contactos se ocultan en esa plantilla.
- **Mesa de regalos**: depósito/transferencia bancaria y pago con tarjeta con Stripe. Admite un **Payment Link externo** por evento (`registry.payment_link_url`, p. ej. la cuenta Stripe del organizador) que abre la pasarela y deja que el invitado elija el monto; sin él se usa el pago integrado con **Stripe Connect**. En el editor (**Pagos / Conectar Stripe**), **"Cuenta de Stripe para este evento"** permite elegir la cuenta. Con una cuenta válida asignada, la UI muestra **solo esa cuenta** y oculta **Automática**; **"Cambiar cuenta"** revela temporalmente el resto. Si la cuenta guardada es inválida/deshabilitada, se revelan todas para elegir otra. Las otras 3 cuentas del usuario quedan **ocultas, no borradas**. Solo se aceptan cuentas propias con cobros habilitados. Con una cuenta elegida, **esa es la única que recibe los pagos del evento**, en MXN y EUR (Stripe convierte si la moneda no coincide); si deja de estar habilitada, la tarjeta queda sin disponibilidad y no hay fallback. Requiere las claves `STRIPE_*`.
- **Monto libre sin montos sugeridos**: si la mesa de regalos permite monto libre (`allow_custom`) y no hay montos sugeridos para la moneda, la invitación muestra directamente el selector de moneda y el campo **"Monto"** (sin la opción "Monto libre" en un desplegable). Si no hay sugeridos y el monto libre está desactivado, muestra **"La mesa de regalos aún no tiene montos configurados."** y no ofrece el CTA de tarjeta; la transferencia bancaria se conserva. El editor avisa (sin bloquear el guardado) cuando el pago con tarjeta está activo, falta alguna lista de montos y `allow_custom` es false.
- **Envío de invitaciones por WhatsApp**: desde **Invitados**, el botón "Enviar invitaciones" resume grupos enviables e invitados cubiertos, permite editar el mensaje (3 plantillas y vista previa) y pide confirmación antes de enviar. Por defecto usa enlaces `wa.me` (el organizador abre cada chat y puede marcarlas como enviadas); con la **WhatsApp Cloud API** configurada el envío es automático desde el servidor.
- **Subida de archivos**: imágenes (8 MB) y audio (15 MB) para la invitación vía **Cloudinary** (si está configurado) o guardado local en `server/uploads/`.

### Invitación v3 + delta v4 (plantilla `boda_jorge_macarena`)

La plantilla fue **reemplazada en sitio** por el diseño **v3**; el **delta v4** lo extiende sin plantilla nueva ni selector v2/v3/v4. El layout `BodaJorgeMacarenaLayout.jsx` monta las secciones de `client/src/invitation/boda_jorge_macarena/v3/` y el sistema visual `v3.css`. `alice_xv` permanece intacta; los archivos v2 de la boda siguen en disco pero ya no se importan.

- **Diseño:** papel de algodón, marco nazarí, granada en acuarela, letterpress, Cormorant Upright + Nikolai Condensed y dibujos `.webp` con `multiply`. Orden: Portada · Granada, España · Icebreaker · Ceremonia · Celebración · Vestimenta · Recomendaciones · Viaje · Hospedaje · Confirmación · Regalo · Cierre.
- **Assets v4:** nuevos `c-p10.webp` y `idea-ellos-1..3.jpg`/`idea-ellas-1..3.jpg`; `c-p1.webp` actualizado.
- **Vestimenta v4:** botón **“Ver ideas”** que abre un modal (portal a `body`) con 3 fotos de “Ellos” y 3 de “Ellas”; cierra con Escape, × o backdrop, bloquea scroll y restaura el foco.
- **Recomendaciones v4:** 5 consejos (incluye **“Moverse por Granada”**, icono `taxi`, PideTaxi, teléfono +34 958 28 00 00 y mención a App Store/Google Play). Imagen `c-p10.webp` (4/3, Real Alcázar); el texto admite `**negrita**` y `{phone}`, que se renderiza como enlace `tel:`.
- **Componentes:** `CoverSection`, `StorySection`, `IcebreakerSection`, `LocationSection`, `DressCodeSection`, `RecommendationsSection`, `TravelSection`, `StaySection`, `RsvpSection`, `GiftsSection`, `ClosingSection` + `ui.jsx`/`assets.js`.
- **Editor:** `BodaJorgeMacarenaV3Editor.jsx` edita `story`, `music_url`, `og_image`, `icebreaker`, `recommendations` (incluido `phone`), `locations` extendidas, `lodging` (máx. 2), `stay.quote/quote_author`, `registry.bank.clabe`, `registry.bank_eur` y `gift_message_email`; oculta las secciones genéricas de Portada/Itinerario/Ubicaciones/Galería/Contactos.
- **RSVP v3 + v4:** familias reales, sin “Líder”, sin modal/contactos, plazo en hora de España (`Europe/Madrid`) y estados enviado/plazo cerrado/edición. Solo esta plantilla pide **edad**; cada asistente responde **alergia alimentaria** (Sí/No + notas ≤500) y **edad** (obligatoria, 0..120); el submit se bloquea hasta completar asistencia + alergia + edad. Se envían `allergies: [{ guest_id, has_allergy, notes }]` y `ages: [{ guest_id, age }]` (opcional para compatibilidad); el backend persiste en la misma transacción y relee. El panel muestra “Edad: X”/“Edad sin registrar” y “Alergia: …”/“Alergia sin registrar”; el PDF de detalle añade ambas.
- **Regalo v3:** Stripe embebido o Payment Link, depósito MXN con CLABE y cuenta EUR con IBAN, y mensaje privado a los novios que aparece solo tras copiar CLABE/IBAN o tocar pagar. Se guarda en `gift_messages`, se avisa por correo (`events.gift_message_email`) y se consulta en **Mensajes** (`/events/:id/mensajes`).
- **Datos:** `server/src/scripts/update-event-macarena-v3.js` (dry-run por defecto; `--apply` escribe) actualiza el evento 2 con **5 recomendaciones**, `recommendations.image = .../c-p10.webp`, historia, Icebreaker, ubicaciones, hoteles, Hospedaje, Viaje (tren apagado), CLABE, RSVP editable/deadline y `og_image`; limpia `gallery`/`hero_image`/`contacts`. El seed v4 y las columnas de alergia/edad ya están aplicados con `init-db`; al momento de este ajuste hay **198 invitados con `age` NULL**.
- **Rangos de edad (dashboard):** solo esta plantilla captura `guest.age`; los rangos son por evento (`events.age_ranges`, `NULL` por defecto) y el conteo usa `guest.age` + `registered`. La UI aplica los defaults hasta guardar.
- **Estado del evento 2:** el correo de mensajes ya está configurado en el panel y existe **1 mensaje guardado** (actividad externa; no modificar).
- **Pendientes:** subir `client/public/fonts/Nikolai-Condensed.woff2` (hoy falta) y hacer commit/deploy con smoke final.

### Viaje y Hospedaje (plantilla `boda_jorge_macarena`)

Dos secciones independientes que sustituyen a la antigua hoja combinada "Hospedaje y viaje". En la invitación v3 + v4 el orden es **Viaje → Hospedaje → Confirmación → Regalo → Cierre**; en la portada pública van después de la historia como **04 Viaje** y **05 Hospedaje**. La UI vive en `v3/TravelSection.jsx` y `v3/StaySection.jsx`.

- **Viaje** (`client/src/invitation/boda_jorge_macarena/v3/TravelSection.jsx`): llegada fija a **Madrid**; el origen se elige por **nombre** entre `trip.origins` (catálogo `client/src/wedding/mexicanAirports.js`). Fechas editables, adultos (por defecto 1) y bloques de **avión/autobús** con proveedores; **el tren está apagado** (el editor fuerza `trip.modes.train.enabled = false`).
- **Hospedaje** (`v3/StaySection.jsx`): máximo **2 hoteles** de `cfg.lodging`, mapa estático del Albaicín, fechas editables, tarjetas de plataforma (Booking, Airbnb, Trivago, Google Hotels o personalizadas) y cita (`stay.quote`/`quote_author`). Sin fotos ni precios.
- **Mapa legacy**: `ZoneMap.jsx` (Leaflet/OSM) sigue en disco para la UI v2, pero **v3 no lo monta**; Hospedaje usa un mapa estático `.webp`.
- **Links** (`client/src/wedding/stayTravelLinks.js`): generador puro. Booking usa `lat`/`lng`/`radius_km`; Airbnb usa un bbox; Trivago y Google Hotels usan la etiqueta. Vuelos con origen/destino por código interno (la UI muestra nombres); autobús desde Madrid a Granada. Fechas prellenadas en Booking/Airbnb/Trivago/Google Hotels/vuelos/Omio/FlixBus; ALSA no acepta fecha estable y muestra "Selecciona la fecha en el proveedor". `CITY_SLUGS` conserva `BCN` solo para leer datos legados.
- **Editor** (`client/src/pages/event/StayTravelEditor.jsx`, integrado en `EventInvitation.jsx`): activa/desactiva cada sección, edita intro, fechas, modos/proveedores, zona (mapa + slider 0.5–20 km + etiqueta) y tarjetas (auto/manual, URL manual y "Probar link"). Los orígenes son checkboxes con **nombres** del catálogo de 20 aeropuertos; MEX/NLU/GDL/MTY quedan preseleccionados y no se editan códigos. La llegada es una fila estática **“Ciudad de llegada: Madrid”**. En la boda v3 + v4 el modo tren se oculta y se fuerza a `false`; las advertencias son no bloqueantes.
- **Contrato**: `stay` y `trip` se normalizan/validan en `server/src/schemas/invitation.js` y en `client/src/invitation/schema/normalize.js`. `lodging` se usa como hoteles recomendados (máx. 2); `travel` sigue como **legado** y no se renderiza.
- **Estado**: la base `4773112` está desplegada; el código v4 está en el **working tree, sin commit ni push**. El esquema (`init-db`) y el seed v4 del evento 2 ya están aplicados, incluidas las migraciones de alergias/edad (`guests.age`) y `events.age_ranges`. La cuenta Stripe del evento 2 sigue asignada (`acct_1UPr9eC0wYMF53iO`).

## API

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/health` | Estado del servicio (público) |
| POST | `/api/auth/register` | Crea un usuario (usuario, correo, contraseña) y envía correo de verificación |
| POST | `/api/auth/login` | Inicia sesión y devuelve cookie de sesión |
| POST | `/api/auth/logout` | Cierra sesión |
| GET | `/api/auth/me` | Usuario autenticado actual |
| POST | `/api/auth/verify` | Verifica el correo con el token del enlace |
| POST | `/api/auth/resend-verification` | Reenvía el correo de verificación |
| GET | `/api/invitations/:token` | Invitación pública por token (evento, grupo, invitados y `payment_methods` de tarjeta por moneda; con `events.stripe_account_id` seleccionado, ambas monedas comparten disponibilidad) |
| PUT | `/api/invitations/:token/rsvp` | Confirmación pública de asistencia (RSVP); v4 acepta `allergies: [{ guest_id, has_allergy, notes }]` y `ages: [{ guest_id, age }]` (0..120 o null; opcional) y devuelve los `guests` actualizados |
| POST | `/api/invitations/:token/payment` | Crea la Checkout Session embebida del regalo (Stripe Connect: el importe va a la cuenta del anfitrión o a la cuenta elegida para el evento) |
| POST | `/api/invitations/:token/gift-message` | Guarda un mensaje privado de la mesa de regalos v3 (≤1000 caracteres; `amount`/`currency`/`channel` opcionales) y avisa por correo si hay destinatario |
| GET | `/api/events/:id/gift-messages` | Lista los mensajes de regalo del evento (solo dueño) |
| PATCH | `/api/events/:id/gift-messages/:messageId` | Marca/desmarca un mensaje como leído (`{ read: boolean }`) |
| GET | `/api/public/event` | Portada pública del dominio propio: resuelve el evento por `Host` (sin token) y devuelve solo datos de portada (incluye `stay`/`trip` cuando están en el JSONB); excluye `registry` y datos privados |
| GET | `/api/events` | Lista eventos con conteos |
| POST | `/api/events` | Crea un evento |
| GET | `/api/events/:id` | Detalle de un evento (incluye `age_ranges`) |
| PUT | `/api/events/:id` | Edita un evento; acepta `stripe_account_id` (ausente = conservar; `""`/`null` = limpiar; `acct_...` = cuenta propia con cobros habilitados; inválida → 400) y `gift_message_email` (ausente = conservar; vacío = borrar; valida formato) |
| PUT | `/api/events/:id/age-ranges` | Guarda los rangos de edad del dashboard (solo dueño; `{ ranges }`; máx. 20, `max` exclusivo o `null`, sin solapamientos, abierto solo al final); devuelve `{ ok:true, age_ranges }` |
| DELETE | `/api/events/:id` | Elimina un evento (y sus grupos/invitados) |
| GET | `/api/events/:id/stats` | Estadísticas del evento |
| GET | `/api/events/:id/invitation` | Configuración de la invitación del evento |
| PUT | `/api/events/:id/invitation` | Guarda (valida y normaliza) la invitación del evento |
| GET/POST | `/api/events/:id/tables` | Listar / crear mesas |
| PUT/DELETE | `/api/events/:id/tables/:tableId` | Editar / eliminar mesa |
| PUT | `/api/events/:id/guests/:groupId/:guestId/assign` | Asignar / liberar invitado de una mesa (valida capacidad y confirmación) |
| PUT | `/api/events/:id/guests/:groupId/:guestId/companion` | Vincular acompañante a un invitado principal |
| GET/POST | `/api/events/:id/groups` | Listar / crear grupos |
| PUT/DELETE | `/api/events/:id/groups/:groupId` | Editar / eliminar grupo |
| POST | `/api/events/:id/groups/:groupId/token` | Regenera el token de invitación (revoca el anterior) |
| GET/POST | `/api/events/:id/guests(/:groupId)` | Listar invitados / crear en grupo |
| PUT/DELETE | `/api/events/:id/guests/:groupId/:guestId` | Editar (niño/registro) / eliminar invitado |
| GET | `/api/events/:id/whatsapp` | Estado del envío por WhatsApp (modo, plantillas y mensaje guardado) |
| PUT | `/api/events/:id/whatsapp/message` | Guarda el mensaje de invitación por WhatsApp (≤800 caracteres) |
| POST | `/api/events/:id/whatsapp/send` | Prepara (enlaces `wa.me`) o envía (Cloud API) las invitaciones a los líderes |
| POST | `/api/events/:id/whatsapp/mark` | Marca como enviadas las invitaciones confirmadas manualmente |
| GET/POST | `/api/templates` | Listar / crear plantillas de invitación del usuario |
| GET | `/api/templates/:id` | Detalle de una plantilla |
| PUT/DELETE | `/api/templates/:id` | Editar / eliminar plantilla |
| GET | `/api/stripe/accounts` | Cuentas Connect del usuario y su estado (sincroniza con Stripe) |
| POST | `/api/stripe/create-account` | Crea la cuenta Connect (Express) y devuelve la URL de onboarding |
| POST | `/api/uploads` | Subir imagen (8 MB) o audio (MP3/M4A/OGG, 15 MB) (Cloudinary o `server/uploads/`) |
