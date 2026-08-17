import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../Axios/axiosInstance";

// ==========================
// GET All Order Types (by role)
// ==========================
export const fetchOrderTypes = createAsyncThunk(
    "orderTypes/fetchOrderTypes",
    async (roleId, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(
                `/order-types?role_id=${roleId}`
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to fetch order types"
            );
        }
    }
);

// ==========================
// GET All Order Types (Admin)
// ==========================
export const fetchAllOrderTypes = createAsyncThunk(
    "orderTypes/fetchAllOrderTypes",
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/order-types`);
            return response.data;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to fetch all order types"
            );
        }
    }
);

// ==========================
// CREATE Order Type
// ==========================
export const createOrderType = createAsyncThunk(
    "orderTypes/createOrderType",
    async ({ type, color_code, role_id }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/order-types`, {
                type,
                color_code,
                role_id,
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to create order type"
            );
        }
    }
);

// ==========================
// UPDATE Order Type
// ==========================
export const updateOrderType = createAsyncThunk(
    "orderTypes/updateOrderType",
    async ({ id, type, color_code }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.put(`/order-types/${id}`, {
                type,
                color_code,
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to update order type"
            );
        }
    }
);

// ==========================
// DELETE Order Type
// ==========================
export const deleteOrderType = createAsyncThunk(
    "orderTypes/deleteOrderType",
    async (id, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.delete(`/order-types/${id}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to delete order type"
            );
        }
    }
);
export const fetchOrderTypesMap = createAsyncThunk(
    "orderTypes/fetchOrderTypesMap",
    async (roleId, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(
                `/order-types/map?role_id=${roleId}`
            );
            return response.data; // { rma: "#22c55e", po: "#22c55e", cancelled: "#22c55e" }
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to fetch order types map"
            );
        }
    }
);
const initialState = {
    orderTypes: [],
    orderTypesMap: {},
    loading: false,
    mapLoading: false,
    createLoading: false,
    updateLoading: false,
    deleteLoading: false,
    error: null,
};

const orderTypeSlice = createSlice({
    name: "orderTypes",
    initialState,
    reducers: {
        clearOrderTypeError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // ==========================
            // Fetch by Role
            // ==========================
            .addCase(fetchOrderTypes.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOrderTypes.fulfilled, (state, action) => {
                state.loading = false;
                state.orderTypes = action.payload.data || [];
            })
            .addCase(fetchOrderTypes.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // ==========================
            // Fetch All (Admin)
            // ==========================
            .addCase(fetchAllOrderTypes.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllOrderTypes.fulfilled, (state, action) => {
                state.loading = false;
                state.orderTypes = action.payload.data || [];
            })
            .addCase(fetchAllOrderTypes.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // ==========================
            // Create
            // ==========================
            .addCase(createOrderType.pending, (state) => {
                state.createLoading = true;
                state.error = null;
            })
            .addCase(createOrderType.fulfilled, (state, action) => {
                state.createLoading = false;
                // Optionally push the new item if you want optimistic update
                if (action.payload?.data) {
                    state.orderTypes.unshift(action.payload.data);
                }
            })
            .addCase(createOrderType.rejected, (state, action) => {
                state.createLoading = false;
                state.error = action.payload;
            })

            // ==========================
            // Update
            // ==========================
            .addCase(updateOrderType.pending, (state) => {
                state.updateLoading = true;
                state.error = null;
            })
            .addCase(updateOrderType.fulfilled, (state, action) => {
                state.updateLoading = false;
                const updated = action.payload?.data;
                if (updated) {
                    const index = state.orderTypes.findIndex(
                        (item) => item.id === updated.id
                    );
                    if (index !== -1) {
                        state.orderTypes[index] = updated;
                    }
                }
            })
            .addCase(updateOrderType.rejected, (state, action) => {
                state.updateLoading = false;
                state.error = action.payload;
            })

            // ==========================
            // Delete
            // ==========================
            .addCase(deleteOrderType.pending, (state) => {
                state.deleteLoading = true;
                state.error = null;
            })
            .addCase(deleteOrderType.fulfilled, (state, action) => {
                state.deleteLoading = false;
                // You can also remove the item from state here if needed
            })
            .addCase(deleteOrderType.rejected, (state, action) => {
                state.deleteLoading = false;
                state.error = action.payload;
            })

            // ==========================
            // Fetch Map
            // ==========================
            .addCase(fetchOrderTypesMap.pending, (state) => {
                state.mapLoading = true;
                state.error = null;
            })
            .addCase(fetchOrderTypesMap.fulfilled, (state, action) => {
                state.mapLoading = false;
                state.orderTypesMap = action.payload || {};
            })
            .addCase(fetchOrderTypesMap.rejected, (state, action) => {
                state.mapLoading = false;
                state.error = action.payload;
            })
    },
});

export const { clearOrderTypeError } = orderTypeSlice.actions;
export default orderTypeSlice.reducer;