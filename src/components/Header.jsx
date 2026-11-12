import { FileClock, LogOut, Logs, Plus, UserCircle } from "lucide-react";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form"; // ✅ import react-hook-form
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import logo from "../assets/header-logo.svg";
import { logoutManual } from "../store/authSlice";
import { getPermissionsByStoreId } from "../store/permissionsSlice";
import { DOCUMENT_PERMISSIONS } from "../utils/constant";
import ConfirmDialog from "./ConfirmDialog";
import { CreateUserModal } from "./CreateUserModal";
import NotificationBell from "./NotificationBell";
import { SuperAdminProfileModal } from "./SuperAdminProfileModal";

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, storeId } = useSelector((state) => state.auth);
  const allAuth = useSelector((state) => state.auth);
  const { storeloading, error } = useSelector((state) => state.users);
  const [showUserModal, setShowUserModal] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const roleId = user?.role_id;
  const { userPermissions } = useSelector((state) => state.permissions);
  const canSeeDocumentHistory =
    roleId === 1 ||
    roleId === 2 ||
    userPermissions?.some((p) => p.slug === DOCUMENT_PERMISSIONS.history);
  const {
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleLogout = () => {
    dispatch(logoutManual());
    setShowLogoutModal(false);
    toast.success("Logged out successfully", {
      style: { fontSize: "12px", fontWeight: "bold" },
    });
    navigate("/");
  };
  useEffect(() => {
    dispatch(getPermissionsByStoreId(storeId?.id));
  }, []);

  return (
    <>
      <header className="flex items-center justify-between mb-10 relative bg-[#FFFFFF] px-6 md:px-10 py-6">
        <div className="flex items-center gap-3">
          <Link to={"/dashboard"}>
            <img
              src={logo}
              alt="Shiwantek"
              className="h-11"
              onError={(e) => (e.target.style.display = "none")}
            />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-semibold">
            {user?.name[0] || "U"}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-gray-800 text-sm">
              {user?.name || "User"}
            </span>
            {storeId?.roleName && (
              <span className="text-xs text-gray-500">
                {storeId?.roleName?.charAt(0).toUpperCase() +
                  storeId?.roleName.slice(1)}
              </span>
            )}
            <span className="text-xs text-gray-500">{storeId?.name}</span>
          </div>
          {[1].includes(roleId) && (
            <>
              <button
                onClick={() => navigate("/storeroles")}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <Plus size={20} className="text-gray-600" />
              </button>
              <button
                onClick={() => setShowProfileModal(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
                title="Update profile"
              >
                <UserCircle size={20} className="text-gray-600" />
              </button>
              <button
                onClick={() => navigate("/user-logs")}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <Logs size={20} className="text-gray-600" />
              </button>
            </>
          )}

          <NotificationBell />

          {canSeeDocumentHistory && (
            <button
              onClick={() => navigate("/document-history")}
              className="p-2 hover:bg-gray-100 rounded-full transition"
              title="Document history"
              aria-label="Document history"
            >
              <FileClock size={20} className="text-gray-600" />
            </button>
          )}

          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <LogOut size={20} className="text-gray-600" />
          </button>
        </div>
      </header>

      {showUserModal && (
        <CreateUserModal onClose={() => setShowUserModal(false)} />
      )}
      {showProfileModal && (
        <SuperAdminProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {/* Logout confirmation (Esc / Close cancels) */}
      <ConfirmDialog
        open={showLogoutModal}
        title="Want to logout?"
        message="You'll need to sign in again to use the portal."
        confirmLabel="Logout"
        cancelLabel="Close"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
};

export default Header;
