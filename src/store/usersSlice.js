import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../Axios/axiosInstance';


const initialState = {
  users: [],
  Orders: [],
  singleOrder: null,
  userloading: false,
  orderloading: false,
  sheets: [],
  createLoading: false,
  updateLoading: false,
  fetchLoading: false,
  deleteLoading: false,
  error: null,
  pending: false
};

// Fetch users async thunk
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/users/index');
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch users'
      );
    }
  }
);


// DELETE a user by ID
export const deleteUser = createAsyncThunk(
  "users/deleteUser",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`auth/users/delete/${id}`);
      return id; // return the deleted id so we can remove it from the state
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to delete user");
    }
  }
);

// Order Files
export const postOrderFiles = createAsyncThunk(
  "orderFiles/postOrderFiles",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`order-files`, payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to post order files");
    }
  }
);


// UPDATE user by ID
export const updateUser = createAsyncThunk(
  "users/updateUser",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(
        `auth/users/update/${id}`,
        data
      );
      return response.data; // updated user return karo
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
        error.message ||
        "Failed to update user"
      );
    }
  }
);
export const updateOrderFiles = createAsyncThunk(
  "users/updateOrderFiles",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(
        `order-files/${id}`,
        data
      );
      return response.data; // updated user return karo
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
        error.message ||
        "Failed to update user"
      );
    }
  }
);


export const fetchOrders = createAsyncThunk(
  'users/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/order-files');
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch orders'
      );
    }
  }
);

// single order thunk
export const fetchOrdersAdmin = createAsyncThunk(
  "users/fetchOrdersAdmin",
  async (storeId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/order-files?sheet_id=${storeId}`);
      return response.data; // single order object
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to fetch order"
      );
    }
  }
);
// single order thunk
export const fetchSingleOrder = createAsyncThunk(
  "users/fetchSingleOrder",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/order-files/${orderId}`);
      // const response = await axiosInstance.get(`/my-sheet-order?order_id=${orderId}`);
      return response.data; // single order object
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to fetch order"
      );
    }
  }
);

// Single order fetch for admin
export const fetchSingleOrderAdmin = createAsyncThunk(
  "users/fetchSingleOrderAdmin",
  async ({ orderId, sheetId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/order-files/${orderId}`
        // `/my-sheet-order?order_id=${orderId}&sheet_id=${sheetId}`
      );
      return response.data; // single order object
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to fetch order"
      );
    }
  }
);

// create order / role / sheet thunk (POST with form-data)
export const createSheetStore = createAsyncThunk(
  "orders/createSheetStore",
  async ({ name, store_name, sheet_id }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("store_name", store_name);
      formData.append("sheet_id", sheet_id);

      const response = await axiosInstance.post(
        "/auth/roles", // 👈 yahan apna endpoint confirm kar lena
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
        error.message ||
        "Failed to create record"
      );
    }
  }
);

// GET all sheets
export const fetchSheets = createAsyncThunk(
  "users/fetchSheets",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("auth/roles"); // 👈 your endpoint
      return response.data; // should return array of sheets
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to fetch sheets");
    }
  }
);

// DELETE a sheet by ID
export const deleteSheet = createAsyncThunk(
  "users/deleteSheet",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`auth/roles/${id}`);
      return id; // return the deleted id so we can remove it from the state
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to delete sheet");
    }
  }
);


// UPDATE a sheet by ID
export const updateSheet = createAsyncThunk(
  "users/updateSheet",
  async ({ id, name, store_name, sheet_id }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`auth/roles/${id}`, {
        name,
        store_name,
        sheet_id,
      });
      return response.data; // backend should return updated sheet object
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to update sheet"
      );
    }
  }
);
export const fetchOrderById = createAsyncThunk(
  "users/fetchOrderById",
  async (orderId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get(`/order-files/${orderId}`);
      const result = res.data;
      const fetchedOrder = result?.data || result?.order || result;
      return fetchedOrder;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to fetch order"
      );
    }
  }
);

export const createGenerateId = createAsyncThunk(
  "orders/generate-id",
  async ({ orderId }, { rejectWithValue }) => {
    try {

      const response = await axiosInstance.post(
        "/order-files/generate-id",
        { "Order#": orderId },
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
        error.message ||
        "Failed to create record"
      );
    }
  }
);
const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.userloading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.userloading = false;
        state.users = action.payload.data || action.payload || [];
        state.error = null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.userloading = false;
        state.error = action.payload;
        state.users = [];
      })
      // DELETE USER - PENDING
      .addCase(deleteUser.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })

      // DELETE USER - FULFILLED
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.deleteLoading = false;
        // remove deleted user from list
        state.users = state.users.filter(
          (user) => user.id !== action.payload
        );
      })
      .addCase(updateUser.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.updateLoading = false;
        const updated = action.payload?.data;
        if (updated) {
          state.users = state.users.map((user) =>
            user.id === updated.id ? updated : user
          );
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload;
      })



      // updateOrderFiles
      .addCase(updateOrderFiles.pending, (state) => {
        state.pending = true;
        state.error = null;
      })
      .addCase(updateOrderFiles.fulfilled, (state, action) => {
        state.pending = false;
      })
      .addCase(updateOrderFiles.rejected, (state, action) => {
        state.pending = false;
        state.error = action.payload;
      })

      .addCase(postOrderFiles.pending, (state) => {
        state.pending = true;
        state.error = null;
      })
      .addCase(postOrderFiles.fulfilled, (state, action) => {
        state.pending = false;
      })
      .addCase(postOrderFiles.rejected, (state, action) => {
        state.pending = false;
        state.error = action.payload;
      })

      // DELETE USER - REJECTED
      .addCase(deleteUser.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchOrders.pending, (state) => {
        state.orderloading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.orderloading = false;
        state.Orders = action.payload.data || action.payload || [];
        state.error = null;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.orderloading = false;
        state.error = action.payload;
        state.users = [];
      })
      .addCase(fetchOrdersAdmin.pending, (state) => {
        state.orderloading = true;
        state.error = null;
      })
      .addCase(fetchOrdersAdmin.fulfilled, (state, action) => {
        state.orderloading = false;
        state.Orders = action.payload.data || action.payload || [];
        state.error = null;
      })
      .addCase(fetchOrdersAdmin.rejected, (state, action) => {
        state.orderloading = false;
        state.error = action.payload;
        state.users = [];
      })
      .addCase(fetchSingleOrder.pending, (state) => { state.orderloading = true; state.error = null; })
      .addCase(fetchSingleOrder.fulfilled, (state, action) => {
        state.orderloading = false;
        state.singleOrder = action.payload;
      })
      .addCase(fetchSingleOrder.rejected, (state, action) => { state.orderloading = false; state.error = action.payload; })
      .addCase(fetchSingleOrderAdmin.pending, (state) => { state.orderloading = true; state.error = null; })
      .addCase(fetchSingleOrderAdmin.fulfilled, (state, action) => {
        state.orderloading = false;
        state.singleOrder = action.payload;
      })
      .addCase(fetchSingleOrderAdmin.rejected, (state, action) => { state.orderloading = false; state.error = action.payload; })
      .addCase(fetchSheets.pending, (state) => { state.fetchLoading = true; state.error = null; })
      .addCase(fetchSheets.fulfilled, (state, action) => { state.fetchLoading = false; state.sheets = action.payload; })
      .addCase(fetchSheets.rejected, (state, action) => { state.fetchLoading = false; state.error = action.payload; })

      // CREATE
      .addCase(createSheetStore.pending, (state) => { state.createLoading = true; state.error = null; })
      .addCase(createSheetStore.fulfilled, (state, action) => { state.createLoading = false; state.sheets.push(action.payload); })
      .addCase(createSheetStore.rejected, (state, action) => { state.createLoading = false; state.error = action.payload; })

      // UPDATE
      .addCase(updateSheet.pending, (state) => { state.updateLoading = true; state.error = null; })
      .addCase(updateSheet.fulfilled, (state, action) => {
        state.updateLoading = false;
        // Backend se updated sheet object milega
        const updatedSheet = action.payload.data || action.payload;
        const index = state.sheets.data.findIndex(s => s.id === updatedSheet.id);
        if (index !== -1) {
          state.sheets.data[index] = updatedSheet;
        }
        state.error = null; // ✅ error clear karo
      })
      .addCase(updateSheet.rejected, (state, action) => { state.updateLoading = false; state.error = action.payload; })

      // DELETE
      .addCase(deleteSheet.pending, (state) => { state.deleteLoading = true; state.error = null; })
      .addCase(deleteSheet.fulfilled, (state, action) => {
        state.deleteLoading = false;
        const deletedId = action.payload; // ID aayegi
        state.sheets.data = state.sheets.data.filter(sheet => sheet.id !== deletedId);
        state.error = null; // ✅ error clear karo
      })
      .addCase(deleteSheet.rejected, (state, action) => { state.deleteLoading = false; state.error = action.payload; });
  },
});

export const { clearError } = usersSlice.actions;
export default usersSlice.reducer;

