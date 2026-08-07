import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";

const AttributeModal = ({
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
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (editData) {
      reset({
        name: editData.name,
      });
    } else {
      reset({
        name: "",
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
            {editData ? "Edit Attribute" : "Create Attribute"}
          </h2>

          <button
            onClick={handleClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(submitHandler)}
          className="p-6 space-y-5"
        >
          <div>
            <label className="mb-2 block flex justify-between text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              placeholder="Enter attribute name"
              {...register("name", {
                required: "Attribute name is required",
              })}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition

                ${
                  errors.name
                    ? "border-red-500 focus:ring-2 focus:ring-red-200"
                    : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                }`}
            />

            {errors.name && (
              <p className="mt-1 text-sm text-red-500">
                {errors.name.message}
              </p>
            )}
          </div>

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

                ${
                  loading
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
            >
              {loading
                ? "Saving..."
                : editData
                ? "Update"
                : "Create"}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
};

export default AttributeModal;