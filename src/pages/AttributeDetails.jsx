import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchAttributeDetails,  createAttributeValue,updateAttributeValue,  deleteAttributeValue, updateAttribute, } from "../store/attributeSlice";
import EditValueModal from "../components/EditValueModal";
import ValueModal from "../components/ValueModal";
import { toast } from "react-toastify";
const AttributeDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const [showValueModal, setShowValueModal] = useState(false);
  const [attributeName, setAttributeName] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
const [selectedValue, setSelectedValue] = useState(null);

  const { storeId } = useSelector((state) => state.auth);
  const { attributeDetail, detailLoading,createValueLoading ,  updateValueLoading,  deleteValueLoading,updateAttributeLoading } = useSelector(
  (state) => state.attributes
);


const handleCreateValue = async (data) => {
  try {
    await dispatch(
      createAttributeValue({
        attribute_id: Number(id),
        attribute_value: data.value,
        role_id: storeId.id,
      })
    ).unwrap();

    toast.success("Value added successfully");

    dispatch(
      fetchAttributeDetails({
        id,
        roleId: storeId.id,
      })
    );

    setShowValueModal(false);

    return true;
  } catch (error) {
    toast.error(error);

    return false;
  }
};

  const handleAddValue = () => {
  setShowValueModal(true);
  };

const handleEdit = (item) => {
  setSelectedValue(item);
  setShowEditModal(true);
};
const handleUpdateValue = async (data) => {
  try {
    await dispatch(
      updateAttributeValue({
        id: selectedValue.id,
        attribute_value: data.value,
      })
    ).unwrap();

    toast.success("Value updated successfully");

    dispatch(
      fetchAttributeDetails({
        id,
        roleId: storeId.id,
      })
    );

    setShowEditModal(false);
    setSelectedValue(null);

    return true;
  } catch (error) {
    toast.error(error);

    return false;
  }
};
const handleUpdateAttribute = async () => {
      if (!attributeName.trim()) {
    toast.error("Attribute name is required");
    return;
  }
  try {
    await dispatch(
      updateAttribute({
        id: Number(id),
        attribute_name: attributeName,
      })
    ).unwrap();

    toast.success("Attribute updated successfully");

    dispatch(
      fetchAttributeDetails({
        id,
        roleId: storeId.id,
      })
    );

    return true;
  } catch (error) {
    toast.error(error);
    return false;
  }
};
 const handleDelete = async (item) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this value?"
  );

  if (!confirmDelete) return;

  try {
    await dispatch(deleteAttributeValue(item.id)).unwrap();

    toast.success("Value deleted successfully");

    dispatch(
      fetchAttributeDetails({
        id,
        roleId: storeId.id,
      })
    );
  } catch (error) {
    toast.error(error);
  }
};
useEffect(() => {
  if (id && storeId?.id) {
    dispatch(
      fetchAttributeDetails({
        id,
        roleId: storeId.id,
      })
    );
  }
}, [dispatch, id, storeId]);
useEffect(() => {
  if (attributeDetail) {
    setAttributeName(attributeDetail.attribute_name);
  }
}, [attributeDetail]);
  return (
    <div className="p-6">

      {/* Heading */}
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Edit Attribute
      </h1>

      {/* Name */}
      <div className="mb-8 flex items-end gap-4">
  <div className="w-[400px]">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Name <span className="text-red-500">*</span>
    </label>

    <input
      type="text"
      value={attributeName}
      onChange={(e) => setAttributeName(e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-indigo-200"
    />
  </div>

  <button
  type="button"
  onClick={handleUpdateAttribute}
  disabled={updateAttributeLoading}
  className={`h-[50px] rounded-lg px-6 text-white transition ${
    updateAttributeLoading
      ? "cursor-not-allowed bg-gray-400"
      : "bg-indigo-600 hover:bg-indigo-700"
  }`}
>
  {updateAttributeLoading ? "Saving..." : "Save"}
</button>
</div>

      {/* Add Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleAddValue}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition-all"
        >
          <Plus size={18} />
          Add Value
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">

          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                Value
              </th>

              <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700 w-56">
                Action
              </th>
            </tr>
          </thead>

          <tbody>

           {attributeDetail?.values?.map((item) => (
              <tr
                key={item.id}
                className="border-b last:border-b-0 hover:bg-gray-50 transition"
              >
                <td className="px-6 py-4 text-gray-700">
                  {item.name}
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
                      className="flex items-center gap-2 text-red-500 hover:text-red-600 font-medium"
                    >
                      <Trash2 size={17} />
                      Delete
                    </button>

                  </div>
                </td>
              </tr>
            ))}

            {attributeDetail?.values?.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="py-10 text-center text-gray-500"
                >
                  No Values Found
                </td>
              </tr>
            )}

          </tbody>

        </table>
      </div>
<ValueModal
  open={showValueModal}
  onClose={() => setShowValueModal(false)}
  onSubmit={handleCreateValue}
   loading={createValueLoading}
/>
<EditValueModal
  open={showEditModal}
  onClose={() => {
    setShowEditModal(false);
    setSelectedValue(null);
  }}
  editData={selectedValue}
  onSubmit={handleUpdateValue}
  loading={updateValueLoading}
/>
    </div>
  );
};

export default AttributeDetails;
 