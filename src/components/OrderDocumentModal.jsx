// Form for the Proforma Invoice / Packing Slip / Purchase Order PDFs:
// pre-filled from the order and its part orders, the user adds what is missing
import { X } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import SearchableSelect from "./SearchableSelect";
import {
  fetchStoreCompany,
  saveDocumentRecord,
} from "../utils/documentHistoryApi";
import {
  buildCustomerForm,
  buildDocumentPayload,
  buildPurchaseOrderForm,
  DOC_TYPES,
  findMissing,
  formatMoney,
  GENERATORS,
  getOrderFamily,
  getTotals,
  groupByVendor,
  isItemFieldRequired,
  itemAmount,
  parseVendorDetails,
  unitPriceFor,
  REQUIRED_FIELDS,
} from "../utils/orderDocuments";
import { normalizeOrderOptions } from "../utils/constant";

const text = (v) => String(v ?? "").trim();

// Money has at most 2 decimals. Pasted "$1,234.50" is cleaned to "1234.50";
// anything else returns null and the keystroke is ignored
const NUMBER_RULES = {
  money: /^\d*(\.\d{0,2})?$/,
};
const sanitizeNumber = (value, kind) => {
  const cleaned = String(value ?? "").replace(/[$,\s]/g, "");
  return NUMBER_RULES[kind].test(cleaned) ? cleaned : null;
};

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------
const inputClass = (state) =>
  [
    "w-full px-2.5 py-1.5 text-sm border rounded-md outline-none transition-colors",
    "focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500",
    state === "error"
      ? "border-red-500 bg-red-50"
      : state === "missing"
        ? "border-red-500 bg-red-50"
        : state === "disabled"
          ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
          : "border-gray-300 bg-white",
  ].join(" ");

// SearchableSelect inside a box styled like the other inputs
const SelectBox = ({ name, value, options, onChange, state, disabled, placeholder }) => (
  <div
    className={`${inputClass(state)} flex items-center !py-0 h-[34px]`}
    data-missing={state === "error" || state === "missing" ? "true" : undefined}
  >
    <SearchableSelect
      name={name}
      value={value ?? ""}
      options={options}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full min-w-0 bg-transparent border-0 outline-none p-0 text-sm text-gray-800 cursor-pointer disabled:cursor-not-allowed"
    />
  </div>
);

// Which order-sheet option list feeds each form field
const OPTION_SOURCES = {
  paymentTerms: "Payment Status",
  shippingMethod: "Carrier",
  shippedVia: "Carrier",
  salesRep: "Sales Agent",
  requisitioner: "Procured By",
  vendorCompany: "Vendor",
  condition: "Condition",
};

// Option lists come keyed by sheet field ("Payment Status") or snake case
// ("payment_status"); the current value stays selectable even if not listed
const getOptions = (normalized, field, current) => {
  const source = OPTION_SOURCES[field];
  if (!source) return null;
  const snake = source.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const list = normalized[source] || normalized[snake] || [];
  const values = list.map((opt) => text(opt)).filter(Boolean);
  if (!values.length) return null;
  const now = text(current);
  return now && !values.includes(now) ? [now, ...values] : values;
};

const Field = ({
  label,
  name,
  form,
  onChange,
  required,
  missing,
  showErrors,
  multiline,
  rows = 4,
  placeholder,
  type = "text",
  className = "",
  disabled = false,
  options,
  optionsLoading,
}) => {
  const state = disabled
    ? "disabled"
    : missing
      ? showErrors
        ? "error"
        : "missing"
      : "ok";
  // Fields with an option list on the order sheet are dropdowns, like in the
  // add / edit order form
  if (options?.length && !multiline) {
    return (
      <div className={`flex flex-col gap-1 ${className}`} data-field={name}>
        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
          {label}
          {required && <span className="text-red-500">*</span>}
        </span>
        <SelectBox
          name={name}
          value={form[name]}
          options={options}
          onChange={(value) => onChange(name, value)}
          state={state}
          disabled={disabled || optionsLoading}
          placeholder={optionsLoading ? "Loading..." : placeholder || `Select ${label}`}
        />
      </div>
    );
  }
  return (
    <label className={`flex flex-col gap-1 ${className}`} data-field={name}>
      <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
        {label}
        {required && <span className="text-red-500">*</span>}
      </span>
      {multiline ? (
        <textarea
          rows={rows}
          value={form[name] ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(name, e.target.value)}
          className={`${inputClass(state)} resize-y`}
        />
      ) : (
        <input
          type={type}
          value={form[name] ?? ""}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(name, e.target.value)}
          className={inputClass(state)}
        />
      )}
    </label>
  );
};

// "10/3/2026" / "2026-10-03" → Date (null when it cannot be read)
const parseDate = (value) => {
  const raw = text(value);
  if (!raw) return null;
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const date = us
    ? new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2]))
    : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Date → "MM/DD/YYYY", the format used across the sheet
const formatDate = (date) => {
  if (!date) return "";
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${date.getFullYear()}`;
};

const DateField = ({ label, name, form, onChange, required, missing, showErrors }) => {
  const state = missing ? (showErrors ? "error" : "missing") : "ok";
  return (
    <label className="flex flex-col gap-1" data-field={name}>
      <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
        {label}
        {required && <span className="text-red-500">*</span>}
      </span>
      <DatePicker
        selected={parseDate(form[name])}
        onChange={(date) => onChange(name, formatDate(date))}
        dateFormat="MM/dd/yyyy"
        placeholderText="MM/DD/YYYY"
        wrapperClassName="w-full"
        className={inputClass(state)}
        // Rendered outside the modal so the scrolling body does not clip it
        portalId="order-document-datepicker"
        popperClassName="!z-[130]"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        todayButton="Today"
      />
    </label>
  );
};

const Section = ({ title, children, aside }) => (
  <section className="border border-gray-200 rounded-lg">
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      <h3 className="text-sm font-semibold text-[#06245f]">{title}</h3>
      {aside}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

// What was read from the pasted vendor details, so a wrong split is easy to spot
const VendorPreview = ({ form }) => {
  if (!text(form.vendorDetails)) return null;
  const parts = [
    ["Vendor name", form.vendorContact, true],
    ["Address", form.vendorAddress, true],
    ["Office phone", form.vendorPhone],
    ["Email", form.vendorEmail],
  ];
  return (
    <dl className="sm:col-span-2 grid grid-cols-[6rem_1fr] gap-x-2 gap-y-1 rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs">
      {parts.map(([label, value, required]) => (
        <React.Fragment key={label}>
          <dt className="font-semibold text-gray-500">{label}</dt>
          <dd
            className={`min-w-0 break-words whitespace-pre-line ${
              value
                ? "text-gray-800"
                : required
                  ? "text-red-600"
                  : "text-gray-400"
            }`}
          >
            {value || (required ? "Missing" : "Not provided")}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
};

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
function OrderDocumentModal({ type, order, orders, onClose }) {
  const config = DOC_TYPES[type];
  const isPO = type === "po";
  // Same option lists as the add / edit order form (loaded with the sheet)
  const { orderOptions, optionsLoading } = useSelector((state) => state.users);
  const sheetOptions = useMemo(
    () => normalizeOrderOptions(orderOptions),
    [orderOptions],
  );
  const family = useMemo(() => getOrderFamily(orders, order), [orders, order]);

  // PO: one tab (and one PDF) per vendor; other documents have a single form
  const tabs = useMemo(
    () =>
      isPO
        ? groupByVendor(family)
        : [{ key: "main", vendor: "", orders: family }],
    [isPO, family],
  );
  const [forms, setForms] = useState(() =>
    Object.fromEntries(
      tabs.map((tab) => [
        tab.key,
        isPO
          ? buildPurchaseOrderForm(tab.orders, tab.orders[0])
          : buildCustomerForm(type, family, order),
      ]),
    ),
  );
  // Start on the clicked order's vendor
  const [activeKey, setActiveKey] = useState(
    () =>
      tabs.find((tab) => tab.orders.some((o) => o === order))?.key ||
      tabs[0]?.key,
  );
  const form = forms[activeKey];
  // Updates the form of the active tab
  const setForm = (update) =>
    setForms((prev) => ({
      ...prev,
      [activeKey]:
        typeof update === "function" ? update(prev[activeKey]) : update,
    }));

  const [showErrors, setShowErrors] = useState(false);
  const [generating, setGenerating] = useState(false);
  const bodyRef = useRef(null);

  // Missing fields of every tab, for the tab markers and "Generate all"
  const missingByTab = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(forms).map(([key, f]) => [key, findMissing(type, f)]),
      ),
    [type, forms],
  );
  const missing = missingByTab[activeKey];
  const totals = useMemo(() => (form ? getTotals(form) : null), [form]);
  // PO: a tab for orders with no Vendor on the sheet is shown, but nothing is
  // generated from it until the Vendor is added there
  const activeTab = tabs.find((t) => t.key === activeKey);
  const activeNoVendor = Boolean(isPO && activeTab?.noVendor);
  const noVendorTab = isPO ? tabs.find((t) => t.noVendor) : null;
  const required = new Set(REQUIRED_FIELDS[type]);

  const setField = (name, value) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const setVendorDetails = (name, value) =>
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...parseVendorDetails(value),
    }));

  const setItem = (key, name, value) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.key !== key) return item;
        if (name !== "qty") return { ...item, [name]: value };
        // Whole numbers only; the line amount stays the order's own total,
        // so the unit price follows the quantity
        const qty = String(value).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
        return { ...item, qty, unitPrice: unitPriceFor(item.amount, qty) };
      }),
    }));

  // Unticking "Apply same warranty to all items" starts every item with the
  // shared warranty, which can then be changed per item
  const toggleWarrantyForAll = (checked) =>
    setForm((prev) => ({
      ...prev,
      warrantyForAll: checked,
      items: checked
        ? prev.items
        : prev.items.map((item) => ({ ...item, warranty: prev.warranty })),
    }));


  // Shows the missing fields of a tab: switches to it and scrolls to the first
  const showMissing = (key, tabMissing) => {
    setShowErrors(true);
    setActiveKey(key);
    const tabName = isPO && tabs.length > 1
      ? ` (${tabs.find((t) => t.key === key)?.vendor})`
      : "";
    toast.error(
      tabMissing.noItems
        ? `Add at least one item${tabName}.`
        : `Fill the ${tabMissing.count} highlighted field${tabMissing.count > 1 ? "s" : ""} first${tabName}.`,
    );
    // Wait for the tab to render, then bring the first missing field into view
    setTimeout(() => {
      const first =
        bodyRef.current?.querySelector(".border-red-500") ||
        bodyRef.current?.querySelector("[data-missing='true']");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      first?.focus?.();
    }, 50);
  };

  // Saves the document to the backend's history first and downloads it only
  // once that worked, so no document leaves the portal without a record.
  // Throws { stage: "company" | "save" | "pdf" } so the caller can say what failed.
  const generateForm = async (key) => {
    const withStage = (err, stage) =>
      Object.assign(err instanceof Error ? err : new Error(String(err)), { stage });

    let company;
    try {
      company = await fetchStoreCompany();
    } catch (err) {
      throw withStage(err, "company");
    }
    if (!company) {
      throw Object.assign(withStage("No company details", "company"), {
        detailsMissing: true,
      });
    }

    const f = { ...forms[key], company };
    const tab = tabs.find((t) => t.key === key);
    const payload = buildDocumentPayload(type, f, {
      orderNo: order?.["Order#"],
      orderNos: [...new Set(f.items.map((item) => item.orderNo).filter(Boolean))],
      vendor: isPO ? tab?.vendor : null,
    });
    try {
      await saveDocumentRecord(type, payload);
    } catch (err) {
      throw withStage(err, "save");
    }
    try {
      await GENERATORS[type](f);
    } catch (err) {
      throw withStage(err, "pdf");
    }
  };

  // Explains a failed save or PDF; the backend's own message is already shown
  // as a toast by the API client when it sent one
  const reportFailure = (err, label) => {
    console.error(`${label} failed:`, err);
    if (err?.stage === "company") {
      if (err.detailsMissing) {
        toast.error(
          "This store has no company name and address yet. Add them in the store's settings first.",
        );
      } else if (!err?.response?.data?.message) {
        toast.error("This store's company details could not be loaded. Try again.");
      }
    } else if (err?.stage === "save") {
      if (!err?.response?.data?.message) {
        toast.error(
          `${label} was not saved to the document history, so it was not downloaded. Check your connection and try again.`,
        );
      }
    } else {
      toast.error(
        `${label} was saved to the document history but the PDF could not be created. Open it from Document History.`,
      );
    }
  };

  // The active tab's PDF
  const handleGenerate = async () => {
    if (activeNoVendor) {
      toast.error("Add the Vendor on the sheet first, then create this Purchase Order.");
      return;
    }
    if (missing.count > 0) {
      showMissing(activeKey, missing);
      return;
    }
    const label =
      isPO && tabs.length > 1
        ? `The ${config.title} for ${tabs.find((t) => t.key === activeKey)?.vendor}`
        : `The ${config.title}`;
    setGenerating(true);
    try {
      await generateForm(activeKey);
    } catch (err) {
      reportFailure(err, label);
    } finally {
      setGenerating(false);
    }
  };

  // PO: one PDF per vendor tab, once every tab is complete. Each one is saved
  // as its own record.
  const handleGenerateAll = async () => {
    if (noVendorTab) {
      setActiveKey(noVendorTab.key);
      toast.error(
        "Some orders have no Vendor on the sheet. Add it there first, then create the Purchase Orders.",
      );
      return;
    }
    const incomplete = tabs.find((tab) => missingByTab[tab.key].count > 0);
    if (incomplete) {
      showMissing(incomplete.key, missingByTab[incomplete.key]);
      return;
    }
    setGenerating(true);
    let done = 0;
    try {
      for (const tab of tabs) {
        await generateForm(tab.key);
        done += 1;
        // A short pause so the browser accepts each download
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      toast.success(`${tabs.length} Purchase Orders saved and downloaded.`);
    } catch (err) {
      const stoppedAt = tabs[done];
      reportFailure(err, `The Purchase Order for ${stoppedAt?.vendor}`);
      if (done > 0) {
        toast.info(
          `${done} of ${tabs.length} Purchase Orders were already saved and downloaded.`,
        );
      }
      if (stoppedAt) setActiveKey(stoppedAt.key);
    } finally {
      setGenerating(false);
    }
  };

  const fieldProps = (name) => ({
    name,
    form,
    onChange: setField,
    required: required.has(name),
    missing: Boolean(missing.fields[name]),
    showErrors,
    // On the PO, Shipping method is the service level, not the carrier
    options:
      isPO && name === "shippingMethod"
        ? null
        : getOptions(sheetOptions, name, form[name]),
    optionsLoading,
  });

  const itemCell = (item, name, opts = {}) => {
    const isMissing = Boolean(missing.items[item.key]?.[name]);
    const state = isMissing ? (showErrors ? "error" : "missing") : "ok";
    const Tag = opts.multiline ? "textarea" : "input";
    return (
      <Tag
        rows={opts.multiline ? 2 : undefined}
        type={opts.multiline ? undefined : "text"}
        inputMode={opts.inputMode}
        value={item[name] ?? ""}
        placeholder={
          opts.placeholder ||
          (isItemFieldRequired(type, name) ? "Required" : "")
        }
        data-missing={isMissing ? "true" : undefined}
        onChange={(e) => setItem(item.key, name, e.target.value)}
        className={`${inputClass(state)} ${opts.multiline ? "resize-y min-h-[38px]" : ""}`}
      />
    );
  };

  const showPrice = type !== "packing";
  // Packing slips carry no warranty
  const hasWarranty = type !== "packing";
  const perItemWarranty = hasWarranty && !form.warrantyForAll;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-2 sm:p-6">
      <div className="bg-white w-full max-w-6xl h-full max-h-[95vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b flex justify-between items-center bg-gray-50 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {config.title} -{" "}
              <span className="text-indigo-600">#{text(order?.["Order#"])}</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isPO
                ? tabs.length > 1
                  ? `${tabs.length} vendors, one Purchase Order each. Check the pre-filled details in every tab and add what is missing.`
                  : "Check the pre-filled details and add what is missing."
                : `Covers the order and its ${Math.max(family.length - 1, 0)} part order${
                    family.length - 1 === 1 ? "" : "s"
                  }. Check the pre-filled details and add what is missing.`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* PO: one tab per vendor */}
        {isPO && (
          <div
            role="tablist"
            className="px-5 border-b bg-white flex gap-1 overflow-x-auto overflow-y-hidden shrink-0"
          >
            {tabs.map((tab) => {
              const active = tab.key === activeKey;
              const incomplete = missingByTab[tab.key].count > 0;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveKey(tab.key)}
                  title={tab.orders.map((o) => text(o["Order#"])).join(", ")}
                  className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px flex items-center gap-2 transition-colors ${
                    active
                      ? "border-[#06245f] text-[#06245f] font-semibold"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {tab.vendor}
                  <span
                    className={`text-[11px] px-1.5 rounded-full ${
                      active ? "bg-[#06245f] text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {tab.orders.length}
                  </span>
                  {/* Red dot while the tab still has fields to fill */}
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      incomplete ? "bg-red-500" : "bg-transparent"
                    }`}
                    aria-label={incomplete ? "Has missing fields" : undefined}
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeNoVendor && (
            <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {activeTab.orders.length === 1 ? "Order" : "Orders"}{" "}
              <span className="font-medium">
                {activeTab.orders.map((o) => text(o["Order#"])).join(", ")}
              </span>{" "}
              {activeTab.orders.length === 1 ? "has" : "have"} no Vendor on the
              sheet. Add the Vendor there first; this Purchase Order cannot be
              generated until then.
            </p>
          )}
          <Section title="Document details">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Field
                label={isPO ? "PO #" : type === "packing" ? "Order #" : "Invoice #"}
                {...fieldProps("docNumber")}
              />
              <DateField label="Date" {...fieldProps("date")} />
              {!isPO && <Field label="Customer PO #" {...fieldProps("poNumber")} />}
              {type === "proforma" && (
                <Field
                  label="Payment terms"
                  placeholder="e.g. 45 days Net"
                  {...fieldProps("paymentTerms")}
                />
              )}
              {!isPO && (
                <Field
                  label="Shipping method"
                  placeholder="e.g. UPS Worldwide Expedited"
                  {...fieldProps("shippingMethod")}
                />
              )}
              {type === "proforma" && (
                // Payment Status (UnPaid) and Tracking (UnDelivered) are fixed on the Proforma
                <Field label="Sales Rep." {...fieldProps("salesRep")} />
              )}
              {isPO && (
                <>
                  <Field label="Requisitioner" {...fieldProps("requisitioner")} />
                  <Field
                    label="Shipped via"
                    placeholder="e.g. UPS"
                    {...fieldProps("shippedVia")}
                  />
                  <Field
                    label="Shipping method"
                    placeholder="e.g. Worldwide Expedited"
                    {...fieldProps("shippingMethod")}
                  />
                </>
              )}
              {hasWarranty && (
                <div className="sm:col-span-2 lg:col-span-4 flex flex-col sm:flex-row sm:items-end gap-3">
                  {/* Always rendered (disabled when set per item) so toggling
                      the checkbox does not shift the layout */}
                  <Field
                    label={
                      form.warrantyForAll
                        ? "Warranty (printed under each item)"
                        : "Warranty (set per item in the Items table)"
                    }
                    placeholder="e.g. 30 days Warranty"
                    className="sm:w-80"
                    disabled={!form.warrantyForAll}
                    {...fieldProps("warranty")}
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none h-[34px]">
                    <input
                      type="checkbox"
                      checked={Boolean(form.warrantyForAll)}
                      onChange={(e) => toggleWarrantyForAll(e.target.checked)}
                      className="accent-[#06245f] w-4 h-4"
                    />
                    Apply same warranty to all items
                  </label>
                </div>
              )}
            </div>
          </Section>

          {isPO ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Section title="Vendor">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Always the sheet's Vendor, so read-only */}
                  <Field
                    label="Company name"
                    {...fieldProps("vendorCompany")}
                    disabled
                  />
                  <Field
                    label="Vendor details"
                    multiline
                    rows={6}
                    className="sm:col-span-2"
                    placeholder={
                      "Paste one item per line:\nVendor name\nAddress (any number of lines)\nPhone and / or email"
                    }
                    {...fieldProps("vendorDetails")}
                    onChange={setVendorDetails}
                    required
                    missing={Boolean(
                      missing.fields.vendorContact ||
                        missing.fields.vendorAddress,
                    )}
                  />
                  <VendorPreview form={form} />
                </div>
              </Section>
              <Section title="Ship To">
                <Field label="Ship to" multiline rows={7} {...fieldProps("shipTo")} />
              </Section>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Section title="Bill To">
                <div className="grid grid-cols-1 gap-3">
                  <Field
                    label="Name"
                    placeholder="e.g. HP International Bank DAC"
                    {...fieldProps("billToName")}
                  />
                  <Field
                    label="Address (one line per row)"
                    multiline
                    rows={4}
                    {...fieldProps("billTo")}
                  />
                </div>
              </Section>
              <Section title="Ship To">
                <Field label="Ship to" multiline rows={5} {...fieldProps("shipTo")} />
              </Section>
            </div>
          )}

          <Section title={`Items (${form.items.length})`}>
            {form.items.length === 0 ? (
              <p className="text-sm text-red-600">No items on this order.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="py-1.5 pr-2 w-[90px]">Order#</th>
                      <th className="py-1.5 pr-2 w-[140px]">SKU</th>
                      <th className="py-1.5 pr-2">Description</th>
                      {hasWarranty && (
                        <th className="py-1.5 pr-2 w-[170px]">Warranty</th>
                      )}
                      {isPO && (
                        <th className="py-1.5 pr-2 w-[90px]">
                          Cond <span className="text-red-500">*</span>
                        </th>
                      )}
                      <th className="py-1.5 pr-2 w-[80px]">
                        Qty <span className="text-red-500">*</span>
                      </th>
                      {showPrice && (
                        <>
                          <th className="py-1.5 pr-2 w-[110px]">Unit price</th>
                          <th className="py-1.5 pr-2 w-[100px]">Amount</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item) => (
                      <tr key={item.key} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-2 text-xs text-gray-500 pt-3.5">
                          {item.orderNo || "Manual"}
                        </td>
                        <td className="py-2 pr-2 pt-3 text-gray-800">
                          {text(item.sku) || "-"}
                        </td>
                        <td className="py-2 pr-2">
                          {itemCell(item, "description", {
                            multiline: true,
                            placeholder: "Required, e.g. CA, 8SFF U.3 BP, NVMe, G10P",
                          })}
                        </td>
                        {hasWarranty && (
                          <td className="py-2 pr-2">
                            {perItemWarranty ? (
                              itemCell(item, "warranty", {
                                placeholder: "e.g. 30 days Warranty",
                              })
                            ) : (
                              // Shared warranty shown read-only, same size as the input
                              <input
                                type="text"
                                value={text(form.warranty)}
                                placeholder="No warranty"
                                disabled
                                className={inputClass("disabled")}
                              />
                            )}
                          </td>
                        )}
                        {isPO && (
                          <td className="py-2 pr-2">
                            {(() => {
                              const conditions = getOptions(
                                sheetOptions,
                                "condition",
                                item.condition,
                              );
                              return conditions ? (
                                <SelectBox
                                  name={`condition-${item.key}`}
                                  value={item.condition}
                                  options={conditions}
                                  onChange={(value) =>
                                    setItem(item.key, "condition", value)
                                  }
                                  state={
                                    missing.items[item.key]?.condition
                                      ? showErrors
                                        ? "error"
                                        : "missing"
                                      : "ok"
                                  }
                                  disabled={optionsLoading}
                                  placeholder="Select"
                                />
                              ) : (
                                itemCell(item, "condition", { placeholder: "Required" })
                              );
                            })()}
                          </td>
                        )}
                        <td className="py-2 pr-2">
                          {itemCell(item, "qty", {
                            placeholder: "0",
                            inputMode: "numeric",
                          })}
                        </td>
                        {showPrice && (
                          <>
                            <td className="py-2 pr-2 pt-3 text-gray-800">
                              {formatMoney(item.unitPrice)}
                            </td>
                            <td className="py-2 pr-2 pt-3 font-medium">
                              {formatMoney(itemAmount(item))}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {showPrice && (
              <p className="text-[11px] text-gray-400 mt-2">
                Unit price is the order's {isPO ? "Cost" : "Price"} divided by
                Qty.
              </p>
            )}
          </Section>

          <div
            className={`grid grid-cols-1 gap-4 ${showPrice ? "lg:grid-cols-[1fr_320px]" : ""}`}
          >
            <Section title="Notes">
              <div className="grid grid-cols-1 gap-3">
                {isPO ? (
                  <Field
                    label="Comments or special instructions"
                    placeholder="e.g. Blind Ship"
                    multiline
                    rows={3}
                    {...fieldProps("comments")}
                  />
                ) : (
                  <Field label="Note" multiline rows={2} {...fieldProps("note")} />
                )}
              </div>
            </Section>

            {showPrice && (
              <Section title="Totals">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatMoney(totals.subtotal)}</span>
                  </div>
                  {[
                    isPO
                      ? ["pkgCharges", "PKCG charges"]
                      : ["discount", "Discount"],
                    ["tax", "Tax"],
                    ["shipping", "Shipping"],
                  ].map(([name, label]) => (
                    <div key={name} className="flex justify-between items-center gap-3">
                      <span className="text-gray-600">{label}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form[name] ?? ""}
                        onChange={(e) => {
                          const value = sanitizeNumber(e.target.value, "money");
                          if (value !== null) setField(name, value);
                        }}
                        className={`${inputClass("ok")} !w-28 text-right`}
                      />
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 mt-1 border-t font-semibold text-[#06245f]">
                    <span>Total</span>
                    <span>{formatMoney(totals.total)}</span>
                  </div>
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-5 border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100"
          >
            Cancel
          </button>
          {isPO && tabs.length > 1 ? (
            <>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || activeNoVendor}
                title={activeNoVendor ? "Add the Vendor on the sheet first" : undefined}
                className="py-1.5 px-5 border border-[#06245f] text-[#06245f] text-sm font-medium hover:bg-indigo-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {activeNoVendor
                  ? "Generate PDF"
                  : `Generate ${activeTab?.vendor} PDF`}
              </button>
              <button
                type="button"
                onClick={handleGenerateAll}
                disabled={generating || Boolean(noVendorTab)}
                title={
                  noVendorTab
                    ? "Some orders have no Vendor on the sheet. Add it there first."
                    : undefined
                }
                className="py-1.5 px-5 bg-[#06245f] hover:bg-[#041b4a] text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {generating ? "Generating..." : `Generate all ${tabs.length} PDFs`}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || activeNoVendor}
              title={activeNoVendor ? "Add the Vendor on the sheet first" : undefined}
              className="py-1.5 px-5 bg-[#06245f] hover:bg-[#041b4a] text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generating ? "Generating..." : "Generate PDF"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderDocumentModal;
