import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { HotTable } from '@handsontable/react-wrapper';
import { registerAllModules } from 'handsontable/registry';
import { useDispatch, useSelector } from 'react-redux';
import autoTable from 'jspdf-autotable';   // ← Changed import
import EditOrderDetailModal from './EditOrderDetailModal';
import Handsontable from 'handsontable';
import { fetchOrdersAdmin, fetchOrders, postOrderFiles, updateOrderFiles, createGenerateId, postSyncOrder, importOrderFiles, fetchOrderOptions } from '../store/usersSlice';
// import { columnsOfSheet, getFieldChecked, getFieldValue, getIsAdmin } from '../utils/constant';
// import { columnsOfSheet, getFieldChecked, getFieldValue, getFieldHighlight, getIsAdmin } from '../utils/constant';
import {
  columnsOfSheet,
  getFieldChecked,
  getFieldValue,
  getFieldHighlight,
  getIsAdmin,
  CHECKBOX_FIELDS,
  applySavedCheckboxState,
  saveCheckboxState,
} from "../utils/constant";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import OrderDetailModal from './OrderDetailModal';
import ExportOrdersPdf from './ExportOrdersPdf';
import { fetchOrderTypesMap } from '../store/orderTypeSlice';

registerAllModules();
const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
};

const Orders = [
  {
    "Order#": 12,
    "Charged Date": "",
    "Lead Source": "",
    "Procured By": "",
    "Order Date": "08/14/2026",
    "Refund Date": "",
    "Sales Agent": "",
    "Invoice#": "",
    "Invoice Link": "",
    "Order Source": "",
    "Payment Status": "",
    "Brands": "APC",
    "Category": "SC620I | APC | Smart-UPS Line-Interactive 230V 0.62 kVA 390 W 4 AC outlet(s)",
    "Part#": "SC620I",
    "Qty": "2",
    "Condition": "",
    "Shipping A/C": "",
    "Bill to address": "601 E Main Ave",
    "Ship to address": "601 E Main Ave",
    "City": "Myerstown",
    "State": "Pennsylvania",
    "Country": "United States",
    "Carrier": "",
    "Tracking": "",
    "Status": "",
    "Reasons (IF any)": "",
    "Customer": "Art Muzzy",
    "Customer Company": "Saveway USA",
    "Email": "savewayam@aol.com",
    "Phone": "6104510825",
    "Customer PO#": "",

    // 1
    "Price": { "value": 640, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Shipping": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Tax": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Vendor": "",
    "Vendor order#": "",
    "Vendor Part#": "",

    // 2
    "CC/Paypal 4%": { "value": 25.6, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Charged Vendor": "",
    "Paid Via": "Credit Card (via Stripe)",

    // 3
    "Cost": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Vendor Shipping": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Vendor Tax": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },

    // 4
    "Courier Charges": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Sales Tax": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Warehouse Charges": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Custom Duties": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },

    "Card Payment": { "value": 0, "isHighlight": false },
    "Total Price": {
      value: 640,
      isHighlight: false,    // true because Price is on
      "colorCode": "green"
    },
    "Total Cost": { "value": 0, "isHighlight": false },
    "Total Cost+4%": { "value": 25.6, "isHighlight": false },

    "Gross Profit": 640,
    "Gross Profit-4%": 614.4,
    "Profit %": 96,
    "Check/Invoice": "",
    "Entry Check": "",
    "Attached To Order": "",
    "Entry Reason": "",
    "Comment": "",
    "order_type": "rma"
  },
  {
    "Order#": 2,
    "Charged Date": "",
    "Lead Source": "",
    "Procured By": "",
    "Order Date": "08/14/2026",
    "Refund Date": "",
    "Sales Agent": "",
    "Invoice#": "",
    "Invoice Link": "",
    "Order Source": "",
    "Payment Status": "",
    "Brands": "APC",
    "Category": "SC620I | APC | Smart-UPS Line-Interactive 230V 0.62 kVA 390 W 4 AC outlet(s)",
    "Part#": "SC620I",
    "Qty": "2",
    "Condition": "",
    "Shipping A/C": "",
    "Bill to address": "601 E Main Ave",
    "Ship to address": "601 E Main Ave",
    "City": "Myerstown",
    "State": "Pennsylvania",
    "Country": "United States",
    "Carrier": "",
    "Tracking": "",
    "Status": "",
    "Reasons (IF any)": "",
    "Customer": "Art Muzzy",
    "Customer Company": "Saveway USA",
    "Email": "savewayam@aol.com",
    "Phone": "6104510825",
    "Customer PO#": "",

    // 1
    "Price": { "value": 640, "isTrue": false, "isHighlight": false, },
    "Shipping": { "value": 0, "isTrue": false, "isHighlight": false, },
    "Tax": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Vendor": "",
    "Vendor order#": "",
    "Vendor Part#": "",

    // 2
    "CC/Paypal 4%": { "value": 25.6, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Charged Vendor": "",
    "Paid Via": "Credit Card (via Stripe)",

    // 3
    "Cost": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Vendor Shipping": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Vendor Tax": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },

    // 4
    "Courier Charges": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Sales Tax": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Warehouse Charges": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },
    "Custom Duties": { "value": 0, "isTrue": false, "isHighlight": false, "colorCode": "" },

    "Card Payment": { "value": 0, "isHighlight": false },
    "Total Price": {
      value: 640,
      isHighlight: false,    // true because Price is on
    },
    "Total Cost": { "value": 0, "isHighlight": false },
    "Total Cost+4%": { "value": 25.6, "isHighlight": false },

    "Gross Profit": 640,
    "Gross Profit-4%": 614.4,
    "Profit %": 96,
    "Check/Invoice": "",
    "Entry Check": "",
    "Attached To Order": "",
    "Entry Reason": "",
    "Comment": "",
    "order_type": ""
  }
];
const resolveCellColor = (order, column) => {
  if (!order || !column) return "";

  const getColor = (key) => String(order[key]?.colorCode || "").trim();
  const isOn = (key) =>
    getFieldHighlight(order[key]) || getFieldChecked(order[key]);

  const priceGroup = ["Price", "Shipping", "Tax"];
  const cardGroup = ["Cost", "Vendor Shipping", "Vendor Tax"];
  const costGroup = ["Courier Charges", "Sales Tax", "Warehouse Charges", "Custom Duties"];

  if (priceGroup.includes(column) && isOn(column)) return getColor(column);
  if (column === "Total Price" && priceGroup.some(isOn)) {
    return priceGroup.map(getColor).find(Boolean) || getColor("Total Price");
  }

  if (cardGroup.includes(column) && isOn(column)) return getColor(column);
  if (column === "Card Payment" && cardGroup.some(isOn)) {
    return cardGroup.map(getColor).find(Boolean) || "";
  }

  if (costGroup.includes(column) && isOn(column)) return getColor(column);
  if (column === "Total Cost" && costGroup.some(isOn)) {
    return costGroup.map(getColor).find(Boolean) || "";
  }

  if (column === "CC/Paypal 4%" && isOn(column)) return getColor(column);
  if (column === "Total Cost+4%" && isOn("CC/Paypal 4%")) {
    return getColor("CC/Paypal 4%");
  }

  return "";
};


function OrderListTable({ }) {
  const hotRef = useRef(null);
  const isRightClickRef = useRef(false);
  const isContextMenuOpen = useRef(false);
  const [tableOrders, setTableOrders] = useState(() => applySavedCheckboxState(Orders));
  const dispatch = useDispatch();
  const { orderloading, syncLoading } = useSelector((state) => state.users);
  const { token, storeId, user: authUser } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state?.auth);
  const allowCheck = [1, 2, 3].includes(user?.role_id)
  const { orderTypesMap } = useSelector((state) => state.orderTypes);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isRMAMode, setIsRMAMode] = useState(false);
  const [isCreatePartMode, setIsCreatePartMode] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [showColorFilter, setShowColorFilter] = useState(false);
  const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 });
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [selectionSummary, setSelectionSummary] = useState({
    sum: 0,
    count: 0,
    visible: false,
  });


  // const filteredOrders = useMemo(() => {
  //   if (!Orders) return [];

  //   if (orderTypeFilter === "all") return Orders;

  //   return Orders.filter((order) => {
  //     const type = String(order.order_type || "").toLowerCase();
  //     const status = String(order.Status || "").toLowerCase();
  //     if (orderTypeFilter === "cancelled") return status === "cancelled";
  //     if (orderTypeFilter === "delivered") return status === "delivered";
  //     return type === orderTypeFilter;
  //   });
  // }, [Orders, orderTypeFilter]);


  const filteredOrders = useMemo(() => {
    if (!tableOrders) return [];

    if (orderTypeFilter === "all") return tableOrders;

    return tableOrders.filter((order) => {
      const type = String(order.order_type || "").toLowerCase();
      const status = String(order.Status || "").toLowerCase();
      if (orderTypeFilter === "cancelled") return status === "cancelled";
      if (orderTypeFilter === "delivered") return status === "delivered";
      return type === orderTypeFilter;
    });
  }, [tableOrders, orderTypeFilter]);

  // Add these calculations inside the component (before the return)
  const summary = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) {
      return {
        totalPrice: 0,
        totalCost: 0,
        totalCostPlus4: 0,
        grossProfit: 0,
        grossProfitMinus4: 0,
        count: 0,
      };
    }

    return filteredOrders.reduce(
      (acc, order) => {
        // acc.totalPrice += Number(order["Total Price"] || 0);
        // acc.totalCost += Number(order["Total Cost"] || 0);
        // acc.totalCostPlus4 += Number(order["Total Cost+4%"] || 0);
        // acc.grossProfit += Number(order["Gross Profit"] || 0);
        // acc.grossProfitMinus4 += Number(order["Gross Profit-4%"] || 0);
        acc.totalPrice += Number(getFieldValue(order["Total Price"]) || 0);
        acc.totalCost += Number(getFieldValue(order["Total Cost"]) || 0);
        acc.totalCostPlus4 += Number(getFieldValue(order["Total Cost+4%"]) || 0);
        acc.grossProfit += Number(getFieldValue(order["Gross Profit"]) || 0);
        acc.grossProfitMinus4 += Number(getFieldValue(order["Gross Profit-4%"]) || 0);
        acc.count += 1;
        return acc;
      },
      {
        totalPrice: 0,
        totalCost: 0,
        totalCostPlus4: 0,
        grossProfit: 0,
        grossProfitMinus4: 0,
        count: 0,
      }
    );
  }, [filteredOrders]);

  const handleBeforeOnCellMouseDown = (event, coords, TD) => {
    // Right click (button === 2) → prevent selection
    if (event.button === 2) {
      event.stopImmediatePropagation();   // stops Handsontable from selecting the cell
      return false;
    }
  };
  const handleBeforeOnCellContextMenu = (event) => {
    event.stopImmediatePropagation();
    // Also hide the sum badge
    setSelectionSummary({ sum: 0, count: 0, visible: false });
  };



  const handleAfterGetColHeader = (col, TH, headerLevel) => {
    // Only for the first data columns or any column you want
    const filterButton = TH.querySelector(".changeType"); // Handsontable filter icon

    if (filterButton) {
      filterButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = filterButton.getBoundingClientRect();
        setFilterPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        });
        setShowColorFilter(true);
      };
    }

    if (headerLevel !== 0) return;

    // col index starts from 0 for the first data column (Sno)
    const column = columnsOfSheet[col];
    if (!column) return;

    // Clean previous classes
    TH.classList.remove(
      "htOrderCount",
      "htTotalPrice",
      "htTotalCost",
      "htTotalCost4",
      "htGrossProfit",
      "htGrossProfit4"
    );
    if (column.data === "Order#") {
      TH.classList.add("htOrderCount");
    } else if (column.data === "Total Price") {
      TH.classList.add("htTotalPrice");
    } else if (column.data === "Total Cost") {
      TH.classList.add("htTotalCost");
    } else if (column.data === "Total Cost+4%") {
      TH.classList.add("htTotalCost4");
    } else if (column.data === "Gross Profit") {
      TH.classList.add("htGrossProfit");
    } else if (column.data === "Gross Profit-4%") {
      TH.classList.add("htGrossProfit4");
    }
  };
  const updateSelectionSummary = useCallback(() => {
    if (isRightClickRef.current) return;

    const hot = hotRef.current?.hotInstance;
    if (!hot) return;

    const selected = hot.getSelected();
    if (!selected || selected.length === 0) {
      setSelectionSummary((prev) =>
        prev.visible ? { sum: 0, count: 0, visible: false } : prev
      );
      return;
    }

    let sum = 0;
    let count = 0;
    const [r1, c1, r2, c2] = selected[0];

    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
        const val = parseFloat(hot.getDataAtCell(r, c));
        if (!isNaN(val)) {
          sum += val;
          count++;
        }
      }
    }

    setSelectionSummary((prev) => {
      // Only update state if values actually changed
      if (prev.sum === sum && prev.count === count && prev.visible === count > 1) {
        return prev;
      }
      return {
        sum,
        count,
        visible: count > 1,
      };
    });
  }, []);
  const exportToExcel = () => {
    if (!filteredOrders || filteredOrders.length === 0) return alert("No data to export");

    const ws = XLSX.utils.json_to_sheet(filteredOrders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `Orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  const handleSyncOrders = async () => {

    await dispatch(postSyncOrder({ storeId: storeId?.id, storeName: storeId?.name?.toLowerCase() })).unwrap().then(() => {
      dispatch(fetchOrdersAdmin(storeId?.id));
    })
  };

  const exportToPDF = () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      return alert("No data to export");
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a1'
    });

    doc.setFontSize(14);
    doc.text("CTS Dashboard - Order Sheet", 14, 20);

    const tableColumn = columnsOfSheet.map(col => col.title);
    const tableRows = filteredOrders.map(order =>
      columnsOfSheet.map(col => {
        let value = order[col.data];
        if (value === null || value === undefined) return "";
        return String(value); // full value, no truncation
      })
    );

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: {
        fontSize: 6,
        cellPadding: 1.5,
        overflow: 'linebreak',   // wraps long text instead of cutting it
        valign: 'top'
      },
      headStyles: {
        fillColor: [27, 81, 239],
        fontSize: 7,
        textColor: 255,
        overflow: 'linebreak'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 25, right: 10, bottom: 15, left: 10 },
      tableWidth: 'wrap',
      columnStyles: {
        0: { cellWidth: 22 },
        17: { cellWidth: 45 },
        18: { cellWidth: 45 },
        28: { cellWidth: 40 }
      },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.text(
          `Page ${doc.internal.getNumberOfPages()}`,
          data.settings.margin.left,
          doc.internal.pageSize.getHeight() - 8
        );
      }
    });

    doc.save(`Orders_${new Date().toISOString().slice(0, 10)}.pdf`);
  };
  // Add this handler
  const handleOrderClick = (rowIndex) => {
    // rowIndex from Handsontable is 0-based (header is row 0)
    const actualDataIndex = rowIndex;

    const { order_type, ...clickedOrder } = filteredOrders[actualDataIndex];

    if (clickedOrder) {
      setIsCreatePartMode(false);
      setIsRMAMode(false);
      setSelectedOrder(clickedOrder);
    }
  };
  const importExcel = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx, .xls";

    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const result = await dispatch(importOrderFiles(file)).unwrap();

        alert(result.message || "Excel imported successfully!");

        // Refresh the table
        dispatch(fetchOrdersAdmin(storeId?.id));
      } catch (err) {
        alert(err || "Import failed");
      }
    };

    input.click();
  };
  // const handleSaveCheckedFields = async () => {
  //   const isAdmin = getIsAdmin();

  //   const checkboxFields = [
  //     "Price",
  //     "Shipping",
  //     "Tax",
  //     "Cost",
  //     "Vendor Shipping",
  //     "Vendor Tax",
  //     "Courier Charges",
  //     "Sales Tax",
  //     "Warehouse Charges",
  //     "Custom Duties",
  //     "CC/Paypal 4%",
  //   ];

  //   const payload = (filteredOrders || [])
  //     .map((order) => {
  //       const fields = {};

  //       checkboxFields.forEach((field) => {
  //         const checked = getFieldChecked(order[field]);
  //         const highlighted = getFieldHighlight(order[field]);

  //         // skip if nothing changed
  //         if (checked === highlighted) return;

  //         fields[field] = {
  //           value: getFieldValue(order[field]),
  //           isTrue: checked,
  //           isHighlight: checked, // commit
  //           colorCode: !isAdmin ? "blue" : "",
  //         };
  //       });

  //       if (Object.keys(fields).length === 0) return null;

  //       return {
  //         order_id: order["Order#"],
  //         ...fields,
  //       };
  //     })
  //     .filter(Boolean);

  //   console.log("isAdmin:", isAdmin);
  //   console.log("SAVE PAYLOAD:", payload);

  //   // after a successful API call:
  //   // dispatch(fetchOrdersAdmin(storeId?.id));
  // };
  const handleSaveCheckedFields = async () => {
    const isAdmin = getIsAdmin();
    const hot = hotRef.current?.hotInstance;
    const liveOrders = hot ? hot.getSourceData() : filteredOrders;

    const payload = (liveOrders || [])
      .map((order) => {
        const fields = {};

        CHECKBOX_FIELDS.forEach((field) => {
          const checked = getFieldChecked(order[field]);
          const highlighted = getFieldHighlight(order[field]);

          if (checked === highlighted) return;

          fields[field] = {
            value: getFieldValue(order[field]),
            isTrue: checked,
            isHighlight: checked,
            colorCode: "blue"
          };
        });

        if (Object.keys(fields).length === 0) return null;

        return {
          order_id: order["Order#"],
          ...fields,
        };
      })
      .filter(Boolean);

    console.log("isAdmin:", isAdmin);
    console.log("SAVE PAYLOAD:", payload);

    if (payload.length === 0) {
      alert("Nothing to save");
      return;
    }

    saveCheckboxState(payload);
    setTableOrders(applySavedCheckboxState(Orders));
    alert(`Saved ${payload.length} order(s)`);
  };
  // const ensureColorClass = (color) => {
  //   const safe = String(color).replace(/[^a-zA-Z0-9#-]/g, "");
  //   const className = `dyn-color-${safe}`;
  //   const styleId = `style-${className}`;

  //   if (!document.getElementById(styleId)) {
  //     const style = document.createElement("style");
  //     style.id = styleId;
  //     style.innerHTML = `.handsontable td.${className} { background-color: ${color} !important; }`;
  //     document.head.appendChild(style);
  //   }

  //   return className;
  // };

  const ensureColorClass = (color) => {
    const safe = String(color).replace(/[^a-zA-Z0-9#-]/g, "");
    const className = `dyn-color-${safe}`;
    const styleId = `style-${className}`;

    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
      .handsontable td.cancelled-row.${className},
      .handsontable td.delivered-row.${className},
      .handsontable td.po-row.${className},
      .handsontable td.rma-row.${className},
      .handsontable td.${className} {
        background-color: ${color} !important;
      }
    `;
      document.head.appendChild(style);
    }

    return className;
  };
  const cells = useCallback((row, col) => {
    const order = filteredOrders?.[row];
    const cellProperties = {};
    if (!order) return cellProperties;

    const status = String(order.Status || "").toLowerCase();
    const type = String(order.order_type || "").toLowerCase();

    if (status === "delivered") cellProperties.className = "delivered-row";
    else if (status === "cancelled") cellProperties.className = "cancelled-row";
    else if (type === "po") cellProperties.className = "po-row";
    else if (type === "rma") cellProperties.className = "rma-row";

    const column = columnsOfSheet[col]?.data;
    if (!column) return cellProperties;

    const isOn = (key) =>
      getFieldHighlight(order[key]) || getFieldChecked(order[key]);

    const getColor = (key) => String(order[key]?.colorCode || "").trim();

    const priceGroup = ["Price", "Shipping", "Tax"];
    const cardGroup = ["Cost", "Vendor Shipping", "Vendor Tax"];
    const costGroup = ["Courier Charges", "Sales Tax", "Warehouse Charges", "Custom Duties"];

    const isPriceGroupOn = priceGroup.some(isOn);
    const isCardGroupOn = cardGroup.some(isOn);
    const isCostGroupOn = costGroup.some(isOn);
    const isCcOn = isOn("CC/Paypal 4%");

    const shouldColor =
      (priceGroup.includes(column) && isOn(column)) ||
      (column === "Total Price" && isPriceGroupOn) ||
      (cardGroup.includes(column) && isOn(column)) ||
      (column === "Card Payment" && isCardGroupOn) ||
      (costGroup.includes(column) && isOn(column)) ||
      (column === "Total Cost" && isCostGroupOn) ||
      (column === "CC/Paypal 4%" && isCcOn) ||
      (column === "Total Cost+4%" && isCcOn);

    if (!shouldColor) return cellProperties;

    let color = getColor(column);

    if (column === "Total Price") {
      color = priceGroup.map(getColor).find(Boolean) || color;
    } else if (column === "Card Payment") {
      color = cardGroup.map(getColor).find(Boolean) || color;
    } else if (column === "Total Cost") {
      color = costGroup.map(getColor).find(Boolean) || color;
    } else if (column === "Total Cost+4%") {
      color = getColor("CC/Paypal 4%");
    }

    if (color) {
      cellProperties.className = `${cellProperties.className || ""} ${ensureColorClass(color)}`.trim();
    }

    return cellProperties;
  }, [filteredOrders]);
  const nestedHeaders = useMemo(() => {
    return [
      // Top row (summary)
      columnsOfSheet.map((col) => {
        if (col.data === "Order#") {
          return { label: String(summary.count), colspan: 1 };
        }
        if (col.data === "Total Price") {
          return { label: formatCurrency(summary.totalPrice), colspan: 1 };
        }
        if (col.data === "Total Cost") {
          return { label: formatCurrency(summary.totalCost), colspan: 1 };
        }
        if (col.data === "Total Cost+4%") {
          return { label: formatCurrency(summary.totalCostPlus4), colspan: 1 };
        }
        if (col.data === "Gross Profit") {
          return { label: formatCurrency(summary.grossProfit), colspan: 1 };
        }
        if (col.data === "Gross Profit-4%") {
          return { label: formatCurrency(summary.grossProfitMinus4), colspan: 1 };
        }
        return "";
      }),

      // Second row (titles)
      columnsOfSheet.map((col) => col.title),
    ];
  }, [summary]);
  useEffect(() => {
    const styleId = "dynamic-row-colors";
    let styleTag = document.getElementById(styleId);

    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `
    .handsontable td.po-row {
      background-color: ${orderTypesMap?.po} !important;
    }
    .handsontable td.rma-row {
      background-color: ${orderTypesMap?.rma || "#e5c13e"} !important;
    }
    .handsontable td.cancelled-row {
      background-color: ${orderTypesMap?.cancelled || "#ea8b81"} !important;
    }
    .handsontable td.delivered-row {
      background-color: #86bd93 !important;
    }
  `;
  }, [orderTypesMap?.po,
  orderTypesMap?.rma,
  orderTypesMap?.cancelled]);
  // Fetch options when modal opens
  useEffect(() => {
    if (storeId?.id) {
      dispatch(fetchOrderOptions(storeId?.id));
      dispatch(fetchOrderTypesMap(storeId.id));
    }
  }, [storeId?.id]);
  if (orderloading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Dashboard - Order Sheet</h2>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '60px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #1b51ef',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ fontSize: '16px', color: '#666' }}>Loading orders...</p>
        </div>

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <React.Fragment>
      {/* ========== Custom Color Filter Menu ========== */}
      {showColorFilter && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
            }}
            onClick={() => setShowColorFilter(false)}
          />

          <div
            style={{
              position: "absolute",
              top: filterPosition.top,
              left: filterPosition.left,
              background: "white",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              zIndex: 9999,
              minWidth: "180px",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "8px 12px", fontSize: "12px", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #f3f4f6" }}>
              Filter by Color
            </div>

            {[
              { key: "all", label: "All", color: "#e5e7eb" },
              { key: "po", label: "PO", color: orderTypesMap?.po || "#86efac" },
              { key: "rma", label: "RMA", color: orderTypesMap?.rma || "#e5c13e" },
              { key: "cancelled", label: "Cancelled", color: orderTypesMap?.cancelled || "#ea8b81" },
              { key: "delivered", label: "Delivered", color: "#86bd93" },
            ].map((item) => (
              <div
                key={item.key}
                onClick={() => {
                  setOrderTypeFilter(item.key);
                  setShowColorFilter(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 14px",
                  cursor: "pointer",
                  background: orderTypeFilter === item.key ? "#f3f4f6" : "white",
                  fontSize: "13px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  orderTypeFilter === item.key ? "#f3f4f6" : "white")
                }
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: item.color,
                    border: "1px solid #d1d5db",
                  }}
                />
                <span>{item.label}</span>
                {orderTypeFilter === item.key && (
                  <span style={{ marginLeft: "auto", color: "#4f46e5" }}>✓</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {selectedOrder && (
        <EditOrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSave={(updatedOrderPayload) => {

            const {
              "Total Price": totalPrice,
              "Total Cost": totalCost,
              "Card Payment": cardPayment,
              "Total Cost+4%": totalCostPlus4,
              "Gross Profit": grossProfit,
              "Gross Profit-4%": grossProfitMinus4,
              "Profit %": profitPercent, ...updatedOrder
            } = updatedOrderPayload;
            if (isCreatePartMode) {

              // ========== CREATE API ==========
              dispatch(
                postOrderFiles({
                  payload: { ...updatedOrder, order_type: "po" },
                  role_id: storeId?.id,
                })
              ).unwrap()
                .then(() => {
                  dispatch(fetchOrdersAdmin(storeId?.id));
                  setSelectedOrder(null);
                  setIsCreatePartMode(false);
                })
                .catch((err) => {
                  console.error("Create failed:", err);
                });
            } else if (isRMAMode) {
              dispatch(
                postOrderFiles({
                  payload: { ...updatedOrder, order_type: "rma" },
                  role_id: storeId?.id,
                })
              ).unwrap()
                .then(() => {
                  dispatch(fetchOrdersAdmin(storeId?.id));
                  setSelectedOrder(null);
                  setIsRMAMode(false);
                })
                .catch((err) => {
                  console.error("Create failed:", err);
                });
            } else {
              // ========== UPDATE API ==========
              dispatch(updateOrderFiles({
                id: updatedOrder["Order#"],
                data: updatedOrder,
                role_id: storeId?.id,
              }))
                .unwrap()
                .then(() => {
                  dispatch(fetchOrdersAdmin(storeId?.id));
                  setSelectedOrder(null);
                })
                .catch((err) => {
                  console.error("Update failed:", err);
                });
            }
          }}
        />
      )}
      {isAddMode && (
        <OrderDetailModal
          order={null}
          onClose={() => {
            setIsAddMode(false);
          }}
          onSave={(data, isNew) => {
            if (isNew) {

              dispatch(
                postOrderFiles({
                  payload: data,
                  role_id: storeId?.id,
                })
              ).unwrap()
                .then(() => {
                  dispatch(fetchOrdersAdmin(storeId?.id))
                  setSelectedOrder(null)
                }).catch((err) => {
                  console.error("Update failed:", err);
                });
            }
          }}
        />
      )}
      <div style={{ padding: '20px' }}>
        <div
          style={{
            position: 'sticky',
            top: '0px',
            zIndex: 30,
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            padding: '12px 0',
          }}
        >
          <h2>Dashboard - Order Sheet</h2>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSaveCheckedFields}
              style={{
                padding: "8px 16px",
                background: "#db2777",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Save
            </button>
            <button
              onClick={handleSyncOrders}
              style={{ padding: '8px 16px', background: 'gray', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              {syncLoading ? "Sync..." : "Sync Orders"}
            </button>
            <button
              onClick={exportToExcel}
              style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Download Excel
            </button>
            <button
              onClick={importExcel}
              style={{
                padding: "8px 16px",
                background: "#1b51ef",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Import Excel
            </button>
            <ExportOrdersPdf orders={filteredOrders || []} />

            <button
              onClick={() => setIsAddMode(true)}
              className="bg-indigo-600"
              style={{ padding: '8px 16px', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: "center" }}
            >
              + Add Order
            </button>
          </div>
        </div>
        {/* Summary Bar */}

        {/* ← Add this div with higher z-index control */}
        <div style={{ position: 'relative', zIndex: 10 }}>

          <HotTable
            ref={hotRef}
            // data={Orders || []}
            data={filteredOrders}                 // ← important
            columns={columnsOfSheet}
            style={{ zIndex: 10 }}
            colHeaders={true}
            rowHeaders={false}
            columnSorting={true}
            afterRenderer={(td, row, col) => {
              const order = filteredOrders?.[row];
              const column = columnsOfSheet[col]?.data;
              const color = resolveCellColor(order, column);

              if (color) {
                td.style.backgroundColor = color;
              }
            }}
            fragmentSelection={false}
            afterOnCellMouseDown={(event, coords) => {
              // coords.row === -1 means header was clicked
              if (coords.row === -1) {
                event.stopImmediatePropagation();
              }
            }}
            beforeOnCellMouseDown={(event) => {
              isRightClickRef.current = event.button === 2;
            }}

            beforeOnCellContextMenu={(event) => {
              event.preventDefault(); // only this is needed
              isRightClickRef.current = true; // reset right-click flag
            }}

            afterSelectionEnd={() => {
              // Delay slightly so context menu can open first
              setTimeout(() => {
                if (isRightClickRef.current) {
                  isRightClickRef.current = false;
                  return;
                }
                updateSelectionSummary();
              }, 50);
            }}

            afterDeselect={() => {
              setSelectionSummary((prev) =>
                prev.visible ? { sum: 0, count: 0, visible: false } : prev
              );
            }}

            afterContextMenuHide={() => {
              isRightClickRef.current = false;
            }}
            stretchH="all"
            height="calc(100vh - 180px)"
            width="100%"
            licenseKey="non-commercial-and-evaluation"
            filters={false}
            dropdownMenu={false}
            // dropdownMenu={[
            //   'filter_by_condition',
            //   'filter_by_value',
            //   'filter_action_bar'
            // ]}
            // contextMenu={true}
            manualColumnResize={true}
            fixedColumnsStart={2}
            renderAllRows={false}
            // Important settings
            readOnly={true}
            disableVisualSelection={false}
            outsideClickDeselects={false}

            afterGetColHeader={handleAfterGetColHeader}
            // afterGetColHeader={(col, TH, headerLevel) => {
            //   if (headerLevel !== 0) return;

            //   // col index starts from 0 for the first data column (Sno)
            //   const column = columnsOfSheet[col];
            //   if (!column) return;

            //   // Clean previous classes
            //   TH.classList.remove(
            //     "htOrderCount",
            //     "htTotalPrice",
            //     "htTotalCost",
            //     "htTotalCost4",
            //     "htGrossProfit",
            //     "htGrossProfit4"
            //   );

            //   if (column.data === "Order#") {
            //     TH.classList.add("htOrderCount");
            //   } else if (column.data === "Total Price") {
            //     TH.classList.add("htTotalPrice");
            //   } else if (column.data === "Total Cost") {
            //     TH.classList.add("htTotalCost");
            //   } else if (column.data === "Total Cost+4%") {
            //     TH.classList.add("htTotalCost4");
            //   } else if (column.data === "Gross Profit") {
            //     TH.classList.add("htGrossProfit");
            //   } else if (column.data === "Gross Profit-4%") {
            //     TH.classList.add("htGrossProfit4");
            //   }
            // }}
            nestedHeaders={nestedHeaders}
            contextMenu={{
              items: {
                edit: {
                  name: 'Edit',
                  callback: function (key, selection) {
                    const row = selection[0].start.row;
                    handleOrderClick(row);          // your existing handler
                  }
                },
                create_part: {
                  name: 'Create part order',
                  hidden: function () {
                    const selected = this.getSelectedLast();
                    if (!selected) return true;

                    const row = selected[0];
                    const order = filteredOrders?.[row];
                    const type = String(order?.order_type || '').toLowerCase();

                    return type === 'po' || type === 'rma';
                  },
                  callback: async (key, selection) => {
                    const row = selection[0].start.row;


                    let { order_type, ...originalOrder } = filteredOrders[row];

                    if (!originalOrder) return;

                    try {
                      const result = await dispatch(
                        createGenerateId({ orderId: String(originalOrder['Order#']), role_id: storeId?.id })
                      ).unwrap();

                      if (result.success && result.generated_id) {
                        const newOrderData = {
                          ...originalOrder,
                          'Order#': result.generated_id,   // only Order# changes
                        };

                        setIsCreatePartMode(true);         // ← mark as create mode
                        setSelectedOrder(newOrderData);
                      }
                    } catch (err) {
                      console.error('Failed to generate part number:', err);
                    }
                  }
                },
                rma: {
                  name: 'RMA',
                  hidden: function () {
                    const selected = this.getSelectedLast();
                    if (!selected) return true;

                    const row = selected[0];
                    const order = filteredOrders?.[row];
                    const type = String(order?.order_type || '').toLowerCase();

                    return type === 'rma';
                  },
                  callback: async (key, selection) => {
                    const row = selection[0].start.row;
                    let { order_type, ...originalOrder } = filteredOrders[row];

                    if (!originalOrder) return;

                    try {
                      const result = await dispatch(
                        createGenerateId({ orderId: String(originalOrder['Order#']), role_id: storeId?.id })
                      ).unwrap();

                      if (result.success && result.generated_id) {
                        const newOrderData = {
                          ...originalOrder,
                          'Order#': result.generated_id,   // only Order# changes
                        };

                        setIsRMAMode(true);         // ← mark as create mode
                        setSelectedOrder(newOrderData);
                      }
                    } catch (err) {
                      console.error('Failed to generate part number:', err);
                    }
                  }
                },
                // Optional separator
                sp1: '---------',
                // You can still keep some default items if needed
                // copy: {},
                // cut: {},
              }
            }}
            cells={cells}

            emptyDataMessage="No orders found"
          />
          {/* Selection Summary Badge */}
          {selectionSummary.visible && (
            <div
              style={{
                // position: "fixed",
                // bottom: "24px",
                // right: "30px",
                background: "#e8f5e9",
                border: "1px solid #81c784",
                borderRadius: "6px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#2e7d32",
                boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
                zIndex: 9999,
                display: "flex",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <span>
                Sum:{" "}
                {selectionSummary.sum.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span style={{ opacity: 0.5 }}>|</span>
              <span>Count: {selectionSummary.count}</span>
            </div>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}

export default OrderListTable;
