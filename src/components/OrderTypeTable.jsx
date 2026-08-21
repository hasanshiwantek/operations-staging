import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import OrderTypeModal from "./OrderTypeModal";
import {
  fetchOrderTypes,
  createOrderType,
  updateOrderType,
  deleteOrderType,
} from "../store/orderTypeSlice"; // ← make sure path is correct




const OrderTypeTable = () => {
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const { storeId } = useSelector((state) => state.auth);
  const {
    orderTypes,
    loading,
    createLoading,
    updateLoading,
    deleteLoading,
  } = useSelector((state) => state.orderTypes);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Fetch list
  useEffect(() => {
    if (storeId?.id) {
      dispatch(fetchOrderTypes(storeId.id));
    }
  }, [dispatch, storeId]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditData(null);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleEdit = (item) => {
    setEditData(item);
    setShowModal(true);
  };
  console.log("orderTypes", orderTypes);

  // Delete
  const handleDelete = async (item) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${item.type}"?`
    );

    if (!confirmDelete) return;

    try {
      await dispatch(deleteOrderType(item.id)).unwrap();
      toast.success("Order type deleted successfully");
      dispatch(fetchOrderTypes(storeId.id));
    } catch (error) {
      toast.error(error || "Failed to delete order type");
    }
  };

  // Create or Update
  const handleSubmit = async (data) => {
    try {
      if (editData) {
        // UPDATE
        await dispatch(
          updateOrderType({
            id: editData.id,
            type: data.type,
            color_code: data.color_code,
          })
        ).unwrap();

        toast.success("Order type updated successfully");
      } else {
        // CREATE
        await dispatch(
          createOrderType({
            type: data.type,
            color_code: data.color_code,
            role_id: storeId.id,
          })
        ).unwrap();

        toast.success("Order type created successfully");
      }

      // Refresh list
      dispatch(fetchOrderTypes(storeId.id));
      setShowModal(false);
      setEditData(null);
      return true;
    } catch (error) {
      toast.error(error || "Something went wrong");
      return false;
    }
  };

  return (
    <div className="p-6">
      {/* Back Button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-medium transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Order Type Colors</h1>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition-all"
        >
          <Plus size={18} />
          Add Order Type
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                Type
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                Color
              </th>
              <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700 w-56">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : orderTypes?.length > 0 ? (
              orderTypes.map((item) => (
                <tr
                  key={item.id}
                  className="border-b last:border-b-0 hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4 text-gray-800 font-medium capitalize">
                    {item.type.toUpperCase()}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-md border border-gray-300"
                        style={{ backgroundColor: item.color_code }}
                      />
                      <span className="text-sm text-gray-600 font-mono">
                        {item.color_code}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        <Pencil size={17} />
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deleteLoading}
                        className="flex items-center gap-2 text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
                      >
                        <Trash2 size={17} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-10 text-center text-gray-500">
                  No Order Types Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <OrderTypeModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditData(null);
        }}
        onSubmit={handleSubmit}
        loading={createLoading || updateLoading}
        editData={editData}
      />
    </div>
  );
};

export default OrderTypeTable;