import { X } from "lucide-react";
import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useSelector } from "react-redux";
import {
  defaultOrder,
  ENTRY_CHECK_MAX_LENGTH,
  FLAT_VALUE_FIELDS,
  normalizeNumberFields,
  normalizeOrderOptions,
  sanitizePriceInput,
  withMirroredField,
} from "../utils/constant";
import useBalancedColumns from "../hooks/useBalancedColumns";
import ExpandableTextInput from "./ExpandableTextInput";
import SearchableSelect from "./SearchableSelect";

const lockedFields = ["Refund Date"];
const dateFields = ["Charged Date", "Order Date", "Refund Date"];

const OrderDetailModal = ({ order = null, onClose, onSave }) => {
  const isNewOrder = !order;

  const { pending, orderOptions, optionsLoading } = useSelector(
    (state) => state.users,
  );
  const normalizedOptions = normalizeOrderOptions(orderOptions);
  const [formData, setFormData] = useState({});
  const [isEditing, setIsEditing] = useState(isNewOrder);
  const columns = useBalancedColumns(Object.keys(formData).length);
  // 6px = gap-x-1.5 between fields
  const fieldWidth = {
    width: `calc((100% - ${(columns - 1) * 6}px) / ${columns})`,
  };

  useEffect(() => {
    if (order) {
      setFormData({ ...order });
    } else {
      setFormData(defaultOrder);
    }
  }, [order]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (FLAT_VALUE_FIELDS.includes(name)) {
      value = sanitizePriceInput(value);
      if (value === null) return; // reject non-numeric input
    }
    setFormData((prev) => withMirroredField(prev, name, value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSave(normalizeNumberFields(formData), isNewOrder);
      onClose();
    } catch (err) {
      console.error("Save failed:", err);
      // stay open
    }
  };
  // Date helpers
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

  return (
    <div className="fixed inset-0 bg-black/60 flex z-[100]">
      <div className="bg-white w-full h-full overflow-hidden flex flex-col">
        {/* ================= HEADER ================= */}
        <div className="px-4 py-2.5 border-b flex justify-between items-center bg-gray-50 shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            {isNewOrder ? "Create New Order" : "Order Details"}
          </h2>

          <button
            onClick={onClose}
            className="
                            p-1
                            text-gray-500
                            hover:text-red-600
                            hover:bg-red-50
                            rounded-md
                            transition-colors
                        "
          >
            <X size={24} />
          </button>
        </div>

        {/* ================= BODY ================= */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-white">
          {/* ================= FIELDS ================= */}
          <div
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
            {Object.keys(formData).map((key) => {
              const isDateField = dateFields.includes(key);

              const isDropdown = Boolean(normalizedOptions[key]);

              const options = normalizedOptions[key] || [];
              const isLocked = lockedFields.includes(key);
              const fieldDisabled = !isEditing || optionsLoading || isLocked;
              return (
                <div
                  key={key}
                  style={fieldWidth}
                  className="
                                        flex-none
                                        min-w-0
                                        border
                                        border-gray-300
                                        rounded-sm
                                        overflow-hidden
                                        bg-white
                                    "
                >
                  {/* ================= FIELD HEADER ================= */}
                  <div
                    className="
                                            min-h-[28px] 2xl:min-h-[34px]
                                            px-1
                                            py-[3px]
                                            bg-indigo-600
                                            flex
                                            items-center
                                            justify-center
                                        "
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
                      title={key}
                    >
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </label>
                  </div>

                  {/* ================= FIELD VALUE ================= */}
                  <div
                    className={`
                                            min-h-[38px] 2xl:min-h-[48px]
                                            flex
                                            items-center
                                            px-1.5
                                            py-1
                                            text-sm 2xl:text-base
                                            ${
                                              !isEditing || optionsLoading
                                                ? "bg-[#dcebd6]"
                                                : "bg-white"
                                            }
                                        `}
                  >
                    {/* ================= DROPDOWN ================= */}
                    {isDropdown ? (
                      <SearchableSelect
                        name={key}
                        value={formData[key] ?? ""}
                        options={options}
                        onChange={handleChange}
                        disabled={!isEditing || optionsLoading || fieldDisabled}
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
                                                      isEditing &&
                                                      !optionsLoading
                                                        ? "text-gray-800 cursor-pointer"
                                                        : "text-gray-500 cursor-not-allowed"
                                                    }
                                                `}
                      />
                    ) : isDateField ? (
                      /* ================= DATE PICKER ================= */
                      <DatePicker
                        selected={parseDate(formData[key])}
                        onChange={(date) => {
                          setFormData((prev) => ({
                            ...prev,
                            [key]: formatDate(date),
                          }));
                        }}
                        dateFormat="MM/dd/yyyy"
                        placeholderText="MM/DD/YYYY"
                        disabled={!isEditing || fieldDisabled}
                        wrapperClassName="w-full"
                        className={`
          !w-full !border-0 !bg-transparent !p-0 !outline-none !shadow-none
          text-sm 2xl:text-base
          ${fieldDisabled ? "text-gray-500 cursor-not-allowed" : "text-gray-800"}
        `}
                      />
                    ) : key === "Entry Check" ? (
                      /* ================= EXPANDABLE TEXT ================= */
                      <ExpandableTextInput
                        name={key}
                        label={key}
                        value={formData[key]}
                        onChange={handleChange}
                        disabled={!isEditing || fieldDisabled}
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
                                                      isEditing
                                                        ? "text-gray-800"
                                                        : "text-gray-500"
                                                    }
                                                `}
                      />
                    ) : (
                      /* ================= NORMAL INPUT ================= */
                      <input
                        type="text"
                        name={key}
                        inputMode={
                          FLAT_VALUE_FIELDS.includes(key) ? "decimal" : undefined
                        }
                        value={formData[key] ?? ""}
                        onChange={handleChange}
                        disabled={!isEditing || fieldDisabled}
                        className={`
                                                    w-full
                                                    min-w-0
                                                    border-0
                                                    outline-none
                                                    bg-transparent
                                                    p-0
                                                    text-sm 2xl:text-base
                                                    ${
                                                      isEditing
                                                        ? "text-gray-800"
                                                        : "text-gray-500"
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

        {/* ================= FOOTER ================= */}
        <div
          className="
                        border-t
                        px-4
                        py-2.5
                        flex
                        justify-center
                        items-center
                        bg-gray-50
                        shrink-0
                    "
        >
          <button
            onClick={handleSubmit}
            disabled={pending}
            className="
                            w-full
                            sm:w-[170px]
                            py-1.5
                            px-4
                            rounded-md
                          bg-[#06245f]
      hover:bg-[#041b4a]
                            text-white
                            font-medium
                            text-sm
                            transition-colors
                            disabled:opacity-70
                            disabled:cursor-not-allowed
                        "
          >
            {pending ? "Loading..." : "Create Order"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
