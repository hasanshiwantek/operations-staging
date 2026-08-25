import React, { useState, useEffect } from "react";
import {
  MoreVertical,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import addUserIcon from "../assets/adduser-icon.svg";
import { useDispatch, useSelector } from "react-redux";
import { deleteUser, fetchUsers, updateUser } from "../store/usersSlice";
import { getRoles, register } from "../store/authSlice";
import { toast } from "react-toastify";
import { Permissions } from "./Permissions";

const pageAccessOptions = [
  {
    page: "Home",
    tabs: [
      "All",
      "Delivered",
      "Intransit",
      "Delayed",
      "Cancel",
      "Partial",
      "Refunded",
    ],
  },
  {
    page: "Order",
    tabs: ["Order", "Invoice", "Customer", "Vendor", "Total price & Profit"],
  },
];

// Helper function to convert page_name array to pageAccess object
const convertPageNamesToPageAccess = (pageNames) => {
  if (!pageNames || !Array.isArray(pageNames)) return {};

  const pageAccess = {};

  pageAccessOptions.forEach((option) => {
    const matchingTabs = option.tabs.filter((tab) =>
      pageNames.some((name) => name.toLowerCase() === tab.toLowerCase()),
    );

    if (matchingTabs.length > 0) {
      pageAccess[option.page] = matchingTabs;
    }
  });

  return pageAccess;
};

// Updated CreateUserModal with Edit Support
export const CreateUserModal = ({ onClose, editUser = null }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [expandedPages, setExpandedPages] = useState({});
  const dispatch = useDispatch();
  const { user, storeId, loading } = useSelector((state) => state.auth);
  const { roles, rolesLoading, error } = useSelector((state) => state.auth);
  const { updateLoading } = useSelector((state) => state.users);
  const isEditMode = !!editUser;
  const [errors, setErrors] = useState({});

  // Initialize form with edit data if available
  const getInitialPageAccess = () => {
    if (!editUser) return {};

    // Check if page_access is an object with page_name array
    if (editUser.page_access?.page_name) {
      return convertPageNamesToPageAccess(editUser.page_access.page_name);
    }

    // Fallback if it's already in the correct format
    return editUser.page_access || {};
  };

  const [formData, setFormData] = useState({
    name: editUser?.name || "",
    email: editUser?.email || "",
    role: editUser?.role_id || "",
    colour_code: editUser?.colour_code || "",
    permission_ids: editUser?.permissions?.map((p) => p.id) || [], // ✅ correct
  });


  // Debug: Log the converted page access

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email";
    }

    if (!formData?.role) newErrors.role = "Role is required";

    if (formData?.role == 3 && !formData?.colour_code) {
      newErrors.colour_code = "Colour is required";
    }

    if (!formData.permission_ids || formData.permission_ids.length === 0) {
      newErrors.pageAccess = "Select at least one permission";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const roleDetail = roles?.find((item) => item?.id == formData?.role);

    const payload = {
      name: formData.name,
      email: formData.email,
      role_id: Number(roleDetail?.id),
      colour_code: formData.colour_code || null,
      permission_ids: formData.permission_ids, // ← dynamic now
    };

    // Optional: if you still need colour_name
    // payload.colour_name = "Blue"; // or map from colour_code

    if (isEditMode) {
      const result = await dispatch(
        updateUser({ id: editUser.id, data: payload })
      );

      if (updateUser.fulfilled.match(result)) {
        dispatch(fetchUsers());
        onClose();
      } else {
        toast.error("Failed to update user. Please try again.");
      }
    } else {
      const result = await dispatch(register(payload));

      if (register.fulfilled.match(result)) {
        dispatch(fetchUsers());
        onClose();
      } else {
        toast.error("Failed to create user. Please try again.");
      }
    }
  };

  const togglePageExpansion = (page) => {
    setExpandedPages((prev) => ({
      ...prev,
      [page]: !prev[page],
    }));
  };

  const toggleTab = (page, tab) => {
    const currentTabs = formData.pageAccess[page] || [];
    const newTabs = currentTabs.includes(tab)
      ? currentTabs.filter((t) => t !== tab)
      : [...currentTabs, tab];

    const newPageAccess = { ...formData.pageAccess };
    if (newTabs.length === 0) {
      delete newPageAccess[page];
    } else {
      newPageAccess[page] = newTabs;
    }

    setFormData({ ...formData, pageAccess: newPageAccess });
  };

  const selectAllTabs = (page, tabs) => {
    const currentTabs = formData.pageAccess[page] || [];
    const allSelected = tabs.every((tab) => currentTabs.includes(tab));

    const newPageAccess = { ...formData.pageAccess };
    if (allSelected) {
      delete newPageAccess[page];
    } else {
      newPageAccess[page] = tabs;
    }

    setFormData({ ...formData, pageAccess: newPageAccess });
  };

  const isPageSelected = (page) => {
    return formData.pageAccess[page] && formData.pageAccess[page].length > 0;
  };

  const areAllTabsSelected = (page, tabs) => {
    const currentTabs = formData.pageAccess[page] || [];
    return tabs.every((tab) => currentTabs.includes(tab));
  };
  useEffect(() => {
    dispatch(getRoles());
  }, [dispatch]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-lg relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          {isEditMode ? "Edit user" : "Create new user"}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {isEditMode
            ? "Update the user details below."
            : "Fill in the details below to create a new user account."}
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 font-medium">Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={`w-full mt-1 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors.name ? "border-red-400" : "border-gray-200"
                  }`}
              />
              <p className="text-xs text-red-500 min-h-[16px] mt-1">
                {errors.name || " "}
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-600 font-medium">Email</label>
              <input
                type="email"
                placeholder="e.g. example@gmail.com"
                value={formData.email}
                disabled={editUser}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className={`w-full mt-1 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors.email ? "border-red-400" : "border-gray-200"
                  }`}
              />
              <p className="text-xs text-red-500 min-h-[16px] mt-1">
                {errors.email || " "}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm text-gray-600 font-medium">
                Select Role
              </label>
              <select
                disabled={editUser}
                value={formData.role}
                onChange={(e) => {
                  setFormData({ ...formData, role: e.target.value, colour_code: null });
                }}
                className={`w-full mt-1 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors.role ? "border-red-400" : "border-gray-200"
                  }`}
              >
                <option value="">Select a role</option>
                {roles?.map((role) => (
                  <option key={role.id} value={role.id.toString()}>
                    {role?.name?.toUpperCase()}
                  </option>
                ))}
              </select>
              <p className="text-xs text-red-500 min-h-[16px] mt-1">
                {errors.role || " "}
              </p>
            </div>
          </div>
          {/* Color Picker */}
          {formData.role == 3 && <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Colour <span className="text-red-500">*</span>
            </label>

            <div className="flex items-center gap-3">
              {/* Native Color Picker */}
              <div className="relative">
                <input
                  type="color"
                  value={formData?.colour_code || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, colour_code: e.target.value })
                  }
                  className="h-11 w-14 cursor-pointer rounded-lg border border-gray-300 p-1"
                  title="Pick a color"
                />
              </div>

              {/* Hex Input */}
              <input
                type="text"
                value={formData?.colour_code || ""}
                onChange={(e) => {
                  let value = e.target.value;

                  // Automatically add #
                  if (value && !value.startsWith("#")) {
                    value = `#${value}`;
                  }
                  setFormData({ ...formData, colour_code: value })
                }}
                placeholder="#22c55e"
                maxLength={7}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-mono outline-none transition
        ${errors.colour_code
                    ? "border-red-500 focus:ring-2 focus:ring-red-200"
                    : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  }`}
              />
            </div>

            {errors.colour_code && (
              <p className="mt-1 text-sm text-red-500">
                {errors.colour_code}
              </p>
            )}
          </div>}
          <div>
            <label className="text-sm text-gray-600 font-medium mb-2 block">
              Page access
            </label>
            <Permissions
              selectedIds={formData.permission_ids}
              onChange={(ids) =>
                setFormData((prev) => ({ ...prev, permission_ids: ids }))
              }
            />
            <p className="text-xs text-red-500 min-h-[16px] mt-1">
              {errors.pageAccess || " "}
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={updateLoading}
            className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateLoading
              ? "Updating..."
              : isEditMode
                ? "Update user"
                : "Create user"}
          </button>
        </div>
      </div>
    </div>
  );
};
