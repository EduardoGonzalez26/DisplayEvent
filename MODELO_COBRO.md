# MODELO DE COBRO — DisplayEvent

> **Propósito:** Definir la estrategia de monetización de DisplayEvent: planes, precios, psicología de precios, viabilidad financiera y hoja de implementación.
>
> **Estado:** Propuesta para revisión (no implementada).
> **Fecha:** 2026-09-16
> **Relacionados:** `MEMORIA.md`, `README.md`, `AUDITORIA.md`, `PLAN_INVITACIONES_MULTIFORMATO.md`.

---

## 0. Resumen ejecutivo

> **La invitación es el artefacto viral; la gestión es donde está el dinero.**
> Cada invitación pública (`/invitacion/<slug>/<token>`) la ven decenas de invitados, con o sin sesión. Eso es un motor de adquisición (K-factor) que se desperdicia si todo es gratis **y** se destruye si cobras por publicar la invitación. La palanca correcta: **regalar la invitación (con marca), cobrar la gestión** (mesas, RSVP masivo, regalos, WhatsApp automático).

Modelo recomendado: **híbrido de 3 capas** — Freemium viral + pago único por evento + suscripción para creadores de varios eventos. No es "o uno u otro": los tres conviven y se retroalimentan.

---

## 1. Análisis de valor: qué se regala y qué se cobra

| Categoría | Función | Decisión |
| --------- | ------- | -------- |
| **Commodity (gratis)** | Invitación genérica (xv, boda, cumpleaños, baby shower), sobre digital, cuenta regresiva, galería, mapas, RSVP básico | Gratis **con marca DisplayEvent** en el footer → loop viral |
| **Dolor real (pago por evento)** | Invitados ilimitados, mesas drag&drop, dashboard, mesa de regalos, envío por WhatsApp, sin marca | Pago único: el 80% de los clientes tiene **un solo evento** (boda, XV, bautizo) |
| **Repetición (suscripción)** | Múltiples eventos activos, plantillas guardadas, equipo, white-label, WhatsApp automático, exportaciones | Pro / Estudio para planners, venues, organizadores de fiestas |
| **Servicio (alto margen)** | Plantilla a la medida (las plantillas `alice_xv` y `boda_jorge_macarena` ya demuestran la capacidad), onboarding, dominio propio | Servicio desde $2,500 MXN, no feature |

**Insight de costo:** alojar un evento más cuesta <$10 MXN/mes (Postgres + Cloudinary + Brevo tienen capa gratuita muy holgada). No hay restricción de costos, hay restricción de **voluntad de pago**. Casi todo el margen es precio, no infraestructura.

---

## 2. Estructura de planes recomendada

| | **Gratis** | **Evento Único** | **Pro** | **Estudio** |
|---|---|---|---|---|
| **Precio** | $0 | **$899** pago único | **$399/mes** · **$3,990/año** | **$1,290/mes** · **$12,900/año** |
| **Ancla psicológica** | Captura y virus | "Menos que 30 invitaciones impresas" | "2 meses gratis" en anual | "Cuesta menos que un asistente" |
| Eventos | 1 (30 invitados) | 1 · invitados ilimitados | Hasta 10 activos | Ilimitados |
| Vigencia | Sin límite | 12 meses desde la compra | Mientras esté activa | Mientras esté activa |
| Invitación | 4 formatos + sobre + RSVP | Todo, **sin marca** | + plantillas guardadas ilimitadas | + temas a la medida (servicio) |
| Mesas drag&drop | — | ✓ | ✓ | ✓ |
| Dashboard | Básico | Completo | Completo | Completo + multi-evento |
| Mesa de regalos | — | ✓ depósito · tarjeta¹ | ✓ | ✓ |
| WhatsApp | Envío manual (`wa.me`) | Manual ilimitado | **+ automático (Cloud)** 150 msgs/mes | + 1,000 msgs/mes |
| Equipo | — | — | 2 usuarios | 5 usuarios + roles |
| Dominio propio | — | — | — | ✓ (white-label) |
| Soporte | Centro de ayuda | Email 48h | Email 24h + WhatsApp | Prioritario + onboarding |

¹ Hoy las tarjetas pasan por la cuenta Stripe de la plataforma (modo test). **No escales eso así** — ver §6 (Stripe Connect).

### Add-ons (margen puro)

- Créditos WhatsApp: **$99 / 100 mensajes** (costo Meta ≈ $30–60 MXN → margen ~50%).
- Evento extra en Pro: **$149**.
- Plantilla premium individual: **$79**.
- Experiencia a la medida (como las 2 especiales): **desde $2,500**.

---

## 3. Por qué estos precios (psicología + anclas)

1. **Ancla tangible:** 100 invitaciones impresas en México cuestan $2,500–$4,000 + envío. $899 "hace eso y además RSVP, mesas y regalos". Es el argumento de venta más fuerte de la landing.
2. **Charm pricing consistente:** $899, $399, $1,290 — todos terminan en 9 y evitan el salto de los "$900/$400".
3. **Efecto señuelo bidireccional:** Estudio ($1,290/mes) hace que Pro ($399) parezca barato; y para planners con >4 eventos/año, Evento Único ($899 c/u) hace que Pro anual ($3,990) sea obvio. La escala guía sola.
4. **Anual = 2 meses gratis:** $399 × 10 = $3,990 (equivalente a $332/mes). Sube LTV, mejora flujo de caja y reduce churn estacional.
5. **La marca en el plan Gratis** es la palanca de conversión más honesta: a una boda le molesta; a un cumpleaños de 20 personas no. El upsell nace del orgullo, no del bloqueo.
6. **Grandfathering:** primeros 50 clientes "Precio Fundador" ($699 Evento / $299 Pro de por vida). Urgencia + prueba social + LTV temprano.

**Rangos para test A/B:** Evento $699–$999 · Pro $299–$499 · descuento anual 2 vs 3 meses.

---

## 4. Contexto México/LATAM: cómo cobrar

| Aspecto | Recomendación |
|---|---|
| **Moneda** | MXN base (ya hay lógica EUR en regalos; España después con precio por paridad: ~€39 evento / €12/mes) |
| **Tarjeta** | Stripe MX (requiere RFC/entidad mexicana) — **3 MSI en Evento Único** para saltar la barrera de los $899 |
| **Efectivo** | **OXXO y SPEI** para pagos únicos (suscripciones casi siempre exigen tarjeta) |
| **Alternativa** | MercadoPago como checkout secundario: más cobertura, MSI y confianza local |
| **IVA** | Precios **con IVA incluido** (estándar B2C); en los márgenes descontar el 16% |
| **CFDI** | Planners y venues pedirán factura: integrar un PAC (Facturama/SW) al webhook. Stripe no timbra solo |
| **Prueba** | 14 días de Pro sin tarjeta al registrarse; luego decide plan |

---

## 5. Viabilidad financiera (estimaciones a verificar)

### 5.1 Costos fijos mensuales

| Concepto | USD/mes | MXN/mes aprox |
|---|---|---|
| Railway (API) | $10–20 | $170–340 |
| Supabase (Postgres) | $0–25 | $0–425 |
| Brevo (correo) | $0–15 | $0–255 |
| Cloudinary (imágenes) | $0–25 | $0–425 |
| Dominio/SSL/otros | ~$2 | ~$34 |
| **Total** | **$12–87** | **~$200–1,600** |

### 5.2 Comisiones por cobro (verificar tarifas vigentes)

- Tarjeta MX doméstica ≈ 3.6% + $3 MXN.
- Tarjeta internacional ≈ 4.4% + $3 MXN.
- OXXO ≈ 4% + $6 MXN.
- WhatsApp Utility (Meta) ≈ US$0.01–0.05 por mensaje.

### 5.3 Margen de contribución

| Plan | Ingreso | Comisión Stripe | Costo directo | Margen |
|---|---|---|---|---|
| Evento $899 | $899 | ~$35 | <$10 | **~96–98%** |
| Pro mensual $399 | $399 | ~$17 | <$25 | **~90–94%** |
| Estudio $1,290 | $1,290 | ~$49 | <$50 | **~92–96%** |

### 5.4 Punto de equilibrio

Con fijos de ~$1,000 MXN/mes → **2 Eventos Únicos o 3–4 Pro al mes** (netos de IVA). Extremadamente alcanzable.

### 5.5 Escenario ilustrativo año 1 (no proyección)

| Fuente | Unidades | Precio | Ingreso |
|---|---|---|---|
| Evento Único | 100 | $899 | $89,900 |
| Pro anual | 20 | $3,990 | $79,800 |
| Estudio anual | 3 | $12,900 | $38,700 |
| Add-ons (créditos, diseño) | — | — | $20,000 |
| **Total** | | | **≈$228,400 MXN** |

Menos comisiones (~$9k) e infraestructura (~$15k) → **≈$204,000 MXN netos**.

---

## 6. Ingresos adicionales (fase 2/3)

1. **Comisión de mesa de regalos (2% vía Stripe Connect):** una boda con $50,000 en regalos genera $1,000 sin costo marginal. ⚠️ Hoy el código recibe los regalos en la cuenta de la plataforma: eso es riesgo regulatorio (transmisión de dinero). Migrar a **Connect Express** (la pareja conecta su cuenta y recibe directo; la plataforma cobra `application_fee` del 2%) **antes** de pasar Stripe a producción. Hasta entonces, prometer solo depósito bancario.
2. **Créditos WhatsApp** (reventa con ~50% de margen).
3. **Servicio de plantilla a la medida** (ya existe el músculo técnico con las 2 especiales).
4. **Futuro:** check-in con QR y aforo para fiestas estudiantiles (segmento con necesidad real de control de acceso; ahí sí un fee por boleto).

---

## 7. Cómo implementarlo (producto)

- **Entitlements en BD:** `users.plan`, `user_subscriptions`, `events.plan` / `paid_until`, y middleware `requireFeature(...)` + validación server-side de límites (invitados, eventos activos, mesas). El servidor ya valida capacidad de mesas; extender ese patrón.
- **Stripe:** Checkout `mode:"payment"` (Evento, con `metadata.type=event_plan`) y `mode:"subscription"` (Pro/Estudio). El webhook actual solo maneja `gifts`: extenderlo para distinguir por `metadata.type` y dar de alta/baja entitlements (`invoice.paid`, `customer.subscription.updated`).
- **Gating mínimo:** marca de agua, mesas, mesa de regalos, WhatsApp automático, export CSV, límite de invitados/eventos. El pago único activa a nivel evento; la suscripción a nivel usuario.
- **Vigencia:** Evento → 12 meses y luego solo-lectura/export (genera renovación natural para el siguiente evento); Pro → mientras esté activa.
- **Orden de lanzamiento:** Fase 1 = Gratis + Evento (MVP, conversión inmediata) → Fase 2 = Pro mensual/anual + trial → Fase 3 = Connect 2%, créditos, Estudio.
- **Landing:** página de precios con la tabla + calculadora simple ("¿Cuántos invitados?") + FAQ de pagos (OXXO, SPEI, MSI, factura). La landing actual ya tiene el tono editorial; una sección `Pricing` encaja sin rediseño.

---

## 8. Riesgos y decisiones abiertas

| Riesgo / decisión | Postura sugerida |
|---|---|
| Cobrar antes de tener tracción | Lanzar Gratis agresivo; el virus importa más que el primer peso. Monetizar el dolor (mesas/regalos) |
| Canibalización Evento vs Pro | Se resuelve sola: <5 eventos/año → Evento; ≥5 → Pro |
| Stripe en producción (MX requiere RFC) | Entidad mexicana; si no existe, MercadoPago como principal |
| Regalos con tarjeta (compliance) | No recibirlos en la cuenta de la plataforma; Connect o no ofrecerlos |
| IVA/CFDI | Definir "IVA incluido" y PAC integrado desde el día 1; sin CFDI se pierde al segmento planners/venues |

---

## 9. Siguiente paso sugerido

1. Validar los 3 umbrales con 5–10 clientes reales (planners de CDMX/Guadalajara y 2 parejas).
2. Construir la página de precios + entitlements (Fase 1).
3. Arrancar con Free + Evento Único a $899 (test A/B $699/$899/$999 desde la primera semana).
