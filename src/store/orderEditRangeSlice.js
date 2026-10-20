import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../Axios/axiosInstance";

// Edit window periods the admin can pick, in months
export const ORDER_EDIT_RANGE = Object.freeze({
    THREE_MONTHS: 3,
    SIX_MONTHS: 6,
    NINE_MONTHS: 9,
    ONE_YEAR: 12,
});

export const ORDER_EDIT_RANGE_OPTIONS = [
    { value: ORDER_EDIT_RANGE.THREE_MONTHS, label: "Past 3 months" },
    { value: ORDER_EDIT_RANGE.SIX_MONTHS, label: "Past 6 months" },
    { value: ORDER_EDIT_RANGE.NINE_MONTHS, label: "Past 9 months" },
    { value: ORDER_EDIT_RANGE.ONE_YEAR, label: "Past year" },
];

const pad2 = (n) => String(n).padStart(2, "0");

const MONTH_PATTERN = /^(\d{4})-(\d{2})/;

// Saved month from the API: "month" ("2026-07"), falling back to "start_date" ("2026-07-01T00:00:00Z")
const readSavedMonth = (data) => String(data?.month || data?.start_date || "");

// Chip → API month: 3 → "YYYY-MM" of the current month minus 3 (Oct 2026 → "2026-07")
export const monthsToStartMonth = (months) => {
    const start = new Date();
    start.setDate(1);
    start.setMonth(start.getMonth() - months);
    return `${start.getFullYear()}-${pad2(start.getMonth() + 1)}`;
};

// API month → first locked-out boundary: "2026-07" → "2026-07-01" (null when no month is set)
export const getEditRangeStartDate = (month) => {
    const m = String(month || "").match(MONTH_PATTERN);
    return m ? `${m[1]}-${m[2]}-01` : null;
};

// API response → closest chip value (null when no month is saved)
export const getEditRangeMonths = (data) => {
    const m = readSavedMonth(data).match(MONTH_PATTERN);
    if (!m) return null;
    const now = new Date();
    const diff = (now.getFullYear() - Number(m[1])) * 12 + (now.getMonth() + 1 - Number(m[2]));
    return ORDER_EDIT_RANGE_OPTIONS.reduce((best, option) =>
        Math.abs(option.value - diff) < Math.abs(best.value - diff) ? option : best
    ).value;
};

// API response → "YYYY-MM" (null when none is saved)
const getEditRangeMonth = (data) => {
    const m = readSavedMonth(data).match(MONTH_PATTERN);
    return m ? `${m[1]}-${m[2]}` : null;
};

// The window is scoped by the store-id header; pass storeId to target a store other than the selected one
const storeHeaders = (storeId) => (storeId ? { headers: { "store-id": Number(storeId) } } : {});

// ==========================
// GET Order Edit Range
// ==========================
export const fetchOrderEditRange = createAsyncThunk(
    "orderEditRange/fetchOrderEditRange",
    async ({ storeId } = {}, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(
                `/auth/order-edit-range`,
                storeHeaders(storeId)
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to fetch order edit range"
            );
        }
    }
);

// ==========================
// SAVE Order Edit Range (Admin)
// ==========================
export const saveOrderEditRange = createAsyncThunk(
    "orderEditRange/saveOrderEditRange",
    async ({ months, storeId }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(
                `/auth/order-edit-range`,
                { month: monthsToStartMonth(months) },
                storeHeaders(storeId)
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to save order edit range"
            );
        }
    }
);

const initialState = {
    month: null,
    loading: false,
    saveLoading: false,
    error: null,
};

// Only the selected store's window drives the order sheet lock
const isSelectedStore = (action) => !action.meta.arg?.storeId;

const orderEditRangeSlice = createSlice({
    name: "orderEditRange",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchOrderEditRange.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOrderEditRange.fulfilled, (state, action) => {
                state.loading = false;
                if (isSelectedStore(action)) state.month = getEditRangeMonth(action.payload?.data);
            })
            .addCase(fetchOrderEditRange.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(saveOrderEditRange.pending, (state) => {
                state.saveLoading = true;
                state.error = null;
            })
            .addCase(saveOrderEditRange.fulfilled, (state, action) => {
                state.saveLoading = false;
                if (isSelectedStore(action)) state.month = getEditRangeMonth(action.payload?.data);
            })
            .addCase(saveOrderEditRange.rejected, (state, action) => {
                state.saveLoading = false;
                state.error = action.payload;
            });
    },
});

export default orderEditRangeSlice.reducer;
