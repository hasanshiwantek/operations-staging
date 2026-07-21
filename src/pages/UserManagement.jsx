import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, deleteUser } from "../store/usersSlice";
import { CreateUserModal } from "../components/CreateUserModal";
import addUserIcon from "../assets/adduser-icon.svg?url";
import { MoreVertical } from "lucide-react";

// Updated UsersSection Component
const UsersSection = ({
  users = [],
  searchValue,
  onSearchChange,
  onCreateUserClick,
  loading = false,
  error = null,
}) => {
  const { user } = useSelector((state) => state?.auth);
  const dispatch = useDispatch();
  const roleId = user?.role_id;
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleDeleteUser = (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this user?");
    if (!confirmDelete) return;

    dispatch(deleteUser(id));
    setOpenMenuId(null);
  };

  const handleEditUser = (user) => {
    console.log("Editing user:", user);
    setEditingUser(user);
    setOpenMenuId(null);
  };

  const handleCloseModal = () => {
    setEditingUser(null);
    setShowCreateModal(false);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4 relative overflow-hidden">
        <div className="absolute bottom-6 right-6 w-28 h-28 bg-indigo-100 opacity-70 blur-3xl rounded-full pointer-events-none z-0" />
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-gray-800 text-lg">Users</h2>
          <button className="text-sm bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full hover:bg-indigo-100 transition">
            View activity log
          </button>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1 inline-block">
            Enter name
          </label>
          <input
            type="text"
            placeholder="Enter name"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-3 relative z-10 h-[35rem] overflow-y-scroll">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Loading users...
            </p>
          ) : error ? (
            <p className="text-sm text-red-500 text-center py-4">
              {error}
            </p>
          ) : users.length > 0 ? (
            users.map((user, i) => {
              const userName = typeof user === 'object' ? user.name : user;
              const userEmail = typeof user === 'object' ? user.email : '';
              const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';
              const userId = typeof user === 'object' ? user.id : i;
              
              return (
                <div
                  key={userId}
                  className="relative flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm"
                      style={{
                        backgroundColor: `hsl(${(i * 45) % 360}, 70%, 55%)`,
                      }}
                    >
                      {userInitial}
                    </div>

                    <div>
                      <p className="text-gray-700 font-medium text-sm">{userName}</p>
                      {userEmail && (
                        <p className="text-xs text-gray-500">{userEmail}</p>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <MoreVertical
                      size={16}
                      className="text-gray-400 cursor-pointer"
                      onClick={() =>
                        setOpenMenuId(openMenuId === userId ? null : userId)
                      }
                    />

                    {openMenuId === userId && (
                      <div className="absolute right-0 top-6 z-10 w-28 bg-white border rounded-lg shadow-md">
                        <button
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                          onClick={() => handleEditUser(user)}
                        >
                          Edit
                        </button>

                        <button
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteUser(userId)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No users found.
            </p>
          )}
        </div>
        
        {[1, 2].includes(roleId) && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="absolute bottom-40 right-8 z-30 flex items-center justify-center rounded-full drop-shadow-xl hover:scale-105 transition"
          >
            <img src={addUserIcon} alt="Add user" className="w-16 h-16" />
          </button>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal onClose={handleCloseModal} />
      )}
      {editingUser && (
        <CreateUserModal onClose={handleCloseModal} editUser={editingUser} />
      )}
    </>
  );
};

export default UsersSection;
