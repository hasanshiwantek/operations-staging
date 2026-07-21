import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setStoreId } from "../store/authSlice";

const StoreSelection = () => {
  const [store, setStore] = useState("");
    const { user ,storeId} = useSelector((state) => state.auth);
    const roles = user?.roles
    const navigate = useNavigate();
  const dispatch = useDispatch();
  

    // Redirect to dashboard on successful login
    useEffect(() => {
      if (storeId) {
        navigate("/dashboard");
      } 
    }, [storeId, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const selectedStore = roles.find((s) => s.id === Number(store));
    if (selectedStore) {
      dispatch(setStoreId(selectedStore));
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
              {roles.map((store) => (
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
