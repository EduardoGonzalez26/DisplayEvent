# Auditoría técnica — DisplayEvent

> Fecha: 20 de agosto de 2026
> Alcance: repositorio completo (backend Express + PostgreSQL, frontend React/Vite, invitación multiformato).
> Método: lectura de código fuente, revisión de esquema, `git status/log`, ejecución local verificada (API :4000, frontend :5173).
> Veredicto global: **funcional y con buen trabajo de detalle en ciertas zonas (3D, auth, mesas), pero con un defecto de diseño crítico de multi-tenant (los eventos NO pertenecen a ningún usuario), deuda técnica alta (duplicación 4× en la invitación, cero tests, cero lint) y un plan "multiformato" ejecutado a medias y sin commitear.**

---

## 1. Resumen ejecutivo

| Área | Nota | Comentario |
|---|---|---|
| Funcionalidad | 7/10 | El panel (eventos, grupos, invitados, mesas, dashboard) y la invitación multiformato funcionan de punta a punta |
| Seguridad | 4/10 | **Fuga multi-tenant real (cualquier usuario ve/edita/borra eventos de todos)** + XSS almacenado en exportación + otros huecos |
| Arquitectura | 5/10 | Monolito Express sencillo y coherente, pero sin capa de dominio, sin migraciones versionadas, sin tests |
| Calidad de código | 4/10 | Duplicación masiva en `client/src/invitation/` (~33 % del código), `alert()`/`confirm()` por doquier, código muerto |
| Rendimiento | 6/10 | Lazy loading y pausa del 3D bien resueltos; sin paginación y con consultas N+1 agrupadas |
| Estado del repo | ⚠️ | El grueso de la funcionalidad nueva está **sin commitear**; `README` desactualizado (dice MySQL, es Postgres) |

**El problema nº 1 para ir a producción con más de un usuario es la ausencia de `user_id` en `events`.** Todo lo demás se puede arreglar con refactores graduales.

---

## 2. Funcionalidades actuales (inventario)

### Backend (`server/`)
- **Autenticación** (`routes/auth.js`): registro con verificación de correo obligatoria (Brevo por HTTPS o SMTP como respaldo), login, logout, `/me`, reenvío de verificación, JWT en cookie httpOnly (`de_token`), rate limiting por IP (login 10/15 min, registro 5/h, verify 15/15 min).
- **Eventos** (`routes/events.js`): CRUD, estadísticas agregadas (`/stats`), configuración JSONB de invitación con validación ligera de `template`.
- **Grupos** (`routes/groups.js`): CRUD con líder (que se crea automáticamente como invitado), `invitation_token` único por grupo (16 bytes aleatorios), regeneración de token, periqueras (`high_chairs`, `high_chairs_count`).
- **Invitados** (`routes/guests.js`): CRUD, marcado niño/registrado/declinado, **asignación a mesa con validación de capacidad y movimiento de acompañantes en bloque**, vinculación de acompañante.
- **Mesas** (`routes/tables.js`): CRUD con forma (`circle|square|rect`), capacidad validada (1–100 y no menor a ocupados), posición, `is_kids`.
- **Invitación pública** (`routes/invitations.js`): GET por token (evento + grupo + invitados) y RSVP (atender/declinar por pase, nota de grupo). Público sin sesión.
- **Plantillas de usuario** (`routes/templates.js`): CRUD privado por `user_id` (sí tiene aislamiento — solo este módulo).
- **Uploads** (`routes/uploads.js`): imagen a Cloudinary (unsigned preset o firmada) con fallback a disco local `server/uploads/`, límite 8 MB, mime jpeg/png/webp/gif.

### Frontend (`client/`)
- **Panel admin**: lista de eventos, formulario evento (dos implementaciones distintas), dashboard con estadísticas por grupo, gestión de invitados por acordeón de grupos, organizador de mesas con **drag & drop** (dnd-kit), búsqueda/filtros, exportación CSV e impresión, editor de invitación con preview, selector de formato y plantillas de usuario.
- **Invitación pública multiformato** (`client/src/invitation/`): 4 temas (**xv**, **boda**, **cumpleaños**, **baby shower**), sobre digital de apertura, countdown de flip, galería (con variante 3D/perlas para xv), itinerario, ubicaciones, dress code, padrinos, mesa de regalos, RSVP por invitado con contactos configurables.
- **Tema claro/oscuro** por variables CSS (`data-theme`).
- **Auth UI**: login/registro, pantalla de "verifica tu correo", página de verificación.

---

## 3. Arquitectura y diseño del sistema (crítico)

### 3.1 Lo que está bien
- **Monolito coherente**: Express sirve API + estáticos + SPA del build (`server/src/index.js:70-78`). Para este alcance es la decisión correcta; un solo servicio desplegable en Render.
- **SQL parametrizado en el 100 % de las consultas**: no se encontró interpolación de valores. Bien.
- **Password con bcrypt (cost 10)**, cookie httpOnly, `sameSite:lax`, `secure` en producción.
- **Transacciones con rollback** en los flujos sensibles (asignación a mesa, grupo+leader, RSVP) — aunque con patrón manual repetido (ver 3.3).
- **Fix de conectividad para Render** (IPv4) en `db/index.js` y `mailer.js`, resolución de fecha/tipo pg bien resuelta.
- **Carga perezosa de los layouts de invitación** (`themes/index.js:27-39`), de los heroes 3D y de las escenas R3F, con pausa del frameloop fuera del viewport (`IntersectionObserver` + `frameloop="never"`). Excelente para el bundle.
- **Idempotencia del init de DB** (`CREATE TABLE IF NOT EXISTS` + migraciones ad-hoc + backfills).

### 3.2 Defectos de diseño estructurales

1. **CRÍTICO — Multitenencia rota.** La tabla `events` **no tiene `user_id`** (`schema.sql:15-23`). Todos los routers de eventos/grupos/invitados/mesas están montados detrás de `requireAuth` pero **nunca filtran por el usuario autenticado**. Cualquier usuario registrado puede:
   - `GET /api/events` → ver todos los eventos de todos los usuarios.
   - `DELETE /api/events/:id`, `PUT ...`, `POST /api/events/:id/groups`, asignar mesas, etc.
   
   Solo `invitation_templates` filtra por `user_id` (`templates.js`). Esto convierte a la app en un multi-tenant con aislamiento nulo. **Es un bug de seguridad de categoría crítica.**

2. **Sin capa de dominio ni repositorios.** Las rutas ejecutan SQL directamente sobre `query/pool` (`db/index.js`). Acoplado a HTTP, sin tests, y con la lógica de negocio (bloques de acompañantes, capacidad, líderes) distribuida entre rutas y JSX. Cualquier cambio de regla toca varios archivos sin red de seguridad.

3. **Contrato JSONB no validado.** `events.invitation` es JSON libre; solo se valida el campo `template` (`events.js:88`). No hay versión estricta, ni schema, ni zod/joi. Un payload malformado (guardado desde el editor o por API) rompe el renderer en producción con fallbacks implícitos.

4. **Sin sistema de migraciones versionado.** `schema.sql` + `ALTER TABLE` ad-hoc en `init.js:37-48`. Agregar columnas nuevas obliga a editar ambos a mano y a tener "migraciones" que solo funcionan en orden. No hay rollback ni historial.

5. **Patrones inconsistentes de transacción.** Existe un helper `transaction()` (`db/index.js:52-64`) pero `guests.js` (assign/companion) y `invitations.js` (rsvp) abren `BEGIN`/`COMMIT`/`ROLLBACK` manuales con `pool.connect()`. Dos formas de hacer lo mismo en el mismo código.

6. **Duplicación 4× en la invitación.** El plan exigía secciones compartidas en `shared/`, pero se copiaron componentes casi idénticos por formato:
   - `DressCode.jsx`, `Gallery.jsx`, `Message.jsx` idénticos en xv/boda/cumpleaños/baby shower (solo cambia el nombre de la función).
   - `RegistryNote.jsx` en 3 copias; `Hero` comparte ~70 % del JSX y el helper `entrance` está copiado 3 veces más 1 inline.
   - Las 2 escenas 3D comparten ~40 líneas del andamiaje Canvas.
   - Estimo ~33 % del directorio `invitation/` es código duplicado. Cada cambio de diseño (p. ej. un botón del RSVP) hay que replicarlo en 4 archivos.

7. **Monolitos por archivo y anti-patrones de UI**: `EventTables.jsx` (824 líneas, 7 componentes), `EventGuests.jsx` (485 líneas, 3 componentes), `shared/Rsvp.jsx` (392 líneas), `xv/Hero.jsx` (329 líneas). `alert()`/`confirm()` como mecanismo de error. Modales sin focus trap ni cierre por ESC.

8. **Sin tests, sin linter, sin formatter.** 0 archivos de test, sin `eslint`/`prettier` configurado, sin scripts de verificación. El CI no existe.

### 3.3 Decisiones de seguridad que conviene revisar

- **JWT**: el guard de `middleware/auth.js:7-10` solo aborta si el secreto es el literal `"cambia-este-secreto-por-uno-seguro"`. El `.env` de desarrollo usa `dev-jwt-secret-...` (distinto del fallback), así que **pasaría el check en producción**. Debería validarse fuerza/longitud, no solo el literal.
- **CSRF**: `csrfProtection` (`middleware/auth.js:47-63`) acepta **peticiones sin cabecera `Origin`** (`if (origin) {...} next()`). Es solo comprobación de origen, no hay token CSRF. Cualquier cliente no-navegador o petición sin Origin pasa. Aceptable para este alcance, pero documentado como limbo.
- **Rate limiting**: solo en rutas de auth. El RSVP público (`invitations.js`) y los uploads no tienen límite → spam del RSVP o saturación de disco.
- **Uploads**: el filtro valida solo `file.mimetype` (spoofeable), no la firma de la imagen; sin escaneo de virus; sin cuota por usuario; las subidas huérfanas (subir y no guardar) **nunca se limpian**.
- **`.env` no está versionado** (correcto, `git check-ignore` → ignorado). `render.yaml` define las variables como `sync: false` (manual). Bien.
- **Enumeración de usuarios**: `register` (409) y `resend-verification` (404 vs 400) revelan si un correo/usuario existe. Menor.

---

## 4. Errores y bugs concretos (con archivo:línea)

### 4.1 Backend

> **Estado: todos los puntos de esta sección están resueltos en el código actual** (verificado 20/08/2026). Cada fix está commiteado y `git log` lo respalda.

| Severidad | Bug | Ubicación | Estado |
|---|---|---|---|
| 🔴 Crítico | **Multitenencia rota**: eventos/grupos/invitados/mesas no se filtran por usuario | `schema.sql:15-23`; `routes/events.js`, `groups.js`, `guests.js`, `tables.js` | ✅ Hecho — `events.user_id` + filtro en todas las rutas + middleware `eventAccess` (`index.js:65-67`); backfill de huérfanos en `init.js:53-57` (commit `c5a494b`) |
| 🟠 Alto | **Race condition en asignación de mesas**: la ocupación se lee y se escribe sin `FOR UPDATE`; dos asignaciones concurrentes pueden sobreocupar | `routes/guests.js:162-193` | ✅ Hecho — `FOR UPDATE` sobre el bloque de invitados y la mesa; conteo de ocupados dentro de la transacción (commit `c5a494b`) |
| 🟠 Alto | Registro sincrónico con envío de correo: si SMTP tarda, la respuesta de `POST /register` se bloquea; un fallo borra la cuenta pero el rate-limit ya se gastó | `routes/auth.js:90-100` | ✅ Hecho — envío en segundo plano (`.catch` sin `await`), ya no borra la cuenta si el correo falla (commit `279dcd7`) |
| 🟡 Medio | `getTransporter()` cachea una promesa fallida; un fallo de DNS en el arranque rompe el SMTP **para siempre** hasta reiniciar | `utils/mailer.js:92-113` | ✅ Hecho — la promesa fallida se limpia y se reintenta en el siguiente envío (commit `0e763e3`) |
| 🟡 Medio | Sin rate limit en RSVP público y uploads | `routes/invitations.js`; `routes/uploads.js` | ✅ Hecho — `rsvpLimiter` (60/15 min), `invitationViewLimiter` (120/15 min) y `uploadLimiter` (50/h por usuario) (commit `6091050`) |
| 🟡 Medio | Dos patrones de transacción incompatibles (helper `transaction()` vs manual) | `db/index.js:52` vs `guests.js:115`, `invitations.js:76` | ✅ Hecho — `guests.js` (assign/companion) y `invitations.js` (rsvp) usan el helper `transaction()`; `tables.js` aún usa `pool.connect()` (sin BEGIN/COMMIT, solo conexión dedicada) (commit `837fb7b`) |
| 🟡 Medio | `POST /events` no valida formato de `date`/`time`/`place` ni longitud | `routes/events.js:113-127` | ✅ Hecho — `validateEventPayload` valida fecha real (AAAA-MM-DD), hora (HH:MM) y longitud máx. 255 en POST y PUT (commit `593f56f`) |
| 🟡 Medio | Enviar `PUT /events/:id/invitation` con `{}` sobreescribe toda la config previa (borra galería/contactos) | `routes/events.js:83-101` | ✅ Hecho — merge JSONB con `||` (fusiona en vez de reemplazar) (commit `b2ee05b`) |
| 🟡 Medio | `GET /events` sin paginación: 4 subconsultas COUNT por evento sobre toda la tabla | `routes/events.js:6-24` | ✅ Hecho — paginación `page`/`limit` (máx. 100) con `total`/`total_pages` (commit `5d7d22f`) |
| 🟢 Bajo | `resend-verification` no reenvía si el token anterior no expiró (pisa token válido) | `routes/auth.js:175-199` | ✅ Hecho — `setupVerification` reutiliza el token vigente no expirado (commit `a278a0b`) |
| 🟢 Bajo | Regenerar token de invitación (`POST /groups/:id/token`) no revoca el anterior en ningún canal ni invalida copias impresas | `routes/groups.js:72-86` | ✅ Hecho — tabla `revoked_invitation_tokens` + check en `findInvitationByToken` (commit `7003990`) |

### 4.2 Frontend — Panel

| Severidad | Bug | Ubicación |
|---|---|---|
| 🔴 Alto | **XSS almacenado**: `print()` inyecta con `document.write` los nombres de mesa/invitado/acompañante **sin escapar**; un nombre con `<img onerror=…>` se ejecuta en la ventana de impresión | `pages/event/EventTables.jsx:738-777` (especialmente 762-768) |
| 🟠 Alto | `alert()`/`confirm()` como única vía de error (bloquea UI, inaccesible, no testeable) | `pages/event/EventGuests.jsx:329, 355, 364, 370, 376, 378, 398, 403, 416` |
| 🟠 Alto | **Estados stale al cambiar de evento**: mapas `guestsByGroup/expanded/loadingGroups` no se limpian en `EventGuests`; `EventDashboard` no resetea `loading` ni datos → muestra evento anterior | `EventGuests.jsx:291-297`; `EventDashboard.jsx:13-30`; `EventHome.jsx:14-27` |
| 🟠 Alto | **Promesas sin capturar**: acciones sin try/catch (crear grupo, agregar invitado, toggles, borrar mesa) → errores silenciosos y doble-submit posible | `EventGuests.jsx:315-352, 382-395`; `EventTables.jsx:493-497, 617-634` |
| 🟡 Medio | Toast con `setTimeout` sin limpiar: dos notificaciones se pisan | `EventTables.jsx:249-253` |
| 🟡 Medio | Parseo frágil del id del drag `Number(id.slice(2))` (asume prefijo `g-` + número) | `EventTables.jsx:266` |
| 🟡 Medio | Invitados con `table_id` de una mesa borrada quedan **invisibles** (ni en sidebar ni en mesas) | `EventTables.jsx:291 vs 300-309` |
| 🟡 Medio | Colores de grupo asignados por índice → cambian de color al reordenar/eliminar grupos | `EventTables.jsx:255-259` |
| 🟡 Medio | Confusión email vs usuario en el reenvío: usa `form.username` cuando el backend espera email → falla si el usuario usó su nombre | `pages/AuthPage.jsx:55` |
| 🟡 Medio | Dos formularios de evento distintos (`EventForm` inline con plantilla vs `EventFormModal` sin plantilla) → comportamiento divergente | `pages/EventsPage.jsx:8-117` vs `components/EventFormModal.jsx` |
| 🟢 Bajo | `key={i}` en listas editables (itinerario, ubicaciones, dress code, contactos, galería) → estado de React incorrecto al reordenar | `EventTables.jsx:806`; ver también sección invitación |

### 4.3 Frontend — Invitación

| Severidad | Bug | Ubicación |
|---|---|---|
| 🟠 Alto | **XSS vía `href`**: `it.url` se usa directo en `<a href>` sin validar `http(s)://`; un `javascript:alert(1)` se ejecuta al hacer clic | `shared/Locations.jsx:18-19, 72` |
| 🟠 Alto | El **sobre digital es imposible de abrir por teclado**: solo `onTap`/drag, sin `tabIndex`/`role="button"`/`onKeyDown` | `envelope/EnvelopeLoader.jsx:95-120` |
| 🟡 Medio | Boda: el hero anima **detrás del sobre** (no recibe `reveal`) — al abrir el sobre la animación ya pasó; el velo de XV tampoco espera | `boda/BodaLayout.jsx:19`; `boda/Hero.jsx:74-77`; `xv/Hero.jsx:118-126` |
| 🟡 Medio | **Fallback roto de ubicaciones**: si no hay `locations`, cae a `itinerary` y renderiza tarjetas "Ubicación N" vacías | `shared/Locations.jsx:6-7, 64-90` |
| 🟡 Medio | **Inyección CSS** por `hero_image` interpolada en `url('…')` sin escapar | `cumpleanos/Hero.jsx:38-41`; `baby_shower/Hero.jsx:47-50` |
| 🟡 Medio | Countdown con fecha inválida → `NaN` en pantalla | `shared/Countdown.jsx:56-59`; `xv/GlassCountdown.jsx:41-44` |
| 🟡 Medio | `wazeUrl` ignora la URL custom (`it.url`) | `shared/Locations.jsx:26-32` |
| 🟡 Medio | `useState` sin sincronización: `answers`/`diet`/`submitted` no se recalculan si cambian `guests`/`note` (vista previa) | `shared/Rsvp.jsx:23-35` |
| 🟢 Bajo | `key={i}` en listas de la invitación | `shared/Itinerary.jsx:43`; `Locations.jsx:53`; `DressCode.jsx:31`; `Padrinos.jsx:31`; `Gallery.jsx:98,115,133`; `Rsvp.jsx:276,378` |

### 4.4 Código muerto / redundancias

- **`framer-motion` es dependencia redundante**: se importa solo `motion/react` en 31 archivos, `framer-motion` en 0 (pero está en `client/package.json:18` y en la raíz `package.json:9`).
- **`client/src/invitation/motion.jsx` completo sin uso**: `SPRING`, `SOFT_SPRING`, `fadeUp`, `fadeIn`, `scaleIn`, `stagger`, `staggerItem` no los importa nadie.
- **`theme.labels`** (`countdown`, `message`, `itinerary`, `locations`, `gallery`, `dressCode`, `withLove`) y **`theme.fonts`** definidos en los 4 temas pero nunca consumidos: los textos de sección están hardcodeados en cada componente.
- `util.jsx:3` re-exporta `Reveal` redundante.
- `EventTables.jsx:695-700` duplica el mapa `guestById` que ya recibe por prop.

---

## 5. Rendimiento y experiencia

**Bien:**
- Lazy loading de layouts/3D + `frameloop="never"` + `dpr=[1,2]` + Environment procedural sin red.
- Las consultas de stats usan `FILTER` en una sola pasada.

**Mal / riesgo:**
- `GET /events` hace subconsultas COUNT sin paginación; con cientos de invitados y muchos eventos se degrada.
- `guests.js` carga todos los invitados de un evento en una sola consulta (sin paginación ni búsqueda server-side); el organizador de mesas hace drag sobre listas potencialmente largas.
- El canvas WebGL no se desmonta al hacer scroll (solo pausa el frameloop).
- El registro puede tardar segundos si el canal de correo es SMTP (llamada síncrona en el request).
- `periqueras`/`high_chairs` duplican información (bool + count) → riesgo de estados inconsistentes (`groups.js:93-104`).

---

## 6. Lo pendiente

### 6.1 Trabajo sin commitear (mayor riesgo de pérdida)
`git status` muestra la **práctica totalidad de la funcionalidad multiformato sin commitear**:
- Nuevos: `invitation/3d/`, `invitation/baby_shower/`, `invitation/boda/`, `invitation/cumpleanos/`, `invitation/envelope/`, `invitation/shared/`, `invitation/xv/`, `themes/{boda,cumpleanos,baby_shower,fields}.js`, `InvitationView.jsx`, `motion.jsx`.
- Servidor: `routes/templates.js`, `routes/uploads.js`, `middleware/rateLimit.js`, `scripts/backfill-template.js`, y modificaciones en `auth.js`, `events.js`, `guests.js`, `db/*`, `index.js`, `token.js`.
- `package-lock.json` de la raíz también sin commitear.

> **Recomendación inmediata:** commitear este bloque ya. Está en working tree y cualquier `git reset --hard` / `git clean` lo destruye.

### 6.2 Deuda que bloquea producción
1. Resolver la **multitenencia** (columna `user_id` en `events` + filtro en todas las rutas) o declarar explícitamente que la app es de un solo usuario y eliminar el registro multiusuario.
2. **Tests**: mínimo unitarios para `assign` (capacidad/bloque), RSVP, auth y una integración básica del contrato JSONB. Hoy no hay ninguno.
3. **Lint/CI**: agregar eslint + prettier y un pipeline `lint && test && build`.

### 6.3 Pendientes funcionales (no implementados)
- **Enviar invitación por correo**: los `invitation_token` existen pero no hay flujo "enviar enlace al grupo" (solo copiar el link desde el panel).
- **Gestión de cuenta**: sin cambio de contraseña, cambio de email ni borrado de cuenta.
- **Recuperación de contraseña** (forgot/reset): no existe.
- **Regeneración/revocación de token** con invalidación del anterior.
- **Eliminación de imágenes huérfanas** y **cuota por usuario** en uploads.
- **Paginación/búsqueda** en listas grandes.
- **Vista previa en vivo** del editor (hoy es un modal que se cierra manualmente; el plan Fase 3.2 pedía preview embebida en vivo).

### 6.4 Documentación y plan
- **`README.md` desactualizado**: afirma stack "MySQL 8+", puertos `DB_PORT=3306` y rutas viejas (`client/src/pages/invitation/…`). El proyecto real es **PostgreSQL** (Supabase/Render) y la invitación vive en `client/src/invitation/`.
- **`PLAN_INVITACIONES_MULTIFORMATO.md`**: Fase 0 marcada ✅; Fases 1, 2 y 4 están implementadas; Fase 3 parcial (RSVP configurable ✅, migración ✅, preview ✅). El plan pedía secciones `shared/` y se terminó con carpetas duplicadas por formato: **la "regla de oro" del plan se incumplió en la ejecución** (queda funcional, pero el costo de mantenimiento es 4×).
- La tabla de plantillas, endpoints y el "empezar desde plantilla" no están documentados en el README.

---

## 7. Priorización sugerida (roadmap)

| Prioridad | Acción | Esfuerzo |
|---|---|---|
| P0 | **Commitear todo el working tree ahora** | 5 min |
| P0 | Multitenencia: `events.user_id` + filtrado en eventos/grupos/invitados/mesas (y verificación de que los tokens de invitación solo expongan su evento) | 1–2 días |
| P0 | Escapar/neutralizar `print()` en `EventTables` (XSS) y validar `it.url` (http/https) en `Locations` | horas |
| P1 | Tests unitarios de negocio (assign, rsvp, auth) + eslint/prettier + CI | 2–3 días |
| P1 | Unificar secciones de la invitación en `shared/` (DressCode, Gallery, Message, RegistryNote, Hero base) con props por tema | 2–3 días |
| P1 | Fix del sobre accesible (teclado), `reveal` en boda/velo XV, fallback de `Locations`, sanitización de `hero_image` | 1 día |
| P2 | Transacciones con el helper `transaction()`, `FOR UPDATE` en assign, rate limit en RSVP/uploads | 1 día |
| P2 | Quitar `framer-motion` y `motion.jsx`, limpiar `theme.labels/fonts` muertos, unificar los 2 formularios de evento | ½ día |
| P3 | Migraciones versionadas (p. ej. `node-pg-migrate`), limpieza de uploads, paginación, gestión de cuenta | continuo |
| P3 | Actualizar `README` y cerrar el `PLAN` con los criterios de salida pendientes | horas |

---

## 8. Anexo — lo que sí está bien hecho (para no perderlo)
- SQL 100 % parametrizado y bcrypt cost 10.
- Transacciones con rollback donde importa (capacidad de mesas, bloque de acompañantes).
- Lazy loading + pausa de WebGL fuera de viewport.
- Tokens de verificación (32 bytes, TTL 24 h) y de invitación (16 bytes) con entropía correcta.
- Fixes de conectividad IPv4 bien encapsulados (`db/index.js`, `mailer.js`).
- `init.js` idempotente con backfills de retrocompatibilidad (migración a `"xv"`).
- Aislamiento correcto (y único) de `invitation_templates` por `user_id` — sirve de plantilla para corregir `events`.