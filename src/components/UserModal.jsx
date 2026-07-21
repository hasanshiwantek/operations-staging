import React, { useState } from "react";

const UserModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ name: "", email: "", role: "Agent", permission: "View" });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded-lg w-96">
        <h2 className="text-xl font-semibold mb-4">Create New User</h2>
        <input name="name" onChange={handleChange} placeholder="Name" className="border p-2 w-full mb-3 rounded" />
        <input name="email" onChange={handleChange} placeholder="Email" className="border p-2 w-full mb-3 rounded" />
        <select name="role" onChange={handleChange} className="border p-2 w-full mb-3 rounded">
          <option>Admin</option>
          <option>Procurement</option>
          <option>Operations</option>
          <option>Sales Agent</option>
        </select>
        <select name="permission" onChange={handleChange} className="border p-2 w-full mb-3 rounded">
          <option>View</option>
          <option>Edit</option>
        </select>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
          <button onClick={() => onSave(form)} className="px-3 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
};
export default UserModal;
