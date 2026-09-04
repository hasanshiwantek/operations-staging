import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOrderById, fetchOrderOptions } from '../store/usersSlice';
import DatePicker from 'react-datepicker';
import { getIsFinance, normalizeOrderOptions } from '../utils/constant';
import 'react-datepicker/dist/react-datepicker.css';
// Always locked fields


// Unlockable fields
const unlockableFields = [
    'Order Date',
    'Payment Status',
    'Category',
    'Brands',
    'Part#',
    'Qty',
    'Bill to address',
    'Ship to address',
    'City',
    'State',
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
    'Customer',
];

const EditOrderDetailModal = ({ order, onClose, onSave }) => {
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [unlockedFields, setUnlockedFields] = useState(new Set());
    const [fetching, setFetching] = useState(false);
    const [baseOrder, setBaseOrder] = useState(null);
    const { storeId } = useSelector((state) => state.auth);
    const { pending, orderOptions, optionsLoading } = useSelector((state) => state.users);
    const isFinance = getIsFinance();
    const normalizedOptions = normalizeOrderOptions(orderOptions);
    const debounceRef = useRef(null);
    const lastFetchedId = useRef(null);
    // const { order_type, ...order } = order;
    const isRma = String(order?.order_type || "").toLowerCase() === "rma";
    const alwaysDisabledFields = [
        'Order#',
        'Total Price',
        'Total Cost',
        'Total Cost+4%',
        'Gross Profit',
        'Gross Profit-4%',
        'Profit %',
        'Card Payment',

        (!isRma ? 'Refund Date' : null),
    ];
    const isFieldLocked = (fieldName) => {
        if (alwaysDisabledFields.includes(fieldName)) return true;
        if (isFinance && fieldName !== "Charged Date") return true;
        return false;
    };
    console.log("order?.order_type ", order);

    // ========== CALCULATION FUNCTION ==========
    const calculateFields = (data) => {
        const num = (val) => Number(val) || 0;

        const price = num(data['Price']);
        const shipping = num(data['Shipping']);
        const tax = num(data['Tax']);
        const cost = num(data['Cost']);
        const vendorShipping = num(data['Vendor Shipping']);
        const vendorTax = num(data['Vendor Tax']);
        const courierCharges = num(data['Courier Charges']);
        const salesTax = num(data['Sales Tax']);
        const warehouseCharges = num(data['Warehouse Charges']);
        const customDuties = num(data['Custom Duties']);
        const ccPaypal4 = num(data['CC/Paypal 4%']);

        // Card Payment = Cost + Vendor Shipping + Vendor Tax
        const cardPayment = cost + vendorShipping + vendorTax;

        // Total Price = Shipping + Price + Tax
        const totalPrice = shipping + price + tax;

        // Total Cost = Courier Charges + Sales Tax + Warehouse Charges + Custom Duties + Card Payment
        const totalCost = courierCharges + salesTax + warehouseCharges + customDuties + cardPayment;

        // Total Cost+4% = Total Cost + CC/Paypal 4%
        const totalCostPlus4 = totalCost + ccPaypal4;

        // Gross Profit = Total Price - Total Cost
        const grossProfit = totalPrice - totalCost;

        // Gross Profit-4% = Gross Profit - CC/Paypal 4%
        const grossProfitMinus4 = grossProfit - ccPaypal4;

        // Profit % = (Gross Profit-4% / Total Price) * 100
        const profitPercent = totalPrice > 0 ? ((grossProfitMinus4 / totalPrice) * 100).toFixed(2) : '0.00';

        return {
            ...data,
            'Card Payment': cardPayment.toFixed(2),
            'Total Price': totalPrice.toFixed(2),
            'Total Cost': totalCost.toFixed(2),
            'Total Cost+4%': totalCostPlus4.toFixed(2),
            'Gross Profit': grossProfit.toFixed(2),
            'Gross Profit-4%': grossProfitMinus4.toFixed(2),
            'Profit %': profitPercent,
        };
    };

    // // Set form data when order changes
    // useEffect(() => {
    //     if (order) {
    //         setFormData({ ...order });
    //         setBaseOrder({ ...order });
    //         lastFetchedId.current = order['Order#'];
    //     }
    // }, [order]);
    // Set form data when order changes
    useEffect(() => {
        if (order) {
            const calculated = calculateFields({ ...order });
            const { Status, ...rest } = calculated; // Exclude order_type from formData
            setFormData(rest);
            setBaseOrder(rest);
            lastFetchedId.current = order['Order#'];
        }
    }, [order]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        // setFormData((prev) => ({ ...prev, [name]: value }));
        setFormData((prev) => {
            const updated = { ...prev, [name]: value };
            const { Status, ...rest } = updated; // Exclude order_type from formData
            return calculateFields(rest); // ← auto calculate
        });
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
                fetchOrderById({ orderId, role_id: storeId?.id })
            ).unwrap();

            const fetchedOrder = result;
            if (fetchedOrder && typeof fetchedOrder === 'object') {
                // setFormData({ ...fetchedOrder });
                // setBaseOrder({ ...fetchedOrder });
                // lastFetchedId.current = String(orderId);
                const calculated = calculateFields(fetchedOrder);
                const { Status, ...rest } = calculated;
                setFormData(rest);
                setBaseOrder(rest);
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-2 sm:p-3">
            <div className="bg-white rounded-lg w-full max-w-[1500px] h-auto max-h-[98vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="px-4 py-2.5 border-b flex justify-between items-center bg-gray-50 shrink-0">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                        Order Details -{' '}
                        <span className="text-indigo-600">
                            #{formData['Order#'] ?? order['Order#']}
                        </span>
                        {fetching && (
                            <span className="ml-3 text-xs sm:text-sm font-normal text-gray-400">
                                Loading...
                            </span>
                        )}
                    </h2>
                    <button
                        onClick={handleCloseAttempt}
                        className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"

                    >
                        <X size={28} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto xl:overflow-hidden p-3 sm:p-4 relative bg-white">
                    {fetching && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                            <span className="text-indigo-600 font-medium text-sm">
                                Fetching order data...
                            </span>
                        </div>
                    )}

                    <div className="
                        flex
                        flex-wrap
                        justify-center
                        items-start
                        gap-x-1.5
                        gap-y-1.5
                        w-full
                    ">
                        {Object.entries(formData).map(([key, value]) => {

                            if (key === 'order_type') return null; // Skip rendering order_type field
                            const locked = isFieldLocked(key);
                            const isAlwaysDisabled = alwaysDisabledFields.includes(key);
                            const isUnlockable = unlockableFields.includes(key);

                            // const isDisabled =
                            //     isAlwaysDisabled ||
                            //     (isUnlockable && !unlockedFields.has(key) && !isEditing);
                            // const isDisabled = isFinance
                            //     ? key !== "Charged Date"
                            //     : isAlwaysDisabled ||
                            //     (isUnlockable && !unlockedFields.has(key) && !isEditing);
                            const isDisabled = (() => {
                                if (alwaysDisabledFields.includes(key)) return true;

                                // RMA: only Refund Date is editable
                                // if (isRma) return key !== "Refund Date";

                                // Finance: Charged Date + Paid Via
                                if (isFinance) {
                                    return key !== "Charged Date" && key !== "Paid Via";
                                }

                                return isUnlockable && !unlockedFields.has(key) && !isEditing;
                            })();

                            const dateFields = ['Charged Date', 'Order Date', 'Refund Date'];
                            const isDateField = dateFields.includes(key);

                            const isDropdown = Boolean(normalizedOptions[key]); // ← fully dynamic
                            const options = normalizedOptions[key] || [];


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
                                <div key={key} className="
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
    ">
                                    {/* Label + Pen Icon */}
                                    <div className="
                                        min-h-[22px]
                                        px-1
                                        py-[3px]
                                        bg-[#c00000]
                                        flex
                                        items-center
                                        justify-center
                                        gap-1
                                    ">
                                        <label className="
                                            text-[10px]
                                            sm:text-[11px]
                                            font-bold
                                            text-white
                                            text-center
                                            leading-tight
                                            truncate
                                        ">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </label>

                                        {!isRma && !isFinance && isUnlockable && isDisabled && (
                                            <button
                                                type="button"
                                                onClick={() => unlockField(key)}
                                                className="
                                                shrink-0
                                                p-0.5
                                                text-white/80
                                                hover:text-white
                                                hover:bg-white/10
                                                rounded
                                                transition-colors
                                            "
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

                                    <div className={`
                                        min-h-[30px]
                                        flex
                                        items-center
                                        px-1.5
                                        py-1
                                        text-[10px]
                                        sm:text-[11px]
                                        ${isDisabled || optionsLoading
                                            ? "bg-[#dcebd6] text-gray-700"
                                            : "bg-white text-gray-800"
                                        }
                                    `}>
                                        {isDropdown ? (
                                            <select
                                                name={key}
                                                value={formData[key] ?? ''}
                                                onChange={handleChange}
                                                disabled={isDisabled || optionsLoading}
                                                //                                     className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all
                                                // ${isDisabled || optionsLoading
                                                //                                             ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                                                //                                             : 'border-indigo-300 bg-white'
                                                //                                         }`}
                                                className={`
                                                w-full
                                                min-w-0
                                                bg-transparent
                                                border-0
                                                outline-none
                                                p-0
                                                text-[10px]
                                                sm:text-[11px]
                                                
                                                ${isDisabled || optionsLoading
                                                        ? "text-gray-700 cursor-not-allowed"
                                                        : "text-gray-800 cursor-pointer"
                                                    }
                                            `}
                                            >
                                                <option value="">
                                                    {optionsLoading ? 'Loading...' : `Select ${key}`}
                                                </option>

                                                {options.map((opt) => (
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
                                                    setFormData((prev) => {
                                                        const updated = {
                                                            ...prev,
                                                            [key]: formatDate(date),
                                                        };
                                                        return calculateFields(updated);
                                                    });
                                                }}
                                                dateFormat="dd/MM/yyyy"
                                                placeholderText="DD/MM/YYYY"
                                                disabled={isDisabled}
                                                wrapperClassName="w-full"
                                                className={`
                                                !w-full
                                                !border-0
                                                !bg-transparent
                                                !outline-none
                                                !shadow-none
                                                !p-0
                                                text-[10px]
                                                sm:text-[11px]
                                                ${isDisabled
                                                        ? "text-gray-700 cursor-not-allowed"
                                                        : "text-gray-800"
                                                    }
                                            `}
                                            />
                                        ) : (
                                            /* NORMAL INPUT */
                                            <input
                                                type="text"
                                                name={key}
                                                value={formData[key] ?? ''}
                                                onChange={handleChange}
                                                disabled={isDisabled}
                                                className={`
                                                w-full
                                                min-w-0
                                                border-0
                                                outline-none
                                                bg-transparent
                                                p-0
                                                text-[10px]
                                                sm:text-[11px]
                                                ${isDisabled
                                                        ? "text-gray-700 cursor-not-allowed"
                                                        : "text-gray-800"
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

                {/* Footer */}
                {/* ========================= FOOTER ========================= */}
                <div
                    className="
    border-t
    px-4
    py-2.5
    flex
    flex-col
    sm:flex-row
    justify-center
    items-center
    gap-3
    bg-gray-50
    shrink-0
  "
                >
                    {/* Cancel */}
                    <button
                        type="button"
                        onClick={handleCloseAttempt}
                        className="
      w-full
      sm:w-[150px]
      py-1.5
      px-4
      border
      border-gray-300
      rounded-none
      bg-white
      hover:bg-gray-100
      font-medium
      text-sm
      text-gray-700
      transition-colors
    "
                    >
                        Cancel
                    </button>

                    {/* Save Changes */}
                    <button
                        onClick={handleSubmit}
                        disabled={pending}
                        className="
      w-full
      sm:w-[150px]
      py-1.5
      px-4
      rounded-none
      bg-[#06245f]
      hover:bg-[#041b4a]
      text-white
      font-medium
      text-sm
      transition-colors
      disabled:opacity-60
      disabled:cursor-not-allowed
    "
                    >
                        {pending ? "Loading..." : "Save Changes"}
                    </button>

                    {/* Print */}
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="
      w-full
      sm:w-[150px]
      py-1.5
      px-4
      rounded-none
      bg-[#06245f]
      hover:bg-[#041b4a]
      text-white
      font-medium
      text-sm
      transition-colors
    "
                    >
                        Print
                    </button>
                </div>
                {/* <div className="border-t p-6 flex gap-3 bg-gray-50">
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
                </div> */}
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

export default React.memo(EditOrderDetailModal);
