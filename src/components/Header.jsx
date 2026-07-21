import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { LogOut, X, Plus, UserCircle, Sheet } from "lucide-react";
import { useForm } from "react-hook-form"; // ✅ import react-hook-form
import logo from "../assets/header-logo.svg";
import { logoutManual } from "../store/authSlice";
import { createSheetStore } from "../store/usersSlice";
import { CreateUserModal } from "./CreateUserModal";
import { SuperAdminProfileModal } from "./SuperAdminProfileModal";

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, storeId } = useSelector((state) => state.auth);
  const { storeloading, error } = useSelector((state) => state.users);
  const [showUserModal, setShowUserModal] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const roleId = user?.role_id;

  const {
    register,
    handleSubmit,
    reset,
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
    toast.success("Logged out successfully", { style: { fontSize: "12px", fontWeight: "bold" } });
    navigate("/");
  };


  return (
    <>
      <header className="flex items-center justify-between mb-10 relative bg-[#FFFFFF] px-6 md:px-10 py-6">
        <div className="flex items-center gap-3">
          <Link to={"/dashboard"} >
            <img src={logo} alt="Shiwantek" className="h-11" onError={(e) => (e.target.style.display = "none")} />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-semibold">
            {user?.name[0] || "U"}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-gray-800 text-sm">{user?.name || "User"}</span>
            <span className="text-xs text-gray-500">{storeId?.name}</span>
          </div>
          {[1].includes(roleId) && (
            <>
              <button
                onClick={() => setShowProfileModal(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
                title="Update profile"
              >
                <UserCircle size={20} className="text-gray-600" />
              </button>
              <button
                onClick={() => navigate("/storeroles")}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <Plus size={20} className="text-gray-600" />
              </button>
            </>
          )}

          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <LogOut size={20} className="text-gray-600" />
          </button>
        </div>
      </header>

      {showUserModal && <CreateUserModal onClose={() => setShowUserModal(false)} />}
      {showProfileModal && (
        <SuperAdminProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-lg relative">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <div className="text-center py-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Want to logout?</h2>
            </div>
            <div className="flex justify-between gap-3 mt-6">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-1/2 border py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={handleLogout}
                className="w-1/2 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
