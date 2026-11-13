import { Lock, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import useBalancedColumns from "../hooks/useBalancedColumns";
import { useModalShortcuts } from "../hooks/useEscapeKey";
import { fetchOrderById } from "../store/usersSlice";
import {
  ENTRY_CHECK_MAX_LENGTH,
  FLAT_VALUE_FIELDS,
  formatToday,
  getIsAdmin,
  getIsFinance,
  isFutureDate,
  NO_FUTURE_DATE_FIELDS,
  normalizeNumberFields,
  normalizeOrderOptions,
  sanitizePriceInput,
  withDefaultShippingAccount,
  withMirroredField,
} from "../utils/constant";
import ConfirmDialog from "./ConfirmDialog";
import ExpandableTextInput from "./ExpandableTextInput";
import OrderPrintSheet from "./OrderPrintSheet";
import SearchableSelect from "./SearchableSelect";
// Always locked fields

// Unlockable fields
const unlockableFields = [
  "Order Date",
  "Payment Status",
  "Category",
  "Brands",
  "Part#",
  "Qty",
  "Bill to address",
  "Ship to address",
  "City",
  "State",
  "Country",
  "Carrier",
  "Customer Company",
  "Phone",
  "Email",
  "Price",
  "Shipping",
  "Tax",
  "CC/Paypal 4%",
  "Paid Via",
  "Customer",
];
const FINANCE_EDITABLE = ["Charged Date", "Paid Via"];
const isCancelledStatus = (status) =>
  ["cancelled", "canceled"].includes(
    String(status || "")
      .trim()
      .toLowerCase(),
  );

// Fields that block saving, as { field: message }; add new checks here.
// conditionEditable / orderDateEditable: false when this user can't change
// that field (Finance, or checked and locked on the sheet), so it can't block
// their save
const validateForm = (
  data,
  { conditionEditable = true, orderDateEditable = true } = {},
) => {
  const errors = {};
  if (!String(data["Order#"] ?? "").trim()) {
    errors["Order#"] = "Enter an Order# before saving this order.";
  }
  // Every user who can open the form can set Charged Date (Finance included)
  if (!String(data["Charged Date"] ?? "").trim()) {
    errors["Charged Date"] = "Select a Charged Date before saving this order.";
  }
  if (orderDateEditable && !String(data["Order Date"] ?? "").trim()) {
    errors["Order Date"] = "Select an Order Date before saving this order.";
  }
  if (conditionEditable && !String(data.Condition ?? "").trim()) {
    errors.Condition = "Select a Condition before saving this order.";
  }
  if (
    isCancelledStatus(data["Order Status"]) &&
    !String(data["Entry Reason"] || "").trim()
  ) {
    errors["Entry Reason"] =
      "Enter an Entry Reason before cancelling this order.";
  }
  return errors;
};
const EditOrderDetailModal = ({
  order,
  onClose,
  onSave,
  isCreatePartMode,
  isRMAMode,
  // Fields checked and saved on the sheet: locked for everyone but admins
  checkedFields = [],
}) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [unlockedFields, setUnlockedFields] = useState(new Set());
  const [fetching, setFetching] = useState(false);
  const [baseOrder, setBaseOrder] = useState(null);
  // Fields that failed validation on Save, shown in red until fixed
  const [fieldErrors, setFieldErrors] = useState({});
  const fieldsRef = useRef(null);
  const columns = useBalancedColumns(
    Object.keys(formData).filter((key) => key !== "order_type").length,
  );
  // 6px = gap-x-1.5 between fields
  const fieldWidth = {
    width: `calc((100% - ${(columns - 1) * 6}px) / ${columns})`,
  };
  const { storeId } = useSelector((state) => state.auth);
  const { pending, orderOptions, optionsLoading } = useSelector(
    (state) => state.users,
  );
  const isFinance = getIsFinance();
  const isAdmin = getIsAdmin();
  // Charged Vendor follows the vendor cost fields: locked once any of them is
  const VENDOR_COST_FIELDS = ["Cost", "Vendor Shipping", "Vendor Tax"];
  // Price, Shipping and Tax follow CC/Paypal 4%: locked once it is
  const PRICE_FIELDS = ["Price", "Shipping", "Tax"];
  const isCheckedLocked = (key) =>
    !isAdmin &&
    (checkedFields.includes(key) ||
      (key === "Charged Vendor" &&
        VENDOR_COST_FIELDS.some((field) => checkedFields.includes(field))) ||
      (PRICE_FIELDS.includes(key) && checkedFields.includes("CC/Paypal 4%")));
  const validationOptions = {
    conditionEditable: !isFinance && !isCheckedLocked("Condition"),
    orderDateEditable: !isFinance && !isCheckedLocked("Order Date"),
  };
  const normalizedOptions = normalizeOrderOptions(orderOptions);
  const debounceRef = useRef(null);
  const lastFetchedId = useRef(null);
  // const { order_type, ...order } = order;
  // const isRma = String(order?.order_type || "").toLowerCase() === "rma";
  // const alwaysDisabledFields = [
  //     'Order#',
  //     'Total Price',
  //     'Total Cost',
  //     'Total Cost+4%',
  //     'Gross Profit',
  //     'Gross Profit-4%',
  //     'Profit %',
  //     'Card Payment',

  //     (!isRma ? 'Refund Date' : null),
  //     (isRma && isFinance ? 'Charged Date' : null),
  //     (isRma && isFinance ? 'Paid Via' : null),
  // ];

  const alwaysDisabledFields = [
    "Order#",
    "Total Price",
    "Total Cost",
    "Total Cost+4%",
    "Gross Profit",
    "Gross Profit-4%",
    "Profit %",
    "Card Payment",
  ];
  // Order Status is fixed once the saved order is cancelled, incomplete, is an RMA, or has RMAs raised from it
  const isOrderStatusLocked =
    Boolean(isRMAMode) ||
    String(order?.order_type || "").toLowerCase() === "rma" ||
    isCancelledStatus(order?.["Order Status"]) ||
    String(order?.["Order Status"] || "")
      .trim()
      .toLowerCase() === "incomplete" ||
    String(order?.order_type || "").toLowerCase() === "incomplete" ||
    (Array.isArray(order?.rmaOrderNos) && order.rmaOrderNos.length > 0);

  const isFieldLocked = (fieldName) => {
    if (alwaysDisabledFields.includes(fieldName)) return true;
    if (isFinance && fieldName !== "Charged Date") return true;
    return false;
  };

  // ========== CALCULATION FUNCTION ==========
  const calculateFields = (data) => {
    const num = (val) => Number(val) || 0;

    const price = num(data["Price"]);
    const shipping = num(data["Shipping"]);
    const tax = num(data["Tax"]);
    const cost = num(data["Cost"]);
    const vendorShipping = num(data["Vendor Shipping"]);
    const vendorTax = num(data["Vendor Tax"]);
    const courierCharges = num(data["Courier Charges"]);
    const salesTax = num(data["Sales Tax"]);
    const warehouseCharges = num(data["Warehouse Charges"]);
    const customDuties = num(data["Custom Duties"]);
    const isCancelled = isCancelledStatus(data["Order Status"]);
    // Cancelled orders carry no CC/Paypal fee
    const ccPaypal4 = isCancelled ? 0 : num(data["CC/Paypal 4%"]);

    // Card Payment = Cost + Vendor Shipping + Vendor Tax
    const cardPayment = cost + vendorShipping + vendorTax;

    // Total Price = Shipping + Price + Tax
    const totalPrice = isCancelled ? 0 : shipping + price + tax;

    // Total Cost = Courier Charges + Sales Tax + Warehouse Charges + Custom Duties + Card Payment
    const totalCost =
      courierCharges + salesTax + warehouseCharges + customDuties + cardPayment;

    // Total Cost+4% = Total Cost + CC/Paypal 4%
    const totalCostPlus4 = totalCost + ccPaypal4;

    // Gross Profit = Total Price - Total Cost
    const grossProfit = totalPrice - totalCost;

    // Gross Profit-4% = Gross Profit - CC/Paypal 4%
    const grossProfitMinus4 = grossProfit - ccPaypal4;

    // Profit % = (Gross Profit-4% / Total Price) * 100
    const profitPercent =
      totalPrice > 0
        ? ((grossProfitMinus4 / totalPrice) * 100).toFixed(2)
        : "0.00";

    return {
      ...data,
      ...(isCancelled && { "CC/Paypal 4%": "0.00" }),
      "Card Payment": cardPayment.toFixed(2),
      "Total Price": totalPrice.toFixed(2),
      "Total Cost": totalCost.toFixed(2),
      "Total Cost+4%": totalCostPlus4.toFixed(2),
      "Gross Profit": grossProfit.toFixed(2),
      "Gross Profit-4%": grossProfitMinus4.toFixed(2),
      "Profit %": profitPercent,
    };
  };

  // Set form data when order changes
  useEffect(() => {
    if (order) {
      const calculated = calculateFields({ ...order });
      const { Status, ...rest } = calculated; // Exclude order_type from formData
      setFormData(rest);
      setBaseOrder(rest);
      lastFetchedId.current = order["Order#"];
    }
  }, [order]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (FLAT_VALUE_FIELDS.includes(name)) {
      value = sanitizePriceInput(value);
      if (value === null) return; // reject non-numeric input
    }
    // setFormData((prev) => ({ ...prev, [name]: value }));
    setFormData((prev) => {
      const updated = withMirroredField(prev, name, value);
      const { Status, ...rest } = updated; // Exclude order_type from formData
      return calculateFields(rest); // ← auto calculate
    });
    if (name === "Order#") {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const trimmed = value.trim();
      debounceRef.current = setTimeout(() => {
        if (trimmed && trimmed !== lastFetchedId.current) {
          fetchOrderByIdFun(trimmed);
        }
      }, 900);
    }
  };
  const fetchOrderByIdFun = async (orderId) => {
    try {
      setFetching(true);
      const result = await dispatch(
        fetchOrderById({ orderId, role_id: storeId?.id }),
      ).unwrap();

      const fetchedOrder = result;
      if (fetchedOrder && typeof fetchedOrder === "object") {
        // setFormData({ ...fetchedOrder });
        // setBaseOrder({ ...fetchedOrder });
        // lastFetchedId.current = String(orderId);
        const calculated = calculateFields(
          withDefaultShippingAccount(fetchedOrder),
        );
        const { Status, ...rest } = calculated;
        setFormData(rest);
        setBaseOrder(rest);
        lastFetchedId.current = String(orderId);
      }
    } catch (err) {
      console.error("Failed to fetch order:", err);
    } finally {
      setFetching(false);
    }
  };

  // A highlighted field turns back to normal as soon as its check passes
  // (e.g. a reason is typed, or the status is changed away from Cancelled)
  useEffect(() => {
    setFieldErrors((prev) => {
      const keys = Object.keys(prev);
      if (!keys.length) return prev;
      const current = validateForm(formData, validationOptions);
      const next = Object.fromEntries(
        keys.filter((key) => current[key]).map((key) => [key, current[key]]),
      );
      return Object.keys(next).length === keys.length ? prev : next;
    });
  }, [formData]);

  // Scroll a field into view and put the cursor in it (after this render)
  const focusField = (key) => {
    setTimeout(() => {
      const box = fieldsRef.current?.querySelector(
        `[data-field="${CSS.escape(key)}"]`,
      );
      if (!box) return;
      box.scrollIntoView({ block: "center", behavior: "smooth" });
      box.querySelector("input, textarea, select, button")?.focus({
        preventScroll: true,
      });
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm(formData, validationOptions);
    const [firstError] = Object.keys(errors);
    if (firstError) {
      setFieldErrors(errors);
      toast.error(errors[firstError]);
      // A pencil-locked field (e.g. Order Date) opens so it can be filled in
      if (unlockableFields.includes(firstError)) {
        setUnlockedFields((prev) => new Set(prev).add(firstError));
      }
      focusField(firstError);
      return;
    }
    // A field the backend rejected (e.g. Order# already taken) is
    // highlighted and focused; its message is already shown as a toast
    Promise.resolve(onSave(normalizeNumberFields(formData))).catch((err) => {
      if (!err?.field || !(err.field in formData)) return;
      setFieldErrors({ [err.field]: err.message });
      focusField(err.field);
    });
  };

  const hasChanges = () => {
    if (!baseOrder) return false;
    return Object.keys(baseOrder).some(
      (key) => (formData[key] ?? "") !== (baseOrder[key] ?? ""),
    );
  };

  const handleCloseAttempt = () => {
    if (hasChanges()) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowConfirm(false);
    onClose();
  };

  // Esc = Cancel (asking first when there are unsaved changes),
  // Ctrl+S = Save Changes, Ctrl+P = Print
  useModalShortcuts({
    escape: handleCloseAttempt,
    save: (e) => !pending && handleSubmit(e),
    print: () => window.print(),
  });
  useEffect(() => {
    if (isCreatePartMode || isRMAMode) {
      const calculated = calculateFields(
        withDefaultShippingAccount({
          ...order,
          "Order Date": formatToday(),
          // A new part order starts with Qty and CC/Paypal 4% at 0 (editable)
          ...(isCreatePartMode && { Qty: "0", "CC/Paypal 4%": "0.00" }),
        }),
      );
      const { Status, ...rest } = calculated;
      setFormData(rest);
      setBaseOrder(rest);
      lastFetchedId.current = order["Order#"];
    }
  }, [order]);
  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex z-[100]">
      {/* What Print / Ctrl+P puts on paper: field names and full values */}
      <OrderPrintSheet
        order={formData}
        title={
          isRMAMode
            ? "New RMA"
            : isCreatePartMode
              ? "New Part Order"
              : "Order Details"
        }
      />
      <div className="bg-white w-full h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-2.5 border-b flex justify-between items-center bg-gray-50 shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            Order Details -{" "}
            <span className="text-indigo-600">
              #{formData["Order#"] ?? order["Order#"]}
            </span>
            {fetching && (
              <span className="ml-3 text-xs sm:text-sm font-normal text-gray-400">
                Loading...
              </span>
            )}
          </h2>
          <button
            onClick={handleCloseAttempt}
            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <X size={28} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 no-scrollbar overflow-y-auto p-3 sm:p-4 relative bg-white">
          {fetching && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
              <span className="text-indigo-600 font-medium text-sm">
                Fetching order data...
              </span>
            </div>
          )}

          <div
            ref={fieldsRef}
            className="
                        flex
                        flex-wrap
                        justify-center
                        items-start
                        gap-x-1.5
                        gap-y-1.5
                        w-full
                    "
          >
            {Object.entries(formData).map(([key, value]) => {
              if (key === "order_type") return null; // Skip rendering order_type field
              const locked = isFieldLocked(key);
              const isAlwaysDisabled = alwaysDisabledFields.includes(key);
              const isUnlockable = unlockableFields.includes(key);

              // const isDisabled =
              //     isAlwaysDisabled ||
              //     (isUnlockable && !unlockedFields.has(key) && !isEditing);
              // const isDisabled = isFinance
              //     ? key !== "Charged Date"
              //     : isAlwaysDisabled ||
              //     (isUnlockable && !unlockedFields.has(key) && !isEditing);
              const isRmaOrder =
                Boolean(isRMAMode) ||
                String(order?.order_type || "").toLowerCase() === "rma";

              const isDisabled = (() => {
                if (alwaysDisabledFields.includes(key)) return true;

                // Checked and saved on the sheet: only admins may change it
                if (isCheckedLocked(key)) return true;

                if (key === "Order Status" && isOrderStatusLocked) return true;

                // Fee is fixed at zero while the order is cancelled
                if (
                  key === "CC/Paypal 4%" &&
                  isCancelledStatus(formData["Order Status"])
                ) {
                  return true;
                }

                // Finance: ONLY Charged Date + Paid Via
                if (isFinance) {
                  return key !== "Charged Date" && key !== "Paid Via";
                }

                // Normal user: Refund Date only on RMA
                if (key === "Refund Date") {
                  return !isRmaOrder;
                }

                return isUnlockable && !unlockedFields.has(key) && !isEditing;
              })();
              const dateFields = ["Charged Date", "Order Date", "Refund Date"];
              const isDateField = dateFields.includes(key);
              const noFutureDate = NO_FUTURE_DATE_FIELDS.includes(key);

              const isDropdown = Boolean(normalizedOptions[key]); // ← fully dynamic
              const options = normalizedOptions[key] || [];

              const parseDate = (dateStr) => {
                if (!dateStr) return null;

                const parts = dateStr.includes("/")
                  ? dateStr.split("/")
                  : dateStr.split("-");

                if (parts.length === 3) {
                  if (dateStr.includes("/")) {
                    // MM/DD/YYYY
                    return new Date(+parts[2], +parts[0] - 1, +parts[1]);
                  }

                  // YYYY-MM-DD
                  return new Date(+parts[0], +parts[1] - 1, +parts[2]);
                }

                return null;
              };
              const formatDate = (date) => {
                if (!date) return "";
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const year = date.getFullYear();
                return `${month}/${day}/${year}`;
              };

              const unlockField = (fieldKey) => {
                setUnlockedFields((prev) => new Set(prev).add(fieldKey));
              };

              // Paid Via also unlocks by clicking the field itself (ops team request)
              const unlocksOnFieldClick =
                key === "Paid Via" &&
                !isFinance &&
                isUnlockable &&
                isDisabled &&
                !optionsLoading;

              // Unlock, then put the cursor in the field (once it's enabled)
              const unlockAndFocus = (e) => {
                const container = e.currentTarget.closest("[data-field]");
                unlockField(key);
                setTimeout(() =>
                  container
                    ?.querySelector(
                      "input:not([type=hidden]), select, textarea",
                    )
                    ?.focus(),
                );
              };

              // A field opened with the pencil locks again once focus moves
              // on to another field; the edited value is kept
              const relockOnLeave = (e) => {
                const container = e.currentTarget;
                setTimeout(() => {
                  if (container.contains(document.activeElement)) return;
                  setUnlockedFields((prev) => {
                    if (!prev.has(key)) return prev;
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                  });
                });
              };

              const fieldError = fieldErrors[key];

              return (
                <div
                  key={key}
                  data-field={key}
                  style={fieldWidth}
                  title={fieldError || undefined}
                  onBlur={
                    isUnlockable && unlockedFields.has(key)
                      ? relockOnLeave
                      : undefined
                  }
                  className={`
        flex-none
        min-w-0
        border
        rounded-sm
        overflow-hidden
        bg-white
        ${fieldError ? "border-red-500 ring-2 ring-red-300" : "border-gray-300"}
    `}
                >
                  {/* Label + Pen Icon */}
                  <div
                    className={`
                                        min-h-[28px] 2xl:min-h-[34px]
                                        px-1
                                        py-[3px]
                                        ${fieldError ? "bg-red-600" : "bg-indigo-600"}
                                        flex
                                        items-center
                                        justify-center
                                        gap-1
                                    `}
                  >
                    <label
                      className="
                                            text-sm 2xl:text-base
                                            font-bold
                                            text-white
                                            text-center
                                            leading-tight
                                            truncate
                                        "
                    >
                      {key.replace(/([A-Z])/g, " $1").trim()}
                      {((key === "Entry Reason" &&
                        isCancelledStatus(formData["Order Status"])) ||
                        (key === "Condition" &&
                          validationOptions.conditionEditable) ||
                        (key === "Order Date" &&
                          validationOptions.orderDateEditable) ||
                        key === "Charged Date") && (
                        <span className="text-red-200"> *</span>
                      )}
                    </label>

                    {isCheckedLocked(key) && (
                      <span
                        className="shrink-0 text-white/80"
                        title="Checked and saved on the sheet. Only an admin can change it."
                      >
                        <Lock size={13} />
                      </span>
                    )}

                    {!isFinance &&
                      isUnlockable &&
                      isDisabled &&
                      !isCheckedLocked(key) &&
                      !(
                        key === "CC/Paypal 4%" &&
                        isCancelledStatus(formData["Order Status"])
                      ) && (
                        <button
                          type="button"
                          onClick={unlockAndFocus}
                          className="
                                                shrink-0
                                                p-0.5
                                                text-white/80
                                                hover:text-white
                                                hover:bg-white/10
                                                rounded
                                                transition-colors
                                            "
                          title="Click to edit this field"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>
                      )}
                  </div>

                  {/* DROPDOWN */}

                  <div
                    onClick={unlocksOnFieldClick ? unlockAndFocus : undefined}
                    title={
                      unlocksOnFieldClick
                        ? "Click to edit this field"
                        : undefined
                    }
                    className={`
                                        min-h-[38px] 2xl:min-h-[48px]
                                        flex
                                        items-center
                                        px-1.5
                                        py-1
                                        text-sm 2xl:text-base
                                        ${
                                          isDisabled || optionsLoading
                                            ? "bg-[#dcebd6] text-gray-700"
                                            : fieldError
                                              ? "bg-red-50 text-gray-800"
                                              : "bg-white text-gray-800"
                                        }
                                        ${
                                          unlocksOnFieldClick
                                            ? "cursor-pointer [&_*]:pointer-events-none"
                                            : ""
                                        }
                                    `}
                  >
                    {isDropdown ? (
                      <SearchableSelect
                        name={key}
                        value={formData[key] ?? ""}
                        options={options}
                        onChange={handleChange}
                        disabled={isDisabled || optionsLoading}
                        placeholder={
                          optionsLoading ? "Loading..." : `Select ${key}`
                        }
                        className={`
                                                w-full
                                                min-w-0
                                                bg-transparent
                                                border-0
                                                outline-none
                                                p-0
                                                text-sm 2xl:text-base
                                                
                                                ${
                                                  isDisabled || optionsLoading
                                                    ? "text-gray-700 cursor-not-allowed"
                                                    : "text-gray-800 cursor-pointer"
                                                }
                                            `}
                      />
                    ) : isDateField ? (
                      /* DATE PICKER */
                      <DatePicker
                        selected={parseDate(formData[key])}
                        maxDate={noFutureDate ? new Date() : undefined}
                        onChange={(date) => {
                          // A typed future date is refused, not just greyed out in the calendar
                          if (noFutureDate && isFutureDate(date)) {
                            toast.error(`${key} can't be a future date.`);
                            return;
                          }
                          setFormData((prev) => {
                            const updated = {
                              ...prev,
                              [key]: formatDate(date),
                            };
                            return calculateFields(updated);
                          });
                        }}
                        dateFormat="MM/dd/yyyy"
                        placeholderText="MM/DD/YYYY"
                        disabled={isDisabled}
                        wrapperClassName="w-full"
                        className={`
                                                !w-full
                                                !border-0
                                                !bg-transparent
                                                !outline-none
                                                !shadow-none
                                                !p-0
                                                text-sm 2xl:text-base
                                                ${
                                                  isDisabled
                                                    ? "text-gray-700 cursor-not-allowed"
                                                    : "text-gray-800"
                                                }
                                            `}
                      />
                    ) : key === "Entry Check" ? (
                      /* EXPANDABLE TEXT */
                      <ExpandableTextInput
                        name={key}
                        label={key}
                        value={formData[key]}
                        onChange={handleChange}
                        disabled={isDisabled}
                        maxLength={ENTRY_CHECK_MAX_LENGTH}
                        className={`
                                                w-full
                                                min-w-0
                                                border-0
                                                outline-none
                                                bg-transparent
                                                p-0
                                                text-sm 2xl:text-base
                                                ${
                                                  isDisabled
                                                    ? "text-gray-700 cursor-not-allowed"
                                                    : "text-gray-800"
                                                }
                                            `}
                      />
                    ) : (
                      /* NORMAL INPUT */
                      <input
                        type="text"
                        name={key}
                        inputMode={
                          FLAT_VALUE_FIELDS.includes(key)
                            ? "decimal"
                            : undefined
                        }
                        value={formData[key] ?? ""}
                        onChange={handleChange}
                        disabled={isDisabled}
                        className={`
                                                w-full
                                                min-w-0
                                                border-0
                                                outline-none
                                                bg-transparent
                                                p-0
                                                text-sm 2xl:text-base
                                                ${
                                                  isDisabled
                                                    ? "text-gray-700 cursor-not-allowed"
                                                    : "text-gray-800"
                                                }
                                            `}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        {/* ========================= FOOTER ========================= */}
        <div
          className="
    border-t
    px-4
    py-2.5
    flex
    flex-col
    sm:flex-row
    justify-center
    items-center
    gap-3
    bg-gray-50
    shrink-0
  "
        >
          {/* Cancel */}
          <button
            type="button"
            onClick={handleCloseAttempt}
            title="Cancel (Esc)"
            className="
      w-full
      sm:w-[150px]
      py-1.5
      px-4
      border
      border-gray-300
      rounded-none
      bg-white
      hover:bg-gray-100
      font-medium
      text-sm
      text-gray-700
      transition-colors
    "
          >
            Cancel
          </button>

          {/* Save Changes */}
          <button
            onClick={handleSubmit}
            disabled={pending}
            title="Save Changes (Ctrl+S)"
            className="
      w-full
      sm:w-[150px]
      py-1.5
      px-4
      rounded-none
      bg-[#06245f]
      hover:bg-[#041b4a]
      text-white
      font-medium
      text-sm
      transition-colors
      disabled:opacity-60
      disabled:cursor-not-allowed
    "
          >
            {pending ? "Loading..." : "Save Changes"}
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={() => window.print()}
            title="Print (Ctrl+P)"
            className="
      w-full
      sm:w-[150px]
      py-1.5
      px-4
      rounded-none
      bg-[#06245f]
      hover:bg-[#041b4a]
      text-white
      font-medium
      text-sm
      transition-colors
    "
          >
            Print
          </button>
        </div>
      </div>

      {/* "Discard changes?" (Esc / Keep Editing closes it) */}
      <ConfirmDialog
        open={showConfirm}
        title="Discard changes?"
        message="You have some unsaved changes. Are you sure you want to close without saving?"
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        onConfirm={handleConfirmClose}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
};

export default React.memo(EditOrderDetailModal);
