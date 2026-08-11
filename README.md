# DisplayEvent

Organizador de eventos web: crea eventos, administra invitados por grupos y lleva el conteo de asistentes registrados.

**Stack:** React + Vite + Tailwind CSS · Node.js + Express · MySQL

## Estructura

```
DisplayEvent/
├── client/   # Frontend React (Vite + Tailwind)
└── server/   # Backend Express + MySQL
```

## Requisitos

- Node.js 18+
- MySQL 8+

## Configuración

1. Configura tu conexión MySQL en `server/.env` (copia `server/.env.example` si no existe):

   ```
   PORT=4000
   JWT_SECRET=pon_un_secreto_largo
   CLIENT_URL=http://localhost:5173
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=tu_password
   DB_NAME=displayevent
   ```

   También configura el SMTP para el envío del correo de verificación
   (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`; ver `.env.example`).

2. Crea la base de datos y las tablas:

   ```bash
   cd server
   npm install
   npm run init-db
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

- **Autenticación**: registro con verificación de correo (SMTP). Antes de entrar se exige confirmar el enlace enviado por email. JWT en cookie httpOnly. El panel completo está protegido; solo las invitaciones públicas (`/invitacion/<hash>`) no requieren sesión.
- **Eventos**: crear, editar y eliminar eventos (nombre, día, hora, lugar).
- **Pantalla de evento** con sidebar de secciones:
  - **Inicio**: resumen del evento y conteos rápidos.
  - **Invitados**: organización por grupos con líder; cada invitado se marca como niño y como "registrado". El líder del grupo cuenta automáticamente como invitado.
  - **Mesas**: organizador visual con **drag & drop** (dnd-kit), búsqueda y filtro de sin asignar, mesas redondas/cuadradas/rectangulares con porcentaje de ocupación, colores por grupo, acompañantes que se mueven en bloque y validación de capacidad en el servidor. Solo invitados confirmados pueden sentarse. Exportación a lista imprimible y CSV.
  - **Dashboard**: estadísticas detalladas del evento (invitados, niños, adultos, registrados) con desglose por grupo.

## API

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| POST | `/api/auth/register` | Crea un usuario (usuario, correo, contraseña) y envía correo de verificación |
| POST | `/api/auth/login` | Inicia sesión y devuelve cookie de sesión |
| POST | `/api/auth/logout` | Cierra sesión |
| GET | `/api/auth/me` | Usuario autenticado actual |
| POST | `/api/auth/verify` | Verifica el correo con el token del enlace |
| POST | `/api/auth/resend-verification` | Reenvía el correo de verificación |
| GET | `/api/events` | Lista eventos con conteos |
| POST | `/api/events` | Crea un evento |
| GET | `/api/events/:id` | Detalle de un evento |
| PUT | `/api/events/:id` | Edita un evento |
| DELETE | `/api/events/:id` | Elimina un evento (y sus grupos/invitados) |
| GET | `/api/events/:id/stats` | Estadísticas del evento |
| GET/POST | `/api/events/:id/tables` | Listar / crear mesas |
| PUT/DELETE | `/api/events/:id/tables/:tableId` | Editar / eliminar mesa |
| PUT | `/api/events/:id/guests/:groupId/:guestId/assign` | Asignar / liberar invitado de una mesa (valida capacidad y confirmación) |
| PUT | `/api/events/:id/guests/:groupId/:guestId/companion` | Vincular acompañante a un invitado principal |
| GET/POST | `/api/events/:id/groups` | Listar / crear grupos |
| PUT/DELETE | `/api/events/:id/groups/:groupId` | Editar / eliminar grupo |
| GET/POST | `/api/events/:id/guests(/:groupId)` | Listar invitados / crear en grupo |
| PUT/DELETE | `/api/events/:id/guests/:groupId/:guestId` | Editar (niño/registro) / eliminar invitado |