import { ArrowLeft, Edit, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  fetchOrderEditRange,
  fetchOrderViewRange,
  getEditRangeMonths,
  ORDER_EDIT_RANGE_OPTIONS,
  saveOrderEditRange,
  saveOrderViewRange,
} from "../store/orderEditRangeSlice";
import {
  createSheetStore,
  deleteSheet,
  fetchSheets,
  updateSheet,
} from "../store/usersSlice";
import { STORE_BANK_FIELDS, STORE_COMPANY_FIELDS } from "../utils/constant";
import useEscapeKey from "../hooks/useEscapeKey";

// The PDF library can embed these two image types
const LOGO_TYPES = ["image/png", "image/jpeg"];
const MAX_LOGO_MB = 2;

// Every field of the add / edit store form
const STORE_FORM_FIELDS = [
  "name",
  "store_name",
  ...STORE_COMPANY_FIELDS.map(({ name }) => name),
  ...STORE_BANK_FIELDS.map(({ name }) => name),
];

// ----- Store form validation -----
const trimValue = (v) => (typeof v === "string" ? v.trim() : v);

// Required, trimmed, at most maxLength characters, optionally matching pattern;
// check: extra test returning an error message or true
const textRule = (
  label,
  { maxLength = 255, pattern, patternMessage, check } = {},
) => ({
  setValueAs: trimValue,
  validate: (raw) => {
    const value = String(raw ?? "").trim();
    if (!value) return `${label} is required`;
    if (value.length > maxLength)
      return `${label} must be ${maxLength} characters or fewer`;
    if (pattern && !pattern.test(value)) return patternMessage;
    return check ? check(value) : true;
  },
});

const STORE_FIELD_RULES = {
  name: textRule("Name", { maxLength: 100 }),
  store_name: textRule("Store Name", { maxLength: 100 }),
  company_name: textRule("Company name", { maxLength: 150 }),
  company_phone: textRule("Phone", {
    maxLength: 25,
    // Digits with optional +, spaces, dashes, dots, brackets; 7–15 digits
    pattern: /^\+?[\d\s().-]*$/,
    patternMessage: "Enter a valid phone number (digits, +, -, spaces)",
    check: (value) => {
      const digits = value.replace(/\D/g, "").length;
      return (digits >= 7 && digits <= 15) || "Phone number must have 7–15 digits";
    },
  }),
  company_address: textRule("Company address"),
  company_email: textRule("Email", {
    maxLength: 150,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    patternMessage: "Enter a valid email address",
  }),
  company_website: textRule("Website", {
    maxLength: 150,
    pattern:
      /^(https?:\/\/)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i,
    patternMessage: "Enter a valid website, e.g. www.example.com",
  }),
  bank_account_number: textRule("IBAN / Account Number", {
    maxLength: 34,
    pattern: /^[A-Za-z0-9 ]{4,34}$/,
    patternMessage: "Use 4–34 letters and digits",
  }),
  bank_routing_number: textRule("Routing number", {
    maxLength: 9,
    pattern: /^\d{9}$/,
    patternMessage: "Routing number must be exactly 9 digits",
  }),
  bank_swift_code: textRule("BIC / Swift Code", {
    maxLength: 11,
    pattern: /^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/,
    patternMessage: "Swift code must be 8 or 11 letters/digits, e.g. BOFAUS3N",
  }),
  bank_account_name: textRule("Account Name", { maxLength: 150 }),
  bank_address: textRule("Bank Address"),
  bank_account_type: textRule("Type", {
    maxLength: 50,
    pattern: /^[A-Za-z][A-Za-z\s/-]*$/,
    patternMessage: "Use letters only, e.g. Checking or Savings",
  }),
  bank_name: textRule("Bank Name", { maxLength: 150 }),
  bank_account_currency: textRule("Account Currency", {
    maxLength: 30,
    pattern: /^[A-Za-z][A-Za-z\s]{2,}$/,
    patternMessage: "Use letters only, e.g. USD",
  }),
};

const inputClass = (hasError) =>
  `border p-2 rounded-lg text-sm w-full font-normal text-gray-900 outline-none focus:ring-2 ${
    hasError
      ? "border-red-400 focus:ring-red-200"
      : "border-gray-300 focus:ring-blue-200"
  }`;

const FieldError = ({ error }) =>
  error ? (
    <span className="text-red-500 text-xs font-normal">{error.message}</span>
  ) : null;

const StoreDetailFields = ({ title, fields, register, errors, children }) => (
  <fieldset className="border-t pt-2 mt-1">
    <legend className="text-sm font-semibold text-gray-700 pr-2">
      {title}
    </legend>
    {children}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fields.map(({ name, label, wide }) => (
        <label
          key={name}
          className={`flex flex-col gap-1 text-xs font-medium text-gray-600 ${
            wide ? "sm:col-span-2" : ""
          }`}
        >
          <span>
            {label} <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            inputMode={
              name === "company_email"
                ? "email"
                : name === "company_phone"
                  ? "tel"
                  : undefined
            }
            {...register(name, STORE_FIELD_RULES[name])}
            aria-invalid={errors[name] ? "true" : "false"}
            className={inputClass(errors[name])}
          />
          <FieldError error={errors[name]} />
        </label>
      ))}
    </div>
  </fieldset>
);

// One row of "Past N months" chips (used for the edit and view windows).
// Chips wider than maxValue are disabled, with disabledTitle as the reason.
const RangeChips = ({ label, value, onChange, maxValue, disabledTitle }) => (
  <div className="flex flex-col gap-2">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <div className="flex flex-wrap gap-2">
      {ORDER_EDIT_RANGE_OPTIONS.map((option) => {
        const active = value === option.value;
        const disabled = maxValue != null && option.value > maxValue;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            title={disabled ? disabledTitle : undefined}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              active
                ? "bg-blue-500 border-blue-500 text-white"
                : disabled
                  ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed"
                  : "bg-white border-gray-300 text-gray-600 hover:border-blue-400"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </div>
);

// Users can't edit orders they can't see, so the edit window may not be
// wider than the view window (no limit while the view window isn't set)
const isEditWiderThanView = (editMonths, viewMonths) =>
  editMonths != null && viewMonths != null && editMonths > viewMonths;

const AdminSheets = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    sheets,
    createLoading,
    updateLoading,
    deleteLoading,
    fetchLoading,
    error,
  } = useSelector((state) => state.users);

  const sheetsData = sheets?.data || [];
  const [showModal, setShowModal] = useState(false);
  // Esc closes the store form
  useEscapeKey(() => setShowModal(false), showModal);
  const [editingSheet, setEditingSheet] = useState(null); // track edit
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null); // a newly chosen logo
  const [logoError, setLogoError] = useState("");
  const logoFileUrl = useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : null),
    [logoFile],
  );
  useEffect(
    () => () => logoFileUrl && URL.revokeObjectURL(logoFileUrl),
    [logoFileUrl],
  );
  const logoPreview = logoFileUrl || editingSheet?.logo_url;
  // Order edit window (months) for the store being edited; initial value tracks what's saved
  const [editRangeMonths, setEditRangeMonths] = useState(null);
  const [initialEditRangeMonths, setInitialEditRangeMonths] = useState(null);
  // Order view window (months): how far back users can see orders at all
  const [viewRangeMonths, setViewRangeMonths] = useState(null);
  const [initialViewRangeMonths, setInitialViewRangeMonths] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ mode: "onTouched" });

  useEffect(() => {
    dispatch(fetchSheets()); // fetch all sheets for table
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const openCreateModal = () => {
    setEditingSheet(null);
    setLogoFile(null);
    setLogoError("");
    // Explicit blanks: a plain reset() would bring back the last edited store
    // (reset(values) makes those the form's defaults); also clears old errors
    reset(Object.fromEntries(STORE_FORM_FIELDS.map((name) => [name, ""])));
    setShowModal(true);
  };

  const chooseLogo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // so choosing the same file again still fires
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      toast.error("The logo must be a PNG or JPG image");
      return;
    }
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      toast.error(`The logo must be ${MAX_LOGO_MB} MB or smaller`);
      return;
    }
    setLogoFile(file);
    setLogoError("");
  };

  const openEditModal = (sheet) => {
    setEditingSheet(sheet);
    setLogoFile(null);
    setLogoError("");
    // reset (not setValue) so errors left from an earlier attempt are cleared
    reset(
      Object.fromEntries(
        STORE_FORM_FIELDS.map((name) => [name, sheet[name] ?? ""]),
      ),
    );
    setEditRangeMonths(null);
    setInitialEditRangeMonths(null);
    setShowModal(true);

    dispatch(fetchOrderEditRange({ storeId: sheet.id }))
      .unwrap()
      .then((res) => {
        const months = getEditRangeMonths(res?.data);
        setEditRangeMonths(months);
        setInitialEditRangeMonths(months);
      })
      .catch(() => {});

    setViewRangeMonths(null);
    setInitialViewRangeMonths(null);
    dispatch(fetchOrderViewRange({ storeId: sheet.id }))
      .unwrap()
      .then((res) => {
        const months = getEditRangeMonths(res?.data);
        setViewRangeMonths(months);
        setInitialViewRangeMonths(months);
      })
      .catch(() => {});
  };
  const onSubmit = async (data) => {
    setLoading(true);

    try {
      if (editingSheet) {
        if (isEditWiderThanView(editRangeMonths, viewRangeMonths)) {
          toast.error("The edit range can't be wider than the view range");
          return;
        }

        const requests = [
          dispatch(
            updateSheet({
              id: editingSheet.id,
              ...data,
              logo: logoFile,
            }),
          ).unwrap(),
        ];

        if (editRangeMonths && editRangeMonths !== initialEditRangeMonths) {
          requests.push(
            dispatch(
              saveOrderEditRange({
                months: editRangeMonths,
                storeId: editingSheet.id,
              }),
            ).unwrap(),
          );
        }

        if (viewRangeMonths && viewRangeMonths !== initialViewRangeMonths) {
          requests.push(
            dispatch(
              saveOrderViewRange({
                months: viewRangeMonths,
                storeId: editingSheet.id,
              }),
            ).unwrap(),
          );
        }

        await Promise.all(requests);
      } else {
        await dispatch(createSheetStore({ ...data, logo: logoFile })).unwrap();
      }

      // ✅ API success ke immediately baad modal close
      setShowModal(false);
      setEditingSheet(null);
      setLogoFile(null);
      setLogoError("");
      reset();

      // ✅ Table refresh separately
      dispatch(fetchSheets());
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(err || "Operation failed");
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this sheet?")) return;

    try {
      await dispatch(deleteSheet(id)).unwrap();
      toast.success("Sheet deleted successfully");
    } catch (err) {
      toast.error(err || "Failed to delete sheet");
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
        <h1 className="text-xl font-semibold">All Store</h1>

        {/* Buttons + File Selector */}
        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
          {/* Add Sheet Button */}
          <button
            onClick={() => navigate("/storeroles/order-type")}
            className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700"
          >
            <Plus size={16} /> Add Order Type
          </button>
          <button
            onClick={() => navigate("/storeroles/attribute")}
            className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700"
          >
            <Plus size={16} /> Add Option
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700"
          >
            <Plus size={16} /> Add Store
          </button>

          {/* Download Button */}
          {/* <div className="p-4 bg-gray-50 rounded-md shadow-sm max-w-full flex flex-col md:flex-row md:items-center md:gap-4">
            <p className="font-semibold text-gray-700 mb-2 md:mb-0">Example Files:</p>
            <div className="flex flex-col md:flex-row gap-2 md:gap-4">
              <a
                href="https://1drv.ms/x/c/1943505b6599b430/IQCAE-DJlCFjSYfUJJlYUmIpAVlVIAlQHEMLBPBWw5bldiY"
                target="_blank"
                className="text-blue-600 underline hover:text-blue-800 transition-colors"
              >
                example.xls
              </a>
              <a
                href="https://1drv.ms/x/c/1943505b6599b430/IQCAE-DJlCFjSYfUJJlYUmIpAVlVIAlQHEMLBPBWw5bldiY"
                target="_blank"
                className="text-blue-600 underline hover:text-blue-800 transition-colors"
              >
                example.csv
              </a>
            </div>
          </div> */}
        </div>
      </div>

      {/* ==== Table ==== */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border text-left">Name</th>
              <th className="p-2 border text-left">Store Name</th>
              <th className="p-2 border text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fetchLoading ? (
              <tr>
                <td colSpan={4} className="p-6 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </td>
              </tr>
            ) : sheetsData.length ? (
              sheetsData.map((sheet) => (
                <tr
                  key={sheet.id}
                  className="hover:bg-gray-50 text-center md:text-left"
                >
                  <td className="p-2 ">{sheet.name}</td>
                  <td className="p-2 ">{sheet.store_name}</td>
                  <td className="p-2  flex gap-2 justify-center md:justify-start">
                    <button
                      onClick={() => openEditModal(sheet)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(sheet.id)}
                      disabled={deleteLoading}
                      className={`text-red-500 hover:text-red-700 ${deleteLoading ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-4 text-center border" colSpan={4}>
                  No sheets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ==== Create/Edit Modal ==== */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-lg relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">
              {editingSheet ? "Edit Store" : "Create New Store"}
            </h2>
            <form
              className="flex flex-col gap-3"
              noValidate
              onSubmit={(e) => {
                // A logo is needed unless the store being edited already has one;
                // checked alongside the fields so every error shows at once
                const logoMissing = !logoFile && !editingSheet?.logo_url;
                setLogoError(logoMissing ? "Upload the store logo" : "");
                return handleSubmit((data) => {
                  if (!logoMissing) return onSubmit(data);
                })(e);
              }}
            >
              <input
                type="text"
                placeholder="Name *"
                {...register("name", STORE_FIELD_RULES.name)}
                aria-invalid={errors.name ? "true" : "false"}
                className={inputClass(errors.name)}
              />
              <FieldError error={errors.name} />

              <input
                type="text"
                placeholder="Store Name *"
                {...register("store_name", STORE_FIELD_RULES.store_name)}
                aria-invalid={errors.store_name ? "true" : "false"}
                className={inputClass(errors.store_name)}
              />
              <FieldError error={errors.store_name} />

              {editingSheet && (
                <>
                  <RangeChips
                    label="Users can view orders from"
                    value={viewRangeMonths}
                    onChange={(months) => {
                      setViewRangeMonths(months);
                      // Narrowing the view also narrows an edit window that's now wider
                      if (isEditWiderThanView(editRangeMonths, months)) {
                        setEditRangeMonths(months);
                      }
                    }}
                  />
                  <RangeChips
                    label="Users can edit orders from"
                    value={editRangeMonths}
                    onChange={setEditRangeMonths}
                    maxValue={viewRangeMonths}
                    disabledTitle="Can't be wider than the view range"
                  />
                </>
              )}

              <StoreDetailFields
                title="Company details"
                fields={STORE_COMPANY_FIELDS}
                register={register}
                errors={errors}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-32 h-14 shrink-0 border rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Store logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <ImagePlus size={20} className="text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <label className="inline-block cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                      {logoPreview ? "Change logo" : "Upload logo"}
                      <input
                        type="file"
                        accept={LOGO_TYPES.join(",")}
                        onChange={chooseLogo}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-500">
                      PNG or JPG, up to {MAX_LOGO_MB} MB{" "}
                      <span className="text-red-500">*</span>
                    </p>
                    {logoError && (
                      <p className="text-red-500 text-xs">{logoError}</p>
                    )}
                  </div>
                </div>
              </StoreDetailFields>

              <StoreDetailFields
                title="Bank details"
                fields={STORE_BANK_FIELDS}
                register={register}
                errors={errors}
              />

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 px-4 rounded-lg text-white mt-2 
              ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"} transition-colors`}
              >
                {loading ? "Saving..." : editingSheet ? "Update" : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSheets;
