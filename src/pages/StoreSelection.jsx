import React, { useEffect, useState } from "react";
import { BASEURL } from "../Axios/axiosInstance";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setStoreId } from "../store/authSlice";
export const getRolesByStoreId = async (token, storeId) => {
  try {
    const response = await fetch(
      `${BASEURL}/auth/get-role-by-store-id`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "store-id": storeId,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message || "Failed to fetch roles"
      );
    }

    return data;
  } catch (error) {
    console.error("Get roles error:", error);
    throw error;
  }
};
const StoreSelection = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [store, setStore] = useState("");
  const { user, storeId, token } = useSelector((state) => state.auth);
  const stores = user?.stores

  // Redirect to dashboard on successful login
  useEffect(() => {
    if (storeId) {
      navigate("/dashboard");
    }
  }, [storeId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedStore = stores?.find((s) => s?.id === Number(store));
    if (selectedStore) {
      if (user?.role_id == 1 || user?.role_id == 2) {
        dispatch(setStoreId(selectedStore));
      } else {
        try {
          const result = await getRolesByStoreId(token, selectedStore?.id);

          const roleData = {
            ...user,
            role_id: result?.role?.id,
            role_name: result?.role?.name
          }
          let persistedAuth = JSON.parse(
            localStorage.getItem("persist:auth")
          );

          if (persistedAuth?.user && roleData) {
            persistedAuth.user = JSON.stringify(roleData);

            localStorage.setItem(
              "persist:auth",
              JSON.stringify(persistedAuth)
            );
          }
          dispatch(setStoreId(selectedStore));
        } catch (error) {
          console.error("Failed to fetch roles:", error);
        }
      }
    }
  };
  return (
    <div className="flex items-center justify-center bg-gray-50 h-screen w-full min-w-full">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-[25%] text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            S
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Select Store
        </h2>
        <p className="text-gray-500 mb-8">
          Please select a store to continue
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dropdown */}
          <div className="text-left">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store <span className="text-red-500">*</span>
            </label>

            <select
              value={store}
              onChange={(e) => setStore(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Select store</option>
              {stores?.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!store}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default StoreSelection;
