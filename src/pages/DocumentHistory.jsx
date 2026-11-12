// Every Proforma Invoice, Packing Slip and Purchase Order generated from the
// order sheet, with View PDF to open each one again for audits and cross-checks
import {
  ArrowLeft,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import NumberedPagination from "../components/NumberedPagination";
import useEscapeKey from "../hooks/useEscapeKey";
import { getRoles } from "../store/authSlice";
import { fetchUsers } from "../store/usersSlice";
import { DOCUMENT_PERMISSIONS } from "../utils/constant";
import {
  fetchDocumentHistory,
  fetchDocumentRecord,
} from "../utils/documentHistoryApi";
import {
  DOC_TYPES,
  documentExtensionOf,
  formatMoney,
  formFromRecord,
  GENERATORS,
} from "../utils/orderDocuments";

const TYPE_FILTERS = [
  { value: "all", label: "All documents" },
  { value: "proforma", label: "Proforma Invoices" },
  { value: "packing", label: "Packing Slips" },
  { value: "po", label: "Purchase Orders" },
];

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Newest first" },
  { value: "created_at:asc", label: "Oldest first" },
];

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 400;

const PILL = {
  proforma: "bg-indigo-50 text-indigo-700 border-indigo-200",
  packing: "bg-emerald-50 text-emerald-700 border-emerald-200",
  po: "bg-amber-50 text-amber-800 border-amber-200",
};

const formatWhen = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: "-", time: "" };
  return {
    day: date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

// The rebuilt PDF in a modal, with its own download button
const PdfViewer = ({ viewer, onClose }) => {
  useEscapeKey(onClose);

  const download = () => {
    const link = document.createElement("a");
    link.href = viewer.url;
    link.download = viewer.fileName;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-2 sm:p-6">
      <div className="bg-white w-full max-w-5xl h-full max-h-[95vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-800 truncate">
              {viewer.fileName}
            </h2>
            <p className="text-xs text-gray-500">
              Rebuilt from the data saved on {viewer.savedOn}.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.open(viewer.url, "_blank", "noopener")}
              className="flex items-center gap-1.5 py-1.5 px-3 border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              <ExternalLink size={15} />
              <span className="hidden sm:inline">Open in new tab</span>
            </button>
            <button
              type="button"
              onClick={download}
              className="flex items-center gap-1.5 py-1.5 px-3 border border-[#06245f] text-[#06245f] text-sm font-medium hover:bg-indigo-50"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
        </div>
        {viewer.isImage ? (
          <div className="flex-1 overflow-auto bg-gray-100 p-3">
            <img
              src={viewer.url}
              alt={viewer.fileName}
              className="mx-auto max-w-full h-auto shadow bg-white"
            />
          </div>
        ) : (
          <iframe
            title={viewer.fileName}
            src={viewer.url}
            className="flex-1 w-full bg-gray-100"
          />
        )}
      </div>
    </div>
  );
};

// A native <select> cannot show the role on its own line under the name
const UserFilterSelect = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const items = [{ value: "", name: "All users" }, ...options];
  const selected = items.find((o) => o.value === value) || items[0];

  return (
    <div ref={rootRef} className="relative w-full xl:w-56">
      <button
        id="document-history-by"
        type="button"
        aria-label="Generated by"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full h-9 flex items-center justify-between gap-2 border border-gray-300 rounded-md bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span className="truncate">{selected.name}</span>
        <ChevronDown size={14} className="shrink-0 text-gray-500" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-20 max-h-64 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg py-1"
        >
          {items.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === selected.value}
            >
              <button
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none ${
                  option.value === selected.value ? "bg-indigo-50" : ""
                }`}
              >
                <span className="block text-sm text-gray-800 truncate">
                  {option.name}
                </span>
                {option.role && (
                  <span className="block text-xs text-gray-500 capitalize truncate">
                    {option.role}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const DocumentHistory = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, roles } = useSelector((state) => state.auth);
  const { users } = useSelector((state) => state.users);
  const { userPermissions, userPermissionsLoaded } = useSelector(
    (state) => state.permissions,
  );
  // Super Admin / Admin → full access
  const isAdminRole = user?.role_id === 1 || user?.role_id === 2;
  const canSeeHistory =
    isAdminRole ||
    userPermissions?.some((p) => p.slug === DOCUMENT_PERMISSIONS.history);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [orderInput, setOrderInput] = useState("");
  const [vendorInput, setVendorInput] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [vendor, setVendor] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState(SORT_OPTIONS[0].value);
  const [byFilter, setByFilter] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(null);
  const [total, setTotal] = useState(null);
  const [opening, setOpening] = useState(null);
  const [viewer, setViewer] = useState(null);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    const [sortBy, sortDir] = sort.split(":");
    setLoading(true);
    setFailed(false);
    try {
      const result = await fetchDocumentHistory({
        type: DOC_TYPES[typeFilter]?.title,
        order_no: orderNo,
        vendor,
        user_name: byFilter,
        sortBy,
        sortDir,
        per_page: PAGE_SIZE,
        page,
      });
      // A newer filter or page has been requested since; ignore this response
      if (request !== latestRequest.current) return;
      setRows(result.rows);
      setLastPage(result.lastPage);
      setTotal(result.total);
    } catch (err) {
      if (request !== latestRequest.current) return;
      console.error("Document history failed:", err);
      setFailed(true);
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [typeFilter, orderNo, vendor, byFilter, sort, page]);

  useEffect(() => {
    if (canSeeHistory) load();
  }, [load, canSeeHistory]);

  // Searches only once typing pauses, starting again from the first page
  useEffect(() => {
    const timer = setTimeout(() => {
      const nextOrderNo = orderInput.trim();
      const nextVendor = vendorInput.trim();
      if (nextOrderNo === orderNo && nextVendor === vendor) return;
      setOrderNo(nextOrderNo);
      setVendor(nextVendor);
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [orderInput, vendorInput, orderNo, vendor]);

  // The By dropdown lists every user with their role
  useEffect(() => {
    if (!canSeeHistory) return;
    dispatch(fetchUsers());
    dispatch(getRoles());
  }, [dispatch, canSeeHistory]);

  // Free the PDF's memory when the viewer closes
  useEffect(
    () => () => viewer?.url && URL.revokeObjectURL(viewer.url),
    [viewer],
  );

  const userName = useCallback(
    (row) => {
      if (row.userName) return row.userName;
      if (user && String(user.id) === String(row.userId)) return user.name;
      const match = (users || []).find(
        (u) => String(u.id) === String(row.userId),
      );
      return match?.name || (row.userId ? `User #${row.userId}` : "-");
    },
    [user, users],
  );

  // The API filters by name, so each name is listed once
  const byOptions = useMemo(() => {
    const options = new Map();
    const add = (name, role) => {
      if (name && !options.has(name)) {
        options.set(name, { value: name, name, role });
      }
    };
    (users || []).forEach((u) =>
      add(
        u.name,
        (roles || []).find((r) => String(r.id) === String(u.role_id))?.name,
      ),
    );
    // Keep anyone who generated a document but is not in the users list, and
    // the current choice even when it returned no rows
    rows.forEach((row) => add(row.userName));
    add(byFilter);
    return [...options.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [users, roles, rows, byFilter]);

  const hasFilters = typeFilter !== "all" || orderNo || vendor || byFilter;
  // Without a page count from the API, a full page means there may be more
  const hasNextPage = lastPage ? page < lastPage : rows.length === PAGE_SIZE;

  const viewPdf = async (row) => {
    setOpening(row.referenceId);
    try {
      // The list only carries a summary; load the saved record for this row
      const record = await fetchDocumentRecord(row);
      const form = formFromRecord(row.type, record);
      const { blob, fileName } = await GENERATORS[row.type](form, {
        output: "blob",
      });
      // Shown the way it was generated: Generate JPG → image, else PDF
      const isImage =
        (row.extension || documentExtensionOf(record)) === "jpg";
      let file = blob;
      let name = record.file_name || row.fileName || fileName;
      if (isImage) {
        // Only loaded when a JPG is opened
        const { pdfToJpgBlob } = await import("../utils/pdfToImage");
        file = await pdfToJpgBlob(blob);
        name = name.replace(/\.pdf$/i, "") + ".jpg";
      }
      const when = formatWhen(row.createdAt);
      setViewer({
        url: URL.createObjectURL(file),
        fileName: name,
        isImage,
        savedOn: `${when.day} at ${when.time}`,
      });
    } catch (err) {
      console.error("View PDF failed:", err);
      if (err?.code === "TYPE_MISMATCH") {
        toast.error(
          `The server sent a different document for this ${DOC_TYPES[row.type].title}, so it was not opened. Please report this to the backend team.`,
        );
      } else if (!err?.response?.data?.message) {
        // The API client already shows the backend's own message
        toast.error(
          "This document could not be opened. Try again in a moment.",
        );
      }
    } finally {
      setOpening(null);
    }
  };

  if (!canSeeHistory) {
    // The user's permissions load after this page mounts on a refresh
    if (!userPermissionsLoaded) {
      return (
        <div className="p-6 text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-medium transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between mb-4 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Document History</h1>
          <p className="text-sm text-gray-500">
            Every Proforma Invoice, Packing Slip and Purchase Order generated
            from the order sheet.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex xl:items-center xl:shrink-0 gap-2">
          <div className="flex items-center gap-1.5 w-full xl:w-36 px-2.5 h-9 border border-gray-300 rounded-md bg-white">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              id="document-history-order"
              type="text"
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
              placeholder="Order#"
              aria-label="Order number"
              className="flex-1 min-w-0 outline-none text-sm bg-transparent"
            />
          </div>
          <div className="flex items-center gap-1.5 w-full xl:w-40 px-2.5 h-9 border border-gray-300 rounded-md bg-white">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              id="document-history-vendor"
              type="text"
              value={vendorInput}
              onChange={(e) => setVendorInput(e.target.value)}
              placeholder="Vendor"
              aria-label="Vendor"
              className="flex-1 min-w-0 outline-none text-sm bg-transparent"
            />
          </div>
          <select
            id="document-history-type"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full xl:w-auto min-w-0 border border-gray-300 rounded-md px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {TYPE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <UserFilterSelect
            value={byFilter}
            options={byOptions}
            onChange={(value) => {
              setByFilter(value);
              setPage(1);
            }}
          />
          <select
            id="document-history-sort"
            aria-label="Sort by date"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="h-9 w-full xl:w-auto min-w-0 border border-gray-300 rounded-md px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="h-9 w-full xl:w-auto px-3 flex items-center justify-center gap-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border border-gray-200 rounded-lg overflow-hidden text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border text-left">Generated</th>
              <th className="p-3 border text-left">Document</th>
              <th className="p-3 border text-left">Orders</th>
              <th className="p-3 border text-left">Vendor</th>
              <th className="p-3 border text-right">Total</th>
              <th className="p-3 border text-left">By</th>
              <th className="p-3 border text-left w-[120px]"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </td>
              </tr>
            ) : failed ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-red-600">
                  The document history could not be loaded.{" "}
                  <button
                    type="button"
                    onClick={load}
                    className="underline font-medium"
                  >
                    Try again
                  </button>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  {hasFilters
                    ? "No documents match these filters."
                    : "No documents yet. Right-click an order on the sheet to generate a Proforma Invoice, Packing Slip or Purchase Order."}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const when = formatWhen(row.createdAt);
                return (
                  <tr
                    key={row.referenceId}
                    className="hover:bg-gray-50 align-top"
                  >
                    <td className="p-3 border whitespace-nowrap">
                      <div className="text-gray-800">{when.day}</div>
                      <div className="text-xs text-gray-500">{when.time}</div>
                    </td>
                    <td className="p-3 border">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${PILL[row.type]}`}
                        >
                          {DOC_TYPES[row.type].title}
                        </span>
                        {row.documentNumber && (
                          <span className="font-medium text-gray-800">
                            {row.documentNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 border text-gray-700">
                      {row.orderNos.length
                        ? row.orderNos.join(", ")
                        : row.orderNo || "-"}
                    </td>
                    <td className="p-3 border text-gray-700">
                      {row.vendor || "-"}
                    </td>
                    <td className="p-3 border text-right tabular-nums text-gray-800">
                      {row.total == null ? "-" : formatMoney(row.total)}
                    </td>
                    <td className="p-3 border text-gray-700">
                      {userName(row)}
                    </td>
                    <td className="p-3 border">
                      <button
                        type="button"
                        onClick={() => viewPdf(row)}
                        disabled={opening === row.referenceId}
                        className="flex items-center gap-1.5 py-1 px-3 border border-[#06245f] text-[#06245f] text-xs font-semibold hover:bg-indigo-50 disabled:opacity-60 whitespace-nowrap"
                      >
                        <FileText size={14} />
                        {opening === row.referenceId
                          ? "Opening..."
                          : row.extension === "jpg"
                            ? "View JPG"
                            : "View PDF"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!failed && (rows.length > 0 || page > 1) && (
        <NumberedPagination
          currentPage={page}
          // Without a page count from the API, offer one page past this one
          // while this page is full
          totalPages={lastPage || (hasNextPage ? page + 1 : page)}
          onPageChange={setPage}
          disabled={loading}
          summary={
            total != null ? (
              <>
                Showing{" "}
                <span className="font-medium">
                  {(page - 1) * PAGE_SIZE + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(page * PAGE_SIZE, total)}
                </span>{" "}
                of <span className="font-medium">{total}</span> documents
              </>
            ) : (
              <>
                Page {page}
                {lastPage && ` of ${lastPage}`}
              </>
            )
          }
        />
      )}

      {viewer && <PdfViewer viewer={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
};

export default DocumentHistory;
