import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { defaultOrder, normalizeOrderOptions } from '../utils/constant';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOrderOptions } from '../store/usersSlice';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const OrderDetailModal = ({ order = null, onClose, onSave }) => {
    const dispatch = useDispatch();
    const isNewOrder = !order;

    const { pending, orderOptions, optionsLoading } = useSelector((state) => state.users);
    const { user: authUser } = useSelector((state) => state.auth);
    const normalizedOptions = normalizeOrderOptions(orderOptions);
    const [formData, setFormData] = useState({});
    const [isEditing, setIsEditing] = useState(isNewOrder);


    useEffect(() => {
        if (order) {
            setFormData({ ...order });
        } else {
            setFormData(defaultOrder);
        }
    }, [order]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, isNewOrder);
        onClose();
    };

    // Date helpers
    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.includes('/')
            ? dateStr.split('/')
            : dateStr.split('-');

        if (parts.length === 3) {
            if (dateStr.includes('/')) {
                return new Date(+parts[2], +parts[1] - 1, +parts[0]); // DD/MM/YYYY
            } else {
                return new Date(+parts[0], +parts[1] - 1, +parts[2]);
            }
        }
        return null;
    };

    const formatDate = (date) => {
        if (!date) return '';
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };


    const dateFields = ['Charged Date', 'Order Date', 'Refund Date'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-xl">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {isNewOrder ? 'Create New Order' : 'Order Details'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-600">
                        <X size={28} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                        {Object.keys(formData).map((key) => {
                            const isDateField = dateFields.includes(key);
                            const isDropdown = Boolean(normalizedOptions[key]); // ← fully dynamic
                            const options = normalizedOptions[key] || [];

                            return (
                                <div key={key} className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-600">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </label>

                                    {/* DROPDOWN */}
                                    {isDropdown ? (
                                        <select
                                            name={key}
                                            value={formData[key] ?? ''}
                                            onChange={handleChange}
                                            disabled={!isEditing || optionsLoading}
                                            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all
                        ${isEditing && !optionsLoading
                                                    ? 'border-indigo-300 bg-white'
                                                    : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                }`}
                                        >
                                            <option value="">
                                                {optionsLoading ? 'Loading...' : `Select ${key}`}
                                            </option>
                                            {options?.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    ) : isDateField ? (
                                        /* DATE PICKER */
                                        <DatePicker
                                            selected={parseDate(formData[key])}
                                            onChange={(date) => {
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    [key]: formatDate(date),
                                                }));
                                            }}
                                            dateFormat="dd/MM/yyyy"
                                            placeholderText="DD/MM/YYYY"
                                            disabled={!isEditing}
                                            wrapperClassName="w-full"
                                            className={`!w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all
                        ${isEditing
                                                    ? 'border-indigo-300 bg-white'
                                                    : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                                                }`}
                                        />
                                    ) : (
                                        /* NORMAL INPUT */
                                        <input
                                            type="text"
                                            name={key}
                                            value={formData[key] ?? ''}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all
                        ${isEditing
                                                    ? 'border-indigo-300 bg-white'
                                                    : 'border-gray-200 bg-gray-50'
                                                }`}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t p-6 flex gap-3 bg-gray-50">
                    <button
                        onClick={handleSubmit}
                        disabled={pending}
                        className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-70"
                    >
                        {pending ? 'Loading...' : 'Create Order'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailModal;