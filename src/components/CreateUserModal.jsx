import React, { useState, useEffect } from "react";
import { MoreVertical, X, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import addUserIcon from "../assets/adduser-icon.svg";
import { useDispatch, useSelector } from "react-redux";
import { deleteUser, updateUser } from "../store/usersSlice";
import { register } from "../store/authSlice";
import { toast } from "react-toastify";

const pageAccessOptions = [
  {
    page: "Home",
    tabs: ["All", "Delivered", "Intransit", "Delayed", "Cancel", "Partial", "Refunded"]
  },
  {
    page: "Order",
    tabs: ["Order", "Invoice", "Customer", "Vendor", "Total price & Profit"]
  },
];

// Helper function to convert page_name array to pageAccess object
const convertPageNamesToPageAccess = (pageNames) => {
  if (!pageNames || !Array.isArray(pageNames)) return {};

  const pageAccess = {};

  pageAccessOptions.forEach(option => {
    const matchingTabs = option.tabs.filter(tab =>
      pageNames.some(name => name.toLowerCase() === tab.toLowerCase())
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
  const { user } = useSelector((state) => state.auth);
  const { updateLoading } = useSelector((state) => state.users);
  const roles = user?.roles;

  const isEditMode = !!editUser;

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
    password: "",
    confirmPassword: "",
    role: editUser?.role_id?.toString(),
    pageAccess: getInitialPageAccess(),
  });
  const [errors, setErrors] = useState({});

  // Debug: Log the converted page access
  

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email";
    }

    // Password validation only for create mode or if password is entered in edit mode
    if (!isEditMode) {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 6) {
        newErrors.password = "Min 6 characters";
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Confirm password is required";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    } else if (formData.password) {
      // In edit mode, only validate if password is provided
      if (formData.password.length < 6) {
        newErrors.password = "Min 6 characters";
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    if (!formData.role) newErrors.role = "Role is required";
    if (Object.keys(formData.pageAccess).length === 0) {
      newErrors.pageAccess = "Select at least one page access";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Format page access for API
    const pageAccessArray = [];
    Object.entries(formData.pageAccess).forEach(([page, tabs]) => {
      if (tabs && tabs.length > 0) {
        tabs.forEach((tab) => {
          pageAccessArray.push(tab);
        });
      }
    });

    if (isEditMode) {
      // Update user
      const payload = {
        name: formData.name,
        email: formData.email,
        role_id: Number(formData.role),
        page_name: pageAccessArray,
      };

      // Only include password if it's provided
      if (formData.password) {
        payload.password = formData.password;
        payload.password_confirmation = formData.confirmPassword;
      }

      const result = await dispatch(updateUser({ id: editUser.id, data: payload }));

      if (updateUser.fulfilled.match(result)) {
        onClose();
      } else {
        toast.error("Failed to update user. Please try again."); // ❌ error toast
      }
    } else {
      // Create user
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
        role_id: Number(formData.role),
        page_name: pageAccessArray,
      };

      const result = await dispatch(register(payload));

      if (register.fulfilled.match(result)) {
        onClose();
      } else {
        toast.error("Failed to create user. Please try again.");
      }
    }
  };

  const togglePageExpansion = (page) => {
    setExpandedPages(prev => ({
      ...prev,
      [page]: !prev[page]
    }));
  };

  const toggleTab = (page, tab) => {
    const currentTabs = formData.pageAccess[page] || [];
    const newTabs = currentTabs.includes(tab)
      ? currentTabs.filter(t => t !== tab)
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
    const allSelected = tabs.every(tab => currentTabs.includes(tab));

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
    return tabs.every(tab => currentTabs.includes(tab));
  };


  console.log("formData", formData);


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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full mt-1 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors.email ? "border-red-400" : "border-gray-200"
                  }`}
              />
              <p className="text-xs text-red-500 min-h-[16px] mt-1">
                {errors.email || " "}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 font-medium">
                Password {isEditMode && <span className="text-gray-400">(optional)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={isEditMode ? "Leave blank to keep current" : "Enter secure password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full mt-1 p-2 pr-10 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors.password ? "border-red-400" : "border-gray-200"
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-red-500 min-h-[16px] mt-1">
                {errors.password || " "}
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-600 font-medium">
                Confirm password {isEditMode && <span className="text-gray-400">(optional)</span>}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full mt-1 p-2 pr-10 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors.confirmPassword ? "border-red-400" : "border-gray-200"
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-red-500 min-h-[16px] mt-1">
                {errors.confirmPassword || " "}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm text-gray-600 font-medium">
                Select role
              </label>
              {/* <select
                value={formData.role}
                // onChange={(e) => console.log(e.target)
                // }
                onChange={(e) => {
                  console.log("selected:", e.target.value);
                  setFormData({ ...formData, role: e.target.value });
                }}
                className={`w-full mt-1 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors.role ? "border-red-400" : "border-gray-200"
                  }`}
              >
                {roles?.map((role) => (
                  <option key={role.id} value={role.id.toString()}>
                    {role.name}
                  </option>
                ))}
              </select> */
              }
              <select
                value={formData.role}
                onChange={(e) => {
                  console.log("selected:", e.target.value);
                  setFormData({ ...formData, role: e.target.value });
                }}
                className={`w-full mt-1 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors.role ? "border-red-400" : "border-gray-200"
                  }`}
              >
                <option value="">Select a role</option>
                {roles?.map((role) => (
                  <option key={role.id} value={role.id.toString()}>
                    {role.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-red-500 min-h-[16px] mt-1">
                {errors.role || " "}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 font-medium mb-2 block">
              Page access
            </label>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {pageAccessOptions.map((item, index) => {
                const isExpanded = expandedPages[item.page];
                const selected = isPageSelected(item.page);
                const allSelected = areAllTabsSelected(item.page, item.tabs);

                return (
                  <div
                    key={item.page}
                    className={`${index !== 0 ? "border-t border-gray-200" : ""}`}
                  >
                    <div
                      className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 ${selected ? "bg-indigo-50" : ""
                        }`}
                      onClick={() => togglePageExpansion(item.page)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">
                          {item.page}
                        </span>
                        {selected && (
                          <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                            {formData.pageAccess[item.page]?.length || 0} selected
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={18} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-400" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="p-3 bg-gray-50 border-t border-gray-200">
                        <div className="mb-2">
                          <button
                            type="button"
                            onClick={() => selectAllTabs(item.page, item.tabs)}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            {allSelected ? "Deselect all" : "Select all"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {item.tabs.map((tab) => {
                            const isTabSelected = formData.pageAccess[item.page]?.includes(tab);
                            return (
                              <label
                                key={tab}
                                className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition ${isTabSelected
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "text-gray-700 border-gray-300 hover:bg-white"
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={isTabSelected}
                                  onChange={() => toggleTab(item.page, tab)}
                                />
                                {tab}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-red-500 min-h-[16px] mt-1">
              {errors.pageAccess || " "}
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={updateLoading}
            className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateLoading ? "Updating..." : isEditMode ? "Update user" : "Create user"}
          </button>
        </div>
      </div>
    </div>
  );
};