// Saving generated documents to the backend and reading the document history
import axiosInstance from "../Axios/axiosInstance";
import {
  companyFromStore,
  DOCUMENT_API,
  typeFromDocumentType,
} from "./orderDocuments";

// The selected store's current company details (store config: company, bank,
// logo), read fresh for every document so a store edit applies right away;
// null when the store has none yet
export const fetchStoreCompany = async () => {
  const response = await axiosInstance.get("/auth/admin/stores", {
    silent: true, // the document form reports its own errors
  });
  // The selected store = the store-id header the request went out with
  const storeId = String(response.config?.headers?.["store-id"] ?? "");
  const data = response.data?.data ?? response.data;
  const stores = Array.isArray(data) ? data : data ? [data] : [];
  const store =
    stores.find((s) => String(s?.id) === storeId) ||
    (stores.length === 1 ? stores[0] : null);
  return companyFromStore(store);
};

// Saves one generated document; resolves with the stored record's response
export const saveDocumentRecord = async (type, payload) => {
  const response = await axiosInstance.post(DOCUMENT_API[type].endpoint, payload);
  if (response.data?.success === false) {
    throw new Error(response.data?.message || "The document was not saved.");
  }
  return response.data?.data;
};

// "Purchase Order" (history type) → "po"
const TYPE_LABELS = {
  "proforma invoice": "proforma",
  "packing slip": "packing",
  "purchase order": "po",
};
const typeOfLabel = (label) => TYPE_LABELS[String(label || "").trim().toLowerCase()];

// Older responses nested the full record under main_data.invoice_data /
// packing_data / purchase_data; take whichever one holds a document_type
const nestedRecord = (mainData) => {
  if (!mainData || typeof mainData !== "object") return null;
  return (
    mainData.invoice_data ||
    mainData.packing_data ||
    mainData.purchase_data ||
    Object.values(mainData).find(
      (value) => value && typeof value === "object" && value.document_type,
    ) ||
    null
  );
};

// One history row → what the list shows; rows it cannot read are skipped.
// Current rows are flat summaries:
// { id, user_name, type, reference_id, order_nos, vendor, total, created_at }
const normalizeRow = (row) => {
  if (!row || typeof row !== "object") return null;
  const history = row.history || row;
  const record = nestedRecord(row.main_data);
  const type =
    typeOfLabel(history.type) || (record && typeFromDocumentType(record.document_type));
  if (!type) return null;
  const orderNos = Array.isArray(history.order_nos)
    ? history.order_nos
    : Array.isArray(record?.order_nos)
      ? record.order_nos
      : [];
  return {
    id: history.id,
    referenceId: history.reference_id,
    type,
    // The full record, when the list already carried it (older responses);
    // otherwise View PDF loads it with fetchDocumentRecord
    record,
    documentNumber: record?.document_number || history.document_number || null,
    fileName: record?.file_name || history.file_name || null,
    orderNo: record?.order_no || history.order_no || orderNos[0] || null,
    orderNos: orderNos.map(String),
    vendor: history.vendor ?? record?.vendor ?? null,
    total: history.total ?? record?.total ?? null,
    userId: history.user_id ?? row.main_data?.user_id ?? null,
    userName: history.user_name || row.main_data?.user?.name || null,
    createdAt: history.created_at || row.main_data?.created_at,
  };
};

// The saved documents in the order the API sent them. Handles a plain array or
// a paginated { data: [...], meta } body
export const normalizeHistory = (responseBody) => {
  const body = responseBody?.data;
  const rows = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
  return rows.map(normalizeRow).filter(Boolean);
};

// filters: { type, order_no, vendor, user_name, sortBy, sortDir, per_page, page };
// empty values are left out of the request
export const fetchDocumentHistory = async (filters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value != null),
  );
  const response = await axiosInstance.get("/document-histories", { params });
  const body = response.data;
  // Paging details sit in meta, or directly on a Laravel paginator
  const meta = body?.meta || body?.data?.meta || body?.data || {};
  return {
    rows: normalizeHistory(body),
    lastPage: Number(meta.last_page) || null,
    total: meta.total ?? null,
  };
};

// The full saved record behind a history row, for View PDF. Throws when the
// backend returns a record of a different type than the row, so the wrong
// document is never shown.
export const fetchDocumentRecord = async (row) => {
  if (row.record) return row.record;
  const response = await axiosInstance.get(`/document-histories/${row.referenceId}`);
  const record = response.data?.data;
  if (!record || typeof record !== "object" || !record.data) {
    throw new Error("The saved document could not be loaded.");
  }
  const returnedType = typeFromDocumentType(record.document_type);
  if (returnedType && returnedType !== row.type) {
    throw Object.assign(
      new Error(
        `History #${row.id} is a ${row.type} but the server returned a ${record.document_type}.`,
      ),
      { code: "TYPE_MISMATCH" },
    );
  }
  return record;
};
