import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { defaultOrder, normalizeOrderOptions } from '../utils/constant';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOrderOptions } from '../store/usersSlice';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const OrderDetailModal = ({ order = null, onClose, onSave }) => {
    const isNewOrder = !order;

    const { pending, orderOptions, optionsLoading } = useSelector((state) => state.users);
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


    const dateFields = ['Charged Date', 'Order Date', 'Refund Date'];

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-2 sm:p-3">

            <div className="bg-white rounded-lg w-full max-w-[1500px] max-h-[98vh] overflow-hidden flex flex-col shadow-2xl">

                {/* ================= HEADER ================= */}
                <div className="px-4 py-2.5 border-b flex justify-between items-center bg-gray-50 shrink-0">

                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                        {isNewOrder ? 'Create New Order' : 'Order Details'}
                    </h2>

                    <button
                        onClick={onClose}
                        className="
                            p-1
                            text-gray-500
                            hover:text-red-600
                            hover:bg-red-50
                            rounded-md
                            transition-colors
                        "
                    >
                        <X size={24} />
                    </button>

                </div>


                {/* ================= BODY ================= */}
                <div className="flex-1 overflow-y-auto xl:overflow-hidden p-3 sm:p-4 bg-white">

                    {/* ================= FIELDS ================= */}
                    <div
                        className="
                            flex
                            flex-wrap
                            justify-center
                            items-start
                            gap-x-1.5
                            gap-y-1.5
                            w-full
                        "
                    >

                        {Object.keys(formData).map((key) => {

                            const isDateField = dateFields.includes(key);

                            const isDropdown = Boolean(normalizedOptions[key]);

                            const options = normalizedOptions[key] || [];

                            return (
                                <div
                                    key={key}
                                    className="
                                        flex-none
                                        w-full
                                        sm:w-[calc(50%-6px)]
                                        md:w-[calc((100%_-_42px)_/_8)]
                                        min-w-0
                                        border
                                        border-gray-300
                                        rounded-sm
                                        overflow-hidden
                                        bg-white
                                    "
                                >

                                    {/* ================= FIELD HEADER ================= */}
                                    <div
                                        className="
                                            min-h-[22px]
                                            px-1
                                            py-[3px]
                                            bg-[#c00000]
                                            flex
                                            items-center
                                            justify-center
                                        "
                                    >
                                        <label
                                            className="
                                                text-[10px]
                                                sm:text-[11px]
                                                font-bold
                                                text-white
                                                text-center
                                                leading-tight
                                                truncate
                                            "
                                            title={key}
                                        >
                                            {key
                                                .replace(
                                                    /([A-Z])/g,
                                                    ' $1'
                                                )
                                                .trim()}
                                        </label>
                                    </div>


                                    {/* ================= FIELD VALUE ================= */}
                                    <div
                                        className={`
                                            min-h-[30px]
                                            flex
                                            items-center
                                            px-1.5
                                            py-1
                                            text-[10px]
                                            sm:text-[11px]
                                            ${!isEditing || optionsLoading
                                                ? 'bg-[#dcebd6]'
                                                : 'bg-white'
                                            }
                                        `}
                                    >

                                        {/* ================= DROPDOWN ================= */}
                                        {isDropdown ? (

                                            <select
                                                name={key}
                                                value={formData[key] ?? ''}
                                                onChange={handleChange}
                                                disabled={!isEditing || optionsLoading}
                                                className={`
                                                    w-full
                                                    min-w-0
                                                    bg-transparent
                                                    border-0
                                                    outline-none
                                                    p-0
                                                    text-[10px]
                                                    sm:text-[11px]
                                                    ${isEditing && !optionsLoading
                                                        ? 'text-gray-800 cursor-pointer'
                                                        : 'text-gray-500 cursor-not-allowed'
                                                    }
                                                `}
                                            >
                                                <option value="">
                                                    {optionsLoading
                                                        ? 'Loading...'
                                                        : `Select ${key}`}
                                                </option>

                                                {options?.map((opt) => (
                                                    <option
                                                        key={opt}
                                                        value={opt}
                                                    >
                                                        {opt}
                                                    </option>
                                                ))}
                                            </select>

                                        ) : isDateField ? (

                                            /* ================= DATE PICKER ================= */
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
                                                className={`
                                                    !w-full
                                                    !border-0
                                                    !bg-transparent
                                                    !p-0
                                                    !outline-none
                                                    !shadow-none
                                                    text-[10px]
                                                    sm:text-[11px]
                                                    ${isEditing
                                                        ? 'text-gray-800'
                                                        : 'text-gray-500 cursor-not-allowed'
                                                    }
                                                `}
                                            />

                                        ) : (

                                            /* ================= NORMAL INPUT ================= */
                                            <input
                                                type="text"
                                                name={key}
                                                value={formData[key] ?? ''}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                className={`
                                                    w-full
                                                    min-w-0
                                                    border-0
                                                    outline-none
                                                    bg-transparent
                                                    p-0
                                                    text-[10px]
                                                    sm:text-[11px]
                                                    ${isEditing
                                                        ? 'text-gray-800'
                                                        : 'text-gray-500'
                                                    }
                                                `}
                                            />
                                        )}

                                    </div>
                                </div>
                            );
                        })}

                    </div>
                </div>


                {/* ================= FOOTER ================= */}
                <div
                    className="
                        border-t
                        px-4
                        py-2.5
                        flex
                        justify-center
                        items-center
                        bg-gray-50
                        shrink-0
                    "
                >
                    <button
                        onClick={handleSubmit}
                        disabled={pending}
                        className="
                            w-full
                            sm:w-[170px]
                            py-1.5
                            px-4
                            rounded-md
                          bg-[#06245f]
      hover:bg-[#041b4a]
                            text-white
                            font-medium
                            text-sm
                            transition-colors
                            disabled:opacity-70
                            disabled:cursor-not-allowed
                        "
                    >
                        {pending ? 'Loading...' : 'Create Order'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default OrderDetailModal;