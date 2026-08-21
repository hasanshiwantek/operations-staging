import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";

const orderType = ["rma", "po", "cancelled"];

const OrderTypeModal = ({
  open,
  onClose,
  onSubmit,
  loading = false,
  editData = null,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      type: "",
      color_code: "#22c55e",
    },
  });

  const colorValue = watch("color_code");

  useEffect(() => {
    if (editData) {
      reset({
        type: editData.type || editData.name || "",
        color_code: editData.color_code || "#22c55e",
      });
    } else {
      reset({
        type: "",
        color_code: "#22c55e",
      });
    }
  }, [editData, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const submitHandler = async (data) => {
    const success = await onSubmit(data);

    if (success) {
      reset();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {editData ? "Edit Order Type" : "Create Order Type"}
          </h2>

          <button
            onClick={handleClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(submitHandler)} className="p-6 space-y-5">
          {/* Order Type Dropdown */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Order Type <span className="text-red-500">*</span>
            </label>

            <select
              {...register("type", {
                required: "Order type is required",
              })}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition appearance-none bg-white
                ${errors.type
                  ? "border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                }`}
            >
              <option value="">Select order type</option>
              {orderType.map((type) => (
                <option key={type} value={type}>
                  {type.toUpperCase()}
                </option>
              ))}
            </select>

            {errors.type && (
              <p className="mt-1 text-sm text-red-500">{errors.type.message}</p>
            )}
          </div>

          {/* Color Picker */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Color <span className="text-red-500">*</span>
            </label>

            <div className="flex items-center gap-3">
              {/* Color Preview + Native Picker */}
              <div className="relative">
                <input
                  type="color"
                  {...register("color_code", {
                    required: "Color is required",
                  })}
                  className="h-11 w-14 cursor-pointer rounded-lg border border-gray-300 p-1"
                  title="Pick a color"
                />
              </div>

              {/* Hex Input */}
              <input
                type="text"
                value={colorValue || ""}
                onChange={(e) => {
                  let value = e.target.value;
                  if (!value.startsWith("#")) {
                    value = "#" + value;
                  }
                  setValue("color_code", value, { shouldValidate: true });
                }}
                placeholder="#22c55e"
                maxLength={7}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm outline-none transition font-mono
                  ${errors.color_code
                    ? "border-red-500 focus:ring-2 focus:ring-red-200"
                    : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  }`}
              />
            </div>

            {errors.color_code && (
              <p className="mt-1 text-sm text-red-500">
                {errors.color_code.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className={`rounded-lg px-5 py-2 text-sm font-medium text-white transition
                ${loading
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-indigo-600 hover:bg-indigo-700"
                }`}
            >
              {loading ? "Saving..." : editData ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderTypeModal;