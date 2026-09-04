# DisplayEvent

Organizador de eventos web: crea eventos, administra invitados por grupos y lleva el conteo de asistentes registrados.

**Stack:** React + Vite + Tailwind CSS · Node.js + Express · PostgreSQL (Supabase)

## Estructura

```
DisplayEvent/
├── client/   # Frontend React (Vite + Tailwind)
│   └── src/invitation/   # Invitación pública multiformato
│       ├── themes/       # Temas (xv, boda, cumpleanos, baby_shower)
│       ├── shared/       # Secciones compartidas (RSVP, galería, cuenta regresiva…)
│       ├── schema/       # Contrato de campos y normalización
│       └── <formato>/    # Un Layout + Hero por formato
└── server/   # Backend Express + PostgreSQL
```

## Requisitos

- Node.js 18+
- PostgreSQL (Supabase o local)

## Configuración

1. Configura tu conexión PostgreSQL en `server/.env` (copia `server/.env.example` si no existe).

   La opción recomendada es definir la connection string completa en `DATABASE_URL`
   (es lo que usa Supabase/Render y tiene prioridad en el código):

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

2. Crea el esquema (tablas, índices y backfills; es idempotente) y normaliza las
   invitaciones existentes al contrato v2:

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
  - **Mesas**: organizador visual con **drag & drop** (dnd-kit), búsqueda y filtro de sin asignar, mesas redondas/cuadradas/rectangulares con porcentaje de ocupación, colores por grupo, acompañantes que se mueven en bloque y validación de capacidad en el servidor. Solo invitados confirmados pueden sentarse. Exportación a lista imprimible y CSV.
  - **Dashboard**: estadísticas detalladas del evento (invitados, niños, adultos, registrados) con desglose por grupo.
- **Invitación pública multiformato**: cada grupo recibe un enlace con token (`/invitacion/<token>`) que muestra la invitación sin requerir sesión. Cuenta con 4 temas — `xv`, `boda`, `cumpleanos`, `baby_shower` — compuestos por un `Layout` + `Hero` por formato y secciones compartidas (RSVP, cuenta regresiva, galería, itinerario, etc.).
- **Editor de invitación**: selector de formato, campos específicos por formato, vista previa (preview) y plantillas de usuario reutilizables.
- **Subida de imágenes**: subida de imágenes para la invitación vía **Cloudinary** (si está configurado) o guardado local en `server/uploads/`.

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
| GET | `/api/invitations/:token` | Invitación pública por token (evento, grupo e invitados) |
| PUT | `/api/invitations/:token/rsvp` | Confirmación pública de asistencia (RSVP) |
| GET | `/api/events` | Lista eventos con conteos |
| POST | `/api/events` | Crea un evento |
| GET | `/api/events/:id` | Detalle de un evento |
| PUT | `/api/events/:id` | Edita un evento |
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
| GET/POST | `/api/templates` | Listar / crear plantillas de invitación del usuario |
| GET | `/api/templates/:id` | Detalle de una plantilla |
| PUT/DELETE | `/api/templates/:id` | Editar / eliminar plantilla |
| POST | `/api/uploads` | Subir imagen (Cloudinary o `server/uploads/`) |
