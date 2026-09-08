# Invitación "Boda de Jorge & Macarena" — Datos dinámicos

> **Para quién es este documento:** para alguien que va a **mejorar visualmente** la invitación sin tocar la lógica. Aquí se describe **exactamente qué datos llegan ya resueltos** a la vista, de dónde salen y en qué parte de la pantalla se muestran. Todo lo listado **ya funciona dinámicamente**: no hay que programar nada, solo diseñar sobre estos datos.
>
> **Plantilla:** `boda_jorge_macarena` · **Paleta actual (base):** azul noche + dorado + marfil. Fuentes: Playfair Display (display), Great Vibes (script), Lato (body).
>
> **Archivos clave:**
> - Vista pública: `client/src/invitation/InvitationPage.jsx` (obtiene datos por token).
> - Orquestación: `client/src/invitation/InvitationView.jsx`.
> - Layout de este formato: `client/src/invitation/boda_jorge_macarena/BodaJorgeMacarenaLayout.jsx`.
> - Hero (portada) de este formato: `client/src/invitation/boda_jorge_macarena/Hero.jsx`.
> - Tema (textos, paleta, funciones): `client/src/invitation/themes/boda_jorge_macarena.js`.
> - Secciones compartidas (reutilizadas por todos los formatos): `client/src/invitation/shared/`.
> - Contrato de datos (qué campos existen): `client/src/invitation/schema/fields.js` y `server/src/schemas/invitation.js`.

---

## 1. De dónde salen los datos (contexto)

La invitación se publica con un token único por grupo de invitados (`/invitacion/<token>`). Al cargar, el servidor devuelve **4 bloques de datos**:

| Bloque | Qué contiene | Qué es |
| ------ | ------------ | ------ |
| `event` | Los datos generales del evento | `{ name, date, time, place, invitation }` |
| `group` | El grupo invitado | `{ name, rsvp_note }` |
| `guests` | Los invitados de ese grupo | lista de `{ id, name, is_leader, is_child, registered, declined }` |
| `public_config` | Config pública | `{ stripe_publishable_key }` |

Internamente, la vista los recibe con estos nombres de prop:

- `event` → datos del evento.
- `family` → `group.name` (el **nombre de la familia / grupo** invitado).
- `cfg` → `event.invitation` (el **JSON de configuración de la invitación**, descrito en la sección 2).
- `guests` → lista de invitados del grupo.
- `rsvpNote` → `group.rsvp_note`.
- `token` → el token público.
- `publishableKey` → `public_config.stripe_publishable_key`.

---

## 2. Datos dinámicos específicos del formato `boda_jorge_macarena`

`cfg` es un objeto JSON con esta forma. Los campos **específicos de esta boda** son solo tres; el resto son comunes a todos los formatos.

### 2.1 Campos específicos (los únicos propios de esta plantilla)

| Campo | Tipo | Uso en pantalla |
| ----- | ---- | --------------- |
| `cfg.couple.nameA` | string | Nombre del novio (p. ej. "Jorge") |
| `cfg.couple.nameB` | string | Nombre de la novia (p. ej. "Macarena") |
| `cfg.registry_note` | string | Nota opcional de la mesa de regalos (texto libre) |

> El **monograma** y la **firma** se derivan automáticamente de `couple.nameA` + `couple.nameB` (ver sección 3 y 5).

### 2.2 Campos comunes (compartidos con todos los formatos)

| Campo | Tipo | Qué es / dónde se ve |
| ----- | ---- | -------------------- |
| `cfg.hero_image` | string (URL) | Foto de portada opcional (hoy este formato aún no la muestra; ver §7 pendientes) |
| `cfg.kicker` | string | Frase superior (eyebrow) |
| `cfg.tagline` | string | Frase bajo el título |
| `cfg.message` | string | Mensaje de bienvenida personalizado (si está vacío, se usa `defaultMessage` con el nombre de la familia) |
| `cfg.celebrants` | string | Quién celebra (fallback de firma) |
| `cfg.itinerary` | `[{label, time}]` | Itinerario: cada momento con su hora |
| `cfg.locations` | `[{label, place, url}]` | Ubicaciones: nombre, lugar y enlace (Google Maps, etc.) |
| `cfg.gallery` | `string[]` | Galería de fotos (URLs) |
| `cfg.dress_code` | `[{label, icon?}]` | Código de vestimenta (una o más entradas) |
| `cfg.dress_note` | string | Nota extra del dress code |
| `cfg.contacts` | `[{name, phone}]` | Contactos de RSVP (teléfonos) |
| `cfg.contact_note` | string | Mensaje de aclaración junto a los contactos |
| `cfg.registry` | objeto | Mesa de regalos (ver §2.3) |

### 2.3 Mesa de regalos (`cfg.registry`) — objeto

| Campo | Tipo | Qué es |
| ----- | ---- | ------ |
| `enabled` | boolean | Si se muestra la sección de regalos |
| `allow_custom` | boolean | Permite monto libre |
| `min_mxn` / `min_eur` | number | Monto mínimo en pesos / euros |
| `suggested_mxn` / `suggested_eur` | number[] | Montos sugeridos |
| `stripe_enabled` | boolean | Habilita pago con tarjeta |
| `bank` | `{ enabled, bank_name, holder, account_number, concept }` | Datos de depósito/transferencia |

---

## 3. Datos del evento (`event`)

Estos NO viven en `cfg`, sino en el registro del evento:

| Campo | Tipo | Uso en pantalla |
| ----- | ---- | --------------- |
| `event.name` | string | Nombre del evento (se muestra como subtítulo si existe) |
| `event.date` | string `YYYY-MM-DD` | Fecha (el hero la formatea en español) |
| `event.time` | string `HH:mm` | Hora |
| `event.place` | string | Lugar (aparece en el footer) |

---

## 4. Datos del grupo / familia e invitados

| Dato | Qué es |
| ---- | ------ |
| `family` | Nombre del grupo invitado (p. ej. "Pérez"). Se usa en el saludo, mensaje, RSVP y agradecimiento. |
| `guests[]` | Cada invitado con `name`, `is_leader` (líder del grupo), `is_child` (niño), `registered` (ya confirmó), `declined` (declinó). |
| `rsvpNote` | Nota previa del grupo en el RSVP |

---

## 5. Composición de la pantalla (orden de arriba a abajo)

El layout `BodaJorgeMacarenaLayout` arma la página en este orden, y **cada sección consume datos dinámicos ya resueltos**:

1. **Sobre de apertura** (envelope) — monograma formado por las **iniciales** de `couple.nameA` y `couple.nameB` (ej. "J & M"), y sello "&". Creado por `theme.opening`.
2. **Hero / portada** (`Hero.jsx`):
   - Título grande en script: `couple.nameA & couple.nameB` (o `event.name` como fallback).
   - Subtítulo: `event.name` (si existe).
   - Línea "Invitación para la **{family}**".
   - Fecha desglosada dinámicamente: **día** (número), **mes** (nombre largo), **año**.
   - Fecha larga + `event.time`.
3. **Countdown** — cuenta regresiva a `event.date` + `event.time`. Texto "Faltan".
4. **Message** — `cfg.message` (o mensaje por defecto con `family`). Firma automática: `couple.nameA & couple.nameB`.
5. **Itinerary** — lista de `cfg.itinerary` (`{label, time}`).
6. **Locations** — lista de `cfg.locations` (`{label, place, url}`).
7. **Gallery** — `cfg.gallery` (URLs).
8. **DressCode** — `cfg.dress_code` + `cfg.dress_note`.
9. **RegistryNote** — `cfg.registry_note` (nota de regalos).
10. **Gifts / Mesa de regalos** — `cfg.registry` (solo si `enabled`): montos sugeridos, depósito bancario y pago con tarjeta.
11. **RSVP** — formulario de confirmación por invitado (`guests[]`), contactos (`cfg.contacts`) y nota (`rsvpNote`).
12. **Footer** — `event.place`.

---

## 6. Qué textos NO son datos del usuario (son del tema)

Los títulos fijos de cada sección vienen de `themes/boda_jorge_macarena.js` (bloque `labels`) y se pueden reescribir sin tocar datos:

- `rsvp` → "Confirma tu asistencia"
- `countdown` → "Faltan"
- `message` → "Un mensaje para ustedes"
- `itinerary` → "Nuestro Itinerario"
- `locations` → "Cómo Llegar"
- `gallery` → "Nuestros Mejores Recuerdos"
- `dressCode` → "Código de Vestimenta"
- `withLove` → "Con cariño"
- `registryTitle` → "Mesa de Regalos"
- `familyGreeting` → "Familia {family}, cuéntanos quiénes podrán acompañarnos."
- `defaultMessage` → "Familia {family}, queremos compartir con ustedes la alegría…"

Y la **paleta completa** está en `theme.vars` (variables CSS `--inv-*`): colores, fuentes, gradientes de oro y sombras. **Esto es lo primero que tocará quien mejore el diseño.**

---

## 7. Pendientes / oportunidades visuales

- [ ] Este formato **aún no muestra `hero_image`** (los formatos `cumpleanos`, `baby_shower` y `alice_xv` ya lo soportan). Agregarlo es opcional.
- [ ] El diseño está en su **base** (azul noche + dorado + marfil); está pendiente la dirección de diseño final.
- [ ] Los ornamentos 3D (perlas/anillos) fueron retirados y quedan inertes en `client/src/invitation/3d/`; se pueden re-activar a pedido.

---

## 8. Reglas a respetar al rediseñar

1. **No cambies los nombres de los campos** (`cfg.couple.nameA`, `cfg.itinerary`, etc.): son el contrato de datos con el backend y el editor.
2. **Respeta las variables CSS** `--inv-*` para colores/fuentes, o todo el sistema de temas se rompe.
3. **El editor es schema-driven**: si agregas un dato nuevo, debe reflejarse en `schema/fields.js` y `server/src/schemas/invitation.js`.
4. El layout recibe `event`, `family`, `cfg`, `theme`, `token`, `publishableKey` y el objeto `rsvp`. Puedes reorganizar secciones, pero conserva sus props.
