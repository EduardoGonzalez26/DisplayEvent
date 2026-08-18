# Plan: Invitaciones Multiformato

> **Objetivo:** convertir la invitación actual (pensada para XV años) en un sistema
> de **formatos/templates reutilizables** (XV años, boda, cumpleaños, baby shower, etc.)
> que el usuario pueda elegir y personalizar desde el panel.

**Fecha:** agosto 2026
**Alcance:** solo frontend de invitación + editor + persistencia (no toca mesas/invitados).

---

## Resumen ejecutivo

| Fase | Entrega | Esfuerzo estimado | Riesgo |
|------|---------|-------------------|--------|
| **0. Base técnica** | Refactor a tokens de tema + contrato de config | Bajo | Bajo |
| **1. Temas visuales** | 2–3 formatos funcionando + selector | Medio | Medio |
| **2. Contenido por formato** | Campos específicos por tipo de evento | Medio | Bajo |
| **3. Mejoras transversales** | RSVP configurable, preview, migración | Bajo | Bajo |
| **4. Templates de usuario** | Guardar/reutilizar invitaciones propias | Alto | Bajo |

**Regla de oro:** cada fase debe quedar *funcional y desplegable por sí sola*. Nunca
dejes a medias una fase y empieces la siguiente.

---

## Fase 0 — Base técnica (prerequisito) ✅ COMPLETADA

> **Meta:** que el diseño de la invitación deje de estar "clavado" en el código y pase a
> ser **datos configurables**. Es la columna vertebral de todo lo demás.

### 0.1 Estado actual (lo que hay que cambiar)

- Toda la paleta de colores está hardcodeada en `client/src/pages/invitation/InvitationPage.jsx`:
  clases tipo `wine-100`, `gold-400`, `wine-950`, degradados rosa/blush.
- Tipografías fijas: `font-cinzel`, `font-playfair`, `font-script`, `font-display`, `font-body`.
- El contrato de la invitación es un JSONB libre (`events.invitation`) sin validación ni versión.

### 0.2 Definir el "contrato" de configuración

Agregar al JSONB un campo raíz `template` y mantener compatibilidad con lo existente.

```jsonc
// events.invitation
{
  "template": "xv",            // ← NUEVO: id del formato elegido
  "version": 1,                // ← NUEVO: versionado del esquema
  // Campos comunes (compartidos por todos los formatos):
  "hero_image": "",
  "kicker": "",
  "tagline": "",
  "message": "",
  "celebrants": "",
  "itinerary": [],
  "locations": [],
  "gallery": [],
  "dress_code": []
}
```

- **Campos comunes:** hero, kicker, tagline, mensaje, celebrants, itinerario, ubicaciones,
  galería, dress code. Estos ya existen y se conservan tal cual.
- **Campos específicos por formato** se agregan en la Fase 2 (p. ej. `couple: { nameA, nameB }`
  para boda).

### 0.3 Crear la capa de "tema" (Theme System)

Nuevo módulo en el cliente que mapea `template → { paleta, tipografías, ornamentos, secciones }`:

```
client/src/invitation/
├── themes/
│   ├── index.js        # registry: template -> definición de tema
│   ├── xv.js           # tema XV años (actual, migrado)
│   ├── boda.js         # tema boda
│   ├── cumpleanos.js   # tema cumpleaños (Fase 1 si alcanza)
│   └── …
├── tokens.js           # convierte la definición de tema en clases/estilos
├── sections/           # secciones reutilizables (hero, countdown, rsvp…)
│   ├── Hero.jsx
│   ├── Countdown.jsx
│   ├── Itinerary.jsx
│   ├── Locations.jsx
│   ├── Gallery.jsx
│   ├── DressCode.jsx
│   └── Rsvp.jsx
└── InvitationPage.jsx  # orquesta: tema + secciones + datos
```

**Qué define un "tema":**

```js
// client/src/invitation/themes/xv.js
export const xv = {
  id: "xv",
  label: "XV años",
  colors: {
    background: "wine-100",   // paleta actual: rosa blush
    primary: "gold-400",
    accent: "wine-600",
    surface: "wine-50",
  },
  fonts: { display: "font-cinzel", script: "font-script", body: "font-body" },
  ornaments: { corners: true, divider: "flor" },   // decoración del tema
  sections: ["hero", "countdown", "message", "itinerary", "locations", "gallery", "dress_code", "rsvp"],
  labels: {                        // textos por defecto en español
    rsvp: "Confirma tu asistencia",
    countdown: "Faltan",
    // …
  },
};
```

**Cómo se aplica (2 opciones, elegir una):**

1. **Tailwind + clases dinámicas (recomendado):** el tema devuelve tokens (`colors.primary`)
   y una utilidad los resuelve a clases reales (`text-gold-400`, `bg-wine-100`). Poco riesgo,
   reutiliza el CSS actual.
2. **CSS variables:** el tema define `--c-bg`, `--c-primary`… y las secciones usan `bg-[var(--c-bg)]`.
   Más limpio a largo plazo pero requiere tocar todas las clases hardcodeadas de una vez.

> **Nota técnica:** las clases de Tailwind deben estar *físicamente* en el código fuente para
> que el compilador no las descarte. Si un tema usa `bg-rose-100`, esa clase debe aparecer en
> algún `.jsx`. Guarda en el tema solo tokens que ya existan en la paleta o agrégalos
> explícitamente al `tailwind.config`/`@theme`.

### 0.4 Refactor de `InvitationPage.jsx` (la parte delicada)

- Extraer cada sección del archivo monolítico (hoy ~1000 líneas) a `sections/*.jsx`.
- Reemplazar clases fijas por clases derivadas del tema activo (`t.colors.primary`).
- El orden de secciones se decide por `t.sections` (el tema puede ocultar galería, etc.).

**Criterio de salida (Definition of Done):**
- [x] El XV actual renderiza **idéntico** a como lo hace hoy (mismo look, mismo orden).
- [x] Cambiar `template` en la DB por `"boda"` y ver la invitación con otro look.
- [x] Una invitación vieja sin campo `template` usa el tema `xv` por defecto (retrocompatibilidad).

---

## Fase 1 — Temas visuales (2–3 formatos)

> **Meta:** elegir formato desde el editor y ver la invitación con ese estilo.

### 1.1 Definir los formatos (spec de diseño)

Definir **antes de codear** la paleta, tipografías y tono de cada uno:

| Formato | Paleta sugerida | Tipografías | Tono / secciones clave |
|---------|-----------------|-------------|------------------------|
| **XV años** | rosa blush + dorado (actual) | Cinzel / script / Playfair | El actual, intacto |
| **Boda** | ivory + verde salvia + dorado suave | Serif clásica (Playfair Display) + script | Misma estructura + foco en "Los novios" (Fase 2) |
| **Cumpleaños** | colorido / pastel, redondeado | Sans moderno, redondeada | Más informal, galería protagonista |

**Regla:** todos los formatos **comparten las mismas secciones** (hero, countdown, mensaje,
itinerario, ubicaciones, galería, dress code, RSVP). Solo cambia el *look*, no la estructura.
Eso mantiene bajo el costo de mantenimiento.

### 1.2 Selector de formato en el editor

En `client/src/pages/event/EventInvitation.jsx`:

- Nuevo bloque "Formato de invitación" con tarjetas de preview (miniaturas estáticas o CSS).
- Al cambiar de formato → `setForm({ ...form, template: nuevoId })`.
- Botón "Ver invitación" que abre la landing en otra pestaña con ese template.

### 1.3 Persistencia

- `PUT /api/events/:id/invitation` ya guarda el JSONB completo; solo hay que asegurar que
  `template` se incluya en el payload y no se rompa si viene vacío.

**Criterio de salida:**
- [ ] 3 formatos elegibles y renderizando distinto.
- [ ] El editor persiste `template` y al recargar mantiene la selección.
- [ ] Sin regresiones en el look actual de XV años.

---

## Fase 2 — Contenido específico por formato

> **Meta:** cada formato pide *sus* datos (no que el de XV sirva para boda).

### 2.1 Definir campos extra por formato

| Formato | Campos extra |
|---------|--------------|
| **Boda** | `couple: { nameA, nameB }`, "Ceremonia y recepción" (dos ubicaciones con etiquetas distintas), `registry_note` (mesa de regalos) |
| **Baby shower** | `parents: [nombres]`, `gender`, `registry_note` (qué no regalar) |
| **Cumpleaños** | `age`, `theme_name` (tema de la fiesta), `dress_code` libre |

### 2.2 Editor por secciones condicionales

- El editor muestra campos **según el template activo**: si `template === "boda"`, aparece
  "Nombre de la novia / novio"; si es XV, los actuales.
- Mantener los campos comunes siempre visibles.

### 2.3 Render condicional en la invitación

- Cada sección que dependa de campos específicos verifica el tema:
  - Boda → hero muestra "NombreA & NombreB" en vez de "Celebrants".
  - El mensaje por defecto cambia según el formato (no "los invitamos a nuestra fiesta de XV").

**Criterio de salida:**
- [ ] Crear un evento tipo "boda" y que su invitación pida los datos de novios.
- [ ] El formulario valida campos obligatorios por formato.
- [ ] Los datos específicos se guardan en el JSONB y no rompen otros formatos.

---

## Fase 3 — Mejoras transversales

> **Meta:** pulir lo que se nota como "clavado" y que hoy impide personalizar bien.

### 3.1 RSVP configurable (quitar hardcode)

Hoy los teléfonos de "Papá/Mamá" están **en el código** (`InvitationPage.jsx:943-958`).

- Agregar al evento (o al grupo) campos `contact_phone`, `contact_name`, `contact_note`.
- Mostrar los contactos del evento en el modal de confirmación y en la confirmación final.
- Si no hay contacto configurado, ocultar la sección de "aclaraciones".

### 3.2 Vista previa en vivo del editor

- Mini preview embebida (iframe o render condicional) que actualice al cambiar campos.
- Prioridad media: mejora mucho la experiencia pero no bloquea el lanzamiento.

### 3.3 Migración y retrocompatibilidad

- Script para invitaciones existentes sin `template`: asignarles `"xv"`.
- Nivel de tolerancia: el renderer trata campos ausentes como vacíos (ya lo hace en gran parte).

**Criterio de salida:**
- [ ] Contactos RSVP configurables desde el panel y sin valores en el código.
- [ ] Todas las invitaciones existentes quedan marcadas como `xv`.
- [ ] No hay URLs/teléfonos "de prueba" visibles en producción.

---

## Fase 4 — Templates de usuario (opcional / avanzado)

> **Meta:** el usuario guarda sus propias invitaciones como plantillas reutilizables.

### 4.1 Propuesta

- Nueva tabla `invitation_templates` (id, user_id, name, config JSONB, created_at).
- Desde el editor: "Guardar como plantilla" / "Usar plantilla guardada".
- Al crear un evento: opción "Empezar desde plantilla".

### 4.2 Decisiones a tomar

- ¿Plantillas globales (de todos los usuarios) o privadas? → sugerencia: privadas primero.
- ¿Marketplace de plantillas? → fuera de alcance por ahora.

**Criterio de salida:**
- [ ] Guardar y reutilizar una invitación propia.
- [ ] Plantillas por usuario (sin cruzarse entre usuarios).

---

## Mapa de ejecución (orden sugerido)

```
Fase 0 ──► Fase 1 ──► Fase 2 ──► Fase 3 ──► Fase 4
 (base)     (look)     (datos)    (pulido)   (avanzado)
```

**Semana a semana (sugerencia):**

| Semana | Qué se hace | Entregable |
|--------|-------------|------------|
| 1 | Fase 0: contrato + sistema de temas + refactor de secciones | Refactor sin cambios visuales, todo verde |
| 2 | Fase 1: temas XV + boda (+cumpleaños) + selector en editor | 2–3 formatos elegibles |
| 3 | Fase 2: campos por formato (novios, padres, edad…) | Invitación de boda real funciona |
| 4 | Fase 3: RSVP configurable + preview + migración | Pulido y lista para producción |
| (después) | Fase 4: plantillas de usuario | Reutilización |

**Puntos de decisión / bloqueo (go/no-go):**
- **Antes de Fase 1:** aprobar la spec de diseño de los 2 formatos nuevos (colores y tipografías).
- **Antes de Fase 4:** decidir si las plantillas son privadas o compartidas.

---

## Riesgos y cómo mitigarlos

| Riesgo | Mitigación |
|--------|-----------|
| Tailwind descarta clases de temas no usadas en el código | Listar en el tema solo tokens existentes o declararlos en `@theme`/config |
| Romper el look actual de XV años al refactorizar | Fase 0 con criterio "píxel idéntico", comparar antes/después |
| JSONB libre sin validación → configs rotas | Versión en el contrato + renderer tolerante a campos ausentes |
| Refactor grande del archivo de 1000 líneas | Extraer sección por sección, commit por sección, sin mezclar con cambios visuales |
| El formulario del editor se complica con campos condicionales | Mapa `template → camposExtra` en el mismo `themes/` |

---

## Archivos que se tocarán (mapa de impacto)

| Archivo | Cambio |
|---------|--------|
| `client/src/pages/invitation/InvitationPage.jsx` | Se divide en `invitation/sections/*` y consume el tema activo |
| `client/src/invitation/themes/*` | **Nuevos** — definiciones de temas (paleta, tipografías, secciones, labels) |
| `client/src/invitation/sections/*` | **Nuevos** — secciones extraídas y parametrizadas por tema |
| `client/src/pages/event/EventInvitation.jsx` | Selector de formato + campos condicionales por template |
| `server/src/routes/events.js` | (opcional) validación ligera del JSONB al guardar |
| `server/src/db/schema.sql` | (Fase 4) tabla `invitation_templates` |
| `client/src/api.js` | (Fase 4) endpoints de plantillas |

---

## Verificación por fase

```bash
# Comprobar que la app arranca y el build no rompe (después de cada fase)
cd server && npm run dev          # API en :4000
cd client && npm run dev          # front en :5173

# Build de producción (importante antes de desplegar)
npm run build                     # desde la raíz (build server + client)
```

**Prueba manual mínima por formato:**
1. Crear evento tipo "Boda".
2. En el editor elegir formato *Boda*, llenar nombres de novios + ceremonia + recepción.
3. Abrir `/invitacion/<token>` de un grupo y verificar: hero, countdown, itinerario, ubicaciones, RSVP.
4. Cambiar el formato a *Cumpleaños* y verificar que los campos de boda desaparecen y se adapta.
5. Revisar una invitación creada **antes** del refactor (debe verse igual, tema `xv` por defecto).