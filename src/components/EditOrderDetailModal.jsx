import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOrderById, fetchOrderOptions } from '../store/usersSlice';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { dropdownFields } from '../utils/constant';

const EditOrderDetailModal = ({ order, onClose, onSave }) => {
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [unlockedFields, setUnlockedFields] = useState(new Set());
    const [fetching, setFetching] = useState(false);
    const [baseOrder, setBaseOrder] = useState(null);

    const { user: authUser } = useSelector((state) => state.auth);
    const { pending, orderOptions, optionsLoading } = useSelector((state) => state.users);

    const debounceRef = useRef(null);
    const lastFetchedId = useRef(null);


    // Set form data when order changes
    useEffect(() => {
        if (order) {
            setFormData({ ...order });
            setBaseOrder({ ...order });
            lastFetchedId.current = order['Order#'];
        }
    }, [order]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (name === 'Order#') {
            if (debounceRef.current) clearTimeout(debounceRef.current);

            const trimmed = value.trim();
            debounceRef.current = setTimeout(() => {
                if (trimmed && trimmed !== lastFetchedId.current) {
                    fetchOrderByIdFun(trimmed);
                }
            }, 900);
        }
    };

    const fetchOrderByIdFun = async (orderId) => {
        try {
            setFetching(true);
            const result = await dispatch(
                fetchOrderById({ orderId, role_id: authUser?.role_id })
            ).unwrap();

            const fetchedOrder = result;
            if (fetchedOrder && typeof fetchedOrder === 'object') {
                setFormData({ ...fetchedOrder });
                setBaseOrder({ ...fetchedOrder });
                lastFetchedId.current = String(orderId);
            }
        } catch (err) {
            console.error('Failed to fetch order:', err);
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const hasChanges = () => {
        if (!baseOrder) return false;
        return Object.keys(baseOrder).some(
            (key) => (formData[key] ?? '') !== (baseOrder[key] ?? '')
        );
    };

    const handleCloseAttempt = () => {
        if (hasChanges()) {
            setShowConfirm(true);
        } else {
            onClose();
        }
    };

    const handleConfirmClose = () => {
        setShowConfirm(false);
        onClose();
    };

    if (!order) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-xl">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Order Details -{' '}
                        <span className="text-indigo-600">
                            #{formData['Order#'] ?? order['Order#']}
                        </span>
                        {fetching && (
                            <span className="ml-3 text-sm font-normal text-gray-400">
                                Loading...
                            </span>
                        )}
                    </h2>
                    <button
                        onClick={handleCloseAttempt}
                        className="text-gray-500 hover:text-red-600"
                    >
                        <X size={28} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-6 relative">
                    {fetching && (
                        <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10">
                            <span className="text-indigo-600 font-medium">
                                Fetching order data...
                            </span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                        {Object.entries(formData).map(([key, value]) => {
                            // Always locked fields
                            const alwaysDisabledFields = [
                                'Order#',
                                'Total Price',
                                'Total Cost',
                                'Total Cost+4%',
                                'Gross Profit',
                                'Gross Profit-4%',
                                'Profit %',
                                'Card Payment',
                            ];

                            // Unlockable fields
                            const unlockableFields = [
                                'Order Date',
                                'Payment Status',
                                'Category',
                                'Brands',
                                'part#',
                                'Qty',
                                'Bill to address',
                                'Ship to address',
                                'Country',
                                'Carrier',
                                'Customer Company',
                                'Phone',
                                'Email',
                                'Price',
                                'Shipping',
                                'Tax',
                                'CC/Paypal 4%',
                                'Paid Via',
                            ];

                            const isAlwaysDisabled = alwaysDisabledFields.includes(key);
                            const isUnlockable = unlockableFields.includes(key);

                            const isDisabled =
                                isAlwaysDisabled ||
                                (isUnlockable && !unlockedFields.has(key) && !isEditing);

                            const dateFields = ['Charged Date', 'Order Date', 'Refund Date'];
                            const isDateField = dateFields.includes(key);

                            const dropdownKey = dropdownFields[key];
                            const isDropdown = Boolean(dropdownKey);

                            const parseDate = (dateStr) => {
                                if (!dateStr) return null;
                                const parts = dateStr.includes('/')
                                    ? dateStr.split('/')
                                    : dateStr.split('-');

                                if (parts.length === 3) {
                                    if (dateStr.includes('/')) {
                                        return new Date(+parts[2], +parts[1] - 1, +parts[0]);
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

                            const unlockField = (fieldKey) => {
                                setUnlockedFields((prev) => new Set(prev).add(fieldKey));
                            };

                            return (
                                <div key={key} className="space-y-1">
                                    {/* Label + Pen Icon */}
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-medium text-gray-600">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </label>

                                        {isUnlockable && isDisabled && (
                                            <button
                                                type="button"
                                                onClick={() => unlockField(key)}
                                                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title="Click to edit this field"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                    <path d="m15 5 4 4" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>

                                    {/* DROPDOWN */}
                                    {isDropdown ? (
                                        <select
                                            name={key}
                                            value={formData[key] ?? ''}
                                            onChange={handleChange}
                                            disabled={isDisabled || optionsLoading}
                                            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all
                        ${isDisabled || optionsLoading
                                                    ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                                                    : 'border-indigo-300 bg-white'
                                                }`}
                                        >
                                            <option value="">
                                                {optionsLoading ? 'Loading...' : `Select ${key}`}
                                            </option>
                                            {(orderOptions?.[dropdownKey] || []).map((opt) => (
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
                                            disabled={isDisabled}
                                            wrapperClassName="w-full"
                                            className={`!w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all
                        ${isDisabled
                                                    ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                                                    : 'border-indigo-300 bg-white'
                                                }`}
                                        />
                                    ) : (
                                        /* NORMAL INPUT */
                                        <input
                                            type="text"
                                            name={key}
                                            value={formData[key] ?? ''}
                                            onChange={handleChange}
                                            disabled={isDisabled}
                                            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all
                        ${isDisabled
                                                    ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                                                    : 'border-indigo-300 bg-white'
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
                        type="button"
                        onClick={handleCloseAttempt}
                        className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-100 font-medium"
                    >
                        Cancel Editing
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={pending}
                        className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700"
                    >
                        {pending ? 'Loading...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[110] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                Discard changes?
                            </h3>
                            <p className="text-sm text-gray-600">
                                You have some unsaved changes. Are you sure you want to close
                                without saving?
                            </p>
                        </div>
                        <div className="border-t p-4 flex gap-3 bg-gray-50">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 font-medium text-gray-700"
                            >
                                Keep Editing
                            </button>
                            <button
                                onClick={handleConfirmClose}
                                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditOrderDetailModal;