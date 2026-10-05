import { HotTable } from "@handsontable/react-wrapper";
import { registerAllModules } from "handsontable/registry";
import { textRenderer } from "handsontable/renderers";
import "handsontable/styles/handsontable.min.css";
import "handsontable/styles/ht-theme-main.min.css";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import * as XLSX from "xlsx";
import { fetchOrderTypesMap } from "../store/orderTypeSlice";
import {
  createGenerateId,
  fetchOrderOptions,
  fetchOrdersAdmin,
  importOrderFiles,
  postOrderFiles,
  postSyncOrder,
  updateFinanceOrderCheck,
  updateOrderFiles,
} from "../store/usersSlice";
import {
  CHECKBOX_FIELDS,
  cloneOrders,
  columnsOfSheet,
  FLAT_VALUE_FIELDS,
  flattenOrderValues,
  getFieldChecked,
  getFieldHighlight,
  getFieldValue,
  getIsAdmin,
  setCheckboxChangeHandler,
} from "../utils/constant";
import EditOrderDetailModal from "./EditOrderDetailModal";
import ExportOrdersPdf from "./ExportOrdersPdf";
import OrderDetailModal from "./OrderDetailModal";

registerAllModules();

// ========== Excel-style filter setup ==========
// Handsontable's filters read each cell through the column's `valueGetter`, so
// we hand them plain numbers / ISO dates while the renderers keep showing the
// original source value.
const DATE_COLUMNS = ["Charged Date", "Order Date", "Refund Date"];
const NUMERIC_COLUMNS = [
  ...FLAT_VALUE_FIELDS,
  "Qty",
  "Gross Profit",
  "Gross Profit-4%",
];

const pad2 = (n) => String(n).padStart(2, "0");

// "MM/DD/YYYY" (or "YYYY-MM-DD") → "YYYY-MM-DD", which the date conditions expect
const toISODate = (value) => {
  const str = String(value ?? "").trim();
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${pad2(m[1])}-${pad2(m[2])}`;
  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
  return str;
};

// "YYYY-MM-DD" → "MM/DD/YYYY" for the filter value list
const isoToDisplayDate = (value) => {
  const m = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : value;
};

const toFilterNumber = (value) => {
  const raw = value && typeof value === "object" ? value.value : value;
  if (raw === "" || raw === null || raw === undefined) return "";
  const num = Number(String(raw).replace(/[$,\s]/g, ""));
  return Number.isFinite(num) ? num : raw;
};

// Renders the untouched source value (not the valueGetter output)
function sourceTextRenderer(
  instance,
  td,
  row,
  col,
  prop,
  value,
  cellProperties,
) {
  const raw = instance.getSourceDataAtRow(instance.toPhysicalRow(row))?.[prop];
  textRenderer(instance, td, row, col, prop, raw ?? "", cellProperties);
}

// Date cells hold ISO values in the grid (see toTableRow) but show MM/DD/YYYY
function usDateRenderer(instance, td, row, col, prop, value, cellProperties) {
  const raw = instance.getSourceDataAtRow(instance.toPhysicalRow(row))?.[prop];
  textRenderer(
    instance,
    td,
    row,
    col,
    prop,
    isoToDisplayDate(raw ?? ""),
    cellProperties,
  );
}

// The "intl-date" type expects ISO dates in the data itself, so the grid gets
// a shallow copy of each order with its dates converted.
const toTableRow = (order) => {
  const row = { ...order };
  DATE_COLUMNS.forEach((key) => {
    if (row[key]) row[key] = toISODate(row[key]);
  });
  return row;
};

const hotColumns = columnsOfSheet.map((column) => {
  if (DATE_COLUMNS.includes(column.data)) {
    return {
      ...column,
      type: "intl-date",
      renderer: column.renderer || usDateRenderer,
      // Used by the "Filter by value" list; shows the ISO value as MM/DD/YYYY
      valueFormatter: (value) => isoToDisplayDate(value),
    };
  }
  if (NUMERIC_COLUMNS.includes(column.data)) {
    return {
      ...column,
      type: "numeric",
      valueGetter: toFilterNumber,
      renderer: column.renderer || sourceTextRenderer,
    };
  }
  return column;
});

// ========== Excel-style Find (Ctrl+F) ==========
// Match against the text the cell shows: money objects → their value, ISO dates → MM/DD/YYYY
const toSearchText = (value) => {
  const raw = value && typeof value === "object" ? value.value : value;
  if (raw === null || raw === undefined) return "";
  return String(isoToDisplayDate(String(raw)));
};

const cellMatchesQuery = (value, query, { matchCase, wholeCell }) => {
  let text = toSearchText(value);
  let needle = query;
  if (!matchCase) {
    text = text.toLocaleLowerCase();
    needle = needle.toLocaleLowerCase();
  }
  return wholeCell ? text === needle : text.includes(needle);
};

const getMenuColumn = (hot) => hot.getSelectedRangeLast()?.highlight?.col ?? -1;

const getSortLabels = (hot) => {
  const type = hotColumns[hot.toPhysicalColumn(getMenuColumn(hot))]?.type;
  if (type === "numeric")
    return ["Sort Smallest to Largest", "Sort Largest to Smallest"];
  if (type === "intl-date")
    return ["Sort Oldest to Newest", "Sort Newest to Oldest"];
  return ["Sort A to Z", "Sort Z to A"];
};

const sortMenuColumn = (hot, sortOrder) => {
  const column = getMenuColumn(hot);
  if (column < 0) return;
  hot.getPlugin("columnSorting").sort({ column, sortOrder });
};

const columnHasFilter = (hot, visualColumn) => {
  try {
    return Boolean(
      hot
        .getPlugin("filters")
        .conditionCollection?.hasConditions(hot.toPhysicalColumn(visualColumn)),
    );
  } catch {
    return false;
  }
};

// ========== Excel-style Number Filters (Top 10 / Above / Below Average) ==========
// Handsontable has no such conditions, so each one is turned into a plain
// numeric condition (gte / gt / lt) on a threshold worked out from the column.
const isNumericMenuColumn = (hot) =>
  hotColumns[hot.toPhysicalColumn(getMenuColumn(hot))]?.type === "numeric";

const getColumnNumbers = (hot, visualColumn) =>
  hot
    .getPlugin("filters")
    .getDataMapAtColumn(hot.toPhysicalColumn(visualColumn))
    .map(({ value }) => value)
    .filter((value) => typeof value === "number" && Number.isFinite(value));

const applyNumberFilter = (hot, kind) => {
  const column = getMenuColumn(hot);
  if (column < 0) return;
  const numbers = getColumnNumbers(hot, column);
  if (!numbers.length) return;

  let condition;
  if (kind === "top10") {
    const input = window.prompt("Show the top how many items?", "10");
    if (input === null) return;
    const count = Math.max(1, Math.floor(Number(input)) || 10);
    const sorted = [...numbers].sort((a, b) => b - a);
    // Like Excel, ties with the last value are kept
    condition = ["gte", sorted[Math.min(count, sorted.length) - 1]];
  } else {
    const average = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    condition = [kind === "above" ? "gt" : "lt", average];
  }

  const filters = hot.getPlugin("filters");
  filters.removeConditions(column);
  filters.addCondition(column, condition[0], [condition[1]]);
  filters.filter();
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
};

const resolveCellColor = (order, column) => {
  if (!order || !column) return "";

  const getColor = (key) => String(order[key]?.colorCode || "").trim();
  const isOn = (key) =>
    getFieldHighlight(order[key]) || getFieldChecked(order[key]);

  const priceGroup = ["Price", "Shipping", "Tax"];
  const cardGroup = ["Cost", "Vendor Shipping", "Vendor Tax"];
  const costGroup = [
    "Courier Charges",
    "Sales Tax",
    "Warehouse Charges",
    "Custom Duties",
  ];

  if (priceGroup.includes(column) && isOn(column)) return getColor(column);
  if (cardGroup.includes(column) && isOn(column)) return getColor(column);
  if (costGroup.includes(column) && isOn(column)) return getColor(column);
  if (column === "CC/Paypal 4%" && isOn(column)) return getColor(column);

  if (column === "Total Price") return getColor("Total Price");
  if (column === "Card Payment") return getColor("Card Payment");
  if (column === "Total Cost") return getColor("Total Cost");
  if (column === "Total Cost+4%") return getColor("Total Cost+4%");

  return "";
};

function OrderListTable({ Orders }) {
  const dispatch = useDispatch();
  const hotRef = useRef(null);
  const isRightClickRef = useRef(false);
  const expandingRef = useRef(false);
  const isContextMenuOpen = useRef(false);
  const [tableOrders, setTableOrders] = useState(() => cloneOrders(Orders));
  const { orderloading, syncLoading, orderCheckLoading } = useSelector(
    (state) => state.users,
  );
  const { token, storeId, user: authUser } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state?.auth);
  const { userPermissions } = useSelector((state) => state?.permissions);
  const permissions = userPermissions || [];
  const { orderTypesMap } = useSelector((state) => state.orderTypes);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isRMAMode, setIsRMAMode] = useState(false);
  const [isCreatePartMode, setIsCreatePartMode] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  // Rows left visible by the column filters (null = no column filter active)
  const [visibleOrders, setVisibleOrders] = useState(null);
  // Bumped whenever sorting/filtering changes which cell sits where
  const [gridVersion, setGridVersion] = useState(0);
  // Find bar (Ctrl+F)
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findMatchCase, setFindMatchCase] = useState(false);
  const [findWholeCell, setFindWholeCell] = useState(false);
  const [findResults, setFindResults] = useState([]); // [{ row, col }] visual coords, row-major
  const [findPosition, setFindPosition] = useState(0); // 1-based index of the current match, 0 = none
  const findInputRef = useRef(null);
  // Read by afterRenderer to highlight cells: "physicalRow:col" keys
  const findHighlightRef = useRef({ matches: new Set(), current: "" });
  const [selectionSummary, setSelectionSummary] = useState({
    sum: 0,
    count: 0,
    avg: 0,
    visible: false,
  });
  const roleId = user?.role_id;
  const permissionOfSaveBtn = [1, 2, 3].includes(roleId);
  const hasPermission = (slug) => {
    // Super Admin / Admin → full access
    if (roleId === 1 || roleId === 2) return true;
    return permissions?.some((p) => p.slug === slug);
  };

  useEffect(() => {
    setTableOrders(cloneOrders(Orders));
  }, [Orders]);

  useEffect(() => {
    setCheckboxChangeHandler((orderId, fieldName, nextField) => {
      setTableOrders((prev) =>
        prev.map((order) => {
          if (String(order["Order#"]) !== String(orderId)) return order;

          const next = { ...order, [fieldName]: nextField };

          const priceGroupOn = ["Price", "Shipping", "Tax"].some(
            (key) => getFieldHighlight(next[key]) || getFieldChecked(next[key]),
          );

          next["Total Price"] = {
            value: getFieldValue(next["Total Price"]) || 0,
            isTrue: getFieldChecked(next["Total Price"]),
            isHighlight: priceGroupOn,
            colorCode: next["Total Price"]?.colorCode || "",
          };

          return next;
        }),
      );
    });

    return () => setCheckboxChangeHandler(null);
  }, []);

  const filteredOrders = useMemo(() => {
    if (!tableOrders) return [];

    if (orderTypeFilter === "all") return tableOrders;

    return tableOrders.filter((order) => {
      const type = String(order.order_type || "").toLowerCase();
      const status = String(order?.["Order Status"] || "").toLowerCase();
      if (orderTypeFilter === "cancelled") return status === "cancelled";
      if (orderTypeFilter === "delivered") return status === "delivered";
      if (orderTypeFilter === "incomplete")
        return status === "incomplete" || type === "incomplete";
      return type === orderTypeFilter;
    });
  }, [tableOrders, orderTypeFilter]);

  const syncVisibleOrders = useCallback(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || hot.isDestroyed) return;

    if (hot.countRows() === hot.countSourceRows()) {
      setVisibleOrders(null);
      return;
    }

    const rows = [];
    for (let row = 0; row < hot.countRows(); row++) {
      const order = hot.getSourceDataAtRow(hot.toPhysicalRow(row));
      if (order) rows.push(order);
    }
    // Keep the same array when nothing changed so we don't re-render in a loop
    setVisibleOrders((prev) =>
      prev &&
      prev.length === rows.length &&
      prev.every((order, i) => order === rows[i])
        ? prev
        : rows,
    );
  }, []);

  // Remember the user's filter & sort so they survive plugin re-initialisation
  const tableStateRef = useRef({ conditions: [], sort: [] });

  const handleAfterFilter = useCallback(() => {
    const hot = hotRef.current?.hotInstance;
    if (hot && !hot.isDestroyed) {
      tableStateRef.current.conditions = hot
        .getPlugin("filters")
        .exportConditions();
    }
    syncVisibleOrders();
    setGridVersion((v) => v + 1);
  }, [syncVisibleOrders]);

  const handleAfterColumnSort = useCallback(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || hot.isDestroyed) return;
    tableStateRef.current.sort = hot.getPlugin("columnSorting").getSortConfig();
    setGridVersion((v) => v + 1);
  }, []);

  const tableData = useMemo(
    () => (filteredOrders || []).map(toTableRow),
    [filteredOrders],
  );

  // The data is pushed in here instead of through the `data` prop: the React
  // wrapper re-sends every prop on each render, and re-loading the data on
  // every render (e.g. when the selection summary updates) wiped the filters.
  useEffect(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || hot.isDestroyed) return;
    hot.updateData(tableData);
    syncVisibleOrders();
  }, [tableData, syncVisibleOrders]);

  // ---------- Find (Ctrl+F) ----------
  // Re-run the search as the query/options change, and whenever the data,
  // sort or filters move cells around. Only rows visible in the grid are searched.
  useEffect(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || hot.isDestroyed) return;

    const timer = setTimeout(() => {
      const matches = [];
      const keys = new Set();

      if (findOpen && findQuery) {
        const options = { matchCase: findMatchCase, wholeCell: findWholeCell };
        for (let row = 0; row < hot.countRows(); row++) {
          const physicalRow = hot.toPhysicalRow(row);
          const order = tableData[physicalRow];
          if (!order) continue;
          hotColumns.forEach((column, col) => {
            if (column.data === "Sno") return;
            if (cellMatchesQuery(order[column.data], findQuery, options)) {
              matches.push({ row, col });
              keys.add(`${physicalRow}:${col}`);
            }
          });
        }
      }

      findHighlightRef.current = { matches: keys, current: "" };
      setFindResults(matches);
      setFindPosition(0);
      hot.render();
    }, 150);

    return () => clearTimeout(timer);
  }, [
    findOpen,
    findQuery,
    findMatchCase,
    findWholeCell,
    tableData,
    gridVersion,
  ]);

  const openFind = useCallback(() => {
    setFindOpen(true);
    // Let the input take the keyboard instead of the grid
    hotRef.current?.hotInstance?.unlisten();
    setTimeout(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    }, 0);
  }, []);

  const closeFind = () => {
    setFindOpen(false);
    hotRef.current?.hotInstance?.listen();
  };

  // Like Excel's Find Next / Find Previous: move from the currently selected cell
  const goToMatch = (direction) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || findResults.length === 0) return;

    const current = hot.getSelectedRangeLast()?.highlight;
    const curRow = current?.row ?? -1;
    const curCol = current?.col ?? -1;
    const isAfter = (m) =>
      m.row > curRow || (m.row === curRow && m.col > curCol);
    const isBefore = (m) =>
      m.row < curRow || (m.row === curRow && m.col < curCol);

    let index =
      direction > 0
        ? findResults.findIndex(isAfter)
        : findResults.findLastIndex(isBefore);
    // Wrap around like Excel
    if (index === -1) index = direction > 0 ? 0 : findResults.length - 1;

    const match = findResults[index];
    findHighlightRef.current.current = `${hot.toPhysicalRow(match.row)}:${match.col}`;
    // scrollToCell = true, changeListener = false (keep typing in the find box)
    hot.selectCell(match.row, match.col, match.row, match.col, true, false);
    hot.render();
    setFindPosition(index + 1);
  };

  // Ctrl+F / Cmd+F opens the sheet's find bar instead of the browser's
  useEffect(() => {
    const onKey = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.altKey &&
        e.key.toLowerCase() === "f"
      ) {
        e.preventDefault();
        openFind();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [openFind]);

  // Safety net: if a re-render re-initialised the plugins, restore the state
  useEffect(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || hot.isDestroyed) return;

    const { conditions, sort } = tableStateRef.current;

    const sorting = hot.getPlugin("columnSorting");
    if (sort.length && sorting.getSortConfig().length === 0) {
      sorting.sort(sort);
    }

    const filters = hot.getPlugin("filters");
    if (conditions.length && filters.exportConditions().length === 0) {
      filters.importConditions(conditions);
      filters.filter();
    }
  });

  // Visual row (after sorting/filtering) → the order it shows
  const getOrderAtRow = (visualRow) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || visualRow === null || visualRow === undefined || visualRow < 0)
      return undefined;
    return filteredOrders?.[hot.toPhysicalRow(visualRow)];
  };

  // What the grid shows (column filters applied, current sort order) — used by exports
  const getGridOrders = () => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || hot.isDestroyed) return filteredOrders || [];
    return Array.from({ length: hot.countRows() }, (_, row) =>
      getOrderAtRow(row),
    ).filter(Boolean);
  };

  // Excel's "Filter by Color" — lives in the column dropdown menu
  const colorFilterOptions = [
    { key: "all", label: "All", color: "#e5e7eb" },
    { key: "po", label: "PO", color: orderTypesMap?.po || "#86efac" },
    { key: "rma", label: "RMA", color: orderTypesMap?.rma || "#e5c13e" },
    {
      key: "cancelled",
      label: "Cancelled",
      color: orderTypesMap?.cancelled || "#ea8b81",
    },
    { key: "delivered", label: "Delivered", color: "#86bd93" },
    {
      key: "incomplete",
      label: "Incomplete",
      color: orderTypesMap?.incomplete || "#ff00dd",
    },
  ];
  // Menu item labels are evaluated when the menu opens, so read the latest values via a ref
  const colorFilterRef = useRef({ options: colorFilterOptions, active: "all" });
  colorFilterRef.current = {
    options: colorFilterOptions,
    active: orderTypeFilter,
  };

  // Any filter on the sheet: the color filter or a condition/value filter on any column
  const anyFilterActive = (hot) => {
    if (colorFilterRef.current.active !== "all") return true;
    try {
      return hot.getPlugin("filters").exportConditions().length > 0;
    } catch {
      return false;
    }
  };

  const dropdownMenu = useMemo(
    () => ({
      items: {
        sort_asc: {
          name() {
            return getSortLabels(this)[0];
          },
          callback() {
            sortMenuColumn(this, "asc");
          },
        },
        sort_desc: {
          name() {
            return getSortLabels(this)[1];
          },
          callback() {
            sortMenuColumn(this, "desc");
          },
        },
        color_filter: {
          name: "Filter by Color",
          submenu: {
            items: ["all", "rma", "cancelled", "delivered", "incomplete"].map(
              (key) => ({
                key: `color_filter:${key}`,
                name() {
                  const { options, active } = colorFilterRef.current;
                  const option = options.find((o) => o.key === key);
                  return (
                    `<span style="display:inline-block;width:12px;height:12px;` +
                    `border-radius:3px;border:1px solid #d1d5db;vertical-align:middle;` +
                    `margin-right:8px;background:${option.color}"></span>` +
                    `${option.label}${active === key ? " ✓" : ""}`
                  );
                },
                callback() {
                  setOrderTypeFilter(key);
                },
              }),
            ),
          },
        },
        number_filters: {
          name: "Number Filters",
          hidden() {
            return !isNumericMenuColumn(this);
          },
          submenu: {
            items: [
              { key: "number_filters:top10", name: "Top 10..." },
              { key: "number_filters:above", name: "Above Average" },
              { key: "number_filters:below", name: "Below Average" },
            ].map((item) => ({
              ...item,
              callback() {
                applyNumberFilter(this, item.key.split(":")[1]);
              },
            })),
          },
        },
        separator1: { name: "---------" },
        clear_column_filter: {
          // This column filtered → clear just this column. Otherwise, if any
          // other filter is applied (color filter or another column), offer to
          // clear them all, so the option shows for every applied filter.
          name() {
            const column = getMenuColumn(this);
            if (!columnHasFilter(this, column) && anyFilterActive(this)) {
              return "Clear All Filters";
            }
            const title =
              hotColumns[this.toPhysicalColumn(column)]?.title || "";
            return `Clear Filter From "${title}"`;
          },
          disabled() {
            return !anyFilterActive(this);
          },
          callback() {
            const column = getMenuColumn(this);
            const filters = this.getPlugin("filters");
            if (columnHasFilter(this, column)) {
              filters.clearConditions(column);
            } else {
              filters.clearConditions();
              setOrderTypeFilter("all");
            }
            filters.filter();
          },
        },
        filter_by_condition: {},
        filter_operators: {},
        filter_by_condition2: {},
        filter_by_value: {},
        filter_action_bar: {},
      },
    }),
    [],
  );

  // Enabled once here rather than via props: the React wrapper re-sends every
  // prop on each render, which re-initialises these plugins (dropping the
  // active filter/sort and closing an open dropdown menu).
  useEffect(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || hot.isDestroyed) return;
    hot.updateSettings({
      columnSorting: true,
      // "apply": typing in "Filter by value" checks only the matching values (like
      // Excel), so OK filters to them. The default "show" only hides the others.
      filters: { searchMode: "apply" },
      dropdownMenu,
    });
  }, [dropdownMenu]);

  // Add these calculations inside the component (before the return)
  const summary = useMemo(() => {
    const summaryOrders = visibleOrders ?? filteredOrders;
    if (!summaryOrders || summaryOrders.length === 0) {
      return {
        totalPrice: 0,
        totalCost: 0,
        totalCostPlus4: 0,
        grossProfit: 0,
        grossProfitMinus4: 0,
        count: 0,
        //
        price: 0,
        shipping: 0,
        tax: 0,
        cost: 0,
        vendorShipping: 0,
        vendorTax: 0,
        courierCharges: 0,
        salesTax: 0,
        warehouseCharges: 0,
        customDuties: 0,
        ccPaypal4Percent: 0,
      };
    }

    return summaryOrders.reduce(
      (acc, order) => {
        acc.totalPrice += Number(getFieldValue(order["Total Price"]) || 0);
        acc.totalCost += Number(getFieldValue(order["Total Cost"]) || 0);
        acc.totalCostPlus4 += Number(
          getFieldValue(order["Total Cost+4%"]) || 0,
        );
        acc.grossProfit += Number(getFieldValue(order["Gross Profit"]) || 0);
        acc.grossProfitMinus4 += Number(
          getFieldValue(order["Gross Profit-4%"]) || 0,
        );
        //
        acc.price += Number(getFieldValue(order["Price"]) || 0);
        acc.shipping += Number(getFieldValue(order["Shipping"]) || 0);
        acc.tax += Number(getFieldValue(order["Tax"]) || 0);
        acc.cost += Number(getFieldValue(order["Cost"]) || 0);
        acc.vendorShipping += Number(
          getFieldValue(order["Vendor Shipping"]) || 0,
        );
        acc.vendorTax += Number(getFieldValue(order["Vendor Tax"]) || 0);
        acc.courierCharges += Number(
          getFieldValue(order["Courier Charges"]) || 0,
        );
        acc.salesTax += Number(getFieldValue(order["Sales Tax"]) || 0);
        acc.warehouseCharges += Number(
          getFieldValue(order["Warehouse Charges"]) || 0,
        );
        acc.customDuties += Number(getFieldValue(order["Custom Duties"]) || 0);
        acc.ccPaypal4Percent += Number(
          getFieldValue(order["CC/Paypal 4%"]) || 0,
        );

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
        //
        price: 0,
        shipping: 0,
        tax: 0,
        cost: 0,
        vendorShipping: 0,
        vendorTax: 0,
        courierCharges: 0,
        salesTax: 0,
        warehouseCharges: 0,
        customDuties: 0,
        ccPaypal4Percent: 0,
      },
    );
  }, [filteredOrders, visibleOrders]);

  const handleBeforeOnCellMouseDown = (event, coords, TD) => {
    // Right click (button === 2) → prevent selection
    if (event.button === 2) {
      event.stopImmediatePropagation(); // stops Handsontable from selecting the cell
      return false;
    }
  };

  const handleAfterGetColHeader = (col, TH, headerLevel) => {
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
      "htGrossProfit4",
      //
      "htPriceRelated",
      "htCostRelated",
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
    } else if (
      column.data === "Price" ||
      column.data === "Shipping" ||
      column.data === "Tax"
    ) {
      TH.classList.add("htPriceRelated");
    } else if (
      column.data === "Courier Charges" ||
      column.data === "Sales Tax" ||
      column.data === "Warehouse Charges" ||
      column.data === "Custom Duties" ||
      column.data === "Cost" ||
      column.data === "Vendor Shipping" ||
      column.data === "Vendor Tax" ||
      column.data === "CC/Paypal 4%"
    ) {
      TH.classList.add("htCostRelated");
    }
  };
  const updateSelectionSummary = useCallback(() => {
    if (isRightClickRef.current) return;

    const hot = hotRef.current?.hotInstance;
    if (!hot) return;

    const selected = hot.getSelected();
    if (!selected || selected.length === 0) {
      setSelectionSummary((prev) =>
        prev.visible ? { sum: 0, count: 0, avg: 0, visible: false } : prev,
      );
      return;
    }

    let sum = 0;
    let count = 0;

    selected.forEach(([r1, c1, r2, c2]) => {
      for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
        for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
          const raw = hot.getDataAtCell(r, c);
          const extracted = getFieldValue(raw);

          if (extracted === "" || extracted === null || extracted === undefined)
            continue;

          const val = parseFloat(String(extracted).replace(/[^0-9.-]/g, ""));
          if (!isNaN(val)) {
            sum += val;
            count++;
          }
        }
      }
    });

    const avg = count > 0 ? sum / count : 0;

    setSelectionSummary((prev) => {
      if (
        prev.sum === sum &&
        prev.count === count &&
        prev.avg === avg &&
        prev.visible === count > 1
      ) {
        return prev;
      }
      return { sum, count, avg, visible: count > 1 };
    });
  }, []);
  const exportToExcel = () => {
    const visibleRows = getGridOrders();
    if (!visibleRows || visibleRows.length === 0)
      return alert("No data to export");
    const exportRows = visibleRows.map(({ order_type, ...order }) => {
      const row = { ...order };

      Object.keys(row).forEach((key) => {
        row[key] = getFieldValue(row[key]);
      });

      return row;
    });
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `Orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  const handleSyncOrders = async () => {
    await dispatch(
      postSyncOrder({
        storeId: storeId?.id,
        storeName: storeId?.name?.toLowerCase(),
      }),
    )
      .unwrap()
      .then(() => {
        dispatch(fetchOrdersAdmin(storeId?.id));
      });
  };

  // Add this handler
  const handleOrderClick = (rowIndex) => {
    // rowIndex is a visual row — map it through sorting/filtering
    const currentOrder = getOrderAtRow(rowIndex);

    if (currentOrder) {
      setIsCreatePartMode(false);
      setIsRMAMode(false);
      setSelectedOrder(currentOrder);
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

  const handleSaveCheckedFields = async () => {
    const isAdmin = getIsAdmin();
    const liveOrders = tableOrders;

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
            // colorCode: user?.colour_code || "",
          };
        });

        if (Object.keys(fields).length === 0) return null;

        return {
          order_id: order["Order#"],
          ...fields,
        };
      })
      .filter(Boolean);

    if (payload.length === 0) {
      alert("Nothing to save");
      return;
    }

    dispatch(updateFinanceOrderCheck(payload))
      .unwrap()
      .then(() => {
        dispatch(fetchOrdersAdmin(storeId?.id));
      })
      .catch((error) => {
        console.error("Finance order check failed:", error);
      });
  };
  const ensureColorClass = (color) => {
    // const safe = String(color).replace(/[^a-zA-Z0-9#-]/g, "");
    // Remove # and any invalid characters
    const safe = String(color)
      .replace(/#/g, "hex") // #0000FF → hex0000FF
      .replace(/[^a-zA-Z0-9_-]/g, "");
    const className = `dyn-color-${safe}`;
    const styleId = `style-${className}`;

    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
      .handsontable td.cancelled-row.${className},
      .handsontable td.delivered-row.${className},
      .handsontable td.incomplete-row.${className},
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

  const cells = useCallback(
    (row, col) => {
      const order = filteredOrders?.[row];
      const cellProperties = {};
      if (!order) return cellProperties;

      const status = String(order?.["Order Status"] || "").toLowerCase();
      const type = String(order?.order_type || "").toLowerCase();

      if (status === "delivered") cellProperties.className = "delivered-row";
      else if (status === "cancelled")
        cellProperties.className = "cancelled-row";
      else if (status === "incomplete")
        cellProperties.className = "incomplete-row";
      else if (type === "incomplete")
        cellProperties.className = "incomplete-row";
      else if (type === "po") cellProperties.className = "po-row";
      else if (type === "rma") cellProperties.className = "rma-row";

      const column = columnsOfSheet[col]?.data;
      if (!column) return cellProperties;

      const isOn = (key) =>
        getFieldHighlight(order[key]) || getFieldChecked(order[key]);

      const getColor = (key) => String(order[key]?.colorCode || "").trim();

      const priceGroup = ["Price", "Shipping", "Tax"];
      const cardGroup = ["Cost", "Vendor Shipping", "Vendor Tax"];
      const costGroup = [
        "Courier Charges",
        "Sales Tax",
        "Warehouse Charges",
        "Custom Duties",
      ];

      let color = "";

      if (priceGroup.includes(column) && isOn(column)) color = getColor(column);
      else if (cardGroup.includes(column) && isOn(column))
        color = getColor(column);
      else if (costGroup.includes(column) && isOn(column))
        color = getColor(column);
      else if (column === "CC/Paypal 4%" && isOn(column))
        color = getColor(column);
      else if (column === "Total Price") color = getColor("Total Price");
      else if (column === "Card Payment") color = getColor("Card Payment");
      else if (column === "Total Cost") color = getColor("Total Cost");
      else if (column === "Total Cost+4%") color = getColor("Total Cost+4%");

      if (color) {
        cellProperties.className =
          `${cellProperties.className || ""} ${ensureColorClass(color)}`.trim();
      }

      return cellProperties;
    },
    [filteredOrders],
  );

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
        if (col.data === "Price") {
          return { label: formatCurrency(summary.price), colspan: 1 };
        }
        if (col.data === "Shipping") {
          return { label: formatCurrency(summary.shipping), colspan: 1 };
        }
        if (col.data === "Tax") {
          return { label: formatCurrency(summary.tax), colspan: 1 };
        }
        if (col.data === "Cost") {
          return { label: formatCurrency(summary.cost), colspan: 1 };
        }
        if (col.data === "Vendor Shipping") {
          return { label: formatCurrency(summary.vendorShipping), colspan: 1 };
        }
        if (col.data === "Vendor Tax") {
          return { label: formatCurrency(summary.vendorTax), colspan: 1 };
        }
        if (col.data === "Courier Charges") {
          return { label: formatCurrency(summary.courierCharges), colspan: 1 };
        }
        if (col.data === "Courier Charges") {
          return { label: formatCurrency(summary.courierCharges), colspan: 1 };
        }
        if (col.data === "Sales Tax") {
          return { label: formatCurrency(summary.salesTax), colspan: 1 };
        }
        if (col.data === "Warehouse Charges") {
          return {
            label: formatCurrency(summary.warehouseCharges),
            colspan: 1,
          };
        }
        if (col.data === "Custom Duties") {
          return { label: formatCurrency(summary.customDuties), colspan: 1 };
        }
        if (col.data === "CC/Paypal 4%") {
          return {
            label: formatCurrency(summary.ccPaypal4Percent),
            colspan: 1,
          };
        }
        if (col.data === "Gross Profit-4%") {
          return {
            label: formatCurrency(summary.grossProfitMinus4),
            colspan: 1,
          };
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
      background-color: ${orderTypesMap?.rma} !important;
    }
    .handsontable td.cancelled-row {
      background-color: ${orderTypesMap?.cancelled} !important;
    }
    .handsontable td.incomplete-row {
      background-color: ${orderTypesMap?.incomplete} !important;
    }
    .handsontable td.delivered-row {
      background-color: #d9ead3 !important;
    }
  `;
  }, [
    orderTypesMap?.po,
    orderTypesMap?.rma,
    orderTypesMap?.cancelled,
    orderTypesMap?.incomplete,
  ]);
  // Fetch options when modal opens
  useEffect(() => {
    if (storeId?.id) {
      dispatch(fetchOrderOptions(storeId?.id));
      dispatch(fetchOrderTypesMap(storeId.id));
    }
  }, [storeId?.id]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setIsFullScreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const hasPendingChecks = useMemo(() => {
    return (tableOrders || []).some((order) =>
      CHECKBOX_FIELDS.some((field) => {
        const checked = getFieldChecked(order[field]);
        const highlighted = getFieldHighlight(order[field]);
        return checked !== highlighted;
      }),
    );
  }, [tableOrders]);

  useEffect(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;

    const id = setTimeout(() => {
      hot.refreshDimensions();
      const row = isFullScreen ? Math.max(hot.countRows() - 1, 0) : 0;
      hot.scrollViewportTo(row, 0);
    }, 60);

    return () => clearTimeout(id);
  }, [isFullScreen]);
  // if (orderloading) {
  //   return (
  //     <div style={{ padding: '40px', textAlign: 'center' }}>
  //       <h2>Dashboard - Order Sheet</h2>
  //       <div style={{
  //         display: 'flex',
  //         flexDirection: 'column',
  //         alignItems: 'center',
  //         justifyContent: 'center',
  //         gap: '16px',
  //         marginTop: '60px'
  //       }}>
  //         <div style={{
  //           width: '50px',
  //           height: '50px',
  //           border: '5px solid #f3f3f3',
  //           borderTop: '5px solid #1b51ef',
  //           borderRadius: '50%',
  //           animation: 'spin 1s linear infinite',
  //         }} />
  //         <p style={{ fontSize: '16px', color: '#666' }}>Loading orders...</p>
  //       </div>

  //       <style jsx>{`
  //         @keyframes spin {
  //           0% { transform: rotate(0deg); }
  //           100% { transform: rotate(360deg); }
  //         }
  //       `}</style>
  //     </div>
  //   );
  // }
  return (
    <React.Fragment>
      {selectedOrder && (
        <EditOrderDetailModal
          order={flattenOrderValues(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          isRMAMode={isRMAMode}
          isCreatePartMode={isCreatePartMode}
          onSave={(updatedOrderPayload) => {
            const {
              "Total Price": totalPrice,
              "Total Cost": totalCost,
              "Card Payment": cardPayment,
              "Total Cost+4%": totalCostPlus4,
              "Gross Profit": grossProfit,
              "Gross Profit-4%": grossProfitMinus4,
              "Profit %": profitPercent,
              order_type,
              ...updatedOrder
            } = updatedOrderPayload;
            const isCancelledOrder = ["cancelled", "canceled"].includes(
              String(updatedOrder["Order Status"] || "")
                .trim()
                .toLowerCase(),
            );

            if (isCreatePartMode) {
              // ========== CREATE API ==========
              dispatch(
                postOrderFiles({
                  payload: {
                    ...updatedOrder,
                    order_type: "po",
                    "Order Status": null,
                  },
                  role_id: storeId?.id,
                }),
              )
                .unwrap()
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
                  payload: {
                    ...updatedOrder,
                    order_type: "rma",
                    "Order Status": null,
                  },
                  role_id: storeId?.id,
                }),
              )
                .unwrap()
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
              dispatch(
                updateOrderFiles({
                  id: updatedOrder["Order#"],
                  data:
                    order_type == "rma"
                      ? { ...updatedOrder, "Order Status": null }
                      : isCancelledOrder
                        ? { ...updatedOrder, "Total Price": totalPrice }
                        : updatedOrder,
                  role_id: storeId?.id,
                }),
              )
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
            if (!isNew) return Promise.resolve();

            const payload = {
              ...data,
              "Charged Vendor": data["Charged Vendor"]
                ? data["Charged Vendor"]
                : "No",
            };

            return dispatch(
              postOrderFiles({
                payload,
                role_id: storeId?.id,
              }),
            )
              .unwrap()
              .then(() => {
                dispatch(fetchOrdersAdmin(storeId?.id));
                setSelectedOrder(null);
              });
          }}
        />
      )}
      <div style={{ padding: "20px" }}>
        <div
          style={{
            position: "sticky",
            top: "0px",
            zIndex: 30,
            background: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            padding: "12px 0",
          }}
        >
          <h2>Dashboard - Order Sheet</h2>

          <div style={{ display: "flex", gap: "12px" }}>
            {permissionOfSaveBtn && hasPendingChecks && (
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
                disabled={orderCheckLoading}
              >
                {orderCheckLoading ? "Loading..." : "Save"}
              </button>
            )}
            {hasPermission("view_sheet.sync_orders") && (
              <button
                onClick={handleSyncOrders}
                style={{
                  padding: "8px 16px",
                  background: "gray",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {syncLoading ? "Sync..." : "Sync Orders"}
              </button>
            )}

            {hasPermission("view_sheet.download_excel") && (
              <button
                onClick={exportToExcel}
                style={{
                  padding: "8px 16px",
                  background: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Download Excel
              </button>
            )}
            {hasPermission("view_sheet.import_excel") && (
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
            )}
            {/* Export PDF */}
            {hasPermission("view_sheet.export_pdf") && (
              <ExportOrdersPdf getOrders={getGridOrders} />
            )}
            {hasPermission("view_sheet.add_order") && (
              <button
                onClick={() => setIsAddMode(true)}
                className="bg-indigo-600"
                style={{
                  padding: "8px 16px",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                + Add Order
              </button>
            )}
          </div>
        </div>
        {/* Summary Bar */}

        {/* ← Add this div with higher z-index control */}
        <div
          style={{
            position: isFullScreen ? "fixed" : "relative",
            inset: isFullScreen ? 0 : "auto",
            zIndex: isFullScreen ? 80 : 10,
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            padding: isFullScreen ? "8px 12px 12px" : "0 0 48px",
          }}
        >
          {isFullScreen && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                height: 44,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#111827",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                }}
              >
                ← Back
              </button>
            </div>
          )}
          <style>{`
            .handsontable td.ht-find-match.ht-find-match {
              background-color: #fff3a3 !important;
            }
            .handsontable td.ht-find-current.ht-find-current {
              background-color: #ffc53d !important;
            }
          `}</style>
          {findOpen && (
            <div
              style={{
                position: "absolute",
                top: isFullScreen ? 8 : 4,
                right: 16,
                zIndex: 250,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                fontSize: 13,
              }}
            >
              <input
                ref={findInputRef}
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                onFocus={() => hotRef.current?.hotInstance?.unlisten()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    goToMatch(e.shiftKey ? -1 : 1);
                  } else if (e.key === "Escape") {
                    e.stopPropagation(); // don't also leave full screen
                    closeFind();
                  }
                }}
                placeholder="Find in sheet"
                style={{
                  width: 200,
                  padding: "6px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  outline: "none",
                }}
              />
              <span
                style={{ minWidth: 70, color: "#6b7280", textAlign: "center" }}
              >
                {!findQuery
                  ? ""
                  : findResults.length === 0
                    ? "No results"
                    : findPosition
                      ? `${findPosition} of ${findResults.length}`
                      : `${findResults.length} found`}
              </span>
              <button
                type="button"
                title="Find previous (Shift+Enter)"
                onClick={() => goToMatch(-1)}
                disabled={findResults.length === 0}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                ↑
              </button>
              <button
                type="button"
                title="Find next (Enter)"
                onClick={() => goToMatch(1)}
                disabled={findResults.length === 0}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                ↓
              </button>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={findMatchCase}
                  onChange={(e) => setFindMatchCase(e.target.checked)}
                />
                Match case
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={findWholeCell}
                  onChange={(e) => setFindWholeCell(e.target.checked)}
                />
                Entire cell
              </label>
              <button
                type="button"
                title="Close (Esc)"
                onClick={closeFind}
                style={{
                  padding: "2px 8px",
                  border: "none",
                  background: "transparent",
                  fontSize: 16,
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ×
              </button>
            </div>
          )}
          <HotTable
            ref={hotRef}
            // No `data` prop: rows are loaded via hot.updateData(tableData) above
            startRows={0}
            columns={hotColumns}
            style={{ zIndex: 10 }}
            colHeaders={true}
            rowHeaders={false}
            selectionMode="multiple"
            afterRenderer={(td, row, col) => {
              const order = getOrderAtRow(row);
              const column = columnsOfSheet[col]?.data;
              const color = resolveCellColor(order, column);

              if (color) {
                td.style.backgroundColor = color;
              }

              // Find (Ctrl+F) highlights — toggled so recycled cells don't keep them
              const { matches, current } = findHighlightRef.current;
              const hot = hotRef.current?.hotInstance;
              const key =
                matches.size && hot ? `${hot.toPhysicalRow(row)}:${col}` : "";
              td.classList.toggle(
                "ht-find-match",
                Boolean(key) && matches.has(key),
              );
              td.classList.toggle(
                "ht-find-current",
                Boolean(key) && key === current,
              );
            }}
            fragmentSelection={false}
            afterOnCellMouseDown={(event, coords) => {
              if (coords.row === -1) event.stopImmediatePropagation();
            }}
            beforeOnCellMouseDown={(event) => {
              isRightClickRef.current = event.button === 2;
            }}
            beforeOnCellContextMenu={(event) => {
              event.preventDefault(); // only this is needed
              isRightClickRef.current = true; // reset right-click flag
            }}
            // afterSelectionEnd={() => {
            //   // Delay slightly so context menu can open first
            //   setTimeout(() => {
            //     if (isRightClickRef.current) {
            //       isRightClickRef.current = false;
            //       return;
            //     }
            //     updateSelectionSummary();
            //   }, 50);
            // }}
            afterSelectionEnd={(r1, c1, r2, c2) => {
              setTimeout(() => {
                if (isRightClickRef.current) {
                  isRightClickRef.current = false;
                  return;
                }
                updateSelectionSummary();
              }, 50);

              if (expandingRef.current) return;
              if (r1 < 0 || c1 < 0) return;

              const startCol = Math.min(c1, c2);
              const endCol = Math.max(c1, c2);

              // only when the selection is inside S.no
              if (startCol !== 0 || endCol !== 0) return;

              const hot = hotRef.current?.hotInstance;
              if (!hot) return;

              expandingRef.current = true;
              hot.selectCell(
                Math.min(r1, r2),
                0,
                Math.max(r1, r2),
                hot.countCols() - 1,
                false,
              );
              expandingRef.current = false;
            }}
            afterDeselect={() => {
              setSelectionSummary((prev) =>
                prev.visible
                  ? { sum: 0, count: 0, avg: 0, visible: false }
                  : prev,
              );
            }}
            afterContextMenuHide={() => {
              isRightClickRef.current = false;
            }}
            stretchH="all"
            wordWrap={false}
            autoColumnSize={true}
            height={isFullScreen ? "calc(100vh - 70px)" : "calc(100vh - 180px)"}
            width="100%"
            licenseKey="non-commercial-and-evaluation"
            // columnSorting / filters / dropdownMenu are enabled in a useEffect
            afterFilter={handleAfterFilter}
            afterColumnSort={handleAfterColumnSort}
            // contextMenu={true}
            manualColumnResize={true}
            fixedColumnsStart={2}
            renderAllRows={false}
            // Important settings
            readOnly={true}
            disableVisualSelection={false}
            outsideClickDeselects={false}
            afterGetColHeader={handleAfterGetColHeader}
            nestedHeaders={nestedHeaders}
            contextMenu={{
              items: {
                edit: {
                  name: "Edit",
                  hidden: function () {
                    // // Hide if user doesn't have permission
                    // if (!hasPermission("view_sheet.edit_order")) return true;
                    // return false;
                    const selected = this.getSelectedLast();
                    if (!selected || selected[0] < 0) return true;
                    if (!hasPermission("view_sheet.edit_order")) return true;
                    return false;
                  },
                  callback: function (key, selection) {
                    const row = selection[0].start.row;
                    handleOrderClick(row); // your existing handler
                  },
                },
                create_part: {
                  name: "Create part order",
                  hidden: function () {
                    const selected = this.getSelectedLast();
                    if (!selected || selected[0] < 0) return true;
                    // Hide if no permission
                    if (!hasPermission("view_sheet.po")) return true;

                    if (!selected) return true;

                    const row = selected[0];
                    const order = getOrderAtRow(row);
                    const type = String(order?.order_type || "").toLowerCase();
                    const status = String(
                      order?.["Order Status"] || "",
                    ).toLowerCase();

                    return (
                      type === "po" || type === "rma" || status === "cancelled"
                    );
                  },
                  callback: async (key, selection) => {
                    const row = selection[0].start.row;

                    let { order_type, ...originalOrder } =
                      getOrderAtRow(row) || {};

                    if (!originalOrder["Order#"]) return;

                    try {
                      const result = await dispatch(
                        createGenerateId({
                          orderId: String(originalOrder["Order#"]),
                          role_id: storeId?.id,
                        }),
                      ).unwrap();

                      if (result.success && result.generated_id) {
                        const newOrderData = {
                          ...originalOrder,
                          "Order#": result.generated_id, // only Order# changes
                        };

                        setIsCreatePartMode(true); // ← mark as create mode
                        setSelectedOrder(newOrderData);
                      }
                    } catch (err) {
                      console.error("Failed to generate part number:", err);
                    }
                  },
                },
                rma: {
                  name: "RMA",
                  hidden: function () {
                    const selected = this.getSelectedLast();
                    if (!selected || selected[0] < 0) return true;
                    if (!hasPermission("view_sheet.rma")) return true;

                    if (!selected) return true;

                    const row = selected[0];
                    const order = getOrderAtRow(row);
                    const type = String(order?.order_type || "").toLowerCase();
                    const status = String(
                      order?.["Order Status"] || "",
                    ).toLowerCase();

                    return type === "rma" || status == "cancelled";
                  },
                  callback: async (key, selection) => {
                    const row = selection[0].start.row;
                    let { order_type, ...originalOrder } =
                      getOrderAtRow(row) || {};

                    if (!originalOrder["Order#"]) return;

                    try {
                      const result = await dispatch(
                        createGenerateId({
                          orderId: String(originalOrder["Order#"]),
                          role_id: storeId?.id,
                        }),
                      ).unwrap();

                      if (result.success && result.generated_id) {
                        const newOrderData = {
                          ...originalOrder,
                          "Order#": result.generated_id, // only Order# changes
                        };

                        setIsRMAMode(true); // ← mark as create mode
                        setSelectedOrder(newOrderData);
                      }
                    } catch (err) {
                      console.error("Failed to generate part number:", err);
                    }
                  },
                },
              },
            }}
            cells={cells}
            emptyDataMessage="No orders found"
          />

          {!isFullScreen && (
            <button
              type="button"
              onClick={() => setIsFullScreen(true)}
              style={{
                position: "absolute",
                left: "50%",
                bottom: "10px",
                transform: "translateX(-50%)",
                zIndex: 20,
                padding: "8px 16px",
                borderRadius: "999px",
                border: "1px solid #c7d2fe",
                background: "#4f46e5",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(79,70,229,0.25)",
              }}
            >
              Full screen
            </button>
          )}
          {/* Selection Summary Badge */}
          {selectionSummary?.visible && (
            <div
              style={{
                position: "absolute",
                left: "70%",
                bottom: "10px",
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
                pointerEvents: "none",
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
              <span>
                Avg:{" "}
                {selectionSummary.avg.toLocaleString("en-US", {
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
