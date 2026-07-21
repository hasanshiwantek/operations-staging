import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { defaultOrder } from '../utils/constant';
import { useSelector } from 'react-redux';

const OrderDetailModal = ({ order = null, onClose, onSave }) => {
    const isNewOrder = !order;
    const { pending } = useSelector((state) => state.users);

    const [formData, setFormData] = useState({});
    const [isEditing, setIsEditing] = useState(isNewOrder); // New orders start in edit mode

    useEffect(() => {
        if (order) {
            setFormData({ ...order });
        } else {
            // Default empty order
            setFormData(defaultOrder);
        }
    }, [order]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, isNewOrder);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-xl">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {isNewOrder ? "Create New Order" : ``}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-600">
                        <X size={28} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                        {Object.keys(formData).map((key) => (
                            <div key={key} className="space-y-1">
                                <label className="block text-sm font-medium text-gray-600">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                </label>
                                <input
                                    type="text"
                                    name={key}
                                    value={formData[key] ?? ''}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all
                    ${isEditing ? 'border-indigo-300 bg-white' : 'border-gray-200 bg-gray-50'}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t p-6 flex gap-3 bg-gray-50">

                        <button
                            onClick={handleSubmit}
                            className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700"
                        >
                            {pending ? "Loading.." : "Create Order"}
                        </button>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailModal;