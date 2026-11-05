// Proforma Invoice, Packing Slip and Purchase Order: building the form data
// from sheet orders and drawing the PDFs (jsPDF + autoTable)
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "../assets/serverblink-logo.png";
import { formatToday } from "./constant";

// ---------------------------------------------------------------------------
// Company profile printed on every document
// ---------------------------------------------------------------------------
export const COMPANY = {
  name: "Server Blink, LLC",
  address: "2210 Goldsmith Lane Ste 126-5001 Louisville, KY 40218 USA",
  phone: "(502) 206-2022",
  email: "info@serverblink.com",
  website: "www.serverblink.com",
  bank: [
    ["IBAN / Account Number", "822000451534"],
    ["Routing number (for Wire and ACH)", "026073150"],
    ["BIC / Swift Code", "CMFGUS33"],
    ["Account Name", "Server Blink LLC"],
    [
      "Company Address",
      "2210 Goldsmith Lane, Ste 126-5001, Louisville, KY 40218 USA",
    ],
    ["Bank Address", "89-16 Jamaica Ave, Woodhaven, NY 11421, USA"],
    ["Type", "Checking"],
    ["Bank Name", "Community Federal Savings Bank"],
    ["Account Currency", "USD"],
  ],
};

export const DOC_TYPES = {
  proforma: {
    title: "Proforma Invoice",
    filePrefix: "Proforma Invoice",
  },
  packing: { title: "Packing Slip", filePrefix: "PS" },
  po: { title: "Purchase Order", filePrefix: "PO" },
};

export const DEFAULT_NOTE =
  "Any discrepancies must be reported within 2 days of receipt.";
export const DEFAULT_WARRANTY = "30 days Warranty";
// Fixed values printed on every Proforma Invoice
export const PROFORMA_PAYMENT_STATUS = "UnPaid";
export const PROFORMA_TRACKING = "UnDelivered";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const text = (v) => String(v ?? "").trim();
// Sheet money fields are { value, isTrue, ... } objects or plain values, and the
// value may be formatted ("1,120.00", "$70.00"). Read the raw value and strip
// the formatting before converting; getFieldValue's Number() turns those into NaN
const num = (v) => {
  const raw = v && typeof v === "object" ? v.value : v;
  const n = Number(String(raw ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const formatMoney = (n) =>
  `$${(Number(n) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const orderTypeOf = (order) =>
  String(order?.order_type || "").toLowerCase();

const isCancelled = (order) =>
  ["cancelled", "canceled"].includes(
    String(order?.["Order Status"] || "")
      .trim()
      .toLowerCase(),
  );

// "60501-2" / "PO60501A" → "60501" / "PO60501": the main order's number
export const baseOrderNumber = (orderNo) => {
  const value = text(orderNo);
  const match = value.match(/^\D*\d+/);
  return match ? match[0] : value;
};

// The clicked order plus its main order and part orders (RMAs and cancelled
// orders are left out unless they are the one clicked)
export const getOrderFamily = (orders, clicked) => {
  const base = baseOrderNumber(clicked?.["Order#"]);
  if (!base) return clicked ? [clicked] : [];
  const family = (orders || []).filter((order) => {
    const no = text(order?.["Order#"]);
    if (no === text(clicked?.["Order#"])) return true;
    if (!no.startsWith(base)) return false;
    // "605012" is another order, "60501-2" / "60501A" are part orders
    if (no.length > base.length && /\d/.test(no[base.length])) return false;
    return orderTypeOf(order) !== "rma" && !isCancelled(order);
  });
  if (!family.some((o) => text(o["Order#"]) === text(clicked?.["Order#"]))) {
    family.unshift(clicked);
  }
  // Main order first, then part orders in number order
  return family.sort((a, b) => {
    const aMain = text(a["Order#"]) === base ? 0 : 1;
    const bMain = text(b["Order#"]) === base ? 0 : 1;
    if (aMain !== bMain) return aMain - bMain;
    return text(a["Order#"]).localeCompare(text(b["Order#"]), undefined, {
      numeric: true,
    });
  });
};

// One Purchase Order per vendor: the family's orders grouped by Vendor, in the
// order they appear (orders without a vendor share one "No vendor" group)
export const groupByVendor = (family) => {
  const groups = [];
  family.forEach((order) => {
    const vendor = text(order?.Vendor);
    const key = vendor.toLowerCase() || "__no_vendor__";
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, vendor: vendor || "No vendor", orders: [] };
      groups.push(group);
    }
    group.orders.push(order);
  });
  return groups;
};

// "Erskine Ferry Road, Phase 3, Erskine PA7 5PP" → one line per comma part
const splitAddress = (address) =>
  text(address)
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");

// Bill To / Ship To block as printed: the name line, then the address lines
export const partyBlock = (name, address) =>
  [text(name), text(address)].filter(Boolean).join("\n");

const firstValue = (orders, field) =>
  orders.map((o) => text(o?.[field])).find(Boolean) || "";

const sumField = (orders, field) =>
  round2(orders.reduce((acc, o) => acc + num(o?.[field]), 0));

// One line item per order (each sheet row is one part)
export const orderToItem = (order, { useCost = false } = {}) => {
  // Quantities are whole numbers on the documents; separators are ignored,
  // so a sheet Qty of "1, 2" reads as 12
  const qty = Math.max(1, Math.round(num(order?.Qty)));
  const total = num(useCost ? order?.Cost : order?.Price);
  return {
    key: text(order?.["Order#"]) || `line-${Math.random()}`,
    orderNo: text(order?.["Order#"]),
    sku: useCost
      ? text(order?.["Vendor Part#"]) || text(order?.["Part#"])
      : text(order?.["Part#"]),
    description: getSavedDescription(order?.["Part#"]),
    condition: text(order?.Condition),
    // Used when "Apply same warranty to all items" is off
    warranty: DEFAULT_WARRANTY,
    qty: String(qty),
    unitPrice: total ? String(round2(total / qty)) : "",
    // The order's own Price (or Cost) is the line amount, so it matches the
    // sheet exactly instead of being rebuilt from a rounded unit price
    amount: String(round2(total)),
  };
};

// The warranty printed under an item: the shared one when it applies to all
export const itemWarranty = (form, item) =>
  text(form.warrantyForAll ? form.warranty : item.warranty);

export const itemAmount = (item) =>
  item.amount !== undefined && item.amount !== ""
    ? round2(num(item.amount))
    : round2(num(item.qty) * num(item.unitPrice));

export const getTotals = (form) => {
  const subtotal = round2(
    (form.items || []).reduce((acc, item) => acc + itemAmount(item), 0),
  );
  const discount = num(form.discount);
  const extra = num(form.pkgCharges);
  const tax = num(form.tax);
  const shipping = num(form.shipping);
  return {
    subtotal,
    discount,
    extra,
    tax,
    shipping,
    total: round2(subtotal - discount + extra + tax + shipping),
  };
};

// ---------------------------------------------------------------------------
// Vendor contact details are not on the sheet: remember what was typed per vendor
// ---------------------------------------------------------------------------
const VENDOR_STORAGE_KEY = "poVendorDetails";
export const VENDOR_FIELDS = [
  "vendorContact",
  "vendorAddress",
  "vendorPhone",
  "vendorEmail",
];

export const getSavedVendor = (vendorName) => {
  try {
    const saved = JSON.parse(localStorage.getItem(VENDOR_STORAGE_KEY) || "{}");
    return saved[text(vendorName).toLowerCase()] || {};
  } catch {
    return {};
  }
};

export const saveVendor = (vendorName, details) => {
  const key = text(vendorName).toLowerCase();
  if (!key) return;
  try {
    const saved = JSON.parse(localStorage.getItem(VENDOR_STORAGE_KEY) || "{}");
    saved[key] = VENDOR_FIELDS.reduce(
      (acc, field) => ({ ...acc, [field]: text(details[field]) }),
      {},
    );
    localStorage.setItem(VENDOR_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Storage unavailable: the details just are not remembered
  }
};

// Item descriptions are not on the sheet either: remember them per Part#
const DESCRIPTION_STORAGE_KEY = "docPartDescriptions";

export const getSavedDescription = (partNo) => {
  const key = text(partNo).toLowerCase();
  if (!key) return "";
  try {
    const saved = JSON.parse(
      localStorage.getItem(DESCRIPTION_STORAGE_KEY) || "{}",
    );
    return saved[key] || "";
  } catch {
    return "";
  }
};

export const saveDescriptions = (items) => {
  try {
    const saved = JSON.parse(
      localStorage.getItem(DESCRIPTION_STORAGE_KEY) || "{}",
    );
    items.forEach((item) => {
      const key = text(item.sku).toLowerCase();
      if (key && text(item.description)) saved[key] = text(item.description);
    });
    localStorage.setItem(DESCRIPTION_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Storage unavailable: descriptions just are not remembered
  }
};

// ---------------------------------------------------------------------------
// Initial form data
// ---------------------------------------------------------------------------
export const buildCustomerForm = (type, family, clicked) => {
  const main = family[0] || clicked || {};
  const pick = (field) => text(main?.[field]) || firstValue(family, field);
  const company = pick("Customer Company") || pick("Customer");

  return {
    docNumber: pick("Order#"),
    date: pick("Order Date") || formatToday(),
    poNumber: pick("Customer PO#"),
    // The order's Payment Status goes in the Payment terms box
    paymentTerms: pick("Payment Status"),
    shippingMethod: pick("Carrier"),
    salesRep: pick("Sales Agent"),
    // Bill To: first line typed by the user, then the address one part per line
    billToName: "",
    billTo: splitAddress(pick("Bill to address")),
    // Ship To: Customer Company, then the address one part per line
    shipTo: partyBlock(company, splitAddress(pick("Ship to address"))),
    items: family.map((order) => orderToItem(order)),
    warranty: type === "proforma" ? DEFAULT_WARRANTY : "",
    warrantyForAll: true,
    note: DEFAULT_NOTE,
    discount: "0",
    tax: String(sumField(family, "Tax")),
    shipping: String(sumField(family, "Shipping")),
  };
};

export const buildPurchaseOrderForm = (selected, clicked) => {
  const main = selected[0] || clicked || {};
  const pick = (field) => text(main?.[field]) || firstValue(selected, field);
  const vendor = pick("Vendor");
  const saved = getSavedVendor(vendor);
  const company = pick("Customer Company") || pick("Customer");

  return {
    docNumber: pick("Vendor order#") || pick("Order#"),
    date: pick("Order Date") || formatToday(),
    vendorCompany: vendor,
    vendorContact: saved.vendorContact || "",
    vendorAddress: saved.vendorAddress || "",
    vendorPhone: saved.vendorPhone || "",
    vendorEmail: saved.vendorEmail || "",
    shipTo: partyBlock(company, splitAddress(pick("Ship to address"))),
    requisitioner: pick("Procured By"),
    shippedVia: pick("Carrier"),
    shippingMethod: "",
    items: selected.map((order) => orderToItem(order, { useCost: true })),
    warranty: DEFAULT_WARRANTY,
    warrantyForAll: true,
    comments: "",
    pkgCharges: "0",
    tax: String(sumField(selected, "Vendor Tax")),
    shipping: String(sumField(selected, "Vendor Shipping")),
  };
};

// Fields that must be filled before the PDF can be generated
export const REQUIRED_FIELDS = {
  proforma: ["docNumber", "date", "paymentTerms", "billToName", "billTo", "shipTo"],
  packing: ["docNumber", "date", "shippingMethod", "billToName", "billTo", "shipTo"],
  po: [
    "docNumber",
    "date",
    "vendorCompany",
    "vendorAddress",
    "shipTo",
    "shippedVia",
  ],
};
// SKU, Qty and Unit price come straight from the order and are not editable,
// so only the description has to be typed in
const REQUIRED_ITEM_FIELDS = {
  proforma: ["description"],
  packing: ["description"],
  po: ["description"],
};

export const isItemFieldRequired = (type, field) =>
  REQUIRED_ITEM_FIELDS[type].includes(field);

// { fieldName: true } and { itemKey: { field: true } } for everything missing
export const findMissing = (type, form) => {
  const fields = {};
  REQUIRED_FIELDS[type].forEach((field) => {
    if (!text(form[field])) fields[field] = true;
  });
  const items = {};
  (form.items || []).forEach((item) => {
    REQUIRED_ITEM_FIELDS[type].forEach((field) => {
      const value = text(item[field]);
      const missing =
        field === "qty" || field === "unitPrice"
          ? !value || num(value) <= 0
          : !value;
      if (missing) items[item.key] = { ...(items[item.key] || {}), [field]: true };
    });
  });
  const count =
    Object.keys(fields).length +
    Object.values(items).reduce((acc, f) => acc + Object.keys(f).length, 0) +
    ((form.items || []).length === 0 ? 1 : 0);
  return { fields, items, count, noItems: (form.items || []).length === 0 };
};

// ---------------------------------------------------------------------------
// PDF drawing (US Letter, points) — laid out like the Server Blink templates
// ---------------------------------------------------------------------------
const NAVY = [7, 55, 99];
const DEEP_NAVY = [0, 32, 96];
const HEADING = [31, 73, 125];
const LABEL_GREY = [128, 128, 128];
const BLACK = [0, 0, 0];
const WHITE = [255, 255, 255];
const LINK = [5, 99, 193];
const RED = [230, 0, 0];
const PAGE_TOP = 40;
const PAGE_BOTTOM = 40;
// Titles use condensed bold like the templates
const TITLE_SCALE = 0.72;
const LOGO_RATIO = 188 / 455;

const font = (doc, size, style = "normal", color = BLACK) => {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
};

let logoPromise = null;
const loadLogo = () => {
  if (!logoPromise) {
    logoPromise = fetch(logoUrl)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((buf) => (buf ? new Uint8Array(buf) : null))
      .catch(() => null)
      .then((logo) => {
        if (!logo) logoPromise = null; // try again next time
        return logo;
      });
  }
  return logoPromise;
};

// Logo, then address / phone / website lines under it
const drawCompany = (doc, logo, { x, y, w, textX, lines, size, linkSize }) => {
  if (logo) {
    doc.addImage(logo, "PNG", x, y, w, w * LOGO_RATIO);
  } else {
    font(doc, 20, "bold", NAVY);
    doc.text(COMPANY.name, x, y + 30);
  }
  font(doc, size);
  doc.text(COMPANY.address, textX, lines[0]);
  doc.text(`PH : ${COMPANY.phone} | EM: ${COMPANY.email}`, textX, lines[1]);
  font(doc, linkSize, "normal", LINK);
  doc.textWithLink(COMPANY.website, textX, lines[2], {
    url: `https://${COMPANY.website}`,
  });
  const linkW = doc.getTextWidth(COMPANY.website);
  doc.setDrawColor(...LINK);
  doc.setLineWidth(0.5);
  doc.line(textX, lines[2] + 1.5, textX + linkW, lines[2] + 1.5);
};

// Condensed navy title; anchored by its right edge, or left edge with align "left"
const drawTitle = (doc, title, x, baseline, size, align = "right") => {
  font(doc, size, "bold", NAVY);
  const width = doc.getTextWidth(title) * TITLE_SCALE;
  doc.text(title, align === "right" ? x - width : x, baseline, {
    horizontalScale: TITLE_SCALE,
  });
  // The horizontal scale (Tz) stays in the PDF text state; reset it or every
  // later line is squeezed while being measured at full width
  doc.internal.write("100 Tz");
};

// Black-bordered box of bold labels with right-aligned values
const drawMetaBox = (doc, rows, { x, y, w, rowH, labelSize, valueSize }) => {
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(1.3);
  doc.rect(x, y, w, rowH * rows.length);
  rows.forEach(([label, value], i) => {
    const baseline = y + rowH * i + rowH * 0.72;
    font(doc, labelSize, "bold");
    doc.text(label, x + 3, baseline);
    const labelW = doc.getTextWidth(label);
    font(doc, valueSize);
    const shown = text(value) || "-";
    const fitted = doc.splitTextToSize(shown, w - labelW - 10)[0];
    doc.text(fitted, x + w - 2.5, baseline, { align: "right" });
  });
  return y + rowH * rows.length;
};

// "Bill To:" style block: grey heading, first line bold; returns last baseline
const drawParty = (
  doc,
  heading,
  body,
  { x, y, w, headSize, size, lineH, headColor = LABEL_GREY, headStyle = "bold" },
) => {
  font(doc, headSize, headStyle, headColor);
  doc.text(heading, x, y);
  let baseline = y;
  text(body)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      font(doc, size, index === 0 ? "bold" : "normal");
      doc.splitTextToSize(line, w).forEach((part) => {
        baseline += lineH;
        doc.text(part, x, baseline);
      });
    });
  return baseline;
};

// Vendor block of the PO: "Label: value" lines, address continued underneath
const drawVendor = (doc, form, { x, y, w, headSize, size, lineH }) => {
  font(doc, headSize, "bold", HEADING);
  doc.text("Vendor:", x, y);
  font(doc, size);
  const addressLines = text(form.vendorAddress)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const lines = [
    `Company Name: ${text(form.vendorCompany)}`,
    text(form.vendorContact) && `Vendor Name: ${text(form.vendorContact)}`,
    addressLines.length && `Address: ${addressLines[0]}`,
    ...addressLines.slice(1),
    text(form.vendorPhone) && `Office Phone Number: ${text(form.vendorPhone)}`,
    text(form.vendorEmail) && `Email: ${text(form.vendorEmail)}`,
  ].filter(Boolean);
  let baseline = y + 2;
  lines.forEach((line) =>
    doc.splitTextToSize(line, w).forEach((part) => {
      baseline += lineH;
      doc.text(part, x, baseline);
    }),
  );
  return baseline;
};

// Starts a new page when `needed` points do not fit below y
const ensureSpace = (doc, y, needed) => {
  if (y + needed > doc.internal.pageSize.getHeight() - PAGE_BOTTOM) {
    doc.addPage();
    return PAGE_TOP;
  }
  return y;
};

// Navy header row over bordered value cells (Requisitioner / Shipped Via ...)
const drawInfoStrip = (doc, cells, { x, y, widths, headSize, valueSize, valueStyle }) => {
  autoTable(doc, {
    startY: y,
    margin: { left: x, right: 0 },
    tableWidth: widths.reduce((a, b) => a + b, 0),
    head: [cells.map(([label]) => label)],
    body: [cells.map(([, value]) => text(value) || "-")],
    theme: "plain",
    styles: {
      halign: "center",
      lineColor: NAVY,
      lineWidth: 1.3,
      textColor: BLACK,
      cellPadding: { top: 2.5, bottom: 2, left: 3, right: 3 },
    },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "normal", fontSize: headSize },
    bodyStyles: { fontSize: valueSize },
    columnStyles: Object.fromEntries(widths.map((w, i) => [i, { cellWidth: w }])),
    didParseCell: (data) => {
      if (data.section === "body" && valueStyle) valueStyle(data);
    },
  });
  return doc.lastAutoTable.finalY;
};

// Items table: navy header, navy column dividers, no row lines, breathing room
// above the first row and below the last
const drawItemsTable = (
  doc,
  { x, y, widths, head, body, headSize, headFill = NAVY, size, rowPad, columnStyles = {}, boldLines = {} },
) => {
  const tableW = widths.reduce((a, b) => a + b, 0);
  const lastRow = body.length - 1;
  autoTable(doc, {
    startY: y,
    margin: { left: x, right: 0, top: PAGE_TOP, bottom: PAGE_BOTTOM },
    tableWidth: tableW,
    head: [head],
    body,
    theme: "plain",
    styles: {
      halign: "center",
      valign: "top",
      fontSize: size,
      textColor: BLACK,
      lineColor: NAVY,
      lineWidth: { left: 1.6, right: 1.6, top: 0, bottom: 0 },
      cellPadding: { top: rowPad, bottom: rowPad, left: 4, right: 4 },
    },
    headStyles: {
      fillColor: headFill,
      textColor: WHITE,
      fontStyle: "normal",
      fontSize: headSize,
      valign: "middle",
      lineWidth: 0,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    columnStyles: {
      ...Object.fromEntries(widths.map((w, i) => [i, { cellWidth: w }])),
      ...columnStyles,
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const pad = { ...data.cell.styles.cellPadding };
      if (data.row.index === 0) pad.top = rowPad + 8;
      if (data.row.index === lastRow) pad.bottom = rowPad + 8;
      data.cell.styles.cellPadding = pad;
      const bold = boldLines[`${data.row.index}:${data.column.index}`];
      if (bold === "all") data.cell.styles.fontStyle = "bold";
    },
    // Lines listed in boldLines ("row:col" → index of the first bold line) are
    // drawn bold on top of the normal text
    willDrawCell: (data) => {
      if (data.section !== "body") return;
      const from = boldLines[`${data.row.index}:${data.column.index}`];
      if (typeof from !== "number") return;
      data.cell.boldTail = data.cell.text.slice(from);
      data.cell.text = data.cell.text.slice(0, from);
    },
    didDrawCell: (data) => {
      const tail = data.cell.boldTail;
      if (!tail?.length) return;
      const { cell } = data;
      const lineH = (cell.styles.fontSize * doc.getLineHeightFactor()) / doc.internal.scaleFactor;
      const startY =
        cell.y + cell.padding("top") + (cell.text.length + 0.78) * lineH;
      font(doc, cell.styles.fontSize, "bold");
      tail.forEach((line, i) =>
        doc.text(line, cell.x + cell.width / 2, startY + i * lineH, {
          align: "center",
        }),
      );
    },
    // Close the box at the bottom of every page the table is on
    didDrawPage: (data) => {
      doc.setDrawColor(...NAVY);
      doc.setLineWidth(1.6);
      doc.line(x, data.cursor.y, x + tableW, data.cursor.y);
    },
  });
  return doc.lastAutoTable.finalY;
};

// Subtotal ... Total grid; the last row is the total
const drawTotalsGrid = (doc, rows, { x, y, widths, labelSize, valueSize, totalFill }) => {
  const last = rows.length - 1;
  autoTable(doc, {
    startY: y,
    margin: { left: x, right: 0 },
    tableWidth: widths[0] + widths[1],
    body: rows,
    theme: "plain",
    styles: {
      lineColor: totalFill ? LABEL_GREY : NAVY,
      lineWidth: 0.8,
      cellPadding: { top: 2, bottom: 1.6, left: 2, right: 2 },
      textColor: BLACK,
    },
    columnStyles: {
      0: { cellWidth: widths[0], fontSize: labelSize, textColor: LABEL_GREY },
      1: { cellWidth: widths[1], fontSize: valueSize, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.row.index !== last) return;
      data.cell.styles.fontStyle = "bold";
      if (totalFill) {
        data.cell.styles.fillColor = totalFill;
        data.cell.styles.textColor = WHITE;
      } else if (data.column.index === 0) {
        data.cell.styles.textColor = BLACK;
      }
    },
  });
  return doc.lastAutoTable.finalY;
};

// Footer line printed right under the content, like the templates
const drawFooterLine = (doc, y, size) => {
  font(doc, size, "normal", LABEL_GREY);
  doc.text(
    `Tel: ${COMPANY.phone} | EM: ${COMPANY.email} | Web: ${COMPANY.website}`,
    doc.internal.pageSize.getWidth() / 2,
    y,
    { align: "center" },
  );
};

// "Page 1 of 2" when a document runs over one page
const drawPageNumbers = (doc) => {
  const pages = doc.getNumberOfPages();
  if (pages < 2) return;
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    font(doc, 7.5, "normal", LABEL_GREY);
    doc.text(`Page ${i} of ${pages}`, w - 40, h - 20, { align: "right" });
  }
};

// Description cells with each item's warranty as a bold line underneath;
// boldLines tells the table where the bold part starts in each cell
const descriptionCells = (doc, form, fontSize, width) => {
  const boldLines = {};
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  const cells = form.items.map((item, row) => {
    const desc = text(item.description);
    const warranty = itemWarranty(form, item);
    if (!warranty) return desc;
    boldLines[`${row}:1`] = desc ? doc.splitTextToSize(desc, width).length : 0;
    return desc ? `${desc}\n${warranty}` : warranty;
  });
  return { cells, boldLines };
};

const newDoc = () => new jsPDF({ unit: "pt", format: "letter" });

const money = (n) => formatMoney(n);

export const generatePurchaseOrder = async (form) => {
  const doc = newDoc();
  const logo = await loadLogo();
  const L = 52;

  drawCompany(doc, logo, {
    x: 58,
    y: 50,
    w: 200,
    textX: 92,
    lines: [152, 164, 176],
    size: 7.1,
    linkSize: 7.8,
  });
  drawTitle(doc, `PURCHASE ORDER # ${text(form.docNumber)}`, 556, 93, 19.5);
  font(doc, 10);
  const dateValue = text(form.date);
  doc.text(dateValue, 557, 107, { align: "right" });
  doc.text("Date:", 557 - doc.getTextWidth(dateValue) - 10, 107, {
    align: "right",
  });

  const vendorEnd = drawVendor(doc, form, {
    x: L,
    y: 217,
    w: 330,
    headSize: 13,
    size: 7.8,
    lineH: 11.4,
  });
  font(doc, 13, "bold", HEADING);
  doc.text("Ship To", 441, 217);
  let shipEnd = 219;
  text(form.shipTo)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      font(doc, 7.8, index === 0 ? "bold" : "normal");
      doc.splitTextToSize(line, 117).forEach((part) => {
        shipEnd += 11.4;
        doc.text(part, 441, shipEnd);
      });
    });

  let y = drawInfoStrip(
    doc,
    [
      ["Requisitioner", form.requisitioner],
      ["Shipped Via", form.shippedVia],
      ["Shipping Method", form.shippingMethod],
    ],
    {
      x: L,
      y: Math.max(312, Math.max(vendorEnd, shipEnd) + 22),
      widths: [103, 283, 120],
      headSize: 8.4,
      valueSize: 7.8,
    },
  );

  const { cells, boldLines } = descriptionCells(doc, form, 7.8, 198);
  const body = form.items.map((item, row) => [
    text(item.sku),
    cells[row],
    text(item.condition) || "-",
    text(item.qty),
    money(item.unitPrice),
    money(itemAmount(item)),
  ]);
  y = drawItemsTable(doc, {
    x: L,
    y: y + 12,
    widths: [103, 206, 43, 36, 60, 58],
    head: ["SKU", "Description", "Cond", "Qty", "Unit Price", "Amount"],
    body,
    headSize: 8.4,
    size: 7.8,
    rowPad: 6,
    columnStyles: { 4: { fontSize: 8.4 }, 5: { fontSize: 8.4 } },
    boldLines,
  });

  // Comments box (left) and totals (right)
  y = ensureSpace(doc, y + 16, 90);
  const top = y;
  const boxW = 310;
  doc.setFillColor(...NAVY);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1.3);
  doc.rect(L, top, boxW, 13.4, "FD");
  font(doc, 8.4, "normal", WHITE);
  doc.text("Comments or Special Instructions", L + 2, top + 9.8);
  font(doc, 7.4, "bold");
  const commentLines = text(form.comments)
    .split("\n")
    .flatMap((line) => doc.splitTextToSize(line, boxW - 6));
  const rowCount = Math.max(4, commentLines.length);
  for (let i = 0; i < rowCount; i += 1) {
    const rowTop = top + 13.4 + i * 13.4;
    doc.rect(L, rowTop, boxW, 13.4);
    if (commentLines[i]) doc.text(commentLines[i], L + 2, rowTop + 9.6);
  }

  const totals = getTotals(form);
  drawTotalsGrid(
    doc,
    [
      ["Subtotal", money(totals.subtotal)],
      ["PKCG Charges", money(totals.extra)],
      ["Tax", money(totals.tax)],
      ["Shipping", money(totals.shipping)],
      ["Total", money(totals.total)],
    ],
    { x: 438, y: top, widths: [62, 58], labelSize: 7.4, valueSize: 8.6 },
  );

  drawPageNumbers(doc);
  doc.save(`${DOC_TYPES.po.filePrefix} ${text(form.docNumber)}.pdf`);
};

export const generatePackingSlip = async (form) => {
  const doc = newDoc();
  const logo = await loadLogo();
  const L = 52;

  drawCompany(doc, logo, {
    x: 62,
    y: 60,
    w: 228,
    textX: 53,
    lines: [181, 195, 210],
    size: 8.4,
    linkSize: 9.2,
  });
  drawTitle(doc, "Packing Slip", 384, 122, 30, "left");
  drawMetaBox(
    doc,
    [
      ["Order#", form.docNumber],
      ["Date:", form.date],
      ["PO #", form.poNumber],
      ["Shipping:", form.shippingMethod],
    ],
    { x: 379, y: 199, w: 179, rowH: 14.5, labelSize: 9.8, valueSize: 9.4 },
  );

  const party = { y: 283, headSize: 10, size: 9.2, lineH: 13.6 };
  const billEnd = drawParty(doc, "Bill To:", partyBlock(form.billToName, form.billTo), { ...party, x: 53, w: 300 });
  const shipEnd = drawParty(doc, "Ship To:", form.shipTo, { ...party, x: 382, w: 176 });

  let y = drawItemsTable(doc, {
    x: L,
    y: Math.max(380, Math.max(billEnd, shipEnd) + 28),
    widths: [126, 263, 117],
    head: ["SKU", "Description", "Qty"],
    body: form.items.map((item) => [
      text(item.sku),
      text(item.description),
      text(item.qty),
    ]),
    headSize: 10.2,
    headFill: DEEP_NAVY,
    size: 9.2,
    rowPad: 7.8,
  });

  y = ensureSpace(doc, y + 11, 30);
  if (text(form.note)) {
    font(doc, 7.6, "normal", [90, 90, 90]);
    doc.text(`Note: ${text(form.note)}`, 53, y);
  }
  drawFooterLine(doc, y + 14, 8.6);

  drawPageNumbers(doc);
  doc.save(`${DOC_TYPES.packing.filePrefix} ${text(form.docNumber)}.pdf`);
};

export const generateProformaInvoice = async (form) => {
  const doc = newDoc();
  const logo = await loadLogo();
  const L = 20;

  drawCompany(doc, logo, {
    x: 38,
    y: 72,
    w: 164,
    textX: 20,
    lines: [159, 176, 192],
    size: 7.8,
    linkSize: 8.6,
  });
  drawTitle(doc, `Proforma Invoice # ${text(form.docNumber)}`, 549, 82, 27);
  drawMetaBox(
    doc,
    [
      ["Invoice#", form.docNumber],
      ["PO#", form.poNumber],
      ["Date:", form.date],
      ["Payment:", form.paymentTerms],
      ["Shipping:", form.shippingMethod],
    ],
    { x: 418, y: 115, w: 134, rowH: 16.4, labelSize: 9.2, valueSize: 8.6 },
  );

  const party = { y: 221, headSize: 9.2, size: 8.6, lineH: 12.6 };
  const billEnd = drawParty(doc, "Bill To:", partyBlock(form.billToName, form.billTo), { ...party, x: 20, w: 380 });
  const shipEnd = drawParty(doc, "Ship To:", form.shipTo, { ...party, x: 420, w: 132 });

  let y = drawInfoStrip(
    doc,
    [
      ["Sales Rep.", form.salesRep],
      ["Payment Status", PROFORMA_PAYMENT_STATUS],
      ["Tracking", PROFORMA_TRACKING],
    ],
    {
      x: L,
      y: Math.max(300, Math.max(billEnd, shipEnd) + 16),
      widths: [115, 283, 134],
      headSize: 9.2,
      valueSize: 8.6,
      valueStyle: (data) => {
        const status = String(data.cell.raw || "").toLowerCase();
        // Unpaid / due / pending / overdue in red, like the template's "UnPaid"
        if (
          data.column.index === 1 &&
          /un\s*-?\s*paid|due|pending|partial/.test(status)
        ) {
          data.cell.styles.textColor = RED;
          data.cell.styles.fontStyle = "bold";
        }
      },
    },
  );

  const { cells, boldLines } = descriptionCells(doc, form, 8.6, 222);
  const body = form.items.map((item, row) => [
    text(item.sku),
    cells[row],
    text(item.qty),
    money(item.unitPrice),
    money(itemAmount(item)),
  ]);
  y = drawItemsTable(doc, {
    x: L,
    y,
    widths: [115, 230, 53, 69, 65],
    head: ["SKU", "Description", "QTY.", "Unit Price", "Amount"],
    body,
    headSize: 9.2,
    size: 8.6,
    rowPad: 7.8,
    columnStyles: { 3: { fontSize: 9.2 }, 4: { fontSize: 9.2 } },
    boldLines,
  });

  if (text(form.note)) {
    font(doc, 7, "normal", [90, 90, 90]);
    doc.text(`Note: ${text(form.note)}`, 20, y + 8);
  }

  // Bank details (left) and totals (right)
  y = ensureSpace(doc, y + 14, 18 + COMPANY.bank.length * 14.4);
  const top = y;
  doc.setFillColor(...NAVY);
  doc.rect(L, top, 345, 14.5, "F");
  font(doc, 11, "bold", WHITE);
  doc.text(`${COMPANY.name} - Bank Details`, L + 2, top + 11);
  let bankY = top + 26;
  COMPANY.bank.forEach(([label, value]) => {
    font(doc, 9.2, "bold");
    const labelText = `${label}: `;
    doc.text(labelText, L + 2, bankY);
    const labelW = doc.getTextWidth(labelText);
    font(doc, 9.2);
    doc.text(value, L + 2 + labelW, bankY);
    bankY += 14.4;
  });

  const totals = getTotals(form);
  drawTotalsGrid(
    doc,
    [
      ["Subtotal", money(totals.subtotal)],
      ["Discount", money(totals.discount)],
      ["Tax", money(totals.tax)],
      ["Shipping", money(totals.shipping)],
      ["Total", money(totals.total)],
    ],
    {
      x: 418,
      y: top,
      widths: [69, 65],
      labelSize: 7.8,
      valueSize: 9.2,
      totalFill: DEEP_NAVY,
    },
  );

  drawFooterLine(doc, bankY - 1, 7);
  drawPageNumbers(doc);
  doc.save(`${DOC_TYPES.proforma.filePrefix} ${text(form.docNumber)}.pdf`);
};

export const GENERATORS = {
  proforma: generateProformaInvoice,
  packing: generatePackingSlip,
  po: generatePurchaseOrder,
};
