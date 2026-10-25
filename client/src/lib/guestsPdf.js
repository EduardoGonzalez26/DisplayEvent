import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

// Genera un resumen imprimible de los invitados del evento. El módulo se carga
// de forma dinámica desde EventGuests para que jsPDF/AutoTable queden en un
// chunk aparte y no afecten la carga inicial del panel.

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 14;
const MARGIN_RIGHT = 14;
const MARGIN_TOP = 34;
const MARGIN_BOTTOM = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const CONTENT_BOTTOM = PAGE_HEIGHT - MARGIN_BOTTOM;
const FIRST_CONTENT_Y = 48;

// Paleta del PDF (claro e imprimible).
const COLORS = {
  accent: [79, 70, 229],
  text: [17, 24, 39],
  muted: [107, 114, 128],
  border: [229, 231, 235],
  soft: [245, 243, 255],
  softBorder: [221, 214, 254],
  alternate: [249, 250, 251],
  detailHead: [238, 242, 255],
  detailHeadText: [55, 48, 163],
  confirmed: [5, 150, 105],
  declined: [220, 38, 38],
  pending: [217, 119, 6],
};

const STATUS = {
  confirmed: "Confirmado",
  declined: "No asistirá",
  pending: "Sin responder",
};

function groupKey(value) {
  return String(value ?? "");
}

function guestStatus(guest) {
  // El rechazo tiene prioridad: un invitado que declinó no cuenta como
  // confirmado aunque conserve la marca de registro.
  if (guest?.declined) return STATUS.declined;
  if (guest?.registered) return STATUS.confirmed;
  return STATUS.pending;
}

function compareGuests(a, b) {
  const leaderDiff = Number(Boolean(b?.is_leader)) - Number(Boolean(a?.is_leader));
  if (leaderDiff !== 0) return leaderDiff;
  return String(a?.name ?? "").localeCompare(String(b?.name ?? ""), "es", {
    sensitivity: "base",
  });
}

function highChairsForGroup(group) {
  if (!group?.high_chairs) return 0;
  const count = Number(group.high_chairs_count);
  return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
}

function formatEventDate(value) {
  if (!value || typeof value !== "string") return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatEventTime(value) {
  if (!value) return "";
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return text;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function formatGeneratedAt() {
  return new Date().toLocaleString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeSlug(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

function buildFileName(event, eventId) {
  const base = normalizeSlug(event?.slug) || normalizeSlug(event?.name) || normalizeSlug(eventId);
  return `resumen-invitados-${base || "evento"}.pdf`;
}

function ellipsize(doc, text, maxWidth) {
  const value = String(text ?? "");
  if (!value || doc.getTextWidth(value) <= maxWidth) return value;
  const suffix = "...";
  let result = value;
  while (result.length > 0 && doc.getTextWidth(result + suffix) > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result.trimEnd()}${suffix}`;
}

// Convierte el SVG del logo a PNG en el navegador: jsPDF no inserta SVG
// directamente. A 4x conserva nitidez (175 x 143 -> 700 x 572 px).
async function loadLogoPng() {
  try {
    const base = import.meta.env.BASE_URL || "/";
    const url = base.endsWith("/") ? `${base}logo.svg` : `${base}/logo.svg`;
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("No se pudo cargar el logo"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 572;
    const context = canvas.getContext("2d");
    if (!context) return null;
    // Fondo transparente: el logo negro se apoya en el blanco de la página.
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    // El PDF debe generarse aunque el logo no esté disponible.
    return null;
  }
}

function ensureSpace(doc, y, needed) {
  if (y + needed > CONTENT_BOTTOM) {
    doc.addPage();
    return MARGIN_TOP;
  }
  return y;
}

function addSectionTitle(doc, y, title) {
  const nextY = ensureSpace(doc, y, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.text);
  doc.text(title, MARGIN_LEFT, nextY);
  return nextY + 6;
}

function addLogo(doc, dataUrl, x, y, width, height) {
  try {
    doc.addImage(dataUrl, "PNG", x, y, width, height, undefined, "FAST");
    return true;
  } catch {
    return false;
  }
}

function drawFallbackBrand(doc) {
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.text);
  doc.text("DisplayEvent", PAGE_WIDTH - MARGIN_RIGHT, 17, { align: "right" });
}

function drawFirstPageHeader(doc, context) {
  const { eventName, eventDate, eventTime, eventPlace, logoPng, generatedAt } = context;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(...COLORS.text);
  doc.text("Resumen de invitados", MARGIN_LEFT, 18);

  if (eventName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.accent);
    doc.text(ellipsize(doc, eventName, 150), MARGIN_LEFT, 25.5);
  }

  const metadata = [eventDate, eventTime, eventPlace].filter(Boolean).join(" · ");
  if (metadata) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text(ellipsize(doc, metadata, 150), MARGIN_LEFT, 31.5);
  }

  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_LEFT, 38, PAGE_WIDTH - MARGIN_RIGHT, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    `Generado el ${generatedAt} · Incluye todos los grupos e invitados`,
    MARGIN_LEFT,
    43
  );

  const placed = Boolean(logoPng) && addLogo(doc, logoPng, 175, 8, 21, 17);
  if (placed) {
    // Wordmark debajo del logo, solo en la primera página.
    doc.setFont("times", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.text);
    doc.text("DisplayEvent", PAGE_WIDTH - MARGIN_RIGHT, 29.5, { align: "right" });
  } else {
    // El fallback ya funciona como wordmark; se evita duplicarlo.
    drawFallbackBrand(doc);
  }
}

function drawContinuationHeader(doc, context) {
  const { eventName, logoPng } = context;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text("Resumen de invitados", MARGIN_LEFT, 15);

  if (eventName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(ellipsize(doc, eventName, 150), MARGIN_LEFT, 21.5);
  }

  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_LEFT, 28, PAGE_WIDTH - MARGIN_RIGHT, 28);

  const placed = Boolean(logoPng) && addLogo(doc, logoPng, 180, 8, 16, 13);
  if (!placed) drawFallbackBrand(doc);
}

function drawFooter(doc, page, totalPages, eventName) {
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_LEFT, 281, PAGE_WIDTH - MARGIN_RIGHT, 281);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text("DisplayEvent", MARGIN_LEFT, 286);
  if (eventName) {
    doc.text(ellipsize(doc, eventName, 90), PAGE_WIDTH / 2, 286, { align: "center" });
  }
  doc.text(`Página ${page} de ${totalPages}`, PAGE_WIDTH - MARGIN_RIGHT, 286, {
    align: "right",
  });
}

function drawSummaryCards(doc, y, cards) {
  const cardWidth = 42.5;
  const cardHeight = 18;
  const gap = 4;

  cards.forEach((card, index) => {
    const row = Math.floor(index / 4);
    const column = index % 4;
    const x = MARGIN_LEFT + column * (cardWidth + gap);
    const cardY = y + row * (cardHeight + gap);

    doc.setFillColor(...COLORS.soft);
    doc.setDrawColor(...COLORS.softBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...COLORS.accent);
    doc.text(String(card.value), x + cardWidth / 2, cardY + 8, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(card.label, x + cardWidth / 2, cardY + 14, { align: "center" });
  });

  return y + 2 * cardHeight + gap;
}

function buildGuestDetail(guest, guestsById) {
  const details = [];
  if (guest?.is_leader) details.push("Líder");
  if (guest?.is_child) details.push("Niño");
  if (guest?.companion_id != null) {
    const companion = guestsById.get(groupKey(guest.companion_id));
    details.push(companion ? `Acompañante de ${companion.name}` : "Acompañante");
  }
  return details.length > 0 ? details.join(" · ") : "-";
}

function sumByStatus(guests, status) {
  return guests.filter((guest) => guestStatus(guest) === status).length;
}

/**
 * Genera y descarga el resumen de invitados en PDF.
 * Devuelve el nombre del archivo generado.
 */
export async function exportGuestsPdf({ event = null, groups = [], guests = [], eventId = "" } = {}) {
  const safeGroups = Array.isArray(groups) ? groups : [];
  const safeGuests = Array.isArray(guests) ? guests : [];
  const eventName = typeof event?.name === "string" ? event.name.trim() : "";
  const generatedAt = formatGeneratedAt();
  const logoPng = await loadLogoPng();

  const guestsById = new Map();
  const guestsByGroup = new Map();
  safeGuests.forEach((guest) => {
    guestsById.set(groupKey(guest.id), guest);
    const key = groupKey(guest.group_id);
    if (!guestsByGroup.has(key)) guestsByGroup.set(key, []);
    guestsByGroup.get(key).push(guest);
  });

  const groupSummaries = safeGroups.map((group) => {
    const groupGuests = [...(guestsByGroup.get(groupKey(group.id)) ?? [])].sort(compareGuests);
    return {
      group,
      guests: groupGuests,
      total: groupGuests.length,
      confirmed: sumByStatus(groupGuests, STATUS.confirmed),
      declined: sumByStatus(groupGuests, STATUS.declined),
      pending: sumByStatus(groupGuests, STATUS.pending),
      children: groupGuests.filter((guest) => guest?.is_child).length,
      highChairs: highChairsForGroup(group),
    };
  });

  const totals = {
    groups: safeGroups.length,
    guests: safeGuests.length,
    adults: safeGuests.filter((guest) => !guest?.is_child).length,
    children: safeGuests.filter((guest) => guest?.is_child).length,
    confirmed: sumByStatus(safeGuests, STATUS.confirmed),
    declined: sumByStatus(safeGuests, STATUS.declined),
    pending: sumByStatus(safeGuests, STATUS.pending),
    highChairs: safeGroups.reduce((sum, group) => sum + highChairsForGroup(group), 0),
  };

  const sentInvitations = safeGroups.filter((group) => Boolean(group?.whatsapp_sent_at)).length;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setProperties({
    title: eventName ? `Resumen de invitados — ${eventName}` : "Resumen de invitados",
    subject: "Resumen de invitados",
    author: "DisplayEvent",
    creator: "DisplayEvent",
  });

  // Resumen general ---------------------------------------------------------
  let y = FIRST_CONTENT_Y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.text);
  doc.text("Resumen general", MARGIN_LEFT, y);

  y = drawSummaryCards(doc, y + 6, [
    { label: "Grupos", value: totals.groups },
    { label: "Invitados", value: totals.guests },
    { label: "Adultos", value: totals.adults },
    { label: "Niños", value: totals.children },
    { label: "Confirmados", value: totals.confirmed },
    { label: "No asistirán", value: totals.declined },
    { label: "Sin responder", value: totals.pending },
    { label: "Periqueras", value: totals.highChairs },
  ]);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    `Invitaciones enviadas: ${sentInvitations} de ${safeGroups.length} grupos por WhatsApp.`,
    MARGIN_LEFT,
    y + 6
  );
  y += 13;

  // Resumen por grupo -------------------------------------------------------
  y = addSectionTitle(doc, y, "Resumen por grupo");

  const groupTableBody = groupSummaries.map((summary) => [
    summary.group.name || "-",
    summary.group.leader_name || "-",
    summary.total,
    summary.confirmed,
    summary.declined,
    summary.pending,
    `${summary.children} / ${summary.highChairs}`,
  ]);

  groupTableBody.push([
    "Total",
    "",
    totals.guests,
    totals.confirmed,
    totals.declined,
    totals.pending,
    `${totals.children} / ${totals.highChairs}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Grupo", "Líder", "Invitados", "Confirmados", "No asistirán", "Sin responder", "Niños / Periq."]],
    body: groupTableBody,
    margin: {
      top: MARGIN_TOP,
      right: MARGIN_RIGHT,
      bottom: MARGIN_BOTTOM,
      left: MARGIN_LEFT,
    },
    tableWidth: CONTENT_WIDTH,
    styles: {
      font: "helvetica",
      fontSize: 8,
      textColor: COLORS.text,
      lineColor: COLORS.border,
      lineWidth: 0.1,
      cellPadding: 2,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: COLORS.accent,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      lineColor: COLORS.accent,
      // 7.5 pt y padding horizontal ajustado para que "Confirmados" no se
      // parta a mitad de palabra en su columna de 20 mm.
      fontSize: 7.5,
      cellPadding: { top: 2, right: 1.5, bottom: 2, left: 1.5 },
    },
    alternateRowStyles: {
      fillColor: COLORS.alternate,
    },
    columnStyles: {
      0: { cellWidth: 44 },
      1: { cellWidth: 44 },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 20, halign: "center" },
      5: { cellWidth: 20, halign: "center" },
      6: { cellWidth: 18, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "head") {
        data.cell.styles.halign = data.column.index < 2 ? "left" : "center";
      }
      if (data.section === "body" && data.row.index === groupTableBody.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = COLORS.soft;
      }
    },
  });

  y = (doc.lastAutoTable?.finalY ?? y) + 4;
  y = ensureSpace(doc, y, 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text("Periq. = periqueras.", MARGIN_LEFT, y);
  y += 8;

  // Detalle de invitados ----------------------------------------------------
  y = addSectionTitle(doc, y, "Detalle de invitados");

  const detailBody = [];
  groupSummaries.forEach((summary) => {
    summary.guests.forEach((guest) => {
      detailBody.push([
        summary.group.name || "-",
        guest.name || "-",
        guestStatus(guest),
        buildGuestDetail(guest, guestsById),
      ]);
    });
  });

  if (detailBody.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text("Sin invitados registrados.", MARGIN_LEFT, y + 2);
  } else {
    autoTable(doc, {
      startY: y,
      head: [["Grupo", "Invitado", "Estado", "Detalle"]],
      body: detailBody,
      margin: {
        top: MARGIN_TOP,
        right: MARGIN_RIGHT,
        bottom: MARGIN_BOTTOM,
        left: MARGIN_LEFT,
      },
      tableWidth: CONTENT_WIDTH,
      styles: {
        font: "helvetica",
        fontSize: 8,
        textColor: COLORS.text,
        lineColor: COLORS.border,
        lineWidth: 0.1,
        cellPadding: 2,
        valign: "middle",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: COLORS.detailHead,
        textColor: COLORS.detailHeadText,
        fontStyle: "bold",
        lineColor: COLORS.border,
      },
      alternateRowStyles: {
        fillColor: COLORS.alternate,
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 58 },
        2: { cellWidth: 28 },
        3: { cellWidth: 56 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          data.cell.styles.fontStyle = "bold";
          const value = String(data.cell.raw ?? "");
          if (value === STATUS.confirmed) data.cell.styles.textColor = COLORS.confirmed;
          if (value === STATUS.declined) data.cell.styles.textColor = COLORS.declined;
          if (value === STATUS.pending) data.cell.styles.textColor = COLORS.pending;
        }
      },
    });
  }

  // Cabeceras y pies al final: así se conoce el total de páginas y no se
  // duplican adornos sobre el contenido.
  const headerContext = {
    eventName,
    eventDate: formatEventDate(event?.date),
    eventTime: formatEventTime(event?.time),
    eventPlace: typeof event?.place === "string" ? event.place.trim() : "",
    logoPng,
    generatedAt,
  };
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    if (page === 1) drawFirstPageHeader(doc, headerContext);
    else drawContinuationHeader(doc, headerContext);
    drawFooter(doc, page, totalPages, eventName);
  }

  const fileName = buildFileName(event, eventId);
  doc.save(fileName);
  return fileName;
}
