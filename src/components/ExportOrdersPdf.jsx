import React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";

// Field order jaise PDF mein dikhana hai (grouped logically)
const FIELD_GROUPS = [
    {
        title: "Order Info",
        fields: [
            "Order#", "Order Date", "Charged Date", "Refund Date",
            "Lead Source", "Order Source", "Procured By", "Sales Agent",
            "Invoice#", "Payment Status", "Order Status", "Reasons (IF any)",
        ],
    },
    {
        title: "Product",
        fields: [
            "Brands", "Category", "part#", "Qty", "Condition",
        ],
    },
    {
        title: "Customer",
        fields: [
            "Customer", "Customer Company", "Email", "Phone",
            "Bill to address", "Ship to address", "City", "State", "Country",
        ],
    },
    {
        title: "Shipping",
        fields: [
            "Shipping A/C", "Carrier", "Tracking",
        ],
    },
    {
        title: "Pricing",
        fields: [
            "Price", "Shipping", "Tax", "Total Price",
            "CC/Paypal 4%", "Paid Via",
        ],
    },
    {
        title: "Vendor & Cost",
        fields: [
            "Vendor", "Vendor order#", "Vendor Part#", "Charged Vendor",
            "Cost", "Vendor Shipping", "Vendor Tax",
            "Total Cost", "Total Cost+4%",
        ],
    },
    {
        title: "Profit",
        fields: [
            "Gross Profit", "Gross Profit-4%", "Profit %",
        ],
    },
    {
        title: "Notes",
        fields: [
            "Check/Invoice", "Entry Check", "Attached To Order",
            "Entry Reason", "Comment",
        ],
    },
];

// Value ko display-ready string banao
const formatValue = (val) => {
    if (val === null || val === undefined || val === "") return "—";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (typeof val === "number") return Number.isFinite(val) ? String(val) : "—";
    if (typeof val === "string") return val.trim() === "" ? "—" : val;

    if (typeof val === "object") {
        if (Array.isArray(val)) {
            const parts = val.map(formatValue).filter((v) => v !== "—");
            return parts.length ? parts.join(", ") : "—";
        }

        // Mongo Decimal128
        if (val.$numberDecimal != null) return formatValue(val.$numberDecimal);

        // Common money shapes: { amount }, { value }, { price }, { total }
        const money =
            val.amount ?? val.value ?? val.price ?? val.total ?? val.formatted;
        if (money != null && typeof money !== "object") {
            const currency = val.currency ?? val.symbol ?? val.code ?? "";
            return currency ? `${currency} ${money}` : String(money);
        }

        // Decimal.js / similar
        if (typeof val.toNumber === "function") {
            try {
                return String(val.toNumber());
            } catch (_) {}
        }
        if (typeof val.toFixed === "function" && typeof val !== "number") {
            try {
                return val.toFixed(2);
            } catch (_) {}
        }

        // Single-key wrapper: { Price: 120 } or { data: "..." }
        const keys = Object.keys(val);
        if (keys.length === 1) return formatValue(val[keys[0]]);

        // Last resort so you can see the real shape instead of [object Object]
        try {
            return JSON.stringify(val);
        } catch {
            return "—";
        }
    }

    return String(val);
};

const ExportOrdersPdf = ({ orders = [], fileName = "orders-export.pdf", label = "Export PDF" }) => {
    const handleExport = () => {
        if (!orders || orders.length === 0) {
            alert("No orders to export.");
            return;
        }

        const doc = new jsPDF({
            orientation: "portrait",
            unit: "pt",
            format: "a4",
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const marginX = 40;

        orders.forEach((order, index) => {
            if (index > 0) doc.addPage();

            let cursorY = 50;

            // ===== Header =====
            doc.setFillColor(79, 70, 229); // indigo-600
            doc.rect(0, 0, pageWidth, 70, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text(`Order #${formatValue(order["Order#"])}`, marginX, 38);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text(
                `Order Date: ${formatValue(order["Order Date"])}   |   Order Status: ${formatValue(order["Order Status"])}`,
                marginX,
                55
            );

            // page counter (top right)
            doc.setFontSize(8);
            doc.text(`Page ${index + 1} of ${orders.length}`, pageWidth - marginX, 55, {
                align: "right",
            });

            cursorY = 90;

            // ===== Har group ki table =====
            FIELD_GROUPS.forEach((group) => {
                const rows = group.fields.map((field) => [
                    field,
                    formatValue(order[field]),
                ]);

                autoTable(doc, {
                    startY: cursorY,
                    head: [[{ content: group.title, colSpan: 2 }]],
                    body: rows,
                    theme: "grid",
                    margin: { left: marginX, right: marginX },
                    styles: {
                        fontSize: 8,
                        cellPadding: 3,
                        overflow: "linebreak",
                        valign: "top",
                    },
                    headStyles: {
                        fillColor: [243, 244, 246], // gray-100
                        textColor: [55, 65, 81], // gray-700
                        fontStyle: "bold",
                        fontSize: 9,
                    },
                    columnStyles: {
                        0: { cellWidth: 130, fontStyle: "bold", textColor: [107, 114, 128] },
                        1: { cellWidth: pageWidth - marginX * 2 - 130 },
                    },
                    didDrawPage: (data) => {
                        cursorY = data.cursor.y;
                    },
                });

                cursorY = doc.lastAutoTable.finalY + 12;
            });
        });

        doc.save(fileName);
    };

    return (
        <button
            onClick={handleExport}
            style={{ padding: '8px 16px', background: '#e11d48', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: "center" }}

        >
            {label}
        </button>
    );
};

export default ExportOrdersPdf;