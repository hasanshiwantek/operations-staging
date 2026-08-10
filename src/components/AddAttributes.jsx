import React, { useEffect } from "react";
import { Plus, Pencil, Trash2,ArrowLeft  } from "lucide-react";
import { useState } from "react";
import AttributeModal from "../components/AttributeModal";
import { useDispatch, useSelector } from "react-redux";
import { fetchAttributes, createAttribute,deleteAttribute, } from "../store/attributeSlice";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const AddAttributes = () => {
  const [showModal, setShowModal] = useState(false);
  const { isAuthenticated, token, storeId } = useSelector(
    (state) => state.auth,
  );
  const { attributes, loading, error, createLoading, deleteLoading, } = useSelector(
    (state) => state.attributes,
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();

 

 
 
  const handleEdit = (item) => {
    navigate(`/storeroles/attribute/${item.attribute_id}`);
  };

 const handleDelete = async (item) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this attribute?"
  );

  if (!confirmDelete) return;

  try {
    await dispatch(deleteAttribute(item.attribute_id)).unwrap();

    toast.success("Attribute deleted successfully");

    dispatch(fetchAttributes(storeId.id));
  } catch (error) {
    toast.error(error);
  }
};
 const handleCreate = async (data) => {
  try {
    await dispatch(
      createAttribute({
        roleId: storeId.id,
        attribute_name: data.name,
      })
    ).unwrap();

    toast.success("Attribute created successfully");

    // List refresh
    dispatch(fetchAttributes(storeId.id));

    // Modal close
    setShowModal(false);

    return true;
  } catch (error) {
    toast.error(error);

    return false;
  }
};
 useEffect(() => {
    if (storeId?.id) {
      dispatch(fetchAttributes(storeId?.id));
    }
  }, [dispatch,storeId]);

  return (
    <div className="p-6">
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
        <h1 className="text-3xl font-bold text-gray-800">Attributes</h1>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2  bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition-all"
        >
          <Plus size={18} />
          Attribute
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                Name
              </th>

              <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700 w-56">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {attributes.map((item) => (
              <tr
                key={item.attribute_id}
                className="border-b last:border-b-0 hover:bg-gray-50 transition"
              >
                <td className="px-6 py-4 cursor-pointer hover:underline hover:text-blue-500 text-gray-700" onClick={()=>{
                    handleEdit(item)
                }}>
                  {item.attribute_name}
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex items-center gap-2 text-indigo-600 hover:text-indigo-600 font-medium"
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

            {attributes.length === 0 && (
              <tr>
                <td colSpan={2} className="py-10 text-center text-gray-500">
                  No Attributes Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AttributeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreate}
          loading={createLoading}
      />
    </div>
  );
};

export default AddAttributes;
