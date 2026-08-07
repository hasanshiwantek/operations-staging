import React from "react";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";

const ValueModal = ({
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

  React.useEffect(() => {
    if (editData) {
      reset({
        value: editData.name,
      });
    } else {
      reset({
        value: "",
      });
    }
  }, [editData, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const submitHandler = async (data) => {
    const success = await onSubmit(data);
 console.log(success)
    if (success) {
      reset();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {editData ? "Edit Value" : "Create Value"}
          </h2>

          <button
            onClick={handleClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
          >
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(submitHandler)}
          className="space-y-5 p-6"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Value <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              placeholder="Enter value"
              {...register("value", {
                required: "Value is required",
              })}
              className={`w-full rounded-lg border px-4 py-2.5 outline-none ${
                errors.value
                  ? "border-red-500"
                  : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              }`}
            />

            {errors.value && (
              <p className="mt-1 text-sm text-red-500">
                {errors.value.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">

            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-300 px-5 py-2 hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className={`rounded-lg px-5 py-2 text-white ${
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

export default ValueModal;