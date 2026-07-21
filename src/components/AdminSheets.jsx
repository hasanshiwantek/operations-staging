import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { X, Plus, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  createSheetStore,
  deleteSheet,
  fetchSheets,
  updateSheet,
} from "../store/usersSlice"; 

const AdminSheets = () => {
  const dispatch = useDispatch();
  const { 
  sheets, 
  createLoading, 
  updateLoading, 
  deleteLoading, 
  fetchLoading, 
  error 
} = useSelector((state) => state.users);

  const sheetsData = sheets?.data || [];
  const [showModal, setShowModal] = useState(false);
  const [editingSheet, setEditingSheet] = useState(null); // track edit
    const [selectedFile, setSelectedFile] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm();
  

  useEffect(() => {
    dispatch(fetchSheets()); // fetch all sheets for table
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const openCreateModal = () => {
    setEditingSheet(null);
    reset();
    setShowModal(true);
  };

  const openEditModal = (sheet) => {
    setEditingSheet(sheet);
    setValue("name", sheet.name);
    setValue("store_name", sheet.store_name);
    setValue("sheet_id", sheet.sheet_id);
    setShowModal(true);
  };

const onSubmit = async (data) => {
  try {
    if (editingSheet) {
      const result = await dispatch(updateSheet({ id: editingSheet.id, ...data })).unwrap();
      toast.success("Sheet updated successfully");
    } else {
      const result = await dispatch(createSheetStore(data)).unwrap();
      toast.success("Sheet created successfully");
    }
    
    // ✅ Success ke baad hi close karo
    setShowModal(false);
    reset();
    setEditingSheet(null); // ✅ editing state bhi clear karo
    
  } catch (err) {
    // Error already state mein set ho gaya hai
    toast.error(err || "Operation failed");
    // ❌ Modal close NAHI karna error pe
  }
};

const handleDelete = async (id) => {
  if (!window.confirm("Are you sure you want to delete this sheet?")) return;
  
  try {
    await dispatch(deleteSheet(id)).unwrap();
    toast.success("Sheet deleted successfully");
  } catch (err) {
    toast.error(err || "Failed to delete sheet");
  }
};

  return (
 <div className="p-6">
<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
  <h1 className="text-xl font-semibold">Sheets Admin</h1>

  {/* Buttons + File Selector */}
  <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
    {/* Add Sheet Button */}
    <button
      onClick={openCreateModal}
      className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700"
    >
      <Plus size={16} /> Add Sheet
    </button>

    {/* Download Button */}

<div className="p-4 bg-gray-50 rounded-md shadow-sm max-w-full flex flex-col md:flex-row md:items-center md:gap-4">
  <p className="font-semibold text-gray-700 mb-2 md:mb-0">Example Files:</p>
  <div className="flex flex-col md:flex-row gap-2 md:gap-4">
    <a
      href="https://1drv.ms/x/c/1943505b6599b430/IQCAE-DJlCFjSYfUJJlYUmIpAVlVIAlQHEMLBPBWw5bldiY"
      target="_blank"
      className="text-blue-600 underline hover:text-blue-800 transition-colors"
    >
      example.xls
    </a>
    <a
      href="https://1drv.ms/x/c/1943505b6599b430/IQCAE-DJlCFjSYfUJJlYUmIpAVlVIAlQHEMLBPBWw5bldiY"
      target="_blank"
      className="text-blue-600 underline hover:text-blue-800 transition-colors"
    >
      example.csv
    </a>
  </div>
</div>



  </div>
</div>


  {/* ==== Table ==== */}
  <div className="overflow-x-auto">
    <table className="w-full min-w-[600px] border border-gray-200 rounded-lg overflow-hidden">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-2 border text-left">Name</th>
          <th className="p-2 border text-left">Store Name</th>
          <th className="p-2 border text-left">Sheet ID</th>
          <th className="p-2 border text-left">Actions</th>
        </tr>
      </thead>
     <tbody>
  {fetchLoading ? (
    <tr>
      <td colSpan={4} className="p-6 text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </td>
    </tr>
  ) : sheetsData.length ? (
    sheetsData.map((sheet) => (
      <tr key={sheet.id} className="hover:bg-gray-50 text-center md:text-left">
        <td className="p-2 border">{sheet.name}</td>
        <td className="p-2 border">{sheet.store_name}</td>
        <td className="p-2 border">{sheet.sheet_id}</td>
        <td className="p-2 border flex gap-2 justify-center md:justify-start">
          <button
            onClick={() => openEditModal(sheet)}
            className="text-blue-500 hover:text-blue-700"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDelete(sheet.id)}
            disabled={deleteLoading}
            className={`text-red-500 hover:text-red-700 ${deleteLoading ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <Trash2 size={16} />
          </button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td className="p-4 text-center border" colSpan={4}>
        No sheets found
      </td>
    </tr>
  )}
</tbody>

    </table>
  </div>

  {/* ==== Create/Edit Modal ==== */}
  {showModal && (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-lg relative">
        <button
          onClick={() => setShowModal(false)}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">
          {editingSheet ? "Edit Sheet" : "Create New Sheet"}
        </h2>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
          <input
            type="text"
            placeholder="Name"
            {...register("name", { required: "Name is required" })}
            className="border p-2 rounded-lg text-sm w-full"
          />
          {errors.name && <span className="text-red-500 text-xs">{errors.name.message}</span>}

          <input
            type="text"
            placeholder="Store Name"
            {...register("store_name", { required: "Store Name is required" })}
            className="border p-2 rounded-lg text-sm w-full"
          />
          {errors.store_name && <span className="text-red-500 text-xs">{errors.store_name.message}</span>}

          <input
            type="text"
            placeholder="Sheet ID"
            {...register("sheet_id", { required: "Sheet ID is required" })}
            className="border p-2 rounded-lg text-sm w-full"
          />
          {errors.sheet_id && <span className="text-red-500 text-xs">{errors.sheet_id.message}</span>}

          <button
            type="submit"
            disabled={updateLoading || createLoading}
            className={`w-full py-2 px-4 rounded-lg text-white mt-2 
              ${updateLoading || createLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"} transition-colors`}
          >
            {updateLoading ? "Updating..." : createLoading ? "Creating..." : editingSheet ? "Update" : "Create"}
          </button>
        </form>
      </div>
    </div>
  )}
</div>

  );
};

export default AdminSheets;
