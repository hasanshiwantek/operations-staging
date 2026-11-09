// Every Proforma Invoice, Packing Slip and Purchase Order generated from the
// order sheet, with View PDF to open each one again for audits and cross-checks
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getIsFinance } from "../utils/constant";
import {
  fetchDocumentHistory,
  fetchDocumentRecord,
} from "../utils/documentHistoryApi";
import {
  DOC_TYPES,
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
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
              <ExternalLink size={15} /> Open in new tab
            </button>
            <button
              type="button"
              onClick={download}
              className="flex items-center gap-1.5 py-1.5 px-3 border border-[#06245f] text-[#06245f] text-sm font-medium hover:bg-indigo-50"
            >
              <Download size={15} /> Download
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
        <iframe
          title={viewer.fileName}
          src={viewer.url}
          className="flex-1 w-full bg-gray-100"
        />
      </div>
    </div>
  );
};

const DocumentHistory = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { users } = useSelector((state) => state.users);
  // Finance users cannot see vendor details on the sheet, so no Purchase Orders
  const isFinance = getIsFinance();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [opening, setOpening] = useState(null);
  const [viewer, setViewer] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setRows(await fetchDocumentHistory());
    } catch (err) {
      console.error("Document history failed:", err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (isFinance && row.type === "po") return false;
      if (typeFilter !== "all" && row.type !== typeFilter) return false;
      if (!q) return true;
      return [row.documentNumber, row.vendor, row.fileName, ...row.orderNos]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [rows, query, typeFilter, isFinance]);

  const viewPdf = async (row) => {
    setOpening(row.referenceId);
    try {
      // The list only carries a summary; load the saved record for this row
      const record = await fetchDocumentRecord(row);
      const form = formFromRecord(row.type, record);
      const { blob, fileName } = await GENERATORS[row.type](form, {
        output: "blob",
      });
      const when = formatWhen(row.createdAt);
      setViewer({
        url: URL.createObjectURL(blob),
        fileName: record.file_name || row.fileName || fileName,
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

  return (
    <div className="p-6">
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

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-3">
        <div>
          <h1 className="text-xl font-semibold">Document History</h1>
          <p className="text-sm text-gray-500">
            Every Proforma Invoice, Packing Slip and Purchase Order generated
            from the order sheet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 w-64 px-2.5 h-9 border border-gray-300 rounded-md bg-white">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              id="document-history-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Order#, document# or vendor"
              className="flex-1 min-w-0 outline-none text-sm bg-transparent"
            />
          </div>
          <select
            id="document-history-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 border border-gray-300 rounded-md px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {TYPE_FILTERS.filter((f) => !(isFinance && f.value === "po")).map(
              (f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ),
            )}
          </select>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="h-9 px-3 flex items-center gap-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
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
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  {rows.length
                    ? "No documents match this search."
                    : "No documents yet. Right-click an order on the sheet to generate a Proforma Invoice, Packing Slip or Purchase Order."}
                </td>
              </tr>
            ) : (
              visible.map((row) => {
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

      {viewer && <PdfViewer viewer={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
};

export default DocumentHistory;
