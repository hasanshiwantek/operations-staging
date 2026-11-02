import { HotTable } from "@handsontable/react-wrapper";
import { registerAllModules } from "handsontable/registry";
import { textRenderer } from "handsontable/renderers";
import "handsontable/styles/handsontable.min.css";
import "handsontable/styles/ht-theme-main.min.css";
import { Search, X } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import * as XLSX from "xlsx";
import {
  fetchOrderEditRange,
  getEditRangeStartDate,
} from "../store/orderEditRangeSlice";
import { fetchOrderTypesMap } from "../store/orderTypeSlice";
import {
  createGenerateId,
  fetchOrderOptions,
  fetchOrdersAdmin,
  importOrderFiles,
  postOrderFiles,
  postSyncOrder,
  setOrderSearch,
  updateFinanceOrderCheck,
  updateOrderFiles,
} from "../store/usersSlice";
import {
  CHECKBOX_FIELDS,
  columnsOfSheet,
  FLAT_VALUE_FIELDS,
  flattenOrderValues,
  formatNumberCell,
  getFieldChecked,
  getFieldHighlight,
  getFieldValue,
  getIsAdmin,
  setCheckboxChangeHandler,
} from "../utils/constant";
import EditOrderDetailModal from "./EditOrderDetailModal";
import ExportOrdersPdf from "./ExportOrdersPdf";
import ExportProgressModal, {
  EXPORT_SLICE_MS,
  ExportCancelledError,
  yieldToBrowser,
} from "./ExportProgressModal";
import OrderDetailModal from "./OrderDetailModal";

registerAllModules();

// The React wrapper calls updateSettings with every prop each time HotTable
// renders, which re-initialises plugins and redraws the whole grid. Memoizing
// it keeps unrelated state (search box, find bar, selection summary, modals)
// from touching the grid — so every prop passed to it must stay stable.
const MemoHotTable = React.memo(
  React.forwardRef((props, ref) => <HotTable ref={ref} {...props} />),
);

const HOT_STYLE = { zIndex: 10 };

// More changed rows than this and the grid is reloaded instead of patched
const MAX_PATCHED_ROWS = 20;

// How long a just-saved row stays highlighted after the sheet reloads
const ROW_FLASH_MS = 4000;

const stopHeaderMouseDown = (event, coords) => {
  if (coords.row === -1) event.stopImmediatePropagation();
};

// Clicking outside the sheet clears the selection, except inside HOT's
// own menus (context / filter dropdowns) and the Find bar
const outsideClickDeselects = (target) =>
  !target?.closest?.(
    ".htContextMenu, .htDropdownMenu, .htFiltersConditionsMenu, .htMenu, [data-keep-selection]",
  );

// ========== Column widths ==========
// Replaces autoColumnSize, which measured cells in the DOM across every row on
// each data load. Here only the few longest values per column (by character
// count) are measured, on a canvas with the grid's font.
const CELL_FONT = '14px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'; // ht-theme-main
const HEADER_FONT = `700 ${CELL_FONT}`;
const CELL_PADDING_PX = 18; // td padding + border + a little slack
const HEADER_EXTRA_PX = 38; // th padding + dropdown menu button
const CHECKBOX_WIDTH_PX = 20;
const MIN_COL_WIDTH = 60;
const MAX_COL_WIDTH = 320;
const MEASURED_PER_COLUMN = 5;

let measureContext = null;
const measureText = (text, font) => {
  measureContext ??= document.createElement("canvas").getContext("2d");
  measureContext.font = font;
  return measureContext.measureText(text).width;
};

// Length of a number as formatNumberCell shows it: "-1,234,567.89"
const formattedNumberLength = (raw, decimals) => {
  const num = Number(String(raw).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(num)) return String(raw).length;
  const digits = String(Math.trunc(Math.abs(num))).length;
  return (
    digits +
    Math.floor((digits - 1) / 3) +
    (decimals ? decimals + 1 : 0) +
    (num < 0 ? 1 : 0)
  );
};

const estimateColumnWidths = (orders) =>
  hotColumns.map((column) => {
    if (column.width) return column.width;
    const key = column.data;
    const headerWidth =
      measureText(String(column.title || ""), HEADER_FONT) + HEADER_EXTRA_PX;
    const isDate = DATE_COLUMNS.includes(key);
    const isNumber = NUMERIC_COLUMNS.includes(key);
    const decimals = key === "Qty" ? 0 : 2;

    // The longest values by character count, as [length, raw] pairs
    let candidates = [];
    if (isDate) {
      candidates = [[10, "00/00/0000"]]; // MM/DD/YYYY
    } else {
      for (let i = 0; i < orders.length; i++) {
        const value = orders[i]?.[key];
        const raw = value && typeof value === "object" ? value.value : value;
        if (raw === null || raw === undefined || raw === "") continue;
        const length = isNumber
          ? formattedNumberLength(raw, decimals)
          : String(raw).length;
        if (
          candidates.length === MEASURED_PER_COLUMN &&
          length <= candidates[candidates.length - 1][0]
        )
          continue;
        candidates.push([length, raw]);
        candidates.sort((a, b) => b[0] - a[0]);
        candidates.length = Math.min(candidates.length, MEASURED_PER_COLUMN);
      }
    }

    const longestText = candidates.reduce((widest, [, raw]) => {
      const text = isNumber
        ? formatNumberCell(raw, decimals)
        : String(raw);
      return Math.max(widest, measureText(text, CELL_FONT));
    }, 0);

    const cellWidth =
      longestText +
      CELL_PADDING_PX +
      (CHECKBOX_FIELDS.includes(key) ? CHECKBOX_WIDTH_PX : 0);
    return Math.ceil(
      Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, headerWidth, cellWidth)),
    );
  });

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

// Number cells show the source value with thousand separators (Qty keeps whole numbers)
function numberTextRenderer(
  instance,
  td,
  row,
  col,
  prop,
  value,
  cellProperties,
) {
  // getSourceDataAtCell, not getSourceDataAtRow: the latter copies the whole row
  const source = instance.getSourceDataAtCell(instance.toPhysicalRow(row), col);
  const raw = source && typeof source === "object" ? source.value : source;
  const text =
    prop === "Qty" ? formatNumberCell(raw, 0) : formatNumberCell(raw);
  textRenderer(instance, td, row, col, prop, text, cellProperties);
}

// Date cells hold ISO values in the grid (see toTableRow) but show MM/DD/YYYY
function usDateRenderer(instance, td, row, col, prop, value, cellProperties) {
  const raw = instance.getSourceDataAtCell(instance.toPhysicalRow(row), col);
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
      renderer: column.renderer || numberTextRenderer,
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
  // Number cells show thousand separators; let "1,234" find the stored 1234
  let needle = /^[\d,.\-\s$]+$/.test(query) ? query.replace(/,/g, "") : query;
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

// isActive: false while the sheet stays mounted but hidden behind another tab
function OrderListTable({ Orders, isActive = true }) {
  const dispatch = useDispatch();
  const hotRef = useRef(null);
  const isRightClickRef = useRef(false);
  const expandingRef = useRef(false);
  // No deep copy (structuredClone took ~230ms for 6k+ orders): orders are only
  // ever replaced, never mutated, and the grid gets its own row copies
  const [tableOrders, setTableOrders] = useState(() => Orders || []);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const { orderloading, syncLoading, orderCheckLoading, orderSearch } =
    useSelector((state) => state.users);
  // Search box text; the API search runs once typing pauses
  const [searchInput, setSearchInput] = useState(orderSearch || "");
  const searchDebounceRef = useRef(null);
  const { storeId, user: authUser } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state?.auth);
  const { userPermissions } = useSelector((state) => state?.permissions);
  const permissions = userPermissions || [];
  const { orderTypesMap } = useSelector((state) => state.orderTypes);
  const { month: editRangeMonth } = useSelector(
    (state) => state.orderEditRange,
  );
  const editRangeStart = getEditRangeStartDate(editRangeMonth);
  const [isFullScreen, setIsFullScreen] = useState(false);
  // Excel export progress: null = idle; otherwise { message, progress }
  const [excelExport, setExcelExport] = useState(null);
  // Bumped on every start/cancel; a run whose id is stale stops at its next pause
  const excelRunIdRef = useRef(0);
  const cancelExcelExport = () => {
    excelRunIdRef.current += 1;
    setExcelExport(null);
  };
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isRMAMode, setIsRMAMode] = useState(false);
  const [isCreatePartMode, setIsCreatePartMode] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  // Rows left visible by the column filters (null = no column filter active)
  const [visibleOrders, setVisibleOrders] = useState(null);
  // Columns with a filter applied (drives the "Clear filters" button)
  const [columnFilterCount, setColumnFilterCount] = useState(0);
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
  // 5 = Operation (CC/Paypal 4% checkbox only)
  const permissionOfSaveBtn = [1, 2, 3, 5].includes(roleId);
  const hasPermission = (slug) => {
    // Super Admin / Admin → full access
    if (roleId === 1 || roleId === 2) return true;
    return permissions?.some((p) => p.slug === slug);
  };
  const isAdminRole = roleId === 1 || roleId === 2;

  // Orders dated before the admin-set start month are locked for non-admins
  const isOrderEditLocked = (order) => {
    if (isAdminRole || !editRangeStart) return false;
    const orderDate = toISODate(order?.["Order Date"]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDate)) return false;
    return orderDate < editRangeStart;
  };

  const runOrderSearch = (value) => {
    clearTimeout(searchDebounceRef.current);
    const next = value.trim();
    if (next === (orderSearch || "").trim()) return;
    dispatch(setOrderSearch(next));
    dispatch(fetchOrdersAdmin(storeId?.id));
  };

  const handleSearchChange = (value) => {
    setSearchInput(value);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => runOrderSearch(value), 500);
  };

  useEffect(() => () => clearTimeout(searchDebounceRef.current), []);

  useEffect(() => {
    dispatch(fetchOrderEditRange());
  }, [dispatch, storeId?.id]);

  useEffect(() => {
    setTableOrders(Orders || []);
  }, [Orders]);

  // While hidden the grid has no size and must not take keyboard input
  // (arrow keys / Ctrl+C on the Dashboard); when shown again, re-measure it
  useEffect(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || hot.isDestroyed) return;
    if (isActive) {
      hot.refreshDimensions();
    } else {
      hot.deselectCell();
      hot.unlisten();
    }
  }, [isActive]);

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

  // What the grid holds: the row objects last passed to updateData (the grid
  // keeps them by reference) and the orders they were made from
  const gridDataRef = useRef([]);
  const gridOrdersRef = useRef(null);
  // The grid instance that holds gridDataRef; a new instance (StrictMode
  // re-mount, wrapper re-init) starts empty and must get every row again
  const gridInstanceRef = useRef(null);

  // ---------- Saved-row highlight ----------
  // After a save the whole sheet reloads, so the rows the user just saved are
  // highlighted (and scrolled to) once the new data lands. pendingFlashIdsRef
  // holds the Order#s until then; flashIdsRef is what `cells` reads.
  const pendingFlashIdsRef = useRef(null);
  const flashIdsRef = useRef(new Set());
  const flashTimerRef = useRef(null);

  const flashSavedRows = (hot) => {
    const ids = pendingFlashIdsRef.current;
    if (!ids?.length) return;
    pendingFlashIdsRef.current = null;
    flashIdsRef.current = new Set(ids.map(String));

    const physicalRow = gridDataRef.current.findIndex((row) =>
      flashIdsRef.current.has(String(row?.["Order#"])),
    );
    const visualRow = physicalRow === -1 ? null : hot.toVisualRow(physicalRow);
    // A few rows above it stay in view for context
    if (visualRow != null && visualRow >= 0) {
      hot.scrollViewportTo(Math.max(0, visualRow - 3));
    }
    hot.render();

    clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      flashIdsRef.current = new Set();
      if (!hot.isDestroyed) hot.render();
    }, ROW_FLASH_MS);
  };

  useEffect(() => () => clearTimeout(flashTimerRef.current), []);

  const syncVisibleOrders = useCallback(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || hot.isDestroyed) return;

    if (hot.countRows() === hot.countSourceRows()) {
      setVisibleOrders(null);
      return;
    }

    // Our own row objects, not getSourceDataAtRow: that copies each row, which
    // was slow over thousands of rows and never matched the identity check below
    const gridData = gridDataRef.current;
    const rows = [];
    for (let row = 0; row < hot.countRows(); row++) {
      const order = gridData[hot.toPhysicalRow(row)];
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
      setColumnFilterCount(tableStateRef.current.conditions.length);
    }
    syncVisibleOrders();
    setGridVersion((v) => v + 1);
  }, [syncVisibleOrders]);

  // Every column filter plus the "Filter by Color" one, cleared in one go
  const activeFilterCount =
    columnFilterCount + (orderTypeFilter !== "all" ? 1 : 0);
  const clearAllFilters = () => {
    const hot = hotRef.current?.hotInstance;
    if (hot && !hot.isDestroyed) {
      const filters = hot.getPlugin("filters");
      filters.clearConditions();
      filters.filter();
    }
    setOrderTypeFilter("all");
  };

  const handleAfterColumnSort = useCallback(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || hot.isDestroyed) return;
    tableStateRef.current.sort = hot.getPlugin("columnSorting").getSortConfig();
    setGridVersion((v) => v + 1);
  }, []);

  // Rows are cached per order object, so a checkbox tick (which replaces one
  // order) only converts that order again
  const tableRowCacheRef = useRef(new WeakMap());
  const tableData = useMemo(() => {
    const cache = tableRowCacheRef.current;
    return (filteredOrders || []).map((order) => {
      let row = cache.get(order);
      if (!row) {
        row = toTableRow(order);
        cache.set(order, row);
      }
      return row;
    });
  }, [filteredOrders]);

  // The data is pushed in here instead of through the `data` prop: the React
  // wrapper re-sends every prop on each render, and re-loading the data on
  // every render (e.g. when the selection summary updates) wiped the filters.
  useEffect(() => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || hot.isDestroyed) return;

    const prevOrders = gridOrdersRef.current;
    const gridData = gridDataRef.current;
    gridOrdersRef.current = filteredOrders;

    // A checkbox tick swaps just one order object. Patch those few rows in
    // place instead of reloading every row; an active column filter or sort
    // is re-applied in case the patched values affect it.
    if (
      prevOrders &&
      gridInstanceRef.current === hot &&
      prevOrders.length === filteredOrders.length &&
      gridData.length === tableData.length
    ) {
      const changed = [];
      for (let i = 0; i < tableData.length; i++) {
        if (prevOrders[i] !== filteredOrders[i]) {
          changed.push(i);
          if (changed.length > MAX_PATCHED_ROWS) break;
        }
      }
      if (changed.length <= MAX_PATCHED_ROWS) {
        if (!changed.length) return;
        const cache = tableRowCacheRef.current;
        changed.forEach((i) => {
          Object.assign(gridData[i], tableData[i]);
          // The patched grid row now belongs to the new order. Drop the old
          // order's cache entry, or if that order object comes back (e.g. a
          // tick is reverted) it would map to this row with the wrong values.
          cache.delete(prevOrders[i]);
          cache.set(filteredOrders[i], gridData[i]);
        });
        const filters = hot.getPlugin("filters");
        const sorting = hot.getPlugin("columnSorting");
        if (filters.isEnabled() && filters.exportConditions().length) {
          filters.filter();
        }
        const sortConfig = sorting.isEnabled() ? sorting.getSortConfig() : [];
        if (sortConfig.length) sorting.sort(sortConfig);
        hot.render();
        flashSavedRows(hot);
        return;
      }
    }

    gridDataRef.current = tableData;
    gridInstanceRef.current = hot;
    hot.updateData(tableData);
    // updateData keeps the filter/sort settings but not their result, so new
    // rows (a reload after saving, the colour filter) would show unfiltered
    const filters = hot.getPlugin("filters");
    const sorting = hot.getPlugin("columnSorting");
    if (filters.isEnabled() && filters.exportConditions().length) {
      filters.filter();
    }
    const sortConfig = sorting.isEnabled() ? sorting.getSortConfig() : [];
    if (sortConfig.length) sorting.sort(sortConfig);
    syncVisibleOrders();
    flashSavedRows(hot);
  }, [filteredOrders, tableData, syncVisibleOrders]);

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
      // Hidden behind another tab: leave Ctrl+F to the browser
      if (!isActiveRef.current) return;
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

  // Read through a ref so the grid callbacks below can stay stable
  const filteredOrdersRef = useRef(filteredOrders);
  filteredOrdersRef.current = filteredOrders;

  // Visual row (after sorting/filtering) → the order it shows
  const getOrderAtRow = useCallback((visualRow) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot || visualRow === null || visualRow === undefined || visualRow < 0)
      return undefined;
    return filteredOrdersRef.current?.[hot.toPhysicalRow(visualRow)];
  }, []);

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

  const handleAfterGetColHeader = useCallback((col, TH, headerLevel) => {
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
  }, []);
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
  const exportToExcel = async () => {
    if (excelExport) return;
    const visibleRows = getGridOrders();
    if (!visibleRows || visibleRows.length === 0)
      return alert("No data to export");

    const total = visibleRows.length;
    const runId = ++excelRunIdRef.current;
    // Yield to the browser, then stop here if the user cancelled meanwhile
    const pause = async () => {
      await yieldToBrowser();
      if (excelRunIdRef.current !== runId) throw new ExportCancelledError();
    };
    setExcelExport({ message: `Preparing ${total} orders...`, progress: 0 });

    try {
      await pause();

      // Convert rows in time slices so the progress modal and Cancel stay responsive
      const exportRows = [];
      let sliceStart = performance.now();
      for (let i = 0; i < total; i++) {
        if (performance.now() - sliceStart > EXPORT_SLICE_MS) {
          setExcelExport({
            message: `Processing ${i} of ${total} orders...`,
            progress: (i / total) * 0.6,
          });
          await pause();
          sliceStart = performance.now();
        }

        const { order_type, ...order } = visibleRows[i];
        const row = { ...order };
        Object.keys(row).forEach((key) => {
          row[key] = getFieldValue(row[key]);
        });
        exportRows.push(row);
      }

      // Sheet building and file writing are single SheetJS calls — shown as indeterminate
      setExcelExport({ message: "Building spreadsheet...", progress: null });
      await pause();
      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Orders");

      setExcelExport({ message: "Saving Excel file...", progress: null });
      await pause();
      XLSX.writeFile(
        wb,
        `Orders_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (err) {
      if (err instanceof ExportCancelledError) return;
      console.error("Excel export failed:", err);
      alert("Excel export failed. Please try again.");
    } finally {
      if (excelRunIdRef.current === runId) setExcelExport(null);
    }
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
        pendingFlashIdsRef.current = payload.map((row) => row.order_id);
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
      const order = filteredOrdersRef.current?.[row];
      // Always return a className: the grid caches cell meta, so leaving it
      // out would keep a colour class the cell no longer has
      const cellProperties = { className: "" };
      if (!order) return cellProperties;

      const status = String(order?.["Order Status"] || "").toLowerCase();
      const type = String(order?.order_type || "").toLowerCase();
      const hasRmaOrders =
        Array.isArray(order?.rmaOrderNos) && order.rmaOrderNos.length > 0;

      if (hasRmaOrders) cellProperties.className = "rma-row";
      else if (status === "delivered")
        cellProperties.className = "delivered-row";
      else if (status === "cancelled")
        cellProperties.className = "cancelled-row";
      else if (status === "incomplete")
        cellProperties.className = "incomplete-row";
      else if (type === "incomplete")
        cellProperties.className = "incomplete-row";
      else if (type === "po") cellProperties.className = "po-row";
      else if (type === "rma") cellProperties.className = "rma-row";

      // Just-saved row (see flashSavedRows)
      if (flashIdsRef.current.has(String(order["Order#"]))) {
        cellProperties.className = `${cellProperties.className} row-flash`.trim();
      }

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
    // Reads the orders through a ref so it stays stable: a new `cells` would
    // make the grid re-apply all its settings (see MemoHotTable)
    [],
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
    // Keyed on the totals, not the summary object: a checkbox tick rebuilds the
    // summary with the same numbers, and new headers make the grid re-apply
    // all its settings (see MemoHotTable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(summary)]);
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
  // Esc closes the innermost layer first: an open Find bar, then full screen
  const findOpenRef = useRef(findOpen);
  findOpenRef.current = findOpen;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (findOpenRef.current) {
        setFindOpen(false);
        hotRef.current?.hotInstance?.listen();
        return;
      }
      setIsFullScreen(false);
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

  // ---------- Stable grid props (see MemoHotTable) ----------
  // Sized from the server data only, so ticking checkboxes or filtering
  // doesn't make the columns jump. The previous array is kept when the widths
  // come out the same (e.g. after a saved edit), so the grid isn't reconfigured.
  const colWidthsRef = useRef(null);
  const colWidths = useMemo(() => {
    const next = estimateColumnWidths(Orders || []);
    const prev = colWidthsRef.current;
    if (prev && prev.length === next.length && prev.every((w, i) => w === next[i]))
      return prev;
    colWidthsRef.current = next;
    return next;
  }, [Orders]);

  const handleAfterRenderer = useCallback(
    (td, row, col) => {
      const order = getOrderAtRow(row);
      const column = columnsOfSheet[col]?.data;
      const color = resolveCellColor(order, column);

      // Always set (or clear): cells are recycled, so a cell that lost its
      // colour would otherwise keep the previous one
      td.style.backgroundColor = color || "";

      // Find (Ctrl+F) highlights — toggled so recycled cells don't keep them
      const { matches, current } = findHighlightRef.current;
      const hot = hotRef.current?.hotInstance;
      const key =
        matches.size && hot ? `${hot.toPhysicalRow(row)}:${col}` : "";
      td.classList.toggle("ht-find-match", Boolean(key) && matches.has(key));
      td.classList.toggle("ht-find-current", Boolean(key) && key === current);
    },
    [getOrderAtRow],
  );

  const handleBeforeCellMouseDown = useCallback((event) => {
    isRightClickRef.current = event.button === 2;
  }, []);

  const handleBeforeCellContextMenu = useCallback((event) => {
    event.preventDefault(); // only this is needed
    isRightClickRef.current = true; // reset right-click flag
  }, []);

  const handleAfterSelectionEnd = useCallback(
    (r1, c1, r2, c2) => {
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
    },
    [updateSelectionSummary],
  );

  const handleAfterDeselect = useCallback(() => {
    setSelectionSummary((prev) =>
      prev.visible ? { sum: 0, count: 0, avg: 0, visible: false } : prev,
    );
  }, []);

  const handleAfterContextMenuHide = useCallback(() => {
    isRightClickRef.current = false;
  }, []);

  // The context menu is built once; its callbacks read the latest
  // permissions / handlers through this ref
  const contextMenuRef = useRef(null);
  contextMenuRef.current = {
    isOrderEditLocked,
    hasPermission,
    handleOrderClick,
    storeId,
  };

  const contextMenu = useMemo(
    () => ({
      items: {
        edit: {
          name: "Edit",
          disabled: function () {
            const selected = this.getSelectedLast();
            if (!selected) return true;
            return contextMenuRef.current.isOrderEditLocked(
              getOrderAtRow(selected[0]),
            );
          },
          hidden: function () {
            // // Hide if user doesn't have permission
            // if (!hasPermission("view_sheet.edit_order")) return true;
            // return false;
            const selected = this.getSelectedLast();
            if (!selected || selected[0] < 0) return true;
            if (!contextMenuRef.current.hasPermission("view_sheet.edit_order"))
              return true;
            return false;
          },
          callback: function (key, selection) {
            const { isOrderEditLocked, handleOrderClick } =
              contextMenuRef.current;
            const row = selection[0].start.row;
            if (isOrderEditLocked(getOrderAtRow(row))) return;
            handleOrderClick(row); // your existing handler
          },
        },
        create_part: {
          name: "Create part order",
          disabled: function () {
            const selected = this.getSelectedLast();
            if (!selected) return true;
            return contextMenuRef.current.isOrderEditLocked(
              getOrderAtRow(selected[0]),
            );
          },
          hidden: function () {
            const selected = this.getSelectedLast();
            if (!selected || selected[0] < 0) return true;
            // Hide if no permission
            if (!contextMenuRef.current.hasPermission("view_sheet.po"))
              return true;

            if (!selected) return true;

            const row = selected[0];
            const order = getOrderAtRow(row);
            const type = String(order?.order_type || "").toLowerCase();
            const status = String(order?.["Order Status"] || "").toLowerCase();

            return type === "po" || type === "rma" || status === "cancelled";
          },
          callback: async (key, selection) => {
            const { isOrderEditLocked, storeId } = contextMenuRef.current;
            const row = selection[0].start.row;
            if (isOrderEditLocked(getOrderAtRow(row))) return;

            let { order_type, ...originalOrder } = getOrderAtRow(row) || {};

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
          disabled: function () {
            const selected = this.getSelectedLast();
            if (!selected) return true;
            return contextMenuRef.current.isOrderEditLocked(
              getOrderAtRow(selected[0]),
            );
          },
          hidden: function () {
            const selected = this.getSelectedLast();
            if (!selected || selected[0] < 0) return true;
            if (!contextMenuRef.current.hasPermission("view_sheet.rma"))
              return true;

            if (!selected) return true;

            const row = selected[0];
            const order = getOrderAtRow(row);
            const type = String(order?.order_type || "").toLowerCase();
            const status = String(order?.["Order Status"] || "").toLowerCase();

            return type === "rma" || status == "cancelled";
          },
          callback: async (key, selection) => {
            const { isOrderEditLocked, storeId } = contextMenuRef.current;
            const row = selection[0].start.row;
            if (isOrderEditLocked(getOrderAtRow(row))) return;
            let { order_type, ...originalOrder } = getOrderAtRow(row) || {};

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
    }),
    [dispatch, getOrderAtRow],
  );
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

  // Shown in the toolbar and the full-screen bar while any filter is applied
  const clearFiltersButton = activeFilterCount > 0 && (
    <button
      type="button"
      onClick={clearAllFilters}
      title="Remove every column filter and the colour filter"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 8,
        border: "1px solid #fca5a5",
        background: "#fff",
        color: "#b91c1c",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <X size={14} />
      Clear filters ({activeFilterCount})
    </button>
  );

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
                  pendingFlashIdsRef.current = [updatedOrder["Order#"]];
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
                  pendingFlashIdsRef.current = [updatedOrder["Order#"]];
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
                  pendingFlashIdsRef.current = [updatedOrder["Order#"]];
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

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                width: "260px",
                padding: "0 10px",
                height: "38px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                background: "#fff",
              }}
            >
              <Search size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runOrderSearch(searchInput);
                  if (e.key === "Escape" && searchInput) {
                    setSearchInput("");
                    runOrderSearch("");
                  }
                }}
                placeholder="Search by keyword"
                title="Order No, Customer, Email, Part#, Status, Date, Tracking, etc."
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: "none",
                  outline: "none",
                  fontSize: "13px",
                  background: "transparent",
                }}
              />
              {orderloading && searchInput ? (
                <span
                  style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid #c7d2fe",
                    borderTopColor: "#4f46e5",
                    borderRadius: "50%",
                    flexShrink: 0,
                  }}
                  className="animate-spin"
                />
              ) : (
                searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      runOrderSearch("");
                    }}
                    title="Clear search"
                    style={{
                      display: "flex",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      padding: 0,
                      color: "#9ca3af",
                    }}
                  >
                    <X size={16} />
                  </button>
                )
              )}
            </div>
            {clearFiltersButton}
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
                disabled={Boolean(excelExport)}
                style={{
                  padding: "8px 16px",
                  background: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: excelExport ? "progress" : "pointer",
                  opacity: excelExport ? 0.7 : 1,
                }}
              >
                {excelExport ? "Exporting..." : "Download Excel"}
              </button>
            )}
            {excelExport && (
              <ExportProgressModal
                title="Exporting Excel"
                message={excelExport.message}
                progress={excelExport.progress}
                onCancel={cancelExcelExport}
              />
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
          {/* Loading overlay — dims the table while orders are fetched or checks are saved */}
          {(orderloading || orderCheckLoading) && (
            <div
              aria-busy="true"
              aria-live="polite"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 200,
                background: "rgba(255, 255, 255, 0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "progress",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 16px",
                  background: "#fff",
                  borderRadius: "999px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#4f46e5",
                }}
              >
                <span
                  className="animate-spin"
                  style={{
                    width: "18px",
                    height: "18px",
                    border: "3px solid #c7d2fe",
                    borderTopColor: "#4f46e5",
                    borderRadius: "50%",
                  }}
                />
                {orderCheckLoading ? "Saving checks..." : "Loading orders..."}
              </div>
            </div>
          )}
          {isFullScreen && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
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
              {clearFiltersButton}
              {/* Save checked fields without leaving full screen */}
              {permissionOfSaveBtn && hasPendingChecks && (
                <button
                  type="button"
                  onClick={handleSaveCheckedFields}
                  disabled={orderCheckLoading}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "#db2777",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: orderCheckLoading ? "progress" : "pointer",
                    boxShadow: "0 2px 8px rgba(219,39,119,0.3)",
                  }}
                >
                  {orderCheckLoading ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          )}
          <style>{`
            /* Just-saved row: a blue overlay (row colours use !important
               backgrounds, and red/yellow/green/pink already mean a status)
               that holds, then fades out */
            @keyframes ht-row-flash {
              0%, 70% { box-shadow: inset 0 0 0 9999px rgba(59, 130, 246, 0.4); }
              100% { box-shadow: inset 0 0 0 9999px rgba(59, 130, 246, 0); }
            }
            .handsontable td.row-flash {
              animation: ht-row-flash ${ROW_FLASH_MS}ms ease-out forwards;
            }
            .handsontable td.ht-find-match.ht-find-match {
              background-color: #fff3a3 !important;
            }
            .handsontable td.ht-find-current.ht-find-current {
              background-color: #ffc53d !important;
            }
          `}</style>
          {findOpen && (
            <div
              data-keep-selection
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
          <MemoHotTable
            ref={hotRef}
            // No `data` prop: rows are loaded via hot.updateData(tableData) above.
            // Every prop here must be stable (module constant, useMemo or
            // useCallback) or the whole grid redraws on each render.
            startRows={0}
            columns={hotColumns}
            style={HOT_STYLE}
            colHeaders={true}
            rowHeaders={false}
            selectionMode="multiple"
            afterRenderer={handleAfterRenderer}
            fragmentSelection={false}
            afterOnCellMouseDown={stopHeaderMouseDown}
            beforeOnCellMouseDown={handleBeforeCellMouseDown}
            beforeOnCellContextMenu={handleBeforeCellContextMenu}
            afterSelectionEnd={handleAfterSelectionEnd}
            afterDeselect={handleAfterDeselect}
            afterContextMenuHide={handleAfterContextMenuHide}
            stretchH="all"
            wordWrap={false}
            autoColumnSize={false}
            colWidths={colWidths}
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
            outsideClickDeselects={outsideClickDeselects}
            afterGetColHeader={handleAfterGetColHeader}
            nestedHeaders={nestedHeaders}
            contextMenu={contextMenu}
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

// Memoized so Dashboard re-renders that keep the same Orders skip the sheet
export default React.memo(OrderListTable);
